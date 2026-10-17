import type { Metadata } from "next";
import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import { ArrowRight, Compass, MapPin, ShieldCheck } from "lucide-react";
import { MarketingPage } from "@/components/marketing/marketing-shell";
import { AreaIntro } from "@/components/seo/area-intro";
import { Breadcrumbs } from "@/components/seo/breadcrumbs";
import { JsonLd } from "@/components/seo/json-ld";
import { LinkCloud } from "@/components/seo/link-cloud";
import { LocalBusinessGrid } from "@/components/seo/local-business-grid";
import { SeoFaq } from "@/components/seo/seo-faq";
import { createPublicMetadata } from "@/lib/seo/metadata";
import { breadcrumbJsonLd, faqJsonLd, graph, itemListJsonLd, webPageJsonLd, type Crumb } from "@/lib/seo/schema";
import { categoryCounts, getDistrict, getSeoIndex, groupByCity, groupByDistrict, isLegacyFethiye, sortForListing, topRated } from "@/lib/seo/seo-data";
import { absoluteUrl, businessPath } from "@/lib/seo/site";
import { buildAreaFaq, buildAreaIntro, composeDescription, joinTurkish, locative, locativeAdjective, rankByFrequency, type AreaListingFacts } from "@/lib/seo/text";

type Props = { params: Promise<{ city: string; district: string }> };

// İşletmesi olan her ilçe için üretilir, saatte bir yenilenir; yeni ilçeler ilk istekte oluşur.
export const revalidate = 3600;

export async function generateStaticParams() {
  const index = await getSeoIndex();
  return groupByCity(index).flatMap((city) => groupByDistrict(city.businesses)
    .filter((district) => !isLegacyFethiye(city.slug, district.slug))
    .map((district) => ({ city: city.slug, district: district.slug })));
}

function facts(district: NonNullable<Awaited<ReturnType<typeof getDistrict>>>): AreaListingFacts {
  return {
    place: district.district,
    businessCount: district.businesses.length,
    // Mahalle verisi tutulmadığı için ilçe sayfasında alt bölge kırılımı yazılmaz.
    districts: rankByFrequency([]),
    topRated: topRated(district.businesses),
    verifiedCount: district.businesses.filter((row) => row.isVerified).length,
    categories: categoryCounts(district.businesses).map((item) => ({ label: item.label, count: item.count })),
  };
}

function title(district: string, labels: string[]) {
  const base = `${locative(district)} Online Randevu`;
  let picked: string[] = [];
  for (const label of labels.slice(0, 3)) {
    const next = [...picked, label];
    if (`${base}: ${joinTurkish(next)}`.length > 58) break;
    picked = next;
  }
  return picked.length ? `${base}: ${joinTurkish(picked)}` : `${base} ve İşletmeler`;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { city: citySlug, district: districtSlug } = await params;
  if (isLegacyFethiye(citySlug, districtSlug)) return { title: "Fethiye", robots: { index: false, follow: true } };
  const district = await getDistrict(citySlug, districtSlug);
  if (!district) return { title: "Sayfa bulunamadı", robots: { index: false, follow: true } };
  const categories = categoryCounts(district.businesses);
  const description = composeDescription([
    `${locativeAdjective(district.district)} (${district.city}) ${district.businesses.length} işletmeyi keşfet${categories.length ? `: ${categories.slice(0, 3).map((item) => item.label.toLocaleLowerCase("tr-TR")).join(", ")}` : ""}.`,
    "Hizmetleri, fiyatları ve gerçek yorumları karşılaştır, uygun saati seçip online randevu al.",
    "Müşteriler için ücretsiz.",
  ]);
  return createPublicMetadata({
    title: title(district.district, categories.map((item) => item.label)),
    description,
    pathname: `/sehir/${district.citySlug}/ilce/${district.slug}`,
    image: null,
  });
}

