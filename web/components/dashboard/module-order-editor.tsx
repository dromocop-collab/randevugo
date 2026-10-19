"use client";

import { useLayoutEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { ArrowDown, ArrowUp, Eye, EyeOff, GripVertical } from "lucide-react";
import { buildDashboardRows, moveItem } from "@/features/dashboard-layout/layout-domain";
import { captureRects, playFlip, type RectMap } from "@/features/dashboard-layout/flip";
import { cn } from "@/lib/utils/cn";
import { useT } from "@/i18n/client";
import { tk } from "@/i18n/config";
import styles from "./topbar.module.css";

type Module = { id: string; enabled: boolean };
type Meta = { id: string; label: string; note: string; size: "full" | "wide" | "side" };

const PRESETS: Array<{ id: string; label: string; order: string[]; hidden?: string[] }> = [
  { id: "recommended", label: tk("Önerilen"), order: ["operations", "command", "insights", "kpis", "profile"] },
  { id: "operations", label: tk("Operasyon"), order: ["operations", "command", "kpis", "insights", "profile"] },
  { id: "numbers", label: tk("Rakamlar"), order: ["kpis", "operations", "insights", "command", "profile"] },
  { id: "minimal", label: tk("Sade"), order: ["kpis", "operations", "command", "insights", "profile"], hidden: ["insights", "profile"] },
];

/**
 * Ana panel modül sıralayıcı: tutamaçtan sürükle-bırak (fare + dokunmatik), ok tuşları,
 * göster/gizle, hazır düzenler ve panelin canlı mini haritası. Değişiklikler anında panele yansır.
 */
export function ModuleOrderEditor({ modules, meta, onChange }: { modules: Module[]; meta: readonly Meta[]; onChange: (next: Module[]) => void }) {
  const t = useT();
  const listRef = useRef<HTMLOListElement>(null);
  const mapRef = useRef<HTMLDivElement>(null);
  const flipRef = useRef<{ list: RectMap; map: RectMap } | null>(null);
  const dragRef = useRef<{ id: string; pointerId: number; grabY: number; lastY: number } | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const labelOf = (id: string) => { const label = meta.find((item) => item.id === id)?.label; return label ? t(label) : id; };
  const sizeOf = (id: string) => meta.find((item) => item.id === id)?.size ?? "side";

  function commit(next: Module[]) {
    flipRef.current = { list: captureRects(listRef.current), map: captureRects(mapRef.current) };
    onChange(next);
  }

  // Sürüklenen öğe parmağı/fareyi izler; diğerleri yeni yerlerine kayar.
  function positionDragged() {
    const drag = dragRef.current;
    const element = drag && listRef.current?.querySelector<HTMLElement>(`[data-flip-id="${drag.id}"]`);
    if (!drag || !element) return;
    const listTop = listRef.current!.getBoundingClientRect().top;
    element.style.transform = `translateY(${drag.lastY - listTop - drag.grabY - element.offsetTop}px)`;
  }

  useLayoutEffect(() => {
    const pending = flipRef.current;
    if (!pending) return;
    flipRef.current = null;
    playFlip(listRef.current, pending.list, { duration: 260, skip: dragRef.current?.id ?? null });
    playFlip(mapRef.current, pending.map, { duration: 360 });
    positionDragged();
  }, [modules]);

  // Sürükleme dinleyicileri pencereye bağlanır: liste yeniden sıralanınca DOM düğümü taşınır ve
  // pointer capture kaybolabilir; pencere dinleyicisi bundan etkilenmez.
  const modulesRef = useRef(modules);
  const commitRef = useRef(commit);
  useLayoutEffect(() => { modulesRef.current = modules; commitRef.current = commit; });

  function onPointerDown(event: ReactPointerEvent<HTMLButtonElement>, id: string) {
    if (event.button !== 0) return;
    const element = listRef.current?.querySelector<HTMLElement>(`[data-flip-id="${id}"]`);
    if (!element) return;
    event.preventDefault();
    const rect = element.getBoundingClientRect();
    dragRef.current = { id, pointerId: event.pointerId, grabY: event.clientY - rect.top, lastY: event.clientY };
    setDragId(id);

    const move = (moveEvent: PointerEvent) => {
      const drag = dragRef.current;
      const list = listRef.current;
      if (!drag || drag.pointerId !== moveEvent.pointerId || !list) return;
      moveEvent.preventDefault();
      drag.lastY = moveEvent.clientY;
      positionDragged();
      // Hedef sıra: sürüklenen kartın ortası hangi kartların ortasını geçtiyse.
      const items = [...list.querySelectorAll<HTMLElement>(":scope > [data-flip-id]")];
      const dragged = items.find((item) => item.dataset.flipId === drag.id);
      if (!dragged) return;
      const center = moveEvent.clientY - list.getBoundingClientRect().top - drag.grabY + dragged.offsetHeight / 2;
      const target = items.filter((item) => item !== dragged && item.offsetTop + item.offsetHeight / 2 < center).length;
      const current = modulesRef.current;
      const from = current.findIndex((item) => item.id === drag.id);
      if (from !== -1 && from !== target) commitRef.current(moveItem(current, from, target));
    };
    const end = (endEvent: PointerEvent) => {
      const drag = dragRef.current;
      if (!drag || drag.pointerId !== endEvent.pointerId) return;
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", end);
      window.removeEventListener("pointercancel", end);
      const dragged = listRef.current?.querySelector<HTMLElement>(`[data-flip-id="${drag.id}"]`);
      dragRef.current = null;
      setDragId(null);
      if (!dragged) return;
      // Bırakılan kart yerine yumuşakça oturur.
      const offset = dragged.style.transform;
      dragged.style.transform = "";
      if (offset && offset !== "translateY(0px)") dragged.animate([{ transform: offset }, { transform: "none" }], { duration: 220, easing: "cubic-bezier(0.22, 1, 0.36, 1)" });
    };
    window.addEventListener("pointermove", move, { passive: false });
    window.addEventListener("pointerup", end);
    window.addEventListener("pointercancel", end);
  }

  function onKeyMove(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= modules.length) return;
    commit(moveItem(modules, index, target));
  }

  function applyPreset(preset: (typeof PRESETS)[number]) {
    commit(preset.order.filter((id) => meta.some((item) => item.id === id)).map((id) => ({ id, enabled: !preset.hidden?.includes(id) })));
  }

  const activePreset = PRESETS.find((preset) => preset.order.every((id, index) => modules[index]?.id === id) && modules.every((item) => item.enabled === !preset.hidden?.includes(item.id)));
  const rows = buildDashboardRows(modules.filter((item) => item.enabled).map((item) => item.id), sizeOf);
  const hiddenCount = modules.filter((item) => !item.enabled).length;

  return (
    <div className={styles.layoutEditor}>
      <div className={styles.presetRow} role="group" aria-label={t("Hazır düzenler")}>
        {PRESETS.map((preset) => (
          <button type="button" key={preset.id} aria-pressed={activePreset?.id === preset.id} onClick={() => applyPreset(preset)}>{t(preset.label)}</button>
        ))}
      </div>

      <div ref={mapRef} className={styles.layoutMap} aria-hidden="true">
        {rows.length === 0 ? <span className={styles.layoutMapEmpty}>{t("Tüm modüller gizli")}</span> : rows.map((row) => row.kind === "full"
          ? <i key={row.id} data-flip-id={row.id} className={cn(styles.mapBlock, styles[`map-${row.id}`])}><span>{labelOf(row.id)}</span></i>
          : (
            <div key={`split-${row.index}`} className={styles.mapSplit}>
              <div>{row.left.map((id) => <i key={id} data-flip-id={id} className={cn(styles.mapBlock, styles[`map-${id}`])}><span>{labelOf(id)}</span></i>)}</div>
              <div>{row.right.map((id) => <i key={id} data-flip-id={id} className={cn(styles.mapBlock, styles[`map-${id}`])}><span>{labelOf(id)}</span></i>)}</div>
            </div>
          ))}
      </div>
      <p className={styles.layoutHint}>
        {hiddenCount
          ? t("Tutamaçtan sürükleyin. Kartlar boşluk kalmayacak şekilde kendiliğinden yerleşir · {count} modül gizli.", { count: hiddenCount })
          : t("Tutamaçtan sürükleyin. Kartlar boşluk kalmayacak şekilde kendiliğinden yerleşir.")}
      </p>

      <ol ref={listRef} className={styles.moduleList}>
        {modules.map((item, index) => {
          const info = meta.find((entry) => entry.id === item.id);
          const label = info?.label ? t(info.label) : item.id;
          return (
            <li key={item.id} data-flip-id={item.id} className={cn(!item.enabled && styles.moduleOff, dragId === item.id && styles.moduleDragging)}>
              <button
                type="button"
                className={styles.moduleGrip}
                aria-label={t("{label} modülünü sürükle", { label })}
                onPointerDown={(event) => onPointerDown(event, item.id)}
                onKeyDown={(event) => {
                  if (event.key === "ArrowUp") { event.preventDefault(); onKeyMove(index, -1); }
                  if (event.key === "ArrowDown") { event.preventDefault(); onKeyMove(index, 1); }
                }}
              >
                <GripVertical size={16} aria-hidden />
              </button>
              <button type="button" className={styles.moduleToggle} onClick={() => commit(modules.map((entry) => entry.id === item.id ? { ...entry, enabled: !entry.enabled } : entry))} aria-label={item.enabled ? t("{label} modülünü gizle", { label }) : t("{label} modülünü göster", { label })} aria-pressed={item.enabled}>
                {item.enabled ? <Eye size={15} aria-hidden /> : <EyeOff size={15} aria-hidden />}
              </button>
              <span className={styles.moduleText}><b>{label}</b><small>{item.enabled ? (info?.note ? t(info.note) : null) : t("Gizli")}</small></span>
              <div>
                <button type="button" disabled={index === 0} onClick={() => onKeyMove(index, -1)} aria-label={t("{label} yukarı taşı", { label })}><ArrowUp size={14} aria-hidden /></button>
                <button type="button" disabled={index === modules.length - 1} onClick={() => onKeyMove(index, 1)} aria-label={t("{label} aşağı taşı", { label })}><ArrowDown size={14} aria-hidden /></button>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
