// Emülatör testi: yarım kalan kayıtlar — saveSignupLead, kayıt tamamlanınca "converted", Firestore kuralları.
// Çalıştır: npm run test:signuplead:emulator
import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { initializeApp, deleteApp } from "firebase/app";
import { getAuth, connectAuthEmulator, signInAnonymously } from "firebase/auth";
import { getFunctions, connectFunctionsEmulator, httpsCallable } from "firebase/functions";
import { connectFirestoreEmulator, doc, getDoc, getFirestore as getClientFirestore, updateDoc } from "firebase/firestore";

const requireFunctions = createRequire(new URL("../../../functions/package.json", import.meta.url));
const { initializeApp: initializeAdminApp, deleteApp: deleteAdminApp } = requireFunctions("firebase-admin/app");
const { getFirestore } = requireFunctions("firebase-admin/firestore");
const projectId = "demo-availability-phase8";
const adminApp = initializeAdminApp({ projectId }, "signup-lead-test");
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

test("yarım kayıt yazılır, güncellenir, aynı numarayla işletme açılınca tamamlandı olur", async () => {
  const visitor = await client("lead-visitor");
  await visitor.call("saveSignupLead", { name: "Elif Kuaför", phone: "0530 222 33 44", category: "kuafor", city: "Muğla", district: "Fethiye", source: "meta", campaign: "reels_lead" });
  const ref = db.doc("signupLeads/905302223344");
  let lead = (await ref.get()).data();
  assert.equal(lead.status, "open");
  assert.equal(lead.name, "Elif Kuaför");
  assert.equal(lead.source, "meta");
  assert.equal(lead.attempts, 1);
  assert.ok(lead.reminderDueAt.toMillis() > Date.now() + 25 * 60_000, "hatırlatma 30 dk sonraya planlı");

  // Aynı kişi geri dönüp adı değiştirir: güncellenir, plan değişmez.
  const due = lead.reminderDueAt.toMillis();
  await visitor.call("saveSignupLead", { name: "Elif Güzellik", phone: "5302223344", category: "guzellik", city: "Muğla", district: "Fethiye" });
  lead = (await ref.get()).data();
  assert.equal(lead.name, "Elif Güzellik");
  assert.equal(lead.attempts, 2);
  assert.equal(lead.reminderDueAt.toMillis(), due);

  await assert.rejects(visitor.call("saveSignupLead", { name: "X", phone: "212" }), /invalid-argument|Geçerli/);

  // Kayıt tamamlanır (işletme telefonu aynı numara) → converted, hatırlatma iptal.
  const owner = await client("lead-owner");
  const created = (await owner.call("createBusiness", {
    name: "Elif Güzellik", slug: "elif-guzellik-lead", category: "guzellik", phone: "05302223344", email: "elif@example.com",
    address: "Atatürk Cd. 1", city: "Muğla", district: "Fethiye", description: "", workingHours: [],
  })).data;
  lead = (await ref.get()).data();
  assert.equal(lead.status, "converted");
  assert.equal(lead.businessId, created.businessId);
  assert.equal(lead.reminderDueAt, null);

  // Kayıt bittikten sonra form tekrar gönderilse de durum bozulmaz.
  await visitor.call("saveSignupLead", { name: "Elif Güzellik", phone: "05302223344" });
  assert.equal((await ref.get()).data().status, "converted");
});

test("kurallar: yalnız platform yöneticisi okur ve takip durumunu değiştirir", async () => {
  await db.doc("signupLeads/905309998877").set({ phone: "905309998877", name: "Test", status: "open", attempts: 1, reminderDueAt: null });
  const stranger = await client("lead-stranger");
  await assert.rejects(getDoc(doc(stranger.firestore, "signupLeads/905309998877")), /permission/i);
  await assert.rejects(updateDoc(doc(stranger.firestore, "signupLeads/905309998877"), { status: "closed" }), /permission/i);

  const admin = await client("lead-admin");
  await db.doc(`platformAdmins/${admin.uid}`).set({ enabled: true });
  assert.equal((await getDoc(doc(admin.firestore, "signupLeads/905309998877"))).data().name, "Test");
  await updateDoc(doc(admin.firestore, "signupLeads/905309998877"), { status: "contacted", handledBy: admin.uid });
  assert.equal((await db.doc("signupLeads/905309998877").get()).data().status, "contacted");
  // Yönetici bile ad/numara değiştiremez, "converted" yapamaz.
  await assert.rejects(updateDoc(doc(admin.firestore, "signupLeads/905309998877"), { name: "Başka" }), /permission/i);
  await assert.rejects(updateDoc(doc(admin.firestore, "signupLeads/905309998877"), { status: "converted" }), /permission/i);
});

test("işletme önerisi: aynı işletme tek kayıtta sayılır, yalnız yönetici okur", async () => {
  const visitor = await client("suggest-visitor");
  await visitor.call("submitBusinessSuggestion", { businessName: "Elif Kuaför", city: "Ankara", category: "kuafor" });
  await visitor.call("submitBusinessSuggestion", { businessName: "ELİF  KUAFÖR", city: "ankara", phone: "0312 123 45 67" });
  const rows = (await db.collection("businessSuggestions").get()).docs;
  assert.equal(rows.length, 1);
  const row = rows[0].data();
  assert.equal(row.votes, 2);
  assert.equal(row.status, "new");
  assert.equal(row.phone, "903121234567", "ilk öneride olmayan numara sonradan tamamlanır");
  await assert.rejects(visitor.call("submitBusinessSuggestion", { businessName: "Elif", city: "Atlantis" }), /invalid-argument|kontrol/);
  await assert.rejects(visitor.call("submitBusinessSuggestion", { businessName: "Bot", city: "Ankara", website: "spam" }), /invalid-argument|kontrol/);

  const path = `businessSuggestions/${rows[0].id}`;
  await assert.rejects(getDoc(doc(visitor.firestore, path)), /permission/i);
  await assert.rejects(updateDoc(doc(visitor.firestore, path), { status: "closed" }), /permission/i);
  const admin = await client("suggest-admin");
  await db.doc(`platformAdmins/${admin.uid}`).set({ enabled: true });
  await updateDoc(doc(admin.firestore, path), { status: "contacted", handledBy: admin.uid });
  assert.equal((await db.doc(path).get()).data().status, "contacted");
  await assert.rejects(updateDoc(doc(admin.firestore, path), { businessName: "Başka" }), /permission/i);
});

test.after(async () => {
  await Promise.all(apps.map((app) => deleteApp(app)));
  await deleteAdminApp(adminApp);
});
