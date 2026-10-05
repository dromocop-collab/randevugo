"use client";

import Image from "next/image";
import Link from "next/link";
import { useDeferredValue, useMemo, useState, type CSSProperties } from "react";
import { ArrowRight, Search, SearchX, X } from "lucide-react";
import { categoryHref } from "@/components/marketing/category-catalog";
import styles from "./kategoriler.module.css";

export type CategoryCardData = {
  slug: string;
  label: string;
  emoji: string;
  description: string;
  image?: string;
  accent: string;
  /** null: sayı bilinmiyor (veri yüklenemedi). */
  count: number | null;
};

type Filter = "all" | "active" | "soon";

function normalize(value: string) {
  return value
    .toLocaleLowerCase("tr-TR")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replaceAll("ı", "i")
    .trim();
}

export function CategoriesExplorer({ cards, hasCounts }: { cards: CategoryCardData[]; hasCounts: boolean }) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const deferredQuery = useDeferredValue(query);

  const indexed = useMemo(() => cards.map((card) => ({ card, haystack: normalize(`${card.label} ${card.description} ${card.slug}`) })), [cards]);
  const activeTotal = cards.filter((card) => (card.count ?? 0) > 0).length;
  const soonTotal = hasCounts ? cards.length - activeTotal : 0;

  const visible = useMemo(() => {
    const needle = normalize(deferredQuery);
    return indexed
      .filter(({ card, haystack }) => {
        if (filter === "active" && !((card.count ?? 0) > 0)) return false;
        if (filter === "soon" && (card.count ?? 0) > 0) return false;
        return !needle || needle.split(/\s+/).every((part) => haystack.includes(part));
      })
      .map(({ card }) => card);
  }, [indexed, deferredQuery, filter]);

  const filters: { value: Filter; label: string; total: number }[] = hasCounts
    ? [
        { value: "all", label: "Tümü", total: cards.length },
        { value: "active", label: "Aktif", total: activeTotal },
        ...(soonTotal > 0 ? [{ value: "soon" as const, label: "Yakında", total: soonTotal }] : []),
      ]
    : [];

  const reset = () => {
    setQuery("");
    setFilter("all");
  };

  return (
    <section className={styles.explorer} aria-labelledby="category-grid-title">
      <div className={styles.toolbar}>
        <form className={styles.search} role="search" onSubmit={(event) => event.preventDefault()}>
          <Search size={19} className={styles.searchIcon} aria-hidden="true" />
          <label htmlFor="category-search" className={styles.srOnly}>Kategori ara</label>
          <input
            id="category-search"
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Kategori ara: kuaför, masaj, veteriner…"
            autoComplete="off"
            enterKeyHint="search"
            className={styles.searchInput}
          />
          {query && (
            <button type="button" className={styles.searchClear} onClick={() => setQuery("")} aria-label="Aramayı temizle">
              <X size={16} />
            </button>
          )}
        </form>
        {filters.length > 0 && (
          <div className={styles.filters} role="group" aria-label="Kategori filtresi">
            {filters.map((item) => (
              <button
                key={item.value}
                type="button"
                className={styles.filter}
                aria-pressed={filter === item.value}
                onClick={() => setFilter(item.value)}
              >
                {item.label} <span>{item.total}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className={styles.gridHead}>
        <h2 id="category-grid-title">{filter === "active" ? "Aktif kategoriler" : filter === "soon" ? "Yakında gelecek kategoriler" : "Tüm kategoriler"}</h2>
        <p aria-live="polite">{visible.length} kategori</p>
      </div>

      {visible.length > 0 ? (
        <ul className={styles.grid}>
          {visible.map((card, index) => {
            const count = card.count;
            const soon = count === 0;
            return (
              <li key={card.slug} className={styles.gridItem}>
                <Link
                  href={categoryHref(card.slug)}
                  className={`${styles.card} ${soon ? styles.cardSoon : ""}`}
                  style={{ "--accent": card.accent } as CSSProperties}
                  aria-label={`${card.label}: ${count === null ? "işletmeleri keşfet" : soon ? "yakında" : `${count} işletme`}`}
                >
                  <span className={styles.cardMedia}>
                    {card.image ? (
                      <Image src={card.image} alt="" fill sizes="(min-width: 1180px) 280px, (min-width: 720px) 33vw, 50vw" className={styles.cardImage} priority={index < 4} />
                    ) : (
                      <span className={styles.cardFallback} aria-hidden="true">{card.emoji}</span>
                    )}
                    <span className={styles.cardShade} aria-hidden="true" />
                    <span className={styles.cardEmoji} aria-hidden="true">{card.emoji}</span>
                    {count !== null && (
                      <span className={`${styles.cardBadge} ${soon ? styles.cardBadgeSoon : ""}`} aria-hidden="true">
                        {soon ? "Yakında" : <><i />{count} işletme</>}
                      </span>
                    )}
                  </span>
                  <span className={styles.cardBody}>
                    <b className={styles.cardTitle}>{card.label}</b>
                    <small className={styles.cardText}>{card.description}</small>
                    <span className={styles.cardCta} aria-hidden="true">{soon ? "Göz at" : "Keşfet"} <ArrowRight size={14} /></span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      ) : (
        <div className={styles.empty}>
          <span className={styles.emptyIcon} aria-hidden="true"><SearchX size={26} /></span>
          <h3>Bu aramaya uygun kategori bulamadık</h3>
          <p>Farklı bir kelime dene ya da tüm mağazalarda hizmet adıyla ara.</p>
          <div className={styles.emptyActions}>
            <button type="button" className={styles.emptyGhost} onClick={reset}>Filtreleri temizle</button>
            <Link href={query.trim() ? `/kesfet?q=${encodeURIComponent(query.trim())}` : "/kesfet"} className={styles.emptyPrimary}>Mağazalarda ara <ArrowRight size={15} /></Link>
          </div>
        </div>
      )}
    </section>
  );
}
