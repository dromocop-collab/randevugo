"use client";

import { useEffect } from "react";

/**
 * Ucuz kaydırma animasyonu: `data-reveal` taşıyan öğelerden yalnızca ekranın ALTINDA kalanlar
 * gizlenip görünür alana girince belirir. İlk ekrandakiler hiç gizlenmez (titreme / LCP gecikmesi yok);
 * JS yoksa veya hareket azaltma açıksa içerik olduğu gibi görünür. Yerleşim değişmez (sadece opacity/transform).
 */
export function ScrollReveal() {
  useEffect(() => {
    if (typeof window === "undefined" || typeof IntersectionObserver === "undefined") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        (entry.target as HTMLElement).dataset.revealState = "in";
        observer.unobserve(entry.target);
      }
    }, { rootMargin: "0px 0px -6% 0px", threshold: 0.06 });

    const arm = () => {
      const fold = window.innerHeight * 0.94;
      // "out" olanlar da yeniden gözlenir (StrictMode'da efekt iki kez çalışır; observe aynı öğede etkisizdir).
      document.querySelectorAll<HTMLElement>('[data-reveal]:not([data-reveal-state="in"])').forEach((node) => {
        if (node.getBoundingClientRect().top < fold) { node.dataset.revealState = "in"; return; }
        node.dataset.revealState = "out";
        observer.observe(node);
      });
    };
    arm();
    // Sonradan gelen bölümler (canlı veriler) için hafif yeniden tarama.
    let frame = 0;
    const mutation = new MutationObserver(() => {
      if (frame) return;
      frame = requestAnimationFrame(() => { frame = 0; arm(); });
    });
    const root = document.querySelector("main") ?? document.body;
    mutation.observe(root, { childList: true, subtree: true });
    return () => { observer.disconnect(); mutation.disconnect(); if (frame) cancelAnimationFrame(frame); };
  }, []);

  return null;
}
