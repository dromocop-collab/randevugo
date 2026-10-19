import Link from "@/i18n/link";
import { ArrowUpRight, BadgeCheck, BriefcaseBusiness, CalendarCheck2, ShieldCheck, Sparkles } from "lucide-react";
import { MarketingFooter, MarketingHeader } from "@/components/marketing/marketing-shell";
import { RoviMascot } from "@/components/brand/rovi-mascot";
import { DiscoverInteractive } from "./kesfet-client";
import { JsonLd } from "@/components/seo/json-ld";
import { LinkCloud } from "@/components/seo/link-cloud";
import { SEO_CATEGORIES, localizeSeoCategory } from "@/lib/seo/categories";
import { breadcrumbJsonLd, graph, itemListJsonLd, localePath, webPageJsonLd } from "@/lib/seo/schema";
import { categoryCounts, getSeoIndex, groupByCity, sortForListing } from "@/lib/seo/seo-data";
import { absoluteUrl, businessPath } from "@/lib/seo/site";
import { placeVars } from "@/lib/seo/text";
import { getLocale, getT } from "@/i18n/server";
import styles from "./discover.module.css";

// Taranabilir dizin (şehir, kategori, işletme bağlantıları) sunucuda hazırlanır; saatte bir yenilenir.
export const revalidate = 3600;

export default async function DiscoverPage() {
  const [index, t, locale] = await Promise.all([getSeoIndex(), getT(), getLocale()]);
  const cities = groupByCity(index);
  const combos = cities
    .flatMap((city) => categoryCounts(city.businesses).map((item) => ({ city, item })))
    .sort((a, b) => b.item.count - a.item.count)
    .slice(0, 30);
  const featured = sortForListing(index).slice(0, 30);
  const path = localePath("/kesfet", locale);
  const pageUrl = absoluteUrl(path);
  const jsonLd = graph(
    webPageJsonLd({ path, type: "CollectionPage", name: t("Yakındaki işletmeleri keşfet"), description: t("Şehir ve kategoriye göre online randevu alınabilen işletmeler."), breadcrumbId: `${pageUrl}#breadcrumb`, mainEntityId: featured.length ? `${pageUrl}#businesses` : undefined, locale }),
    breadcrumbJsonLd([{ name: t("Ana Sayfa"), path: localePath("/", locale) }, { name: t("Keşfet"), path }], `${pageUrl}#breadcrumb`),
    featured.length ? itemListJsonLd(featured.map((row) => ({ name: row.name, path: localePath(businessPath(row.slug), locale) })), { id: `${pageUrl}#businesses`, name: t("Öne çıkan işletmeler") }) : null,
  );
  const comboLabel = (city: string, slug: string) => {
    const cat = localizeSeoCategory(SEO_CATEGORIES[slug], t);
    return t("{place} {category}", { place: city, category: locale === "tr" ? cat.label.toLocaleLowerCase("tr-TR") : cat.label.toLowerCase(), plural: cat.plural });
  };

  return (
    <div className="marketing-page min-h-screen">
      <MarketingHeader />

      <main className="mx-auto w-full max-w-7xl px-4 pb-16 pt-0 sm:pt-8 lg:px-8">
        {/* Hero — sunucuda çizilir (SEO) */}
        <section className={`${styles.page} ${styles.hero}`}>
          <div className={styles.heroGrid} aria-hidden="true" />
          <div className={styles.heroInner}>
            <div>
              <span className={styles.eyebrow}><Sparkles size={13} /> {t("KEŞFET")}</span>
              <h1 className={styles.heroTitle}>{t("İyi hissettiren")}<br /><em>{t("hizmeti bul.")}</em></h1>
              <p className={styles.heroText}>{t("Yakınındaki güvenilir işletmeleri karşılaştır, gerçek yorumları incele ve uygun saatten saniyeler içinde randevunu al.")}</p>
              <div className={styles.heroStats}>
                <span className={styles.heroStat}><ShieldCheck size={15} /> {t("Güvenli randevu")}</span>
                <span className={styles.heroStat}><BadgeCheck size={15} /> {t("Gerçek yorumlar")}</span>
                <span className={styles.heroStat}><CalendarCheck2 size={15} /> {t("7/24 açık")}</span>
              </div>
            </div>
            <div className={styles.heroMascot}><RoviMascot size={118} mood="wave" alt={t("Rovi keşif rehberi")} priority /></div>
          </div>
        </section>

        <JsonLd data={jsonLd} />
        <DiscoverInteractive />

        {/* Sunucuda çizilen dizin: JavaScript çalışmadan da tüm şehir/kategori/işletme sayfalarına bağlantı verir. */}
        {index.length > 0 && (
          <div className={styles.page} style={{ marginTop: 36 }}>
            <LinkCloud id="kesfet-cities" kicker={t("ŞEHİRLER")} title={t("Şehrine göre işletmeler")} links={cities.map((city) => ({ href: `/sehir/${city.slug}`, label: t("{inPlace} online randevu", placeVars(city.city, locale)), meta: t("{count} işletme", { count: city.businesses.length }) }))} />
            <LinkCloud id="kesfet-combos" kicker={t("ŞEHİR VE KATEGORİ")} title={t("Popüler aramalar")} links={combos.map(({ city, item }) => ({ href: `/sehir/${city.slug}/${item.slug}`, label: comboLabel(city.city, item.slug), meta: `${item.count}` }))} />
            <LinkCloud id="kesfet-businesses" kicker={t("ÖNE ÇIKANLAR")} title={t("Öne çıkan işletmeler")} links={featured.map((row) => ({ href: businessPath(row.slug), label: row.name, meta: [row.district, row.city].filter(Boolean).join(", ") }))} />
          </div>
        )}

        {/* İşletme sahipleri için sade çağrı */}
        <section className={`${styles.page} ${styles.empty}`} style={{ marginTop: 36, borderStyle: "solid", justifyItems: "start", textAlign: "left" }}>
          <span className={styles.eyebrow} style={{ color: "var(--green-2)", borderColor: "var(--line)", background: "var(--soft)" }}><BriefcaseBusiness size={13} /> {t("İŞLETME SAHİPLERİ İÇİN")}</span>
          <h3>{t("İşletmeni burada listele, randevularını tek yerden yönet.")}</h3>
          <p>{t("Takvim, ekip, müşteri ve kasa yönetimi tek profesyonel çalışma alanında. Lansmana özel ilk ay ücretsiz.")}</p>
          <div className={styles.emptyActions} style={{ justifyContent: "flex-start" }}>
            <Link href="/isletmeler" className={`${styles.pill} ${styles.pillPrimary}`}>{t("İşletme çözümleri")} <ArrowUpRight size={15} /></Link>
          </div>
        </section>
      </main>
      <MarketingFooter />
    </div>
  );
}
