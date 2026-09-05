"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, CalendarPlus2, Clock3, MessageCircleMore, RefreshCw, Rocket, Sparkles, Target, TrendingUp, UsersRound } from "lucide-react";
import { useBusinessContext } from "@/features/businesses/business-context";
import { listAppointments } from "@/features/appointments/appointment-repository";
import { listCustomers } from "@/features/customers/customer-repository";
import type { Appointment } from "@/types/appointments";
import type { Customer } from "@/types/customer";

const DAY = 86_400_000;

function dateValue(value: unknown) {
  if (typeof value === "string" || typeof value === "number") return new Date(value);
  if (value && typeof value === "object" && "toDate" in value && typeof (value as { toDate?: unknown }).toDate === "function") return (value as { toDate: () => Date }).toDate();
  return null;
}

function whatsapp(phone: string, name: string) {
  const digits = phone.replace(/\D/g, "").replace(/^0/, "90");
  return `https://wa.me/${digits}?text=${encodeURIComponent(`Merhaba ${name}, sizi özledik! Size uygun yeni randevu saatlerimiz var.`)}`;
}

export default function GrowthCenterPage() {
  const { businessId } = useBusinessContext();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reportTime] = useState(() => Date.now());

  useEffect(() => {
    if (!businessId) return;
    let active = true;
    Promise.all([listAppointments(businessId), listCustomers(businessId)])
      .then(([nextAppointments, nextCustomers]) => { if (active) { setAppointments(nextAppointments); setCustomers(nextCustomers); setError(""); } })
      .catch((reason: unknown) => { if (active) setError(reason instanceof Error ? reason.message : "Büyüme verileri alınamadı."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [businessId]);

  const data = useMemo(() => {
    const now = reportTime;
    const recent = appointments.filter((item) => (dateValue(item.startAt)?.getTime() ?? 0) >= now - 30 * DAY);
    const previous = appointments.filter((item) => { const time = dateValue(item.startAt)?.getTime() ?? 0; return time >= now - 60 * DAY && time < now - 30 * DAY; });
    const completed = recent.filter((item) => item.status === "completed");
    const revenue = completed.reduce((sum, item) => sum + (item.servicePrice ?? 0), 0);
    const previousRevenue = previous.filter((item) => item.status === "completed").reduce((sum, item) => sum + (item.servicePrice ?? 0), 0);
    const growth = previousRevenue > 0 ? Math.round((revenue - previousRevenue) / previousRevenue * 100) : revenue > 0 ? 100 : 0;
    const returningIds = new Set(completed.map((item) => item.customerId).filter(Boolean));
    const inactive = customers.filter((customer) => {
      const last = dateValue(customer.lastVisitAt)?.getTime() ?? 0;
      return Boolean(customer.phone) && last > 0 && last < now - 45 * DAY;
    }).sort((a, b) => (dateValue(a.lastVisitAt)?.getTime() ?? 0) - (dateValue(b.lastVisitAt)?.getTime() ?? 0)).slice(0, 6);
    const hourCounts = new Map<number, number>();
    recent.forEach((item) => { const hour = dateValue(item.startAt)?.getHours(); if (hour != null) hourCounts.set(hour, (hourCounts.get(hour) ?? 0) + 1); });
    const peaks = [...hourCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3);
    const cancelled = recent.filter((item) => item.status === "cancelled" || item.status === "no_show").length;
    const health = recent.length ? Math.round(completed.length / recent.length * 100) : 0;
    return { recent, revenue, growth, returning: returningIds.size, inactive, peaks, cancelled, health };
  }, [appointments, customers, reportTime]);

  if (loading) return <div className="grid gap-4 sm:grid-cols-2"><div className="h-48 animate-pulse rounded-3xl bg-[var(--surface-2)]"/><div className="h-48 animate-pulse rounded-3xl bg-[var(--surface-2)]"/></div>;

  return <div className="space-y-6">
    <section className="relative overflow-hidden rounded-[30px] bg-[linear-gradient(125deg,#073b2c,#0b6b45_62%,#47b881)] p-7 text-white shadow-2xl shadow-emerald-950/20 sm:p-9">
      <div className="absolute -right-16 -top-20 h-56 w-56 rounded-full border border-white/15 bg-white/5"/><div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between"><div><span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-[10px] font-black tracking-[.16em]"><Sparkles size={13}/> AKILLI BÜYÜME MOTORU</span><h1 className="mt-4 text-3xl font-black tracking-tight sm:text-5xl">Veriyi aksiyona dönüştür.</h1><p className="mt-3 max-w-2xl text-sm leading-6 text-emerald-50/75">Yoğun saatleri görün, geri kazanılabilecek müşterileri bulun ve önümüzdeki haftayı daha dolu planlayın.</p></div><Link href="/dashboard/takvim" className="inline-flex w-fit items-center gap-2 rounded-2xl bg-[#d8ff72] px-5 py-3 text-xs font-black text-[#073b2c] transition hover:-translate-y-1"><CalendarPlus2 size={17}/> Takvimi optimize et</Link></div>
    </section>
    {error && <div className="rounded-2xl border border-rose-300 bg-rose-50 p-4 text-sm text-rose-700">{error}</div>}
    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <GrowthMetric icon={TrendingUp} label="30 günlük gelir" value={`${data.revenue.toLocaleString("tr-TR")} ₺`} note={`${data.growth >= 0 ? "+" : ""}%${data.growth} önceki döneme göre`}/>
      <GrowthMetric icon={Target} label="Tamamlama kalitesi" value={`%${data.health}`} note={`${data.cancelled} iptal veya gelmedi`}/>
      <GrowthMetric icon={UsersRound} label="Aktif müşteri" value={String(data.returning)} note="son 30 günde hizmet alan"/>
      <GrowthMetric icon={RefreshCw} label="Geri kazanım fırsatı" value={String(data.inactive.length)} note="45+ gündür gelmeyen"/>
    </section>
    <section className="grid gap-5 xl:grid-cols-[1.1fr_.9fr]">
      <article className="rounded-3xl border border-[var(--border)] bg-[var(--surface-1)] p-6 shadow-lg"><div className="flex items-start justify-between"><div><p className="text-[10px] font-black tracking-[.16em] text-[var(--accent)]">MÜŞTERİ GERİ KAZANIMI</p><h2 className="mt-2 text-xl font-extrabold text-[var(--text-1)]">Sizi özleyen müşteriler</h2></div><MessageCircleMore className="text-[var(--accent)]"/></div><div className="mt-5 space-y-2">{data.inactive.length ? data.inactive.map((customer) => <div key={customer.id} className="flex items-center gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-[var(--accent)]/10 font-black text-[var(--accent)]">{customer.fullName.charAt(0)}</span><div className="min-w-0 flex-1"><b className="block truncate text-sm text-[var(--text-1)]">{customer.fullName}</b><small className="text-[var(--text-3)]">{customer.totalAppointments} randevu · {customer.totalSpent.toLocaleString("tr-TR")} ₺</small></div><a href={whatsapp(customer.phone, customer.fullName)} target="_blank" rel="noreferrer" className="rounded-xl bg-emerald-500/10 px-3 py-2 text-[10px] font-black text-emerald-700">Mesaj gönder</a></div>) : <Empty text="Şimdilik geri kazanım bekleyen müşteri yok."/>}</div></article>
      <article className="rounded-3xl border border-[var(--border)] bg-[var(--surface-1)] p-6 shadow-lg"><div className="flex items-start justify-between"><div><p className="text-[10px] font-black tracking-[.16em] text-violet-500">TALEP RADARI</p><h2 className="mt-2 text-xl font-extrabold text-[var(--text-1)]">En yoğun saatler</h2></div><Clock3 className="text-violet-500"/></div><div className="mt-7 space-y-5">{data.peaks.length ? data.peaks.map(([hour, count], index) => <div key={hour}><div className="mb-2 flex justify-between text-xs"><b className="text-[var(--text-2)]">{String(hour).padStart(2,"0")}:00 – {String(hour + 1).padStart(2,"0")}:00</b><span className="text-[var(--text-3)]">{count} randevu</span></div><div className="h-3 overflow-hidden rounded-full bg-[var(--surface-3)]"><i className="block h-full rounded-full bg-[linear-gradient(90deg,#8b5cf6,#22c55e)] transition-all duration-700" style={{width:`${Math.max(22, 100 - index * 24)}%`}}/></div></div>) : <Empty text="Talep haritası için randevu verisi bekleniyor."/>}</div><Link href="/dashboard/calisma-saatleri" className="mt-7 inline-flex items-center gap-2 text-xs font-black text-[var(--accent)]">Çalışma saatlerini düzenle <ArrowRight size={14}/></Link></article>
    </section>
    <section className="rounded-3xl border border-[var(--border)] bg-[var(--surface-1)] p-6 shadow-lg"><div className="flex items-center gap-3"><span className="grid h-11 w-11 place-items-center rounded-2xl bg-amber-400/15 text-amber-600"><Rocket size={20}/></span><div><h2 className="font-extrabold text-[var(--text-1)]">Bu haftanın akıllı aksiyonları</h2><p className="text-xs text-[var(--text-3)]">Verilerinize göre en etkili sırayla</p></div></div><div className="mt-5 grid gap-3 md:grid-cols-3"><Action title="Boşlukları doldur" text="Yaklaşan boş saatleri sadık müşterilerinizle paylaşın." href="/dashboard/takvim"/><Action title="İptali azalt" text="Randevu öncesi hatırlatma ve iptal süresini gözden geçirin." href="/dashboard/ayarlar"/><Action title="Hizmetleri güçlendir" text="Yoğun saatlerde en çok tercih edilen hizmetlerinizi öne çıkarın." href="/dashboard/hizmetler"/></div></section>
  </div>;
}

function GrowthMetric({ icon: Icon, label, value, note }: { icon: typeof TrendingUp; label: string; value: string; note: string }) { return <article className="rounded-3xl border border-[var(--border)] bg-[var(--surface-1)] p-5 shadow-md transition hover:-translate-y-1"><span className="grid h-11 w-11 place-items-center rounded-2xl bg-[var(--accent)]/10 text-[var(--accent)]"><Icon size={20}/></span><p className="mt-4 text-[10px] font-black uppercase tracking-[.13em] text-[var(--text-3)]">{label}</p><b className="mt-1 block text-2xl text-[var(--text-1)]">{value}</b><small className="text-[var(--text-3)]">{note}</small></article>; }
function Action({ title, text, href }: { title: string; text: string; href: string }) { return <Link href={href} className="group rounded-2xl bg-[var(--surface-2)] p-4 transition hover:bg-[var(--surface-3)]"><b className="text-sm text-[var(--text-1)]">{title}</b><p className="mt-2 text-xs leading-5 text-[var(--text-3)]">{text}</p><span className="mt-4 inline-flex items-center gap-1 text-[10px] font-black text-[var(--accent)]">Uygula <ArrowRight size={12} className="transition group-hover:translate-x-1"/></span></Link>; }
function Empty({ text }: { text: string }) { return <div className="rounded-2xl border border-dashed border-[var(--border)] p-6 text-center text-xs text-[var(--text-3)]">{text}</div>; }
