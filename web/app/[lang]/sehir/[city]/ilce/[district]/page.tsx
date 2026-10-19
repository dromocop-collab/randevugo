import type { Metadata } from "next";
import Link from "@/i18n/link";
import { notFound } from "next/navigation";
import { permanentRedirect } from "@/i18n/server-navigation";
import { ArrowRight, Compass, MapPin, ShieldCheck } from "lucide-react";
import { MarketingPage } from "@/components/marketing/marketing-shell";
import { AreaIntro } from "@/components/seo/area-intro";
import { Breadcrumbs } from "@/components/seo/breadcrumbs";
import { JsonLd } from "@/components/seo/json-ld";
import { LinkCloud } from "@/components/seo/link-cloud";
import { LocalBusinessGrid } from "@/components/seo/local-business-grid";
import { SeoFaq } from "@/components/seo/seo-faq";
import { SEO_CATEGORIES, localizeSeoCategory } from "@/lib/seo/categories";
import { createPublicMetadata } from "@/lib/seo/metadata";
import { breadcrumbJsonLd, faqJsonLd, graph, itemListJsonLd, localePath, webPageJsonLd, type Crumb } from "@/lib/seo/schema";
import { categoryCounts, getDistrict, getSeoIndex, groupByCity, groupByDistrict, isLegacyFethiye, sortForListing, topRated } from "@/lib/seo/seo-data";
import { absoluteUrl, businessPath } from "@/lib/seo/site";
import { buildAreaFaq, buildAreaIntro, composeDescription, joinList, placeVars, rankByFrequency, type AreaListingFacts } from "@/lib/seo/text";
import type { Locale, TFunction } from "@/i18n/config";
import { getLocale, getT } from "@/i18n/server";

type Props = { params: Promise<{ city: string; district: string }> };

// İşletmesi olan her ilçe için üretilir, saatte bir yenilenir; yeni ilçeler ilk istekte oluşur.
export const revalidate = 3600;

export async function generateStaticParams() {
  const index = await getSeoIndex();
  return groupByCity(index).flatMap((city) => groupByDistrict(city.businesses)
    .filter((district) => !isLegacyFethiye(city.slug, district.slug))
    .map((district) => ({ city: city.slug, district: district.slug })));
}

function facts(district: NonNullable<Awaited<ReturnType<typeof getDistrict>>>, t: TFunction): AreaListingFacts {
  return {
    place: district.district,
    businessCount: district.businesses.length,
    // Mahalle verisi tutulmadığı için ilçe sayfasında alt bölge kırılımı yazılmaz.
    districts: rankByFrequency([]),
    topRated: topRated(district.businesses),
    verifiedCount: district.businesses.filter((row) => row.isVerified).length,
    categories: categoryCounts(district.businesses).map((item) => ({ label: t(item.label), count: item.count })),
  };
}

function title(district: string, labels: string[], t: TFunction, locale: Locale) {
  const place = placeVars(district, locale);
  const base = t("{inPlace} Online Randevu", place);
  let picked: string[] = [];
  for (const label of labels.slice(0, 3)) {
    const next = [...picked, label];
    if (`${base}: ${joinList(next, locale)}`.length > 58) break;
    picked = next;
  }
  return picked.length ? `${base}: ${joinList(picked, locale)}` : t("{inPlace} Online Randevu ve İşletmeler", place);
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { city: citySlug, district: districtSlug } = await params;
  if (isLegacyFethiye(citySlug, districtSlug)) return { title: "Fethiye", robots: { index: false, follow: true } };
  const [t, locale, district] = await Promise.all([getT(), getLocale(), getDistrict(citySlug, districtSlug)]);
  if (!district) return { title: t("Sayfa bulunamadı"), robots: { index: false, follow: true } };
  const categories = categoryCounts(district.businesses);
  const lower = (value: string) => locale === "tr" ? value.toLocaleLowerCase("tr-TR") : value.toLowerCase();
  const description = composeDescription([
    t("{placeAdj} ({city}) {count} işletmeyi keşfet{categories}.", { ...placeVars(district.district, locale), city: district.city, count: district.businesses.length, categories: categories.length ? `: ${categories.slice(0, 3).map((item) => lower(t(item.label))).join(", ")}` : "" }),
    t("Hizmetleri, fiyatları ve gerçek yorumları karşılaştır, uygun saati seçip online randevu al."),
    t("Müşteriler için ücretsiz."),
  ]);
  return createPublicMetadata({
    title: title(district.district, categories.map((item) => t(locale === "tr" ? item.label : SEO_CATEGORIES[item.slug].plural)), t, locale),
    description,
    pathname: `/sehir/${district.citySlug}/ilce/${district.slug}`,
    image: null,
    locale,
  });
}

