"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { updateBusiness } from "@/features/businesses/business-repository";
import { useBusinessContext } from "@/features/businesses/business-context";
import { subscribeLiveFeatureAvailability } from "@/features/platform/platform-settings-repository";
import type { Business } from "@/types/business";

type Setting = "availabilityAlertsEnabled" | "lastMinuteSlotsEnabled";

export function BusinessAvailabilitySettings({ business, onChanged }: {
  business: Business; onChanged: (setting: Setting, value: boolean) => void;
}) {
  const { access, refreshBusinesses } = useBusinessContext();
  const [global, setGlobal] = useState({ alerts: false, slots: false });
  const [saving, setSaving] = useState<Setting | null>(null);
  useEffect(() => subscribeLiveFeatureAvailability((flags) => setGlobal({
    alerts: flags.isAvailabilityAlertsEnabled, slots: flags.isLastMinuteSlotsEnabled,
  })), []);

  async function change(setting: Setting, value: boolean) {
    if (saving || access?.role === "staff" || !(setting === "availabilityAlertsEnabled" ? global.alerts : global.slots)) return;
    setSaving(setting);
    try {
      await updateBusiness(business.id, { [setting]: value });
      onChanged(setting, value);
      refreshBusinesses();
      toast.success(value ? "Özellik açıldı." : "Yeni talepler kapatıldı. Var olan kayıtlar silinmez.");
    } catch {
      toast.error("Ayar kaydedilemedi. Önceki durum korundu.");
    } finally { setSaving(null); }
  }

  const options: { key: Setting; label: string; enabled: boolean; available: boolean; description: string }[] = [
    { key: "availabilityAlertsEnabled", label: "Müsaitlik Bildirimleri", enabled: business.availabilityAlertsEnabled === true,
      available: global.alerts, description: "Müşteriler hizmet ve saat için haber alma talebi oluşturabilir." },
    { key: "lastMinuteSlotsEnabled", label: "Son Dakika Boşlukları", enabled: business.lastMinuteSlotsEnabled === true,
      available: global.slots, description: "İptal veya erteleme sonrası doğrulanmış yakın saatler gösterilebilir." },
  ];
  return <Card title="Canlı Müsaitlik" description="Bu ayarlar normal randevu takvimini değiştirmez.">
    <div className="space-y-4">{options.map((option) => <div key={option.key} className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border)] pb-4 last:border-b-0">
      <div><strong className="text-sm text-[var(--text-1)]">{option.label} · {option.enabled ? "Açık" : "Kapalı"}</strong>
        <p className="mt-1 text-xs text-[var(--text-3)]">{option.available ? option.description : "Platform genelinde şu anda kullanılamıyor."}</p></div>
      <Button type="button" variant={option.enabled ? "secondary" : "primary"}
        disabled={!option.available || saving !== null || access?.role === "staff"} loading={saving === option.key}
        onClick={() => void change(option.key, !option.enabled)}>
        {option.enabled ? "Kapat" : "Aç"}
      </Button>
    </div>)}</div>
  </Card>;
}
