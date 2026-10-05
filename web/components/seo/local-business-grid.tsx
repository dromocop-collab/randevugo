import Image from "next/image";
import Link from "next/link";
import { ArrowRight, MapPin, Star, Store } from "lucide-react";
import { categoryDisplayName } from "@/lib/seo/categories";
import { businessPath } from "@/lib/seo/site";
import styles from "./seo-blocks.module.css";

export type GridBusiness = {
  id: string;
  slug: string;
  name: string;
  category: string;
  city: string;
  district?: string;
  description?: string;
  coverUrl?: string;
  logoUrl?: string;
  rating?: number;
  reviewCount?: number;
};

/** Sunucuda çizilen, taranabilir işletme kartları. Kart başlıkları sayfa hiyerarşisine göre h3'tür. */
export function LocalBusinessGrid({ businesses, headingLevel = "h3" }: { businesses: GridBusiness[]; headingLevel?: "h2" | "h3" }) {
  const Heading = headingLevel;
  if (businesses.length === 0) {
    return <div className={styles.empty}><Store aria-hidden="true" /><b>Yeni işletmeler hazırlanıyor</b><p>Bu alanda yayınlanan işletme olduğunda liste otomatik güncellenir.</p></div>;
  }
  return (
    <ul className={styles.grid}>
      {businesses.map((business) => {
        const image = business.coverUrl || business.logoUrl;
        const place = [business.district, business.city].filter(Boolean).join(", ");
        const rated = (business.reviewCount ?? 0) > 0 && (business.rating ?? 0) > 0;
        return (
          <li key={business.id}>
            <Link href={businessPath(business.slug)} className={styles.card}>
              <div className={styles.cardMedia}>
                {image
                  ? <Image src={image} alt={`${business.name}${place ? ` – ${place}` : ""}`} fill sizes="(max-width: 700px) 100vw, (max-width: 1100px) 50vw, 380px" />
                  : <Store size={40} aria-hidden="true" />}
              </div>
              <div className={styles.cardBody}>
                <span className={styles.cardCategory}>{categoryDisplayName(business.category)}</span>
                <Heading className={styles.cardTitle}>{business.name}<ArrowRight size={18} aria-hidden="true" /></Heading>
                <p className={styles.cardText}>{business.description || `${business.name} hizmetlerini, fiyatlarını ve uygun randevu saatlerini inceleyin.`}</p>
                <div className={styles.cardMeta}>
                  <span><MapPin size={14} aria-hidden="true" />{place}</span>
                  {rated && <span className={styles.cardRating} aria-label={`5 üzerinden ${business.rating!.toFixed(1)} puan`}><Star size={14} fill="currentColor" aria-hidden="true" />{business.rating!.toFixed(1)} <small>({business.reviewCount})</small></span>}
                </div>
              </div>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
