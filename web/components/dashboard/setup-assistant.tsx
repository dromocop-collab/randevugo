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
        className="fixed bottom-24 right-4 z-[70] inline-flex min-h-12 items-center gap-2 rounded-full border border-white/20 bg-[#073d2a] px-4 text-sm font-bold text-white shadow-2xl transition hover:-translate-y-0.5 hover:bg-[#0a5138] lg:bottom-6 lg:right-6"
        aria-label="Kurulum rehberini aç"
      >
        <CircleHelp size={18}/>
        Kurulum rehberi
        <span className="rounded-full bg-[#c9f45b] px-2 py-0.5 text-[10px] text-[#12351f]">{completed}/4</span>
      </button>
    );
  }

  return (
    <aside
      className="fixed bottom-3 right-3 z-[80] w-[calc(100vw-1.5rem)] max-w-md overflow-hidden rounded-[26px] border border-emerald-950/10 bg-white shadow-[0_28px_80px_rgba(4,35,23,.28)] lg:bottom-6 lg:right-6"
      aria-label="İşletme kurulum yardımcısı"
    >
      <div className="bg-[linear-gradient(135deg,#062d20,#08734b)] px-5 py-5 text-white">
        <div className="flex items-start justify-between gap-4">
          <div>
            <span className="inline-flex items-center gap-1.5 text-[10px] font-black tracking-[.16em] text-[#c9f45b]"><Sparkles size={13}/> AKILLI KURULUM YARDIMCISI</span>
            <h2 className="mt-2 text-xl font-bold">Mağazanı birlikte hazırlayalım</h2>
            <p className="mt-1 text-xs leading-5 text-white/70">Sıradaki adımı aç; işlem bitince rehber otomatik ilerler.</p>
          </div>
          <button type="button" onClick={dismiss} className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white/10 text-white transition hover:bg-white/20" aria-label="Kurulum rehberini kapat"><X size={17}/></button>
        </div>
        <div className="mt-4 flex items-center gap-3">
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/15"><div className="h-full rounded-full bg-[#c9f45b] transition-all" style={{ width: `${completed / steps.length * 100}%` }}/></div>
          <b className="text-xs">{completed}/{steps.length}</b>
        </div>
      </div>

      <ol className="max-h-[52vh] space-y-2 overflow-y-auto p-4">
        {steps.map((step, index) => {
          const current = step === nextStep;
          return (
            <li key={step.title} className={`rounded-2xl border p-3.5 transition ${step.done ? "border-emerald-100 bg-emerald-50/70" : current ? "border-[#08734b]/30 bg-[#08734b]/5 shadow-sm" : "border-slate-100 bg-slate-50/70"}`}>
              <div className="flex items-start gap-3">
                <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-full text-xs font-black ${step.done ? "bg-emerald-600 text-white" : current ? "bg-[#08734b] text-white" : "bg-slate-200 text-slate-500"}`}>{step.done ? <Check size={15} strokeWidth={3}/> : index + 1}</span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2"><b className={`text-sm ${step.done ? "text-emerald-800" : "text-slate-950"}`}>{step.title}</b>{current && <span className="rounded-full bg-[#c9f45b] px-2 py-1 text-[9px] font-black text-[#17351f]">SIRADAKİ</span>}</div>
                  <p className="mt-1 text-[11px] leading-5 text-slate-500">{step.description}</p>
                  {!step.done && current && <Link href={step.href} className="mt-3 inline-flex min-h-10 items-center gap-2 rounded-xl bg-[#08734b] px-3.5 text-xs font-bold text-white transition hover:bg-[#065f3e]">{step.action}<ArrowRight size={14}/></Link>}
                </div>
              </div>
            </li>
          );
        })}
      </ol>
      <button type="button" onClick={dismiss} className="w-full border-t border-slate-100 px-4 py-3 text-xs font-semibold text-slate-500 hover:bg-slate-50">Şimdilik kapat — sağ alttan tekrar açabilirsin</button>
    </aside>
  );
}
