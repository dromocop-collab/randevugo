"use client";

// Süper admin › Reklamlar: kırılım (yerleşim/yaş/cinsiyet/bölge/gün), otomatik koruma ve huni kartları.
import { useCallback, useEffect, useState } from "react";
import { FirebaseError } from "firebase/app";
import { toast } from "sonner";
import { Filter, MessageCircle, PieChart, RefreshCw, ShieldCheck, ShieldAlert, Sparkles, TriangleAlert } from "lucide-react";
import {
  getMetaAdsBreakdown, runMetaAdsGuardNow, saveMetaAdsGuard,
  type AdGuard, type AdGuardSettings, type BreakdownKind, type FunnelRow, type MetaAdsBreakdown,
} from "@/features/ads/meta-ads-repository";
import { Btn, Card, EmptyState, Pill, ResponsiveTable, Segmented, SkeletonList, cx, relativeTime, ui, useNow } from "../_pages-ui";
import s from "./reklamlar.module.css";

const tl = (value: number | null | undefined, digits = 0) => value == null ? "—"
  : `${value.toLocaleString("tr-TR", { minimumFractionDigits: digits, maximumFractionDigits: digits })} ₺`;
const num = (value: number | null | undefined) => value == null ? "—" : value.toLocaleString("tr-TR");
const errorMessage = (error: unknown) => error instanceof FirebaseError ? error.message.replace(/^Firebase:\s*/i, "")
  : error instanceof Error ? error.message : "İşlem tamamlanamadı.";

const KINDS: Array<{ value: BreakdownKind; label: string }> = [
  { value: "placement", label: "Yerleşim" }, { value: "age", label: "Yaş" }, { value: "gender", label: "Cinsiyet" },
  { value: "region", label: "Bölge" }, { value: "weekday", label: "Gün" },
];

/* ───────────── Kırılım ───────────── */

export function BreakdownCard({ days, campaigns }: { days: number; campaigns: Array<{ id: string; name: string }> }) {
  const [kind, setKind] = useState<BreakdownKind>("placement");
  const [campaignId, setCampaignId] = useState("");
  const [data, setData] = useState<MetaAdsBreakdown | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try { setData(await getMetaAdsBreakdown({ days, kind, campaignId: campaignId || null })); }
    catch (reason) { setError(errorMessage(reason)); setData(null); }
    finally { setLoading(false); }
  }, [days, kind, campaignId]);
  useEffect(() => { queueMicrotask(() => { void load(); }); }, [load]);

  const rows = data?.rows ?? [];
  const maxSpend = Math.max(1, ...rows.map((row) => row.spend));
  const waste = rows.filter((row) => row.flag === "waste");
  const best = rows.find((row) => row.flag === "best");

  return (
    <Card title="Para nereye gidiyor?" icon={PieChart}
      description={`Sonuç = siteye gelen + WhatsApp'ta yazan. Ortalama sonuç başı ${tl(data?.average ?? null, 2)}`}
      action={<Btn size="sm" variant="ghost" icon={RefreshCw} loading={loading} onClick={() => void load()}>Yenile</Btn>}>
      <div className={s.breakdownBar}>
        <Segmented label="Kırılım" value={kind} onChange={setKind} options={KINDS} />
        {campaigns.length > 1 ? (
          <select className={ui.select} aria-label="Kampanya" value={campaignId} onChange={(event) => setCampaignId(event.target.value)}>
            <option value="">Tüm kampanyalar</option>
            {campaigns.map((campaign) => <option key={campaign.id} value={campaign.id}>{campaign.name}</option>)}
          </select>
        ) : null}
      </div>

      {loading && !data ? <SkeletonList rows={4} height={44} /> : error ? (
        <EmptyState icon={TriangleAlert} title="Kırılım alınamadı" description={error} />
      ) : rows.length === 0 ? (
        <EmptyState icon={PieChart} title="Bu aralıkta harcama yok" />
      ) : (
        <>
          {waste.length || best ? (
            <div className={s.tips}>
              {best ? <p className={s.tipGood}><Sparkles size={14} aria-hidden /> En verimli: <b>{best.label}</b>, sonuç başı {tl(best.costPerResult, 2)}.</p> : null}
              {waste.map((row) => (
                <p key={row.key} className={s.tipBad}><TriangleAlert size={14} aria-hidden /> <b>{row.label}</b> harcamanın %{row.spendShare}’ini aldı
                  {row.results ? `, ama sonuç başı ${tl(row.costPerResult, 2)} (ortalamanın 2 katından fazla).` : `, hiç sonuç getirmedi.`}
                  {kind === "placement" ? " Reklam setinde bu yerleşimi kapatmayı düşün." : kind === "age" || kind === "gender" ? " Hedef kitleden çıkarmayı düşün." : ""}</p>
              ))}
            </div>
          ) : null}
          <ResponsiveTable label="Kırılım" rows={rows} rowKey={(row) => row.key}
            columns={[
              { key: "label", header: KINDS.find((item) => item.value === kind)?.label ?? "", cell: (row) => (
                <span className={s.breakdownLabel}>
                  <span className={s.inline}><b>{row.label}</b>{row.flag === "best" ? <Pill tone="green">en verimli</Pill> : row.flag === "waste" ? <Pill tone="red">boşa</Pill> : null}</span>
                  <i className={s.spendBar}><i style={{ width: `${Math.max(2, (row.spend / maxSpend) * 100)}%` }} /></i>
                </span>
              ) },
              { key: "spend", header: "Harcama", align: "right", cell: (row) => <span><b>{tl(row.spend, 2)}</b><small className={s.subtle}> %{row.spendShare}</small></span> },
              { key: "clicks", header: "Tıklama", align: "right", cell: (row) => num(row.linkClicks) },
              { key: "lpv", header: "Siteye", align: "right", cell: (row) => num(row.landingPageViews) },
              { key: "wa", header: "WhatsApp", align: "right", cell: (row) => num(row.conversations) },
              { key: "cpr", header: "Sonuç başı", align: "right", cell: (row) => <b>{tl(row.costPerResult, 2)}</b> },
              { key: "ctr", header: "TO", align: "right", cell: (row) => row.ctr == null ? "—" : `%${row.ctr}` },
            ]}
            renderCard={(row) => (
              <span className={s.rowCard}>
                <span><b>{row.label}</b><small>{tl(row.spend, 2)} · %{row.spendShare} · {row.linkClicks} tıklama</small></span>
                <span>{row.flag === "best" ? <Pill tone="green">en verimli</Pill> : row.flag === "waste" ? <Pill tone="red">boşa</Pill> : null} <b>{tl(row.costPerResult, 2)}</b></span>
              </span>
            )} />
        </>
      )}
    </Card>
  );
}

