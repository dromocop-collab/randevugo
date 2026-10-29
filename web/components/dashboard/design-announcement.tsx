"use client";

// Süper admin › Panel Tasarımı › Duyuru: tüm işletmelerin panelinin üstünde görünen şerit.
import { useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, ExternalLink, Info, Megaphone, X } from "lucide-react";
import Link from "@/i18n/link";
import { useSubscriptionPlan } from "@/features/subscriptions/subscription-plan-context";
import { useDashboardDesign } from "@/features/dashboard-design/dashboard-design-context";
import { activeAnnouncement, isExternalHref, type AnnouncementTone } from "@/features/dashboard-design/design-domain";
import { cn } from "@/lib/utils/cn";
import { useT } from "@/i18n/client";
import styles from "./design-announcement.module.css";

const DISMISS_KEY = "sr-dashboard-announcement-dismissed";
const ICONS: Record<AnnouncementTone, typeof Info> = { info: Megaphone, success: CheckCircle2, warning: AlertTriangle, danger: AlertTriangle };

export function DesignAnnouncement() {
  const t = useT();
  const { design } = useDashboardDesign();
  const { subscription } = useSubscriptionPlan();
  const [now, setNow] = useState(0);
  const [dismissed, setDismissed] = useState<string | null>(null);

  useEffect(() => {
    queueMicrotask(() => {
      setNow(Date.now());
      try { setDismissed(window.localStorage.getItem(DISMISS_KEY)); } catch { /* depolama kapalı olabilir */ }
    });
    // Başlangıç/bitiş saati geçince şerit kendiliğinden açılıp kapansın.
    const timer = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  const item = now ? activeAnnouncement(design, { now, subscriptionStatus: subscription?.status ?? null }) : null;
  if (!item || (item.dismissible && dismissed === item.id)) return null;
  const Icon = ICONS[item.tone];
  const external = isExternalHref(item.linkHref);

  function dismiss() {
    if (!item) return;
    setDismissed(item.id);
    try { window.localStorage.setItem(DISMISS_KEY, item.id); } catch { /* yok say */ }
  }

  return (
    <div className={cn(styles.bar, styles[item.tone])} role={item.tone === "danger" || item.tone === "warning" ? "alert" : "status"}>
      <span className={styles.icon} aria-hidden><Icon size={17} /></span>
      <div className={styles.text}>
        {item.title && <b>{item.title}</b>}
        {item.message && <p>{item.message}</p>}
      </div>
      {item.linkHref && (external
        ? <a className={styles.link} href={item.linkHref} target="_blank" rel="noopener noreferrer">{item.linkLabel || t("Aç")} <ExternalLink size={13} aria-hidden /></a>
        : <Link className={styles.link} href={item.linkHref}>{item.linkLabel || t("Aç")}</Link>)}
      {item.dismissible && (
        <button type="button" className={styles.close} onClick={dismiss} aria-label={t("Duyuruyu kapat")}><X size={16} aria-hidden /></button>
      )}
    </div>
  );
}
