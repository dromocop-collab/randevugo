"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  BadgeCheck, Check, ChevronRight, FileText, Info, LoaderCircle,
  LockKeyhole, Mail, MessageSquareText, Phone, RotateCcw, Save, ShieldCheck,
  SlidersHorizontal, Sparkles, UserRound,
} from "lucide-react";
import { LoadingState } from "@/components/ui/states";
import {
  getBookingFieldSettings,
  updateBookingFieldSettings,
  type BookingFieldSettings,
} from "@/features/booking/booking-field-settings-repository";

type OptionalField = "collectName" | "collectEmail" | "collectNotes";

const OPTIONAL_FIELDS: Array<{
  key: OptionalField;
  title: string;
  description: string;
  privacy: string;
  icon: typeof UserRound;
}> = [
  { key: "collectName", title: "Ad soyad", description: "Müşterinin görünen adını randevu ve takvim kayıtlarında kullanır.", privacy: "Kimlik bilgisi", icon: UserRound },
  { key: "collectEmail", title: "E-posta", description: "E-posta iletişimi ve gelecekteki bildirimler için adres toplar.", privacy: "İletişim bilgisi", icon: Mail },
  { key: "collectNotes", title: "Randevu notu", description: "Müşterinin işlem öncesi özel isteğini işletmeye iletmesini sağlar.", privacy: "Serbest metin", icon: MessageSquareText },
];

function SettingSwitch({ checked, label, onChange }: { checked: boolean; label: string; onChange: () => void }) {
  return <button type="button" role="switch" aria-checked={checked} aria-label={label} onClick={onChange} className={`relative h-8 w-14 shrink-0 rounded-full border transition-all duration-300 ${checked ? "border-cyan-300 bg-cyan-500 shadow-lg shadow-cyan-500/20" : "border-[var(--border)] bg-[var(--surface-2)]"}`}><span className={`absolute top-1 grid h-6 w-6 place-items-center rounded-full bg-white text-cyan-600 shadow transition-transform duration-300 ${checked ? "translate-x-7" : "translate-x-1"}`}>{checked && <Check size={13} strokeWidth={3}/>}</span></button>;
}