/* ───────────── Otomatik koruma ───────────── */

export function GuardCard({ guard, connected, onChanged }: { guard: AdGuard | undefined; connected: boolean; onChanged: () => void }) {
  const now = useNow();
  const [form, setForm] = useState<AdGuardSettings>({ enabled: false, minSpend: 150, maxCostPerResult: null, autoPause: false });
  const [maxCost, setMaxCost] = useState("");
  const [busy, setBusy] = useState<"save" | "run" | null>(null);
  useEffect(() => {
    if (!guard) return;
    queueMicrotask(() => {
      setForm({ enabled: guard.enabled, minSpend: guard.minSpend, maxCostPerResult: guard.maxCostPerResult, autoPause: guard.autoPause });
      setMaxCost(guard.maxCostPerResult != null ? String(guard.maxCostPerResult) : "");
    });
  }, [guard]);

  async function save() {
    setBusy("save");
    try {
      const cost = Number(maxCost.replace(",", "."));
      const saved = await saveMetaAdsGuard({ ...form, maxCostPerResult: maxCost.trim() && Number.isFinite(cost) && cost > 0 ? cost : null });
      toast.success(saved.enabled ? "Koruma açık." : "Koruma kapalı.", { description: saved.enabled ? `Saatte bir bakılır; ${saved.minSpend} ₺ üstü sonuçsuz set ${saved.autoPause ? "durdurulur" : "için uyarı gelir"}.` : undefined });
      onChanged();
    } catch (error) { toast.error(errorMessage(error)); }
    finally { setBusy(null); }
  }

  async function runNow() {
    setBusy("run");
    try {
      const run = await runMetaAdsGuardNow();
      if (run.skipped) toast.message(run.skipped);
      else if (run.flagged.length) toast.warning(`${run.flagged.length} reklam seti işaretlendi`, { description: run.flagged.map((row) => row.name).join(", ") });
      else toast.success(`${run.checked} yayındaki reklam seti kontrol edildi, sorun yok.`);
      onChanged();
    } catch (error) { toast.error(errorMessage(error)); }
    finally { setBusy(null); }
  }

  const status = guard?.status;
  return (
    <Card title="Otomatik koruma" icon={form.enabled ? ShieldCheck : ShieldAlert}
      description="Sonuç getirmeden para yakan reklam setini saatte bir yakalar.">
      <div className={s.form}>
        <label className={s.check}>
          <input type="checkbox" checked={form.enabled} onChange={(event) => setForm({ ...form, enabled: event.target.checked })} />
          <span><b>Korumayı aç</b><small>Son 7 günde eşiği geçip hiç sonuç (siteye gelen / WhatsApp’ta yazan) getirmeyen set için uyarı.</small></span>
        </label>
        <label className={ui.field}><span className={ui.fieldLabel}>Harcama eşiği (₺, son 7 gün)</span>
          <input className={ui.input} inputMode="numeric" value={String(form.minSpend)} disabled={!form.enabled}
            onChange={(event) => setForm({ ...form, minSpend: Number(event.target.value.replace(/\D/g, "")) || 0 })} />
        </label>
        <label className={ui.field}><span className={ui.fieldLabel}>Sonuç başı üst sınır (₺, boş = yok)</span>
          <input className={ui.input} inputMode="decimal" value={maxCost} disabled={!form.enabled} placeholder="ör. 40" onChange={(event) => setMaxCost(event.target.value)} />
        </label>
        <label className={s.check}>
          <input type="checkbox" checked={form.autoPause} disabled={!form.enabled} onChange={(event) => setForm({ ...form, autoPause: event.target.checked })} />
          <span><b>Otomatik durdur</b><small>Kapalıysa yalnız bildirim gelir. Açıksa set Meta’da durdurulur (buradan yeniden başlatılabilir).</small></span>
        </label>
        <div className={s.actions}>
          <Btn variant="primary" icon={ShieldCheck} loading={busy === "save"} disabled={busy !== null} onClick={() => void save()}>Kaydet</Btn>
          <Btn icon={RefreshCw} loading={busy === "run"} disabled={busy !== null || !connected || !guard?.enabled} onClick={() => void runNow()}>Şimdi kontrol et</Btn>
        </div>
        {status?.lastRunAt ? <p className={s.muted}>Son kontrol {relativeTime(Date.parse(status.lastRunAt), now)}{status.lastError ? ` · hata: ${status.lastError}` : ""}</p> : null}
        {status?.flagged.length ? (
          <div className={s.tips}>
            {status.flagged.map((row) => (
              <p key={row.adsetId} className={s.tipBad}><TriangleAlert size={14} aria-hidden /> <b>{row.name}</b> {row.paused ? "(durduruldu)" : ""} — {row.message}</p>
            ))}
          </div>
        ) : null}
      </div>
    </Card>
  );
}

