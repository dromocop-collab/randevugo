"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { FirebaseError } from "firebase/app";
import { toast } from "sonner";
import { CircleAlert, Download, FileCheck2, FileClock, ReceiptText, RefreshCw, Undo2, Wallet } from "lucide-react";
import { listAdminPayments, markPaymentInvoice, type AdminPaymentRow } from "@/features/subscriptions/admin-payments-repository";
import {
  AdminPage, Btn, Card, Chips, CopyButton, DetailList, EmptyState, HeroStat, PageHeader, Pill, ResponsiveTable, SearchField, Sheet, SkeletonList,
  StatCard, StatGrid, downloadCsv, type Tone,
} from "../_pages-ui";
import { GibAssistant } from "./gib-assistant";
import s from "./odemeler.module.css";

type Filter = "pending" | "issued" | "paid" | "failed" | "test";

const money = (kurus: number) => `${(kurus / 100).toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₺`;
const dateText = (iso: string | null) => iso ? new Date(iso).toLocaleDateString("tr-TR", { day: "2-digit", month: "2-digit", year: "numeric" }) : "—";
const todayIso = () => new Date().toLocaleDateString("en-CA", { timeZone: "Europe/Istanbul" });

function errorMessage(error: unknown) {
  if (error instanceof FirebaseError) return error.message.replace(/^Firebase:\s*/i, "");
  return error instanceof Error ? error.message : "İşlem tamamlanamadı.";
}

/** Faturada görünecek hizmet açıklaması. */
function itemText(row: AdminPaymentRow) {
  return row.kind === "sms_pack"
    ? `SeninRandevun ek SMS kredisi (${(row.smsCount ?? 0).toLocaleString("tr-TR")} SMS)`
    : `SeninRandevun ${row.label} paketi (${row.billingCycle === "yearly" ? "1 yıl" : "1 ay"} kullanım)`;
}

function statusPill(row: AdminPaymentRow): { label: string; tone: Tone } {
  if (row.status === "paid") return row.invoice.status === "issued" ? { label: "Faturalandı", tone: "green" } : { label: "Fatura bekliyor", tone: "amber" };
  if (row.status === "pending") return { label: "Ödeme bekleniyor", tone: "neutral" };
  if (row.status === "amount_mismatch") return { label: "Tutar uyuşmadı", tone: "red" };
  return { label: "Başarısız", tone: "red" };
}

