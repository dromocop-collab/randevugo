import Image from "next/image";
import Link from "next/link";
import { ArrowRight, ArrowUpRight, BriefcaseBusiness, Compass, LayoutGrid, MapPin, ShieldCheck, Sparkles, Store } from "lucide-react";
import { MarketingFooter, MarketingHeader } from "@/components/marketing/marketing-shell";
import { RoviMascot } from "@/components/brand/rovi-mascot";
import { CATEGORY_CATALOG, categoryHref } from "@/components/marketing/category-catalog";
import { categoryImageFor } from "@/components/marketing/category-catalog";
import { getDiscoveryFacets } from "@/features/discovery/search-repository";
import { listDynamicCategories, type DynamicCategory } from "@/features/categories/category-request-repository";
import { canonicalBusinessCategory } from "@/lib/business-categories";
import { seoSlug } from "@/lib/seo/geo-seo";
import { createPublicMetadata, safeJsonLd, SEO_SITE_URL } from "@/lib/seo/metadata";
import { CategoriesExplorer, type CategoryCardData } from "./categories-explorer";
import styles from "./kategoriler.module.css";

export const metadata = createPublicMetadata({
  title: "Tüm Hizmet Kategorileri ve Online Randevu",
  description: "Kuaför, berber, güzellik merkezi, spa, nail studio, sağlık, spor ve veteriner kategorilerindeki işletmeleri keşfet; uygun saatte online randevu al.",
  pathname: "/kategoriler",
  keywords: ["randevu kategorileri", "kuaför randevu", "berber randevu", "güzellik merkezi randevu", "spa randevu", "veteriner randevu", "online randevu al"],
  image: null,
});

// Kategori sayıları sunucuda hazırlanır ve 5 dakikada bir yenilenir.
export const revalidate = 300;

type CategoriesData = {
  counts: Record<string, number>;
  covers: Record<string, string>;
  cities: string[];
  total: number;
  dynamic: DynamicCategory[];
};

const LOAD_TIMEOUT_MS = 4_000;

async function loadCategoriesData(): Promise<CategoriesData | null> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const timeout = new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new Error("timeout")), LOAD_TIMEOUT_MS);
    });
    const [facets, dynamic] = await Promise.race([
      Promise.all([getDiscoveryFacets(), listDynamicCategories().catch(() => [] as DynamicCategory[])]),
      timeout,
    ]);
    return { counts: facets.categoryCounts, covers: facets.categoryCovers, cities: facets.cities, total: facets.totalBusinesses, dynamic };
  } catch {
    // Veri alınamazsa sayfa sayısız katalogla yine çalışır.
    return null;
  } finally {
    if (timer) clearTimeout(timer);
  }
}

/** Yalnızca next/image için izinli kaynaklardan gelen görselleri kullan. */
function safeImage(url?: string) {
  if (!url) return undefined;
  const value = url.trim();
  if (value.startsWith("/") && !value.startsWith("//")) return value;
  try {
    const parsed = new URL(value);
    if (parsed.protocol !== "https:") return undefined;
    if (parsed.hostname === "firebasestorage.googleapis.com" && parsed.pathname.startsWith("/v0/b/randevugo-d1d2e.firebasestorage.app/o/")) return value;
    if (parsed.hostname === "storage.googleapis.com" && parsed.pathname.startsWith("/randevugo-d1d2e.firebasestorage.app/")) return value;
  } catch {
    return undefined;
  }
  return undefined;
}

const EXTRA_LABELS: Record<string, { label: string; emoji: string }> = {
  diger: { label: "Diğer", emoji: "📦" },
};

function prettifySlug(slug: string) {
  const text = slug.replace(/-/g, " ").trim();
  return text ? text.charAt(0).toLocaleUpperCase("tr-TR") + text.slice(1) : slug;
}

