"use client";

import { useEffect, useRef } from "react";

const COLORS = ["#d7ff70", "#1f7a4a", "#86efac", "#fbbf24", "#ffffff", "#f472b6", "#5eead4"];

type Piece = { x: number; y: number; vx: number; vy: number; size: number; rot: number; vr: number; color: string; shape: 0 | 1 | 2; life: number };

/** Hafif, bağımlılıksız canvas konfeti. `burst` her değiştiğinde patlar; hareket azaltma tercihinde hiç çizmez. */
export function Confetti({ burst }: { burst: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!burst || !canvas) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const width = window.innerWidth;
    const height = window.innerHeight;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const count = width < 600 ? 110 : 170;
    const pieces: Piece[] = [];
    for (let i = 0; i < count; i += 1) {
      const fromLeft = i % 2 === 0;
      const angle = (fromLeft ? -60 : -120) + (Math.random() - 0.5) * 50;
      const speed = 9 + Math.random() * 9;
      pieces.push({
        x: fromLeft ? -10 : width + 10,
        y: height * (0.55 + Math.random() * 0.25),
        vx: Math.cos((angle * Math.PI) / 180) * speed,
        vy: Math.sin((angle * Math.PI) / 180) * speed,
        size: 6 + Math.random() * 7,
        rot: Math.random() * Math.PI,
        vr: (Math.random() - 0.5) * 0.3,
        color: COLORS[i % COLORS.length],
        shape: (i % 3) as 0 | 1 | 2,
        life: 0,
      });
    }

    let frame = 0;
    const start = performance.now();
    const draw = (now: number) => {
      const elapsed = now - start;
      ctx.clearRect(0, 0, width, height);
      let alive = 0;
      for (const piece of pieces) {
        piece.vy += 0.32;
        piece.vx *= 0.985;
        piece.vy *= 0.985;
        piece.x += piece.vx;
        piece.y += piece.vy;
        piece.rot += piece.vr;
        if (piece.y > height + 30) continue;
        alive += 1;
        const fade = elapsed > 2600 ? Math.max(0, 1 - (elapsed - 2600) / 900) : 1;
        ctx.save();
        ctx.globalAlpha = fade;
        ctx.translate(piece.x, piece.y);
        ctx.rotate(piece.rot);
        ctx.fillStyle = piece.color;
        if (piece.shape === 0) ctx.fillRect(-piece.size / 2, -piece.size / 4, piece.size, piece.size / 2);
        else if (piece.shape === 1) {
          ctx.beginPath();
          ctx.arc(0, 0, piece.size / 2.6, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.beginPath();
          ctx.moveTo(0, -piece.size / 2);
          ctx.lineTo(piece.size / 2, piece.size / 2);
          ctx.lineTo(-piece.size / 2, piece.size / 2);
          ctx.closePath();
          ctx.fill();
        }
        ctx.restore();
      }
      if (alive > 0 && elapsed < 3600) frame = requestAnimationFrame(draw);
      else ctx.clearRect(0, 0, width, height);
    };
    frame = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(frame);
      ctx.clearRect(0, 0, width, height);
    };
  }, [burst]);

  return <canvas ref={canvasRef} aria-hidden="true" style={{ position: "fixed", inset: 0, width: "100vw", height: "100vh", pointerEvents: "none", zIndex: 80 }} />;
}
