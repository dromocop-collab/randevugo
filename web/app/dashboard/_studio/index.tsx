"use client";

/* İşletme paneli ikincil sayfaları için küçük, bağımlılıksız UI kiti.
   Tüm bileşenler <StudioPage> içinde kullanılmalı (renk token'ları orada tanımlı). */

import { useEffect, useId, useRef, type CSSProperties, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { AlertTriangle, LoaderCircle, Search, X, type LucideIcon } from "lucide-react";
import { RoviMascot, type RoviMood } from "@/components/brand/rovi-mascot";
import s from "./studio.module.css";

export { s as studio };

export function cx(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

export function StudioPage({ children, className, label }: { children: ReactNode; className?: string; label?: string }) {
  return <div className={cx(s.page, className)} aria-label={label}>{children}</div>;
}

export function StudioHero({ eyebrow, icon: Icon, title, description, actions, children, mascot }: {
  eyebrow: string;
  icon?: LucideIcon;
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  children?: ReactNode;
  mascot?: RoviMood | false;
}) {
  return (
    <header className={s.hero}>
      <div className={s.heroCopy}>
        <span className={s.eyebrow}>{Icon ? <Icon size={13} aria-hidden /> : null}{eyebrow}</span>
        <h1 className={s.heroTitle}>{title}</h1>
        {description ? <p className={s.heroText}>{description}</p> : null}
        {children ? <div className={s.heroAside}>{children}</div> : null}
      </div>
      {actions ? <div className={s.heroActions}>{actions}</div> : null}
      {mascot ? <span className={s.heroMascot} aria-hidden><RoviMascot size={92} mood={mascot} alt="" interactive={false} /></span> : null}
    </header>
  );
}

export function HeroChip({ icon: Icon, value, label }: { icon?: LucideIcon; value: ReactNode; label: ReactNode }) {
  return <span className={s.heroChip}>{Icon ? <Icon size={14} aria-hidden /> : null}<b>{value}</b>{label}</span>;
}

export function Panel({ title, description, icon: Icon, actions, children, flush, className, id }: {
  title?: ReactNode;
  description?: ReactNode;
  icon?: LucideIcon;
  actions?: ReactNode;
  children?: ReactNode;
  flush?: boolean;
  className?: string;
  id?: string;
}) {
  return (
    <section id={id} className={cx(s.panel, flush && s.panelFlush, className)}>
      {(title || actions) ? (
        <div className={s.panelHead}>
          <div className={s.panelHeadText}>
            {Icon ? <span className={s.panelIcon}><Icon size={19} aria-hidden /></span> : null}
            <div style={{ minWidth: 0 }}>
              {title ? <h2 className={s.panelTitle}>{title}</h2> : null}
              {description ? <p className={s.panelDesc}>{description}</p> : null}
            </div>
          </div>
          {actions ? <div className={s.panelActions}>{actions}</div> : null}
        </div>
      ) : null}
      {children}
    </section>
  );
}

export function StatTile({ label, value, hint, icon: Icon, accent }: { label: ReactNode; value: ReactNode; hint?: ReactNode; icon?: LucideIcon; accent?: boolean }) {
  return (
    <div className={cx(s.stat, accent && s.statAccent)}>
      <div className={s.statTop}><span>{label}</span>{Icon ? <span className={s.statIcon}><Icon size={16} aria-hidden /></span> : null}</div>
      <strong className={s.statValue}>{value}</strong>
      {hint ? <span className={s.statHint}>{hint}</span> : null}
    </div>
  );
}

export type PillTone = "neutral" | "accent" | "ok" | "warn" | "bad" | "info";
const pillTone: Record<PillTone, string | undefined> = { neutral: undefined, accent: s.pillAccent, ok: s.pillOk, warn: s.pillWarn, bad: s.pillBad, info: s.pillInfo };
export function Pill({ tone = "neutral", dot, children, className }: { tone?: PillTone; dot?: boolean; children: ReactNode; className?: string }) {
  return <span className={cx(s.pill, pillTone[tone], dot && s.pillDot, className)}>{children}</span>;
}

export function Segmented<T extends string>({ options, value, onChange, label, className }: {
  options: ReadonlyArray<{ value: T; label: ReactNode; count?: number; icon?: LucideIcon }>;
  value: T;
  onChange: (value: T) => void;
  label: string;
  className?: string;
}) {
  return (
    <div className={cx(s.seg, className)} role="group" aria-label={label}>
      {options.map((option) => {
        const Icon = option.icon;
        return (
          <button key={option.value} type="button" className={s.segBtn} aria-pressed={value === option.value} onClick={() => onChange(option.value)}>
            {Icon ? <Icon size={15} aria-hidden /> : null}{option.label}
            {typeof option.count === "number" ? <span className={s.segCount}>{option.count}</span> : null}
          </button>
        );
      })}
    </div>
  );
}

export function SearchField({ value, onChange, placeholder, label }: { value: string; onChange: (value: string) => void; placeholder: string; label?: string }) {
  return (
    <label className={s.search}>
      <Search size={17} aria-hidden />
      <span className={s.srOnly}>{label ?? placeholder}</span>
      <input type="search" value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} />
      {value ? <button type="button" className={cx(s.btn, s.btnGhost, s.btnSm)} style={{ padding: "0 8px", minHeight: 32 }} onClick={() => onChange("")} aria-label="Aramayı temizle"><X size={15} /></button> : null}
    </label>
  );
}

export function Toggle({ checked, onChange, label, disabled }: { checked: boolean; onChange: (checked: boolean) => void; label: string; disabled?: boolean }) {
  return (
    <span className={s.switch}>
      <input type="checkbox" role="switch" checked={checked} disabled={disabled} aria-label={label} onChange={(event) => onChange(event.target.checked)} />
      <i aria-hidden />
    </span>
  );
}

/** iOS tarzı ayar satırı: başlık + açıklama + sağda anahtar. Tüm satır tıklanabilir. */
export function ToggleRow({ title, note, checked, onChange, disabled, icon: Icon }: { title: string; note?: ReactNode; checked: boolean; onChange: (checked: boolean) => void; disabled?: boolean; icon?: LucideIcon }) {
  const id = useId();
  return (
    <label className={cx(s.row, s.switchRow)} htmlFor={id}>
      {Icon ? <span className={s.statIcon}><Icon size={16} aria-hidden /></span> : null}
      <span className={s.rowText}><b>{title}</b>{note ? <small>{note}</small> : null}</span>
      <span className={s.switch}>
        <input id={id} type="checkbox" role="switch" checked={checked} disabled={disabled} onChange={(event) => onChange(event.target.checked)} />
        <i aria-hidden />
      </span>
    </label>
  );
}

export function EmptyState({ title, description, action, mood = "wave", size = 96 }: { title: string; description?: ReactNode; action?: ReactNode; mood?: RoviMood; size?: number }) {
  return (
    <div className={s.empty}>
      <RoviMascot size={size} mood={mood} alt="" />
      <h3 className={s.emptyTitle}>{title}</h3>
      {description ? <p className={s.emptyText}>{description}</p> : null}
      {action ? <div className={s.emptyAction}>{action}</div> : null}
    </div>
  );
}

export function Sk({ h = 16, w = "100%", r, style }: { h?: number | string; w?: number | string; r?: number; style?: CSSProperties }) {
  return <span className={s.sk} style={{ height: h, width: w, borderRadius: r, ...style }} aria-hidden />;
}

/** Sayfa iskeleti: hero + istatistik + liste. */
export function StudioSkeleton({ stats = 4, rows = 4, label = "Yükleniyor" }: { stats?: number; rows?: number; label?: string }) {
  return (
    <div role="status" aria-live="polite" aria-label={label} style={{ display: "grid", gap: 16 }}>
      <Sk h={150} r={26} />
      {stats ? <div className={s.stats}>{Array.from({ length: stats }, (_, i) => <Sk key={i} h={104} r={18} />)}</div> : null}
      <div className={s.panel} style={{ display: "grid", gap: 12 }}>
        <Sk h={20} w="40%" />
        {Array.from({ length: rows }, (_, i) => <Sk key={i} h={58} r={14} />)}
      </div>
    </div>
  );
}

export function Notice({ tone = "neutral", icon: Icon, title, children }: { tone?: "neutral" | "warn" | "accent" | "bad"; icon?: LucideIcon; title?: ReactNode; children?: ReactNode }) {
  const toneClass = tone === "warn" ? s.noticeWarn : tone === "accent" ? s.noticeAccent : tone === "bad" ? s.noticeBad : undefined;
  return (
    <div className={cx(s.notice, toneClass)} role={tone === "warn" || tone === "bad" ? "status" : undefined}>
      {Icon ? <Icon size={18} aria-hidden /> : null}
      <div style={{ minWidth: 0 }}>{title ? <b>{title}</b> : null}{children}</div>
    </div>
  );
}

/** Portal ile body'ye açılan alt sayfa (mobil) / diyalog (masaüstü). */
export function Sheet({ open, onClose, title, description, children, footer, labelledBy }: {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  description?: ReactNode;
  children?: ReactNode;
  footer?: ReactNode;
  labelledBy?: string;
}) {
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);
  useEffect(() => { closeRef.current = onClose; }, [onClose]);
  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") closeRef.current(); };
    document.addEventListener("keydown", onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    requestAnimationFrame(() => {
      const panel = panelRef.current;
      (panel?.querySelector<HTMLElement>("[data-autofocus]") ?? panel?.querySelector<HTMLElement>("input, textarea, select, button"))?.focus();
    });
    return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = overflow; previous?.focus?.(); };
  }, [open]);
  if (!open || typeof document === "undefined") return null;
  return createPortal(
    <div className={cx(s.page, s.overlay)} onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <div ref={panelRef} className={s.sheet} role="dialog" aria-modal="true" aria-labelledby={labelledBy ?? (title ? titleId : undefined)}>
        <div className={s.sheetGrip} aria-hidden />
        {title ? (
          <div className={s.sheetHead}>
            <div style={{ minWidth: 0 }}>
              <h2 id={titleId} className={s.sheetTitle}>{title}</h2>
              {description ? <p className={s.sheetText}>{description}</p> : null}
            </div>
            <button type="button" className={cx(s.btn, s.btnGhost, s.iconBtn)} onClick={onClose} aria-label="Kapat"><X size={18} /></button>
          </div>
        ) : null}
        {children}
        {footer ? <div className={s.sheetActions}>{footer}</div> : null}
      </div>
    </div>,
    document.body,
  );
}

