/**
 * İşletme saat dilimine (varsayılan Europe/Istanbul) göre tarih/saat dönüşümleri.
 * Tarayıcının yerel saat dilimine bağlı kalmamak için kullanılır: bilgisayarı farklı saat
 * diliminde olan bir yönetici de randevuyu doğru saate kaydeder.
 */
export const DEFAULT_TIME_ZONE = "Europe/Istanbul";

function partsOf(millis: number, timeZone: string) {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23",
  });
  const map: Record<string, string> = {};
  for (const part of formatter.formatToParts(new Date(millis))) map[part.type] = part.value;
  return { year: Number(map.year), month: Number(map.month), day: Number(map.day), hour: Number(map.hour), minute: Number(map.minute), second: Number(map.second) };
}

/** "YYYY-MM-DD" + "HH:mm" (işletme saatiyle) → UTC milisaniye. Geçersizse NaN. */
export function zonedDateTimeToMillis(date: string, time: string, timeZone: string = DEFAULT_TIME_ZONE): number {
  const dateMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  const timeMatch = /^(\d{2}):(\d{2})$/.exec(time);
  if (!dateMatch || !timeMatch) return Number.NaN;
  const [y, m, d] = [Number(dateMatch[1]), Number(dateMatch[2]), Number(dateMatch[3])];
  const [hh, mm] = [Number(timeMatch[1]), Number(timeMatch[2])];
  const wallAsUtc = Date.UTC(y, m - 1, d, hh, mm);
  // Saat dilimi farkını iki adımda düzelt (yaz saati geçişlerinde de doğru sonuç verir).
  let guess = wallAsUtc;
  for (let i = 0; i < 2; i++) {
    const p = partsOf(guess, timeZone);
    const shownAsUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute);
    guess += wallAsUtc - shownAsUtc;
  }
  return guess;
}

/** UTC milisaniye → işletme saatiyle { date: "YYYY-MM-DD", time: "HH:mm" }. */
export function millisToZonedDateTime(millis: number, timeZone: string = DEFAULT_TIME_ZONE): { date: string; time: string } {
  const p = partsOf(millis, timeZone);
  const pad = (n: number) => String(n).padStart(2, "0");
  return { date: `${p.year}-${pad(p.month)}-${pad(p.day)}`, time: `${pad(p.hour)}:${pad(p.minute)}` };
}
