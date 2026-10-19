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
import { tk } from "@/i18n/config";
import { useIntlLocale, useT } from "@/i18n/client";

type Filter = "pending" | "approved" | "unanswered" | "negative" | "review" | "rejected" | "all";

const REPLY_MAX = 1000;
const REASON_MAX = 500;
const REASON_PRESETS = [tk("Hakaret / küfür içeriyor"), tk("Sahte yorum"), tk("Kişisel bilgi paylaşılmış"), tk("Rakip / spam")];

const STATUS_CONFIG: Record<ReviewStatus, { label: string; tone: PillTone }> = {
  pending: { label: tk("Onay bekliyor"), tone: "warn" },
  approved: { label: tk("Yayında"), tone: "ok" },
  rejected: { label: tk("Gizlendi"), tone: "bad" },
};

const isNegative = (r: Review) => (r.rating ?? 0) <= 2;
const isUnderReview = (r: Review) => r.hideRequest?.status === "pending";
const isUnanswered = (r: Review) => !r.ownerReply?.trim() && r.status !== "rejected";

function formatDate(value: unknown, locale: string) {
  const date = new Date(value as string);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString(locale, { day: "numeric", month: "long", year: "numeric" });
}

/** Çevrilmiş cümledeki sayıyı kalın gösterir ("{count} değerlendirme" → <b>12</b> reviews). */
function boldNumber(text: string, value: number) {
  const token = String(value);
  const index = text.indexOf(token);
  if (index < 0) return text;
  return <>{text.slice(0, index)}<b>{token}</b>{text.slice(index + token.length)}</>;
}

function StarRating({ rating, size = 15 }: { rating: number; size?: number }) {
  const t = useT();
  const filled = Math.round(rating);
  return (
    <span className={css.stars} role="img" aria-label={t("5 üzerinden {rating} yıldız", { rating })}>
      {Array.from({ length: 5 }).map((_, i) => (
        <Star key={i} size={size} className={i < filled ? undefined : css.starOff} fill={i < filled ? "currentColor" : "none"} strokeWidth={1.8} aria-hidden />
      ))}
    </span>
  );
}

