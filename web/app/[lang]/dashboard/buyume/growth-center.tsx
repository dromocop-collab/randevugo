"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "@/i18n/link";
import { ArrowRight, CalendarPlus2, Clock3, MessageCircleMore, RefreshCw, Rocket, Sparkles, Target, TrendingUp, UsersRound } from "lucide-react";
import { useBusinessContext } from "@/features/businesses/business-context";
import { listAppointments } from "@/features/appointments/appointment-repository";
import { listCustomers } from "@/features/customers/customer-repository";
import type { Appointment } from "@/types/appointments";
import type { Customer } from "@/types/customer";
import { EmptyState, Notice, Panel, Pill, Sk, StatTile, StudioHero, StudioPage, cx, studio } from "@/app/[lang]/dashboard/_studio";
import { useIntlLocale, useT } from "@/i18n/client";
import { tk, type TFunction } from "@/i18n/config";
import css from "./buyume.module.css";

const DAY = 86_400_000;

function dateValue(value: unknown) {
  if (typeof value === "string" || typeof value === "number") return new Date(value);
  if (value && typeof value === "object" && "toDate" in value && typeof (value as { toDate?: unknown }).toDate === "function") return (value as { toDate: () => Date }).toDate();
  return null;
}

function whatsapp(phone: string, name: string, t: TFunction) {
  const digits = phone.replace(/\D/g, "").replace(/^0/, "90");
  return `https://wa.me/${digits}?text=${encodeURIComponent(t("Merhaba {name}, sizi özledik! Size uygun yeni randevu saatlerimiz var.", { name }))}`;
}

const ACTIONS = [
  { title: tk("Boşlukları doldur"), text: tk("Yaklaşan boş saatleri sadık müşterilerinizle paylaşın."), href: "/dashboard/takvim", icon: CalendarPlus2 },
  { title: tk("İptali azalt"), text: tk("Randevu öncesi hatırlatma ve iptal süresini gözden geçirin."), href: "/dashboard/ayarlar", icon: Target },
  { title: tk("Hizmetleri güçlendir"), text: tk("Yoğun saatlerde en çok tercih edilen hizmetlerinizi öne çıkarın."), href: "/dashboard/hizmetler", icon: Sparkles },
] as const;

