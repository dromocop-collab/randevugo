"use client";

import Image from "next/image";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import styles from "./rovi-mascot.module.css";

export type RoviMood = "idle" | "happy" | "thinking" | "wave";

type RoviMascotProps = {
  /** Genişlik (px); yükseklik orana göre hesaplanır. */
  size: number;
  mood?: RoviMood;
  /** Tıklayınca zıplar, imleci yumuşakça takip eder. */
  interactive?: boolean;
  alt?: string;
  priority?: boolean;
  className?: string;
};

const SRC = "/mascots/randevu-rehberi.png";

function Sparkle() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 0c.6 5.6 2.9 8.4 12 12-9.1 3.6-11.4 6.4-12 12-.6-5.6-2.9-8.4-12-12C9.1 8.4 11.4 5.6 12 0Z" /></svg>;
}

/** SeninRandevun maskotu Rovi; tek görsel üzerinde katmanlı, hareket azaltma tercihine saygılı animasyon. */
export function RoviMascot({ size, mood = "idle", interactive = size >= 60, alt = "Rovi", priority, className }: RoviMascotProps) {
  const rootRef = useRef<HTMLSpanElement>(null);
  const [bouncing, setBouncing] = useState(false);

  useEffect(() => {
    const root = rootRef.current;
    if (!interactive || !root || typeof window === "undefined") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches || !window.matchMedia("(pointer: fine)").matches) return;
    let frame = 0;
    const onMove = (event: PointerEvent) => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        const rect = root.getBoundingClientRect();
        const dx = (event.clientX - (rect.left + rect.width / 2)) / window.innerWidth;
        const dy = (event.clientY - (rect.top + rect.height / 2)) / window.innerHeight;
        root.style.setProperty("--rovi-tilt-y", `${Math.max(-1, Math.min(1, dx * 2)) * 10}deg`);
        root.style.setProperty("--rovi-tilt-x", `${Math.max(-1, Math.min(1, dy * 2)) * -6}deg`);
      });
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => { window.removeEventListener("pointermove", onMove); if (frame) cancelAnimationFrame(frame); };
  }, [interactive]);

  function poke() {
    if (!interactive || bouncing) return;
    setBouncing(true);
    window.setTimeout(() => setBouncing(false), 720);
  }

  const classes = [styles.root, interactive && styles.interactive, mood !== "idle" && styles[mood], bouncing && styles.bounce, className].filter(Boolean).join(" ");

  return (
    <span
      ref={rootRef}
      className={classes}
      style={{ width: size } as CSSProperties}
      onClick={interactive ? poke : undefined}
      role={alt ? "img" : undefined}
      aria-label={alt || undefined}
      aria-hidden={alt ? undefined : true}
    >
      <span className={styles.shadow} />
      <span className={styles.float}>
        <span className={styles.body}>
          <Image className={styles.image} src={SRC} alt="" width={640} height={585} priority={priority} sizes={`${Math.ceil(size)}px`} />
          <span className={`${styles.lid} ${styles.lidLeft}`} />
          <span className={`${styles.lid} ${styles.lidRight}`} />
        </span>
        <span className={`${styles.spark} ${styles.spark1}`}><Sparkle /></span>
        <span className={`${styles.spark} ${styles.spark2}`}><Sparkle /></span>
        <span className={`${styles.spark} ${styles.spark3}`}><Sparkle /></span>
        <span className={`${styles.spark} ${styles.spark4}`}><Sparkle /></span>
      </span>
      {mood === "thinking" && <span className={styles.bubble} aria-hidden="true"><i /><i /><i /></span>}
    </span>
  );
}