function buildCards(data: CategoriesData | null): CategoryCardData[] {
  const cards: CategoryCardData[] = CATEGORY_CATALOG.map((item) => ({
    slug: item.slug,
    label: item.label,
    emoji: item.emoji,
    description: item.description,
    image: item.image ?? safeImage(data?.covers[item.slug]),
    accent: item.accent,
    count: data ? data.counts[item.slug] ?? 0 : null,
  }));
  const known = new Set(cards.map((card) => card.slug));

  for (const dynamic of data?.dynamic ?? []) {
    const slug = canonicalBusinessCategory(dynamic.slug);
    if (!slug || known.has(slug)) continue;
    known.add(slug);
    cards.push({
      slug,
      label: dynamic.label || prettifySlug(slug),
      emoji: dynamic.emoji || "✨",
      description: "Yeni eklenen kategori",
      image: safeImage(dynamic.imageUrl) ?? safeImage(data?.covers[slug]) ?? categoryImageFor(slug, dynamic.label),
      accent: "#1f7a4a",
      count: data ? data.counts[slug] ?? 0 : null,
    });
  }

  for (const [slug, count] of Object.entries(data?.counts ?? {})) {
    if (!slug || known.has(slug) || count <= 0) continue;
    known.add(slug);
    cards.push({
      slug,
      label: EXTRA_LABELS[slug]?.label ?? prettifySlug(slug),
      emoji: EXTRA_LABELS[slug]?.emoji ?? "✨",
      description: "İşletmeleri keşfet",
      image: safeImage(data?.covers[slug]) ?? categoryImageFor(slug, EXTRA_LABELS[slug]?.label ?? slug),
      accent: "#475569",
      count,
    });
  }

  if (!data) return cards;
  // Aktif kategoriler önce; eşitlikte katalog sırası korunur.
  return cards
    .map((card, index) => ({ card, index }))
    .sort((a, b) => (b.card.count ?? 0) - (a.card.count ?? 0) || a.index - b.index)
    .map(({ card }) => card);
}

const GUIDES = CATEGORY_CATALOG.filter((item) => item.landing);

