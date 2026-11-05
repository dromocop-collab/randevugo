"use client";

import { useMemo, useState } from "react";
import {
  ArrowRight, Building2, CalendarCheck, Clock3, Compass, File, FileText, Home, LayoutDashboard, LifeBuoy, LogIn, MapPin, Megaphone, Monitor,
  MousePointer2, PartyPopper, Smartphone, Sparkles, Store, Tablet, Tag, UserPlus, Zap, type LucideIcon,
} from "lucide-react";
import type { LiveVisitor } from "@/features/analytics/live-visitors-repository";
import { useLiveVisitors } from "@/features/analytics/use-live-visitors";
import {
  LIVE_ACTIVE_MS, currentAction, matchesFilter, orderTrail, signupProgress, sortLive,
  type LiveFilter, type LiveTrailItem,
} from "@/features/analytics/live-visitors-logic";
import { SourceIcon, sourceName } from "@/components/super-admin/source-icon";
import { cx } from "../_pages-ui";
import l from "./live.module.css";

// Canlı ziyaretçi kartları: Firestore'dan gerçek zamanlı; süreler saniye saniye işler. Hesaplar live-visitors-logic.ts'de.

const PAGE: Record<string, { label: string; icon: LucideIcon }> = {
  home: { label: "Ana sayfa", icon: Home }, storefront: { label: "İşletme sayfası", icon: Store }, booking: { label: "Randevu ekranı", icon: CalendarCheck },
  business_signup: { label: "İşletme kaydı", icon: UserPlus }, business_onboarding: { label: "İşletme kurulumu", icon: Sparkles },
  business_panel: { label: "İşletme paneli", icon: LayoutDashboard }, business_landing: { label: "İşletmeler tanıtımı", icon: Building2 }, pricing: { label: "Fiyatlar", icon: Tag },
  explore: { label: "Keşfet", icon: Compass }, seo: { label: "Şehir / kategori", icon: MapPin }, legal: { label: "Yasal metin", icon: FileText },
  auth: { label: "Giriş / kayıt", icon: LogIn }, app: { label: "Mobil uygulama", icon: Smartphone }, help: { label: "Yardım", icon: LifeBuoy }, other: { label: "Diğer sayfa", icon: File },
};
const ACTION: Record<string, { label: string; goal?: boolean; warn?: boolean }> = {
  "booking:service": { label: "Hizmet seçiyor" }, "booking:staff": { label: "Uzman seçiyor" }, "booking:datetime": { label: "Tarih ve saat seçiyor" },
  "booking:info": { label: "Bilgilerini giriyor" }, "booking:verify": { label: "Telefonunu doğruluyor" }, "booking:summary": { label: "Randevuyu onaylamak üzere" },
  "booking:success": { label: "Randevu aldı 🎉", goal: true },
  "signup:0": { label: "Kategori seçiyor" }, "signup:1": { label: "İşletme bilgilerini giriyor" }, "signup:2": { label: "Çalışma şeklini seçiyor" }, "signup:3": { label: "Hesabını oluşturuyor" },
  "signup:account": { label: "Hesap açtı 🎉", goal: true }, "signup:error": { label: "Hesap formunda hata aldı", warn: true }, "signup:verified": { label: "E-postasını doğruladı", goal: true },
  "onboarding:0": { label: "Kuruluma geçti" }, "onboarding:1": { label: "Kurulum: konum ve iletişim" }, "onboarding:2": { label: "Kurulum: hizmet ve saatler" },
  "onboarding:3": { label: "Kurulumun son adımında" },
};
const PROGRESS_LABEL: Record<string, string> = {
  "signup:0": "Kategori", "signup:1": "İşletme bilgisi", "signup:2": "Çalışma şekli", "signup:3": "Hesap formu", "signup:account": "Hesap açıldı",
  "onboarding:1": "Konum ve iletişim", "onboarding:2": "Hizmet ve saatler", "onboarding:3": "Kurulumun son adımı",
};
const DEVICE: Record<string, LucideIcon> = { mobile: Smartphone, tablet: Tablet, desktop: Monitor };
const FILTERS: Array<{ key: LiveFilter; label: string }> = [
  { key: "all", label: "Tümü" }, { key: "active", label: "Aktif" }, { key: "signup", label: "Kayıtta" }, { key: "booking", label: "Randevuda" }, { key: "ads", label: "Reklamdan" },
];

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
  const { rows, visible, summary, now, error } = useLiveVisitors();
  const [filter, setFilter] = useState<LiveFilter>("all");
  const shown = useMemo(() => sortLive(visible.filter((row) => matchesFilter(row, filter, now)), now), [visible, filter, now]);
  const sections = useMemo(() => {
    const map = new Map<string, number>();
    visible.forEach((row) => { const key = row.lastPageType; map.set(key, (map.get(key) ?? 0) + 1); });
    return [...map.entries()].sort((a, b) => b[1] - a[1]);
  }, [visible]);
  const counts: Record<LiveFilter, number> = { all: summary.total, active: summary.active, signup: summary.signingUp, booking: summary.booking, ads: summary.ads };

  return (
    <section className={l.wrap} aria-label="Canlı ziyaretçiler">
      <header className={l.head}>
        <span className={l.beacon} aria-hidden><i /></span>
        <div className={l.headText}>
          <b><span key={summary.total} className={l.bump}>{summary.total}</span> kişi şu an sitede</b>
          <small>{summary.active} aktif · {summary.idle} sekme arka planda · son 5 dakika · canlı</small>
        </div>
        <div className={l.sections}>
          {sections.map(([type, count]) => {
            const Icon = PAGE[type]?.icon ?? File;
            return <span key={type} className={l.section}><Icon size={13} aria-hidden /> {PAGE[type]?.label ?? type} <b>{count}</b></span>;
          })}
        </div>
      </header>

      {rows !== null && !error ? (
        <div className={l.stats}>
          <Stat icon={Zap} label="Aktif" value={summary.active} hint="son 80 sn içinde hareket" />
          <Stat icon={UserPlus} label="Kayıtta" value={summary.signingUp} hint="kayıt formu veya kurulum" tone="amber" />
          <Stat icon={CalendarCheck} label="Randevuda" value={summary.booking} hint="randevu ekranında" tone="violet" />
          <Stat icon={Megaphone} label="Reklamdan" value={summary.ads} hint={summary.total ? `%${Math.round((summary.ads / summary.total) * 100)} ziyaretçi` : "—"} tone="blue" />
          <Stat icon={Smartphone} label="Telefondan" value={summary.mobile} hint={summary.total ? `%${Math.round((summary.mobile / summary.total) * 100)} ziyaretçi` : "—"} />
          <Stat icon={PartyPopper} label="Hedefe ulaştı" value={summary.goals} hint="hesap açtı / randevu aldı" tone="green" />
        </div>
      ) : null}

      {rows !== null && !error && summary.total > 0 ? (
        <div className={l.filters} role="group" aria-label="Ziyaretçileri süz">
          {FILTERS.map((item) => (
            <button key={item.key} type="button" className={cx(l.filter, filter === item.key && l.filterOn)} aria-pressed={filter === item.key} onClick={() => setFilter(item.key)}>
              {item.label} <b>{counts[item.key]}</b>
            </button>
          ))}
        </div>
      ) : null}

      {error ? <p className={l.note}>Canlı veri okunamadı (Firestore kuralı yayında değilse görünmez).</p> : rows === null ? <p className={l.note}>Bağlanıyor…</p> : visible.length === 0 ? (
        <div className={l.empty}><MousePointer2 size={18} aria-hidden /> Şu an sitede kimse yok. Biri girdiği anda burada belirecek.</div>
      ) : shown.length === 0 ? (
        <div className={l.empty}><MousePointer2 size={18} aria-hidden /> Bu süzgece uyan ziyaretçi yok. <button type="button" className={l.reset} onClick={() => setFilter("all")}>Tümünü göster</button></div>
      ) : (
        <ul className={l.cards}>
          {shown.map((row) => <VisitorCard key={row.id} row={row} now={now} />)}
        </ul>
      )}
    </section>
  );
}

