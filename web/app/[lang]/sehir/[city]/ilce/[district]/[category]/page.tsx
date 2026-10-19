import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { permanentRedirect } from "@/i18n/server-navigation";
import { CalendarCheck2, MapPin, ShieldCheck } from "lucide-react";
import { MarketingPage } from "@/components/marketing/marketing-shell";
import { AreaIntro } from "@/components/seo/area-intro";
import { Breadcrumbs } from "@/components/seo/breadcrumbs";
import { JsonLd } from "@/components/seo/json-ld";
import { LinkCloud } from "@/components/seo/link-cloud";
import { LocalBusinessGrid } from "@/components/seo/local-business-grid";
import { SeoFaq } from "@/components/seo/seo-faq";
import { SEO_CATEGORIES, isSeoCategory, localizeSeoCategory, seoCategoryVars } from "@/lib/seo/categories";
import { legacyFethiyePath } from "@/lib/seo/local-seo";
import { createPublicMetadata } from "@/lib/seo/metadata";
import { breadcrumbJsonLd, faqJsonLd, graph, itemListJsonLd, localePath, serviceJsonLd, webPageJsonLd, type Crumb } from "@/lib/seo/schema";
import { categoryCounts, getDistrict, getSeoIndex, groupByCity, groupByDistrict, isLegacyFethiye, sortForListing, summarizeServices, topRated, type SeoBusiness } from "@/lib/seo/seo-data";
import { absoluteUrl, businessPath } from "@/lib/seo/site";
import { buildAreaFaq, buildAreaIntro, composeDescription, formatTry, placeVars, rankByFrequency, type AreaListingFacts } from "@/lib/seo/text";
import { getLocale, getT } from "@/i18n/server";

type Props = { params: Promise<{ city: string; district: string; category: string }> };

// Yalnızca en az bir yayında işletmesi olan ilçe × kategori çiftleri; saatte bir yenilenir.
export const revalidate = 3600;

export async function generateStaticParams() {
  const index = await getSeoIndex();
  return groupByCity(index).flatMap((city) => groupByDistrict(city.businesses)
    .filter((district) => !isLegacyFethiye(city.slug, district.slug))
    .flatMap((district) => categoryCounts(district.businesses).map((item) => ({ city: city.slug, district: district.slug, category: item.slug }))));
}

async function loadPage(citySlug: string, districtSlug: string, category: string) {
  if (!isSeoCategory(category)) return null;
  const district = await getDistrict(citySlug, districtSlug);
  if (!district) return null;
  const rows = district.businesses.filter((row) => row.category === category);
  if (rows.length === 0) return null;
  const [t, locale] = await Promise.all([getT(), getLocale()]);
  return { district, rows, item: localizeSeoCategory(SEO_CATEGORIES[category], t), t, locale };
}

async function facts(place: string, noun: string, plural: string, rows: SeoBusiness[]): Promise<AreaListingFacts> {
  const services = await summarizeServices(sortForListing(rows));
  return {
    place,
    noun,
    plural,
    businessCount: rows.length,
    districts: rankByFrequency([]),
    topRated: topRated(rows),
    verifiedCount: rows.filter((row) => row.isVerified).length,
    minPrice: services.minPrice,
    maxPrice: services.maxPrice,
    popularServices: services.popularServices,
  };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { city: citySlug, district: districtSlug, category } = await params;
  if (isLegacyFethiye(citySlug, districtSlug)) return { title: "Fethiye", robots: { index: false, follow: true } };
  const page = await loadPage(citySlug, districtSlug, category);
  if (!page) {
    const t = await getT();
    return { title: t("Sayfa bulunamadı"), robots: { index: false, follow: true } };
  }
  const { district, rows, item, t, locale } = page;
  const vars = { ...placeVars(district.district, locale), ...seoCategoryVars(item, locale), city: district.city };
  const data = await facts(district.district, item.noun, item.plural, rows);
  const priceText = data.minPrice != null && data.maxPrice != null && data.maxPrice > 0
    ? (data.minPrice === data.maxPrice ? t("Fiyatlar {min}.", { min: formatTry(data.minPrice, locale) }) : t("Fiyatlar {min} – {max}.", { min: formatTry(data.minPrice, locale), max: formatTry(data.maxPrice, locale) }))
    : undefined;
  const description = composeDescription([
    t("{placeAdj} ({city}) {count} {noun} işletmesini karşılaştır.", { ...vars, count: rows.length }),
    priceText,
    data.topRated ? t("En yüksek puan: {name} ({rating}).", { name: data.topRated.name, rating: data.topRated.rating.toFixed(1) }) : undefined,
    t("Hizmetleri, yorumları ve müsait saatleri incele, online randevunu ücretsiz al."),
    t("{Examples} için uygun saati seç.", vars),
  ]);
  return createPublicMetadata({
    title: t("{place} {category} – Fiyatlar ve Online Randevu", vars),
    description,
    pathname: `/sehir/${district.citySlug}/ilce/${district.slug}/${category}`,
    image: null,
    locale,
  });
}

