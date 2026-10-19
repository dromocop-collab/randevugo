import Image from "next/image";
import Link from "@/i18n/link";
import { ArrowRight, BadgeCheck, CalendarCheck2, Check, Clock3, MapPin, Search, ShieldCheck, Sparkles, Star } from "lucide-react";
import { MarketingPage } from "@/components/marketing/marketing-shell";
import { JsonLd } from "@/components/seo/json-ld";
import { LinkCloud } from "@/components/seo/link-cloud";
import { LocalBusinessGrid } from "@/components/seo/local-business-grid";
import type { Metadata } from "next";
import { localizeSeoCategory, seoCategory } from "@/lib/seo/categories";
import { createPublicMetadata } from "@/lib/seo/metadata";
import { breadcrumbJsonLd, faqJsonLd, graph, itemListJsonLd, localePath, serviceJsonLd, webPageJsonLd, type Crumb } from "@/lib/seo/schema";
import { getSeoIndex, groupByCity, sortForListing } from "@/lib/seo/seo-data";
import { absoluteUrl, businessPath } from "@/lib/seo/site";
import { placeVars } from "@/lib/seo/text";
import { tk } from "@/i18n/config";
import { getLocale, getT } from "@/i18n/server";
import styles from "./seo-blocks.module.css";

/**
 * Kategori tanıtım sayfaları. Metin özellikleri Türkçe kaynak metindir (çağıran tk() ile işaretler);
 * bileşen hepsini etkin dile çevirir.
 */
export interface SeoLandingPageProps {
  pathname: string;
  eyebrow: string;
  title: string;
  description: string;
  category?: string;
  benefits: readonly string[];
  steps: readonly string[];
  faq: readonly { question: string; answer: string }[];
  relatedLinks: readonly { href: string; label: string }[];
  /** Arama sonucu başlığı/açıklaması (yalnızca metadata için; sayfada kullanılmaz). */
  metaTitle?: string;
  metaDescription?: string;
}

const CATEGORY_IMAGES: Record<string, string> = {
  kuafor: "/images/categories/kuafor.png",
  berber: "/images/categories/berber.png",
  guzellik: "/images/categories/guzellik.png",
  spa: "/images/categories/spa.png",
  nail: "/images/categories/nail.png",
  spor: "/images/categories/spor.png",
  saglik: "/images/categories/saglik.png",
  danismanlik: "/images/categories/danismanlik.png",
  veteriner: "/images/categories/veteriner.png",
  yazilim: "/images/categories/yazilim.png",
};

const CATEGORY_LABELS: Record<string, string> = {
  kuafor: tk("Kuaför"),
  berber: tk("Berber"),
  guzellik: tk("Güzellik merkezi"),
  spa: tk("Spa & Masaj"),
  nail: tk("Nail Studio"),
  spor: tk("Spor & PT"),
  saglik: tk("Sağlık"),
  danismanlik: tk("Danışmanlık"),
  veteriner: tk("Veteriner"),
  yazilim: tk("Yazılım & Web"),
};

type LandingMetadataInput = Pick<SeoLandingPageProps, "title" | "description" | "pathname" | "category" | "metaTitle" | "metaDescription">;

/**
 * Kategori tanıtım sayfası meta verisi (etkin dilde). lib/profession-seo.ts › createProfessionMetadata ile
 * aynı kurallar; ek olarak canonical/hreflang sayfanın diline göre yazılır.
 */
export async function seoLandingMetadata(content: LandingMetadataInput): Promise<Metadata> {
  const t = await getT();
  const locale = await getLocale();
  const known = seoCategory(content.category);
  const noun = known ? t(known.noun) : "online";
  return createPublicMetadata({
    title: t(content.metaTitle ?? content.title),
    description: t(content.metaDescription ?? content.description),
    pathname: content.pathname,
    keywords: known
      ? [t("{noun} randevu", { noun }), t("online {noun} randevusu", { noun }), t("yakınımdaki {noun}", { noun }), t("{noun} fiyatları", { noun })]
      : undefined,
    image: null,
    locale,
  });
}

