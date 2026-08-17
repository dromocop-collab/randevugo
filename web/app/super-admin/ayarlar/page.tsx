"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { LoadingState } from "@/components/ui/states";
import {
  getPlatformSettings,
  updatePlatformSettings,
} from "@/features/platform/platform-settings-repository";
import type { PlatformSettings } from "@/types/platform";

const FEATURE_FLAG_LABELS: Record<string, string> = {
  allowAnonymousReviews: "Girişsiz Yorum (isim yeterli)",
  showPricingPage: "Fiyatlar Sayfası Aktif",
  showDiscoveryPage: "Keşfet Sayfası Aktif",
};

const SOCIAL_LABELS: { key: keyof PlatformSettings["social"]; label: string; placeholder: string }[] = [
  { key: "instagram", label: "Instagram", placeholder: "https://instagram.com/..." },
  { key: "facebook", label: "Facebook", placeholder: "https://facebook.com/..." },
  { key: "twitter", label: "X / Twitter", placeholder: "https://x.com/..." },
  { key: "tiktok", label: "TikTok", placeholder: "https://tiktok.com/@..." },
  { key: "youtube", label: "YouTube", placeholder: "https://youtube.com/@..." },
  { key: "linkedin", label: "LinkedIn", placeholder: "https://linkedin.com/company/..." },
  { key: "whatsapp", label: "WhatsApp", placeholder: "+90 5xx xxx xx xx" },
];

