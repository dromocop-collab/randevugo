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
import { SEO_CATEGORIES, isSeoCategory } from "@/lib/seo/categories";
import { legacyFethiyePath } from "@/lib/seo/local-seo";
import { createPublicMetadata } from "@/lib/seo/metadata";
import { breadcrumbJsonLd, faqJsonLd, graph, itemListJsonLd, serviceJsonLd, webPageJsonLd, type Crumb } from "@/lib/seo/schema";
import { categoryCounts, getDistrict, getSeoIndex, groupByCity, groupByDistrict, isLegacyFethiye, sortForListing, summarizeServices, topRated, type SeoBusiness } from "@/lib/seo/seo-data";
import { absoluteUrl, businessPath } from "@/lib/seo/site";
import { buildAreaFaq, buildAreaIntro, capitalizeTr, composeDescription, formatTry, locative, locativeAdjective, rankByFrequency, type AreaListingFacts } from "@/lib/seo/text";

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
  return { district, rows, item: SEO_CATEGORIES[category] };
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
  if (!page) return { title: "Sayfa bulunamadı", robots: { index: false, follow: true } };
  const { district, rows, item } = page;
  const data = await facts(district.district, item.noun, item.plural, rows);
  const priceText = data.minPrice != null && data.maxPrice != null && data.maxPrice > 0
    ? (data.minPrice === data.maxPrice ? `Fiyatlar ${formatTry(data.minPrice)}.` : `Fiyatlar ${formatTry(data.minPrice)} – ${formatTry(data.maxPrice)}.`)
    : undefined;
  const description = composeDescription([
    `${locativeAdjective(district.district)} (${district.city}) ${rows.length} ${item.noun} işletmesini karşılaştır.`,
    priceText,
    data.topRated ? `En yüksek puan: ${data.topRated.name} (${data.topRated.rating.toFixed(1)}).` : undefined,
    "Hizmetleri, yorumları ve müsait saatleri incele, online randevunu ücretsiz al.",
    `${capitalizeTr(item.examples)} için uygun saati seç.`,
  ]);
  return createPublicMetadata({
    title: `${district.district} ${item.label} – Fiyatlar ve Online Randevu`,
    description,
    pathname: `/sehir/${district.citySlug}/ilce/${district.slug}/${category}`,
    image: null,
  });
}

export default async function DistrictCategoryPage({ params }: Props) {
  const { city: citySlug, district: districtSlug, category } = await params;
  if (isLegacyFethiye(citySlug, districtSlug)) await permanentRedirect(legacyFethiyePath(category));
  const page = await loadPage(citySlug, districtSlug, category);
  if (!page) notFound();
  const { district, rows, item } = page;
  const index = await getSeoIndex();
  const data = await facts(district.district, item.noun, item.plural, rows);
  const intro = buildAreaIntro(data);
  const faq = buildAreaFaq(data);
  const businesses = sortForListing(rows);
  const districtPath = `/sehir/${district.citySlug}/ilce/${district.slug}`;
  const path = `${districtPath}/${category}`;
  const pageUrl = absoluteUrl(path);
  const crumbs: Crumb[] = [
    { name: "Ana Sayfa", path: "/" },
    { name: district.city, path: `/sehir/${district.citySlug}` },
    { name: district.district, path: districtPath },
    { name: `${district.district} ${item.label}`, path },
  ];
  const otherCategories = categoryCounts(district.businesses).filter((entry) => entry.slug !== category);
  const cityRows = index.filter((row) => row.citySlug === district.citySlug && row.category === category);
  const sameCategoryNearby = groupByDistrict(cityRows).filter((entry) => entry.slug !== district.slug).slice(0, 16);
  const nearbyHref = (slug: string) => isLegacyFethiye(district.citySlug, slug) ? legacyFethiyePath(category) : `/sehir/${district.citySlug}/ilce/${slug}/${category}`;

  const jsonLd = graph(
    webPageJsonLd({ path, type: "CollectionPage", name: `${district.district} ${item.label}`, description: intro[0] ?? `${district.district} ${item.noun} online randevu`, image: item.image, breadcrumbId: `${pageUrl}#breadcrumb`, mainEntityId: `${pageUrl}#businesses` }),
    breadcrumbJsonLd(crumbs, `${pageUrl}#breadcrumb`),
    itemListJsonLd(businesses.map((row) => ({ name: row.name, path: businessPath(row.slug), image: row.coverUrl || row.logoUrl })), { id: `${pageUrl}#businesses`, name: `${district.district} ${item.plural}` }),
    serviceJsonLd({ path, name: `${district.district} ${item.noun} online randevu`, description: intro[0] ?? "", serviceType: `${item.label} randevusu`, areaServed: `${district.district}, ${district.city}`, image: item.image }),
    faqJsonLd(faq, `${pageUrl}#faq`),
  );

  return (
    <MarketingPage>
      <main className="content-page">
        <JsonLd data={jsonLd} />
        <Breadcrumbs items={crumbs} />
        <section className="geo-seo-hero geo-seo-category">
          <span><MapPin size={14} aria-hidden="true" /> {district.district.toLocaleUpperCase("tr-TR")} · {item.label.toLocaleUpperCase("tr-TR")}</span>
          <h1>{district.district} {item.noun} randevusu.</h1>
          <p>{locativeAdjective(district.district)} {item.noun} işletmelerini, {item.examples} hizmetlerini ve uygun saatleri tek yerde karşılaştır; sana uyan randevuyu güvenle oluştur.</p>
          <div><ShieldCheck size={15} aria-hidden="true" /> {rows.length} aktif işletme <CalendarCheck2 size={15} aria-hidden="true" /> Online randevu</div>
        </section>

        <AreaIntro id="district-category-intro" title={`${locative(district.district)} ${item.noun} seçerken`} paragraphs={intro} />

        <section className="py-14" aria-labelledby="district-category-businesses">
          <h2 id="district-category-businesses" className="mb-7 text-4xl font-bold tracking-[-.05em] text-[#10241c]">{district.district} {item.plural.toLocaleLowerCase("tr-TR")}</h2>
          <LocalBusinessGrid businesses={businesses} />
        </section>

        <LinkCloud
          id="district-category-others"
          kicker="BU İLÇEDE"
          title={`${locative(district.district)} diğer kategoriler`}
          links={otherCategories.map((entry) => ({ href: `${districtPath}/${entry.slug}`, label: `${district.district} ${entry.label.toLocaleLowerCase("tr-TR")}`, meta: `${entry.count} işletme` }))}
        />
        <LinkCloud
          id="district-category-nearby"
          kicker={district.city.toLocaleUpperCase("tr-TR")}
          title={`${locativeAdjective(district.city)} diğer ilçelerde ${item.noun}`}
          links={[
            { href: `/sehir/${district.citySlug}/${category}`, label: `${locative(district.city)} tüm ${item.plural.toLocaleLowerCase("tr-TR")}`, meta: `${cityRows.length} işletme` },
            ...sameCategoryNearby.map((entry) => ({ href: nearbyHref(entry.slug), label: `${locative(entry.district)} ${item.noun}`, meta: `${entry.businesses.length} işletme` })),
          ]}
        />
        {item.landing && (
          <LinkCloud id="district-category-guide" kicker="REHBER" title={`${item.label} randevusu nasıl alınır?`} links={[{ href: item.landing, label: `${item.label} randevu rehberi` }, { href: districtPath, label: `${locative(district.district)} tüm işletmeler` }]} />
        )}

        <SeoFaq id="district-category-faq" title="Sık sorulan sorular" faq={faq} />
      </main>
    </MarketingPage>
  );
}