export default function PaymentsPage() {
  const [rows, setRows] = useState<AdminPaymentRow[]>([]);
  const [provider, setProvider] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>("pending");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<AdminPaymentRow | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await listAdminPayments();
      setRows(result.rows); setProvider(result.einvoiceProvider);
      setSelected((current) => current ? result.rows.find((row) => row.merchantOid === current.merchantOid) ?? null : null);
    } catch (error) { toast.error(errorMessage(error)); } finally { setLoading(false); }
  }, []);
  useEffect(() => { queueMicrotask(() => { void load(); }); }, [load]);

  const live = rows.filter((row) => !row.testMode);
  const paid = live.filter((row) => row.status === "paid");
  const monthKey = todayIso().slice(0, 7);
  const monthPaid = paid.filter((row) => (row.paidAt ?? "").slice(0, 7) === monthKey);
  const pendingInvoices = paid.filter((row) => row.invoice.status !== "issued");

  const filtered = useMemo(() => {
    const q = search.trim().toLocaleLowerCase("tr-TR");
    return rows.filter((row) => {
      if (filter === "test") { if (!row.testMode) return false; }
      else if (row.testMode) return false;
      if (filter === "pending" && !(row.status === "paid" && row.invoice.status !== "issued")) return false;
      if (filter === "issued" && row.invoice.status !== "issued") return false;
      if (filter === "paid" && row.status !== "paid") return false;
      if (filter === "failed" && ["paid", "pending"].includes(row.status)) return false;
      return !q || [row.businessName, row.billing?.name, row.billing?.taxId, row.merchantOid, row.invoice.number].some((value) => (value ?? "").toLocaleLowerCase("tr-TR").includes(q));
    });
  }, [rows, filter, search]);

  function exportCsv() {
    downloadCsv(`odemeler-${monthKey}.csv`, [
      ["Ödeme tarihi", "Ödeme no", "İşletme", "Fatura türü", "Unvan / Ad soyad", "VKN / TCKN", "Vergi dairesi", "Adres", "E-posta", "Açıklama", "Matrah (₺)", "KDV oranı", "KDV (₺)", "Toplam (₺)", "Fatura no", "Fatura tarihi"],
      ...filtered.map((row) => [
        dateText(row.paidAt ?? row.createdAt), row.merchantOid, row.businessName,
        row.billing ? (row.billing.type === "company" ? "Kurumsal" : "Bireysel") : "", row.billing?.name ?? "", row.billing?.taxId ?? "", row.billing?.taxOffice ?? "",
        row.billing ? [row.billing.address, row.billing.district, row.billing.city].filter(Boolean).join(", ") : "", row.billing?.email ?? "",
        itemText(row), (row.vat.netKurus / 100).toFixed(2).replace(".", ","), `%${row.vat.rate}`, (row.vat.vatKurus / 100).toFixed(2).replace(".", ","),
        (row.vat.grossKurus / 100).toFixed(2).replace(".", ","), row.invoice.number ?? "", row.invoice.date ?? "",
      ]),
    ]);
  }

  const filters = [
    { value: "pending" as const, label: `Fatura bekleyen (${pendingInvoices.length})` },
    { value: "issued" as const, label: "Faturalanan" },
    { value: "paid" as const, label: "Tüm tahsilatlar" },
    { value: "failed" as const, label: "Başarısız / sorunlu" },
    { value: "test" as const, label: "Test ödemeleri" },
  ];

  return (
    <AdminPage>
      <PageHeader eyebrow="PayTR tahsilatları" icon={ReceiptText} title="Ödemeler ve faturalar"
        description="Her tamamlanan ödeme için e-Arşiv faturayı kesin ve burada işaretleyin. Fatura bilgileri ödeme anındaki haliyle saklanır."
        meta={<>
          <HeroStat label="bu ay tahsilat" value={money(monthPaid.reduce((sum, row) => sum + row.amountKurus, 0))} />
          <HeroStat label="fatura bekleyen" value={String(pendingInvoices.length)} />
          <HeroStat label="e-Arşiv" value={provider ? provider : "Elle"} />
        </>}
        actions={<Btn variant="lime" icon={RefreshCw} loading={loading} onClick={() => void load()}>Yenile</Btn>}
      />

      {!provider ? (
        <div className={s.notice} role="status">
          <CircleAlert size={18} aria-hidden />
          <p><b>e-Arşiv entegratörü bağlı değil.</b> Ödemenin detayını açın: GİB asistanı alanları portaldaki sırayla tek tıkla kopyalar. Faturayı kesince numarasını girip &quot;Faturalandı&quot; olarak işaretleyin. Entegratör bağlanınca bu sayfadan tek tıkla kesilecek.</p>
        </div>
      ) : null}

      <StatGrid cols={4}>
        <StatCard icon={Wallet} label="Bu ay (KDV dahil)" value={money(monthPaid.reduce((sum, row) => sum + row.amountKurus, 0))} hint={`${monthPaid.length} ödeme · KDV ${money(monthPaid.reduce((sum, row) => sum + row.vat.vatKurus, 0))}`} tone="green" />
        <StatCard icon={FileClock} label="Fatura bekleyen" value={pendingInvoices.length} hint={money(pendingInvoices.reduce((sum, row) => sum + row.amountKurus, 0))} tone={pendingInvoices.length ? "amber" : "neutral"} onClick={() => setFilter("pending")} active={filter === "pending"} />
        <StatCard icon={FileCheck2} label="Faturalanan" value={paid.length - pendingInvoices.length} hint="tüm zamanlar" onClick={() => setFilter("issued")} active={filter === "issued"} />
        <StatCard icon={CircleAlert} label="Sorunlu" value={live.filter((row) => !["paid", "pending"].includes(row.status)).length} hint="başarısız, tutar uyuşmazlığı" onClick={() => setFilter("failed")} active={filter === "failed"} />
      </StatGrid>

      <Card title="Ödemeler" description="En yeni 500 kayıt" icon={Wallet} action={<Btn size="sm" icon={Download} onClick={exportCsv} disabled={!filtered.length}>Muhasebe CSV</Btn>}>
        <div className={s.toolbar}>
          <SearchField value={search} onChange={setSearch} placeholder="İşletme, unvan, VKN/TCKN, ödeme veya fatura no" shortcut={false} label="Ödemelerde ara" />
          <Chips options={filters} value={filter} onChange={setFilter} label="Ödeme filtresi" />
        </div>
        {loading && !rows.length ? <SkeletonList rows={4} height={56} />
          : filtered.length === 0 ? <EmptyState icon={ReceiptText} title={filter === "pending" ? "Fatura bekleyen ödeme yok" : "Bu filtrede kayıt yok"} />
          : <ResponsiveTable
              label="Ödemeler"
              rows={filtered}
              rowKey={(row) => row.merchantOid}
              onRowClick={setSelected}
              maxHeight="600px"
              columns={[
                { key: "date", header: "Tarih", cell: (row) => dateText(row.paidAt ?? row.createdAt), width: 104 },
                { key: "business", header: "İşletme / fatura", cell: (row) => <span className={s.who}><b>{row.businessName}</b><small>{row.billing ? `${row.billing.name} · ${row.billingTaxIdMasked ?? ""}` : "Fatura bilgisi yok"}</small></span> },
                { key: "item", header: "Ürün", cell: (row) => row.kind === "sms_pack" ? `${(row.smsCount ?? 0).toLocaleString("tr-TR")} SMS` : `${row.label} · ${row.billingCycle === "yearly" ? "1 yıl" : "1 ay"}` },
                { key: "amount", header: "Tutar", align: "right", cell: (row) => <b className={s.num}>{money(row.amountKurus)}</b> },
                { key: "status", header: "Durum", cell: (row) => { const pill = statusPill(row); return <Pill tone={pill.tone} dot>{pill.label}{row.invoice.number ? ` · ${row.invoice.number}` : ""}</Pill>; } },
              ]}
              renderCard={(row) => {
                const pill = statusPill(row);
                return (
                  <span className={s.card}>
                    <span className={s.who}><b>{row.businessName}</b><small>{dateText(row.paidAt ?? row.createdAt)} · {row.kind === "sms_pack" ? `${row.smsCount} SMS` : row.label}</small></span>
                    <span className={s.cardFoot}><b className={s.num}>{money(row.amountKurus)}</b><Pill tone={pill.tone} dot>{pill.label}</Pill></span>
                  </span>
                );
              }}
            />}
      </Card>

      {selected ? <PaymentSheet row={selected} onClose={() => setSelected(null)} onChanged={() => void load()} /> : null}
    </AdminPage>
  );
}

