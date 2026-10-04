import test, { before, after } from "node:test";
import { readFileSync } from "node:fs";
import { initializeTestEnvironment, assertFails, assertSucceeds } from "@firebase/rules-unit-testing";
import { doc, setDoc } from "firebase/firestore";
import { ref, uploadBytes } from "firebase/storage";

let env;
const BIZ = "biz1";
const png = new Uint8Array([137, 80, 78, 71]);
const meta = { contentType: "image/png" };

before(async () => {
  env = await initializeTestEnvironment({
    projectId: "demo-randevugo-rules",
    firestore: { rules: readFileSync(new URL("../../firestore.rules", import.meta.url), "utf8") },
    storage: { rules: readFileSync(new URL("../../storage.rules", import.meta.url), "utf8") },
  });
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    await setDoc(doc(db, `businesses/${BIZ}`), { ownerUid: "owner", isPublished: true });
    await setDoc(doc(db, `businesses/${BIZ}/members/manager`), { uid: "manager", role: "manager" });
    await setDoc(doc(db, `businesses/${BIZ}/members/staff1`), { uid: "staff1", role: "staff" });
  });
});
after(async () => { await env?.cleanup(); });
const st = (uid) => env.authenticatedContext(uid).storage();

test("sahip ve müdür vitrin görseli yükleyebilir", async () => {
  await assertSucceeds(uploadBytes(ref(st("owner"), `businesses/${BIZ}/public/logo.png`), png, meta));
  await assertSucceeds(uploadBytes(ref(st("manager"), `businesses/${BIZ}/public/staff/s1.png`), png, meta));
});
test("personel ve yabancı vitrin görselini değiştiremez", async () => {
  await assertFails(uploadBytes(ref(st("staff1"), `businesses/${BIZ}/public/logo.png`), png, meta));
  await assertFails(uploadBytes(ref(st("stranger"), `businesses/${BIZ}/public/cover.png`), png, meta));
});
test("müşteri kendi yorum görselini bir kez yükler, üzerine yazamaz, başkası adına yükleyemez", async () => {
  const path = `businesses/${BIZ}/public/reviews/cust/r1.png`;
  await assertSucceeds(uploadBytes(ref(st("cust"), path), png, meta));
  await assertFails(uploadBytes(ref(st("cust"), path), png, meta));
  await assertFails(uploadBytes(ref(st("cust"), `businesses/${BIZ}/public/reviews/other/r1.png`), png, meta));
});
