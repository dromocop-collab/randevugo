import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CalendarCheck2, MapPin, ShieldCheck } from "lucide-react";
import { MarketingPage } from "@/components/marketing/marketing-shell";
import { AreaIntro } from "@/components/seo/area-intro";
import { Breadcrumbs } from "@/components/seo/breadcrumbs";
import { JsonLd } from "@/components/seo/json-ld";
import { LinkCloud } from "@/components/seo/link-cloud";
import { LocalBusinessGrid } from "@/components/seo/local-business-grid";
import { SeoFaq } from "@/components/seo/seo-faq";
import { SEO_CATEGORIES, isSeoCategory, localizeSeoCategory, seoCategoryVars } from "@/lib/seo/categories";
import { createPublicMetadata } from "@/lib/seo/metadata";
import { breadcrumbJsonLd, faqJsonLd, graph, itemListJsonLd, localePath, serviceJsonLd, webPageJsonLd, type Crumb } from "@/lib/seo/schema";
import { categoryCounts, districtRanking, getCity, getSeoIndex, groupByCity, groupByDistrict, isLegacyFethiye, sortForListing, summarizeServices, topRated, type SeoBusiness } from "@/lib/seo/seo-data";
import { legacyFethiyePath } from "@/lib/seo/local-seo";
import { absoluteUrl, businessPath } from "@/lib/seo/site";
import { buildAreaFaq, buildAreaIntro, composeDescription, formatTry, placeVars, type AreaListingFacts } from "@/lib/seo/text";
import { getLocale, getT } from "@/i18n/server";

type Props = { params: Promise<{ city: string; category: string }> };

// Yalnızca en az bir yayında işletmesi olan şehir × kategori çiftleri üretilir; saatte bir yenilenir.
export const revalidate = 3600;

export async function generateStaticParams() {
  const index = await getSeoIndex();
  return groupByCity(index).flatMap((city) =>
    categoryCounts(city.businesses).map((item) => ({ city: city.slug, category: item.slug })));
}

async function loadPage(citySlug: string, category: string) {
  if (!isSeoCategory(category)) return null;
  const city = await getCity(citySlug);
  if (!city) return null;
  const rows = city.businesses.filter((row) => row.category === category);
  if (rows.length === 0) return null;
  const [t, locale] = await Promise.all([getT(), getLocale()]);
  return { city, rows, item: localizeSeoCategory(SEO_CATEGORIES[category], t), t, locale };
}

async function facts(place: string, noun: string, plural: string, rows: SeoBusiness[]): Promise<AreaListingFacts> {
  const services = await summarizeServices(sortForListing(rows));
  return {
    place,
    noun,
    plural,
    businessCount: rows.length,
    districts: districtRanking(rows),
    topRated: topRated(rows),
    verifiedCount: rows.filter((row) => row.isVerified).length,
    minPrice: services.minPrice,
    maxPrice: services.maxPrice,
    popularServices: services.popularServices,
  };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { city: citySlug, category } = await params;
  const page = await loadPage(citySlug, category);
  if (!page) {
    const t = await getT();
    return { title: t("Sayfa bulunamadı"), robots: { index: false, follow: true } };
  }
  const { city, rows, item, t, locale } = page;
  const place = placeVars(city.city, locale);
  const vars = { ...place, ...seoCategoryVars(item, locale) };
  const data = await facts(city.city, item.noun, item.plural, rows);
  const priceText = data.minPrice != null && data.maxPrice != null && data.maxPrice > 0
    ? (data.minPrice === data.maxPrice ? t("Fiyatlar {min}.", { min: formatTry(data.minPrice, locale) }) : t("Fiyatlar {min} – {max}.", { min: formatTry(data.minPrice, locale), max: formatTry(data.maxPrice, locale) }))
    : undefined;
  const description = composeDescription([
    t("{placeAdj} {count} {noun} işletmesini karşılaştır.", { ...vars, count: rows.length }),
    priceText,
    data.topRated ? t("En yüksek puan: {name} ({rating}).", { name: data.topRated.name, rating: data.topRated.rating.toFixed(1) }) : undefined,
    t("Hizmetleri, yorumları ve müsait saatleri incele, online randevunu ücretsiz al."),
    t("{Examples} için uygun saati seç.", vars),
  ]);
  return createPublicMetadata({
    title: t("{place} {category} – Fiyatlar ve Online Randevu", vars),
    description,
    pathname: `/sehir/${city.slug}/${category}`,
    image: null,
    locale,
  });
}

