// Ana panel (Bugün) modül yerleşimi — saf mantık. Test: layout-domain.test.mjs
// 12 sütunlu "dense" ızgara, kısa bir geniş kartın yanında ve altında boşluk bırakıyordu.
// Bunun yerine sıra birebir korunur: tam genişlik modüller tek başına satır olur; aralarındaki ARDIŞIK
// geniş/yan modüller iki bağımsız sütunlu bir satırda toplanır (sol: geniş, sağ: yan). Tek kalan modül tam
// genişlik olur. Her sütunun son kartı kalan yüksekliği doldurur; böylece hiçbir sırada boşluk kalmaz.

export type ModuleSize = "full" | "wide" | "side";

export type LayoutRow =
  | { kind: "full"; id: string; index: number }
  | { kind: "split"; left: string[]; right: string[]; index: number };

export function buildDashboardRows(ids: readonly string[], sizeOf: (id: string) => ModuleSize): LayoutRow[] {
  const rows: LayoutRow[] = [];
  let group: Array<{ id: string; index: number }> = [];
  const flush = () => {
    if (!group.length) return;
    const index = group[0].index;
    if (group.length === 1) {
      rows.push({ kind: "full", id: group[0].id, index });
    } else if (group.some((item) => sizeOf(item.id) === "wide")) {
      rows.push({ kind: "split", left: group.filter((item) => sizeOf(item.id) === "wide").map((item) => item.id), right: group.filter((item) => sizeOf(item.id) !== "wide").map((item) => item.id), index });
    } else {
      // Yalnız yan kartlar: sırayla iki sütuna dağıtılır (1. sol, 2. sağ, 3. sol…).
      rows.push({ kind: "split", left: group.filter((_, i) => i % 2 === 0).map((item) => item.id), right: group.filter((_, i) => i % 2 === 1).map((item) => item.id), index });
    }
    group = [];
  };
  ids.forEach((id, index) => {
    if (sizeOf(id) === "full") { flush(); rows.push({ kind: "full", id, index }); }
    else group.push({ id, index });
  });
  flush();
  return rows;
}

/** Diziyi from → to taşır (sürükle-bırak). */
export function moveItem<T>(items: readonly T[], from: number, to: number): T[] {
  if (from === to || from < 0 || from >= items.length) return [...items];
  const next = [...items];
  const [item] = next.splice(from, 1);
  next.splice(Math.max(0, Math.min(next.length, to)), 0, item);
  return next;
}
