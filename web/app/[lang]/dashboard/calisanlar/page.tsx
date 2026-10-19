"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { CalendarClock, ChevronRight, Link2Off, MailCheck, Scissors, ShieldCheck, Star, UserPlus, UsersRound } from "lucide-react";
import { useBusiness } from "@/hooks/use-business";
import { listStaff, updateStaff } from "@/features/staff/staff-repository";
import { listServices } from "@/features/services/service-repository";
import { listServiceCategories } from "@/features/services/service-category-repository";
import { listAppointments } from "@/features/appointments/appointment-repository";
import { listBusinessReviewsForOwner } from "@/features/reviews/review-repository";
import type { Staff } from "@/types/staff";
import type { Service } from "@/types/service";
import type { ServiceCategory } from "@/types/service-category";
import type { Appointment } from "@/types/appointments";
import type { Review } from "@/types/review";
import {
  Badge, Button, DashPage, EmptyState, PageHeader, SearchField, SegmentedControl, Skeleton, SkeletonList, Toolbar,
} from "@/components/dashboard/ui";
import { Avatar, OrderButtons, cx, matchesSearch } from "../_workspace/kit";
import { bySortOrder, reorderPatch } from "../hizmetler/service-shared";
import { StaffCreateSheet } from "./staff-create-sheet";
import { StaffEditorSheet } from "./staff-editor-sheet";
import styles from "./staff.module.css";
import { useIntlLocale, useT } from "@/i18n/client";

type StaffFilter = "all" | "active" | "paused" | "unlinked" | "archived";

