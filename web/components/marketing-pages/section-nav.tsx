"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import styles from "./section-nav.module.css";

export type SectionNavItem = { id: string; label: string; icon: ReactNode };

/** Yapışkan bölüm menüsü: görünür bölümü vurgular, aktif çipi yatayda görünür tutar. */
export function SectionNav({ items, label }: { items: SectionNavItem[]; label: string }) {
  const [active, setActive] = useState(items[0]?.id ?? "");
  const listRef = useRef<HTMLUListElement>(null);

  useEffect(() => {
    const sections = items.map((item) => document.getElementById(item.id)).filter((node): node is HTMLElement => Boolean(node));
    if (!sections.length || typeof IntersectionObserver === "undefined") return;
    const visible = new Map<string, number>();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) visible.set(entry.target.id, entry.boundingClientRect.top);
          else visible.delete(entry.target.id);
        }
        if (!visible.size) return;
        const next = items.find((item) => visible.has(item.id));
        if (next) setActive(next.id);
      },
      { rootMargin: "-35% 0px -55% 0px" },
    );
    sections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, [items]);

  useEffect(() => {
    const list = listRef.current;
    const chip = list?.querySelector<HTMLElement>(`[data-id="${active}"]`);
    if (!list || !chip) return;
    const target = chip.offsetLeft - list.clientWidth / 2 + chip.clientWidth / 2;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    list.scrollTo({ left: Math.max(0, target), behavior: reduce ? "auto" : "smooth" });
  }, [active]);

  return (
    <nav className={styles.bar} aria-label={label}>
      <ul ref={listRef} className={styles.list}>
        {items.map(({ id, label: text, icon }) => (
          <li key={id}>
            <a href={`#${id}`} data-id={id} className={styles.chip} aria-current={active === id ? "true" : undefined} onClick={() => setActive(id)}>
              {icon}
              {text}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
