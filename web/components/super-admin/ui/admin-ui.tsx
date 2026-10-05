"use client";

import Link from "next/link";
import {
  useEffect, useId, useRef,
  type ButtonHTMLAttributes, type CSSProperties, type KeyboardEvent, type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { AlertTriangle, ArrowDownRight, ArrowUpRight, Inbox, LoaderCircle, Search, X, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import styles from "./admin-ui.module.css";

export type AdminTone = "neutral" | "green" | "lime" | "amber" | "red" | "blue" | "violet";

/** Kök token sınıfı (AdminShell uygular). Shell dışındaki önizlemelerde de kullanılabilir. */
export const adminTokensClassName = styles.tokens;

export function toneClassName(tone: AdminTone = "neutral") {
  return styles[`tone-${tone}`];
}

/* ── Sayfa iskeleti ── */
export function AdminPage({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn(styles.page, className)}>{children}</div>;
}

export function PageHeader({
  eyebrow, title, description, icon: Icon, actions, meta, variant = "hero",
}: {
  eyebrow?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  icon?: LucideIcon;
  actions?: ReactNode;
  /** Başlık altında rozet satırı (ör. sayaçlar). */
  meta?: ReactNode;
  variant?: "hero" | "plain";
}) {
  return (
    <header className={cn(styles.header, variant === "plain" && styles.headerPlain)}>
      <div className={styles.headerMain}>
        {Icon && <span className={styles.headerIcon}><Icon size={22} strokeWidth={1.9} aria-hidden /></span>}
        <div className="min-w-0">
          {eyebrow && <span className={styles.eyebrow}>{eyebrow}</span>}
          <h1 className={styles.title}>{title}</h1>
          {description && <p className={styles.description}>{description}</p>}
        </div>
      </div>
      {actions && <div className={styles.headerActions}>{actions}</div>}
      {meta && <div className={styles.headerMeta}>{meta}</div>}
    </header>
  );
}

export function Panel({
  title, description, actions, children, flush = false, className, id,
}: {
  title?: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  /** true: gövde kenar boşluksuz (tablo/liste için). */
  flush?: boolean;
  className?: string;
  id?: string;
}) {
  return (
    <section id={id} className={cn(styles.panel, className)}>
      {(title || actions) && (
        <div className={styles.panelHead}>
          <div className="min-w-0">
            {title && <h2 className={styles.panelTitle}>{title}</h2>}
            {description && <p className={styles.panelDesc}>{description}</p>}
          </div>
          {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
        </div>
      )}
      <div className={flush ? styles.panelFlush : styles.panelBody}>{children}</div>
    </section>
  );
}

/* ── İstatistik ── */
export function StatGrid({ children, columns = 4, className }: { children: ReactNode; columns?: 2 | 3 | 4 | 5 | 6; className?: string }) {
  return <div className={cn(styles.statGrid, className)} style={{ "--cols": columns } as CSSProperties}>{children}</div>;
}

export type StatTrend = {
  /** Yüzde değişim (ör. 12.5 → +%12,5). */
  value: number;
  label?: string;
  /** true: artış kötüdür (ör. iptal oranı). */
  inverse?: boolean;
};

export function StatCard({
  label, value, hint, icon: Icon, tone = "green", trend, href, loading = false,
}: {
  label: ReactNode;
  value: ReactNode;
  hint?: ReactNode;
  icon?: LucideIcon;
  tone?: AdminTone;
  trend?: StatTrend | null;
  href?: string;
  loading?: boolean;
}) {
  const content = (
    <>
      <div className={styles.statTop}>
        <span className={styles.statLabel}>{label}</span>
        {Icon && <span className={cn(styles.statIcon, toneClassName(tone))}><Icon size={16} strokeWidth={2} aria-hidden /></span>}
      </div>
      {loading ? <Skeleton height={26} width="60%" /> : <b className={styles.statValue}>{value}</b>}
      {(hint || trend) && (
        <div className={styles.statFoot}>
          {trend && Number.isFinite(trend.value) && <TrendPill {...trend} />}
          {hint && <span>{hint}</span>}
        </div>
      )}
    </>
  );
  return href
    ? <Link href={href} className={styles.stat}>{content}</Link>
    : <article className={styles.stat}>{content}</article>;
}

export function TrendPill({ value, label, inverse = false }: StatTrend) {
  const up = value >= 0;
  const good = inverse ? !up : up;
  const Icon = up ? ArrowUpRight : ArrowDownRight;
  const text = `${up ? "+" : "−"}%${Math.abs(value).toLocaleString("tr-TR", { maximumFractionDigits: 1 })}`;
  return (
    <span className={cn(styles.trend, toneClassName(value === 0 ? "neutral" : good ? "green" : "red"))} title={label}>
      <Icon size={12} strokeWidth={2.4} aria-hidden />{text}{label ? <span className="sr-only"> {label}</span> : null}
    </span>
  );
}

/* ── Rozet ── */
export function Badge({
  tone = "neutral", icon: Icon, dot = false, size = "md", children, className, title,
}: {
  tone?: AdminTone;
  icon?: LucideIcon;
  dot?: boolean;
  size?: "sm" | "md";
  children: ReactNode;
  className?: string;
  title?: string;
}) {
  return (
    <span title={title} className={cn(styles.badge, size === "sm" && styles.badgeSm, toneClassName(tone), className)}>
      {dot && <i className={styles.badgeDot} aria-hidden />}
      {Icon && <Icon size={size === "sm" ? 11 : 12} strokeWidth={2.2} aria-hidden />}
      <span className="truncate">{children}</span>
    </span>
  );
}

/* ── Buton ── */
export type AdminButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "lime" | "glass";

type AdminButtonProps = {
  variant?: AdminButtonVariant;
  size?: "sm" | "md";
  icon?: LucideIcon;
  loading?: boolean;
  /** Verilirse Link olarak çizilir. */
  href?: string;
  external?: boolean;
  /** Yalnızca ikon (children erişilebilirlik etiketi olarak "aria-label" ile verilmeli). */
  iconOnly?: boolean;
} & ButtonHTMLAttributes<HTMLButtonElement>;

export function AdminButton({
  variant = "secondary", size = "md", icon: Icon, loading = false, href, external = false, iconOnly = false,
  className, children, disabled, type = "button", ...props
}: AdminButtonProps) {
  const classes = cn(styles.btn, styles[`btn-${variant}`], size === "sm" && styles.btnSm, iconOnly && styles.btnIconOnly, className);
  const iconSize = size === "sm" ? 14 : 16;
  const inner = <>
    {loading ? <LoaderCircle size={iconSize} className={styles.spin} aria-hidden /> : Icon ? <Icon size={iconSize} strokeWidth={2.1} aria-hidden /> : null}
    {children}
  </>;
  if (href) {
    return <Link href={href} className={classes} aria-label={props["aria-label"]} {...(external ? { target: "_blank", rel: "noreferrer" } : {})}>{inner}</Link>;
  }
  return <button type={type} className={classes} disabled={disabled || loading} aria-busy={loading || undefined} {...props}>{inner}</button>;
}

/* ── Araç çubuğu ve alanlar ── */
export function Toolbar({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn(styles.toolbar, className)}>{children}</div>;
}

export function SearchField({
  value, onChange, placeholder = "Ara…", ariaLabel, autoFocus, className, inputRef,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  ariaLabel?: string;
  autoFocus?: boolean;
  className?: string;
  inputRef?: React.Ref<HTMLInputElement>;
}) {
  return (
    <label className={cn(styles.search, className)}>
      <Search size={16} aria-hidden />
      <input
        ref={inputRef}
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        aria-label={ariaLabel ?? placeholder}
        autoFocus={autoFocus}
        enterKeyHint="search"
      />
      {value && <button type="button" className={styles.searchClear} onClick={() => onChange("")} aria-label="Aramayı temizle"><X size={13} /></button>}
    </label>
  );
}

export function SelectField<T extends string>({
  value, onChange, options, ariaLabel, label, className, disabled,
}: {
  value: T;
  onChange: (value: T) => void;
  options: ReadonlyArray<{ value: T; label: string }>;
  ariaLabel?: string;
  label?: string;
  className?: string;
  disabled?: boolean;
}) {
  const select = (
    <select className={cn(styles.select, !label && className)} value={value} disabled={disabled} aria-label={label ? undefined : ariaLabel} onChange={(event) => onChange(event.target.value as T)}>
      {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
    </select>
  );
  return label ? <label className={cn(styles.fieldLabel, className)}>{label}{select}</label> : select;
}

export function SegmentedControl<T extends string>({
  value, onChange, options, ariaLabel, className,
}: {
  value: T;
  onChange: (value: T) => void;
  options: ReadonlyArray<{ value: T; label: string; count?: number; icon?: LucideIcon }>;
  ariaLabel: string;
  className?: string;
}) {
  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;
    event.preventDefault();
    const index = options.findIndex((option) => option.value === value);
    const next = options[(index + (event.key === "ArrowRight" ? 1 : -1) + options.length) % options.length];
    onChange(next.value);
  }
  return (
    <div role="radiogroup" aria-label={ariaLabel} className={cn(styles.segment, className)} onKeyDown={onKeyDown}>
      {options.map(({ value: optionValue, label, count, icon: Icon }) => {
        const active = optionValue === value;
        return (
          <button
            key={optionValue}
            type="button"
            role="radio"
            aria-checked={active}
            tabIndex={active ? 0 : -1}
            className={cn(styles.segmentItem, active && styles.segmentActive)}
            onClick={() => onChange(optionValue)}
          >
            {Icon && <Icon size={14} aria-hidden />}
            {label}
            {typeof count === "number" && <span className={styles.segmentCount}>{count > 999 ? "999+" : count}</span>}
          </button>
        );
      })}
    </div>
  );
}

/* ── Durumlar ── */
export function EmptyState({
  icon: Icon = Inbox, title, description, action, compact = false,
}: {
  icon?: LucideIcon;
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  compact?: boolean;
}) {
  return (
    <div className={cn(styles.empty, compact && styles.emptyCompact)}>
      <span className={styles.emptyIcon}><Icon size={22} aria-hidden /></span>
      <p className={styles.emptyTitle}>{title}</p>
      {description && <p className={styles.emptyDesc}>{description}</p>}
      {action && <div className={styles.emptyAction}>{action}</div>}
    </div>
  );
}

export function Skeleton({ width = "100%", height = 16, radius, className }: { width?: number | string; height?: number | string; radius?: number; className?: string }) {
  return <span aria-hidden className={cn(styles.skeleton, className)} style={{ width, height, borderRadius: radius }} />;
}

export function SkeletonList({ rows = 4, height = 64, label = "Yükleniyor" }: { rows?: number; height?: number; label?: string }) {
  return (
    <div className={styles.skeletonStack} role="status" aria-label={label}>
      {Array.from({ length: rows }).map((_, index) => <Skeleton key={index} height={height} radius={16} />)}
    </div>
  );
}

export function Callout({
  tone = "amber", icon: Icon = AlertTriangle, title, children, action,
}: {
  tone?: AdminTone;
  icon?: LucideIcon;
  title: ReactNode;
  children?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div role="status" className={cn(styles.callout, toneClassName(tone))}>
      <span className={styles.calloutIcon}><Icon size={17} aria-hidden /></span>
      <div className={styles.calloutText}><b>{title}</b>{children}</div>
      {action}
    </div>
  );
}

export function KeyValueList({ items }: { items: Array<{ label: ReactNode; value: ReactNode; wide?: boolean }> }) {
  return (
    <dl className={styles.kv}>
      {items.map((item, index) => (
        <div key={index} className={cn(styles.kvItem, item.wide && styles.kvWide)}>
          <dt className={styles.kvLabel}>{item.label}</dt>
          <dd className={styles.kvValue}>{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}

/* ── Veri tablosu: ≥900px tablo, altında kart ── */
export type DataColumn<T> = {
  key: string;
  header: ReactNode;
  cell: (row: T) => ReactNode;
  align?: "left" | "right" | "center";
  width?: number | string;
  /** Mobil kartta başlık olarak kullanılır (ilk primary sütun). */
  primary?: boolean;
  /** Mobil kartta gösterme. */
  hideOnMobile?: boolean;
  /** Mobil karttaki etiket (varsayılan: header). */
  mobileLabel?: ReactNode;
};

export function DataTable<T>({
  rows, columns, rowKey, onRowClick, renderMobileCard, loading = false, empty, ariaLabel, rowLabel,
}: {
  rows: T[];
  columns: DataColumn<T>[];
  rowKey: (row: T) => string;
  onRowClick?: (row: T) => void;
  /** Mobil kart yerine özel çizim. */
  renderMobileCard?: (row: T) => ReactNode;
  loading?: boolean;
  empty?: ReactNode;
  ariaLabel: string;
  /** Erişilebilir satır adı (tıklanabilir satırlar için). */
  rowLabel?: (row: T) => string;
}) {
  if (loading) return <div className="px-3 pb-3"><SkeletonList rows={5} height={58} /></div>;
  if (rows.length === 0) return <>{empty ?? <EmptyState title="Kayıt yok" compact />}</>;
  const primary = columns.find((column) => column.primary) ?? columns[0];
  const align = (value?: string) => value === "right" ? styles.alignRight : value === "center" ? styles.alignCenter : undefined;
  return (
    <>
      <div className={styles.tableWrap}>
        <table className={styles.table} aria-label={ariaLabel}>
          <thead>
            <tr>{columns.map((column) => <th key={column.key} scope="col" className={align(column.align)} style={column.width ? { width: column.width } : undefined}>{column.header}</th>)}</tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={rowKey(row)}
                className={onRowClick ? styles.rowClickable : undefined}
                tabIndex={onRowClick ? 0 : undefined}
                aria-label={onRowClick && rowLabel ? rowLabel(row) : undefined}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                onKeyDown={onRowClick ? (event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); onRowClick(row); } } : undefined}
              >
                {columns.map((column) => <td key={column.key} className={align(column.align)}>{column.cell(row)}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className={styles.cards} aria-label={ariaLabel} role="list">
        {rows.map((row) => {
          const body = renderMobileCard ? renderMobileCard(row) : (
            <>
              <div className={styles.cardTitle}>{primary.cell(row)}</div>
              <div className={styles.cardRows}>
                {columns.filter((column) => column !== primary && !column.hideOnMobile).map((column) => (
                  <div key={column.key} className={styles.cardRow}>
                    <span className={styles.cardRowLabel}>{column.mobileLabel ?? column.header}</span>
                    <span className={styles.cardRowValue}>{column.cell(row)}</span>
                  </div>
                ))}
              </div>
            </>
          );
          return (
            <div role="listitem" key={rowKey(row)}>
              {onRowClick
                ? <button type="button" className={styles.card} onClick={() => onRowClick(row)} aria-label={rowLabel?.(row)}>{body}</button>
                : <div className={styles.card}>{body}</div>}
            </div>
          );
        })}
      </div>
    </>
  );
}

/* ── Sheet ── */
// Üst üste açılan sheet'lerde Escape/Tab yalnızca en üsttekini etkiler.
const sheetStack: object[] = [];

function useSheetBehavior(open: boolean, onClose: () => void, panelRef: React.RefObject<HTMLDivElement | null>) {
  const closeRef = useRef(onClose);
  useEffect(() => { closeRef.current = onClose; }, [onClose]);
  useEffect(() => {
    if (!open) return;
    const token = {};
    sheetStack.push(token);
    const previousFocus = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const frame = requestAnimationFrame(() => {
      const target = panelRef.current?.querySelector<HTMLElement>("[data-autofocus], input:not([type=hidden]):not(:disabled), textarea, select") ?? panelRef.current;
      target?.focus({ preventScroll: true });
    });
    function onKey(event: globalThis.KeyboardEvent) {
      if (sheetStack[sheetStack.length - 1] !== token) return;
      if (event.key === "Escape") { event.stopPropagation(); closeRef.current(); return; }
      if (event.key !== "Tab" || !panelRef.current) return;
      const focusables = Array.from(panelRef.current.querySelectorAll<HTMLElement>("a[href], button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex='-1'])"));
      if (focusables.length === 0) return;
      const first = focusables[0], last = focusables[focusables.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    }
    document.addEventListener("keydown", onKey);
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener("keydown", onKey);
      sheetStack.splice(sheetStack.indexOf(token), 1);
      document.body.style.overflow = previousOverflow;
      previousFocus?.focus?.({ preventScroll: true });
    };
  }, [open, panelRef]);
}

export function Sheet({
  open, onClose, title, description, children, footer, size = "md", dismissible = true,
}: {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  size?: "md" | "lg";
  /** false: arka plana tıklayınca/Escape ile kapanmaz (ör. işlem sürerken). */
  dismissible?: boolean;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const close = () => { if (dismissible) onClose(); };
  useSheetBehavior(open, close, panelRef);
  if (!open || typeof document === "undefined") return null;
  // Portal: admin kabuğunun token'larını korumak için body yerine kabuk köküne eklenir.
  const host = document.querySelector<HTMLElement>("[data-admin-root]") ?? document.body;
  return createPortal(
    <div className={styles.overlay} role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) close(); }}>
      <div ref={panelRef} role="dialog" aria-modal="true" aria-labelledby={titleId} tabIndex={-1} className={cn(styles.sheet, size === "lg" && styles.sheetLg)}>
        <span className={styles.sheetGrip} aria-hidden />
        <div className={styles.sheetHead}>
          <div className="min-w-0">
            <h2 id={titleId} className={styles.sheetTitle}>{title}</h2>
            {description && <p className={styles.sheetDesc}>{description}</p>}
          </div>
          <button type="button" className={styles.closeBtn} onClick={close} disabled={!dismissible} aria-label="Kapat"><X size={17} /></button>
        </div>
        <div className={styles.sheetBody}>{children}</div>
        {footer && <div className={styles.sheetFoot}>{footer}</div>}
      </div>
    </div>,
    host,
  );
}

export function ConfirmSheet({
  open, title, description, confirmLabel = "Onayla", cancelLabel = "Vazgeç", tone = "danger", busy = false,
  icon: Icon = AlertTriangle, onConfirm, onClose, children,
}: {
  open: boolean;
  title: ReactNode;
  description?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: "danger" | "primary";
  busy?: boolean;
  icon?: LucideIcon;
  onConfirm: () => void;
  onClose: () => void;
  children?: ReactNode;
}) {
  return (
    <Sheet
      open={open}
      onClose={onClose}
      dismissible={!busy}
      title={title}
      footer={<>
        <AdminButton variant="secondary" onClick={onClose} disabled={busy}>{cancelLabel}</AdminButton>
        <AdminButton variant={tone === "danger" ? "danger" : "primary"} onClick={onConfirm} loading={busy} data-autofocus>{confirmLabel}</AdminButton>
      </>}
    >
      <span className={cn(styles.confirmIcon, toneClassName(tone === "danger" ? "red" : "green"))}><Icon size={22} aria-hidden /></span>
      {description && <p className="text-sm leading-6 text-[var(--sa-muted)]">{description}</p>}
      {children}
    </Sheet>
  );
}
