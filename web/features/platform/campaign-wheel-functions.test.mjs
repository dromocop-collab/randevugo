// Emülatör testi: kampanya çarkı — ayar, telefon doğrulamalı çevirme (tek hak), ödülün randevuya bağlanması,
// adisyonda düşülmesi, iptalde serbest kalması, puan ödülü, kurallar ve doğrulama kodu (emülatörde SMS yolu).
// Çalıştır: npm run test:wheel:emulator
import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { initializeApp, deleteApp } from "firebase/app";
import { getAuth, connectAuthEmulator, signInAnonymously } from "firebase/auth";
import { getFunctions, connectFunctionsEmulator, httpsCallable } from "firebase/functions";
import { connectFirestoreEmulator, doc, getDoc, getFirestore as getClientFirestore, setDoc, updateDoc } from "firebase/firestore";

const requireFunctions = createRequire(new URL("../../../functions/package.json", import.meta.url));
const { initializeApp: initializeAdminApp, deleteApp: deleteAdminApp } = requireFunctions("firebase-admin/app");
const { getFirestore, Timestamp } = requireFunctions("firebase-admin/firestore");
const projectId = "demo-availability-phase8";
const adminApp = initializeAdminApp({ projectId }, "campaign-wheel-test");
const db = getFirestore(adminApp);
const apps = [];
const AUTH_HOST = process.env.FIREBASE_AUTH_EMULATOR_HOST ?? "127.0.0.1:9099";
const [FS_HOST, FS_PORT] = (process.env.FIRESTORE_EMULATOR_HOST ?? "127.0.0.1:8080").split(":");
const FUNCTIONS_PORT = Number(process.env.TEST_FUNCTIONS_PORT ?? 5001);

async function client(name) {
  const app = initializeApp({ projectId, apiKey: "emulator-only", authDomain: `${projectId}.firebaseapp.com` }, name);
  apps.push(app);
  const auth = getAuth(app);
  connectAuthEmulator(auth, `http://${AUTH_HOST}`, { disableWarnings: true });
  const { user } = await signInAnonymously(auth);
  const functions = getFunctions(app, "europe-west1");
  connectFunctionsEmulator(functions, "127.0.0.1", FUNCTIONS_PORT);
  const firestore = getClientFirestore(app);
  connectFirestoreEmulator(firestore, FS_HOST, Number(FS_PORT));
  return { uid: user.uid, firestore, call: (fn, data) => httpsCallable(functions, fn)(data) };
}

const businessId = "wheel-business";
const dateKey = new Date(Date.now() + 3 * 86_400_000).toISOString().slice(0, 10);
const at = (hour, minute = 0) => Date.parse(`${dateKey}T${String(hour - 3).padStart(2, "0")}:${String(minute).padStart(2, "0")}:00.000Z`);

async function seed(manager) {
  await db.doc(`businesses/${businessId}`).set({ name: "Çark Salonu", slug: businessId, ownerUid: manager.uid,
    status: "active", isPublished: true, isSuspended: false, timeZone: "Europe/Istanbul", minimumBookingNoticeMinutes: 30,
    slotIntervalMinutes: 30, maximumBookingDaysAhead: 30, bufferAfterMinutes: 0 });
  await db.doc(`subscriptions/${businessId}`).set({ businessId, userId: manager.uid, status: "active", accessMode: "lifetime", isLifetime: true });
  await db.doc(`businesses/${businessId}/members/${manager.uid}`).set({ uid: manager.uid, role: "manager" });
  await db.doc(`businesses/${businessId}/services/kesim`).set({ name: "Saç Kesimi", durationMinutes: 30, price: 400, category: "hair", isActive: true, isBookableOnline: true });
  await db.doc(`businesses/${businessId}/services/kas`).set({ name: "Kaş Alımı", durationMinutes: 15, price: 150, category: "hair", isActive: true, isBookableOnline: true });
  await db.doc(`businesses/${businessId}/staff/ayse`).set({ fullName: "Ayşe", isActive: true, serviceIds: [], specialtyCategoryIds: ["hair"], workingHours: [] });
  await Promise.all(Array.from({ length: 7 }, (_, day) =>
    db.doc(`businesses/${businessId}/workingHours/${day}`).set({ day, isOpen: true, start: "09:00", end: "18:00" })));
}

/** Gerçek akış: kod gönder (emülatör _devCode döner) → doğrula. Aynı numara 60 sn içinde tekrar: doğrudan doğrulanmış yazılır. */
const verifiedOnce = new Set();
async function verify(customer, phone) {
  if (verifiedOnce.has(phone)) {
    await db.doc(`verificationCodes/${phone}`).set({ phone, verified: true, verifiedAt: Timestamp.now() });
    return;
  }
  verifiedOnce.add(phone);
  const sent = (await customer.call("sendVerificationCode", { phone })).data;
  assert.equal(sent.channel, "sms", "WhatsApp ayarı yokken SMS yolu");
  await customer.call("verifyPhoneCode", { phone, code: sent._devCode });
}

