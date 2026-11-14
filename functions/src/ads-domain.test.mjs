import test from "node:test";
import assert from "node:assert/strict";
import {
  AD_GUARD_DEFAULTS, attributionChannel, buildFunnel, dailyBudgetMinorUnits, evaluateAdGuard, isBreakdownKind, isMetaAdSession, isMetaAttribution, metaDateRange, metaResults,
  normalizeAdAccountId, normalizeAdGuardSettings, parseMetaInsight, ratio, summarizeBreakdown,
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
  assert.deepEqual(row, { spend: 123.45, impressions: 1000, reach: 800, linkClicks: 55, landingPageViews: 40, videoViews: 0, conversations: 0 });
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

test("insight parses WhatsApp conversations", () => {
  const row = parseMetaInsight({ spend: "40", actions: [{ action_type: "onsite_conversion.messaging_conversation_started_7d", value: "4" }] });
  assert.equal(row.conversations, 4);
  assert.equal(metaResults(row), 4);
});

test("breakdown labels placements and flags waste / best", () => {
  const rows = [
    { publisher_platform: "instagram", platform_position: "instagram_reels", spend: "60", impressions: "4000", inline_link_clicks: "40", actions: [{ action_type: "landing_page_view", value: "20" }] },
    { publisher_platform: "instagram", platform_position: "story", spend: "30", impressions: "3000", inline_link_clicks: "10", actions: [{ action_type: "landing_page_view", value: "5" }] },
    { publisher_platform: "audience_network", platform_position: "an_classic", spend: "25", impressions: "9000", inline_link_clicks: "30", actions: [] },
    { publisher_platform: "facebook", platform_position: "feed", spend: "5", impressions: "300", inline_link_clicks: "1", actions: [] },
  ];
  const { rows: out, average } = summarizeBreakdown("placement", rows);
  assert.equal(out[0].label, "Instagram · Reels");
  assert.equal(out[0].flag, "best");
  const network = out.find((row) => row.key === "audience_network|an_classic");
  assert.equal(network.label, "Audience Network · Uygulama ağı");
  assert.equal(network.flag, "waste");
  assert.equal(out.find((row) => row.key === "facebook|feed").flag, null); // harcaması az, işaretlenmez
  assert.equal(average, 4.8);
});

test("weekday breakdown groups daily rows Monday first", () => {
  const { rows } = summarizeBreakdown("weekday", [
    { date_start: "2026-11-08", spend: "10" }, // Pazar
    { date_start: "2026-11-09", spend: "5" }, { date_start: "2026-11-16", spend: "7" }, // Pazartesi ×2
  ]);
  assert.deepEqual(rows.map((row) => [row.label, row.spend]), [["Pazartesi", 12], ["Pazar", 10]]);
  assert.equal(isBreakdownKind("weekday"), true);
  assert.equal(isBreakdownKind("hour"), false);
});

test("ad guard settings are clamped and evaluated", () => {
  assert.deepEqual(normalizeAdGuardSettings(null), AD_GUARD_DEFAULTS);
  const guard = normalizeAdGuardSettings({ enabled: true, minSpend: 5, maxCostPerResult: "40", autoPause: true });
  assert.equal(guard.minSpend, 30);
  assert.equal(guard.maxCostPerResult, 40);
  const zero = { spend: 160, linkClicks: 3, landingPageViews: 0, conversations: 0 };
  assert.equal(evaluateAdGuard(zero, { ...guard, minSpend: 150 }).reason, "no_results");
  assert.equal(evaluateAdGuard(zero, { ...guard, enabled: false }).trigger, false);
  assert.equal(evaluateAdGuard({ ...zero, spend: 100 }, { ...guard, minSpend: 150 }).trigger, false);
  assert.equal(evaluateAdGuard({ ...zero, conversations: 2 }, { ...guard, minSpend: 150 }).reason, "expensive");
  assert.equal(evaluateAdGuard({ ...zero, conversations: 2 }, { ...guard, minSpend: 150, maxCostPerResult: null }).trigger, false);
});

test("funnel percentages skip missing steps", () => {
  const rows = buildFunnel([
    { key: "a", label: "A", value: 200 }, { key: "b", label: "B", value: null }, { key: "c", label: "C", value: 50 }, { key: "d", label: "D", value: 5 },
  ]);
  assert.equal(rows[0].fromPrevious, null);
  assert.equal(rows[1].fromPrevious, null);
  assert.equal(rows[2].fromPrevious, 25);
  assert.equal(rows[3].fromPrevious, 10);
  assert.equal(rows[3].fromFirst, 2.5);
});

test("meta ad session detection", () => {
  assert.equal(isMetaAdSession("ads", "meta"), true);
  assert.equal(isMetaAdSession("ads", "google"), false);
  assert.equal(isMetaAdSession("social", "instagram"), false);
});
