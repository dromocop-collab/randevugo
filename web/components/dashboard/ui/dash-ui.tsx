"use client";

import Link from "next/link";
import {
  useEffect, useId, useRef,
  type ButtonHTMLAttributes, type CSSProperties, type InputHTMLAttributes, type KeyboardEvent, type ReactNode,
  type SelectHTMLAttributes, type TextareaHTMLAttributes,
} from "react";
import { createPortal } from "react-dom";
import {
  AlertTriangle, ArrowDownRight, ArrowUpRight, CalendarCheck2, CheckCircle2, CircleDashed, Inbox, LoaderCircle,
  Search, UserX, X, XCircle, type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { RoviMascot, type RoviMood } from "@/components/brand/rovi-mascot";
import type { AppointmentStatus } from "@/types/appointments";
import styles from "./dash-ui.module.css";

export type DashTone = "neutral" | "accent" | "green" | "amber" | "red" | "blue" | "violet";

/** Kök token sınıfı (DashboardShell uygular). Kabuk dışındaki portal/önizlemelerde de kullanılabilir. */
export const dashTokensClassName = styles.tokens;

export function toneClassName(tone: DashTone = "neutral") {
  return styles[`tone-${tone}`];
}

/* ── Sayfa iskeleti ── */
export function DashPage({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn(styles.page, className)}>{children}</div>;
}

export function PageHeader({
  eyebrow, title, description, icon: Icon, actions, meta, variant = "hero", className,
}: {
  eyebrow?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  icon?: LucideIcon;
  actions?: ReactNode;
  /** Başlık altında rozet satırı (ör. sayaçlar). */
  meta?: ReactNode;
  /** hero: tema renginde koyu kart · plain: sade başlık. */
  variant?: "hero" | "plain";
  className?: string;
}) {
  return (
    <header className={cn(styles.header, variant === "plain" && styles.headerPlain, className)}>
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
  title, description, icon: Icon, actions, children, flush = false, className, bodyClassName, id, style,
}: {
  title?: ReactNode;
  description?: ReactNode;
  icon?: LucideIcon;
  actions?: ReactNode;
  children: ReactNode;
  /** true: gövde kenar boşluksuz (tablo/liste için). */
  flush?: boolean;
  className?: string;
  bodyClassName?: string;
  id?: string;
  style?: CSSProperties;
}) {
  return (
    <section id={id} className={cn(styles.panel, className)} style={style}>
      {(title || actions) && (
        <div className={styles.panelHead}>
          <div className={styles.panelTitleRow}>
            {Icon && <span className={styles.panelIcon}><Icon size={16} aria-hidden /></span>}
            <div className="min-w-0">
              {title && <h2 className={styles.panelTitle}>{title}</h2>}
              {description && <p className={styles.panelDesc}>{description}</p>}
            </div>
          </div>
          {actions && <div className={styles.panelActions}>{actions}</div>}
        </div>
      )}
      <div className={cn(flush ? styles.panelFlush : styles.panelBody, bodyClassName)}>{children}</div>
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
  /** Erişilebilir açıklama, ör. "dünden". */
  label?: string;
  /** true: artış kötüdür (ör. iptal oranı). */
  inverse?: boolean;
};

/** İki değerden yüzde değişim; önceki 0 ise null (trend gösterilmez). */
export function percentChange(current: number, previous: number): number | null {
  if (!Number.isFinite(current) || !Number.isFinite(previous) || previous === 0) return null;
  return Math.round(((current - previous) / Math.abs(previous)) * 1000) / 10;
}

export function StatCard({
  label, value, hint, icon: Icon, tone = "accent", trend, progress, href, onClick, loading = false, accent = false, className,
}: {
  label: ReactNode;
  value: ReactNode;
  hint?: ReactNode;
  icon?: LucideIcon;
  tone?: DashTone;
  trend?: StatTrend | null;
  /** 0–100 arası ilerleme çubuğu (ör. doluluk). */
  progress?: number | null;
  href?: string;
  onClick?: () => void;
  loading?: boolean;
  /** true: tema renginde vurgulu kart. */
  accent?: boolean;
  className?: string;
}) {
  const content = (
    <>
      <div className={styles.statTop}>
        <span className={styles.statLabel}>{label}</span>
        {Icon && <span className={cn(styles.statIcon, !accent && toneClassName(tone))}><Icon size={16} strokeWidth={2} aria-hidden /></span>}
      </div>
      {loading ? <Skeleton height={26} width="60%" /> : <b className={styles.statValue}>{value}</b>}
      {typeof progress === "number" && Number.isFinite(progress) && (
        <span className={styles.statProgress} role="presentation"><i style={{ width: `${Math.max(0, Math.min(100, progress))}%` }} /></span>
      )}
      {(hint || trend) && (
        <div className={styles.statFoot}>
          {trend && Number.isFinite(trend.value) && <TrendPill {...trend} />}
          {hint && <span className="min-w-0 truncate">{hint}</span>}
        </div>
      )}
    </>
  );
  const classes = cn(styles.stat, accent && styles.statAccent, className);
  if (href) return <Link href={href} className={classes}>{content}</Link>;
  if (onClick) return <button type="button" onClick={onClick} className={cn(classes, "text-left")}>{content}</button>;
  return <article className={classes}>{content}</article>;
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
  tone = "neutral", icon: Icon, dot = false, pulse = false, size = "md", children, className, title,
}: {
  tone?: DashTone;
  icon?: LucideIcon;
  dot?: boolean;
  /** Nokta hafifçe nabız atar (canlı durumlar). */
  pulse?: boolean;
  size?: "sm" | "md";
  children: ReactNode;
  className?: string;
  title?: string;
}) {
  return (
    <span title={title} className={cn(styles.badge, size === "sm" && styles.badgeSm, pulse && styles.badgePulse, toneClassName(tone), className)}>
      {(dot || pulse) && <i className={styles.badgeDot} aria-hidden />}
      {Icon && <Icon size={size === "sm" ? 11 : 12} strokeWidth={2.2} aria-hidden />}
      <span className="truncate">{children}</span>
    </span>
  );
}

/** Randevu durumları için tek kaynak: etiket, ton, ikon. */
export const appointmentStatusMeta: Record<AppointmentStatus, { label: string; tone: DashTone; icon: LucideIcon }> = {
  pending: { label: "Onay bekliyor", tone: "amber", icon: CircleDashed },
  confirmed: { label: "Onaylandı", tone: "accent", icon: CalendarCheck2 },
  completed: { label: "Tamamlandı", tone: "green", icon: CheckCircle2 },
  cancelled: { label: "İptal", tone: "red", icon: XCircle },
  no_show: { label: "Gelmedi", tone: "neutral", icon: UserX },
};

export function StatusPill({ status, size = "md", className }: { status: AppointmentStatus | string; size?: "sm" | "md"; className?: string }) {
  const meta = appointmentStatusMeta[status as AppointmentStatus] ?? { label: status, tone: "neutral" as DashTone, icon: CircleDashed };
  return <Badge tone={meta.tone} icon={status === "pending" ? undefined : meta.icon} size={size} pulse={status === "pending"} className={className}>{meta.label}</Badge>;
}

/* ── Buton ── */
export type ButtonVariant = "primary" | "secondary" | "soft" | "ghost" | "danger" | "dangerSoft" | "bright" | "glass";

export type DashButtonProps = {
  variant?: ButtonVariant;
  size?: "sm" | "md" | "lg";
  icon?: LucideIcon;
  /** Metnin sağındaki ikon. */
  trailingIcon?: LucideIcon;
  loading?: boolean;
  /** Verilirse Link olarak çizilir. */
  href?: string;
  external?: boolean;
  /** Yalnızca ikon — erişilebilir ad için aria-label verin. */
  iconOnly?: boolean;
  block?: boolean;
} & ButtonHTMLAttributes<HTMLButtonElement>;

export function Button({
  variant = "secondary", size = "md", icon: Icon, trailingIcon: Trailing, loading = false, href, external = false, iconOnly = false, block = false,
  className, children, disabled, type = "button", ...props
}: DashButtonProps) {
  const classes = cn(styles.btn, styles[`btn-${variant}`], size === "sm" && styles.btnSm, size === "lg" && styles.btnLg, iconOnly && styles.btnIconOnly, block && styles.btnBlock, className);
  const iconSize = size === "sm" ? 14 : size === "lg" ? 18 : 16;
  const inner = <>
    {loading ? <LoaderCircle size={iconSize} className={styles.spin} aria-hidden /> : Icon ? <Icon size={iconSize} strokeWidth={2.1} aria-hidden /> : null}
    {children}
    {Trailing && !loading ? <Trailing size={iconSize} strokeWidth={2.1} aria-hidden /> : null}
  </>;
  if (href) {
    return <Link href={href} className={classes} aria-label={props["aria-label"]} title={props.title} onClick={props.onClick as never} {...(external ? { target: "_blank", rel: "noreferrer" } : {})}>{inner}</Link>;
  }
  return <button type={type} className={classes} disabled={disabled || loading} aria-busy={loading || undefined} {...props}>{inner}</button>;
}

/* ── Araç çubuğu ve form alanları ── */
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

/** Etiket + ipucu + hata sarmalayıcısı. İçine Input/Select/Textarea ya da özel alan konur. */
export function Field({
  label, hint, error, children, wide = false, className, htmlFor,
}: {
  label?: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  children: ReactNode;
  /** FormGrid içinde tüm satırı kaplar. */
  wide?: boolean;
  className?: string;
  htmlFor?: string;
}) {
  return (
    <label htmlFor={htmlFor} className={cn(styles.field, wide && styles.fieldWide, className)}>
      {label && <span className={styles.fieldLabel}>{label}</span>}
      {children}
      {error ? <span className={styles.fieldError} role="alert">{error}</span> : hint ? <span className={styles.fieldHint}>{hint}</span> : null}
    </label>
  );
}

/** Mobilde tek, ≥640px'te `columns` sütunlu form ızgarası (Safari taşmasına karşı minmax(0,1fr)). */
export function FormGrid({ children, columns = 2, className }: { children: ReactNode; columns?: 2 | 3 | 4; className?: string }) {
  return <div className={cn(styles.formGrid, className)} style={{ "--cols": columns } as CSSProperties}>{children}</div>;
}

export const inputClassName = styles.input;
export const selectClassName = styles.select;
export const textareaClassName = styles.textarea;

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(styles.input, className)} {...props} />;
}

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn(styles.textarea, className)} {...props} />;
}

