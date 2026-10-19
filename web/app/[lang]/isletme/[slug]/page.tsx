import { notFound } from "next/navigation";
import BusinessProfileClient from "./business-profile-client";
import { listBusinessWorkingHours } from "@/features/businesses/business-repository";
import { getBusinessBySlugCached } from "@/features/businesses/business-slug-cache";
import { listBookableServices } from "@/features/services/service-repository";
import { listStaff } from "@/features/staff/staff-repository";
import { listBusinessReviews } from "@/features/reviews/review-repository";
import { listServiceCategories } from "@/features/services/service-category-repository";
import { Breadcrumbs } from "@/components/seo/breadcrumbs";
import { JsonLd } from "@/components/seo/json-ld";
import { LinkCloud } from "@/components/seo/link-cloud";
import { canonicalBusinessCategory } from "@/lib/business-categories";
import { categoryDisplayName, isSeoCategory, seoCategory } from "@/lib/seo/categories";
import { breadcrumbJsonLd, graph, storefrontJsonLd, webPageJsonLd, type Crumb } from "@/lib/seo/schema";
import { categoryCounts, getSeoIndex, sortForListing } from "@/lib/seo/seo-data";
import { absoluteUrl, businessPath } from "@/lib/seo/site";
import { displayPlace, locative, seoSlug } from "@/lib/seo/text";
import { getLocale, getT } from "@/i18n/server";
import styles from "@/components/seo/seo-blocks.module.css";

export const dynamic = "force-dynamic";

function serializable<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

export default async function BusinessProfilePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const t = await getT();
  const turkish = (await getLocale()) === "tr";
  const inPlace = (place: string) => (turkish ? locative(place) : place);
  const business = await getBusinessBySlugCached(slug).catch(() => null);
  if (!business || business.status !== "active" || !business.isPublished) notFound();
  const [workingHours, services, staff, reviews, serviceCategories, index] = await Promise.all([
    listBusinessWorkingHours(business.id),
    listBookableServices(business.id),
    listStaff(business.id, true),
    listBusinessReviews(business.id).catch(() => []),
    listServiceCategories(business.id).catch(() => []),
    getSeoIndex(),
  ]);

  // ── Sayfa yolu: Ana Sayfa › Şehir › Şehir + kategori › İşletme (yalnızca var olan sayfalar) ──
  const path = businessPath(business.slug || slug);
  const category = canonicalBusinessCategory(business.category ?? "");
  const citySlug = seoSlug(business.city ?? "");
  const cityName = displayPlace(business.city);
  const cityRows = index.filter((row) => row.citySlug === citySlug);
  const cityPageExists = cityRows.length > 0;
  const cityCategoryExists = cityPageExists && isSeoCategory(category) && cityRows.some((row) => row.category === category);
  const crumbs: Crumb[] = [
    { name: t("Ana Sayfa"), path: "/" },
    ...(cityPageExists ? [{ name: cityName, path: `/sehir/${citySlug}` }] : []),
    ...(cityCategoryExists ? [{ name: `${cityName} ${t(categoryDisplayName(category))}`, path: `/sehir/${citySlug}/${category}` }] : []),
    { name: business.name, path },
  ];

  // ── Benzer işletmeler: aynı şehir + kategori, sonra aynı şehir ──
  const others = cityRows.filter((row) => row.id !== business.id);
  const similar = sortForListing(others.filter((row) => row.category === category));
  const related = [...similar, ...sortForListing(others.filter((row) => row.category !== category))].slice(0, 8);
  const otherCategories = categoryCounts(cityRows).filter((item) => item.slug !== category).slice(0, 10);
  const noun = turkish ? seoCategory(category)?.noun : seoCategory(category) ? t(categoryDisplayName(category)).toLowerCase() : undefined;

  const pageUrl = absoluteUrl(path);
  const jsonLd = graph(
    webPageJsonLd({ path, name: business.name, description: business.description?.trim() || t("{name} online randevu", { name: business.name }), breadcrumbId: `${pageUrl}#breadcrumb`, mainEntityId: `${pageUrl}#business`, image: business.coverUrl || business.logoUrl }),
    breadcrumbJsonLd(crumbs, `${pageUrl}#breadcrumb`),
    storefrontJsonLd({
      slug: business.slug || slug,
      path,
      name: business.name,
      category,
      description: business.description,
      phone: business.phone,
      email: business.email,
      website: business.website,
      address: business.address,
      geo: business.geo ?? null,
      city: cityName,
      district: displayPlace(business.district),
      logoUrl: business.logoUrl,
      coverUrl: business.coverUrl,
      galleryUrls: business.galleryUrls,
      rating: business.rating,
      reviewCount: business.reviewCount,
      instagram: business.socialMedia?.instagram,
      hours: workingHours,
      services: services.filter((service) => service.isActive !== false),
      reviews,
      allowOnlineBooking: business.allowOnlineBooking,
    }),
  );

  const seoFooter = (
    <div className={styles.storefrontLinks}>
      <Breadcrumbs items={crumbs} />
      {related.length > 0 && (
        <LinkCloud
          id="benzer-isletmeler"
          kicker={t("BENZER İŞLETMELER")}
          title={similar.length > 0 && noun ? t("{place} diğer {noun} işletmeleri", { place: inPlace(cityName), noun }) : t("{place} diğer işletmeler", { place: inPlace(cityName) })}
          links={related.map((row) => ({ href: businessPath(row.slug), label: row.name, meta: [row.district, row.reviewCount > 0 ? `★ ${row.rating.toFixed(1)}` : ""].filter(Boolean).join(" · ") }))}
        />
      )}
      {otherCategories.length > 0 && (
        <LinkCloud
          id="bolgedeki-kategoriler"
          kicker={t("BU BÖLGEDE")}
          title={t("{place} diğer kategoriler", { place: inPlace(cityName) })}
          links={otherCategories.map((item) => ({ href: `/sehir/${citySlug}/${item.slug}`, label: `${cityName} ${turkish ? item.label.toLocaleLowerCase("tr-TR") : t(item.label).toLowerCase()}`, meta: t("{count} işletme", { count: item.count }) }))}
        />
      )}
    </div>
  );

  return (
    <>
      <JsonLd data={jsonLd} />
      <BusinessProfileClient initialBusiness={serializable(business)} initialWorkingHours={serializable(workingHours)} initialServices={serializable(services)} initialStaff={serializable(staff)} initialReviews={serializable(reviews)} initialServiceCategories={serializable(serviceCategories)} seoFooter={seoFooter} />
    </>
  );
}
