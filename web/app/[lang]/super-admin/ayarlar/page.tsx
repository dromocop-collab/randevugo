"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { AdminButton, AdminPage, Badge, EmptyState, PageHeader, Panel, SegmentedControl, SkeletonList } from "@/components/super-admin/ui";
import styles from "./settings.module.css";
import {
  getPlatformSettings,
  updatePlatformSettings,
  updateLiveFeatureFlags,
} from "@/features/platform/platform-settings-repository";
import { LIVE_FEATURE_KEYS, type LiveFeatureFlags } from "@/features/platform/live-feature-flags";
import type { PlatformSettings } from "@/types/platform";
import { Activity, Blocks, Check, CheckCircle2, Globe2, Megaphone, PlugZap, RotateCcw, Save, Search, Settings2, Share2, type LucideIcon } from "lucide-react";

const FEATURE_FLAG_LABELS: Record<string, string> = {
  allowAnonymousReviews: "Girişsiz Yorum (isim yeterli)",
  showPricingPage: "Fiyatlar Sayfası Aktif",
  showDiscoveryPage: "Keşfet Sayfası Aktif",
  liveFeaturesMaster: "Canlı Özellikler",
  liveAvailability: "Şimdi Müsait",
  liveQueue: "Canlı Sıra",
  lastMinuteSlots: "Boşluk Yakala",
  availabilityAlerts: "Müsait Olunca Haber Ver",
  liveOperations: "Canlı Operasyon",
};

const LIVE_FEATURE_FLAG_KEYS = new Set<string>(LIVE_FEATURE_KEYS);

function settingsInput(value: PlatformSettings) {
  return {
    platformName: value.platformName,
    supportEmail: value.supportEmail,
    supportPhone: value.supportPhone,
    defaultTimezone: value.defaultTimezone,
    defaultCurrency: value.defaultCurrency,
    maintenanceMode: value.maintenanceMode,
    registrationOpen: value.registrationOpen,
    bookingOpen: value.bookingOpen,
    defaultPlan: value.defaultPlan,
    featureFlags: Object.fromEntries(Object.entries(value.featureFlags).filter(([key]) => !LIVE_FEATURE_FLAG_KEYS.has(key))),
    seo: value.seo,
    social: value.social,
    announcement: value.announcement,
    analytics: value.analytics,
  };
}

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
  { key: "genel", label: "Genel", icon: Settings2 },
  { key: "sistem", label: "Sistem Durumu", icon: Activity },
  { key: "ozellikler", label: "Özellikler", icon: Blocks },
  { key: "canli", label: "Canlı Özellikler", icon: Activity },
  { key: "seo", label: "SEO & Marka", icon: Search },
  { key: "iletisim", label: "İletişim & Sosyal", icon: Share2 },
  { key: "duyuru", label: "Duyuru Banner", icon: Megaphone },
  { key: "entegrasyon", label: "Entegrasyonlar", icon: PlugZap },
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
    <div className={styles.toggleRow} data-on={checked || undefined}>
      <div className="min-w-0">
        <p className={styles.toggleLabel}>{label}</p>
        {description && <p className={styles.toggleDesc}>{description}</p>}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
        className={styles.switch}
      >
        <span>{checked && <Check size={12} strokeWidth={3} />}</span>
      </button>
    </div>
  );
}