export default async function CategoriesPage() {
  const data = await loadCategoriesData();
  const cards = buildCards(data);
  const activeCount = data ? cards.filter((card) => (card.count ?? 0) > 0).length : null;
  const cities = (data?.cities ?? [])
    .map((city) => ({ city, slug: seoSlug(city) }))
    .filter((item, index, list) => item.slug && list.findIndex((other) => other.slug === item.slug) === index)
    .slice(0, 24);

  const pageUrl = `${SEO_SITE_URL}/kategoriler`;
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "CollectionPage",
        "@id": `${pageUrl}#page`,
        url: pageUrl,
        name: "Tüm kategoriler",
        description: "SeninRandevun'daki tüm hizmet kategorileri ve online randevu alınabilen işletmeler.",
        inLanguage: "tr-TR",
        isPartOf: { "@id": `${SEO_SITE_URL}/#website` },
        mainEntity: { "@id": `${pageUrl}#list` },
      },
      {
        "@type": "ItemList",
        "@id": `${pageUrl}#list`,
        name: "Hizmet kategorileri",
        numberOfItems: cards.length,
        itemListElement: cards.map((card, index) => ({
          "@type": "ListItem",
          position: index + 1,
          name: card.label,
          url: `${SEO_SITE_URL}${CATEGORY_CATALOG.find((item) => item.slug === card.slug)?.landing ?? categoryHref(card.slug)}`,
        })),
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Ana Sayfa", item: SEO_SITE_URL },
          { "@type": "ListItem", position: 2, name: "Kategoriler", item: pageUrl },
        ],
      },
    ],
  };

  return (
    <div className="marketing-page">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(jsonLd) }} />
      <MarketingHeader />
      <main>
        <div className={styles.page}>
          <section className={styles.hero} aria-labelledby="categories-title">
            <div className={styles.heroGrid} aria-hidden="true" />
            <div className={styles.heroInner}>
              <div className={styles.heroCopy}>
                <nav className={styles.crumbs} aria-label="Sayfa konumu">
                  <Link href="/">Ana Sayfa</Link>
                  <span aria-hidden="true">/</span>
                  <span aria-current="page">Kategoriler</span>
                </nav>
                <span className={styles.eyebrow}><LayoutGrid size={13} /> TÜM KATEGORİLER</span>
                <h1 id="categories-title" className={styles.heroTitle}>Ne için randevu<br /><em>almak istersin?</em></h1>
                <p className={styles.heroText}>Kuaförden veterinere, spadan danışmanlığa kadar tüm hizmet alanları tek yerde. Bir kategori seç, yakınındaki işletmeleri karşılaştır ve uygun saati hemen ayır.</p>
                <div className={styles.heroStats}>
                  {data ? (
                    <>
                      <span className={styles.heroStat}><Store size={15} /> <b>{data.total}</b> işletme</span>
                      <span className={styles.heroStat}><LayoutGrid size={15} /> <b>{activeCount}</b> aktif kategori</span>
                      {data.cities.length > 0 && <span className={styles.heroStat}><MapPin size={15} /> <b>{data.cities.length}</b> şehir</span>}
                    </>
                  ) : (
                    <>
                      <span className={styles.heroStat}><ShieldCheck size={15} /> Doğrulanmış işletmeler</span>
                      <span className={styles.heroStat}><Sparkles size={15} /> 7/24 online randevu</span>
                    </>
                  )}
                </div>
              </div>
              <div className={styles.heroMascot}><RoviMascot size={128} mood="happy" alt="Rovi kategori rehberi" priority /></div>
            </div>
          </section>

          <CategoriesExplorer cards={cards} hasCounts={Boolean(data)} />

          <section className={styles.section} aria-labelledby="guides-title">
            <header className={styles.sectionHead}>
              <span className={styles.kicker}><Compass size={13} /> RANDEVU REHBERLERİ</span>
              <h2 id="guides-title">Kategoriye göre online randevu</h2>
              <p>Her alan için hazırladığımız rehberlerde hizmetleri, ipuçlarını ve yayındaki işletmeleri bul.</p>
            </header>
            <ul className={styles.guides}>
              {GUIDES.map((guide) => (
                <li key={guide.slug}>
                  <Link href={guide.landing ?? categoryHref(guide.slug)} className={styles.guide}>
                    {guide.image ? <Image src={guide.image} alt="" width={56} height={56} sizes="56px" className={styles.guideImage} /> : <span className={styles.guideEmoji} aria-hidden="true">{guide.emoji}</span>}
                    <span className={styles.guideText}><b>{guide.label} randevusu</b><small>{guide.description}</small></span>
                    <ArrowRight size={16} className={styles.guideArrow} aria-hidden="true" />
                  </Link>
                </li>
              ))}
            </ul>
          </section>

          {cities.length > 0 && (
            <section className={styles.section} aria-labelledby="cities-title">
              <header className={styles.sectionHead}>
                <span className={styles.kicker}><MapPin size={13} /> ŞEHİRLER</span>
                <h2 id="cities-title">Şehrine göre keşfet</h2>
                <p>Bulunduğun şehirdeki yayınlanmış işletmeleri ve kategorileri gör.</p>
              </header>
              <ul className={styles.cities}>
                {cities.map(({ city, slug }) => (
                  <li key={slug}>
                    <Link href={`/sehir/${slug}`} className={styles.city}><MapPin size={15} aria-hidden="true" /> {city}</Link>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section className={styles.cta} aria-labelledby="business-cta-title">
            <div className={styles.ctaIcon} aria-hidden="true"><BriefcaseBusiness size={22} /></div>
            <div className={styles.ctaCopy}>
              <h2 id="business-cta-title">Kategorinde işletmen mi var?</h2>
              <p>İşletmeni ücretsiz listele, online randevu almaya bugün başla. Lansmana özel ilk ay bizden.</p>
            </div>
            <div className={styles.ctaActions}>
              <Link href="/isletmeler/kayit" className={styles.ctaPrimary}>Ücretsiz kayıt ol <ArrowUpRight size={16} /></Link>
              <Link href="/isletmeler" className={styles.ctaGhost}>Nasıl çalışır?</Link>
            </div>
          </section>
        </div>
      </main>
      <MarketingFooter />
    </div>
  );
}
