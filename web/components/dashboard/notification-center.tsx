"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { Bell, CalendarDays, CheckCheck, CircleAlert, CreditCard, Info, LoaderCircle, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { deleteAllNotifications, deleteNotification, markAllNotificationsRead, markNotificationRead, subscribeNotifications } from "@/features/notifications/notification-repository";
import type { NotificationItem, NotificationType } from "@/types/notification";

const ICONS: Record<NotificationType, typeof Bell> = {
  new_appointment: CalendarDays,
  appointment_cancelled: X,
  appointment_rescheduled: CalendarDays,
  upcoming_appointment: CalendarDays,
  payment: CreditCard,
  system: Info,
};

export function NotificationCenter({ businessId }: { businessId: string | null }) {
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const [deleting, setDeleting] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);
  const unreadCount = useMemo(() => items.filter((item) => !item.isRead).length, [items]);

  useEffect(() => {
    if (!businessId) return;
    return subscribeNotifications(
      businessId,
      (next) => { setItems(next); setError(""); },
      () => setError("Bildirimler şu anda alınamıyor.")
    );
  }, [businessId]);

  useEffect(() => {
    function closeOnOutsideClick(event: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) setOpen(false);
    }
    function closeOnEscape(event: KeyboardEvent) { if (event.key === "Escape") setOpen(false); }
    document.addEventListener("mousedown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    return () => { document.removeEventListener("mousedown", closeOnOutsideClick); document.removeEventListener("keydown", closeOnEscape); };
  }, []);

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
    if (!businessId || items.length === 0 || deleting || !window.confirm("Tüm bildirimler kalıcı olarak silinsin mi?")) return;
    const previous = items;
    setDeleting("all");
    setItems([]);
    try { await deleteAllNotifications(businessId); toast.success("Bildirim merkezi temizlendi."); }
    catch { setItems(previous); toast.error("Bildirimler silinemedi."); }
    finally { setDeleting(""); }
  }

  return <div className="command-notification-root" ref={rootRef}>
    <button type="button" className="command-icon command-notification-button" aria-label={`Bildirimler${unreadCount ? `, ${unreadCount} okunmamış` : ""}`} aria-expanded={open} onClick={() => setOpen((value) => !value)}>
      <Bell size={17}/>{unreadCount > 0 && <b>{unreadCount > 9 ? "9+" : unreadCount}</b>}
    </button>
    {open && <section className="command-notification-panel" role="dialog" aria-label="Bildirim merkezi">
      <header><div><small>CANLI AKIŞ</small><h2>Bildirimler</h2></div><nav><button type="button" onClick={() => void markAll()} disabled={unreadCount === 0 || Boolean(deleting)}><CheckCheck size={15}/> Okundu</button><button type="button" className="notification-clear-button" onClick={() => void clearAll()} disabled={items.length === 0 || Boolean(deleting)}>{deleting === "all" ? <LoaderCircle className="animate-spin" size={14}/> : <Trash2 size={14}/>} Temizle</button></nav></header>
      <div className="command-notification-list">
        {error ? <div className="command-notification-empty"><CircleAlert size={22}/><p>{error}</p></div> : items.length === 0 ? <div className="command-notification-empty"><Bell size={22}/><p>Henüz yeni bildiriminiz yok.</p></div> : items.map((item) => {
          const Icon = ICONS[item.type] ?? Info;
          const appointmentId = item.relatedAppointmentId ?? item.appointmentId;
          const content = <><span className="command-notification-icon"><Icon size={16}/></span><span><b>{item.title}</b><p>{item.body}</p><time>{formatNotificationDate(item.createdAt)}</time></span>{!item.isRead && <i/>}</>;
          return <article key={item.id} className={`command-notification-item ${item.isRead ? "" : "unread"}`}>{appointmentId ? <Link href={`/dashboard/randevular?appointment=${encodeURIComponent(appointmentId)}`} className="command-notification-main" onClick={() => { void markOne(item); setOpen(false); }}>{content}</Link> : <button type="button" className="command-notification-main" onClick={() => void markOne(item)}>{content}</button>}<button type="button" className="command-notification-delete" onClick={() => void removeOne(item)} disabled={Boolean(deleting)} aria-label={`${item.title} bildirimini sil`}>{deleting === item.id ? <LoaderCircle className="animate-spin" size={14}/> : <Trash2 size={14}/>}</button></article>;
        })}
      </div>
      <footer><Link href="/dashboard/randevular" onClick={() => setOpen(false)}>Tüm randevuları aç</Link></footer>
    </section>}
  </div>;
}

function formatNotificationDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Az önce";
  return new Intl.DateTimeFormat("tr-TR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }).format(date);
}