const onlyPercent = [
  { id: "yuzde", label: "%20 indirim", type: "percent", value: 20, weight: 100 },
  { id: "bos", label: "Bu sefer olmadı", type: "none", weight: 0 },
];

test("ayar: yönetici kaydeder, vitrin özeti olasılık içermez; doğrulama hataları anlaşılır", async () => {
  const manager = await client("wheel-manager");
  await seed(manager);
  await assert.rejects(manager.call("saveCampaignWheelSettings", { businessId, settings: { slices: [onlyPercent[0]] } }), /2 ile 12/);
  await assert.rejects(manager.call("saveCampaignWheelSettings", { businessId, settings: { slices: [
    { id: "x", label: "Ücretsiz", type: "free_service", serviceId: "yok", weight: 10 }, onlyPercent[1],
  ] } }), /hizmet bulunamadı/);

  const saved = (await manager.call("saveCampaignWheelSettings", { businessId, settings: { enabled: true, title: "Kış çarkı", slices: onlyPercent } })).data.settings;
  assert.equal(saved.title, "Kış çarkı");
  assert.ok(saved.campaignId);
  const business = (await db.doc(`businesses/${businessId}`).get()).data();
  assert.equal(business.spinWheelPublic.title, "Kış çarkı");
  assert.equal(JSON.stringify(business.spinWheelPublic).includes("weight"), false);

  const stranger = await client("wheel-stranger");
  await assert.rejects(stranger.call("getCampaignWheelSettings", { businessId }), /permission|yetki/i);
  await assert.rejects(getDoc(doc(stranger.firestore, `businesses/${businessId}/campaignWheel/settings`)), /permission/i);
});

test("çevirme: doğrulama şart, telefon başına tek hak, ödül randevuya bağlanır, adisyonda düşülür", async () => {
  const manager = await client("wheel-manager-2");
  const customer = await client("wheel-customer");
  await seed(manager);
  await manager.call("saveCampaignWheelSettings", { businessId, settings: { enabled: true, title: "Çark", slices: onlyPercent, newCampaign: true } });
  const phone = "+905551110001";

  await assert.rejects(customer.call("spinCampaignWheel", { businessId, phone, customerName: "Ayşe" }), /doğrula/);
  await verify(customer, phone);
  const first = (await customer.call("spinCampaignWheel", { businessId, phone, customerName: "Ayşe" })).data;
  assert.equal(first.alreadySpun, false);
  assert.equal(first.sliceIndex, 0);
  assert.equal(first.prize.type, "percent");
  assert.match(first.code, /^SR-[A-Z2-9]{4}-[A-Z2-9]{4}$/);
  assert.ok(first.expiresAt > Date.now() + 29 * 86_400_000);

  // İkinci çevirme yeni ödül vermez, aynı sonucu döner.
  const again = (await customer.call("spinCampaignWheel", { businessId, phone, customerName: "Ayşe" })).data;
  assert.equal(again.alreadySpun, true);
  assert.equal(again.code, first.code);
  const settings = (await db.doc(`businesses/${businessId}/campaignWheel/settings`).get()).data();
  assert.equal(settings.spins, 1);
  assert.equal(settings.awarded.yuzde, 1);

  // Çevirme doğrulamayı tüketmez: hemen randevu alınabilir; ödül otomatik bağlanır.
  const created = (await customer.call("createAppointment", { businessId, serviceId: "kesim", staffId: "ayse", customerName: "Ayşe", customerPhone: phone, startAtMillis: at(10) })).data;
  assert.equal(created.campaignPrize.text, "%20 indirim");
  assert.equal(created.campaignPrize.estimatedDiscount, 80);
  const appointmentRef = db.doc(`businesses/${businessId}/appointments/${created.appointmentId}`);
  assert.equal((await appointmentRef.get()).data().campaignPrize.spinId.length > 0, true);
  const spinRef = db.doc(`businesses/${businessId}/campaignWheelSpins/${(await appointmentRef.get()).data().campaignPrize.spinId}`);
  assert.equal((await spinRef.get()).data().status, "reserved");

  // Aynı ödül ikinci randevuya bağlanmaz.
  await verify(customer, phone);
  const second = (await customer.call("createAppointment", { businessId, serviceId: "kesim", staffId: "ayse", customerName: "Ayşe", customerPhone: phone, startAtMillis: at(12) })).data;
  assert.equal(second.campaignPrize, null);

  // Adisyon: 400 TL hizmet, 50 TL elle indirim → çark %20 = 80 TL (hizmetten), toplam 270.
  const receipt = (await manager.call("finalizeAppointmentCheckout", { businessId, appointmentId: created.appointmentId, paymentMethod: "cash", discount: 50, paidAmount: 270, loyaltyPointsToUse: 0 })).data;
  assert.equal(receipt.campaignDiscount, 80);
  assert.equal(receipt.total, 270);
  const used = (await spinRef.get()).data();
  assert.equal(used.status, "used");
  assert.equal(used.discountApplied, 80);
  const saved = (await db.doc(`businesses/${businessId}/checkoutReceipts/${created.appointmentId}`).get()).data();
  assert.equal(saved.campaignDiscount, 80);
});

