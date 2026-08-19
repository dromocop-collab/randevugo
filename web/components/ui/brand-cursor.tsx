"use client";

import { useEffect, useRef, useState } from "react";

export function BrandCursor() {
  const dotRef = useRef<HTMLSpanElement>(null);
  const ringRef = useRef<HTMLSpanElement>(null);
  const frameRef = useRef<number | null>(null);
  const pointerRef = useRef({ x: -100, y: -100, ringX: -100, ringY: -100 });
  const [visible, setVisible] = useState(false);
  const [interactive, setInteractive] = useState(false);
  const [pressed, setPressed] = useState(false);
  const [editable, setEditable] = useState(false);

  useEffect(() => {
    const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)");
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (!finePointer.matches) return;

    function render() {
      const pointer = pointerRef.current;
      const easing = reducedMotion.matches ? 1 : 0.2;
      pointer.ringX += (pointer.x - pointer.ringX) * easing;
      pointer.ringY += (pointer.y - pointer.ringY) * easing;
      if (dotRef.current) dotRef.current.style.transform = `translate3d(${pointer.x}px, ${pointer.y}px, 0)`;
      if (ringRef.current) ringRef.current.style.transform = `translate3d(${pointer.ringX}px, ${pointer.ringY}px, 0)`;
      frameRef.current = window.requestAnimationFrame(render);
    }

    function onMove(event: MouseEvent) {
      pointerRef.current.x = event.clientX;
      pointerRef.current.y = event.clientY;
      setVisible(true);
      const target = event.target instanceof Element ? event.target : null;
      setInteractive(Boolean(target?.closest("a, button, summary, [role='button'], [data-cursor='interactive']")));
      setEditable(Boolean(target?.closest("input, textarea, select, [contenteditable='true']")));
    }
    function onLeave() { setVisible(false); }
    function onEnter() { setVisible(true); }
    function onDown() { setPressed(true); }
    function onUp() { setPressed(false); }

    document.documentElement.classList.add("has-brand-cursor");
    window.addEventListener("mousemove", onMove, { passive: true });
    document.documentElement.addEventListener("mouseleave", onLeave);
    document.documentElement.addEventListener("mouseenter", onEnter);
    window.addEventListener("mousedown", onDown);
    window.addEventListener("mouseup", onUp);
    frameRef.current = window.requestAnimationFrame(render);

    return () => {
      document.documentElement.classList.remove("has-brand-cursor");
      window.removeEventListener("mousemove", onMove);
      document.documentElement.removeEventListener("mouseleave", onLeave);
      document.documentElement.removeEventListener("mouseenter", onEnter);
      window.removeEventListener("mousedown", onDown);
      window.removeEventListener("mouseup", onUp);
      if (frameRef.current !== null) window.cancelAnimationFrame(frameRef.current);
    };
  }, []);

  const className = `brand-cursor${visible && !editable ? " is-visible" : ""}${interactive ? " is-interactive" : ""}${pressed ? " is-pressed" : ""}`;
  return <div className={className} aria-hidden="true"><span ref={ringRef} className="brand-cursor-ring"/><span ref={dotRef} className="brand-cursor-dot"/></div>;
}
