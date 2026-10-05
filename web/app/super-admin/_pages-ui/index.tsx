"use client";

/* Süper admin ikincil sayfaları (kullanıcılar, destek, moderasyon, uyarılar, SMS, audit, analitik,
   bildirimler, asistan) için yerel tasarım primitifleri. Marka dili: ui.module.css. */

import {
  useCallback, useEffect, useId, useRef, useState, useSyncExternalStore,
  type CSSProperties, type ElementType, type KeyboardEvent as ReactKeyboardEvent, type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { Check, Copy, Inbox, LoaderCircle, Search, X } from "lucide-react";
import ui from "./ui.module.css";

export { ui };

export function cx(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}

export type Tone = "neutral" | "green" | "amber" | "red" | "blue" | "violet" | "lime" | "dark";

/* ───────────── Yerleşim ───────────── */

export function AdminPage({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cx(ui.page, className)}>{children}</div>;
}

export function PageHeader({ eyebrow, icon: Icon, title, description, actions, meta }: {
  eyebrow: string; icon?: ElementType; title: ReactNode; description?: ReactNode; actions?: ReactNode; meta?: ReactNode;
}) {
  return (
    <section className={ui.hero}>
      <div className={ui.heroGrid} aria-hidden />
      <div className={ui.heroInner}>
        <div style={{ minWidth: 0 }}>
          <span className={ui.eyebrow}>{Icon && <Icon size={13} aria-hidden />} {eyebrow}</span>
          <h1 className={ui.heroTitle}>{title}</h1>
          {description && <p className={ui.heroText}>{description}</p>}
          {meta && <div className={ui.heroMeta} style={{ marginTop: 12 }}>{meta}</div>}
        </div>
        {actions && <div className={ui.heroActions}>{actions}</div>}
      </div>
    </section>
  );
}

export function HeroStat({ label, value }: { label: string; value: ReactNode }) {
  return <span className={ui.heroStat}><b>{value}</b>{label}</span>;
}

export function Card({ title, description, icon: Icon, action, children, bodyClassName, flush, className, style }: {
  title?: ReactNode; description?: ReactNode; icon?: ElementType; action?: ReactNode; children?: ReactNode;
  bodyClassName?: string; flush?: boolean; className?: string; style?: CSSProperties;
}) {
  return (
    <section className={cx(ui.card, className)} style={style}>
      {(title || action) && (
        <header className={ui.cardHead} style={flush ? { paddingBottom: 14 } : undefined}>
          <div className={ui.cardTitle}>
            {Icon && <span className={ui.iconTile}><Icon size={18} aria-hidden /></span>}
            <div style={{ minWidth: 0 }}>{title && <h2>{title}</h2>}{description && <p>{description}</p>}</div>
          </div>
          {action}
        </header>
      )}
      {flush ? children : <div className={cx(ui.cardBody, bodyClassName)}>{children}</div>}
    </section>
  );
}

/* ───────────── Butonlar ───────────── */

type BtnVariant = "default" | "primary" | "lime" | "danger" | "ghost" | "onDark";
const BTN_CLASS: Record<BtnVariant, string | undefined> = {
  default: undefined, primary: ui.btnPrimary, lime: ui.btnLime, danger: ui.btnDanger, ghost: ui.btnGhost, onDark: ui.btnOnDark,
};

export function Btn({ variant = "default", size, loading, icon: Icon, children, block, className, type = "button", ...rest }: {
  variant?: BtnVariant; size?: "sm"; loading?: boolean; icon?: ElementType; block?: boolean; children?: ReactNode;
} & Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "children">) {
  return (
    <button type={type} className={cx(ui.btn, BTN_CLASS[variant], size === "sm" && ui.btnSm, block && ui.btnBlock, className)} {...rest} disabled={rest.disabled || loading}>
      {loading ? <LoaderCircle size={15} className={ui.spin} aria-hidden /> : Icon ? <Icon size={15} aria-hidden /> : null}
      {children}
    </button>
  );
}

export function IconBtn({ label, icon: Icon, spinning, className, ...rest }: { label: string; icon: ElementType; spinning?: boolean } & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button type="button" aria-label={label} title={label} className={cx(ui.iconBtn, className)} {...rest}><Icon size={17} className={spinning ? ui.spin : undefined} aria-hidden /></button>;
}

/* ───────────── İstatistik / pill ───────────── */

export function StatGrid({ children, cols = 4 }: { children: ReactNode; cols?: number }) {
  return <div className={ui.statGrid} style={{ "--cols": cols } as CSSProperties}>{children}</div>;
}

export function StatCard({ label, value, hint, icon: Icon, tone = "neutral", onClick, active }: {
  label: string; value: ReactNode; hint?: ReactNode; icon?: ElementType; tone?: Tone; onClick?: () => void; active?: boolean;
}) {
  const content = <>
    <span className={ui.statTop}>{label}{Icon && <span className={ui.statIcon}><Icon size={15} aria-hidden /></span>}</span>
    <b className={ui.statValue}>{value}</b>
    {hint && <span className={ui.statHint}>{hint}</span>}
  </>;
  const className = cx(ui.stat, ui[`tone-${tone}`], active && ui.statActive);
  return onClick
    ? <button type="button" className={className} onClick={onClick} aria-pressed={active}>{content}</button>
    : <div className={className}>{content}</div>;
}

export function Pill({ tone = "neutral", dot, children, title }: { tone?: Tone; dot?: boolean; children: ReactNode; title?: string }) {
  return <span className={cx(ui.pill, ui[`pill-${tone}`])} title={title}>{dot && <i className={ui.pillDot} />}{children}</span>;
}

export function Stars({ value, size = 14 }: { value: number; size?: number }) {
  const rating = Math.max(0, Math.min(5, Math.round(value)));
  return (
    <span role="img" aria-label={`5 üzerinden ${rating} yıldız`} style={{ display: "inline-flex", gap: 1 }}>
      {Array.from({ length: 5 }, (_, index) => (
        <svg key={index} width={size} height={size} viewBox="0 0 20 20" aria-hidden>
          <path d="M10 1.6l2.6 5.3 5.8.8-4.2 4.1 1 5.8L10 14.9l-5.2 2.7 1-5.8L1.6 7.7l5.8-.8z" fill={index < rating ? "#f5a524" : "currentColor"} opacity={index < rating ? 1 : 0.18} />
        </svg>
      ))}
    </span>
  );
}

/* ───────────── Araç çubuğu ───────────── */

export function Toolbar({ children, sticky = true }: { children: ReactNode; sticky?: boolean }) {
  return <div className={cx(ui.toolbar, !sticky && ui.toolbarStatic)}>{children}</div>;
}

export function ToolbarRow({ children }: { children: ReactNode }) {
  return <div className={ui.toolbarRow}>{children}</div>;
}

/** "/" kısayoluyla odaklanan arama alanı. */
export function SearchField({ value, onChange, placeholder, loading, shortcut = true, label = "Ara" }: {
  value: string; onChange: (value: string) => void; placeholder: string; loading?: boolean; shortcut?: boolean; label?: string;
}) {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (!shortcut) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "/" || event.metaKey || event.ctrlKey || event.altKey) return;
      if (isTypingTarget(event.target)) return;
      event.preventDefault();
      ref.current?.focus();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [shortcut]);
  return (
    <label className={ui.search}>
      <Search size={16} aria-hidden />
      <input ref={ref} type="search" value={value} aria-label={label} onChange={(event) => onChange(event.target.value)} placeholder={placeholder}
        onKeyDown={(event) => { if (event.key === "Escape") { onChange(""); event.currentTarget.blur(); } }} enterKeyHint="search" />
      {loading ? <LoaderCircle size={15} className={ui.spin} aria-hidden /> : value ? <button type="button" className={ui.clearBtn} onClick={() => onChange("")} aria-label="Aramayı temizle"><X size={14} /></button> : shortcut ? <kbd className={ui.kbd}>/</kbd> : null}
    </label>
  );
}

