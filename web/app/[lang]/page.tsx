import type { Metadata } from "next";
import Link from "@/i18n/link";
import { ArrowRight, ArrowUpRight, Building2, Compass, Scissors, Sparkles, Stethoscope } from "lucide-react";
import { MarketingFooter, MarketingHeader } from "@/components/marketing/marketing-shell";
import { HomeInteractive, type HomeInitialData } from "./home-client";
import { getDiscoveryFacets, getPopularBusinesses } from "@/features/discovery/search-repository";
import { listDynamicCategories } from "@/features/categories/category-request-repository";
import { CustomerLiveHome } from "@/features/live-queue/customer-live-home";
import { HomeLiveNow } from "@/components/home/home-live-now";
import { ScrollReveal } from "@/components/home/scroll-reveal";
import { HomeAppSection, HomeBusinessBand, HomeFaq, HomeHeroArt, HomeHeroIntro, HomeHowItWorks, HomeTrust } from "@/components/home/home-sections";
import styles from "@/components/home/home.module.css";
import { createPublicMetadata, safeJsonLd, SEO_SITE_URL } from "@/lib/seo/metadata";
import { tk, type TFunction } from "@/i18n/config";
import { getIntlLocale, getLocale, getT } from "@/i18n/server";

const HOME_DESCRIPTION = tk("Kuaför, berber, güzellik, sağlık, spor ve bakım işletmelerini keşfedin; hizmetleri ve uygun saatleri karşılaştırarak online randevunuzu kolayca alın.");

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return {
    ...createPublicMetadata({
    title: t("Online Randevu Al ve Yakınındaki İşletmeleri Keşfet"),
    description: t(HOME_DESCRIPTION),
    pathname: "/",
    keywords: [t("online randevu al"), t("yakındaki işletmeler"), t("kuaför randevusu"), t("berber randevusu"), t("güzellik merkezi randevusu"), "SeninRandevun"],
    // Paylaşım görseli app/opengraph-image.tsx'ten gelir.
    image: null,
    locale: await getLocale(),
    }),
    // Kök segmentte şablon uygulanmadığı için marka adı burada açıkça yazılır.
    title: { absolute: t("SeninRandevun – Online Randevu Al, Yakındaki İşletmeleri Keşfet") },
  };
}

const CUSTOMER_FAQ = [
  [tk("Randevu almak ücretli mi?"), tk("Hayır. İşletme keşfetmek ve online randevu oluşturmak müşteriler için tamamen ücretsizdir.")],
  [tk("Üye olmadan randevu alabilir miyim?"), tk("İşletmenin sunduğu akışa göre temel iletişim bilgilerinle hızlıca randevu oluşturabilirsin.")],
  [tk("Randevumu değiştirebilir miyim?"), tk("İşletmenin iptal ve değişiklik kuralları doğrultusunda randevunu kolayca yönetebilirsin.")],
  [tk("Yakınımdaki işletmeleri nasıl bulurum?"), tk("Keşfet ekranında şehir, kategori, işletme veya hizmet adıyla arama yapabilir; yayınlanmış işletmelerin profillerini karşılaştırabilirsin.")],
  [tk("Hangi hizmetler için randevu alabilirim?"), tk("Kuaför, berber, güzellik merkezi, spa, nail studio, sağlık, spor, veteriner ve danışmanlık dahil birçok alanda randevu alabilirsin.")],
];

function homeJsonLd(t: TFunction, inLanguage: string) {
  return {
    "@context": "https://schema.org",
    "@graph": [
      { "@type": "CollectionPage", "@id": `${SEO_SITE_URL}/#homepage`, url: SEO_SITE_URL, name: t("Yakınındaki İşletmeleri Keşfet ve Online Randevu Al"), description: t(HOME_DESCRIPTION), inLanguage, isPartOf: { "@id": `${SEO_SITE_URL}/#website` }, about: [t("Online randevu"), t("Yerel işletme keşfi"), t("Hizmet rezervasyonu")] },
      { "@type": "Service", "@id": `${SEO_SITE_URL}/#booking-service`, name: t("SeninRandevun Online Randevu ve İşletme Keşif Hizmeti"), serviceType: "Online appointment booking marketplace", provider: { "@id": `${SEO_SITE_URL}/#organization` }, areaServed: { "@type": "Country", name: "Türkiye" }, availableChannel: { "@type": "ServiceChannel", serviceUrl: `${SEO_SITE_URL}/kesfet`, availableLanguage: "Turkish" } }, // i18n-ignore (ülke adı)
      { "@type": "BreadcrumbList", "@id": `${SEO_SITE_URL}/#breadcrumb`, itemListElement: [{ "@type": "ListItem", position: 1, name: t("Ana Sayfa"), item: SEO_SITE_URL }] },
      { "@type": "FAQPage", "@id": `${SEO_SITE_URL}/#faq`, mainEntity: CUSTOMER_FAQ.map(([question, answer]) => ({ "@type": "Question", name: t(question), acceptedAnswer: { "@type": "Answer", text: t(answer) } })) },
    ],
  };
}