export function NativeSelect({ className, children, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={cn(styles.select, className)} {...props}>{children}</select>;
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
  return label ? <Field label={label} className={className}>{select}</Field> : select;
}

export function Switch({
  checked, onChange, label, description, disabled, ariaLabel, className,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: ReactNode;
  description?: ReactNode;
  disabled?: boolean;
  ariaLabel?: string;
  className?: string;
}) {
  const id = useId();
  const track = (
    <button
      id={id}
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label ? undefined : ariaLabel}
      aria-labelledby={label ? `${id}-label` : undefined}
      disabled={disabled}
      className={styles.switchTrack}
      onClick={() => onChange(!checked)}
    />
  );
  if (!label) return track;
  return (
    <div className={cn(styles.switch, className)} onClick={(event) => { if (!disabled && event.target === event.currentTarget) onChange(!checked); }}>
      <span className={styles.switchText} id={`${id}-label`}><b>{label}</b>{description && <small>{description}</small>}</span>
      {track}
    </div>
  );
}

export function SegmentedControl<T extends string>({
  value, onChange, options, ariaLabel, stretch = false, className,
}: {
  value: T;
  onChange: (value: T) => void;
  options: ReadonlyArray<{ value: T; label: string; count?: number; icon?: LucideIcon }>;
  ariaLabel: string;
  /** true: tüm genişliği kaplar, seçenekler eşit paylaşır. */
  stretch?: boolean;
  className?: string;
}) {
  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;
    event.preventDefault();
    const index = options.findIndex((option) => option.value === value);
    const next = options[(index + (event.key === "ArrowRight" ? 1 : -1) + options.length) % options.length];
    onChange(next.value);
    const buttons = event.currentTarget.querySelectorAll<HTMLButtonElement>("button");
    buttons[options.indexOf(next)]?.focus();
  }
  return (
    <div role="radiogroup" aria-label={ariaLabel} className={cn(styles.segment, stretch && styles.segmentStretch, className)} onKeyDown={onKeyDown}>
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
  icon: Icon = Inbox, mascot, title, description, action, compact = false, className,
}: {
  icon?: LucideIcon;
  /** Rovi maskotu gösterir (ikon yerine). true → "idle", ya da bir ruh hali. */
  mascot?: boolean | RoviMood;
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  compact?: boolean;
  className?: string;
}) {
  return (
    <div className={cn(styles.empty, compact && styles.emptyCompact, className)}>
      {mascot
        ? <RoviMascot size={compact ? 64 : 92} mood={typeof mascot === "string" ? mascot : "idle"} interactive={false} className={styles.emptyMascot} alt="" />
        : <span className={styles.emptyIcon}><Icon size={22} aria-hidden /></span>}
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
  tone = "amber", icon: Icon = AlertTriangle, title, children, action, className,
}: {
  tone?: DashTone;
  icon?: LucideIcon;
  title: ReactNode;
  children?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div role="status" className={cn(styles.callout, toneClassName(tone), className)}>
      <span className={styles.calloutIcon}><Icon size={17} aria-hidden /></span>
      <div className={styles.calloutText}><b>{title}</b>{children}</div>
      {action}
    </div>
  );
}

