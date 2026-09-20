"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { updateBusiness } from "@/features/businesses/business-repository";
import { useBusinessContext } from "@/features/businesses/business-context";
import { subscribeLiveFeatureAvailability } from "@/features/platform/platform-settings-repository";
import { listLiveDiscovery } from "@/features/live-queue/customer-queue-repository";
import type { Business } from "@/types/business";

export function LiveQueueSettings({ business, onChanged }: { business: Business; onChanged: (enabled: boolean) => void }) {
  const { refreshBusinesses, access } = useBusinessContext();
  const [globallyAvailable, setGloballyAvailable] = useState(false);
  const [discoveryAvailable, setDiscoveryAvailable] = useState(false);
  const [listed, setListed] = useState<boolean | null>(null);
  const [checking, setChecking] = useState(false);
  const [checkVersion, setCheckVersion] = useState(0);
  const [saving, setSaving] = useState(false);

  useEffect(() => subscribeLiveFeatureAvailability((value) => {
    setGloballyAvailable(value.isLiveQueueEnabled && value.isLiveOperationsEnabled);
    setDiscoveryAvailable(value.isLiveAvailabilityEnabled);
  }), []);

  useEffect(() => {
    if (!globallyAvailable || !discoveryAvailable || business.liveQueueEnabled !== true ||
      business.liveQueueIntakePaused === true || business.status !== "active" || business.isPublished !== true) return;
    let active = true;
    queueMicrotask(() => { if (active) { setChecking(true); setListed(null); } });
    listLiveDiscovery(business.id).then((rows) => { if (active) setListed(rows.some((row) => row.id === business.id)); })
      .catch(() => { if (active) setListed(null); })
      .finally(() => { if (active) setChecking(false); });
    return () => { active = false; };
  }, [business.id, business.liveQueueEnabled, business.liveQueueIntakePaused, business.status, business.isPublished,
    globallyAvailable, discoveryAvailable, checkVersion]);

  async function change(enabled: boolean) {
    if (!globallyAvailable || saving || !access || access.role === "staff") return;
    setSaving(true);
    try {
      await updateBusiness(business.id, { liveQueueEnabled: enabled });
      onChanged(enabled);
      refreshBusinesses();
      toast.success(enabled ? "Canlı Sıra açıldı." : "Yeni canlı sıra katılımı kapatıldı. Mevcut kayıtlar korunur.");
    } catch {
      toast.error("Canlı Sıra ayarı kaydedilemedi. Önceki durum korundu.");
    } finally {
      setSaving(false);
    }
  }

  return <Card title="Canlı Sıra" description="Yeni müşteri katılımını işletmeniz için yönetin.">
    <div className="flex flex-wrap items-center justify-between gap-4">
      <div><strong className="text-sm text-[var(--text-1)]">{business.liveQueueEnabled === true ? "Açık" : "Kapalı"}</strong>
        <p className="mt-1 text-xs text-[var(--text-3)]">{globallyAvailable
          ? "Kapatıldığında mevcut sıra kayıtları silinmez; Canlı Operasyon ekranında tamamlanabilir."
          : "Canlı Sıra platform genelinde şu anda kullanılamıyor."}</p></div>
      <Button type="button" variant={business.liveQueueEnabled ? "secondary" : "primary"}
        disabled={!globallyAvailable || saving || access?.role === "staff"} loading={saving}
        onClick={() => void change(business.liveQueueEnabled !== true)}>
        {business.liveQueueEnabled ? "Canlı Sırayı Kapat" : "Canlı Sırayı Aç"}
      </Button>
    </div>
    {business.liveQueueEnabled === true && globallyAvailable && <div className="mt-4 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-4 text-sm" role="status">
      <strong className="text-[var(--text-1)]">Şimdi Müsait görünürlüğü</strong>
      <p className="mt-1 text-[var(--text-2)]">{!discoveryAvailable ? "Şimdi Müsait genel kontrolü kapalı. Süper Admin bu özelliği açmalı." :
        business.liveQueueIntakePaused ? "Yeni müşteri alımı duraklatılmış. Canlı Operasyon'dan devam ettir." :
        business.status !== "active" || business.isPublished !== true ? "İşletme aktif ve yayında olmalı." :
        checking ? "Müşteri listesi kontrol ediliyor…" : listed === true ? "İşletmen şu anda müşteri listesinde görünüyor." :
        listed === false ? "İşletmen şu anda listede görünmüyor. İşletme ve hizmeti verecek personelin çalışma saatleri aynı anda açık olmalı; uygun, online randevuya açık bir hizmet de bulunmalı. Ayarı yeni açtıysan birkaç saniye sonra yenile." :
        "Liste durumu alınamadı. Tekrar kontrol et."}</p>
      {discoveryAvailable && !business.liveQueueIntakePaused && business.status === "active" && business.isPublished === true &&
        <button type="button" className="mt-2 text-xs font-semibold text-[var(--accent)] disabled:opacity-50" disabled={checking}
          onClick={() => setCheckVersion((value) => value + 1)}>Görünürlüğü yenile</button>}
      {listed === false && <div className="mt-2 flex gap-4 text-xs font-semibold text-[var(--accent)]">
        <Link href="/dashboard/calisma-saatleri">İşletme saatleri →</Link><Link href="/dashboard/calisanlar">Personel saatleri →</Link><Link href="/dashboard/hizmetler">Hizmetler →</Link>
      </div>}
    </div>}
    {globallyAvailable && <Link className="mt-4 inline-block text-sm font-semibold text-[var(--accent)]" href="/dashboard/canli-operasyon">
      {business.liveQueueEnabled ? "Canlı Operasyona git →" : "Mevcut sırayı yönet →"}</Link>}
  </Card>;
}
