"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { updateBusiness } from "@/features/businesses/business-repository";
import { useBusinessContext } from "@/features/businesses/business-context";
import { subscribeLiveFeatureAvailability } from "@/features/platform/platform-settings-repository";
import type { Business } from "@/types/business";

export function LiveQueueSettings({ business, onChanged }: { business: Business; onChanged: (enabled: boolean) => void }) {
  const { refreshBusinesses, access } = useBusinessContext();
  const [globallyAvailable, setGloballyAvailable] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => subscribeLiveFeatureAvailability((value) =>
    setGloballyAvailable(value.isLiveQueueEnabled && value.isLiveOperationsEnabled)), []);

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
    {globallyAvailable && <Link className="mt-4 inline-block text-sm font-semibold text-[var(--accent)]" href="/dashboard/canli-operasyon">
      {business.liveQueueEnabled ? "Canlı Operasyona git →" : "Mevcut sırayı yönet →"}</Link>}
  </Card>;
}