export function KeyValueList({ items, className }: { items: Array<{ label: ReactNode; value: ReactNode; wide?: boolean }>; className?: string }) {
  return (
    <dl className={cn(styles.kv, className)}>
      {items.map((item, index) => (
        <div key={index} className={cn(styles.kvItem, item.wide && styles.kvWide)}>
          <dt className={styles.kvLabel}>{item.label}</dt>
          <dd className={styles.kvValue}>{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}

/* ── Liste ── */
export function List({ children, className, ariaLabel }: { children: ReactNode; className?: string; ariaLabel?: string }) {
  return <div className={cn(styles.list, className)} role="list" aria-label={ariaLabel}>{children}</div>;
}

/** Panel içi satır: solda ikon/baş harf, ortada başlık+alt metin, sağda ek içerik. href → Link, onClick → button. */
export function ListRow({
  lead, title, subtitle, trailing, href, onClick, className,
}: {
  lead?: ReactNode;
  title: ReactNode;
  subtitle?: ReactNode;
  trailing?: ReactNode;
  href?: string;
  onClick?: () => void;
  className?: string;
}) {
  const body = <>
    {lead !== undefined && <span className={styles.listLead}>{lead}</span>}
    <span className={styles.listMain}><span className={styles.listTitle}>{title}</span>{subtitle && <span className={styles.listSub}>{subtitle}</span>}</span>
    {trailing && <span className={styles.listTrail}>{trailing}</span>}
  </>;
  if (href) return <Link role="listitem" href={href} className={cn(styles.listRow, className)}>{body}</Link>;
  if (onClick) return <button role="listitem" type="button" onClick={onClick} className={cn(styles.listRow, className)}>{body}</button>;
  return <div role="listitem" className={cn(styles.listRow, className)}>{body}</div>;
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
  if (rows.length === 0) return <>{empty ?? <EmptyState title="Kayıt yok" compact mascot />}</>;
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
                onKeyDown={onRowClick ? (event) => { if (event.target === event.currentTarget && (event.key === "Enter" || event.key === " ")) { event.preventDefault(); onRowClick(row); } } : undefined}
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
      const target = panelRef.current?.querySelector<HTMLElement>("[data-autofocus]") ?? panelRef.current;
      target?.focus({ preventScroll: true });
    });
    function onKey(event: globalThis.KeyboardEvent) {
      if (sheetStack[sheetStack.length - 1] !== token) return;
      if (event.key === "Escape") { event.stopPropagation(); closeRef.current(); return; }
      if (event.key !== "Tab" || !panelRef.current) return;
      const focusables = Array.from(panelRef.current.querySelectorAll<HTMLElement>("a[href], button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex='-1'])"));
      if (focusables.length === 0) { event.preventDefault(); return; }
      const first = focusables[0], last = focusables[focusables.length - 1];
      const active = document.activeElement;
      if (event.shiftKey && (active === first || active === panelRef.current)) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && active === last) { event.preventDefault(); first.focus(); }
      else if (!panelRef.current.contains(active)) { event.preventDefault(); first.focus(); }
    }
    document.addEventListener("keydown", onKey);
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener("keydown", onKey);
      sheetStack.splice(sheetStack.indexOf(token), 1);
      if (sheetStack.length === 0) document.body.style.overflow = previousOverflow;
      previousFocus?.focus?.({ preventScroll: true });
    };
  }, [open, panelRef]);
}

