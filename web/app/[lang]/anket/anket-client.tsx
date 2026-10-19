"use client";

import Link from "@/i18n/link";
import { useCallback, useEffect, useId, useMemo, useRef, useState, type CSSProperties } from "react";
import {
  ArrowLeft,
  ArrowRight,
  BellRing,
  CalendarCheck2,
  Check,
  Gift,
  LayoutDashboard,
  MessagesSquare,
  MoonStar,
  RotateCcw,
  Share2,
  ShieldCheck,
  Sparkles,
  Store,
  type LucideIcon,
} from "lucide-react";
import { RoviMascot, type RoviMood } from "@/components/brand/rovi-mascot";
import { detectSurveyDevice, saveSurveyResponse } from "@/features/survey/survey-repository";
import { logSurveyEvent } from "@/features/survey/survey-events";
import { tk } from "@/i18n/config";
import { useT } from "@/i18n/client";
import { localizeForBrowser } from "@/i18n/browser";
import { Confetti } from "./confetti";
import {
  QUESTIONS,
  RESULTS,
  SURVEY_ID,
  computeHoursSaved,
  computeResultType,
  dreamLine,
  pickBenefits,
  type Answers,
  type BenefitKey,
  type SurveyOption,
} from "./survey-data";
import styles from "./anket.module.css";

type Phase = "intro" | "quiz" | "calc" | "result";
type Reaction = { id: number; text: string; mood: RoviMood };

const SIGNUP_HREF = "/isletmeler/kayit";
const MAX_SAVES_PER_VISIT = 3;

const BENEFITS: Record<BenefitKey, { icon: LucideIcon; title: string; text: string }> = {
  online: { icon: CalendarCheck2, title: tk("7/24 online randevu"), text: tk("Müşterilerin linkine tıklar, boş saatini saniyeler içinde kendisi seçer.") },
  reminder: { icon: BellRing, title: tk("Otomatik SMS & bildirim hatırlatma"), text: tk("Randevudan önce hatırlatma gider; gelmeyen müşteri azalır.") },
  night: { icon: MoonStar, title: tk("Gece mesajına takvimin cevap versin"), text: tk("23:00'teki istek, sabah takviminde seni hazır bekler. Sen uyu 😴") },
  conflict: { icon: ShieldCheck, title: tk("Çakışma derdi biter"), text: tk("Dolu saat zaten seçilemez; personel ve hizmet süresi hesaba katılır.") },
  questions: { icon: MessagesSquare, title: tk("“Müsait misin?” tarihe karışsın"), text: tk("Boş saatler herkese açık; soru-cevap trafiği kendiliğinden azalır.") },
  panel: { icon: LayoutDashboard, title: tk("Ekip, hizmet, müşteri tek panelde"), text: tk("Telefondan da bilgisayardan da tek yerden yönet.") },
};

const TEASERS = Object.values(RESULTS);

function prefersReducedMotion() {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** Sayıyı 0'dan hedefe sayarak yazar (state yerine DOM; hareket azaltmada direkt yazar). */
function CountUp({ value }: { value: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    if (prefersReducedMotion()) {
      node.textContent = String(value);
      return;
    }
    let frame = 0;
    const start = performance.now();
    const duration = 1100;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      node.textContent = String(Math.round(value * eased));
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value]);
  return <span ref={ref}>{value}</span>;
}

