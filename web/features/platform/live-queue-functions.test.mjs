import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { initializeApp, deleteApp } from "firebase/app";
import { getAuth, connectAuthEmulator, signInAnonymously } from "firebase/auth";
import { getFunctions, connectFunctionsEmulator, httpsCallable } from "firebase/functions";

const requireFunctions = createRequire(new URL("../../../functions/package.json", import.meta.url));
const { initializeApp: initializeAdminApp, deleteApp: deleteAdminApp } = requireFunctions("firebase-admin/app");
const { getFirestore, Timestamp } = requireFunctions("firebase-admin/firestore");
const projectId = "demo-live-queue";
const adminApp = initializeAdminApp({ projectId }, "queue-functions-test");
const db = getFirestore(adminApp);
const apps = [];
const flags = {
  liveFeaturesMaster: true, liveAvailability: false, liveQueue: true,
  lastMinuteSlots: false, availabilityAlerts: false, liveOperations: true,
};

async function client(name, signedIn = true) {
  const app = initializeApp({ projectId, apiKey: "emulator-only", authDomain: `${projectId}.firebaseapp.com` }, name);
  apps.push(app);
  const auth = getAuth(app);
  connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });
  const uid = signedIn ? (await signInAnonymously(auth)).user.uid : null;
  const functions = getFunctions(app, "europe-west1");
  connectFunctionsEmulator(functions, "127.0.0.1", 5001);
  return { uid, call: (name, data) => httpsCallable(functions, name)(data) };
}

