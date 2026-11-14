"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "@/i18n/link";
import { toast } from "sonner";
import { CalendarCheck2, Check, Clock3, Copy, Gift, LoaderCircle, MessageCircle, Smartphone, Sparkles, Volume2, VolumeX, X } from "lucide-react";
import { useIntlLocale, useT } from "@/i18n/client";
import { tk } from "@/i18n/config";
import { userFacingError } from "@/lib/errors/user-facing-error";
import { isValidTurkishPhone, maskPhone, normalizeTurkishPhone } from "@/components/booking/booking-utils";
import { SpinWheel, type SpinWheelHandle } from "./spin-wheel";
import { ConfettiBurst } from "./confetti-burst";
import { playMiss, playWin, primeWheelAudio } from "./wheel-sound";
import type { PublicWheel, SpinResult } from "./wheel-domain";
import { recalledSpin, rememberSpin, sendWheelVerificationCode, spinCampaignWheel, verifyWheelPhoneCode, type CodeChannel } from "./wheel-repository";
import s from "./campaign-wheel-modal.module.css";

type Stage = "phone" | "code" | "ready" | "spinning" | "result";

type Props = {
  open: boolean;
  onClose: () => void;
  businessId: string;
  businessName: string;
  businessSlug: string;
  wheel: PublicWheel;
};

const SOUND_KEY = "sr-wheel-sound";

