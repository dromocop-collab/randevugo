"use client";

// Süper admin › İşletmeler › Otomatik onay: yeni mağaza ve profil metni değişikliklerini küfür denetiminden geçerse onaylar.
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { CheckCircle2, ShieldAlert, ShieldCheck, Sparkles } from "lucide-react";
import Link from "@/i18n/link";
import {
  checkModerationText, getBusinessApprovalSettings, updateBusinessApprovalSettings,
  type ApprovalRecent, type ApprovalSettings, type ModerationMatch,
} from "@/features/platform/admin-business-actions";
import { AdminButton, Badge, Callout, Panel } from "@/components/super-admin/ui";
import styles from "./auto-approval.module.css";

const FIELD_LABEL: Record<string, string> = {
  name: "Ad", description: "Açıklama", address: "Adres", district: "İlçe", city: "Şehir", organizationName: "Firma adı", website: "Web sitesi", metin: "Metin",
};
export const moderationFieldLabel = (field: string) => FIELD_LABEL[field] ?? (field.startsWith("socialMedia.") ? `Sosyal medya (${field.slice(12)})` : field);

export function MatchList({ matches }: { matches: ModerationMatch[] }) {
  return (
    <ul className={styles.matches}>
      {matches.map((match, index) => (
        <li key={`${match.field}-${match.word}-${index}`}><b>{moderationFieldLabel(match.field)}:</b> <code>{match.word}</code>{match.term !== match.word && <small> ({match.term})</small>}</li>
      ))}
    </ul>
  );
}

function Toggle({ checked, onChange, label, description, disabled }: { checked: boolean; onChange: (value: boolean) => void; label: string; description: string; disabled?: boolean }) {
  return (
    <label className={styles.toggle}>
      <span><b>{label}</b><small>{description}</small></span>
      <span className={styles.switch}>
        <input type="checkbox" checked={checked} disabled={disabled} onChange={(event) => onChange(event.target.checked)} aria-label={label} />
        <i />
      </span>
    </label>
  );
}

const wordsToText = (words: string[]) => words.join(", ");
const textToWords = (text: string) => text.split(/[,\n]/).map((word) => word.trim()).filter(Boolean);

