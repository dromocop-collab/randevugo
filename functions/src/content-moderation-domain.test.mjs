import test from "node:test";
import assert from "node:assert/strict";
import { cleanWordList, moderateFields, normalizeWord } from "../lib/content-moderation-domain.js";

const check = (text, options) => moderateFields({ name: text }, options);

test("normal işletme adları ve masum kelimeler geçer", () => {
  for (const text of [
    "Ayşe Güzellik Salonu", "Erdem Kuaför", "Amasya Berber", "Sikke Cafe", "Şikayet yok, mutlu müşteri", "Sıkıntısız randevu",
    "Unisex Kuaför", "Malatya Lezzet", "Mal Kuaför", "Götürü fiyat", "Siklon Fitness", "Siklamen Çiçekçilik", "Amatör Futbol Kulübü",
    "İtalyan Pizza", "Köpek Bakım Merkezi", "Aptal kutusu tamir", "Ali'nin Yeri", "Nail Studio", "Dövme & Piercing",
  ]) {
    assert.equal(check(text).clean, true, text);
  }
});

test("küfür ve uygunsuz ifadeler yakalanır", () => {
  for (const text of [
    "Siktir Kuaför", "orospu çocuğu", "AMK berber", "a m k", "s.i.k.t.i.r git", "s1kt1r", "0r0spu", "Yarrrrak", "piç kurusu",
    "amına koyayım salon", "Şerefsiz herif", "fuck this", "escort hizmeti", "Porno Studio", "gerizekalılar", "kahpeler",
  ]) {
    assert.equal(check(text).clean, false, text);
  }
});

test("zayıf kelime tek başına değil, başka küfürle birlikte işaretlenir", () => {
  assert.equal(check("Mal Kuaför").clean, true);
  const both = check("mal siktir");
  assert.equal(both.clean, false);
  assert.deepEqual(both.matches.map((match) => match.word).sort(), ["mal", "siktir"]);
});

test("birden fazla alan ve eşleşme alanı", () => {
  const result = moderateFields({ name: "Güzel Salon", description: "En iyi hizmet. orospu", address: "Atatürk Cd." });
  assert.equal(result.clean, false);
  assert.equal(result.matches[0].field, "description");
});

test("admin ek kelime ve izinli kelime listesi", () => {
  assert.equal(check("Kumarhane Cafe").clean, true);
  assert.equal(check("Kumarhane Cafe", { extraWords: ["kumar"] }).clean, false, "kök gibi başlangıç eşleşmesi");
  assert.equal(check("Piç Burger", { allowedWords: ["piç"] }).clean, true);
  assert.deepEqual(cleanWordList(["  KUMAR ", "", "x", 5, "kumar"]), ["kumar"]);
});

test("normalize: leetspeak, tekrar harf, kelime içi işaret", () => {
  assert.equal(normalizeWord("S1KT1R"), "siktir");
  assert.equal(normalizeWord("a.m.k"), "amk");
  assert.equal(normalizeWord("YARRRRAK"), "yarrak");
  assert.equal(normalizeWord("İSTANBUL"), "istanbul");
});
