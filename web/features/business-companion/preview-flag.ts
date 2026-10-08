"use client";

import { useSyncExternalStore } from "react";

const noopSubscribe = () => () => undefined;

/** ?companionPreview=1 — YALNIZCA geliştirmede; üretim derlemesinde her zaman false. */
function readPreviewFlag(): boolean {
  if (process.env.NODE_ENV === "production") return false;
  try {
    return new URLSearchParams(window.location.search).get("companionPreview") === "1";
  } catch {
    return false;
  }
}

/** `pathname` verilirse istemci tarafı gezinmede bayrak yeniden okunur. */
export function useCompanionPreviewFlag(pathname?: string | null): boolean {
  void pathname;
  return useSyncExternalStore(noopSubscribe, readPreviewFlag, () => false);
}