/** Yıkıcı/geri alınamaz işlemler için onay. */
export function ConfirmSheet({ open, title, description, confirmLabel = "Onayla", cancelLabel = "Vazgeç", tone = "danger", busy, onConfirm, onClose, children }: {
  open: boolean;
  title: string;
  description?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: "danger" | "primary";
  busy?: boolean;
  onConfirm: () => void;
  onClose: () => void;
  children?: ReactNode;
}) {
  const titleId = useId();
  return (
    <Sheet open={open} onClose={busy ? () => undefined : onClose} labelledBy={titleId}
      footer={<>
        <button type="button" className={s.btn} onClick={onClose} disabled={busy}>{cancelLabel}</button>
        <button type="button" data-autofocus className={cx(s.btn, tone === "danger" ? s.btnDanger : s.btnPrimary)} onClick={onConfirm} disabled={busy}>
          {busy ? <LoaderCircle size={16} className={s.spin} aria-hidden /> : null}{confirmLabel}
        </button>
      </>}>
      {tone === "danger" ? <span className={s.sheetIcon}><AlertTriangle size={22} aria-hidden /></span> : null}
      <h2 id={titleId} className={s.sheetTitle}>{title}</h2>
      {description ? <p className={s.sheetText}>{description}</p> : null}
      {children}
    </Sheet>
  );
}