export function CampaignWheelModal({ open, onClose, businessId, businessName, businessSlug, wheel }: Props) {
  const t = useT();
  const intlLocale = useIntlLocale();
  const wheelRef = useRef<SpinWheelHandle>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const codeInputRef = useRef<HTMLInputElement>(null);
  const [stage, setStage] = useState<Stage>("phone");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [channel, setChannel] = useState<CodeChannel>("sms");
  const [resendIn, setResendIn] = useState(0);
  const [smsIn, setSmsIn] = useState(0);
  const [result, setResult] = useState<SpinResult | null>(null);
  const [outcome, setOutcome] = useState<"win" | "miss" | null>(null);
  const [confetti, setConfetti] = useState(0);
  const [sound, setSound] = useState(true);
  const [verifiedPhone, setVerifiedPhone] = useState("");

  const normalized = normalizeTurkishPhone(phone);
  const phoneValid = isValidTurkishPhone(phone);

  // Açılışta: aynı cihazda daha önce çevrildiyse sonucu göster; ses tercihini oku.
  useEffect(() => {
    if (!open) return;
    queueMicrotask(() => {
      try { setSound(localStorage.getItem(SOUND_KEY) !== "off"); } catch { /* yok */ }
      const previous = recalledSpin(businessId, wheel.campaignId);
      if (previous) {
        setResult(previous);
        setStage("result");
        setOutcome(previous.prize && previous.prize.type !== "none" ? "win" : "miss");
      }
    });
  }, [open, businessId, wheel.campaignId]);

  // Kaydırma kilidi, Esc ile kapatma, odak
  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && stage !== "spinning") onClose();
    };
    window.addEventListener("keydown", onKey);
    const focusTimer = window.setTimeout(() => dialogRef.current?.querySelector<HTMLElement>("input, button[data-primary]")?.focus(), 80);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKey);
      window.clearTimeout(focusTimer);
    };
  }, [open, onClose, stage]);

  useEffect(() => {
    if (resendIn <= 0 && smsIn <= 0) return;
    const timer = window.setTimeout(() => { setResendIn((v) => Math.max(0, v - 1)); setSmsIn((v) => Math.max(0, v - 1)); }, 1000);
    return () => window.clearTimeout(timer);
  }, [resendIn, smsIn]);

  const toggleSound = () => {
    setSound((value) => {
      try { localStorage.setItem(SOUND_KEY, value ? "off" : "on"); } catch { /* yok */ }
      return !value;
    });
  };

  async function sendCode(requested?: "sms") {
    if (!phoneValid || busy) return;
    setBusy(true);
    setError("");
    try {
      const response = await sendWheelVerificationCode(normalized, requested);
      const sentBy: CodeChannel = response.channel === "whatsapp" ? "whatsapp" : "sms";
      setChannel(sentBy);
      setResendIn(60);
      setSmsIn(sentBy === "whatsapp" ? 20 : 0);
      setStage("code");
      setCode("");
      window.setTimeout(() => codeInputRef.current?.focus(), 60);
    } catch (failure) {
      setError(t(userFacingError(failure, tk("Kod gönderilemedi."))));
    } finally {
      setBusy(false);
    }
  }

  async function verify(value: string) {
    if (value.length !== 6 || busy) return;
    setBusy(true);
    setError("");
    try {
      await verifyWheelPhoneCode(normalized, value);
      setVerifiedPhone(normalized);
      setStage("ready");
    } catch (failure) {
      setError(t(userFacingError(failure, tk("Doğrulama başarısız."))));
      setCode("");
      codeInputRef.current?.focus();
    } finally {
      setBusy(false);
    }
  }

  const spin = useCallback(async (flickVelocity?: number) => {
    if (stage !== "ready" || !verifiedPhone) return;
    primeWheelAudio();
    setStage("spinning");
    setOutcome(null);
    setError("");
    wheelRef.current?.start(flickVelocity);
    try {
      // Sonuç gelene kadar çark döner; en az ~1 sn dönsün ki "hemen durdu" hissi olmasın.
      const [response] = await Promise.all([
        spinCampaignWheel({ businessId, phone: verifiedPhone, customerName: name.trim() }),
        new Promise((resolve) => window.setTimeout(resolve, 1100)),
      ]);
      await wheelRef.current?.land(response.sliceIndex);
      const won = Boolean(response.prize && response.prize.type !== "none");
      setOutcome(won ? "win" : "miss");
      if (won) {
        if (sound) playWin();
        setConfetti((value) => value + 1);
        try { navigator.vibrate?.([30, 40, 30, 40, 80]); } catch { /* yok */ }
      } else if (sound) playMiss();
      setResult(response);
      rememberSpin(businessId, wheel.campaignId, response);
      window.setTimeout(() => setStage("result"), won ? 650 : 450);
    } catch (failure) {
      wheelRef.current?.abort();
      setStage("ready");
      const message = t(userFacingError(failure, tk("Çark şu anda çevrilemedi. Lütfen tekrar dene.")));
      setError(message);
      toast.error(message);
    }
  }, [stage, verifiedPhone, businessId, name, sound, wheel.campaignId, t]);

  async function copyCode() {
    if (!result?.code) return;
    try {
      await navigator.clipboard.writeText(result.code);
      toast.success(t("Kod kopyalandı"));
    } catch {
      toast.message(result.code);
    }
  }

  if (!open) return null;

  const won = Boolean(result?.prize && result.prize.type !== "none");
  const bookingHref = `/isletme/${businessSlug}/randevu${result?.prize?.type === "free_service" && result.prize.serviceId ? `?service=${encodeURIComponent(result.prize.serviceId)}` : ""}`;
  const expiryText = result?.expiresAt ? new Intl.DateTimeFormat(intlLocale, { day: "numeric", month: "long", year: "numeric" }).format(new Date(result.expiresAt)) : "";
  const hubLabel = stage === "ready" ? t("ÇEVİR") : stage === "spinning" ? "…" : won ? "🎉" : t("ÇARK");

  return (
    <div className={s.backdrop} onClick={(event) => { if (event.target === event.currentTarget && stage !== "spinning") onClose(); }}>
      <div ref={dialogRef} className={s.dialog} role="dialog" aria-modal="true" aria-labelledby="wheel-title">
        <div className={s.stage}>
          <ConfettiBurst fireKey={confetti} />
          <div className={s.topBar}>
            <span className={s.kicker}><Sparkles size={14} aria-hidden="true" /> {businessName}</span>
            <div className={s.topActions}>
              <button type="button" className={s.iconBtn} onClick={toggleSound} aria-label={sound ? t("Sesi kapat") : t("Sesi aç")} aria-pressed={sound}>
                {sound ? <Volume2 size={18} aria-hidden="true" /> : <VolumeX size={18} aria-hidden="true" />}
              </button>
              <button type="button" className={s.iconBtn} onClick={onClose} disabled={stage === "spinning"} aria-label={t("Kapat")}>
                <X size={18} aria-hidden="true" />
              </button>
            </div>
          </div>
          <h2 id="wheel-title" className={s.title}>{wheel.title}</h2>
          {wheel.subtitle ? <p className={s.subtitle}>{wheel.subtitle}</p> : null}
          <div className={s.wheelWrap} data-stage={stage}>
            <SpinWheel
              ref={wheelRef}
              slices={wheel.slices}
              hubLabel={hubLabel}
              hubDisabled={stage !== "ready"}
              onHubClick={() => void spin()}
              onFlick={stage === "ready" ? (velocity) => void spin(velocity) : undefined}
              sound={sound}
              outcome={outcome}
              ariaLabel={t("{title} — {count} dilimli kampanya çarkı", { title: wheel.title, count: wheel.slices.length })}
            />
          </div>
        </div>

        <div className={s.panel} aria-live="polite">
          {stage === "phone" && (
            <form className={s.form} onSubmit={(event) => { event.preventDefault(); void sendCode(); }}>
              <p className={s.lead}>{t("Telefonunu doğrula, çarkı çevir, ödülün randevunda otomatik uygulansın.")}</p>
              <label className={s.field}>
                <span>{t("Adın")} <em>{t("(isteğe bağlı)")}</em></span>
                <input id="wheel-name" value={name} onChange={(event) => setName(event.target.value)} autoComplete="given-name" maxLength={80} placeholder={t("Örn. Ayşe")} />
              </label>
              <label className={s.field}>
                <span>{t("Cep telefonu")}</span>
                <input id="wheel-phone" value={phone} onChange={(event) => setPhone(event.target.value)} inputMode="tel" autoComplete="tel" placeholder="05xx xxx xx xx" required />
              </label>
              {error && <p className={s.error} role="alert">{error}</p>}
              <button type="submit" data-primary className={s.primary} disabled={!phoneValid || busy}>
                {busy ? <LoaderCircle size={18} className={s.spin} aria-hidden="true" /> : <MessageCircle size={18} aria-hidden="true" />}
                {t("Doğrulama kodu gönder")}
              </button>
              <p className={s.fine}>{t("Kod önce WhatsApp'a gönderilir. Her numaraya kampanya başına bir çevirme hakkı.")}</p>
            </form>
          )}

          {stage === "code" && (
            <form className={s.form} onSubmit={(event) => { event.preventDefault(); void verify(code); }}>
              <p className={s.lead}>
                {channel === "whatsapp"
                  ? t("{phone} numaranın WhatsApp'ına gelen 6 haneli kodu yaz.", { phone: maskPhone(phone) })
                  : t("{phone} numarasına SMS ile gelen 6 haneli kodu yaz.", { phone: maskPhone(phone) })}
              </p>
              <input
                ref={codeInputRef}
                id="wheel-code"
                className={s.codeInput}
                value={code}
                onChange={(event) => {
                  const digits = event.target.value.replace(/\D/g, "").slice(0, 6);
                  setCode(digits);
                  setError("");
                  if (digits.length === 6) void verify(digits);
                }}
                inputMode="numeric"
                autoComplete="one-time-code"
                pattern="[0-9]*"
                maxLength={6}
                aria-label={t("6 haneli doğrulama kodu")}
                disabled={busy}
              />
              {error && <p className={s.error} role="alert">{error}</p>}
              <div className={s.row}>
                {resendIn > 0
                  ? <span className={s.muted}><Clock3 size={14} aria-hidden="true" /> {t("Yeniden gönder {count} sn", { count: resendIn })}</span>
                  : <button type="button" className={s.link} onClick={() => void sendCode()} disabled={busy}>{t("Kodu tekrar gönder")}</button>}
                {channel === "whatsapp" && (smsIn > 0
                  ? <span className={s.muted}>{t("WhatsApp gelmezse SMS {count} sn", { count: smsIn })}</span>
                  : <button type="button" className={s.link} onClick={() => void sendCode("sms")} disabled={busy}><Smartphone size={14} aria-hidden="true" /> {t("SMS ile gönder")}</button>)}
                <button type="button" className={s.link} onClick={() => { setStage("phone"); setError(""); }}>{t("Numarayı değiştir")}</button>
              </div>
              {busy && <p className={s.muted} role="status"><LoaderCircle size={14} className={s.spin} aria-hidden="true" /> {t("Doğrulanıyor…")}</p>}
            </form>
          )}

          {(stage === "ready" || stage === "spinning") && (
            <div className={s.form}>
              <p className={s.ready}>
                {stage === "ready" ? <><Check size={16} aria-hidden="true" /> {t("Hazırsın! Ortadaki düğmeye bas ya da çarkı parmağınla fırlat.")}</> : t("Çark dönüyor… bol şans!")}
              </p>
              {error && <p className={s.error} role="alert">{error}</p>}
              <button type="button" data-primary className={s.primary} onClick={() => void spin()} disabled={stage !== "ready"}>
                {stage === "spinning" ? <LoaderCircle size={18} className={s.spin} aria-hidden="true" /> : <Sparkles size={18} aria-hidden="true" />}
                {stage === "spinning" ? t("Dönüyor…") : t("Çarkı çevir")}
              </button>
            </div>
          )}

          {stage === "result" && result && (
            <div className={s.result} data-won={won ? "true" : "false"}>
              {won ? (
                <>
                  <span className={s.resultBadge}><Gift size={15} aria-hidden="true" /> {result.alreadySpun ? t("Bu kampanyadaki ödülün") : t("Tebrikler, kazandın!")}</span>
                  <p className={s.prize}>{result.prizeText}</p>
                  {result.status === "points_awarded" ? (
                    <p className={s.resultText}>{t("Puanlar telefon numarana tanımlandı; bir sonraki ödemende kullanabilirsin.")}</p>
                  ) : result.status === "used" ? (
                    <p className={s.resultText}>{t("Bu ödülü kullandın. Teşekkürler!")}</p>
                  ) : (
                    <>
                      <p className={s.resultText}>
                        {result.status === "reserved"
                          ? t("Ödülün bir randevuna bağlandı; ödeme sırasında düşülecek.")
                          : t("Bu numarayla randevu aldığında ödülün otomatik uygulanır.")}
                        {expiryText ? <> {t("Son kullanım: {date}.", { date: expiryText })}</> : null}
                      </p>
                      {result.code && (
                        <button type="button" className={s.code} onClick={() => void copyCode()} aria-label={t("Kodu kopyala: {code}", { code: result.code })}>
                          <span>{result.code}</span> <Copy size={16} aria-hidden="true" />
                        </button>
                      )}
                      {result.status !== "reserved" && (
                        <Link href={bookingHref} className={s.primary} data-primary>
                          <CalendarCheck2 size={18} aria-hidden="true" /> {t("Hemen randevu al")}
                        </Link>
                      )}
                    </>
                  )}
                </>
              ) : (
                <>
                  <span className={s.resultBadge}>{result.alreadySpun ? t("Bu kampanyada çarkı çevirdin") : t("Bu sefer olmadı")}</span>
                  <p className={s.prize}>{result.prizeText || t("Bir dahaki kampanyada şansın açık olsun!")}</p>
                  <Link href={bookingHref} className={s.secondary}>
                    <CalendarCheck2 size={18} aria-hidden="true" /> {t("Yine de randevu al")}
                  </Link>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
