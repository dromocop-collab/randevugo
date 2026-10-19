import type { Metadata } from "next";
import Link from "@/i18n/link";
import { notFound } from "next/navigation";
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
import { categoryCounts, districtRanking, getCity, getSeoIndex, groupByCity, groupByDistrict, isLegacyFethiye, sortForListing, topRated } from "@/lib/seo/seo-data";
import { absoluteUrl, businessPath } from "@/lib/seo/site";
import { buildAreaFaq, buildAreaIntro, composeDescription, joinList, placeVars, type AreaListingFacts } from "@/lib/seo/text";
import type { Locale, TFunction } from "@/i18n/config";
import { getLocale, getT } from "@/i18n/server";

type Props = { params: Promise<{ city: string }> };

// Şehir sayfaları derleme sırasında üretilir, saatte bir yenilenir; yeni şehirler ilk istekte oluşur.
export const revalidate = 3600;

export async function generateStaticParams() {
  const index = await getSeoIndex();
  return groupByCity(index).map((city) => ({ city: city.slug }));
}

function cityFacts(city: NonNullable<Awaited<ReturnType<typeof getCity>>>, t: TFunction): AreaListingFacts {
  return {
    place: city.city,
    businessCount: city.businesses.length,
    districts: districtRanking(city.businesses),
    topRated: topRated(city.businesses),
    verifiedCount: city.businesses.filter((row) => row.isVerified).length,
    categories: categoryCounts(city.businesses).map((item) => ({ label: t(item.label), count: item.count })),
  };
}

/** "Muğla'da Online Randevu: Kuaför, Berber ve Spa" — en çok işletmesi olan kategorilerle, ~58 karaktere kadar. */
function cityTitle(city: string, labels: string[], t: TFunction, locale: Locale) {
  const place = placeVars(city, locale);
  const base = t("{inPlace} Online Randevu", place);
  let picked: string[] = [];
  for (const label of labels.slice(0, 3)) {
    const next = [...picked, label];
    if (`${base}: ${joinList(next, locale)}`.length > 58) break;
    picked = next;
  }
  return picked.length ? `${base}: ${joinList(picked, locale)}` : t("{inPlace} Online Randevu ve Yakındaki İşletmeler", place);
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { city: slug } = await params;
  const [t, locale, city] = await Promise.all([getT(), getLocale(), getCity(slug)]);
  if (!city) return { title: t("Şehir bulunamadı"), robots: { index: false, follow: true } };
  const place = placeVars(city.city, locale);
  const lower = (value: string) => locale === "tr" ? value.toLocaleLowerCase("tr-TR") : value.toLowerCase();
  const categories = categoryCounts(city.businesses).slice(0, 3).map((item) => lower(t(item.label)));
  const description = composeDescription([
    t("{placeAdj} {count} işletmeyi keşfet{categories}.", { ...place, count: city.businesses.length, categories: categories.length ? `: ${categories.join(", ")}` : "" }),
    t("Hizmetleri, fiyatları ve gerçek yorumları karşılaştır, uygun saati seçip online randevu al."),
    t("Fiyatları ve yorumları karşılaştır, uygun saatte online randevu al."),
    t("Müşteriler için ücretsiz."),
  ]);
  return createPublicMetadata({
    title: cityTitle(city.city, categoryCounts(city.businesses).map((item) => t(locale === "tr" ? item.label : SEO_CATEGORIES[item.slug].plural)), t, locale),
    description,
    pathname: `/sehir/${city.slug}`,
    image: null,
    locale,
  });
}

