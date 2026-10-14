// Fatura bilgileri (alıcı) ve fatura tutarı hesapları — saf yardımcılar. Test: billing-domain.test.mjs
// Profil: businesses/{id}/billing/profile (saveBillingProfile yazar). Ödeme anında subscriptionPayments.billing'e kopyalanır.

export type BillingType = "individual" | "company";

export type BillingProfile = {
  type: BillingType;
  /** Bireysel: ad soyad · Kurumsal: ticari unvan */
  name: string;
  /** Bireysel: TCKN (11) · Kurumsal: VKN (10) — şahıs şirketinde VKN yerine TCKN de geçerlidir */
  taxId: string;
  /** Kurumsalda zorunlu */
  taxOffice: string;
  address: string;
  district: string;
  city: string;
  email: string;
};

export const VAT_RATE = 20;

export function isValidTckn(value: string): boolean {
  if (!/^[1-9]\d{10}$/.test(value)) return false;
  const d = value.split("").map(Number);
  const odd = d[0] + d[2] + d[4] + d[6] + d[8];
  const even = d[1] + d[3] + d[5] + d[7];
  const tenth = ((odd * 7 - even) % 10 + 10) % 10;
  if (tenth !== d[9]) return false;
  return d.slice(0, 10).reduce((sum, digit) => sum + digit, 0) % 10 === d[10];
}

/** GİB vergi kimlik numarası kontrol hanesi (ilk 9 haneden). */
export function vknCheckDigit(firstNine: string): number {
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    const digit = (Number(firstNine[i]) + 9 - i) % 10;
    let product = (digit * 2 ** (9 - i)) % 9;
    if (digit !== 0 && product === 0) product = 9;
    sum += product;
  }
  return (10 - (sum % 10)) % 10;
}

export function isValidVkn(value: string): boolean {
  return /^\d{10}$/.test(value) && vknCheckDigit(value.slice(0, 9)) === Number(value[9]);
}

const clean = (value: unknown, max: number) => String(value ?? "").replace(/[\u0000-\u001F\u007F]/g, " ").replace(/\s+/g, " ").trim().slice(0, max);

/** Girdiyi doğrular; hata varsa Türkçe mesajla Error fırlatır. */
export function normalizeBillingProfile(input: Record<string, unknown> | null | undefined): BillingProfile {
  const type: BillingType = input?.type === "company" ? "company" : "individual";
  const name = clean(input?.name, 160);
  const taxId = String(input?.taxId ?? "").replace(/\D/g, "");
  const taxOffice = clean(input?.taxOffice, 80);
  const address = clean(input?.address, 300);
  const district = clean(input?.district, 60);
  const city = clean(input?.city, 60);
  const email = clean(input?.email, 160).toLowerCase();

  if (name.length < 3) throw new Error(type === "company" ? "Ticari unvanı girin." : "Ad soyad girin.");
  if (type === "individual" && !isValidTckn(taxId)) throw new Error("T.C. kimlik numarası geçersiz.");
  if (type === "company" && !isValidVkn(taxId) && !isValidTckn(taxId)) {
    throw new Error("Vergi kimlik numarası geçersiz (10 hane; şahıs şirketinde 11 haneli T.C. kimlik no).");
  }
  if (type === "company" && taxOffice.length < 2) throw new Error("Vergi dairesini girin.");
  if (address.length < 10) throw new Error("Fatura adresini açık olarak girin.");
  if (city.length < 2) throw new Error("İl girin.");
  if (!/^\S+@\S+\.\S+$/.test(email)) throw new Error("Faturanın gönderileceği e-posta geçersiz.");
  return { type, name, taxId, taxOffice: type === "company" ? taxOffice : "", address, district, city, email };
}

/** KDV dahil tutarı matrah + KDV'ye ayırır (kuruş). */
export function vatBreakdown(grossKurus: number, rate = VAT_RATE) {
  const gross = Math.max(0, Math.round(grossKurus));
  const net = Math.round(gross / (1 + rate / 100));
  return { grossKurus: gross, netKurus: net, vatKurus: gross - net, rate };
}

/** Listelerde gösterim: 12345678901 → 123******01 */
export function maskTaxId(taxId: string): string {
  return taxId.length > 5 ? `${taxId.slice(0, 3)}${"*".repeat(taxId.length - 5)}${taxId.slice(-2)}` : taxId;
}
