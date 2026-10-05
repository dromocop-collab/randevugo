"use client";

import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { collection, getDocs } from "firebase/firestore";
import { Building2, CornerDownLeft, LoaderCircle, Search } from "lucide-react";
import { getDb } from "@/lib/firebase/firestore";
import { cn } from "@/lib/utils/cn";
import { ADMIN_NAV_ITEMS } from "./admin-nav";
import styles from "./admin-shell.module.css";

type BusinessHit = { id: string; name: string; city: string; status: string; ownerUid: string };
type Result =
  | { kind: "page"; key: string; label: string; meta: string; href: string; icon: (typeof ADMIN_NAV_ITEMS)[number]["icon"] }
  | { kind: "business"; key: string; label: string; meta: string; href: string };

// İşletme listesi oturum boyunca 5 dk önbelleklenir; palet her açıldığında koleksiyon okunmaz.
let businessCache: { at: number; rows: BusinessHit[] } | null = null;
async function loadBusinesses(): Promise<BusinessHit[]> {
  if (businessCache && Date.now() - businessCache.at < 5 * 60_000) return businessCache.rows;
  const snapshot = await getDocs(collection(getDb(), "businesses"));
  const rows = snapshot.docs.map((item) => {
    const data = item.data();
    return { id: item.id, name: String(data.name ?? "İsimsiz"), city: String(data.city ?? ""), status: data.isSuspended === true ? "suspended" : String(data.status ?? ""), ownerUid: String(data.ownerUid ?? "") };
  });
  businessCache = { at: Date.now(), rows };
  return rows;
}

const STATUS_TEXT: Record<string, string> = { active: "Aktif", pending_review: "Onay bekliyor", rejected: "Reddedildi", suspended: "Askıda" };
const normalize = (value: string) => value.toLocaleLowerCase("tr-TR").normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/ı/g, "i");

export function AdminCommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  if (!open || typeof document === "undefined") return null;
  const host = document.querySelector<HTMLElement>("[data-admin-root]") ?? document.body;
  return createPortal(<PaletteDialog onClose={onClose} />, host);
}

function PaletteDialog({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const [term, setTerm] = useState("");
  const [cursor, setCursor] = useState(0);
  const [businesses, setBusinesses] = useState<BusinessHit[] | null>(businessCache?.rows ?? null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    inputRef.current?.focus();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    let alive = true;
    loadBusinesses().then((rows) => { if (alive) setBusinesses(rows); }).catch(() => { if (alive) setFailed(true); });
    return () => { alive = false; document.body.style.overflow = previousOverflow; };
  }, []);

  const results = useMemo<Result[]>(() => {
    const q = normalize(term.trim());
    const pages: Result[] = ADMIN_NAV_ITEMS
      .filter((item) => !q || normalize(`${item.label} ${item.keywords ?? ""}`).includes(q))
      .map((item) => ({ kind: "page", key: item.href, label: item.label, meta: item.href.replace("/super-admin", "") || "/", href: item.href, icon: item.icon }));
    if (!q) return pages;
    const hits: Result[] = (businesses ?? [])
      .filter((item) => normalize(`${item.name} ${item.city} ${item.id} ${item.ownerUid}`).includes(q))
      .slice(0, 8)
      .map((item) => ({
        kind: "business", key: item.id, label: item.name,
        meta: [item.city, STATUS_TEXT[item.status] ?? item.status].filter(Boolean).join(" · "),
        href: `/super-admin/isletmeler?q=${encodeURIComponent(item.id)}&ac=1`,
      }));
    return [...pages, ...hits];
  }, [businesses, term]);

  const active = Math.min(cursor, Math.max(0, results.length - 1));

  function go(result: Result | undefined) {
    if (!result) return;
    onClose();
    router.push(result.href);
  }

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Escape") { event.preventDefault(); onClose(); return; }
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      const next = (active + (event.key === "ArrowDown" ? 1 : -1) + results.length) % Math.max(1, results.length);
      setCursor(next);
      listRef.current?.querySelector<HTMLElement>(`[data-index="${next}"]`)?.scrollIntoView({ block: "nearest" });
    }
    if (event.key === "Enter") { event.preventDefault(); go(results[active]); }
  }

  const firstBusinessIndex = results.findIndex((item) => item.kind === "business");
  return (
    <div className={styles.paletteOverlay} role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <div className={styles.palette} role="dialog" aria-modal="true" aria-label="Ara veya git" onKeyDown={onKeyDown}>
        <div className={styles.paletteInput}>
          <Search size={18} aria-hidden />
          <input
            ref={inputRef}
            value={term}
            onChange={(event) => { setTerm(event.target.value); setCursor(0); }}
            placeholder="Sayfa, işletme adı, şehir veya ID…"
            aria-label="Ara"
            role="combobox"
            aria-expanded="true"
            aria-controls="admin-palette-list"
            aria-activedescendant={results[active] ? `pal-${active}` : undefined}
          />
          {term && !businesses && !failed && <LoaderCircle size={16} className="animate-spin" aria-label="İşletmeler yükleniyor" />}
        </div>
        <div ref={listRef} id="admin-palette-list" role="listbox" className={styles.paletteList}>
          {results.length === 0 ? (
            <p className={styles.paletteEmpty}>{failed ? "İşletmeler yüklenemedi; yalnızca sayfalar aranabilir." : "Eşleşen sayfa veya işletme yok."}</p>
          ) : results.map((result, index) => (
            <div key={`${result.kind}:${result.key}`}>
              {index === 0 && <p className={styles.paletteSection}>Sayfalar</p>}
              {index === firstBusinessIndex && <p className={styles.paletteSection}>İşletmeler</p>}
              <button
                type="button"
                id={`pal-${index}`}
                data-index={index}
                role="option"
                aria-selected={index === active}
                className={cn(styles.paletteItem, index === active && styles.paletteItemActive)}
                onMouseMove={() => { if (cursor !== index) setCursor(index); }}
                onClick={() => go(result)}
              >
                <span className={styles.paletteIcon}>{result.kind === "page" ? <result.icon size={16} aria-hidden /> : <Building2 size={16} aria-hidden />}</span>
                <span className="min-w-0 flex-1"><span className="block truncate">{result.label}</span><span className={styles.paletteMeta}>{result.meta}</span></span>
                {index === active && <CornerDownLeft size={14} aria-hidden className="text-[var(--sa-faint)]" />}
              </button>
            </div>
          ))}
        </div>
        <div className={styles.paletteHint} aria-hidden><span>↑↓ gez</span><span>↵ aç</span><span>esc kapat</span></div>
      </div>
    </div>
  );
}
