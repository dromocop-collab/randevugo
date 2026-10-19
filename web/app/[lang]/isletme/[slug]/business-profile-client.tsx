"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useParams } from "next/navigation";
import { useRouter } from "@/i18n/navigation";
import { useIntlLocale, useT } from "@/i18n/client";
import { tk } from "@/i18n/config";
import Image from "next/image";
import Link from "@/i18n/link";
import { toast } from "sonner";
import {
  ArrowRight, BadgeCheck, BriefcaseBusiness, CalendarCheck2, Heart, Images, Info, LoaderCircle,
  MapPin, Navigation, Phone, Share2, Sparkles, Star, UsersRound, WandSparkles, Zap, type LucideIcon,
} from "lucide-react";
import { ErrorState, LoadingState } from "@/components/ui/states";
import { MarketingFooter, MarketingHeader } from "@/components/marketing/marketing-shell";
import { StorefrontOwnerBar } from "@/features/business-companion/storefront-owner-bar";
import { InstagramGlyph } from "@/features/share/instagram-glyph";
import { InstagramShareSheet } from "@/features/share/instagram-share-sheet";
import { SupportRequestModal } from "@/components/support/support-request-modal";
import {
  getBusinessBySlug,
  listBusinessWorkingHours,
} from "@/features/businesses/business-repository";
import { useBusinessContext } from "@/features/businesses/business-context";
import { listBookableServices } from "@/features/services/service-repository";
import { listStaff } from "@/features/staff/staff-repository";
import { listBusinessReviews } from "@/features/reviews/review-repository";
import { listServiceCategories } from "@/features/services/service-category-repository";
import { subscribeLiveFeatureAvailability } from "@/features/platform/platform-settings-repository";
import { listLiveDiscovery } from "@/features/live-queue/customer-queue-repository";
import type { LiveWaitEstimate } from "@/features/live-queue/wait-estimate";
import { addFavoriteBusiness, isFavoriteBusiness, removeFavoriteBusiness } from "@/features/customers/favorite-repository";
import { useAuth } from "@/hooks/use-auth";
import { userFacingError } from "@/lib/errors/user-facing-error";
import type { Business, DaySchedule } from "@/types/business";
import type { Service } from "@/types/service";
import type { Staff } from "@/types/staff";
import type { Review } from "@/types/review";
import type { ServiceCategory } from "@/types/service-category";
import { ServicesSection } from "./_storefront/services-section";
import { StaffSection } from "./_storefront/staff-section";
import { GallerySection } from "./_storefront/gallery-section";
import { ReviewsSection } from "./_storefront/reviews-section";
import { InfoSection } from "./_storefront/info-section";
import { categoryLabel, computeOpenStatus, liveWaitLabel, formatPrice, istanbulNow, mapsHref, openStatusLabel, telHref, type OpenStatus } from "./_storefront/utils";
import styles from "./storefront.module.css";

type SectionKey = "hizmetler" | "ekip" | "galeri" | "yorumlar" | "bilgi";

interface BusinessProfileClientProps {
  initialBusiness: Business;
  initialWorkingHours: DaySchedule[];
  initialServices: Service[];
  initialStaff: Staff[];
  initialReviews: Review[];
  initialServiceCategories: ServiceCategory[];
  /** Sunucuda çizilen sayfa yolu ve iç bağlantılar (benzer işletmeler, bölgedeki kategoriler). */
  seoFooter?: ReactNode;
}

