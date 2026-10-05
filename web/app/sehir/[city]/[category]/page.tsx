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
import { SEO_CATEGORIES, isSeoCategory } from "@/lib/seo/categories";
import { createPublicMetadata } from "@/lib/seo/metadata";
import { breadcrumbJsonLd, faqJsonLd, graph, itemListJsonLd, serviceJsonLd, webPageJsonLd, type Crumb } from "@/lib/seo/schema";
import { categoryCounts, districtRanking, getCity, getSeoIndex, groupByCity, sortForListing, summarizeServices, topRated, type SeoBusiness } from "@/lib/seo/seo-data";
import { absoluteUrl, businessPath } from "@/lib/seo/site";
import { buildAreaFaq, buildAreaIntro, capitalizeTr, composeDescription, formatTry, locative, locativeAdjective, type AreaListingFacts } from "@/lib/seo/text";

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
  return { city, rows, item: SEO_CATEGORIES[category] };
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
  if (!page) return { title: "Sayfa bulunamadı", robots: { index: false, follow: true } };
  const { city, rows, item } = page;
  const data = await facts(city.city, item.noun, item.plural, rows);
  const priceText = data.minPrice != null && data.maxPrice != null && data.maxPrice > 0
    ? (data.minPrice === data.maxPrice ? `Fiyatlar ${formatTry(data.minPrice)}.` : `Fiyatlar ${formatTry(data.minPrice)} – ${formatTry(data.maxPrice)}.`)
    : undefined;
  const description = composeDescription([
    `${locativeAdjective(city.city)} ${rows.length} ${item.noun} işletmesini karşılaştır.`,
    priceText,
    data.topRated ? `En yüksek puan: ${data.topRated.name} (${data.topRated.rating.toFixed(1)}).` : undefined,
    "Hizmetleri, yorumları ve müsait saatleri incele, online randevunu ücretsiz al.",
    `${capitalizeTr(item.examples)} için uygun saati seç.`,
  ]);
  return createPublicMetadata({
    title: `${city.city} ${item.label} – Fiyatlar ve Online Randevu`,
    description,
    pathname: `/sehir/${city.slug}/${category}`,
    image: null,
  });
}

export default async function CityCategoryPage({ params }: Props) {
  const { city: citySlug, category } = await params;
  const page = await loadPage(citySlug, category);
  if (!page) notFound();
  const { city, rows, item } = page;
  const index = await getSeoIndex();
  const data = await facts(city.city, item.noun, item.plural, rows);
  const intro = buildAreaIntro(data);
  const faq = buildAreaFaq(data);
  const businesses = sortForListing(rows);
  const path = `/sehir/${city.slug}/${category}`;
  const pageUrl = absoluteUrl(path);
  const crumbs: Crumb[] = [
    { name: "Ana Sayfa", path: "/" },
    { name: city.city, path: `/sehir/${city.slug}` },
    { name: `${city.city} ${item.label}`, path },
  ];
  const otherCategories = categoryCounts(city.businesses).filter((entry) => entry.slug !== category);
  const sameCategoryElsewhere = groupByCity(index.filter((row) => row.category === category)).filter((entry) => entry.slug !== city.slug).slice(0, 16);

  const jsonLd = graph(
    webPageJsonLd({ path, type: "CollectionPage", name: `${city.city} ${item.label}`, description: intro[0] ?? `${city.city} ${item.noun} online randevu`, image: item.image, breadcrumbId: `${pageUrl}#breadcrumb`, mainEntityId: `${pageUrl}#businesses` }),
    breadcrumbJsonLd(crumbs, `${pageUrl}#breadcrumb`),
    itemListJsonLd(businesses.map((row) => ({ name: row.name, path: businessPath(row.slug), image: row.coverUrl || row.logoUrl })), { id: `${pageUrl}#businesses`, name: `${city.city} ${item.plural}` }),
    serviceJsonLd({ path, name: `${city.city} ${item.noun} online randevu`, description: intro[0] ?? "", serviceType: `${item.label} randevusu`, areaServed: city.city, image: item.image }),
    faqJsonLd(faq, `${pageUrl}#faq`),
  );

  return (
    <MarketingPage>
      <main className="content-page">
        <JsonLd data={jsonLd} />
        <Breadcrumbs items={crumbs} />
        <section className="geo-seo-hero geo-seo-category">
          <span><MapPin size={14} aria-hidden="true" /> {city.city.toLocaleUpperCase("tr-TR")} · {item.label.toLocaleUpperCase("tr-TR")}</span>
          <h1>{city.city} {item.noun} randevusu.</h1>
          <p>{locativeAdjective(city.city)} {item.noun} işletmelerini, {item.examples} hizmetlerini ve uygun saatleri tek yerde karşılaştır; sana uyan randevuyu güvenle oluştur.</p>
          <div><ShieldCheck size={15} aria-hidden="true" /> {rows.length} aktif işletme <CalendarCheck2 size={15} aria-hidden="true" /> Online randevu</div>
        </section>

        <AreaIntro id="area-intro-title" title={`${locative(city.city)} ${item.noun} seçerken`} paragraphs={intro} />

        <section className="py-14" aria-labelledby="area-businesses-title">
          <h2 id="area-businesses-title" className="mb-7 text-4xl font-bold tracking-[-.05em] text-[#10241c]">{city.city} {item.plural.toLocaleLowerCase("tr-TR")}</h2>
          <LocalBusinessGrid businesses={businesses} />
        </section>

        <LinkCloud
          id="area-other-categories"
          kicker="BU BÖLGEDE"
          title={`${locative(city.city)} diğer kategoriler`}
          links={otherCategories.map((entry) => ({ href: `/sehir/${city.slug}/${entry.slug}`, label: `${city.city} ${entry.label.toLocaleLowerCase("tr-TR")}`, meta: `${entry.count} işletme` }))}
        />
        <LinkCloud
          id="area-other-cities"
          kicker="DİĞER ŞEHİRLER"
          title={`Başka şehirlerde ${item.noun}`}
          links={sameCategoryElsewhere.map((entry) => ({ href: `/sehir/${entry.slug}/${category}`, label: `${locative(entry.city)} ${item.noun}`, meta: `${entry.businesses.length} işletme` }))}
        />
        {item.landing && (
          <LinkCloud id="area-guide" kicker="REHBER" title={`${item.label} randevusu nasıl alınır?`} links={[{ href: item.landing, label: `${item.label} randevu rehberi` }, { href: `/sehir/${city.slug}`, label: `${locative(city.city)} tüm işletmeler` }]} />
        )}

        <SeoFaq id="area-faq-title" title="Sık sorulan sorular" faq={faq} />
      </main>
    </MarketingPage>
  );
}
