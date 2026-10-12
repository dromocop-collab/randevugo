import { createHmac, randomBytes, timingSafeEqual } from "crypto";

// PayTR iFrame API (https://dev.paytr.com/iframe-api) için saf yardımcılar.
// Ağ ve Firestore erişimi index.ts'te; burası test edilebilir hesaplamaları tutar.

export const PAYTR_TOKEN_URL = "https://www.paytr.com/odeme/api/get-token";
export const PAYTR_CHECKOUT_BASE = "https://www.paytr.com/odeme/guvenli/";

export type BillingCycle = "monthly" | "yearly";

export type PaytrConfig = {
  merchantId: string;
  merchantKey: string;
  merchantSalt: string;
  testMode: boolean;
};

/** platformPrivateSettings/paytr belgesini doğrular; eksik/kapalıysa null (ödeme kapalı). */
export function parsePaytrConfig(data: Record<string, unknown> | undefined | null): PaytrConfig | null {
  if (!data || data.enabled === false) return null;
  const merchantId = String(data.merchantId ?? "").trim();
  const merchantKey = String(data.merchantKey ?? "").trim();
  const merchantSalt = String(data.merchantSalt ?? "").trim();
  if (!/^\d+$/.test(merchantId) || !merchantKey || !merchantSalt) return null;
  return { merchantId, merchantKey, merchantSalt, testMode: data.testMode === true };
}

/** PayTR merchant_oid yalnız harf/rakam kabul eder (en fazla 64). */
export function newMerchantOid(nowMillis = Date.now()): string {
  return `SR${nowMillis.toString(36).toUpperCase()}${randomBytes(6).toString("hex").toUpperCase()}`;
}

export function isMerchantOid(value: unknown): value is string {
  return typeof value === "string" && /^SR[A-Z0-9]{8,62}$/.test(value);
}

/** TL → kuruş (PayTR payment_amount). */
export function toKurus(amountTry: number): number {
  return Math.round(amountTry * 100);
}

export function buildUserBasket(itemName: string, amountKurus: number): string {
  const basket = [[itemName.slice(0, 120), (amountKurus / 100).toFixed(2), 1]];
  return Buffer.from(JSON.stringify(basket), "utf8").toString("base64");
}

export type TokenHashInput = {
  merchantId: string;
  userIp: string;
  merchantOid: string;
  email: string;
  paymentAmount: number;
  userBasket: string;
  noInstallment: "0" | "1";
  maxInstallment: string;
  currency: string;
  testMode: "0" | "1";
};

export function paytrRequestToken(input: TokenHashInput, merchantKey: string, merchantSalt: string): string {
  const hashStr = input.merchantId + input.userIp + input.merchantOid + input.email + String(input.paymentAmount) +
    input.userBasket + input.noInstallment + input.maxInstallment + input.currency + input.testMode;
  return createHmac("sha256", merchantKey).update(hashStr + merchantSalt).digest("base64");
}

/** Bildirim (callback) imzası: base64(hmac_sha256(merchant_oid + salt + status + total_amount, key)). */
export function paytrCallbackHash(merchantOid: string, status: string, totalAmount: string, merchantKey: string, merchantSalt: string): string {
  return createHmac("sha256", merchantKey).update(merchantOid + merchantSalt + status + totalAmount).digest("base64");
}

export function verifyPaytrCallback(
  body: { merchant_oid?: unknown; status?: unknown; total_amount?: unknown; hash?: unknown },
  config: Pick<PaytrConfig, "merchantKey" | "merchantSalt">
): boolean {
  const { merchant_oid: oid, status, total_amount: total, hash } = body;
  if (typeof oid !== "string" || typeof status !== "string" || typeof total !== "string" || typeof hash !== "string") return false;
  const expected = Buffer.from(paytrCallbackHash(oid, status, total, config.merchantKey, config.merchantSalt));
  const given = Buffer.from(hash);
  return expected.length === given.length && timingSafeEqual(expected, given);
}

/** PayTR ad/adres/telefon alanları zorunlu ve boş olamaz. */
export function paytrCustomerFields(input: { name?: unknown; address?: unknown; phone?: unknown }) {
  const clean = (value: unknown) => String(value ?? "").replace(/\s+/g, " ").trim();
  const phone = clean(input.phone).replace(/[^\d+]/g, "").slice(0, 20);
  return {
    userName: clean(input.name).slice(0, 60) || "İşletme yetkilisi",
    userAddress: clean(input.address).slice(0, 400) || "Türkiye",
    userPhone: phone || "05000000000",
  };
}

/** Takvim ayı/yılı ekler; ayın son günü taşmalarını (31 Ocak + 1 ay) ayın son gününe sabitler. */
export function addBillingPeriod(baseMillis: number, cycle: BillingCycle): number {
  const base = new Date(baseMillis);
  const months = cycle === "yearly" ? 12 : 1;
  const target = new Date(base.getTime());
  target.setUTCDate(1);
  target.setUTCMonth(target.getUTCMonth() + months);
  const lastDay = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate();
  target.setUTCDate(Math.min(base.getUTCDate(), lastDay));
  return target.getTime();
}

/**
 * Ödenen dönem kalan erişimin ARDINA eklenir: süren deneme ya da aktif dönem
 * yanmaz. Süresi geçmiş/geçersiz bitişte dönem şimdiden başlar.
 */
export function paidPeriodWindow(currentEndMillis: number | null, cycle: BillingCycle, nowMillis = Date.now()) {
  const startMillis = currentEndMillis !== null && Number.isFinite(currentEndMillis) && currentEndMillis > nowMillis
    ? currentEndMillis
    : nowMillis;
  return { startMillis, endMillis: addBillingPeriod(startMillis, cycle) };
}
