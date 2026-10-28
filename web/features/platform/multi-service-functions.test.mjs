// Emülatör testi: tek randevuda birden fazla hizmet (getAvailableSlots/Dates + createAppointment + saat değiştirme).
// Çalıştır: npm run test:multiservice:emulator
import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { initializeApp, deleteApp } from "firebase/app";
import { getAuth, connectAuthEmulator, signInAnonymously } from "firebase/auth";
import { getFunctions, connectFunctionsEmulator, httpsCallable } from "firebase/functions";

const requireFunctions = createRequire(new URL("../../../functions/package.json", import.meta.url));
const { initializeApp: initializeAdminApp, deleteApp: deleteAdminApp } = requireFunctions("firebase-admin/app");
const { getFirestore, Timestamp } = requireFunctions("firebase-admin/firestore");
const projectId = "demo-availability-phase8";
const adminApp = initializeAdminApp({ projectId }, "multi-service-test");
const db = getFirestore(adminApp);
const apps = [];

async function client(name) {
  const app = initializeApp({ projectId, apiKey: "emulator-only", authDomain: `${projectId}.firebaseapp.com` }, name);
  apps.push(app);
  const auth = getAuth(app);
  connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });
  const { user } = await signInAnonymously(auth);
  const functions = getFunctions(app, "europe-west1");
  connectFunctionsEmulator(functions, "127.0.0.1", 5001);
  return { uid: user.uid, call: (fn, data) => httpsCallable(functions, fn)(data) };
}

const businessId = "multi-service-business";
const dateKey = new Date(Date.now() + 3 * 86_400_000).toISOString().slice(0, 10);
/** İstanbul saatiyle (UTC+3) o günün HH:MM'i. */
const at = (hour, minute = 0) => Date.parse(`${dateKey}T${String(hour - 3).padStart(2, "0")}:${String(minute).padStart(2, "0")}:00.000Z`);
const phone = "+905551112233";

async function verifyPhone() {
  await db.doc(`verificationCodes/${phone}`).set({ verified: true, verifiedAt: Timestamp.now() });
}

async function seed(manager) {
  await db.doc(`businesses/${businessId}`).set({ name: "Çoklu Hizmet Salonu", slug: businessId, ownerUid: manager.uid,
    status: "active", isPublished: true, isSuspended: false, timeZone: "Europe/Istanbul", minimumBookingNoticeMinutes: 30,
    slotIntervalMinutes: 15, maximumBookingDaysAhead: 30, bufferAfterMinutes: 0 });
  await db.doc(`subscriptions/${businessId}`).set({ businessId, userId: manager.uid, status: "active", accessMode: "lifetime", isLifetime: true });
  await db.doc(`businesses/${businessId}/members/${manager.uid}`).set({ uid: manager.uid, role: "manager" });
  const services = {
    kesim: { name: "Saç Kesimi", durationMinutes: 30, price: 300, category: "hair" },
    sakal: { name: "Sakal", durationMinutes: 20, price: 150, category: "hair" },
    boya: { name: "Saç Boyama", durationMinutes: 60, price: 800, category: "hair", priceType: "from",
      variants: [{ id: "kisa", name: "Kısa", price: 800, durationMinutes: 60 }, { id: "uzun", name: "Uzun", price: 1200, durationMinutes: 90 }] },
    tirnak: { name: "Manikür", durationMinutes: 45, price: 400, category: "nail" },
    uzun: { name: "Keratin", durationMinutes: 420, price: 3000, category: "hair" },
    kapali: { name: "Kapalı Hizmet", durationMinutes: 30, price: 100, category: "hair", isBookableOnline: false },
  };
  await Promise.all(Object.entries(services).map(([id, data]) => db.doc(`businesses/${businessId}/services/${id}`)
    .set({ isActive: true, isBookableOnline: true, ...data })));
  await db.doc(`businesses/${businessId}/staff/ayse`).set({ fullName: "Ayşe", isActive: true, serviceIds: [], specialtyCategoryIds: ["hair"], workingHours: [] });
  await db.doc(`businesses/${businessId}/staff/zeynep`).set({ fullName: "Zeynep", isActive: true, serviceIds: [], specialtyCategoryIds: ["hair", "nail"], workingHours: [],
    serviceOverrides: { sakal: { durationMinutes: 30, price: 200 } } });
  await Promise.all(Array.from({ length: 7 }, (_, day) =>
    db.doc(`businesses/${businessId}/workingHours/${day}`).set({ day, isOpen: true, start: "09:00", end: "18:00" })));
}

