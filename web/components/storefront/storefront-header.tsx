"use client";

import Link from "next/link";
import { useState } from "react";
import type { Business, DaySchedule } from "@/types/business";
import { useAuth } from "@/hooks/use-auth";
import { ArrowLeft, BadgeCheck, MapPin, Phone, Star } from "lucide-react";

interface StorefrontHeaderProps {
  business: Business;
  workingHours: DaySchedule[];
}

function isOpenNow(workingHours: DaySchedule[]): boolean {
  const now = new Date();
  const day = now.getDay();
  const currentTime = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
  const schedule = workingHours.find((h) => h.day === day && h.isOpen);
  if (!schedule) return false;
  return currentTime >= schedule.start && currentTime <= schedule.end;
}

function getClosingTime(workingHours: DaySchedule[]): string | null {
  const now = new Date();
  const day = now.getDay();
  const schedule = workingHours.find((h) => h.day === day && h.isOpen);
  return schedule ? schedule.end : null;
}

export function StorefrontHeader({ business, workingHours }: StorefrontHeaderProps) {
  const { user, status } = useAuth();
  const [failedCoverUrl, setFailedCoverUrl] = useState<string | null>(null);
  const open = isOpenNow(workingHours);
  const closingTime = getClosingTime(workingHours);
  const coverUrl = business.coverUrl || business.galleryUrls?.[0];

  return (
    <div className="storefront-hero relative overflow-hidden rounded-[2rem] border border-[var(--border)] bg-[var(--surface-1)] shadow-2xl shadow-[var(--shadow-hard)]">
      {/* Cover Image */}
      <div className="relative h-52 overflow-hidden sm:h-72 lg:h-80">
        {coverUrl && failedCoverUrl !== coverUrl ? (
          <img
            src={coverUrl}
            alt={business.name}
            onError={() => setFailedCoverUrl(coverUrl)}
            className="h-full w-full object-cover transition duration-700 hover:scale-[1.025]"
          />
        ) : (
          <div className="flex h-full items-center justify-center bg-[linear-gradient(135deg,var(--accent)/15,var(--accent-3)/15)]">
            <span className="text-8xl font-black text-[var(--accent)]/10">
              {business.name.charAt(0).toUpperCase()}
            </span>
          </div>
        )}
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

        {/* Status badge on cover */}
        <div className="absolute right-4 top-4 flex items-center gap-2">
          {status === "authenticated" && user && (
            <Link href="/dashboard" className="storefront-owner-link">
              <ArrowLeft size={14} /> İşletme paneline dön
            </Link>
          )}
          {business.isVerified && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/90 px-3 py-1.5 text-[11px] font-bold text-white backdrop-blur-sm shadow-lg">
              <BadgeCheck size={14} /> Doğrulanmış
            </span>
          )}
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-bold backdrop-blur-sm shadow-lg ${
              open
                ? "bg-emerald-500/90 text-white"
                : "bg-rose-500/90 text-white"
            }`}
          >
            <span className={`h-2 w-2 rounded-full ${open ? "bg-white animate-pulse" : "bg-white/60"}`} />
            {open ? "Açık" : "Kapalı"}
            {open && closingTime && (
              <span className="text-white/80">· {closingTime}&apos;e kadar</span>
            )}
          </span>
        </div>

        {/* Category tag on cover */}
        <div className="absolute bottom-4 right-4">
          <span className="rounded-full bg-white/10 px-3 py-1.5 text-[11px] font-medium text-white/90 backdrop-blur-sm">
            {business.category}
          </span>
        </div>
      </div>

      {/* Profile section */}
      <div className="relative px-5 pb-6 sm:px-8">
        <div className="-mt-14 flex flex-col gap-4 sm:-mt-16 sm:flex-row sm:items-end">
          {/* Logo */}
          <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-2xl border-4 border-[var(--surface-1)] bg-[var(--surface-1)] shadow-2xl sm:h-28 sm:w-28 lg:h-32 lg:w-32">
            {business.logoUrl ? (
              <img
                src={business.logoUrl}
                alt=""
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-[linear-gradient(135deg,var(--accent),var(--accent-3))]">
                <span className="text-3xl font-extrabold text-white">
                  {business.name.charAt(0).toUpperCase()}
                </span>
              </div>
            )}
          </div>

          {/* Info */}
          <div className="flex-1 pb-1">
            <h1 className="text-2xl font-extrabold tracking-tight text-[var(--text-1)] sm:text-3xl">
              {business.name}
            </h1>
            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1.5">
              <span className="flex items-center gap-1.5 text-sm text-[var(--text-2)]">
                <MapPin size={15} /> {business.district}, {business.city}
              </span>
              {(business.reviewCount ?? 0) > 0 && (
                <span className="flex items-center gap-1.5 text-sm">
                  <span className="flex items-center gap-0.5 rounded-lg bg-amber-500/10 px-2 py-0.5">
                    <Star size={13} fill="currentColor" />
                    <span className="font-bold text-amber-600">
                      {(business.rating ?? 0).toFixed(1)}
                    </span>
                  </span>
                  <span className="text-[var(--text-3)]">
                    ({business.reviewCount} değerlendirme)
                  </span>
                </span>
              )}
              {business.phone && (
                <a href={`tel:${business.phone}`} className="flex items-center gap-1 text-sm text-[var(--accent)] hover:underline">
                  <Phone size={14} /> {business.phone}
                </a>
              )}
            </div>
          </div>
        </div>

        {/* Description */}
        {business.description && (
          <p className="mt-4 rounded-xl bg-[var(--surface-2)]/50 p-4 text-sm leading-relaxed text-[var(--text-2)]">
            {business.description}
          </p>
        )}

        {/* Social Media */}
        {business.socialMedia && Object.values(business.socialMedia).some(Boolean) && (
          <div className="mt-4 flex flex-wrap gap-2">
            {business.socialMedia.instagram && (
              <a href={`https://instagram.com/${business.socialMedia.instagram}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--surface-1)] px-3 py-1.5 text-xs font-medium text-[var(--text-2)] transition hover:border-pink-300 hover:text-pink-600">
                📸 Instagram
              </a>
            )}
            {business.socialMedia.facebook && (
              <a href={business.socialMedia.facebook} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--surface-1)] px-3 py-1.5 text-xs font-medium text-[var(--text-2)] transition hover:border-blue-300 hover:text-blue-600">
                👤 Facebook
              </a>
            )}
            {business.socialMedia.twitter && (
              <a href={`https://x.com/${business.socialMedia.twitter}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--surface-1)] px-3 py-1.5 text-xs font-medium text-[var(--text-2)] transition hover:border-sky-300 hover:text-sky-600">
                🐦 Twitter
              </a>
            )}
            {business.socialMedia.tiktok && (
              <a href={`https://tiktok.com/@${business.socialMedia.tiktok}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--surface-1)] px-3 py-1.5 text-xs font-medium text-[var(--text-2)] transition hover:border-gray-400 hover:text-gray-700">
                🎵 TikTok
              </a>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
