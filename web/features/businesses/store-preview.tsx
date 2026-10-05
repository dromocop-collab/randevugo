"use client";

import Image from "next/image";
import { CalendarCheck2, Clock3, Globe2, MapPin, Phone, Star } from "lucide-react";
import { formatDuration, formatTry, storeDisplayUrl } from "@/features/businesses/setup-helpers";
import p from "./store-preview.module.css";

export interface StorePreviewProps {
  name?: string;
  categoryLabel?: string;
  image?: string;
  emoji?: string;
  accent?: string;
  city?: string;
  district?: string;
  slug?: string;
  allowOnlineBooking?: boolean;
  services: Array<{ id: string; name: string; durationMinutes: number; price: number }>;
  /** Mobil katlanır kart içinde daha sıkı yerleşim. */
  compact?: boolean;
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "SR";
  return parts.slice(0, 2).map((part) => part[0]!.toLocaleUpperCase("tr-TR")).join("");
}

/** Kayıt sırasında canlı güncellenen mağaza vitrini önizlemesi (etkileşimsiz). */
export function StorePreview({ name, categoryLabel, image, emoji, accent = "#1f7a4a", city, district, slug, allowOnlineBooking = true, services, compact }: StorePreviewProps) {
  const title = name?.trim() || "İşletmenin adı";
  const place = [district?.trim(), city?.trim()].filter(Boolean).join(", ");
  return (
    <div className={`${p.card} ${compact ? p.compact : ""}`} aria-label="Mağaza önizlemesi" role="group">
      <div className={p.browser} aria-hidden="true"><i /><i /><i /><span><Globe2 size={11} />{storeDisplayUrl(slug ?? "")}</span></div>
      <div className={p.cover} style={{ ["--accent" as string]: accent }}>
        {image ? <Image src={image} alt="" fill sizes="(max-width: 1180px) 92vw, 340px" className={p.coverImg} /> : <span className={p.coverEmoji} aria-hidden="true">{emoji ?? "📅"}</span>}
        <span className={p.coverShade} />
        {categoryLabel ? <span className={p.badge}>{categoryLabel}</span> : null}
      </div>
      <div className={p.body}>
        <div className={p.identity}>
          <span className={p.logo} style={{ ["--accent" as string]: accent }} aria-hidden="true">{initials(name ?? "")}</span>
          <div className={p.titles}>
            <b className={name?.trim() ? "" : p.placeholder}>{title}</b>
            <span><MapPin size={12} aria-hidden="true" />{place || "Şehir, ilçe"}</span>
          </div>
          <span className={p.rating}><Star size={11} aria-hidden="true" /> Yeni</span>
        </div>
        <ul className={p.services}>
          {services.map((service) => (
            <li key={service.id}>
              <span><b>{service.name}</b><small><Clock3 size={11} aria-hidden="true" />{formatDuration(service.durationMinutes)}</small></span>
              <em>{formatTry(service.price)}</em>
            </li>
          ))}
        </ul>
        <span className={p.cta} aria-hidden="true">{allowOnlineBooking ? <><CalendarCheck2 size={16} /> Randevu Al</> : <><Phone size={16} /> Randevu için ara</>}</span>
      </div>
    </div>
  );
}