const TABS = [
  { key: "genel", label: "Genel", icon: "⚙️" },
  { key: "sistem", label: "Sistem Durumu", icon: "🚦" },
  { key: "ozellikler", label: "Özellikler", icon: "🧩" },
  { key: "seo", label: "SEO & Marka", icon: "🔎" },
  { key: "iletisim", label: "İletişim & Sosyal", icon: "📣" },
  { key: "duyuru", label: "Duyuru Banner", icon: "📢" },
  { key: "entegrasyon", label: "Entegrasyonlar", icon: "🔌" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

function ToggleRow({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-3">
      <div>
        <p className="text-sm font-medium text-[var(--text-1)]">{label}</p>
        {description && <p className="text-xs text-[var(--text-3)]">{description}</p>}
      </div>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={`relative h-6 w-11 shrink-0 rounded-full transition ${
          checked ? "bg-emerald-500" : "bg-[var(--border)]"
        }`}
      >
        <span
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
            checked ? "translate-x-5" : "translate-x-0.5"
          }`}
        />
      </button>
    </div>
  );
}

export default function SuperAdminSettingsPage() {
  const [settings, setSettings] = useState<PlatformSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState<TabKey>("genel");

  useEffect(() => {
    getPlatformSettings()
      .then(setSettings)
      .catch(() => toast.error("Platform ayarları yüklenemedi."))
      .finally(() => setLoading(false));
  }, []);

  async function handleSave() {
    if (!settings) return;
    setSaving(true);
    try {
      await updatePlatformSettings({
        platformName: settings.platformName,
        supportEmail: settings.supportEmail,
        supportPhone: settings.supportPhone,
        defaultTimezone: settings.defaultTimezone,
        defaultCurrency: settings.defaultCurrency,
        maintenanceMode: settings.maintenanceMode,
        registrationOpen: settings.registrationOpen,
        bookingOpen: settings.bookingOpen,
        defaultPlan: settings.defaultPlan,
        featureFlags: settings.featureFlags,
        seo: settings.seo,
        social: settings.social,
        announcement: settings.announcement,
        analytics: settings.analytics,
      });
      toast.success("Platform ayarları kaydedildi. Değişiklikler tüm siteye yansıyacak.");
    } catch {
      toast.error("Kaydetme başarısız oldu.");
    } finally {
      setSaving(false);
    }
  }

  if (loading || !settings) {
    return <LoadingState title="Yükleniyor" description="Platform ayarları çekiliyor..." />;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-medium transition ${
              tab === t.key
                ? "bg-[var(--accent)] text-white shadow-lg shadow-sky-500/25"
                : "bg-[var(--surface-2)] text-[var(--text-3)] hover:text-[var(--text-1)]"
            }`}
          >
            <span>{t.icon}</span>
            {t.label}
          </button>
        ))}
      </div>

      {tab === "genel" && (
        <Card
          title="Platform Ayarları"
          description="Genel platform konfigürasyonu — burada yapılan değişiklikler tüm sitede geçerli olur"
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Platform Adı"
              value={settings.platformName}
              onChange={(e) => setSettings({ ...settings, platformName: e.target.value })}
            />
            <Input
              label="Destek E-posta"
              type="email"
              value={settings.supportEmail}
              onChange={(e) => setSettings({ ...settings, supportEmail: e.target.value })}
            />
            <Input
              label="Destek Telefonu"
              value={settings.supportPhone ?? ""}
              onChange={(e) => setSettings({ ...settings, supportPhone: e.target.value })}
            />
            <Input
              label="Varsayılan Zaman Dilimi"
              value={settings.defaultTimezone}
              onChange={(e) => setSettings({ ...settings, defaultTimezone: e.target.value })}
            />
            <Input
              label="Varsayılan Para Birimi"
              value={settings.defaultCurrency}
              onChange={(e) => setSettings({ ...settings, defaultCurrency: e.target.value })}
            />
            <Input
              label="Varsayılan Plan"
              value={settings.defaultPlan}
              onChange={(e) => setSettings({ ...settings, defaultPlan: e.target.value })}
            />
          </div>
        </Card>
      )}

      {tab === "sistem" && (
        <Card title="Sistem Durumu" description="Platform genelinde anlık durum kontrolleri">
          <div className="space-y-3">
            <ToggleRow
              label="Bakım Modu"
              description="Açıldığında, süper admin dışındaki tüm ziyaretçiler bakım ekranı görür."
              checked={settings.maintenanceMode}
              onChange={(v) => setSettings({ ...settings, maintenanceMode: v })}
            />
            <ToggleRow
              label="Yeni Kayıt"
              description="Kapatıldığında /kayit sayfasından yeni işletme kaydı alınmaz."
              checked={settings.registrationOpen}
              onChange={(v) => setSettings({ ...settings, registrationOpen: v })}
            />
            <ToggleRow
              label="Online Booking"
              description="Kapatıldığında müşteriler yeni randevu oluşturamaz."
              checked={settings.bookingOpen}
              onChange={(v) => setSettings({ ...settings, bookingOpen: v })}
            />
          </div>
        </Card>
      )}

      {tab === "ozellikler" && (
        <Card title="Özellik Bayrakları (Feature Flags)" description="Platform genelindeki özellikleri aç/kapat">
          <div className="space-y-3">
            {Object.entries(settings.featureFlags).map(([key, value]) => (
              <ToggleRow
                key={key}
                label={FEATURE_FLAG_LABELS[key] ?? key}
                checked={value}
                onChange={(v) =>
                  setSettings({
                    ...settings,
                    featureFlags: { ...settings.featureFlags, [key]: v },
                  })
                }
              />
            ))}
          </div>
        </Card>
      )}

      {tab === "seo" && (
        <Card title="SEO & Marka" description="Arama motorlarında ve paylaşımlarda görünecek varsayılan bilgiler">
          <div className="space-y-4">
            <Input
              label="Meta Başlık (Title)"
              value={settings.seo.metaTitle}
              onChange={(e) => setSettings({ ...settings, seo: { ...settings.seo, metaTitle: e.target.value } })}
            />
            <label className="block space-y-2 text-sm text-[var(--text-2)]">
              <span>Meta Açıklama (Description)</span>
              <textarea
                rows={3}
                value={settings.seo.metaDescription}
                onChange={(e) =>
                  setSettings({ ...settings, seo: { ...settings.seo, metaDescription: e.target.value } })
                }
                className="w-full rounded-xl border border-[var(--border)] bg-[var(--field-bg)] px-3 py-2.5 text-sm text-[var(--text-1)] outline-none transition focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--ring)]"
              />
            </label>
            <Input
              label="Anahtar Kelimeler (virgülle ayırın)"
              value={settings.seo.metaKeywords}
              onChange={(e) => setSettings({ ...settings, seo: { ...settings.seo, metaKeywords: e.target.value } })}
            />
          </div>
        </Card>
      )}

      {tab === "iletisim" && (
        <Card title="İletişim & Sosyal Medya" description="Site genelinde kullanılan sosyal medya bağlantıları">
          <div className="grid gap-4 sm:grid-cols-2">
            {SOCIAL_LABELS.map(({ key, label, placeholder }) => (
              <Input
                key={key}
                label={label}
                placeholder={placeholder}
                value={settings.social[key] ?? ""}
                onChange={(e) =>
                  setSettings({ ...settings, social: { ...settings.social, [key]: e.target.value } })
                }
              />
            ))}
          </div>
        </Card>
      )}

      {tab === "duyuru" && (
        <Card
          title="Duyuru Banner"
          description="Etkinleştirildiğinde tüm sitenin üstünde herkese görünen bir bildirim şeridi çıkar"
        >
          <div className="space-y-4">
            <ToggleRow
              label="Banner Aktif"
              checked={settings.announcement.enabled}
              onChange={(v) => setSettings({ ...settings, announcement: { ...settings.announcement, enabled: v } })}
            />
            <Input
              label="Mesaj"
              value={settings.announcement.message}
              placeholder="Örn: 🎉 Yılbaşına özel %20 indirim! Hemen dene."
              onChange={(e) =>
                setSettings({ ...settings, announcement: { ...settings.announcement, message: e.target.value } })
              }
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                label="Bağlantı Metni (opsiyonel)"
                value={settings.announcement.linkText ?? ""}
                placeholder="Detaylar"
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    announcement: { ...settings.announcement, linkText: e.target.value },
                  })
                }
              />
              <Input
                label="Bağlantı URL (opsiyonel)"
                value={settings.announcement.linkUrl ?? ""}
                placeholder="/fiyatlar"
                onChange={(e) =>
                  setSettings({ ...settings, announcement: { ...settings.announcement, linkUrl: e.target.value } })
                }
              />
            </div>
          </div>
        </Card>
      )}

      {tab === "entegrasyon" && (
        <Card
          title="Entegrasyonlar"
          description="Analitik ve pazarlama entegrasyonları — kimlik alanlarını doldurun, script otomatik yüklenir"
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Google Analytics ID"
              placeholder="G-XXXXXXXXXX"
              value={settings.analytics.googleAnalyticsId ?? ""}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  analytics: { ...settings.analytics, googleAnalyticsId: e.target.value },
                })
              }
            />
            <Input
              label="Google Tag Manager ID"
              placeholder="GTM-XXXXXXX"
              value={settings.analytics.googleTagManagerId ?? ""}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  analytics: { ...settings.analytics, googleTagManagerId: e.target.value },
                })
              }
            />
            <Input
              label="Facebook Pixel ID"
              placeholder="123456789012345"
              value={settings.analytics.facebookPixelId ?? ""}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  analytics: { ...settings.analytics, facebookPixelId: e.target.value },
                })
              }
            />
          </div>
        </Card>
      )}

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? "Kaydediliyor..." : "💾 Değişiklikleri Kaydet"}
        </Button>
      </div>
    </div>
  );
}
