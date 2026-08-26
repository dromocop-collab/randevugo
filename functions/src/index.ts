import { initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getMessaging } from "firebase-admin/messaging";
import { getStorage } from "firebase-admin/storage";
import {
  FieldValue,
  Timestamp,
  getFirestore,
} from "firebase-admin/firestore";
import { HttpsError, onCall } from "firebase-functions/v2/https";
import { onDocumentCreated } from "firebase-functions/v2/firestore";
import { createHash, randomUUID, randomInt } from "crypto";
import { defineSecret } from "firebase-functions/params";
initializeApp();

const db = getFirestore();
const auth = getAuth();
const messaging = getMessaging();
const storage = getStorage();
const GLOBAL_PUSH_TOPIC = "senin_randevun_all";
const MUTLUCELL_USERNAME = defineSecret("MUTLUCELL_USERNAME");
const MUTLUCELL_API_KEY = defineSecret("MUTLUCELL_API_KEY");


const MUTLUCELL_SEND_URL =
  "https://smsgw.mutlucell.com/smsgw-ws/sndblkex";
const MUTLUCELL_SETTINGS_PATH = "platformPrivateSettings/mutlucell";
const publicCallableOptions = {
  region: "europe-west1",
  cors: [
    /^http:\/\/localhost(?::\d+)?$/,
    /^https:\/\/(?:www\.)?seninrandevun\.com$/,
    /^https:\/\/.*\.web\.app$/,
    /^https:\/\/.*\.firebaseapp\.com$/,
    /^https:\/\/.*\.hosted\.app$/,
  ],
};

function requireString(value: unknown, name: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new HttpsError("invalid-argument", `${name} alanı zorunludur.`);
  }
  return value.trim();
}

async function requirePlatformAdmin(uid: string, email?: string | null) {
  if (email?.trim().toLowerCase() === "cihatwin@gmail.com") return;
  if ((await db.doc(`platformAdmins/${uid}`).get()).exists) return;
  throw new HttpsError("permission-denied", "Bu işlem yalnızca süper admin tarafından yapılabilir.");
}

async function requireBusinessManager(uid: string, businessId: string) {
  const [business, member] = await Promise.all([
    db.doc(`businesses/${businessId}`).get(),
    db.doc(`businesses/${businessId}/members/${uid}`).get(),
  ]);
  if (!business.exists) throw new HttpsError("not-found", "İşletme bulunamadı.");
  const role = String(member.data()?.role ?? "");
  if (business.data()?.ownerUid === uid || ["owner", "admin", "manager"].includes(role)) return business.data()!;
  throw new HttpsError("permission-denied", "Müşterilere bildirim gönderme yetkiniz yok.");
}

async function tokensForUsers(userIds: string[]) {
  const uniqueIds = [...new Set(userIds.filter(Boolean))].slice(0, 2_000);
  const snapshots = await Promise.all(uniqueIds.map((uid) => db.collection(`users/${uid}/devices`).get()));
  return snapshots.flatMap((snapshot) => snapshot.docs.map((document) => ({
    ref: document.ref,
    token: String(document.data().fcmToken ?? ""),
  }))).filter((item) => item.token.length > 20);
}

async function sendTokenBatches(
  tokens: Awaited<ReturnType<typeof tokensForUsers>>,
  title: string,
  body: string,
  data: Record<string, string>
) {
  let successCount = 0;
  let failureCount = 0;
  for (let offset = 0; offset < tokens.length; offset += 500) {
    const batch = tokens.slice(offset, offset + 500);
    const response = await messaging.sendEachForMulticast({
      tokens: batch.map((item) => item.token),
      notification: { title, body },
      data,
      apns: { payload: { aps: { sound: "default", badge: 1 } } },
    });
    successCount += response.successCount;
    failureCount += response.failureCount;
    const invalidRefs = response.responses.flatMap((result, index) => {
      const code = result.error?.code ?? "";
      return ["messaging/registration-token-not-registered", "messaging/invalid-registration-token"].includes(code)
        ? [batch[index].ref]
        : [];
    });
    await Promise.all(invalidRefs.map((ref) => ref.delete()));
  }
  return { successCount, failureCount };
}

async function deleteRootMatches(collectionName: string, field: string, value: string) {
  while (true) {
    const snapshot = await db.collection(collectionName).where(field, "==", value).limit(200).get();
    if (snapshot.empty) return;
    for (const document of snapshot.docs) await db.recursiveDelete(document.ref);
  }
}

async function deleteGroupMatches(collectionName: string, field: string, value: string) {
  while (true) {
    const snapshot = await db.collectionGroup(collectionName).where(field, "==", value).limit(200).get();
    if (snapshot.empty) return;
    for (const document of snapshot.docs) await db.recursiveDelete(document.ref);
  }
}

function normalizedPhoneKey(raw: string): string {
  const phone = normalizePhone(raw);
  if (!/^\+90\d{10}$/.test(phone)) {
    throw new HttpsError("invalid-argument", "Geçerli bir Türkiye telefon numarası girin.");
  }
  return phone;
}

function customerDocumentId(phone: string): string {
  return createHash("sha256").update(phone).digest("hex").slice(0, 32);
}

async function upsertBusinessCustomer(input: {
  businessId: string;
  fullName: string;
  phone: string;
  email?: string | null;
  userId?: string | null;
  incrementAppointments?: boolean;
}) {
  const phone = normalizedPhoneKey(input.phone);
  const customers = db.collection(`businesses/${input.businessId}/customers`);
  const canonicalRef = customers.doc(customerDocumentId(phone));
  const snapshot = await customers.limit(2_000).get();
  const matches = snapshot.docs.filter((document) => {
    const value = String(document.data().phoneKey ?? document.data().phone ?? "");
    try { return normalizedPhoneKey(value) === phone; } catch { return false; }
  });

  const numberTotal = (key: string) => matches.reduce((sum, document) =>
    sum + Math.max(0, Number(document.data()[key] ?? 0)), 0);
  const existingCanonical = matches.find((document) => document.ref.path === canonicalRef.path);
  const fallback = existingCanonical?.data() ?? matches[0]?.data() ?? {};
  const batch = db.batch();
  batch.set(canonicalRef, {
    fullName: input.fullName || String(fallback.fullName ?? "Müşteri"),
    phone,
    phoneKey: phone,
    email: input.email || fallback.email || null,
    userId: input.userId || fallback.userId || null,
    totalAppointments: numberTotal("totalAppointments") + (input.incrementAppointments ? 1 : 0),
    completedAppointments: numberTotal("completedAppointments"),
    cancelledAppointments: numberTotal("cancelledAppointments"),
    noShowAppointments: numberTotal("noShowAppointments"),
    totalSpent: numberTotal("totalSpent"),
    lastVisitAt: input.incrementAppointments ? FieldValue.serverTimestamp() : (fallback.lastVisitAt ?? null),
    createdAt: fallback.createdAt ?? FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  }, { merge: true });
  matches.filter((document) => document.ref.path !== canonicalRef.path)
    .forEach((document) => batch.delete(document.ref));
  await batch.commit();
  return { customerId: canonicalRef.id, phone, mergedRecords: Math.max(0, matches.length - 1) };
}

export const upsertCustomer = onCall(
  { region: "europe-west1" },
  async (request) => {
    const uid = request.auth?.uid;
    if (!uid) throw new HttpsError("unauthenticated", "Oturum bulunamadı.");
    const businessId = requireString(request.data?.businessId, "businessId");
    await requireBusinessManager(uid, businessId);
    return upsertBusinessCustomer({
      businessId,
      fullName: requireString(request.data?.fullName, "Ad soyad").slice(0, 80),
      phone: requireString(request.data?.phone, "Telefon"),
      email: typeof request.data?.email === "string" ? request.data.email.trim().toLowerCase() : null,
      userId: typeof request.data?.userId === "string" ? request.data.userId : null,
    });
  }
);

export const createBusiness = onCall(
  { region: "europe-west1" },
  async (request) => {
    const uid = request.auth?.uid;
    if (!uid) throw new HttpsError("unauthenticated", "İşletme açmak için giriş yapmalısınız.");
    const data = request.data ?? {};
    const name = requireString(data.name, "İşletme adı").slice(0, 100);
    const slug = requireString(data.slug, "Mağaza adresi").toLowerCase();
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
      throw new HttpsError("invalid-argument", "Mağaza adresi yalnızca harf, rakam ve tire içerebilir.");
    }
    const slugRef = db.doc(`businessSlugs/${slug}`);
    const businessRef = db.collection("businesses").doc();
    const accountRef = db.doc(`businessAccounts/${uid}`);
    const workingHours = Array.isArray(data.workingHours) ? data.workingHours.slice(0, 7) : [];
    let position = 0;
    await db.runTransaction(async (transaction) => {
      const ownedQuery = db.collection("businesses").where("ownerUid", "==", uid);
      const [account, owned, slugSnapshot] = await Promise.all([
        transaction.get(accountRef),
        transaction.get(ownedQuery),
        transaction.get(slugRef),
      ]);
      if (slugSnapshot.exists) throw new HttpsError("already-exists", "Bu mağaza adresi zaten kullanılıyor.");
      const reservedCount = Math.max(Number(account.data()?.storeCount ?? 0), owned.size);
      if (reservedCount >= 3) throw new HttpsError("resource-exhausted", "Bir hesap en fazla 3 mağaza açabilir.");
      position = reservedCount + 1;
      const needsApproval = position > 1;
      transaction.set(accountRef, {
        ownerUid: uid, storeCount: position, updatedAt: FieldValue.serverTimestamp(),
        createdAt: account.data()?.createdAt ?? FieldValue.serverTimestamp(),
      }, { merge: true });
      transaction.set(businessRef, {
        ownerUid: uid,
        name,
        slug,
        category: requireString(data.category, "Kategori").slice(0, 60),
        phone: normalizedPhoneKey(requireString(data.phone, "Telefon")),
        email: requireString(data.email, "E-posta").toLowerCase().slice(0, 160),
        address: requireString(data.address, "Adres").slice(0, 300),
        city: requireString(data.city, "Şehir").slice(0, 60),
        district: requireString(data.district, "İlçe").slice(0, 80),
        logoUrl: typeof data.logoUrl === "string" ? data.logoUrl : null,
        coverUrl: typeof data.coverUrl === "string" ? data.coverUrl : null,
        description: typeof data.description === "string" ? data.description.slice(0, 600) : "",
        isPublished: !needsApproval,
        status: needsApproval ? "pending_review" : "active",
        approvalStatus: needsApproval ? "pending" : "approved",
        storePosition: position,
        slotIntervalMinutes: 15,
        rating: 0,
        reviewCount: 0,
        minimumBookingNoticeMinutes: 60,
        maximumBookingDaysAhead: 45,
        appointmentBufferMinutes: 10,
        plan: "RANDEVUGO",
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });
      transaction.set(slugRef, { businessId: businessRef.id, ownerUid: uid, createdAt: FieldValue.serverTimestamp() });
      transaction.set(businessRef.collection("members").doc(uid), {
        uid, role: "owner", createdAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp(),
      });
      workingHours.forEach((value: Record<string, unknown>) => {
        transaction.set(businessRef.collection("workingHours").doc(), {
          day: Math.max(0, Math.min(6, Number(value.day ?? 0))),
          isOpen: value.isOpen === true,
          start: String(value.start ?? "09:00"),
          end: String(value.end ?? "18:00"),
          breakStart: value.breakStart ?? null,
          breakEnd: value.breakEnd ?? null,
          staffId: null,
          createdAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        });
      });
      if (needsApproval) {
        transaction.set(db.collection("businessApprovalRequests").doc(businessRef.id), {
          businessId: businessRef.id, ownerUid: uid, businessName: name, storePosition: position,
          status: "pending", createdAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp(),
        });
      }
      transaction.set(db.doc(`subscriptions/${businessRef.id}`), {
        businessId: businessRef.id, userId: uid, plan: "RANDEVUGO", status: "trialing",
        trialDays: 14, paymentProvider: "manual", createdAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp(),
      });
    });
    const needsApproval = position > 1;
    return { businessId: businessRef.id, status: needsApproval ? "pending_review" : "active", requiresApproval: needsApproval, storePosition: position };
  }
);

