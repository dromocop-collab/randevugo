"use client";

import { useEffect, useState } from "react";
import Link from "@/i18n/link";
import { doc, getDoc } from "firebase/firestore";
import { toast } from "sonner";
import { BellOff, BellRing, CalendarSearch, Clock3, LoaderCircle, Sparkles, UserRound } from "lucide-react";
import { RoviMascot } from "@/components/brand/rovi-mascot";
import { getDb } from "@/lib/firebase/firestore";
import { cancelAvailabilityAlert, listMyAvailabilityAlerts, type AvailabilityAlert } from "./availability-repository";
import { useIntlLocale, useT } from "@/i18n/client";
import styles from "./availability-alerts-panel.module.css";

type Row = AvailabilityAlert & { businessName: string; serviceName: string; staffName: string; slug: string };

export function AvailabilityAlertsPanel({ uid }: { uid: string }) {
  const t = useT();
  const intlLocale = useIntlLocale();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState(false);
  useEffect(() => {
    let active = true;
    listMyAvailabilityAlerts(uid).then(async (alerts) => {
      const current = alerts.filter((item) => ["active", "matched"].includes(item.status) &&
        (!item.expiresAt || item.expiresAt.toMillis() > Date.now())).slice(0, 30);
      const names = new Map<string, Promise<{ businessName: string; serviceName: string; staffName: string; slug: string }>>();
      const enriched = await Promise.all(current.map(async (item) => {
        const key = `${item.businessId}/${item.serviceId}/${item.staffId ?? ""}`;
        if (!names.has(key)) names.set(key, (async () => {
          const [business, service, staff] = await Promise.all([
            getDoc(doc(getDb(), "businesses", item.businessId)),
            getDoc(doc(getDb(), "businesses", item.businessId, "services", item.serviceId)),
            item.staffId ? getDoc(doc(getDb(), "businesses", item.businessId, "staff", item.staffId)) : Promise.resolve(null),
          ]);
          return { businessName: String(business.data()?.name ?? ""),
            serviceName: String(service.data()?.name ?? ""),
            staffName: String(staff?.data()?.fullName ?? ""), slug: String(business.data()?.slug ?? "") };
        })());
        return { ...item, ...await names.get(key)! };
      }));
      if (active) setRows(enriched);
    }).catch(() => { if (active) setError(true); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [uid]);

  async function cancel(id: string) {
    if (busy) return;
    setBusy(id);
    try {
      await cancelAvailabilityAlert(id);
      setRows((current) => current.filter((item) => item.id !== id));
      toast.success(t("Müsaitlik bildirimi kapatıldı."));
    } catch { toast.error(t("Bildirim kapatılamadı. Tekrar deneyin.")); }
    finally { setBusy(null); }
  }

  return <section aria-label={t("Müsaitlik bildirimleri")} className={styles.root}>
    <div className={styles.head}><div><span>{t("Müsaitlik bildirimleri")}</span><h2>{t("Haber beklediğin saatler.")}</h2></div>
      {!loading && !error && rows.length > 0 && <em className={styles.count}>{t("{count} açık", { count: rows.length })}</em>}</div>
    {loading ? <div className={styles.skeleton} aria-label={t("Bildirimler yükleniyor")}><i /><i /></div>
      : error ? <div className={styles.error} role="alert"><BellOff size={24} /><b>{t("Bağlantı kurulamadı.")}</b><p>{t("Sayfayı yenileyip tekrar deneyin.")}</p></div>
        : rows.length === 0 ? <div className={styles.empty}><RoviMascot size={100} mood="thinking" alt="" />
          <span className={styles.tag}><Sparkles size={12} /> {t("AKILLI TAKİP")}</span>
          <h3>{t("Açık müsaitlik bildirimin yok.")}</h3>
          <p>{t("İşletme randevu sayfasında dolu bir saat için “Haber ver” dediğinde, yer açıldığı an sana bildiririz.")}</p>
          <Link href="/kesfet" className={styles.primary}>{t("İşletme keşfet")}</Link></div>
          : <div className={styles.list}>{rows.map((row, index) => <article key={row.id} className={styles.card} style={{ animationDelay: `${Math.min(index, 8) * 40}ms` }}>
            <div className={styles.top}>
              <span className={styles.date} aria-hidden="true"><b>{dayOf(row.dateKey, intlLocale)}</b><small>{monthOf(row.dateKey, intlLocale)}</small></span>
              <div className={styles.main}>
                <span className={`${styles.status} ${row.status === "matched" ? styles.matched : ""}`}>
                  {row.status === "matched" ? <><BellRing size={12} /> {t("Yer açıldı")}</> : <><i /> {t("Takipte")}</>}</span>
                <strong>{row.businessName || t("İşletme")}</strong>
                <p>{row.serviceName || t("Hizmet")}</p>
              </div>
            </div>
            <div className={styles.meta}>
              <span><CalendarSearch size={14} /> {weekdayOf(row.dateKey, intlLocale)}</span>
              <span><Clock3 size={14} /> {minuteLabel(row.startMinute)}–{minuteLabel(row.endMinute)}</span>
              <span><UserRound size={14} /> {row.staffName || t("Uygun personel")}</span>
            </div>
            <small className={styles.note}>{row.status === "matched" ? t("Uygunluk bildirildi; saat rezerve edilmedi. Hemen bakmanı öneririz.") : t("Uygunluk bekleniyor. Yer açılınca haber vereceğiz.")}</small>
            <div className={styles.actions}>{row.slug && <Link href={`/isletme/${row.slug}/randevu?service=${row.serviceId}${row.staffId ? `&staff=${row.staffId}` : ""}&date=${row.dateKey}`}
              className={styles.primary}>{t("Saatleri gör")}</Link>}
              <button type="button" onClick={() => void cancel(row.id)} disabled={busy !== null} className={styles.ghost}>
                {busy === row.id ? <><LoaderCircle className="animate-spin" size={15} /> {t("Kapatılıyor…")}</> : t("Bildirimi kapat")}</button></div>
          </article>)}</div>}
  </section>;
}

function minuteLabel(value: number) {
  return `${String(Math.floor(value / 60)).padStart(2, "0")}:${String(value % 60).padStart(2, "0")}`;
}
function parseDateKey(key: string) {
  const [year, month, day] = key.split("-").map(Number);
  const date = new Date(year, (month || 1) - 1, day || 1);
  return Number.isNaN(date.getTime()) ? null : date;
}
function dayOf(key: string, locale = "tr-TR") { return parseDateKey(key)?.toLocaleDateString(locale, { day: "2-digit" }) ?? "–"; }
function monthOf(key: string, locale = "tr-TR") { return parseDateKey(key)?.toLocaleDateString(locale, { month: "short" }).toLocaleUpperCase(locale) ?? ""; }
function weekdayOf(key: string, locale = "tr-TR") { return parseDateKey(key)?.toLocaleDateString(locale, { weekday: "long", day: "numeric", month: "long" }) ?? key; }
