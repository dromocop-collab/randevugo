"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { FirebaseError } from "firebase/app";
import { toast } from "sonner";
import { Building2, Coins, Download, Gift, MessageSquareWarning, PackagePlus, RefreshCw, Wallet } from "lucide-react";
import {
  adjustBusinessSmsCredits, getSmsBusinessUsage, type SmsBusinessUsageResult, type SmsBusinessUsageRow, type SmsUsageStatus,
} from "@/features/mutlucell/mutlucell-repository";
import {
  Btn, Card, Chips, EmptyState, IconBtn, Pill, ResponsiveTable, SearchField, Sheet, SkeletonList, StatCard, StatGrid, downloadCsv, type Tone,
} from "../_pages-ui";
import s from "./sms.module.css";

type Filter = "all" | "exhausted" | "low" | "extra";

const STATUS: Record<SmsUsageStatus, { label: string; tone: Tone }> = {
  ok: { label: "Normal", tone: "green" },
  low: { label: "%80 aşıldı", tone: "amber" },
  exhausted: { label: "Kota doldu", tone: "red" },
  unlimited: { label: "Sınırsız", tone: "neutral" },
};

const money = (kurus: number) => `${(kurus / 100).toLocaleString("tr-TR", { maximumFractionDigits: 2 })} ₺`;

function errorMessage(error: unknown) {
  if (error instanceof FirebaseError) return error.message.replace(/^Firebase:\s*/i, "");
  return error instanceof Error ? error.message : "İşlem tamamlanamadı.";
}

function UsageMeter({ row }: { row: SmsBusinessUsageRow }) {
  if (row.quota === null) return <span className={s.usageText}>{row.used.toLocaleString("tr-TR")}</span>;
  const percent = row.quota > 0 ? Math.min(100, Math.round(row.used / row.quota * 100)) : 100;
  return (
    <span className={s.usageCell}>
      <span className={s.usageText}>{row.used.toLocaleString("tr-TR")} / {row.quota.toLocaleString("tr-TR")}</span>
      <span className={s.usageTrack} aria-hidden><i style={{ width: `${percent}%` }} data-status={row.status} /></span>
    </span>
  );
}

