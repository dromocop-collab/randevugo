"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
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
import { MarketingFooter, MarketingHeader } from "@/components/marketing/marketing-shell";
import { SupportRequestModal } from "@/components/support/support-request-modal";
import {
  ArrowRight, CalendarCheck2, GalleryHorizontalEnd,
  Globe2, Mail, MapPin, MessageCircleMore, Phone, Star,
  UsersRound, WandSparkles, type LucideIcon,
} from "lucide-react";

type Tab = "hizmetler" | "ekip" | "galeri" | "yorumlar" | "iletisim";

const TAB_CONFIG: { key: Tab; label: string; icon: LucideIcon }[] = [
  { key: "hizmetler", label: "Hizmetler", icon: WandSparkles },
  { key: "ekip", label: "Ekip", icon: UsersRound },
  { key: "galeri", label: "Galeri", icon: GalleryHorizontalEnd },
  { key: "yorumlar", label: "Yorumlar", icon: Star },
  { key: "iletisim", label: "İletişim", icon: MapPin },
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
            listServiceCategories(row.id).catch((error) => {
              console.error("❌ KATEGORİLER YÜKLENEMEDİ:", error);
              return [] as ServiceCategory[];
            }),
          ]);
        console.log("✅ SERVICES:", serviceRows);
        console.log("✅ CATEGORIES:", catRows);
        console.table(
          services.map((s) => ({
            name: s.name,
            category: s.category,
          }))
        );

        console.table(
          serviceCategories.map((c) => ({
            id: c.id,
            name: c.name,
          }))
        );
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
    <div className="marketing-page storefront-v2 min-h-screen bg-[var(--bg-1)]">
      <MarketingHeader />

      <main className="storefront-main mx-auto w-full max-w-7xl px-4 pb-20 pt-0 lg:px-8">
        {/* ━━━ HERO HEADER ━━━ */}
        <StorefrontHeader
          business={business}
          workingHours={workingHours}
          serviceCount={services.length}
          staffCount={staff.length}
          galleryCount={(business.galleryUrls ?? []).length}
          bookingHref={`/isletme/${params.slug}/randevu`}
        />

        {/* ━━━ TAB NAVIGATION ━━━ */}
        <nav className="storefront-tabs" aria-label="Mağaza bölümleri">
          {TAB_CONFIG.map((tab) => {
            const Icon = tab.icon;
            const count = tabCounts[tab.key];
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`storefront-tab-button${isActive ? " active" : ""}`}
              >
                <Icon aria-hidden="true" size={16} strokeWidth={1.9} />
                <span className="hidden sm:inline">{tab.label}</span>
                {count !== undefined && count > 0 && (
                  <b>{count}</b>
                )}
              </button>
            );
          })}
        </nav>

        {/* ━━━ CONTENT GRID ━━━ */}
        <div className="storefront-layout">
          {/* Main Content */}
          <div key={activeTab} className="storefront-tab-panel min-w-0">
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
                <GalleryHorizontalEnd className="mx-auto text-[var(--accent)]" size={34} strokeWidth={1.5} />
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
          <aside className="storefront-sidebar">
            <div className="storefront-sidebar-sticky">
              {/* Booking CTA */}
              <section className="storefront-booking-card">
                <div>
                  <div className="storefront-booking-head">
                    <span><CalendarCheck2 size={23} strokeWidth={1.8} /></span>
                    <div><small>SANİYELER İÇİNDE</small><p>Online randevunuzu oluşturun.</p></div>
                  </div>
                  <Link
                    href={`/isletme/${params.slug}/randevu`}
                    className="storefront-booking-cta"
                  >
                    Randevu Al <ArrowRight size={16} />
                  </Link>
                  {services.length > 0 && (
                    <div className="storefront-booking-meta">
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
              <section className="storefront-quick-contact">
                <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[var(--text-3)]"><MessageCircleMore size={15} /> Hızlı İletişim</h3>
                <div className="mt-3 space-y-2.5">
                  <SupportRequestModal audience="storefront" businessId={business.id} businessName={business.name} triggerClassName="storefront-message-trigger" />
                  {business.phone && (
                    <a href={`tel:${business.phone}`} className="flex items-center gap-2.5 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-3 text-xs font-medium text-[var(--text-1)] transition hover:border-[var(--accent)]/30">
                      <Phone size={15} /> {business.phone}
                    </a>
                  )}
                  {business.email && (
                    <a href={`mailto:${business.email}`} className="flex items-center gap-2.5 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-3 text-xs font-medium text-[var(--text-1)] transition hover:border-[var(--accent)]/30">
                      <Mail size={15} /> {business.email}
                    </a>
                  )}
                  {business.website && (
                    <a href={business.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2.5 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-3 text-xs font-medium text-[var(--accent)] transition hover:border-[var(--accent)]/30">
                      <Globe2 size={15} /> {business.website.replace(/^https?:\/\//, "")}
                    </a>
                  )}
                </div>
              </section>
            </div>
          </aside>
        </div>
      </main>
      <MarketingFooter />

      {/* ━━━ MOBILE BOTTOM BAR ━━━ */}
      <div className="fixed bottom-0 left-0 right-0 z-40 grid grid-cols-[auto_1fr] gap-2 border-t border-[var(--border)] bg-[var(--bg-1)]/90 p-3 backdrop-blur-2xl lg:hidden">
        <SupportRequestModal audience="storefront" businessId={business.id} businessName={business.name} triggerLabel="Mesaj" triggerClassName="storefront-message-mobile" />
        <Link
          href={`/isletme/${params.slug}/randevu`}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-[linear-gradient(135deg,var(--accent),var(--accent-3))] py-3.5 text-sm font-bold text-white shadow-xl shadow-sky-500/25 transition active:scale-[0.97]"
        >
          <CalendarCheck2 size={17} /> Randevu Al
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
