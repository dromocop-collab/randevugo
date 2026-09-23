import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { initializeApp as initializeClientApp, deleteApp } from "firebase/app";
import { getAuth, connectAuthEmulator, signInAnonymously } from "firebase/auth";
import { getFirestore as getClientDb, connectFirestoreEmulator, collection, doc, getDoc, getDocs, orderBy, query, setDoc, where } from "firebase/firestore";

const requireFunctions = createRequire(new URL("../../../functions/package.json", import.meta.url));
const { initializeApp: initializeAdminApp, deleteApp: deleteAdminApp } = requireFunctions("firebase-admin/app");
const { getFirestore: getAdminDb } = requireFunctions("firebase-admin/firestore");

const projectId = "demo-live-queue";
const adminApp = initializeAdminApp({ projectId }, "queue-rules-test");
const adminDb = getAdminDb(adminApp);
const clients = [];

async function client(name) {
  const app = initializeClientApp({ projectId, apiKey: "emulator-only", authDomain: `${projectId}.firebaseapp.com` }, name);
  clients.push(app);
  const auth = getAuth(app);
  connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });
  const { user } = await signInAnonymously(auth);
  const db = getClientDb(app);
  connectFirestoreEmulator(db, "127.0.0.1", 8080);
  return { db, uid: user.uid };
}

test("queue rules isolate customer and business data and forbid direct writes", async () => {
  const customer = await client("customer");
  const otherCustomer = await client("other-customer");
  const manager = await client("manager");
  const ownerOnly = await client("owner-only");
  await adminDb.doc("businesses/rules-business-a").set({ isPublished: true, ownerUid: manager.uid });
  await adminDb.doc("businesses/rules-business-b").set({ isPublished: true, ownerUid: "someone-else" });
  await adminDb.doc("businesses/rules-business-c").set({ isPublished: true, ownerUid: ownerOnly.uid });
  await adminDb.doc("businessOrganizations/rules-organization").set({ ownerUid: manager.uid, name: "Test Firma", branchCount: 2, maxBranches: 10 });
  await adminDb.doc(`businesses/rules-business-a/members/${manager.uid}`).set({ uid: manager.uid, role: "manager" });
  await adminDb.doc("businesses/rules-business-a/queueEntries/entry-a").set({ businessId: "rules-business-a", customerId: customer.uid, status: "waiting", joinedAt: new Date() });
  await adminDb.doc("businesses/rules-business-b/queueEntries/entry-b").set({ businessId: "rules-business-b", customerId: otherCustomer.uid, status: "waiting" });
  await adminDb.doc("businesses/rules-business-c/queueEntries/entry-c").set({ businessId: "rules-business-c", customerId: customer.uid, status: "waiting" });

  const own = doc(customer.db, "businesses/rules-business-a/queueEntries/entry-a");
  assert.equal((await getDoc(own)).exists(), true);
  await assert.rejects(getDoc(doc(otherCustomer.db, "businesses/rules-business-a/queueEntries/entry-a")));
  assert.equal((await getDoc(doc(manager.db, "businesses/rules-business-a/queueEntries/entry-a"))).exists(), true);
  const activeQuery = query(collection(manager.db, "businesses/rules-business-a/queueEntries"),
    where("status", "in", ["waiting", "on_the_way", "called", "in_service"]), orderBy("joinedAt", "asc"));
  assert.equal((await getDocs(activeQuery)).size, 1);
  await assert.rejects(getDocs(query(collection(customer.db, "businesses/rules-business-a/queueEntries"),
    where("status", "in", ["waiting", "on_the_way", "called", "in_service"]), orderBy("joinedAt", "asc"))));
  assert.equal((await getDoc(doc(ownerOnly.db, "businesses/rules-business-c/queueEntries/entry-c"))).exists(), true);
  assert.equal((await getDoc(doc(manager.db, "businessOrganizations/rules-organization"))).exists(), true);
  await assert.rejects(getDoc(doc(customer.db, "businessOrganizations/rules-organization")));
  await assert.rejects(setDoc(doc(manager.db, "businessOrganizations/rules-organization"), { branchCount: 99 }, { merge: true }));
  await assert.rejects(getDoc(doc(manager.db, "businesses/rules-business-b/queueEntries/entry-b")));
  await assert.rejects(setDoc(own, { status: "completed" }, { merge: true }));
  await assert.rejects(setDoc(doc(manager.db, "businesses/rules-business-a/queueEntries/entry-a"), { status: "called" }, { merge: true }));
  await assert.rejects(getDoc(doc(manager.db, "businesses/rules-business-a/queueMembers", customer.uid)));
  await assert.rejects(getDoc(doc(manager.db, "businesses/rules-business-a/queueStaffLocks/staff-a")));
  await adminDb.doc(`users/${customer.uid}/activeQueueEntries/rules-business-a`).set({ entryId: "entry-a" });
  await adminDb.doc("liveQueueDiscovery/rules-business-a").set({ businessId: "rules-business-a", accepting: true });
  await adminDb.doc("liveQueueWaitSummaries/rules-business-a").set({ businessId: "rules-business-a", calculatedAtMs: Date.now() });
  await adminDb.doc("liveQueueNotificationEvents/rules-event").set({ businessId: "rules-business-a", entryId: "entry-a", customerId: customer.uid, kind: "called" });
  await assert.rejects(getDoc(doc(customer.db, `users/${customer.uid}/activeQueueEntries/rules-business-a`)));
  await assert.rejects(getDoc(doc(customer.db, "liveQueueDiscovery/rules-business-a")));
  await assert.rejects(getDoc(doc(customer.db, "liveQueueWaitSummaries/rules-business-a")));
  await assert.rejects(getDoc(doc(customer.db, "liveQueueNotificationEvents/rules-event")));
  await assert.rejects(setDoc(doc(customer.db, `users/${customer.uid}/activeQueueEntries/rules-business-a`), { entryId: "forged" }));
  await setDoc(doc(manager.db, "businesses/rules-business-a"), { liveQueueIntakePaused: true }, { merge: true });
  await assert.rejects(setDoc(doc(manager.db, "businesses/rules-business-b"), { liveQueueIntakePaused: true }, { merge: true }));
  await assert.rejects(setDoc(doc(manager.db, "platformSettings/global"), { featureFlags: { liveQueue: true } }, { merge: true }));
});

test.after(async () => {
  await Promise.all(clients.map((app) => deleteApp(app)));
  await deleteAdminApp(adminApp);
});