/** Süper admin › SMS › İşletme kullanımı: kim ne kadar SMS harcıyor, kimin kotası doldu, ek kredi ver/düş. */
export function SmsBusinessUsage() {
  const [data, setData] = useState<SmsBusinessUsageResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>("all");
  const [search, setSearch] = useState("");
  const [target, setTarget] = useState<SmsBusinessUsageRow | null>(null);
  const [delta, setDelta] = useState("100");
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try { setData(await getSmsBusinessUsage()); } catch (error) { toast.error(errorMessage(error)); } finally { setLoading(false); }
  }, []);
  useEffect(() => { queueMicrotask(() => { void load(); }); }, [load]);

  const rows = useMemo(() => {
    const query = search.trim().toLocaleLowerCase("tr-TR");
    return (data?.rows ?? []).filter((row) => {
      if (filter === "exhausted" && row.status !== "exhausted") return false;
      if (filter === "low" && row.status !== "low") return false;
      if (filter === "extra" && row.extraBalance <= 0) return false;
      return !query || `${row.businessName} ${row.city} ${row.planLabel}`.toLocaleLowerCase("tr-TR").includes(query);
    });
  }, [data, filter, search]);

  async function saveAdjustment() {
    if (!target) return;
    const amount = Math.trunc(Number(delta));
    if (!Number.isFinite(amount) || amount === 0) { toast.error("Sıfırdan farklı bir kredi miktarı girin (düşmek için eksi)."); return; }
    if (reason.trim().length < 3) { toast.error("Kısa bir açıklama yazın."); return; }
    setSaving(true);
    try {
      const balance = await adjustBusinessSmsCredits({ businessId: target.businessId, delta: amount, reason: reason.trim() });
      toast.success(`${target.businessName}: ek kredi ${balance.toLocaleString("tr-TR")} oldu.`);
      setTarget(null);
      await load();
    } catch (error) {
      toast.error(errorMessage(error));
    } finally { setSaving(false); }
  }

  function exportCsv() {
    downloadCsv(`sms-kullanim-${data?.periodKey ?? ""}.csv`, [
      ["İşletme", "Şehir", "Paket", "Bu ay kullanılan", "Aylık kota", "Ek kredi", "Durum"],
      ...rows.map((row) => [row.businessName, row.city, row.planLabel, String(row.used), row.quota === null ? "Sınırsız" : String(row.quota), String(row.extraBalance), STATUS[row.status].label]),
    ]);
  }

  const filters = [
    { value: "all" as const, label: `Tümü (${data?.rows.length ?? 0})` },
    { value: "exhausted" as const, label: `Kota doldu (${data?.totals.exhausted ?? 0})` },
    { value: "low" as const, label: `Azalıyor (${data?.totals.low ?? 0})` },
    { value: "extra" as const, label: "Ek kredisi olan" },
  ];

  return (
    <>
      <StatGrid cols={4}>
        <StatCard icon={Wallet} label="Mutlucell bakiyesi" value={data?.providerBalance === null || data?.providerBalance === undefined ? "—" : data.providerBalance.toLocaleString("tr-TR")} hint="kalan kredi (canlı)" tone={data?.providerBalance !== null && data?.providerBalance !== undefined && data.providerBalance < 500 ? "red" : "neutral"} />
        <StatCard icon={Coins} label="Bu ay işletme SMS'i" value={(data?.totals.used ?? 0).toLocaleString("tr-TR")} hint={data ? `${data.periodKey} dönemi` : ""} />
        <StatCard icon={MessageSquareWarning} label="Kotası dolan" value={data?.totals.exhausted ?? 0} hint={`${data?.totals.low ?? 0} işletme %80'i aştı`} tone={data?.totals.exhausted ? "red" : "neutral"} onClick={() => setFilter("exhausted")} active={filter === "exhausted"} />
        <StatCard icon={PackagePlus} label="SMS paketi geliri (bu ay)" value={money(data?.packs.monthRevenueKurus ?? 0)} hint={`${data?.packs.monthCount ?? 0} satış · ${(data?.packs.monthSms ?? 0).toLocaleString("tr-TR")} SMS · toplam ${money(data?.packs.allTimeRevenueKurus ?? 0)}`} tone="green" />
      </StatGrid>

      <Card title="İşletme SMS kullanımı" description={`Bu ayki kullanım, paket kotası ve ek krediler · bekleyen ek kredi toplamı ${(data?.totals.extraOutstanding ?? 0).toLocaleString("tr-TR")}`} icon={Building2}
        action={<span className={s.usageActions}>
          <Btn size="sm" icon={Download} onClick={exportCsv} disabled={!rows.length}>CSV</Btn>
          <IconBtn label="Yenile" icon={RefreshCw} spinning={loading} onClick={() => void load()} />
        </span>}>
        <div className={s.usageToolbar}>
          <SearchField value={search} onChange={setSearch} placeholder="İşletme, şehir veya paket ara" shortcut={false} label="İşletme ara" />
          <Chips options={filters} value={filter} onChange={setFilter} label="Kullanım filtresi" />
        </div>
        {loading && !data ? <SkeletonList rows={4} height={56} />
          : rows.length === 0 ? <EmptyState icon={Building2} title={data?.rows.length ? "Filtreye uyan işletme yok" : "Henüz SMS gönderen işletme yok"} description="İşletmeler ilk randevu SMS'ini gönderdiğinde burada görünür." />
          : <ResponsiveTable
              label="İşletme SMS kullanımı"
              rows={rows}
              rowKey={(row) => row.businessId}
              maxHeight="520px"
              columns={[
                { key: "name", header: "İşletme", cell: (row) => <span className={s.usageName}><b>{row.businessName}</b><small>{row.city || "—"}</small></span> },
                { key: "plan", header: "Paket", cell: (row) => row.planLabel },
                { key: "used", header: "Bu ay", cell: (row) => <UsageMeter row={row} />, width: 180 },
                { key: "extra", header: "Ek kredi", align: "right", cell: (row) => row.extraBalance.toLocaleString("tr-TR") },
                { key: "status", header: "Durum", cell: (row) => <Pill tone={STATUS[row.status].tone} dot>{STATUS[row.status].label}</Pill> },
                { key: "action", header: "", align: "right", cell: (row) => <Btn size="sm" icon={Gift} onClick={() => { setTarget(row); setDelta("100"); setReason(""); }}>Kredi</Btn> },
              ]}
              renderCard={(row) => (
                <div className={s.usageCard}>
                  <span className={s.usageName}><b>{row.businessName}</b><small>{row.planLabel} · {row.city || "—"}</small></span>
                  <UsageMeter row={row} />
                  <span className={s.usageCardFoot}>
                    <Pill tone={STATUS[row.status].tone} dot>{STATUS[row.status].label}</Pill>
                    <small>Ek kredi {row.extraBalance.toLocaleString("tr-TR")}</small>
                    <Btn size="sm" icon={Gift} onClick={() => { setTarget(row); setDelta("100"); setReason(""); }}>Kredi</Btn>
                  </span>
                </div>
              )}
            />}
      </Card>

      <Sheet open={target !== null} onClose={() => setTarget(null)} busy={saving} width={460}
        title={target ? `${target.businessName} · SMS kredisi` : "SMS kredisi"}
        description="Ek kredi ay sonunda silinmez; aylık kota bitince kullanılır. Düşmek için eksi değer girin. İşlem denetim kaydına yazılır."
        footer={<><Btn onClick={() => setTarget(null)} disabled={saving}>Vazgeç</Btn><Btn variant="primary" icon={Gift} loading={saving} onClick={() => void saveAdjustment()}>Kaydet</Btn></>}>
        {target ? (
          <div className={s.adjustForm}>
            <p className={s.adjustNow}>Şu anki ek kredi: <b>{target.extraBalance.toLocaleString("tr-TR")}</b> · Bu ay: <b>{target.used.toLocaleString("tr-TR")}{target.quota !== null ? ` / ${target.quota.toLocaleString("tr-TR")}` : ""}</b></p>
            <div className={s.adjustPresets}>
              {[50, 100, 250, 500].map((value) => <button key={value} type="button" className={s.adjustPreset} data-active={delta === String(value) || undefined} onClick={() => setDelta(String(value))}>+{value}</button>)}
            </div>
            <label className={s.adjustField}>
              <span>Kredi miktarı</span>
              <input type="number" inputMode="numeric" value={delta} onChange={(event) => setDelta(event.target.value)} data-autofocus />
            </label>
            <label className={s.adjustField}>
              <span>Açıklama</span>
              <input value={reason} onChange={(event) => setReason(event.target.value)} maxLength={200} placeholder="Ör. teslim edilmeyen SMS telafisi" />
            </label>
          </div>
        ) : null}
      </Sheet>
    </>
  );
}
