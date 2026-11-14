"use client";

import { forwardRef, useCallback, useEffect, useId, useImperativeHandle, useMemo, useRef } from "react";
import { easeOutCubic, planLanding, readableInk, sliceColor, type PublicWheelSlice } from "./wheel-domain";
import { playTick } from "./wheel-sound";
import styles from "./spin-wheel.module.css";

// Kampanya çarkı görseli. Tüm hareket tek requestAnimationFrame döngüsünde, React'e dokunmadan
// (SVG öznitelikleri doğrudan güncellenir) → telefonda da 60 fps.
//   idle      : çok yavaş süzülme, ışıklar sırayla yanar; parmakla çevrilebilir (fırlatınca dönmeye başlar)
//   windup    : küçük geri çekilme → hızlanma
//   cruise    : sunucu sonucu gelene kadar sabit hızla döner (gecikme hissedilmez)
//   landing   : hız kesintisiz devralınır, hedef dilimde yavaşlayarak durur
//   done      : kazanılan dilim parlar, ışıklar yanıp söner
// Mandal her çividen geçişte yaylı bir fizikle seker; tık sesi ve titreşim hıza göre seyreltilir.

export type SpinWheelHandle = {
  /** Çevirme başlar (sunucu cevabı beklenirken döner). velocity: fırlatma hızı (derece/sn). */
  start: (velocity?: number) => void;
  /** Hedef dilimde durur; durunca çözülür. */
  land: (targetIndex: number) => Promise<void>;
  /** Hata durumunda: yumuşakça yavaşlayıp bekleme moduna döner. */
  abort: () => void;
  /** Bekleme moduna döner (vurgu ve ışıklar sıfırlanır). */
  reset: () => void;
};

type Props = {
  slices: PublicWheelSlice[];
  /** Merkez düğme etiketi. */
  hubLabel: string;
  hubDisabled?: boolean;
  onHubClick?: () => void;
  /** Parmakla fırlatıldığında (hız eşiği aşılırsa); verilmezse sürükleme kapalı. */
  onFlick?: (velocity: number) => void;
  sound?: boolean;
  /** Kazanma (true) / kaybetme (false) vurgusu; null = yok. */
  outcome?: "win" | "miss" | null;
  ariaLabel: string;
  compact?: boolean;
};

type Phase = "idle" | "drag" | "windup" | "cruise" | "landing" | "abort" | "done";

const VIEW = 400;
const C = VIEW / 2;
const R_SLICE = 170;
const R_BULB = 186;
const CRUISE = 820; // derece/sn

function polar(radius: number, degrees: number) {
  const rad = ((degrees - 90) * Math.PI) / 180;
  // Sunucu/istemci kayan nokta farkı hidrasyon uyuşmazlığı yapmasın diye yuvarlanır.
  return { x: Math.round((C + radius * Math.cos(rad)) * 100) / 100, y: Math.round((C + radius * Math.sin(rad)) * 100) / 100 };
}

function slicePath(index: number, count: number) {
  const step = 360 / count;
  const a0 = index * step, a1 = (index + 1) * step;
  const p0 = polar(R_SLICE, a0), p1 = polar(R_SLICE, a1);
  return `M ${C} ${C} L ${p0.x} ${p0.y} A ${R_SLICE} ${R_SLICE} 0 ${step > 180 ? 1 : 0} 1 ${p1.x} ${p1.y} Z`;
}

/** Uzun etiketi en fazla iki satıra böler. */
function labelLines(label: string, max: number): string[] {
  if (label.length <= max) return [label];
  const words = label.split(" ");
  const lines: string[] = [""];
  for (const word of words) {
    const current = lines[lines.length - 1];
    if ((current + " " + word).trim().length <= max || !current) lines[lines.length - 1] = (current + " " + word).trim();
    else if (lines.length < 2) lines.push(word);
    else lines[1] = `${lines[1]} ${word}`;
  }
  return lines.map((line) => (line.length > max + 3 ? `${line.slice(0, max + 1)}…` : line));
}