export type SegmentOption<T extends string> = { value: T; label: string; count?: number; alert?: boolean };

export function Segmented<T extends string>({ options, value, onChange, label }: {
  options: ReadonlyArray<SegmentOption<T>>; value: T; onChange: (value: T) => void; label: string;
}) {
  function onKeyDown(event: ReactKeyboardEvent<HTMLDivElement>) {
    if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;
    const index = options.findIndex((option) => option.value === value);
    const next = options[(index + (event.key === "ArrowRight" ? 1 : -1) + options.length) % options.length];
    if (next) { event.preventDefault(); onChange(next.value); }
  }
  return (
    <div className={ui.segmented} role="tablist" aria-label={label} onKeyDown={onKeyDown}>
      {options.map((option) => {
        const on = option.value === value;
        return (
          <button key={option.value} type="button" role="tab" aria-selected={on} tabIndex={on ? 0 : -1}
            className={cx(ui.segment, on && ui.segmentOn, option.alert && ui.segmentAlert)} onClick={() => onChange(option.value)}>
            {option.label}
            {option.count !== undefined && <span className={ui.segmentCount}>{option.count > 999 ? "999+" : option.count}</span>}
          </button>
        );
      })}
    </div>
  );
}

export function Chips<T extends string>({ options, value, onChange, label }: {
  options: ReadonlyArray<SegmentOption<T>>; value: T; onChange: (value: T) => void; label: string;
}) {
  return (
    <div className={ui.chips} role="group" aria-label={label}>
      {options.map((option) => (
        <button key={option.value} type="button" aria-pressed={option.value === value} className={cx(ui.chip, option.value === value && ui.chipOn)} onClick={() => onChange(option.value)}>
          {option.label}{option.count !== undefined && <b style={{ opacity: 0.7 }}>{option.count}</b>}
        </button>
      ))}
    </div>
  );
}

