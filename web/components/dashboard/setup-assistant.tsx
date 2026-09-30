"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { ArrowRight, Check, Sparkles, X } from "lucide-react";

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
  const nextStepIndex = nextStep ? steps.indexOf(nextStep) : -1;

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
        className="setup-assistant-trigger fixed bottom-24 right-4 z-[70] inline-flex min-h-14 items-center gap-2.5 rounded-full py-1.5 pl-1.5 pr-3.5 text-left shadow-2xl transition hover:-translate-y-0.5 lg:bottom-6 lg:right-6"
        aria-label={`Rande ile kurulum rehberini aç. ${completed}/${steps.length} adım tamamlandı`}
      >
        <span className="setup-assistant-trigger__mascot" aria-hidden="true"><Image src="/mascots/randevu-rehberi.png" alt="" width={54} height={50}/></span>
        <span className="leading-tight"><b className="block text-xs">Rande yardım etsin</b><small className="text-[9px] font-semibold opacity-70">Sıradaki: {nextStep.title}</small></span>
        <span className="setup-assistant-trigger__progress rounded-full px-2 py-1 text-[10px] font-black">{completed}/{steps.length}</span>
      </button>
    );
  }

  return (
    <aside
      className="setup-assistant fixed bottom-3 right-3 z-[80] w-[calc(100vw-1.5rem)] max-w-[500px] overflow-hidden rounded-[30px] lg:bottom-6 lg:right-6"
      aria-label="Rande kurulum koçu"
    >
      <div className="setup-assistant__header text-white">
        <button type="button" onClick={dismiss} className="setup-assistant__close grid h-9 w-9 place-items-center rounded-full text-white transition" aria-label="Kurulum rehberini kapat"><X size={17}/></button>
        <div className="setup-assistant__coach">
          <div className="setup-assistant__mascot" aria-hidden="true">
            <span className="setup-assistant__mascot-glow"/>
            <Image src="/mascots/randevu-rehberi.png" alt="" width={154} height={141} priority/>
          </div>
          <div className="setup-assistant__bubble">
            <span className="setup-assistant__kicker inline-flex items-center gap-1.5 text-[9px] font-black tracking-[.15em]"><Sparkles size={12}/> RANDE · KURULUM KOÇUN</span>
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
        <Link href={nextStep.href} className="setup-assistant__action mt-3 inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl px-4 text-xs font-black transition">{nextStep.action}<ArrowRight size={15}/></Link>
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
      <button type="button" onClick={dismiss} className="setup-assistant__dismiss w-full border-t px-4 py-3 text-[11px] font-bold">Rande’yi şimdilik dinlendir</button>
    </aside>
  );
}
