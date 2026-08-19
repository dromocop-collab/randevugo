"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { useBusiness } from "@/hooks/use-business";
import { Card } from "@/components/ui/card";
import { EmptyState, LoadingState } from "@/components/ui/states";
import {
  listBusinessReviewsForOwner,
  updateReviewStatus,
} from "@/features/reviews/review-repository";
import type { Review, ReviewStatus } from "@/types/review";

type Filter = "pending" | "approved" | "rejected" | "all";

function StarRating({ rating }: { rating: number }) {
  return (
    <span className="inline-flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <svg
          key={i}
          width={14}
          height={14}
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

const STATUS_CONFIG: Record<ReviewStatus, { label: string; color: string; bg: string }> = {
  pending: { label: "Bekliyor", color: "text-amber-600", bg: "bg-amber-500/10" },
  approved: { label: "Onaylandı", color: "text-emerald-600", bg: "bg-emerald-500/10" },
  rejected: { label: "Reddedildi", color: "text-rose-600", bg: "bg-rose-500/10" },
};

export default function ReviewsManagementPage() {
  const { businessId } = useBusiness();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>("pending");
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    if (!businessId) return;
    let active = true;
    async function load() {
      queueMicrotask(() => { if (active) setLoading(true); });
      try {
        const rows = await listBusinessReviewsForOwner(businessId!);
        if (active) setReviews(rows);
      } catch {
        if (active) toast.error("Yorumlar yüklenemedi.");
      } finally {
        if (active) setLoading(false);
      }
    }
    void load();
    return () => { active = false; };
  }, [businessId]);

  async function handleStatus(review: Review, status: ReviewStatus) {
    if (!businessId) return;
    setProcessingId(review.id);
    try {
      await updateReviewStatus(businessId, review.id, status);
      setReviews((prev) => prev.map((r) => (r.id === review.id ? { ...r, status, isVisible: status === "approved" } : r)));
      toast.success(status === "approved" ? "Yorum onaylandı ve yayınlandı." : "Yorum reddedildi.");
    } catch {
      toast.error("İşlem başarısız oldu.");
    } finally {
      setProcessingId(null);
    }
  }

  const counts = useMemo(
    () => ({
      pending: reviews.filter((r) => r.status === "pending").length,
      approved: reviews.filter((r) => r.status === "approved").length,
      rejected: reviews.filter((r) => r.status === "rejected").length,
      all: reviews.length,
    }),
    [reviews]
  );

  const filtered = filter === "all" ? reviews : reviews.filter((r) => r.status === filter);

  const tabs: { key: Filter; label: string }[] = [
    { key: "pending", label: `Bekleyenler (${counts.pending})` },
    { key: "approved", label: `Onaylananlar (${counts.approved})` },
    { key: "rejected", label: `Reddedilenler (${counts.rejected})` },
    { key: "all", label: `Tümü (${counts.all})` },
  ];

  return (
    <div className="space-y-5">
      <Card
        title="Yorum Yönetimi"
        description="Müşteriler giriş yapmadan yorum bırakabilir. Yayınlanmadan önce onaylayın veya reddedin."
      >
        <div className="mb-5 flex flex-wrap gap-2">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key)}
              className={`rounded-xl px-3.5 py-2 text-xs font-medium transition ${
                filter === tab.key
                  ? "bg-[var(--accent)] text-white shadow-lg shadow-sky-500/25"
                  : "bg-[var(--surface-2)] text-[var(--text-3)] hover:text-[var(--text-1)]"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {loading ? (
          <LoadingState title="Yükleniyor" description="Yorumlar çekiliyor..." />
        ) : filtered.length === 0 ? (
          <EmptyState
            title="Yorum bulunamadı"
            description={
              filter === "pending"
                ? "Onay bekleyen yorum yok. Harika! 🎉"
                : "Bu filtreyle eşleşen yorum yok."
            }
          />
        ) : (
          <div className="space-y-3">
            {filtered.map((review) => {
              const config = STATUS_CONFIG[review.status ?? "pending"];
              return (
                <div
                  key={review.id}
                  className="rounded-xl border border-[var(--border)] bg-[var(--surface-1)] p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-[var(--text-1)]">{review.customerName}</p>
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${config.bg} ${config.color}`}>
                          {config.label}
                        </span>
                      </div>
                      <div className="mt-1 flex items-center gap-2">
                        <StarRating rating={review.rating} />
                        <span className="text-[10px] text-[var(--text-3)]">
                          {new Date(review.createdAt).toLocaleDateString("tr-TR", {
                            day: "numeric",
                            month: "long",
                            year: "numeric",
                          })}
                        </span>
                      </div>
                      {review.serviceName && (
                        <p className="mt-1 text-[11px] text-[var(--text-3)]">✂️ {review.serviceName}</p>
                      )}
                      {review.comment && (
                        <p className="mt-2 text-sm text-[var(--text-2)]">{review.comment}</p>
                      )}
                      {review.imageUrls && review.imageUrls.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-2">
                          {review.imageUrls.map((url) => (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              key={url}
                              src={url}
                              alt="Yorum fotoğrafı"
                              className="h-16 w-16 rounded-lg border border-[var(--border)] object-cover"
                            />
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="flex shrink-0 gap-2">
                      {review.status !== "approved" && (
                        <button
                          onClick={() => handleStatus(review, "approved")}
                          disabled={processingId === review.id}
                          className="rounded-lg bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-600 transition hover:bg-emerald-500/20 disabled:opacity-50"
                        >
                          ✅ Onayla
                        </button>
                      )}
                      {review.status !== "rejected" && (
                        <button
                          onClick={() => handleStatus(review, "rejected")}
                          disabled={processingId === review.id}
                          className="rounded-lg bg-rose-500/10 px-3 py-1.5 text-xs font-semibold text-rose-600 transition hover:bg-rose-500/20 disabled:opacity-50"
                        >
                          ❌ Reddet
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}
