"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { FirebaseError } from "firebase/app";
import { toast } from "sonner";
import {
  BadgeTurkishLira, CircleAlert, Clapperboard, Eye, KeyRound, Link2, Megaphone, MousePointerClick, Pause, Pencil, Play, PlugZap, RefreshCw,
  Store, TrendingUp, TriangleAlert, Unplug, UserPlus, Wallet, XCircle,
} from "lucide-react";
import {
  disconnectMetaAds, getMetaAdsOverview, saveMetaAdsSettings, updateMetaAdsEntity,
  type MetaAdsOverview, type MetaLevel, type MetaStats, type SignupChannel,
} from "@/features/ads/meta-ads-repository";
import {
  AdminPage, BarRow, Btn, Card, ConfirmSheet, CopyButton, DetailList, EmptyState, HeroStat, PageHeader, Pill, ResponsiveTable, Segmented,
  Sheet, SkeletonList, StatCard, StatGrid, cx, relativeTime, ui, useNow, type Tone,
} from "../_pages-ui";
import s from "./reklamlar.module.css";

const DEFAULT_AD_ACCOUNT = "881998108237172";
const SITE = "https://seninrandevun.com";

const STATUS: Record<string, { label: string; tone: Tone }> = {
  ACTIVE: { label: "Yayında", tone: "green" },
  PAUSED: { label: "Durduruldu", tone: "neutral" },
  CAMPAIGN_PAUSED: { label: "Kampanya durdu", tone: "neutral" },
  ADSET_PAUSED: { label: "Reklam seti durdu", tone: "neutral" },
  IN_PROCESS: { label: "İşleniyor", tone: "amber" },
  PENDING_REVIEW: { label: "İncelemede", tone: "amber" },
  PREAPPROVED: { label: "Ön onaylı", tone: "blue" },
  DISAPPROVED: { label: "Reddedildi", tone: "red" },
  WITH_ISSUES: { label: "Sorunlu", tone: "red" },
  PENDING_BILLING_INFO: { label: "Ödeme bilgisi bekliyor", tone: "red" },
  ARCHIVED: { label: "Arşivde", tone: "neutral" },
  DELETED: { label: "Silindi", tone: "neutral" },
};
const CHANNEL: Record<SignupChannel, string> = {
  meta_ads: "Meta reklamı", meta_organic: "Instagram / Facebook (organik)", google: "Google", other: "Diğer kaynak", direct: "Doğrudan / bilinmiyor",
};
const ACCOUNT_STATUS: Record<number, { label: string; tone: Tone }> = {
  1: { label: "Aktif", tone: "green" }, 2: { label: "Devre dışı", tone: "red" }, 3: { label: "Ödeme sorunu", tone: "red" },
  7: { label: "İncelemede", tone: "amber" }, 9: { label: "Ödemesiz süre", tone: "amber" }, 101: { label: "Kapalı", tone: "red" },
};

const tl = (value: number | null | undefined, digits = 0) => value == null ? "—"
  : `${value.toLocaleString("tr-TR", { minimumFractionDigits: digits, maximumFractionDigits: digits })} ₺`;
const num = (value: number | null | undefined) => value == null ? "—" : value.toLocaleString("tr-TR");

function errorMessage(error: unknown) {
  if (error instanceof FirebaseError) return error.message.replace(/^Firebase:\s*/i, "");
  return error instanceof Error ? error.message : "İşlem tamamlanamadı.";
}

type Days = "7" | "14" | "30" | "90";
type BudgetTarget = { id: string; level: MetaLevel; name: string; current: number };
type ToggleTarget = { id: string; level: MetaLevel; name: string; pause: boolean };