export const reviewBusiness = onCall(
  { region: "europe-west1" },
  async (request) => {
    const uid = request.auth?.uid;
    if (!uid) throw new HttpsError("unauthenticated", "Oturum bulunamadı.");
    await requirePlatformAdmin(uid, request.auth?.token.email as string | undefined);
    const businessId = requireString(request.data?.businessId, "businessId");
    const decision = requireString(request.data?.decision, "decision");
    if (!["approved", "rejected"].includes(decision)) throw new HttpsError("invalid-argument", "Geçersiz onay kararı.");
    const businessRef = db.doc(`businesses/${businessId}`);
    const business = await businessRef.get();
    if (!business.exists) throw new HttpsError("not-found", "İşletme bulunamadı.");
    const approved = decision === "approved";
    const batch = db.batch();
    batch.update(businessRef, {
      status: approved ? "active" : "rejected",
      approvalStatus: decision,
      isPublished: approved,
      reviewedBy: uid,
      reviewedAt: FieldValue.serverTimestamp(),
      adminNote: typeof request.data?.note === "string" ? request.data.note.slice(0, 500) : "",
      updatedAt: FieldValue.serverTimestamp(),
    });
    batch.set(db.doc(`businessApprovalRequests/${businessId}`), {
      status: decision, reviewedBy: uid, reviewedAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp(),
    }, { merge: true });
    batch.set(db.collection("platformAuditLogs").doc(), {
      action: `business.${decision}`, businessId, actorUid: uid, createdAt: FieldValue.serverTimestamp(),
    });
    await batch.commit();
    return { success: true, status: approved ? "active" : "rejected" };
  }
);

export const assignBusinessPlan = onCall(
  { region: "europe-west1" },
  async (request) => {
    const uid = request.auth?.uid;
    if (!uid) throw new HttpsError("unauthenticated", "Oturum bulunamadı.");
    await requirePlatformAdmin(uid, request.auth?.token.email as string | undefined);
    const businessId = requireString(request.data?.businessId, "businessId");
    const plan = requireString(request.data?.plan, "Paket").toUpperCase().slice(0, 40);
    const batch = db.batch();
    batch.update(db.doc(`businesses/${businessId}`), { plan, updatedAt: FieldValue.serverTimestamp() });
    batch.set(db.doc(`subscriptions/${businessId}`), {
      businessId, plan, status: String(request.data?.status ?? "active"), assignedBy: uid,
      updatedAt: FieldValue.serverTimestamp(),
    }, { merge: true });
    batch.set(db.collection("platformAuditLogs").doc(), {
      action: "subscription.plan_assigned", businessId, plan, actorUid: uid, createdAt: FieldValue.serverTimestamp(),
    });
    await batch.commit();
    return { success: true, plan };
  }
);

export const registerPushToken = onCall(
  { region: "europe-west1" },
  async (request) => {
    const uid = request.auth?.uid;
    if (!uid) throw new HttpsError("unauthenticated", "Bildirimleri açmak için giriş yapmalısınız.");
    const token = requireString(request.data?.token, "token");
    const deviceId = requireString(request.data?.deviceId, "deviceId").replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 128);
    if (deviceId.length < 4 || token.length < 20) throw new HttpsError("invalid-argument", "Cihaz bildirimi doğrulanamadı.");
    const deviceRef = db.doc(`users/${uid}/devices/${deviceId}`);
    const [existingDevice, duplicateTokens] = await Promise.all([
      deviceRef.get(),
      db.collectionGroup("devices").where("fcmToken", "==", token).get(),
    ]);
    await Promise.all(duplicateTokens.docs
      .filter((document) => document.ref.path !== deviceRef.path)
      .map((document) => document.ref.delete()));
    await deviceRef.set({
      fcmToken: token,
      platform: "ios",
      appVersion: String(request.data?.appVersion ?? ""),
      locale: String(request.data?.locale ?? "tr_TR"),
      enabled: true,
      updatedAt: FieldValue.serverTimestamp(),
      ...(!existingDevice.exists ? { createdAt: FieldValue.serverTimestamp() } : {}),
    }, { merge: true });
    await messaging.subscribeToTopic([token], GLOBAL_PUSH_TOPIC);
    return { success: true };
  }
);

export const unregisterPushToken = onCall(
  { region: "europe-west1" },
  async (request) => {
    const uid = request.auth?.uid;
    if (!uid) throw new HttpsError("unauthenticated", "Oturum bulunamadı.");
    const deviceId = requireString(request.data?.deviceId, "deviceId").replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 128);
    const ref = db.doc(`users/${uid}/devices/${deviceId}`);
    const snapshot = await ref.get();
    const token = String(snapshot.data()?.fcmToken ?? "");
    if (token) await messaging.unsubscribeFromTopic([token], GLOBAL_PUSH_TOPIC);
    await ref.delete();
    return { success: true };
  }
);

export const deleteMyAccount = onCall(
  { region: "europe-west1" },
  async (request) => {
    const uid = request.auth?.uid;
    if (!uid) throw new HttpsError("unauthenticated", "Hesabınızı silmek için yeniden giriş yapmalısınız.");

    const [userRecord, userProfile, ownedBusinesses] = await Promise.all([
      auth.getUser(uid),
      db.doc(`users/${uid}`).get(),
      db.collection("businesses").where("ownerUid", "==", uid).get(),
    ]);
    const email = userRecord.email?.trim().toLowerCase() ?? "";
    const phone = String(userProfile.data()?.phone ?? "").trim();

    // Storage is removed before identity deletion so a failed media cleanup can be retried safely.
    const bucket = storage.bucket();
    await bucket.deleteFiles({ prefix: `users/${uid}/`, force: true });

    for (const business of ownedBusinesses.docs) {
      const businessId = business.id;
      const slug = String(business.data().slug ?? "").trim();
      await bucket.deleteFiles({ prefix: `businesses/${businessId}/`, force: true });
      await Promise.all([
        slug ? db.doc(`businessSlugs/${slug}`).delete() : Promise.resolve(),
        db.doc(`businessApprovalRequests/${businessId}`).delete(),
        db.doc(`subscriptions/${businessId}`).delete(),
        deleteRootMatches("categoryRequests", "businessId", businessId),
        deleteRootMatches("supportTickets", "businessId", businessId),
        deleteRootMatches("notificationLogs", "businessId", businessId),
        deleteRootMatches("appointmentTokens", "businessId", businessId),
      ]);
      await db.recursiveDelete(business.ref);
    }

    // Remove customer-side records created inside businesses the user does not own.
    const customerAppointments = await db.collectionGroup("appointments").where("customerId", "==", uid).get();
    for (const appointment of customerAppointments.docs) {
      const publicToken = String(appointment.data().publicToken ?? "");
      if (publicToken) await db.doc(`appointmentTokens/${publicToken}`).delete();
      await db.recursiveDelete(appointment.ref);
    }
    await Promise.all([
      deleteGroupMatches("customers", "userId", uid),
      deleteGroupMatches("reviews", "customerId", uid),
      deleteGroupMatches("members", "uid", uid),
      deleteRootMatches("supportTickets", "userId", uid),
      deleteRootMatches("notificationLogs", "senderUid", uid),
      deleteRootMatches("platformAuditLogs", "actorUid", uid),
      db.doc(`businessAccounts/${uid}`).delete(),
      db.doc(`platformAdmins/${uid}`).delete(),
      email ? db.doc(`emailVerificationCodes/${email}`).delete() : Promise.resolve(),
      email ? db.doc(`passwordResetCodes/${email}`).delete() : Promise.resolve(),
      email ? deleteRootMatches("mail", "to", email) : Promise.resolve(),
      phone ? db.doc(`verificationCodes/${phone}`).delete() : Promise.resolve(),
    ]);

    await db.recursiveDelete(db.doc(`users/${uid}`));
    await auth.deleteUser(uid);
    return { success: true };
  }
);

