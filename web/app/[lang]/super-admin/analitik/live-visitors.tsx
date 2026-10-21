"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight, Building2, CalendarCheck, Clock3, Compass, File, FileText, Home, LifeBuoy, LogIn, MapPin, Monitor, MousePointer2, Smartphone, Store,
  Tablet, Tag, UserPlus, type LucideIcon,
} from "lucide-react";
import { subscribeLiveVisitors, type LiveTrailItem, type LiveVisitor } from "@/features/analytics/live-visitors-repository";
import { SourceIcon, sourceName } from "@/components/super-admin/source-icon";
import { cx } from "../_pages-ui";
import l from "./live.module.css";

// Canlı ziyaretçi kartları: Firestore'dan gerçek zamanlı; süreler saniye saniye işler.

const WINDOW_MS = 5 * 60_000;
const ACTIVE_MS = 80_000;

const PAGE: Record<string, { label: string; icon: LucideIcon }> = {
  home: { label: "Ana sayfa", icon: Home }, storefront: { label: "İşletme sayfası", icon: Store }, booking: { label: "Randevu ekranı", icon: CalendarCheck },
  business_signup: { label: "İşletme kaydı", icon: UserPlus }, business_landing: { label: "İşletmeler tanıtımı", icon: Building2 }, pricing: { label: "Fiyatlar", icon: Tag },
  explore: { label: "Keşfet", icon: Compass }, seo: { label: "Şehir / kategori", icon: MapPin }, legal: { label: "Yasal metin", icon: FileText },
  auth: { label: "Giriş / kayıt", icon: LogIn }, app: { label: "Mobil uygulama", icon: Smartphone }, help: { label: "Yardım", icon: LifeBuoy }, other: { label: "Diğer sayfa", icon: File },
};
const ACTION: Record<string, { label: string; goal?: boolean }> = {
  "booking:service": { label: "Hizmet seçiyor" }, "booking:staff": { label: "Uzman seçiyor" }, "booking:datetime": { label: "Tarih ve saat seçiyor" },
  "booking:info": { label: "Bilgilerini giriyor" }, "booking:verify": { label: "Telefonunu doğruluyor" }, "booking:summary": { label: "Randevuyu onaylamak üzere" },
  "booking:success": { label: "Randevu aldı 🎉", goal: true },
  "signup:0": { label: "Kategori seçiyor" }, "signup:1": { label: "İşletme bilgilerini giriyor" }, "signup:2": { label: "Çalışma şeklini seçiyor" }, "signup:3": { label: "Hesabını oluşturuyor" },
};
const DEVICE: Record<string, LucideIcon> = { mobile: Smartphone, tablet: Tablet, desktop: Monitor };

