"use client";

import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState, useSyncExternalStore, type CSSProperties, type KeyboardEvent } from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown, MapPin, Search, X } from "lucide-react";
import { districtsOf, geoSearchKey, normalizeDistrictName, normalizeCityName, TURKEY_CITIES } from "@/lib/geo/turkey-districts";
import { useT } from "@/i18n/client";
import styles from "./place-combobox.module.css";

type ComboboxProps = {
  id: string;
  value: string;
  options: readonly string[];
  onChange: (value: string) => void;
  /** Yazılan metin listeden bir seçeneğe denk gelirse resmi yazımı döner. */
  normalize: (value: string) => string | null;
  placeholder?: string;
  disabled?: boolean;
  invalid?: boolean;
  describedBy?: string;
  autoComplete?: string;
  emptyText: string;
  inputClassName?: string;
  /** Telefondaki tam ekran seçicinin başlığı (ör. "Şehir seç"). */
  title?: string;
};

// Telefonda açılır liste klavyenin altında kalıyor, sayfa zıplıyordu: dar ekranda tam ekran seçici açılır.
const SHEET_QUERY = "(max-width: 640px)";
function subscribeSheet(callback: () => void) {
  const media = window.matchMedia(SHEET_QUERY);
  media.addEventListener("change", callback);
  return () => media.removeEventListener("change", callback);
}
function useSheetMode() {
  return useSyncExternalStore(subscribeSheet, () => window.matchMedia(SHEET_QUERY).matches, () => false);
}

function filterOptions(options: readonly string[], query: string) {
  const key = geoSearchKey(query);
  if (!key) return options;
  const starts = options.filter((item) => geoSearchKey(item).startsWith(key));
  const contains = options.filter((item) => !geoSearchKey(item).startsWith(key) && geoSearchKey(item).includes(key));
  return [...starts, ...contains];
}

/**
 * Aranabilir seçim kutusu (tarayıcı datalist'i yerine): Türkçe karakter duyarsız arama,
 * klavye ile gezinme, mobilde rahat dokunma alanları.
 */
export function PlaceCombobox(props: ComboboxProps) {
  const sheet = useSheetMode();
  return sheet ? <PlaceSheetPicker {...props} /> : <PlaceDropdown {...props} />;
}

function PlaceDropdown({ id, value, options, onChange, normalize, placeholder, disabled, invalid, describedBy, autoComplete, emptyText, inputClassName }: ComboboxProps) {
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState<string | null>(null);
  const [active, setActive] = useState(0);
  const [position, setPosition] = useState<CSSProperties | null>(null);

  const text = query ?? value;
  const filtered = useMemo(() => filterOptions(options, query ?? ""), [options, query]);

  useEffect(() => {
    if (!open) return;
    const onDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (!rootRef.current?.contains(target) && !listRef.current?.contains(target)) commit();
    };
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  });

  // Liste body'ye taşınır (kart overflow'u kesmesin); aşağıda yer yoksa yukarı açılır.
  useLayoutEffect(() => {
    if (!open) return;
    const place = () => {
      const input = rootRef.current?.querySelector("input");
      if (!input) return;
      const rect = input.getBoundingClientRect();
      const below = window.innerHeight - rect.bottom - 12;
      const above = rect.top - 12;
      const upward = below < 220 && above > below;
      const maxHeight = Math.max(160, Math.min(300, (upward ? above : below) - 6));
      setPosition({
        position: "fixed",
        left: rect.left,
        width: rect.width,
        maxHeight,
        ...(upward ? { bottom: window.innerHeight - rect.top + 6 } : { top: rect.bottom + 6 }),
      });
    };
    place();
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => { window.removeEventListener("resize", place); window.removeEventListener("scroll", place, true); };
  }, [open]);

  useEffect(() => {
    listRef.current?.querySelector<HTMLElement>(`[data-index="${active}"]`)?.scrollIntoView({ block: "nearest" });
  }, [active, open]);

  function choose(option: string) {
    onChange(option);
    setQuery(null);
    setOpen(false);
  }

  // Liste dışı yazım kabul edilmez; eşleşen seçenek varsa ona çevrilir, yoksa eski değer korunur.
  function commit() {
    if (query !== null) {
      const match = normalize(query);
      if (match) onChange(match);
      else if (!query.trim()) onChange("");
    }
    setQuery(null);
    setOpen(false);
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown") { event.preventDefault(); setOpen(true); setActive((index) => Math.min(index + 1, Math.max(filtered.length - 1, 0))); }
    else if (event.key === "ArrowUp") { event.preventDefault(); setActive((index) => Math.max(index - 1, 0)); }
    else if (event.key === "Enter" && open && filtered[active]) { event.preventDefault(); event.stopPropagation(); choose(filtered[active]); }
    else if (event.key === "Escape") { setQuery(null); setOpen(false); }
    else if (event.key === "Tab") commit();
  }

  return (
    <div ref={rootRef} className={styles.root}>
      <input
        id={id}
        className={inputClassName}
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-invalid={invalid || undefined}
        aria-describedby={describedBy}
        aria-activedescendant={open && filtered[active] ? `${listId}-${active}` : undefined}
        value={text}
        placeholder={placeholder}
        disabled={disabled}
        autoComplete={autoComplete ?? "chrome-off"}
        name={`sr-place-${id}`}
        data-lpignore="true"
        data-form-type="other"
        enterKeyHint="next"
        onFocus={() => { setOpen(true); setActive(0); }}
        onClick={() => setOpen(true)}
        onChange={(event) => { setQuery(event.target.value.slice(0, 60)); setOpen(true); setActive(0); }}
        onKeyDown={onKeyDown}
      />
      <ChevronDown className={styles.chevron} size={18} aria-hidden="true" />
      {open && !disabled && position && typeof document !== "undefined" && createPortal(
        <ul ref={listRef} id={listId} role="listbox" className={styles.list} style={position}>
          {filtered.length === 0
            ? <li className={styles.empty}>{emptyText}</li>
            : filtered.map((option, index) => (
              <li
                key={option}
                id={`${listId}-${index}`}
                data-index={index}
                role="option"
                aria-selected={option === value}
                className={`${styles.option} ${index === active ? styles.active : ""}`}
                onPointerDown={(event) => event.preventDefault()}
                onClick={() => choose(option)}
                onPointerMove={() => setActive(index)}
              >
                <MapPin size={14} aria-hidden="true" />
                <span>{option}</span>
                {option === value && <Check size={15} className={styles.check} aria-hidden="true" />}
              </li>
            ))}
        </ul>,
        document.body,
      )}
    </div>
  );
}