export default function BookingFieldsPage() {
  const [settings, setSettings] = useState<BookingFieldSettings | null>(null);
  const [saved, setSaved] = useState<BookingFieldSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getBookingFieldSettings()
      .then((value) => { setSettings(value); setSaved(value); })
      .catch(() => toast.error("Randevu alanı ayarları yüklenemedi."))
      .finally(() => setLoading(false));
  }, []);

  const dirty = Boolean(settings && saved && OPTIONAL_FIELDS.some(({ key }) => settings[key] !== saved[key]));
  const activeOptionalCount = useMemo(() => settings ? OPTIONAL_FIELDS.filter(({ key }) => settings[key]).length : 0, [settings]);

  function toggle(key: OptionalField) {
    if (!settings) return;
    setSettings({ ...settings, [key]: !settings[key] });
  }

  async function save() {
    if (!settings || !dirty) return;
    setSaving(true);
    try {
      await updateBookingFieldSettings(settings);
      setSaved({ ...settings });
      toast.success("Randevu formu ayarları canlı sisteme uygulandı.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Ayarlar kaydedilemedi.");
    } finally {
      setSaving(false);
    }
  }

  if (loading || !settings) return <LoadingState title="Randevu formu hazırlanıyor" description="Alan görünürlükleri güvenli sistemden okunuyor..."/>;

  return <div className="space-y-5 pb-24">
    <section className="relative overflow-hidden rounded-[30px] bg-[radial-gradient(circle_at_82%_18%,rgba(34,211,238,.25),transparent_28%),linear-gradient(125deg,#071a2b,#0b4560_58%,#0891b2)] p-6 text-white shadow-2xl shadow-cyan-950/20 sm:p-8">
      <div className="absolute -right-20 -top-24 h-72 w-72 rounded-full border border-white/10"/><div className="absolute right-16 top-10 h-24 w-24 rounded-full bg-cyan-300/10 blur-2xl"/>
      <div className="relative flex flex-col justify-between gap-7 lg:flex-row lg:items-end"><div className="max-w-2xl"><span className="inline-flex items-center gap-2 rounded-full border border-cyan-200/20 bg-white/10 px-3 py-1.5 text-[10px] font-black tracking-[.17em] text-cyan-100"><SlidersHorizontal size={14}/> RANDEVU DENEYİM MERKEZİ</span><h1 className="mt-5 text-3xl font-semibold tracking-tight sm:text-4xl">Müşteriden yalnızca ihtiyacınız olanı isteyin.</h1><p className="mt-3 max-w-xl text-sm leading-6 text-cyan-50/70">Alanları tek dokunuşla yönetin. Telefon doğrulaması her zaman açık kalır; kapattığınız bilgiler formda görünmez ve backend tarafından kaydedilmez.</p></div><div className="grid min-w-64 grid-cols-2 gap-2"><div className="rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur"><small className="text-[9px] font-bold tracking-wider text-white/55">AKTİF OPSİYON</small><b className="mt-1 block text-2xl">{activeOptionalCount}/3</b></div><div className="rounded-2xl border border-emerald-200/20 bg-emerald-300/10 p-4 backdrop-blur"><small className="text-[9px] font-bold tracking-wider text-emerald-100/70">DOĞRULAMA</small><b className="mt-1 flex items-center gap-1.5 text-sm"><BadgeCheck size={17}/> Zorunlu</b></div></div></div>
    </section>

    <section className="grid gap-5 xl:grid-cols-[1.05fr_.95fr]">
      <div className="space-y-3">
        <div className="rounded-[24px] border border-emerald-200 bg-emerald-50/70 p-5 shadow-sm dark:border-emerald-900/50 dark:bg-emerald-950/20"><div className="flex items-start gap-4"><span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-emerald-500 text-white shadow-lg shadow-emerald-500/20"><LockKeyhole size={22}/></span><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center justify-between gap-2"><div><p className="font-bold text-emerald-950 dark:text-emerald-100">Telefon + SMS doğrulaması</p><p className="mt-1 text-xs leading-5 text-emerald-800/70 dark:text-emerald-200/60">Sahte randevuları azaltır ve müşterinin numara sahipliğini doğrular.</p></div><span className="rounded-full bg-emerald-500 px-3 py-1.5 text-[9px] font-black tracking-wider text-white">HER ZAMAN AÇIK</span></div><div className="mt-4 flex items-center gap-2 text-[10px] font-semibold text-emerald-800 dark:text-emerald-200"><ShieldCheck size={14}/> Bu güvenlik alanı kapatılamaz.</div></div></div></div>
        {OPTIONAL_FIELDS.map(({ key, title, description, privacy, icon: Icon }, index) => <article key={key} className={`group rounded-[24px] border bg-[var(--surface-1)] p-5 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl ${settings[key] ? "border-cyan-300/70 shadow-cyan-500/5" : "border-[var(--border)] opacity-80"}`}><div className="flex items-start gap-4"><span className={`grid h-12 w-12 shrink-0 place-items-center rounded-2xl transition ${settings[key] ? "bg-gradient-to-br from-cyan-400 to-sky-600 text-white shadow-lg shadow-cyan-500/20" : "bg-[var(--surface-2)] text-[var(--text-3)]"}`}><Icon size={21}/></span><div className="min-w-0 flex-1"><div className="flex items-start justify-between gap-4"><div><span className="text-[9px] font-black tracking-[.14em] text-[var(--text-3)]">ALAN {String(index + 1).padStart(2, "0")} · {privacy.toLocaleUpperCase("tr-TR")}</span><h2 className="mt-1 font-bold text-[var(--text-1)]">{title}</h2></div><SettingSwitch checked={settings[key]} label={`${title} alanı`} onChange={() => toggle(key)}/></div><p className="mt-2 text-xs leading-5 text-[var(--text-3)]">{description}</p><div className={`mt-3 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[9px] font-bold ${settings[key] ? "bg-cyan-50 text-cyan-700 dark:bg-cyan-950/30 dark:text-cyan-300" : "bg-[var(--surface-2)] text-[var(--text-3)]"}`}>{settings[key] ? <><Check size={12}/> Formda gösteriliyor</> : <>Formdan ve kayıttan kaldırıldı</>}</div></div></div></article>)}
      </div>

      <aside className="h-fit overflow-hidden rounded-[28px] border border-[var(--border)] bg-[var(--surface-1)] shadow-xl xl:sticky xl:top-5"><header className="flex items-center justify-between border-b border-[var(--border)] bg-[var(--surface-2)]/70 p-5"><div><span className="text-[9px] font-black tracking-[.16em] text-cyan-600">CANLI ÖNİZLEME</span><h2 className="mt-1 font-bold text-[var(--text-1)]">Müşterinin göreceği form</h2></div><span className="grid h-10 w-10 place-items-center rounded-2xl bg-cyan-500 text-white"><Sparkles size={18}/></span></header><div className="relative p-5 sm:p-7"><div className="absolute inset-x-10 top-0 h-24 bg-cyan-400/10 blur-3xl"/><div className="relative rounded-[24px] border border-[var(--border)] bg-[var(--bg-1)] p-5 shadow-inner"><div className="mb-5 flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 text-white"><FileText size={18}/></span><div><b className="block text-sm text-[var(--text-1)]">İletişim bilgileriniz</b><small className="text-[10px] text-[var(--text-3)]">Randevu onayı için gerekli bilgiler</small></div></div><div className="space-y-3">{settings.collectName && <PreviewField icon={UserRound} label="Ad Soyad" placeholder="Adınız Soyadınız"/>}<PreviewField icon={Phone} label="Telefon" placeholder="05XX XXX XX XX" locked/>{settings.collectEmail && <PreviewField icon={Mail} label="E-posta" placeholder="ornek@mail.com"/>}{settings.collectNotes && <PreviewField icon={MessageSquareText} label="Not" placeholder="Eklemek istediğiniz not..." large/>}<div className="flex items-start gap-2 rounded-xl bg-[var(--surface-2)] p-3"><span className="mt-0.5 h-4 w-4 rounded border border-cyan-400"/><p className="text-[9px] leading-4 text-[var(--text-3)]">Kişisel verilerimin randevu oluşturma amacıyla işlenmesini kabul ediyorum.</p></div><button type="button" tabIndex={-1} className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-sky-600 py-3 text-xs font-bold text-white shadow-lg shadow-cyan-500/15">Devam et <ChevronRight size={15}/></button></div></div><div className="mt-4 flex items-start gap-2 rounded-2xl border border-sky-200 bg-sky-50 p-3 text-sky-900 dark:border-sky-900/50 dark:bg-sky-950/20 dark:text-sky-100"><Info className="mt-0.5 shrink-0" size={15}/><p className="text-[10px] leading-5">Telefon doğrulandıktan sonra randevu özeti gösterilir. Kapalı alanlar API isteğinden de çıkarılır.</p></div></div></aside>
    </section>

    <div className="fixed inset-x-3 bottom-[88px] z-30 mx-auto flex max-w-3xl items-center justify-between gap-3 rounded-[22px] border border-[var(--border)] bg-[color-mix(in_srgb,var(--surface-1)_92%,transparent)] p-3 shadow-2xl backdrop-blur-xl lg:bottom-5"><div className="hidden min-w-0 sm:block"><p className="text-xs font-bold text-[var(--text-1)]">{dirty ? "Kaydedilmemiş değişiklikler var" : "Canlı ayarlar güncel"}</p><p className="text-[9px] text-[var(--text-3)]">Değişiklikler tüm işletmelerin çevrimiçi randevu formuna uygulanır.</p></div><div className="ml-auto flex gap-2"><button type="button" disabled={!dirty || saving} onClick={() => saved && setSettings({ ...saved })} className="inline-flex items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface-1)] px-4 py-3 text-xs font-bold text-[var(--text-2)] disabled:opacity-40"><RotateCcw size={15}/> Geri al</button><button type="button" disabled={!dirty || saving} onClick={() => void save()} className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-sky-600 px-5 py-3 text-xs font-bold text-white shadow-lg shadow-cyan-500/20 disabled:opacity-45">{saving ? <LoaderCircle className="animate-spin" size={16}/> : <Save size={16}/>} {saving ? "Uygulanıyor" : "Kaydet ve yayınla"}</button></div></div>
  </div>;
}

function PreviewField({ icon: Icon, label, placeholder, locked = false, large = false }: { icon: typeof UserRound; label: string; placeholder: string; locked?: boolean; large?: boolean }) {
  return <div><div className="mb-1.5 flex items-center justify-between"><label className="flex items-center gap-1.5 text-[10px] font-bold text-[var(--text-2)]"><Icon size={12}/>{label}{locked && <span className="text-rose-500">*</span>}</label>{locked && <LockKeyhole size={11} className="text-emerald-500"/>}</div><div className={`rounded-xl border border-[var(--border)] bg-[var(--field-bg)] px-3 text-[11px] text-[var(--text-3)] ${large ? "min-h-20 py-3" : "py-3.5"}`}>{placeholder}</div></div>;
}