export default function AdsPage() {
  const now = useNow();
  const [days, setDays] = useState<Days>("30");
  const [data, setData] = useState<MetaAdsOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [connectOpen, setConnectOpen] = useState(false);
  const [disconnectOpen, setDisconnectOpen] = useState(false);
  const [toggle, setToggle] = useState<ToggleTarget | null>(null);
  const [budget, setBudget] = useState<BudgetTarget | null>(null);

  const load = useCallback(async (span: Days) => {
    setLoading(true);
    try { setData(await getMetaAdsOverview(Number(span))); }
    catch (error) { toast.error(errorMessage(error)); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { queueMicrotask(() => { void load(days); }); }, [load, days]);

  const connected = data?.connection.connected === true;
  const totals = data?.totals ?? null;
  const maxDaily = useMemo(() => Math.max(1, ...(data?.daily ?? []).map((row) => row.spend)), [data]);

  async function runToggle(target: ToggleTarget) {
    try {
      await updateMetaAdsEntity({ id: target.id, level: target.level, action: target.pause ? "pause" : "resume" });
      toast.success(target.pause ? "Durduruldu." : "Yeniden başlatıldı.", { description: "Meta'da birkaç dakika içinde yansır." });
      await load(days);
    } catch (error) { toast.error(errorMessage(error)); throw error; }
  }

  return (
    <AdminPage>
      <PageHeader eyebrow="Meta reklamları + kayıt kaynağı" icon={Megaphone} title="Reklamlar"
        description="Meta (Instagram ve Facebook) reklam harcamasını, reklamdan gelen işletme kayıtlarıyla birleştirir. Reklamları buradan durdurup başlatabilir, günlük bütçeyi değiştirebilirsiniz."
        meta={<>
          <HeroStat label="harcama" value={totals ? tl(totals.spend) : "—"} />
          <HeroStat label="reklamdan kayıt" value={num(data?.signups.channels.meta_ads)} />
          <HeroStat label="kayıt başı" value={totals?.costPerSignup != null ? tl(totals.costPerSignup) : "—"} />
        </>}
        actions={<>
          <Segmented label="Tarih aralığı" value={days} onChange={setDays} options={[
            { value: "7", label: "7 gün" }, { value: "14", label: "14 gün" }, { value: "30", label: "30 gün" }, { value: "90", label: "90 gün" },
          ]} />
          <Btn variant="lime" icon={RefreshCw} loading={loading} onClick={() => void load(days)}>Yenile</Btn>
        </>}
      />

      {loading && !data ? <SkeletonList rows={4} height={90} /> : !data ? (
        <EmptyState icon={TriangleAlert} title="Bilgiler alınamadı" description="Yenile'ye basın; sorun sürerse reklam fonksiyonlarının gönderildiğinden emin olun." />
      ) : (
        <>
          {!connected ? (
            <div className={cx(s.banner, s.bannerInfo)} role="status">
              <PlugZap size={22} aria-hidden />
              <div>
                <b>Meta bağlantısı kurulmadı</b>
                <p>Kayıt kaynağı takibi şimdiden çalışıyor (aşağıda). Harcama ve reklam kontrolleri için Meta sistem kullanıcısı erişim anahtarını bağlayın.</p>
              </div>
              <Btn variant="primary" icon={KeyRound} onClick={() => setConnectOpen(true)}>Meta’yı bağla</Btn>
            </div>
          ) : null}

          {data.metaErrors.length ? (
            <div className={cx(s.banner, s.bannerDanger)} role="alert">
              <XCircle size={20} aria-hidden />
              <div><b>Meta’dan bazı bilgiler alınamadı</b>{[...new Set(data.metaErrors)].map((error) => <p key={error}>{error}</p>)}</div>
              <Btn icon={KeyRound} onClick={() => setConnectOpen(true)}>Anahtarı yenile</Btn>
            </div>
          ) : null}

          {connected && totals ? (
            <StatGrid cols={5}>
              <StatCard icon={Wallet} label="Harcama" value={tl(totals.spend, 2)} hint={`${num(totals.impressions)} gösterim · ${num(totals.reach)} kişi`} />
              <StatCard icon={MousePointerClick} label="Bağlantı tıklaması" tone="blue" value={num(totals.linkClicks)} hint={`Tıklama başı ${tl(totals.cpc, 2)} · TO %${totals.ctr ?? "—"}`} />
              <StatCard icon={Eye} label="Sayfa görüntüleme" value={num(totals.landingPageViews)} hint="Siteye gerçekten gelen" />
              <StatCard icon={UserPlus} label="Reklamdan kayıt" tone="green" value={num(totals.metaSignups)} hint={totals.costPerSignup != null ? `Kayıt başı ${tl(totals.costPerSignup)} · dönüşüm %${totals.signupRate ?? "—"}` : "Henüz kayıt yok"} />
              <StatCard icon={BadgeTurkishLira} label="Ödeme yapan" tone="violet" value={num(totals.metaPaid)} hint={totals.costPerPaid != null ? `Müşteri başı ${tl(totals.costPerPaid)}` : "Henüz ödeme yok"} />
            </StatGrid>
          ) : null}

          <div className={s.grid}>
            <div className={s.main}>
              {connected ? (
                <Card title="Kampanyalar" icon={Megaphone} description={`${data.range.since} – ${data.range.until} · tutarlar ${data.account?.currency ?? "TRY"}`}>
                  {data.campaigns.length === 0 ? <EmptyState icon={Megaphone} title="Kampanya yok" description="Reklam Yöneticisi'nde oluşturduğunuz kampanyalar burada listelenir." /> : (
                    <div className={s.campaigns}>
                      {data.campaigns.map((campaign) => (
                        <article key={campaign.id} className={s.campaign}>
                          <EntityHead name={campaign.name} status={campaign.effectiveStatus} rawStatus={campaign.status} level="campaign" id={campaign.id}
                            dailyBudget={campaign.dailyBudget} lifetimeBudget={campaign.lifetimeBudget}
                            onToggle={(pause) => setToggle({ id: campaign.id, level: "campaign", name: campaign.name, pause })}
                            onBudget={(current) => setBudget({ id: campaign.id, level: "campaign", name: campaign.name, current })} />
                          <StatsLine stats={campaign.stats} />
                          {campaign.adsets.map((set) => (
                            <div key={set.id} className={s.adset}>
                              <EntityHead small name={set.name} status={set.effectiveStatus} rawStatus={set.status} level="adset" id={set.id}
                                dailyBudget={set.dailyBudget} lifetimeBudget={set.lifetimeBudget}
                                onToggle={(pause) => setToggle({ id: set.id, level: "adset", name: set.name, pause })}
                                onBudget={(current) => setBudget({ id: set.id, level: "adset", name: set.name, current })} />
                              {set.ads.map((ad) => (
                                <div key={ad.id} className={s.ad}>
                                  {ad.thumbnailUrl
                                    // eslint-disable-next-line @next/next/no-img-element
                                    ? <img src={ad.thumbnailUrl} alt="" className={s.thumb} loading="lazy" referrerPolicy="no-referrer" />
                                    : <span className={s.thumb}><Clapperboard size={16} aria-hidden /></span>}
                                  <div className={s.adBody}>
                                    <EntityHead small name={ad.name} status={ad.effectiveStatus} rawStatus={ad.status} level="ad" id={ad.id}
                                      onToggle={(pause) => setToggle({ id: ad.id, level: "ad", name: ad.name, pause })} />
                                    <StatsLine stats={ad.stats} compact />
                                  </div>
                                </div>
                              ))}
                            </div>
                          ))}
                        </article>
                      ))}
                    </div>
                  )}
                </Card>
              ) : null}

              {connected && data.daily.length ? (
                <Card title="Günlük harcama" icon={TrendingUp} description="Çubuk: harcama · alt satır: bağlantı tıklaması">
                  <div className={s.chart} role="img" aria-label="Günlük harcama grafiği">
                    {data.daily.map((row) => (
                      <div key={row.date} className={s.bar} title={`${row.date}: ${tl(row.spend, 2)} · ${row.linkClicks} tıklama`}>
                        <i style={{ height: `${Math.max(2, (row.spend / maxDaily) * 100)}%` }} />
                        <small>{row.linkClicks}</small>
                        <span>{row.date.slice(8, 10)}.{row.date.slice(5, 7)}</span>
                      </div>
                    ))}
                  </div>
                </Card>
              ) : null}

              <Card title="İşletme kayıtları — kaynağa göre" icon={Store}
                description={`Bu aralıkta açılan ilk mağazalar: ${num(data.signups.total)} takipli${data.signups.totalBusinesses != null ? ` · toplam ${num(data.signups.totalBusinesses)} işletme (şubeler ve takip öncesi dahil)` : ""}`}>
                {data.signups.total === 0 ? (
                  <EmptyState icon={UserPlus} title="Bu aralıkta takipli kayıt yok" description="Reklam linkinden gelen biri işletme açınca burada kaynağıyla görünür." />
                ) : (
                  <>
                    <div className={s.bars}>
                      {(Object.keys(CHANNEL) as SignupChannel[]).filter((key) => data.signups.channels[key]).map((key) => (
                        <BarRow key={key} label={CHANNEL[key]} value={data.signups.channels[key]} total={data.signups.total} />
                      ))}
                    </div>
                    <ResponsiveTable label="Kampanyaya göre kayıtlar" rows={data.signups.campaigns} rowKey={(row) => row.key}
                      columns={[
                        { key: "source", header: "Kaynak", cell: (row) => <span className={s.inline}><b>{row.source}</b>{row.channel === "meta_ads" ? <Pill tone="blue">reklam</Pill> : null}</span> },
                        { key: "campaign", header: "Kampanya (utm_campaign)", cell: (row) => row.campaign ? <code>{row.campaign}</code> : <span className={s.muted}>—</span> },
                        { key: "signups", header: "Kayıt", align: "right", cell: (row) => <b>{row.signups}</b> },
                        { key: "paid", header: "Ödeyen", align: "right", cell: (row) => row.paid },
                      ]}
                      renderCard={(row) => (
                        <span className={s.rowCard}><span><b>{row.source}</b><small>{row.campaign ?? "kampanya yok"}</small></span><span><b>{row.signups}</b> kayıt · {row.paid} ödeyen</span></span>
                      )} />
                  </>
                )}
              </Card>

              {data.signups.recent.length ? (
                <Card title="Son kayıtlar" icon={UserPlus} description="En yeni 40 işletme ve geldiği yer">
                  <ResponsiveTable label="Son kayıtlar" rows={data.signups.recent} rowKey={(row) => row.businessId} maxHeight="460px"
                    columns={[
                      { key: "time", header: "Zaman", width: 110, cell: (row) => <span className={s.muted}>{relativeTime(row.createdAt ? Date.parse(row.createdAt) : null, now)}</span> },
                      { key: "name", header: "İşletme", cell: (row) => <b>{row.businessName}</b> },
                      { key: "source", header: "Kaynak", cell: (row) => <span className={s.inline}>{CHANNEL[row.channel] ?? row.channel}{row.campaign ? <code>{row.campaign}</code> : null}</span> },
                      { key: "paid", header: "Durum", cell: (row) => row.paid ? <Pill tone="green" dot>Ödedi</Pill> : <Pill dot>Denemede</Pill> },
                    ]}
                    renderCard={(row) => (
                      <span className={s.rowCard}><span><b>{row.businessName}</b><small>{CHANNEL[row.channel] ?? row.channel}{row.campaign ? ` · ${row.campaign}` : ""} · {relativeTime(row.createdAt ? Date.parse(row.createdAt) : null, now)}</small></span>{row.paid ? <Pill tone="green" dot>Ödedi</Pill> : <Pill dot>Denemede</Pill>}</span>
                    )} />
                </Card>
              ) : null}
            </div>

            <div className={s.side}>
              <Card title="Meta bağlantısı" icon={PlugZap}>
                <DetailList rows={[
                  { label: "Durum", value: connected ? <Pill tone="green" dot>Bağlı</Pill> : <Pill tone="amber" dot>Bağlı değil</Pill> },
                  data.account ? { label: "Reklam hesabı", value: <b>{data.account.name}</b> } : null,
                  { label: "Hesap kimliği", value: data.connection.adAccountId ? <code>{data.connection.adAccountId.replace(/^act_/, "")}</code> : "—" },
                  data.account ? { label: "Hesap durumu", value: <Pill tone={(ACCOUNT_STATUS[data.account.status] ?? { tone: "neutral" as Tone }).tone} dot>{(ACCOUNT_STATUS[data.account.status] ?? { label: String(data.account.status) }).label}</Pill> } : null,
                  data.account ? { label: "Toplam harcanan", value: tl(data.account.amountSpent, 2) } : null,
                  data.account && data.account.balance ? { label: "Ödenmemiş bakiye", value: tl(data.account.balance, 2) } : null,
                  { label: "Erişim anahtarı", value: data.connection.hasToken ? <Pill tone="green" dot>Kayıtlı</Pill> : <Pill tone="red" dot>Yok</Pill> },
                  data.connection.updatedAt ? { label: "Son güncelleme", value: relativeTime(Date.parse(data.connection.updatedAt), now) } : null,
                ]} />
                <div className={s.actions}>
                  <Btn variant={connected ? "default" : "primary"} icon={KeyRound} onClick={() => setConnectOpen(true)}>{connected ? "Anahtarı değiştir" : "Meta'yı bağla"}</Btn>
                  {data.connection.hasToken ? <Btn variant="ghost" icon={Unplug} onClick={() => setDisconnectOpen(true)}>Bağlantıyı kes</Btn> : null}
                </div>
                <p className={s.note}><KeyRound size={13} aria-hidden /> Anahtar yalnız sunucuda (platformPrivateSettings/metaAds) saklanır; bu sayfa değerini hiçbir zaman göstermez.</p>
              </Card>

              <LinkBuilder />

              <Card title="Nasıl ölçülüyor?" icon={CircleAlert}>
                <ul className={s.howList}>
                  <li>Reklam linkindeki <code>utm_source</code>, <code>utm_campaign</code> ya da Meta’nın eklediği <code>fbclid</code> ziyaretçinin tarayıcısında 30 gün saklanır.</li>
                  <li>Bu kişi 30 gün içinde işletme açarsa kayıt, kaynağıyla birlikte sunucuya yazılır (ilk mağaza; şubeler sayılmaz).</li>
                  <li>“Ödeme yapan”: o işletmenin en az bir başarılı paket ödemesi var (SMS paketi hariç).</li>
                  <li>Farklı cihaz / tarayıcıdan kaydolan biri “doğrudan” görünebilir; gerçek sayı biraz daha yüksektir.</li>
                </ul>
              </Card>
            </div>
          </div>
        </>
      )}

      <ConnectSheet open={connectOpen} onClose={() => setConnectOpen(false)} initialAccount={data?.connection.adAccountId?.replace(/^act_/, "") ?? DEFAULT_AD_ACCOUNT}
        hasToken={data?.connection.hasToken === true} onSaved={() => void load(days)} />
      <ConfirmSheet open={disconnectOpen} onClose={() => setDisconnectOpen(false)} tone="danger" icon={Unplug} confirmLabel="Bağlantıyı kes"
        title="Meta bağlantısı kesilsin mi?" description="Erişim anahtarı sunucudan silinir; reklamlarınız Meta'da yayında kalır. Kayıt kaynağı takibi çalışmaya devam eder."
        onConfirm={async () => {
          try { await disconnectMetaAds(); toast.success("Bağlantı kesildi."); await load(days); }
          catch (error) { toast.error(errorMessage(error)); throw error; }
        }} />
      <ConfirmSheet open={toggle !== null} onClose={() => setToggle(null)} icon={toggle?.pause ? Pause : Play} tone={toggle?.pause ? "danger" : "primary"}
        confirmLabel={toggle?.pause ? "Durdur" : "Başlat"}
        title={toggle?.pause ? "Durdurulsun mu?" : "Yeniden başlatılsın mı?"}
        description={toggle ? `${toggle.level === "campaign" ? "Kampanya" : toggle.level === "adset" ? "Reklam seti" : "Reklam"}: “${toggle.name}”. ${toggle.pause ? "Harcama durur; istediğiniz zaman yeniden başlatabilirsiniz." : "Meta yeniden yayına alır; reklam yeniden incelemeye girebilir."}` : undefined}
        onConfirm={() => toggle ? runToggle(toggle) : undefined} />
      <BudgetSheet target={budget} onClose={() => setBudget(null)} onSaved={() => void load(days)} />
    </AdminPage>
  );
}

function EntityHead({ name, status, rawStatus, level, id, dailyBudget, lifetimeBudget, onToggle, onBudget, small }: {
  name: string; status: string; rawStatus: string; level: MetaLevel; id: string; dailyBudget?: number | null; lifetimeBudget?: number | null;
  onToggle: (pause: boolean) => void; onBudget?: (current: number) => void; small?: boolean;
}) {
  const view = STATUS[status] ?? { label: status || "—", tone: "neutral" as Tone };
  const paused = rawStatus === "PAUSED";
  const canToggle = rawStatus === "ACTIVE" || rawStatus === "PAUSED";
  return (
    <div className={cx(s.head, small && s.headSmall)}>
      <div className={s.headTitle}>
        <b title={`${level} ${id}`}>{name}</b>
        <span className={s.inline}>
          <Pill tone={view.tone} dot>{view.label}</Pill>
          {dailyBudget ? <span className={s.budget}>Günlük {tl(dailyBudget)}</span> : lifetimeBudget ? <span className={s.budget}>Toplam {tl(lifetimeBudget)}</span> : null}
        </span>
      </div>
      <div className={s.headActions}>
        {dailyBudget && onBudget ? <Btn size="sm" icon={Pencil} onClick={() => onBudget(dailyBudget)}>Bütçe</Btn> : null}
        {canToggle ? (paused
          ? <Btn size="sm" variant="primary" icon={Play} onClick={() => onToggle(false)}>Başlat</Btn>
          : <Btn size="sm" icon={Pause} onClick={() => onToggle(true)}>Durdur</Btn>) : null}
      </div>
    </div>
  );
}

function StatsLine({ stats, compact }: { stats: MetaStats; compact?: boolean }) {
  const cpc = stats.linkClicks ? stats.spend / stats.linkClicks : null;
  return (
    <div className={cx(s.stats, compact && s.statsCompact)}>
      <span><small>Harcama</small><b>{tl(stats.spend, 2)}</b></span>
      <span><small>Gösterim</small><b>{num(stats.impressions)}</b></span>
      <span><small>Tıklama</small><b>{num(stats.linkClicks)}</b></span>
      <span><small>Tık. başı</small><b>{tl(cpc, 2)}</b></span>
      <span><small>Sayfa gör.</small><b>{num(stats.landingPageViews)}</b></span>
      {!compact ? <span><small>Video izl.</small><b>{num(stats.videoViews)}</b></span> : null}
    </div>
  );
}

function LinkBuilder() {
  const [campaign, setCampaign] = useState("reels_2");
  const [path, setPath] = useState("/isletmeler/kayit");
  const slug = campaign.trim().toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_-]/g, "") || "kampanya";
  const url = `${SITE}${path}?utm_source=meta&utm_medium=paid&utm_campaign=${slug}`;
  return (
    <Card title="Reklam linki oluştur" icon={Link2} description="Her yeni reklam için farklı kampanya adı verin; kayıtlar ayrı sayılır.">
      <div className={s.form}>
        <label className={ui.field}><span className={ui.fieldLabel}>Kampanya adı</span>
          <input className={ui.input} value={campaign} onChange={(event) => setCampaign(event.target.value)} placeholder="reels_2" />
        </label>
        <label className={ui.field}><span className={ui.fieldLabel}>Sayfa</span>
          <select className={ui.select} value={path} onChange={(event) => setPath(event.target.value)}>
            <option value="/isletmeler/kayit">İşletme kaydı (önerilen)</option>
            <option value="/isletmeler">İşletmeler tanıtım sayfası</option>
            <option value="/fiyatlar">Fiyatlar</option>
            <option value="/">Ana sayfa</option>
          </select>
        </label>
        <div className={s.linkBox}><code>{url}</code><CopyButton value={url} compact /></div>
      </div>
    </Card>
  );
}