/** Telefon: alan dokununca tam ekran açılır; üstte arama, altta büyük dokunma alanlı liste. Klavye listeyi kapatmaz. */
function PlaceSheetPicker({ id, value, options, onChange, placeholder, disabled, invalid, describedBy, emptyText, inputClassName, title }: ComboboxProps) {
  const t = useT();
  const listId = useId();
  const titleId = useId();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [height, setHeight] = useState<number | null>(null);
  const triggerRef = useRef<HTMLInputElement>(null);
  const filtered = useMemo(() => filterOptions(options, query), [options, query]);

  // Klavye açılınca görünür alan küçülür (iOS'ta innerHeight değişmez): seçici görünen yüksekliğe oturur.
  useEffect(() => {
    if (!open) return;
    const viewport = window.visualViewport;
    const fit = () => setHeight(viewport ? viewport.height : window.innerHeight);
    fit();
    viewport?.addEventListener("resize", fit);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { viewport?.removeEventListener("resize", fit); document.body.style.overflow = overflow; };
  }, [open]);

  function show() {
    if (disabled) return;
    setQuery("");
    setOpen(true);
  }
  function close() {
    setOpen(false);
    triggerRef.current?.focus({ preventScroll: true });
  }
  function choose(option: string) {
    onChange(option);
    close();
  }

  return (
    <div className={styles.root}>
      <input
        ref={triggerRef}
        id={id}
        className={inputClassName}
        role="combobox"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={listId}
        aria-invalid={invalid || undefined}
        aria-describedby={describedBy}
        value={value}
        placeholder={placeholder}
        disabled={disabled}
        readOnly
        inputMode="none"
        name={`sr-place-${id}`}
        data-lpignore="true"
        data-form-type="other"
        onClick={show}
        onKeyDown={(event) => { if (event.key === "Enter" || event.key === " " || event.key === "ArrowDown") { event.preventDefault(); show(); } }}
      />
      <ChevronDown className={styles.chevron} size={18} aria-hidden="true" />
      {open && typeof document !== "undefined" && createPortal(
        <div className={styles.sheetBackdrop} onClick={close}>
          <div
            className={styles.sheet}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            style={height ? { height } : undefined}
            onClick={(event) => event.stopPropagation()}
            onKeyDown={(event) => { if (event.key === "Escape") close(); }}
          >
            <div className={styles.sheetHead}>
              <b id={titleId}>{title ?? placeholder}</b>
              <button type="button" onClick={close} aria-label={t("Kapat")}><X size={20} /></button>
            </div>
            <label className={styles.sheetSearch}>
              <Search size={18} aria-hidden="true" />
              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value.slice(0, 60))}
                onKeyDown={(event) => { if (event.key === "Enter" && filtered[0]) { event.preventDefault(); choose(filtered[0]); } }}
                placeholder={t("Ara…")}
                aria-label={t("Ara")}
                aria-controls={listId}
                autoComplete="off"
                enterKeyHint="search"
                autoFocus
              />
            </label>
            <ul id={listId} role="listbox" aria-labelledby={titleId} className={styles.sheetList}>
              {filtered.length === 0
                ? <li className={styles.empty}>{emptyText}</li>
                : filtered.map((option) => (
                  <li
                    key={option}
                    role="option"
                    aria-selected={option === value}
                    tabIndex={0}
                    className={styles.option}
                    onClick={() => choose(option)}
                    onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); choose(option); } }}
                  >
                    <MapPin size={15} aria-hidden="true" />
                    <span>{option}</span>
                    {option === value && <Check size={17} className={styles.check} aria-hidden="true" />}
                  </li>
                ))}
            </ul>
          </div>
        </div>,
        document.body,
      )}
    </div>
  );
}

export function CitySelect(props: Omit<ComboboxProps, "options" | "normalize" | "emptyText">) {
  const t = useT();
  return <PlaceCombobox title={t("Şehir seç")} {...props} options={TURKEY_CITIES} normalize={normalizeCityName} emptyText={t("Bu isimde şehir bulunamadı.")} autoComplete={props.autoComplete} />;
}

export function DistrictSelect({ city, ...props }: Omit<ComboboxProps, "options" | "normalize" | "emptyText"> & { city: string }) {
  const t = useT();
  const options = districtsOf(city);
  return <PlaceCombobox
    title={t("İlçe seç")}
    {...props}
    options={options}
    normalize={(value) => normalizeDistrictName(city, value)}
    disabled={props.disabled || options.length === 0}
    placeholder={options.length ? props.placeholder ?? t("İlçe seç") : t("Önce şehir seç")}
    emptyText={t("Bu şehirde böyle bir ilçe yok.")}
  />;
}
