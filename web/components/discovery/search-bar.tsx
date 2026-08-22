"use client";

import { useState } from "react";
import { cn } from "@/lib/utils/cn";

const DEFAULT_CATEGORIES = [
  { value: "", label: "Tüm Kategoriler" },
  { value: "kuafor", label: "Kuaför" },
  { value: "berber", label: "Berber" },
  { value: "guzellik", label: "Güzellik Merkezi" },
  { value: "nail", label: "Nail Studio" },
  { value: "spor", label: "Spor / PT" },
  { value: "danismanlik", label: "Danışmanlık" },
  { value: "veteriner", label: "Veteriner" },
  { value: "saglik", label: "Sağlık" },
  { value: "spa", label: "Spa & Masaj" },
  { value: "yazilim", label: "Yazılım" },
  { value: "egitim", label: "Eğitim" },
  { value: "servis", label: "Servis / Teknik" },
  { value: "diger", label: "Diğer" },
];

const ALL_CITIES = [
  "Adana", "Adıyaman", "Afyonkarahisar", "Ağrı", "Aksaray", "Amasya", "Ankara",
  "Antalya", "Ardahan", "Artvin", "Aydın", "Balıkesir", "Bartın", "Batman",
  "Bayburt", "Bilecik", "Bingöl", "Bitlis", "Bolu", "Burdur", "Bursa",
  "Çanakkale", "Çankırı", "Çorum", "Denizli", "Diyarbakır", "Düzce", "Edirne",
  "Elazığ", "Erzincan", "Erzurum", "Eskişehir", "Gaziantep", "Giresun",
  "Gümüşhane", "Hakkari", "Hatay", "Iğdır", "Isparta", "İstanbul", "İzmir",
  "Kahramanmaraş", "Karabük", "Karaman", "Kars", "Kastamonu", "Kayseri",
  "Kilis", "Kırıkkale", "Kırklareli", "Kırşehir", "Kocaeli", "Konya", "Kütahya",
  "Malatya", "Manisa", "Mardin", "Mersin", "Muğla", "Muş", "Nevşehir", "Niğde",
  "Ordu", "Osmaniye", "Rize", "Sakarya", "Samsun", "Şanlıurfa", "Siirt",
  "Sinop", "Sivas", "Şırnak", "Tekirdağ", "Tokat", "Trabzon", "Tunceli",
  "Uşak", "Van", "Yalova", "Yozgat", "Zonguldak",
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
    merged.push({ value: "diger", label: "Diğer" });
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
            placeholder="Berber, kuaför, güzellik merkezi veya hizmet ara..."
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
              {cat.label}
            </option>
          ))}
        </select>

        <select
          value={city}
          onChange={(e) => setCity(e.target.value)}
          className="rounded-xl border border-[var(--border)] bg-[var(--field-bg)] px-3 py-3 text-sm text-[var(--text-1)] transition focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
        >
          <option value="">Tüm Şehirler</option>
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
          Ara
        </button>
      </div>
    </form>
  );
}
