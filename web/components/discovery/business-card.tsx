"use client";

import Link from "next/link";
import type { Business } from "@/types/business";

const CATEGORY_LABELS: Record<string, string> = {
  kuafor: "Kuaför",
  berber: "Berber",
  guzellik: "Güzellik Merkezi",
  nail: "Nail Studio",
  spor: "Spor / PT",
  danismanlik: "Danışmanlık",
  veteriner: "Veteriner",
  servis: "Servis",
  saglik: "Sağlık",
  egitim: "Eğitim",
  diger: "Diğer",
};

function StarRating({ rating, size = 14 }: { rating: number; size?: number }) {
  return (
    <span className="inline-flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <svg
          key={i}
          width={size}
          height={size}
          viewBox="0 0 20 20"
          fill={i < Math.round(rating) ? "currentColor" : "none"}
          stroke="currentColor"
          strokeWidth={1.5}
          className={
            i < Math.round(rating)
              ? "text-amber-400"
              : "text-[var(--text-3)] opacity-40"
          }
        >
          <path d="M10 1l2.39 4.84 5.34.78-3.87 3.77.91 5.32L10 13.27 5.23 15.71l.91-5.32L2.27 6.62l5.34-.78L10 1z" />
        </svg>
      ))}
    </span>
  );
}

interface BusinessCardProps {
  business: Business;
}

export function BusinessCard({ business }: BusinessCardProps) {
  const categoryLabel =
    CATEGORY_LABELS[business.category] ?? business.category;

  return (
    <Link href={`/${business.slug}`} className="group block">
      <article className="premium-card relative overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] shadow-lg shadow-[var(--shadow-soft)] backdrop-blur-xl transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-[var(--shadow-hard)]">
        {/* Cover Image */}
        <div className="relative h-40 overflow-hidden bg-gradient-to-br from-[var(--accent)]/10 to-[var(--accent-3)]/10">
          {business.coverUrl ? (
            <img
              src={business.coverUrl}
              alt={business.name}
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full items-center justify-center">
              <span className="text-4xl font-bold text-[var(--accent)]/30">
                {business.name.charAt(0)}
              </span>
            </div>
          )}

          {/* Category Badge */}
          <span className="absolute left-3 top-3 rounded-lg bg-black/50 px-2.5 py-1 text-xs font-medium text-white backdrop-blur-sm">
            {categoryLabel}
          </span>

          {/* Logo */}
          {business.logoUrl && (
            <div className="absolute -bottom-5 left-4 h-12 w-12 overflow-hidden rounded-xl border-2 border-white bg-white shadow-md">
              <img
                src={business.logoUrl}
                alt=""
                className="h-full w-full object-cover"
              />
            </div>
          )}
        </div>

        {/* Content */}
        <div className={`p-4 ${business.logoUrl ? "pt-8" : "pt-4"}`}>
          <h3 className="text-base font-semibold text-[var(--text-1)] line-clamp-1">
            {business.name}
          </h3>

          <div className="mt-1.5 flex items-center gap-2">
            <StarRating rating={business.rating ?? 0} />
            {(business.reviewCount ?? 0) > 0 && (
              <span className="text-xs text-[var(--text-3)]">
                ({business.reviewCount})
              </span>
            )}
          </div>

          <div className="mt-2 flex items-center gap-1.5 text-xs text-[var(--text-3)]">
            <svg
              className="h-3.5 w-3.5 shrink-0"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
            <span className="line-clamp-1">
              {business.district}, {business.city}
            </span>
          </div>

          {/* CTA */}
          <div className="mt-4 flex items-center justify-between">
            <span className="rounded-lg bg-[var(--accent)]/10 px-2.5 py-1 text-xs font-semibold text-[var(--accent)]">
              Randevu Al
            </span>
            <svg
              className="h-4 w-4 text-[var(--text-3)] transition-transform duration-300 group-hover:translate-x-1"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 5l7 7-7 7"
              />
            </svg>
          </div>
        </div>
      </article>
    </Link>
  );
}
