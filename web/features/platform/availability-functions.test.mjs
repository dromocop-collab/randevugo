import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { initializeApp, deleteApp } from "firebase/app";
import { getAuth, connectAuthEmulator, signInAnonymously } from "firebase/auth";
import { getFunctions, connectFunctionsEmulator, httpsCallable } from "firebase/functions";
import { getFirestore as getClientDb, connectFirestoreEmulator, collection, doc, getDoc, getDocs,
  query, setDoc, where } from "firebase/firestore";

const requireFunctions = createRequire(new URL("../../../functions/package.json", import.meta.url));
const { initializeApp: initializeAdminApp, deleteApp: deleteAdminApp } = requireFunctions("firebase-admin/app");
const { getFirestore, Timestamp } = requireFunctions("firebase-admin/firestore");
const projectId = "demo-availability-phase8";
const adminApp = initializeAdminApp({ projectId }, "availability-phase8-test");
const db = getFirestore(adminApp);
const apps = [];
const flags = { liveFeaturesMaster: true, liveAvailability: false, liveQueue: false,
  lastMinuteSlots: true, availabilityAlerts: true, liveOperations: false };

async function client(name) {
  const app = initializeApp({ projectId, apiKey: "emulator-only", authDomain: `${projectId}.firebaseapp.com` }, name);
  apps.push(app);
  const auth = getAuth(app);
  connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });
  const { user } = await signInAnonymously(auth);
  const functions = getFunctions(app, "europe-west1");
  connectFunctionsEmulator(functions, "127.0.0.1", 5001);
  const clientDb = getClientDb(app);
  connectFirestoreEmulator(clientDb, "127.0.0.1", 8080);
  return { uid: user.uid, db: clientDb, call: (name, data) => httpsCallable(functions, name)(data) };
}

async function eventually(check, timeoutMs = 15_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (await check()) return;
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  assert.fail("Expected emulator event did not arrive");
}

