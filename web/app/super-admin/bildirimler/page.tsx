"use client";

import { useEffect, useMemo, useState } from "react";
import { FirebaseError } from "firebase/app";
import {
  Activity, AlertTriangle, BellRing, CalendarClock, CheckCircle2, ChevronRight,
  LayoutTemplate, LoaderCircle, Megaphone, RefreshCw, Rocket, Send,
  ShieldCheck, Smartphone, Sparkles, TicketCheck, UsersRound, X,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { LoadingState } from "@/components/ui/states";
import {
  getPlatformPushOperations, sendPlatformPush,
  type PlatformPushOperations, type PushCategory, type PushDestination, type PushPlatform,
} from "@/features/notifications/platform-push-repository";

type Template = {
  id: string;
  name: string;
  description: string;
  title: string;
  body: string;
  category: PushCategory;
  destination: PushDestination;
  icon: typeof BellRing;
  accent: string;
};

const templates: Template[] = [
  {
    id: "appointment_reminder", name: "Randevu hatırlatma", description: "Yaklaşan randevuları hatırlatır.",
    title: "Randevunu unutma", body: "Yaklaşan randevunun ayrıntılarını uygulamadan kontrol edebilirsin.",
    category: "service", destination: "appointments", icon: CalendarClock, accent: "bg-sky-100 text-sky-700",
  },
  {
    id: "queue_update", name: "Canlı sıra", description: "Kullanıcıyı sıra ekranına yönlendirir.",
    title: "Canlı sıran seni bekliyor", body: "Sıra durumunu ve güncel bekleme bilgisini uygulamadan takip edebilirsin.",
    category: "service", destination: "queue", icon: TicketCheck, accent: "bg-emerald-100 text-emerald-700",
  },
  {
    id: "new_businesses", name: "Yeni işletmeler", description: "Keşfet alanına geri çağırır.",
    title: "Yeni işletmeler seni bekliyor", body: "Yakınındaki yeni işletmeleri ve hizmetleri şimdi keşfet.",
    category: "campaign", destination: "discover", icon: Sparkles, accent: "bg-violet-100 text-violet-700",
  },
  {
    id: "last_minute", name: "Son dakika fırsatı", description: "Yeni açılan saatleri duyurur.",
    title: "Yeni bir müsaitlik açıldı", body: "Sana uygun son dakika randevu saatlerini şimdi incele.",
    category: "campaign", destination: "discover", icon: Rocket, accent: "bg-orange-100 text-orange-700",
  },
];

const destinationLabels: Record<PushDestination, string> = {
  discover: "Keşfet", appointments: "Randevularım", queue: "Sıram", account: "Hesabım",
};

const platformLabels: Record<PushPlatform, string> = { all: "iOS + Android", ios: "iOS", android: "Android" };

function errorMessage(error: unknown) {
  if (error instanceof FirebaseError) return error.message.replace(/^Firebase:\s*/i, "");
  if (error instanceof Error) return error.message;
  return "Bildirim işlemi tamamlanamadı.";
}

function StatusPill({ status }: { status: string }) {
  const style = status === "sent" ? "bg-emerald-100 text-emerald-800"
    : status === "partial" ? "bg-amber-100 text-amber-800" : "bg-slate-100 text-slate-700";
  const label = status === "sent" ? "Gönderildi" : status === "partial" ? "Kısmi" : status === "no_recipients" ? "Alıcı yok" : "Bilinmiyor";
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ${style}`}>{label}</span>;
}

export default function NotificationCenterPage() {
  const [operations, setOperations] = useState<PlatformPushOperations | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [sending, setSending] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState("appointment_reminder");
  const [platform, setPlatform] = useState<PushPlatform>("all");
  const [category, setCategory] = useState<PushCategory>("service");
  const [destination, setDestination] = useState<PushDestination>("appointments");
  const [title, setTitle] = useState(templates[0].title);
  const [body, setBody] = useState(templates[0].body);

  async function refresh(silent = false) {
    if (!silent) setRefreshing(true);
    try { setOperations(await getPlatformPushOperations()); }
    catch (error) { toast.error(errorMessage(error)); }
    finally { if (!silent) setRefreshing(false); }
  }

  useEffect(() => {
    getPlatformPushOperations()
      .then(setOperations)
      .catch((error) => toast.error(errorMessage(error)))
      .finally(() => setLoading(false));
  }, []);

  const targetCount = useMemo(() => {
    if (!operations) return 0;
    return platform === "ios" ? operations.summary.ios : platform === "android" ? operations.summary.android : operations.summary.total;
  }, [operations, platform]);

  const valid = title.trim().length > 0 && body.trim().length > 0 && title.length <= 80 && body.length <= 500;

  function applyTemplate(template: Template) {
    setSelectedTemplate(template.id);
    setTitle(template.title); setBody(template.body);
    setCategory(template.category); setDestination(template.destination);
  }

  async function submit() {
    if (!valid || sending) return;
    setSending(true);
    try {
      const result = await sendPlatformPush({
        title: title.trim(), body: body.trim(), platform, category, destination,
        templateId: selectedTemplate || "custom",
      });
      setConfirming(false);
      await refresh(true);
      if (result.recipients === 0) toast.warning("Uygun ve izinli bildirim alıcısı bulunamadı.");
      else if (result.failureCount > 0) toast.warning(`${result.successCount} cihaza ulaştı, ${result.failureCount} gönderim başarısız oldu.`);
      else toast.success(`${result.successCount} cihaza bildirim gönderildi.`);
    } catch (error) {
      toast.error(errorMessage(error));
    } finally { setSending(false); }
  }

  if (loading) return <LoadingState title="Bildirim Merkezi hazırlanıyor" description="iOS ve Android cihazları kontrol ediliyor..." />;

  return (
    <div className="space-y-5">
      <section className="relative overflow-hidden rounded-[30px] bg-[radial-gradient(circle_at_82%_15%,rgba(190,242,100,.28),transparent_28%),linear-gradient(125deg,#071f19,#064e3b_55%,#0f766e)] px-6 py-7 text-white shadow-xl shadow-emerald-950/15 sm:px-8">
        <div className="absolute -bottom-24 -right-12 h-64 w-64 rounded-full border border-white/10" />
        <div className="relative flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
          <div className="max-w-2xl">
            <span className="mb-4 inline-flex items-center gap-2 rounded-full border border-lime-200/25 bg-lime-300/10 px-3 py-1 text-[11px] font-semibold tracking-[.18em] text-lime-200"><BellRing size={14} /> BİLDİRİM KOMUTA MERKEZİ</span>
            <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Doğru mesajı, doğru cihaza gönder.</h1>
            <p className="mt-3 max-w-xl text-sm leading-6 text-emerald-50/75">Hazır şablon kullan, iOS ve Android hedefini seç, göndermeden önce mobil önizlemeyi kontrol et.</p>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center">
            {(["total", "ios", "android"] as const).map((key) => <div key={key} className="min-w-24 rounded-2xl border border-white/15 bg-white/10 px-4 py-3"><small className="block text-[10px] font-semibold uppercase tracking-wider text-white/55">{key === "total" ? "Toplam" : key}</small><b className="mt-1 block text-xl">{operations?.summary[key] ?? 0}</b></div>)}
          </div>
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-[1.15fr_.85fr]">
        <div className="space-y-5">
          <article className="rounded-[26px] border border-[var(--border)] bg-[var(--bg-1)] p-5 shadow-lg shadow-[var(--shadow-hard)] sm:p-6">
            <div className="flex items-center justify-between gap-3"><div className="flex items-center gap-3"><span className="grid h-11 w-11 place-items-center rounded-2xl bg-emerald-100 text-emerald-700"><LayoutTemplate size={21} /></span><div><h2 className="font-semibold text-[var(--text-1)]">Hazır şablonlar</h2><p className="text-xs text-[var(--text-3)]">Metni seçtikten sonra düzenleyebilirsin.</p></div></div><span className="rounded-full bg-[var(--surface-2)] px-3 py-1 text-xs text-[var(--text-3)]">{templates.length} şablon</span></div>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {templates.map((template) => {
                const Icon = template.icon; const active = selectedTemplate === template.id;
                return <button key={template.id} type="button" onClick={() => applyTemplate(template)} aria-pressed={active} className={`flex items-start gap-3 rounded-2xl border p-4 text-left transition hover:-translate-y-0.5 ${active ? "border-emerald-500 bg-emerald-50 ring-2 ring-emerald-500/10" : "border-[var(--border)] bg-[var(--surface-1)] hover:border-emerald-300"}`}><span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${template.accent}`}><Icon size={19} /></span><span className="min-w-0"><b className="block text-sm text-[var(--text-1)]">{template.name}</b><small className="mt-1 block leading-5 text-[var(--text-3)]">{template.description}</small></span>{active && <CheckCircle2 className="ml-auto shrink-0 text-emerald-600" size={17} />}</button>;
              })}
            </div>
          </article>

          <article className="rounded-[26px] border border-[var(--border)] bg-[var(--bg-1)] p-5 shadow-lg shadow-[var(--shadow-hard)] sm:p-6">
            <div className="flex items-center gap-3"><span className="grid h-11 w-11 place-items-center rounded-2xl bg-sky-100 text-sky-700"><Megaphone size={21} /></span><div><h2 className="font-semibold text-[var(--text-1)]">Mesaj içeriği</h2><p className="text-xs text-[var(--text-3)]">Başlık ve açıklama her iki platformda aynı gönderilir.</p></div></div>
            <div className="mt-5 space-y-4">
              <label className="block"><span className="mb-2 flex justify-between text-sm font-medium text-[var(--text-1)]"><span>Başlık</span><small className={title.length > 80 ? "text-rose-600" : "text-[var(--text-3)]"}>{title.length}/80</small></span><input value={title} maxLength={80} onChange={(event) => { setTitle(event.target.value); setSelectedTemplate("custom"); }} className="w-full rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] px-4 py-3.5 text-[var(--text-1)] outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10" /></label>
              <label className="block"><span className="mb-2 flex justify-between text-sm font-medium text-[var(--text-1)]"><span>Mesaj</span><small className={body.length > 500 ? "text-rose-600" : "text-[var(--text-3)]"}>{body.length}/500</small></span><textarea value={body} maxLength={500} rows={4} onChange={(event) => { setBody(event.target.value); setSelectedTemplate("custom"); }} className="w-full resize-none rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] px-4 py-3.5 leading-6 text-[var(--text-1)] outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10" /></label>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block"><span className="mb-2 block text-sm font-medium text-[var(--text-1)]">Bildirim türü</span><select value={category} onChange={(event) => setCategory(event.target.value as PushCategory)} className="w-full rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] px-4 py-3.5 text-sm text-[var(--text-1)] outline-none focus:border-emerald-500"><option value="service">Hizmet bildirimi</option><option value="campaign">Kampanya bildirimi</option></select></label>
                <label className="block"><span className="mb-2 block text-sm font-medium text-[var(--text-1)]">Dokununca açılacak alan</span><select value={destination} onChange={(event) => setDestination(event.target.value as PushDestination)} className="w-full rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] px-4 py-3.5 text-sm text-[var(--text-1)] outline-none focus:border-emerald-500">{Object.entries(destinationLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
              </div>
              {category === "campaign" && <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-900"><ShieldCheck className="mt-0.5 shrink-0" size={18} /><p className="text-xs leading-5"><b className="block text-sm">İzinli pazarlama gönderimi</b>Yalnızca kampanya bildirimlerine açıkça izin veren kullanıcılar alıcı listesine eklenir.</p></div>}
            </div>
          </article>
        </div>

        <div className="space-y-5">
          <article className="rounded-[26px] border border-[var(--border)] bg-[var(--bg-1)] p-5 shadow-lg shadow-[var(--shadow-hard)] sm:p-6">
            <div className="flex items-center gap-3"><span className="grid h-11 w-11 place-items-center rounded-2xl bg-violet-100 text-violet-700"><Smartphone size={21} /></span><div><h2 className="font-semibold text-[var(--text-1)]">Hedef platform</h2><p className="text-xs text-[var(--text-3)]">Cihaz kaydındaki gerçek işletim sistemine göre seçilir.</p></div></div>
            <div className="mt-5 grid grid-cols-3 gap-2">
              {(["all", "ios", "android"] as PushPlatform[]).map((item) => <button key={item} type="button" aria-pressed={platform === item} onClick={() => setPlatform(item)} className={`rounded-2xl border px-2 py-3 text-sm font-semibold transition ${platform === item ? "border-emerald-500 bg-emerald-600 text-white shadow-md shadow-emerald-900/15" : "border-[var(--border)] bg-[var(--surface-1)] text-[var(--text-2)] hover:border-emerald-300"}`}>{item === "all" ? "Tümü" : item === "ios" ? "iOS" : "Android"}<small className={`mt-1 block font-normal ${platform === item ? "text-white/70" : "text-[var(--text-3)]"}`}>{item === "all" ? operations?.summary.total : item === "ios" ? operations?.summary.ios : operations?.summary.android} cihaz</small></button>)}
            </div>

            <div className="mx-auto mt-6 max-w-[330px] rounded-[34px] border-[7px] border-slate-900 bg-slate-900 p-1 shadow-2xl">
              <div className={`min-h-[300px] overflow-hidden rounded-[24px] p-4 ${platform === "android" ? "bg-[#e9f4ec]" : "bg-[linear-gradient(145deg,#dfe9f6,#f7f7fb)]"}`}>
                <div className="mx-auto mb-12 h-5 w-20 rounded-full bg-slate-900" />
                <div className={`rounded-2xl border border-white/70 bg-white/90 p-4 shadow-xl ${platform === "android" ? "rounded-[20px]" : "backdrop-blur-xl"}`}>
                  <div className="flex items-start gap-3"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-emerald-700 text-white"><BellRing size={19} /></span><div className="min-w-0 flex-1"><div className="flex justify-between gap-2"><b className="text-xs text-slate-900">SeninRandevun</b><small className="text-[10px] text-slate-400">şimdi</small></div><p className="mt-2 break-words text-sm font-semibold text-slate-950">{title || "Bildirim başlığı"}</p><p className="mt-1 break-words text-xs leading-5 text-slate-600">{body || "Bildirim açıklaması burada görünür."}</p></div></div>
                </div>
                <div className="mt-4 flex items-center justify-between rounded-xl bg-white/55 px-3 py-2 text-[10px] font-medium text-slate-600"><span>{platformLabels[platform]}</span><span className="flex items-center gap-1">{destinationLabels[destination]} <ChevronRight size={12} /></span></div>
              </div>
            </div>
          </article>

          <article className="rounded-[26px] border border-emerald-200 bg-emerald-50 p-5">
            <div className="flex items-start gap-3"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-emerald-600 text-white"><UsersRound size={19} /></span><div><p className="text-sm font-semibold text-emerald-950">Hedeflenen cihazlar</p><p className="mt-1 text-2xl font-semibold text-emerald-950">{targetCount}</p><p className="mt-1 text-xs leading-5 text-emerald-800/70">{category === "campaign" ? "Bu üst sınırdır; kampanya izni olmayanlar sunucuda çıkarılır." : "Etkin ve geçerli cihaz kayıtlarının güncel toplamıdır."}</p></div></div>
            <Button className="mt-5 w-full" disabled={!valid || targetCount === 0} onClick={() => setConfirming(true)}><Send size={17} /> Gönderimi kontrol et</Button>
          </article>
        </div>
      </section>

      <section className="rounded-[26px] border border-[var(--border)] bg-[var(--bg-1)] p-5 shadow-lg shadow-[var(--shadow-hard)] sm:p-6">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center"><div className="flex items-center gap-3"><span className="grid h-11 w-11 place-items-center rounded-2xl bg-slate-100 text-slate-700"><Activity size={21} /></span><div><h2 className="font-semibold text-[var(--text-1)]">Son gönderimler</h2><p className="text-xs text-[var(--text-3)]">Kişisel veri içermeyen teslim özeti.</p></div></div><button type="button" onClick={() => refresh()} disabled={refreshing} className="inline-flex items-center gap-2 self-start rounded-xl border border-[var(--border)] px-3 py-2 text-xs font-semibold text-[var(--text-2)] hover:bg-[var(--surface-2)] disabled:opacity-50"><RefreshCw size={14} className={refreshing ? "animate-spin" : ""} /> Yenile</button></div>
        <div className="mt-5 overflow-x-auto"><table className="w-full min-w-[760px] text-left text-sm"><thead className="border-b border-[var(--border)] text-[11px] uppercase tracking-wider text-[var(--text-3)]"><tr><th className="py-3">Bildirim</th><th>Platform</th><th>Tür</th><th>Alıcı</th><th>Teslim</th><th>Durum</th><th>Tarih</th></tr></thead><tbody>{operations?.rows.map((row) => <tr key={row.id} className="border-b border-[var(--border)]/70"><td className="max-w-[260px] py-3 pr-4"><b className="block truncate text-[var(--text-1)]">{row.title}</b><small className="mt-0.5 block truncate text-[var(--text-3)]">{row.body}</small></td><td className="font-medium text-[var(--text-2)]">{platformLabels[row.platform]}</td><td className="text-[var(--text-2)]">{row.category === "campaign" ? "Kampanya" : "Hizmet"}</td><td>{row.recipients}</td><td className="text-emerald-700">{row.successCount}</td><td><StatusPill status={row.status} /></td><td className="text-xs text-[var(--text-3)]">{row.createdAt ? new Date(row.createdAt).toLocaleString("tr-TR") : "—"}</td></tr>)}</tbody></table>{!operations?.rows.length && <p className="py-10 text-center text-sm text-[var(--text-3)]">İlk platform bildirimin gönderildiğinde teslim özeti burada görünecek.</p>}</div>
      </section>

      {confirming && <div className="fixed inset-0 z-[100] grid place-items-center bg-slate-950/60 p-4 backdrop-blur-sm" onMouseDown={(event) => { if (event.currentTarget === event.target && !sending) setConfirming(false); }}><section role="dialog" aria-modal="true" aria-labelledby="push-confirm-title" className="w-full max-w-lg rounded-[28px] bg-white p-6 shadow-2xl"><div className="flex items-start justify-between gap-4"><span className="grid h-12 w-12 place-items-center rounded-2xl bg-amber-100 text-amber-700"><AlertTriangle /></span><button type="button" onClick={() => setConfirming(false)} disabled={sending} aria-label="Pencereyi kapat" className="rounded-xl p-2 text-slate-500 hover:bg-slate-100"><X size={20} /></button></div><h2 id="push-confirm-title" className="mt-5 text-2xl font-semibold text-slate-950">Gönderimi onayla</h2><p className="mt-2 text-sm leading-6 text-slate-600">Bildirim <b>{platformLabels[platform]}</b> hedefindeki uygun cihazlara hemen gönderilecek. Bu işlem geri alınamaz.</p><div className="mt-5 space-y-2 rounded-2xl bg-slate-50 p-4 text-sm"><div className="flex justify-between gap-4"><span className="text-slate-500">Başlık</span><b className="max-w-[280px] text-right text-slate-900">{title}</b></div><div className="flex justify-between"><span className="text-slate-500">Tahmini üst sınır</span><b className="text-slate-900">{targetCount} cihaz</b></div><div className="flex justify-between"><span className="text-slate-500">Açılacak alan</span><b className="text-slate-900">{destinationLabels[destination]}</b></div></div><div className="mt-6 flex gap-3"><Button className="flex-1" variant="secondary" onClick={() => setConfirming(false)} disabled={sending}>Vazgeç</Button><Button className="flex-1" onClick={submit} disabled={sending}>{sending ? <LoaderCircle className="animate-spin" size={17} /> : <Send size={17} />}{sending ? "Gönderiliyor" : "Şimdi gönder"}</Button></div></section></div>}
    </div>
  );
}
