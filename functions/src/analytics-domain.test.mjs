import test from "node:test";
import assert from "node:assert/strict";
import {
  classifySource, dayRange, isBotUserAgent, istanbulParts, mapKey, mergeAggregates, normalizeTrackedPath, pageTypeOf, parseUserAgent,
  percentChange, topEntries, unmapKey, visitorIdFor,
} from "../lib/analytics-domain.js";

const IPHONE = "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1";
const MAC_CHROME = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36";
const ANDROID_TABLET = "Mozilla/5.0 (Linux; Android 14; SM-X710) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0 Safari/537.36";
const IG = "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Instagram 350.0";

test("same device + IP gives the same visitor id; ids are not reversible", () => {
  const a = visitorIdFor("secret", "1.2.3.4", IPHONE, "tr-TR,tr;q=0.9");
  assert.equal(a, visitorIdFor("secret", "1.2.3.4", IPHONE, "tr-TR"));
  assert.notEqual(a, visitorIdFor("secret", "1.2.3.5", IPHONE, "tr-TR"));
  assert.notEqual(a, visitorIdFor("secret", "1.2.3.4", MAC_CHROME, "tr-TR"));
  assert.notEqual(a, visitorIdFor("other", "1.2.3.4", IPHONE, "tr-TR"));
  assert.equal(a.length, 32);
  assert.ok(!a.includes("1.2.3.4"));
});

test("bots and automation are excluded", () => {
  assert.equal(isBotUserAgent(IPHONE), false);
  assert.equal(isBotUserAgent(MAC_CHROME), false);
  for (const ua of ["Googlebot/2.1", "Mozilla/5.0 (X11; Linux x86_64) HeadlessChrome/141.0", "facebookexternalhit/1.1", "curl/8.4", "", "short", "Mozilla/5.0 Playwright/1.50 something long"]) {
    assert.equal(isBotUserAgent(ua), true, ua);
  }
});

test("paths are normalized, language split, private paths dropped", () => {
  assert.deepEqual(normalizeTrackedPath("/en/isletmeler/kayit?utm_source=meta#x"), { path: "/isletmeler/kayit", lang: "en" });
  assert.deepEqual(normalizeTrackedPath("/en"), { path: "/", lang: "en" });
  assert.deepEqual(normalizeTrackedPath("/kesfet/"), { path: "/kesfet", lang: "tr" });
  for (const bad of ["/dashboard", "/dashboard/randevular", "/super-admin", "/randevu/abc", "/hesabim", "//evil.com", "https://x", "/<script>"]) {
    assert.equal(normalizeTrackedPath(bad), null, bad);
  }
});

test("page types drive funnels", () => {
  assert.equal(pageTypeOf("/"), "home");
  assert.equal(pageTypeOf("/isletme/erdem-kuafor"), "storefront");
  assert.equal(pageTypeOf("/isletme/erdem-kuafor/randevu"), "booking");
  assert.equal(pageTypeOf("/isletmeler/kayit"), "business_signup");
  assert.equal(pageTypeOf("/isletmeler"), "business_landing");
  assert.equal(pageTypeOf("/kuafor-randevu"), "seo");
  assert.equal(pageTypeOf("/sehir/mugla"), "seo");
  assert.equal(pageTypeOf("/kvkk"), "legal");
  assert.equal(pageTypeOf("/bilinmeyen"), "other");
});

test("user agent parsing", () => {
  assert.deepEqual(parseUserAgent(IPHONE), { device: "mobile", browser: "Safari", os: "iOS" });
  assert.deepEqual(parseUserAgent(MAC_CHROME), { device: "desktop", browser: "Chrome", os: "macOS" });
  assert.equal(parseUserAgent(ANDROID_TABLET).device, "tablet");
  assert.equal(parseUserAgent(IG).browser, "Instagram");
  const ipadDesktopUa = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15";
  assert.equal(parseUserAgent(ipadDesktopUa, 820).device, "tablet");
  assert.equal(parseUserAgent(ipadDesktopUa, 1440).device, "desktop");
});

