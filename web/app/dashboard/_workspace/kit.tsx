"use client";

/*
 * Hizmetler / Çalışanlar / Çalışma saatleri / Müşteriler / Şubeler sayfalarına özgü küçük yardımcılar.
 * Görsel bileşenler ortak panel kitinden (components/dashboard/ui) gelir; burada yalnızca kitte olmayanlar var.
 */
import { useCallback, useEffect, useState, type ReactNode } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { ConfirmSheet } from "@/components/dashboard/ui";
import s from "./workspace.module.css";

export { s as ws };

export function cx(...names: Array<string | false | null | undefined>) {
  return names.filter(Boolean).join(" ");
}

/* ── Söz veren onay penceresi: const ok = await confirm({...}) ── */
type ConfirmOptions = { title: string; description: ReactNode; confirmLabel?: string; tone?: "danger" | "primary"; children?: ReactNode };
type ConfirmState = ConfirmOptions & { resolve: (ok: boolean) => void };

export function useConfirm() {
  const [state, setState] = useState<ConfirmState | null>(null);
  const confirm = useCallback((options: ConfirmOptions) => new Promise<boolean>((resolve) => setState({ ...options, resolve })), []);
  const finish = (ok: boolean) => {
    state?.resolve(ok);
    setState(null);
  };
  const dialog = (
    <ConfirmSheet
      open={Boolean(state)}
      title={state?.title ?? ""}
      description={state?.description}
      confirmLabel={state?.confirmLabel}
      tone={state?.tone}
      onConfirm={() => finish(true)}
      onClose={() => finish(false)}
    >
      {state?.children}
    </ConfirmSheet>
  );
  return { confirm, dialog };
}

/* ── Medya sorgusu ── */
export function useMediaQuery(query: string) {
  const [matches, setMatches] = useState(false);
  useEffect(() => {
    const media = window.matchMedia(query);
    const sync = () => setMatches(media.matches);
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, [query]);
  return matches;
}

/* ── Kaydedilmemiş değişiklik uyarısı ── */
export function useUnsavedWarning(active: boolean) {
  useEffect(() => {
    if (!active) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [active]);
}

/* ── Sürüklemesiz sıralama düğmeleri ── */
export function OrderButtons({ label, canUp, canDown, onUp, onDown, disabled }: { label: string; canUp: boolean; canDown: boolean; onUp: () => void; onDown: () => void; disabled?: boolean }) {
  return (
    <span className={s.order}>
      <button type="button" className={s.orderBtn} onClick={onUp} disabled={disabled || !canUp} aria-label={`${label} yukarı taşı`}><ChevronUp size={14} /></button>
      <button type="button" className={s.orderBtn} onClick={onDown} disabled={disabled || !canDown} aria-label={`${label} aşağı taşı`}><ChevronDown size={14} /></button>
    </span>
  );
}

/* ── Avatar (fotoğraf varsa arka plan görseli, yoksa baş harfler) ── */
export function Avatar({ name, photoUrl, size = "md", muted }: { name: string; photoUrl?: string; size?: "md" | "lg"; muted?: boolean }) {
  return (
    <span
      className={cx(s.avatar, size === "lg" && s.avatarLg, muted && s.avatarMuted, photoUrl && s.avatarPhoto)}
      style={photoUrl ? { backgroundImage: `url("${photoUrl.replace(/"/g, "%22")}")` } : undefined}
      aria-hidden="true"
    >
      {photoUrl ? null : initials(name)}
    </span>
  );
}

export function initials(name: string) {
  return name.trim().split(/\s+/).slice(0, 2).map((part) => part.charAt(0).toLocaleUpperCase("tr-TR")).join("") || "?";
}

export function normalizeSearch(value: string) {
  return value.toLocaleLowerCase("tr-TR").trim();
}

export function matchesSearch(query: string, ...fields: Array<string | undefined | null>) {
  const needle = normalizeSearch(query);
  if (!needle) return true;
  return fields.some((field) => field && normalizeSearch(field).includes(needle));
}

/** Firestore tanımsız alanları reddeder; nesneden undefined değerleri ayıklar (sığ). */
export function withoutUndefined<T extends object>(value: T): T {
  return Object.fromEntries(Object.entries(value).filter(([, item]) => item !== undefined)) as T;
}
