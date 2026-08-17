"use client";

import { FormEvent, useState } from "react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import { createReview, hasUserReviewed } from "@/features/reviews/review-repository";
import { uploadReviewImage } from "@/lib/firebase/upload";
import { Button } from "@/components/ui/button";

interface ReviewFormProps {
  businessId: string;
  /** If provided, binds review to a specific appointment */
  appointmentId?: string;
  serviceName?: string;
  staffName?: string;
  onSuccess?: () => void;
}

export function ReviewForm({
  businessId,
  appointmentId,
  serviceName,
  staffName,
  onSuccess,
}: ReviewFormProps) {
  const { user, status: authStatus } = useAuth();
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  if (authStatus !== "authenticated" || !user) {
    return (
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] p-6 text-center">
        <span className="text-3xl">🔒</span>
        <p className="mt-2 text-sm font-medium text-[var(--text-1)]">
          Yorum yapmak için giriş yapın
        </p>
        <p className="mt-1 text-xs text-[var(--text-3)]">
          Hesabınızla giriş yaptıktan sonra yorum bırakabilirsiniz.
        </p>
        <a
          href="/giris"
          className="mt-4 inline-flex items-center gap-2 rounded-xl bg-[linear-gradient(135deg,var(--accent),var(--accent-3))] px-5 py-2.5 text-sm font-bold text-white shadow-lg transition hover:brightness-110"
        >
          Giriş Yap
        </a>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-8 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/10">
          <span className="text-3xl">🎉</span>
        </div>
        <h3 className="mt-4 text-lg font-bold text-[var(--text-1)]">
          Yorumunuz gönderildi!
        </h3>
        <p className="mt-1 text-sm text-[var(--text-3)]">
          Değerli geri bildiriminiz için teşekkürler.
        </p>
      </div>
    );
  }

  function addFiles(newFiles: FileList | null) {
    if (!newFiles) return;
    const remaining = 3 - files.length;
    if (remaining <= 0) {
      toast.error("En fazla 3 fotoğraf ekleyebilirsiniz.");
      return;
    }
    const toAdd = Array.from(newFiles).slice(0, remaining);
    const oversized = toAdd.filter((f) => f.size > 5 * 1024 * 1024);
    if (oversized.length > 0) {
      toast.error("Fotoğraf boyutu en fazla 5MB olabilir.");
      return;
    }
    setFiles((prev) => [...prev, ...toAdd]);
    setPreviews((prev) => [...prev, ...toAdd.map((f) => URL.createObjectURL(f))]);
  }

  function removeFile(index: number) {
    URL.revokeObjectURL(previews[index]!);
    setFiles((prev) => prev.filter((_, i) => i !== index));
    setPreviews((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (rating === 0) {
      toast.error("Lütfen bir puan verin.");
      return;
    }
    if (!comment.trim() && files.length === 0) {
      toast.error("Lütfen bir yorum yazın veya fotoğraf ekleyin.");
      return;
    }

    setSubmitting(true);

    try {
      // Check duplicate
      if (appointmentId) {
        const already = await hasUserReviewed(businessId, appointmentId);
        if (already) {
          toast.error("Bu randevu için zaten yorum yapmışsınız.");
          setSubmitting(false);
          return;
        }
      }

      // Upload images
      const imageUrls: string[] = [];
      for (const file of files) {
        try {
          const url = await uploadReviewImage(businessId, file);
          imageUrls.push(url);
        } catch {
          // Skip failed upload
        }
      }

      await createReview(businessId, {
        customerId: user!.uid,
        customerName: user!.displayName ?? user!.email ?? "Müşteri",
        appointmentId: appointmentId ?? `direct_${Date.now()}`,
        serviceName: serviceName,
        staffName: staffName,
        rating,
        comment: comment.trim() || undefined,
        imageUrls: imageUrls.length > 0 ? imageUrls : undefined,
      });

      setSubmitted(true);
      toast.success("Yorumunuz başarıyla gönderildi! ⭐");
      onSuccess?.();
    } catch (err) {
      toast.error("Yorum gönderilemedi. Lütfen tekrar deneyin.");
    } finally {
      setSubmitting(false);
    }
  }

  const displayRating = hoverRating || rating;

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] p-6 shadow-lg"
    >
      <h3 className="text-lg font-bold text-[var(--text-1)]">⭐ Yorum Yaz</h3>
      <p className="mt-1 text-xs text-[var(--text-3)]">
        Deneyiminizi paylaşın, diğer müşterilere yardımcı olun.
      </p>

      {/* Star Rating */}
      <div className="mt-5">
        <p className="mb-2 text-sm font-medium text-[var(--text-2)]">Puanınız *</p>
        <div className="flex items-center gap-1">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              onClick={() => setRating(star)}
              onMouseEnter={() => setHoverRating(star)}
              onMouseLeave={() => setHoverRating(0)}
              className="group p-0.5 transition"
            >
              <svg
                width={32}
                height={32}
                viewBox="0 0 20 20"
                fill={star <= displayRating ? "currentColor" : "none"}
                stroke="currentColor"
                strokeWidth={1.5}
                className={`transition-all duration-150 ${
                  star <= displayRating
                    ? "text-amber-400 drop-shadow-[0_0_6px_rgba(251,191,36,0.4)] scale-110"
                    : "text-[var(--text-3)] opacity-40 group-hover:opacity-70 group-hover:scale-105"
                }`}
              >
                <path d="M10 1l2.39 4.84 5.34.78-3.87 3.77.91 5.32L10 13.27 5.23 15.71l.91-5.32L2.27 6.62l5.34-.78L10 1z" />
              </svg>
            </button>
          ))}
          {displayRating > 0 && (
            <span className="ml-2 text-sm font-semibold text-amber-600">
              {displayRating === 5
                ? "Mükemmel!"
                : displayRating === 4
                  ? "Çok İyi"
                  : displayRating === 3
                    ? "İyi"
                    : displayRating === 2
                      ? "Orta"
                      : "Kötü"}
            </span>
          )}
        </div>
      </div>

      {/* Comment */}
      <div className="mt-4">
        <label className="mb-1.5 block text-sm font-medium text-[var(--text-2)]">
          Yorumunuz
        </label>
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          rows={3}
          className="w-full rounded-xl border border-[var(--border)] bg-[var(--field-bg)] px-4 py-3 text-sm text-[var(--text-1)] placeholder:text-[var(--text-3)] outline-none transition hover:bg-[var(--field-bg-hover)] focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--ring)]"
          placeholder="Deneyiminizi paylaşın... Aldığınız hizmet nasıldı?"
        />
      </div>

      {/* Photo Upload */}
      <div className="mt-4">
        <p className="mb-2 text-sm font-medium text-[var(--text-2)]">
          Fotoğraf Ekle{" "}
          <span className="font-normal text-[var(--text-3)]">(maks. 3 adet)</span>
        </p>
        <div className="flex flex-wrap gap-3">
          {previews.map((url, i) => (
            <div key={i} className="group relative">
              <img
                src={url}
                alt={`Fotoğraf ${i + 1}`}
                className="h-20 w-20 rounded-xl border border-[var(--border)] object-cover shadow-sm"
              />
              <button
                type="button"
                onClick={() => removeFile(i)}
                className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-rose-500 text-[10px] text-white shadow-lg transition hover:bg-rose-600"
              >
                ✕
              </button>
            </div>
          ))}
          {files.length < 3 && (
            <label className="flex h-20 w-20 cursor-pointer items-center justify-center rounded-xl border-2 border-dashed border-[var(--border)] bg-[var(--surface-2)] text-[var(--text-3)] transition hover:border-[var(--accent)] hover:text-[var(--accent)] hover:bg-[var(--accent)]/5">
              <div className="flex flex-col items-center gap-0.5">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
                <span className="text-[9px] font-medium">Fotoğraf</span>
              </div>
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                multiple
                className="hidden"
                onChange={(e) => {
                  addFiles(e.target.files);
                  e.target.value = "";
                }}
              />
            </label>
          )}
        </div>
        <p className="mt-1 text-[10px] text-[var(--text-3)]">
          PNG, JPEG, WebP · Maks. 5MB/adet
        </p>
      </div>

      {/* Submit */}
      <div className="mt-5 flex justify-end">
        <Button type="submit" disabled={submitting}>
          {submitting ? (
            <span className="flex items-center gap-2">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              Gönderiliyor...
            </span>
          ) : (
            "⭐ Yorum Gönder"
          )}
        </Button>
      </div>
    </form>
  );
}
