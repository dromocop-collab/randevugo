import test from "node:test";
import assert from "node:assert/strict";
import { searchRequests, similarRequests, sortRequests, toFeatureRequest, trendScore } from "./feature-request-domain.ts";

const DAY = 86_400_000;
const NOW = Date.parse("2026-11-25T12:00:00Z");
const item = (id, title, extra = {}) => toFeatureRequest(id, { title, details: "", status: "planned", public: true, votes: 0, createdAt: NOW, ...extra });

const list = [
  item("a", "Takvimde haftalık görünüm olsun", { votes: 12, createdAt: NOW - 60 * DAY }),
  item("b", "Müşteriye doğum günü mesajı", { votes: 4, createdAt: NOW - 2 * DAY }),
  item("c", "Haftalık rapor e-postası", { votes: 7, createdAt: NOW - 10 * DAY }),
  item("d", "Karanlık mod", { votes: 0, createdAt: NOW - DAY }),
];

test("belge dönüşümü: bilinmeyen alanlar varsayılana düşer", () => {
  const row = toFeatureRequest("x", { title: "T", kind: "zzz", status: "bad", audience: "admin", votes: -3, adminReply: { text: "  " } });
  assert.equal(row.kind, "feature");
  assert.equal(row.status, "new");
  assert.equal(row.audience, "guest");
  assert.equal(row.votes, 0);
  assert.equal(row.adminReply, null);
  assert.equal(row.public, false);
  assert.equal(toFeatureRequest("y", { adminReply: { text: "Tamam" } }).adminReply.text, "Tamam");
});

test("benzer istek: kelime kökü eşleşir, sık kelimeler sayılmaz", () => {
  assert.deepEqual(similarRequests(list, "haftalık takvim görünümü").map((r) => r.id), ["a"]);
  assert.deepEqual(similarRequests(list, "haftalık özet").map((r) => r.id), ["a", "c"]);
  assert.deepEqual(similarRequests(list, "doğum günlerinde mesaj gitsin").map((r) => r.id), ["b"]);
  assert.deepEqual(similarRequests(list, "bir de lütfen olsun"), []);
  assert.deepEqual(similarRequests(list, ""), []);
});

test("sıralama: en çok oy, en yeni, trend", () => {
  assert.deepEqual(sortRequests(list, "top", NOW).map((r) => r.id), ["a", "c", "b", "d"]);
  assert.deepEqual(sortRequests(list, "new", NOW).map((r) => r.id), ["d", "b", "c", "a"]);
  assert.equal(sortRequests(list, "trending", NOW)[0].id, "c");
  assert.ok(trendScore(list[1], NOW) > trendScore(list[3], NOW));
});

test("arama Türkçe harf duyarsız", () => {
  assert.deepEqual(searchRequests(list, "DOGUM").map((r) => r.id), ["b"]);
  assert.equal(searchRequests(list, "  ").length, 4);
});
