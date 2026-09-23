import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { initializeApp, deleteApp } from "firebase/app";
import { getAuth, connectAuthEmulator, signInAnonymously } from "firebase/auth";
import { getFunctions, connectFunctionsEmulator, httpsCallable } from "firebase/functions";

const requireFunctions = createRequire(new URL("../../../functions/package.json", import.meta.url));
const { initializeApp: initializeAdminApp, deleteApp: deleteAdminApp } = requireFunctions("firebase-admin/app");
const { getFirestore } = requireFunctions("firebase-admin/firestore");
const projectId = "demo-branch-network";
const adminApp = initializeAdminApp({ projectId }, "branch-functions-test");
const db = getFirestore(adminApp);
const apps = [];

async function client(name) {
  const app = initializeApp({ projectId, apiKey: "emulator-only", authDomain: `${projectId}.firebaseapp.com` }, name);
  apps.push(app);
  const auth = getAuth(app);
  connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });
  const uid = (await signInAnonymously(auth)).user.uid;
  const functions = getFunctions(app, "europe-west1");
  connectFunctionsEmulator(functions, "127.0.0.1", 5001);
  return { uid, call: (callable, data) => httpsCallable(functions, callable)(data) };
}

function branchInput(name, slug, parentBusinessId) {
  return {
    name, slug, parentBusinessId,
    category: "kuafor", phone: "+905551112233", email: `${slug}@example.com`,
    address: "Test Mahallesi 1", city: "İstanbul", district: "Kadıköy",
    workingHours: [{ day: 1, isOpen: true, start: "09:00", end: "18:00" }],
  };
}

test("branch creation shares one organization, stays pending and plan updates cover the network", async () => {
  const owner = await client("branch-owner");
  const stranger = await client("branch-stranger");
  const first = (await owner.call("createBusiness", branchInput("Merkez", "test-merkez"))).data;
  const second = (await owner.call("createBusiness", branchInput("Kadıköy Şubesi", "test-kadikoy", first.businessId))).data;

  assert.equal(first.organizationId, second.organizationId);
  assert.equal(first.status, "pending_review");
  assert.equal(second.storePosition, 2);
  const [organization, headquarters, branch, subscription] = await Promise.all([
    db.doc(`businessOrganizations/${first.organizationId}`).get(),
    db.doc(`businesses/${first.businessId}`).get(),
    db.doc(`businesses/${second.businessId}`).get(),
    db.doc(`subscriptions/${second.businessId}`).get(),
  ]);
  assert.equal(organization.data().branchCount, 2);
  assert.equal(headquarters.data().isHeadquarters, true);
  assert.equal(branch.data().headquartersBusinessId, first.businessId);
  assert.equal(branch.data().branchNumber, 2);
  assert.equal(branch.data().isPublished, false);
  assert.equal(subscription.data().billingBusinessId, first.businessId);

  await assert.rejects(
    stranger.call("createBusiness", branchInput("Yetkisiz", "test-yetkisiz", first.businessId)),
    { code: "functions/permission-denied" },
  );

  await db.doc(`platformAdmins/${owner.uid}`).set({ enabled: true });
  const planResult = (await owner.call("assignBusinessPlan", { businessId: second.businessId, plan: "BUSINESS", status: "active" })).data;
  assert.equal(planResult.affectedBranches, 2);
  assert.equal((await db.doc(`businesses/${first.businessId}`).get()).data().plan, "BUSINESS");
  assert.equal((await db.doc(`businesses/${second.businessId}`).get()).data().plan, "BUSINESS");
});

test.after(async () => {
  await Promise.all(apps.map((app) => deleteApp(app)));
  await deleteAdminApp(adminApp);
});
