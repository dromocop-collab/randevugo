import Link from "next/link";
import { ArrowUpRight, BadgeCheck, BriefcaseBusiness, CalendarCheck2, ShieldCheck, Sparkles } from "lucide-react";
import { MarketingFooter, MarketingHeader } from "@/components/marketing/marketing-shell";
import { RoviMascot } from "@/components/brand/rovi-mascot";
import { DiscoverInteractive } from "./kesfet-client";
import { JsonLd } from "@/components/seo/json-ld";
import { LinkCloud } from "@/components/seo/link-cloud";
import { breadcrumbJsonLd, graph, itemListJsonLd, webPageJsonLd } from "@/lib/seo/schema";
import { categoryCounts, getSeoIndex, groupByCity, sortForListing } from "@/lib/seo/seo-data";
import { absoluteUrl, businessPath } from "@/lib/seo/site";
import { locative } from "@/lib/seo/text";
import styles from "./discover.module.css";

// Taranabilir dizin (şehir, kategori, işletme bağlantıları) sunucuda hazırlanır; saatte bir yenilenir.
export const revalidate = 3600;

export default async function DiscoverPage() {
  const index = await getSeoIndex();
  const cities = groupByCity(index);
  const combos = cities
    .flatMap((city) => categoryCounts(city.businesses).map((item) => ({ city, item })))
    .sort((a, b) => b.item.count - a.item.count)
    .slice(0, 30);
  const featured = sortForListing(index).slice(0, 30);
  const pageUrl = absoluteUrl("/kesfet");
  const jsonLd = graph(
    webPageJsonLd({ path: "/kesfet", type: "CollectionPage", name: "Yakındaki işletmeleri keşfet", description: "Şehir ve kategoriye göre online randevu alınabilen işletmeler.", breadcrumbId: `${pageUrl}#breadcrumb`, mainEntityId: featured.length ? `${pageUrl}#businesses` : undefined }),
    breadcrumbJsonLd([{ name: "Ana Sayfa", path: "/" }, { name: "Keşfet", path: "/kesfet" }], `${pageUrl}#breadcrumb`),
    featured.length ? itemListJsonLd(featured.map((row) => ({ name: row.name, path: businessPath(row.slug) })), { id: `${pageUrl}#businesses`, name: "Öne çıkan işletmeler" }) : null,
  );

  return (
    <div className="marketing-page min-h-screen">
      <MarketingHeader />

      <main className="mx-auto w-full max-w-7xl px-4 pb-16 pt-0 sm:pt-8 lg:px-8">
        {/* Hero — sunucuda çizilir (SEO) */}
        <section className={`${styles.page} ${styles.hero}`}>
          <div className={styles.heroGrid} aria-hidden="true" />
          <div className={styles.heroInner}>
            <div>
              <span className={styles.eyebrow}><Sparkles size={13} /> KEŞFET</span>
              <h1 className={styles.heroTitle}>İyi hissettiren<br /><em>hizmeti bul.</em></h1>
              <p className={styles.heroText}>Yakınındaki güvenilir işletmeleri karşılaştır, gerçek yorumları incele ve uygun saatten saniyeler içinde randevunu al.</p>
              <div className={styles.heroStats}>
                <span className={styles.heroStat}><ShieldCheck size={15} /> Güvenli randevu</span>
                <span className={styles.heroStat}><BadgeCheck size={15} /> Gerçek yorumlar</span>
                <span className={styles.heroStat}><CalendarCheck2 size={15} /> 7/24 açık</span>
              </div>
            </div>
            <div className={styles.heroMascot}><RoviMascot size={118} mood="wave" alt="Rovi keşif rehberi" priority /></div>
          </div>
        </section>

        <JsonLd data={jsonLd} />
        <DiscoverInteractive />

        {/* Sunucuda çizilen dizin: JavaScript çalışmadan da tüm şehir/kategori/işletme sayfalarına bağlantı verir. */}
        {index.length > 0 && (
          <div className={styles.page} style={{ marginTop: 36 }}>
            <LinkCloud id="kesfet-cities" kicker="ŞEHİRLER" title="Şehrine göre işletmeler" links={cities.map((city) => ({ href: `/sehir/${city.slug}`, label: `${locative(city.city)} online randevu`, meta: `${city.businesses.length} işletme` }))} />
            <LinkCloud id="kesfet-combos" kicker="ŞEHİR VE KATEGORİ" title="Popüler aramalar" links={combos.map(({ city, item }) => ({ href: `/sehir/${city.slug}/${item.slug}`, label: `${city.city} ${item.label.toLocaleLowerCase("tr-TR")}`, meta: `${item.count}` }))} />
            <LinkCloud id="kesfet-businesses" kicker="ÖNE ÇIKANLAR" title="Öne çıkan işletmeler" links={featured.map((row) => ({ href: businessPath(row.slug), label: row.name, meta: [row.district, row.city].filter(Boolean).join(", ") }))} />
          </div>
        )}

        {/* İşletme sahipleri için sade çağrı */}
        <section className={`${styles.page} ${styles.empty}`} style={{ marginTop: 36, borderStyle: "solid", justifyItems: "start", textAlign: "left" }}>
          <span className={styles.eyebrow} style={{ color: "var(--green-2)", borderColor: "var(--line)", background: "var(--soft)" }}><BriefcaseBusiness size={13} /> İŞLETME SAHİPLERİ İÇİN</span>
          <h3>İşletmeni burada listele, randevularını tek yerden yönet.</h3>
          <p>Takvim, ekip, müşteri ve kasa yönetimi tek profesyonel çalışma alanında. Lansmana özel ilk ay ücretsiz.</p>
          <div className={styles.emptyActions} style={{ justifyContent: "flex-start" }}>
            <Link href="/isletmeler" className={`${styles.pill} ${styles.pillPrimary}`}>İşletme çözümleri <ArrowUpRight size={15} /></Link>
          </div>
        </section>
      </main>
      <MarketingFooter />
    </div>
  );
}
