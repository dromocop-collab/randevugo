import Link from "@/i18n/link";
import Image from "next/image";
import type { CSSProperties } from "react";
import { ArrowUpRight, MapPin, Star } from "lucide-react";
import type { Business } from "@/types/business";
import { canonicalBusinessCategory } from "@/lib/business-categories";
import { CATEGORY_CATALOG } from "@/components/marketing/category-catalog";
import type { TFunction } from "@/i18n/config";
import styles from "./home.module.css";

/**
 * Ana sayfa vitrin kartı: kapak, kategori, gerçek puan (yoksa "Yeni") ve konum.
 * Hem sunucu hem istemci bileşenlerinden çizilir; çeviri fonksiyonu (t) ve Intl dili çağırandan gelir.
 */
export function FeaturedBusinessCard({ business, index = 0, t, intlLocale }: { business: Business; index?: number; t: TFunction; intlLocale: string }) {
  const slug = canonicalBusinessCategory(business.category);
  const catalog = CATEGORY_CATALOG.find((item) => item.slug === slug);
  const cover = business.coverUrl?.trim() || catalog?.image;
  const reviewCount = business.reviewCount ?? 0;
  const rating = Number(business.rating ?? 0);
  const place = [business.district, business.city].filter(Boolean).join(", ");

  return <Link href={`/isletme/${business.slug}`} className={styles.bizCard} style={{ "--i": index, "--accent": catalog?.accent ?? "#1f7a4a" } as CSSProperties}>
    <span className={styles.bizCover}>
      {cover ? <Image src={cover} alt={business.coverUrl ? t("{name} işletme görseli", { name: business.name }) : ""} fill sizes="(max-width: 720px) 78vw, 300px" /> : <b aria-hidden="true">{business.name.charAt(0)}</b>}
      <span className={styles.bizCategory}>{catalog ? t(catalog.label) : business.category}</span>
      {business.logoUrl && <span className={styles.bizLogo}><Image src={business.logoUrl} alt="" fill sizes="44px" /></span>}
    </span>
    <span className={styles.bizBody}>
      <strong>{business.name}</strong>
      <span className={styles.bizMeta}>
        {reviewCount > 0 ? <span className={styles.bizRating}><Star size={13} fill="currentColor" aria-hidden="true" /> <b>{rating.toLocaleString(intlLocale, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}</b> <small>{t("({formatted} yorum)", { count: reviewCount, formatted: reviewCount.toLocaleString(intlLocale) })}</small></span> : <span className={styles.bizNew}>{t("Yeni işletme")}</span>}
      </span>
      {place && <span className={styles.bizPlace}><MapPin size={13} aria-hidden="true" /> {place}</span>}
      <span className={styles.bizCta}>{t("Randevu al")} <ArrowUpRight size={15} aria-hidden="true" /></span>
    </span>
  </Link>;
}
