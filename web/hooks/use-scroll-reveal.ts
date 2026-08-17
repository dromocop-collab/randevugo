"use client";

import { useEffect, useRef, useCallback } from "react";

interface ScrollRevealOptions {
  threshold?: number;
  rootMargin?: string;
  once?: boolean;
}

/**
 * Hook that adds IntersectionObserver-based scroll-triggered
 * reveal animations. Attach the returned ref to any element,
 * and give it the CSS classes `scroll-reveal reveal-up` (or
 * reveal-down / reveal-left / reveal-right / reveal-fade).
 * When the element enters the viewport the class `revealed`
 * is added, triggering the CSS transition.
 */
export function useScrollReveal<T extends HTMLElement = HTMLDivElement>(
  options: ScrollRevealOptions = {}
) {
  const { threshold = 0.15, rootMargin = "0px 0px -60px 0px", once = true } = options;
  const ref = useRef<T>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // Respect prefers-reduced-motion
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      el.classList.add("revealed");
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.classList.add("revealed");
          if (once) observer.unobserve(el);
        } else if (!once) {
          el.classList.remove("revealed");
        }
      },
      { threshold, rootMargin }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold, rootMargin, once]);

  return ref;
}

/**
 * Hook that observes multiple children of a container and
 * reveals them with staggered delays.
 */
export function useScrollRevealGroup(
  options: ScrollRevealOptions & { staggerMs?: number } = {}
) {
  const { threshold = 0.1, rootMargin = "0px 0px -40px 0px", once = true, staggerMs = 100 } = options;
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      container.querySelectorAll(".scroll-reveal").forEach((el) => {
        el.classList.add("revealed");
      });
      return;
    }

    const children = container.querySelectorAll(".scroll-reveal");

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const el = entry.target as HTMLElement;
            const index = Array.from(children).indexOf(el);
            const delay = index * staggerMs;
            el.style.transitionDelay = `${delay}ms`;
            el.classList.add("revealed");
            if (once) observer.unobserve(el);
          } else if (!once) {
            const el = entry.target as HTMLElement;
            el.classList.remove("revealed");
            el.style.transitionDelay = "0ms";
          }
        });
      },
      { threshold, rootMargin }
    );

    children.forEach((child) => observer.observe(child));
    return () => observer.disconnect();
  }, [threshold, rootMargin, once, staggerMs]);

  return containerRef;
}
