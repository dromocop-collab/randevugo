"use client";

import type { Review } from "@/types/review";

interface Props {
  reviews: Review[];
  averageRating: number;
  totalReviews: number;
}

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
          className={i < Math.round(rating) ? "text-amber-400" : "text-[var(--text-3)] opacity-40"}
        >
          <path d="M10 1l2.39 4.84 5.34.78-3.87 3.77.91 5.32L10 13.27 5.23 15.71l.91-5.32L2.27 6.62l5.34-.78L10 1z" />
        </svg>
      ))}
    </span>
  );
}

export function StorefrontReviews({ reviews, averageRating, totalReviews }: Props) {
  return (
    <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] p-5 shadow-lg shadow-[var(--shadow-soft)] backdrop-blur-xl">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-[var(--text-1)]">Değerlendirmeler</h2>
        {totalReviews > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-2xl font-bold text-[var(--text-1)]">{averageRating.toFixed(1)}</span>
            <div>
              <StarRating rating={averageRating} />
              <p className="text-xs text-[var(--text-3)]">{totalReviews} değerlendirme</p>
            </div>
          </div>
        )}
      </div>

      {reviews.length === 0 ? (
        <p className="mt-4 text-sm text-[var(--text-3)]">Henüz değerlendirme yapılmamış.</p>
      ) : (
        <div className="mt-4 space-y-3">
          {reviews.map((review) => (
            <div
              key={review.id}
              className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-4"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-[var(--text-1)]">{review.customerName}</p>
                  <p className="text-xs text-[var(--text-3)]">
                    {new Date(review.createdAt).toLocaleDateString("tr-TR")}
                  </p>
                </div>
                <StarRating rating={review.rating} size={14} />
              </div>
              {review.comment && (
                <p className="mt-2 text-sm text-[var(--text-2)]">{review.comment}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