test("iptal edilen randevunun ödülü yeniden kullanılabilir; ücretsiz hizmet yalnız o hizmette bağlanır", async () => {
  const manager = await client("wheel-manager-3");
  const customer = await client("wheel-customer-3");
  await seed(manager);
  await manager.call("saveCampaignWheelSettings", { businessId, settings: { enabled: true, title: "Çark", newCampaign: true, slices: [
    { id: "kas", label: "Ücretsiz kaş", type: "free_service", serviceId: "kas", weight: 100, stock: 1 },
    { id: "bos", label: "Olmadı", type: "none", weight: 0 },
  ] } });
  const phone = "+905551110002";
  await verify(customer, phone);
  const spin = (await customer.call("spinCampaignWheel", { businessId, phone, customerName: "Zeynep" })).data;
  assert.equal(spin.prize.type, "free_service");
  assert.equal(spin.prize.serviceName, "Kaş Alımı");

  // Yalnız kesim → bağlanmaz.
  const plain = (await customer.call("createAppointment", { businessId, serviceId: "kesim", staffId: "ayse", customerName: "Zeynep", customerPhone: phone, startAtMillis: at(9) })).data;
  assert.equal(plain.campaignPrize, null);
  // Kesim + kaş → bağlanır (kaş 150 TL).
  await verify(customer, phone);
  const withKas = (await customer.call("createAppointment", { businessId, serviceId: "kesim", staffId: "ayse", customerName: "Zeynep", customerPhone: phone, startAtMillis: at(14), additionalServices: ["kas"] })).data;
  assert.equal(withKas.campaignPrize.estimatedDiscount, 150);

  // İptal → ödül tekrar "won" (tetikleyici).
  const ref = db.doc(`businesses/${businessId}/appointments/${withKas.appointmentId}`);
  const spinId = (await ref.get()).data().campaignPrize.spinId;
  await ref.update({ status: "cancelled" });
  let status = "";
  for (let i = 0; i < 40 && status !== "won"; i++) {
    await new Promise((resolve) => setTimeout(resolve, 250));
    status = (await db.doc(`businesses/${businessId}/campaignWheelSpins/${spinId}`).get()).data().status;
  }
  assert.equal(status, "won");

  // Stok 1: ikinci kişi ödül alamaz, "none" dilimine düşer.
  const other = "+905551110003";
  await verify(customer, other);
  const second = (await customer.call("spinCampaignWheel", { businessId, phone: other, customerName: "Can" })).data;
  assert.equal(second.prize.type, "none");
  assert.equal(second.code, null);
});

test("puan ödülü anında yüklenir; kapalı/biten kampanya çevrilemez; istemci ayar ve vitrin özetini yazamaz", async () => {
  const manager = await client("wheel-manager-4");
  const customer = await client("wheel-customer-4");
  await seed(manager);
  await manager.call("saveCampaignWheelSettings", { businessId, settings: { enabled: true, title: "Puan", newCampaign: true, slices: [
    { id: "puan", label: "100 puan", type: "points", value: 100, weight: 100 },
    { id: "bos", label: "Olmadı", type: "none", weight: 0 },
  ] } });
  const phone = "+905551110004";
  await verify(customer, phone);
  const spin = (await customer.call("spinCampaignWheel", { businessId, phone, customerName: "Ece" })).data;
  assert.equal(spin.status, "points_awarded");
  const accounts = await db.collection(`businesses/${businessId}/loyaltyAccounts`).where("customerPhone", "==", phone).get();
  assert.equal(accounts.docs[0].data().points, 100);

  await manager.call("saveCampaignWheelSettings", { businessId, settings: { enabled: true, title: "Bitti", endsAt: Date.now() - 1000, startsAt: Date.now() - 5000, slices: onlyPercent } });
  await verify(customer, "+905551110005");
  await assert.rejects(customer.call("spinCampaignWheel", { businessId, phone: "+905551110005", customerName: "X" }), /aktif değil/);

  // Yönetici bile vitrin özetini doğrudan yazamaz; ayar belgesine istemci yazamaz.
  await assert.rejects(updateDoc(doc(manager.firestore, `businesses/${businessId}`), { spinWheelPublic: { title: "Sahte" } }), /permission/i);
  await assert.rejects(setDoc(doc(manager.firestore, `businesses/${businessId}/campaignWheel/settings`), { slices: [] }), /permission/i);
  const rows = (await manager.call("listCampaignWheelSpins", { businessId })).data.spins;
  assert.ok(rows.length >= 1);
});

test.after(async () => {
  await Promise.all(apps.map((app) => deleteApp(app)));
  await deleteAdminApp(adminApp);
});

