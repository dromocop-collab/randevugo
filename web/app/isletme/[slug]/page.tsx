"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { ErrorState, LoadingState } from "@/components/ui/states";
import { StorefrontHeader } from "@/components/storefront/storefront-header";
import { StorefrontServices } from "@/components/storefront/storefront-services";
import { StorefrontStaff } from "@/components/storefront/storefront-staff";
import { StorefrontReviews } from "@/components/storefront/storefront-reviews";
import { StorefrontGallery } from "@/components/storefront/storefront-gallery";
import { StorefrontHours } from "@/components/storefront/storefront-hours";
import { StorefrontContact } from "@/components/storefront/storefront-contact";
import {
  getBusinessBySlug,
  listBusinessWorkingHours,
} from "@/features/businesses/business-repository";
import { listServices } from "@/features/services/service-repository";
import { listStaff } from "@/features/staff/staff-repository";
import { listBusinessReviews } from "@/features/reviews/review-repository";
import { listServiceCategories } from "@/features/services/service-category-repository";
import type { Business, DaySchedule } from "@/types/business";
import type { Service } from "@/types/service";
import type { Staff } from "@/types/staff";
import type { Review } from "@/types/review";
import type { ServiceCategory } from "@/types/service-category";

type Tab = "hizmetler" | "ekip" | "galeri" | "yorumlar" | "iletisim";

const TAB_CONFIG: { key: Tab; label: string; icon: string }[] = [
  { key: "hizmetler", label: "Hizmetler", icon: "📋" },
  { key: "ekip", label: "Ekip", icon: "👥" },
  { key: "galeri", label: "Galeri", icon: "🖼️" },
  { key: "yorumlar", label: "Yorumlar", icon: "⭐" },
  { key: "iletisim", label: "İletişim", icon: "📍" },
];

