"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Activity, BadgeCheck, CircleAlert, Eye, EyeOff, KeyRound,
  LoaderCircle, MessageSquareText, PhoneCall, RadioTower, Save, Send,
  ShieldCheck, Type,
} from "lucide-react";
import { FirebaseError } from "firebase/app";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LoadingState } from "@/components/ui/states";
import {
  getMutlucellSettings,
  testMutlucellSettings,
  updateMutlucellSettings,
  type MutlucellSettings,
} from "@/features/mutlucell/mutlucell-repository";

function errorMessage(error: unknown) {
  if (error instanceof FirebaseError) return error.message.replace(/^Firebase:\s*/i, "");
  if (error instanceof Error) return error.message;
  return "İşlem tamamlanamadı.";
}

function Switch({ checked, onChange, label }: { checked: boolean; onChange: (value: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`relative h-7 w-12 shrink-0 rounded-full transition ${checked ? "bg-emerald-500" : "bg-slate-300"}`}
    >
      <span className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-transform ${checked ? "translate-x-6" : "translate-x-1"}`} />
    </button>
  );
}

export default function SmsCenterPage() {
  const [settings, setSettings] = useState<MutlucellSettings | null>(null);
  const [apiKey, setApiKey] = useState("");
  const [testPhone, setTestPhone] = useState("");
  const [showApiKey, setShowApiKey] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);

  async function refresh() {
    const current = await getMutlucellSettings();
    setSettings(current);
  }

  useEffect(() => {
    getMutlucellSettings()
      .then(setSettings)
      .catch((error) => toast.error(errorMessage(error)))
      .finally(() => setLoading(false));
  }, []);

  const readiness = useMemo(() => {
    if (!settings) return { tone: "warn", title: "Kontrol ediliyor", detail: "Mutlucell bilgileri okunuyor." };
    if (!settings.username || !settings.hasApiKey) return { tone: "danger", title: "Kimlik bilgileri eksik", detail: "Kullanıcı adı ve API anahtarını tamamlayın." };
    if (!settings.senderTitle) return { tone: "warn", title: "Gönderici başlığı bekleniyor", detail: "Mutlucell tarafından onaylanan başlığı girin." };
    if (!settings.enabled) return { tone: "warn", title: "SMS gönderimi duraklatıldı", detail: "Kod fallback sistemi çalışmaya devam eder." };
    return { tone: "success", title: "Gönderime hazır", detail: "Kimlik bilgileri ve gönderici başlığı tanımlı." };
  }, [settings]);

  async function save() {
    if (!settings) return;
    setSaving(true);
    try {
      await updateMutlucellSettings({
        username: settings.username,
        apiKey: apiKey || undefined,
        senderTitle: settings.senderTitle,
        enabled: settings.enabled,
        fallbackEnabled: settings.fallbackEnabled,
      });
      setApiKey("");
      await refresh();
      toast.success("Mutlucell ayarları canlı sisteme kaydedildi.");
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setSaving(false);
    }
  }

  async function sendTest() {
    if (!testPhone.trim()) return toast.error("Test için telefon numarası girin.");
    setTesting(true);
    try {
      const result = await testMutlucellSettings(testPhone);
      await refresh();
      toast.success(`Test SMS'i gönderildi. Paket: ${result.providerMessageId}`);
    } catch (error) {
      await refresh().catch(() => undefined);
      toast.error(errorMessage(error));
    } finally {
      setTesting(false);
    }
  }

  if (loading || !settings) return <LoadingState title="SMS Merkezi hazırlanıyor" description="Mutlucell bağlantısı kontrol ediliyor..." />;

  const toneClass = readiness.tone === "success"
    ? "border-emerald-300 bg-emerald-50 text-emerald-900"
    : readiness.tone === "danger"
      ? "border-rose-300 bg-rose-50 text-rose-900"
      : "border-amber-300 bg-amber-50 text-amber-900";

  return (
    <div className="space-y-5">
      <section className="relative overflow-hidden rounded-[28px] bg-[linear-gradient(125deg,#082f24,#0c6847_58%,#21a66d)] px-6 py-7 text-white shadow-xl shadow-emerald-950/15 sm:px-8">
        <div className="absolute -right-16 -top-20 h-56 w-56 rounded-full border border-white/15 bg-white/5" />
        <div className="relative flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <div className="max-w-2xl">
            <span className="mb-4 inline-flex items-center gap-2 rounded-full border border-lime-200/25 bg-lime-300/10 px-3 py-1 text-[11px] font-semibold tracking-[.18em] text-lime-200">
              <RadioTower size={14} /> MUTLUCELL OPERASYON MERKEZİ
            </span>
            <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">SMS altyapısını tek ekrandan yönet.</h1>
            <p className="mt-3 max-w-xl text-sm leading-6 text-emerald-50/75">Kimlik bilgilerini güncelle, onaylı başlığı bağla ve canlı gönderimi müşteriye gitmeden önce test et.</p>
          </div>
          <div className="grid min-w-64 grid-cols-2 gap-2 text-xs">
            <div className="rounded-2xl border border-white/15 bg-white/10 p-3"><small className="text-white/60">SAĞLAYICI</small><b className="mt-1 block text-base">Mutlucell</b></div>
            <div className="rounded-2xl border border-white/15 bg-white/10 p-3"><small className="text-white/60">KAYNAK</small><b className="mt-1 block text-base">{settings.source === "admin" ? "Admin" : settings.source === "secret" ? "Secret" : "Eksik"}</b></div>
          </div>
        </div>
      </section>

      <div className={`flex items-start gap-3 rounded-2xl border p-4 ${toneClass}`}>
        {readiness.tone === "success" ? <BadgeCheck className="mt-0.5" /> : <CircleAlert className="mt-0.5" />}
        <div><p className="font-semibold">{readiness.title}</p><p className="text-sm opacity-75">{readiness.detail}</p></div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.35fr_.65fr]">
        <section className="rounded-[24px] border border-[var(--border)] bg-[var(--bg-1)] p-5 shadow-lg shadow-[var(--shadow-hard)] sm:p-6">
          <div className="mb-5 flex items-center gap-3"><span className="rounded-2xl bg-emerald-100 p-3 text-emerald-700"><ShieldCheck /></span><div><h2 className="font-semibold text-[var(--text-1)]">Bağlantı bilgileri</h2><p className="text-xs text-[var(--text-3)]">API anahtarı kaydedildikten sonra tekrar görüntülenmez.</p></div></div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="relative"><Input label="Mutlucell kullanıcı adı" value={settings.username} onChange={(event) => setSettings({ ...settings, username: event.target.value })} /><MessageSquareText className="pointer-events-none absolute right-3 top-9 text-[var(--text-3)]" size={17} /></div>
            <div className="relative"><Input label="Onaylı gönderici başlığı" placeholder="Örn. SENINRANDEVUN" value={settings.senderTitle} onChange={(event) => setSettings({ ...settings, senderTitle: event.target.value.toLocaleUpperCase("tr-TR") })} /><Type className="pointer-events-none absolute right-3 top-9 text-[var(--text-3)]" size={17} /></div>
            <div className="relative sm:col-span-2">
              <Input label={`API anahtarı ${settings.hasApiKey ? `(${settings.apiKeyMasked})` : ""}`} type={showApiKey ? "text" : "password"} placeholder={settings.hasApiKey ? "Değiştirmek istemiyorsanız boş bırakın" : "Mutlucell API anahtarını girin"} value={apiKey} onChange={(event) => setApiKey(event.target.value)} />
              <button type="button" aria-label={showApiKey ? "API anahtarını gizle" : "API anahtarını göster"} onClick={() => setShowApiKey(!showApiKey)} className="absolute right-3 top-8 rounded-lg p-1.5 text-[var(--text-3)] hover:bg-[var(--surface-2)]">{showApiKey ? <EyeOff size={18} /> : <Eye size={18} />}</button>
            </div>
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <div className="flex items-center justify-between rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-4"><div><p className="text-sm font-medium text-[var(--text-1)]">SMS gönderimi</p><p className="text-xs text-[var(--text-3)]">Canlı Mutlucell gönderimini açar.</p></div><Switch label="SMS gönderimi" checked={settings.enabled} onChange={(enabled) => setSettings({ ...settings, enabled })} /></div>
            <div className="flex items-center justify-between rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-4"><div><p className="text-sm font-medium text-[var(--text-1)]">Kod fallback</p><p className="text-xs text-[var(--text-3)]">SMS hatasında kodu ekranda gösterir.</p></div><Switch label="Kod fallback" checked={settings.fallbackEnabled} onChange={(fallbackEnabled) => setSettings({ ...settings, fallbackEnabled })} /></div>
          </div>
          <div className="mt-5 flex justify-end"><Button onClick={save} disabled={saving}>{saving ? <LoaderCircle className="animate-spin" size={17} /> : <Save size={17} />}{saving ? "Kaydediliyor" : "Ayarları kaydet"}</Button></div>
        </section>

        <section className="rounded-[24px] border border-[var(--border)] bg-[var(--bg-1)] p-5 shadow-lg shadow-[var(--shadow-hard)] sm:p-6">
          <div className="mb-5 flex items-center gap-3"><span className="rounded-2xl bg-sky-100 p-3 text-sky-700"><Activity /></span><div><h2 className="font-semibold text-[var(--text-1)]">Canlı bağlantı testi</h2><p className="text-xs text-[var(--text-3)]">Gerçek bir test SMS&apos;i gönderir.</p></div></div>
          <div className="relative"><Input label="Test telefonu" placeholder="05xx xxx xx xx" value={testPhone} onChange={(event) => setTestPhone(event.target.value)} /><PhoneCall className="pointer-events-none absolute right-3 top-9 text-[var(--text-3)]" size={17} /></div>
          <Button className="mt-4 w-full" onClick={sendTest} disabled={testing || !settings.enabled}>{testing ? <LoaderCircle className="animate-spin" size={17} /> : <Send size={17} />}{testing ? "Gönderiliyor" : "Test SMS'i gönder"}</Button>
          <div className="mt-5 rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-4">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[var(--text-3)]"><KeyRound size={14} /> Son test</div>
            {!settings.lastTest ? <p className="mt-3 text-sm text-[var(--text-3)]">Henüz bağlantı testi yapılmadı.</p> : settings.lastTest.success ? <div className="mt-3"><p className="font-medium text-emerald-600">Başarılı gönderim</p><p className="mt-1 break-all text-xs text-[var(--text-3)]">Paket: {settings.lastTest.providerMessageId}</p></div> : <div className="mt-3"><p className="font-medium text-rose-600">Test başarısız</p><p className="mt-1 text-xs leading-5 text-[var(--text-3)]">{settings.lastTest.error}</p></div>}
          </div>
        </section>
      </div>
    </div>
  );
}