export default async function DistrictPage({ params }: Props) {
  const { city: citySlug, district: districtSlug } = await params;
  if (isLegacyFethiye(citySlug, districtSlug)) await permanentRedirect("/mugla/fethiye");
  const district = await getDistrict(citySlug, districtSlug);
  if (!district) notFound();
  const [index, t, locale] = await Promise.all([getSeoIndex(), getT(), getLocale()]);
  const place = placeVars(district.district, locale);
  const cityPlace = placeVars(district.city, locale);
  const basePath = `/sehir/${district.citySlug}/ilce/${district.slug}`;
  const path = localePath(basePath, locale);
  const pageUrl = absoluteUrl(path);
  const areaFacts = facts(district, t);
  const intro = buildAreaIntro(areaFacts, locale);
  const faq = buildAreaFaq(areaFacts, locale);
  const categories = categoryCounts(district.businesses);
  const businesses = sortForListing(district.businesses);
  const cityRows = index.filter((row) => row.citySlug === district.citySlug);
  const siblings = groupByDistrict(cityRows).filter((item) => item.slug !== district.slug).slice(0, 24);
  const crumbs: Crumb[] = [
    { name: t("Ana Sayfa"), path: localePath("/", locale) },
    { name: district.city, path: localePath(`/sehir/${district.citySlug}`, locale) },
    { name: district.district, path },
  ];
  const districtHref = (slug: string) => isLegacyFethiye(district.citySlug, slug) ? "/mugla/fethiye" : `/sehir/${district.citySlug}/ilce/${slug}`;
  const categoryLink = (slug: string) => {
    const cat = localizeSeoCategory(SEO_CATEGORIES[slug], t);
    return t("{place} {category}", { place: district.district, category: locale === "tr" ? cat.label.toLocaleLowerCase("tr-TR") : cat.label.toLowerCase(), plural: cat.plural });
  };

  const jsonLd = graph(
    webPageJsonLd({ path, type: "CollectionPage", name: t("{place} ({city}) online randevu", { ...place, city: district.city }), description: intro[0] ?? t("{place} işletmeleri", place), breadcrumbId: `${pageUrl}#breadcrumb`, mainEntityId: `${pageUrl}#businesses`, locale }),
    breadcrumbJsonLd(crumbs, `${pageUrl}#breadcrumb`),
    itemListJsonLd(businesses.slice(0, 50).map((row) => ({ name: row.name, path: localePath(businessPath(row.slug), locale), image: row.coverUrl || row.logoUrl })), { id: `${pageUrl}#businesses`, name: t("{place} işletmeleri", place) }),
    faqJsonLd(faq, `${pageUrl}#faq`),
  );

  return (
    <MarketingPage>
      <main className="content-page">
        <JsonLd data={jsonLd} />
        <Breadcrumbs items={crumbs} />
        <section className="geo-seo-hero">
          <span><MapPin size={14} aria-hidden="true" /> {district.district.toLocaleUpperCase("tr-TR")} · {district.city.toLocaleUpperCase("tr-TR")}</span>
          <h1>{t("{inPlace} online randevu al.", place)}</h1>
          <p>{t("{placeAdj} işletmeleri, hizmetleri, fiyatları ve uygun saatleri tek yerde karşılaştır; sana uyan randevuyu birkaç dokunuşla oluştur.", place)}</p>
          <div><ShieldCheck size={15} aria-hidden="true" /> {t("{count} aktif işletme", { count: district.businesses.length })}</div>
        </section>

        <AreaIntro id="district-intro-title" title={t("{inPlace} randevu alabileceğin işletmeler", place)} paragraphs={intro} />

        {categories.length > 0 && (
          <section className="geo-category-links" aria-labelledby="district-categories-title">
            <header><span>{t("KATEGORİYE GÖRE KEŞFET")}</span><h2 id="district-categories-title">{t("{inPlace} ne arıyorsun?", place)}</h2></header>
            <div>
              {categories.map((item) => (
                <Link key={item.slug} href={`${basePath}/${item.slug}`}>
                  <Compass size={17} aria-hidden="true" />
                  <span><b>{categoryLink(item.slug)}</b><small>{t("{count} işletme", { count: item.count })}</small></span>
                  <ArrowRight size={15} aria-hidden="true" />
                </Link>
              ))}
            </div>
          </section>
        )}

        <section className="py-14" aria-labelledby="district-businesses-title">
          <header className="mb-7">
            <span className="text-[10px] font-black tracking-[.17em] text-[#0b6b45]">{t("YAYINDAKİ İŞLETMELER")}</span>
            <h2 id="district-businesses-title" className="mt-3 text-4xl font-bold tracking-[-.05em] text-[#10241c]">{t("{placeAdj} işletmeler", place)}</h2>
          </header>
          <LocalBusinessGrid businesses={businesses} />
        </section>

        <LinkCloud
          id="district-siblings"
          kicker={district.city.toLocaleUpperCase("tr-TR")}
          title={t("{placeAdj} diğer ilçeler", cityPlace)}
          links={[
            { href: `/sehir/${district.citySlug}`, label: t("{inPlace} tüm işletmeler", cityPlace), meta: t("{count} işletme", { count: cityRows.length }) },
            ...siblings.map((item) => ({ href: districtHref(item.slug), label: t("{inPlace} online randevu", placeVars(item.district, locale)), meta: t("{count} işletme", { count: item.businesses.length }) })),
          ]}
        />

        <SeoFaq id="district-faq-title" title={t("{place} hakkında sık sorulan sorular", place)} faq={faq} />
      </main>
    </MarketingPage>
  );
}