/**
 * Mobilde alttan açılan sheet, ≥768px'te ortada diyalog (placement="side" → sağ çekmece).
 * Odak tuzağı, Escape, arka plan tıklaması, kaydırma kilidi ve odağı geri verme içerir.
 * İlk odak: içerikte `data-autofocus` taşıyan öğe, yoksa panelin kendisi.
 */
export function Sheet({
  open, onClose, title, description, children, footer, size = "md", placement = "center", dismissible = true, headerExtra, className,
}: {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  size?: "sm" | "md" | "lg";
  placement?: "center" | "side";
  /** false: arka plana tıklayınca/Escape ile kapanmaz (ör. işlem sürerken). */
  dismissible?: boolean;
  /** Başlığın altında, gövdeden önce sabit içerik (ör. sekmeler). */
  headerExtra?: ReactNode;
  className?: string;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const close = () => { if (dismissible) onClose(); };
  useSheetBehavior(open, close, panelRef);
  if (!open || typeof document === "undefined") return null;
  return createPortal(
    <div
      className={cn(styles.tokens, styles.overlay, placement === "side" && styles.overlaySide)}
      role="presentation"
      onMouseDown={(event) => { if (event.target === event.currentTarget) close(); }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={cn(styles.sheet, size === "sm" && styles.sheetSm, size === "lg" && styles.sheetLg, placement === "side" && styles.sheetSide, className)}
      >
        <span className={styles.sheetGrip} aria-hidden />
        <div className={styles.sheetHead}>
          <div className="min-w-0">
            <h2 id={titleId} className={styles.sheetTitle}>{title}</h2>
            {description && <div className={styles.sheetDesc}>{description}</div>}
          </div>
          <button type="button" className={styles.closeBtn} onClick={close} disabled={!dismissible} aria-label="Kapat"><X size={17} /></button>
        </div>
        {headerExtra}
        <div className={styles.sheetBody}>{children}</div>
        {footer && <div className={styles.sheetFoot}>{footer}</div>}
      </div>
    </div>,
    document.body,
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
      size="sm"
      title={title}
      footer={<>
        <Button variant="secondary" onClick={onClose} disabled={busy}>{cancelLabel}</Button>
        <Button variant={tone === "danger" ? "danger" : "primary"} onClick={onConfirm} loading={busy} data-autofocus>{confirmLabel}</Button>
      </>}
    >
      <span className={cn(styles.confirmIcon, toneClassName(tone === "danger" ? "red" : "accent"))}><Icon size={22} aria-hidden /></span>
      {description && <p className="text-sm leading-6" style={{ color: "var(--dui-muted)" }}>{description}</p>}
      {children}
    </Sheet>
  );
}
