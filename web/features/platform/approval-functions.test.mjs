// Emülatör testi: otomatik onay (küfür denetimi) — createBusiness ve submitBusinessProfileChange.
// Çalıştır: npm run test:approval:emulator
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
const adminApp = initializeAdminApp({ projectId }, "approval-test");
const db = getFirestore(adminApp);
const apps = [];
// Portlar ortamdan (emulators:exec bunları verir); başka bir emülatör çalışırken ayrı portla koşabilmek için.
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

const form = (name, slug, extra = {}) => ({
  name, slug, category: "kuafor", phone: "05301112233", email: "test@example.com", address: "Atatürk Cd. 1",
  city: "Muğla", district: "Fethiye", description: "Modern salon.", workingHours: [], ...extra,
});

test("otomatik onay: temiz kayıt yayında, küfürlü kayıt beklemede, ayar kapalıyken herkes beklemede", async () => {
  const off = await client("owner-off");
  const created = (await off.call("createBusiness", form("Kapalı Ayar Kuaför", "kapali-ayar"))).data;
  assert.equal(created.status, "pending_review", "ayar kapalı (varsayılan)");

  await db.doc("platformPrivateSettings/businessApproval").set({ autoApproveStores: true, autoApproveProfileText: true, extraWords: ["kumar"], allowedWords: [] });

  const clean = await client("owner-clean");
  const ok = (await clean.call("createBusiness", form("Ayşe Güzellik", "ayse-guzellik"))).data;
  assert.equal(ok.status, "active");
  assert.equal(ok.requiresApproval, false);
  const business = (await db.doc(`businesses/${ok.businessId}`).get()).data();
  assert.equal(business.isPublished, true);
  assert.equal(business.approvalStatus, "approved");
  assert.equal(business.autoApproved, true);
  const request = (await db.doc(`businessApprovalRequests/${ok.businessId}`).get()).data();
  assert.equal(request.status, "approved");
  assert.equal(request.reviewedBy, "auto");
  assert.equal(request.moderation.clean, true);

  const dirty = await client("owner-dirty");
  const flagged = (await dirty.call("createBusiness", form("S1kt1r Kuaför", "kotu-kuafor"))).data;
  assert.equal(flagged.status, "pending_review");
  const flaggedRequest = (await db.doc(`businessApprovalRequests/${flagged.businessId}`).get()).data();
  assert.equal(flaggedRequest.status, "pending");
  assert.equal(flaggedRequest.moderation.clean, false);
  assert.equal(flaggedRequest.moderation.matches[0].field, "name");

  const custom = await client("owner-custom");
  const extra = (await custom.call("createBusiness", form("Şans Salonu", "sans-salonu", { description: "Kumarhane yanında" }))).data;
  assert.equal(extra.status, "pending_review", "admin ek kelimesi açıklamada");

  // Profil: temiz metin hemen uygulanır; görsel ve küfür elle onaya gider.
  const applied = (await clean.call("submitBusinessProfileChange", { businessId: ok.businessId, changes: { description: "Yeni açıklama, hoş geldiniz." } })).data;
  assert.equal(applied.applied, true);
  assert.equal((await db.doc(`businesses/${ok.businessId}`).get()).data().description, "Yeni açıklama, hoş geldiniz.");
  const logo = (await clean.call("submitBusinessProfileChange", { businessId: ok.businessId, changes: { logoUrl: "https://firebasestorage.googleapis.com/v0/b/x/o/logo.png" } })).data;
  assert.equal(logo.applied, false);
  assert.equal((await db.doc(`businessProfileChangeRequests/${ok.businessId}`).get()).data().status, "pending");
  // Bekleyen talep varken temiz metin de onunla birleşip beklemeye gider.
  const merged = (await clean.call("submitBusinessProfileChange", { businessId: ok.businessId, changes: { city: "Aydın" } })).data;
  assert.equal(merged.applied, false);
  await db.doc(`businessProfileChangeRequests/${ok.businessId}`).update({ status: "approved" });
  const rude = (await clean.call("submitBusinessProfileChange", { businessId: ok.businessId, changes: { name: "Orospu Salon" } })).data;
  assert.equal(rude.applied, false);
  assert.equal(rude.riskLevel, "review");
  assert.equal((await db.doc(`businesses/${ok.businessId}`).get()).data().name, "Ayşe Güzellik");
});

test.after(async () => {
  await Promise.all(apps.map((app) => deleteApp(app)));
  await deleteAdminApp(adminApp);
});
