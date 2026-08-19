"use client";

import Link from "next/link";
import { useState } from "react";
import { AtSign, BadgeCheck, BriefcaseBusiness, CalendarCheck2, Camera, Clock3, ExternalLink, Images, MapPin, MessageCircle, Phone, Share2, Sparkles, Star, UsersRound } from "lucide-react";
import { toast } from "sonner";
import type { Business, DaySchedule } from "@/types/business";
import { useBusinessContext } from "@/features/businesses/business-context";

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
  const { businesses } = useBusinessContext();
  const [failedCoverUrl, setFailedCoverUrl] = useState<string | null>(null);
  const { open, closing } = todaySchedule(workingHours);
  const coverUrl = business.coverUrl || business.galleryUrls?.[0];
  const isOwner = businesses.some((item) => item.id === business.id);

  async function shareStore() {
    const url = window.location.href;
    try {
      if (navigator.share) await navigator.share({ title: business.name, text: `${business.name} mağazasını incele ve randevu al.`, url });
      else {
        await navigator.clipboard.writeText(url);
        toast.success("Mağaza bağlantısı kopyalandı.");
      }
    } catch (error) {
      if ((error as DOMException).name !== "AbortError") toast.error("Bağlantı paylaşılamadı.");
    }
  }

  const categoryLabel = business.category?.replaceAll("-", " ") || "Profesyonel hizmet";

  return (
    <section className="storefront-hero">
      <div className="storefront-cover">
        {coverUrl && failedCoverUrl !== coverUrl ? (
          <img src={coverUrl} alt={`${business.name} mağaza kapağı`} onError={() => setFailedCoverUrl(coverUrl)} />
        ) : (
          <div className="storefront-cover-fallback"><Sparkles size={42}/><span>{business.name.charAt(0).toLocaleUpperCase("tr-TR")}</span></div>
        )}
        <div className="storefront-cover-shade"/>
        <div className="storefront-cover-actions">
          {isOwner && <Link href="/dashboard" className="storefront-owner-link"><BriefcaseBusiness size={15}/><span>Yönetim paneli</span><ExternalLink size={13}/></Link>}
          <button type="button" className="storefront-share" onClick={shareStore} aria-label="Mağazayı paylaş"><Share2 size={16}/><span>Paylaş</span></button>
        </div>
        <div className="storefront-cover-status">
          {business.isVerified && <span className="is-verified"><BadgeCheck size={14}/> Doğrulanmış</span>}
          <span className={open ? "is-open" : "is-closed"}><i/>{open ? `Açık${closing ? ` · ${closing}'e kadar` : ""}` : "Şu anda kapalı"}</span>
        </div>
      </div>

      <div className="storefront-profile">
        <div className="storefront-profile-main">
          <div className="storefront-logo">
            {business.logoUrl ? <img src={business.logoUrl} alt={`${business.name} logosu`}/> : <span>{business.name.charAt(0).toLocaleUpperCase("tr-TR")}</span>}
          </div>
          <div className="storefront-identity">
            <span className="storefront-category"><Sparkles size={13}/>{categoryLabel}</span>
            <h1>{business.name}</h1>
            <div className="storefront-meta">
              <span><MapPin size={15}/>{[business.district, business.city].filter(Boolean).join(", ")}</span>
              {(business.reviewCount ?? 0) > 0 && <span className="storefront-rating"><Star size={14} fill="currentColor"/><b>{(business.rating ?? 0).toFixed(1)}</b><small>{business.reviewCount} değerlendirme</small></span>}
            </div>
          </div>
          <div className="storefront-hero-actions">
            {business.phone && <a href={`tel:${business.phone}`} className="storefront-call"><Phone size={17}/><span>Ara</span></a>}
            <Link href={bookingHref} className="storefront-book-now"><CalendarCheck2 size={18}/><span>Randevu al</span><ExternalLink size={14}/></Link>
          </div>
        </div>

        {business.description && <p className="storefront-description">{business.description}</p>}

        <div className="storefront-proof-grid">
          <article><i><Sparkles size={18}/></i><span><b>{serviceCount}</b><small>Aktif hizmet</small></span></article>
          <article><i><UsersRound size={18}/></i><span><b>{staffCount}</b><small>Uzman ekip</small></span></article>
          <article><i><Images size={18}/></i><span><b>{galleryCount}</b><small>Mağaza görseli</small></span></article>
          <article><i><Clock3 size={18}/></i><span><b>7/24</b><small>Online randevu</small></span></article>
        </div>

        {business.socialMedia && Object.values(business.socialMedia).some(Boolean) && (
          <div className="storefront-socials">
            <small>SOSYALDE TAKİP ET</small>
            {business.socialMedia.instagram && <a href={`https://instagram.com/${business.socialMedia.instagram}`} target="_blank" rel="noopener noreferrer"><Camera size={15}/> Instagram</a>}
            {business.socialMedia.facebook && <a href={business.socialMedia.facebook} target="_blank" rel="noopener noreferrer"><AtSign size={15}/> Facebook</a>}
            {business.socialMedia.whatsapp && <a href={`https://wa.me/${business.socialMedia.whatsapp}`} target="_blank" rel="noopener noreferrer"><MessageCircle size={15}/> WhatsApp</a>}
          </div>
        )}
      </div>
    </section>
  );
}