export default function BusinessProfileClient({ initialBusiness, initialWorkingHours, initialServices, initialStaff, initialReviews, initialServiceCategories, seoFooter }: BusinessProfileClientProps) {
  const params = useParams<{ slug: string }>();
  const t = useT();
  const intlLocale = useIntlLocale();
  const router = useRouter();
  const { user } = useAuth();
  const { businesses } = useBusinessContext();
  const [business, setBusiness] = useState<Business | null>(initialBusiness);
  const [workingHours, setWorkingHours] = useState<DaySchedule[]>(initialWorkingHours);
  const [services, setServices] = useState<Service[]>(initialServices);
  const [staff, setStaff] = useState<Staff[]>(initialStaff);
  const [reviews, setReviews] = useState<Review[]>(initialReviews);
  const [serviceCategories, setServiceCategories] = useState<ServiceCategory[]>(initialServiceCategories);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [favorite, setFavorite] = useState(false);
  const [favoriteBusy, setFavoriteBusy] = useState(false);
  const [liveEnabled, setLiveEnabled] = useState(false);
  const [liveEligible, setLiveEligible] = useState(false);
  const [liveEarliestWait, setLiveEarliestWait] = useState<(LiveWaitEstimate & { serviceName: string }) | null>(null);
  // Saat hesapları yalnızca tarayıcıda (hydration uyuşmazlığı olmasın); dakikada bir yenilenir.
  const [nowMillis, setNowMillis] = useState<number | null>(null);
  const [activeSection, setActiveSection] = useState<SectionKey>("hizmetler");
  const [tabsStuck, setTabsStuck] = useState(false);
  const [instagramOpen, setInstagramOpen] = useState(false);
  const closeInstagram = useCallback(() => setInstagramOpen(false), []);
  const rootRef = useRef<HTMLDivElement>(null);
  const tabsRef = useRef<HTMLDivElement>(null);
  const tabsRailRef = useRef<HTMLDivElement>(null);
  const clickLockRef = useRef(0);

  useEffect(() => {
    const tick = () => setNowMillis(Date.now());
    const first = window.setTimeout(tick, 0);
    const timer = window.setInterval(tick, 60_000);
    return () => { window.clearTimeout(first); window.clearInterval(timer); };
  }, []);

  // Panelden gelen "Instagram için görsel" bağlantısı (?paylas=instagram) pencereyi açar; parametre adresten silinir.
  useEffect(() => {
    const url = new URL(window.location.href);
    if (url.searchParams.get("paylas") !== "instagram") return;
    url.searchParams.delete("paylas");
    window.history.replaceState(window.history.state, "", `${url.pathname}${url.search}${url.hash}`);
    queueMicrotask(() => setInstagramOpen(true));
  }, []);

  useEffect(() => subscribeLiveFeatureAvailability((flags) =>
    setLiveEnabled(flags.isLiveAvailabilityEnabled && flags.isLiveQueueEnabled && flags.isLiveOperationsEnabled)), []);
  useEffect(() => {
    if (!liveEnabled || !business?.id) { queueMicrotask(() => { setLiveEligible(false); setLiveEarliestWait(null); }); return; }
    let cancelled = false;
    const refresh = () => { if (!cancelled) setLiveEarliestWait(null); return listLiveDiscovery(business.id).then((rows) => {
      if (!cancelled) { const row = rows.find((item) => item.id === business.id); setLiveEligible(!!row); setLiveEarliestWait(row?.earliestWait ?? null); }
    }).catch(() => { if (!cancelled) { setLiveEligible(false); setLiveEarliestWait(null); } }); };
    void refresh();
    const timer = window.setInterval(() => { void refresh(); }, 180_000);
    const onFocus = () => { void refresh(); };
    window.addEventListener("focus", onFocus);
    return () => { cancelled = true; window.clearInterval(timer); window.removeEventListener("focus", onFocus); };
  }, [liveEnabled, business?.id]);

  useEffect(() => {
    if (!user || !initialBusiness.id) return;
    let active = true;
    isFavoriteBusiness(user.uid, initialBusiness.id).then((value) => { if (active) setFavorite(value); }).catch(() => undefined);
    return () => { active = false; };
  }, [initialBusiness.id, user]);

  useEffect(() => {
    const slug = params.slug;
    if (!slug) return;

    let cancelled = false;

    getBusinessBySlug(slug)
      .then(async (row) => {
        if (cancelled) return;
        if (!row) {
          setError(tk("İşletme bulunamadı."));
          return;
        }
        if (row.status !== "active" || !row.isPublished) {
          setError(tk("Bu işletme şu anda aktif değil."));
          return;
        }

        setBusiness(row);

        const [schedules, serviceRows, staffRows, reviewRows, catRows] =
          await Promise.all([
            listBusinessWorkingHours(row.id),
            listBookableServices(row.id),
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
        setError(userFacingError(e, tk("İşletme bilgileri şu anda yüklenemedi. Lütfen yeniden deneyin.")));
      })
      .finally(() => {
        if (cancelled) return;
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [params.slug]);

  const galleryUrls = useMemo(() => (business?.galleryUrls ?? []).filter(Boolean), [business?.galleryUrls]);
  const sections = useMemo(() => {
    const rows: { key: SectionKey; label: string; icon: LucideIcon; count?: number }[] = [
      { key: "hizmetler", label: tk("Hizmetler"), icon: WandSparkles, count: services.length },
    ];
    if (staff.length > 0) rows.push({ key: "ekip", label: tk("Ekip"), icon: UsersRound, count: staff.length });
    if (galleryUrls.length > 0) rows.push({ key: "galeri", label: tk("Galeri"), icon: Images, count: galleryUrls.length });
    rows.push({ key: "yorumlar", label: tk("Yorumlar"), icon: Star, count: Math.max(business?.reviewCount ?? 0, reviews.length) });
    rows.push({ key: "bilgi", label: tk("Bilgi"), icon: Info });
    return rows;
  }, [services.length, staff.length, galleryUrls.length, business?.reviewCount, reviews.length]);

  // Yapışkan sekmeler başlığın hemen altında durur + kaydırma takibi (scroll-spy).
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const header = document.querySelector<HTMLElement>(".marketing-header");
    let frame = 0;
    const headerHeight = () => (header && getComputedStyle(header).position === "sticky" ? header.offsetHeight : 0);
    const applyTop = () => root.style.setProperty("--sticky-top", `${headerHeight()}px`);
    const update = () => {
      frame = 0;
      const top = headerHeight();
      const tabs = tabsRef.current;
      if (tabs) setTabsStuck(tabs.getBoundingClientRect().top <= top + 1);
      if (Date.now() < clickLockRef.current) return;
      const offset = top + (tabs?.offsetHeight ?? 58) + Math.min(160, window.innerHeight * 0.25);
      let current: SectionKey = sections[0]?.key ?? "hizmetler";
      for (const section of sections) {
        const element = document.getElementById(section.key);
        if (element && element.getBoundingClientRect().top - offset <= 0) current = section.key;
      }
      if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4) current = sections[sections.length - 1].key;
      setActiveSection(current);
    };
    const onScroll = () => { if (!frame) frame = requestAnimationFrame(update); };
    const onResize = () => { applyTop(); onScroll(); };
    applyTop();
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onResize);
    return () => { if (frame) cancelAnimationFrame(frame); window.removeEventListener("scroll", onScroll); window.removeEventListener("resize", onResize); };
  }, [sections]);

  // Aktif sekmeyi yatay şeritte görünür tut.
  useEffect(() => {
    const rail = tabsRailRef.current;
    const button = rail?.querySelector<HTMLElement>(`[data-section="${activeSection}"]`);
    if (!rail || !button) return;
    const left = button.offsetLeft - (rail.clientWidth - button.offsetWidth) / 2;
    rail.scrollTo({ left: Math.max(0, left), behavior: "smooth" });
  }, [activeSection]);

  const goTo = useCallback((key: SectionKey) => {
    const element = document.getElementById(key);
    if (!element) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    clickLockRef.current = Date.now() + (reduce ? 50 : 700);
    setActiveSection(key);
    element.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <LoadingState
          title={t("İşletme sayfası yükleniyor")}
          description={t("Bilgiler getiriliyor...")}
        />
      </div>
    );
  }

  if (error || !business) {
    return (
      <main className="mx-auto w-full max-w-4xl px-4 py-20">
        <ErrorState
          title={t("Sayfa Açılamadı")}
          description={error ? t(error) : t("İşletme kaydı bulunamadı.")}
        />
        <div className="mt-6 text-center">
          <Link
            href="/kesfet"
            className="inline-flex items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface-1)] px-5 py-2.5 text-sm font-medium text-[var(--accent)] transition hover:bg-[var(--accent)]/5"
          >
            ← {t("İşletmelere Göz At")}
          </Link>
        </div>
      </main>
    );
  }

  const slug = params.slug ?? business.slug;
  const bookingHref = `/isletme/${slug}/randevu`;
  const isOwner = businesses.some((item) => item.id === business.id);
  const status: OpenStatus | null = nowMillis === null ? null : computeOpenStatus(workingHours, nowMillis);
  const today = nowMillis === null ? null : istanbulNow(nowMillis).day;
  const todayHours = today === null ? null : workingHours.find((item) => item.day === today);
  const prices = services.filter((service) => service.isActive !== false && service.isBookableOnline !== false && service.priceType !== "quote" && service.price > 0).map((service) => service.price);
  const minPrice = prices.length ? Math.min(...prices) : null;
  const currency = services[0]?.currency ?? "TRY";
  const rating = business.rating ?? 0;
  const reviewCount = Math.max(business.reviewCount ?? 0, reviews.length);
  const isNew = reviewCount === 0 && nowMillis !== null && nowMillis - new Date(business.createdAt).getTime() < 60 * 86_400_000;

  async function toggleFavorite() {
    if (!business) return;
    if (!user) {
      router.push(`/musteri/giris?next=${encodeURIComponent(`/isletme/${slug}`)}`);
      return;
    }
    setFavoriteBusy(true);
    try {
      if (favorite) await removeFavoriteBusiness(user.uid, business.id);
      else await addFavoriteBusiness(user.uid, business);
      setFavorite((value) => !value);
      toast.success(favorite ? t("İşletme favorilerden çıkarıldı.") : t("İşletme favorilerinize eklendi."));
    } catch {
      toast.error(t("Favori tercihi güncellenemedi. Lütfen tekrar deneyin."));
    } finally {
      setFavoriteBusy(false);
    }
  }

  async function share() {
    if (!business) return;
    const url = window.location.href.split("#")[0];
    try {
      if (navigator.share) await navigator.share({ title: business.name, text: t("{name} — hizmetleri incele ve online randevu al.", { name: business.name }), url });
      else {
        await navigator.clipboard.writeText(url);
        toast.success(t("Bağlantı kopyalandı."));
      }
    } catch (reason) {
      if ((reason as DOMException)?.name !== "AbortError") toast.error(t("Bağlantı paylaşılamadı."));
    }
  }

  const statusClass = !status || status.kind === "unknown" ? "" : status.kind === "open" ? (status.closingSoon ? styles.statusSoon : styles.statusOpen) : status.kind === "break" ? styles.statusBreak : styles.statusClosed;
  const quickCount = 4 + (business.phone ? 1 : 0);

  return (
    <div className="marketing-page">
      <MarketingHeader />
      <div ref={rootRef} className={styles.page}>

      <main className={styles.main}>
        <StorefrontOwnerBar businessId={business.id} slug={business.slug} name={business.name} onInstagram={() => setInstagramOpen(true)} />
        {/* ━━━ HERO ━━━ */}
        <section className={styles.hero} aria-label={t("{name} profili", { name: business.name })}>
          <div className={styles.cover}>
            {business.coverUrl || galleryUrls[0] ? (
              <Image src={(business.coverUrl || galleryUrls[0])!} alt={t("{name} kapak görseli", { name: business.name })} fill priority sizes="(max-width: 1240px) 100vw, 1240px" />
            ) : (
              <>
                <span className={styles.coverGrid} aria-hidden="true" />
                <span className={styles.coverMonogram} aria-hidden="true">{business.name.charAt(0).toLocaleUpperCase("tr-TR")}</span>
              </>
            )}
            <span className={styles.coverShade} aria-hidden="true" />
            <div className={styles.topActions}>
              {isOwner && <Link href="/dashboard" className={styles.ownerLink}><BriefcaseBusiness size={15} aria-hidden="true" /> {t("Yönetim paneli")}</Link>}
              <button type="button" className={styles.roundBtn} onClick={share} aria-label={t("İşletmeyi paylaş")}><Share2 size={18} aria-hidden="true" /></button>
              <button type="button" className={`${styles.roundBtn} ${favorite ? styles.heartOn : ""}`} onClick={toggleFavorite} disabled={favoriteBusy} aria-pressed={favorite} aria-label={favorite ? t("Favorilerden çıkar") : t("Favorilere ekle")}>
                {favoriteBusy ? <LoaderCircle className="animate-spin" size={18} aria-hidden="true" /> : <Heart size={18} aria-hidden="true" />}
              </button>
            </div>
            {galleryUrls.length > 1 && (
              <button type="button" className={styles.photoCount} onClick={() => goTo("galeri")}><Images size={14} aria-hidden="true" /> {t("{count} fotoğraf", { count: galleryUrls.length })}</button>
            )}
          </div>

          <div className={styles.profile}>
            <div className={styles.profileTop}>
              <div className={`${styles.logo} ${business.logoUrl ? styles.logoImg : ""}`}>
                {business.logoUrl ? <Image src={business.logoUrl} alt={t("{name} logosu", { name: business.name })} fill sizes="112px" /> : <span aria-hidden="true">{business.name.charAt(0).toLocaleUpperCase("tr-TR")}</span>}
              </div>
              {status && status.kind !== "unknown" && (
                <span className={`${styles.statusPill} ${statusClass}`} aria-live="off"><i aria-hidden="true" />{openStatusLabel(status, t)}</span>
              )}
            </div>

            <div className={styles.profileGrid}>
              <div>
                <span className={styles.eyebrow}><Sparkles size={13} aria-hidden="true" /> {categoryLabel(business.category, t)}</span>
                <h1 className={styles.name}>
                  {business.name}
                  {business.isVerified && <BadgeCheck className={styles.verified} size={24} aria-label={t("Doğrulanmış işletme")} role="img" />}
                </h1>
                <div className={styles.metaRow}>
                  {reviewCount > 0 && rating > 0 && (
                    <button type="button" className={styles.ratingBtn} onClick={() => goTo("yorumlar")} aria-label={t("5 üzerinden {rating} puan, {count} değerlendirme. Yorumlara git", { rating: rating.toFixed(1), count: reviewCount })}>
                      <Star size={15} aria-hidden="true" /> <b>{rating.toFixed(1)}</b> <small>({t("{count} değerlendirme", { count: reviewCount })})</small>
                    </button>
                  )}
                  {isNew && <span className={styles.newBadge}>{t("Yeni")}</span>}
                  {(business.district || business.city) && <span><MapPin size={14} aria-hidden="true" /> {[business.district, business.city].filter(Boolean).join(", ")}</span>}
                  {business.isVerified && <span><BadgeCheck size={14} aria-hidden="true" /> {t("Doğrulanmış")}</span>}
                </div>
                {business.description && <p className={styles.description}>{business.description}</p>}
              </div>

              <div>
                <div className={styles.quickActions} data-count={quickCount} style={{ gridTemplateColumns: `repeat(${quickCount}, minmax(0, 1fr))` }}>
                  {business.phone && <a href={telHref(business.phone)} className={styles.quickAction}><Phone size={19} aria-hidden="true" /> {t("Ara")}</a>}
                  <SupportRequestModal audience="storefront" businessId={business.id} businessName={business.name} triggerLabel={t("Mesaj")} triggerClassName="storefront-quick-msg" />
                  <a href={mapsHref(business)} target="_blank" rel="noopener noreferrer" className={styles.quickAction}><Navigation size={19} aria-hidden="true" /> {t("Yol tarifi")}</a>
                  <button type="button" className={styles.quickAction} onClick={() => setInstagramOpen(true)} aria-haspopup="dialog" aria-label={t("Instagram'da paylaş")}><InstagramGlyph size={19} /> Instagram</button>
                  <button type="button" className={styles.quickAction} onClick={share}><Share2 size={19} aria-hidden="true" /> {t("Paylaş")}</button>
                </div>
                <div className={styles.stats}>
                  <div className={styles.stat}><small>{t("HİZMET")}</small><b>{services.length}</b></div>
                  <div className={styles.stat}><small>{staff.length > 0 ? t("UZMAN") : t("PUAN")}</small><b>{staff.length > 0 ? staff.length : rating > 0 ? rating.toFixed(1) : "—"}</b></div>
                  <div className={styles.stat}><small>{t("BAŞLANGIÇ")}</small><b>{minPrice !== null ? formatPrice(minPrice, currency, intlLocale) : "—"}</b></div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {liveEligible && (
          <section className={styles.live} aria-label={t("Canlı sıra")}>
            <div>
              <span className={styles.liveTag}><i aria-hidden="true" /> {t("CANLI SIRA")}</span>
              <h2>{t("Şu anda yeni müşteri kabul ediyor")}</h2>
              <p>{liveEarliestWait ? `${t("En erken {service}: {estimate}.", { service: liveEarliestWait.serviceName, estimate: liveWaitLabel(liveEarliestWait, t) })} ` : ""}{t("Hizmete özel tahmin için sıraya katıl; planlı randevu seçeneğin de açık.")}</p>
            </div>
            <Link href={`/isletme/${slug}/canli-sira`} className={styles.liveBtn}><Zap size={17} aria-hidden="true" /> {t("Sıraya katıl")} <ArrowRight size={17} aria-hidden="true" /></Link>
          </section>
        )}

        {/* ━━━ YAPIŞKAN SEKMELER ━━━ */}
        <div ref={tabsRef} className={`${styles.tabsBar} ${tabsStuck ? styles.tabsStuck : ""}`}>
          <nav ref={tabsRailRef} className={styles.tabs} aria-label={t("Sayfa bölümleri")}>
            {sections.map((section) => {
              const Icon = section.icon;
              const active = activeSection === section.key;
              return (
                <a
                  key={section.key}
                  href={`#${section.key}`}
                  data-section={section.key}
                  className={`${styles.tab} ${active ? styles.tabActive : ""}`}
                  aria-current={active ? "location" : undefined}
                  onClick={(event) => { event.preventDefault(); goTo(section.key); }}
                >
                  <Icon size={16} aria-hidden="true" /> {t(section.label)}
                  {section.count ? <small>{section.count}</small> : null}
                </a>
              );
            })}
          </nav>
        </div>

        <div className={styles.layout}>
          <div className={styles.content}>
            <section id="hizmetler" className={styles.section} aria-labelledby="hizmetler-title">
              <header className={styles.sectionHead}>
                <div><small>{t("HİZMET MENÜSÜ")}</small><h2 id="hizmetler-title">{t("Hizmetler")}</h2></div>
                {services.length > 0 && <b>{t("{count} hizmet", { count: services.length })}</b>}
              </header>
              <ServicesSection services={services} categories={serviceCategories} staff={staff} bookingHref={bookingHref} businessName={business.name} />
            </section>

            {staff.length > 0 && (
              <section id="ekip" className={styles.section} aria-labelledby="ekip-title">
                <header className={styles.sectionHead}>
                  <div><small>{t("UZMAN KADRO")}</small><h2 id="ekip-title">{t("Ekibimiz")}</h2></div>
                  <b>{t("{count} uzman", { count: staff.length })}</b>
                </header>
                <StaffSection staff={staff} categories={serviceCategories} reviews={reviews} bookingHref={bookingHref} />
              </section>
            )}

            {galleryUrls.length > 0 && (
              <section id="galeri" className={styles.section} aria-labelledby="galeri-title">
                <header className={styles.sectionHead}>
                  <div><small>{t("MEKÂNI KEŞFET")}</small><h2 id="galeri-title">{t("Galeri")}</h2></div>
                  <b>{t("{count} fotoğraf", { count: galleryUrls.length })}</b>
                </header>
                <GallerySection urls={galleryUrls} businessName={business.name} />
              </section>
            )}

            <section id="yorumlar" className={styles.section} aria-labelledby="yorumlar-title">
              <header className={styles.sectionHead}>
                <div><small>{t("GERÇEK MÜŞTERİLER")}</small><h2 id="yorumlar-title">{t("Yorumlar")}</h2></div>
              </header>
              <ReviewsSection reviews={reviews} averageRating={rating} totalReviews={business.reviewCount ?? 0} nowMillis={nowMillis} />
            </section>

            <section id="bilgi" className={styles.section} aria-labelledby="bilgi-title">
              <header className={styles.sectionHead}>
                <div><small>{t("İLETİŞİM & KONUM")}</small><h2 id="bilgi-title">{t("Bilgi")}</h2></div>
              </header>
              <InfoSection business={business} workingHours={workingHours} today={today} />
            </section>
          </div>

          {/* ━━━ MASAÜSTÜ YAN KART ━━━ */}
          <aside className={styles.aside} aria-label={t("Randevu")}>
            <div className={styles.bookCard}>
              <small>{t("SANİYELER İÇİNDE")}</small>
              <h3>{t("Online randevunu oluştur")}</h3>
              <p>{t("Hizmetini ve uzmanını seç, uygun saati anında ayır.")}</p>
              <Link href={bookingHref} className={styles.bookMain}><CalendarCheck2 size={19} aria-hidden="true" /> {t("Randevu Al")} <ArrowRight size={18} aria-hidden="true" /></Link>
              <div className={styles.bookSecondary}>
                <button type="button" className={`${styles.bookGhost} ${favorite ? styles.bookGhostOn : ""}`} onClick={toggleFavorite} disabled={favoriteBusy} aria-pressed={favorite}>
                  {favoriteBusy ? <LoaderCircle className="animate-spin" size={16} aria-hidden="true" /> : <Heart size={16} aria-hidden="true" />} {favorite ? t("Favorilerde") : t("Favorile")}
                </button>
                <button type="button" className={styles.bookGhost} onClick={share}><Share2 size={16} aria-hidden="true" /> {t("Paylaş")}</button>
              </div>
              <div className={styles.bookFacts}>
                {minPrice !== null && <div><span>{t("Başlangıç fiyatı")}</span><b>{formatPrice(minPrice, currency, intlLocale)}</b></div>}
                {services.length > 0 && <div><span>{t("Online hizmet")}</span><b>{services.length}</b></div>}
                {status && status.kind !== "unknown" && <div><span>{t("Durum")}</span><b>{openStatusLabel(status, t).split(" · ")[0]}</b></div>}
                {todayHours && <div><span>{t("Bugün")}</span><b>{todayHours.isOpen ? `${todayHours.start} – ${todayHours.end}` : t("Kapalı")}</b></div>}
              </div>
            </div>
          </aside>
        </div>
        {seoFooter}
      </main>

      {/* Mobilde sabit randevu çubuğu footer'ın altını kapatmasın. */}
      <div className={styles.footerPad}><MarketingFooter /></div>

      <InstagramShareSheet open={instagramOpen} onClose={closeInstagram} slug={business.slug || slug} businessName={business.name} version={business.updatedAt} />

      {/* ━━━ MOBİL ALT ÇUBUK ━━━ */}
      <div className={styles.bottomBar} data-storefront-bottom-bar="">
        <div className={styles.barInfo}>
          <small>{minPrice !== null ? t("Başlayan fiyatlarla") : business.name}</small>
          <b>{minPrice !== null ? t("{price}'den", { price: formatPrice(minPrice, currency, intlLocale) }) : t("Online randevu")}</b>
        </div>
        <div className={styles.barMsg}>
          <SupportRequestModal audience="storefront" businessId={business.id} businessName={business.name} triggerLabel={t("Mesaj")} triggerClassName="storefront-bar-msg" />
        </div>
        <Link href={bookingHref} className={styles.barBook}><CalendarCheck2 size={18} aria-hidden="true" /> {t("Randevu Al")}</Link>
      </div>
      </div>
    </div>
  );
}
