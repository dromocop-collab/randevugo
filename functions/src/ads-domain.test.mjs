import test from "node:test";
import assert from "node:assert/strict";
import {
  attributionChannel, dailyBudgetMinorUnits, isMetaAttribution, metaDateRange, normalizeAdAccountId, parseMetaInsight, ratio,
  sanitizeAttribution, summarizeSignups,
} from "../lib/ads-domain.js";

const NOW = Date.parse("2026-10-20T12:00:00+03:00");

test("attribution is cleaned, normalized and expires after 30 days", () => {
  const value = sanitizeAttribution({
    source: " Meta ", medium: "paid", campaign: "Reels 1<script>", content: null, capturedAt: NOW - 86_400_000,
    landingPath: "/isletmeler/kayit?utm_source=meta", referrerHost: "l.instagram.com", clickId: "fbclid",
  }, NOW);
  assert.equal(value.source, "meta");
  assert.equal(value.campaign, "reels_1script");
  assert.equal(value.landingPath, "/isletmeler/kayit");
  assert.equal(value.clickId, "fbclid");
  assert.equal(sanitizeAttribution({ source: "meta", capturedAt: NOW - 31 * 86_400_000 }, NOW), null);
  assert.equal(sanitizeAttribution({ source: "meta", capturedAt: NOW + 86_400_000 }, NOW), null);
  assert.equal(sanitizeAttribution({ capturedAt: NOW }, NOW), null);
  assert.equal(sanitizeAttribution("x", NOW), null);
  // utm yok ama fbclid var → meta
  assert.equal(sanitizeAttribution({ clickId: "fbclid", capturedAt: NOW }, NOW).source, "meta");
  assert.equal(sanitizeAttribution({ clickId: "evil", referrerHost: "google.com", capturedAt: NOW }, NOW).clickId, null);
});

test("channels separate paid Meta, organic Meta, Google and others", () => {
  assert.equal(attributionChannel({ source: "meta", medium: "paid", clickId: null }), "meta_ads");
  assert.equal(attributionChannel({ source: "instagram", medium: "bio", clickId: null }), "meta_organic");
  assert.equal(attributionChannel({ source: "l.instagram.com", medium: null, clickId: "fbclid" }), "meta_ads");
  assert.equal(attributionChannel({ source: "google", medium: "organic", clickId: null }), "google");
  assert.equal(attributionChannel({ source: "newsletter", medium: "email", clickId: null }), "other");
  assert.equal(attributionChannel(null), "direct");
  assert.equal(isMetaAttribution({ source: "facebook", clickId: null }), true);
});

test("signups are grouped by source and campaign", () => {
  const a = { source: "meta", medium: "paid", campaign: "reels_1", clickId: null };
  const summary = summarizeSignups([
    { attribution: a, paid: true, createdAt: 1 },
    { attribution: a, paid: false, createdAt: 2 },
    { attribution: { ...a, campaign: "reels_2" }, paid: false, createdAt: 3 },
    { attribution: null, paid: true, createdAt: 4 },
  ]);
  assert.equal(summary.total, 4);
  assert.equal(summary.paid, 2);
  assert.equal(summary.channels.meta_ads, 3);
  assert.equal(summary.channels.direct, 1);
  assert.deepEqual(summary.campaigns[0], { key: "meta|reels_1", source: "meta", campaign: "reels_1", channel: "meta_ads", signups: 2, paid: 1 });
});

test("meta insights, ratios, ids and budgets", () => {
  const row = parseMetaInsight({ spend: "123.45", impressions: "1000", reach: "800", actions: [{ action_type: "landing_page_view", value: "40" }, { action_type: "link_click", value: "55" }] });
  assert.deepEqual(row, { spend: 123.45, impressions: 1000, reach: 800, linkClicks: 55, landingPageViews: 40, videoViews: 0 });
  assert.equal(parseMetaInsight({ inline_link_clicks: "7" }).linkClicks, 7);
  assert.equal(ratio(10, 3), 3.33);
  assert.equal(ratio(1, 0), null);
  assert.equal(normalizeAdAccountId("act_881998108237172"), "act_881998108237172");
  assert.equal(normalizeAdAccountId(" 881998108237172 "), "act_881998108237172");
  assert.equal(normalizeAdAccountId("abc"), null);
  assert.equal(dailyBudgetMinorUnits("200"), 20000);
  assert.equal(dailyBudgetMinorUnits(49), null);
  assert.equal(dailyBudgetMinorUnits(200000), null);
});

test("date range is in Istanbul days", () => {
  assert.deepEqual(metaDateRange(7, NOW).since, "2026-10-14");
  assert.equal(metaDateRange(7, NOW).until, "2026-10-20");
  assert.equal(metaDateRange(5, NOW).since, "2026-09-21");
  assert.equal(metaDateRange(1, Date.parse("2026-10-20T23:30:00+03:00")).until, "2026-10-20");
});