export default function ReviewsManagementPage() {
  const { businessId } = useBusiness();
  const t = useT();
  const intlLocale = useIntlLocale();
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
        if (active) toast.error(t("Yorumlar yüklenemedi."));
      } finally {
        if (active) setLoading(false);
      }
    }
    void load();
    return () => { active = false; };
  }, [businessId, t]);

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
        toast.success(t("Gizleme talebiniz süper admine iletildi. Karar verilene kadar yorum olduğu gibi kalır."));
      } else {
        setReviews((prev) => prev.map((r) => (r.id === review.id ? { ...r, status, isVisible: status === "approved" } : r)));
        toast.success(t("Yorum onaylandı ve yayınlandı."));
      }
    } catch (error) {
      const message = error instanceof Error && error.message ? error.message : "";
      toast.error(message ? t(message) : t("İşlem başarısız oldu."));
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
      toast.success(t("Yanıtınız kaydedildi."));
    } catch (error) {
      const message = error instanceof Error && error.message ? error.message : "";
      toast.error(message ? t(message) : t("Yanıt kaydedilemedi."));
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
    { value: "pending", label: t("Onay bekleyen"), count: counts.pending },
    { value: "unanswered", label: t("Yanıt bekleyen"), count: counts.unanswered },
    { value: "negative", label: t("Olumsuz"), count: counts.negative },
    { value: "review", label: t("İncelemede"), count: counts.review },
    { value: "approved", label: t("Yayında"), count: counts.approved },
    ...(counts.rejected > 0 || filter === "rejected" ? [{ value: "rejected" as const, label: t("Gizlenen"), count: counts.rejected }] : []),
    { value: "all", label: t("Tümü"), count: counts.all },
  ];

  const hideTarget = hideDraft ? reviews.find((r) => r.id === hideDraft.id) ?? null : null;
  const hideBusy = !!hideDraft && processingId === hideDraft.id;
  const closeHide = useCallback(() => setHideDraft((current) => (current && processingId === current.id ? current : null)), [processingId]);

  const emptyCopy: Record<Filter, { title: string; text: string }> = {
    pending: { title: t("Onay bekleyen yorum yok"), text: t("Harika! Yeni yorumlar geldiğinde burada onayınızı bekleyecek.") },
    unanswered: { title: t("Tüm yorumlara yanıt verdiniz"), text: t("Müşterilerinize dönüş yapmak güven oluşturur — böyle devam.") },
    negative: { title: t("Olumsuz yorum yok"), text: t("1–2 yıldızlı yorumlar burada toplanır.") },
    review: { title: t("İncelemede talep yok"), text: t("Süper admine gönderdiğiniz gizleme talepleri burada görünür.") },
    approved: { title: t("Yayında yorum yok"), text: t("Onayladığınız yorumlar işletme sayfanızda yayınlanır.") },
    rejected: { title: t("Gizlenen yorum yok"), text: t("Süper admin tarafından gizlenen yorumlar burada görünür.") },
    all: { title: t("Henüz yorum yok"), text: t("Müşteriler giriş yapmadan yorum bırakabilir. İlk yorum geldiğinde burada göreceksiniz.") },
  };

  return (
    <StudioPage label={t("Yorum yönetimi")}>
      <StudioHero
        eyebrow={t("Müşteri sesi")}
        icon={MessageSquareText}
        title={t("Yorumlar")}
        description={t("Müşteriler giriş yapmadan yorum bırakabilir. Yayınlanmadan önce onaylayın, yanıtlayın ya da uygunsuz olanlar için gizleme talebi gönderin.")}
        mascot="happy"
      >
        <HeroChip icon={Star} value={summary.total ? summary.average.toFixed(1) : "—"} label={t("ortalama")} />
        <HeroChip icon={Clock3} value={counts.pending} label={t("onay bekliyor")} />
        <HeroChip icon={MessageSquareReply} value={counts.unanswered} label={t("yanıtsız")} />
      </StudioHero>

      {loading ? (
        <StudioSkeleton stats={0} rows={3} label={t("Yorumlar yükleniyor")} />
      ) : (
        <>
          {reviews.length > 0 ? (
            <Panel title={t("Puan özeti")} description={t("Tüm yorumların yıldız dağılımı")} icon={Star}>
              <div className={css.summary}>
                <div className={css.score}>
                  <div className={css.scoreValue}>{summary.average.toFixed(1)}<small>/ 5</small></div>
                  <StarRating rating={summary.average} size={18} />
                  <span className={css.scoreMeta}>{boldNumber(t("{count} değerlendirme", { count: summary.total }), summary.total)} · {boldNumber(t("{count} yayında", { count: counts.approved }), counts.approved)}</span>
                </div>
                <ul className={css.dist} aria-label={t("Yıldız dağılımı")}>
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

          <Segmented label={t("Yorum filtresi")} options={tabs} value={filter} onChange={(value) => { setFilter(value); setReplyDraft(null); }} />

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
                const date = formatDate(review.createdAt, intlLocale);
                const replyDate = review.ownerReplyAt ? formatDate(review.ownerReplyAt, intlLocale) : "";
                return (
                  <article
                    key={review.id}
                    className={cx(css.card, studio.fadeIn, underReview ? css.cardReview : isNegative(review) && css.cardNegative)}
                  >
                    <div className={css.head}>
                      <span className={css.avatar} aria-hidden>{(review.customerName || "?").trim().charAt(0) || "?"}</span>
                      <div className={css.who}>
                        <h3 className={css.name}>{review.customerName || t("Misafir")}</h3>
                        <div className={css.metaLine}>
                          <StarRating rating={review.rating} />
                          {date ? <span>{date}</span> : null}
                        </div>
                      </div>
                      <span className={css.statusSlot}>
                        {underReview ? <Pill tone="warn" dot>{t("İncelemede")}</Pill> : <Pill tone={config.tone} dot>{t(config.label)}</Pill>}
                      </span>
                    </div>

                    {review.serviceName || review.staffName ? (
                      <div className={css.tags}>
                        {review.serviceName ? <span className={css.tag}><Scissors size={13} aria-hidden /><span>{review.serviceName}</span></span> : null}
                        {review.staffName ? <span className={css.tag}><UserRound size={13} aria-hidden /><span>{review.staffName}</span></span> : null}
                      </div>
                    ) : null}

                    {review.comment ? <p className={css.comment}>{review.comment}</p> : <p className={css.commentEmpty}>{t("Yalnızca puan verildi.")}</p>}

                    {review.imageUrls && review.imageUrls.length > 0 ? (
                      <div className={css.photos}>
                        {review.imageUrls.map((url) => (
                          <a key={url} href={url} target="_blank" rel="noreferrer" className={css.photo}>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={url} alt={t("Yorum fotoğrafı")} loading="lazy" />
                          </a>
                        ))}
                      </div>
                    ) : null}

                    {underReview ? (
                      <div className={cx(css.state, css.stateWarn)}>
                        <Hourglass size={17} aria-hidden />
                        <div>
                          <b>{t("Gizleme talebi incelemede")}</b>
                          <p>{t("Süper admin karar verene kadar yorum olduğu gibi kalır.")}{review.hideRequest?.reason ? ` ${t("Gerekçeniz: “{reason}”", { reason: review.hideRequest.reason })}` : ""}</p>
                        </div>
                      </div>
                    ) : locked ? (
                      <div className={cx(css.state, css.stateLock)}>
                        <Lock size={17} aria-hidden />
                        <div>
                          <b>{review.hideRequest?.status === "declined" ? t("Süper admin yayında tuttu") : t("Süper admin karar verdi")}</b>
                          <p>{t("Bu yorumun durumu artık işletme tarafından değiştirilemez.")}</p>
                        </div>
                      </div>
                    ) : null}

                    {editing ? (
                      <div className={css.composer}>
                        <label className={studio.srOnly} htmlFor={`reply-${review.id}`}>{t("Yanıtınız")}</label>
                        <textarea
                          id={`reply-${review.id}`}
                          className={studio.textarea}
                          value={editing.text}
                          onChange={(event) => setReplyDraft({ id: review.id, text: event.target.value.slice(0, REPLY_MAX) })}
                          placeholder={t("{name} için nazik bir yanıt yazın…", { name: review.customerName || t("Müşteri") })}
                          rows={3}
                          autoFocus
                        />
                        <div className={css.composerFoot}>
                          <span className={css.counter}>{editing.text.length}/{REPLY_MAX}</span>
                          <div className={css.composerBtns}>
                            <button type="button" className={cx(studio.btn, studio.btnGhost)} onClick={() => setReplyDraft(null)} disabled={replyingId === review.id}>{t("Vazgeç")}</button>
                            <button
                              type="button"
                              className={cx(studio.btn, studio.btnPrimary)}
                              onClick={() => handleReply(review, editing.text)}
                              disabled={replyingId === review.id || !editing.text.trim()}
                            >
                              {replyingId === review.id ? <LoaderCircle size={16} className={studio.spin} aria-hidden /> : <MessageSquareReply size={16} aria-hidden />}
                              {t("Yanıtı kaydet")}
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : review.ownerReply ? (
                      <div className={css.reply}>
                        <div className={css.replyHead}>
                          <span className={css.replyLabel}><MessageSquareReply size={14} aria-hidden />{t("İşletme yanıtı")}{replyDate ? <small>· {replyDate}</small> : null}</span>
                          <button type="button" className={cx(studio.btn, studio.btnGhost, studio.btnSm)} onClick={() => setReplyDraft({ id: review.id, text: review.ownerReply ?? "" })}>
                            <Pencil size={14} aria-hidden />{t("Düzenle")}
                          </button>
                        </div>
                        <p className={css.replyText}>{review.ownerReply}</p>
                      </div>
                    ) : null}

                    {!editing && (!review.ownerReply || (!underReview && !locked)) ? (
                      <div className={css.actions}>
                        {!review.ownerReply ? (
                          <button type="button" className={cx(studio.btn, studio.btnSoft)} onClick={() => setReplyDraft({ id: review.id, text: "" })}>
                            <MessageSquareReply size={16} aria-hidden />{t("Yanıtla")}
                          </button>
                        ) : null}
                        {!underReview && !locked && review.status !== "approved" ? (
                          <button type="button" className={cx(studio.btn, css.approve)} onClick={() => handleStatus(review, "approved")} disabled={busy}>
                            {busy ? <LoaderCircle size={16} className={studio.spin} aria-hidden /> : <CheckCircle2 size={16} aria-hidden />}{t("Yayınla")}
                          </button>
                        ) : null}
                        {!underReview && !locked && review.status !== "rejected" ? (
                          <button type="button" className={cx(studio.btn, studio.btnDangerSoft)} onClick={() => setHideDraft({ id: review.id, reason: "" })} disabled={busy}>
                            <EyeOff size={16} aria-hidden />{t("Gizleme talebi")}
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
        title={t("Gizleme talebi gönder")}
        description={t("Yorumlar işletme tarafından doğrudan gizlenemez. Talebiniz süper admin tarafından incelenir.")}
        footer={
          <>
            <button type="button" className={studio.btn} onClick={closeHide} disabled={hideBusy}>{t("Vazgeç")}</button>
            <button
              type="button"
              className={cx(studio.btn, studio.btnDanger)}
              onClick={() => { if (hideDraft && hideTarget) void handleStatus(hideTarget, "rejected", hideDraft.reason.trim()); }}
              disabled={!hideTarget || hideBusy || (hideDraft?.reason.trim().length ?? 0) < 5}
            >
              {hideBusy ? <LoaderCircle size={16} className={studio.spin} aria-hidden /> : <ShieldAlert size={16} aria-hidden />}
              {t("Süper admine gönder")}
            </button>
          </>
        }
      >
        {hideDraft ? (
          <div className={css.sheetBody}>
            {hideTarget ? (
              <div className={css.quote}>
                <b>{hideTarget.customerName || t("Misafir")} · <StarRating rating={hideTarget.rating} size={13} /></b>
                {hideTarget.comment ? <p>{hideTarget.comment}</p> : null}
              </div>
            ) : null}
            <Notice tone="warn" icon={Clock3}>
              {t("Karar verilene kadar yorum olduğu gibi kalır. 48 saat içinde işlem yapılmayan yorumlar otomatik yayınlanır.")}
            </Notice>
            <div className={studio.field}>
              <label className={studio.label} htmlFor="hide-reason">{t("Gerekçe")}</label>
              <div className={css.reasons}>
                {REASON_PRESETS.map((preset) => (
                  <button key={preset} type="button" className={css.reasonChip} onClick={() => setHideDraft({ id: hideDraft.id, reason: t(preset) })}>{t(preset)}</button>
                ))}
              </div>
              <textarea
                id="hide-reason"
                data-autofocus
                className={studio.textarea}
                value={hideDraft.reason}
                onChange={(event) => setHideDraft({ id: hideDraft.id, reason: event.target.value.slice(0, REASON_MAX) })}
                placeholder={t("Gerekçe (ör. hakaret, sahte yorum, kişisel bilgi)")}
                rows={3}
              />
              <span className={studio.help}>{t("En az 5 karakter")} · {hideDraft.reason.length}/{REASON_MAX}</span>
            </div>
          </div>
        ) : null}
      </Sheet>
    </StudioPage>
  );
}