test("traffic sources", () => {
  const site = "seninrandevun.com";
  assert.deepEqual(classifySource({ referrerHost: null, utmSource: "meta", utmMedium: "paid", siteHost: site }), { kind: "ads", label: "meta" });
  assert.deepEqual(classifySource({ referrerHost: null, utmSource: "instagram", utmMedium: "bio", siteHost: site }), { kind: "social", label: "instagram" });
  assert.deepEqual(classifySource({ referrerHost: "www.google.com.tr", utmSource: null, utmMedium: null, siteHost: site }), { kind: "search", label: "Google" });
  assert.deepEqual(classifySource({ referrerHost: "l.instagram.com", utmSource: null, utmMedium: null, siteHost: site }), { kind: "social", label: "Instagram" });
  assert.deepEqual(classifySource({ referrerHost: "seninrandevun.com", utmSource: null, utmMedium: null, siteHost: site }), { kind: "internal", label: "Site içi" });
  assert.deepEqual(classifySource({ referrerHost: null, utmSource: null, utmMedium: null, siteHost: site }), { kind: "direct", label: "Doğrudan" });
  assert.deepEqual(classifySource({ referrerHost: "blog.example.com", utmSource: null, utmMedium: null, siteHost: site }), { kind: "referral", label: "blog.example.com" });
});

test("Istanbul time, day ranges and map keys", () => {
  assert.deepEqual(istanbulParts(Date.parse("2026-10-21T22:30:00Z")), { day: "2026-10-22", hour: 1, weekday: 3 });
  assert.deepEqual(dayRange(Date.parse("2026-10-21T12:00:00+03:00"), 3), ["2026-10-19", "2026-10-20", "2026-10-21"]);
  assert.equal(mapKey("google.com"), "google%2Ecom");
  assert.equal(unmapKey(mapKey("a.b\\c")), "a.b\\c");
});

test("shards merge, top entries and change", () => {
  const merged = mergeAggregates([
    { views: 3, visitors: 2, byPath: { "/": 2, "/kesfet": 1 }, bySource: { "google%2Ecom": 1 } },
    { views: 2, visitors: 1, byPath: { "/": 1 }, byHour: { "17": 2 } },
  ]);
  assert.equal(merged.views, 5);
  assert.equal(merged.visitors, 3);
  assert.deepEqual(merged.byPath, { "/": 3, "/kesfet": 1 });
  assert.deepEqual(merged.bySource, { "google.com": 1 });
  assert.deepEqual(topEntries(merged.byPath, 1), [{ key: "/", value: 3 }]);
  assert.equal(percentChange(150, 100), 50);
  assert.equal(percentChange(5, 0), 100);
  assert.equal(percentChange(0, 0), null);
});

test("journeys group a session's pages in order with its entry source", async () => {
  const { buildJourneys } = await import("../lib/analytics-domain.js");
  const ts = (ms) => ({ toMillis: () => ms });
  const journeys = buildJourneys([
    { at: ts(3000), session: "v1-1000", visitor: "aaa", path: "/isletmeler/kayit", pageType: "business_signup", sourceKind: "ads", sourceLabel: "meta" },
    { at: ts(2000), session: "v1-1000", visitor: "aaa", path: "/fiyatlar", pageType: "pricing", sourceKind: "ads", sourceLabel: "meta" },
    { at: ts(1000), session: "v1-1000", visitor: "aaa", path: "/", pageType: "home", sourceKind: "ads", sourceLabel: "meta", newSession: true, newVisitor: true, device: "mobile" },
    { at: ts(5000), session: "v2-5000", visitor: "bbb", path: "/isletme/x/randevu", pageType: "booking", sourceKind: "social", sourceLabel: "Instagram", newSession: true },
  ], 10);
  assert.equal(journeys.length, 2);
  assert.equal(journeys[0].session, "v2-5000");
  assert.equal(journeys[0].reachedBooking, true);
  assert.deepEqual(journeys[1].steps.map((step) => step.path), ["/", "/fiyatlar", "/isletmeler/kayit"]);
  assert.equal(journeys[1].durationMs, 2000);
  assert.equal(journeys[1].reachedSignup, true);
  assert.equal(journeys[1].newVisitor, true);
  assert.equal(journeys[1].sourceLabel, "meta");
});

test("actions are whitelisted and session trail is bounded", async () => {
  const { appendTrail, parseTrackedAction } = await import("../lib/analytics-domain.js");
  assert.equal(parseTrackedAction("booking:datetime"), "booking:datetime");
  assert.equal(parseTrackedAction("booking:<script>"), null);
  let trail = appendTrail(null, { t: "page", p: "/", pt: "home", at: 1 }, false);
  trail = appendTrail(trail, { t: "page", p: "/", pt: "home", at: 2 }, false);
  assert.equal(trail.length, 1);
  assert.equal(trail[0].at, 2);
  trail = appendTrail(trail, { t: "action", a: "booking:service", at: 3 }, false);
  assert.equal(trail.length, 2);
  for (let i = 0; i < 20; i += 1) trail = appendTrail(trail, { t: "page", p: `/p${i}`, pt: "other", at: 10 + i }, false);
  assert.equal(trail.length, 14);
  assert.equal(appendTrail(trail, { t: "page", p: "/", pt: "home", at: 99 }, true).length, 1);
});
