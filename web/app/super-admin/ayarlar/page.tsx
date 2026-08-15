"use client";

import { Card } from "@/components/ui/card";

export default function SuperAdminSettingsPage() {
  return (
    <div className="space-y-4">
      <Card title="Platform Ayarları" description="Genel platform konfigürasyonu">
        <div className="space-y-4">
          <SettingRow label="Platform Adı" value="RandevuGo" />
          <SettingRow label="Destek E-posta" value="destek@randevugo.com" />
          <SettingRow label="Varsayılan Zaman Dilimi" value="Europe/Istanbul" />
          <SettingRow label="Varsayılan Para Birimi" value="TRY" />
          <SettingRow label="Varsayılan Plan" value="FREE" />
        </div>
      </Card>
      <Card title="Sistem Durumu" description="Platform durum kontrolleri">
        <div className="space-y-4">
          <StatusRow label="Bakım Modu" active={false} />
          <StatusRow label="Yeni Kayıt" active={true} />
          <StatusRow label="Online Booking" active={true} />
        </div>
      </Card>
    </div>
  );
}

function SettingRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-3">
      <span className="text-sm text-[var(--text-3)]">{label}</span>
      <span className="text-sm font-medium text-[var(--text-1)]">{value}</span>
    </div>
  );
}

function StatusRow({ label, active }: { label: string; active: boolean }) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-3">
      <span className="text-sm text-[var(--text-3)]">{label}</span>
      <span
        className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
          active ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"
        }`}
      >
        {active ? "Aktif" : "Kapalı"}
      </span>
    </div>
  );
}
