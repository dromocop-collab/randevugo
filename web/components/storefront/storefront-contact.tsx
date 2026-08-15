"use client";

import type { Business } from "@/types/business";

interface Props {
  business: Business;
}

function SocialLink({ url, label, icon }: { url: string; label: string; icon: React.ReactNode }) {
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-xs text-[var(--text-2)] transition hover:bg-[var(--field-bg-hover)]"
      title={label}
    >
      {icon}
      {label}
    </a>
  );
}

export function StorefrontContact({ business }: Props) {
  const social = business.socialMedia;

  return (
    <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] p-5 shadow-lg shadow-[var(--shadow-soft)] backdrop-blur-xl">
      <h2 className="text-lg font-semibold text-[var(--text-1)]">İletişim</h2>
      <div className="mt-4 space-y-3">
        {/* Address */}
        <div className="flex items-start gap-3 text-sm text-[var(--text-2)]">
          <svg className="mt-0.5 h-4 w-4 shrink-0 text-[var(--text-3)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <span>{business.address}, {business.district}, {business.city}</span>
        </div>

        {/* Phone */}
        <div className="flex items-center gap-3 text-sm text-[var(--text-2)]">
          <svg className="h-4 w-4 shrink-0 text-[var(--text-3)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
          </svg>
          <a href={`tel:${business.phone}`} className="hover:text-[var(--accent)]">{business.phone}</a>
        </div>

        {/* Email */}
        <div className="flex items-center gap-3 text-sm text-[var(--text-2)]">
          <svg className="h-4 w-4 shrink-0 text-[var(--text-3)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
          <a href={`mailto:${business.email}`} className="hover:text-[var(--accent)]">{business.email}</a>
        </div>

        {/* Website */}
        {business.website && (
          <div className="flex items-center gap-3 text-sm text-[var(--text-2)]">
            <svg className="h-4 w-4 shrink-0 text-[var(--text-3)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
            </svg>
            <a href={business.website} target="_blank" rel="noopener noreferrer" className="hover:text-[var(--accent)]">{business.website}</a>
          </div>
        )}

        {/* Social Media */}
        {social && Object.values(social).some(Boolean) && (
          <div className="mt-4 flex flex-wrap gap-2">
            {social.instagram && (
              <SocialLink url={`https://instagram.com/${social.instagram}`} label="Instagram" icon={<span className="text-sm">📸</span>} />
            )}
            {social.facebook && (
              <SocialLink url={social.facebook} label="Facebook" icon={<span className="text-sm">👥</span>} />
            )}
            {social.whatsapp && (
              <SocialLink url={`https://wa.me/${social.whatsapp}`} label="WhatsApp" icon={<span className="text-sm">💬</span>} />
            )}
          </div>
        )}

        {/* Map */}
        <div className="mt-4 overflow-hidden rounded-xl border border-[var(--border)]">
          <a
            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${business.address}, ${business.district}, ${business.city}`)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 bg-[var(--surface-2)] py-4 text-sm text-[var(--text-2)] transition hover:bg-[var(--field-bg-hover)]"
          >
            <svg className="h-5 w-5 text-[var(--accent)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
            </svg>
            Haritada Göster — Yol Tarifi Al
          </a>
        </div>
      </div>
    </section>
  );
}
