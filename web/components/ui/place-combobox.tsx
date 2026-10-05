"use client";

import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type KeyboardEvent } from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown, MapPin } from "lucide-react";
import { districtsOf, geoSearchKey, normalizeDistrictName, normalizeCityName, TURKEY_CITIES } from "@/lib/geo/turkey-districts";
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
};

/**
 * Aranabilir seçim kutusu (tarayıcı datalist'i yerine): Türkçe karakter duyarsız arama,
 * klavye ile gezinme, mobilde rahat dokunma alanları.
 */
export function PlaceCombobox({ id, value, options, onChange, normalize, placeholder, disabled, invalid, describedBy, autoComplete, emptyText, inputClassName }: ComboboxProps) {
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState<string | null>(null);
  const [active, setActive] = useState(0);
  const [position, setPosition] = useState<CSSProperties | null>(null);

  const text = query ?? value;
  const filtered = useMemo(() => {
    const key = geoSearchKey(query ?? "");
    if (!key) return options;
    const starts = options.filter((item) => geoSearchKey(item).startsWith(key));
    const contains = options.filter((item) => !geoSearchKey(item).startsWith(key) && geoSearchKey(item).includes(key));
    return [...starts, ...contains];
  }, [options, query]);

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

export function CitySelect(props: Omit<ComboboxProps, "options" | "normalize" | "emptyText">) {
  return <PlaceCombobox {...props} options={TURKEY_CITIES} normalize={normalizeCityName} emptyText="Bu isimde şehir bulunamadı." autoComplete={props.autoComplete} />;
}

export function DistrictSelect({ city, ...props }: Omit<ComboboxProps, "options" | "normalize" | "emptyText"> & { city: string }) {
  const options = districtsOf(city);
  return <PlaceCombobox
    {...props}
    options={options}
    normalize={(value) => normalizeDistrictName(city, value)}
    disabled={props.disabled || options.length === 0}
    placeholder={options.length ? props.placeholder ?? "İlçe seç" : "Önce şehir seç"}
    emptyText="Bu şehirde böyle bir ilçe yok."
  />;
}
