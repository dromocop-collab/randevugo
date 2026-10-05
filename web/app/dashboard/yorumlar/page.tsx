"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  CheckCircle2,
  Clock3,
  EyeOff,
  Hourglass,
  LoaderCircle,
  Lock,
  MessageSquareReply,
  MessageSquareText,
  Pencil,
  Scissors,
  ShieldAlert,
  Star,
  UserRound,
} from "lucide-react";
import { useBusiness } from "@/hooks/use-business";
import {
  addOwnerReply,
  listBusinessReviewsForOwner,
  updateReviewStatus,
} from "@/features/reviews/review-repository";
import type { Review, ReviewStatus } from "@/types/review";
import {
  EmptyState,
  HeroChip,
  Notice,
  Panel,
  Pill,
  Segmented,
  Sheet,
  StudioHero,
  StudioPage,
  StudioSkeleton,
  cx,
  studio,
  type PillTone,
} from "../_studio";
import css from "./reviews.module.css";

type Filter = "pending" | "approved" | "unanswered" | "negative" | "review" | "rejected" | "all";

const REPLY_MAX = 1000;
const REASON_MAX = 500;
const REASON_PRESETS = ["Hakaret / küfür içeriyor", "Sahte yorum", "Kişisel bilgi paylaşılmış", "Rakip / spam"];

const STATUS_CONFIG: Record<ReviewStatus, { label: string; tone: PillTone }> = {
  pending: { label: "Onay bekliyor", tone: "warn" },
  approved: { label: "Yayında", tone: "ok" },
  rejected: { label: "Gizlendi", tone: "bad" },
};

const isNegative = (r: Review) => (r.rating ?? 0) <= 2;
const isUnderReview = (r: Review) => r.hideRequest?.status === "pending";
const isUnanswered = (r: Review) => !r.ownerReply?.trim() && r.status !== "rejected";

function formatDate(value: unknown) {
  const date = new Date(value as string);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: "numeric" });
}

