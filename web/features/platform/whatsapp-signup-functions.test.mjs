// Emülatör testi: WhatsApp'tan işletme kaydı sohbeti (Meta Cloud API yerine yerel sahte sunucu).
// Çalıştır: npm run test:wasignup:emulator
import test from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import { createHash } from "node:crypto";
import { createRequire } from "node:module";

const requireFunctions = createRequire(new URL("../../../functions/package.json", import.meta.url));
const { initializeApp, deleteApp } = requireFunctions("firebase-admin/app");
const { getFirestore, Timestamp } = requireFunctions("firebase-admin/firestore");
const { getAuth } = requireFunctions("firebase-admin/auth");
const app = initializeApp({ projectId: "demo-availability-phase8" }, "wa-signup-test");
const db = getFirestore(app);
const auth = getAuth(app);

// Sahte Meta: gönderilen her mesajı kaydeder.
const sent = [];
const server = http.createServer((req, res) => {
  let body = "";
  req.on("data", (chunk) => { body += chunk; });
  req.on("end", () => {
    sent.push(JSON.parse(body || "{}"));
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ messages: [{ id: `wamid.test${sent.length}` }] }));
  });
});
await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
const port = server.address().port;

const PHONE = "905551234567";
const cid = createHash("sha256").update(`wa-inbox:${PHONE}`).digest("hex").slice(0, 24);
let counter = 0;

async function waitFor(check, label, timeoutMs = 20_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const value = await check();
    if (value) return value;
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  assert.fail(`Beklenen olmadı: ${label}`);
}

/** Müşteriden gelen mesajı gelen kutusuna yazar (webhook'un yaptığı gibi) ve botun cevaplarını bekler. */
async function incoming(text, { replyId = null, type = replyId ? "interactive" : "text", expect = 1 } = {}) {
  const before = sent.length;
  counter += 1;
  await db.doc(`whatsappConversations/${cid}`).set({ phone: PHONE, status: "open", createdAt: Timestamp.now() }, { merge: true });
  await db.doc(`whatsappConversations/${cid}/messages/in-${counter}`).set({
    direction: "in", wamid: `wamid.in${counter}`, type, text, replyId, fromAd: false, media: null, location: null, reaction: null, contextId: null,
    createdAt: Timestamp.now(), receivedAt: Timestamp.now(),
  });
  await waitFor(() => sent.length >= before + expect, `${text} → ${expect} cevap`);
  await new Promise((resolve) => setTimeout(resolve, 300));
  return sent.slice(before);
}
const bodyOf = (message) => message.text?.body ?? message.interactive?.body?.text ?? "";

