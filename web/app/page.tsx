import type { Metadata } from "next";
import Link from "next/link";
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

export const metadata: Metadata = {
  ...createPublicMetadata({
  title: "Online Randevu Al ve Yakınındaki İşletmeleri Keşfet",
  description: "Kuaför, berber, güzellik, sağlık, spor ve bakım işletmelerini keşfedin; hizmetleri ve uygun saatleri karşılaştırarak online randevunuzu kolayca alın.",
  pathname: "/",
  keywords: ["online randevu al", "yakındaki işletmeler", "kuaför randevusu", "berber randevusu", "güzellik merkezi randevusu", "SeninRandevun"],
  // Paylaşım görseli app/opengraph-image.tsx'ten gelir.
  image: null,
  }),
  // Kök segmentte şablon uygulanmadığı için marka adı burada açıkça yazılır.
  title: { absolute: "SeninRandevun – Online Randevu Al, Yakındaki İşletmeleri Keşfet" },
};

const CUSTOMER_FAQ = [
  ["Randevu almak ücretli mi?", "Hayır. İşletme keşfetmek ve online randevu oluşturmak müşteriler için tamamen ücretsizdir."],
  ["Üye olmadan randevu alabilir miyim?", "İşletmenin sunduğu akışa göre temel iletişim bilgilerinle hızlıca randevu oluşturabilirsin."],
  ["Randevumu değiştirebilir miyim?", "İşletmenin iptal ve değişiklik kuralları doğrultusunda randevunu kolayca yönetebilirsin."],
  ["Yakınımdaki işletmeleri nasıl bulurum?", "Keşfet ekranında şehir, kategori, işletme veya hizmet adıyla arama yapabilir; yayınlanmış işletmelerin profillerini karşılaştırabilirsin."],
  ["Hangi hizmetler için randevu alabilirim?", "Kuaför, berber, güzellik merkezi, spa, nail studio, sağlık, spor, veteriner ve danışmanlık dahil birçok alanda randevu alabilirsin."],
];

const homeJsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    { "@type": "CollectionPage", "@id": `${SEO_SITE_URL}/#homepage`, url: SEO_SITE_URL, name: "Yakınındaki İşletmeleri Keşfet ve Online Randevu Al", description: "Kuaför, berber, güzellik, sağlık, spor ve bakım işletmelerini keşfedin; hizmetleri ve uygun saatleri karşılaştırarak online randevunuzu kolayca alın.", inLanguage: "tr-TR", isPartOf: { "@id": `${SEO_SITE_URL}/#website` }, about: ["Online randevu", "Yerel işletme keşfi", "Hizmet rezervasyonu"] },
    { "@type": "Service", "@id": `${SEO_SITE_URL}/#booking-service`, name: "SeninRandevun Online Randevu ve İşletme Keşif Hizmeti", serviceType: "Online appointment booking marketplace", provider: { "@id": `${SEO_SITE_URL}/#organization` }, areaServed: { "@type": "Country", name: "Türkiye" }, availableChannel: { "@type": "ServiceChannel", serviceUrl: `${SEO_SITE_URL}/kesfet`, availableLanguage: "Turkish" } },
    { "@type": "BreadcrumbList", "@id": `${SEO_SITE_URL}/#breadcrumb`, itemListElement: [{ "@type": "ListItem", position: 1, name: "Ana Sayfa", item: SEO_SITE_URL }] },
    { "@type": "FAQPage", "@id": `${SEO_SITE_URL}/#faq`, mainEntity: CUSTOMER_FAQ.map(([question, answer]) => ({ "@type": "Question", name: question, acceptedAnswer: { "@type": "Answer", text: answer } })) },
  ],
};

const SEO_JOURNEYS = [
  { href: "/kuafor-randevu", title: "Kuaför randevusu", text: "Saç kesimi, boya, röfle ve bakım hizmetlerini keşfet.", icon: Scissors },
  { href: "/guzellik-merkezi-randevu", title: "Güzellik merkezi", text: "Cilt bakımı ve güzellik uygulamaları için uygun saati bul.", icon: Sparkles },
  { href: "/saglik-randevu", title: "Sağlık randevusu", text: "Yayınlanmış sağlık işletmelerini ve müsaitliklerini incele.", icon: Stethoscope },
  { href: "/isletmeler", title: "İşletmeler için", text: "Takvimini, ekibini ve müşterilerini tek merkezden yönet.", icon: Building2 },
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
  return <div className={`marketing-page ${styles.page}`}>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(homeJsonLd) }}/>
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
            <span className={styles.kicker}><Compass size={13} aria-hidden="true"/> TÜRKİYE&apos;NİN RANDEVU REHBERİ</span>
            <h2 id="home-seo-title">İhtiyacın olan uzman,<br/><em>birkaç dokunuş uzağında.</em></h2>
            <p>SeninRandevun; yerel işletmeleri, sundukları hizmetleri ve gerçek müsaitliklerini tek bir deneyimde buluşturur. Telefon trafiği olmadan araştır, karşılaştır ve online randevunu oluştur.</p>
            <Link href="/online-randevu" className={styles.textLink}>Online randevu nasıl çalışır? <ArrowRight size={15}/></Link>
          </div>
          <div className={styles.seoLinks}>{SEO_JOURNEYS.map(({href,title,text,icon:Icon},index)=><Link href={href} key={href} className={styles.seoLink} data-reveal="" style={{ "--i": index } as React.CSSProperties}><span className={styles.seoIcon}><Icon size={20} aria-hidden="true"/></span><span className={styles.seoText}><small>0{index+1} · HIZLI KEŞİF</small><strong>{title}</strong><em>{text}</em></span><ArrowUpRight size={18} aria-hidden="true"/></Link>)}</div>
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