function ConnectSheet({ open, onClose, initialAccount, hasToken, onSaved }: {
  open: boolean; onClose: () => void; initialAccount: string; hasToken: boolean; onSaved: () => void;
}) {
  const [token, setToken] = useState("");
  const [account, setAccount] = useState(initialAccount);
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (open) queueMicrotask(() => { setToken(""); setAccount(initialAccount); }); }, [open, initialAccount]);

  async function save() {
    if (!hasToken && !token.trim()) { toast.error("Erişim anahtarını yapıştırın."); return; }
    setBusy(true);
    try {
      const result = await saveMetaAdsSettings({ adAccountId: account, ...(token.trim() ? { accessToken: token.trim() } : {}) });
      toast.success("Meta bağlandı.", { description: result.accountName ? `Reklam hesabı: ${result.accountName}` : undefined });
      setToken("");
      onClose();
      onSaved();
    } catch (error) { toast.error(errorMessage(error)); }
    finally { setBusy(false); }
  }

  return (
    <Sheet open={open} onClose={onClose} busy={busy} width={520} title="Meta reklam hesabını bağla"
      description="Business ayarları › Sistem kullanıcıları › Belirteç oluştur (ads_read + ads_management, süresiz)."
      footer={<><Btn onClick={onClose} disabled={busy}>Vazgeç</Btn><Btn variant="primary" icon={PlugZap} loading={busy} onClick={() => void save()}>Dene ve kaydet</Btn></>}>
      <div className={s.form}>
        <label className={ui.field}><span className={ui.fieldLabel}>Erişim anahtarı (belirteç){hasToken ? " — boş bırakırsanız mevcut anahtar kalır" : ""}</span>
          <input className={ui.input} type="password" autoComplete="off" spellCheck={false} value={token} onChange={(event) => setToken(event.target.value)} placeholder="EAAG…" data-autofocus />
        </label>
        <label className={ui.field}><span className={ui.fieldLabel}>Reklam hesabı kimliği</span>
          <input className={ui.input} inputMode="numeric" value={account} onChange={(event) => setAccount(event.target.value)} placeholder={DEFAULT_AD_ACCOUNT} />
        </label>
        <p className={s.note}><KeyRound size={13} aria-hidden /> Kaydetmeden önce anahtar Meta’da denenir. Anahtar sunucuda saklanır ve bir daha gösterilmez.</p>
      </div>
    </Sheet>
  );
}

