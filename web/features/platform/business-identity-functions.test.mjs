// Emülatör testi: süper admin mağaza adresi / firma adı düzeltmesi (adminUpdateBusinessIdentity).
// Çalıştır: npm run test:identity:emulator
import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { initializeApp, deleteApp } from "firebase/app";
import { getAuth, connectAuthEmulator, signInAnonymously } from "firebase/auth";
import { getFunctions, connectFunctionsEmulator, httpsCallable } from "firebase/functions";

const requireFunctions = createRequire(new URL("../../../functions/package.json", import.meta.url));
const { initializeApp: initializeAdminApp, deleteApp: deleteAdminApp } = requireFunctions("firebase-admin/app");
const { getFirestore } = requireFunctions("firebase-admin/firestore");
const projectId = "demo-availability-phase8";
const adminApp = initializeAdminApp({ projectId }, "identity-test");
const db = getFirestore(adminApp);
const apps = [];
const AUTH_HOST = process.env.FIREBASE_AUTH_EMULATOR_HOST ?? "127.0.0.1:9099";
const FUNCTIONS_PORT = Number(process.env.TEST_FUNCTIONS_PORT ?? 5001);

async function client(name) {
  const app = initializeApp({ projectId, apiKey: "emulator-only", authDomain: `${projectId}.firebaseapp.com` }, name);
  apps.push(app);
  const auth = getAuth(app);
  connectAuthEmulator(auth, `http://${AUTH_HOST}`, { disableWarnings: true });
  const { user } = await signInAnonymously(auth);
  const functions = getFunctions(app, "europe-west1");
  connectFunctionsEmulator(functions, "127.0.0.1", FUNCTIONS_PORT);
  return { uid: user.uid, call: (fn, data) => httpsCallable(functions, fn)(data) };
}

test.after(async () => { await Promise.all(apps.map((app) => deleteApp(app))); await deleteAdminApp(adminApp); });

test("slug + firma adı düzeltilir, eski adres takma ad olur, şubeler güncellenir", async () => {
  const admin = await client("admin");
  const stranger = await client("stranger");
  await db.doc(`platformAdmins/${admin.uid}`).set({ role: "admin" });
  await db.doc("businesses/b1").set({ name: "Salon Yavuz", slug: "sonra-ne-kadar-ucret", ownerUid: "owner1", organizationId: "org1", organizationName: "Sonra ne kadar ücret", status: "active", isPublished: true });
  await db.doc("businesses/b2").set({ name: "Salon Yavuz 2", slug: "salon-yavuz-2", ownerUid: "owner1", organizationId: "org1", organizationName: "Sonra ne kadar ücret", status: "active", isPublished: true });
  await db.doc("businesses/other").set({ name: "Başka", slug: "dolu-adres", ownerUid: "owner2", status: "active", isPublished: true });
  await db.doc("businessSlugs/sonra-ne-kadar-ucret").set({ businessId: "b1", ownerUid: "owner1" });
  await db.doc("businessSlugs/dolu-adres").set({ businessId: "other", ownerUid: "owner2" });
  await db.doc("businessOrganizations/org1").set({ name: "Sonra ne kadar ücret" });

  await assert.rejects(stranger.call("adminUpdateBusinessIdentity", { businessId: "b1", slug: "salon-yavuz" }), /süper admin/);
  await assert.rejects(admin.call("adminUpdateBusinessIdentity", { businessId: "b1", slug: "dolu-adres" }), /başka bir işletmede/);
  await assert.rejects(admin.call("adminUpdateBusinessIdentity", { businessId: "b1", slug: "Salon Yavuz!" }), /küçük harf/);

  const result = (await admin.call("adminUpdateBusinessIdentity", { businessId: "b1", slug: "salon-yavuz", organizationName: "Salon Yavuz" })).data;
  assert.equal(result.changed, true);
  assert.equal(result.slug, "salon-yavuz");
  const business = (await db.doc("businesses/b1").get()).data();
  assert.equal(business.slug, "salon-yavuz");
  assert.equal(business.organizationName, "Salon Yavuz");
  assert.deepEqual(business.previousSlugs, ["sonra-ne-kadar-ucret"]);
  assert.equal((await db.doc("businessSlugs/salon-yavuz").get()).data().businessId, "b1");
  const alias = (await db.doc("businessSlugs/sonra-ne-kadar-ucret").get()).data();
  assert.equal(alias.businessId, "b1");
  assert.equal(alias.aliasOf, "salon-yavuz");
  assert.equal((await db.doc("businesses/b2").get()).data().organizationName, "Salon Yavuz");
  assert.equal((await db.doc("businessOrganizations/org1").get()).data().name, "Salon Yavuz");
  assert.equal((await db.doc("businessSlugs/dolu-adres").get()).data().businessId, "other");

  // Tekrar aynı değer: değişiklik yok. Eski adrese geri dönmek de mümkün (takma ad kendi işletmesine ait).
  assert.equal((await admin.call("adminUpdateBusinessIdentity", { businessId: "b1", slug: "salon-yavuz" })).data.changed, false);
  await admin.call("adminUpdateBusinessIdentity", { businessId: "b1", slug: "sonra-ne-kadar-ucret" });
  const back = (await db.doc("businesses/b1").get()).data();
  assert.equal(back.slug, "sonra-ne-kadar-ucret");
  assert.deepEqual(back.previousSlugs, ["salon-yavuz"]);
  const audits = await db.collection("platformAuditLogs").where("action", "==", "business.identity_updated").get();
  assert.equal(audits.size, 2);
});