export const sendPlatformPush = onCall(
  { region: "europe-west1" },
  async (request) => {
    const uid = request.auth?.uid;
    if (!uid) throw new HttpsError("unauthenticated", "Oturum bulunamadı.");
    await requirePlatformAdmin(uid, request.auth?.token.email as string | undefined);
    const title = requireString(request.data?.title, "Başlık").slice(0, 80);
    const body = requireString(request.data?.body, "Mesaj").slice(0, 500);
    const devices = await db.collectionGroup("devices").get();
    const tokens = devices.docs.map((document) => ({
      ref: document.ref,
      token: String(document.data().fcmToken ?? ""),
    })).filter((item) => item.token.length > 20);
    const result = await sendTokenBatches(tokens, title, body, {
      kind: "platform_announcement", destination: String(request.data?.destination ?? "discover"),
    });
    await db.collection("notificationLogs").add({
      audience: "platform", title, body, senderUid: uid, recipientDevices: tokens.length, ...result,
      status: tokens.length === 0 ? "no_recipients" : result.failureCount === 0 ? "sent" : "partial",
      createdAt: FieldValue.serverTimestamp(),
    });
    return { success: result.successCount > 0, recipients: tokens.length, ...result };
  }
);

export const sendBusinessPush = onCall(
  { region: "europe-west1" },
  async (request) => {
    const uid = request.auth?.uid;
    if (!uid) throw new HttpsError("unauthenticated", "Oturum bulunamadı.");
    const businessId = requireString(request.data?.businessId, "businessId");
    const business = await requireBusinessManager(uid, businessId);
    const title = requireString(request.data?.title, "Başlık").slice(0, 80);
    const body = requireString(request.data?.body, "Mesaj").slice(0, 500);
    const [customers, appointments] = await Promise.all([
      db.collection(`businesses/${businessId}/customers`).limit(2_000).get(),
      db.collection(`businesses/${businessId}/appointments`).limit(2_000).get(),
    ]);
    const userIds = [
      ...customers.docs.map((item) => String(item.data().userId ?? item.data().customerId ?? "")),
      ...appointments.docs.map((item) => String(item.data().customerId ?? "")),
    ];
    const tokens = await tokensForUsers(userIds);
    const result = await sendTokenBatches(tokens, title, body, {
      kind: "business_announcement", businessId,
    });
    await db.collection("notificationLogs").add({
      audience: "business_customers", businessId, businessName: String(business.name ?? "İşletme"),
      title, body, senderUid: uid, recipientDevices: tokens.length, ...result,
      status: result.failureCount === 0 ? "sent" : "partial", createdAt: FieldValue.serverTimestamp(),
    });
    return { success: true, recipients: tokens.length, ...result };
  }
);

type Schedule = {
  day: number;
  isOpen: boolean;
  start: string;
  end: string;
  breakStart?: string;
  breakEnd?: string;
};

type AppointmentWindow = { start: number; end: number };

function numberOr(value: unknown, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function normalizedBookingDuration(value: unknown): number {
  const raw = Math.round(numberOr(value, 0));
  if (raw >= 5 && raw <= 480) return raw;
  // Older imports occasionally persisted localized values such as 30.000 as 30000.
  if (raw >= 1_000 && raw % 1_000 === 0) {
    const scaled = raw / 1_000;
    if (scaled >= 5 && scaled <= 480) return scaled;
  }
  // Project-style services can span days; booking slots still need a safe consultation window.
  if (raw > 480) return 60;
  return Math.max(5, raw);
}

function timeToMinutes(value: unknown): number | null {
  if (typeof value !== "string" || !/^\d{2}:\d{2}$/.test(value)) return null;
  const [hour, minute] = value.split(":").map(Number);
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null;
  return hour * 60 + minute;
}

function isValidDateKey(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  return parsed.getUTCFullYear() === year &&
    parsed.getUTCMonth() === month - 1 &&
    parsed.getUTCDate() === day;
}

function localParts(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  const year = Number(values.year);
  const month = Number(values.month);
  const day = Number(values.day);
  const hour = Number(values.hour);
  const minute = Number(values.minute);
  return {
    year,
    month,
    day,
    hour,
    minute,
    dateKey: `${values.year}-${values.month}-${values.day}`,
    weekday: new Date(Date.UTC(year, month - 1, day)).getUTCDay(),
  };
}

function timeZoneOffset(at: Date, timeZone: string): number {
  const parts = localParts(at, timeZone);
  return Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute) - at.getTime();
}

function zonedTimeToMillis(dateKey: string, minutes: number, timeZone: string): number {
  const [year, month, day] = dateKey.split("-").map(Number);
  const hour = Math.floor(minutes / 60);
  const minute = minutes % 60;
  const wallClockUTC = Date.UTC(year, month - 1, day, hour, minute);
  let result = wallClockUTC - timeZoneOffset(new Date(wallClockUTC), timeZone);
  result = wallClockUTC - timeZoneOffset(new Date(result), timeZone);
  return result;
}

function scheduleFromData(data: FirebaseFirestore.DocumentData): Schedule | null {
  const start = typeof data.start === "string" ? data.start : "";
  const end = typeof data.end === "string" ? data.end : "";
  if (timeToMinutes(start) === null || timeToMinutes(end) === null) return null;
  return {
    day: numberOr(data.day, -1),
    isOpen: data.isOpen === true,
    start,
    end,
    breakStart: typeof data.breakStart === "string" ? data.breakStart : undefined,
    breakEnd: typeof data.breakEnd === "string" ? data.breakEnd : undefined,
  };
}

function overlaps(start: number, end: number, blocked: AppointmentWindow): boolean {
  return start < blocked.end && blocked.start < end;
}

async function loadBookingContext(businessId: string, serviceId: string, staffId: string | null) {
  const businessRef = db.doc(`businesses/${businessId}`);
  const serviceRef = db.doc(`businesses/${businessId}/services/${serviceId}`);
  const staffRef = staffId ? db.doc(`businesses/${businessId}/staff/${staffId}`) : null;
  const [businessSnap, serviceSnap, staffSnap, hoursSnap, specialDaysSnap] = await Promise.all([
    businessRef.get(),
    serviceRef.get(),
    staffRef?.get() ?? Promise.resolve(null),
    db.collection(`businesses/${businessId}/workingHours`).get(),
    db.collection(`businesses/${businessId}/specialDays`).get(),
  ]);

  if (!businessSnap.exists) throw new HttpsError("not-found", "İşletme bulunamadı.");
  const business = businessSnap.data()!;
  if (business.isPublished !== true || business.status !== "active" || business.isSuspended === true) {
    throw new HttpsError("failed-precondition", "İşletme şu anda online randevu kabul etmiyor.");
  }
  if (!serviceSnap.exists || serviceSnap.data()?.isActive !== true) {
    throw new HttpsError("failed-precondition", "Hizmet aktif değil.");
  }
  if (staffId && (!staffSnap?.exists || staffSnap.data()?.isActive !== true)) {
    throw new HttpsError("failed-precondition", "Çalışan aktif değil.");
  }

  const service = serviceSnap.data()!;
  const staff = staffSnap?.data() ?? null;
  const serviceIds = Array.isArray(staff?.serviceIds) ? staff.serviceIds.map(String) : [];
  if (staff && serviceIds.length > 0 && !serviceIds.includes(serviceId)) {
    throw new HttpsError("failed-precondition", "Seçilen çalışan bu hizmeti vermiyor.");
  }

  return {
    businessRef,
    business,
    service,
    staff,
    businessHours: hoursSnap.docs.map((item) => scheduleFromData(item.data())).filter((item): item is Schedule => item !== null),
    specialDays: specialDaysSnap.docs.map((item) => item.data()),
  };
}

function effectiveSchedule(
  context: Awaited<ReturnType<typeof loadBookingContext>>,
  dateKey: string,
  weekday: number,
  staffId: string | null
): Schedule | null {
  const leaveDates = Array.isArray(context.staff?.leaveDates) ? context.staff.leaveDates.map(String) : [];
  if (leaveDates.includes(dateKey)) return null;
  const special = context.specialDays.find((item) => {
    const appliesToStaff = !item.staffId || item.staffId === staffId;
    return item.date === dateKey && appliesToStaff;
  });
  if (special && ["holiday", "leave", "closed"].includes(String(special.type))) return null;

  const businessSchedule = context.businessHours.find((item) => item.day === weekday && item.isOpen);
  if (!businessSchedule) return null;
  const staffHours = Array.isArray(context.staff?.workingHours)
    ? context.staff.workingHours.map((item: FirebaseFirestore.DocumentData) => scheduleFromData(item)).filter((item: Schedule | null): item is Schedule => item !== null)
    : [];
  const staffSchedule = staffHours.length > 0
    ? staffHours.find((item: Schedule) => item.day === weekday && item.isOpen)
    : businessSchedule;
  if (!staffSchedule) return null;

  const customStart = special?.type === "custom" && typeof special.start === "string" ? special.start : null;
  const customEnd = special?.type === "custom" && typeof special.end === "string" ? special.end : null;
  const start = Math.max(
    timeToMinutes(customStart ?? businessSchedule.start) ?? 0,
    timeToMinutes(staffSchedule.start) ?? 0
  );
  const end = Math.min(
    timeToMinutes(customEnd ?? businessSchedule.end) ?? 0,
    timeToMinutes(staffSchedule.end) ?? 0
  );
  if (end <= start) return null;
  return {
    ...businessSchedule,
    start: `${String(Math.floor(start / 60)).padStart(2, "0")}:${String(start % 60).padStart(2, "0")}`,
    end: `${String(Math.floor(end / 60)).padStart(2, "0")}:${String(end % 60).padStart(2, "0")}`,
    breakStart: staffSchedule.breakStart ?? businessSchedule.breakStart,
    breakEnd: staffSchedule.breakEnd ?? businessSchedule.breakEnd,
  };
}

