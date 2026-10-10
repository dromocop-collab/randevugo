import test from "node:test";
import assert from "node:assert/strict";
import {
  SHARE_SIZES, parseShareFormat, shareImagePath, versionToken, shareFileName, shareDisplayUrl,
  clampText, formatRating, formatPriceLabel, pickShowcaseServices, titleFontSize,
} from "./instagram-share-domain.ts";

test("boyut parametresi: varsayılan hikâye, gönderi eşanlamlıları", () => {
  assert.equal(parseShareFormat(null), "story");
  assert.equal(parseShareFormat("hikaye"), "story");
  assert.equal(parseShareFormat("bilinmeyen"), "story");
  for (const value of ["gonderi", "Gönderi", "post", "FEED"]) assert.equal(parseShareFormat(value), "post");
  assert.deepEqual(SHARE_SIZES.story, { width: 1080, height: 1920 });
  assert.deepEqual(SHARE_SIZES.post, { width: 1080, height: 1350 });
});

test("görsel yolu ve sürüm anahtarı", () => {
  assert.equal(shareImagePath("erdem-kuafor", "story"), "/isletme/erdem-kuafor/instagram-gorseli?boyut=hikaye");
  const iso = "2026-10-05T12:00:00.000Z";
  const v = versionToken(iso);
  assert.ok(v.length > 0);
  assert.equal(shareImagePath("erdem-kuafor", "post", iso), `/isletme/erdem-kuafor/instagram-gorseli?boyut=gonderi&v=${v}`);
  assert.equal(versionToken(""), "");
  assert.equal(versionToken(null), "");
  assert.equal(versionToken("çöp"), "");
  const sec = Date.parse(iso) / 1000;
  assert.equal(versionToken({ seconds: sec, nanoseconds: 0 }), v);
  assert.equal(versionToken({ _seconds: sec }), v);
  assert.equal(versionToken(`Timestamp(seconds=${sec}, nanoseconds=0)`), v);
  // Önceden kodlanmış slug tekrar kodlanmaz.
  assert.equal(shareImagePath("%C3%A7a%C4%9Fr%C4%B1", "story"), "/isletme/%C3%A7a%C4%9Fr%C4%B1/instagram-gorseli?boyut=hikaye");
});

test("dosya adı ve görünen adres", () => {
  assert.equal(shareFileName("erdem-kuafor", "story"), "erdem-kuafor-instagram-hikaye.png");
  assert.equal(shareFileName("a/b?c", "post"), "a-b-c-instagram-gonderi.png");
  assert.equal(shareDisplayUrl("erdem-kuafor"), "seninrandevun.com/isletme/erdem-kuafor");
});

test("Türkçe biçimler", () => {
  assert.equal(formatRating(4.86), "4,9");
  assert.equal(formatRating(5), "5,0");
  assert.equal(formatPriceLabel(2250), "₺2.250");
  assert.equal(formatPriceLabel(0), null);
  assert.equal(clampText("  Şık   Saçlar  ", 40), "Şık Saçlar");
  assert.equal(clampText("abcdefghij", 5), "abcd…");
});

test("öne çıkan hizmetler: fiyatlı önce, sıra korunur, tekrarlar ve pasifler atlanır", () => {
  const rows = pickShowcaseServices([
    { name: "Danışma", price: 0, sortOrder: 0 },
    { name: "Saç kesimi", price: 450, durationMinutes: 45, sortOrder: 2 },
    { name: "Boya", price: 1200, durationMinutes: 90, sortOrder: 1 },
    { name: "saç kesimi", price: 500, sortOrder: 3 },
    { name: "Gizli", price: 100, isActive: false, sortOrder: 4 },
    { name: "Telefonla", price: 100, isBookableOnline: false, sortOrder: 5 },
  ], 4);
  assert.deepEqual(rows.map((row) => row.name), ["Boya", "Saç kesimi", "Danışma"]);
  assert.equal(rows[0].priceLabel, "₺1.200");
  assert.equal(rows[0].durationLabel, "1 sa 30 dk");
  assert.equal(rows[2].priceLabel, null);
  assert.equal(pickShowcaseServices(rows.map((row) => ({ name: row.name, price: 1 })), 2).length, 2);
});

test("başlık boyutu uzunlukla küçülür", () => {
  assert.ok(titleFontSize("Kısa", "story") > titleFontSize("Çok uzun bir işletme adı burada yazıyor", "story"));
  assert.ok(titleFontSize("Kısa", "post") < titleFontSize("Kısa", "story"));
});