export default async function DistrictPage({ params }: Props) {
  const { city: citySlug, district: districtSlug } = await params;
  if (isLegacyFethiye(citySlug, districtSlug)) permanentRedirect("/mugla/fethiye");
  const district = await getDistrict(citySlug, districtSlug);
  if (!district) notFound();
  const index = await getSeoIndex();
  const path = `/sehir/${district.citySlug}/ilce/${district.slug}`;
  const pageUrl = absoluteUrl(path);
  const areaFacts = facts(district);
  const intro = buildAreaIntro(areaFacts);
  const faq = buildAreaFaq(areaFacts);
  const categories = categoryCounts(district.businesses);
  const businesses = sortForListing(district.businesses);
  const cityRows = index.filter((row) => row.citySlug === district.citySlug);
  const siblings = groupByDistrict(cityRows).filter((item) => item.slug !== district.slug).slice(0, 24);
  const crumbs: Crumb[] = [
    { name: "Ana Sayfa", path: "/" },
    { name: district.city, path: `/sehir/${district.citySlug}` },
    { name: district.district, path },
  ];
  const districtHref = (slug: string) => isLegacyFethiye(district.citySlug, slug) ? "/mugla/fethiye" : `/sehir/${district.citySlug}/ilce/${slug}`;

  const jsonLd = graph(
    webPageJsonLd({ path, type: "CollectionPage", name: `${district.district} (${district.city}) online randevu`, description: intro[0] ?? `${district.district} işletmeleri`, breadcrumbId: `${pageUrl}#breadcrumb`, mainEntityId: `${pageUrl}#businesses` }),
    breadcrumbJsonLd(crumbs, `${pageUrl}#breadcrumb`),
    itemListJsonLd(businesses.slice(0, 50).map((row) => ({ name: row.name, path: businessPath(row.slug), image: row.coverUrl || row.logoUrl })), { id: `${pageUrl}#businesses`, name: `${district.district} işletmeleri` }),
    faqJsonLd(faq, `${pageUrl}#faq`),
  );

  return (
    <MarketingPage>
      <main className="content-page">
        <JsonLd data={jsonLd} />
        <Breadcrumbs items={crumbs} />
        <section className="geo-seo-hero">
          <span><MapPin size={14} aria-hidden="true" /> {district.district.toLocaleUpperCase("tr-TR")} · {district.city.toLocaleUpperCase("tr-TR")}</span>
          <h1>{locative(district.district)} online randevu al.</h1>
          <p>{locativeAdjective(district.district)} işletmeleri, hizmetleri, fiyatları ve uygun saatleri tek yerde karşılaştır; sana uyan randevuyu birkaç dokunuşla oluştur.</p>
          <div><ShieldCheck size={15} aria-hidden="true" /> {district.businesses.length} aktif işletme</div>
        </section>

        <AreaIntro id="district-intro-title" title={`${locative(district.district)} randevu alabileceğin işletmeler`} paragraphs={intro} />

        {categories.length > 0 && (
          <section className="geo-category-links" aria-labelledby="district-categories-title">
            <header><span>KATEGORİYE GÖRE KEŞFET</span><h2 id="district-categories-title">{locative(district.district)} ne arıyorsun?</h2></header>
            <div>
              {categories.map((item) => (
                <Link key={item.slug} href={`${path}/${item.slug}`}>
                  <Compass size={17} aria-hidden="true" />
                  <span><b>{district.district} {item.label.toLocaleLowerCase("tr-TR")}</b><small>{item.count} işletme</small></span>
                  <ArrowRight size={15} aria-hidden="true" />
                </Link>
              ))}
            </div>
          </section>
        )}

        <section className="py-14" aria-labelledby="district-businesses-title">
          <header className="mb-7">
            <span className="text-[10px] font-black tracking-[.17em] text-[#0b6b45]">YAYINDAKİ İŞLETMELER</span>
            <h2 id="district-businesses-title" className="mt-3 text-4xl font-bold tracking-[-.05em] text-[#10241c]">{locativeAdjective(district.district)} işletmeler</h2>
          </header>
          <LocalBusinessGrid businesses={businesses} />
        </section>

        <LinkCloud
          id="district-siblings"
          kicker={district.city.toLocaleUpperCase("tr-TR")}
          title={`${locativeAdjective(district.city)} diğer ilçeler`}
          links={[
            { href: `/sehir/${district.citySlug}`, label: `${locative(district.city)} tüm işletmeler`, meta: `${cityRows.length} işletme` },
            ...siblings.map((item) => ({ href: districtHref(item.slug), label: `${locative(item.district)} online randevu`, meta: `${item.businesses.length} işletme` })),
          ]}
        />

        <SeoFaq id="district-faq-title" title={`${district.district} hakkında sık sorulan sorular`} faq={faq} />
      </main>
    </MarketingPage>
  );
}
