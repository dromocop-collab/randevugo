"use client";

import { useState } from "react";
import { cn } from "@/lib/utils/cn";
import { tk } from "@/i18n/config";
import { useLocale, useT } from "@/i18n/client";

const DEFAULT_CATEGORIES: { value: string; label: string }[] = [
  { value: "", label: tk("Tüm Kategoriler") },
  { value: "kuafor", label: tk("Kuaför") },
  { value: "berber", label: tk("Berber") },
  { value: "guzellik", label: tk("Güzellik Merkezi") },
  { value: "nail", label: tk("Nail Studio") },
  { value: "spor", label: tk("Spor / PT") },
  { value: "danismanlik", label: tk("Danışmanlık") },
  { value: "veteriner", label: tk("Veteriner") },
  { value: "saglik", label: tk("Sağlık") },
  { value: "spa", label: tk("Spa & Masaj") },
  { value: "yazilim", label: tk("Yazılım") },
  { value: "egitim", label: tk("Eğitim") },
  { value: "servis", label: tk("Servis / Teknik") },
  { value: "diger", label: tk("Diğer") },
];

// İl adları özel addır, çevrilmez.
const ALL_CITIES = [
  "Adana", "Adıyaman", "Afyonkarahisar", "Ağrı", "Aksaray", "Amasya", "Ankara", // i18n-ignore
  "Antalya", "Ardahan", "Artvin", "Aydın", "Balıkesir", "Bartın", "Batman", // i18n-ignore
  "Bayburt", "Bilecik", "Bingöl", "Bitlis", "Bolu", "Burdur", "Bursa", // i18n-ignore
  "Çanakkale", "Çankırı", "Çorum", "Denizli", "Diyarbakır", "Düzce", "Edirne", // i18n-ignore
  "Elazığ", "Erzincan", "Erzurum", "Eskişehir", "Gaziantep", "Giresun", // i18n-ignore
  "Gümüşhane", "Hakkari", "Hatay", "Iğdır", "Isparta", "İstanbul", "İzmir", // i18n-ignore
  "Kahramanmaraş", "Karabük", "Karaman", "Kars", "Kastamonu", "Kayseri", // i18n-ignore
  "Kilis", "Kırıkkale", "Kırklareli", "Kırşehir", "Kocaeli", "Konya", "Kütahya", // i18n-ignore
  "Malatya", "Manisa", "Mardin", "Mersin", "Muğla", "Muş", "Nevşehir", "Niğde", // i18n-ignore
  "Ordu", "Osmaniye", "Rize", "Sakarya", "Samsun", "Şanlıurfa", "Siirt", // i18n-ignore
  "Sinop", "Sivas", "Şırnak", "Tekirdağ", "Tokat", "Trabzon", "Tunceli", // i18n-ignore
  "Uşak", "Van", "Yalova", "Yozgat", "Zonguldak", // i18n-ignore
];

interface SearchBarProps {
  onSearch: (params: {
    searchText: string;
    category: string;
    city: string;
  }) => void;
  cities?: string[];
  dynamicCategories?: { value: string; label: string }[];
  className?: string;
}

export function SearchBar({ onSearch, cities, dynamicCategories, className }: SearchBarProps) {
  const t = useT();
  const locale = useLocale();
  const [searchText, setSearchText] = useState("");
  const [category, setCategory] = useState("");
  const [city, setCity] = useState("");

  // Merge dynamic categories
  const allCategories = (() => {
    if (!dynamicCategories || dynamicCategories.length === 0) return DEFAULT_CATEGORIES;
    const existing = new Set(DEFAULT_CATEGORIES.map((c) => c.value));
    // Remove "diger" first, add dynamic, then re-add "diger"
    const merged = DEFAULT_CATEGORIES.filter((c) => c.value !== "diger");
    dynamicCategories.forEach((dc) => {
      if (!existing.has(dc.value)) {
        merged.push(dc);
      }
    });
    merged.push({ value: "diger", label: tk("Diğer") });
    return merged;
  })();

  // Use ALL_CITIES if no cities from Firestore
  const allCities = cities && cities.length > 0 ? cities : ALL_CITIES;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSearch({ searchText, category, city });
  }

  return (
    <form
      onSubmit={handleSubmit}
      className={cn(
        "relative rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] p-3 shadow-2xl shadow-[var(--shadow-soft)] backdrop-blur-xl",
        className
      )}
    >
      <div className="grid gap-3 md:grid-cols-[1fr_auto_auto_auto]">
        <div className="relative">
          <svg
            className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-[var(--text-3)]"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          <input
            type="text"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            placeholder={t("Berber, kuaför, güzellik merkezi veya hizmet ara...")}
            className="w-full rounded-xl border border-[var(--border)] bg-[var(--field-bg)] py-3 pl-10 pr-4 text-sm text-[var(--text-1)] placeholder:text-[var(--text-3)] transition focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
          />
        </div>

        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="rounded-xl border border-[var(--border)] bg-[var(--field-bg)] px-3 py-3 text-sm text-[var(--text-1)] transition focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
        >
          {allCategories.map((cat) => (
            <option key={cat.value} value={cat.value}>
              {t(cat.label)}
            </option>
          ))}
        </select>

        <select
          value={city}
          onChange={(e) => setCity(e.target.value)}
          className="rounded-xl border border-[var(--border)] bg-[var(--field-bg)] px-3 py-3 text-sm text-[var(--text-1)] transition focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
        >
          <option value="">{t("Tüm Şehirler")}</option>
          {allCities.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>

        <button
          type="submit"
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-[linear-gradient(135deg,var(--accent),var(--accent-3))] px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-sky-500/25 transition hover:brightness-110 active:scale-[0.97]"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          {/* "Ara" sözlükte "Call" (telefon) anlamında kullanılıyor; arama düğmesi için ayrı anahtar. */}
          {locale === "tr" ? "Ara" : t("Arama yap")}
        </button>
      </div>
    </form>
  );
}