export default function BusinessProfilePage() {
  const params = useParams<{ slug: string }>();
  const router = useRouter();
  const [business, setBusiness] = useState<Business | null>(null);
  const [workingHours, setWorkingHours] = useState<DaySchedule[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [serviceCategories, setServiceCategories] = useState<ServiceCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>("hizmetler");

  useEffect(() => {
    const slug = params.slug;
    if (!slug) return;

    let cancelled = false;

    getBusinessBySlug(slug)
      .then(async (row) => {
        if (cancelled) return;
        if (!row) {
          setError("İşletme bulunamadı.");
          return;
        }
        if (row.status !== "active" && !row.isPublished) {
          setError("Bu işletme şu anda aktif değil.");
          return;
        }

        setBusiness(row);

        const [schedules, serviceRows, staffRows, reviewRows, catRows] =
          await Promise.all([
            listBusinessWorkingHours(row.id),
            listServices(row.id, true),
            listStaff(row.id, true),
            listBusinessReviews(row.id).catch(() => [] as Review[]),
            listServiceCategories(row.id).catch(() => [] as ServiceCategory[]),
          ]);

        if (cancelled) return;
        setWorkingHours(schedules);
        setServices(serviceRows);
        setStaff(staffRows);
        setReviews(reviewRows);
        setServiceCategories(catRows);
      })
      .catch((e) => {
        if (cancelled) return;
        setError((e as Error).message);
      })
      .finally(() => {
        if (cancelled) return;
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [params.slug]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <LoadingState
          title="İşletme sayfası yükleniyor"
          description="Bilgiler getiriliyor..."
        />
      </div>
    );
  }

  if (error || !business) {
    return (
      <main className="mx-auto w-full max-w-4xl px-4 py-20">
        <ErrorState
          title="Sayfa Açılamadı"
          description={error ?? "İşletme kaydı bulunamadı."}
        />
        <div className="mt-6 text-center">
          <Link
            href="/kesfet"
            className="inline-flex items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface-1)] px-5 py-2.5 text-sm font-medium text-[var(--accent)] transition hover:bg-[var(--accent)]/5"
          >
            ← İşletmelere Göz At
          </Link>
        </div>
      </main>
    );
  }

  const tabCounts: Record<Tab, number | undefined> = {
    hizmetler: services.length,
    ekip: staff.length,
    galeri: (business.galleryUrls ?? []).length,
    yorumlar: business.reviewCount ?? 0,
    iletisim: undefined,
  };

  return (
    <div className="min-h-screen bg-[var(--bg-1)]">
      {/* ━━━ HEADER ━━━ */}
      <header className="sticky top-0 z-50 border-b border-[var(--border)]/50 bg-[var(--bg-1)]/70 backdrop-blur-2xl">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-3 lg:px-8">
          <Link href="/" className="flex items-center gap-2.5 group">
            <Image src="/logo.png" alt="SeninRandevun" width={36} height={36} className="rounded-xl shadow-lg transition group-hover:scale-105" />
            <span className="text-lg font-extrabold tracking-tight text-[var(--text-1)]">
              Senin<span className="text-[var(--accent)]">Randevun</span>
            </span>
          </Link>
          <div className="flex items-center gap-3">
            <Link
              href="/kesfet"
              className="hidden rounded-lg px-4 py-2 text-sm font-medium text-[var(--text-2)] transition hover:bg-[var(--surface-2)] hover:text-[var(--text-1)] sm:inline-flex"
            >
              Keşfet
            </Link>
            <Link
              href={`/isletme/${params.slug}/randevu`}
              className="inline-flex items-center gap-2 rounded-xl bg-[linear-gradient(135deg,var(--accent),var(--accent-3))] px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-sky-500/25 transition hover:shadow-xl hover:brightness-110 active:scale-[0.97]"
            >
              📅 Randevu Al
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl px-4 pb-20 pt-0 lg:px-8">
        {/* ━━━ HERO HEADER ━━━ */}
        <StorefrontHeader business={business} workingHours={workingHours} />

        {/* ━━━ TAB NAVIGATION ━━━ */}
        <nav className="mt-6 flex gap-1 overflow-x-auto rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] p-1.5 shadow-sm">
          {TAB_CONFIG.map((tab) => {
            const count = tabCounts[tab.key];
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-1.5 whitespace-nowrap rounded-xl px-4 py-2.5 text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? "bg-[linear-gradient(135deg,var(--accent),var(--accent-3))] text-white shadow-lg shadow-sky-500/20"
                    : "text-[var(--text-3)] hover:bg-[var(--surface-2)] hover:text-[var(--text-1)]"
                }`}
              >
                <span className="text-xs">{tab.icon}</span>
                <span className="hidden sm:inline">{tab.label}</span>
                {count !== undefined && count > 0 && (
                  <span
                    className={`inline-flex h-5 min-w-[20px] items-center justify-center rounded-full px-1.5 text-[10px] font-bold ${
                      isActive
                        ? "bg-white/20 text-white"
                        : "bg-[var(--surface-3)] text-[var(--text-3)]"
                    }`}
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* ━━━ CONTENT GRID ━━━ */}
        <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_360px]">
          {/* Main Content */}
          <div className="min-w-0">
            {activeTab === "hizmetler" && (
              <StorefrontServices
                services={services}
                categories={serviceCategories}
                onSelectService={(serviceId) => {
                  router.push(`/isletme/${params.slug}/randevu?service=${serviceId}`);
                }}
              />
            )}
            {activeTab === "ekip" && <StorefrontStaff staff={staff} />}
            {activeTab === "galeri" && (business.galleryUrls ?? []).length > 0 && (
              <StorefrontGallery
                galleryUrls={business.galleryUrls!}
                businessName={business.name}
              />
            )}
            {activeTab === "galeri" && (business.galleryUrls ?? []).length === 0 && (
              <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] p-12 text-center">
                <span className="text-4xl">🖼️</span>
                <p className="mt-3 text-sm font-medium text-[var(--text-1)]">Henüz galeri görseli yok</p>
                <p className="mt-1 text-xs text-[var(--text-3)]">İşletme yakında görseller ekleyecek.</p>
              </div>
            )}
            {activeTab === "yorumlar" && (
              <StorefrontReviews
                reviews={reviews}
                averageRating={business.rating ?? 0}
                totalReviews={business.reviewCount ?? 0}
                businessId={business.id}
                onReviewSubmitted={async () => {
                  const [updatedReviews, updatedBiz] = await Promise.all([
                    listBusinessReviews(business.id).catch(() => [] as Review[]),
                    getBusinessBySlug(params.slug!).catch(() => null),
                  ]);
                  setReviews(updatedReviews);
                  if (updatedBiz) setBusiness(updatedBiz);
                }}
              />
            )}
            {activeTab === "iletisim" && (
              <StorefrontContact business={business} />
            )}
          </div>

          {/* ━━━ SIDEBAR ━━━ */}
          <div className="space-y-5">
            <div className="sticky top-20 space-y-5">
              {/* Booking CTA */}
              <section className="relative overflow-hidden rounded-2xl border border-[var(--accent)]/20 bg-[linear-gradient(135deg,var(--accent)/5,var(--accent-3)/5)] p-6 shadow-xl">
                <div className="absolute -right-8 -top-8 h-24 w-24 rounded-full bg-[var(--accent)]/10 blur-2xl" />
                <div className="relative">
                  <div className="text-center">
                    <span className="text-3xl">📅</span>
                    <p className="mt-2 text-sm font-bold text-[var(--text-1)]">Online Randevu Alın</p>
                    <p className="mt-1 text-xs text-[var(--text-3)]">7/24 hızlı ve kolay</p>
                  </div>
                  <Link
                    href={`/isletme/${params.slug}/randevu`}
                    className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-[linear-gradient(135deg,var(--accent),var(--accent-3))] py-3.5 text-sm font-bold text-white shadow-xl shadow-sky-500/25 transition hover:shadow-2xl hover:brightness-110 active:scale-[0.97]"
                  >
                    🗓️ Randevu Al
                  </Link>
                  {services.length > 0 && (
                    <div className="mt-4 flex items-center justify-between rounded-xl border border-[var(--border)] bg-[var(--surface-1)] p-3">
                      <div>
                        <p className="text-[10px] font-medium uppercase tracking-wider text-[var(--text-3)]">Hizmet</p>
                        <p className="text-xs font-bold text-[var(--text-1)]">{services.length} adet</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] font-medium uppercase tracking-wider text-[var(--text-3)]">Başlangıç</p>
                        <p className="text-xs font-bold text-[var(--accent)]">
                          {Math.min(...services.map((s) => s.price)).toLocaleString("tr-TR")} ₺
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </section>

              {/* Working Hours */}
              <StorefrontHours workingHours={workingHours} />

              {/* Quick Contact */}
              <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] p-5">
                <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-3)]">Hızlı İletişim</h3>
                <div className="mt-3 space-y-2.5">
                  {business.phone && (
                    <a href={`tel:${business.phone}`} className="flex items-center gap-2.5 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-3 text-xs font-medium text-[var(--text-1)] transition hover:border-[var(--accent)]/30">
                      <span>📞</span> {business.phone}
                    </a>
                  )}
                  {business.email && (
                    <a href={`mailto:${business.email}`} className="flex items-center gap-2.5 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-3 text-xs font-medium text-[var(--text-1)] transition hover:border-[var(--accent)]/30">
                      <span>✉️</span> {business.email}
                    </a>
                  )}
                  {business.website && (
                    <a href={business.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2.5 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-3 text-xs font-medium text-[var(--accent)] transition hover:border-[var(--accent)]/30">
                      <span>🌐</span> {business.website.replace(/^https?:\/\//, "")}
                    </a>
                  )}
                </div>
              </section>
            </div>
          </div>
        </div>
      </main>

      {/* ━━━ MOBILE BOTTOM BAR ━━━ */}
      <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-[var(--border)] bg-[var(--bg-1)]/90 p-3 backdrop-blur-2xl lg:hidden">
        <Link
          href={`/isletme/${params.slug}/randevu`}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-[linear-gradient(135deg,var(--accent),var(--accent-3))] py-3.5 text-sm font-bold text-white shadow-xl shadow-sky-500/25 transition active:scale-[0.97]"
        >
          📅 Randevu Al
          {services.length > 0 && (
            <span className="rounded-full bg-white/20 px-2 py-0.5 text-[10px]">
              {Math.min(...services.map((s) => s.price)).toLocaleString("tr-TR")} ₺&apos;den
            </span>
          )}
        </Link>
      </div>
    </div>
  );
}
