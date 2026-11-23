// Panelden hızlı randevu — saf mantık (test: quick-add-domain.test.mjs).
// Telefon biçimi, kayıtlı müşteri eşleştirme, çakışma ve boş saat önerileri.

/** Rakamları alır, Türkiye numarasını 10 haneye indirir (başındaki 0 / 90 / +90 atılır). */
export function phoneDigits(value: string): string {
  let digits = String(value ?? "").replace(/\D/g, "");
  if (digits.startsWith("0090")) digits = digits.slice(4);
  else if (digits.startsWith("90") && digits.length > 10) digits = digits.slice(2);
  else if (digits.startsWith("0")) digits = digits.slice(1);
  return digits.slice(0, 10);
}

/** Yazarken biçimler: "0532 123 45 67". */
export function formatTrPhone(value: string): string {
  const digits = phoneDigits(value);
  if (!digits) return "";
  const parts = [digits.slice(0, 3), digits.slice(3, 6), digits.slice(6, 8), digits.slice(8, 10)].filter(Boolean);
  return `0${parts.join(" ")}`;
}

/** Geçerli Türkiye numarası ise "+90XXXXXXXXXX", değilse null. Sabit hat (2xx-4xx) ve cep (5xx) kabul. */
export function phoneKey(value: string): string | null {
  const digits = phoneDigits(value);
  return /^[2-5]\d{9}$/.test(digits) ? `+90${digits}` : null;
}

export function isMobileKey(key: string | null): boolean {
  return Boolean(key && /^\+905\d{9}$/.test(key));
}

// ── Kayıtlı müşteri önerisi ──

export type CustomerLite = {
  id: string; fullName: string; phone: string;
  totalAppointments?: number; completedAppointments?: number; noShowAppointments?: number; cancelledAppointments?: number;
  lastVisitAt?: string | null; tags?: string[]; notes?: string; userId?: string | null;
};

function fold(value: string): string {
  return value.toLocaleLowerCase("tr-TR").normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/ı/g, "i").trim();
}

/**
 * İsim (kelime başı ya da içinde) veya telefon rakamlarıyla eşleşen müşteriler.
 * Sıra: kelime başı eşleşme > içinde geçen; sonra çok gelen ve yakın zamanda gelen önce.
 */
export function matchCustomers(customers: CustomerLite[], query: string, limit = 5): CustomerLite[] {
  const text = fold(query);
  const digits = String(query ?? "").replace(/\D/g, "");
  if (text.length < 2 && digits.length < 3) return [];
  const scored: Array<{ customer: CustomerLite; score: number }> = [];
  for (const customer of customers) {
    if (!customer.phone) continue;
    let score = 0;
    if (digits.length >= 3) {
      const own = phoneDigits(customer.phone);
      const needle = phoneDigits(digits) || digits;
      if (own.startsWith(needle)) score = 3;
      else if (own.includes(needle) || own.includes(digits)) score = 2;
    }
    if (!score && text.length >= 2 && /\p{L}/u.test(text)) {
      const name = fold(customer.fullName ?? "");
      if (name.split(/\s+/).some((word) => word.startsWith(text)) || name.startsWith(text)) score = 3;
      else if (name.includes(text)) score = 1;
    }
    if (score) scored.push({ customer, score });
  }
  return scored
    .sort((a, b) => b.score - a.score
      || (b.customer.totalAppointments ?? 0) - (a.customer.totalAppointments ?? 0)
      || String(b.customer.lastVisitAt ?? "").localeCompare(String(a.customer.lastVisitAt ?? "")))
    .slice(0, limit)
    .map((row) => row.customer);
}

/** Tam numarası yazılmış müşteri (öneri seçilmeden de tanınsın). */
export function customerByPhone(customers: CustomerLite[], key: string | null): CustomerLite | undefined {
  if (!key) return undefined;
  return customers.find((customer) => phoneKey(customer.phone) === key);
}

/** Gelmeme oranı yüksekse uyarı: en az 2 gelmeme ve toplamın %25'i. */
export function noShowRisk(customer: CustomerLite | undefined): { count: number; total: number } | null {
  if (!customer) return null;
  const count = Math.max(0, customer.noShowAppointments ?? 0);
  const total = Math.max(count, customer.totalAppointments ?? 0);
  return count >= 2 && count / Math.max(1, total) >= 0.25 ? { count, total } : null;
}

// ── Çakışma ve boş saatler (dakika cinsinden, işletme saatiyle gün içi) ──

export type DayInterval = { id: string; start: number; end: number; staffId?: string; status: string; label?: string };
export type DayHours = { isOpen: boolean; start: string; end: string; breakStart?: string; breakEnd?: string };

export function clockToMinutes(value: string | undefined): number | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(String(value ?? "").trim());
  if (!match) return null;
  return Number(match[1]) * 60 + Number(match[2]);
}

export function minutesToClock(value: number): string {
  const total = ((Math.round(value) % 1440) + 1440) % 1440;
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

function blocks(row: DayInterval, staffId: string): boolean {
  if (!["pending", "confirmed"].includes(row.status)) return false;
  // Kişi seçiliyse yalnız o kişinin ve kişisiz randevular; seçili değilse hepsi.
  return !staffId || !row.staffId || row.staffId === staffId;
}

/** Seçilen aralıkla çakışan ilk aktif randevu (düzenlenen randevu hariç). */
export function findConflict(rows: DayInterval[], start: number, end: number, staffId = "", ignoreId = ""): DayInterval | undefined {
  return rows.find((row) => row.id !== ignoreId && blocks(row, staffId) && row.start < end && row.end > start);
}

/**
 * Seçilen güne ait boş başlangıç saatleri: çalışma saati (mola hariç) içinde, süreye sığan,
 * mevcut randevularla çakışmayan, geçmişte kalmayan. `around` verilirse ona en yakınlar önce, sonra saat sırası.
 */
export function freeStarts(input: {
  rows: DayInterval[]; hours?: DayHours | null; duration: number; staffId?: string; ignoreId?: string;
  step?: number; notBefore?: number; around?: number | null; limit?: number;
}): number[] {
  const step = input.step ?? 15;
  const duration = Math.max(5, input.duration);
  const open = input.hours ? (input.hours.isOpen ? clockToMinutes(input.hours.start) : null) : 9 * 60;
  const close = input.hours ? (input.hours.isOpen ? clockToMinutes(input.hours.end) : null) : 21 * 60;
  if (open === null || close === null || close <= open) return [];
  const breakStart = clockToMinutes(input.hours?.breakStart);
  const breakEnd = clockToMinutes(input.hours?.breakEnd);
  const first = Math.max(open, Math.ceil((input.notBefore ?? 0) / step) * step);
  const result: number[] = [];
  for (let start = Math.ceil(first / step) * step; start + duration <= close; start += step) {
    const end = start + duration;
    if (breakStart !== null && breakEnd !== null && breakEnd > breakStart && start < breakEnd && end > breakStart) continue;
    if (findConflict(input.rows, start, end, input.staffId ?? "", input.ignoreId ?? "")) continue;
    result.push(start);
  }
  const limit = input.limit ?? 6;
  if (input.around === null || input.around === undefined) return result.slice(0, limit);
  const around = input.around;
  return result
    .map((start) => ({ start, distance: Math.abs(start - around) }))
    .sort((a, b) => a.distance - b.distance || a.start - b.start)
    .slice(0, limit)
    .map((row) => row.start)
    .sort((a, b) => a - b);
}
