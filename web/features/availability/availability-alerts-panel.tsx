"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { doc, getDoc } from "firebase/firestore";
import { toast } from "sonner";
import { BellRing, LoaderCircle } from "lucide-react";
import { getDb } from "@/lib/firebase/firestore";
import { cancelAvailabilityAlert, listMyAvailabilityAlerts, type AvailabilityAlert } from "./availability-repository";

type Row = AvailabilityAlert & { businessName: string; serviceName: string; staffName: string; slug: string };

export function AvailabilityAlertsPanel({ uid }: { uid: string }) {
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
          return { businessName: String(business.data()?.name ?? "İşletme"),
            serviceName: String(service.data()?.name ?? "Hizmet"),
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
      toast.success("Müsaitlik bildirimi kapatıldı.");
    } catch { toast.error("Bildirim kapatılamadı. Tekrar deneyin."); }
    finally { setBusy(null); }
  }

  return <section aria-label="Müsaitlik bildirimleri">
    <div className="account-section-head"><div><span>MÜSAİTLİK BİLDİRİMLERİ</span><h2>Haber beklediğin saatler.</h2></div></div>
    {loading ? <p className="p-5 text-sm text-[var(--text-3)]"><LoaderCircle className="inline animate-spin" size={17} /> Bildirimler yükleniyor…</p>
      : error ? <p className="p-5 text-sm text-[var(--text-3)]">Bağlantı kurulamadı. Sayfayı yenileyip tekrar deneyin.</p>
        : rows.length === 0 ? <div className="account-empty-premium"><BellRing size={28} /><h3>Açık müsaitlik bildirimin yok.</h3>
          <p>İşletme randevu sayfasında istediğin tarih ve saat için haber alma talebi oluşturabilirsin.</p>
          <Link href="/kesfet">İşletme keşfet</Link></div>
          : <div className="space-y-3">{rows.map((row) => <article key={row.id}
            className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] p-5">
            <div><strong className="text-[var(--text-1)]">{row.businessName} · {row.serviceName}</strong>
              <p className="text-sm text-[var(--text-3)]">{row.staffName || "Uygun personel"} · {row.dateKey} ·
                {` ${String(Math.floor(row.startMinute / 60)).padStart(2, "0")}:${String(row.startMinute % 60).padStart(2, "0")}–${String(Math.floor(row.endMinute / 60)).padStart(2, "0")}:${String(row.endMinute % 60).padStart(2, "0")}`}</p>
              <small>{row.status === "matched" ? "Uygunluk bildirildi; saat rezerve edilmedi." : "Uygunluk bekleniyor."}</small></div>
            <div className="flex gap-2">{row.slug && <Link href={`/isletme/${row.slug}/randevu?service=${row.serviceId}${row.staffId ? `&staff=${row.staffId}` : ""}&date=${row.dateKey}`}
              className="rounded-xl border border-[var(--border)] px-3 py-2 text-sm font-semibold">Saatleri gör</Link>}
              <button type="button" onClick={() => void cancel(row.id)} disabled={busy !== null}
                className="rounded-xl border border-[var(--border)] px-3 py-2 text-sm font-semibold disabled:opacity-50">
                {busy === row.id ? "Kapatılıyor…" : "Bildirimi kapat"}</button></div>
          </article>)}</div>}
  </section>;
}
