"use client";

import Link from "@/i18n/link";
import Image from "next/image";
import { useState } from "react";
import { AtSign, BadgeCheck, BriefcaseBusiness, CalendarCheck2, Camera, Clock3, ExternalLink, Images, MapPin, MessageCircle, Phone, Share2, Sparkles, Star, UsersRound } from "lucide-react";
import { toast } from "sonner";
import type { Business, DaySchedule } from "@/types/business";
import { useBusinessContext } from "@/features/businesses/business-context";
import { useT } from "@/i18n/client";

interface StorefrontHeaderProps {
  business: Business;
  workingHours: DaySchedule[];
  serviceCount: number;
  staffCount: number;
  galleryCount: number;
  bookingHref: string;
}

function todaySchedule(workingHours: DaySchedule[]) {
  const now = new Date();
  const schedule = workingHours.find((item) => item.day === now.getDay() && item.isOpen);
  if (!schedule) return { open: false, closing: null as string | null };
  const current = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
  return { open: current >= schedule.start && current <= schedule.end, closing: schedule.end };
}

export function StorefrontHeader({ business, workingHours, serviceCount, staffCount, galleryCount, bookingHref }: StorefrontHeaderProps) {
  const t = useT();
  const { businesses } = useBusinessContext();
  const [failedCoverUrl, setFailedCoverUrl] = useState<string | null>(null);
  const { open, closing } = todaySchedule(workingHours);
  const coverUrl = business.coverUrl || business.galleryUrls?.[0];
  const isOwner = businesses.some((item) => item.id === business.id);

  async function shareStore() {
    const url = window.location.href;
    try {
      if (navigator.share) await navigator.share({ title: business.name, text: t("{name} mağazasını incele ve randevu al.", { name: business.name }), url });
      else {
        await navigator.clipboard.writeText(url);
        toast.success(t("Mağaza bağlantısı kopyalandı."));
      }
    } catch (error) {
      if ((error as DOMException).name !== "AbortError") toast.error(t("Bağlantı paylaşılamadı."));
    }
  }

  const categoryLabel = business.category?.replaceAll("-", " ") || t("Profesyonel hizmet");

  return (
    <section className="storefront-hero">
      <div className="storefront-cover">
        {coverUrl && failedCoverUrl !== coverUrl ? (
          <Image src={coverUrl} alt={t("{name} mağaza kapağı", { name: business.name })} fill priority sizes="(max-width: 900px) 100vw, 1200px" onError={() => setFailedCoverUrl(coverUrl)} />
        ) : (
          <div className="storefront-cover-fallback"><Sparkles size={42}/><span>{business.name.charAt(0).toLocaleUpperCase("tr-TR")}</span></div>
        )}
        <div className="storefront-cover-shade"/>
        <div className="storefront-cover-actions">
          {isOwner && <Link href="/dashboard" className="storefront-owner-link"><BriefcaseBusiness size={15}/><span>{t("Yönetim paneli")}</span><ExternalLink size={13}/></Link>}
          <button type="button" className="storefront-share" onClick={shareStore} aria-label={t("Mağazayı paylaş")}><Share2 size={16}/><span>{t("Paylaş")}</span></button>
        </div>
        <div className="storefront-cover-status">
          {business.isVerified && <span className="is-verified"><BadgeCheck size={14}/> {t("Doğrulanmış")}</span>}
          <span className={open ? "is-open" : "is-closed"}><i/>{open ? (closing ? t("Açık · {time}'e kadar", { time: closing }) : t("Açık")) : t("Şu anda kapalı")}</span>
        </div>
      </div>

      <div className="storefront-profile">
        <div className="storefront-profile-main">
          <div className="storefront-logo">
            {business.logoUrl ? <Image src={business.logoUrl} alt={t("{name} logosu", { name: business.name })} fill sizes="134px"/> : <span>{business.name.charAt(0).toLocaleUpperCase("tr-TR")}</span>}
          </div>
          <div className="storefront-identity">
            <span className="storefront-category"><Sparkles size={13}/>{categoryLabel}</span>
            <h1>{business.name}</h1>
            <div className="storefront-meta">
              <span><MapPin size={15}/>{[business.district, business.city].filter(Boolean).join(", ")}</span>
              {(business.reviewCount ?? 0) > 0 && <span className="storefront-rating"><Star size={14} fill="currentColor"/><b>{(business.rating ?? 0).toFixed(1)}</b><small>{t("{count} değerlendirme", { count: business.reviewCount ?? 0 })}</small></span>}
            </div>
          </div>
          <div className="storefront-hero-actions">
            {business.phone && <a href={`tel:${business.phone}`} className="storefront-call"><Phone size={17}/><span>{t("Ara")}</span></a>}
            <Link href={bookingHref} className="storefront-book-now"><CalendarCheck2 size={18}/><span>{t("Randevu al")}</span><ExternalLink size={14}/></Link>
          </div>
        </div>

        {business.description && <p className="storefront-description">{business.description}</p>}

        <div className="storefront-proof-grid">
          <article><i><Sparkles size={18}/></i><span><b>{serviceCount}</b><small>{t("Aktif hizmet")}</small></span></article>
          <article><i><UsersRound size={18}/></i><span><b>{staffCount}</b><small>{t("Uzman ekip")}</small></span></article>
          <article><i><Images size={18}/></i><span><b>{galleryCount}</b><small>{t("Mağaza görseli")}</small></span></article>
          <article><i><Clock3 size={18}/></i><span><b>7/24</b><small>{t("Online randevu")}</small></span></article>
        </div>

        {business.socialMedia && Object.values(business.socialMedia).some(Boolean) && (
          <div className="storefront-socials">
            <small>{t("SOSYALDE TAKİP ET")}</small>
            {business.socialMedia.instagram && <a href={`https://instagram.com/${business.socialMedia.instagram}`} target="_blank" rel="noopener noreferrer"><Camera size={15}/> Instagram</a>}
            {business.socialMedia.facebook && <a href={business.socialMedia.facebook} target="_blank" rel="noopener noreferrer"><AtSign size={15}/> Facebook</a>}
            {business.socialMedia.whatsapp && <a href={`https://wa.me/${business.socialMedia.whatsapp}`} target="_blank" rel="noopener noreferrer"><MessageCircle size={15}/> WhatsApp</a>}
          </div>
        )}
      </div>
    </section>
  );
}
