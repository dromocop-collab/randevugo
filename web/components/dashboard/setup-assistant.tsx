"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import { ArrowRight, Check, ChevronLeft, ChevronRight, ChevronDown, MousePointer2, Play, Sparkles, X } from "lucide-react";
import { RoviMascot } from "@/components/brand/rovi-mascot";
import { Button, dashTokensClassName } from "@/components/dashboard/ui";
import { cn } from "@/lib/utils/cn";
import styles from "./setup-assistant.module.css";

export interface SetupAssistantStep {
  title: string;
  description: string;
  href: string;
  action: string;
  done: boolean;
}

interface Props {
  businessId: string;
  ready: boolean;
  steps: SetupAssistantStep[];
}

const PANEL_TOUR_STEPS = [
  { target: "overview", title: "Kontrol merkezin burada", description: "Günün randevularını, bekleyen işleri ve kurulum durumunu tek bakışta görürsün.", hint: "Her güne buradan başla; acil bir iş varsa üstte görünür.", href: "/dashboard" },
  { target: "takvim", title: "Günün akışını Takvim yönetir", description: "Randevuları gün, hafta ve ekip düzeninde gör; boş saatleri kolayca fark et.", hint: "Yeni kayıt eklemek veya saat değiştirmek için Takvim’i aç.", href: "/dashboard/takvim" },
  { target: "hizmetler", title: "Hizmetlerini burada yönet", description: "Hizmet adı, süre, fiyat ve online randevu durumunu buradan düzenlersin.", hint: "Müşterinin göreceği doğru süreyi ve fiyatı burada belirle.", href: "/dashboard/hizmetler" },
  { target: "calisanlar", title: "Ekibini ve uzmanlıkları bağla", description: "Her çalışanın sunduğu hizmetleri ve uygunluğunu burada tanımlarsın.", hint: "Önce çalışanı ekle, sonra verebildiği hizmetleri seç.", href: "/dashboard/calisanlar" },
  { target: "calisma-saatleri", title: "Müsaitliği çalışma saatleri belirler", description: "Açık günleri, molaları ve kapanış saatlerini düzenleyerek takvimi oluşturursun.", hint: "Kapalı günleri ve molaları doğru gir; uygun saatler otomatik hesaplansın.", href: "/dashboard/calisma-saatleri" },
  { target: "ayarlar", title: "Mağaza bilgilerin Ayarlar’da", description: "Logo, kategori, açıklama ve iletişim bilgilerini burada tamamlarsın.", hint: "Son kontrolde logo ve iletişim bilgilerinin güncel olduğundan emin ol.", href: "/dashboard/ayarlar" },
] as const;

