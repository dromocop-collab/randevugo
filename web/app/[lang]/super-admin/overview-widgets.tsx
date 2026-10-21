"use client";

// Platform özeti › yeni kanallar: WhatsApp gelen kutusu (canlı), reklamlar, bildirim kanalı, müşteri memnuniyeti.
// Her kart kendi verisini bağımsız yükler; biri hata verirse diğerleri ve sayfanın geri kalanı etkilenmez.

import Link from "@/i18n/link";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { collectionGroup, getDocs, limit, query, type Timestamp } from "firebase/firestore";
import {
  ArrowRight, Bot, CheckCheck, Inbox, Megaphone, MessageCircleHeart, MessagesSquare, MousePointerClick, PlugZap, Send, Smile,
  Star, UserPlus, Wallet, type LucideIcon,
} from "lucide-react";
import { getDb } from "@/lib/firebase/firestore";
import { formatInboxPhone, inboxWindow, subscribeConversations, type InboxConversation } from "@/features/whatsapp/whatsapp-inbox-repository";
import { getMetaAdsOverview, type MetaAdsOverview } from "@/features/ads/meta-ads-repository";
import { getWhatsAppOperations, type WhatsAppOperations } from "@/features/whatsapp/whatsapp-admin-repository";
import { Badge, Skeleton, toneClassName, type AdminTone } from "@/components/super-admin/ui";
import s from "./overview.module.css";

const fmt = (value: number) => value.toLocaleString("tr-TR");
const tl = (value: number) => `${value.toLocaleString("tr-TR", { maximumFractionDigits: 0 })} ₺`;

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    queueMicrotask(() => setReduced(media.matches));
    const onChange = () => setReduced(media.matches);
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, []);
  return reduced;
}