async function appointmentWindows(businessId: string, dayStart: number, dayEnd: number, staffId: string | null): Promise<AppointmentWindow[]> {
  const snapshot = await db.collection(`businesses/${businessId}/appointments`)
    .where("startAt", ">=", Timestamp.fromMillis(dayStart))
    .where("startAt", "<", Timestamp.fromMillis(dayEnd))
    .get();
  return snapshot.docs.flatMap((item) => {
    const data = item.data();
    if (!["pending", "confirmed"].includes(String(data.status))) return [];
    if (staffId && data.staffId && data.staffId !== staffId) return [];
    const startAt = data.startAt as Timestamp | undefined;
    const endAt = data.endAt as Timestamp | undefined;
    return startAt && endAt ? [{ start: startAt.toMillis(), end: endAt.toMillis() }] : [];
  });
}

function buildSlots(
  context: Awaited<ReturnType<typeof loadBookingContext>>,
  dateKey: string,
  staffId: string | null,
  blocked: AppointmentWindow[]
): number[] {
  const timeZone = typeof context.business.timeZone === "string" ? context.business.timeZone : "Europe/Istanbul";
  const dayProbe = zonedTimeToMillis(dateKey, 12 * 60, timeZone);
  const weekday = localParts(new Date(dayProbe), timeZone).weekday;
  const schedule = effectiveSchedule(context, dateKey, weekday, staffId);
  if (!schedule) return [];

  const open = timeToMinutes(schedule.start)!;
  const close = timeToMinutes(schedule.end)!;
  const interval = Math.max(5, numberOr(context.business.slotIntervalMinutes, 15));
  const duration = normalizedBookingDuration(context.service.durationMinutes);
  const bufferBefore = Math.max(0, numberOr(context.business.bufferBeforeMinutes, 0));
  const bufferAfter = Math.max(0, numberOr(context.business.bufferAfterMinutes, numberOr(context.business.appointmentBufferMinutes, 0)));
  const notice = Math.max(0, numberOr(context.business.minimumBookingNoticeMinutes, 30));
  const minimumStart = Date.now() + notice * 60_000;
  const staffBreaks = Array.isArray(context.staff?.breakSchedule)
    ? context.staff.breakSchedule
      .filter((item: FirebaseFirestore.DocumentData) => numberOr(item.day, -1) === weekday)
      .map((item: FirebaseFirestore.DocumentData) => [item.breakStart, item.breakEnd])
    : [];
  const breaks = [
    [schedule.breakStart, schedule.breakEnd],
    ...staffBreaks,
  ].flatMap(([start, end]) => {
    const startMinute = timeToMinutes(start);
    const endMinute = timeToMinutes(end);
    return startMinute !== null && endMinute !== null ? [{ start: startMinute, end: endMinute }] : [];
  });

  const slots: number[] = [];
  for (let minute = open; minute + duration <= close; minute += interval) {
    const start = zonedTimeToMillis(dateKey, minute, timeZone);
    const end = start + duration * 60_000;
    if (start < minimumStart) continue;
    if (breaks.some((item) => minute < item.end && item.start < minute + duration + bufferAfter)) continue;
    if (blocked.some((item) => overlaps(start - bufferBefore * 60_000, end + bufferAfter * 60_000, item))) continue;
    slots.push(start);
  }
  return slots;
}

