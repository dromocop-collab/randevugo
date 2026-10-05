import Image from "next/image";
import Link from "next/link";
import { ArrowRight, BadgeCheck, CalendarCheck2, Check, Clock3, MapPin, Search, ShieldCheck, Sparkles, Star } from "lucide-react";
import { MarketingPage } from "@/components/marketing/marketing-shell";
import { JsonLd } from "@/components/seo/json-ld";
import { LinkCloud } from "@/components/seo/link-cloud";
import { LocalBusinessGrid } from "@/components/seo/local-business-grid";
import { seoCategory } from "@/lib/seo/categories";
import { breadcrumbJsonLd, faqJsonLd, graph, itemListJsonLd, serviceJsonLd, webPageJsonLd, type Crumb } from "@/lib/seo/schema";
import { getSeoIndex, groupByCity, sortForListing } from "@/lib/seo/seo-data";
import { absoluteUrl, businessPath } from "@/lib/seo/site";
import { locative } from "@/lib/seo/text";
import styles from "./seo-blocks.module.css";

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
  kuafor: "Kuaför",
  berber: "Berber",
  guzellik: "Güzellik merkezi",
  spa: "Spa & Masaj",
  nail: "Nail Studio",
  spor: "Spor & PT",
  saglik: "Sağlık",
  danismanlik: "Danışmanlık",
  veteriner: "Veteriner",
  yazilim: "Yazılım & Web",
};

