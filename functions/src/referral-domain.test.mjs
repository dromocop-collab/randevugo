import test from "node:test";
import assert from "node:assert/strict";
import {
  REFERRAL_DEFAULTS, bonusTrialEnd, normalizeReferralCode, normalizeReferralSettings, referralBlockReason, referralCodeFromName,
  referralCodeInText, rewardSubscriptionPatch,
} from "../lib/referral-domain.js";

const NOW = Date.parse("2026-11-18T12:00:00Z");

test("referans kodu addan üretilir ve sadeleşir", () => {
  const code = referralCodeFromName("Salon Yavuz", new Uint8Array([7, 9, 30]));
  assert.match(code, /^SALON[A-HJ-NP-Z2-9]{3}$/);
  assert.equal(referralCodeFromName("Ö", new Uint8Array([1, 2, 3])).startsWith("SR"), true);
  assert.equal(normalizeReferralCode(" salon-7k2 "), "SALON7K2");
  assert.equal(normalizeReferralCode("şık12"), "SIK12");
  assert.equal(normalizeReferralCode("ab"), null);
  assert.equal(normalizeReferralCode(42), null);
});

test("WhatsApp metninden kod bulunur (rakam şart)", () => {
  assert.equal(referralCodeInText("Merhaba kaydol SALON7K2"), "SALON7K2");
  assert.equal(referralCodeInText("davet kodum: salon7k2!"), "SALON7K2");
  assert.equal(referralCodeInText("Merhaba kaydolmak istiyorum"), null);
});

test("ayarlar kırpılır, varsayılanlar", () => {
  assert.deepEqual(normalizeReferralSettings(null), REFERRAL_DEFAULTS);
  assert.deepEqual(normalizeReferralSettings({ enabled: false, rewardMonths: 40, yearlyCap: 0, referredBonusDays: "15" }), { enabled: false, rewardMonths: 12, yearlyCap: 1, referredBonusDays: 15 });
});

test("kendini davet / aynı telefon / aynı e-posta engellenir", () => {
  const referrer = { ownerUid: "u1", organizationId: "o1", phone: "+905551112233", email: "A@x.com" };
  assert.equal(referralBlockReason(referrer, { ownerUid: "u1", organizationId: "o2", phone: "", email: "" }), "self");
  assert.equal(referralBlockReason(referrer, { ownerUid: "u2", organizationId: "o1", phone: "", email: "" }), "self");
  assert.equal(referralBlockReason(referrer, { ownerUid: "u2", organizationId: "o2", phone: "05551112233", email: "b@x.com" }), "same_phone");
  assert.equal(referralBlockReason(referrer, { ownerUid: "u2", organizationId: "o2", phone: "05559998877", email: " a@x.com" }), "same_email");
  assert.equal(referralBlockReason(referrer, { ownerUid: "u2", organizationId: "o2", phone: "05559998877", email: "b@x.com" }), null);
});

test("ödül süresi: deneme / aktif / dolmuş / süresiz", () => {
  const trial = rewardSubscriptionPatch({ status: "trialing", trialEndsAt: "2026-11-30T12:00:00.000Z" }, 1, NOW);
  assert.equal(trial.kind, "trial");
  assert.equal(trial.patch.trialEndsAt, "2026-12-30T12:00:00.000Z");
  const active = rewardSubscriptionPatch({ status: "active", subscriptionEndsAt: "2027-01-31T00:00:00.000Z" }, 1, NOW);
  assert.equal(active.patch.subscriptionEndsAt, "2027-02-28T00:00:00.000Z", "ay sonu taşmaz");
  const expired = rewardSubscriptionPatch({ status: "expired", subscriptionEndsAt: "2026-10-01T00:00:00.000Z" }, 2, NOW);
  assert.equal(expired.kind, "restart");
  assert.equal(expired.patch.status, "active");
  assert.equal(expired.patch.subscriptionEndsAt, "2027-01-18T12:00:00.000Z");
  const pastTrial = rewardSubscriptionPatch({ status: "trialing", trialEndsAt: "2026-11-01T00:00:00.000Z" }, 1, NOW);
  assert.equal(pastTrial.patch.trialEndsAt, "2026-12-18T12:00:00.000Z", "geçmiş deneme bugünden uzar");
  assert.equal(rewardSubscriptionPatch({ status: "active", isLifetime: true }, 1, NOW).kind, "lifetime");
  assert.equal(bonusTrialEnd("2026-12-18T00:00:00.000Z", 15), "2027-01-02T00:00:00.000Z");
});
