import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { MarketingPage } from "@/components/marketing/marketing-shell";
import { AreaIntro } from "@/components/seo/area-intro";
import { Breadcrumbs } from "@/components/seo/breadcrumbs";
import { JsonLd } from "@/components/seo/json-ld";
import { LinkCloud } from "@/components/seo/link-cloud";
import { LocalBusinessGrid } from "@/components/seo/local-business-grid";
import { SeoFaq } from "@/components/seo/seo-faq";
import { LOCAL_CATEGORIES, businessesForCategory, getFethiyeBusinesses, isLocalCategory, type LocalCategorySlug } from "@/lib/seo/local-seo";
import { createPublicMetadata } from "@/lib/seo/metadata";
import { breadcrumbJsonLd, faqJsonLd, graph, itemListJsonLd, webPageJsonLd, type Crumb } from "@/lib/seo/schema";
import { sortForListing, summarizeServices, topRated } from "@/lib/seo/seo-data";
import { absoluteUrl, businessPath } from "@/lib/seo/site";
import { buildAreaFaq, buildAreaIntro, composeDescription, rankByFrequency, type AreaListingFacts } from "@/lib/seo/text";

export const revalidate = 3600;
type Props = { params: Promise<{ category: string }> };

export async function generateStaticParams() {
  const rows = await getFethiyeBusinesses();
  return (Object.keys(LOCAL_CATEGORIES) as LocalCategorySlug[])
    .filter((slug) => businessesForCategory(rows, slug).length > 0)
    .map((category) => ({ category }));
}

async function loadPage(category: string) {
  if (!isLocalCategory(category)) return null;
  const rows = sortForListing(businessesForCategory(await getFethiyeBusinesses(), category));
  if (rows.length === 0) return null;
  const item = LOCAL_CATEGORIES[category];
  const services = await summarizeServices(rows);
  const facts: AreaListingFacts = {
    place: "Fethiye",
    noun: item.noun,
    plural: item.plural,
    businessCount: rows.length,
    districts: rankByFrequency([]),
    topRated: topRated(rows),
    verifiedCount: rows.filter((row) => row.isVerified).length,
    minPrice: services.minPrice,
    maxPrice: services.maxPrice,
    popularServices: services.popularServices,
  };
  return { rows, item, facts };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { category } = await params;
  const page = await loadPage(category);
  if (!page) return { title: "Sayfa bulunamadı", robots: { index: false, follow: true } };
  const { item, rows, facts } = page;
  return createPublicMetadata({
    title: `Fethiye ${item.label} – Fiyatlar ve Online Randevu`,
    description: composeDescription([
      `Fethiye'deki ${rows.length} ${item.noun} işletmesini karşılaştır.`,
      facts.topRated ? `En yüksek puan: ${facts.topRated.name} (${facts.topRated.rating.toFixed(1)}).` : undefined,
      "Hizmetleri, fiyatları, yorumları ve müsait saatleri incele, online randevunu ücretsiz al.",
      `${item.examples.charAt(0).toLocaleUpperCase("tr-TR")}${item.examples.slice(1)} için uygun saati seç.`,
    ]),
    pathname: `/mugla/fethiye/${category}`,
    image: item.image,
    imageWidth: 1200,
    imageHeight: 900,
    imageAlt: `Fethiye ${item.noun} randevusu`,
  });
}

export default async function FethiyeCategoryPage({ params }: Props) {
  const { category } = await params;
  const page = await loadPage(category);
  if (!page) notFound();
  const { rows, item, facts } = page;
  const path = `/mugla/fethiye/${category}`;
  const pageUrl = absoluteUrl(path);
  const intro = buildAreaIntro(facts);
  const faq = buildAreaFaq(facts);
  const crumbs: Crumb[] = [{ name: "Ana Sayfa", path: "/" }, { name: "Muğla", path: "/sehir/mugla" }, { name: "Fethiye", path: "/mugla/fethiye" }, { name: `Fethiye ${item.label}`, path }];
  const all = await getFethiyeBusinesses();
  const others = (Object.keys(LOCAL_CATEGORIES) as LocalCategorySlug[])
    .filter((slug) => slug !== category)
    .map((slug) => ({ slug, count: businessesForCategory(all, slug).length }))
    .filter((entry) => entry.count > 0);

  const jsonLd = graph(
    webPageJsonLd({ path, type: "CollectionPage", name: `Fethiye ${item.plural}`, description: intro[0] ?? "", breadcrumbId: `${pageUrl}#breadcrumb` }),
    breadcrumbJsonLd(crumbs, `${pageUrl}#breadcrumb`),
    itemListJsonLd(rows.map((row) => ({ name: row.name, path: businessPath(row.slug) })), { name: `Fethiye ${item.plural}` }),
    faqJsonLd(faq),
  );

  return (
    <MarketingPage>
      <main className="content-page">
        <JsonLd data={jsonLd} />
        <Breadcrumbs items={crumbs} />
        <section className="mt-8 rounded-[34px] bg-[linear-gradient(135deg,#eff7ec,#dfeee1)] p-8 sm:p-14">
          <span className="text-[10px] font-black tracking-[.18em] text-[#0b6b45]">FETHİYE · {item.label.toLocaleUpperCase("tr-TR")}</span>
          <h1 className="mt-5 text-5xl font-bold tracking-[-.055em] text-[#10241c] sm:text-7xl">Fethiye {item.plural}</h1>
          <p className="mt-6 max-w-3xl text-base leading-8 text-[#60756a]">Fethiye&apos;deki {item.noun} işletmelerini, {item.examples} hizmetlerini, fiyatları ve uygun randevu saatlerini tek yerde inceleyin.</p>
        </section>
        <AreaIntro id="fethiye-category-intro" title={`Fethiye'de ${item.noun} seçerken`} paragraphs={intro} />
        <section className="py-14" aria-label={`Fethiye ${item.plural}`}><LocalBusinessGrid businesses={rows} /></section>
        <LinkCloud id="fethiye-other" kicker="FETHİYE" title="Fethiye'de diğer kategoriler" links={others.map((entry) => ({ href: `/mugla/fethiye/${entry.slug}`, label: `Fethiye ${LOCAL_CATEGORIES[entry.slug].noun}`, meta: `${entry.count} işletme` }))} />
        <SeoFaq id="fethiye-category-faq" title="Sık sorulan sorular" faq={faq} />
      </main>
    </MarketingPage>
  );
}
