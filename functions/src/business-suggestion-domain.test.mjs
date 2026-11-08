import test from "node:test";
import assert from "node:assert/strict";
import { parseBusinessSuggestion, suggestionPhone } from "../lib/business-suggestion-domain.js";

test("telefon: cep ve sabit hat kabul, geçersiz red", () => {
  for (const raw of ["05551234567", "+90 555 123 45 67", "5551234567"]) assert.equal(suggestionPhone(raw), "905551234567", raw);
  assert.equal(suggestionPhone("0252 612 34 56"), "902526123456");
  for (const raw of ["123", "", "08501234567"]) assert.equal(suggestionPhone(raw), null, raw);
});

test("öneri: ad ve 81 ilden biri zorunlu, numara isteğe bağlı ama yazıldıysa geçerli", () => {
  const ok = parseBusinessSuggestion({ businessName: "  Elif\nKuaför ", city: "ankara", district: "Çankaya", category: "kuafor" });
  assert.equal(ok.businessName, "Elif Kuaför");
  assert.equal(ok.city, "Ankara");
  assert.equal(ok.phone, null);
  assert.equal(parseBusinessSuggestion({ businessName: "A", city: "Ankara" }), null);
  assert.equal(parseBusinessSuggestion({ businessName: "12345", city: "Ankara" }), null);
  assert.equal(parseBusinessSuggestion({ businessName: "Elif", city: "Atlantis" }), null);
  assert.equal(parseBusinessSuggestion({ businessName: "Elif", city: "Ankara", phone: "12" }), null);
  assert.equal(parseBusinessSuggestion({ businessName: "Elif", city: "Ankara", category: "../x" }).category, "");
});

test("bot tuzağı dolu ise reddedilir; aynı işletme yazım farkıyla tek kayda düşer", () => {
  assert.equal(parseBusinessSuggestion({ businessName: "Elif", city: "Ankara", website: "x" }), null);
  const a = parseBusinessSuggestion({ businessName: "ELİF KUAFÖR", city: "Ankara" });
  const b = parseBusinessSuggestion({ businessName: "elif  kuaför", city: "ANKARA" });
  assert.equal(a.id, b.id);
  assert.notEqual(a.id, parseBusinessSuggestion({ businessName: "Elif Kuaför", city: "Muğla" }).id);
});
