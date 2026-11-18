// Emülatör testi: Arkadaşını getir — kod üretimi, kodla kayıt, onayda ödül (+1 ay tüm şubeler), kötüye kullanım,
// yıllık sınır, süper admin elle ödül/ret, davetle gelene bonus gün.
// Çalıştır: npm run test:referral:emulator
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
const adminApp = initializeAdminApp({ projectId }, "referral-test");
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

let phoneSeq = 10;
const form = (name, slug, extra = {}) => ({
  name, slug, category: "kuafor", phone: `05301112${String(phoneSeq++).padStart(3, "0")}`, email: `${slug}@example.com`, address: "Atatürk Cd. 1",
  city: "Muğla", district: "Fethiye", description: "Modern salon.", workingHours: [], ...extra,
});
const DAY = 86_400_000;
const trialEnd = async (businessId) => Date.parse((await db.doc(`subscriptions/${businessId}`).get()).data().trialEndsAt);

test.after(async () => { await Promise.all(apps.map((app) => deleteApp(app))); await deleteAdminApp(adminApp); });

test("davet akışı uçtan uca", async () => {
  const admin = await client("admin");
  await db.doc(`platformAdmins/${admin.uid}`).set({ role: "admin" });
  await db.doc("platformPrivateSettings/businessApproval").set({ autoApproveStores: false });

  // Davet eden: Salon Yavuz (+ bir şube) — kod addan üretilir.
  const referrer = await client("referrer");
  const hq = (await referrer.call("createBusiness", form("Salon Yavuz", "salon-yavuz", { phone: "05325550001", email: "yavuz@example.com" }))).data;
  await admin.call("reviewBusiness", { businessId: hq.businessId, decision: "approved" });
  const program = (await referrer.call("getReferralProgram", { businessId: hq.businessId })).data;
  assert.match(program.code, /^SALON[A-HJ-NP-Z2-9]{3}$/);
  assert.equal(program.link, `https://seninrandevun.com/isletmeler/kayit?ref=${program.code}`);
  assert.equal((await referrer.call("getReferralProgram", { businessId: hq.businessId })).data.code, program.code, "kod sabit kalır");
  const branch = (await referrer.call("createBusiness", form("Salon Yavuz Şube", "salon-yavuz-sube", { parentBusinessId: hq.businessId, phone: "05325550001", email: "yavuz@example.com" }))).data;

  // Kod kontrolü (kayıt sayfası)
  const anon = await client("anon");
  const check = (await anon.call("checkReferralCode", { code: program.code.toLowerCase() })).data;
  assert.equal(check.valid, true);
  assert.equal(check.businessName, "Salon Yavuz");
  assert.equal((await anon.call("checkReferralCode", { code: "YOK12345" })).data.valid, false);

  // 1) Geçerli davet: beklemede → onayda ödül, iki şubeye de +1 ay; bildirim.
  const hqTrialBefore = await trialEnd(hq.businessId);
  const branchTrialBefore = await trialEnd(branch.businessId);
  const friend = await client("friend");
  const friendBiz = (await friend.call("createBusiness", form("Elif Güzellik", "elif-guzellik", { referralCode: program.code }))).data;
  assert.equal((await db.doc(`referrals/${friendBiz.businessId}`).get()).data().status, "pending");
  await admin.call("reviewBusiness", { businessId: friendBiz.businessId, decision: "approved" });
  const rewarded = (await db.doc(`referrals/${friendBiz.businessId}`).get()).data();
  assert.equal(rewarded.status, "rewarded");
  assert.equal(rewarded.rewardMonths, 1);
  const hqTrialAfter = await trialEnd(hq.businessId);
  assert.ok(hqTrialAfter - hqTrialBefore >= 28 * DAY && hqTrialAfter - hqTrialBefore <= 31 * DAY, "merkez +1 ay");
  assert.ok((await trialEnd(branch.businessId)) - branchTrialBefore >= 28 * DAY, "şube de +1 ay");
  const notes = await db.collection(`businesses/${hq.businessId}/notifications`).where("type", "==", "referral_reward").get();
  assert.equal(notes.size, 1);
  // Tekrar onay (ör. iki kez) ikinci ödül vermez.
  await admin.call("reviewBusiness", { businessId: friendBiz.businessId, decision: "approved" });
  assert.equal((await trialEnd(hq.businessId)), hqTrialAfter, "çifte ödül yok");

  // 2) Aynı telefon → engellenir, onayda ödül yok.
  const cheat = await client("cheat");
  const cheatBiz = (await cheat.call("createBusiness", form("Sahte Salon", "sahte-salon", { referralCode: program.code, phone: "05325550001" }))).data;
  assert.deepEqual([(await db.doc(`referrals/${cheatBiz.businessId}`).get()).data().status, (await db.doc(`referrals/${cheatBiz.businessId}`).get()).data().reason], ["blocked", "same_phone"]);
  await admin.call("reviewBusiness", { businessId: cheatBiz.businessId, decision: "approved" });
  assert.equal(await trialEnd(hq.businessId), hqTrialAfter);

  // 3) Yıllık sınır 1 → ikinci geçerli davet "cap" ile engellenir; süper admin elle verebilir.
  await db.doc("platformPrivateSettings/referrals").set({ enabled: true, rewardMonths: 1, yearlyCap: 1, referredBonusDays: 10 });
  const second = await client("second");
  const secondBiz = (await second.call("createBusiness", form("Can Berber", "can-berber", { referralCode: program.code }))).data;
  const secondTrial = await trialEnd(secondBiz.businessId);
  const plainTrialEnd = Date.now() + 30 * DAY;
  assert.ok(secondTrial - plainTrialEnd > 9 * DAY, "davetle gelene +10 gün deneme");
  await admin.call("reviewBusiness", { businessId: secondBiz.businessId, decision: "approved" });
  assert.deepEqual([(await db.doc(`referrals/${secondBiz.businessId}`).get()).data().status, (await db.doc(`referrals/${secondBiz.businessId}`).get()).data().reason], ["blocked", "cap"]);
  await assert.rejects(referrer.call("adminUpdateReferrals", { businessId: secondBiz.businessId, action: "reward" }), /süper admin/);
  await admin.call("adminUpdateReferrals", { businessId: secondBiz.businessId, action: "reward" });
  assert.equal((await db.doc(`referrals/${secondBiz.businessId}`).get()).data().status, "rewarded");
  assert.ok((await trialEnd(hq.businessId)) - hqTrialAfter >= 28 * DAY, "elle ödül +1 ay daha");
  await assert.rejects(admin.call("adminUpdateReferrals", { businessId: secondBiz.businessId, action: "reject" }), /reddedilemez/);

  // 4) Program kapalı → kod geçersiz, yeni davet kaydedilmez.
  await admin.call("adminUpdateReferrals", { settings: { enabled: false, rewardMonths: 2, yearlyCap: 12, referredBonusDays: 0 } });
  assert.equal((await anon.call("checkReferralCode", { code: program.code })).data.valid, false);
  const late = await client("late");
  const lateBiz = (await late.call("createBusiness", form("Geç Kalan", "gec-kalan", { referralCode: program.code }))).data;
  assert.equal((await db.doc(`referrals/${lateBiz.businessId}`).get()).exists, false);

  // Panel özeti ve süper admin listesi
  const summary = (await referrer.call("getReferralProgram", { businessId: hq.businessId })).data;
  assert.deepEqual(summary.stats, { invited: 3, pending: 0, rewarded: 2, monthsEarned: 2 });
  const list = (await admin.call("adminListReferrals", {})).data;
  assert.equal(list.totals.rewarded, 2);
  assert.equal(list.leaders[0].name, "Salon Yavuz");
  assert.equal(list.settings.enabled, false);
  await assert.rejects(friend.call("getReferralProgram", { businessId: hq.businessId }));
});