/* ───────────── Durumlar ───────────── */

export function EmptyState({ icon: Icon = Inbox, title, description, action }: { icon?: ElementType; title: string; description?: string; action?: ReactNode }) {
  return (
    <div className={ui.empty}>
      <span className={ui.emptyIcon}><Icon size={24} aria-hidden /></span>
      <h3>{title}</h3>
      {description && <p>{description}</p>}
      {action && <div>{action}</div>}
    </div>
  );
}

export function ErrorBox({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className={ui.errorBox} role="alert">
      <p>{message}</p>
      {onRetry && <Btn size="sm" onClick={onRetry}>Yeniden dene</Btn>}
    </div>
  );
}

export function SkeletonList({ rows = 4, height = 64 }: { rows?: number; height?: number }) {
  return (
    <div className={ui.skeletonList} aria-busy="true" aria-label="Yükleniyor">
      {Array.from({ length: rows }, (_, index) => <div key={index} className={ui.skeleton} style={{ "--h": `${height}px` } as CSSProperties} />)}
    </div>
  );
}

/* ───────────── Avatar / kopyala ───────────── */

const AVATAR_COLORS: Array<[string, string]> = [
  ["#dff5e7", "#14532d"], ["#ecffc2", "#3a5208"], ["#e1ecff", "#1d4ed8"], ["#fde8d7", "#9a3412"],
  ["#f1e6ff", "#6d28d9"], ["#ffe4ea", "#be123c"], ["#dcf5f6", "#0e7490"], ["#fff3c4", "#854d0e"],
];

export function initials(name: string) {
  const parts = name.replace(/[@._-]+/g, " ").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  return ((parts[0][0] ?? "") + (parts.length > 1 ? parts[parts.length - 1][0] ?? "" : parts[0][1] ?? "")).toLocaleUpperCase("tr-TR");
}

export function Avatar({ name, seed, size = 40 }: { name: string; seed?: string; size?: number }) {
  const key = seed || name;
  let hash = 0;
  for (let index = 0; index < key.length; index += 1) hash = (hash * 31 + key.charCodeAt(index)) | 0;
  const [bg, fg] = AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
  return <span className={ui.avatar} aria-hidden style={{ "--size": `${size}px`, "--av-bg": bg, "--av-fg": fg } as CSSProperties}>{initials(name)}</span>;
}

export function CopyButton({ value, label = "Kopyala", compact }: { value: string; label?: string; compact?: boolean }) {
  const [copied, setCopied] = useState(false);
  async function copy(event: React.MouseEvent) {
    event.stopPropagation();
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1400);
    } catch { /* pano izni yoksa sessizce geç */ }
  }
  return (
    <button type="button" className={cx(ui.copyBtn, copied && ui.copied)} onClick={copy} aria-label={`${label}: ${value}`} title={label}>
      {copied ? <Check size={13} aria-hidden /> : <Copy size={13} aria-hidden />}{!compact && (copied ? "Kopyalandı" : label)}
    </button>
  );
}

/* ───────────── Sheet (mobilde alt pencere, masaüstünde diyalog) ───────────── */

