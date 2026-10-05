"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Bell, CalendarClock, CalendarDays, CalendarX2, CheckCheck, CircleAlert, CreditCard, Info, LoaderCircle, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { deleteAllNotifications, deleteNotification, markAllNotificationsRead, markNotificationRead, subscribeNotifications } from "@/features/notifications/notification-repository";
import type { NotificationItem, NotificationType } from "@/types/notification";
import { Button, ConfirmSheet, EmptyState, SegmentedControl, Sheet, toneClassName, type DashTone } from "@/components/dashboard/ui";
import { cn } from "@/lib/utils/cn";
import styles from "./notification-center.module.css";

const META: Record<NotificationType, { icon: typeof Bell; tone: DashTone }> = {
  new_appointment: { icon: CalendarDays, tone: "accent" },
  appointment_cancelled: { icon: CalendarX2, tone: "red" },
  appointment_rescheduled: { icon: CalendarClock, tone: "blue" },
  upcoming_appointment: { icon: CalendarClock, tone: "amber" },
  payment: { icon: CreditCard, tone: "green" },
  system: { icon: Info, tone: "neutral" },
};

type Filter = "all" | "unread";

export function NotificationCenter({ businessId, triggerClassName }: { businessId: string | null; triggerClassName?: string }) {
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const [deleting, setDeleting] = useState("");
  const [confirmClear, setConfirmClear] = useState(false);
  const [filter, setFilter] = useState<Filter>("all");
  const unreadCount = useMemo(() => items.filter((item) => !item.isRead).length, [items]);
  const visible = filter === "unread" ? items.filter((item) => !item.isRead) : items;

  useEffect(() => {
    if (!businessId) return;
    return subscribeNotifications(
      businessId,
      (next) => { setItems(next); setError(""); },
      () => setError("Bildirimler şu anda alınamıyor.")
    );
  }, [businessId]);

  async function markOne(item: NotificationItem) {
    if (!businessId || item.isRead) return;
    setItems((rows) => rows.map((row) => row.id === item.id ? { ...row, isRead: true } : row));
    try { await markNotificationRead(businessId, item.id); }
    catch { toast.error("Bildirim okundu olarak işaretlenemedi."); }
  }

  async function markAll() {
    if (!businessId || unreadCount === 0) return;
    const previous = items;
    setItems((rows) => rows.map((row) => ({ ...row, isRead: true })));
    try { await markAllNotificationsRead(businessId); }
    catch { setItems(previous); toast.error("Bildirimler güncellenemedi."); }
  }

  async function removeOne(item: NotificationItem) {
    if (!businessId || deleting) return;
    const previous = items;
    setDeleting(item.id);
    setItems((rows) => rows.filter((row) => row.id !== item.id));
    try { await deleteNotification(businessId, item.id); toast.success("Bildirim silindi."); }
    catch { setItems(previous); toast.error("Bildirim silinemedi."); }
    finally { setDeleting(""); }
  }

  async function clearAll() {
    if (!businessId || items.length === 0 || deleting) return;
    const previous = items;
    setDeleting("all");
    setItems([]);
    try { await deleteAllNotifications(businessId); toast.success("Bildirim merkezi temizlendi."); setConfirmClear(false); }
    catch { setItems(previous); toast.error("Bildirimler silinemedi."); }
    finally { setDeleting(""); }
  }

  return <>
    <button type="button" className={cn(styles.trigger, triggerClassName)} aria-label={`Bildirimler${unreadCount ? `, ${unreadCount} okunmamış` : ""}`} aria-haspopup="dialog" aria-expanded={open} onClick={() => setOpen(true)}>
      <Bell size={18} aria-hidden />
      {unreadCount > 0 && <b className={styles.count} aria-hidden>{unreadCount > 9 ? "9+" : unreadCount}</b>}
    </button>
    <Sheet
      open={open}
      onClose={() => setOpen(false)}
      placement="side"
      title="Bildirimler"
      description={unreadCount ? `${unreadCount} okunmamış bildirim` : "Hepsini okudunuz"}
      headerExtra={<div className={styles.tools}>
        <SegmentedControl ariaLabel="Bildirim filtresi" value={filter} onChange={setFilter} options={[{ value: "all", label: "Tümü", count: items.length }, { value: "unread", label: "Okunmamış", count: unreadCount }]} />
        <div className={styles.toolActions}>
          <Button size="sm" variant="ghost" icon={CheckCheck} onClick={() => void markAll()} disabled={unreadCount === 0 || Boolean(deleting)}>Okundu</Button>
          <Button size="sm" variant="ghost" icon={Trash2} onClick={() => setConfirmClear(true)} disabled={items.length === 0 || Boolean(deleting)} aria-label="Tüm bildirimleri temizle" iconOnly />
        </div>
      </div>}
      footer={<Button href="/dashboard/randevular" variant="secondary" block onClick={() => setOpen(false)}>Tüm randevuları aç</Button>}
    >
      {error ? (
        <EmptyState icon={CircleAlert} title="Bildirimler alınamadı" description={error} compact />
      ) : visible.length === 0 ? (
        <EmptyState mascot="happy" compact title={filter === "unread" ? "Okunmamış bildirim yok" : "Henüz bildirim yok"} description="Yeni randevu, iptal ve değişiklikler burada anında görünür." />
      ) : (
        <ul className={styles.list}>
          {visible.map((item) => {
            const meta = META[item.type] ?? META.system;
            const Icon = meta.icon;
            const appointmentId = item.relatedAppointmentId ?? item.appointmentId;
            const content = <>
              <span className={cn(styles.icon, toneClassName(meta.tone))}><Icon size={16} aria-hidden /></span>
              <span className={styles.text}>
                <b>{item.title}</b>
                <span>{item.body}</span>
                <time dateTime={item.createdAt}>{formatNotificationDate(item.createdAt)}</time>
              </span>
              {!item.isRead && <i className={styles.dot} aria-label="Okunmadı" />}
            </>;
            return (
              <li key={item.id} className={cn(styles.item, !item.isRead && styles.unread)}>
                {appointmentId
                  ? <Link href={`/dashboard/randevular?appointment=${encodeURIComponent(appointmentId)}`} className={styles.main} onClick={() => { void markOne(item); setOpen(false); }}>{content}</Link>
                  : <button type="button" className={styles.main} onClick={() => void markOne(item)}>{content}</button>}
                <button type="button" className={styles.delete} onClick={() => void removeOne(item)} disabled={Boolean(deleting)} aria-label={`${item.title} bildirimini sil`}>
                  {deleting === item.id ? <LoaderCircle size={14} className="animate-spin" aria-hidden /> : <Trash2 size={14} aria-hidden />}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </Sheet>
    <ConfirmSheet
      open={confirmClear}
      onClose={() => setConfirmClear(false)}
      onConfirm={() => void clearAll()}
      busy={deleting === "all"}
      title="Tüm bildirimler silinsin mi?"
      description="Bildirim merkezindeki tüm kayıtlar kalıcı olarak silinir. Randevularınız etkilenmez."
      confirmLabel="Hepsini sil"
      icon={Trash2}
    />
  </>;
}

function formatNotificationDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Az önce";
  const diff = Date.now() - date.getTime();
  if (diff >= 0 && diff < 60_000) return "Az önce";
  if (diff >= 0 && diff < 3_600_000) return `${Math.floor(diff / 60_000)} dk önce`;
  if (diff >= 0 && diff < 86_400_000 && new Date().toDateString() === date.toDateString()) return `Bugün ${new Intl.DateTimeFormat("tr-TR", { hour: "2-digit", minute: "2-digit" }).format(date)}`;
  return new Intl.DateTimeFormat("tr-TR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }).format(date);
}
