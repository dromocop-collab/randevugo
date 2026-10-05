import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, CalendarCheck2, Search, ShieldCheck } from "lucide-react";
import { MarketingPage } from "@/components/marketing/marketing-shell";
import { AreaIntro } from "@/components/seo/area-intro";
import { Breadcrumbs } from "@/components/seo/breadcrumbs";
import { JsonLd } from "@/components/seo/json-ld";
import { LocalBusinessGrid } from "@/components/seo/local-business-grid";
import { SeoFaq } from "@/components/seo/seo-faq";
import { LOCAL_CATEGORIES, businessesForCategory, getFethiyeBusinesses, type LocalCategorySlug } from "@/lib/seo/local-seo";
import { createPublicMetadata } from "@/lib/seo/metadata";
import { breadcrumbJsonLd, faqJsonLd, graph, itemListJsonLd, webPageJsonLd, type Crumb } from "@/lib/seo/schema";
import { categoryCounts, sortForListing, topRated } from "@/lib/seo/seo-data";
import { absoluteUrl, businessPath } from "@/lib/seo/site";
import { buildAreaFaq, buildAreaIntro, rankByFrequency } from "@/lib/seo/text";

export const revalidate = 3600;
export const metadata: Metadata = createPublicMetadata({
  title: "Fethiye'de Online Randevu – Kuaför, Berber, Güzellik",
  description: "Fethiye'deki kuaför, berber, güzellik merkezi, nail studio ve spa işletmelerini keşfet; hizmetleri, fiyatları ve müsait saatleri görüp online randevu al.",
  pathname: "/mugla/fethiye",
  keywords: ["Fethiye online randevu", "Fethiye kuaför", "Fethiye berber", "Fethiye güzellik merkezi"],
});

const STEPS = ["Kategori ve işletme seç", "Hizmeti ve uygun saati karşılaştır", "Bilgilerini onaylayıp randevunu oluştur"];

export default async function FethiyePage() {
  const businesses = sortForListing(await getFethiyeBusinesses());
  const path = "/mugla/fethiye";
  const pageUrl = absoluteUrl(path);
  const crumbs: Crumb[] = [{ name: "Ana Sayfa", path: "/" }, { name: "Muğla", path: "/sehir/mugla" }, { name: "Fethiye", path }];
  const facts = {
    place: "Fethiye",
    businessCount: businesses.length,
    // Fethiye bir ilçe: mahalle verisi olmadığından ilçe kırılımı yazılmaz.
    districts: rankByFrequency([]),
    topRated: topRated(businesses),
    verifiedCount: businesses.filter((row) => row.isVerified).length,
    categories: categoryCounts(businesses).map((item) => ({ label: item.label, count: item.count })),
  };
  const intro = businesses.length ? buildAreaIntro(facts) : [];
  const faq = businesses.length ? buildAreaFaq(facts) : [];
  const categories = (Object.keys(LOCAL_CATEGORIES) as LocalCategorySlug[])
    .map((slug) => ({ slug, item: LOCAL_CATEGORIES[slug], count: businessesForCategory(businesses, slug).length }))
    .filter((entry) => entry.count > 0);

  const jsonLd = graph(
    webPageJsonLd({ path, type: "CollectionPage", name: "Fethiye'de online randevu", description: intro[0] ?? "Fethiye'deki işletmeler", breadcrumbId: `${pageUrl}#breadcrumb` }),
    breadcrumbJsonLd(crumbs, `${pageUrl}#breadcrumb`),
    businesses.length ? itemListJsonLd(businesses.map((row) => ({ name: row.name, path: businessPath(row.slug) })), { name: "Fethiye işletmeleri" }) : null,
    faqJsonLd(faq),
  );

  return (
    <MarketingPage>
      <main className="content-page">
        <JsonLd data={jsonLd} />
        <Breadcrumbs items={crumbs} />
        <section className="mt-8 overflow-hidden rounded-[36px] bg-[linear-gradient(135deg,#0b6b45,#318a61)] p-8 text-white sm:p-14">
          <span className="text-[10px] font-black tracking-[.18em] text-[#c9f45b]">FETHİYE · MUĞLA</span>
          <h1 className="mt-5 max-w-4xl text-5xl font-bold tracking-[-.06em] sm:text-7xl">Fethiye&apos;de online randevu al.</h1>
          <p className="mt-6 max-w-2xl text-base leading-8 text-white/70">Gerçek işletmeleri, hizmetleri, fiyatları ve müsait saatleri karşılaştır; sana uyan randevuyu saniyeler içinde oluştur.</p>
          <div className="mt-8 flex flex-wrap gap-3 text-xs font-bold">
            <span className="rounded-full bg-white/10 px-4 py-2"><ShieldCheck className="mr-2 inline" size={15} aria-hidden="true" />{businesses.length} aktif işletme</span>
            <span className="rounded-full bg-white/10 px-4 py-2"><CalendarCheck2 className="mr-2 inline" size={15} aria-hidden="true" />Canlı müsaitlik</span>
          </div>
        </section>

        <AreaIntro id="fethiye-intro" title="Fethiye'de randevu alabileceğin işletmeler" paragraphs={intro} />

        {categories.length > 0 && (
          <section className="py-16" aria-labelledby="fethiye-categories">
            <p className="text-[10px] font-black tracking-[.17em] text-[#0b6b45]">POPÜLER KATEGORİLER</p>
            <h2 id="fethiye-categories" className="mt-3 text-4xl font-bold tracking-[-.05em] text-[#10241c]">Bugün neye ihtiyacın var?</h2>
            <div className="mt-7 flex flex-wrap gap-3">
              {categories.map(({ slug, item, count }) => (
                <Link key={slug} href={`/mugla/fethiye/${slug}`} className="group flex items-center gap-3 rounded-full border border-[#153d29]/10 bg-white px-5 py-3 text-sm font-bold text-[#10241c] shadow-sm transition hover:-translate-y-1">
                  <Search size={15} className="text-[#0b6b45]" aria-hidden="true" />Fethiye {item.noun} <small className="font-semibold text-[#60756a]">({count})</small>
                  <ArrowRight size={14} className="text-[#0b6b45] transition group-hover:translate-x-1" aria-hidden="true" />
                </Link>
              ))}
            </div>
          </section>
        )}

        <section aria-labelledby="fethiye-businesses">
          <p className="text-[10px] font-black tracking-[.17em] text-[#0b6b45]">GERÇEK İŞLETMELER</p>
          <h2 id="fethiye-businesses" className="mb-7 mt-3 text-4xl font-bold tracking-[-.05em] text-[#10241c]">Fethiye&apos;de öne çıkan yerler</h2>
          <LocalBusinessGrid businesses={businesses} />
        </section>

        <section className="pt-16" aria-labelledby="fethiye-howto">
          <h2 id="fethiye-howto" className="text-3xl font-bold text-[#10241c]">Fethiye&apos;de online randevu nasıl alınır?</h2>
          <ol className="mt-6 grid gap-4 md:grid-cols-3">
            {STEPS.map((step, index) => <li key={step} className="rounded-2xl bg-white/75 p-5"><b className="text-[#0b6b45]">0{index + 1}</b><p className="mt-3 font-bold text-[#10241c]">{step}</p></li>)}
          </ol>
        </section>

        <SeoFaq id="fethiye-faq" title="Sık sorulan sorular" faq={faq} />
      </main>
    </MarketingPage>
  );
}