export default async function CityPage({ params }: Props) {
  const { city: slug } = await params;
  const [city, index, t, locale] = await Promise.all([getCity(slug), getSeoIndex(), getT(), getLocale()]);
  if (!city) notFound();
  const place = placeVars(city.city, locale);
  const path = localePath(`/sehir/${city.slug}`, locale);
  const pageUrl = absoluteUrl(path);
  const facts = cityFacts(city, t);
  const intro = buildAreaIntro(facts, locale);
  const faq = buildAreaFaq(facts, locale);
  const categories = categoryCounts(city.businesses);
  const businesses = sortForListing(city.businesses);
  const otherCities = groupByCity(index).filter((item) => item.slug !== city.slug).slice(0, 20);
  const districts = groupByDistrict(city.businesses);
  const crumbs: Crumb[] = [{ name: t("Ana Sayfa"), path: localePath("/", locale) }, { name: t("Keşfet"), path: localePath("/kesfet", locale) }, { name: city.city, path }];
  const title = t("{inPlace} online randevu", place);
  const categoryLink = (item: { slug: string; label: string }) => {
    const cat = localizeSeoCategory(SEO_CATEGORIES[item.slug], t);
    return t("{place} {category}", { place: city.city, category: locale === "tr" ? cat.label.toLocaleLowerCase("tr-TR") : cat.label.toLowerCase(), plural: cat.plural });
  };

  const jsonLd = graph(
    webPageJsonLd({ path, type: "CollectionPage", name: t("{place} online randevu ve işletmeler", place), description: intro[0] ?? title, breadcrumbId: `${pageUrl}#breadcrumb`, mainEntityId: `${pageUrl}#businesses`, locale }),
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
          <span><MapPin size={14} aria-hidden="true" /> {city.city.toLocaleUpperCase("tr-TR")} · {t("CANLI KEŞİF")}</span>
          <h1>{t("{inPlace} online randevu al.", place)}</h1>
          <p>{t("Şehrindeki yayınlanmış işletmeleri, hizmet detaylarını ve uygun saatleri keşfet. Sana uyan işletmeyi seçerek randevunu online oluştur.")}</p>
          <div><ShieldCheck size={15} aria-hidden="true" /> {t("{count} aktif işletme", { count: city.businesses.length })}</div>
        </section>

        <AreaIntro id="city-intro-title" title={t("{inPlace} randevu alabileceğin işletmeler", place)} paragraphs={intro} />

        {categories.length > 0 && (
          <section className="geo-category-links" aria-labelledby="city-categories-title">
            <header><span>{t("KATEGORİYE GÖRE KEŞFET")}</span><h2 id="city-categories-title">{t("{inPlace} ne arıyorsun?", place)}</h2></header>
            <div>
              {categories.map((item) => (
                <Link key={item.slug} href={`/sehir/${city.slug}/${item.slug}`}>
                  <Compass size={17} aria-hidden="true" />
                  <span><b>{categoryLink(item)}</b><small>{t("{count} işletme", { count: item.count })}</small></span>
                  <ArrowRight size={15} aria-hidden="true" />
                </Link>
              ))}
            </div>
          </section>
        )}

        <section className="py-14" aria-labelledby="city-businesses-title">
          <header className="mb-7">
            <span className="text-[10px] font-black tracking-[.17em] text-[#0b6b45]">{t("YAYINDAKİ İŞLETMELER")}</span>
            <h2 id="city-businesses-title" className="mt-3 text-4xl font-bold tracking-[-.05em] text-[#10241c]">{t("{placeAdj} işletmeleri keşfet", place)}</h2>
          </header>
          <LocalBusinessGrid businesses={businesses} />
        </section>

        <LinkCloud
          id="city-districts-title"
          kicker={t("İLÇEYE GÖRE")}
          title={t("{placeAdj} ilçeler", place)}
          links={districts.map((item) => ({ href: isLegacyFethiye(city.slug, item.slug) ? "/mugla/fethiye" : `/sehir/${city.slug}/ilce/${item.slug}`, label: t("{inPlace} online randevu", placeVars(item.district, locale)), meta: t("{count} işletme", { count: item.businesses.length }) }))}
        />

        <LinkCloud
          id="other-cities-title"
          kicker={t("DİĞER ŞEHİRLER")}
          title={t("Başka bir şehirde mi arıyorsun?")}
          links={otherCities.map((item) => ({ href: `/sehir/${item.slug}`, label: t("{inPlace} online randevu", placeVars(item.city, locale)), meta: t("{count} işletme", { count: item.businesses.length }) }))}
        />

        <SeoFaq id="city-faq-title" title={t("{place} hakkında sık sorulan sorular", place)} faq={faq} />
      </main>
    </MarketingPage>
  );
}