export default async function DistrictCategoryPage({ params }: Props) {
  const { city: citySlug, district: districtSlug, category } = await params;
  if (isLegacyFethiye(citySlug, districtSlug)) await permanentRedirect(legacyFethiyePath(category));
  const page = await loadPage(citySlug, districtSlug, category);
  if (!page) notFound();
  const { district, rows, item, t, locale } = page;
  const place = placeVars(district.district, locale);
  const cityPlace = placeVars(district.city, locale);
  const vars = { ...place, ...seoCategoryVars(item, locale) };
  const index = await getSeoIndex();
  const data = await facts(district.district, item.noun, item.plural, rows);
  const intro = buildAreaIntro(data, locale);
  const faq = buildAreaFaq(data, locale);
  const businesses = sortForListing(rows);
  const districtPath = `/sehir/${district.citySlug}/ilce/${district.slug}`;
  const path = localePath(`${districtPath}/${category}`, locale);
  const pageUrl = absoluteUrl(path);
  const crumbs: Crumb[] = [
    { name: t("Ana Sayfa"), path: localePath("/", locale) },
    { name: district.city, path: localePath(`/sehir/${district.citySlug}`, locale) },
    { name: district.district, path: localePath(districtPath, locale) },
    { name: t("{place} {category}", vars), path },
  ];
  const otherCategories = categoryCounts(district.businesses).filter((entry) => entry.slug !== category);
  const cityRows = index.filter((row) => row.citySlug === district.citySlug && row.category === category);
  const sameCategoryNearby = groupByDistrict(cityRows).filter((entry) => entry.slug !== district.slug).slice(0, 16);
  const nearbyHref = (slug: string) => isLegacyFethiye(district.citySlug, slug) ? legacyFethiyePath(category) : `/sehir/${district.citySlug}/ilce/${slug}/${category}`;
  const upper = (value: string) => locale === "tr" ? value.toLocaleUpperCase("tr-TR") : value.toUpperCase();

  const jsonLd = graph(
    webPageJsonLd({ path, type: "CollectionPage", name: t("{place} {category}", vars), description: intro[0] ?? t("{place} {noun} online randevu", vars), image: item.image, breadcrumbId: `${pageUrl}#breadcrumb`, mainEntityId: `${pageUrl}#businesses`, locale }),
    breadcrumbJsonLd(crumbs, `${pageUrl}#breadcrumb`),
    itemListJsonLd(businesses.map((row) => ({ name: row.name, path: localePath(businessPath(row.slug), locale), image: row.coverUrl || row.logoUrl })), { id: `${pageUrl}#businesses`, name: t("{place} {plural}", vars) }),
    serviceJsonLd({ path, name: t("{place} {noun} online randevu", vars), description: intro[0] ?? "", serviceType: t("{category} randevusu", vars), areaServed: `${district.district}, ${district.city}`, image: item.image, locale }),
    faqJsonLd(faq, `${pageUrl}#faq`),
  );

  return (
    <MarketingPage>
      <main className="content-page">
        <JsonLd data={jsonLd} />
        <Breadcrumbs items={crumbs} />
        <section className="geo-seo-hero geo-seo-category">
          <span><MapPin size={14} aria-hidden="true" /> {district.district.toLocaleUpperCase("tr-TR")} · {upper(item.label)}</span>
          <h1>{t("{place} {noun} randevusu.", vars)}</h1>
          <p>{t("{placeAdj} {noun} işletmelerini, {examples} hizmetlerini ve uygun saatleri tek yerde karşılaştır; sana uyan randevuyu güvenle oluştur.", vars)}</p>
          <div><ShieldCheck size={15} aria-hidden="true" /> {t("{count} aktif işletme", { count: rows.length })} <CalendarCheck2 size={15} aria-hidden="true" /> {t("Online randevu")}</div>
        </section>

        <AreaIntro id="district-category-intro" title={t("{inPlace} {noun} seçerken", vars)} paragraphs={intro} />

        <section className="py-14" aria-labelledby="district-category-businesses">
          <h2 id="district-category-businesses" className="mb-7 text-4xl font-bold tracking-[-.05em] text-[#10241c]">{t("{place} {plural}", { ...vars, plural: locale === "tr" ? vars.pluralLower : vars.plural })}</h2>
          <LocalBusinessGrid businesses={businesses} />
        </section>

        <LinkCloud
          id="district-category-others"
          kicker={t("BU İLÇEDE")}
          title={t("{inPlace} diğer kategoriler", place)}
          links={otherCategories.map((entry) => {
            const other = seoCategoryVars(localizeSeoCategory(SEO_CATEGORIES[entry.slug], t), locale);
            return { href: `${districtPath}/${entry.slug}`, label: t("{place} {category}", { ...place, category: locale === "tr" ? other.category.toLocaleLowerCase("tr-TR") : other.category, plural: other.plural }), meta: t("{count} işletme", { count: entry.count }) };
          })}
        />
        <LinkCloud
          id="district-category-nearby"
          kicker={district.city.toLocaleUpperCase("tr-TR")}
          title={t("{placeAdj} diğer ilçelerde {noun}", { ...vars, ...cityPlace })}
          links={[
            { href: `/sehir/${district.citySlug}/${category}`, label: t("{inPlace} tüm {plural}", { ...vars, ...cityPlace, plural: vars.pluralLower }), meta: t("{count} işletme", { count: cityRows.length }) },
            ...sameCategoryNearby.map((entry) => ({ href: nearbyHref(entry.slug), label: t("{inPlace} {noun}", { ...vars, ...placeVars(entry.district, locale) }), meta: t("{count} işletme", { count: entry.businesses.length }) })),
          ]}
        />
        {item.landing && (
          <LinkCloud id="district-category-guide" kicker={t("REHBER")} title={t("{category} randevusu nasıl alınır?", vars)} links={[{ href: item.landing, label: t("{category} randevu rehberi", vars) }, { href: districtPath, label: t("{inPlace} tüm işletmeler", place) }]} />
        )}

        <SeoFaq id="district-category-faq" title={t("Sık sorulan sorular")} faq={faq} />
      </main>
    </MarketingPage>
  );
}