test("alerts, matching, last-minute projection, privacy and booking race", async () => {
  const customer = await client("availability-customer");
  const other = await client("availability-other");
  const manager = await client("availability-manager");
  const businessId = "availability-business";
  const serviceId = "service-a";
  const staffId = "staff-a";
  const dateKey = new Date(Date.now() + 2 * 86_400_000).toISOString().slice(0, 10);
  const at = (hour) => Date.parse(`${dateKey}T${String(hour - 3).padStart(2, "0")}:00:00.000Z`);
  await db.doc("platformSettings/global").set({ featureFlags: { ...flags, liveFeaturesMaster: false } });
  await db.doc(`businesses/${businessId}`).set({ name: "Test İşletmesi", slug: businessId, ownerUid: manager.uid,
    status: "active", isPublished: true, isSuspended: false, availabilityAlertsEnabled: true,
    lastMinuteSlotsEnabled: true, timeZone: "Europe/Istanbul", minimumBookingNoticeMinutes: 30,
    slotIntervalMinutes: 15, maximumBookingDaysAhead: 30 });
  await db.doc(`businesses/${businessId}/services/${serviceId}`).set({ name: "Saç Kesimi", isActive: true,
    isBookableOnline: true, durationMinutes: 30, category: "hair", assignableStaffIds: [staffId] });
  await db.doc(`businesses/${businessId}/staff/${staffId}`).set({ fullName: "Ayşe", isActive: true,
    serviceIds: [serviceId], specialtyCategoryIds: ["hair"], workingHours: [] });
  await db.doc(`businesses/${businessId}/members/${manager.uid}`).set({ uid: manager.uid, role: "manager" });
  await Promise.all(Array.from({ length: 7 }, (_, day) =>
    db.doc(`businesses/${businessId}/workingHours/${day}`).set({ day, isOpen: true,
      start: "00:00", end: "23:59" })));
  const blockedRef = db.doc(`businesses/${businessId}/appointments/blocked`);
  await blockedRef.set({ businessId, serviceId, staffId, status: "confirmed", customerId: other.uid,
    startAt: Timestamp.fromMillis(at(15)), endAt: Timestamp.fromMillis(at(15) + 30 * 60_000) });
  await db.doc(`businesses/${businessId}/appointments/overlap`).set({ businessId, serviceId, staffId,
    status: "confirmed", customerId: other.uid, startAt: Timestamp.fromMillis(at(15)),
    endAt: Timestamp.fromMillis(at(15) + 30 * 60_000) });

  const input = { businessId, serviceId, staffId, dateKey, startMinute: 15 * 60, endMinute: 15 * 60 + 15 };
  await assert.rejects(customer.call("createAvailabilityAlert", input), (error) => error.message.includes("FEATURE_DISABLED"));
  await db.doc("platformSettings/global").update({ "featureFlags.liveFeaturesMaster": true });
  await assert.rejects(customer.call("createAvailabilityAlert", { ...input, serviceId: "missing" }));
  await assert.rejects(customer.call("createAvailabilityAlert", { ...input, staffId: "missing" }));
  const created = await Promise.all([customer.call("createAvailabilityAlert", input),
    customer.call("createAvailabilityAlert", input)]);
  assert.equal(created[0].data.alertId, created[1].data.alertId);
  const alertId = created[0].data.alertId;
  assert.equal((await getDoc(doc(customer.db, "availabilityAlerts", alertId))).exists(), true);
  await assert.rejects(getDoc(doc(other.db, "availabilityAlerts", alertId)));
  await assert.rejects(setDoc(doc(customer.db, "availabilityAlerts", alertId), { status: "claimed" }, { merge: true }));
  await assert.rejects(setDoc(doc(other.db, `businesses/${businessId}`), { availabilityAlertsEnabled: false }, { merge: true }));
  await assert.rejects(setDoc(doc(customer.db, "availabilityNotificationEvents", "forged"), { userId: customer.uid }));
  await assert.rejects(setDoc(doc(customer.db, "lastMinuteOpenings", "forged"), { businessId }));
  assert.equal((await getDocs(query(collection(customer.db, "availabilityAlerts"), where("userId", "==", customer.uid)))).size, 1);

  await blockedRef.update({ status: "cancelled" });
  await assert.rejects(setDoc(doc(manager.db, `businesses/${businessId}/appointments/blocked`),
    { status: "confirmed" }, { merge: true }), "terminal appointment must not be reactivated directly");
  await new Promise((resolve) => setTimeout(resolve, 1200));
  assert.equal((await db.collection("availabilityNotificationEvents").get()).size, 0,
    "overlapping appointment must suppress false alert");
  await db.doc(`businesses/${businessId}/appointments/overlap`).update({ status: "cancelled" });
  await eventually(async () => (await db.collection("availabilityNotificationEvents").get()).size === 1);
  const event = (await db.collection("availabilityNotificationEvents").get()).docs[0].data();
  assert.equal(event.userId, customer.uid);
  assert.equal(event.alertId, alertId);
  assert.ok(event.createdAt instanceof Timestamp);
  await db.doc(`businesses/${businessId}/appointments/overlap`).update({ notes: "retry-like update" });
  await new Promise((resolve) => setTimeout(resolve, 700));
  assert.equal((await db.collection("availabilityNotificationEvents").get()).size, 1);

  await db.doc("platformSettings/global").update({ "featureFlags.availabilityAlerts": false });
  await assert.rejects(other.call("createAvailabilityAlert", input), (error) => error.message.includes("FEATURE_DISABLED"));
  await customer.call("cancelAvailabilityAlert", { alertId });
  assert.equal((await db.doc(`availabilityAlerts/${alertId}`).get()).data().status, "cancelled");
  await assert.rejects(other.call("cancelAvailabilityAlert", { alertId }));
  await assert.rejects(getDoc(doc(customer.db, "lastMinuteOpenings", "forged")));
  await assert.rejects(setDoc(doc(customer.db, `businesses/${businessId}/bookingDayLocks/${dateKey}`), { revision: 999 }));

  await db.doc("platformSettings/global").update({ "featureFlags.availabilityAlerts": true });
  const reschedRef = db.doc(`businesses/${businessId}/appointments/rescheduled`);
  await reschedRef.set({ businessId, serviceId, staffId, status: "confirmed", customerId: other.uid,
    startAt: Timestamp.fromMillis(at(16)), endAt: Timestamp.fromMillis(at(16) + 30 * 60_000) });
  const reschedAlert = (await customer.call("createAvailabilityAlert", { ...input,
    startMinute: 16 * 60, endMinute: 16 * 60 + 15 })).data.alertId;
  await manager.call("rescheduleAppointment", { businessId, appointmentId: "rescheduled", staffId,
    startAtMillis: at(18) });
  await eventually(async () => (await db.doc(`availabilityAlerts/${reschedAlert}`).get()).data()?.status === "matched");

  const midnightStart = Date.parse(`${dateKey}T00:15:00.000Z`) - 3 * 60 * 60_000;
  const midnightRef = db.doc(`businesses/${businessId}/appointments/midnight-boundary`);
  await midnightRef.set({ businessId, serviceId, staffId, status: "confirmed", customerId: other.uid,
    startAt: Timestamp.fromMillis(midnightStart), endAt: Timestamp.fromMillis(midnightStart + 30 * 60_000) });
  const midnightAlert = (await customer.call("createAvailabilityAlert", { ...input,
    startMinute: 15, endMinute: 30 })).data.alertId;
  await midnightRef.update({ status: "cancelled" });
  await eventually(async () => (await db.doc(`availabilityAlerts/${midnightAlert}`).get()).data()?.status === "matched");

  const staffRef = db.doc(`businesses/${businessId}/staff/${staffId}`);
  await staffRef.update({ leaveDates: [dateKey] });
  const staffAlert = (await customer.call("createAvailabilityAlert", { ...input,
    startMinute: 14 * 60, endMinute: 14 * 60 + 15 })).data.alertId;
  await staffRef.update({ leaveDates: [] });
  await eventually(async () => (await db.doc(`availabilityAlerts/${staffAlert}`).get()).data()?.status === "matched");

  const nearStart = Math.ceil((Date.now() + 2 * 60 * 60_000) / (15 * 60_000)) * 15 * 60_000;
  await Promise.all(Array.from({ length: 20 }, (_, index) => db.doc(`lastMinuteOpenings/stale-${index}`)
    .set({ businessId: "missing-business", serviceId, staffId,
      startAt: Timestamp.fromMillis(Date.now() + (45 + index) * 60_000) })));
  const nearRef = db.doc(`businesses/${businessId}/appointments/near-term`);
  await nearRef.set({ businessId, serviceId, staffId, status: "confirmed", customerId: other.uid,
    startAt: Timestamp.fromMillis(nearStart), endAt: Timestamp.fromMillis(nearStart + 30 * 60_000) });
  await nearRef.update({ status: "cancelled" });
  await eventually(async () => (await other.call("listLastMinuteOpenings", {})).data.openings
    .some((item) => item.startAtMillis === nearStart));
  await db.doc(`businesses/${businessId}/appointments/near-term-rebooked`).set({ businessId, serviceId,
    staffId, status: "confirmed", customerId: other.uid,
    startAt: Timestamp.fromMillis(nearStart), endAt: Timestamp.fromMillis(nearStart + 30 * 60_000) });
  assert.equal((await other.call("listLastMinuteOpenings", {})).data.openings
    .some((item) => item.startAtMillis === nearStart), false, "stale opening must disappear on revalidation");

  // Both users have independently verified phones; a shared day lock serializes competing bookings.
  for (const phone of ["+905551110001", "+905551110002"]) {
    await db.doc(`verificationCodes/${phone}`).set({ verified: true, verifiedAt: Timestamp.now() });
  }
  const claimScope = { ...input, startMinute: 17 * 60, endMinute: 17 * 60 + 15 };
  const claimAlerts = [
    (await customer.call("createAvailabilityAlert", claimScope)).data.alertId,
    (await other.call("createAvailabilityAlert", claimScope)).data.alertId,
  ];
  const booking = (phone) => ({ businessId, serviceId, staffId, startAtMillis: at(17),
    customerName: "Test Customer", customerPhone: phone });
  const race = await Promise.allSettled([
    customer.call("createAppointment", booking("+905551110001")),
    other.call("createAppointment", booking("+905551110002")),
  ]);
  assert.equal(race.filter((item) => item.status === "fulfilled").length, 1);
  assert.equal(race.filter((item) => item.status === "rejected").length, 1);
  const winnerIndex = race[0].status === "fulfilled" ? 0 : 1;
  const winner = winnerIndex === 0 ? customer : other;
  const appointmentId = race[winnerIndex].value.data.appointmentId;
  await eventually(async () => (await db.doc(`availabilityAlerts/${claimAlerts[winnerIndex]}`).get()).data()?.status === "claimed");
  assert.notEqual((await db.doc(`availabilityAlerts/${claimAlerts[1 - winnerIndex]}`).get()).data()?.status, "claimed");
  const bookings = await db.collection(`businesses/${businessId}/appointments`)
    .where("startAt", "==", Timestamp.fromMillis(at(17))).get();
  assert.equal(bookings.docs.filter((item) => item.data().status === "confirmed").length, 1);
  await winner.call("cancelCustomerAppointment", { businessId, appointmentId });
  assert.equal((await db.doc(`businesses/${businessId}/appointments/${appointmentId}`).get()).data().status, "cancelled");
});

test.after(async () => {
  await Promise.all(apps.map((app) => deleteApp(app)));
  await deleteAdminApp(adminApp);
});
