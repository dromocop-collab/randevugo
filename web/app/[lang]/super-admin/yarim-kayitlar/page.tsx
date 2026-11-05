"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { FirebaseError } from "firebase/app";
import { toast } from "sonner";
import {
  BellRing, CheckCircle2, Clock3, FileUp, MapPin, MessageCircle, Phone, Power, PowerOff, RotateCcw, Store, TriangleAlert, UserPlus, X,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { CATEGORY_CATALOG } from "@/components/marketing/category-catalog";
import { submitWhatsAppOnboardingTemplates } from "@/features/whatsapp/whatsapp-onboarding-repository";
import {
  formatLeadPhone, getSignupLeadSettings, leadWhatsAppLink, setSignupLeadStatus, subscribeSignupLeads, updateSignupLeadSettings,
  type SignupLead, type SignupLeadSettings, type SignupLeadStatus,
} from "@/features/platform/signup-leads-repository";
import {
  AdminPage, Btn, Card, Chips, EmptyState, ErrorBox, HeroStat, PageHeader, Pill, SkeletonList, fullDate, relativeTime, useNow, type Tone,
} from "../_pages-ui";
import s from "./yarim.module.css";

// Kayıt formunun 2. adımında (işletme adı + cep) bırakıp gidenler. Liste canlı; otomatik WhatsApp hatırlatması ayarla.

const STATUS: Record<SignupLeadStatus, { label: string; tone: Tone }> = {
  open: { label: "Açık", tone: "amber" },
  contacted: { label: "Ulaşıldı", tone: "blue" },
  converted: { label: "Kaydı tamamladı", tone: "green" },
  closed: { label: "Kapatıldı", tone: "neutral" },
};
const REMINDER: Record<string, { label: string; tone: Tone }> = {
  pending: { label: "Hatırlatma sırada", tone: "neutral" },
  sending: { label: "Hatırlatma gidiyor", tone: "blue" },
  sent: { label: "Hatırlatma gitti", tone: "green" },
  failed: { label: "Hatırlatma gitmedi", tone: "red" },
  skipped: { label: "Hatırlatma atlandı", tone: "neutral" },
};
const SKIP_REASON: Record<string, string> = {
  converted: "kaydı tamamladı", closed: "kapatıldı", already_sent: "zaten gönderildi", opted_out: "DUR dedi", too_old: "20 saatten eski",
};
const TEMPLATE_STATUS: Record<string, { label: string; tone: Tone }> = {
  APPROVED: { label: "Onaylı", tone: "green" }, PENDING: { label: "Meta inceliyor", tone: "amber" }, IN_APPEAL: { label: "İtirazda", tone: "amber" },
  REJECTED: { label: "Reddedildi", tone: "red" }, PAUSED: { label: "Duraklatıldı", tone: "red" }, DISABLED: { label: "Devre dışı", tone: "red" },
};

type Filter = "open" | "contacted" | "converted" | "closed" | "all";

function errorMessage(error: unknown) {
  if (error instanceof FirebaseError) return error.message.replace(/^Firebase:\s*/i, "");
  return error instanceof Error ? error.message : "İşlem tamamlanamadı.";
}

function categoryLabel(slug: string) {
  return CATEGORY_CATALOG.find((item) => item.slug === slug)?.label ?? (slug ? slug.replace(/-/g, " ") : "Kategori yok");
}

export default function SignupLeadsPage() {
  const { user } = useAuth();
  const now = useNow(30_000);
  const [rows, setRows] = useState<SignupLead[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>("open");
  const [busy, setBusy] = useState<string | null>(null);
  const [settings, setSettings] = useState<SignupLeadSettings | null>(null);
  const [settingsError, setSettingsError] = useState<string | null>(null);

  useEffect(() => subscribeSignupLeads((value) => { setRows(value); setError(null); }, (err) => setError(errorMessage(err))), []);

  // Yeni açılan fonksiyonun ilk çağrısı geçici hata verebiliyor ("internal"): bir kez kısa aralıkla yeniden dener.
  const loadSettings = useCallback(() => {
    const load = () => getSignupLeadSettings().then((value) => { setSettings(value); setSettingsError(null); });
    load().catch(() => new Promise((resolve) => window.setTimeout(resolve, 1500)).then(load)).catch((err) => setSettingsError(errorMessage(err)));
  }, []);
  useEffect(() => { loadSettings(); }, [loadSettings]);

  const counts = useMemo(() => {
    const list = rows ?? [];
    const by = (status: SignupLeadStatus) => list.filter((row) => row.status === status).length;
    const day = list.filter((row) => row.createdAt && now - row.createdAt < 86_400_000).length;
    return { open: by("open"), contacted: by("contacted"), converted: by("converted"), closed: by("closed"), all: list.length, day };
  }, [rows, now]);
  const shown = useMemo(() => (rows ?? []).filter((row) => filter === "all" || row.status === filter), [rows, filter]);
  const conversion = counts.all ? Math.round((counts.converted / counts.all) * 100) : 0;

  async function changeStatus(lead: SignupLead, status: Exclude<SignupLeadStatus, "converted">) {
    if (!user) return;
    setBusy(lead.id);
    try {
      await setSignupLeadStatus(lead.id, status, user.uid);
      toast.success(status === "contacted" ? "Ulaşıldı olarak işaretlendi." : status === "closed" ? "Kapatıldı." : "Yeniden açıldı.");
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(null);
    }
  }

  async function toggleReminder() {
    if (!settings) return;
    const next = !settings.settings.reminderEnabled;
    setBusy("settings");
    try {
      await updateSignupLeadSettings(next);
      setSettings({ ...settings, settings: { reminderEnabled: next } });
      toast.success(next ? "Otomatik hatırlatma açıldı." : "Otomatik hatırlatma kapatıldı.");
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(null);
    }
  }

  async function submitTemplate() {
    setBusy("template");
    try {
      const { results } = await submitWhatsAppOnboardingTemplates();
      const mine = results.find((item) => item.name === settings?.templateName);
      toast.success(mine ? `Şablon: ${mine.result}` : "Şablonlar gönderildi.");
      loadSettings();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(null);
    }
  }

  const templateStatus = settings?.template ? TEMPLATE_STATUS[settings.template.status] ?? { label: settings.template.status, tone: "neutral" as Tone } : null;
  const templateReady = settings?.template?.status === "APPROVED";

  return (
    <AdminPage>
      <PageHeader
        eyebrow="Kayıt hunisi" icon={UserPlus} title="Yarım kalan kayıtlar"
        description="Kayıt formunda işletme adını ve cep numarasını yazıp bitirmeden çıkanlar. Kayıt tamamlanınca kendiliğinden “Kaydı tamamladı” olur."
        meta={<>
          <HeroStat label="açık" value={rows ? counts.open : "…"} />
          <HeroStat label="son 24 saat" value={rows ? counts.day : "…"} />
          <HeroStat label="tamamlayan" value={rows ? `%${conversion}` : "…"} />
        </>}
      />

      <Card title="Otomatik WhatsApp hatırlatması" icon={BellRing}
        description="Kaydı yarıda bırakana 30 dakika sonra bir kez gider (20 saatten eski kayda gitmez, DUR diyene hiç gitmez). Hızlı yanıt düğmesi WhatsApp kayıt botunu başlatır."
        action={settings ? (
          <Btn variant={settings.settings.reminderEnabled ? "default" : "primary"} icon={settings.settings.reminderEnabled ? PowerOff : Power}
            loading={busy === "settings"} disabled={!settings.settings.reminderEnabled && !templateReady} onClick={() => void toggleReminder()}>
            {settings.settings.reminderEnabled ? "Kapat" : "Aç"}
          </Btn>
        ) : null}>
        {settingsError ? <ErrorBox message={settingsError} onRetry={loadSettings} /> : !settings ? <SkeletonList rows={1} height={90} /> : (
          <div className={s.settings}>
            <div className={s.settingsRow}>
              <Pill tone={settings.settings.reminderEnabled ? "green" : "neutral"} dot>{settings.settings.reminderEnabled ? "Açık" : "Kapalı"}</Pill>
              {templateStatus ? <Pill tone={templateStatus.tone}>Şablon {settings.templateName}: {templateStatus.label}</Pill> : <Pill tone="amber">Şablon {settings.templateName} Meta&apos;da yok</Pill>}
              {!settings.channelEnabled ? <Pill tone="red">WhatsApp kanalı kapalı</Pill> : null}
              {!settings.signupBotEnabled ? <Pill tone="amber">WhatsApp kayıt botu kapalı (hızlı yanıt cevapsız kalır)</Pill> : null}
              {!settings.template || settings.template.status === "REJECTED" ? (
                <Btn size="sm" icon={FileUp} loading={busy === "template"} onClick={() => void submitTemplate()}>Şablonu Meta&apos;ya gönder</Btn>
              ) : null}
            </div>
            {settings.templateError ? <p className={s.warn}><TriangleAlert size={14} aria-hidden /> {settings.templateError}</p> : null}
            {settings.template?.rejectedReason ? <p className={s.warn}><TriangleAlert size={14} aria-hidden /> Red sebebi: {settings.template.rejectedReason}</p> : null}
            {!templateReady ? <p className={s.hint}>Şablon onaylanınca (genelde birkaç saat) buradan açabilirsin. O zamana kadar listedeki “WhatsApp&apos;tan yaz” ile kendin ulaşabilirsin.</p> : null}
            <details className={s.preview}>
              <summary>Mesaj önizlemesi</summary>
              <p>{settings.preview}</p>
              <div className={s.previewButtons}>{settings.buttons.map((text) => <span key={text}>{text}</span>)}</div>
            </details>
          </div>
        )}
      </Card>

      <Chips label="Duruma göre süz" value={filter} onChange={setFilter} options={[
        { value: "open", label: "Açık", count: counts.open }, { value: "contacted", label: "Ulaşıldı", count: counts.contacted },
        { value: "converted", label: "Tamamladı", count: counts.converted }, { value: "closed", label: "Kapatıldı", count: counts.closed },
        { value: "all", label: "Tümü", count: counts.all },
      ]} />

      {error ? <ErrorBox message={error} /> : rows === null ? <SkeletonList rows={4} height={120} /> : shown.length === 0 ? (
        <EmptyState icon={UserPlus} title={filter === "open" ? "Açık yarım kayıt yok" : "Bu durumda kayıt yok"}
          description="Kayıt formunun 2. adımını geçip bitirmeyen işletmeler burada belirir." />
      ) : (
        <ul className={s.list}>
          {shown.map((lead) => {
            const status = STATUS[lead.status];
            const reminder = lead.reminderStatus ? REMINDER[lead.reminderStatus] : null;
            return (
              <li key={lead.id} className={s.row} data-status={lead.status}>
                <div className={s.main}>
                  <div className={s.title}>
                    <b>{lead.name}</b>
                    <Pill tone={status.tone} dot>{status.label}</Pill>
                  </div>
                  <div className={s.meta}>
                    <span><Store size={13} aria-hidden /> {categoryLabel(lead.category)}</span>
                    {lead.city ? <span><MapPin size={13} aria-hidden /> {lead.district ? `${lead.district}, ` : ""}{lead.city}</span> : null}
                    <span title={fullDate(lead.createdAt)}><Clock3 size={13} aria-hidden /> {relativeTime(lead.createdAt, now)}</span>
                    {lead.source ? <span className={s.source}>{lead.source}{lead.campaign ? ` · ${lead.campaign}` : ""}</span> : null}
                    {lead.attempts > 1 ? <span>{lead.attempts}. deneme</span> : null}
                  </div>
                  {reminder && lead.status !== "converted" ? (
                    <small className={s.reminder}>
                      <Pill tone={reminder.tone}>{reminder.label}</Pill>
                      {lead.reminderStatus === "skipped" && lead.reminderReason ? ` ${SKIP_REASON[lead.reminderReason] ?? lead.reminderReason}` : null}
                      {lead.reminderStatus === "failed" && lead.reminderError ? ` ${lead.reminderError}` : null}
                      {lead.reminderStatus === "sent" ? ` ${relativeTime(lead.reminderSentAt, now)}` : null}
                    </small>
                  ) : null}
                  {lead.status === "converted" ? <small className={s.done}><CheckCircle2 size={13} aria-hidden /> {relativeTime(lead.convertedAt, now)} işletmesini açtı</small> : null}
                </div>
                <div className={s.actions}>
                  <a className={s.wa} href={leadWhatsAppLink(lead)} target="_blank" rel="noopener noreferrer"><MessageCircle size={15} aria-hidden /> WhatsApp&apos;tan yaz</a>
                  <a className={s.call} href={`tel:+${lead.phone}`}><Phone size={14} aria-hidden /> {formatLeadPhone(lead.phone)}</a>
                  {lead.status === "open" ? <>
                    <Btn size="sm" icon={CheckCircle2} loading={busy === lead.id} onClick={() => void changeStatus(lead, "contacted")}>Ulaşıldı</Btn>
                    <Btn size="sm" variant="ghost" icon={X} disabled={busy === lead.id} onClick={() => void changeStatus(lead, "closed")}>Kapat</Btn>
                  </> : lead.status !== "converted" ? (
                    <Btn size="sm" variant="ghost" icon={RotateCcw} loading={busy === lead.id} onClick={() => void changeStatus(lead, "open")}>Yeniden aç</Btn>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </AdminPage>
  );
}
