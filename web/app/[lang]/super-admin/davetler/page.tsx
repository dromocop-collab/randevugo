"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { FirebaseError } from "firebase/app";
import { toast } from "sonner";
import { Ban, CalendarPlus, Gift, HeartHandshake, RefreshCw, Settings2, Trophy, UserPlus, Users } from "lucide-react";
import Link from "@/i18n/link";
import {
  adminListReferrals, adminResolveReferral, adminSaveReferralSettings, type AdminReferralRow, type AdminReferrals, type ReferralSettings,
} from "@/features/referral/referral";
import {
  AdminPage, Btn, Card, ConfirmSheet, EmptyState, HeroStat, PageHeader, Pill, ResponsiveTable, Segmented, SkeletonList, StatCard, StatGrid,
  relativeTime, ui, useNow, type Tone,
} from "../_pages-ui";
import s from "./davetler.module.css";

const STATUS: Record<string, { label: string; tone: Tone }> = {
  pending: { label: "Yayına girmesi bekleniyor", tone: "amber" },
  rewarded: { label: "Ödül verildi", tone: "green" },
  blocked: { label: "Engellendi", tone: "red" },
  rejected: { label: "Reddedildi", tone: "neutral" },
};
const CHANNEL: Record<string, string> = { signup: "Web", whatsapp: "WhatsApp" };
type Filter = "all" | "pending" | "rewarded" | "blocked";
type Action = { row: AdminReferralRow; action: "reward" | "reject" };

const errorMessage = (error: unknown) => error instanceof FirebaseError ? error.message.replace(/^Firebase:\s*/i, "")
  : error instanceof Error ? error.message : "İşlem tamamlanamadı.";

