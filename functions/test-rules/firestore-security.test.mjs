// Firestore güvenlik kuralı testleri — emülatörde çalışır:
//   npm --prefix functions run test:rules
import test, { before, after, beforeEach } from "node:test";
import { readFileSync } from "node:fs";
import { initializeTestEnvironment, assertFails, assertSucceeds } from "@firebase/rules-unit-testing";
import { doc, getDoc, setDoc, updateDoc, getDocs, collection, query, where, deleteDoc } from "firebase/firestore";

let env;
const BIZ = "biz1";

before(async () => {
  env = await initializeTestEnvironment({
    projectId: "demo-randevugo-rules",
    firestore: { rules: readFileSync(new URL("../../firestore.rules", import.meta.url), "utf8") },
  });
});
after(async () => { await env?.cleanup(); });

beforeEach(async () => {
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    await setDoc(doc(db, `businesses/${BIZ}`), {
      name: "Erdem Kuaför", ownerUid: "owner", status: "active", approvalStatus: "approved",
      isPublished: true, slug: "erdem-kuafor", plan: "RANDEVUGO",
    });
    await setDoc(doc(db, `businesses/${BIZ}/members/owner`), { uid: "owner", role: "owner" });
    await setDoc(doc(db, `businesses/${BIZ}/members/manager`), { uid: "manager", role: "manager" });
    await setDoc(doc(db, `businesses/${BIZ}/members/staff1`), { uid: "staff1", role: "staff", staffId: "s1", permissions: {} });
    await setDoc(doc(db, `businesses/${BIZ}/customers/c1`), { fullName: "Müşteri", phone: "+905551112233" });
    await setDoc(doc(db, `appointmentTokens/11111111-1111-4111-8111-111111111111`), { businessId: BIZ, appointmentId: "a1" });
    await setDoc(doc(db, `businesses/${BIZ}/appointments/a1`), { customerId: "guest_a1", status: "confirmed", staffId: "s1" });
  });
});

const as = (uid, token = {}) => env.authenticatedContext(uid, token).firestore();

// ── P0: başkasının işletmesine "sahip" olarak sızma ─────────────────────────
test("yabancı kullanıcı kendini başka işletmeye owner olarak ekleyemez", async () => {
  const db = as("attacker");
  await assertFails(setDoc(doc(db, `businesses/${BIZ}/members/attacker`), { uid: "attacker", role: "owner" }));
});

test("gerçek sahip (ownerUid) kendi üyelik kaydını onarabilir (web self-heal)", async () => {
  await env.withSecurityRulesDisabled(async (ctx) => deleteDoc(doc(ctx.firestore(), `businesses/${BIZ}/members/owner`)));
  await assertSucceeds(setDoc(doc(as("owner"), `businesses/${BIZ}/members/owner`), { uid: "owner", role: "owner" }));
});

test("sızma denemesi sonrası müşteri verisi okunamaz", async () => {
  const db = as("attacker");
  await assertFails(getDoc(doc(db, `businesses/${BIZ}/customers/c1`)));
});

// ── Yönetici işletmeyi ele geçiremez / onaysız yayın açamaz ────────────────
test("yönetici ownerUid'yi değiştiremez", async () => {
  await assertFails(updateDoc(doc(as("manager"), `businesses/${BIZ}`), { ownerUid: "manager" }));
});
test("sahip isPublished ve slug alanlarını istemciden değiştiremez", async () => {
  await assertFails(updateDoc(doc(as("owner"), `businesses/${BIZ}`), { isPublished: false }));
  await assertFails(updateDoc(doc(as("owner"), `businesses/${BIZ}`), { slug: "baska" }));
});
test("sahip operasyonel ayarları değiştirebilir", async () => {
  await assertSucceeds(updateDoc(doc(as("owner"), `businesses/${BIZ}`), { allowOnlineBooking: false, maximumBookingDaysAhead: 45 }));
});
test("yönetici canlı sıra ayarını değiştirebilir", async () => {
  await assertSucceeds(updateDoc(doc(as("manager"), `businesses/${BIZ}`), { liveQueueIntakePaused: true }));
});

// ── Randevu bağlantı tokenları listelenemez ────────────────────────────────
test("appointmentTokens koleksiyonu listelenemez ve okunamaz", async () => {
  const db = env.unauthenticatedContext().firestore();
  await assertFails(getDocs(collection(db, "appointmentTokens")));
  await assertFails(getDoc(doc(db, "appointmentTokens/11111111-1111-4111-8111-111111111111")));
});

// ── Platform yöneticisi e-postası doğrulanmış olmalı ───────────────────────
test("doğrulanmamış admin e-postası yönetici sayılmaz", async () => {
  const fake = as("x", { email: "cihatwin@gmail.com", email_verified: false });
  await assertFails(getDoc(doc(fake, "platformAdmins/x")));
  const real = as("y", { email: "cihatwin@gmail.com", email_verified: true });
  await assertSucceeds(getDoc(doc(real, "platformAdmins/y")));
});

// ── Mevcut davranışlar bozulmamalı (regresyon) ─────────────────────────────
test("yayındaki işletme herkese açık okunur", async () => {
  await assertSucceeds(getDoc(doc(env.unauthenticatedContext().firestore(), `businesses/${BIZ}`)));
});
test("müşteri yalnızca kendi randevularını collection-group ile okur", async () => {
  await env.withSecurityRulesDisabled(async (ctx) => setDoc(doc(ctx.firestore(), `businesses/${BIZ}/appointments/a2`), { customerId: "cust", status: "confirmed", startAt: new Date() }));
  const { collectionGroup } = await import("firebase/firestore");
  await assertSucceeds(getDocs(query(collectionGroup(as("cust"), "appointments"), where("customerId", "==", "cust"))));
});
test("personel üye kaydını kendisi oluşturamaz/yükseltemez", async () => {
  await assertFails(setDoc(doc(as("staff1"), `businesses/${BIZ}/members/staff1`), { uid: "staff1", role: "owner" }));
});
test("sahip yeni yönetici ekleyebilir", async () => {
  await assertSucceeds(setDoc(doc(as("owner"), `businesses/${BIZ}/members/newbie`), { uid: "newbie", role: "manager" }));
});

// ── Asistan denetim kayıtları ──────────────────────────────────────────────
test("yönetici asistan denetim kaydı yazabilir, sahte aktör ve serbest alan reddedilir", async () => {
  const { serverTimestamp, addDoc } = await import("firebase/firestore");
  const db = as("manager");
  const col = collection(db, `businesses/${BIZ}/auditLogs`);
  await assertSucceeds(addDoc(col, { action: "assistant.staff_updated", entityId: "s1", summary: "x", source: "business_assistant", actorUid: "manager", createdAt: serverTimestamp() }));
  await assertFails(addDoc(col, { action: "assistant.staff_updated", entityId: "s1", source: "business_assistant", actorUid: "owner", createdAt: serverTimestamp() }));
  await assertFails(addDoc(col, { action: "subscription.extended", source: "business_assistant", actorUid: "manager", createdAt: serverTimestamp() }));
  await assertFails(addDoc(collection(as("staff1"), `businesses/${BIZ}/auditLogs`), { action: "assistant.x", source: "business_assistant", actorUid: "staff1", createdAt: serverTimestamp() }));
});
test("destek talebi istemciden oluşturulamaz (callable kullanılır)", async () => {
  const { addDoc } = await import("firebase/firestore");
  await assertFails(addDoc(collection(as("owner"), "supportTickets"), { title: "x", businessId: BIZ, userId: "owner" }));
});
