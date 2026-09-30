"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowRight, Check, CircleHelp, Sparkles, X } from "lucide-react";

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

export function SetupAssistant({ businessId, ready, steps }: Props) {
  const [open, setOpen] = useState(false);
  const [preferenceLoaded, setPreferenceLoaded] = useState(false);
  const storageKey = `sr-setup-assistant-dismissed:${businessId}`;
  const completed = steps.filter((step) => step.done).length;
  const nextStep = useMemo(() => steps.find((step) => !step.done), [steps]);

  useEffect(() => {
    if (!businessId || !ready || !nextStep) return;
    const dismissed = window.localStorage.getItem(storageKey) === "1";
    queueMicrotask(() => {
      setPreferenceLoaded(true);
      setOpen(!dismissed);
    });
  }, [businessId, nextStep, ready, storageKey]);

  if (!businessId || !ready || !nextStep || !preferenceLoaded) return null;

  function dismiss() {
    window.localStorage.setItem(storageKey, "1");
    setOpen(false);
  }

  function reopen() {
    window.localStorage.removeItem(storageKey);
    setOpen(true);
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={reopen}
        className="setup-assistant-trigger fixed bottom-24 right-4 z-[70] inline-flex min-h-12 items-center gap-2 rounded-full px-4 text-sm font-bold shadow-2xl transition hover:-translate-y-0.5 lg:bottom-6 lg:right-6"
        aria-label="Kurulum rehberini aç"
      >
        <CircleHelp size={18}/>
        Kurulum rehberi
        <span className="setup-assistant-trigger__progress rounded-full px-2 py-0.5 text-[10px]">{completed}/{steps.length}</span>
      </button>
    );
  }

  return (
    <aside
      className="setup-assistant fixed bottom-3 right-3 z-[80] w-[calc(100vw-1.5rem)] max-w-md overflow-hidden rounded-[26px] lg:bottom-6 lg:right-6"
      aria-label="İşletme kurulum yardımcısı"
    >
      <div className="setup-assistant__header px-5 py-5 text-white">
        <div className="flex items-start justify-between gap-4">
          <div>
            <span className="setup-assistant__kicker inline-flex items-center gap-1.5 text-[10px] font-black tracking-[.16em]"><Sparkles size={13}/> AKILLI KURULUM YARDIMCISI</span>
            <h2 className="mt-2 text-xl font-bold">Mağazanı birlikte hazırlayalım</h2>
            <p className="mt-1 text-xs leading-5 text-white/70">Sıradaki adımı aç; işlem bitince rehber otomatik ilerler.</p>
          </div>
          <button type="button" onClick={dismiss} className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white/10 text-white transition hover:bg-white/20" aria-label="Kurulum rehberini kapat"><X size={17}/></button>
        </div>
        <div className="mt-4 flex items-center gap-3">
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/15"><div className="setup-assistant__progress h-full rounded-full transition-all" style={{ width: `${completed / steps.length * 100}%` }}/></div>
          <b className="text-xs">{completed}/{steps.length}</b>
        </div>
      </div>

      <ol className="max-h-[52vh] space-y-2 overflow-y-auto p-4">
        {steps.map((step, index) => {
          const current = step === nextStep;
          return (
            <li key={step.title} className={`setup-assistant__step rounded-2xl border p-3.5 transition ${step.done ? "is-done" : current ? "is-current shadow-sm" : "is-upcoming"}`}>
              <div className="flex items-start gap-3">
                <span className={`setup-assistant__number grid h-8 w-8 shrink-0 place-items-center rounded-full text-xs font-black ${step.done ? "is-done" : current ? "is-current" : "is-upcoming"}`}>{step.done ? <Check size={15} strokeWidth={3}/> : index + 1}</span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2"><b className="text-sm">{step.title}</b>{current && <span className="setup-assistant__next rounded-full px-2 py-1 text-[9px] font-black">SIRADAKİ</span>}</div>
                  <p className="mt-1 text-[11px] leading-5">{step.description}</p>
                  {!step.done && current && <Link href={step.href} className="setup-assistant__action mt-3 inline-flex min-h-10 items-center gap-2 rounded-xl px-3.5 text-xs font-bold transition">{step.action}<ArrowRight size={14}/></Link>}
                </div>
              </div>
            </li>
          );
        })}
      </ol>
      <button type="button" onClick={dismiss} className="setup-assistant__dismiss w-full border-t px-4 py-3 text-xs font-semibold">Şimdilik kapat — sağ alttan tekrar açabilirsin</button>
    </aside>
  );
}
