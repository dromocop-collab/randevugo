"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import styles from "../storefront.module.css";

const VISIBLE = 5;

export function GallerySection({ urls, businessName }: { urls: string[]; businessName: string }) {
  const [active, setActive] = useState<number | null>(null);
  const [failed, setFailed] = useState<string[]>([]);
  const touchX = useRef<number | null>(null);
  const images = urls.filter((url) => !failed.includes(url));

  useEffect(() => {
    if (active === null) return;
    const count = images.length;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setActive(null);
      if (event.key === "ArrowRight") setActive((index) => (index === null ? null : (index + 1) % count));
      if (event.key === "ArrowLeft") setActive((index) => (index === null ? null : (index - 1 + count) % count));
    };
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => { document.body.style.overflow = previous; window.removeEventListener("keydown", onKey); };
  }, [active, images.length]);

  if (images.length === 0) return null;
  const shown = images.slice(0, VISIBLE);
  const hidden = images.length - shown.length;
  const step = (delta: number) => setActive((index) => (index === null ? null : (index + delta + images.length) % images.length));

  return (
    <>
      <div className={styles.gallery}>
        {shown.map((url, index) => (
          <button
            key={url}
            type="button"
            className={`${styles.galleryItem} ${index === 0 ? styles.galleryFeatured : ""}`}
            style={{ "--i": index } as CSSProperties}
            onClick={() => setActive(index)}
            aria-label={`${businessName} fotoğraf ${index + 1}, büyüt`}
          >
            <Image src={url} alt="" fill sizes={index === 0 ? "(max-width: 640px) 100vw, 50vw" : "(max-width: 640px) 50vw, 25vw"} onError={() => setFailed((list) => [...list, url])} />
            {index === shown.length - 1 && hidden > 0 && <span className={styles.galleryMore}>+{hidden}</span>}
          </button>
        ))}
      </div>

      {active !== null && images[active] && (
        <div
          className={styles.lightbox}
          role="dialog"
          aria-modal="true"
          aria-label="Fotoğraf görüntüleyici"
          onMouseDown={(event) => { if (event.target === event.currentTarget) setActive(null); }}
          onTouchStart={(event) => { touchX.current = event.touches[0]?.clientX ?? null; }}
          onTouchEnd={(event) => {
            if (touchX.current === null) return;
            const delta = (event.changedTouches[0]?.clientX ?? touchX.current) - touchX.current;
            touchX.current = null;
            if (Math.abs(delta) > 50) step(delta < 0 ? 1 : -1);
          }}
        >
          <button type="button" className={`${styles.lbBtn} ${styles.lbClose}`} onClick={() => setActive(null)} aria-label="Kapat" autoFocus><X size={20} /></button>
          {images.length > 1 && <button type="button" className={`${styles.lbBtn} ${styles.lbPrev}`} onClick={() => step(-1)} aria-label="Önceki fotoğraf"><ChevronLeft size={22} /></button>}
          <figure>
            <Image src={images[active]} alt={`${businessName} fotoğraf ${active + 1}`} width={1400} height={1000} sizes="92vw" />
            <figcaption>{active + 1} / {images.length}</figcaption>
          </figure>
          {images.length > 1 && <button type="button" className={`${styles.lbBtn} ${styles.lbNext}`} onClick={() => step(1)} aria-label="Sonraki fotoğraf"><ChevronRight size={22} /></button>}
        </div>
      )}
    </>
  );
}
