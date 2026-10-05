"use client";

import { useEffect, useMemo, useState, type CSSProperties } from "react";
import Image from "next/image";
import Link from "next/link";
import { BadgeCheck, Camera, MessageCircleReply, PenLine, Scissors, Star, UserRound, X } from "lucide-react";
import { RoviMascot } from "@/components/brand/rovi-mascot";
import type { Review } from "@/types/review";
import { relativeDate } from "./utils";
import styles from "../storefront.module.css";

type Filter = "all" | "photos" | 1 | 2 | 3 | 4 | 5;
type Sort = "newest" | "highest" | "lowest";
const PAGE = 5;

export function Stars({ value, size = 14 }: { value: number; size?: number }) {
  const rounded = Math.round(value);
  return (
    <span className={styles.stars} role="img" aria-label={`5 üzerinden ${value.toFixed(1)} puan`}>
      {[1, 2, 3, 4, 5].map((star) => (
        <Star key={star} size={size} aria-hidden="true" className={star <= rounded ? undefined : styles.starOff} fill={star <= rounded ? "currentColor" : "none"} />
      ))}
    </span>
  );
}

interface Props {
  reviews: Review[];
  averageRating: number;
  totalReviews: number;
  nowMillis: number | null;
}

export function ReviewsSection({ reviews, averageRating, totalReviews, nowMillis }: Props) {
  const [filter, setFilter] = useState<Filter>("all");
  const [sort, setSort] = useState<Sort>("newest");
  const [limit, setLimit] = useState(PAGE);
  const [photo, setPhoto] = useState<string | null>(null);

  const computedAverage = reviews.length ? reviews.reduce((total, review) => total + review.rating, 0) / reviews.length : 0;
  const score = averageRating > 0 ? averageRating : computedAverage;
  const count = Math.max(totalReviews, reviews.length);
  const distribution = [5, 4, 3, 2, 1].map((star) => {
    const value = reviews.filter((review) => Math.round(review.rating) === star).length;
    return { star, value, percent: reviews.length ? Math.round((value / reviews.length) * 100) : 0 };
  });
  const withPhotos = reviews.filter((review) => (review.imageUrls?.length ?? 0) > 0).length;

  const list = useMemo(() => {
    const filtered = reviews.filter((review) =>
      filter === "all" ? true : filter === "photos" ? (review.imageUrls?.length ?? 0) > 0 : Math.round(review.rating) === filter);
    const time = (review: Review) => new Date(review.createdAt).getTime() || 0;
    return filtered.sort((a, b) => sort === "highest" ? b.rating - a.rating || time(b) - time(a) : sort === "lowest" ? a.rating - b.rating || time(b) - time(a) : time(b) - time(a));
  }, [reviews, filter, sort]);

  useEffect(() => {
    if (!photo) return;
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") setPhoto(null); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [photo]);

  const choose = (next: Filter) => { setFilter((current) => (current === next ? "all" : next)); setLimit(PAGE); };

  if (reviews.length === 0) {
    return (
      <div className={styles.empty}>
        <RoviMascot size={92} mood="happy" alt="Rovi gülümsüyor" />
        <h3>İlk yorumu sen bırak</h3>
        <p>Henüz yayınlanmış bir değerlendirme yok. Randevun tamamlandıktan sonra hesabından deneyimini paylaşabilirsin.</p>
        <Link href="/hesabim" className={`${styles.pill} ${styles.pillPrimary}`} style={{ marginTop: 10 }}><PenLine size={15} /> Randevunu değerlendir</Link>
      </div>
    );
  }

  return (
    <>
      <div className={styles.summary}>
        <div className={styles.score}>
          <strong>{score.toFixed(1)}</strong>
          <Stars value={score} size={16} />
          <small>{count} değerlendirme</small>
        </div>
        <div className={styles.bars}>
          {distribution.map((row) => (
            <button key={row.star} type="button" className={`${styles.bar} ${filter === row.star ? styles.barOn : ""}`} onClick={() => choose(row.star as Filter)} aria-pressed={filter === row.star} aria-label={`${row.star} yıldızlı yorumlar: ${row.value}`} disabled={row.value === 0}>
              <span>{row.star}<Star size={11} aria-hidden="true" fill="currentColor" /></span>
              <span className={styles.barTrack}><span className={styles.barFill} style={{ width: `${row.percent}%` }} /></span>
              <span>{row.value}</span>
            </button>
          ))}
        </div>
      </div>

      <div className={styles.reviewTools}>
        <div className={styles.chips} role="group" aria-label="Yorum filtreleri">
          <button type="button" aria-pressed={filter === "all"} className={`${styles.chip} ${styles.chipPlain} ${filter === "all" ? styles.chipActive : ""}`} onClick={() => choose("all")}>Tümü <small>{reviews.length}</small></button>
          {withPhotos > 0 && <button type="button" aria-pressed={filter === "photos"} className={`${styles.chip} ${styles.chipPlain} ${filter === "photos" ? styles.chipActive : ""}`} onClick={() => choose("photos")}><Camera size={15} aria-hidden="true" /> Fotoğraflı <small>{withPhotos}</small></button>}
          {[5, 4, 3].map((star) => distribution.find((row) => row.star === star)!.value > 0 && (
            <button key={star} type="button" aria-pressed={filter === star} className={`${styles.chip} ${styles.chipPlain} ${filter === star ? styles.chipActive : ""}`} onClick={() => choose(star as Filter)}>{star} <Star size={13} aria-hidden="true" fill="currentColor" /></button>
          ))}
        </div>
        <label htmlFor="review-sort" className={styles.srOnly}>Yorumları sırala</label>
        <select id="review-sort" className={styles.select} value={sort} onChange={(event) => setSort(event.target.value as Sort)}>
          <option value="newest">En yeni</option>
          <option value="highest">En yüksek</option>
          <option value="lowest">En düşük</option>
        </select>
      </div>

      <div className={styles.reviewList} aria-live="polite">
        {list.slice(0, limit).map((review, index) => (
          <article key={review.id} className={styles.review} style={{ "--i": index % PAGE } as CSSProperties}>
            <header className={styles.reviewHead}>
              <span className={styles.avatar} aria-hidden="true">{review.customerName?.trim().charAt(0).toLocaleUpperCase("tr-TR") || <UserRound size={16} />}</span>
              <div className={styles.reviewWho}>
                <b>{review.customerName || "Müşteri"}</b>
                <small>
                  {nowMillis ? relativeDate(review.createdAt, nowMillis) : new Date(review.createdAt).toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: "numeric" })}
                  {review.appointmentId && <> · <span className={styles.verifiedTag}><BadgeCheck size={12} aria-hidden="true" /> Doğrulanmış randevu</span></>}
                </small>
              </div>
              <Stars value={review.rating} size={13} />
            </header>
            {(review.serviceName || review.staffName) && (
              <div className={styles.reviewTags}>
                {review.serviceName && <span className={styles.metaTag}><Scissors size={12} aria-hidden="true" /> {review.serviceName}</span>}
                {review.staffName && <span className={styles.metaTag}><UserRound size={12} aria-hidden="true" /> {review.staffName}</span>}
              </div>
            )}
            {review.comment && <p className={styles.reviewText}>{review.comment}</p>}
            {review.imageUrls && review.imageUrls.length > 0 && (
              <div className={styles.reviewPhotos}>
                {review.imageUrls.map((url, photoIndex) => (
                  <button key={url} type="button" className={styles.reviewPhoto} onClick={() => setPhoto(url)} aria-label={`Yorum fotoğrafı ${photoIndex + 1}, büyüt`}>
                    <Image src={url} alt="" fill sizes="76px" />
                  </button>
                ))}
              </div>
            )}
            {review.ownerReply && (
              <div className={styles.reply}>
                <small><MessageCircleReply size={13} aria-hidden="true" /> İŞLETME YANITI</small>
                <p>{review.ownerReply}</p>
              </div>
            )}
          </article>
        ))}
      </div>

      {list.length > limit && (
        <div className={styles.moreRow}>
          <button type="button" className={styles.pill} onClick={() => setLimit((value) => value + PAGE)}>Daha fazla yorum ({list.length - limit})</button>
        </div>
      )}

      <div className={styles.reviewCta}>
        <span>Bu işletmeden hizmet aldın mı?</span>
        <Link href="/hesabim" className={styles.pill}><PenLine size={15} /> Deneyimini paylaş</Link>
      </div>

      {photo && (
        <div className={styles.lightbox} role="dialog" aria-modal="true" aria-label="Yorum fotoğrafı" onMouseDown={(event) => { if (event.target === event.currentTarget) setPhoto(null); }}>
          <button type="button" className={`${styles.lbBtn} ${styles.lbClose}`} onClick={() => setPhoto(null)} aria-label="Kapat" autoFocus><X size={20} /></button>
          <figure><Image src={photo} alt="Yorum fotoğrafı" width={1400} height={1000} sizes="92vw" /></figure>
        </div>
      )}
    </>
  );
}