export default async function CityCategoryPage({ params }: Props) {
  const { city: citySlug, category } = await params;
  const page = await loadPage(citySlug, category);
  if (!page) notFound();
  const { city, rows, item, t, locale } = page;
  const place = placeVars(city.city, locale);
  const vars = { ...place, ...seoCategoryVars(item, locale) };
  const index = await getSeoIndex();
  const data = await facts(city.city, item.noun, item.plural, rows);
  const intro = buildAreaIntro(data, locale);
  const faq = buildAreaFaq(data, locale);
  const businesses = sortForListing(rows);
  const path = localePath(`/sehir/${city.slug}/${category}`, locale);
  const pageUrl = absoluteUrl(path);
  const crumbs: Crumb[] = [
    { name: t("Ana Sayfa"), path: localePath("/", locale) },
    { name: city.city, path: localePath(`/sehir/${city.slug}`, locale) },
    { name: t("{place} {category}", vars), path },
  ];
  const otherCategories = categoryCounts(city.businesses).filter((entry) => entry.slug !== category);
  const categoryDistricts = groupByDistrict(rows);
  const sameCategoryElsewhere = groupByCity(index.filter((row) => row.category === category)).filter((entry) => entry.slug !== city.slug).slice(0, 16);
  const upper = (value: string) => locale === "tr" ? value.toLocaleUpperCase("tr-TR") : value.toUpperCase();

  const jsonLd = graph(
    webPageJsonLd({ path, type: "CollectionPage", name: t("{place} {category}", vars), description: intro[0] ?? t("{place} {noun} online randevu", vars), image: item.image, breadcrumbId: `${pageUrl}#breadcrumb`, mainEntityId: `${pageUrl}#businesses`, locale }),
    breadcrumbJsonLd(crumbs, `${pageUrl}#breadcrumb`),
    itemListJsonLd(businesses.map((row) => ({ name: row.name, path: localePath(businessPath(row.slug), locale), image: row.coverUrl || row.logoUrl })), { id: `${pageUrl}#businesses`, name: t("{place} {plural}", vars) }),
    serviceJsonLd({ path, name: t("{place} {noun} online randevu", vars), description: intro[0] ?? "", serviceType: t("{category} randevusu", vars), areaServed: city.city, image: item.image, locale }),
    faqJsonLd(faq, `${pageUrl}#faq`),
  );

  return (
    <MarketingPage>
      <main className="content-page">
        <JsonLd data={jsonLd} />
        <Breadcrumbs items={crumbs} />
        <section className="geo-seo-hero geo-seo-category">
          <span><MapPin size={14} aria-hidden="true" /> {city.city.toLocaleUpperCase("tr-TR")} · {upper(item.label)}</span>
          <h1>{t("{place} {noun} randevusu.", vars)}</h1>
          <p>{t("{placeAdj} {noun} işletmelerini, {examples} hizmetlerini ve uygun saatleri tek yerde karşılaştır; sana uyan randevuyu güvenle oluştur.", vars)}</p>
          <div><ShieldCheck size={15} aria-hidden="true" /> {t("{count} aktif işletme", { count: rows.length })} <CalendarCheck2 size={15} aria-hidden="true" /> {t("Online randevu")}</div>
        </section>

        <AreaIntro id="area-intro-title" title={t("{inPlace} {noun} seçerken", vars)} paragraphs={intro} />

        <section className="py-14" aria-labelledby="area-businesses-title">
          <h2 id="area-businesses-title" className="mb-7 text-4xl font-bold tracking-[-.05em] text-[#10241c]">{t("{place} {plural}", { ...vars, plural: locale === "tr" ? vars.pluralLower : vars.plural })}</h2>
          <LocalBusinessGrid businesses={businesses} />
        </section>

        <LinkCloud
          id="area-districts"
          kicker={t("İLÇEYE GÖRE")}
          title={t("İlçe ilçe {place} {noun}", vars)}
          links={categoryDistricts.map((entry) => ({ href: isLegacyFethiye(city.slug, entry.slug) ? legacyFethiyePath(category) : `/sehir/${city.slug}/ilce/${entry.slug}/${category}`, label: t("{inPlace} {noun}", { ...vars, ...placeVars(entry.district, locale) }), meta: t("{count} işletme", { count: entry.businesses.length }) }))}
        />
        <LinkCloud
          id="area-other-categories"
          kicker={t("BU BÖLGEDE")}
          title={t("{inPlace} diğer kategoriler", vars)}
          links={otherCategories.map((entry) => {
            const other = seoCategoryVars(localizeSeoCategory(SEO_CATEGORIES[entry.slug], t), locale);
            return { href: `/sehir/${city.slug}/${entry.slug}`, label: t("{place} {category}", { ...place, category: locale === "tr" ? other.category.toLocaleLowerCase("tr-TR") : other.category, plural: other.plural }), meta: t("{count} işletme", { count: entry.count }) };
          })}
        />
        <LinkCloud
          id="area-other-cities"
          kicker={t("DİĞER ŞEHİRLER")}
          title={t("Başka şehirlerde {noun}", vars)}
          links={sameCategoryElsewhere.map((entry) => ({ href: `/sehir/${entry.slug}/${category}`, label: t("{inPlace} {noun}", { ...vars, ...placeVars(entry.city, locale) }), meta: t("{count} işletme", { count: entry.businesses.length }) }))}
        />
        {item.landing && (
          <LinkCloud id="area-guide" kicker={t("REHBER")} title={t("{category} randevusu nasıl alınır?", vars)} links={[{ href: item.landing, label: t("{category} randevu rehberi", vars) }, { href: `/sehir/${city.slug}`, label: t("{inPlace} tüm işletmeler", place) }]} />
        )}

        <SeoFaq id="area-faq-title" title={t("Sık sorulan sorular")} faq={faq} />
      </main>
    </MarketingPage>
  );
}