/** Yalnızca değişiklik varken görünen yapışkan kaydet çubuğu. */
export function SaveBar({ visible, saving, onSave, onReset, label = "Kaydedilmemiş değişiklikler", saveLabel = "Kaydet", note, form }: {
  visible: boolean;
  saving?: boolean;
  onSave?: () => void;
  onReset?: () => void;
  label?: string;
  saveLabel?: string;
  note?: ReactNode;
  /** Bir <form> id'si verilirse kaydet butonu o formu gönderir. */
  form?: string;
}) {
  if (!visible) return null;
  return (
    <div className={s.saveBar} role="region" aria-label="Kaydet">
      <span><i aria-hidden />{label}{note ? <em style={{ fontStyle: "normal", color: "var(--k-faint)" }}>· {note}</em> : null}</span>
      <div className={s.saveBarActions}>
        {onReset ? <button type="button" className={cx(s.btn, s.btnGhost)} onClick={onReset} disabled={saving}>Geri al</button> : null}
        <button type={form ? "submit" : "button"} form={form} className={cx(s.btn, s.btnPrimary)} onClick={form ? undefined : onSave} disabled={saving}>
          {saving ? <LoaderCircle size={16} className={s.spin} aria-hidden /> : null}{saveLabel}
        </button>
      </div>
    </div>
  );
}