export function Sheet({ open, onClose, title, description, children, footer, width, busy }: {
  open: boolean; onClose: () => void; title: ReactNode; description?: ReactNode; children?: ReactNode; footer?: ReactNode; width?: number; busy?: boolean;
}) {
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const mounted = useIsClient();
  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    const previousFocus = document.activeElement as HTMLElement | null;
    document.body.style.overflow = "hidden";
    const frame = window.requestAnimationFrame(() => {
      const target = panelRef.current?.querySelector<HTMLElement>("[data-autofocus], textarea, input, button:not([data-close])");
      (target ?? panelRef.current)?.focus();
    });
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !busy) { event.stopPropagation(); onClose(); }
      if (event.key === "Tab" && panelRef.current) {
        const focusable = panelRef.current.querySelectorAll<HTMLElement>("a[href], button:not(:disabled), textarea, input, select, [tabindex]:not([tabindex='-1'])");
        if (!focusable.length) return;
        const first = focusable[0], last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
      previousFocus?.focus?.();
    };
  }, [open, busy, onClose]);
  if (!open || !mounted) return null;
  return createPortal(
    <div className={ui.backdrop} onMouseDown={(event) => { if (event.target === event.currentTarget && !busy) onClose(); }}>
      <div ref={panelRef} className={ui.sheet} role="dialog" aria-modal="true" aria-labelledby={titleId} tabIndex={-1} style={width ? { "--sheet-w": `${width}px` } as CSSProperties : undefined}>
        <div className={ui.sheetGrip} aria-hidden />
        <div className={ui.sheetHead}>
          <div style={{ minWidth: 0 }}><h2 id={titleId}>{title}</h2>{description && <p>{description}</p>}</div>
          <button type="button" data-close className={ui.iconBtn} onClick={onClose} disabled={busy} aria-label="Kapat"><X size={17} /></button>
        </div>
        {children && <div className={ui.sheetBody}>{children}</div>}
        {footer && <div className={ui.sheetFoot}>{footer}</div>}
      </div>
    </div>,
    document.body,
  );
}

export function ConfirmSheet({ open, onClose, onConfirm, title, description, confirmLabel, tone = "primary", children, icon }: {
  open: boolean; onClose: () => void; onConfirm: () => Promise<unknown> | void; title: string; description?: ReactNode;
  confirmLabel: string; tone?: "primary" | "danger"; children?: ReactNode; icon?: ElementType;
}) {
  const [busy, setBusy] = useState(false);
  async function confirm() {
    setBusy(true);
    try { await onConfirm(); onClose(); }
    catch { /* çağıran taraf hata mesajını gösterir; pencere açık kalır */ }
    finally { setBusy(false); }
  }
  return (
    <Sheet open={open} onClose={onClose} title={title} description={description} busy={busy} width={460}
      footer={<><Btn onClick={onClose} disabled={busy}>Vazgeç</Btn><Btn variant={tone === "danger" ? "danger" : "primary"} icon={icon} loading={busy} onClick={() => void confirm()} data-autofocus>{confirmLabel}</Btn></>}>
      {children}
    </Sheet>
  );
}

export function DetailList({ rows }: { rows: Array<{ label: string; value: ReactNode } | null | false | undefined> }) {
  return (
    <dl className={ui.dl}>
      {rows.filter(Boolean).map((row) => row && <div key={row.label} className={ui.dlRow}><dt>{row.label}</dt><dd>{row.value}</dd></div>)}
    </dl>
  );
}

/* ───────────── Duyarlı tablo → kart listesi ───────────── */

export type Column<T> = { key: string; header: string; cell: (row: T) => ReactNode; width?: number | string; align?: "right" };

