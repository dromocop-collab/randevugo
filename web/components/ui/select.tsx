"use client";

import { Check, ChevronDown } from "lucide-react";
import { useEffect, useId, useRef, useState, type ChangeEvent, type KeyboardEvent as ReactKeyboardEvent, type SelectHTMLAttributes } from "react";

export interface SelectOption {
  value: string;
  label: string;
  description?: string;
}

interface Props extends Omit<SelectHTMLAttributes<HTMLSelectElement>, "children" | "multiple"> {
  label: string;
  options: SelectOption[];
}

export function Select({ label, options, value, defaultValue, onChange, disabled, required, name, id, ...props }: Props) {
  const generatedId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const [internalValue, setInternalValue] = useState(String(defaultValue ?? ""));
  const selectedValue = String(value ?? internalValue);
  const selected = options.find((item) => item.value === selectedValue) ?? options[0];
  const controlId = id ?? generatedId;

  useEffect(() => {
    if (!open) return;
    requestAnimationFrame(() => menuRef.current?.querySelector<HTMLElement>("[aria-selected='true']")?.scrollIntoView({ block: "center" }));
  }, [open]);

  useEffect(() => {
    function close(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function escape(event: globalThis.KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", escape);
    };
  }, []);

  function choose(nextValue: string) {
    setInternalValue(nextValue);
    onChange?.({ target: { value: nextValue }, currentTarget: { value: nextValue } } as ChangeEvent<HTMLSelectElement>);
    setOpen(false);
  }

  function openMenu() {
    setHighlightedIndex(Math.max(0, options.findIndex((item) => item.value === selectedValue)));
    setOpen(true);
  }

  function handleKeyDown(event: ReactKeyboardEvent<HTMLButtonElement>) {
    if (["ArrowDown", "ArrowUp", "Home", "End", "Enter", " "].includes(event.key)) event.preventDefault();
    if (!open) {
      if (["ArrowDown", "ArrowUp", "Enter", " "].includes(event.key)) openMenu();
      return;
    }
    if (event.key === "ArrowDown") setHighlightedIndex((current) => Math.min(options.length - 1, current + 1));
    if (event.key === "ArrowUp") setHighlightedIndex((current) => Math.max(0, current - 1));
    if (event.key === "Home") setHighlightedIndex(0);
    if (event.key === "End") setHighlightedIndex(options.length - 1);
    if (event.key === "Enter" || event.key === " ") choose(options[highlightedIndex]?.value ?? selectedValue);
  }

  useEffect(() => {
    if (!open) return;
    menuRef.current?.querySelector<HTMLElement>(`[data-index="${highlightedIndex}"]`)?.scrollIntoView({ block: "nearest" });
  }, [highlightedIndex, open]);

  return (
    <div className="sr-select" ref={rootRef}>
      <label className="sr-select__label" id={`${controlId}-label`}>{label}{required && <span aria-hidden="true"> *</span>}</label>
      <button
        type="button"
        id={controlId}
        className="sr-select__trigger"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-labelledby={`${controlId}-label ${controlId}`}
        disabled={disabled}
        onClick={() => open ? setOpen(false) : openMenu()}
        onKeyDown={handleKeyDown}
      >
        <span><strong>{selected?.label ?? "Seçim yapın"}</strong>{selected?.description && <small>{selected.description}</small>}</span>
        <ChevronDown size={18} className={open ? "is-open" : ""}/>
      </button>
      {open && <div className="sr-select__menu" ref={menuRef} role="listbox" aria-labelledby={`${controlId}-label`}>
        {options.map((item, index) => {
          const active = item.value === selectedValue;
          return <button type="button" role="option" data-index={index} aria-selected={active} className={`${active ? "is-selected" : ""} ${highlightedIndex === index ? "is-highlighted" : ""}`} key={item.value} onMouseEnter={() => setHighlightedIndex(index)} onClick={() => choose(item.value)}>
            <span><strong>{item.label}</strong>{item.description && <small>{item.description}</small>}</span>
            <i>{active && <Check size={15}/>}</i>
          </button>;
        })}
      </div>}
      {name && <select className="sr-only" tabIndex={-1} aria-hidden="true" name={name} value={selectedValue} onChange={() => undefined} {...props}>{options.map((item) => <option value={item.value} key={item.value}>{item.label}</option>)}</select>}
    </div>
  );
}
