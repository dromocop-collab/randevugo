"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Gift, LoaderCircle, X } from "lucide-react";
import { useT } from "@/i18n/client";
import { checkReferralCode, normalizeReferralCode, readReferralCode, saveReferralCode, type ReferralCheck } from "./referral";
import css from "./referral-invite.module.css";

/**
 * Kayıt sihirbazında davet kartı. compact: yalnız geçerli davet varsa ince bant (ilk adım);
 * değilse "Davet kodun var mı?" ile elle girilebilir (son adım).
 */
export function ReferralInvite({ compact = false }: { compact?: boolean }) {
  const t = useT();
  const [invite, setInvite] = useState<ReferralCheck | null>(null);
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const verify = useCallback(async (code: string, manual: boolean) => {
    setBusy(true);
    setError(null);
    try {
      const result = await checkReferralCode(code);
      if (result.valid) {
        saveReferralCode(result.code ?? code);
        setInvite(result);
        setOpen(false);
      } else {
        if (!manual) saveReferralCode(null);
        setInvite(null);
        if (manual) setError(result.enabled === false ? t("Davet programı şu anda kapalı.") : t("Bu davet kodu bulunamadı."));
      }
    } catch {
      if (manual) setError(t("Kod kontrol edilemedi, birazdan tekrar dene."));
    } finally {
      setBusy(false);
    }
  }, [t]);

  useEffect(() => {
    const stored = readReferralCode();
    if (stored) queueMicrotask(() => { void verify(stored, false); });
  }, [verify]);

  function submit(event: FormEvent) {
    event.preventDefault();
    const code = normalizeReferralCode(value);
    if (!code) { setError(t("Kod 5-12 harf ve rakamdan oluşur.")); return; }
    void verify(code, true);
  }

  if (invite?.valid) {
    return (
      <div className={css.invite} role="status">
        <span className={css.icon} aria-hidden><Gift size={18} /></span>
        <p>
          <b>{t("{name} davetiyle katılıyorsun", { name: invite.businessName ?? t("Bir işletme") })}</b>
          <small>{invite.bonusDays ? t("Deneme süren {days} gün uzun olacak.", { days: invite.bonusDays }) : t("Davet kodun: {code}", { code: invite.code ?? "" })}</small>
        </p>
        {!compact ? (
          <button type="button" className={css.remove} onClick={() => { saveReferralCode(null); setInvite(null); }} aria-label={t("Daveti kaldır")}><X size={16} /></button>
        ) : null}
      </div>
    );
  }
  if (compact) return null;
  if (!open) {
    return <button type="button" className={css.toggle} onClick={() => setOpen(true)}><Gift size={15} aria-hidden /> {t("Davet kodun var mı?")}</button>;
  }
  return (
    <form className={css.form} onSubmit={submit}>
      <label htmlFor="referral-code">{t("Davet kodu")}</label>
      <div className={css.row}>
        <input
          id="referral-code" value={value} onChange={(event) => { setValue(event.target.value.toUpperCase()); setError(null); }}
          placeholder={t("örn. SALON7K2")} autoCapitalize="characters" autoComplete="off" spellCheck={false} maxLength={16}
          aria-invalid={Boolean(error)} aria-describedby={error ? "referral-code-error" : undefined}
        />
        <button type="submit" disabled={busy || !value.trim()}>{busy ? <LoaderCircle size={16} className={css.spin} aria-hidden /> : null}{t("Uygula")}</button>
      </div>
      {error ? <small id="referral-code-error" className={css.error} role="alert">{error}</small> : null}
    </form>
  );
}
