"use client";

import { useEffect, useState } from "react";
import Link from "@/i18n/link";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { updateBusiness } from "@/features/businesses/business-repository";
import { useBusinessContext } from "@/features/businesses/business-context";
import { subscribeLiveFeatureAvailability } from "@/features/platform/platform-settings-repository";
import { listLiveDiscovery } from "@/features/live-queue/customer-queue-repository";
import type { Business } from "@/types/business";
import { useT } from "@/i18n/client";

export function LiveQueueSettings({ business, onChanged }: { business: Business; onChanged: (enabled: boolean) => void }) {
  const t = useT();
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
      toast.success(enabled ? t("Canlı Sıra açıldı.") : t("Yeni canlı sıra katılımı kapatıldı. Mevcut kayıtlar korunur."));
    } catch {
      toast.error(t("Canlı Sıra ayarı kaydedilemedi. Önceki durum korundu."));
    } finally {
      setSaving(false);
    }
  }

  return <Card title={t("Canlı Sıra")} description={t("Yeni müşteri katılımını işletmeniz için yönetin.")}>
    <div className="flex flex-wrap items-center justify-between gap-4">
      <div><strong className="text-sm text-[var(--text-1)]">{business.liveQueueEnabled === true ? t("Açık") : t("Kapalı")}</strong>
        <p className="mt-1 text-xs text-[var(--text-3)]">{globallyAvailable
          ? t("Kapatıldığında mevcut sıra kayıtları silinmez; Canlı Operasyon ekranında tamamlanabilir.")
          : t("Canlı Sıra platform genelinde şu anda kullanılamıyor.")}</p></div>
      <Button type="button" variant={business.liveQueueEnabled ? "secondary" : "primary"}
        disabled={!globallyAvailable || saving || access?.role === "staff"} loading={saving}
        onClick={() => void change(business.liveQueueEnabled !== true)}>
        {business.liveQueueEnabled ? t("Canlı Sırayı Kapat") : t("Canlı Sırayı Aç")}
      </Button>
    </div>
    {business.liveQueueEnabled === true && globallyAvailable && <div className="mt-4 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-4 text-sm" role="status">
      <strong className="text-[var(--text-1)]">{t("Şimdi Müsait görünürlüğü")}</strong>
      <p className="mt-1 text-[var(--text-2)]">{!discoveryAvailable ? t("Şimdi Müsait genel kontrolü kapalı. Süper Admin bu özelliği açmalı.") :
        business.liveQueueIntakePaused ? t("Yeni müşteri alımı duraklatılmış. Canlı Operasyon'dan devam ettir.") :
        business.status !== "active" || business.isPublished !== true ? t("İşletme aktif ve yayında olmalı.") :
        checking ? t("Müşteri listesi kontrol ediliyor…") : listed === true ? t("İşletmen şu anda müşteri listesinde görünüyor.") :
        listed === false ? t("İşletmen şu anda listede görünmüyor. İşletme ve hizmeti verecek personelin çalışma saatleri aynı anda açık olmalı; uygun, online randevuya açık bir hizmet de bulunmalı. Ayarı yeni açtıysan birkaç saniye sonra yenile.") :
        t("Liste durumu alınamadı. Tekrar kontrol et.")}</p>
      {discoveryAvailable && !business.liveQueueIntakePaused && business.status === "active" && business.isPublished === true &&
        <button type="button" className="mt-2 text-xs font-semibold text-[var(--accent)] disabled:opacity-50" disabled={checking}
          onClick={() => setCheckVersion((value) => value + 1)}>{t("Görünürlüğü yenile")}</button>}
      {listed === false && <div className="mt-2 flex gap-4 text-xs font-semibold text-[var(--accent)]">
        <Link href="/dashboard/calisma-saatleri">{t("İşletme saatleri →")}</Link><Link href="/dashboard/calisanlar">{t("Personel saatleri →")}</Link><Link href="/dashboard/hizmetler">{t("Hizmetler →")}</Link>
      </div>}
    </div>}
    {globallyAvailable && <Link className="mt-4 inline-block text-sm font-semibold text-[var(--accent)]" href="/dashboard/canli-operasyon">
      {business.liveQueueEnabled ? t("Canlı Operasyona git →") : t("Mevcut sırayı yönet →")}</Link>}
  </Card>;
}