test("WhatsApp'tan kayıt: sohbet → hesap + mağaza + hazır hizmet + şifre bağlantısı", async () => {
  await db.doc("platformPrivateSettings/whatsapp").set({
    enabled: true, phoneNumberId: "1234567", accessToken: "x".repeat(32), appSecret: "secret", verifyToken: "verify",
    apiBase: `http://127.0.0.1:${port}`, inbox: { autoReplyEnabled: true },
  });
  await db.doc("platformPrivateSettings/businessApproval").set({ autoApproveStores: true });

  // Sıradan mesaj kayıt başlatmaz (genel otomatik cevap gider).
  const plain = await incoming("Merhaba, randevumu değiştirmek istiyorum");
  assert.match(bodyOf(plain[0]), /bildirim hattıdır/);
  assert.equal((await db.doc(`whatsappSignups/${cid}`).get()).exists, false);

  const hello = await incoming("Merhaba, işletmemi Senin Randevun'a kaydetmek istiyorum", { expect: 2 });
  assert.match(bodyOf(hello[0]), /hoş geldin/);
  assert.match(bodyOf(hello[1]), /İşletmenin adı/);

  const list = await incoming("Test Güzellik Salonu");
  assert.equal(list[0].interactive.type, "list");
  assert.equal(list[0].interactive.action.sections[0].rows.length, 10);

  const loc = await incoming("💅 Güzellik Merkezi", { replyId: "cat_guzellik" });
  assert.match(bodyOf(loc[0]), /il ve ilçe/);
  const address = await incoming("Muğla Fethiye");
  assert.equal(address[0].interactive.type, "button");
  const owner = await incoming("Sonra eklerim", { replyId: "address_skip" });
  assert.match(bodyOf(owner[0]), /Adın soyadın/);
  const email = await incoming("ayşe kaya");
  assert.match(bodyOf(email[0]), /E-posta/);
  const bad = await incoming("ayse@", { expect: 2 });
  assert.match(bodyOf(bad[0]), /geçersiz/);
  const summary = await incoming("Ayse.WA@Example.com");
  assert.match(bodyOf(summary[0]), /Test Güzellik Salonu[\s\S]*Fethiye, Muğla[\s\S]*Ayşe Kaya[\s\S]*ayse.wa@example.com/);

  const done = await incoming("✅ Mağazamı aç", { replyId: "confirm_yes", expect: 4 });
  assert.match(bodyOf(done[0]), /hazırlıyorum/);
  assert.match(bodyOf(done[1]), /Test Güzellik Salonu\* hazır[\s\S]*yayında: https:\/\/seninrandevun.com\/isletme\/test-guzellik-salonu/);
  assert.equal(done[2].interactive.type, "cta_url");
  assert.match(done[2].interactive.action.parameters.url, /^https?:\/\/.+oobCode=/);

  const session = (await db.doc(`whatsappSignups/${cid}`).get()).data();
  assert.equal(session.status, "done");
  const business = (await db.doc(`businesses/${session.businessId}`).get()).data();
  assert.equal(business.name, "Test Güzellik Salonu");
  assert.equal(business.category, "guzellik");
  assert.equal(business.phone, `+${PHONE}`);
  assert.equal(business.address, "Fethiye, Muğla");
  assert.equal(business.status, "active", "otomatik onay açık + temiz ad");
  assert.equal(business.ownerUid, session.uid);
  const user = await auth.getUser(session.uid);
  assert.equal(user.email, "ayse.wa@example.com");
  assert.equal(user.phoneNumber, `+${PHONE}`);
  assert.equal(user.displayName, "Ayşe Kaya");
  const services = await db.collection(`businesses/${session.businessId}/services`).get();
  assert.ok(services.size >= 3, `hazır hizmet: ${services.size}`);
  const hours = await db.collection(`businesses/${session.businessId}/workingHours`).get();
  assert.equal(hours.size, 7);
  const onboarding = (await db.doc(`whatsappOnboarding/${session.businessId}`).get()).data();
  assert.equal(onboarding?.steps?.welcome?.status, "skipped", "hoş geldin sohbette verildi");
  const acquisition = (await db.doc(`businessAcquisitions/${session.businessId}`).get()).data();
  assert.equal(acquisition?.attribution?.source, "whatsapp");

  // Aynı numara yeniden "kaydol" yazınca ikinci mağaza açılmaz.
  await db.doc(`whatsappSignups/${cid}`).delete();
  const again = await incoming("kaydol");
  assert.match(bodyOf(again[0]), /zaten kayıtlı/);
});

test("iptal: sohbet kapanır, kayıt açılmaz", async () => {
  await db.doc(`businesses/zz-placeholder`).delete().catch(() => undefined);
  const other = "905559876543";
  const otherCid = createHash("sha256").update(`wa-inbox:${other}`).digest("hex").slice(0, 24);
  const before = sent.length;
  await db.doc(`whatsappConversations/${otherCid}`).set({ phone: other, status: "open" }, { merge: true });
  await db.doc(`whatsappConversations/${otherCid}/messages/a`).set({ direction: "in", type: "text", text: "kaydol", replyId: null, fromAd: false, createdAt: Timestamp.now() });
  await waitFor(() => sent.length >= before + 2, "karşılama");
  await db.doc(`whatsappConversations/${otherCid}/messages/b`).set({ direction: "in", type: "text", text: "iptal", replyId: null, fromAd: false, createdAt: Timestamp.now() });
  await waitFor(async () => (await db.doc(`whatsappSignups/${otherCid}`).get()).data()?.status === "cancelled", "iptal");
  assert.equal((await db.doc(`whatsappOptOuts/${otherCid}`).get()).exists, false, "iptal bildirim iznini kapatmaz");
  // Sohbet sürerken DUR: kayıt kapanır ve bildirimlerden çıkar.
  await db.doc(`whatsappConversations/${otherCid}/messages/c`).set({ direction: "in", type: "text", text: "kaydol", replyId: null, fromAd: false, createdAt: Timestamp.now() });
  await waitFor(async () => (await db.doc(`whatsappSignups/${otherCid}`).get()).data()?.status === "active", "yeniden başladı");
  await db.doc(`whatsappConversations/${otherCid}/messages/d`).set({ direction: "in", type: "text", text: "DUR", replyId: null, fromAd: false, createdAt: Timestamp.now() });
  await waitFor(async () => (await db.doc(`whatsappSignups/${otherCid}`).get()).data()?.status === "cancelled", "DUR kaydı kapatır");
  const optOuts = await db.collection("whatsappOptOuts").where("phone", "==", other).get();
  assert.equal(optOuts.size, 1, "DUR bildirim iznini kapatır");
});

test.after(async () => {
  server.close();
  await deleteApp(app);
});