export default function SuperAdminSettingsPage() {
  const [settings, setSettings] = useState<PlatformSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState<TabKey>("genel");
  const [savedSettings, setSavedSettings] = useState<PlatformSettings | null>(null);
  const [justSaved, setJustSaved] = useState(false);
  const dirty = Boolean(settings && savedSettings && JSON.stringify(settings) !== JSON.stringify(savedSettings));

  useEffect(() => {
    getPlatformSettings()
      .then((value) => { setSettings(value); setSavedSettings(structuredClone(value)); })
      .catch(() => setLoadError(true))
      .finally(() => setLoading(false));
  }, []);

  async function reloadSettings() {
    setLoading(true);
    setLoadError(false);
    try {
      const value = await getPlatformSettings();
      setSettings(value);
      setSavedSettings(structuredClone(value));
    } catch {
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }

  function setFeatureFlag(key: string, value: boolean) {
    if (!settings) return;
    if (key === "liveFeaturesMaster" && !value && settings.featureFlags.liveFeaturesMaster === true &&
      !window.confirm("Canlı özellikler devre dışı kalacak. Normal randevu sistemi etkilenmez. Devam edilsin mi?")) return;
    setSettings({ ...settings, featureFlags: { ...settings.featureFlags, [key]: value } });
  }

  async function handleSave() {
    if (!settings || !savedSettings || saving) return;
    const regularInput = settingsInput(settings);
    const regularChanged = JSON.stringify(regularInput) !== JSON.stringify(settingsInput(savedSettings));
    const liveChanges = Object.fromEntries(LIVE_FEATURE_KEYS
      .filter((key) => settings.featureFlags[key] !== savedSettings.featureFlags[key])
      .map((key) => [key, settings.featureFlags[key] === true])) as Partial<LiveFeatureFlags>;
    setSaving(true);
    try {
      if (regularChanged) await updatePlatformSettings(regularInput);
      if (Object.keys(liveChanges).length > 0) await updateLiveFeatureFlags(liveChanges);
      setSavedSettings(structuredClone(settings));
      setJustSaved(true);
      window.setTimeout(() => setJustSaved(false), 1800);
      toast.success("Platform ayarları kaydedildi.");
    } catch {
      try {
        const persisted = await getPlatformSettings();
        setSettings(persisted);
        setSavedSettings(structuredClone(persisted));
      } catch {
        setSettings(structuredClone(savedSettings));
      }
      toast.error("Kaydetme başarısız oldu. Ayarlar son kayıtlı duruma döndürüldü.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <AdminPage><PageHeader eyebrow="Platform yapılandırması" title="Ayarlar" icon={Globe2} description="Platform ayarları yükleniyor…" /><SkeletonList rows={4} height={72} /></AdminPage>;
  }

  if (loadError || !settings) {
    return <AdminPage><Panel><EmptyState icon={Settings2} title="Platform ayarları yüklenemedi" description="Canlı özellikler kapalı kalır. Ayarları yeniden yüklemeyi deneyin." action={<AdminButton variant="primary" onClick={() => void reloadSettings()}>Yeniden dene</AdminButton>} /></Panel></AdminPage>;
  }

  return (
    <AdminPage>
      <PageHeader
        eyebrow="Platform yapılandırması"
        title="Ayarlar"
        description="Platform davranışını, görünürlüğünü, iletişim kanallarını ve entegrasyonlarını güvenle yapılandırın."
        icon={Globe2}
        meta={<Badge tone={dirty ? "amber" : "green"} icon={dirty ? Activity : CheckCircle2}>{dirty ? "Kaydedilmemiş değişiklikler" : "Tüm ayarlar güncel"}</Badge>}
      />
      <SegmentedControl<TabKey>
        ariaLabel="Platform ayar bölümleri"
        value={tab}
        onChange={setTab}
        options={TABS.map((t) => ({ value: t.key, label: t.label, icon: t.icon as LucideIcon }))}
      />

      <div className={styles.tabContent} key={tab}>

      {tab === "genel" && (
        <Panel
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
        </Panel>
      )}

      {tab === "sistem" && (
        <Panel title="Sistem Durumu" description="Platform genelinde anlık durum kontrolleri">
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
        </Panel>
      )}

      {tab === "ozellikler" && (
        <Panel title="Özellik Bayrakları (Feature Flags)" description="Platform genelindeki özellikleri aç/kapat">
          <div className="space-y-3">
            {Object.entries(settings.featureFlags).filter(([key]) => !LIVE_FEATURE_FLAG_KEYS.has(key)).map(([key, value]) => (
              <ToggleRow
                key={key}
                label={FEATURE_FLAG_LABELS[key] ?? key}
                checked={value}
                onChange={(v) => setFeatureFlag(key, v)}
              />
            ))}
          </div>
        </Panel>
      )}

      {tab === "canli" && (
        <Panel title="Canlı Özellikler" description="Canlı modülleri platform genelinde yönetin">
          <div className="space-y-3">
            <div className="pt-1">
              <h3 className="text-sm font-semibold text-[var(--text-1)]">CANLI ÖZELLİKLER</h3>
              <p className="mt-1 text-xs text-[var(--text-3)]">Ana kontrol ve modül tercihleri birlikte değerlendirilir. Normal randevu sistemi etkilenmez.</p>
            </div>
            <ToggleRow
              label="Ana Kontrol — Canlı Özellikler"
              description="Kapalıyken aşağıdaki modüllerin kayıtlı tercihleri korunur, ancak hiçbiri etkin sayılmaz."
              checked={settings.featureFlags.liveFeaturesMaster === true}
              onChange={(value) => setFeatureFlag("liveFeaturesMaster", value)}
            />
            <p className="text-xs font-semibold text-[var(--text-3)]">MODÜLLER</p>
            {LIVE_FEATURE_KEYS.filter((key) => key !== "liveFeaturesMaster").map((key) => (
              <ToggleRow
                key={key}
                label={FEATURE_FLAG_LABELS[key]}
                description={settings.featureFlags.liveFeaturesMaster === true
                  ? "İşletme katılımı ve uygunluk koşulları da geçerlidir."
                  : "Ana kontrol kapalı; bu tercih kayıtlı olsa da modül etkin değildir."}
                checked={settings.featureFlags[key] === true}
                onChange={(value) => setFeatureFlag(key, value)}
              />
            ))}
          </div>
        </Panel>
      )}

      {tab === "seo" && (
        <Panel title="SEO & Marka" description="Arama motorlarında ve paylaşımlarda görünecek varsayılan bilgiler">
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
        </Panel>
      )}

      {tab === "iletisim" && (
        <Panel title="İletişim & Sosyal Medya" description="Site genelinde kullanılan sosyal medya bağlantıları">
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
        </Panel>
      )}

      {tab === "duyuru" && (
        <Panel
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
        </Panel>
      )}

      {tab === "entegrasyon" && (
        <Panel
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
        </Panel>
      )}
      </div>

      <div className={styles.savebar} role="region" aria-label="Kaydetme">
        <div className={styles.saveText}><span className={dirty ? styles.dotDirty : styles.dot} aria-hidden /><p><b>{dirty ? "Değişiklikler kaydedilmeyi bekliyor" : justSaved ? "Ayarlar başarıyla güncellendi" : "Yapılandırma güncel"}</b><small>{dirty ? "Yayınlamak için değişiklikleri kaydedin." : "Platform son kaydedilen ayarlarla çalışıyor."}</small></p></div>
        <div className={styles.saveActions}>
          {dirty && savedSettings && <AdminButton variant="ghost" icon={RotateCcw} onClick={() => setSettings(structuredClone(savedSettings))}>Geri al</AdminButton>}
          <AdminButton variant="primary" icon={justSaved ? CheckCircle2 : Save} loading={saving} disabled={!dirty} onClick={() => void handleSave()}>{saving ? "Kaydediliyor" : justSaved ? "Kaydedildi" : "Kaydet"}</AdminButton>
        </div>
      </div>
    </AdminPage>
  );
}
