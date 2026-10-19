import type { Appointment } from "@/types/appointments";

export const DAY = 86_400_000;
const WEEKDAYS = ["Paz", "Pzt", "Sal", "Çar", "Per", "Cum", "Cmt"];

export type RangeDays = 7 | 30 | 90;
export type InsightTone = "info" | "warn" | "ok" | "violet";
export type StatusTone = "ok" | "info" | "warn" | "bad" | "violet";

export type Bucket = { key: string; label: string; short: string; count: number; revenue: number };

export function currency(value: number) {
  return new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY", maximumFractionDigits: 0 }).format(value);
}

function startOfDay(time: number) {
  const date = new Date(time);
  date.setHours(0, 0, 0, 0);
  return date.getTime();
}

const dayFmt = new Intl.DateTimeFormat("tr-TR", { day: "numeric", month: "short" });

/** Seçili aralık için zaman kovaları: 7/30 gün → günlük, 90 gün → haftalık. Sorgu değil, yüklenmiş veri üzerinde çalışır. */
function buildBuckets(current: Appointment[], days: RangeDays, now: number): Bucket[] {
  const step = days === 90 ? 7 : 1;
  const count = Math.ceil(days / step);
  const todayStart = startOfDay(now);
  const firstStart = todayStart - (count * step - 1) * DAY;
  const buckets: Bucket[] = Array.from({ length: count }, (_, index) => {
    const start = firstStart + index * step * DAY;
    const label = step === 1
      ? dayFmt.format(new Date(start))
      : `${dayFmt.format(new Date(start))} – ${dayFmt.format(new Date(Math.min(start + (step - 1) * DAY, todayStart)))}`;
    const short = step === 1
      ? (days === 7 ? WEEKDAYS[new Date(start).getDay()] : String(new Date(start).getDate()))
      : dayFmt.format(new Date(start));
    return { key: String(start), label, short, count: 0, revenue: 0 };
  });
  current.forEach((item) => {
    const time = new Date(item.startAt).getTime();
    const index = Math.floor((startOfDay(time) - firstStart) / (step * DAY));
    const bucket = buckets[index];
    if (!bucket) return;
    bucket.count++;
    if (item.status === "completed") bucket.revenue += item.servicePrice ?? 0;
  });
  return buckets;
}