function BudgetSheet({ target, onClose, onSaved }: { target: BudgetTarget | null; onClose: () => void; onSaved: () => void }) {
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (target) queueMicrotask(() => setValue(String(target.current))); }, [target]);
  const amount = Number(value.replace(",", "."));
  const valid = Number.isFinite(amount) && amount >= 50 && amount <= 20_000;
  const bigJump = target && valid && amount > target.current * 2;

  async function save() {
    if (!target || !valid) return;
    setBusy(true);
    try {
      await updateMetaAdsEntity({ id: target.id, level: target.level, action: "budget", dailyBudget: amount });
      toast.success(`Günlük bütçe ${tl(amount)} oldu.`);
      onClose();
      onSaved();
    } catch (error) { toast.error(errorMessage(error)); }
    finally { setBusy(false); }
  }

  return (
    <Sheet open={target !== null} onClose={onClose} busy={busy} width={440} title="Günlük bütçe" description={target ? `“${target.name}” · şu an ${tl(target.current)}` : undefined}
      footer={<><Btn onClick={onClose} disabled={busy}>Vazgeç</Btn><Btn variant="primary" icon={Wallet} loading={busy} disabled={!valid} onClick={() => void save()}>Kaydet</Btn></>}>
      <div className={s.form}>
        <label className={ui.field}><span className={ui.fieldLabel}>Yeni günlük bütçe (₺)</span>
          <input className={ui.input} inputMode="decimal" value={value} onChange={(event) => setValue(event.target.value)} data-autofocus />
        </label>
        {!valid && value ? <p className={s.warn}>50 ₺ ile 20.000 ₺ arasında olmalı.</p> : null}
        {bigJump ? <p className={s.warn}>Bütçeyi bir seferde 2 katından fazla artırmak Meta’nın öğrenme aşamasını sıfırlayabilir; %20–30’luk adımlar daha sağlıklı.</p> : null}
        <p className={s.note}><Wallet size={13} aria-hidden /> Meta bazı günler bütçenin %75 fazlasına kadar harcayabilir; haftalık toplam günlük bütçe × 7’yi geçmez.</p>
      </div>
    </Sheet>
  );
}
