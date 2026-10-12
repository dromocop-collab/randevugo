import test from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import {
  addBillingPeriod, buildUserBasket, isMerchantOid, newMerchantOid, paidPeriodWindow, parsePaytrConfig,
  paytrCallbackHash, paytrCustomerFields, paytrRequestToken, toKurus, verifyPaytrCallback,
} from "../lib/paytr-domain.js";

const key = "testkey";
const salt = "testsalt";

test("config requires numeric merchant id, key and salt and honours enabled flag", () => {
  assert.equal(parsePaytrConfig(null), null);
  assert.equal(parsePaytrConfig({ merchantId: "abc", merchantKey: "k", merchantSalt: "s" }), null);
  assert.equal(parsePaytrConfig({ merchantId: "123", merchantKey: "k", merchantSalt: "" }), null);
  assert.equal(parsePaytrConfig({ merchantId: "123", merchantKey: "k", merchantSalt: "s", enabled: false }), null);
  assert.deepEqual(parsePaytrConfig({ merchantId: " 123 ", merchantKey: "k", merchantSalt: "s", testMode: true }),
    { merchantId: "123", merchantKey: "k", merchantSalt: "s", testMode: true });
});

test("merchant oid is alphanumeric, unique and recognised", () => {
  const a = newMerchantOid(1_700_000_000_000);
  const b = newMerchantOid(1_700_000_000_000);
  assert.match(a, /^[A-Z0-9]+$/);
  assert.ok(a.length <= 64);
  assert.notEqual(a, b);
  assert.equal(isMerchantOid(a), true);
  assert.equal(isMerchantOid("SR-1"), false);
  assert.equal(isMerchantOid("../x"), false);
});

test("amounts and basket use kuruş and two-decimal TL", () => {
  assert.equal(toKurus(490), 49000);
  assert.equal(toKurus(4990.5), 499050);
  assert.equal(toKurus(0.1 + 0.2), 30);
  const basket = JSON.parse(Buffer.from(buildUserBasket("SeninRandevun Yıllık", 499000), "base64").toString("utf8"));
  assert.deepEqual(basket, [["SeninRandevun Yıllık", "4990.00", 1]]);
});

test("request token follows PayTR's documented concatenation order", () => {
  const input = {
    merchantId: "1", userIp: "1.2.3.4", merchantOid: "SRX", email: "a@b.c", paymentAmount: 49000,
    userBasket: "YmFza2V0", noInstallment: "1", maxInstallment: "0", currency: "TL", testMode: "1",
  };
  const expected = createHmac("sha256", key).update("11.2.3.4SRXa@b.c49000YmFza2V010TL1" + salt).digest("base64");
  assert.equal(paytrRequestToken(input, key, salt), expected);
});

test("callback hash is verified and tampering is rejected", () => {
  const body = { merchant_oid: "SRABCDEFGH12", status: "success", total_amount: "49000" };
  const hash = paytrCallbackHash(body.merchant_oid, body.status, body.total_amount, key, salt);
  assert.equal(hash, createHmac("sha256", key).update("SRABCDEFGH12" + salt + "success49000").digest("base64"));
  assert.equal(verifyPaytrCallback({ ...body, hash }, { merchantKey: key, merchantSalt: salt }), true);
  assert.equal(verifyPaytrCallback({ ...body, total_amount: "100", hash }, { merchantKey: key, merchantSalt: salt }), false);
  assert.equal(verifyPaytrCallback({ ...body, status: "failed", hash }, { merchantKey: key, merchantSalt: salt }), false);
  assert.equal(verifyPaytrCallback({ ...body, hash: "short" }, { merchantKey: key, merchantSalt: salt }), false);
  assert.equal(verifyPaytrCallback({ ...body }, { merchantKey: key, merchantSalt: salt }), false);
});

test("customer fields are never empty", () => {
  assert.deepEqual(paytrCustomerFields({}), { userName: "İşletme yetkilisi", userAddress: "Türkiye", userPhone: "05000000000" });
  assert.deepEqual(paytrCustomerFields({ name: "  Ali  Veli ", address: "Fethiye\nMuğla", phone: "0 (555) 123-45-67" }),
    { userName: "Ali Veli", userAddress: "Fethiye Muğla", userPhone: "05551234567" });
});

test("billing period adds calendar months and clamps month ends", () => {
  assert.equal(new Date(addBillingPeriod(Date.UTC(2026, 0, 31, 10), "monthly")).toISOString(), "2026-02-28T10:00:00.000Z");
  assert.equal(new Date(addBillingPeriod(Date.UTC(2026, 9, 12, 8), "monthly")).toISOString(), "2026-11-12T08:00:00.000Z");
  assert.equal(new Date(addBillingPeriod(Date.UTC(2028, 1, 29), "yearly")).toISOString(), "2029-02-28T00:00:00.000Z");
  assert.equal(new Date(addBillingPeriod(Date.UTC(2026, 11, 15), "monthly")).toISOString(), "2027-01-15T00:00:00.000Z");
});

test("paid period starts after remaining access, otherwise now", () => {
  const now = Date.UTC(2026, 9, 12);
  const trialEnd = Date.UTC(2026, 9, 20);
  assert.deepEqual(paidPeriodWindow(trialEnd, "monthly", now), { startMillis: trialEnd, endMillis: Date.UTC(2026, 10, 20) });
  assert.deepEqual(paidPeriodWindow(now - 1, "monthly", now), { startMillis: now, endMillis: Date.UTC(2026, 10, 12) });
  assert.deepEqual(paidPeriodWindow(null, "yearly", now), { startMillis: now, endMillis: Date.UTC(2027, 9, 12) });
});