/** Büyüme merkezi. `embedded` iken Analiz & Büyüme sayfasının içinde (o sayfanın hero'su altında) çizilir. */
export function GrowthCenter({ embedded = false }: { embedded?: boolean }) {
  const t = useT();
  const intl = useIntlLocale();
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
      .catch((reason: unknown) => { if (active) setError(reason instanceof Error ? reason.message : tk("Büyüme verileri alınamadı.")); })
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
    return { recent, revenue, growth, returning: returningIds.size, inactive, peaks, cancelled, health, now };
  }, [appointments, customers, reportTime]);

  const calendarCta = <Link href="/dashboard/takvim" className={cx(studio.btn, embedded ? studio.btnPrimary : studio.btnBright)}><CalendarPlus2 size={17} aria-hidden /> {t("Takvimi optimize et")}</Link>;

  const body = loading ? (
    <div role="status" aria-live="polite" aria-label={t("Büyüme verileri yükleniyor")} className={css.stackY}>
      <div className={studio.stats}>{[1, 2, 3, 4].map((i) => <Sk key={i} h={112} r={18} />)}</div>
      <div className={css.grid}><Sk h={260} r={26} /><Sk h={260} r={26} /></div>
    </div>
  ) : (
    <div className={cx(css.stackY, studio.fadeIn)}>
      {embedded ? (
        <div className={css.intro}>
          <span className={css.introIcon}><Sparkles size={20} aria-hidden /></span>
          <div className={css.introText}>
            <b>{t("Veriyi aksiyona dönüştürün")}</b>
            <small>{t("Yoğun saatleri görün, geri kazanılabilecek müşterileri bulun ve haftayı daha dolu planlayın.")}</small>
          </div>
          {calendarCta}
        </div>
      ) : null}

      {error ? <Notice tone="bad" title={t("Veriler alınamadı")}>{t(error)}</Notice> : null}

      <div className={studio.stats}>
        <StatTile accent icon={TrendingUp} label={t("30 günlük gelir")} value={`${data.revenue.toLocaleString(intl)} ₺`} hint={t("{change} önceki döneme göre", { change: `${data.growth >= 0 ? "+" : ""}${t("%{percent}", { percent: data.growth })}` })} />
        <StatTile icon={Target} label={t("Tamamlama kalitesi")} value={t("%{percent}", { percent: data.health })} hint={t("{count} iptal veya gelmedi", { count: data.cancelled })} />
        <StatTile icon={UsersRound} label={t("Aktif müşteri")} value={String(data.returning)} hint={t("son 30 günde hizmet alan")} />
        <StatTile icon={RefreshCw} label={t("Geri kazanım fırsatı")} value={String(data.inactive.length)} hint={t("45+ gündür gelmeyen")} />
      </div>

      <div className={css.grid}>
        <Panel icon={MessageCircleMore} title={t("Sizi özleyen müşteriler")} description={t("Müşteri geri kazanımı · 45+ gündür gelmeyenler")}
          actions={data.inactive.length ? <Pill tone="accent">{t("{count} kişi", { count: data.inactive.length })}</Pill> : undefined}>
          {data.inactive.length ? (
            <ul className={css.people}>
              {data.inactive.map((customer) => {
                const last = dateValue(customer.lastVisitAt)?.getTime() ?? 0;
                const away = last ? Math.floor((data.now - last) / DAY) : 0;
                return (
                  <li key={customer.id} className={css.person}>
                    <span className={css.avatar} aria-hidden>{customer.fullName.charAt(0)}</span>
                    <div className={css.personText}>
                      <b>{customer.fullName}</b>
                      <small>{t("{count} randevu", { count: customer.totalAppointments })} · {customer.totalSpent.toLocaleString(intl)} ₺{away ? ` · ${t("{count} gün önce", { count: away })}` : ""}</small>
                    </div>
                    <a href={whatsapp(customer.phone, customer.fullName, t)} target="_blank" rel="noreferrer" className={cx(studio.btn, studio.btnSoft, studio.btnSm, css.waBtn)}>
                      <MessageCircleMore size={15} aria-hidden /><span>{t("Mesaj gönder")}</span>
                    </a>
                  </li>
                );
              })}
            </ul>
          ) : <EmptyState mood="happy" size={80} title={t("Herkes yakında")} description={t("Şimdilik geri kazanım bekleyen müşteri yok.")} />}
        </Panel>

        <Panel icon={Clock3} title={t("En yoğun saatler")} description={t("Talep radarı · son 30 gün")}>
          {data.peaks.length ? (
            <ol className={css.peaks} aria-label={t("En yoğun saat aralıkları")}>
              {data.peaks.map(([hour, count], index) => (
                <li key={hour} className={css.peak}>
                  <div className={css.peakTop}>
                    <b>{String(hour).padStart(2, "0")}:00 – {String(hour + 1).padStart(2, "0")}:00</b>
                    <span>{t("{count} randevu", { count })}</span>
                  </div>
                  <span className={css.peakTrack} aria-hidden><i style={{ width: `${Math.max(22, 100 - index * 24)}%` }} /></span>
                </li>
              ))}
            </ol>
          ) : <EmptyState mood="thinking" size={80} title={t("Radar ısınıyor")} description={t("Talep haritası için randevu verisi bekleniyor.")} />}
          <Link href="/dashboard/calisma-saatleri" className={cx(studio.btn, studio.btnSoft, studio.btnBlock, css.panelCta)}>{t("Çalışma saatlerini düzenle")} <ArrowRight size={15} aria-hidden /></Link>
        </Panel>
      </div>

      <Panel icon={Rocket} title={t("Bu haftanın akıllı aksiyonları")} description={t("Verilerinize göre en etkili sırayla")}>
        <div className={css.actions}>
          {ACTIONS.map((action, index) => {
            const Icon = action.icon;
            return (
              <Link key={action.title} href={action.href} className={css.action}>
                <span className={css.actionTop}>
                  <span className={css.actionIcon}><Icon size={19} aria-hidden /></span>
                  <span className={css.actionStep}>{t("{step}. adım", { step: index + 1 })}</span>
                </span>
                <b>{t(action.title)}</b>
                <small>{t(action.text)}</small>
                <span className={css.actionGo}>{t("Uygula")} <ArrowRight size={14} aria-hidden /></span>
              </Link>
            );
          })}
        </div>
      </Panel>
    </div>
  );

  if (embedded) return body;
  return (
    <StudioPage label={t("Büyüme merkezi")}>
      <StudioHero eyebrow={t("Akıllı büyüme motoru")} icon={Sparkles} title={t("Veriyi aksiyona dönüştür.")}
        description={t("Yoğun saatleri görün, geri kazanılabilecek müşterileri bulun ve önümüzdeki haftayı daha dolu planlayın.")}
        actions={calendarCta} mascot="happy" />
      {body}
    </StudioPage>
  );
}