const SEO_JOURNEYS = [
  { href: "/kuafor-randevu", title: tk("Kuaför randevusu"), text: tk("Saç kesimi, boya, röfle ve bakım hizmetlerini keşfet."), icon: Scissors },
  { href: "/guzellik-merkezi-randevu", title: tk("Güzellik merkezi"), text: tk("Cilt bakımı ve güzellik uygulamaları için uygun saati bul."), icon: Sparkles },
  { href: "/saglik-randevu", title: tk("Sağlık randevusu"), text: tk("Yayınlanmış sağlık işletmelerini ve müsaitliklerini incele."), icon: Stethoscope },
  { href: "/isletmeler", title: tk("İşletmeler için"), text: tk("Takvimini, ekibini ve müşterilerini tek merkezden yönet."), icon: Building2 },
];

// Öne çıkan mağazalar sunucuda hazırlanıp 5 dakikada bir yenilenir.
export const revalidate = 300;

async function loadHomeInitialData(): Promise<HomeInitialData | null> {
  try {
    const timeout = new Promise<never>((_, reject) => setTimeout(() => reject(new Error("timeout")), 4_000));
    const [businesses, facets, dynamicCategories] = await Promise.race([
      Promise.all([getPopularBusinesses(8), getDiscoveryFacets(), listDynamicCategories()]),
      timeout,
    ]);
    // Güven istatistikleri yalnızca yayındaki gerçek işletmelerden türetilir.
    const stats = { totalBusinesses: facets.totalBusinesses, cityCount: facets.cities.length, categoryCounts: facets.categoryCounts };
    // Firestore Timestamp gibi sınıflar istemci bileşenine düz veri olarak geçer.
    return JSON.parse(JSON.stringify({ businesses, cities: facets.cities, dynamicCategories, stats })) as HomeInitialData;
  } catch {
    // Sunucuda yüklenemezse istemci kendi yükler.
    return null;
  }
}

export default async function HomePage() {
  const initialData = await loadHomeInitialData();
  const t = await getT();
  const intlLocale = await getIntlLocale();
  return <div className={`marketing-page ${styles.page}`}>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(homeJsonLd(t, intlLocale)) }}/>
    <MarketingHeader />
    <main className={styles.main}>
      <HomeInteractive initialData={initialData} intro={<HomeHeroIntro />} art={<HomeHeroArt />} />

      <HomeHowItWorks />
      <HomeLiveNow />
      <HomeTrust businesses={initialData?.businesses ?? []} />
      <HomeAppSection />

      <section className={styles.section} aria-labelledby="home-seo-title">
        <div className={`${styles.wrap} ${styles.seoHub}`}>
          <div className={styles.seoIntro} data-reveal="">
            <span className={styles.kicker}><Compass size={13} aria-hidden="true"/> {t("TÜRKİYE'NİN RANDEVU REHBERİ")}</span>
            <h2 id="home-seo-title">{t("İhtiyacın olan uzman,")}<br/><em>{t("birkaç dokunuş uzağında.")}</em></h2>
            <p>{t("SeninRandevun; yerel işletmeleri, sundukları hizmetleri ve gerçek müsaitliklerini tek bir deneyimde buluşturur. Telefon trafiği olmadan araştır, karşılaştır ve online randevunu oluştur.")}</p>
            <Link href="/online-randevu" className={styles.textLink}>{t("Online randevu nasıl çalışır?")} <ArrowRight size={15}/></Link>
          </div>
          <div className={styles.seoLinks}>{SEO_JOURNEYS.map(({href,title,text,icon:Icon},index)=><Link href={href} key={href} className={styles.seoLink} data-reveal="" style={{ "--i": index } as React.CSSProperties}><span className={styles.seoIcon}><Icon size={20} aria-hidden="true"/></span><span className={styles.seoText}><small>{t("0{number} · HIZLI KEŞİF", { number: index + 1 })}</small><strong>{t(title)}</strong><em>{t(text)}</em></span><ArrowUpRight size={18} aria-hidden="true"/></Link>)}</div>
        </div>
      </section>

      <HomeBusinessBand />
      <HomeFaq items={CUSTOMER_FAQ} />
    </main>
    <CustomerLiveHome />
    <MarketingFooter />
    <ScrollReveal />
  </div>;
}
