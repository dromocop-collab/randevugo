"use client";

import { useState } from "react";
import type { Review } from "@/types/review";
import { ReviewForm } from "./review-form";
import { MessageCircleMore, PenLine, Scissors } from "lucide-react";

interface Props {
  reviews: Review[];
  averageRating: number;
  totalReviews: number;
  businessId: string;
  onReviewSubmitted?: () => void;
}

type SortMode = "newest" | "oldest" | "highest" | "lowest";

function StarRating({ rating, size = 16 }: { rating: number; size?: number }) {
  return (
    <span className="inline-flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <svg
          key={i}
          width={size}
          height={size}
          viewBox="0 0 20 20"
          fill={i < Math.round(rating) ? "currentColor" : "none"}
          stroke="currentColor"
          strokeWidth={1.5}
          className={
            i < Math.round(rating)
              ? "text-amber-400"
              : "text-[var(--text-3)] opacity-40"
          }
        >
          <path d="M10 1l2.39 4.84 5.34.78-3.87 3.77.91 5.32L10 13.27 5.23 15.71l.91-5.32L2.27 6.62l5.34-.78L10 1z" />
        </svg>
      ))}
    </span>
  );
}

export function StorefrontReviews({
  reviews,
  averageRating,
  totalReviews,
  businessId,
  onReviewSubmitted,
}: Props) {
  const [sortMode, setSortMode] = useState<SortMode>("newest");
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  // Rating distribution
  const distribution = [5, 4, 3, 2, 1].map((star) => {
    const count = reviews.filter((r) => Math.round(r.rating) === star).length;
    const percent = totalReviews > 0 ? Math.round((count / totalReviews) * 100) : 0;
    return { star, count, percent };
  });

  // Sort reviews
  const sorted = [...reviews].sort((a, b) => {
    switch (sortMode) {
      case "oldest":
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      case "highest":
        return b.rating - a.rating;
      case "lowest":
        return a.rating - b.rating;
      default:
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    }
  });

  return (
    <section className="space-y-5">
      {/* ━━━ HEADER + STATS ━━━ */}
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] p-5 shadow-lg shadow-[var(--shadow-soft)] backdrop-blur-xl">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-lg font-bold text-[var(--text-1)]">Değerlendirmeler</h2>
            {totalReviews > 0 && (
              <div className="mt-2 flex items-center gap-3">
                <span className="text-4xl font-extrabold bg-[linear-gradient(135deg,var(--accent),var(--accent-3))] bg-clip-text text-transparent">
                  {averageRating.toFixed(1)}
                </span>
                <div>
                  <StarRating rating={averageRating} size={18} />
                  <p className="mt-0.5 text-xs text-[var(--text-3)]">
                    {totalReviews} değerlendirme
                  </p>
                </div>
              </div>
            )}
          </div>

          <button
            onClick={() => setShowForm(!showForm)}
            className="inline-flex items-center gap-2 rounded-xl bg-[linear-gradient(135deg,var(--accent),var(--accent-3))] px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-sky-500/20 transition hover:shadow-xl hover:brightness-110 active:scale-[0.97]"
          >
            <PenLine size={15}/> {showForm ? "Formu Kapat" : "Yorum Yaz"}
          </button>
        </div>

        {/* Rating Distribution */}
        {totalReviews > 0 && (
          <div className="mt-5 space-y-1.5">
            {distribution.map((d) => (
              <div key={d.star} className="flex items-center gap-2">
                <span className="w-8 text-right text-xs font-semibold text-[var(--text-2)]">
                  {d.star}★
                </span>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-[var(--surface-3)]">
                  <div
                    className="h-full rounded-full bg-amber-400 transition-all duration-500"
                    style={{ width: `${d.percent}%` }}
                  />
                </div>
                <span className="w-10 text-right text-[10px] font-medium text-[var(--text-3)]">
                  {d.count} ({d.percent}%)
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ━━━ REVIEW FORM ━━━ */}
      {showForm && (
        <ReviewForm
          businessId={businessId}
          onSuccess={() => {
            setShowForm(false);
            onReviewSubmitted?.();
          }}
        />
      )}

      {/* ━━━ SORT BAR ━━━ */}
      {reviews.length > 0 && (
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-[var(--text-2)]">
            {reviews.length} yorum
          </span>
          <select
            value={sortMode}
            onChange={(e) => setSortMode(e.target.value as SortMode)}
            className="rounded-lg border border-[var(--border)] bg-[var(--surface-1)] px-3 py-1.5 text-xs font-medium text-[var(--text-2)] outline-none transition focus:border-[var(--accent)]"
          >
            <option value="newest">En Yeni</option>
            <option value="oldest">En Eski</option>
            <option value="highest">En Yüksek Puan</option>
            <option value="lowest">En Düşük Puan</option>
          </select>
        </div>
      )}

      {/* ━━━ REVIEW LIST ━━━ */}
      {reviews.length === 0 ? (
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] p-10 text-center">
          <MessageCircleMore className="mx-auto text-[var(--accent)]" size={37}/>
          <p className="mt-3 text-sm font-medium text-[var(--text-1)]">
            Henüz değerlendirme yapılmamış
          </p>
          <p className="mt-1 text-xs text-[var(--text-3)]">
            İlk yorumu siz bırakın!
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {sorted.map((review) => (
            <div
              key={review.id}
              className="group rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] p-5 transition hover:shadow-md"
            >
              {/* Header */}
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[linear-gradient(135deg,var(--accent)/15,var(--accent-3)/15)]">
                    <span className="text-sm font-bold text-[var(--accent)]">
                      {review.customerName.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-[var(--text-1)]">
                      {review.customerName}
                    </p>
                    <div className="flex items-center gap-2">
                      <p className="text-[10px] text-[var(--text-3)]">
                        {new Date(review.createdAt).toLocaleDateString("tr-TR", {
                          day: "numeric",
                          month: "long",
                          year: "numeric",
                        })}
                      </p>
                      {review.serviceName && (
                        <span className="inline-flex items-center gap-1 rounded bg-[var(--surface-2)] px-1.5 py-0.5 text-[9px] font-medium text-[var(--text-3)]">
                          <Scissors size={11}/> {review.serviceName}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <StarRating rating={review.rating} size={14} />
              </div>

              {/* Comment */}
              {review.comment && (
                <p className="mt-3 text-sm leading-relaxed text-[var(--text-2)]">
                  {review.comment}
                </p>
              )}

              {/* Photos */}
              {review.imageUrls && review.imageUrls.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {review.imageUrls.map((url, i) => (
                    <button
                      key={i}
                      onClick={() => setLightboxUrl(url)}
                      className="group/img relative h-20 w-20 overflow-hidden rounded-xl border border-[var(--border)] transition hover:shadow-lg hover:scale-105"
                    >
                      <img
                        src={url}
                        alt={`Yorum fotoğrafı ${i + 1}`}
                        className="h-full w-full object-cover"
                      />
                      <div className="absolute inset-0 flex items-center justify-center bg-black/0 transition group-hover/img:bg-black/20">
                        <svg
                          className="h-5 w-5 text-white opacity-0 transition group-hover/img:opacity-100"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={2}
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7"
                          />
                        </svg>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {/* Owner Reply */}
              {review.ownerReply && (
                <div className="mt-3 rounded-xl border border-[var(--accent)]/15 bg-[var(--accent)]/5 p-3.5">
                  <div className="flex items-center gap-2">
                    <MessageCircleMore size={14}/>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--accent)]">
                      İşletme Yanıtı
                    </p>
                    {review.ownerReplyAt && (
                      <span className="text-[9px] text-[var(--text-3)]">
                        ·{" "}
                        {new Date(review.ownerReplyAt).toLocaleDateString("tr-TR")}
                      </span>
                    )}
                  </div>
                  <p className="mt-1.5 text-xs leading-relaxed text-[var(--text-2)]">
                    {review.ownerReply}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ━━━ LIGHTBOX ━━━ */}
      {lightboxUrl && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
          onClick={() => setLightboxUrl(null)}
        >
          <button
            className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-lg text-white backdrop-blur transition hover:bg-white/20"
            onClick={() => setLightboxUrl(null)}
          >
            ✕
          </button>
          <img
            src={lightboxUrl}
            alt="Büyütülmüş fotoğraf"
            className="max-h-[85vh] max-w-[90vw] rounded-2xl object-contain shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </section>
  );
}