export const submitPublicSupportRequest = onCall(
  publicCallableOptions,
  async (request) => {
    const data = request.data ?? {};
    const name = requireString(data.name, "İsim");
    const phone = requireString(data.phone, "Telefon").replace(/\s+/g, " ");
    const message = requireString(data.message, "Mesaj");
    const audience = ["customer", "business", "storefront"].includes(String(data.audience))
      ? String(data.audience)
      : "customer";
    const businessId = typeof data.businessId === "string" && data.businessId.trim()
      ? data.businessId.trim()
      : null;

    if (typeof data.website === "string" && data.website.trim()) {
      throw new HttpsError("invalid-argument", "Form doğrulanamadı.");
    }
    if (name.length < 2 || name.length > 80) {
      throw new HttpsError("invalid-argument", "İsim 2–80 karakter olmalıdır.");
    }
    if (!/^\+?[0-9()\s-]{10,22}$/.test(phone)) {
      throw new HttpsError("invalid-argument", "Geçerli bir telefon numarası girin.");
    }
    if (message.length < 10 || message.length > 2000) {
      throw new HttpsError("invalid-argument", "Mesaj 10–2000 karakter olmalıdır.");
    }
    if (audience === "storefront" && !businessId) {
      throw new HttpsError("invalid-argument", "İşletme bilgisi eksik.");
    }

    let businessName: string | null = null;
    if (businessId) {
      const businessSnap = await db.doc(`businesses/${businessId}`).get();
      if (!businessSnap.exists || businessSnap.data()?.isPublished !== true) {
        throw new HttpsError("not-found", "İşletme bulunamadı veya mesaj kabul etmiyor.");
      }
      businessName = String(businessSnap.data()?.name ?? "İşletme");
    }

    const ip = request.rawRequest.ip || "unknown";
    const rateKey = createHash("sha256").update(`${ip}|${phone}`).digest("hex").slice(0, 32);
    const rateRef = db.doc(`publicSupportRateLimits/${rateKey}`);
    await db.runTransaction(async (tx) => {
      const previous = await tx.get(rateRef);
      const lastAt = previous.data()?.lastAt as Timestamp | undefined;
      if (lastAt && Date.now() - lastAt.toMillis() < 60_000) {
        throw new HttpsError("resource-exhausted", "Yeni mesaj göndermek için lütfen bir dakika bekleyin.");
      }
      tx.set(rateRef, { lastAt: Timestamp.now() }, { merge: true });
    });

    const ticketRef = db.collection("supportTickets").doc();
    const target = businessId ? "business" : "platform";
    const title = businessId
      ? `${businessName} için müşteri mesajı`
      : audience === "business" ? "İşletme destek mesajı" : "Müşteri destek mesajı";

    const batch = db.batch();
    batch.set(ticketRef, {
      title,
      category: businessId ? "customer_message" : "public_support",
      source: audience,
      target,
      requesterName: name,
      requesterPhone: phone,
      message,
      businessId,
      businessName,
      userId: request.auth?.uid ?? null,
      status: "open",
      priority: "medium",
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
    if (businessId) {
      const notificationRef = db.collection(`businesses/${businessId}/notifications`).doc();
      batch.set(notificationRef, {
        type: "customer_message",
        title: "Yeni müşteri mesajı",
        body: `${name} mağaza profilinizden bir mesaj gönderdi.`,
        ticketId: ticketRef.id,
        isRead: false,
        createdAt: FieldValue.serverTimestamp(),
      });
    }
    await batch.commit();

    return { success: true, ticketId: ticketRef.id };
  }
);

export const cancelCustomerAppointment = onCall(
  { region: "europe-west1" },
  async (request) => {
    if (!request.auth?.uid) {
      throw new HttpsError("unauthenticated", "Randevuyu iptal etmek için giriş yapmalısınız.");
    }
    const data = request.data ?? {};
    const businessId = requireString(data.businessId, "businessId");
    const appointmentId = requireString(data.appointmentId, "appointmentId");
    const appointmentRef = db.doc(`businesses/${businessId}/appointments/${appointmentId}`);
    const businessRef = db.doc(`businesses/${businessId}`);

    await db.runTransaction(async (tx) => {
      const [appointmentSnap, businessSnap] = await Promise.all([tx.get(appointmentRef), tx.get(businessRef)]);
      if (!appointmentSnap.exists || !businessSnap.exists) {
        throw new HttpsError("not-found", "Randevu bulunamadı.");
      }
      const appointment = appointmentSnap.data()!;
      const business = businessSnap.data()!;
      if (appointment.customerId !== request.auth!.uid) {
        throw new HttpsError("permission-denied", "Bu randevu üzerinde işlem yetkiniz yok.");
      }
      if (!["pending", "confirmed"].includes(String(appointment.status))) {
        throw new HttpsError("failed-precondition", "Bu randevu artık iptal edilemez.");
      }
      if (business.allowCancellation === false) {
        throw new HttpsError("failed-precondition", "İşletme online iptal kabul etmiyor. Lütfen işletmeyle iletişime geçin.");
      }
      const startAt = appointment.startAt as Timestamp | undefined;
      if (!startAt || startAt.toMillis() <= Date.now()) {
        throw new HttpsError("failed-precondition", "Geçmiş randevu iptal edilemez.");
      }
      const deadlineMinutes = Number(business.cancellationDeadlineMinutes ?? 120);
      if (startAt.toMillis() - Date.now() < deadlineMinutes * 60_000) {
        throw new HttpsError("failed-precondition", `Randevuya ${deadlineMinutes} dakikadan az kaldığı için online iptal yapılamaz.`);
      }
      tx.update(appointmentRef, {
        status: "cancelled",
        cancelledBy: "customer",
        cancelledAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });
      const notificationRef = db.collection(`businesses/${businessId}/notifications`).doc();
      tx.set(notificationRef, {
        type: "appointment_cancelled",
        title: "Randevu müşteri tarafından iptal edildi",
        body: `${String(appointment.customerName ?? "Müşteri")} randevusunu iptal etti.`,
        appointmentId,
        isRead: false,
        createdAt: FieldValue.serverTimestamp(),
      });
    });

    return { success: true };
  }
);

export const getAvailableSlots = onCall(
  publicCallableOptions,
  async (request) => {
    const data = request.data ?? {};
    const businessId = requireString(data.businessId, "businessId");
    const serviceId = requireString(data.serviceId, "serviceId");
    const date = requireString(data.date, "date");
    const staffId = typeof data.staffId === "string" && data.staffId.trim() ? data.staffId.trim() : null;
    if (!isValidDateKey(date)) {
      throw new HttpsError("invalid-argument", "Tarih biçimi geçersiz.");
    }

    const context = await loadBookingContext(businessId, serviceId, staffId);
    const timeZone = typeof context.business.timeZone === "string" ? context.business.timeZone : "Europe/Istanbul";
    const dayStart = zonedTimeToMillis(date, 0, timeZone);
    const nextDate = new Date(Date.UTC(...date.split("-").map(Number).map((value, index) => index === 1 ? value - 1 : value) as [number, number, number]));
    nextDate.setUTCDate(nextDate.getUTCDate() + 1);
    const nextDateKey = nextDate.toISOString().slice(0, 10);
    const dayEnd = zonedTimeToMillis(nextDateKey, 0, timeZone);
    const maximumDays = Math.max(1, numberOr(context.business.maximumBookingDaysAhead, 30));
    if (dayStart > Date.now() + maximumDays * 86_400_000 + 86_400_000) {
      throw new HttpsError("failed-precondition", "Bu tarih rezervasyon aralığının dışında.");
    }
    const candidates: Array<{ staffId: string | null; context: typeof context }> = [];
    if (staffId) {
      candidates.push({ staffId, context });
    } else {
      const staffSnapshot = await db.collection(`businesses/${businessId}/staff`)
        .where("isActive", "==", true)
        .get();
      const eligibleStaff = staffSnapshot.docs.filter((document) => {
        const serviceIds = Array.isArray(document.data().serviceIds)
          ? document.data().serviceIds.map(String)
          : [];
        return serviceIds.length === 0 || serviceIds.includes(serviceId);
      });
      if (eligibleStaff.length === 0) {
        candidates.push({ staffId: null, context });
      } else {
        eligibleStaff.forEach((document) => {
          candidates.push({
            staffId: document.id,
            context: { ...context, staff: document.data() },
          });
        });
      }
    }

    const candidateSlots = await Promise.all(candidates.map(async (candidate) => {
      const blocked = await appointmentWindows(businessId, dayStart, dayEnd, candidate.staffId);
      return buildSlots(candidate.context, date, candidate.staffId, blocked).map((startAtMillis) => ({
        startAtMillis,
        staffId: candidate.staffId,
      }));
    }));
    const slots = [...candidateSlots.flat()]
      .sort((a, b) => a.startAtMillis - b.startAtMillis)
      .filter((slot, index, rows) => index === 0 || rows[index - 1].startAtMillis !== slot.startAtMillis);
    return {
      slots: slots.map((slot) => ({
        ...slot,
        label: new Intl.DateTimeFormat("tr-TR", { timeZone, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(new Date(slot.startAtMillis)),
      })),
      timeZone,
    };
  }
);

export const createAppointment = onCall(
  { region: "europe-west1" },
  async (request) => {
    const data = request.data ?? {};

    const businessId = requireString(data.businessId, "businessId");
    const staffId = typeof data.staffId === "string" && data.staffId.trim().length > 0
      ? data.staffId.trim()
      : null;
    const serviceId = requireString(data.serviceId, "serviceId");
    const customerName = requireString(data.customerName, "customerName");
    const customerPhone = typeof data.customerPhone === "string" && data.customerPhone.trim()
      ? normalizePhone(data.customerPhone)
      : null;
    if (customerName.length < 2 || customerName.length > 80) {
      throw new HttpsError("invalid-argument", "Müşteri adı 2–80 karakter olmalıdır.");
    }
    if (customerPhone && !/^\+90\d{10}$/.test(customerPhone)) {
      throw new HttpsError("invalid-argument", "Geçerli bir Türkiye telefon numarası girin.");
    }
    if (!request.auth?.uid && !customerPhone) {
      throw new HttpsError("unauthenticated", "Misafir randevusu için doğrulanmış telefon numarası zorunludur.");
    }
    const customerEmail = typeof data.customerEmail === "string" && data.customerEmail.trim()
      ? data.customerEmail.trim().toLowerCase()
      : null;
    if (customerEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail)) {
      throw new HttpsError("invalid-argument", "E-posta adresi geçersiz.");
    }
    const notes = typeof data.notes === "string" ? data.notes.trim() : null;
    if (notes && notes.length > 1000) {
      throw new HttpsError("invalid-argument", "Randevu notu 1000 karakteri geçemez.");
    }

    if (typeof data.startAtMillis !== "number") {
      throw new HttpsError("invalid-argument", "startAtMillis zorunludur.");
    }

    const context = await loadBookingContext(businessId, serviceId, staffId);
    const serviceData = context.service;
    const durationMinutes = normalizedBookingDuration(serviceData.durationMinutes);

    const staffData = context.staff;

    const startAt = Timestamp.fromMillis(data.startAtMillis);
    const endAt = Timestamp.fromMillis(
      data.startAtMillis + durationMinutes * 60_000
    );

    const appointments = db.collection(
      `businesses/${businessId}/appointments`
    );

    const timeZone = typeof context.business.timeZone === "string" ? context.business.timeZone : "Europe/Istanbul";
    const selectedLocal = localParts(startAt.toDate(), timeZone);
    const dayStartMs = zonedTimeToMillis(selectedLocal.dateKey, 0, timeZone);
    const selectedUTCDate = new Date(Date.UTC(selectedLocal.year, selectedLocal.month - 1, selectedLocal.day));
    selectedUTCDate.setUTCDate(selectedUTCDate.getUTCDate() + 1);
    const dayEndMs = zonedTimeToMillis(selectedUTCDate.toISOString().slice(0, 10), 0, timeZone);
    const validSlots = buildSlots(context, selectedLocal.dateKey, staffId, []);
    if (!validSlots.includes(startAt.toMillis())) {
      throw new HttpsError("failed-precondition", "Seçilen saat çalışma planına veya rezervasyon kurallarına uygun değil.");
    }
    const maximumDays = Math.max(1, numberOr(context.business.maximumBookingDaysAhead, 30));
    if (startAt.toMillis() > Date.now() + maximumDays * 86_400_000 + 86_400_000) {
      throw new HttpsError("failed-precondition", "Seçilen tarih rezervasyon aralığının dışında.");
    }

    const conflictQuery = appointments
      .where("startAt", ">=", Timestamp.fromMillis(dayStartMs))
      .where("startAt", "<", Timestamp.fromMillis(dayEndMs));

    const publicToken = randomUUID();
    const verificationRef = !request.auth?.uid && customerPhone
      ? db.doc(`verificationCodes/${customerPhone}`)
      : null;

    const result = await db.runTransaction(async (tx) => {
      {
        const conflictSnap = await tx.get(conflictQuery);

        const activeStatuses = new Set(["pending", "confirmed"]);
        const bufferBefore = Math.max(0, numberOr(context.business.bufferBeforeMinutes, 0));
        const bufferAfter = Math.max(0, numberOr(context.business.bufferAfterMinutes, numberOr(context.business.appointmentBufferMinutes, 0)));
        const hasConflict = conflictSnap.docs.some((doc) => {
          const item = doc.data();
          const existingStart = item.startAt as Timestamp | undefined;
          const existingEnd = item.endAt as Timestamp | undefined;
          const status = String(item.status ?? "");

          if (!existingEnd || !existingStart) return false;
          if (staffId && item.staffId && item.staffId !== staffId) return false;
          // Only block on active (non-finished) appointments
          if (!activeStatuses.has(status)) return false;

          // True overlap: existing.start < new.end AND existing.end > new.start
          return (
            existingStart.toMillis() < endAt.toMillis() + bufferAfter * 60_000 &&
            existingEnd.toMillis() > startAt.toMillis() - bufferBefore * 60_000
          );
        });

        if (hasConflict) {
          throw new HttpsError(
            "already-exists",
            "Seçilen saat artık müsait değil."
          );
        }
      }

      if (verificationRef) {
        const verificationSnap = await tx.get(verificationRef);
        const verification = verificationSnap.data();
        const verifiedAt = verification?.verifiedAt as Timestamp | undefined;
        if (!verificationSnap.exists || verification?.verified !== true || !verifiedAt || Date.now() - verifiedAt.toMillis() > 15 * 60_000) {
          throw new HttpsError("unauthenticated", "Telefon doğrulaması eksik veya süresi dolmuş.");
        }
      }

      const appointmentRef = appointments.doc();

      tx.set(appointmentRef, {
        businessId,
        staffId,
        serviceId,
        customerId:
          request.auth?.uid ??
          `guest_${appointmentRef.id}`,
        customerName,
        customerPhone,
        customerEmail,
        startAt,
        endAt,
        status: "confirmed",
        paymentStatus: "unpaid",
        notes,
        publicToken,
        serviceName: String(serviceData.name ?? ""),
        staffName: staffData ? String(staffData.fullName ?? "") : String(context.business.name ?? "İşletme"),
        servicePrice: Number(serviceData.price ?? 0),
        serviceDurationMinutes: durationMinutes,
        source: "online",
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });

      // Create public token mapping for /randevu/[token] access
      const tokenRef = db.doc(`appointmentTokens/${publicToken}`);
      tx.set(tokenRef, {
        businessId,
        appointmentId: appointmentRef.id,
        createdAt: FieldValue.serverTimestamp(),
      });
      if (verificationRef) {
        tx.update(verificationRef, { verified: false, consumedAt: FieldValue.serverTimestamp() });
      }

      return appointmentRef.id;
    });

    return {
      success: true,
      appointmentId: result,
      publicToken,
    };
  }
);

export const appointmentCreated = onDocumentCreated(
  {
    region: "europe-west1",
    document: "businesses/{businessId}/appointments/{appointmentId}",
  },
  async (event) => {
    const snapshot = event.data;
    if (!snapshot) return;

    const { businessId, appointmentId } = event.params;
    const appointment = snapshot.data();

    await db
      .collection(`businesses/${businessId}/notifications`)
      .add({
        type: "appointment_created",
        appointmentId,
        title: "Yeni randevu",
        body: `${appointment.customerName ?? "Müşteri"} için yeni randevu oluşturuldu.`,
        isRead: false,
        createdAt: FieldValue.serverTimestamp(),
      });

    await db
      .collection(`businesses/${businessId}/auditLogs`)
      .add({
        action: "appointment.created",
        appointmentId,
        source: "cloud_function",
        customerName: appointment.customerName ?? null,
        serviceName: appointment.serviceName ?? null,
        staffName: appointment.staffName ?? null,
        createdAt: FieldValue.serverTimestamp(),
      });

    // ── CRM: Auto-upsert customer ──
    const phone = typeof appointment.customerPhone === "string"
      ? appointment.customerPhone
      : null;
    const customerName = typeof appointment.customerName === "string"
      ? appointment.customerName.trim()
      : "Müşteri";
    const customerEmail = typeof appointment.customerEmail === "string"
      ? appointment.customerEmail.trim().toLowerCase()
      : null;

    if (phone) await upsertBusinessCustomer({
      businessId,
      fullName: customerName,
      phone,
      email: customerEmail,
      userId: appointment.customerId ?? null,
      incrementAppointments: true,
    });
  }
);

export const submitReview = onCall(
  { region: "europe-west1" },
  async (request) => {
    const data = request.data ?? {};

    const businessId = requireString(data.businessId, "businessId");
    const appointmentId = requireString(data.appointmentId, "appointmentId");
    const customerName = requireString(data.customerName, "customerName");
    const rating = Number(data.rating);

    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      throw new HttpsError("invalid-argument", "Rating 1-5 arası olmalıdır.");
    }

    // Verify the appointment exists and is completed
    const appointmentRef = db.doc(
      `businesses/${businessId}/appointments/${appointmentId}`
    );
    const appointmentSnap = await appointmentRef.get();

    if (!appointmentSnap.exists) {
      throw new HttpsError("not-found", "Randevu bulunamadı.");
    }

    const appointmentData = appointmentSnap.data()!;
    if (appointmentData.status !== "completed") {
      throw new HttpsError(
        "failed-precondition",
        "Sadece tamamlanmış randevular değerlendirilebilir."
      );
    }

    // Check for duplicate review
    const existingReviews = await db
      .collection(`businesses/${businessId}/reviews`)
      .where("appointmentId", "==", appointmentId)
      .get();

    if (!existingReviews.empty) {
      throw new HttpsError(
        "already-exists",
        "Bu randevu için zaten değerlendirme yapılmış."
      );
    }

    const comment =
      typeof data.comment === "string" ? data.comment.trim() : null;

    const reviewRef = db.collection(`businesses/${businessId}/reviews`).doc();

    await db.runTransaction(async (tx) => {
      tx.set(reviewRef, {
        businessId,
        customerId: appointmentData.customerId ?? `guest_review`,
        customerName,
        appointmentId,
        serviceId: appointmentData.serviceId ?? null,
        staffId: appointmentData.staffId ?? null,
        rating,
        comment,
        isVisible: true,
        isModerated: false,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });

      // Update business rating
      const businessRef = db.doc(`businesses/${businessId}`);
      const businessSnap = await tx.get(businessRef);
      const businessData = businessSnap.data() ?? {};
      const oldCount = Number(businessData.reviewCount ?? 0);
      const oldRating = Number(businessData.rating ?? 0);
      const newCount = oldCount + 1;
      const newRating = (oldRating * oldCount + rating) / newCount;

      tx.update(businessRef, {
        rating: Math.round(newRating * 100) / 100,
        reviewCount: newCount,
        updatedAt: FieldValue.serverTimestamp(),
      });
    });

    return { success: true, reviewId: reviewRef.id };
  }
);

// ━━━ Phone Verification OTP ━━━

// ━━━ Phone Verification OTP / Mutlucell ━━━

function normalizePhone(raw: string): string {
  let phone = raw
    .trim()
    .replace(/\s+/g, "")
    .replace(/[()-]/g, "");

  if (phone.startsWith("0090")) {
    phone = "+" + phone.slice(2);
  }

  if (phone.startsWith("90") && !phone.startsWith("+90")) {
    phone = "+" + phone;
  }

  if (phone.startsWith("0")) {
    phone = "+90" + phone.slice(1);
  }

  if (!phone.startsWith("+")) {
    phone = "+90" + phone;
  }

  return phone;
}

function mutlucellPhone(phone: string): string {
  const normalized = normalizePhone(phone);

  if (!/^\+90\d{10}$/.test(normalized)) {
    throw new HttpsError(
      "invalid-argument",
      "Geçerli bir Türkiye telefon numarası girin."
    );
  }

  // +905321234567 -> 5321234567
  return normalized.slice(3);
}

function xmlEscape(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function otpHash(phone: string, code: string): string {
  return createHash("sha256")
    .update(`${phone}:${code}`)
    .digest("hex");
}

function mutlucellErrorMessage(code: string): string {
  const messages: Record<string, string> = {
    "20": "Mutlucell SMS isteği hatalı oluşturuldu.",
    "21": "Mutlucell SMS gönderici başlığı geçersiz veya hesabınıza tanımlı değil.",
    "22": "Mutlucell SMS bakiyesi yetersiz.",
    "23": "Mutlucell kullanıcı adı veya API anahtarı hatalı.",
    "24": "Mutlucell hesabında başka bir SMS işlemi devam ediyor.",
    "25": "Mutlucell SMS servisi geçici olarak kullanılamıyor.",
    "30": "Mutlucell hesabı henüz aktive edilmemiş.",
    "34": "Mutlucell hesabında API erişimi kapalı.",
  };

  return (
    messages[code] ??
    `Mutlucell SMS gönderimi başarısız oldu. Hata kodu: ${code}`
  );
}

type MutlucellConfiguration = {
  username: string;
  apiKey: string;
  senderTitle: string;
  enabled: boolean;
  fallbackEnabled: boolean;
  source: "admin" | "secret" | "none";
};

async function getMutlucellConfiguration(): Promise<MutlucellConfiguration> {
  const snapshot = await db.doc(MUTLUCELL_SETTINGS_PATH).get();
  const data = snapshot.data() ?? {};
  const storedUsername = String(data.username ?? "").trim();
  const storedApiKey = String(data.apiKey ?? "").trim();
  const secretUsername = MUTLUCELL_USERNAME.value().trim();
  const secretApiKey = MUTLUCELL_API_KEY.value().trim();
  const hasStoredConfiguration = snapshot.exists && (
    storedUsername.length > 0 || storedApiKey.length > 0 || String(data.senderTitle ?? "").trim().length > 0
  );
  const hasSecretCredentials = secretUsername.length > 0 && secretApiKey.length > 0;

  return {
    username: storedUsername || secretUsername,
    apiKey: storedApiKey || secretApiKey,
    senderTitle: String(data.senderTitle ?? "").trim(),
    enabled: data.enabled !== false,
    fallbackEnabled: data.fallbackEnabled !== false,
    source: hasStoredConfiguration ? "admin" : hasSecretCredentials ? "secret" : "none",
  };
}

async function sendMutlucellSms(
  phone: string,
  message: string,
  configuration?: MutlucellConfiguration
): Promise<string> {
  const config = configuration ?? await getMutlucellConfiguration();
  const { username, apiKey, senderTitle } = config;

  if (!username || !apiKey) {
    throw new HttpsError(
      "failed-precondition",
      "Mutlucell SMS servisi yapılandırılmamış."
    );
  }

  if (!config.enabled) {
    throw new HttpsError("failed-precondition", "Mutlucell SMS gönderimi süper admin tarafından duraklatıldı.");
  }

  if (!senderTitle) {
    throw new HttpsError(
      "failed-precondition",
      "Mutlucell gönderici başlığı henüz tanımlanmamış veya onaylanmamış."
    );
  }

  const gsm = mutlucellPhone(phone);



  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<smspack
  ka="${xmlEscape(username)}"
  pwd="${xmlEscape(apiKey)}"
  org="${xmlEscape(senderTitle)}"
  charset="turkish"
>
  <mesaj>
    <metin>${xmlEscape(message)}</metin>
    <nums>${xmlEscape(gsm)}</nums>
  </mesaj>
</smspack>`;

  let response: Response;

  try {
    response = await fetch(MUTLUCELL_SEND_URL, {
      method: "POST",
      headers: {
        "Content-Type": "text/xml; charset=UTF-8",
      },
      body: xml,
      signal: AbortSignal.timeout(15_000),
    });
  } catch (error) {
    console.error("Mutlucell network error:", error);

    throw new HttpsError(
      "unavailable",
      "SMS servisine şu anda ulaşılamıyor. Lütfen tekrar deneyin."
    );
  }

  const result = (await response.text()).trim();

  if (!response.ok) {
    console.error("Mutlucell HTTP error:", response.status, result);

    throw new HttpsError(
      "unavailable",
      "SMS servisi geçici olarak kullanılamıyor."
    );
  }

  // Mutlucell başarılı gönderimde $ ile başlayan paket numarası döndürür.
  if (!result.startsWith("$")) {
    console.error("Mutlucell API error:", result);

    throw new HttpsError(
      "unavailable",
      mutlucellErrorMessage(result)
    );
  }

  return result;
}

export const getMutlucellSettings = onCall(
  { region: "europe-west1", secrets: [MUTLUCELL_USERNAME, MUTLUCELL_API_KEY] },
  async (request) => {
    const uid = request.auth?.uid;
    if (!uid) throw new HttpsError("unauthenticated", "Oturum bulunamadı.");
    await requirePlatformAdmin(uid, request.auth?.token.email as string | undefined);
    const [config, snapshot] = await Promise.all([
      getMutlucellConfiguration(),
      db.doc(MUTLUCELL_SETTINGS_PATH).get(),
    ]);
    const data = snapshot.data() ?? {};
    return {
      username: config.username,
      senderTitle: config.senderTitle,
      enabled: config.enabled,
      fallbackEnabled: config.fallbackEnabled,
      hasApiKey: config.apiKey.length > 0,
      apiKeyMasked: config.apiKey ? `••••••${config.apiKey.slice(-4)}` : "",
      source: config.source,
      lastTest: data.lastTest ?? null,
      updatedAt: data.updatedAt ?? null,
    };
  }
);

export const updateMutlucellSettings = onCall(
  { region: "europe-west1", secrets: [MUTLUCELL_USERNAME, MUTLUCELL_API_KEY] },
  async (request) => {
    const uid = request.auth?.uid;
    if (!uid) throw new HttpsError("unauthenticated", "Oturum bulunamadı.");
    await requirePlatformAdmin(uid, request.auth?.token.email as string | undefined);

    const username = requireString(request.data?.username, "Mutlucell kullanıcı adı").slice(0, 120);
    const senderTitle = String(request.data?.senderTitle ?? "").trim().slice(0, 30);
    const apiKey = String(request.data?.apiKey ?? "").trim();
    const enabled = request.data?.enabled !== false;
    const fallbackEnabled = request.data?.fallbackEnabled !== false;
    const ref = db.doc(MUTLUCELL_SETTINGS_PATH);
    const existing = await ref.get();
    const currentApiKey = String(existing.data()?.apiKey ?? "").trim();
    const secretApiKey = MUTLUCELL_API_KEY.value().trim();

    if (enabled && !senderTitle) {
      throw new HttpsError("invalid-argument", "SMS aktifken onaylı gönderici başlığı zorunludur.");
    }
    if (!apiKey && !currentApiKey && !secretApiKey) {
      throw new HttpsError("invalid-argument", "Mutlucell API anahtarı zorunludur.");
    }

    await ref.set({
      username,
      ...(apiKey ? { apiKey } : {}),
      senderTitle,
      enabled,
      fallbackEnabled,
      updatedAt: FieldValue.serverTimestamp(),
      updatedBy: uid,
      ...(!existing.exists ? { createdAt: FieldValue.serverTimestamp() } : {}),
    }, { merge: true });
    await db.collection("platformAuditLogs").add({
      action: "mutlucell.settings_updated",
      actorUid: uid,
      enabled,
      senderTitleConfigured: senderTitle.length > 0,
      apiKeyChanged: apiKey.length > 0,
      createdAt: FieldValue.serverTimestamp(),
    });
    return { success: true };
  }
);

export const testMutlucellSettings = onCall(
  { region: "europe-west1", secrets: [MUTLUCELL_USERNAME, MUTLUCELL_API_KEY] },
  async (request) => {
    const uid = request.auth?.uid;
    if (!uid) throw new HttpsError("unauthenticated", "Oturum bulunamadı.");
    await requirePlatformAdmin(uid, request.auth?.token.email as string | undefined);
    const phone = normalizedPhoneKey(requireString(request.data?.phone, "Test telefonu"));
    const config = await getMutlucellConfiguration();
    const ref = db.doc(MUTLUCELL_SETTINGS_PATH);
    try {
      const providerMessageId = await sendMutlucellSms(
        phone,
        "SeninRandevun Mutlucell bağlantı testi başarılıdır.",
        config
      );
      await ref.set({
        lastTest: {
          success: true,
          phone,
          providerMessageId,
          testedAt: FieldValue.serverTimestamp(),
          testedBy: uid,
        },
      }, { merge: true });
      return { success: true, providerMessageId };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Mutlucell testi başarısız oldu.";
      await ref.set({
        lastTest: {
          success: false,
          phone,
          error: message,
          testedAt: FieldValue.serverTimestamp(),
          testedBy: uid,
        },
      }, { merge: true });
      throw error;
    }
  }
);

export const sendVerificationCode = onCall(
  {
    region: "europe-west1",
    secrets: [
      MUTLUCELL_USERNAME,
      MUTLUCELL_API_KEY,
    ],
  },
  async (request) => {
    const data = request.data ?? {};

    const rawPhone = requireString(data.phone, "phone");
    const phone = normalizePhone(rawPhone);

    if (!/^\+90\d{10}$/.test(phone)) {
      throw new HttpsError(
        "invalid-argument",
        "Geçerli bir Türkiye telefon numarası girin."
      );
    }

    const codeDocRef = db.doc(`verificationCodes/${phone}`);
    const existing = await codeDocRef.get();

    // 60 saniyelik tekrar gönderme limiti
    if (existing.exists) {
      const lastSent =
        existing.data()?.sentAt as Timestamp | undefined;

      if (lastSent) {
        const secondsAgo =
          (Date.now() - lastSent.toMillis()) / 1000;

        if (secondsAgo < 60) {
          throw new HttpsError(
            "resource-exhausted",
            `Lütfen ${Math.ceil(60 - secondsAgo)} saniye bekleyin.`
          );
        }
      }
    }

    const code = String(randomInt(100000, 1000000));

    const isEmulator =
      process.env.FUNCTIONS_EMULATOR === "true";

    // localhost'tan canlı Firebase Function çağrıldığında da
    // test kodunu gösterebilmemiz için:
    const requestOrigin =
      String(request.rawRequest.headers.origin ?? "");

    const isLocalClient =
      /^http:\/\/localhost(?::\d+)?$/.test(requestOrigin) ||
      /^http:\/\/127\.0\.0\.1(?::\d+)?$/.test(requestOrigin);

    const allowDevCode =
      isEmulator || isLocalClient;

    let mutlucellConfiguration: MutlucellConfiguration | null = null;
    let providerMessageId: string | null = null;
    let smsDelivered = false;
    let smsError: string | null = null;

    // Emulator'da Mutlucell'e hiç gitme
    if (isEmulator) {
      console.log(
        `[SMS emulator] Verification code for ${phone}: ${code}`
      );
    } else {
      try {
        mutlucellConfiguration = await getMutlucellConfiguration();
        providerMessageId = await sendMutlucellSms(
          phone,
          `SeninRandevun doğrulama kodunuz: ${code}. Kod 5 dakika geçerlidir.`,
          mutlucellConfiguration ?? undefined
        );

        smsDelivered = true;
      } catch (error) {
        console.error(
          "Mutlucell SMS gönderilemedi:",
          error
        );

        smsError =
          error instanceof Error
            ? error.message
            : "SMS gönderimi başarısız.";
      }
    }

    /*
      SMS gönderilemese dahi OTP kaydedilsin,
      böylece canlıda SMS hatası olduğunda
      kullanıcı fallback koduyla giriş yapabilsin.
    */
    await codeDocRef.set({
      codeHash: otpHash(phone, code),
      phone,

      attempts: 0,
      verified: false,

      provider: isEmulator
        ? "emulator"
        : smsDelivered
          ? "mutlucell"
          : "fallback",

      providerMessageId,

      smsDelivered,
      smsError,

      sentAt: FieldValue.serverTimestamp(),

      expiresAt: Timestamp.fromMillis(
        Date.now() + 5 * 60 * 1000
      ),
    });

    // SMS başarılı
    if (smsDelivered) {
      return {
        success: true,
        smsDelivered: true,
        message:
          "Doğrulama kodu telefonunuza gönderildi.",

        // localhost'ta test ederken ayrıca kodu da görebilirsin
        ...(allowDevCode
          ? { _devCode: code }
          : {}),
      };
    }

    // SMS GÖNDERİLEMEDİ FALLBACK (Lokal veya Canlı)
    console.warn(
      `[OTP fallback] SMS gönderilemedi. Test code for ${phone}: ${code}`
    );

    if (mutlucellConfiguration?.fallbackEnabled === false) {
      throw new HttpsError(
        "unavailable",
        smsError ?? "SMS gönderilemedi. Lütfen daha sonra tekrar deneyin."
      );
    }

    return {
      success: true,
      smsDelivered: false,
      fallback: true,

      message:
        "SMS gönderilemedi. Test doğrulama kodu oluşturuldu.",

      _devCode: code,
    };
  }
);

export const verifyPhoneCode = onCall(
  { region: "europe-west1" },
  async (request) => {
    const data = request.data ?? {};

    const rawPhone = requireString(data.phone, "phone");
    const inputCode = requireString(data.code, "code").trim();
    const phone = normalizePhone(rawPhone);

    if (!/^\+90\d{10}$/.test(phone)) {
      throw new HttpsError(
        "invalid-argument",
        "Geçerli bir Türkiye telefon numarası girin."
      );
    }

    if (!/^\d{6}$/.test(inputCode)) {
      throw new HttpsError(
        "invalid-argument",
        "Doğrulama kodu 6 haneli olmalıdır."
      );
    }

    const codeDocRef = db.doc(
      `verificationCodes/${phone}`
    );

    const codeSnap = await codeDocRef.get();

    if (!codeSnap.exists) {
      throw new HttpsError(
        "not-found",
        "Doğrulama kodu bulunamadı. Lütfen tekrar kod gönderin."
      );
    }

    const codeData = codeSnap.data()!;

    const expiresAt =
      codeData.expiresAt as Timestamp | undefined;

    if (
      !expiresAt ||
      expiresAt.toMillis() < Date.now()
    ) {
      await codeDocRef.delete();

      throw new HttpsError(
        "deadline-exceeded",
        "Doğrulama kodunun süresi doldu. Lütfen yeni kod gönderin."
      );
    }

    if (codeData.verified === true) {
      return {
        success: true,
        verified: true,
      };
    }

    const attempts = Number(
      codeData.attempts ?? 0
    );

    if (attempts >= 3) {
      await codeDocRef.delete();

      throw new HttpsError(
        "permission-denied",
        "Çok fazla hatalı deneme. Lütfen yeni kod gönderin."
      );
    }

    const expectedHash =
      String(codeData.codeHash ?? "");

    const suppliedHash =
      otpHash(phone, inputCode);

    if (
      !expectedHash ||
      expectedHash !== suppliedHash
    ) {
      const nextAttempts = attempts + 1;

      if (nextAttempts >= 3) {
        await codeDocRef.delete();
      } else {
        await codeDocRef.update({
          attempts: FieldValue.increment(1),
        });
      }

      throw new HttpsError(
        "invalid-argument",
        nextAttempts >= 3
          ? "Çok fazla hatalı deneme. Lütfen yeni kod gönderin."
          : `Yanlış kod. ${3 - nextAttempts
          } deneme hakkınız kaldı.`
      );
    }

    await codeDocRef.update({
      verified: true,
      verifiedAt: FieldValue.serverTimestamp(),
      attempts: 0,
    });

    return {
      success: true,
      verified: true,
    };
  }
);

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   EMAIL VERIFICATION & PASSWORD RESET (6-digit code)
   Uses Firebase Trigger Email extension via "mail" collection
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

function buildEmailTemplate(code: string, type: "verify" | "reset"): string {
  const isVerify = type === "verify";
  const title = isVerify ? "E-posta Doğrulama" : "Şifre Sıfırlama";
  const heading = isVerify
    ? "E-posta adresinizi doğrulayın"
    : "Şifrenizi sıfırlayın";
  const description = isVerify
    ? "Hesabınızı aktif etmek için aşağıdaki 6 haneli kodu kullanın."
    : "Şifrenizi sıfırlamak için aşağıdaki 6 haneli kodu kullanın.";
  const digits = code.split("");

  return `<!DOCTYPE html>
<html lang="tr">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>${title} — SeninRandevun</title>
</head>
<body style="margin:0;padding:0;background-color:#f0f4f8;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f0f4f8;padding:40px 20px;">
<tr><td align="center">
<table role="presentation" width="520" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:24px;overflow:hidden;box-shadow:0 20px 60px rgba(0,0,0,0.08);">

  <!-- Header gradient -->
  <tr><td style="background:linear-gradient(135deg,#0284c7,#06b6d4,#8b5cf6);padding:40px 40px 30px;text-align:center;">
    <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto;">
    <tr><td style="background:rgba(255,255,255,0.2);border-radius:16px;padding:10px 20px;">
      <span style="font-size:22px;font-weight:800;color:#ffffff;letter-spacing:-0.5px;">Senin<span style="opacity:0.9;">Randevun</span></span>
    </td></tr></table>
    <p style="margin:20px 0 0;color:rgba(255,255,255,0.9);font-size:14px;font-weight:500;">${title}</p>
  </td></tr>

  <!-- Body -->
  <tr><td style="padding:40px;">
    <h1 style="margin:0 0 12px;font-size:24px;font-weight:800;color:#0f172a;text-align:center;">${heading}</h1>
    <p style="margin:0 0 32px;font-size:15px;color:#64748b;text-align:center;line-height:1.6;">${description}</p>

    <!-- Code digits -->
    <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto;">
    <tr>
      ${digits.map((d) => `<td style="padding:0 4px;"><div style="width:48px;height:56px;background:linear-gradient(135deg,#f0f9ff,#e0f2fe);border:2px solid #0284c7;border-radius:14px;text-align:center;line-height:56px;font-size:28px;font-weight:800;color:#0284c7;letter-spacing:2px;">${d}</div></td>`).join("")}
    </tr>
    </table>

    <!-- Timer warning -->
    <div style="margin:28px auto 0;max-width:340px;background:#fffbeb;border:1px solid #fbbf24;border-radius:12px;padding:14px 18px;text-align:center;">
      <span style="font-size:13px;color:#92400e;">⏱️ Bu kod <strong>5 dakika</strong> içinde geçerliliğini yitirecektir.</span>
    </div>

    <!-- Security note -->
    <div style="margin:24px 0 0;padding:16px;background:#f8fafc;border-radius:12px;">
      <p style="margin:0;font-size:12px;color:#94a3b8;text-align:center;line-height:1.6;">
        🔒 Bu kodu kimseyle paylaşmayın. SeninRandevun ekibi sizden asla doğrulama kodu istemez.
      </p>
    </div>
  </td></tr>

  <!-- Footer -->
  <tr><td style="background:#f8fafc;border-top:1px solid #e2e8f0;padding:24px 40px;text-align:center;">
    <p style="margin:0 0 4px;font-size:12px;color:#94a3b8;">Bu e-postayı siz talep ettiyseniz herhangi bir işlem yapmanıza gerek yok.</p>
    <p style="margin:0;font-size:12px;color:#94a3b8;">© ${new Date().getFullYear()} SeninRandevun — Zamanın değerli, randevun bizde.</p>
    <p style="margin:8px 0 0;font-size:11px;color:#cbd5e1;">seninrandevun.com</p>
  </td></tr>

</table>
</td></tr>
</table>
</body>
</html>`;
}

// ── Send Email Verification Code ──
export const sendEmailVerificationCode = onCall(
  { region: "europe-west1" },
  async (request) => {
    const data = request.data ?? {};
    const email = requireString(data.email, "email").toLowerCase();

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new HttpsError("invalid-argument", "Geçerli bir e-posta adresi girin.");
    }

    const codeDocRef = db.doc(`emailVerificationCodes/${email}`);
    const existing = await codeDocRef.get();

    // Rate limit: 60 seconds
    if (existing.exists) {
      const lastSent = existing.data()?.sentAt as Timestamp | undefined;
      if (lastSent) {
        const secondsAgo = (Date.now() - lastSent.toMillis()) / 1000;
        if (secondsAgo < 60) {
          throw new HttpsError(
            "resource-exhausted",
            `Lütfen ${Math.ceil(60 - secondsAgo)} saniye bekleyin.`
          );
        }
      }
    }

    const code = String(randomInt(100000, 999999));

    // Store the code
    await codeDocRef.set({
      code,
      email,
      type: "email_verification",
      attempts: 0,
      verified: false,
      sentAt: FieldValue.serverTimestamp(),
      expiresAt: Timestamp.fromMillis(Date.now() + 5 * 60 * 1000),
    });

    // Write to "mail" collection — Trigger Email extension picks this up
    await db.collection("mail").add({
      to: email,
      message: {
        subject: "SeninRandevun — E-posta Doğrulama Kodu: " + code,
        html: buildEmailTemplate(code, "verify"),
      },
    });

    return { success: true, message: "Doğrulama kodu e-posta adresinize gönderildi." };
  }
);

// ── Verify Email Code ──
export const verifyEmailCode = onCall(
  { region: "europe-west1" },
  async (request) => {
    const data = request.data ?? {};
    const email = requireString(data.email, "email").toLowerCase();
    const inputCode = requireString(data.code, "code");

    const codeDocRef = db.doc(`emailVerificationCodes/${email}`);
    const codeSnap = await codeDocRef.get();

    if (!codeSnap.exists) {
      throw new HttpsError("not-found", "Doğrulama kodu bulunamadı. Lütfen tekrar kod gönderin.");
    }

    const codeData = codeSnap.data()!;

    const expiresAt = codeData.expiresAt as Timestamp | undefined;
    if (expiresAt && expiresAt.toMillis() < Date.now()) {
      await codeDocRef.delete();
      throw new HttpsError("deadline-exceeded", "Kodun süresi doldu. Lütfen yeni kod gönderin.");
    }

    const attempts = Number(codeData.attempts ?? 0);
    if (attempts >= 5) {
      await codeDocRef.delete();
      throw new HttpsError("permission-denied", "Çok fazla hatalı deneme. Yeni kod gönderin.");
    }

    if (codeData.code !== inputCode.trim()) {
      await codeDocRef.update({ attempts: FieldValue.increment(1) });
      throw new HttpsError("invalid-argument", `Yanlış kod. ${4 - attempts} deneme hakkınız kaldı.`);
    }

    await codeDocRef.update({
      verified: true,
      verifiedAt: FieldValue.serverTimestamp(),
    });

    return { success: true, verified: true };
  }
);

// ── Send Password Reset Code ──
export const sendPasswordResetCode = onCall(
  { region: "europe-west1" },
  async (request) => {
    const data = request.data ?? {};
    const email = requireString(data.email, "email").toLowerCase();

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new HttpsError("invalid-argument", "Geçerli bir e-posta adresi girin.");
    }

    const codeDocRef = db.doc(`passwordResetCodes/${email}`);
    const existing = await codeDocRef.get();

    if (existing.exists) {
      const lastSent = existing.data()?.sentAt as Timestamp | undefined;
      if (lastSent) {
        const secondsAgo = (Date.now() - lastSent.toMillis()) / 1000;
        if (secondsAgo < 60) {
          throw new HttpsError(
            "resource-exhausted",
            `Lütfen ${Math.ceil(60 - secondsAgo)} saniye bekleyin.`
          );
        }
      }
    }

    const code = String(randomInt(100000, 999999));

    await codeDocRef.set({
      code,
      email,
      type: "password_reset",
      attempts: 0,
      verified: false,
      sentAt: FieldValue.serverTimestamp(),
      expiresAt: Timestamp.fromMillis(Date.now() + 5 * 60 * 1000),
    });

    await db.collection("mail").add({
      to: email,
      message: {
        subject: "SeninRandevun — Şifre Sıfırlama Kodu: " + code,
        html: buildEmailTemplate(code, "reset"),
      },
    });

    return { success: true, message: "Şifre sıfırlama kodu e-posta adresinize gönderildi." };
  }
);

// ── Reset Password with Code ──
export const resetPasswordWithCode = onCall(
  { region: "europe-west1" },
  async (request) => {
    const data = request.data ?? {};
    const email = requireString(data.email, "email").toLowerCase();
    const inputCode = requireString(data.code, "code");
    const newPassword = requireString(data.newPassword, "newPassword");

    if (newPassword.length < 8) {
      throw new HttpsError("invalid-argument", "Şifre en az 8 karakter olmalıdır.");
    }

    const codeDocRef = db.doc(`passwordResetCodes/${email}`);
    const codeSnap = await codeDocRef.get();

    if (!codeSnap.exists) {
      throw new HttpsError("not-found", "Sıfırlama kodu bulunamadı. Lütfen tekrar kod gönderin.");
    }

    const codeData = codeSnap.data()!;

    const expiresAt = codeData.expiresAt as Timestamp | undefined;
    if (expiresAt && expiresAt.toMillis() < Date.now()) {
      await codeDocRef.delete();
      throw new HttpsError("deadline-exceeded", "Kodun süresi doldu. Lütfen yeni kod gönderin.");
    }

    const attempts = Number(codeData.attempts ?? 0);
    if (attempts >= 5) {
      await codeDocRef.delete();
      throw new HttpsError("permission-denied", "Çok fazla hatalı deneme. Yeni kod gönderin.");
    }

    if (codeData.code !== inputCode.trim()) {
      await codeDocRef.update({ attempts: FieldValue.increment(1) });
      throw new HttpsError("invalid-argument", `Yanlış kod. ${4 - attempts} deneme hakkınız kaldı.`);
    }

    // Code is correct — update password via Admin SDK
    const { getAuth } = await import("firebase-admin/auth");
    const auth = getAuth();

    try {
      const userRecord = await auth.getUserByEmail(email);
      await auth.updateUser(userRecord.uid, { password: newPassword });
    } catch {
      throw new HttpsError("not-found", "Bu e-posta ile kayıtlı kullanıcı bulunamadı.");
    }

    // Clean up the code
    await codeDocRef.delete();

    return { success: true, message: "Şifreniz başarıyla güncellendi." };
  }
);
