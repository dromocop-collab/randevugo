// Ana panel (Bugün) modül yerleşimi — saf mantık. Test: layout-domain.test.mjs
// 12 sütunlu "dense" ızgara, kısa bir geniş kartın yanında ve altında boşluk bırakıyordu.
// Bunun yerine: tam genişlik modüller sıralarına göre tek başına satır olur; geniş/yan modüllerin hepsi
// ilkinin bulunduğu yerde TEK bir iki sütunlu blokta toplanır (sol: geniş, sağ: yan; kendi sıralarıyla).
// Her sütunun son kartı kalan yüksekliği doldurur; böylece hiçbir sırada boşluk kalmaz.

export type ModuleSize = "full" | "wide" | "side";

export type LayoutRow =
  | { kind: "full"; id: string; index: number }
  | { kind: "split"; left: string[]; right: string[]; index: number };

export function buildDashboardRows(ids: readonly string[], sizeOf: (id: string) => ModuleSize): LayoutRow[] {
  const rows: LayoutRow[] = [];
  const columns = ids.map((id, index) => ({ id, index })).filter((item) => sizeOf(item.id) !== "full");
  const first = columns[0]?.index ?? -1;
  ids.forEach((id, index) => {
    if (sizeOf(id) === "full") { rows.push({ kind: "full", id, index }); return; }
    if (index !== first) return;
    if (columns.length === 1) {
      rows.push({ kind: "full", id, index });
    } else if (columns.some((item) => sizeOf(item.id) === "wide")) {
      rows.push({ kind: "split", left: columns.filter((item) => sizeOf(item.id) === "wide").map((item) => item.id), right: columns.filter((item) => sizeOf(item.id) !== "wide").map((item) => item.id), index });
    } else {
      // Yalnız yan kartlar: sırayla iki sütuna dağıtılır (1. sol, 2. sağ, 3. sol…).
      rows.push({ kind: "split", left: columns.filter((_, i) => i % 2 === 0).map((item) => item.id), right: columns.filter((_, i) => i % 2 === 1).map((item) => item.id), index });
    }
  });
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
