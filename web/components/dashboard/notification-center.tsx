"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { Bell, CalendarDays, CheckCheck, CircleAlert, CreditCard, Info, X } from "lucide-react";
import { toast } from "sonner";
import { markAllNotificationsRead, markNotificationRead, subscribeNotifications } from "@/features/notifications/notification-repository";
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

  return <div className="command-notification-root" ref={rootRef}>
    <button type="button" className="command-icon command-notification-button" aria-label={`Bildirimler${unreadCount ? `, ${unreadCount} okunmamış` : ""}`} aria-expanded={open} onClick={() => setOpen((value) => !value)}>
      <Bell size={17}/>{unreadCount > 0 && <b>{unreadCount > 9 ? "9+" : unreadCount}</b>}
    </button>
    {open && <section className="command-notification-panel" role="dialog" aria-label="Bildirim merkezi">
      <header><div><small>CANLI AKIŞ</small><h2>Bildirimler</h2></div><button type="button" onClick={() => void markAll()} disabled={unreadCount === 0}><CheckCheck size={15}/> Tümünü okundu yap</button></header>
      <div className="command-notification-list">
        {error ? <div className="command-notification-empty"><CircleAlert size={22}/><p>{error}</p></div> : items.length === 0 ? <div className="command-notification-empty"><Bell size={22}/><p>Henüz yeni bildiriminiz yok.</p></div> : items.map((item) => {
          const Icon = ICONS[item.type] ?? Info;
          const appointmentId = item.relatedAppointmentId ?? item.appointmentId;
          const content = <><span className="command-notification-icon"><Icon size={16}/></span><span><b>{item.title}</b><p>{item.body}</p><time>{formatNotificationDate(item.createdAt)}</time></span>{!item.isRead && <i/>}</>;
          return appointmentId ? <Link key={item.id} href={`/dashboard/randevular?appointment=${encodeURIComponent(appointmentId)}`} className={item.isRead ? "" : "unread"} onClick={() => { void markOne(item); setOpen(false); }}>{content}</Link> : <button type="button" key={item.id} className={item.isRead ? "" : "unread"} onClick={() => void markOne(item)}>{content}</button>;
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
