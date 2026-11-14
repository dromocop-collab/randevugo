"use client";

import { useEffect, useRef } from "react";

// Kazanınca patlayan konfeti: tek <canvas>, fizik (yerçekimi, hava direnci, dönme, salınım), ~3 sn.
// Hareket azaltma tercihi varsa hiç çizilmez.

const COLORS = ["#d7ff70", "#9be564", "#1f8a5b", "#ffd166", "#ffffff", "#ff8a65", "#0f5132"];

type Piece = {
  x: number; y: number; vx: number; vy: number; rot: number; vr: number;
  w: number; h: number; color: string; shape: 0 | 1 | 2; wobble: number; wobbleSpeed: number; life: number;
};

export function ConfettiBurst({ fireKey, originY = 0.38 }: { fireKey: number; originY?: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!fireKey) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      canvas.width = Math.max(1, Math.round(rect.width * dpr));
      canvas.height = Math.max(1, Math.round(rect.height * dpr));
    };
    resize();
    const w = () => canvas.width / dpr;
    const h = () => canvas.height / dpr;
    const pieces: Piece[] = [];
    const burst = (count: number, cx: number, cy: number, spread: number, power: number) => {
      for (let i = 0; i < count; i++) {
        const angle = -Math.PI / 2 + (Math.random() - 0.5) * spread;
        const speed = power * (0.55 + Math.random() * 0.75);
        pieces.push({
          x: cx, y: cy, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
          rot: Math.random() * Math.PI * 2, vr: (Math.random() - 0.5) * 0.4,
          w: 6 + Math.random() * 7, h: 3 + Math.random() * 6, color: COLORS[(Math.random() * COLORS.length) | 0],
          shape: Math.floor(Math.random() * 3) as 0 | 1 | 2, wobble: Math.random() * 10, wobbleSpeed: 0.08 + Math.random() * 0.12, life: 1,
        });
      }
    };
    // Merkezden büyük patlama + iki yandan çapraz yağmur.
    burst(120, w() / 2, h() * originY, Math.PI * 1.1, 15);
    window.setTimeout(() => { burst(45, 0, h() * 0.55, Math.PI * 0.5, 13); burst(45, w(), h() * 0.55, Math.PI * 0.5, 13); }, 160);

    let frame = 0;
    let last = performance.now();
    const started = last;
    const loop = (now: number) => {
      const dt = Math.min(2.2, (now - last) / 16.67);
      last = now;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w(), h());
      for (const p of pieces) {
        p.vx *= 0.985 ** dt;
        p.vy = p.vy * 0.985 ** dt + 0.32 * dt;
        p.wobble += p.wobbleSpeed * dt;
        p.x += (p.vx + Math.sin(p.wobble) * 1.4) * dt;
        p.y += p.vy * dt;
        p.rot += p.vr * dt;
        if (now - started > 2200) p.life -= 0.02 * dt;
        if (p.life <= 0 || p.y > h() + 40) continue;
        ctx.save();
        ctx.globalAlpha = Math.max(0, Math.min(1, p.life));
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.scale(1, Math.cos(p.wobble * 1.6)); // kağıdın dönerken incelmesi
        ctx.fillStyle = p.color;
        if (p.shape === 0) ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        else if (p.shape === 1) { ctx.beginPath(); ctx.arc(0, 0, p.h * 0.7, 0, Math.PI * 2); ctx.fill(); }
        else { ctx.beginPath(); ctx.moveTo(-p.w / 2, 0); ctx.quadraticCurveTo(0, -p.h, p.w / 2, 0); ctx.quadraticCurveTo(0, p.h, -p.w / 2, 0); ctx.fill(); }
        ctx.restore();
      }
      if (now - started < 4200) frame = requestAnimationFrame(loop);
      else ctx.clearRect(0, 0, w(), h());
    };
    frame = requestAnimationFrame(loop);
    window.addEventListener("resize", resize);
    return () => { cancelAnimationFrame(frame); window.removeEventListener("resize", resize); };
  }, [fireKey, originY]);

  return <canvas ref={canvasRef} aria-hidden="true" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none", zIndex: 5 }} />;
}