export function AutoApprovalPanel() {
  const [settings, setSettings] = useState<ApprovalSettings | null>(null);
  const [recent, setRecent] = useState<ApprovalRecent[]>([]);
  const [extra, setExtra] = useState("");
  const [allowed, setAllowed] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [probe, setProbe] = useState("");
  const [probeResult, setProbeResult] = useState<{ clean: boolean; matches: ModerationMatch[] } | null>(null);
  const [probing, setProbing] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await getBusinessApprovalSettings();
      setSettings(data.settings);
      setRecent(data.recent);
      setExtra(wordsToText(data.settings.extraWords));
      setAllowed(wordsToText(data.settings.allowedWords));
      setError("");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Ayarlar yüklenemedi.");
    }
  }, []);
  useEffect(() => { queueMicrotask(() => void load()); }, [load]);

  async function save(patch: Partial<ApprovalSettings>, message: string) {
    setSaving(true);
    try {
      const next = await updateBusinessApprovalSettings(patch);
      setSettings(next);
      setExtra(wordsToText(next.extraWords));
      setAllowed(wordsToText(next.allowedWords));
      toast.success(message);
    } catch (reason) {
      toast.error(reason instanceof Error ? reason.message : "Kaydedilemedi.");
    } finally {
      setSaving(false);
    }
  }

  async function runProbe() {
    if (!probe.trim()) return;
    setProbing(true);
    try { setProbeResult(await checkModerationText(probe)); }
    catch (reason) { toast.error(reason instanceof Error ? reason.message : "Denetlenemedi."); }
    finally { setProbing(false); }
  }

  if (error) return <Callout tone="red" title="Otomatik onay ayarları yüklenemedi" action={<AdminButton size="sm" variant="secondary" onClick={() => void load()}>Tekrar dene</AdminButton>}>{error}</Callout>;
  if (!settings) return null;
  const wordsDirty = extra !== wordsToText(settings.extraWords) || allowed !== wordsToText(settings.allowedWords);
  const autoCount = recent.filter((row) => row.reviewedBy === "auto").length;
  const heldCount = recent.filter((row) => row.status === "pending" && row.clean === false).length;

  return (
    <Panel
      title={<span className={styles.title}>{settings.autoApproveStores ? <ShieldCheck size={18} aria-hidden /> : <ShieldAlert size={18} aria-hidden />} Otomatik onay</span>}
      description="Açıkken yeni mağazanın adı, açıklaması ve adresi küfür/uygunsuz ifade denetiminden geçerse sen onaylamadan yayına girer. Şüpheli olanlar sebebiyle birlikte 'Onay bekleyen'e düşer."
      actions={<Badge tone={settings.autoApproveStores ? "green" : "neutral"} dot>{settings.autoApproveStores ? "Açık" : "Kapalı"}</Badge>}
    >
      <div className={styles.grid}>
        <div className={styles.column}>
          <Toggle label="Yeni mağazaları otomatik onayla" description="Temiz kayıtlar hemen yayında; sana bildirim gelir. Şüpheliler beklemede kalır."
            checked={settings.autoApproveStores} disabled={saving} onChange={(value) => void save({ autoApproveStores: value }, value ? "Otomatik onay açıldı." : "Otomatik onay kapatıldı; yeni kayıtlar onayını bekleyecek.")} />
          <Toggle label="Profil metin değişikliklerini de otomatik uygula" description="Ad, açıklama, adres, iletişim ve sosyal medya. Logo, kapak ve galeri her zaman senin onayına gelir."
            checked={settings.autoApproveProfileText} disabled={saving} onChange={(value) => void save({ autoApproveProfileText: value }, value ? "Profil metinleri otomatik uygulanacak." : "Profil değişiklikleri onayını bekleyecek.")} />
          <label className={styles.field}>
            <span><b>Ek yasaklı kelimeler</b><small>Virgülle ayır. Kelimeyle başlayan her kelime yakalanır (ör. &quot;kumar&quot; → kumarhane).</small></span>
            <textarea rows={2} value={extra} onChange={(event) => setExtra(event.target.value)} placeholder="kumar, bahis, escort" />
          </label>
          <label className={styles.field}>
            <span><b>İzinli kelimeler</b><small>Yanlışlıkla takılan masum kelimeler (ör. bir işletme adı).</small></span>
            <textarea rows={2} value={allowed} onChange={(event) => setAllowed(event.target.value)} placeholder="ör. piç (Piç Burger)" />
          </label>
          <AdminButton variant="primary" size="sm" loading={saving} disabled={!wordsDirty} onClick={() => void save({ extraWords: textToWords(extra), allowedWords: textToWords(allowed) }, "Kelime listeleri kaydedildi.")}>Kelimeleri kaydet</AdminButton>
        </div>
        <div className={styles.column}>
          <div className={styles.probe}>
            <b><Sparkles size={14} aria-hidden /> Denetimi dene</b>
            <div className={styles.probeRow}>
              <input value={probe} onChange={(event) => { setProbe(event.target.value); setProbeResult(null); }} onKeyDown={(event) => { if (event.key === "Enter") void runProbe(); }} placeholder="Bir işletme adı veya açıklama yaz…" aria-label="Denetlenecek metin" />
              <AdminButton size="sm" variant="secondary" loading={probing} disabled={!probe.trim()} onClick={() => void runProbe()}>Denetle</AdminButton>
            </div>
            {probeResult && (probeResult.clean
              ? <p className={styles.ok}><CheckCircle2 size={14} aria-hidden /> Temiz — otomatik onaylanır.</p>
              : <div className={styles.bad}><ShieldAlert size={14} aria-hidden /> Beklemeye düşer:<MatchList matches={probeResult.matches} /></div>)}
          </div>
          <div className={styles.recent}>
            <b>Son kayıtlar <small>{autoCount} otomatik · {heldCount} denetime takıldı</small></b>
            {recent.length === 0 ? <p className={styles.muted}>Henüz kayıt yok.</p> : (
              <ul>
                {recent.slice(0, 8).map((row) => (
                  <li key={row.businessId}>
                    <Link href={`/super-admin/isletmeler?q=${row.businessId}`}>{row.businessName || row.businessId}</Link>
                    {row.reviewedBy === "auto" ? <Badge size="sm" tone="green">Otomatik onay</Badge>
                      : row.status === "pending" ? <Badge size="sm" tone="amber">{row.clean === false ? "Denetime takıldı" : "Bekliyor"}</Badge>
                      : row.status === "approved" ? <Badge size="sm" tone="blue">Elle onay</Badge>
                      : <Badge size="sm" tone="red">Reddedildi</Badge>}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </Panel>
  );
}