export default function ReferralsAdminPage() {
  const now = useNow();
  const [data, setData] = useState<AdminReferrals | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>("all");
  const [form, setForm] = useState<ReferralSettings | null>(null);
  const [saving, setSaving] = useState(false);
  const [action, setAction] = useState<Action | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await adminListReferrals();
      setData(result);
      setForm(result.settings);
    } catch (error) { toast.error(errorMessage(error)); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { queueMicrotask(() => { void load(); }); }, [load]);

  const rows = useMemo(() => (data?.referrals ?? []).filter((row) =>
    filter === "all" ? true : filter === "blocked" ? row.status === "blocked" || row.status === "rejected" : row.status === filter), [data, filter]);
  const dirty = Boolean(form && data && JSON.stringify(form) !== JSON.stringify(data.settings));

  async function saveSettings() {
    if (!form) return;
    setSaving(true);
    try {
      const settings = await adminSaveReferralSettings(form);
      setForm(settings);
      setData((current) => current ? { ...current, settings } : current);
      toast.success("Davet ayarları kaydedildi.");
    } catch (error) { toast.error(errorMessage(error)); }
    finally { setSaving(false); }
  }

  async function runAction(target: Action) {
    try {
      await adminResolveReferral(target.row.referredBusinessId, target.action);
      toast.success(target.action === "reward" ? "Ödül verildi; davet edene bildirim gitti." : "Davet reddedildi.");
      await load();
    } catch (error) { toast.error(errorMessage(error)); throw error; }
  }

  const totals = data?.totals;
  const number = (key: keyof ReferralSettings, min: number, max: number) => (value: string) => {
    const parsed = Math.round(Number(value.replace(/\D/g, "")));
    setForm((current) => current ? { ...current, [key]: Number.isFinite(parsed) ? Math.min(max, Math.max(min, parsed)) : min } : current);
  };

  return (
    <AdminPage>
      <PageHeader eyebrow="Arkadaşını getir" icon={HeartHandshake} title="Davetler"
        description="İşletmelerin referans koduyla getirdiği yeni işletmeler. Davet edilen mağaza yayına girince davet edenin tüm şubelerine ödül süresi eklenir."
        meta={<>
          <HeroStat label="davet" value={totals?.invited ?? "—"} />
          <HeroStat label="katılan" value={totals?.rewarded ?? "—"} />
          <HeroStat label="verilen ay" value={totals?.monthsGiven ?? "—"} />
        </>}
        actions={<Btn variant="lime" icon={RefreshCw} loading={loading} onClick={() => void load()}>Yenile</Btn>}
      />

      {loading && !data ? <SkeletonList rows={4} height={80} /> : !data || !form ? (
        <EmptyState icon={HeartHandshake} title="Bilgiler alınamadı" description="Yenile'ye basın; sorun sürerse işletme fonksiyonlarının gönderildiğinden emin olun." />
      ) : (
        <>
          <StatGrid cols={4}>
            <StatCard icon={Users} label="Toplam davet" value={totals!.invited} />
            <StatCard icon={Gift} tone="green" label="Ödül verilen" value={totals!.rewarded} hint={`${totals!.monthsGiven} ay hediye`} />
            <StatCard icon={UserPlus} tone="amber" label="Bekleyen" value={totals!.pending} hint="Mağaza onayı bekleniyor" onClick={() => setFilter("pending")} active={filter === "pending"} />
            <StatCard icon={Ban} label="Engellenen" value={totals!.blocked} hint="Kendini davet, sınır vb." onClick={() => setFilter("blocked")} active={filter === "blocked"} />
          </StatGrid>

          <div className={s.grid}>
            <div className={s.main}>
              <Card title="Davetler" icon={UserPlus} action={
                <Segmented label="Durum" value={filter} onChange={setFilter} options={[
                  { value: "all", label: "Tümü", count: data.referrals.length },
                  { value: "pending", label: "Bekleyen", count: totals!.pending },
                  { value: "rewarded", label: "Ödül", count: totals!.rewarded },
                  { value: "blocked", label: "Engelli", count: totals!.blocked },
                ]} />
              }>
                {rows.length === 0 ? <EmptyState icon={HeartHandshake} title="Bu filtrede davet yok" description="İşletmeler panelde Büyüme › Arkadaşını Getir'den kodlarını paylaşır." /> : (
                  <ResponsiveTable label="Davetler" rows={rows} rowKey={(row) => row.id} maxHeight="640px"
                    columns={[
                      { key: "time", header: "Zaman", width: 110, cell: (row) => <span className={s.muted}>{relativeTime(row.createdAt, now)}</span> },
                      { key: "new", header: "Yeni işletme", cell: (row) => <Link className={s.link} href={`/super-admin/isletmeler?q=${row.referredBusinessId}`}><b>{row.referredBusinessName || "—"}</b></Link> },
                      { key: "by", header: "Davet eden", cell: (row) => <span className={s.inline}><Link className={s.link} href={`/super-admin/isletmeler?q=${row.referrerBusinessId}`}>{row.referrerName || "—"}</Link><code>{row.code}</code></span> },
                      { key: "channel", header: "Kanal", cell: (row) => CHANNEL[row.channel] ?? row.channel },
                      { key: "status", header: "Durum", cell: (row) => <StatusCell row={row} /> },
                      { key: "actions", header: "", align: "right", cell: (row) => <RowActions row={row} onAction={setAction} /> },
                    ]}
                    renderCard={(row) => (
                      <span className={s.rowCard}>
                        <span><b>{row.referredBusinessName || "—"}</b><small>{row.referrerName} · <code>{row.code}</code> · {CHANNEL[row.channel] ?? row.channel} · {relativeTime(row.createdAt, now)}</small></span>
                        <span className={s.inline}><StatusCell row={row} /><RowActions row={row} onAction={setAction} /></span>
                      </span>
                    )} />
                )}
              </Card>
            </div>

            <div className={s.side}>
              <Card title="Program ayarları" icon={Settings2}>
                <div className={s.form}>
                  <label className={s.check}>
                    <input type="checkbox" checked={form.enabled} onChange={(event) => setForm({ ...form, enabled: event.target.checked })} />
                    <span><b>Program açık</b><small>Kapalıyken kodlar saklanır ama yeni davet kaydedilmez, ödül verilmez.</small></span>
                  </label>
                  <label className={ui.field}><span className={ui.fieldLabel}>Davet edene ödül (ay, 1–12)</span>
                    <input className={ui.input} inputMode="numeric" value={String(form.rewardMonths)} onChange={(event) => number("rewardMonths", 1, 12)(event.target.value)} />
                  </label>
                  <label className={ui.field}><span className={ui.fieldLabel}>Yıllık üst sınır (firma başına ödül)</span>
                    <input className={ui.input} inputMode="numeric" value={String(form.yearlyCap)} onChange={(event) => number("yearlyCap", 1, 120)(event.target.value)} />
                  </label>
                  <label className={ui.field}><span className={ui.fieldLabel}>Davetle gelene deneme bonusu (gün, 0 = yok)</span>
                    <input className={ui.input} inputMode="numeric" value={String(form.referredBonusDays)} onChange={(event) => number("referredBonusDays", 0, 90)(event.target.value)} />
                  </label>
                  <Btn variant="primary" icon={Settings2} loading={saving} disabled={!dirty || saving} onClick={() => void saveSettings()}>Kaydet</Btn>
                  <p className={s.note}>Ödül: davet edilen mağaza yayına girince (otomatik onay ya da sizin onayınız). Denemede olana deneme süresi, aboneye bitiş tarihi uzar; süresi dolmuşa bugünden açılır. Süresiz paketlere işlenmez.</p>
                </div>
              </Card>

              <Card title="En çok getirenler" icon={Trophy}>
                {data.leaders.length === 0 ? <p className={s.muted}>Henüz davet yok.</p> : (
                  <ol className={s.leaders}>
                    {data.leaders.map((leader, index) => (
                      <li key={leader.organizationId}>
                        <i>{index + 1}</i>
                        <Link className={s.link} href={`/super-admin/isletmeler?q=${leader.businessId}`}>{leader.name || "—"}</Link>
                        <span><b>{leader.rewarded}</b>/{leader.invited} · <CalendarPlus size={12} aria-hidden /> {leader.months} ay</span>
                      </li>
                    ))}
                  </ol>
                )}
              </Card>
            </div>
          </div>
        </>
      )}

      <ConfirmSheet open={action !== null} onClose={() => setAction(null)}
        tone={action?.action === "reject" ? "danger" : "primary"} icon={action?.action === "reject" ? Ban : Gift}
        confirmLabel={action?.action === "reject" ? "Reddet" : "Ödülü ver"}
        title={action?.action === "reject" ? "Davet reddedilsin mi?" : "Ödül elle verilsin mi?"}
        description={action ? (action.action === "reject"
          ? `“${action.row.referredBusinessName}” daveti geçersiz sayılır; ${action.row.referrerName} ödül almaz.`
          : `${action.row.referrerName} firmasının tüm şubelerine ${data?.settings.rewardMonths ?? 1} ay eklenir (yıllık sınır ve “yayında” şartı atlanır).`) : undefined}
        onConfirm={() => action ? runAction(action) : undefined} />
    </AdminPage>
  );
}

function StatusCell({ row }: { row: AdminReferralRow }) {
  const view = STATUS[row.status] ?? { label: row.status, tone: "neutral" as Tone };
  return (
    <span className={s.statusCell}>
      <Pill tone={view.tone} dot>{row.status === "rewarded" ? `${view.label} · +${row.rewardMonths} ay` : view.label}</Pill>
      {row.reasonText ? <small>{row.reasonText}</small> : null}
      {row.forced ? <small>Elle verildi</small> : null}
    </span>
  );
}

function RowActions({ row, onAction }: { row: AdminReferralRow; onAction: (action: Action) => void }) {
  if (row.status === "rewarded" || row.status === "rejected") return null;
  return (
    <span className={s.inline}>
      <Btn size="sm" variant="primary" icon={Gift} onClick={() => onAction({ row, action: "reward" })}>Ödülü ver</Btn>
      <Btn size="sm" variant="ghost" icon={Ban} onClick={() => onAction({ row, action: "reject" })}>Reddet</Btn>
    </span>
  );
}