function StarRating({ rating, size = 15 }: { rating: number; size?: number }) {
  const filled = Math.round(rating);
  return (
    <span className={css.stars} role="img" aria-label={`5 üzerinden ${rating} yıldız`}>
      {Array.from({ length: 5 }).map((_, i) => (
        <Star key={i} size={size} className={i < filled ? undefined : css.starOff} fill={i < filled ? "currentColor" : "none"} strokeWidth={1.8} aria-hidden />
      ))}
    </span>
  );
}

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

  const [hideDraft, setHideDraft] = useState<{ id: string; reason: string } | null>(null);
  const [replyDraft, setReplyDraft] = useState<{ id: string; text: string } | null>(null);
  const [replyingId, setReplyingId] = useState<string | null>(null);

  async function handleStatus(review: Review, status: ReviewStatus, reason?: string) {
    if (!businessId) return;
    setProcessingId(review.id);
    try {
      const result = await updateReviewStatus(businessId, review.id, status, reason);
      if (result.hideRequested) {
        setReviews((prev) => prev.map((r) => (r.id === review.id ? { ...r, hideRequest: { status: "pending", reason: reason ?? null } } : r)));
        setHideDraft(null);
        toast.success("Gizleme talebiniz süper admine iletildi. Karar verilene kadar yorum olduğu gibi kalır.");
      } else {
        setReviews((prev) => prev.map((r) => (r.id === review.id ? { ...r, status, isVisible: status === "approved" } : r)));
        toast.success("Yorum onaylandı ve yayınlandı.");
      }
    } catch (error) {
      const message = error instanceof Error && error.message ? error.message : "";
      toast.error(message || "İşlem başarısız oldu.");
      return;
    } finally {
      setProcessingId(null);
    }
  }

  async function handleReply(review: Review, text: string) {
    const reply = text.trim();
    if (!businessId || !reply) return;
    setReplyingId(review.id);
    try {
      await addOwnerReply(businessId, review.id, reply);
      const at = new Date().toISOString();
      setReviews((prev) => prev.map((r) => (r.id === review.id ? { ...r, ownerReply: reply, ownerReplyAt: at } : r)));
      setReplyDraft(null);
      toast.success("Yanıtınız kaydedildi.");
    } catch (error) {
      const message = error instanceof Error && error.message ? error.message : "";
      toast.error(message || "Yanıt kaydedilemedi.");
    } finally {
      setReplyingId(null);
    }
  }

  const counts = useMemo(
    () => ({
      pending: reviews.filter((r) => r.status === "pending").length,
      approved: reviews.filter((r) => r.status === "approved").length,
      rejected: reviews.filter((r) => r.status === "rejected").length,
      unanswered: reviews.filter(isUnanswered).length,
      negative: reviews.filter(isNegative).length,
      review: reviews.filter(isUnderReview).length,
      all: reviews.length,
    }),
    [reviews]
  );

  const summary = useMemo(() => {
    const dist = [5, 4, 3, 2, 1].map((star) => ({ star, count: reviews.filter((r) => Math.round(r.rating ?? 0) === star).length }));
    const rated = reviews.filter((r) => typeof r.rating === "number" && r.rating > 0);
    const average = rated.length ? rated.reduce((sum, r) => sum + r.rating, 0) / rated.length : 0;
    const max = Math.max(1, ...dist.map((d) => d.count));
    return { dist, average, max, total: rated.length };
  }, [reviews]);

  const filtered = useMemo(() => {
    switch (filter) {
      case "all": return reviews;
      case "unanswered": return reviews.filter(isUnanswered);
      case "negative": return reviews.filter(isNegative);
      case "review": return reviews.filter(isUnderReview);
      default: return reviews.filter((r) => r.status === filter);
    }
  }, [reviews, filter]);

  const tabs: { value: Filter; label: string; count: number }[] = [
    { value: "pending", label: "Onay bekleyen", count: counts.pending },
    { value: "unanswered", label: "Yanıt bekleyen", count: counts.unanswered },
    { value: "negative", label: "Olumsuz", count: counts.negative },
    { value: "review", label: "İncelemede", count: counts.review },
    { value: "approved", label: "Yayında", count: counts.approved },
    ...(counts.rejected > 0 || filter === "rejected" ? [{ value: "rejected" as const, label: "Gizlenen", count: counts.rejected }] : []),
    { value: "all", label: "Tümü", count: counts.all },
  ];

  const hideTarget = hideDraft ? reviews.find((r) => r.id === hideDraft.id) ?? null : null;
  const hideBusy = !!hideDraft && processingId === hideDraft.id;
  const closeHide = useCallback(() => setHideDraft((current) => (current && processingId === current.id ? current : null)), [processingId]);

  const emptyCopy: Record<Filter, { title: string; text: string }> = {
    pending: { title: "Onay bekleyen yorum yok", text: "Harika! Yeni yorumlar geldiğinde burada onayınızı bekleyecek." },
    unanswered: { title: "Tüm yorumlara yanıt verdiniz", text: "Müşterilerinize dönüş yapmak güven oluşturur — böyle devam." },
    negative: { title: "Olumsuz yorum yok", text: "1–2 yıldızlı yorumlar burada toplanır." },
    review: { title: "İncelemede talep yok", text: "Süper admine gönderdiğiniz gizleme talepleri burada görünür." },
    approved: { title: "Yayında yorum yok", text: "Onayladığınız yorumlar işletme sayfanızda yayınlanır." },
    rejected: { title: "Gizlenen yorum yok", text: "Süper admin tarafından gizlenen yorumlar burada görünür." },
    all: { title: "Henüz yorum yok", text: "Müşteriler giriş yapmadan yorum bırakabilir. İlk yorum geldiğinde burada göreceksiniz." },
  };

  return (
    <StudioPage label="Yorum yönetimi">
      <StudioHero
        eyebrow="Müşteri sesi"
        icon={MessageSquareText}
        title="Yorumlar"
        description="Müşteriler giriş yapmadan yorum bırakabilir. Yayınlanmadan önce onaylayın, yanıtlayın ya da uygunsuz olanlar için gizleme talebi gönderin."
        mascot="happy"
      >
        <HeroChip icon={Star} value={summary.total ? summary.average.toFixed(1) : "—"} label="ortalama" />
        <HeroChip icon={Clock3} value={counts.pending} label="onay bekliyor" />
        <HeroChip icon={MessageSquareReply} value={counts.unanswered} label="yanıtsız" />
      </StudioHero>

      {loading ? (
        <StudioSkeleton stats={0} rows={3} label="Yorumlar yükleniyor" />
      ) : (
        <>
          {reviews.length > 0 ? (
            <Panel title="Puan özeti" description="Tüm yorumların yıldız dağılımı" icon={Star}>
              <div className={css.summary}>
                <div className={css.score}>
                  <div className={css.scoreValue}>{summary.average.toFixed(1)}<small>/ 5</small></div>
                  <StarRating rating={summary.average} size={18} />
                  <span className={css.scoreMeta}><b>{summary.total}</b> değerlendirme · <b>{counts.approved}</b> yayında</span>
                </div>
                <ul className={css.dist} aria-label="Yıldız dağılımı">
                  {summary.dist.map((d) => (
                    <li key={d.star} className={css.distRow}>
                      <span>{d.star}<Star size={13} fill="currentColor" aria-hidden /></span>
                      <span className={cx(css.bar, d.star <= 2 && css.barLow)} aria-hidden>
                        <i style={{ width: `${(d.count / summary.max) * 100}%` }} />
                      </span>
                      <span>{d.count}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </Panel>
          ) : null}

          <Segmented label="Yorum filtresi" options={tabs} value={filter} onChange={(value) => { setFilter(value); setReplyDraft(null); }} />

          {filtered.length === 0 ? (
            <EmptyState title={emptyCopy[filter].title} description={emptyCopy[filter].text} mood={filter === "all" ? "wave" : "happy"} />
          ) : (
            <div className={css.list}>
              {filtered.map((review) => {
                const config = STATUS_CONFIG[review.status ?? "pending"] ?? STATUS_CONFIG.pending;
                const busy = processingId === review.id;
                const underReview = isUnderReview(review);
                const locked = !underReview && !!review.lockedByAdmin;
                const editing = replyDraft?.id === review.id ? replyDraft : null;
                const date = formatDate(review.createdAt);
                const replyDate = review.ownerReplyAt ? formatDate(review.ownerReplyAt) : "";
                return (
                  <article
                    key={review.id}
                    className={cx(css.card, studio.fadeIn, underReview ? css.cardReview : isNegative(review) && css.cardNegative)}
                  >
                    <div className={css.head}>
                      <span className={css.avatar} aria-hidden>{(review.customerName || "?").trim().charAt(0) || "?"}</span>
                      <div className={css.who}>
                        <h3 className={css.name}>{review.customerName || "Misafir"}</h3>
                        <div className={css.metaLine}>
                          <StarRating rating={review.rating} />
                          {date ? <span>{date}</span> : null}
                        </div>
                      </div>
                      <span className={css.statusSlot}>
                        {underReview ? <Pill tone="warn" dot>İncelemede</Pill> : <Pill tone={config.tone} dot>{config.label}</Pill>}
                      </span>
                    </div>

                    {review.serviceName || review.staffName ? (
                      <div className={css.tags}>
                        {review.serviceName ? <span className={css.tag}><Scissors size={13} aria-hidden /><span>{review.serviceName}</span></span> : null}
                        {review.staffName ? <span className={css.tag}><UserRound size={13} aria-hidden /><span>{review.staffName}</span></span> : null}
                      </div>
                    ) : null}

                    {review.comment ? <p className={css.comment}>{review.comment}</p> : <p className={css.commentEmpty}>Yalnızca puan verildi.</p>}

                    {review.imageUrls && review.imageUrls.length > 0 ? (
                      <div className={css.photos}>
                        {review.imageUrls.map((url) => (
                          <a key={url} href={url} target="_blank" rel="noreferrer" className={css.photo}>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={url} alt="Yorum fotoğrafı" loading="lazy" />
                          </a>
                        ))}
                      </div>
                    ) : null}

                    {underReview ? (
                      <div className={cx(css.state, css.stateWarn)}>
                        <Hourglass size={17} aria-hidden />
                        <div>
                          <b>Gizleme talebi incelemede</b>
                          <p>Süper admin karar verene kadar yorum olduğu gibi kalır.{review.hideRequest?.reason ? ` Gerekçeniz: “${review.hideRequest.reason}”` : ""}</p>
                        </div>
                      </div>
                    ) : locked ? (
                      <div className={cx(css.state, css.stateLock)}>
                        <Lock size={17} aria-hidden />
                        <div>
                          <b>{review.hideRequest?.status === "declined" ? "Süper admin yayında tuttu" : "Süper admin karar verdi"}</b>
                          <p>Bu yorumun durumu artık işletme tarafından değiştirilemez.</p>
                        </div>
                      </div>
                    ) : null}

                    {editing ? (
                      <div className={css.composer}>
                        <label className={studio.srOnly} htmlFor={`reply-${review.id}`}>Yanıtınız</label>
                        <textarea
                          id={`reply-${review.id}`}
                          className={studio.textarea}
                          value={editing.text}
                          onChange={(event) => setReplyDraft({ id: review.id, text: event.target.value.slice(0, REPLY_MAX) })}
                          placeholder={`${review.customerName || "Müşteri"} için nazik bir yanıt yazın…`}
                          rows={3}
                          autoFocus
                        />
                        <div className={css.composerFoot}>
                          <span className={css.counter}>{editing.text.length}/{REPLY_MAX}</span>
                          <div className={css.composerBtns}>
                            <button type="button" className={cx(studio.btn, studio.btnGhost)} onClick={() => setReplyDraft(null)} disabled={replyingId === review.id}>Vazgeç</button>
                            <button
                              type="button"
                              className={cx(studio.btn, studio.btnPrimary)}
                              onClick={() => handleReply(review, editing.text)}
                              disabled={replyingId === review.id || !editing.text.trim()}
                            >
                              {replyingId === review.id ? <LoaderCircle size={16} className={studio.spin} aria-hidden /> : <MessageSquareReply size={16} aria-hidden />}
                              Yanıtı kaydet
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : review.ownerReply ? (
                      <div className={css.reply}>
                        <div className={css.replyHead}>
                          <span className={css.replyLabel}><MessageSquareReply size={14} aria-hidden />İşletme yanıtı{replyDate ? <small>· {replyDate}</small> : null}</span>
                          <button type="button" className={cx(studio.btn, studio.btnGhost, studio.btnSm)} onClick={() => setReplyDraft({ id: review.id, text: review.ownerReply ?? "" })}>
                            <Pencil size={14} aria-hidden />Düzenle
                          </button>
                        </div>
                        <p className={css.replyText}>{review.ownerReply}</p>
                      </div>
                    ) : null}

                    {!editing && (!review.ownerReply || (!underReview && !locked)) ? (
                      <div className={css.actions}>
                        {!review.ownerReply ? (
                          <button type="button" className={cx(studio.btn, studio.btnSoft)} onClick={() => setReplyDraft({ id: review.id, text: "" })}>
                            <MessageSquareReply size={16} aria-hidden />Yanıtla
                          </button>
                        ) : null}
                        {!underReview && !locked && review.status !== "approved" ? (
                          <button type="button" className={cx(studio.btn, css.approve)} onClick={() => handleStatus(review, "approved")} disabled={busy}>
                            {busy ? <LoaderCircle size={16} className={studio.spin} aria-hidden /> : <CheckCircle2 size={16} aria-hidden />}Yayınla
                          </button>
                        ) : null}
                        {!underReview && !locked && review.status !== "rejected" ? (
                          <button type="button" className={cx(studio.btn, studio.btnDangerSoft)} onClick={() => setHideDraft({ id: review.id, reason: "" })} disabled={busy}>
                            <EyeOff size={16} aria-hidden />Gizleme talebi
                          </button>
                        ) : null}
                      </div>
                    ) : null}
                  </article>
                );
              })}
            </div>
          )}
        </>
      )}

      <Sheet
        open={!!hideDraft}
        onClose={closeHide}
        title="Gizleme talebi gönder"
        description="Yorumlar işletme tarafından doğrudan gizlenemez. Talebiniz süper admin tarafından incelenir."
        footer={
          <>
            <button type="button" className={studio.btn} onClick={closeHide} disabled={hideBusy}>Vazgeç</button>
            <button
              type="button"
              className={cx(studio.btn, studio.btnDanger)}
              onClick={() => { if (hideDraft && hideTarget) void handleStatus(hideTarget, "rejected", hideDraft.reason.trim()); }}
              disabled={!hideTarget || hideBusy || (hideDraft?.reason.trim().length ?? 0) < 5}
            >
              {hideBusy ? <LoaderCircle size={16} className={studio.spin} aria-hidden /> : <ShieldAlert size={16} aria-hidden />}
              Süper admine gönder
            </button>
          </>
        }
      >
        {hideDraft ? (
          <div className={css.sheetBody}>
            {hideTarget ? (
              <div className={css.quote}>
                <b>{hideTarget.customerName || "Misafir"} · <StarRating rating={hideTarget.rating} size={13} /></b>
                {hideTarget.comment ? <p>{hideTarget.comment}</p> : null}
              </div>
            ) : null}
            <Notice tone="warn" icon={Clock3}>
              Karar verilene kadar yorum olduğu gibi kalır. 48 saat içinde işlem yapılmayan yorumlar otomatik yayınlanır.
            </Notice>
            <div className={studio.field}>
              <label className={studio.label} htmlFor="hide-reason">Gerekçe</label>
              <div className={css.reasons}>
                {REASON_PRESETS.map((preset) => (
                  <button key={preset} type="button" className={css.reasonChip} onClick={() => setHideDraft({ id: hideDraft.id, reason: preset })}>{preset}</button>
                ))}
              </div>
              <textarea
                id="hide-reason"
                data-autofocus
                className={studio.textarea}
                value={hideDraft.reason}
                onChange={(event) => setHideDraft({ id: hideDraft.id, reason: event.target.value.slice(0, REASON_MAX) })}
                placeholder="Gerekçe (ör. hakaret, sahte yorum, kişisel bilgi)"
                rows={3}
              />
              <span className={studio.help}>En az 5 karakter · {hideDraft.reason.length}/{REASON_MAX}</span>
            </div>
          </div>
        ) : null}
      </Sheet>
    </StudioPage>
  );
}