test("callable queue enforces gates, validation, identity, retries and server timestamps", async () => {
  const customer = await client("queue-customer");
  const other = await client("queue-other");
  const manager = await client("queue-manager");
  const guest = await client("queue-guest", false);
  const join = { businessId: "business-a", serviceId: "service-a", staffId: "staff-a", joinedAt: "forged" };

  await db.doc("platformSettings/global").set({ featureFlags: { ...flags, liveFeaturesMaster: false } });
  await db.doc("businesses/business-a").set({ ownerUid: manager.uid, slug: "business-a", status: "active", isPublished: true, isSuspended: false, liveQueueEnabled: false, timeZone: "Europe/Istanbul" });
  await db.doc(`businesses/business-a/members/${manager.uid}`).set({ uid: manager.uid, role: "manager" });
  await db.doc("businesses/business-a/services/service-a").set({ name: "Test", isActive: true, isBookableOnline: true, durationMinutes: 5, category: "hair", assignableStaffIds: ["staff-a"] });
  await db.doc("businesses/business-a/staff/staff-a").set({ isActive: true, serviceIds: ["service-a"], specialtyCategoryIds: ["hair"], workingHours: [], leaveDates: [] });
  await db.doc("businesses/business-b").set({ ownerUid: other.uid, slug: "business-b", status: "active", isPublished: true, liveQueueEnabled: true });
  await db.doc("businesses/business-b/services/service-b").set({ isActive: true, isBookableOnline: true, durationMinutes: 5 });
  await db.doc("businesses/business-b/staff/staff-b").set({ isActive: true, serviceIds: ["service-b"] });
  await Promise.all(Array.from({ length: 7 }, (_, day) => db.doc(`businesses/business-a/workingHours/${day}`).set({ day, isOpen: true, start: "00:00", end: "23:59" })));

  await assert.rejects(guest.call("joinQueue", join), { code: "functions/unauthenticated" });
  await assert.rejects(customer.call("joinQueue", join), (error) => error.message.includes("FEATURE_DISABLED"));
  await db.doc("platformSettings/global").update({ "featureFlags.liveFeaturesMaster": true, "featureFlags.liveQueue": false });
  await assert.rejects(customer.call("joinQueue", join), (error) => error.message.includes("FEATURE_DISABLED"));
  await db.doc("platformSettings/global").update({ "featureFlags.liveQueue": true });
  await assert.rejects(customer.call("joinQueue", join), (error) => error.message.includes("FEATURE_DISABLED"));
  await db.doc("businesses/business-a").update({ liveQueueEnabled: true });
  assert.deepEqual((await customer.call("listLiveQueueDiscovery", {})).data.businesses, []);
  await db.doc("platformSettings/global").update({ "featureFlags.liveAvailability": true });
  let discoverable = false;
  for (let attempt = 0; attempt < 80 && !discoverable; attempt++) {
    discoverable = (await db.doc("liveQueueDiscovery/business-a").get()).exists;
    if (!discoverable) await new Promise((resolve) => setTimeout(resolve, 250));
  }
  assert.equal(discoverable, true);
  assert.equal((await customer.call("listLiveQueueDiscovery", { businessId: "business-a" })).data.businesses.length, 1);

  await assert.rejects(customer.call("joinQueue", { ...join, businessId: "missing" }));
  await assert.rejects(customer.call("joinQueue", { ...join, serviceId: "missing" }));
  await assert.rejects(customer.call("joinQueue", { ...join, staffId: "missing" }));
  await assert.rejects(customer.call("joinQueue", { ...join, serviceId: "service-b" }));
  await assert.rejects(customer.call("joinQueue", { ...join, staffId: "staff-b" }));
  const first = (await customer.call("joinQueue", join)).data;
  const ownWait = (await customer.call("getLiveQueueWaitEstimate", { businessId: "business-a", serviceId: "service-a", entryId: first.entryId })).data;
  assert.equal(ownWait.peopleAhead, 0);
  assert.equal(typeof ownWait.calculatedAt, "string");
  assert.equal(Object.hasOwn(ownWait, "customerId"), false);
  const options = (await customer.call("getLiveQueueWaitOptions", { businessId: "business-a", serviceId: "service-a" })).data;
  assert.ok(options.firstAvailable.minWaitMinutes >= 5);
  assert.equal(options.byStaff["staff-a"].eligibleStaffCount, 1);
  assert.ok((await manager.call("getBusinessLiveWaitEstimates", { businessId: "business-a" })).data.estimates[first.entryId]);
  await assert.rejects(other.call("getLiveQueueWaitEstimate", { businessId: "business-a", serviceId: "service-a", entryId: first.entryId }), { code: "functions/permission-denied" });
  assert.equal((await customer.call("getMyActiveQueueEntries", {})).data.entries[0].entryId, first.entryId);
  const retry = (await customer.call("joinQueue", join)).data;
  assert.equal(retry.entryId, first.entryId);
  assert.equal(retry.existing, true);
  const concurrent = await Promise.all([customer.call("joinQueue", join), customer.call("joinQueue", join)]);
  assert.equal(concurrent[0].data.entryId, first.entryId);
  assert.equal(concurrent[1].data.entryId, first.entryId);
  const entries = await db.collection("businesses/business-a/queueEntries").get();
  assert.equal(entries.size, 1);
  const entryRef = db.doc(`businesses/business-a/queueEntries/${first.entryId}`);
  assert.ok((await entryRef.get()).data().joinedAt instanceof Timestamp);
  await db.doc("businesses/business-a").update({ liveQueueIntakePaused: true });
  await assert.rejects(other.call("joinQueue", join), (error) => error.message.includes("FEATURE_DISABLED"));
  assert.equal((await customer.call("getMyActiveQueueEntry", { businessId: "business-a" })).data.entry.id, first.entryId);
  assert.equal((await customer.call("listLiveQueueDiscovery", { businessId: "business-a" })).data.businesses.length, 0);
  await assert.rejects(other.call("leaveQueue", { businessId: "business-a", entryId: first.entryId }), { code: "functions/permission-denied" });
  await assert.rejects(other.call("transitionQueueEntry", { businessId: "business-a", entryId: first.entryId, status: "called" }), { code: "functions/permission-denied" });
  await assert.rejects(manager.call("transitionQueueEntry", { businessId: "business-b", entryId: first.entryId, status: "called" }), { code: "functions/permission-denied" });

  await customer.call("markOnTheWay", { businessId: "business-a", entryId: first.entryId });
  await assert.rejects(other.call("markOnTheWay", { businessId: "business-a", entryId: first.entryId, etaMinutes: 10 }), { code: "functions/permission-denied" });
  await assert.rejects(customer.call("markOnTheWay", { businessId: "business-a", entryId: first.entryId, etaMinutes: 7 }), { code: "functions/invalid-argument" });
  await customer.call("confirmQueuePresence", { businessId: "business-a", entryId: first.entryId });
  assert.ok((await entryRef.get()).data().presenceConfirmedAt instanceof Timestamp);
  await assert.rejects(other.call("confirmQueuePresence", { businessId: "business-a", entryId: first.entryId }), { code: "functions/permission-denied" });
  const called = (await manager.call("callNextCustomer", { businessId: "business-a", staffId: "staff-a" })).data;
  assert.equal(called.entryId, first.entryId);
  let calledEvents = [];
  for (let attempt = 0; attempt < 40 && calledEvents.length === 0; attempt++) {
    calledEvents = (await db.collection("liveQueueNotificationEvents").get()).docs.filter((item) =>
      item.data().entryId === first.entryId && item.data().kind === "called");
    if (calledEvents.length === 0) await new Promise((resolve) => setTimeout(resolve, 100));
  }
  assert.equal(calledEvents.length, 1);
  await assert.rejects(manager.call("callNextCustomer", { businessId: "business-a", staffId: "staff-a" }), { code: "functions/already-exists" });
  await db.doc("platformSettings/global").update({ "featureFlags.liveOperations": false });
  await assert.rejects(manager.call("transitionQueueEntry", { businessId: "business-a", entryId: first.entryId, status: "in_service" }), (error) => error.message.includes("FEATURE_DISABLED"));
  await assert.rejects(other.call("joinQueue", join), (error) => error.message.includes("FEATURE_DISABLED"));
  await db.doc("platformSettings/global").update({ "featureFlags.liveOperations": true });
  const now = Date.now();
  await db.doc("businesses/business-a/appointments/conflict").set({ status: "confirmed", staffId: "staff-a", startAt: Timestamp.fromMillis(now - 60_000), endAt: Timestamp.fromMillis(now + 5 * 60_000) });
  await assert.rejects(manager.call("transitionQueueEntry", { businessId: "business-a", entryId: first.entryId, status: "in_service" }), { code: "functions/failed-precondition" });
  await db.doc("businesses/business-a/appointments/conflict").delete();
  await manager.call("transitionQueueEntry", { businessId: "business-a", entryId: first.entryId, status: "in_service" });
  await db.doc("businesses/business-a").update({ liveQueueEnabled: false });
  await assert.rejects(other.call("joinQueue", join), (error) => error.message.includes("FEATURE_DISABLED"));
  await manager.call("transitionQueueEntry", { businessId: "business-a", entryId: first.entryId, status: "completed" });
  const completedAt = (await entryRef.get()).data().completedAt.toMillis();
  const capabilities = (await manager.call("getLiveOperationsCapabilities", { businessId: "business-a" })).data;
  const liveRows = await db.collection("businesses/business-a/queueEntries")
    .where("status", "in", capabilities.activeStatuses).orderBy("joinedAt", "asc").get();
  assert.equal(liveRows.docs.some((item) => item.id === first.entryId), false);
  const duplicate = (await manager.call("transitionQueueEntry", { businessId: "business-a", entryId: first.entryId, status: "completed" })).data;
  assert.equal(duplicate.existing, true);
  assert.equal((await entryRef.get()).data().completedAt.toMillis(), completedAt);
  await assert.rejects(manager.call("transitionQueueEntry", { businessId: "business-a", entryId: first.entryId, status: "called" }));
  await db.doc("businesses/business-a").update({ liveQueueIntakePaused: false, liveQueueEnabled: true });
  const baseline = (await customer.call("getLiveQueueWaitEstimate", { businessId: "business-a", serviceId: "service-a", staffId: "staff-a" })).data;
  assert.equal(baseline.minWaitMinutes, 0);
  const conflictNow = Date.now();
  await db.doc("businesses/business-a/appointments/wait-conflict").set({ status: "confirmed", staffId: "staff-a",
    startAt: Timestamp.fromMillis(conflictNow - 60_000), endAt: Timestamp.fromMillis(conflictNow + 10 * 60_000) });
  const blockedWait = (await customer.call("getLiveQueueWaitEstimate", { businessId: "business-a", serviceId: "service-a", staffId: "staff-a" })).data;
  assert.ok(blockedWait.minWaitMinutes >= 9);
  await db.doc("businesses/business-a/appointments/wait-conflict").delete();
  const recovered = (await customer.call("getLiveQueueWaitEstimate", { businessId: "business-a", serviceId: "service-a", staffId: "staff-a" })).data;
  assert.equal(recovered.minWaitMinutes, 0);
  const ahead = (await other.call("joinQueue", join)).data;
  const afterJoin = (await customer.call("getLiveQueueWaitEstimate", { businessId: "business-a", serviceId: "service-a", staffId: "staff-a" })).data;
  assert.ok(afterJoin.minWaitMinutes >= 5);
  await manager.call("callNextCustomer", { businessId: "business-a", staffId: "staff-a" });
  await manager.call("transitionQueueEntry", { businessId: "business-a", entryId: ahead.entryId, status: "in_service" });
  await manager.call("transitionQueueEntry", { businessId: "business-a", entryId: ahead.entryId, status: "completed" });
  const afterCompletion = (await customer.call("getLiveQueueWaitEstimate", { businessId: "business-a", serviceId: "service-a", staffId: "staff-a" })).data;
  assert.equal(afterCompletion.minWaitMinutes, 0);
  const second = (await customer.call("joinQueue", join)).data;
  await db.doc("platformSettings/global").update({ "featureFlags.liveFeaturesMaster": false });
  assert.equal((await customer.call("getLiveQueueWaitEstimate", { businessId: "business-a", serviceId: "service-a", entryId: second.entryId })).data.reason, "FEATURE_DISABLED");
  assert.equal((await customer.call("getMyActiveQueueEntries", {})).data.entries[0].entryId, second.entryId);
  await customer.call("leaveQueue", { businessId: "business-a", entryId: second.entryId });
  assert.equal((await customer.call("getMyActiveQueueEntries", {})).data.entries.length, 0);
  await db.doc("platformSettings/global").update({ "featureFlags.liveFeaturesMaster": true });
  const cancelledAt = (await db.doc(`businesses/business-a/queueEntries/${second.entryId}`).get()).data().cancelledAt.toMillis();
  const leaveRetry = (await customer.call("leaveQueue", { businessId: "business-a", entryId: second.entryId })).data;
  assert.equal(leaveRetry.existing, true);
  assert.equal((await db.doc(`businesses/business-a/queueEntries/${second.entryId}`).get()).data().cancelledAt.toMillis(), cancelledAt);
  const third = (await customer.call("joinQueue", join)).data;
  const races = await Promise.allSettled([
    manager.call("callNextCustomer", { businessId: "business-a", staffId: "staff-a" }),
    manager.call("callNextCustomer", { businessId: "business-a", staffId: "staff-a" }),
  ]);
  assert.equal(races.filter((result) => result.status === "fulfilled").length, 1);
  assert.equal((await db.doc(`businesses/business-a/queueEntries/${third.entryId}`).get()).data().status, "called");
  await assert.rejects(manager.call("transitionQueueEntry", { businessId: "business-a", entryId: third.entryId, status: "no_show" }), { code: "functions/failed-precondition" });
  await db.doc(`businesses/business-a/queueEntries/${third.entryId}`).update({ calledAt: Timestamp.fromMillis(Date.now() - 11 * 60_000) });
  await manager.call("transitionQueueEntry", { businessId: "business-a", entryId: third.entryId, status: "no_show" });
  assert.ok((await db.doc(`businesses/business-a/queueEntries/${third.entryId}`).get()).data().noShowAt instanceof Timestamp);
  assert.equal((await db.collection("liveQueueNotificationEvents").get()).docs.filter((item) =>
    item.data().entryId === first.entryId && item.data().kind === "called").length, 1);
  assert.equal((await db.doc(`businesses/business-a/queueStaffLocks/staff-a`).get()).exists, false);
  const fourth = (await customer.call("joinQueue", join)).data;
  await manager.call("callNextCustomer", { businessId: "business-a", staffId: "staff-a" });
  await customer.call("leaveQueue", { businessId: "business-a", entryId: fourth.entryId });
  assert.equal((await db.doc(`businesses/business-a/queueStaffLocks/staff-a`).get()).exists, false);
  const etaEntry = (await other.call("joinQueue", join)).data;
  await other.call("markOnTheWay", { businessId: "business-a", entryId: etaEntry.entryId, etaMinutes: 10 });
  const etaRow = (await db.doc(`businesses/business-a/queueEntries/${etaEntry.entryId}`).get()).data();
  assert.equal(etaRow.declaredEtaMinutes, 10);
  assert.ok(etaRow.onTheWayAt instanceof Timestamp);
  assert.ok(etaRow.expectedArrivalAt instanceof Timestamp);
});

test.after(async () => {
  await Promise.all(apps.map((app) => deleteApp(app)));
  await deleteAdminApp(adminApp);
});