export async function SeoLandingPage({ pathname, eyebrow, title, description, category = "", benefits, steps, faq, relatedLinks }: SeoLandingPageProps) {
  const image = CATEGORY_IMAGES[category] ?? "/images/booking-flow-hero.png";
  const categoryLabel = CATEGORY_LABELS[category] ?? "Online randevu";
  const discoveryHref = category ? `/kesfet?category=${category}` : "/kesfet";
  const seo = seoCategory(category);

  // Gerçek, yayındaki işletmeler (taranabilir iç bağlantılar). Veri yoksa bölüm gizlenir.
  const index = await getSeoIndex();
  const inCategory = category ? index.filter((row) => row.category === category) : index;
  const featured = sortForListing(inCategory).slice(0, 9);
  const cities = groupByCity(inCategory).slice(0, 24);
  const cityLinks = cities.map((city) => ({
    href: category ? `/sehir/${city.slug}/${category}` : `/sehir/${city.slug}`,
    label: category && seo ? `${locative(city.city)} ${seo.noun}` : `${locative(city.city)} online randevu`,
    meta: `${city.businesses.length} işletme`,
  }));

  const crumbs: Crumb[] = [
    { name: "Ana Sayfa", path: "/" },
    ...(category ? [{ name: "Kategoriler", path: "/kategoriler" }] : []),
    { name: category ? categoryLabel : "Online randevu", path: pathname },
  ];
  const pageUrl = absoluteUrl(pathname);
  const jsonLd = graph(
    webPageJsonLd({ path: pathname, name: title, description, image, breadcrumbId: `${pageUrl}#breadcrumb` }),
    breadcrumbJsonLd(crumbs, `${pageUrl}#breadcrumb`),
    serviceJsonLd({ path: pathname, name: title, description, image, serviceType: `${categoryLabel} online randevu` }),
    faqJsonLd(faq.map((item) => ({ question: item.question, answer: item.answer })), `${pageUrl}#faq`),
    featured.length ? itemListJsonLd(featured.map((row) => ({ name: row.name, path: businessPath(row.slug) })), { id: `${pageUrl}#businesses`, name: `${seo?.plural ?? "Öne çıkan işletmeler"}` }) : null,
  );

  return (
    <MarketingPage>
      <main className="profession-page">
        <JsonLd data={jsonLd} />
        <section className="profession-hero">
          <div className="profession-grid" aria-hidden="true" /><div className="profession-orb profession-orb-a" aria-hidden="true" /><div className="profession-orb profession-orb-b" aria-hidden="true" />
          <div className="profession-hero-inner">
            <div className="profession-copy">
              <nav className="profession-breadcrumb" aria-label="Sayfa yolu">{crumbs.map((crumb, index) => index < crumbs.length - 1 ? <span key={crumb.path} style={{ display: "contents" }}><Link href={crumb.path}>{crumb.name}</Link><span>/</span></span> : <b key={crumb.path} aria-current="page">{crumb.name}</b>)}</nav>
              <span className="profession-eyebrow"><Sparkles size={14} /> {eyebrow}</span>
              <h1>{title}</h1><p>{description}</p>
              <div className="profession-actions"><Link href={discoveryHref} className="profession-primary"><Search size={17} /> {categoryLabel} keşfet <ArrowRight size={16} /></Link><Link href="/hesabim" className="profession-secondary"><CalendarCheck2 size={17} /> Randevularım</Link></div>
              <div className="profession-trust"><span><BadgeCheck size={15} /> Doğrulanmış işletmeler</span><span><ShieldCheck size={15} /> Güvenli deneyim</span><span><Clock3 size={15} /> 7/24 randevu</span></div>
            </div>
            <div className="profession-visual">
              <div className="profession-image-wrap"><Image src={image} alt={`${categoryLabel} randevu ve hizmetleri`} fill priority sizes="(max-width: 850px) 100vw, 46vw" /></div>
              <div className="profession-float profession-float-top"><span><Star size={16} fill="currentColor" /></span><div><b>Gerçek değerlendirmeler</b><small>Kararını güvenle ver</small></div></div>
              <div className="profession-float profession-float-bottom"><span><Check size={16} /></span><div><b>Randevun hazır</b><small>Uygun saati anında seç</small></div></div>
              <div className="profession-location"><MapPin size={17} /><span>Yakınındaki uzmanlar</span></div>
            </div>
          </div>
        </section>
        <section className="profession-proof" aria-label="SeninRandevun avantajları"><span>01 <b>Hizmeti karşılaştır</b></span><span>02 <b>Uzmanını seç</b></span><span>03 <b>Randevunu oluştur</b></span></section>
        <section className="profession-benefits">
          <header><div><span>NEDEN SENİNRANDEVUN?</span><h2>Doğru hizmete,<br />daha akıllı ulaş.</h2></div><p>Aramak, beklemek ve tekrar tekrar saat sormak yok. İhtiyacına uygun işletmeleri tek yerde incele.</p></header>
          <div className="profession-benefit-grid">{benefits.map((benefit, index) => <article key={benefit} style={{ "--profession-delay": `${index * 90}ms` } as React.CSSProperties}><span>0{index + 1}</span><i><Check size={17} /></i><p>{benefit}</p></article>)}</div>
        </section>
        <section className="profession-steps">
          <div className="profession-steps-copy"><span>3 KOLAY ADIM</span><h2>Planına uyan randevu birkaç dokunuş uzağında.</h2><p>Gerçek müsaitlikleri gör, seçimini yap ve randevunu saniyeler içinde tamamla.</p><Link href={discoveryHref}>Şimdi keşfet <ArrowRight size={16} /></Link></div>
          <ol>{steps.map((step, index) => <li key={step}><span>{String(index + 1).padStart(2, "0")}</span><div><small>{index === 0 ? "KEŞFET" : index === 1 ? "KARŞILAŞTIR" : "TAMAMLA"}</small><p>{step}</p></div><CalendarCheck2 size={20} /></li>)}</ol>
        </section>
        {featured.length > 0 && (
          <section className={styles.landingSection} aria-labelledby="landing-businesses-title">
            <header className={styles.landingHead}>
              <div>
                <span className={styles.kicker}>YAYINDAKİ İŞLETMELER</span>
                <h2 id="landing-businesses-title">{seo ? `Online randevu alan ${seo.plural.toLocaleLowerCase("tr-TR")}` : "Öne çıkan işletmeler"}</h2>
                <p>{inCategory.length} işletmenin hizmetlerini, fiyatlarını ve gerçek müşteri yorumlarını inceleyip uygun saatte randevu al.</p>
              </div>
              <Link href={discoveryHref} className={styles.landingMore}>Tümünü keşfet <ArrowRight size={15} aria-hidden="true" /></Link>
            </header>
            <LocalBusinessGrid businesses={featured} />
            <LinkCloud id="landing-cities-title" kicker="ŞEHRE GÖRE" title={seo ? `Şehrindeki ${seo.noun} işletmelerini bul` : "Şehrine göre işletmeler"} links={cityLinks} />
          </section>
        )}
        <section className="profession-faq">
          <div><span>MERAK ETTİKLERİN</span><h2>{categoryLabel} randevusu hakkında.</h2><p>Randevu öncesinde en sık sorulan soruların net cevapları.</p></div>
          <div>{faq.map((item) => <details key={item.question}><summary>{item.question}<span>+</span></summary><p>{item.answer}</p></details>)}</div>
        </section>
        <section className="profession-related"><div><Sparkles size={20} /><span><small>DAHA FAZLASINI KEŞFET</small><h2>İhtiyacına uygun diğer hizmetler.</h2></span></div><nav aria-label="İlgili hizmetler">{relatedLinks.map((link) => <Link key={link.href} href={link.href}>{link.label}<ArrowRight size={15} /></Link>)}</nav></section>
      </main>
    </MarketingPage>
  );
}
