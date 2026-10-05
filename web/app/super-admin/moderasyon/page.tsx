"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import {
  listCategoryRequests,
  approveCategoryRequest,
  rejectCategoryRequest,
  addCategoryManually,
  type CategoryRequest,
} from "@/features/categories/category-request-repository";
import {
  listHideRequestedReviews,
  listPendingReviewsAcrossPlatform,
  updateReviewStatus,
} from "@/features/reviews/review-repository";
import type { Review } from "@/types/review";
import {
  listBusinessProfileChangeRequests,
  reviewBusinessProfileChange,
  type BusinessProfileChangeRequest,
} from "@/features/businesses/business-profile-review-repository";
import {
  ArrowRight, ArrowUpRight, Building2, CheckCircle2, EyeOff, FolderPlus, Images, MessageSquareWarning, ShieldAlert, ShieldCheck, Tags, UserPen, XCircle,
} from "lucide-react";
import {
  AdminPage, Avatar, Btn, Chips, ConfirmSheet, EmptyState, HeroStat, PageHeader, Pill, Segmented, SkeletonList, Stars, StatCard, StatGrid,
  Toolbar, fullDate, relativeTime, ui, useNow, type Tone,
} from "../_pages-ui";
import m from "./moderation.module.css";

type StatusFilter = "pending" | "approved" | "rejected" | "all";
type Tab = "hide" | "pending" | "profile" | "category";
type Confirm =
  | { kind: "review"; review: Review; status: "approved" | "rejected"; fromHide: boolean }
  | { kind: "category"; request: CategoryRequest }
  | { kind: "profile"; item: BusinessProfileChangeRequest; decision: "approved" | "rejected" };

const CATEGORY_STATUS: Record<string, { label: string; tone: Tone }> = {
  pending: { label: "Bekliyor", tone: "amber" },
  approved: { label: "Onaylandı", tone: "green" },
  rejected: { label: "Reddedildi", tone: "red" },
};

const PROFILE_FIELD_LABELS: Record<string, string> = {
  name: "İşletme adı", category: "Kategori", businessType: "İşletme tipi", phone: "Telefon",
  email: "E-posta", address: "Adres", city: "Şehir", district: "İlçe", description: "Açıklama",
  website: "Web sitesi", socialMedia: "Dijital kanallar", logoUrl: "Logo", coverUrl: "Kapak görseli",
  galleryUrls: "Galeri",
};

function profileValue(value: unknown) {
  if (value === null || value === undefined || value === "") return "—";
  if (Array.isArray(value)) return value.join(" · ") || "—";
  if (typeof value === "object") return Object.entries(value as Record<string, unknown>).map(([key, item]) => `${key}: ${String(item)}`).join(" · ") || "—";
  return String(value);
}

function toMillis(value: string | undefined) {
  if (!value) return null;
  const parsed = new Date(value).getTime();
  return Number.isNaN(parsed) ? null : parsed;
}

