"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import { ArrowRight, Check, ChevronLeft, ChevronRight, MousePointer2, Play, Sparkles, X } from "lucide-react";
import { RoviMascot } from "@/components/brand/rovi-mascot";

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

export function SetupAssistant({ businessId, ready, steps }: Props) {
  const [open, setOpen] = useState(false);
  const [preferenceLoaded, setPreferenceLoaded] = useState(false);
  const [tourIndex, setTourIndex] = useState<number | null>(null);
  const [targetRect, setTargetRect] = useState<{ top: number; left: number; width: number; height: number } | null>(null);
  const [tourCardStyle, setTourCardStyle] = useState<CSSProperties>({});
  const storageKey = `sr-setup-assistant-dismissed:${businessId}`;
  const completed = steps.filter((step) => step.done).length;
  const nextStep = useMemo(() => steps.find((step) => !step.done), [steps]);
  const nextStepIndex = nextStep ? steps.indexOf(nextStep) : -1;
  const tourStep = tourIndex === null ? null : PANEL_TOUR_STEPS[tourIndex];

  useEffect(() => {
    if (!businessId || !ready || !nextStep) return;
    const dismissed = window.localStorage.getItem(storageKey) === "1";
    queueMicrotask(() => {
      setPreferenceLoaded(true);
      setOpen(!dismissed);
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
      const card = document.querySelector<HTMLElement>(".dashboard-tour-card");
      const cardWidth = Math.min(card?.getBoundingClientRect().width ?? 400, window.innerWidth - 40);
      const cardHeight = Math.min(card?.getBoundingClientRect().height ?? 410, window.innerHeight - 24);
      const gap = 22;
      const fitsRight = rect.right + gap + cardWidth <= window.innerWidth - 18;
      const fitsLeft = rect.left - gap - cardWidth >= 18;
      const left = fitsRight
        ? rect.right + gap
        : fitsLeft
          ? rect.left - gap - cardWidth
          : window.innerWidth - cardWidth - 24;
      const top = Math.min(
        Math.max(rect.top + rect.height / 2 - cardHeight / 2, 12),
        Math.max(12, window.innerHeight - cardHeight - 12),
      );
      setTourCardStyle({ left, top, right: "auto", bottom: "auto" });
    };

    const reveal = () => {
      const targets = Array.from(document.querySelectorAll<HTMLElement>(selector));
      targets.forEach((item) => {
        const collapsedGroup = item.closest("details");
        if (collapsedGroup instanceof HTMLDetailsElement) collapsedGroup.open = true;
      });
      target = targets.find((item) => item.offsetParent !== null) ?? null;
      if (!target) {
        setTargetRect(null);
        setTourCardStyle({});
        return;
      }
      target.dataset.dashboardTourActive = "true";
      target.scrollIntoView({
        behavior: "smooth",
        block: window.innerWidth < 760 ? "start" : "center",
        inline: "nearest",
      });
      window.requestAnimationFrame(() => {
        const card = document.querySelector<HTMLElement>(".dashboard-tour-card");
        if (card) {
          card.scrollTop = 0;
          card.focus({ preventScroll: true });
        }
        update();
      });
      positionTimer = window.setTimeout(update, 420);
    };

    window.dispatchEvent(new CustomEvent("dashboard:tour-reveal", { detail: { target: tourStep.target } }));
    const revealTimer = window.setTimeout(reveal, 80);
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

  function dismiss() {
    window.localStorage.setItem(storageKey, "1");
    setOpen(false);
  }

  function reopen() {
    window.localStorage.removeItem(storageKey);
    setOpen(true);
  }

  function startTour() {
    setTargetRect(null);
    setTourIndex(0);
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={reopen}
        className="setup-assistant-trigger fixed bottom-24 right-4 z-[60] inline-flex min-h-14 items-center gap-2.5 rounded-full py-1.5 pl-1.5 pr-3.5 text-left shadow-2xl transition hover:-translate-y-0.5 lg:bottom-6 lg:right-6 lg:z-[70]"
        aria-label={`Rovi ile kurulum rehberini aç. ${completed}/${steps.length} adım tamamlandı`}
      >
        <span className="setup-assistant-trigger__mascot" aria-hidden="true"><RoviMascot size={54} alt="" /></span>
        <span className="leading-tight"><b className="block text-xs">Rovi yardım etsin</b><small className="text-[9px] font-semibold opacity-70">Sıradaki: {nextStep.title}</small></span>
        <span className="setup-assistant-trigger__progress rounded-full px-2 py-1 text-[10px] font-black">{completed}/{steps.length}</span>
      </button>
    );
  }

  return (
    <>
      <aside
      className="setup-assistant fixed bottom-3 right-3 z-[60] w-[calc(100vw-1.5rem)] max-w-[500px] overflow-hidden rounded-[30px] lg:bottom-6 lg:right-6 lg:z-[80]"
      aria-label="Rovi kurulum koçu"
    >
      <div className="setup-assistant__header text-white">
        <button type="button" onClick={dismiss} className="setup-assistant__close grid h-9 w-9 place-items-center rounded-full text-white transition" aria-label="Kurulum rehberini kapat"><X size={17}/></button>
        <div className="setup-assistant__coach">
          <div className="setup-assistant__mascot" aria-hidden="true">
            <span className="setup-assistant__mascot-glow"/>
            <RoviMascot size={154} alt="" priority />
          </div>
          <div className="setup-assistant__bubble">
            <span className="setup-assistant__kicker inline-flex items-center gap-1.5 text-[9px] font-black tracking-[.15em]"><Sparkles size={12}/> ROVİ · KURULUM KOÇUN</span>
            <h2 className="mt-1.5 text-lg font-black">Haydi, mağazanı yayına hazırlayalım!</h2>
            <p className="mt-1 text-[11px] leading-[1.55]">Şimdi <b>{nextStep.title.toLocaleLowerCase("tr-TR")}</b>. Ben adım adım yanında olacağım.</p>
          </div>
        </div>
        <div className="setup-assistant__progress-row">
          <div>
            <span>{completed === 0 ? "Başlangıç" : `${completed} adım tamam`}</span>
            <b>%{Math.round(completed / steps.length * 100)}</b>
          </div>
          <div className="setup-assistant__track" role="progressbar" aria-label="Kurulum ilerlemesi" aria-valuemin={0} aria-valuemax={steps.length} aria-valuenow={completed}>
            <span className="setup-assistant__progress" style={{ width: `${completed / steps.length * 100}%` }}/>
          </div>
          <small>{completed}/{steps.length}</small>
        </div>
      </div>

        <div className="setup-assistant__current">
        <span className="setup-assistant__current-label">SIRADAKİ GÖREV · {nextStepIndex + 1}. ADIM</span>
        <h3>{nextStep.title}</h3>
        <p>{nextStep.description}</p>
          <div className="setup-assistant__current-actions">
            <Link href={nextStep.href} className="setup-assistant__action inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl px-4 text-xs font-black transition">{nextStep.action}<ArrowRight size={15}/></Link>
            <button type="button" onClick={startTour} className="setup-assistant__tour-start"><Play size={14} fill="currentColor"/> Paneli bana öğret</button>
          </div>
      </div>

      <ol className="setup-assistant__roadmap" aria-label="Kurulum adımları">
        {steps.map((step, index) => {
          const current = step === nextStep;
          return (
            <li key={step.title} className={`setup-assistant__step ${step.done ? "is-done" : current ? "is-current" : "is-upcoming"}`} aria-current={current ? "step" : undefined}>
              <span className={`setup-assistant__number ${step.done ? "is-done" : current ? "is-current" : "is-upcoming"}`}>{step.done ? <Check size={13} strokeWidth={3}/> : index + 1}</span>
              <span className="min-w-0"><b>{step.title}</b><small>{step.done ? "Tamamlandı" : current ? "Şimdi bunu yapıyoruz" : "Seni bekliyor"}</small></span>
              {current && <span className="setup-assistant__pulse" aria-hidden="true"/>}
            </li>
          );
        })}
      </ol>
      <button type="button" onClick={dismiss} className="setup-assistant__dismiss w-full border-t px-4 py-3 text-[11px] font-bold">Rovi’yi şimdilik dinlendir</button>
      </aside>
      {tourStep && tourIndex !== null && typeof document !== "undefined" && createPortal(<div className="dashboard-tour-layer" role="dialog" aria-modal="true" aria-label="İşletme paneli tanıtım turu">
        {targetRect && <span className="dashboard-tour-spotlight" style={{ top: targetRect.top - 7, left: targetRect.left - 7, width: targetRect.width + 14, height: targetRect.height + 14 } as CSSProperties}/>}
          <section className="dashboard-tour-card" style={tourCardStyle} aria-live="polite" tabIndex={-1}>
            <button type="button" className="dashboard-tour-close" onClick={() => setTourIndex(null)} aria-label="Panel turunu kapat"><X size={17}/></button>
            <div className="dashboard-tour-coach"><span><RoviMascot size={84} alt="Rovi panel rehberi" /></span><div><small>ROVİ İLE PANEL TURU · {tourIndex + 1}/{PANEL_TOUR_STEPS.length}</small><b>Bu alanı birlikte inceleyelim</b></div></div>
            <span className="dashboard-tour-kicker"><MousePointer2 size={14}/> ŞİMDİ BURAYA BAK</span>
            <h2>{tourStep.title}</h2>
            <p>{tourStep.description}</p>
            <div className="dashboard-tour-speech"><Sparkles size={15}/><span><b>Rovi&apos;nin kısa notu</b>{tourStep.hint}</span></div>
            <Link href={tourStep.href} onClick={() => setTourIndex(null)} className="dashboard-tour-open">Bu bölümü şimdi aç <ArrowRight size={15}/></Link>
          <div className="dashboard-tour-progress" aria-label={`Tur adımı ${tourIndex + 1}/${PANEL_TOUR_STEPS.length}`}>{PANEL_TOUR_STEPS.map((step, index) => <i key={step.target} className={index <= tourIndex ? "active" : ""}/>)}</div>
            <footer><button type="button" onClick={(event) => { event.currentTarget.blur(); setTargetRect(null); setTourIndex((value) => Math.max(0, (value ?? 0) - 1)); }} disabled={tourIndex === 0}><ChevronLeft size={16}/> Geri</button><span>{tourIndex + 1} / {PANEL_TOUR_STEPS.length}</span><button type="button" title="Sıradaki alanı göster" onClick={(event) => { event.currentTarget.blur(); setTargetRect(null); if (tourIndex === PANEL_TOUR_STEPS.length - 1) setTourIndex(null); else setTourIndex(tourIndex + 1); }}>{tourIndex === PANEL_TOUR_STEPS.length - 1 ? "Turu bitir" : "Sonraki alan"}<ChevronRight size={16}/></button></footer>
        </section>
        </div>, document.body)}
    </>
  );
}