/* ───────────── Huni ───────────── */

export function FunnelCard({ funnels }: { funnels: { tracked: boolean; site: FunnelRow[]; whatsapp: FunnelRow[]; abandoned: number | null } }) {
  const [view, setView] = useState<"site" | "whatsapp">("site");
  const rows = view === "site" ? funnels.site : funnels.whatsapp;
  // Gösterim binlerce, ödeme birkaç tane: çubuklar logaritmik ki alt adımlar da görünsün.
  const max = Math.log10(Math.max(1, ...rows.map((row) => row.value ?? 0)) + 1);
  const width = (value: number | null) => (value ? Math.max(2, (Math.log10(value + 1) / max) * 100) : 0);
  // Gösterim → tıklama oranı doğal olarak düşük (%1–3); "en çok kayıp" onu saymaz.
  const worst = rows.slice(1).filter((row) => row.key !== "clicks" && row.fromPrevious != null && row.value != null)
    .reduce<FunnelRow | null>((min, row) => (min == null || row.fromPrevious! < min.fromPrevious! ? row : min), null);
  return (
    <Card title="Reklam hunisi" icon={Filter}
      description={view === "site" ? "Reklamdan siteye gelenin kayıt ve ödemeye kadar yolu" : "WhatsApp’a tıklayanın kayıt asistanından işletmeye kadar yolu"}
      action={<Segmented label="Huni" value={view} onChange={setView} options={[{ value: "site", label: "Site" }, { value: "whatsapp", label: "WhatsApp" }]} />}>
      <ol className={s.funnel}>
        {rows.map((row, index) => (
          <li key={row.key} className={cx(s.funnelStep, worst?.key === row.key && s.funnelWorst)}>
            <span className={s.funnelHead}>
              <b>{row.label}</b>
              {row.hint ? <small>{row.hint}</small> : null}
            </span>
            <span className={s.funnelTrack}><i style={{ width: `${width(row.value)}%` }} /></span>
            <span className={s.funnelNums}>
              <b>{num(row.value)}</b>
              {index > 0 ? <small>{row.fromPrevious != null ? `%${row.fromPrevious.toLocaleString("tr-TR")} devam` : "—"}</small> : null}
            </span>
          </li>
        ))}
      </ol>
      {worst ? <p className={s.tipBad}><TriangleAlert size={14} aria-hidden /> En çok kayıp: <b>{worst.label}</b> adımında (%{worst.fromPrevious?.toLocaleString("tr-TR")} devam ediyor).</p> : null}
      {view === "whatsapp" && funnels.abandoned ? <p className={s.muted}><MessageCircle size={13} aria-hidden /> {funnels.abandoned} kişi kayıt asistanını yarıda bıraktı (Süper admin › WhatsApp gelen kutusundan yazılabilir).</p> : null}
      {view === "site" && !funnels.tracked ? <p className={s.note}>Kayıt adımları reklam oturumlarına göre bu güncellemeden sonra sayılmaya başlar; önceki günler boş görünür.</p> : null}
    </Card>
  );
}
