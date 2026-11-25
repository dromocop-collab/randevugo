import test from "node:test";
import assert from "node:assert/strict";
import { authorLabel, authorUpdateNotice, isFeatureRequestStatus, parseFeatureRequest, toggleVote } from "../lib/feature-request-domain.js";

test("istek: başlık en az 5 harf, tür bilinmiyorsa feature, gizli alan doluysa red", () => {
  const ok = parseFeatureRequest({ title: "  Takvimde\n haftalık görünüm ", details: "a\n\n\n\nb", kind: "improvement", businessId: "abc_1", page: "/dashboard/takvim" });
  assert.equal(ok.ok, true);
  assert.equal(ok.value.title, "Takvimde haftalık görünüm");
  assert.equal(ok.value.details, "a\n\nb");
  assert.equal(ok.value.kind, "improvement");
  assert.equal(ok.value.businessId, "abc_1");
  assert.equal(ok.value.page, "/dashboard/takvim");
  assert.equal(parseFeatureRequest({ title: "abc" }).ok, false);
  assert.equal(parseFeatureRequest({ title: "12345 !!!" }).ok, false);
  assert.equal(parseFeatureRequest({ title: "Güzel bir fikir", website: "x" }).ok, false);
  const fallback = parseFeatureRequest({ title: "Güzel bir fikir", kind: "hack", businessId: "../x", page: "https://evil" });
  assert.equal(fallback.value.kind, "feature");
  assert.equal(fallback.value.businessId, null);
  assert.equal(fallback.value.page, "");
  assert.equal(parseFeatureRequest({ title: "x".repeat(10) + " fikir".repeat(40) }).value.title.length, 120);
});

test("yazar etiketi: ad + soyad baş harfi, yoksa kitle adı", () => {
  assert.equal(authorLabel("ayşe nur yılmaz", "customer"), "Ayşe Y.");
  assert.equal(authorLabel("İsmail", "business"), "İsmail");
  assert.equal(authorLabel("   ", "business"), "Bir işletme");
  assert.equal(authorLabel("", "guest"), "Bir ziyaretçi");
});

test("oy aç/kapat ve sınır", () => {
  assert.deepEqual(toggleVote(undefined, "a"), { ids: ["a"], voted: true });
  assert.deepEqual(toggleVote(["a", "b"], "a"), { ids: ["b"], voted: false });
  assert.deepEqual(toggleVote(["a", "b", 3], "c", 2), { ids: ["b", "c"], voted: true });
  assert.equal(isFeatureRequestStatus("planned"), true);
  assert.equal(isFeatureRequestStatus("x"), false);
});

test("yazara bildirim: durum değişimi ya da yeni ekip yanıtı", () => {
  const base = { title: "Haftalık görünüm", status: "new" };
  assert.equal(authorUpdateNotice(base, { ...base }), null);
  assert.deepEqual(authorUpdateNotice(base, { ...base, status: "planned" }), { title: "İsteğin: Planlandı", body: "“Haftalık görünüm” isteğinin durumu güncellendi." });
  assert.equal(authorUpdateNotice({ ...base, status: "planned" }, { ...base, status: "new" }), null);
  assert.deepEqual(authorUpdateNotice(base, { ...base, adminReply: { text: "Aralıkta geliyor" } }), { title: "İsteğine ekipten yanıt var", body: "“Haftalık görünüm” · Aralıkta geliyor" });
  assert.equal(authorUpdateNotice({ ...base, adminReply: { text: "x" } }, { ...base, adminReply: { text: "x" } }), null);
  assert.equal(authorUpdateNotice(base, { ...base, status: "done", adminReply: { text: "Yayında" } }).body, "“Haftalık görünüm” · Yayında");
});