test("çoklu hizmet: müsaitlik toplam süreye göre, randevu toplam fiyat/süre ile yazılır", async () => {
  const manager = await client("multi-manager");
  const customer = await client("multi-customer");
  await seed(manager);

  // Eski istemci (ek hizmet yok) davranışı değişmez: kapanıştan 30 dk önce son slot.
  const singleResponse = (await customer.call("getAvailableSlots", { businessId, serviceId: "kesim", staffId: "ayse", date: dateKey })).data;
  const single = singleResponse.slots;
  assert.equal(single.at(-1).startAtMillis, at(17, 30));
  assert.equal(singleResponse.multiService, true, "web ek hizmet bölümünü bu bayrakla açar");

  // Kesim + sakal (50 dk) → son slot 17:10 değil 17:00 (15 dk aralık, 17:15+50 > 18:00).
  const combo = (await customer.call("getAvailableSlots", { businessId, serviceId: "kesim", staffId: "ayse", date: dateKey,
    additionalServices: [{ serviceId: "sakal" }] })).data.slots;
  assert.equal(combo.at(-1).startAtMillis, at(17, 0));
  const dates = (await customer.call("getAvailableDates", { businessId, serviceId: "kesim", staffId: "ayse", startDate: dateKey, endDate: dateKey,
    additionalServices: [{ serviceId: "sakal" }] })).data.dates;
  assert.equal(dates[0].slotCount, combo.length);

  // Personel özel süresi ek hizmete de uygulanır (Zeynep'te sakal 30 dk → toplam 60 dk → son slot 17:00).
  const zeynep = (await customer.call("getAvailableSlots", { businessId, serviceId: "kesim", staffId: "zeynep", date: dateKey,
    additionalServices: ["sakal"] })).data.slots;
  assert.equal(zeynep.at(-1).startAtMillis, at(17, 0));

  // Ayşe manikür yapmaz: belirli uzmanla hata, "fark etmez" ile yalnız Zeynep'in saatleri.
  await assert.rejects(customer.call("getAvailableSlots", { businessId, serviceId: "kesim", staffId: "ayse", date: dateKey,
    additionalServices: ["tirnak"] }), /hepsini vermiyor/);
  const anyStaff = (await customer.call("getAvailableSlots", { businessId, serviceId: "kesim", date: dateKey, additionalServices: ["tirnak"] })).data.slots;
  assert.ok(anyStaff.length > 0 && anyStaff.every((slot) => slot.staffId === "zeynep"));

  // Kapalı hizmet, 8 saati aşan toplam ve 5'ten fazla hizmet reddedilir.
  await assert.rejects(customer.call("getAvailableSlots", { businessId, serviceId: "kesim", staffId: "ayse", date: dateKey, additionalServices: ["kapali"] }), /online randevuya açık değil/);
  await assert.rejects(customer.call("getAvailableSlots", { businessId, serviceId: "boya", variantId: "uzun", staffId: "ayse", date: dateKey, additionalServices: ["uzun"] }), /8 saati/);
  await assert.rejects(customer.call("getAvailableSlots", { businessId, serviceId: "kesim", staffId: "zeynep", date: dateKey,
    additionalServices: ["sakal", "boya", "tirnak", "uzun", "kapali"] }), /en fazla 5/);

  // Randevu: kesim + boya (uzun seçenek) → 120 dk, "…'den başlayan" toplam fiyat.
  await verifyPhone();
  const created = (await customer.call("createAppointment", { businessId, serviceId: "kesim", staffId: "ayse", customerName: "Test Müşteri",
    customerPhone: phone, startAtMillis: at(10), additionalServices: [{ serviceId: "boya", variantId: "uzun" }] })).data;
  const appointment = (await db.doc(`businesses/${businessId}/appointments/${created.appointmentId}`).get()).data();
  assert.equal(appointment.serviceName, "Saç Kesimi");
  assert.deepEqual(appointment.additionalServices, [{ serviceId: "boya", name: "Saç Boyama · Uzun", price: 1200, durationMinutes: 90, priceType: "from", variantId: "uzun" }]);
  assert.equal(appointment.servicePrice, 1500);
  assert.equal(appointment.servicePriceType, "from");
  assert.equal(appointment.primaryServicePrice, 300);
  assert.equal(appointment.primaryServicePriceType, "fixed");
  assert.equal(appointment.primaryServicePriceMax, undefined);
  assert.equal(appointment.primaryServiceDurationMinutes, 30);
  assert.equal(appointment.serviceDurationMinutes, 120);
  assert.equal(appointment.endAt.toMillis(), at(12));

  // Toplam süre boyunca saat dolu: 11:30'da tek hizmetlik randevu da alınamaz.
  const after = (await customer.call("getAvailableSlots", { businessId, serviceId: "kesim", staffId: "ayse", date: dateKey })).data.slots.map((slot) => slot.startAtMillis);
  assert.ok(!after.includes(at(11, 30)) && after.includes(at(12)));
  await verifyPhone();
  await assert.rejects(customer.call("createAppointment", { businessId, serviceId: "kesim", staffId: "ayse", customerName: "Başka",
    customerPhone: phone, startAtMillis: at(11, 30) }), /müsait değil/);

  // Toplam süre kapanışa sığmazsa reddedilir (17:30 + 50 dk > 18:00).
  await verifyPhone();
  await assert.rejects(customer.call("createAppointment", { businessId, serviceId: "kesim", staffId: "ayse", customerName: "Geç",
    customerPhone: phone, startAtMillis: at(17, 30), additionalServices: ["sakal"] }), /toplam süresi bu saate sığmıyor/);

  // Manikürlü randevu manikür yapmayan uzmana taşınamaz; yapan uzmana taşınabilir.
  await verifyPhone();
  const nail = (await customer.call("createAppointment", { businessId, serviceId: "kesim", staffId: "zeynep", customerName: "Tırnak",
    customerPhone: phone, startAtMillis: at(14), additionalServices: ["tirnak"] })).data;
  await assert.rejects(manager.call("rescheduleAppointment", { businessId, appointmentId: nail.appointmentId, staffId: "ayse", startAtMillis: at(15) }), /hepsini vermiyor/);
  await manager.call("rescheduleAppointment", { businessId, appointmentId: nail.appointmentId, staffId: "zeynep", startAtMillis: at(15) });
  const moved = (await db.doc(`businesses/${businessId}/appointments/${nail.appointmentId}`).get()).data();
  assert.equal(moved.endAt.toMillis(), at(16, 15));

  // İşletme panelden ek hizmetleri kaydedince (fiyat tipi göndermez) online seçilen tip korunur, toplam yeniden hesaplanır.
  await manager.call("updateAppointmentServices", { businessId, appointmentId: created.appointmentId,
    additionalServices: [{ serviceId: "boya", name: "Saç Boyama · Uzun", price: 1200, durationMinutes: 90 }, { serviceId: "fon", name: "Fön", price: 100, durationMinutes: 15 }] });
  const edited = (await db.doc(`businesses/${businessId}/appointments/${created.appointmentId}`).get()).data();
  assert.deepEqual(edited.additionalServices[0], { serviceId: "boya", name: "Saç Boyama · Uzun", price: 1200, durationMinutes: 90, priceType: "from", variantId: "uzun" });
  assert.deepEqual(edited.additionalServices[1], { serviceId: "fon", name: "Fön", price: 100, durationMinutes: 15 });
  assert.equal(edited.servicePrice, 1600);
  assert.equal(edited.servicePriceType, "from");
  assert.equal(edited.primaryServicePriceType, "fixed");
  assert.equal(edited.serviceDurationMinutes, 135);
  assert.equal(edited.endAt.toMillis(), at(12, 15));
  // Ek hizmetler kaldırılınca ana hizmetin sabit fiyatına döner.
  await manager.call("updateAppointmentServices", { businessId, appointmentId: created.appointmentId, additionalServices: [] });
  const cleared = (await db.doc(`businesses/${businessId}/appointments/${created.appointmentId}`).get()).data();
  assert.equal(cleared.servicePrice, 300);
  assert.equal(cleared.servicePriceType, "fixed");
  assert.equal(cleared.serviceDurationMinutes, 30);

  // Saat değiştirme ekranı kayıtlı toplam süreyi gönderir: 120 dk'lık randevu için son slot 16:00.
  const reschedule = (await customer.call("getAvailableSlots", { businessId, serviceId: "kesim", staffId: "ayse", date: dateKey,
    appointmentDurationMinutes: 120 })).data.slots;
  assert.equal(reschedule.at(-1).startAtMillis, at(16));

  // İşletme ek hizmeti kapatırsa çoklu seçim reddedilir, tek hizmet çalışmaya devam eder.
  await db.doc(`businesses/${businessId}`).update({ allowMultiServiceBooking: false });
  await assert.rejects(customer.call("getAvailableSlots", { businessId, serviceId: "kesim", staffId: "ayse", date: dateKey, additionalServices: ["sakal"] }), /birden fazla hizmet kabul etmiyor/);
  const disabled = (await customer.call("getAvailableSlots", { businessId, serviceId: "kesim", staffId: "ayse", date: dateKey })).data;
  assert.ok(disabled.slots.length > 0);
  assert.equal(disabled.multiService, false);
});

test.after(async () => {
  await Promise.all(apps.map((app) => deleteApp(app)));
  await deleteAdminApp(adminApp);
});