function PaymentSheet({ row, onClose, onChanged }: { row: AdminPaymentRow; onClose: () => void; onChanged: () => void }) {
  const [number, setNumber] = useState(row.invoice.number ?? "");
  const [date, setDate] = useState(row.invoice.date ?? todayIso());
  const [url, setUrl] = useState(row.invoice.url ?? "");
  const [saving, setSaving] = useState(false);
  const billing = row.billing;
  const issued = row.invoice.status === "issued";
  const copy = (label: string, value: string) => ({ label, value: <span className={s.copyRow}><span>{value || "—"}</span>{value ? <CopyButton value={value} compact /> : null}</span> });

  async function submit(clear = false) {
    setSaving(true);
    try {
      await markPaymentInvoice(clear ? { merchantOid: row.merchantOid, clear: true } : { merchantOid: row.merchantOid, number: number.trim(), date, url: url.trim() || undefined });
      toast.success(clear ? "Fatura işareti kaldırıldı." : "Ödeme faturalandı olarak işaretlendi.");
      onChanged();
    } catch (error) { toast.error(errorMessage(error)); } finally { setSaving(false); }
  }

  return (
    <Sheet open onClose={onClose} busy={saving} width={560}
      title={`${row.businessName} · ${money(row.amountKurus)}`}
      description={`Ödeme no ${row.merchantOid} · ${dateText(row.paidAt ?? row.createdAt)}${row.testMode ? " · TEST" : ""}`}
      footer={row.status === "paid" ? (issued
        ? <><Btn onClick={onClose} disabled={saving}>Kapat</Btn><Btn icon={Undo2} loading={saving} onClick={() => void submit(true)}>İşareti kaldır</Btn></>
        : <><Btn onClick={onClose} disabled={saving}>Kapat</Btn><Btn variant="primary" icon={FileCheck2} loading={saving} onClick={() => void submit()}>Faturalandı olarak işaretle</Btn></>)
        : <Btn onClick={onClose}>Kapat</Btn>}>
      {billing && row.status === "paid" && !issued ? <GibAssistant row={row} item={itemText(row)} /> : null}
      <h3 className={s.sheetTitle}>Faturaya yazılacaklar</h3>
      {billing ? (
        <DetailList rows={[
          { label: "Fatura türü", value: billing.type === "company" ? "Kurumsal / şahıs şirketi (e-Arşiv; alıcı e-Fatura mükellefiyse e-Fatura kesilmeli)" : "Bireysel" },
          copy(billing.type === "company" ? "Unvan" : "Ad soyad", billing.name),
          copy(billing.type === "company" ? "VKN / TCKN" : "TCKN", billing.taxId),
          billing.taxOffice ? copy("Vergi dairesi", billing.taxOffice) : null,
          copy("Adres", [billing.address, billing.district, billing.city].filter(Boolean).join(", ")),
          copy("E-posta", billing.email),
          copy("Hizmet açıklaması", itemText(row)),
          copy("Matrah", (row.vat.netKurus / 100).toFixed(2).replace(".", ",")),
          { label: "KDV", value: `%${row.vat.rate} · ${money(row.vat.vatKurus)}` },
          { label: "Toplam (KDV dahil)", value: <b>{money(row.vat.grossKurus)}</b> },
        ]} />
      ) : (
        <p className={s.warn}><CircleAlert size={15} aria-hidden /> Bu ödeme fatura bilgisi zorunlu olmadan önce alındı. İşletmeden fatura bilgilerini isteyin.</p>
      )}

      {row.status === "paid" ? (
        issued ? (
          <>
            <h3 className={s.sheetTitle}>Fatura</h3>
            <DetailList rows={[
              { label: "Fatura no", value: row.invoice.number },
              { label: "Tarih", value: row.invoice.date },
              row.invoice.url ? { label: "Bağlantı", value: <a href={row.invoice.url} target="_blank" rel="noopener noreferrer">Faturayı aç</a> } : null,
              { label: "Yöntem", value: row.invoice.method === "manual" ? "Elle işaretlendi" : row.invoice.method ?? "—" },
            ]} />
          </>
        ) : (
          <div className={s.form}>
            <h3 className={s.sheetTitle}>Faturayı işaretle</h3>
            <label className={s.field}><span>Fatura no</span><input value={number} onChange={(event) => setNumber(event.target.value)} placeholder="Ör. GIB2026000000123" data-autofocus /></label>
            <label className={s.field}><span>Fatura tarihi</span><input type="date" value={date} onChange={(event) => setDate(event.target.value)} /></label>
            <label className={s.field}><span>PDF bağlantısı (isteğe bağlı)</span><input value={url} onChange={(event) => setUrl(event.target.value)} placeholder="https://…" /></label>
          </div>
        )
      ) : row.failedReason ? <p className={s.warn}><CircleAlert size={15} aria-hidden /> {row.failedReason}</p> : null}
    </Sheet>
  );
}