export function SurveyExperience() {
  const t = useT();
  const [phase, setPhase] = useState<Phase>("intro");
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Answers>({});
  const [direction, setDirection] = useState<"fwd" | "back">("fwd");
  const [pending, setPending] = useState<string | null>(null);
  const [reaction, setReaction] = useState<Reaction | null>(null);
  const [burst, setBurst] = useState(0);
  const [shareStatus, setShareStatus] = useState("");

  const timers = useRef<number[]>([]);
  const interacted = useRef(false);
  const saves = useRef(0);
  const reactionSeq = useRef(0);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const stageRef = useRef<HTMLElement>(null);
  const groupLabelId = useId();

  const total = QUESTIONS.length;
  const question = QUESTIONS[Math.min(step, total - 1)];
  const resultType = useMemo(() => computeResultType(answers), [answers]);
  const result = RESULTS[resultType];
  const hours = useMemo(() => computeHoursSaved(answers), [answers]);
  const benefits = useMemo(() => pickBenefits(answers), [answers]);
  const yearlyHours = hours * 48;

  const later = useCallback((fn: () => void, ms: number) => {
    timers.current.push(window.setTimeout(fn, ms));
  }, []);

  useEffect(() => {
    const list = timers.current;
    return () => list.forEach((id) => window.clearTimeout(id));
  }, []);

  // Huni ölçümü: oturum başına bir görüntülenme.
  useEffect(() => {
    logSurveyEvent("view");
  }, []);

  // Ekran değişince odak başlığa gelir; sahne yukarıda kaldıysa görünür alana kayar.
  useEffect(() => {
    if (!interacted.current) return;
    headingRef.current?.focus({ preventScroll: true });
    const stage = stageRef.current;
    if (!stage) return;
    // Yapışkan site başlığının altında kalmasın: başlık yüksekliği kadar boşluk bırakılır.
    const header = document.querySelector("header");
    const offset = (header && getComputedStyle(header).position === "sticky" ? header.getBoundingClientRect().height : 0) + 12;
    const top = stage.getBoundingClientRect().top;
    if (top < offset) {
      window.scrollTo({ top: Math.max(0, window.scrollY + top - offset), behavior: prefersReducedMotion() ? "auto" : "smooth" });
    }
  }, [phase, step]);

  const finish = useCallback((final: Answers) => {
    setPhase("calc");
    setReaction(null);
    later(() => {
      setPhase("result");
      setBurst((value) => value + 1);
    }, prefersReducedMotion() ? 600 : 1900);

    const complete = QUESTIONS.every((item) => typeof final[item.key] === "string");
    if (complete && saves.current < MAX_SAVES_PER_VISIT) {
      saves.current += 1;
      void saveSurveyResponse({
        surveyId: SURVEY_ID,
        answers: final as Record<string, string>,
        resultType: computeResultType(final),
        hoursSaved: computeHoursSaved(final),
        device: detectSurveyDevice(),
      });
    }
  }, [later]);

  const choose = useCallback((option: SurveyOption) => {
    if (pending) return;
    interacted.current = true;
    const next = { ...answers, [question.key]: option.id };
    setAnswers(next);
    setPending(option.id);
    reactionSeq.current += 1;
    setReaction({ id: reactionSeq.current, text: option.quip, mood: option.mood ?? "happy" });
    later(() => {
      setPending(null);
      if (step >= total - 1) {
        finish(next);
      } else {
        setDirection("fwd");
        setStep(step + 1);
        setReaction(null);
      }
    }, prefersReducedMotion() ? 450 : 850);
  }, [answers, finish, later, pending, question.key, step, total]);

  // Masaüstünde 1–9 tuşlarıyla hızlı seçim.
  useEffect(() => {
    if (phase !== "quiz") return;
    const onKey = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      const target = event.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)) return;
      const index = Number(event.key) - 1;
      if (Number.isInteger(index) && index >= 0 && index < Math.min(9, question.options.length)) {
        event.preventDefault();
        choose(question.options[index]);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [phase, question, choose]);

  function start() {
    logSurveyEvent("start");
    interacted.current = true;
    setDirection("fwd");
    setPhase("quiz");
  }

  function back() {
    if (pending) return;
    interacted.current = true;
    setReaction(null);
    if (step === 0) {
      setPhase("intro");
      return;
    }
    setDirection("back");
    setStep(step - 1);
  }

  function restart() {
    logSurveyEvent("restart", resultType);
    interacted.current = true;
    setAnswers({});
    setStep(0);
    setDirection("fwd");
    setReaction(null);
    setShareStatus("");
    setPhase("quiz");
  }

  async function share() {
    logSurveyEvent("share", resultType);
    const url = `${window.location.origin}${localizeForBrowser("/anket")}`;
    const text = t("Benim randevu karakterim: {emoji} {title}! Haftada ~{count} saat kazanabilirmişim 😮 Seninki ne?", { emoji: result.emoji, title: t(result.title), count: hours });
    if (typeof navigator.share === "function") {
      try {
        await navigator.share({ title: t("Senin randevu karakterin ne?"), text, url });
        setShareStatus(t("Paylaştın, harikasın! 🎉"));
        return;
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
      }
    }
    try {
      await navigator.clipboard.writeText(`${text} ${url}`);
      setShareStatus(t("Kopyalandı! İstediğin yere yapıştır 📋"));
    } catch {
      setShareStatus(t("Bağlantıyı paylaş: {url}", { url }));
    }
  }

  const roviMood: RoviMood = phase === "intro" ? "wave" : phase === "calc" ? "thinking" : phase === "result" ? "happy" : reaction?.mood ?? "idle";
  const bubbleText = phase === "intro"
    ? t("Selam, ben Rovi! 👋")
    : phase === "calc"
      ? t("Hesaplıyorum… 🧮")
      : phase === "result"
        ? t("Taa-daa! 🎉")
        : t(reaction?.text ?? question.rovi);
  const bubbleKey = phase === "quiz" ? `${step}-${reaction?.id ?? "q"}` : phase;
  const liveText = phase === "quiz"
    ? t("Soru {step} / {total}: {title}", { step: step + 1, total, title: t(question.title) })
    : phase === "calc"
      ? t("Sonucun hesaplanıyor")
      : phase === "result"
        ? t("Senin randevu karakterin: {title}. Haftada yaklaşık {count} saat kazanabilirsin.", { title: t(result.title), count: hours })
        : "";
  // Vurgulu kelime köşeli parantez içinde: "Senin randevu [karakterin] ne?" → [önce, vurgu, sonra].
  const introTitle = t("Senin randevu [karakterin] ne?").split(/\[|\]/);
  const progress = phase === "quiz" ? (step + (pending ? 1 : 0)) / total : phase === "intro" ? 0 : 1;

  return (
    <section ref={stageRef} className={styles.stage} aria-label={t("Randevu karakter testi")}>
      <div className={styles.blobs} aria-hidden="true"><i /><i /><i /></div>
      <div className={styles.dots} aria-hidden="true" />
      <Confetti burst={burst} />
      <p className={styles.srOnly} aria-live="polite" aria-atomic="true">{liveText}</p>

      <div className={styles.shell}>
        {phase !== "intro" && phase !== "result" && (
          <div className={styles.topbar}>
            <button type="button" className={styles.iconButton} onClick={back} disabled={phase !== "quiz" || Boolean(pending)} aria-label={step === 0 ? t("Başa dön") : t("Önceki soru")}>
              <ArrowLeft size={18} />
            </button>
            <div className={styles.track} role="progressbar" aria-label={t("Test ilerlemesi")} aria-valuemin={0} aria-valuemax={total} aria-valuenow={Math.round(progress * total)}>
              <span className={styles.trackFill} style={{ width: `${Math.max(4, progress * 100)}%` }} />
            </div>
            <span className={styles.counter}>{phase === "quiz" ? `${step + 1}/${total}` : `${total}/${total}`}</span>
          </div>
        )}

        {phase !== "result" && (
          <div className={`${styles.roviRow} ${phase === "intro" ? styles.roviRowIntro : ""}`}>
            {/* Rovi yeniden bağlanmasın diye animasyon iki sınıf arasında değişerek tetiklenir. */}
            <span className={reaction ? (reaction.id % 2 ? styles.roviPopA : styles.roviPopB) : undefined}>
              <RoviMascot size={phase === "intro" ? 132 : 76} mood={roviMood} alt="" priority={phase === "intro"} />
            </span>
            <span key={bubbleKey} className={styles.bubble} aria-hidden="true">{bubbleText}</span>
          </div>
        )}

        {phase === "intro" && (
          <div className={styles.screen} data-dir="fwd">
            <span className={styles.eyebrow}><Sparkles size={13} /> {t("1 dakikalık eğlenceli test")}</span>
            <h1 ref={headingRef} tabIndex={-1} className={styles.introTitle}>
              {introTitle[0]}<em>{introTitle[1]}</em>{introTitle[2]}
            </h1>
            <p className={styles.lead}>
              {t("Telefon Ninjası mı, Defter Ustası mı, yoksa Gece Kuşu mu? 8 soruyu cevapla; Rovi haftada kaç saat kazanabileceğini hesaplasın.")}
            </p>
            <ul className={styles.metaChips} aria-label={t("Test hakkında")}>
              <li>{t("🎯 8 soru")}</li>
              <li>{t("⏱️ ~1 dakika")}</li>
              <li>{t("🙈 İsim, telefon yok")}</li>
            </ul>
            <div className={styles.introActions}>
              <button type="button" className={styles.primary} onClick={start}>
                {t("Teste başla")} <ArrowRight size={18} />
              </button>
              <Link href="/kesfet" className={styles.ghost} onClick={() => logSurveyEvent("cta_customer")}>
                {t("Ben müşteriyim 🙋")} <span className={styles.ghostHint}>{t("İşletme keşfet")}</span>
              </Link>
            </div>
            <div className={styles.marquee} aria-hidden="true">
              <div className={styles.marqueeTrack}>
                {[...TEASERS, ...TEASERS].map((item, index) => (
                  <span key={`${item.type}-${index}`} className={styles.teaser}>{item.emoji} {t(item.title)}</span>
                ))}
              </div>
            </div>
          </div>
        )}

        {phase === "quiz" && (
          <div key={`q-${step}`} className={styles.screen} data-dir={direction}>
            <h2 ref={headingRef} tabIndex={-1} id={groupLabelId} className={styles.questionTitle}>{t(question.title)}</h2>
            <p className={styles.questionSub}>{t(question.subtitle)}</p>
            <div role="group" aria-labelledby={groupLabelId} className={question.layout === "grid" ? styles.optionsGrid : styles.optionsList}>
              {question.options.map((option, index) => {
                const isSelected = pending ? pending === option.id : answers[question.key] === option.id;
                return (
                  <button
                    key={option.id}
                    type="button"
                    className={`${styles.option} ${isSelected ? styles.optionSelected : ""} ${pending && !isSelected ? styles.optionDim : ""}`}
                    style={{ "--i": index } as CSSProperties}
                    aria-pressed={isSelected}
                    aria-disabled={Boolean(pending) || undefined}
                    onClick={() => choose(option)}
                  >
                    <span className={styles.optionEmoji} aria-hidden="true">{option.emoji}</span>
                    <span className={styles.optionText}>
                      <span className={styles.optionLabel}>{t(option.label)}</span>
                      {option.hint && <span className={styles.optionHint}>{t(option.hint)}</span>}
                    </span>
                    <span className={styles.optionCheck} aria-hidden="true">{isSelected ? <Check size={15} strokeWidth={3} /> : index < 9 ? index + 1 : null}</span>
                  </button>
                );
              })}
            </div>
            <p className={styles.keyHint} aria-hidden="true">{t("İpucu: {keys} tuşlarıyla da seçebilirsin", { keys: question.options.length > 9 ? "1–9" : `1–${question.options.length}` })}</p>
          </div>
        )}

        {phase === "calc" && (
          <div className={styles.screen} data-dir="fwd">
            <h2 ref={headingRef} tabIndex={-1} className={styles.questionTitle}>{t("Rovi hesaplıyor…")}</h2>
            <ul className={styles.calcList}>
              <li style={{ "--i": 0 } as CSSProperties}><Check size={15} /> {t("Telefon trafiği ölçülüyor")}</li>
              <li style={{ "--i": 1 } as CSSProperties}><Check size={15} /> {t("Hayalet müşteriler sayılıyor 👻")}</li>
              <li style={{ "--i": 2 } as CSSProperties}><Check size={15} /> {t("Kayıp saatler toplanıyor")}</li>
              <li style={{ "--i": 3 } as CSSProperties}><Sparkles size={15} /> {t("Karakterin belirleniyor…")}</li>
            </ul>
          </div>
        )}

        {phase === "result" && (
          <div className={`${styles.screen} ${styles.result}`} data-dir="fwd" style={{ "--accent-a": result.accent[0], "--accent-b": result.accent[1] } as CSSProperties}>
            <div className={styles.badgeRow}>
              <span className={styles.badge} aria-hidden="true">
                <span className={styles.badgeRing} />
                <span className={styles.badgeEmoji}>{result.emoji}</span>
              </span>
              <span className={styles.resultRovi}>
                <RoviMascot size={84} mood="happy" alt="" />
                <span className={styles.bubbleSmall} aria-hidden="true">{t("Taa-daa! 🎉")}</span>
              </span>
            </div>
            <span className={styles.eyebrow}>{t("Senin randevu karakterin")}</span>
            <h2 ref={headingRef} tabIndex={-1} className={styles.resultTitle}>{t(result.title)}</h2>
            <p className={styles.tagline}>{t(result.tagline)}</p>
            <div className={styles.stats}>
              <div className={styles.stat}>
                <span className={styles.statValue}>~<CountUp value={hours} /> {t("saat")}</span>
                <span className={styles.statLabel}>{t("haftada kazanabilirsin")}</span>
              </div>
              <div className={styles.stat}>
                <span className={styles.statValue}>~<CountUp value={yearlyHours} /> {t("saat")}</span>
                <span className={styles.statLabel}>{t("yılda sana geri döner")}</span>
              </div>
            </div>

            {/* Ana çağrı kaydırmadan görünsün: istatistiklerin hemen altında. */}
            <div className={styles.resultActions}>
              <Link href={SIGNUP_HREF} className={styles.primary} onClick={() => logSurveyEvent("cta_signup", resultType)}>
                <Store size={18} /> {t("İşletmeni ücretsiz aç")} <ArrowRight size={18} />
              </Link>
              <div className={styles.offer}>
                <Gift size={16} aria-hidden="true" />
                <span><strong>{t("İlk ay ücretsiz")}</strong> · {t("kart gerekmez")}</span>
              </div>
              <div className={styles.secondaryRow}>
                <button type="button" className={styles.secondary} onClick={share}>
                  <Share2 size={16} /> {t("Paylaş")}
                </button>
                <button type="button" className={styles.secondary} onClick={restart}>
                  <RotateCcw size={16} /> {t("Tekrar oyna")}
                </button>
              </div>
              <p className={styles.shareStatus} role="status" aria-live="polite">{shareStatus}</p>
            </div>

            <p className={styles.resultText}>{t(result.description)}</p>
            <p className={styles.dream}>{dreamLine(answers, hours, t)}</p>

            <h3 className={styles.benefitsTitle}>{t("SeninRandevun senin için ne yapar?")}</h3>
            <ul className={styles.benefits}>
              {benefits.map((key, index) => {
                const benefit = BENEFITS[key];
                const Icon = benefit.icon;
                return (
                  <li key={key} style={{ "--i": index } as CSSProperties}>
                    <span className={styles.benefitIcon}><Icon size={18} /></span>
                    <span>
                      <strong>{t(benefit.title)}</strong>
                      <small>{t(benefit.text)}</small>
                    </span>
                  </li>
                );
              })}
            </ul>

            <Link href={SIGNUP_HREF} className={`${styles.primary} ${styles.primaryBottom}`} onClick={() => logSurveyEvent("cta_signup", resultType)}>
              <Store size={18} /> {t("Hemen başla, ücretsiz")} <ArrowRight size={18} />
            </Link>
            <Link href="/kesfet" className={styles.customerLink} onClick={() => logSurveyEvent("cta_customer", resultType)}>{t("Müşteri misin? Yakındaki işletmeleri keşfet")} <ArrowRight size={14} /></Link>
            <p className={styles.footnote}>{t("* Eğlencesine hesaplandı; cevaplarına göre kaba bir tahmindir.")}</p>
          </div>
        )}
      </div>
    </section>
  );
}