export default function StaffPage() {
  const { businessId } = useBusiness();
  const t = useT();
  const intlLocale = useIntlLocale();
  const [staff, setStaff] = useState<Staff[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadedAt] = useState(() => Date.now());
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<StaffFilter>("all");
  const [orderBusy, setOrderBusy] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing] = useState<{ key: number; id: string } | null>(null);
  const layerKey = useRef(0);
  const nextKey = () => ++layerKey.current;

  useEffect(() => {
    if (!businessId) return;
    let cancelled = false;

    Promise.all([listStaff(businessId), listServices(businessId), listServiceCategories(businessId), listAppointments(businessId), listBusinessReviewsForOwner(businessId).catch(() => [] as Review[])]).then(
      ([staffRows, serviceRows, categoryRows, appointmentRows, reviewRows]) => {
        if (cancelled) return;
        setStaff(staffRows);
        setServices(serviceRows);
        setCategories(categoryRows);
        setAppointments(appointmentRows);
        setReviews(reviewRows);
        setLoading(false);
      }
    ).catch(() => {
      if (cancelled) return;
      setLoading(false);
      toast.error(t("Ekip bilgileri yüklenemedi."));
    });

    return () => { cancelled = true; };
  }, [businessId, t]);

  const refreshStaff = useCallback(async () => {
    if (!businessId) return;
    setStaff(await listStaff(businessId));
  }, [businessId]);

  const ordered = useMemo(() => [...staff].sort(bySortOrder), [staff]);
  const current = ordered.filter((member) => !member.archivedAt);
  const archived = ordered.filter((member) => member.archivedAt);
  const counts = {
    all: current.length,
    active: current.filter((member) => member.isActive).length,
    paused: current.filter((member) => !member.isActive).length,
    unlinked: current.filter((member) => !member.linkedUid).length,
    archived: archived.length,
  };
  const filtering = Boolean(search.trim()) || filter !== "all";
  const visible = (filter === "archived" ? archived : current).filter((member) => {
    if (filter === "active" && !member.isActive) return false;
    if (filter === "paused" && member.isActive) return false;
    if (filter === "unlinked" && member.linkedUid) return false;
    return matchesSearch(search, member.fullName, member.phone, member.email, member.position);
  });

  const stats = useMemo(() => {
    const map: Record<string, { upcoming: number; rating: number; reviews: number }> = {};
    staff.forEach((member) => {
      const upcoming = appointments.filter((appointment) => appointment.staffId === member.id && ["pending", "confirmed"].includes(appointment.status) && new Date(appointment.startAt).getTime() >= loadedAt).length;
      const own = reviews.filter((review) => review.staffId === member.id && review.status === "approved");
      map[member.id] = { upcoming, reviews: own.length, rating: own.length ? own.reduce((total, review) => total + review.rating, 0) / own.length : 0 };
    });
    return map;
  }, [appointments, loadedAt, reviews, staff]);

  async function moveStaff(index: number, direction: -1 | 1) {
    if (!businessId) return;
    const patch = reorderPatch(current, index, direction);
    if (!patch.length) return;
    setOrderBusy(true);
    const byId = new Map(patch.map((item) => [item.id, item.sortOrder]));
    setStaff((rows) => rows.map((item) => byId.has(item.id) ? { ...item, sortOrder: byId.get(item.id)! } : item));
    try {
      await Promise.all(patch.map((item) => updateStaff(businessId, item.id, { sortOrder: item.sortOrder })));
    } catch {
      toast.error(t("Sıralama kaydedilemedi."));
      await refreshStaff();
    } finally {
      setOrderBusy(false);
    }
  }

  const editingMember = editing ? staff.find((member) => member.id === editing.id) : undefined;
  const categoryNames = (member: Staff) => categories.filter((category) => member.specialtyCategoryIds?.includes(category.id)).map((category) => category.name).join(" · ");

  if (loading) {
    return (
      <DashPage>
        <Skeleton height={150} radius={24} />
        <Skeleton height={48} radius={16} />
        <SkeletonList rows={4} height={84} label={t("Ekip yükleniyor")} />
      </DashPage>
    );
  }

  return (
    <DashPage>
      <PageHeader
        eyebrow={t("Ekip yönetimi")}
        icon={UsersRound}
        title={t("Ekibiniz")}
        description={t("Çalışan ekleyin; hizmetlerini, çalışma saatlerini ve panel yetkilerini tek yerden düzenleyin.")}
        actions={<Button variant="bright" icon={UserPlus} onClick={() => setShowCreate(true)}>{t("Çalışan ekle")}</Button>}
        meta={<>
          <Badge tone="accent" icon={UsersRound}>{t("{count} aktif", { count: counts.active })}</Badge>
          {counts.paused ? <Badge tone="neutral">{t("{count} pasif", { count: counts.paused })}</Badge> : null}
          {counts.unlinked ? <Badge tone="amber" icon={Link2Off}>{t("{count} panel daveti bekliyor", { count: counts.unlinked })}</Badge> : null}
        </>}
      />

      {current.length === 0 && archived.length === 0 ? (
        <EmptyState
          mascot="wave"
          title={t("Ekibinizi kuralım")}
          description={t("İlk çalışanınızı ekleyin; e-posta adresine çalışan paneli daveti otomatik gönderilir.")}
          action={<Button variant="primary" icon={UserPlus} onClick={() => setShowCreate(true)}>{t("İlk çalışanı ekle")}</Button>}
        />
      ) : (
        <>
          <Toolbar>
            <SearchField value={search} onChange={setSearch} placeholder={t("İsim, telefon veya e-posta ara")} />
            <SegmentedControl
              ariaLabel={t("Çalışan durumu")}
              value={filter}
              onChange={setFilter}
              options={[
                { value: "all", label: t("Tümü"), count: counts.all },
                { value: "active", label: t("Aktif"), count: counts.active },
                ...(counts.paused ? [{ value: "paused" as const, label: t("Pasif"), count: counts.paused }] : []),
                ...(counts.unlinked ? [{ value: "unlinked" as const, label: t("Davet bekleyen"), count: counts.unlinked }] : []),
                ...(counts.archived ? [{ value: "archived" as const, label: t("Arşiv"), count: counts.archived }] : []),
              ]}
            />
          </Toolbar>

          {visible.length === 0 ? (
            <EmptyState compact mascot="thinking" title={t("Eşleşen çalışan yok")} description={t("Aramayı veya filtreyi değiştirmeyi deneyin.")} action={<Button variant="soft" onClick={() => { setSearch(""); setFilter("all"); }}>{t("Filtreleri temizle")}</Button>} />
          ) : (
            <section className={styles.list} aria-label={t("Çalışanlar")}>
              <div className={styles.listHead} aria-hidden="true">
                <span>{t("Çalışan")}</span><span>{t("Hizmet")}</span><span>{t("Yaklaşan")}</span><span>{t("Puan")}</span><span>{t("Panel")}</span><span />
              </div>
              {visible.map((member, index) => {
                const stat = stats[member.id] ?? { upcoming: 0, rating: 0, reviews: 0 };
                const branches = categoryNames(member);
                return (
                  <article key={member.id} className={cx(styles.row, !member.isActive && styles.rowPaused)}>
                    {!filtering ? <OrderButtons label={member.fullName} canUp={index > 0} canDown={index < visible.length - 1} onUp={() => void moveStaff(index, -1)} onDown={() => void moveStaff(index, 1)} disabled={orderBusy} /> : null}
                    <button type="button" className={styles.rowButton} onClick={() => setEditing({ key: nextKey(), id: member.id })} aria-label={t("{name} profilini aç", { name: member.fullName })}>
                      <span className={styles.identity}>
                        <Avatar name={member.fullName} photoUrl={member.photoUrl} muted={!member.isActive} />
                        <span className={styles.identityText}>
                          <b>{member.fullName}</b>
                          <small>{member.position}{branches ? ` · ${branches}` : ""}</small>
                          <span className={styles.badges}>
                            {member.archivedAt ? <Badge size="sm" tone="neutral">{t("Arşivde")}</Badge> : !member.isActive ? <Badge size="sm" tone="neutral">{t("Pasif")}</Badge> : null}
                            <span className={styles.mobileOnly}>{member.linkedUid ? <Badge size="sm" tone="green" icon={ShieldCheck}>{t("Panel")}</Badge> : <Badge size="sm" tone="amber" icon={MailCheck}>{t("Davet bekliyor")}</Badge>}</span>
                          </span>
                        </span>
                      </span>
                      <span className={styles.metric}><Scissors size={14} aria-hidden="true" /><b>{member.serviceIds.length}</b><small>{t("hizmet")}</small></span>
                      <span className={styles.metric}><CalendarClock size={14} aria-hidden="true" /><b>{stat.upcoming}</b><small>{t("yaklaşan")}</small></span>
                      <span className={styles.metric}><Star size={14} aria-hidden="true" /><b>{stat.rating ? stat.rating.toFixed(1) : "—"}</b><small>{stat.reviews ? t("{count} yorum", { count: stat.reviews }) : t("Puan").toLocaleLowerCase(intlLocale)}</small></span>
                      <span className={cx(styles.metric, styles.desktopOnly)}>{member.linkedUid ? <Badge size="sm" tone="green" icon={ShieldCheck}>{t("Bağlı")}</Badge> : <Badge size="sm" tone="amber" icon={MailCheck}>{t("Bekliyor")}</Badge>}</span>
                      <ChevronRight className={styles.chevron} size={18} aria-hidden="true" />
                    </button>
                  </article>
                );
              })}
            </section>
          )}
        </>
      )}

      {businessId && showCreate ? (
        <StaffCreateSheet
          open
          businessId={businessId}
          categories={categories}
          services={services}
          nextSortOrder={current.length}
          onClose={() => setShowCreate(false)}
          onCreated={refreshStaff}
          onOpenStaff={(staffId) => { setShowCreate(false); setEditing({ key: nextKey(), id: staffId }); }}
        />
      ) : null}

      {businessId && editing && editingMember ? (
        <StaffEditorSheet
          key={editing.key}
          open
          item={editingMember}
          allStaff={staff}
          services={services}
          categories={categories}
          appointments={appointments}
          reviews={reviews}
          referenceTime={loadedAt}
          businessId={businessId}
          onClose={() => setEditing(null)}
          onRefresh={refreshStaff}
        />
      ) : null}
    </DashPage>
  );
}