export function ResponsiveTable<T>({ rows, columns, rowKey, onRowClick, renderCard, maxHeight, label }: {
  rows: T[]; columns: Column<T>[]; rowKey: (row: T) => string; onRowClick?: (row: T) => void; renderCard: (row: T) => ReactNode; maxHeight?: string; label: string;
}) {
  return (
    <>
      <div className={ui.tableWrap} style={maxHeight ? { "--table-max": maxHeight } as CSSProperties : undefined}>
        <table className={ui.table} aria-label={label}>
          <thead><tr>{columns.map((column) => <th key={column.key} style={{ width: column.width }} className={column.align === "right" ? ui.alignRight : undefined}>{column.header}</th>)}</tr></thead>
          <tbody>
            {rows.map((row) => (
              <tr key={rowKey(row)} className={onRowClick ? ui.rowClickable : undefined} tabIndex={onRowClick ? 0 : undefined}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                onKeyDown={onRowClick ? (event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); onRowClick(row); } } : undefined}>
                {columns.map((column) => <td key={column.key} className={column.align === "right" ? ui.alignRight : undefined}>{column.cell(row)}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className={ui.cardList}>
        {rows.map((row) => onRowClick
          ? <button key={rowKey(row)} type="button" className={ui.rowCard} onClick={() => onRowClick(row)}>{renderCard(row)}</button>
          : <div key={rowKey(row)} className={ui.rowCard}>{renderCard(row)}</div>)}
      </div>
    </>
  );
}

export function BarRow({ label, value, total, suffix }: { label: string; value: number; total: number; suffix?: string }) {
  const percent = total ? (value / total) * 100 : 0;
  return (
    <div className={ui.barRow}>
      <div className={ui.barHead}><span title={label}>{label}</span><b>{value.toLocaleString("tr-TR")}{suffix}<small>%{percent.toFixed(percent < 10 && percent > 0 ? 1 : 0)}</small></b></div>
      <div className={ui.barTrack}><i className={ui.barFill} style={{ width: `${value ? Math.max(3, percent) : 0}%` }} /></div>
    </div>
  );
}

/* ───────────── Zaman yardımcıları ───────────── */

const DAY_MS = 86_400_000;

function startOfDay(ms: number) { const date = new Date(ms); date.setHours(0, 0, 0, 0); return date.getTime(); }

export function dayLabel(ms: number, now: number) {
  const diff = Math.round((startOfDay(now) - startOfDay(ms)) / DAY_MS);
  if (diff === 0) return "Bugün";
  if (diff === 1) return "Dün";
  if (diff > 1 && diff < 7) return new Date(ms).toLocaleDateString("tr-TR", { weekday: "long" });
  return new Date(ms).toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: new Date(ms).getFullYear() === new Date(now).getFullYear() ? undefined : "numeric" });
}

export function groupByDay<T>(items: T[], getMs: (item: T) => number | null | undefined, now: number) {
  const groups: Array<{ key: string; label: string; items: T[] }> = [];
  for (const item of items) {
    const ms = getMs(item);
    const key = ms ? String(startOfDay(ms)) : "none";
    const label = ms ? dayLabel(ms, now) : "Tarihsiz";
    const last = groups.at(-1);
    if (last && last.key === key) last.items.push(item);
    else groups.push({ key, label, items: [item] });
  }
  return groups;
}

export function relativeTime(ms: number | null | undefined, now: number) {
  if (!ms) return "—";
  const diff = now - ms;
  if (diff < 60_000) return "az önce";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)} dk önce`;
  if (diff < DAY_MS) return `${Math.floor(diff / 3_600_000)} sa önce`;
  if (diff < 7 * DAY_MS) return `${Math.floor(diff / DAY_MS)} gün önce`;
  return new Date(ms).toLocaleDateString("tr-TR", { day: "numeric", month: "short" });
}

export function timeOf(ms: number | null | undefined) {
  return ms ? new Date(ms).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" }) : "—";
}

export function fullDate(ms: number | null | undefined) {
  return ms ? new Date(ms).toLocaleString("tr-TR", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—";
}

/** Saf render kuralına uygun "şimdi": dakikada bir güncellenir. */
export function useNow(intervalMs = 60_000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), intervalMs);
    return () => window.clearInterval(timer);
  }, [intervalMs]);
  return now;
}

export function useMediaQuery(queryText: string) {
  const subscribe = useCallback((notify: () => void) => {
    const media = window.matchMedia(queryText);
    media.addEventListener("change", notify);
    return () => media.removeEventListener("change", notify);
  }, [queryText]);
  return useSyncExternalStore(subscribe, () => window.matchMedia(queryText).matches, () => false);
}

const noopSubscribe = () => () => undefined;
export function useIsClient() {
  return useSyncExternalStore(noopSubscribe, () => true, () => false);
}

export function isTypingTarget(target: EventTarget | null) {
  const element = target as HTMLElement | null;
  if (!element) return false;
  return element.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(element.tagName);
}

/** Klavye kısayolu: yazı alanındayken tetiklenmez. */
export function useHotkeys(map: Record<string, (event: KeyboardEvent) => void>, enabled = true) {
  const ref = useRef(map);
  useEffect(() => { ref.current = map; });
  useEffect(() => {
    if (!enabled) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey || isTypingTarget(event.target)) return;
      if (document.querySelector("[role='dialog'][aria-modal='true']")) return;
      ref.current[event.key]?.(event);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [enabled]);
}

export function downloadCsv(filename: string, rows: string[][]) {
  const cell = (value: string) => `"${value.replaceAll('"', '""')}"`;
  const blob = new Blob(["﻿" + rows.map((row) => row.map(cell).join(";")).join("\n")], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url; anchor.download = filename; anchor.click();
  URL.revokeObjectURL(url);
}