function Stat({ icon: Icon, label, value, hint, tone }: { icon: LucideIcon; label: string; value: number; hint: string; tone?: "amber" | "violet" | "blue" | "green" }) {
  return (
    <div className={cx(l.stat, tone && l[`tone_${tone}`])}>
      <span className={l.statIcon}><Icon size={15} aria-hidden /></span>
      <span className={l.statText}><small>{label}</small><b key={value} className={l.bump}>{value}</b><em>{hint}</em></span>
    </div>
  );
}

function VisitorCard({ row, now }: { row: LiveVisitor; now: number }) {
  const isActive = now - row.lastSeenAt < LIVE_ACTIVE_MS;
  const page = PAGE[row.lastPageType] ?? PAGE.other!;
  const PageIcon = page.icon;
  const DeviceIcon = DEVICE[row.device] ?? Monitor;
  const ordered = orderTrail(row.trail);
  const actionKey = currentAction(row);
  const action = actionKey ? ACTION[actionKey] ?? { label: actionKey } : null;
  const progress = signupProgress(ordered);
  const reachedGoal = ordered.some((item) => item.t === "action" && ACTION[item.a]?.goal);
  const onGoal = reachedGoal || ["booking", "business_signup", "business_onboarding"].includes(row.lastPageType);
  const since = row.sessionStartAt ?? row.lastSeenAt;
  const trail = ordered.slice(-7);
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
          {action ? <span key={actionKey} className={cx(l.action, action.goal && l.actionGoal, action.warn && l.actionWarn)}><i aria-hidden />{action.label}</span> : null}
        </div>
      </div>

      {progress ? (
        <div className={l.progress} aria-label={`Kayıt ilerlemesi: ${progress.total} adımın ${progress.index + 1}. adımı`}>
          <span className={l.progressHead}><small>Kayıt ilerlemesi</small><b>{progress.index + 1}/{progress.total} · {PROGRESS_LABEL[progress.action] ?? progress.action}</b></span>
          <span className={l.progressBar}>
            {Array.from({ length: progress.total }, (_, index) => <i key={index} className={cx(index <= progress.index && l.progressOn, index === 4 && l.progressMark)} />)}
          </span>
        </div>
      ) : null}

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
    return <>{first ? null : <ArrowRight size={11} className={l.arrow} aria-hidden />}<span className={cx(l.chip, l.chipAction, action?.goal && l.chipGoal, last && l.chipLast)}>{action?.label ?? item.a}</span></>;
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

/** Sayfa başlığındaki "şu an sitede" sayısı: kartlarla aynı canlı veri (sayfa açılışında donmaz). */
export function LiveCount({ className }: { className?: string }) {
  const { summary, loading, error } = useLiveVisitors(5000);
  if (error) return <>—</>;
  return <span className={className}><i aria-hidden />{loading ? "…" : summary.total.toLocaleString("tr-TR")}</span>;
}
