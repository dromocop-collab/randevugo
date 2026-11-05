"use client";

import { useEffect, useMemo, useState } from "react";
import { subscribeLiveVisitors, type LiveVisitor } from "@/features/analytics/live-visitors-repository";
import { LIVE_WINDOW_MS, summarizeLive, visibleVisitors } from "@/features/analytics/live-visitors-logic";

/**
 * Canlı ziyaretçiler (süper admin): analytics fonksiyonundan bağımsız, doğrudan Firestore aboneliği.
 * Pencere dakikada bir kayar (sorgu sabit zamanla kurulduğu için yeniden abone olunur); `tickMs` görünür listeyi tazeler.
 */
export function useLiveVisitors(tickMs = 1000) {
  const [rows, setRows] = useState<LiveVisitor[] | null>(null);
  const [error, setError] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const [epoch, setEpoch] = useState(0);

  useEffect(() => {
    const stop = subscribeLiveVisitors(LIVE_WINDOW_MS, (value) => { setRows(value); setError(false); }, () => setError(true));
    const renew = window.setTimeout(() => setEpoch((value) => value + 1), 60_000);
    return () => { stop(); window.clearTimeout(renew); };
  }, [epoch]);
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), tickMs);
    return () => window.clearInterval(timer);
  }, [tickMs]);

  const visible = useMemo(() => visibleVisitors(rows ?? [], now), [rows, now]);
  const summary = useMemo(() => summarizeLive(rows ?? [], now), [rows, now]);
  return { rows, visible, summary, now, error, loading: rows === null && !error };
}