export function buildReport(all: Appointment[], customers: number, days: RangeDays = 30) {
  const now = Date.now(), currentStart = now - days * DAY, previousStart = now - 2 * days * DAY;
  const current = all.filter((a) => { const t = new Date(a.startAt).getTime(); return t >= currentStart && t <= now; });
  const previous = all.filter((a) => { const t = new Date(a.startAt).getTime(); return t >= previousStart && t < currentStart; });
  const completed = current.filter((a) => a.status === "completed");
  const revenue = completed.reduce((s, a) => s + (a.servicePrice ?? 0), 0);
  const previousRevenue = previous.filter((a) => a.status === "completed").reduce((s, a) => s + (a.servicePrice ?? 0), 0);
  const change = (a: number, b: number) => b === 0 ? (a > 0 ? 100 : 0) : Math.round(((a - b) / b) * 100);

  const counts = Array(7).fill(0) as number[];
  current.forEach((a) => counts[new Date(a.startAt).getDay()]++);
  const max = Math.max(...counts, 1);
  const weekdays = counts.map((value, index) => ({ label: WEEKDAYS[index], value, percent: Math.max(5, Math.round(value / max * 100)) }));

  const statusMap: Array<{ key: string; label: string; tone: StatusTone }> = [
    { key: "completed", label: "Tamamlandı", tone: "ok" },
    { key: "confirmed", label: "Onaylı", tone: "info" },
    { key: "pending", label: "Bekliyor", tone: "warn" },
    { key: "cancelled", label: "İptal", tone: "bad" },
    { key: "no_show", label: "Gelmedi", tone: "violet" },
  ];
  const statuses = statusMap.map((s) => { const value = current.filter((a) => a.status === s.key).length; return { ...s, value, percent: current.length ? Math.round(value / current.length * 100) : 0 }; });

  const services = Object.values(completed.reduce<Record<string, { name: string; count: number; revenue: number }>>((acc, a) => {
    const extras = a.additionalServices ?? [];
    const extrasRevenue = extras.reduce((sum, item) => sum + item.price, 0);
    const primaryName = a.serviceName || "Hizmet";
    acc[primaryName] ??= { name: primaryName, count: 0, revenue: 0 };
    acc[primaryName].count++;
    acc[primaryName].revenue += a.primaryServicePrice ?? Math.max(0, (a.servicePrice ?? 0) - extrasRevenue);
    extras.forEach((item) => { acc[item.name] ??= { name: item.name, count: 0, revenue: 0 }; acc[item.name].count++; acc[item.name].revenue += item.price; });
    return acc;
  }, {})).sort((a, b) => b.count - a.count).slice(0, 5);

  // Ekip performansı: iptal/gelmedi hariç randevular, gelir yalnızca tamamlananlardan.
  const staff = Object.values(current.filter((a) => a.status !== "cancelled" && a.status !== "no_show").reduce<Record<string, { name: string; count: number; revenue: number }>>((acc, a) => {
    const name = a.staffName?.trim() || "Atanmamış";
    acc[name] ??= { name, count: 0, revenue: 0 };
    acc[name].count++;
    if (a.status === "completed") acc[name].revenue += a.servicePrice ?? 0;
    return acc;
  }, {})).sort((a, b) => b.count - a.count).slice(0, 5);

  const completionRate = current.length ? Math.round(completed.length / current.length * 100) : 0;
  const noShow = current.filter((a) => a.status === "no_show").length;
  const noShowRate = current.length ? Math.round(noShow / current.length * 100) : 0;
  const busiest = weekdays.reduce((a, b) => b.value > a.value ? b : a, weekdays[0]);
  const buckets = buildBuckets(current, days, now);
  const period = `son ${days} gün`;

  const insights: Array<{ title: string; text: string; benefit: string; href: string; action: string; badge: string; tone: InsightTone }> = [
    current.length === 0
      ? { title: "İlk verinizi oluşturun", text: "Performans görünümünü başlatmak için ilk randevunuzu kaydedin.", benefit: "Analiz ve günlük özetler çalışmaya başlar", href: "/dashboard/randevular", action: "Randevu ekle", badge: "Başlangıç", tone: "info" }
      : { title: `${busiest.label} günü kapasiteyi kontrol edin`, text: `${busiest.label}, ${period}deki en yoğun gününüz. Çalışma saatlerini ve ekip uygunluğunu bu güne göre düzenleyin.`, benefit: "Yoğun saatlerde daha dengeli iş akışı", href: "/dashboard/calisma-saatleri", action: "Saatleri düzenle", badge: "Kapasite", tone: "info" },
    noShowRate > 10
      ? { title: "Gelmeyen müşterileri azaltın", text: `Gelmeme oranınız %${noShowRate}. Randevu teyidi ve zamanında hatırlatma akışını güçlendirin.`, benefit: "Boş kalan saatlerin azalması", href: "/dashboard/otomasyonlar", action: "Hatırlatmaları aç", badge: "Öncelikli", tone: "warn" }
      : { title: "Teyit düzenini koruyun", text: `Gelmeme oranınız %${noShowRate} ile kontrol altında. Mevcut hatırlatma düzeninizi sürdürün.`, benefit: "Daha öngörülebilir günlük plan", href: "/dashboard/otomasyonlar", action: "Akışı kontrol et", badge: "İyi gidiyor", tone: "ok" },
    services[0]
      ? { title: `${services[0].name} hizmetini öne çıkarın`, text: `${services[0].name}, ${period}de en çok tercih edilen hizmetiniz. Açıklamasını, süresini ve fiyatını gözden geçirin.`, benefit: "Hizmet listenizin daha anlaşılır olması", href: "/dashboard/hizmetler", action: "Hizmeti düzenle", badge: "Hizmet fırsatı", tone: "violet" }
      : { title: "Hizmet verisini tamamlayın", text: "Tamamlanan randevular arttıkça hangi hizmetlerin öne çıktığını burada göreceksiniz.", benefit: "Daha anlamlı hizmet karşılaştırması", href: "/dashboard/hizmetler", action: "Hizmetleri gözden geçir", badge: "Veri bekliyor", tone: "violet" },
  ];

  return {
    revenue, revenueChange: change(revenue, previousRevenue), total: current.length, appointmentChange: change(current.length, previous.length),
    completed: completed.length, completionRate, noShowRate, customers, weekdays, busiestDay: busiest.label, statuses, services, staff, buckets, insights,
    averageTicket: completed.length ? Math.round(revenue / completed.length) : 0,
  };
}

export type Report = ReturnType<typeof buildReport>;
