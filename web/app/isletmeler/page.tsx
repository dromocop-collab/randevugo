import Link from "next/link";
import type { CSSProperties } from "react";
import { ArrowRight, ArrowUpRight, BarChart3, BellRing, CalendarCheck2, CalendarDays, Check, ClipboardList, Gift, Globe2, LogIn, MessageSquareText, PackageCheck, ShieldCheck, Smartphone, Sparkles, Ticket, UserCheck, UsersRound, WalletCards, WandSparkles } from "lucide-react";
import { BusinessPage } from "@/components/marketing/business-shell";
import { RoviMascot } from "@/components/brand/rovi-mascot";
import { BusinessFaq, CategoryMarquee, ProductMockup } from "@/components/home/business-sections";
import { ScrollReveal } from "@/components/home/scroll-reveal";
import { currencySymbol, featuredPlan, formatPrice, loadPublicPlans, yearlySavingPercent } from "@/components/home/public-plans";
import { getDiscoveryFacets } from "@/features/discovery/search-repository";
import { createPublicMetadata, safeJsonLd, SEO_SITE_URL } from "@/lib/seo/metadata";
import styles from "@/components/home/business.module.css";

const FEATURES = [
  { icon: CalendarDays, title: "Akıllı takvim", text: "Çalışan, hizmet süresi, mola ve izinleri birlikte hesaplayan çakışmasız takvim. Günün tamamı tek bakışta.", wide: true },
  { icon: Globe2, title: "7/24 online randevu", text: "Size özel randevu sayfası ve QR bağlantısı. Müşteriniz siz uyurken bile uygun saati seçsin.", wide: true },
  { icon: MessageSquareText, title: "SMS hatırlatma", text: "Onay, değişiklik ve hatırlatma mesajları otomatik gitsin; gelmeyen müşteri azalsın." },
  { icon: Ticket, title: "Canlı sıra", text: "Randevusuz gelenleri dijital sıraya alın; müşteri sırasını telefonundan izlesin." },
  { icon: UsersRound, title: "Ekip yönetimi", text: "Çalışan hesapları, rol bazlı yetkiler, çalışma planları ve kişisel takvimler." },
  { icon: UserCheck, title: "Müşteri CRM", text: "Ziyaret geçmişi, notlar, tercihler ve harcama özeti tek müşteri profilinde." },
  { icon: WalletCards, title: "Kasa ve paketler", text: "Tahsilat, adisyon, seans paketleri, gelir–gider ve stok tek akışta." },
  { icon: BarChart3, title: "Analitik", text: "Doluluk, gelir, iptal ve ekip performansını anlaşılır raporlarla izleyin." },
  { icon: ClipboardList, title: "Ek randevu alanları", text: "Randevu sırasında ihtiyacınız olan bilgiyi sorun: notlar, tercihler, özel sorular." },
  { icon: Smartphone, title: "Web, iPhone ve Android", text: "Panel tarayıcıda; işletmeniz cebinizde. Bildirimler anında elinizde." },
];

const FLOW = [
  { icon: CalendarCheck2, title: "Randevu oluşur", text: "Müşteri hizmeti, çalışanı ve saati seçer; kayıt anında takvime düşer." },
  { icon: BellRing, title: "Herkes haberdar", text: "Çalışana bildirim, müşteriye onay ve hatırlatma otomatik gider." },
  { icon: PackageCheck, title: "Ödeme işlenir", text: "Tahsilat, paket veya seans bilgisi aynı müşteri hesabına yazılır." },
  { icon: WandSparkles, title: "Rovi takip eder", text: "Boşlukları, bekleyen işleri ve önerileri günlük özetle gösterir." },
];

const BUSINESS_FAQ = [
  ["İlk ay gerçekten ücretsiz mi?", "Evet. Lansman döneminde açılan işletme hesapları ilk ay tüm özellikleri ücretsiz kullanır. Başlamak için kredi kartı gerekmez."],
  ["Kurulum ne kadar sürer?", "Hizmetlerinizi, çalışanlarınızı ve çalışma saatlerinizi ekledikten sonra randevu sayfanız yayına hazırdır; aynı gün randevu almaya başlayabilirsiniz. Kurulum rehberi ve destek ekibi yanınızda."],
  ["Müşterilerim uygulama indirmek zorunda mı?", "Hayır. Müşterileriniz randevu sayfanızdan tarayıcıyla randevu alabilir. Dilerlerse iPhone ve Android uygulamasını da kullanabilirler."],
  ["Birden fazla şubem ve çalışanım var, uygun mu?", "Evet. Çoklu şube, rol bazlı ekip erişimi ve çalışan bazlı takvimler pakete dahildir. Güncel limitler fiyatlar sayfasında yazar."],
  ["Mevcut müşteri listemi taşıyabilir miyim?", "Evet. Müşteri kayıtlarınızı sisteme aktarabilir, kurulum desteğimizden yararlanabilirsiniz."],
  ["İstediğim zaman bırakabilir miyim?", "Evet. Taahhüt yoktur; aboneliğinizi dilediğiniz zaman sonlandırabilirsiniz."],
] as const;

const businessFaqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "@id": `${SEO_SITE_URL}/isletmeler#faq`,
  mainEntity: BUSINESS_FAQ.map(([question, answer]) => ({ "@type": "Question", name: question, acceptedAnswer: { "@type": "Answer", text: answer } })),
};

// Paket fiyatı ve canlı işletme sayıları sunucuda hazırlanır, 5 dakikada bir yenilenir.
// Paket fiyatları süper admin kaydında anında, aksi halde en geç 60 sn'de yenilenir (statik değer olmalı).
export const revalidate = 60;
const PROOF_MIN_BUSINESSES = 12;

async function loadBusinessCount(): Promise<{ businesses: number; cities: number } | null> {
  try {
    const timeout = new Promise<never>((_, reject) => setTimeout(() => reject(new Error("timeout")), 4_000));
    const facets = await Promise.race([getDiscoveryFacets(), timeout]);
    return { businesses: facets.totalBusinesses, cities: facets.cities.length };
  } catch {
    return null;
  }
}

export const metadata = createPublicMetadata({
  title: "İşletme ve Randevu Yönetim Programı",
  description: "Online randevu, takvim, çalışan, müşteri, paket, kasa ve şube süreçlerinizi tek panelden yönetin. SeninRandevun işletme paneli lansmana özel ilk ay ücretsiz.",
  pathname: "/isletmeler",
  keywords: ["randevu programı", "işletme yönetim programı", "online randevu sistemi", "müşteri takip programı", "kuaför randevu programı", "salon yönetim sistemi"],
  imageAlt: "SeninRandevun işletme ve online randevu yönetim programı",
});

const businessJsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    { "@type": "WebPage", "@id": `${SEO_SITE_URL}/isletmeler#webpage`, url: `${SEO_SITE_URL}/isletmeler`, name: "Randevu ve İşletme Yönetim Programı", description: "Randevu, çalışan, müşteri, paket, kasa ve şube süreçlerini tek panelden yöneten işletme yazılımı.", inLanguage: "tr-TR", isPartOf: { "@id": `${SEO_SITE_URL}/#website` } },
    { "@type": "SoftwareApplication", "@id": `${SEO_SITE_URL}/isletmeler#software`, name: "SeninRandevun İşletme Yönetim Sistemi", applicationCategory: "BusinessApplication", applicationSubCategory: "Appointment Scheduling Software", operatingSystem: "Web, iOS", url: `${SEO_SITE_URL}/isletmeler`, description: "Hizmet işletmeleri için randevu, ekip, müşteri, paket, kasa ve şube yönetimi.", offers: { "@type": "Offer", price: "0", priceCurrency: "TRY", description: "Lansmana özel ilk ay ücretsiz" }, featureList: ["Online randevu", "Takvim yönetimi", "Müşteri takibi", "Çalışan yönetimi", "Paket ve seans takibi", "Kasa ve gelir-gider takibi", "Şube yönetimi"], publisher: { "@id": `${SEO_SITE_URL}/#organization` } },
    { "@type": "BreadcrumbList", "@id": `${SEO_SITE_URL}/isletmeler#breadcrumb`, itemListElement: [{ "@type": "ListItem", position: 1, name: "Ana Sayfa", item: SEO_SITE_URL }, { "@type": "ListItem", position: 2, name: "İşletmeler İçin", item: `${SEO_SITE_URL}/isletmeler` }] },
  ],
};

