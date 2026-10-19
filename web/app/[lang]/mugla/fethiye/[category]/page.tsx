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
import { localizeSeoCategory, seoCategoryVars } from "@/lib/seo/categories";
import { createPublicMetadata } from "@/lib/seo/metadata";
import { breadcrumbJsonLd, faqJsonLd, graph, itemListJsonLd, localePath, webPageJsonLd, type Crumb } from "@/lib/seo/schema";
import { sortForListing, summarizeServices, topRated } from "@/lib/seo/seo-data";
import { absoluteUrl, businessPath } from "@/lib/seo/site";
import { buildAreaFaq, buildAreaIntro, composeDescription, placeVars, rankByFrequency, type AreaListingFacts } from "@/lib/seo/text";
import { getLocale, getT } from "@/i18n/server";

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
  const [t, locale] = await Promise.all([getT(), getLocale()]);
  const item = localizeSeoCategory(LOCAL_CATEGORIES[category], t);
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
  const vars = { ...placeVars("Fethiye", locale), ...seoCategoryVars(item, locale) };
  return { rows, item, facts, t, locale, vars };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { category } = await params;
  const page = await loadPage(category);
  if (!page) {
    const t = await getT();
    return { title: t("Sayfa bulunamadı"), robots: { index: false, follow: true } };
  }
  const { item, rows, facts, t, locale, vars } = page;
  return createPublicMetadata({
    title: t("{place} {category} – Fiyatlar ve Online Randevu", vars),
    description: composeDescription([
      t("{placeAdj} {count} {noun} işletmesini karşılaştır.", { ...vars, count: rows.length }),
      facts.topRated ? t("En yüksek puan: {name} ({rating}).", { name: facts.topRated.name, rating: facts.topRated.rating.toFixed(1) }) : undefined,
      t("Hizmetleri, fiyatları, yorumları ve müsait saatleri incele, online randevunu ücretsiz al."),
      t("{Examples} için uygun saati seç.", vars),
    ]),
    pathname: `/mugla/fethiye/${category}`,
    image: item.image,
    imageWidth: 1200,
    imageHeight: 900,
    imageAlt: t("{place} {noun} randevusu", vars),
    locale,
  });
}

export default async function FethiyeCategoryPage({ params }: Props) {
  const { category } = await params;
  const page = await loadPage(category);
  if (!page) notFound();
  const { rows, item, facts, t, locale, vars } = page;
  const path = localePath(`/mugla/fethiye/${category}`, locale);
  const pageUrl = absoluteUrl(path);
  const intro = buildAreaIntro(facts, locale);
  const faq = buildAreaFaq(facts, locale);
  const crumbs: Crumb[] = [{ name: t("Ana Sayfa"), path: localePath("/", locale) }, { name: "Muğla", path: localePath("/sehir/mugla", locale) }, { name: "Fethiye", path: localePath("/mugla/fethiye", locale) }, { name: t("{place} {category}", vars), path }]; // i18n-ignore — yer adları
  const all = await getFethiyeBusinesses();
  const others = (Object.keys(LOCAL_CATEGORIES) as LocalCategorySlug[])
    .filter((slug) => slug !== category)
    .map((slug) => ({ slug, count: businessesForCategory(all, slug).length }))
    .filter((entry) => entry.count > 0);

  const jsonLd = graph(
    webPageJsonLd({ path, type: "CollectionPage", name: t("{place} {plural}", vars), description: intro[0] ?? "", breadcrumbId: `${pageUrl}#breadcrumb`, locale }),
    breadcrumbJsonLd(crumbs, `${pageUrl}#breadcrumb`),
    itemListJsonLd(rows.map((row) => ({ name: row.name, path: localePath(businessPath(row.slug), locale) })), { name: t("{place} {plural}", vars) }),
    faqJsonLd(faq),
  );

  return (
    <MarketingPage>
      <main className="content-page">
        <JsonLd data={jsonLd} />
        <Breadcrumbs items={crumbs} />
        <section className="mt-8 rounded-[34px] bg-[linear-gradient(135deg,#eff7ec,#dfeee1)] p-8 sm:p-14">
          <span className="text-[10px] font-black tracking-[.18em] text-[#0b6b45]">{"FETHİYE" /* i18n-ignore — yer adı */} · {locale === "tr" ? item.label.toLocaleUpperCase("tr-TR") : item.label.toUpperCase()}</span>
          <h1 className="mt-5 text-5xl font-bold tracking-[-.055em] text-[#10241c] sm:text-7xl">{t("{place} {plural}", vars)}</h1>
          <p className="mt-6 max-w-3xl text-base leading-8 text-[#60756a]">{t("{placeAdj} {noun} işletmelerini, {examples} hizmetlerini, fiyatları ve uygun randevu saatlerini tek yerde inceleyin.", vars)}</p>
        </section>
        <AreaIntro id="fethiye-category-intro" title={t("{inPlace} {noun} seçerken", vars)} paragraphs={intro} />
        <section className="py-14" aria-label={t("{place} {plural}", vars)}><LocalBusinessGrid businesses={rows} /></section>
        <LinkCloud id="fethiye-other" kicker={"FETHİYE" /* i18n-ignore — yer adı */} title={t("{inPlace} diğer kategoriler", vars)} links={others.map((entry) => {
          const other = localizeSeoCategory(LOCAL_CATEGORIES[entry.slug], t);
          return { href: `/mugla/fethiye/${entry.slug}`, label: t("Fethiye {noun}", { noun: other.noun, plural: other.plural }), meta: t("{count} işletme", { count: entry.count }) };
        })} />
        <SeoFaq id="fethiye-category-faq" title={t("Sık sorulan sorular")} faq={faq} />
      </main>
    </MarketingPage>
  );
}
