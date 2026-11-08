"use client";

import { useEffect, useMemo, useState } from "react";
import { collection, collectionGroup, getCountFromServer, query, Timestamp, where, type Query } from "firebase/firestore";
import { getDb } from "@/lib/firebase/firestore";
import { SUPPORT_NEEDS_ADMIN_STATUSES } from "@/features/platform/admin-ops";
import { ADMIN_NAV_GROUPS } from "./admin-nav";

// Süper admin menü rozetleri: her sayfanın bekleyen işi (sayım sorgusu — belge indirmez, 1000 belge = 1 okuma).
// Sayfa değişince, sekmeye dönülünce, dakikada bir ve PLATFORM_ALERTS_CHANGED_EVENT ile yenilenir.
// Sorgular Platform özetindeki sayaçlarla aynı ölçütleri kullanır; biri hata verirse (kural/dizin) yalnız o rozet gizlenir.

export type BadgeTone = "red" | "amber" | "blue" | "violet" | "green";
export type NavBadge = { count: number; tone: BadgeTone; label: string; live?: boolean };
export type NavBadges = Record<string, NavBadge>;

/** Uyarı okundu işaretlendiğinde menü rozetinin yenilenmesi için yayınlanan olay. */
export const PLATFORM_ALERTS_CHANGED_EVENT = "platform-alerts-changed";
const REFRESH_MS = 60_000;
const LIVE_WINDOW_MS = 5 * 60_000;

type Source = { href: string; tone: BadgeTone; label: (count: number) => string; live?: boolean; queries: () => Query[] };

const SOURCES: Source[] = [
  { href: "/super-admin/uyarilar", tone: "red", label: (n) => `${n} okunmamış uyarı`, queries: () => [query(collection(getDb(), "platformAlerts"), where("isRead", "==", false))] },
  { href: "/super-admin/destek", tone: "red", label: (n) => `${n} destek talebi yanıt bekliyor`, queries: () => [query(collection(getDb(), "supportTickets"), where("status", "in", SUPPORT_NEEDS_ADMIN_STATUSES))] },
  { href: "/super-admin/isletmeler", tone: "amber", label: (n) => `${n} işletme onay bekliyor`, queries: () => [query(collection(getDb(), "businesses"), where("status", "==", "pending_review"))] },
  { href: "/super-admin/yarim-kayitlar", tone: "amber", label: (n) => `${n} yarım kayıt açık`, queries: () => [query(collection(getDb(), "signupLeads"), where("status", "==", "open"))] },
  { href: "/super-admin/isletme-onerileri", tone: "blue", label: (n) => `${n} yeni işletme önerisi`, queries: () => [query(collection(getDb(), "businessSuggestions"), where("status", "==", "new"))] },
  {
    href: "/super-admin/moderasyon", tone: "violet", label: (n) => `${n} moderasyon bekliyor`,
    queries: () => [
      query(collectionGroup(getDb(), "reviews"), where("status", "==", "pending")),
      query(collectionGroup(getDb(), "reviews"), where("hideRequest.status", "==", "pending")),
      query(collection(getDb(), "categoryRequests"), where("status", "==", "pending")),
    ],
  },
  {
    href: "/super-admin/abonelikler", tone: "amber", label: (n) => `${n} ödeme kontrolü / gecikme`,
    queries: () => [
      query(collection(getDb(), "subscriptionPurchaseRequests"), where("status", "==", "pending_payment")),
      query(collection(getDb(), "subscriptions"), where("status", "==", "past_due")),
    ],
  },
  { href: "/super-admin/whatsapp-gelen", tone: "blue", label: (n) => `${n} okunmamış WhatsApp sohbeti`, queries: () => [query(collection(getDb(), "whatsappConversations"), where("unreadCount", ">", 0))] },
  {
    href: "/super-admin/analitik", tone: "green", live: true, label: (n) => `Şu an sitede ${n} kişi`,
    queries: () => [query(collection(getDb(), "analyticsVisitors"), where("lastSeenAt", ">=", Timestamp.fromMillis(Date.now() - LIVE_WINDOW_MS)))],
  },
];

async function countSource(source: Source): Promise<number | null> {
  const results = await Promise.allSettled(source.queries().map((item) => getCountFromServer(item)));
  const ok = results.filter((item) => item.status === "fulfilled");
  if (!ok.length) return null;
  return ok.reduce((sum, item) => sum + item.value.data().count, 0);
}

export function useAdminNavBadges(pathname: string): NavBadges {
  const [badges, setBadges] = useState<NavBadges>({});
  useEffect(() => {
    let cancelled = false;
    const refresh = () => {
      if (document.visibilityState === "hidden") return;
      void Promise.all(SOURCES.map(async (source) => [source, await countSource(source).catch(() => null)] as const)).then((rows) => {
        if (cancelled) return;
        const next: NavBadges = {};
        for (const [source, count] of rows) {
          if (count && count > 0) next[source.href] = { count, tone: source.tone, label: source.label(count), live: source.live };
        }
        setBadges(next);
      });
    };
    refresh();
    const timer = window.setInterval(refresh, REFRESH_MS);
    const onVisible = () => { if (document.visibilityState === "visible") refresh(); };
    window.addEventListener(PLATFORM_ALERTS_CHANGED_EVENT, refresh);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
      window.removeEventListener(PLATFORM_ALERTS_CHANGED_EVENT, refresh);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [pathname]);
  return badges;
}

/** Yapılacak iş sayısı (canlı ziyaretçi hariç): sekme başlığı ve grup toplamları için. */
export function actionableCount(badges: NavBadges, hrefs?: readonly string[]) {
  return Object.entries(badges)
    .filter(([href, badge]) => !badge.live && (!hrefs || hrefs.includes(href)))
    .reduce((sum, [, badge]) => sum + badge.count, 0);
}

export function useGroupTotals(badges: NavBadges) {
  return useMemo(() => Object.fromEntries(ADMIN_NAV_GROUPS.map((group) => [group.label, actionableCount(badges, group.items.map((item) => item.href))])), [badges]);
}

export const badgeText = (count: number) => (count > 99 ? "99+" : String(count));

/** Sekme başlığına "(5) " öneki: başka sekmedeyken de bekleyen işi görürsün. Next başlığı değiştirince yeniden eklenir. */
export function useTitleCount(total: number, pathname: string) {
  useEffect(() => {
    const apply = () => {
      const base = document.title.replace(/^\(\d+\+?\) /, "");
      const next = total > 0 ? `(${badgeText(total)}) ${base}` : base;
      if (document.title !== next) document.title = next;
    };
    apply();
    const timer = window.setTimeout(apply, 400);
    const head = document.querySelector("title");
    const observer = head ? new MutationObserver(apply) : null;
    if (head) observer!.observe(head, { childList: true });
    return () => {
      window.clearTimeout(timer);
      observer?.disconnect();
      document.title = document.title.replace(/^\(\d+\+?\) /, "");
    };
  }, [total, pathname]);
}