/** Bugün ekranındaki kurulum rehberi (Rovi) + panel tanıtım turu. Kurulum bitince görünmez. */
export function SetupAssistant({ businessId, ready, steps }: Props) {
  const [collapsed, setCollapsed] = useState(false);
  const [preferenceLoaded, setPreferenceLoaded] = useState(false);
  const [tourIndex, setTourIndex] = useState<number | null>(null);
  const [targetRect, setTargetRect] = useState<{ top: number; left: number; width: number; height: number } | null>(null);
  const [tourCardStyle, setTourCardStyle] = useState<CSSProperties>({});
  const cardRef = useRef<HTMLElement>(null);
  const storageKey = `sr-setup-assistant-dismissed:${businessId}`;
  const completed = steps.filter((step) => step.done).length;
  const nextStep = useMemo(() => steps.find((step) => !step.done), [steps]);
  const nextStepIndex = nextStep ? steps.indexOf(nextStep) : -1;
  const tourStep = tourIndex === null ? null : PANEL_TOUR_STEPS[tourIndex];
  const percent = steps.length ? Math.round((completed / steps.length) * 100) : 0;

  useEffect(() => {
    if (!businessId || !ready || !nextStep) return;
    let dismissed = false;
    try { dismissed = window.localStorage.getItem(storageKey) === "1"; } catch { /* yok say */ }
    queueMicrotask(() => {
      setPreferenceLoaded(true);
      setCollapsed(dismissed);
    });
  }, [businessId, nextStep, ready, storageKey]);

  useEffect(() => {
    if (tourIndex === null || !tourStep) return;
    let target: HTMLElement | null = null;
    let positionTimer = 0;
    const selector = `[data-dashboard-tour="${tourStep.target}"]`;

    const update = () => {
      if (!target) return;
      const rect = target.getBoundingClientRect();
      setTargetRect({ top: rect.top, left: rect.left, width: rect.width, height: rect.height });
      if (window.innerWidth < 760) {
        setTourCardStyle({});
        return;
      }
      const card = cardRef.current;
      const cardWidth = Math.min(card?.getBoundingClientRect().width ?? 400, window.innerWidth - 40);
      const cardHeight = Math.min(card?.getBoundingClientRect().height ?? 410, window.innerHeight - 24);
      const gap = 22;
      const fitsRight = rect.right + gap + cardWidth <= window.innerWidth - 18;
      const fitsLeft = rect.left - gap - cardWidth >= 18;
      const left = fitsRight ? rect.right + gap : fitsLeft ? rect.left - gap - cardWidth : window.innerWidth - cardWidth - 24;
      const top = Math.min(Math.max(rect.top + rect.height / 2 - cardHeight / 2, 12), Math.max(12, window.innerHeight - cardHeight - 12));
      setTourCardStyle({ left, top, right: "auto", bottom: "auto" });
    };

    const reveal = () => {
      const targets = Array.from(document.querySelectorAll<HTMLElement>(selector));
      targets.forEach((item) => {
        const collapsedGroup = item.closest("details");
        if (collapsedGroup instanceof HTMLDetailsElement) collapsedGroup.open = true;
      });
      target = targets.find((item) => item.offsetParent !== null || item.getClientRects().length > 0) ?? null;
      if (!target) {
        setTargetRect(null);
        setTourCardStyle({});
        return;
      }
      target.dataset.dashboardTourActive = "true";
      target.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: window.innerWidth < 760 ? "start" : "center", inline: "nearest" });
      window.requestAnimationFrame(() => {
        if (cardRef.current) {
          cardRef.current.scrollTop = 0;
          cardRef.current.focus({ preventScroll: true });
        }
        update();
      });
      positionTimer = window.setTimeout(update, 420);
    };

    window.dispatchEvent(new CustomEvent("dashboard:tour-reveal", { detail: { target: tourStep.target } }));
    const revealTimer = window.setTimeout(reveal, 120);
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setTourIndex(null);
      if (event.key === "ArrowRight") setTourIndex((value) => value === null ? null : Math.min(PANEL_TOUR_STEPS.length - 1, value + 1));
      if (event.key === "ArrowLeft") setTourIndex((value) => value === null ? null : Math.max(0, value - 1));
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      window.clearTimeout(revealTimer);
      window.clearTimeout(positionTimer);
      if (target) delete target.dataset.dashboardTourActive;
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [tourIndex, tourStep]);

  useEffect(() => {
    if (tourIndex === null) return;
    document.body.classList.add("dashboard-tour-active");
    return () => document.body.classList.remove("dashboard-tour-active");
  }, [tourIndex]);

  if (!businessId || !ready || !nextStep || !preferenceLoaded) return null;

  function setDismissed(value: boolean) {
    try {
      if (value) window.localStorage.setItem(storageKey, "1");
      else window.localStorage.removeItem(storageKey);
    } catch { /* yok say */ }
    setCollapsed(value);
  }

  function startTour() {
    setTargetRect(null);
    setTourIndex(0);
  }

  const tour = tourStep && tourIndex !== null && typeof document !== "undefined" ? createPortal(
    <div className={cn(dashTokensClassName, styles.tourLayer)} role="dialog" aria-modal="true" aria-label="İşletme paneli tanıtım turu">
      {targetRect
        ? <span className={styles.spotlight} style={{ top: targetRect.top - 6, left: targetRect.left - 6, width: targetRect.width + 12, height: targetRect.height + 12 }} />
        : <span className={styles.dim} />}
      <section ref={cardRef} className={styles.tourCard} style={tourCardStyle} aria-live="polite" tabIndex={-1}>
        <button type="button" className={styles.tourClose} onClick={() => setTourIndex(null)} aria-label="Panel turunu kapat"><X size={17} /></button>
        <div className={styles.tourCoach}>
          <span><RoviMascot size={64} alt="" /></span>
          <div><small>Rovi ile panel turu · {tourIndex + 1}/{PANEL_TOUR_STEPS.length}</small><b>Bu alanı birlikte inceleyelim</b></div>
        </div>
        <span className={styles.tourKicker}><MousePointer2 size={13} aria-hidden /> Şimdi buraya bak</span>
        <h2 className={styles.tourTitle}>{tourStep.title}</h2>
        <p className={styles.tourText}>{tourStep.description}</p>
        <div className={styles.tourHint}><Sparkles size={15} aria-hidden /><span><b>Rovi&apos;nin notu</b>{tourStep.hint}</span></div>
        <Button href={tourStep.href} variant="primary" block trailingIcon={ArrowRight} className="mt-3" onClick={() => setTourIndex(null)}>Bu bölümü şimdi aç</Button>
        <div className={styles.tourDots} aria-hidden>{PANEL_TOUR_STEPS.map((step, index) => <i key={step.target} className={index <= tourIndex ? styles.tourDotOn : undefined} />)}</div>
        <footer className={styles.tourFoot}>
          <Button variant="secondary" size="sm" icon={ChevronLeft} disabled={tourIndex === 0} onClick={(event) => { event.currentTarget.blur(); setTargetRect(null); setTourIndex((value) => Math.max(0, (value ?? 0) - 1)); }}>Geri</Button>
          <span>{tourIndex + 1} / {PANEL_TOUR_STEPS.length}</span>
          <Button variant="soft" size="sm" trailingIcon={ChevronRight} onClick={(event) => { event.currentTarget.blur(); setTargetRect(null); if (tourIndex === PANEL_TOUR_STEPS.length - 1) setTourIndex(null); else setTourIndex(tourIndex + 1); }}>{tourIndex === PANEL_TOUR_STEPS.length - 1 ? "Bitir" : "Sonraki"}</Button>
        </footer>
      </section>
    </div>,
    document.body,
  ) : null;

  if (collapsed) {
    return (
      <>
        <button type="button" className={styles.compact} onClick={() => setDismissed(false)} aria-label={`Kurulum rehberini aç. ${completed}/${steps.length} adım tamamlandı`}>
          <span className={styles.compactMascot} aria-hidden><RoviMascot size={40} alt="" interactive={false} /></span>
          <span className={styles.compactText}><b>Kurulum %{percent}</b><small>Sıradaki: {nextStep.title}</small></span>
          <span className={styles.compactRing} style={{ "--p": percent } as CSSProperties} aria-hidden><i>{completed}/{steps.length}</i></span>
          <ChevronDown size={16} aria-hidden />
        </button>
        {tour}
      </>
    );
  }

  return (
    <>
      <section className={styles.panel} aria-label="Rovi kurulum rehberi">
        <div className={styles.head}>
          <span className={styles.mascot} aria-hidden><RoviMascot size={92} mood="wave" alt="" /></span>
          <div className={styles.headText}>
            <span className={styles.kicker}><Sparkles size={12} aria-hidden /> Rovi · Kurulum rehberin</span>
            <h2>Mağazanı yayına hazırlayalım</h2>
            <p>Şimdi <b>{nextStep.title.toLocaleLowerCase("tr-TR")}</b>. Adım adım yanındayım.</p>
          </div>
          <button type="button" className={styles.close} onClick={() => setDismissed(true)} aria-label="Kurulum rehberini küçült"><X size={16} /></button>
        </div>
        <div className={styles.progress}>
          <div className={styles.track} role="progressbar" aria-label="Kurulum ilerlemesi" aria-valuemin={0} aria-valuemax={steps.length} aria-valuenow={completed}>
            <span style={{ width: `${percent}%` }} />
          </div>
          <b>{completed}/{steps.length}</b>
        </div>
        <ol className={styles.steps}>
          {steps.map((step, index) => {
            const current = step === nextStep;
            return (
              <li key={step.title} className={cn(styles.step, step.done && styles.stepDone, current && styles.stepCurrent)} aria-current={current ? "step" : undefined}>
                <Link href={step.href} className={styles.stepLink}>
                  <span className={styles.stepNum}>{step.done ? <Check size={14} strokeWidth={3} aria-hidden /> : index + 1}</span>
                  <span className={styles.stepText}><b>{step.title}</b><small>{step.done ? "Tamamlandı" : current ? step.description : "Seni bekliyor"}</small></span>
                  {!step.done && <ArrowRight size={15} className={styles.stepArrow} aria-hidden />}
                </Link>
              </li>
            );
          })}
        </ol>
        <div className={styles.actions}>
          <Button href={steps[nextStepIndex]?.href ?? "/dashboard/ayarlar"} variant="primary" trailingIcon={ArrowRight}>{nextStep.action}</Button>
          <Button variant="ghost" icon={Play} onClick={startTour}>Paneli bana öğret</Button>
        </div>
      </section>
      {tour}
    </>
  );
}