/** Sayıyı 0'dan hedefe yumuşakça sayar (hareket azaltma açıksa doğrudan gösterir). */
export function CountUp({ value, format = fmt, duration = 900 }: { value: number; format?: (value: number) => string; duration?: number }) {
  const reduced = usePrefersReducedMotion();
  const [shown, setShown] = useState(0);
  const from = useRef(0);
  useEffect(() => {
    if (reduced || !Number.isFinite(value)) { queueMicrotask(() => setShown(value)); from.current = value; return; }
    const start = performance.now(); const origin = from.current;
    let frame = 0;
    const tick = (now: number) => {
      const progress = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      setShown(origin + (value - origin) * eased);
      if (progress < 1) frame = requestAnimationFrame(tick);
      else from.current = value;
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value, duration, reduced]);
  return <span className={s.num}>{format(Number.isInteger(value) ? Math.round(shown) : Math.round(shown * 10) / 10)}</span>;
}

function Widget({ title, subtitle, icon: Icon, tone, href, cta, live, index, children }: {
  title: string; subtitle: string; icon: LucideIcon; tone: AdminTone; href: string; cta: string; live?: boolean; index: number; children: ReactNode;
}) {
  return (
    <article className={s.widget} style={{ animationDelay: `${index * 70}ms` }}>
      <header className={s.widgetHead}>
        <span className={`${s.widgetIcon} ${toneClassName(tone)}`}><Icon size={18} aria-hidden /></span>
        <span className={s.widgetTitle}>
          <b>{title}{live ? <span className={s.live} title="Canlı"><i aria-hidden />canlı</span> : null}</b>
          <small>{subtitle}</small>
        </span>
      </header>
      <div className={s.widgetBody}>{children}</div>
      <Link href={href} className={s.widgetCta}>{cta}<ArrowRight size={14} aria-hidden /></Link>
    </article>
  );
}

function Metric({ label, value, hint, tone }: { label: string; value: ReactNode; hint?: ReactNode; tone?: AdminTone }) {
  return (
    <div className={s.metric}>
      <small>{label}</small>
      <b className={tone ? toneClassName(tone) : undefined} data-tone={tone ? "1" : undefined}>{value}</b>
      {hint ? <span className={s.metricHint}>{hint}</span> : null}
    </div>
  );
}

function WidgetSkeleton() {
  return <div className={s.skeleton}><Skeleton height={44} radius={12} /><Skeleton height={14} width="80%" /><Skeleton height={14} width="60%" /></div>;
}

/* ── WhatsApp gelen kutusu (canlı) ───────────────────────────────────────────── */

function InboxWidget({ index }: { index: number }) {
  const [rows, setRows] = useState<InboxConversation[] | null>(null);
  const [error, setError] = useState(false);
  const [now, setNow] = useState(0);
  useEffect(() => {
    queueMicrotask(() => setNow(Date.now()));
    const timer = window.setInterval(() => setNow(Date.now()), 60_000);
    const stop = subscribeConversations((value) => { setRows(value); setError(false); }, () => setError(true));
    return () => { window.clearInterval(timer); stop(); };
  }, []);
  const summary = useMemo(() => {
    const list = rows ?? [];
    const open = list.filter((row) => row.status === "open");
    return {
      unread: open.reduce((sum, row) => sum + row.unreadCount, 0),
      open: open.length,
      waiting: open.filter((row) => row.lastDirection === "in" && inboxWindow(row.lastInboundAt, now).open).length,
      recent: list.slice(0, 3),
    };
  }, [rows, now]);

  return (
    <Widget index={index} title="WhatsApp gelen kutusu" subtitle="Bildirim numarasına yazanlar" icon={Inbox} tone={summary.unread ? "green" : "neutral"}
      href="/super-admin/whatsapp-gelen" cta={summary.unread ? "Mesajları oku" : "Gelen kutusunu aç"} live>
      {error ? <p className={s.note}>Gelen kutusu okunamadı.</p> : rows === null ? <WidgetSkeleton /> : (
        <>
          <div className={s.metrics}>
            <Metric label="Okunmamış" value={<CountUp value={summary.unread} />} tone={summary.unread ? "green" : undefined} />
            <Metric label="Cevap bekliyor" value={<CountUp value={summary.waiting} />} hint="24 sa penceresi açık" />
            <Metric label="Açık konuşma" value={<CountUp value={summary.open} />} />
          </div>
          {summary.recent.length ? (
            <ul className={s.feed}>
              {summary.recent.map((row) => (
                <li key={row.id}>
                  <Link href={`/super-admin/whatsapp-gelen?c=${row.id}`} className={s.feedRow}>
                    <span className={s.feedAvatar} aria-hidden>{(row.profileName || "?").slice(0, 1).toLocaleUpperCase("tr-TR")}</span>
                    <span className={s.feedText}>
                      <b>{row.profileName || row.match?.customerName || formatInboxPhone(row.phone)}</b>
                      <small>{row.lastDirection === "out" ? <CheckCheck size={12} aria-hidden /> : null}{row.lastMessageText || "—"}</small>
                    </span>
                    {row.unreadCount ? <span className={s.dotBadge}>{row.unreadCount}</span> : null}
                  </Link>
                </li>
              ))}
            </ul>
          ) : <p className={s.note}>Henüz mesaj yok. Numaraya biri yazınca burada anında görünür.</p>}
        </>
      )}
    </Widget>
  );
}

/* ── Reklamlar (son 7 gün) ───────────────────────────────────────────────────── */

function Sparkline({ values }: { values: number[] }) {
  if (values.length < 2) return null;
  const max = Math.max(...values, 1);
  const width = 220; const height = 44;
  const points = values.map((value, i) => `${(i / (values.length - 1)) * width},${height - 4 - (value / max) * (height - 8)}`).join(" ");
  return (
    <svg className={s.spark} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" role="img" aria-label="Günlük harcama eğrisi">
      <polyline points={`0,${height} ${points} ${width},${height}`} className={s.sparkFill} />
      <polyline points={points} className={s.sparkLine} pathLength={1} />
    </svg>
  );
}

function AdsWidget({ index, refreshKey }: { index: number; refreshKey: number }) {
  const [data, setData] = useState<MetaAdsOverview | null>(null);
  const [error, setError] = useState(false);
  useEffect(() => {
    let alive = true;
    getMetaAdsOverview(7).then((value) => { if (alive) { setData(value); setError(false); } }).catch(() => { if (alive) setError(true); });
    return () => { alive = false; };
  }, [refreshKey]);
  const totals = data?.totals ?? null;
  const activeCampaigns = data?.campaigns.filter((row) => row.effectiveStatus === "ACTIVE").length ?? 0;
  const signups = data?.signups.channels.meta_ads ?? 0;

  return (
    <Widget index={index} title="Reklamlar" subtitle="Meta · son 7 gün" icon={Megaphone} tone="violet" href="/super-admin/reklamlar"
      cta={data && !data.connection.connected ? "Meta'yı bağla" : "Reklam paneli"}>
      {error ? <p className={s.note}>Reklam verisi alınamadı.</p> : !data ? <WidgetSkeleton /> : !data.connection.connected ? (
        <div className={s.connect}>
          <PlugZap size={20} aria-hidden />
          <p>Harcama ve reklamdan gelen kayıtları burada görmek için Meta reklam hesabını bağlayın.</p>
          <span className={s.connectStat}><UserPlus size={14} aria-hidden /> Takipli kayıt (7 gün): <b>{fmt(data.signups.total)}</b></span>
        </div>
      ) : (
        <>
          <div className={s.metrics}>
            <Metric label="Harcama" value={<CountUp value={Math.round(totals?.spend ?? 0)} format={tl} />} hint={`${fmt(activeCampaigns)} kampanya yayında`} />
            <Metric label="Tıklama" value={<CountUp value={totals?.linkClicks ?? 0} />} hint={totals?.cpc != null ? `tıklama başı ${totals.cpc.toLocaleString("tr-TR")} ₺` : undefined} />
            <Metric label="Reklamdan kayıt" value={<CountUp value={signups} />} tone={signups ? "green" : undefined}
              hint={totals?.costPerSignup != null ? `kayıt başı ${tl(totals.costPerSignup)}` : "henüz kayıt yok"} />
          </div>
          <Sparkline values={data.daily.map((row) => row.spend)} />
          <div className={s.chips}>
            <span><Wallet size={12} aria-hidden /> tıklama oranı %{totals?.ctr ?? 0}</span>
            <span><MousePointerClick size={12} aria-hidden /> {fmt(totals?.impressions ?? 0)} gösterim</span>
          </div>
        </>
      )}
    </Widget>
  );
}

/* ── Bildirim kanalı (WhatsApp + SMS'e düşen) ─────────────────────────────────── */

function ChannelWidget({ index, refreshKey }: { index: number; refreshKey: number }) {
  const [data, setData] = useState<WhatsAppOperations | null>(null);
  const [error, setError] = useState(false);
  useEffect(() => {
    let alive = true;
    getWhatsAppOperations().then((value) => { if (alive) { setData(value); setError(false); } }).catch(() => { if (alive) setError(true); });
    return () => { alive = false; };
  }, [refreshKey]);
  const stats = data?.stats;
  const reached = (stats?.byStatus.delivered ?? 0) + (stats?.byStatus.read ?? 0);
  const quality = data?.phone?.quality_rating;
  const qualityView: Record<string, { label: string; tone: AdminTone }> = {
    GREEN: { label: "Kalite yüksek", tone: "green" }, YELLOW: { label: "Kalite orta", tone: "amber" }, RED: { label: "Kalite düşük", tone: "red" },
  };

  return (
    <Widget index={index} title="Randevu bildirimleri" subtitle="WhatsApp · son 30 gün" icon={Send} tone="green" href="/super-admin/whatsapp" cta="Kanal ayrıntıları">
      {error ? <p className={s.note}>Kanal bilgisi alınamadı.</p> : !data ? <WidgetSkeleton /> : (
        <>
          <div className={s.statusLine}>
            {data.settings.enabled ? <Badge tone="green" size="sm" dot>Kanal açık</Badge> : <Badge tone="amber" size="sm" dot>Kanal kapalı · hepsi SMS</Badge>}
            {quality && qualityView[quality] ? <Badge tone={qualityView[quality].tone} size="sm">{qualityView[quality].label}</Badge> : null}
          </div>
          <div className={s.metrics}>
            <Metric label="Gönderilen" value={<CountUp value={stats?.total ?? 0} />} />
            <Metric label="İletildi" value={stats?.deliveryRate == null ? "—" : <><CountUp value={stats.deliveryRate} />%</>} hint={`${fmt(reached)} mesaj`} tone={stats?.deliveryRate != null && stats.deliveryRate >= 90 ? "green" : undefined} />
            <Metric label="SMS'e düşen" value={<CountUp value={stats?.byStatus.failed ?? 0} />} hint="WhatsApp'ı olmayan" />
          </div>
          <Bar label="Okunma oranı" value={stats?.readRate ?? 0} />
        </>
      )}
    </Widget>
  );
}

function Bar({ label, value }: { label: string; value: number }) {
  return (
    <div className={s.bar}>
      <span><small>{label}</small><b>%{Math.round(value)}</b></span>
      <i><i style={{ width: `${Math.max(0, Math.min(100, value))}%` }} /></i>
    </div>
  );
}

/* ── Müşteri memnuniyeti (işlem sonrası WhatsApp anketi) ──────────────────────── */

type FeedbackSummary = { total: number; average: number | null; counts: Record<5 | 4 | 2, number>; last7: number };

function SatisfactionWidget({ index, refreshKey }: { index: number; refreshKey: number }) {
  const [data, setData] = useState<FeedbackSummary | null>(null);
  const [error, setError] = useState(false);
  useEffect(() => {
    let alive = true;
    getDocs(query(collectionGroup(getDb(), "feedback"), limit(1000))).then((snapshot) => {
      const counts: FeedbackSummary["counts"] = { 5: 0, 4: 0, 2: 0 };
      let sum = 0; let last7 = 0; const since = Date.now() - 7 * 86_400_000;
      snapshot.docs.forEach((item) => {
        const row = item.data();
        const rating = Number(row.rating);
        if (rating === 5 || rating === 4 || rating === 2) counts[rating] += 1;
        if (Number.isFinite(rating)) sum += rating;
        const created = (row.createdAt as Timestamp | undefined)?.toMillis?.() ?? 0;
        if (created >= since) last7 += 1;
      });
      if (alive) { setData({ total: snapshot.size, average: snapshot.size ? sum / snapshot.size : null, counts, last7 }); setError(false); }
    }).catch(() => { if (alive) setError(true); });
    return () => { alive = false; };
  }, [refreshKey]);

  const rows: Array<{ key: 5 | 4 | 2; label: string; icon: LucideIcon; tone: AdminTone }> = [
    { key: 5, label: "Harikaydı", icon: Star, tone: "green" },
    { key: 4, label: "İyiydi", icon: Smile, tone: "blue" },
    { key: 2, label: "Geliştirilebilir", icon: MessageCircleHeart, tone: "amber" },
  ];
  return (
    <Widget index={index} title="Müşteri memnuniyeti" subtitle="İşlem sonrası WhatsApp anketi" icon={MessageCircleHeart} tone="amber" href="/super-admin/whatsapp" cta="Anket ayarları">
      {error ? <p className={s.note}>Anket sonuçları henüz okunamıyor; Firestore kuralları güncellenince burada görünecek.</p> : !data ? <WidgetSkeleton /> : data.total === 0 ? (
        <p className={s.note}>Henüz anket cevabı yok. Randevu “tamamlandı” yapılınca müşteriye 2 saat sonra tek soruluk anket gider.</p>
      ) : (
        <>
          <div className={s.metrics}>
            <Metric label="Ortalama" value={<><CountUp value={Math.round((data.average ?? 0) * 10) / 10} format={(v) => v.toLocaleString("tr-TR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} /> / 5</>} tone="green" />
            <Metric label="Cevap" value={<CountUp value={data.total} />} hint={`${fmt(data.last7)} son 7 gün`} />
          </div>
          <div className={s.ratings}>
            {rows.map((row) => {
              const share = data.total ? (data.counts[row.key] / data.total) * 100 : 0;
              return (
                <div key={row.key} className={s.rating}>
                  <span className={`${s.ratingIcon} ${toneClassName(row.tone)}`}><row.icon size={13} aria-hidden /></span>
                  <small>{row.label}</small>
                  <i className={s.ratingTrack}><i className={toneClassName(row.tone)} style={{ width: `${share}%` }} /></i>
                  <b>{fmt(data.counts[row.key])}</b>
                </div>
              );
            })}
          </div>
        </>
      )}
    </Widget>
  );
}

export function ChannelsSection({ refreshKey }: { refreshKey: number }) {
  return (
    <section className={s.section} aria-labelledby="channels-title">
      <div className={s.sectionHead}>
        <h2 id="channels-title"><MessagesSquare size={16} aria-hidden /> Kanallar ve büyüme</h2>
        <p>WhatsApp mesajları, bildirim teslimi, reklam performansı ve müşteri memnuniyeti tek bakışta.</p>
      </div>
      <div className={s.grid}>
        <InboxWidget index={0} />
        <AdsWidget index={1} refreshKey={refreshKey} />
        <ChannelWidget index={2} refreshKey={refreshKey} />
        <SatisfactionWidget index={3} refreshKey={refreshKey} />
      </div>
      <p className={s.footnote}><Bot size={12} aria-hidden /> Gelen kutusu canlı güncellenir; diğer kartlar “Yenile” ile tazelenir.</p>
    </section>
  );
}