export async function SeoLandingPage({ pathname, eyebrow, title: titleSource, description: descriptionSource, category = "", benefits, steps, faq: faqSource, relatedLinks }: SeoLandingPageProps) {
  const t = await getT();
  const locale = await getLocale();
  const title = t(titleSource);
  const description = t(descriptionSource);
  const faq = faqSource.map((item) => ({ question: t(item.question), answer: t(item.answer) }));
  const image = CATEGORY_IMAGES[category] ?? "/images/booking-flow-hero.png";
  const categoryLabel = t(CATEGORY_LABELS[category] ?? tk("Online randevu"));
  const discoveryHref = category ? `/kesfet?category=${category}` : "/kesfet";
  const known = seoCategory(category);
  const seo = known ? localizeSeoCategory(known, t) : undefined;

  // Gerçek, yayındaki işletmeler (taranabilir iç bağlantılar). Veri yoksa bölüm gizlenir.
  const index = await getSeoIndex();
  const inCategory = category ? index.filter((row) => row.category === category) : index;
  const featured = sortForListing(inCategory).slice(0, 9);
  const cities = groupByCity(inCategory).slice(0, 24);
  const cityLinks = cities.map((city) => {
    const place = placeVars(city.city, locale);
    return {
      href: category ? `/sehir/${city.slug}/${category}` : `/sehir/${city.slug}`,
      label: category && seo
        ? t("{inPlace} {noun}", { ...place, noun: seo.noun, plural: seo.plural })
        : t("{inPlace} online randevu", place),
      meta: t("{count} işletme", { count: city.businesses.length }),
    };
  });

  const crumbs: Crumb[] = [
    { name: t("Ana Sayfa"), path: localePath("/", locale) },
    ...(category ? [{ name: t("Kategoriler"), path: localePath("/kategoriler", locale) }] : []),
    { name: category ? categoryLabel : t("Online randevu"), path: localePath(pathname, locale) },
  ];
  const pagePath = localePath(pathname, locale);
  const pageUrl = absoluteUrl(pagePath);
  const jsonLd = graph(
    webPageJsonLd({ path: pagePath, name: title, description, image, breadcrumbId: `${pageUrl}#breadcrumb`, locale }),
    breadcrumbJsonLd(crumbs, `${pageUrl}#breadcrumb`),
    serviceJsonLd({ path: pagePath, name: title, description, image, serviceType: t("{category} online randevu", { category: categoryLabel }), locale }),
    faqJsonLd(faq, `${pageUrl}#faq`),
    featured.length ? itemListJsonLd(featured.map((row) => ({ name: row.name, path: localePath(businessPath(row.slug), locale) })), { id: `${pageUrl}#businesses`, name: seo?.plural ?? t("Öne çıkan işletmeler") }) : null,
  );
  const stepLabels = [t("KEŞFET"), t("KARŞILAŞTIR"), t("TAMAMLA")];

  return (
    <MarketingPage>
      <main className="profession-page">
        <JsonLd data={jsonLd} />
        <section className="profession-hero">
          <div className="profession-grid" aria-hidden="true" /><div className="profession-orb profession-orb-a" aria-hidden="true" /><div className="profession-orb profession-orb-b" aria-hidden="true" />
          <div className="profession-hero-inner">
            <div className="profession-copy">
              <nav className="profession-breadcrumb" aria-label={t("Sayfa yolu")}>{crumbs.map((crumb, index) => index < crumbs.length - 1 ? <span key={crumb.path} style={{ display: "contents" }}><Link href={crumb.path}>{crumb.name}</Link><span>/</span></span> : <b key={crumb.path} aria-current="page">{crumb.name}</b>)}</nav>
              <span className="profession-eyebrow"><Sparkles size={14} /> {t(eyebrow)}</span>
              <h1>{title}</h1><p>{description}</p>
              <div className="profession-actions"><Link href={discoveryHref} className="profession-primary"><Search size={17} /> {t("{category} keşfet", { category: categoryLabel, plural: seo ? seo.plural : t("İşletmeler") })} <ArrowRight size={16} /></Link><Link href="/hesabim" className="profession-secondary"><CalendarCheck2 size={17} /> {t("Randevularım")}</Link></div>
              <div className="profession-trust"><span><BadgeCheck size={15} /> {t("Doğrulanmış işletmeler")}</span><span><ShieldCheck size={15} /> {t("Güvenli deneyim")}</span><span><Clock3 size={15} /> {t("7/24 randevu")}</span></div>
            </div>
            <div className="profession-visual">
              <div className="profession-image-wrap"><Image src={image} alt={t("{category} randevu ve hizmetleri", { category: categoryLabel })} fill priority sizes="(max-width: 850px) 100vw, 46vw" /></div>
              <div className="profession-float profession-float-top"><span><Star size={16} fill="currentColor" /></span><div><b>{t("Gerçek değerlendirmeler")}</b><small>{t("Kararını güvenle ver")}</small></div></div>
              <div className="profession-float profession-float-bottom"><span><Check size={16} /></span><div><b>{t("Randevun hazır")}</b><small>{t("Uygun saati anında seç")}</small></div></div>
              <div className="profession-location"><MapPin size={17} /><span>{t("Yakınındaki uzmanlar")}</span></div>
            </div>
          </div>
        </section>
        <section className="profession-proof" aria-label={t("SeninRandevun avantajları")}><span>01 <b>{t("Hizmeti karşılaştır")}</b></span><span>02 <b>{t("Uzmanını seç")}</b></span><span>03 <b>{t("Randevunu oluştur")}</b></span></section>
        <section className="profession-benefits">
          <header><div><span>{t("NEDEN SENİNRANDEVUN?")}</span><h2>{t("Doğru hizmete,")}<br />{t("daha akıllı ulaş.")}</h2></div><p>{t("Aramak, beklemek ve tekrar tekrar saat sormak yok. İhtiyacına uygun işletmeleri tek yerde incele.")}</p></header>
          <div className="profession-benefit-grid">{benefits.map((benefit, index) => <article key={benefit} style={{ "--profession-delay": `${index * 90}ms` } as React.CSSProperties}><span>0{index + 1}</span><i><Check size={17} /></i><p>{t(benefit)}</p></article>)}</div>
        </section>
        <section className="profession-steps">
          <div className="profession-steps-copy"><span>{t("3 KOLAY ADIM")}</span><h2>{t("Planına uyan randevu birkaç dokunuş uzağında.")}</h2><p>{t("Gerçek müsaitlikleri gör, seçimini yap ve randevunu saniyeler içinde tamamla.")}</p><Link href={discoveryHref}>{t("Şimdi keşfet")} <ArrowRight size={16} /></Link></div>
          <ol>{steps.map((step, index) => <li key={step}><span>{String(index + 1).padStart(2, "0")}</span><div><small>{stepLabels[Math.min(index, 2)]}</small><p>{t(step)}</p></div><CalendarCheck2 size={20} /></li>)}</ol>
        </section>
        {featured.length > 0 && (
          <section className={styles.landingSection} aria-labelledby="landing-businesses-title">
            <header className={styles.landingHead}>
              <div>
                <span className={styles.kicker}>{t("YAYINDAKİ İŞLETMELER")}</span>
                <h2 id="landing-businesses-title">{seo ? t("Online randevu alan {plural}", { plural: locale === "tr" ? seo.plural.toLocaleLowerCase("tr-TR") : seo.plural }) : t("Öne çıkan işletmeler")}</h2>
                <p>{t("{count} işletmenin hizmetlerini, fiyatlarını ve gerçek müşteri yorumlarını inceleyip uygun saatte randevu al.", { count: inCategory.length })}</p>
              </div>
              <Link href={discoveryHref} className={styles.landingMore}>{t("Tümünü keşfet")} <ArrowRight size={15} aria-hidden="true" /></Link>
            </header>
            <LocalBusinessGrid businesses={featured} />
            <LinkCloud id="landing-cities-title" kicker={t("ŞEHRE GÖRE")} title={seo ? t("Şehrindeki {noun} işletmelerini bul", { noun: seo.noun, plural: seo.plural.toLowerCase() }) : t("Şehrine göre işletmeler")} links={cityLinks} />
          </section>
        )}
        <section className="profession-faq">
          <div><span>{t("MERAK ETTİKLERİN")}</span><h2>{t("{category} randevusu hakkında.", { category: categoryLabel })}</h2><p>{t("Randevu öncesinde en sık sorulan soruların net cevapları.")}</p></div>
          <div>{faq.map((item) => <details key={item.question}><summary>{item.question}<span>+</span></summary><p>{item.answer}</p></details>)}</div>
        </section>
        <section className="profession-related"><div><Sparkles size={20} /><span><small>{t("DAHA FAZLASINI KEŞFET")}</small><h2>{t("İhtiyacına uygun diğer hizmetler.")}</h2></span></div><nav aria-label={t("İlgili hizmetler")}>{relatedLinks.map((link) => <Link key={link.href} href={link.href}>{t(link.label)}<ArrowRight size={15} /></Link>)}</nav></section>
      </main>
    </MarketingPage>
  );
}