export default async function BusinessesPage() {
  const [plans, counts] = await Promise.all([loadPublicPlans(), loadBusinessCount()]);
  const plan = featuredPlan(plans);
  const symbol = currencySymbol(plan.currency);
  const saving = yearlySavingPercent(plan);
  const multiple = plans.length > 1;
  const startingPrice = Math.min(...plans.map((item) => item.monthlyPrice));
  const maxStaff = Math.max(...plans.map((item) => item.maxStaff));
  const maxStores = Math.max(...plans.map((item) => item.maxStores));
  const showCounts = Boolean(counts && counts.businesses >= PROOF_MIN_BUSINESSES);

  return <BusinessPage className={styles.page}><main className={styles.main}>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(businessJsonLd) }}/>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(businessFaqJsonLd) }}/>

    {/* ─── Hero ─── */}
    <section className={styles.hero} aria-labelledby="biz-title">
      <div className={styles.heroBackdrop} aria-hidden="true"><span className={styles.heroGrid} /><span className={`${styles.heroGlow} ${styles.glowA}`} /><span className={`${styles.heroGlow} ${styles.glowB}`} /></div>
      <div className={`${styles.wrap} ${styles.heroInner}`}>
        <div className={styles.heroCopy}>
          <span className={styles.eyebrow}><Gift size={13} aria-hidden="true" /> İŞLETMELER İÇİN · İLK AY ÜCRETSİZ</span>
          <h1 id="biz-title" className={styles.title}>Takviminizi değil,<br /><em>işletmenizi yönetin.</em></h1>
          <p className={styles.lead}>Online randevu, ekip, müşteri, kasa ve hatırlatmalar tek akıllı panelde. Siz hizmetinize odaklanın; SeninRandevun gününüzü düzenlesin.</p>
          <div className={styles.heroActions}>
            <Link href="/isletmeler/kayit" className={styles.btnLime}>İlk ay ücretsiz başla <ArrowUpRight size={17} aria-hidden="true" /></Link>
            <Link href="/isletmeler/giris" className={styles.btnGhost}><LogIn size={16} aria-hidden="true" /> İşletme girişi</Link>
          </div>
          <ul className={styles.heroProof}>
            <li><Check size={14} aria-hidden="true" /> Kredi kartı gerekmez</li>
            <li><Check size={14} aria-hidden="true" /> Kurulum desteği dahil</li>
            <li><Check size={14} aria-hidden="true" /> Taahhüt yok</li>
          </ul>
        </div>
        <ProductMockup />
      </div>
    </section>

    <CategoryMarquee />

    {/* ─── Kanıt şeridi ─── */}
    <section className={styles.wrap} aria-label="SeninRandevun bir bakışta">
      <dl className={styles.proof} data-reveal="">
        {showCounts && counts ? <>
          <div><dt>Yayında işletme</dt><dd>{counts.businesses.toLocaleString("tr-TR")}</dd></div>
          <div><dt>Şehir</dt><dd>{counts.cities.toLocaleString("tr-TR")}</dd></div>
        </> : <>
          <div><dt>randevu, ekip, müşteri ve kasa</dt><dd>Tek panel</dd></div>
          <div><dt>online randevu sayfası</dt><dd>7/24</dd></div>
        </>}
        <div><dt>web, iPhone ve Android</dt><dd>Her cihazda</dd></div>
        <div><dt>lansmana özel ücretsiz</dt><dd>1 ay</dd></div>
      </dl>
    </section>

    {/* ─── Özellikler ─── */}
    <section className={styles.section} id="ozellikler" aria-labelledby="biz-features-title">
      <div className={styles.wrap}>
        <div className={styles.sectionHead} data-reveal="">
          <div><span className={styles.kicker}>TEK PLATFORM · TAM KONTROL</span><h2 id="biz-features-title">İhtiyacınız olan her şey,<br /><em>tek pakette.</em></h2><p>Ayrı uygulamalar, defterler ve mesaj grupları yerine birbirine bağlı tek bir sistem.</p></div>
          <Link href="/ozellikler" className={styles.textLink}>Tüm özellikler <ArrowRight size={15} aria-hidden="true" /></Link>
        </div>
        <ul className={styles.features}>
          {FEATURES.map(({ icon: Icon, title, text, wide }, index) => <li key={title} className={`${styles.feature} ${wide ? styles.featureWide : ""}`} data-reveal="" style={{ "--i": index % 4 } as CSSProperties}>
            <span className={styles.featureIcon}><Icon size={21} aria-hidden="true" /></span>
            <h3>{title}</h3>
            <p>{text}</p>
            {wide && index === 0 && <span className={styles.featureDemo} aria-hidden="true"><i style={{ "--w": "62%" } as CSSProperties} /><i style={{ "--w": "38%" } as CSSProperties} /><i style={{ "--w": "80%" } as CSSProperties} /></span>}
            {wide && index === 1 && <span className={styles.featureLink} aria-hidden="true">seninrandevun.com/isletme/<b>salonunuz</b></span>}
          </li>)}
        </ul>
      </div>
    </section>

    {/* ─── Akış ─── */}
    <section className={styles.section} aria-labelledby="biz-flow-title">
      <div className={styles.wrap}>
        <div className={styles.flowPanel} data-reveal="">
          <div className={styles.flowCopy}>
            <span className={styles.kickerLight}><Sparkles size={13} aria-hidden="true" /> BİRBİRİNE BAĞLI OPERASYON</span>
            <h2 id="biz-flow-title">Bir randevu geldiğinde<br /><em>her şey birlikte ilerler.</em></h2>
            <p>Müşteri gelişinden tahsilata kadar bütün işleyiş tek akışta güncel kalır. Kimse kimseyi aramak zorunda kalmaz.</p>
            <div className={styles.flowRovi}><RoviMascot size={84} mood="thinking" alt="" /><p><b>Rovi, işletme asistanınız</b>Günü özetler, boşlukları ve bekleyen işleri hatırlatır.</p></div>
          </div>
          <ol className={styles.flowSteps}>
            {FLOW.map(({ icon: Icon, title, text }, index) => <li key={title}>
              <span className={styles.flowIcon}><Icon size={19} aria-hidden="true" /></span>
              <div><small>ADIM 0{index + 1}</small><strong>{title}</strong><p>{text}</p></div>
            </li>)}
          </ol>
        </div>
      </div>
    </section>

    {/* ─── Fiyat ─── */}
    <section className={styles.section} aria-labelledby="biz-price-title">
      <div className={`${styles.wrap} ${styles.teaser}`}>
        <div className={styles.teaserCopy} data-reveal="">
          <span className={styles.kicker}>ŞEFFAF FİYAT</span>
          {multiple
            ? <><h2 id="biz-price-title">{plans.length} paket.<br /><em>Size uygun olanı seçin.</em></h2>
              <p>Gizli ücret ve kurulum bedeli yok. Aylık {formatPrice(startingPrice)} {currencySymbol(plans[0].currency)}&apos;den başlayan paketlerle başlayın, ihtiyacınız büyüdükçe yükseltin.</p></>
            : <><h2 id="biz-price-title">Tek paket.<br /><em>Her şey dahil.</em></h2>
              <p>Özellik kilidi, gizli ücret ve kurulum bedeli yok. İlk ay ücretsiz; sonra işletmenize uygun dönemle devam edin.</p></>}
          <ul className={styles.checkList}>
            <li><ShieldCheck size={16} aria-hidden="true" /> Siz onaylamadan ücretli dönem başlamaz</li>
            <li><UsersRound size={16} aria-hidden="true" /> {multiple ? maxStaff : plan.maxStaff} çalışana, {multiple ? maxStores : plan.maxStores} şubeye kadar</li>
            <li><Sparkles size={16} aria-hidden="true" /> Yeni özellikler pakete otomatik eklenir</li>
          </ul>
        </div>
        <div className={styles.teaserCard} data-reveal="">
          <span className={styles.teaserBadge}><Gift size={13} aria-hidden="true" /> {plan.trialDays > 0 ? `İlk ${plan.trialDays} gün ücretsiz` : "Lansmana özel"}</span>
          <strong>{plan.label}</strong>
          <div className={styles.teaserPrice}><b>{formatPrice(plan.monthlyPrice)} {symbol}</b><span>/ ay</span></div>
          <small>veya yıllık {formatPrice(plan.yearlyPrice)} {symbol}{saving > 0 ? ` · %${saving} tasarruf` : ""}</small>
          {multiple && <ul className={styles.teaserPlans} aria-label="Diğer paketler">
            {plans.filter((item) => item.id !== plan.id).map((item) => <li key={item.id}><span>{item.label}</span><b>{formatPrice(item.monthlyPrice)} {currencySymbol(item.currency)}<small>/ ay</small></b></li>)}
          </ul>}
          <Link href="/isletmeler/kayit" className={styles.btnLime}>Ücretsiz başla <ArrowUpRight size={17} aria-hidden="true" /></Link>
          <Link href="/fiyatlar" className={styles.teaserLink}>{multiple ? "Tüm paketleri karşılaştır" : "Paket detayları ve karşılaştırma"} <ArrowRight size={14} aria-hidden="true" /></Link>
        </div>
      </div>
    </section>

    <BusinessFaq id="biz-faq-title" title="Aklınızdaki sorular." intro="Bulamadığınız bir şey mi var? Yardım merkezimiz ve destek ekibimiz yanınızda." items={BUSINESS_FAQ} />

    {/* ─── Son çağrı ─── */}
    <section className={styles.section} aria-labelledby="biz-final-title">
      <div className={styles.wrap}>
        <div className={styles.final} data-reveal="">
          <RoviMascot size={110} mood="wave" alt="" className={styles.finalRovi} />
          <span className={styles.kickerLight}>İLK AY BOYUNCA TÜM ÖZELLİKLER AÇIK</span>
          <h2 id="biz-final-title">Yarının işleyişini<br /><em>bugün kurun.</em></h2>
          <p>Kredi kartı yok. Kurulum ücreti yok. Sadece daha akıcı bir işletme günü.</p>
          <div className={styles.finalActions}>
            <Link href="/isletmeler/kayit" className={styles.btnLime}>Ücretsiz hesabını aç <ArrowUpRight size={17} aria-hidden="true" /></Link>
            <Link href="/isletmeler/giris" className={styles.btnGhost}><LogIn size={16} aria-hidden="true" /> Zaten hesabım var</Link>
          </div>
        </div>
      </div>
    </section>
    <ScrollReveal />
  </main></BusinessPage>;
}