export default function SuperAdminModerationPage() {
  const { user } = useAuth();
  const now = useNow();

  // Kategori talepleri
  const [allRequests, setAllRequests] = useState<CategoryRequest[]>([]);
  const [categoryLoading, setCategoryLoading] = useState(true);
  const [filter, setFilter] = useState<StatusFilter>("pending");

  // Profil değişiklikleri
  const [profileRequests, setProfileRequests] = useState<BusinessProfileChangeRequest[]>([]);
  const [profileLoading, setProfileLoading] = useState(true);
  const [note, setNote] = useState<Record<string, string>>({});

  // Yorumlar
  const [pendingReviews, setPendingReviews] = useState<Review[]>([]);
  const [hideRequests, setHideRequests] = useState<Review[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState(true);

  const [tab, setTab] = useState<Tab | null>(null);
  const [processing, setProcessing] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<Confirm | null>(null);

  useEffect(() => {
    let active = true;
    listCategoryRequests()
      .then((data) => { if (active) setAllRequests(data); })
      .catch(() => { if (active) toast.error("Kategori istekleri yüklenemedi."); })
      .finally(() => { if (active) setCategoryLoading(false); });
    listBusinessProfileChangeRequests()
      .then((rows) => { if (active) setProfileRequests(rows.filter((row) => row.status === "pending")); })
      .catch(() => { if (active) toast.error("Profil değişiklikleri yüklenemedi."); })
      .finally(() => { if (active) setProfileLoading(false); });
    Promise.allSettled([listHideRequestedReviews(), listPendingReviewsAcrossPlatform()])
      .then(([hide, pending]) => {
        if (!active) return;
        if (hide.status === "fulfilled") setHideRequests(hide.value);
        if (pending.status === "fulfilled") setPendingReviews(pending.value);
        if (hide.status === "rejected" || pending.status === "rejected") toast.error("Yorumların bir kısmı yüklenemedi.");
      })
      .finally(() => { if (active) setReviewsLoading(false); });
    return () => { active = false; };
  }, []);

  const pendingCount = allRequests.filter((r) => r.status === "pending").length;
  const approvedCount = allRequests.filter((r) => r.status === "approved").length;
  const rejectedCount = allRequests.filter((r) => r.status === "rejected").length;
  const requests = useMemo(() => filter === "all" ? allRequests : allRequests.filter((request) => request.status === filter), [filter, allRequests]);

  // Varsayılan sekme: ilk dolu kuyruk (gizleme > onay > profil > kategori).
  const loadingAny = reviewsLoading || profileLoading || categoryLoading;
  const autoTab: Tab = hideRequests.length ? "hide" : pendingReviews.length ? "pending" : profileRequests.length ? "profile" : pendingCount ? "category" : "hide";
  const activeTab: Tab = tab ?? (reviewsLoading ? "hide" : autoTab);
  const totalQueue = hideRequests.length + pendingReviews.length + profileRequests.length + pendingCount;

  async function handleApprove(req: CategoryRequest) {
    if (!user) return;
    setProcessing(req.id);
    try {
      await approveCategoryRequest(req.id, user.uid, req.requestedCategory);
      toast.success(`"${req.requestedCategory}" kategorisi onaylandı!`);
      setAllRequests((prev) => prev.map((r) => (r.id === req.id ? { ...r, status: "approved" as const } : r)));
    } catch {
      toast.error("Onaylama başarısız.");
    } finally {
      setProcessing(null);
    }
  }

  async function handleReject(req: CategoryRequest) {
    if (!user) return;
    setProcessing(req.id);
    try {
      await rejectCategoryRequest(req.id, user.uid);
      toast.success(`"${req.requestedCategory}" reddedildi.`);
      setAllRequests((prev) => prev.map((r) => (r.id === req.id ? { ...r, status: "rejected" as const } : r)));
    } catch {
      toast.error("Red işlemi başarısız.");
    } finally {
      setProcessing(null);
    }
  }

  async function handleAddCategory(req: CategoryRequest) {
    if (!user) return;
    setProcessing(req.id);
    try {
      await addCategoryManually(req.requestedCategory, user.uid);
      toast.success(`"${req.requestedCategory}" kategoriye eklendi!`);
    } catch {
      toast.error("Kategoriye ekleme başarısız.");
    } finally {
      setProcessing(null);
    }
  }

  async function decideProfile(item: BusinessProfileChangeRequest, decision: "approved" | "rejected") {
    setProcessing(item.id);
    try {
      await reviewBusinessProfileChange(item.id, decision, note[item.id] ?? "");
      setProfileRequests((current) => current.filter((row) => row.id !== item.id));
      toast.success(decision === "approved" ? "Profil değişiklikleri yayına alındı." : "Profil değişiklikleri reddedildi.");
    } catch (error) {
      toast.error((error as Error)?.message || "İnceleme tamamlanamadı.");
    } finally {
      setProcessing(null);
    }
  }

  async function handleDecision(review: Review, status: "approved" | "rejected") {
    setProcessing(review.id);
    try {
      await updateReviewStatus(review.businessId, review.id, status);
      setHideRequests((prev) => prev.filter((r) => r.id !== review.id));
      setPendingReviews((prev) => prev.filter((r) => r.id !== review.id));
      toast.success(status === "approved" ? "Yorum yayında." : "Yorum gizlendi.");
    } catch {
      toast.error("İşlem başarısız oldu.");
    } finally {
      setProcessing(null);
    }
  }

  async function runConfirm() {
    if (!confirm) return;
    if (confirm.kind === "review") await handleDecision(confirm.review, confirm.status);
    else if (confirm.kind === "category") await handleReject(confirm.request);
    else await decideProfile(confirm.item, confirm.decision);
  }

  const reviews = activeTab === "hide" ? hideRequests : pendingReviews;

  return (
    <AdminPage>
      <PageHeader
        eyebrow="Moderasyon masası"
        icon={ShieldCheck}
        title="İçerik ve profil denetimi"
        description="Yorum gizleme talepleri, onay bekleyen yorumlar, profil değişiklikleri ve yeni kategori talepleri tek kuyrukta. 48 saat içinde karar verilmeyen yorumlar otomatik yayınlanır."
        meta={<><HeroStat label="bekleyen karar" value={loadingAny ? "…" : totalQueue} /></>}
        actions={<Link href="/super-admin/isletmeler" className={`${ui.btn} ${ui.btnOnDark}`}><Building2 size={15} /> İşletme başvuruları <ArrowRight size={14} /></Link>}
      />

      <StatGrid>
        <StatCard label="Gizleme talebi" value={reviewsLoading ? "…" : hideRequests.length} hint="İşletme yorumu gizlemek istiyor" icon={EyeOff} tone={hideRequests.length ? "amber" : "neutral"} onClick={() => setTab("hide")} active={activeTab === "hide"} />
        <StatCard label="Onay bekleyen yorum" value={reviewsLoading ? "…" : pendingReviews.length} hint="Yayın öncesi kontrol" icon={MessageSquareWarning} tone="blue" onClick={() => setTab("pending")} active={activeTab === "pending"} />
        <StatCard label="Profil değişikliği" value={profileLoading ? "…" : profileRequests.length} hint="Yayın kuyruğunda" icon={UserPen} tone="violet" onClick={() => setTab("profile")} active={activeTab === "profile"} />
        <StatCard label="Kategori talebi" value={categoryLoading ? "…" : pendingCount} hint={`${approvedCount} onaylı · ${rejectedCount} red`} icon={Tags} tone="lime" onClick={() => setTab("category")} active={activeTab === "category"} />
      </StatGrid>

      <Toolbar>
        <Segmented label="Moderasyon kuyruğu" value={activeTab} onChange={setTab} options={[
          { value: "hide", label: "Gizleme talepleri", count: hideRequests.length, alert: hideRequests.length > 0 },
          { value: "pending", label: "Onay bekleyen yorumlar", count: pendingReviews.length },
          { value: "profile", label: "Profil değişiklikleri", count: profileRequests.length },
          { value: "category", label: "Kategori talepleri", count: pendingCount },
        ]} />
        {activeTab === "category" && <Chips label="Kategori durumu" value={filter} onChange={setFilter} options={[
          { value: "pending", label: "Bekleyen", count: pendingCount },
          { value: "approved", label: "Onaylanan", count: approvedCount },
          { value: "rejected", label: "Reddedilen", count: rejectedCount },
          { value: "all", label: "Tümü", count: allRequests.length },
        ]} />}
      </Toolbar>

      {(activeTab === "hide" || activeTab === "pending") && (
        reviewsLoading ? <SkeletonList rows={3} height={180} />
          : reviews.length === 0 ? <div className={ui.card}><EmptyState icon={activeTab === "hide" ? EyeOff : MessageSquareWarning} title={activeTab === "hide" ? "Bekleyen gizleme talebi yok" : "Onay bekleyen yorum yok"} description={activeTab === "hide" ? "İşletmeler bir yorumu gizlemek istediğinde burada görünür." : "Yeni yorumlar burada görünecek."} /></div>
          : <div className={`${m.list} ${m.listTwo}`}>{reviews.map((review) => {
            const fromHide = activeTab === "hide";
            const busy = processing === review.id;
            const created = toMillis(review.createdAt);
            return (
              <article key={`${review.businessId}-${review.id}`} className={m.review}>
                <header className={m.reviewHead}>
                  <Avatar name={review.customerName || "Müşteri"} seed={review.customerId ?? review.id} />
                  <div className={m.reviewWho}>
                    <b>{review.customerName || "İsimsiz müşteri"}</b>
                    <small><Stars value={review.rating} /> <span title={fullDate(created)}>{relativeTime(created, now)}</span></small>
                  </div>
                  <Pill tone={review.isVisible ? "green" : "neutral"} dot>{review.isVisible ? "Yayında" : "Yayında değil"}</Pill>
                </header>
                <div className={m.meta}>
                  <Link href={`/super-admin/isletmeler?q=${encodeURIComponent(review.businessId)}`} className={ui.link} style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 12.5 }}><Building2 size={13} /> <span className={ui.mono}>{review.businessId.slice(0, 12)}</span> <ArrowUpRight size={12} /></Link>
                  {review.serviceName && <Pill>{review.serviceName}</Pill>}
                  {review.staffName && <Pill>{review.staffName}</Pill>}
                  {review.imageUrls?.length ? <Pill tone="blue"><Images size={11} /> {review.imageUrls.length} fotoğraf</Pill> : null}
                  {review.rating <= 2 && <Pill tone="red">Düşük puan</Pill>}
                </div>
                <p className={`${m.comment} ${review.comment ? "" : m.commentEmpty}`}>{review.comment || "Yorum metni yok, yalnızca puan verilmiş."}</p>
                {fromHide && <div className={m.reason}><ShieldAlert size={18} style={{ flexShrink: 0 }} /><div><b>İşletme gerekçesi</b><p>{review.hideRequest?.reason || "Belirtilmedi"}</p></div></div>}
                {review.ownerReply && <div className={m.reply}><b>İşletme yanıtı</b><br />{review.ownerReply}</div>}
                <div className={m.actions}>
                  <Btn variant="danger" icon={fromHide ? EyeOff : XCircle} disabled={busy} onClick={() => setConfirm({ kind: "review", review, status: "rejected", fromHide })}>{fromHide ? "Gizle" : "Reddet"}</Btn>
                  <Btn variant="primary" icon={CheckCircle2} loading={busy} onClick={() => void handleDecision(review, "approved")}>{fromHide ? "Yayında tut" : "Onayla"}</Btn>
                </div>
              </article>
            );
          })}</div>
      )}

      {activeTab === "profile" && (
        profileLoading ? <SkeletonList rows={2} height={220} />
          : profileRequests.length === 0 ? <div className={ui.card}><EmptyState icon={UserPen} title="Bekleyen profil değişikliği yok" description="Yeni işletme düzenlemeleri güvenli yayın kuyruğunda burada görünecek." /></div>
          : <div className={m.list}>{profileRequests.map((item) => {
            const busy = processing === item.id;
            const submitted = toMillis(item.submittedAt);
            return (
              <article key={item.id} className={m.diffCard}>
                <header className={m.diffHead}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
                    <Avatar name={item.businessName} seed={item.businessId} />
                    <div style={{ minWidth: 0 }}><b>{item.businessName}</b><small>{item.changedFields.length} alan değişiyor · {submitted ? relativeTime(submitted, now) : "Şimdi"}</small></div>
                  </div>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    <Pill tone={item.riskLevel === "review" ? "amber" : "green"}><ShieldAlert size={11} /> {item.riskLevel === "review" ? "Dikkatli incele" : "Düşük risk"}</Pill>
                    <Link href={`/super-admin/isletmeler?q=${encodeURIComponent(item.businessId)}`} className={ui.link} style={{ fontSize: 12.5, display: "inline-flex", alignItems: "center", gap: 3 }}>İşletme <ArrowUpRight size={12} /></Link>
                  </div>
                </header>
                {item.riskFlags?.length > 0 && <div className={m.flags} style={{ paddingTop: 12 }}>{item.riskFlags.map((flag) => <Pill key={flag} tone="amber">{flag}</Pill>)}</div>}
                <div className={m.diffRows}>{item.changedFields.map((field) => (
                  <div key={field} className={m.diffRow}>
                    <b>{PROFILE_FIELD_LABELS[field] ?? field}</b>
                    <span className={m.diffOld}>{profileValue(item.previous[field])}</span>
                    <ArrowRight className={m.diffArrow} size={15} aria-hidden />
                    <span className={m.diffNew}>{profileValue(item.changes[field])}</span>
                  </div>
                ))}</div>
                <footer className={m.diffFoot}>
                  <input value={note[item.id] ?? ""} onChange={(event) => setNote((current) => ({ ...current, [item.id]: event.target.value }))} maxLength={500} placeholder="İşletmeye inceleme notu (isteğe bağlı)" aria-label="İnceleme notu" className={ui.input} />
                  <div className={m.actions}>
                    <Btn variant="danger" icon={XCircle} disabled={busy} onClick={() => setConfirm({ kind: "profile", item, decision: "rejected" })}>Reddet</Btn>
                    <Btn variant="primary" icon={CheckCircle2} loading={busy} onClick={() => setConfirm({ kind: "profile", item, decision: "approved" })}>Onayla ve yayınla</Btn>
                  </div>
                </footer>
              </article>
            );
          })}</div>
      )}

      {activeTab === "category" && (
        categoryLoading ? <SkeletonList rows={4} height={76} />
          : requests.length === 0 ? <div className={ui.card}><EmptyState icon={Tags} title="İstek bulunamadı" description={filter === "pending" ? "Onay bekleyen kategori isteği yok." : "Bu filtreyle eşleşen istek yok."} /></div>
          : <div className={m.list}>{requests.map((req) => {
            const meta = CATEGORY_STATUS[req.status] ?? CATEGORY_STATUS.pending;
            const busy = processing === req.id;
            const requested = toMillis(req.requestedAt);
            return (
              <article key={req.id} className={m.category}>
                <span className={m.categoryIcon} aria-hidden>{req.requestedCategory.slice(0, 1).toLocaleUpperCase("tr-TR")}</span>
                <div className={m.categoryBody}>
                  <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8 }}><b>{req.requestedCategory}</b><Pill tone={meta.tone} dot>{meta.label}</Pill></div>
                  <small>
                    <Link href={`/super-admin/isletmeler?q=${encodeURIComponent(req.businessId)}`} className={ui.link}>{req.businessName}</Link>
                    {" · "}<span title={fullDate(requested)}>{requested ? relativeTime(requested, now) : "—"}</span>
                    {req.reviewedAt && <> · İncelendi {new Date(req.reviewedAt).toLocaleDateString("tr-TR")}{req.reviewedBy ? ` (${req.reviewedBy.slice(0, 8)}…)` : ""}</>}
                  </small>
                </div>
                <div className={m.categoryActions}>
                  {req.status === "pending" && <>
                    <Btn size="sm" variant="danger" icon={XCircle} disabled={busy} onClick={() => setConfirm({ kind: "category", request: req })}>Reddet</Btn>
                    <Btn size="sm" variant="primary" icon={CheckCircle2} loading={busy} onClick={() => void handleApprove(req)}>Onayla</Btn>
                  </>}
                  {req.status === "approved" && <Btn size="sm" icon={FolderPlus} loading={busy} onClick={() => void handleAddCategory(req)}>Kategoriye ekle</Btn>}
                </div>
              </article>
            );
          })}</div>
      )}

      <div className={m.banner}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span className={ui.iconTile}><Building2 size={18} /></span>
          <div><b style={{ fontSize: 14 }}>İşletme başvuruları merkezi</b><p>Bekleyen başvuruları incele, onayla, reddet veya yayından kaldır.</p></div>
        </div>
        <Link href="/super-admin/isletmeler" className={`${ui.btn} ${ui.btnPrimary}`}>Başvuruları aç <ArrowRight size={14} /></Link>
      </div>

      <ConfirmSheet
        open={confirm !== null}
        onClose={() => setConfirm(null)}
        onConfirm={runConfirm}
        tone={confirm?.kind === "profile" && confirm.decision === "approved" ? "primary" : "danger"}
        icon={confirm?.kind === "profile" && confirm.decision === "approved" ? CheckCircle2 : confirm?.kind === "review" && confirm.fromHide ? EyeOff : XCircle}
        title={!confirm ? "" : confirm.kind === "review" ? (confirm.fromHide ? "Yorum gizlensin mi?" : "Yorum reddedilsin mi?") : confirm.kind === "category" ? "Kategori talebi reddedilsin mi?" : confirm.decision === "approved" ? "Değişiklikler yayınlansın mı?" : "Profil değişiklikleri reddedilsin mi?"}
        description={!confirm ? undefined : confirm.kind === "review"
          ? `${confirm.review.customerName || "Müşteri"} yorumu yayından kaldırılacak. Bu karar süper admin kararı olarak kaydedilir.`
          : confirm.kind === "category" ? `"${confirm.request.requestedCategory}" talebi (${confirm.request.businessName}) reddedilecek.`
          : confirm.decision === "approved" ? `${confirm.item.businessName} için ${confirm.item.changedFields.length} alan hemen canlı profile yansıyacak.` : `${confirm.item.businessName} için değişiklikler reddedilecek; not işletmeye iletilir.`}
        confirmLabel={!confirm ? "" : confirm.kind === "review" ? (confirm.fromHide ? "Gizle" : "Reddet") : confirm.kind === "profile" && confirm.decision === "approved" ? "Onayla ve yayınla" : "Reddet"}
      >
        {confirm?.kind === "review" && confirm.review.comment && <p className={m.comment} style={{ fontSize: 13 }}>{confirm.review.comment}</p>}
        {confirm?.kind === "profile" && note[confirm.item.id] && <p className={ui.muted} style={{ fontSize: 13, margin: 0 }}>Not: {note[confirm.item.id]}</p>}
      </ConfirmSheet>
    </AdminPage>
  );
}
