import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
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
import { categoryCounts, districtRanking, getCity, getSeoIndex, groupByCity, sortForListing, topRated } from "@/lib/seo/seo-data";
import { absoluteUrl, businessPath } from "@/lib/seo/site";
import { buildAreaFaq, buildAreaIntro, composeDescription, joinTurkish, locative, locativeAdjective, type AreaListingFacts } from "@/lib/seo/text";

type Props = { params: Promise<{ city: string }> };

// Şehir sayfaları derleme sırasında üretilir, saatte bir yenilenir; yeni şehirler ilk istekte oluşur.
export const revalidate = 3600;

export async function generateStaticParams() {
  const index = await getSeoIndex();
  return groupByCity(index).map((city) => ({ city: city.slug }));
}

function cityFacts(city: NonNullable<Awaited<ReturnType<typeof getCity>>>): AreaListingFacts {
  return {
    place: city.city,
    businessCount: city.businesses.length,
    districts: districtRanking(city.businesses),
    topRated: topRated(city.businesses),
    verifiedCount: city.businesses.filter((row) => row.isVerified).length,
    categories: categoryCounts(city.businesses).map((item) => ({ label: item.label, count: item.count })),
  };
}

/** "Muğla'da Online Randevu: Kuaför, Berber ve Spa" — en çok işletmesi olan kategorilerle, ~58 karaktere kadar. */
function cityTitle(city: string, labels: string[]) {
  const base = `${locative(city)} Online Randevu`;
  let picked: string[] = [];
  for (const label of labels.slice(0, 3)) {
    const next = [...picked, label];
    if (`${base}: ${joinTurkish(next)}`.length > 58) break;
    picked = next;
  }
  return picked.length ? `${base}: ${joinTurkish(picked)}` : `${base} ve Yakındaki İşletmeler`;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { city: slug } = await params;
  const city = await getCity(slug);
  if (!city) return { title: "Şehir bulunamadı", robots: { index: false, follow: true } };
  const categories = categoryCounts(city.businesses).slice(0, 3).map((item) => item.label.toLocaleLowerCase("tr-TR"));
  const description = composeDescription([
    `${locativeAdjective(city.city)} ${city.businesses.length} işletmeyi keşfet${categories.length ? `: ${categories.join(", ")}` : ""}.`,
    "Hizmetleri, fiyatları ve gerçek yorumları karşılaştır, uygun saati seçip online randevu al.",
    "Fiyatları ve yorumları karşılaştır, uygun saatte online randevu al.",
    "Müşteriler için ücretsiz.",
  ]);
  return createPublicMetadata({
    title: cityTitle(city.city, categoryCounts(city.businesses).map((item) => item.label)),
    description,
    pathname: `/sehir/${city.slug}`,
    image: null,
  });
}

export default async function CityPage({ params }: Props) {
  const { city: slug } = await params;
  const [city, index] = await Promise.all([getCity(slug), getSeoIndex()]);
  if (!city) notFound();
  const path = `/sehir/${city.slug}`;
  const pageUrl = absoluteUrl(path);
  const facts = cityFacts(city);
  const intro = buildAreaIntro(facts);
  const faq = buildAreaFaq(facts);
  const categories = categoryCounts(city.businesses);
  const businesses = sortForListing(city.businesses);
  const otherCities = groupByCity(index).filter((item) => item.slug !== city.slug).slice(0, 20);
  const crumbs: Crumb[] = [{ name: "Ana Sayfa", path: "/" }, { name: "Keşfet", path: "/kesfet" }, { name: city.city, path }];
  const title = `${locative(city.city)} online randevu`;

  const jsonLd = graph(
    webPageJsonLd({ path, type: "CollectionPage", name: `${city.city} online randevu ve işletmeler`, description: intro[0] ?? title, breadcrumbId: `${pageUrl}#breadcrumb`, mainEntityId: `${pageUrl}#businesses` }),
    breadcrumbJsonLd(crumbs, `${pageUrl}#breadcrumb`),
    itemListJsonLd(businesses.slice(0, 50).map((row) => ({ name: row.name, path: businessPath(row.slug), image: row.coverUrl || row.logoUrl })), { id: `${pageUrl}#businesses`, name: `${city.city} işletmeleri` }),
    faqJsonLd(faq, `${pageUrl}#faq`),
  );

  return (
    <MarketingPage>
      <main className="content-page">
        <JsonLd data={jsonLd} />
        <Breadcrumbs items={crumbs} />
        <section className="geo-seo-hero">
          <span><MapPin size={14} aria-hidden="true" /> {city.city.toLocaleUpperCase("tr-TR")} · CANLI KEŞİF</span>
          <h1>{locative(city.city)} online randevu al.</h1>
          <p>Şehrindeki yayınlanmış işletmeleri, hizmet detaylarını ve uygun saatleri keşfet. Sana uyan işletmeyi seçerek randevunu online oluştur.</p>
          <div><ShieldCheck size={15} aria-hidden="true" /> {city.businesses.length} aktif işletme</div>
        </section>

        <AreaIntro id="city-intro-title" title={`${locative(city.city)} randevu alabileceğin işletmeler`} paragraphs={intro} />

        {categories.length > 0 && (
          <section className="geo-category-links" aria-labelledby="city-categories-title">
            <header><span>KATEGORİYE GÖRE KEŞFET</span><h2 id="city-categories-title">{locative(city.city)} ne arıyorsun?</h2></header>
            <div>
              {categories.map((item) => (
                <Link key={item.slug} href={`/sehir/${city.slug}/${item.slug}`}>
                  <Compass size={17} aria-hidden="true" />
                  <span><b>{city.city} {item.label.toLocaleLowerCase("tr-TR")}</b><small>{item.count} işletme</small></span>
                  <ArrowRight size={15} aria-hidden="true" />
                </Link>
              ))}
            </div>
          </section>
        )}

        <section className="py-14" aria-labelledby="city-businesses-title">
          <header className="mb-7">
            <span className="text-[10px] font-black tracking-[.17em] text-[#0b6b45]">YAYINDAKİ İŞLETMELER</span>
            <h2 id="city-businesses-title" className="mt-3 text-4xl font-bold tracking-[-.05em] text-[#10241c]">{locativeAdjective(city.city)} işletmeleri keşfet</h2>
          </header>
          <LocalBusinessGrid businesses={businesses} />
        </section>

        <LinkCloud
          id="other-cities-title"
          kicker="DİĞER ŞEHİRLER"
          title="Başka bir şehirde mi arıyorsun?"
          links={otherCities.map((item) => ({ href: `/sehir/${item.slug}`, label: `${locative(item.city)} online randevu`, meta: `${item.businesses.length} işletme` }))}
        />

        <SeoFaq id="city-faq-title" title={`${city.city} hakkında sık sorulan sorular`} faq={faq} />
      </main>
    </MarketingPage>
  );
}