function placeName(path: string, pageType: string) {
  const slug = /^\/isletme\/([^/]+)/.exec(path)?.[1];
  const business = slug ? decodeURIComponent(slug).replaceAll("-", " ").replace(/\b\p{L}/gu, (char) => char.toLocaleUpperCase("tr-TR")) : null;
  if (pageType === "booking" && business) return `${business} › randevu ekranı`;
  if (pageType === "storefront" && business) return business;
  if (pageType === "seo") return decodeURIComponent(path).replace(/^\//, "").replaceAll("-", " ").replaceAll("/", " › ");
  return PAGE[pageType]?.label ?? path;
}

function clock(ms: number) {
  const seconds = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(seconds / 60);
  return minutes ? `${minutes} dk ${String(seconds % 60).padStart(2, "0")} sn` : `${seconds} sn`;
}

export function LiveVisitors() {
  const [rows, setRows] = useState<LiveVisitor[] | null>(null);
  const [error, setError] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const [epoch, setEpoch] = useState(0);

  // Pencere her dakika kayar (sorgu sabit zamanla kurulduğu için yeniden abone olunur).
  useEffect(() => {
    const stop = subscribeLiveVisitors(WINDOW_MS, (value) => { setRows(value); setError(false); }, () => setError(true));
    const renew = window.setTimeout(() => setEpoch((value) => value + 1), 60_000);
    return () => { stop(); window.clearTimeout(renew); };
  }, [epoch]);
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const visible = useMemo(() => (rows ?? []).filter((row) => now - row.lastSeenAt < WINDOW_MS), [rows, now]);
  const active = visible.filter((row) => now - row.lastSeenAt < ACTIVE_MS).length;
  const sections = useMemo(() => {
    const map = new Map<string, number>();
    visible.forEach((row) => { const key = row.lastPageType; map.set(key, (map.get(key) ?? 0) + 1); });
    return [...map.entries()].sort((a, b) => b[1] - a[1]);
  }, [visible]);

  return (
    <section className={l.wrap} aria-label="Canlı ziyaretçiler">
      <header className={l.head}>
        <span className={l.beacon} aria-hidden><i /></span>
        <div className={l.headText}>
          <b><span key={visible.length} className={l.bump}>{visible.length}</span> kişi şu an sitede</b>
          <small>{active} aktif · {visible.length - active} sekme arka planda · son 5 dakika · canlı</small>
        </div>
        <div className={l.sections}>
          {sections.map(([type, count]) => {
            const Icon = PAGE[type]?.icon ?? File;
            return <span key={type} className={l.section}><Icon size={13} aria-hidden /> {PAGE[type]?.label ?? type} <b>{count}</b></span>;
          })}
        </div>
      </header>
      {error ? <p className={l.note}>Canlı veri okunamadı (Firestore kuralı yayında değilse görünmez).</p> : rows === null ? <p className={l.note}>Bağlanıyor…</p> : visible.length === 0 ? (
        <div className={l.empty}><MousePointer2 size={18} aria-hidden /> Şu an sitede kimse yok. Biri girdiği anda burada belirecek.</div>
      ) : (
        <ul className={l.cards}>
          {visible.map((row) => <VisitorCard key={row.id} row={row} now={now} />)}
        </ul>
      )}
    </section>
  );
}

function VisitorCard({ row, now }: { row: LiveVisitor; now: number }) {
  const isActive = now - row.lastSeenAt < ACTIVE_MS;
  const page = PAGE[row.lastPageType] ?? PAGE.other!;
  const PageIcon = page.icon;
  const DeviceIcon = DEVICE[row.device] ?? Monitor;
  const action = row.lastAction && row.lastActionAt && row.lastActionAt >= (row.sessionStartAt ?? 0) ? ACTION[row.lastAction] : null;
  const onGoal = row.lastPageType === "booking" || row.lastPageType === "business_signup";
  const since = row.sessionStartAt ?? row.lastSeenAt;
  const trail = row.trail.slice(-7);
  return (
    <li className={cx(l.card, onGoal && l.cardGoal, !isActive && l.cardIdle)}>
      <div className={l.cardTop}>
        <SourceIcon kind={row.sourceKind} label={row.sourceLabel} size={36} />
        <div className={l.who}>
          <b>{sourceName(row.sourceKind, row.sourceLabel)}</b>
          <small><DeviceIcon size={12} aria-hidden /> {row.browser} · {row.os}{row.lang === "en" ? " · EN" : ""}</small>
        </div>
        <span className={cx(l.state, isActive ? l.stateOn : l.stateOff)}><i aria-hidden />{isActive ? "aktif" : "arka planda"}</span>
      </div>

      <div className={l.now}>
        <span className={l.nowIcon}><PageIcon size={18} aria-hidden /></span>
        <div className={l.nowText}>
          <small>Şu an</small>
          <b key={row.lastPath} className={l.swap}>{placeName(row.lastPath, row.lastPageType)}</b>
          {action ? <span key={row.lastAction} className={cx(l.action, action.goal && l.actionGoal)}><i aria-hidden />{action.label}</span> : null}
        </div>
      </div>

      {trail.length > 1 ? (
        <div className={l.trail} aria-label="Bu oturumdaki yol">
          {trail.map((item, index) => <TrailChip key={`${item.at}-${index}`} item={item} last={index === trail.length - 1} first={index === 0} />)}
        </div>
      ) : null}

      <footer className={l.meta}>
        <span><Clock3 size={12} aria-hidden /> sitede {clock(now - since)}</span>
        <span>{row.views} sayfa</span>
        <span>son hareket {clock(now - Math.max(row.lastSeenAt, row.lastActionAt ?? 0))} önce</span>
        {row.newVisitor ? <em className={l.new}>yeni</em> : <em className={l.back}>geri döndü</em>}
      </footer>
    </li>
  );
}

function TrailChip({ item, last, first }: { item: LiveTrailItem; last: boolean; first: boolean }) {
  if (item.t === "action") {
    const action = ACTION[item.a];
    return <>{first ? null : <ArrowRight size={11} className={l.arrow} aria-hidden />}<span className={cx(l.chip, l.chipAction, last && l.chipLast)}>{action?.label ?? item.a}</span></>;
  }
  const page = PAGE[item.pt] ?? PAGE.other!;
  const Icon = page.icon;
  return (
    <>
      {first ? null : <ArrowRight size={11} className={l.arrow} aria-hidden />}
      <span className={cx(l.chip, last && l.chipLast)} title={item.p}><Icon size={11} aria-hidden /> {placeName(item.p, item.pt)}</span>
    </>
  );
}