export const SpinWheel = forwardRef<SpinWheelHandle, Props>(function SpinWheel(
  { slices, hubLabel, hubDisabled, onHubClick, onFlick, sound = true, outcome = null, ariaLabel, compact = false },
  ref,
) {
  const uid = useId().replace(/:/g, "");
  const count = Math.max(2, slices.length);
  const step = 360 / count;
  const bulbCount = Math.max(20, Math.min(36, count * 3));

  const rotorRef = useRef<SVGGElement>(null);
  const ghostRefs = useRef<Array<SVGUseElement | null>>([]);
  const pointerRef = useRef<SVGGElement>(null);
  const bulbRefs = useRef<Array<SVGCircleElement | null>>([]);
  const highlightRef = useRef<SVGPathElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const state = useRef({
    phase: "idle" as Phase,
    angle: -step / 2 + (Math.random() - 0.5) * step * 0.6,
    velocity: 0,
    phaseStart: 0,
    windFrom: 0,
    landStart: 0, landDistance: 0, landMs: 0, landVelocity: 0, landResolve: null as null | (() => void), targetIndex: -1,
    pointer: 0, pointerV: 0,
    lastPeg: 0, lastTickAt: 0,
    drag: null as null | { lastAngle: number; samples: Array<{ t: number; a: number }> },
    reduced: false,
    soundOn: sound,
    outcome: outcome,
  });
  state.current.soundOn = sound;
  state.current.outcome = outcome;

  const geometry = useMemo(() => slices.map((slice, index) => {
    const fill = sliceColor(slice, index);
    const mid = index * step + step / 2;
    // Yazı kenardan merkeze doğru okunur; önce tek satıra sığdırılır (gerekirse küçültülür), olmazsa iki satır.
    const baseSize = count <= 4 ? 20 : count <= 6 ? 18 : count <= 8 ? 16 : 14;
    const available = R_SLICE - 22 - 60; // kenar boşluğu → merkez düğmenin dışı
    const charWidth = 0.6;
    const singleSize = Math.min(baseSize, available / Math.max(1, slice.label.length * charWidth));
    // Dar dilimde iki satırın yan yana sığacağı genişlik (yay uzunluğu) de sınırlar.
    const arcRoom = (2 * Math.PI * (R_SLICE - 50) * (step / 360));
    let lines = [slice.label];
    let fontSize = singleSize;
    if (singleSize < 11.5 && slice.label.includes(" ")) {
      lines = labelLines(slice.label, Math.ceil(slice.label.length / 2) + 2).slice(0, 2);
      const longest = Math.max(...lines.map((line) => line.length));
      fontSize = Math.min(baseSize, available / (longest * charWidth), arcRoom / 2.6);
    }
    fontSize = Math.max(10, Math.round(fontSize * 10) / 10);
    return { path: slicePath(index, count), fill, ink: readableInk(fill), mid, lines, fontSize, none: slice.type === "none" };
  }), [slices, step, count]);

  const pegs = useMemo(() => Array.from({ length: count }, (_, index) => polar(R_SLICE - 4, index * step)), [count, step]);
  const bulbs = useMemo(() => Array.from({ length: bulbCount }, (_, index) => polar(R_BULB, (index * 360) / bulbCount)), [bulbCount]);

  const tick = useCallback((now: number, speed: number) => {
    const s = state.current;
    // Mandal tepkisi: çiviye çarpınca dönme yönünün tersine itilir.
    s.pointerV -= 260 + Math.min(900, speed * 0.9);
    // Bekleme süzülmesinde ses/titreşim yok; yalnız çevirme ve parmakla sürükleme sırasında.
    if (s.phase === "idle" || s.phase === "done") return;
    // Çok hızlıyken her çivide ses yorucu: en fazla ~22 tık/sn.
    if (now - s.lastTickAt > 45) {
      s.lastTickAt = now;
      if (s.soundOn) playTick(Math.min(1, speed / CRUISE));
      if (speed < 520 && typeof navigator !== "undefined" && "vibrate" in navigator) {
        try { navigator.vibrate(speed < 180 ? 9 : 4); } catch { /* izin yok */ }
      }
    }
  }, []);

  // Tek döngü
  useEffect(() => {
    const s = state.current;
    s.reduced = typeof window !== "undefined" && Boolean(window.matchMedia?.("(prefers-reduced-motion: reduce)").matches);
    let frame = 0;
    let last = performance.now();
    s.lastPeg = Math.floor(s.angle / step);

    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const prevAngle = s.angle;

      switch (s.phase) {
        case "idle":
          s.velocity = s.reduced ? 0 : 7;
          s.angle += s.velocity * dt;
          break;
        case "drag":
          break;
        case "windup": {
          const t = (now - s.phaseStart) / 1000;
          if (t < 0.22) {
            // Geri çekilme (ip germe hissi)
            const u = t / 0.22;
            s.angle = s.windFrom - 9 * Math.sin((u * Math.PI) / 2);
            s.velocity = 0;
          } else {
            const u = Math.min(1, (t - 0.22) / 0.55);
            s.velocity = Math.max(s.velocity, CRUISE * u * u);
            s.angle += s.velocity * dt;
            if (u >= 1) { s.phase = "cruise"; s.phaseStart = now; }
          }
          break;
        }
        case "cruise":
          s.velocity += (CRUISE - s.velocity) * Math.min(1, dt * 2);
          s.angle += s.velocity * dt;
          break;
        case "landing": {
          const u = Math.min(1, (now - s.landStart) / s.landMs);
          const eased = easeOutCubic(u);
          s.angle = s.windFrom + s.landDistance * eased;
          s.velocity = (3 * s.landDistance * (1 - u) ** 2) / (s.landMs / 1000);
          if (u >= 1) {
            s.velocity = 0;
            s.phase = "done";
            const resolve = s.landResolve;
            s.landResolve = null;
            resolve?.();
          }
          break;
        }
        case "abort":
          s.velocity *= Math.pow(0.12, dt);
          s.angle += s.velocity * dt;
          if (s.velocity < 8) s.phase = "idle";
          break;
        case "done":
          s.velocity = 0;
          break;
      }

      // Çivi geçişleri (her iki yönde)
      const peg = Math.floor(s.angle / step);
      if (peg !== s.lastPeg) {
        const passed = Math.abs(peg - s.lastPeg);
        s.lastPeg = peg;
        if (passed < count * 2) tick(now, Math.abs(s.angle - prevAngle) / Math.max(dt, 0.001));
      }

      // Mandal yayı (kritik altı sönümlü)
      const k = 900, damping = 26;
      s.pointerV += (-k * s.pointer - damping * s.pointerV) * dt;
      s.pointer += s.pointerV * dt;
      s.pointer = Math.max(-34, Math.min(10, s.pointer));

      // Çizim
      rotorRef.current?.setAttribute("transform", `rotate(${s.angle.toFixed(3)} ${C} ${C})`);
      pointerRef.current?.setAttribute("transform", `rotate(${s.pointer.toFixed(2)} ${C} 30)`);
      const speed = Math.abs(s.velocity);
      // Hareket bulanıklığı: hızla artan, geride kalan iki hayalet kopya.
      ghostRefs.current.forEach((ghost, index) => {
        if (!ghost) return;
        const lag = (index + 1) * Math.min(10, speed * 0.011);
        const opacity = s.reduced ? 0 : Math.min(0.32, Math.max(0, (speed - 240) / 1800)) / (index + 1);
        ghost.setAttribute("transform", `rotate(${(s.angle - lag).toFixed(3)} ${C} ${C})`);
        ghost.setAttribute("opacity", opacity.toFixed(3));
      });
      // Işıklar
      const tsec = now / 1000;
      const out = s.outcome;
      bulbRefs.current.forEach((bulb, index) => {
        if (!bulb) return;
        let level: number;
        if (s.phase === "done" && out === "win") level = (Math.floor(tsec * 6) + index) % 2 === 0 ? 1 : 0.25;
        else if (s.phase === "done" && out === "miss") level = 0.35;
        else if (s.reduced) level = index % 2 === 0 ? 0.9 : 0.45;
        else {
          const chase = s.phase === "idle" ? tsec * 3 : tsec * (4 + speed / 60);
          const head = chase % bulbCount;
          const distance = (index - head + bulbCount) % bulbCount;
          level = distance < 1 ? 1 : distance < 4 ? 0.75 - distance * 0.12 : 0.28;
        }
        bulb.setAttribute("opacity", level.toFixed(2));
      });

      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frame);
  }, [step, count, bulbCount, tick]);

  // Kazanan dilim vurgusu
  useEffect(() => {
    const el = highlightRef.current;
    if (!el) return;
    const target = state.current.targetIndex;
    if (outcome === "win" && target >= 0) {
      el.setAttribute("d", slicePath(target, count));
      el.setAttribute("data-on", "true");
    } else el.setAttribute("data-on", "false");
  }, [outcome, count]);

  useImperativeHandle(ref, () => ({
    start(velocity?: number) {
      const s = state.current;
      if (s.phase === "windup" || s.phase === "cruise" || s.phase === "landing") return;
      s.targetIndex = -1;
      s.phaseStart = performance.now();
      s.windFrom = s.angle;
      if (velocity && velocity > 0) { s.velocity = Math.max(velocity, 380); s.phase = "cruise"; }
      else { s.velocity = 0; s.phase = "windup"; }
    },
    land(targetIndex: number) {
      const s = state.current;
      return new Promise<void>((resolve) => {
        s.targetIndex = targetIndex;
        const jitter = (Math.random() - 0.5) * 0.8;
        if (s.reduced) {
          const plan = planLanding({ angle: s.angle, velocity: 1200, targetIndex, sliceCount: count, jitter, minTurns: 0, idealMs: 700 });
          s.windFrom = s.angle; s.landDistance = plan.distance; s.landMs = 900; s.landStart = performance.now();
        } else {
          const velocity = s.phase === "windup" ? Math.max(s.velocity, CRUISE * 0.7) : Math.max(s.velocity, 300);
          const plan = planLanding({ angle: s.angle, velocity, targetIndex, sliceCount: count, jitter });
          s.windFrom = s.angle; s.landDistance = plan.distance; s.landMs = plan.durationMs; s.landStart = performance.now();
        }
        s.landResolve = resolve;
        s.phase = "landing";
      });
    },
    abort() {
      const s = state.current;
      s.landResolve?.();
      s.landResolve = null;
      s.phase = "abort";
    },
    reset() {
      const s = state.current;
      s.targetIndex = -1;
      if (s.phase === "done") s.phase = "idle";
    },
  }), [count]);

  // Parmakla sürükleme / fırlatma
  const pointerAngle = (event: React.PointerEvent) => {
    const rect = svgRef.current!.getBoundingClientRect();
    const x = event.clientX - (rect.left + rect.width / 2);
    const y = event.clientY - (rect.top + rect.height / 2);
    return (Math.atan2(y, x) * 180) / Math.PI;
  };
  const onPointerDown = (event: React.PointerEvent) => {
    const s = state.current;
    if (!onFlick || hubDisabled || (s.phase !== "idle" && s.phase !== "done") || (event.target as Element).closest("[data-hub]")) return;
    if (s.phase === "done") return;
    s.phase = "drag";
    const a = pointerAngle(event);
    s.drag = { lastAngle: a, samples: [{ t: performance.now(), a: s.angle }] };
    (event.currentTarget as Element).setPointerCapture?.(event.pointerId);
  };
  const onPointerMove = (event: React.PointerEvent) => {
    const s = state.current;
    if (s.phase !== "drag" || !s.drag) return;
    const a = pointerAngle(event);
    let delta = a - s.drag.lastAngle;
    if (delta > 180) delta -= 360;
    if (delta < -180) delta += 360;
    s.drag.lastAngle = a;
    s.angle += delta;
    const now = performance.now();
    s.drag.samples.push({ t: now, a: s.angle });
    s.drag.samples = s.drag.samples.filter((sample) => now - sample.t < 120);
  };
  const onPointerUp = () => {
    const s = state.current;
    if (s.phase !== "drag" || !s.drag) return;
    const samples = s.drag.samples;
    s.drag = null;
    const first = samples[0], lastSample = samples[samples.length - 1];
    const seconds = Math.max(0.016, (lastSample.t - first.t) / 1000);
    const velocity = (lastSample.a - first.a) / seconds;
    if (velocity > 260 && onFlick) {
      s.velocity = velocity;
      onFlick(Math.min(2400, velocity));
    } else s.phase = "idle";
  };

  const size = compact ? styles.compact : "";

  return (
    <div className={`${styles.frame} ${size}`} data-outcome={outcome ?? "none"}>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${VIEW} ${VIEW}`}
        className={styles.svg}
        role="img"
        aria-label={ariaLabel}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        style={{ touchAction: onFlick ? "none" : "auto" }}
      >
        <defs>
          <radialGradient id={`${uid}rim`} cx="50%" cy="38%" r="65%">
            <stop offset="0%" stopColor="#2c4a3b" />
            <stop offset="70%" stopColor="#0d2219" />
            <stop offset="100%" stopColor="#06140e" />
          </radialGradient>
          <linearGradient id={`${uid}gold`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#fff6c8" />
            <stop offset="45%" stopColor="#e6c35c" />
            <stop offset="100%" stopColor="#9b7424" />
          </linearGradient>
          <radialGradient id={`${uid}shade`} cx="50%" cy="50%" r="50%">
            <stop offset="55%" stopColor="#000" stopOpacity="0" />
            <stop offset="100%" stopColor="#000" stopOpacity="0.28" />
          </radialGradient>
          <linearGradient id={`${uid}gloss`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#fff" stopOpacity="0.28" />
            <stop offset="48%" stopColor="#fff" stopOpacity="0.04" />
            <stop offset="52%" stopColor="#fff" stopOpacity="0" />
          </linearGradient>
          <radialGradient id={`${uid}hub`} cx="45%" cy="35%" r="70%">
            <stop offset="0%" stopColor="#efffc4" />
            <stop offset="60%" stopColor="#c9f45b" />
            <stop offset="100%" stopColor="#7fae1f" />
          </radialGradient>
          <radialGradient id={`${uid}bulb`} cx="50%" cy="40%" r="60%">
            <stop offset="0%" stopColor="#fffbe3" />
            <stop offset="55%" stopColor="#ffe27a" />
            <stop offset="100%" stopColor="#f2a93b" />
          </radialGradient>
          <filter id={`${uid}glow`} x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3" result="b" />
            <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
          <filter id={`${uid}drop`} x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="6" stdDeviation="6" floodColor="#000" floodOpacity="0.35" />
          </filter>
          <g id={`${uid}face`}>
            {geometry.map((item, index) => (
              <path key={`f${index}`} d={item.path} fill={item.fill} />
            ))}
          </g>
        </defs>

        {/* Dış çerçeve */}
        <circle cx={C} cy={C} r={198} fill={`url(#${uid}gold)`} filter={`url(#${uid}drop)`} />
        <circle cx={C} cy={C} r={193} fill={`url(#${uid}rim)`} />

        {/* Işıklar */}
        {bulbs.map((point, index) => (
          <g key={`b${index}`}>
            <circle cx={point.x} cy={point.y} r={5.2} fill="#3a2c08" opacity={0.6} />
            <circle ref={(el) => { bulbRefs.current[index] = el; }} cx={point.x} cy={point.y} r={4.4} fill={`url(#${uid}bulb)`} filter={`url(#${uid}glow)`} opacity={0.4} />
          </g>
        ))}

        {/* Hareket bulanıklığı hayaletleri */}
        <use ref={(el) => { ghostRefs.current[0] = el; }} href={`#${uid}face`} opacity={0} />
        <use ref={(el) => { ghostRefs.current[1] = el; }} href={`#${uid}face`} opacity={0} />

        {/* Dönen gövde */}
        <g ref={rotorRef}>
          {geometry.map((item, index) => (
            <g key={`s${index}`}>
              <path d={item.path} fill={item.fill} stroke="rgba(255,255,255,0.55)" strokeWidth={1.4} />
              <g transform={`rotate(${item.mid} ${C} ${C})`}>
                {item.lines.map((line, lineIndex) => {
                  // 90° döndürülmüş yazıda ilk satır sağda (okuma yönünün "üstü") durur.
                  const offset = ((item.lines.length - 1) / 2 - lineIndex) * (item.fontSize + 2);
                  return (
                    <text
                      key={lineIndex}
                      x={C + offset}
                      y={C - R_SLICE + 22}
                      transform={`rotate(90 ${C + offset} ${C - R_SLICE + 22})`}
                      fill={item.ink}
                      fontSize={item.fontSize}
                      fontWeight={item.none ? 600 : 800}
                      opacity={item.none ? 0.78 : 1}
                      className={styles.label}
                      dominantBaseline="middle"
                    >
                      {line}
                    </text>
                  );
                })}
              </g>
            </g>
          ))}
          <path ref={highlightRef} className={styles.highlight} data-on="false" d="" fill="#fff" />
          {pegs.map((peg, index) => (
            <g key={`p${index}`}>
              <circle cx={peg.x} cy={peg.y + 1.2} r={4.6} fill="#000" opacity={0.25} />
              <circle cx={peg.x} cy={peg.y} r={4.2} fill={`url(#${uid}gold)`} />
            </g>
          ))}
        </g>

        {/* Gölge ve parlaklık (dönmez → gerçek ışık hissi) */}
        <circle cx={C} cy={C} r={R_SLICE} fill={`url(#${uid}shade)`} pointerEvents="none" />
        <circle cx={C} cy={C} r={R_SLICE} fill={`url(#${uid}gloss)`} pointerEvents="none" />

        {/* Merkez düğme */}
        <g
          data-hub
          className={styles.hub}
          data-disabled={hubDisabled ? "true" : "false"}
          role="button"
          tabIndex={hubDisabled ? -1 : 0}
          aria-label={hubLabel}
          aria-disabled={hubDisabled}
          onClick={() => { if (!hubDisabled) onHubClick?.(); }}
          onKeyDown={(event) => { if (!hubDisabled && (event.key === "Enter" || event.key === " ")) { event.preventDefault(); onHubClick?.(); } }}
        >
          <circle cx={C} cy={C} r={50} fill={`url(#${uid}gold)`} filter={`url(#${uid}drop)`} />
          <circle cx={C} cy={C} r={44} fill={`url(#${uid}hub)`} className={styles.hubFace} />
          <circle cx={C} cy={C - 12} r={30} fill="#fff" opacity={0.22} />
          <text x={C} y={C + 1} className={styles.hubText} textAnchor="middle" dominantBaseline="middle">{hubLabel}</text>
        </g>

        {/* Mandal */}
        <g ref={pointerRef}>
          <path d={`M ${C} 62 L ${C - 17} 22 Q ${C} 6 ${C + 17} 22 Z`} fill="#000" opacity={0.25} transform="translate(0 3)" />
          <path d={`M ${C} 62 L ${C - 17} 22 Q ${C} 6 ${C + 17} 22 Z`} fill={`url(#${uid}gold)`} stroke="#6b4e12" strokeWidth={1.2} />
          <circle cx={C} cy={30} r={6} fill="#10281d" />
          <circle cx={C - 1.5} cy={28.5} r={2} fill="#fff" opacity={0.7} />
        </g>
      </svg>
    </div>
  );
});
