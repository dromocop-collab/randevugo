import { initializeApp } from "firebase-admin/app";
import {
  FieldValue,
  Timestamp,
  getFirestore,
} from "firebase-admin/firestore";
import { HttpsError, onCall } from "firebase-functions/v2/https";
import { onDocumentCreated } from "firebase-functions/v2/firestore";
import { randomUUID, randomInt } from "crypto";

initializeApp();

const db = getFirestore();

function requireString(value: unknown, name: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new HttpsError("invalid-argument", `${name} alanı zorunludur.`);
  }
  return value.trim();
}

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

    if (typeof data.startAtMillis !== "number") {
      throw new HttpsError("invalid-argument", "startAtMillis zorunludur.");
    }

    const businessRef = db.doc(`businesses/${businessId}`);
    const businessSnap = await businessRef.get();

    if (!businessSnap.exists) {
      throw new HttpsError("not-found", "İşletme bulunamadı.");
    }

    const serviceRef = db.doc(
      `businesses/${businessId}/services/${serviceId}`
    );
    const serviceSnap = await serviceRef.get();

    if (!serviceSnap.exists || serviceSnap.data()?.isActive !== true) {
      throw new HttpsError("failed-precondition", "Hizmet aktif değil.");
    }

    const serviceData = serviceSnap.data()!;
    const durationMinutes = Number(serviceData.durationMinutes ?? 0);
    if (!Number.isFinite(durationMinutes) || durationMinutes <= 0) {
      throw new HttpsError("failed-precondition", "Hizmet süresi geçersiz.");
    }

    let staffData: FirebaseFirestore.DocumentData | null = null;
    if (staffId) {
      const staffRef = db.doc(
        `businesses/${businessId}/staff/${staffId}`
      );
      const staffSnap = await staffRef.get();

      if (!staffSnap.exists || staffSnap.data()?.isActive !== true) {
        throw new HttpsError("failed-precondition", "Çalışan aktif değil.");
      }
      staffData = staffSnap.data()!;
    }

    const startAt = Timestamp.fromMillis(data.startAtMillis);
    const endAt = Timestamp.fromMillis(
      data.startAtMillis + durationMinutes * 60_000
    );

    const appointments = db.collection(
      `businesses/${businessId}/appointments`
    );

    // Use existing staffId+startAt index — only fetch appointments on the same day
    // to minimize reads, then filter in-memory for true overlap
    const dayStartMs = startAt.toMillis() - 24 * 60 * 60 * 1000; // 1 day before
    const dayStart = Timestamp.fromMillis(dayStartMs);

    const conflictQuery = staffId
      ? appointments
          .where("staffId", "==", staffId)
          .where("startAt", ">=", dayStart)
      : null;

    const publicToken = randomUUID();

    const result = await db.runTransaction(async (tx) => {
      if (conflictQuery) {
        const conflictSnap = await tx.get(conflictQuery);

        const activeStatuses = new Set(["pending", "confirmed"]);
        const hasConflict = conflictSnap.docs.some((doc) => {
          const item = doc.data();
          const existingStart = item.startAt as Timestamp | undefined;
          const existingEnd = item.endAt as Timestamp | undefined;
          const status = String(item.status ?? "");

          if (!existingEnd || !existingStart) return false;
          // Only block on active (non-finished) appointments
          if (!activeStatuses.has(status)) return false;

          // True overlap: existing.start < new.end AND existing.end > new.start
          return (
            existingStart.toMillis() < endAt.toMillis() &&
            existingEnd.toMillis() > startAt.toMillis()
          );
        });

        if (hasConflict) {
          throw new HttpsError(
            "already-exists",
            "Seçilen saat artık müsait değil."
          );
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
        customerPhone:
          typeof data.customerPhone === "string"
            ? data.customerPhone.trim()
            : null,
        customerEmail:
          typeof data.customerEmail === "string"
            ? data.customerEmail.trim().toLowerCase()
            : null,
        startAt,
        endAt,
        status: "confirmed",
        paymentStatus: "unpaid",
        notes:
          typeof data.notes === "string"
            ? data.notes.trim()
            : null,
        publicToken,
        serviceName: String(serviceData.name ?? ""),
        staffName: staffData ? String(staffData.fullName ?? "") : String(businessSnap.data()?.name ?? "İşletme"),
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
      ? appointment.customerPhone.trim()
      : null;
    const customerName = typeof appointment.customerName === "string"
      ? appointment.customerName.trim()
      : "Müşteri";
    const customerEmail = typeof appointment.customerEmail === "string"
      ? appointment.customerEmail.trim().toLowerCase()
      : null;

    if (phone) {
      const customersRef = db.collection(`businesses/${businessId}/customers`);
      const existing = await customersRef.where("phone", "==", phone).limit(1).get();

      if (!existing.empty) {
        // Update existing customer
        const customerDoc = existing.docs[0];
        await customerDoc.ref.update({
          fullName: customerName,
          ...(customerEmail ? { email: customerEmail } : {}),
          totalAppointments: FieldValue.increment(1),
          lastVisitAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        });
      } else {
        // Create new customer
        await customersRef.add({
          fullName: customerName,
          phone,
          email: customerEmail,
          totalAppointments: 1,
          completedAppointments: 0,
          cancelledAppointments: 0,
          noShowAppointments: 0,
          totalSpent: 0,
          lastVisitAt: FieldValue.serverTimestamp(),
          createdAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        });
      }
    }
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

function normalizePhone(raw: string): string {
  let phone = raw.replace(/\s+/g, "").replace(/[()-]/g, "");
  if (phone.startsWith("0")) phone = "+90" + phone.slice(1);
  if (!phone.startsWith("+")) phone = "+90" + phone;
  return phone;
}

export const sendVerificationCode = onCall(
  { region: "europe-west1" },
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

    // Rate limit: 60 seconds between sends
    if (existing.exists) {
      const lastSent = existing.data()?.sentAt as Timestamp | undefined;
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

    const code = String(randomInt(100000, 999999));

    await codeDocRef.set({
      code,
      phone,
      attempts: 0,
      verified: false,
      sentAt: FieldValue.serverTimestamp(),
      expiresAt: Timestamp.fromMillis(Date.now() + 5 * 60 * 1000),
    });

    // TODO: Integrate real SMS provider (Netgsm, Twilio, etc.)
    // For now, log the code for development/testing
    console.log(`[SMS] Verification code for ${phone}: ${code}`);

    return {
      success: true,
      message: "Doğrulama kodu gönderildi.",
      // Remove this in production — only for development
      _devCode: code,
    };
  }
);

export const verifyPhoneCode = onCall(
  { region: "europe-west1" },
  async (request) => {
    const data = request.data ?? {};
    const rawPhone = requireString(data.phone, "phone");
    const inputCode = requireString(data.code, "code");
    const phone = normalizePhone(rawPhone);

    const codeDocRef = db.doc(`verificationCodes/${phone}`);
    const codeSnap = await codeDocRef.get();

    if (!codeSnap.exists) {
      throw new HttpsError(
        "not-found",
        "Doğrulama kodu bulunamadı. Lütfen tekrar kod gönderin."
      );
    }

    const codeData = codeSnap.data()!;

    // Check expiration
    const expiresAt = codeData.expiresAt as Timestamp | undefined;
    if (expiresAt && expiresAt.toMillis() < Date.now()) {
      await codeDocRef.delete();
      throw new HttpsError(
        "deadline-exceeded",
        "Doğrulama kodunun süresi doldu. Lütfen yeni kod gönderin."
      );
    }

    // Check max attempts
    const attempts = Number(codeData.attempts ?? 0);
    if (attempts >= 3) {
      await codeDocRef.delete();
      throw new HttpsError(
        "permission-denied",
        "Çok fazla hatalı deneme. Lütfen yeni kod gönderin."
      );
    }

    // Verify code
    if (codeData.code !== inputCode.trim()) {
      await codeDocRef.update({
        attempts: FieldValue.increment(1),
      });
      throw new HttpsError(
        "invalid-argument",
        `Yanlış kod. ${2 - attempts} deneme hakkınız kaldı.`
      );
    }

    // Mark as verified
    await codeDocRef.update({
      verified: true,
      verifiedAt: FieldValue.serverTimestamp(),
    });

    return { success: true, verified: true };
  }
);
