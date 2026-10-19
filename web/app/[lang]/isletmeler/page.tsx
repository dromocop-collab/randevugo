import Link from "@/i18n/link";
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
import { localizeHref, tk } from "@/i18n/config";
import { getIntlLocale, getLocale, getT } from "@/i18n/server";

const FEATURES = [
  { icon: CalendarDays, title: tk("Akıllı takvim"), text: tk("Çalışan, hizmet süresi, mola ve izinleri birlikte hesaplayan çakışmasız takvim. Günün tamamı tek bakışta."), wide: true },
  { icon: Globe2, title: tk("7/24 online randevu"), text: tk("Size özel randevu sayfası ve QR bağlantısı. Müşteriniz siz uyurken bile uygun saati seçsin."), wide: true },
  { icon: MessageSquareText, title: tk("SMS hatırlatma"), text: tk("Onay, değişiklik ve hatırlatma mesajları otomatik gitsin; gelmeyen müşteri azalsın.") },
  { icon: Ticket, title: tk("Canlı sıra"), text: tk("Randevusuz gelenleri dijital sıraya alın; müşteri sırasını telefonundan izlesin.") },
  { icon: UsersRound, title: tk("Ekip yönetimi"), text: tk("Çalışan hesapları, rol bazlı yetkiler, çalışma planları ve kişisel takvimler.") },
  { icon: UserCheck, title: tk("Müşteri CRM"), text: tk("Ziyaret geçmişi, notlar, tercihler ve harcama özeti tek müşteri profilinde.") },
  { icon: WalletCards, title: tk("Kasa ve paketler"), text: tk("Tahsilat, adisyon, seans paketleri, gelir–gider ve stok tek akışta.") },
  { icon: BarChart3, title: tk("Analitik"), text: tk("Doluluk, gelir, iptal ve ekip performansını anlaşılır raporlarla izleyin.") },
  { icon: ClipboardList, title: tk("Ek randevu alanları"), text: tk("Randevu sırasında ihtiyacınız olan bilgiyi sorun: notlar, tercihler, özel sorular.") },
  { icon: Smartphone, title: tk("Web, iPhone ve Android"), text: tk("Panel tarayıcıda; işletmeniz cebinizde. Bildirimler anında elinizde.") },
];

const FLOW = [
  { icon: CalendarCheck2, title: tk("Randevu oluşur"), text: tk("Müşteri hizmeti, çalışanı ve saati seçer; kayıt anında takvime düşer.") },
  { icon: BellRing, title: tk("Herkes haberdar"), text: tk("Çalışana bildirim, müşteriye onay ve hatırlatma otomatik gider.") },
  { icon: PackageCheck, title: tk("Ödeme işlenir"), text: tk("Tahsilat, paket veya seans bilgisi aynı müşteri hesabına yazılır.") },
  { icon: WandSparkles, title: tk("Rovi takip eder"), text: tk("Boşlukları, bekleyen işleri ve önerileri günlük özetle gösterir.") },
];

const BUSINESS_FAQ = [
  [tk("İlk ay gerçekten ücretsiz mi?"), tk("Evet. Lansman döneminde açılan işletme hesapları ilk ay tüm özellikleri ücretsiz kullanır. Başlamak için kredi kartı gerekmez.")],
  [tk("Kurulum ne kadar sürer?"), tk("Hizmetlerinizi, çalışanlarınızı ve çalışma saatlerinizi ekledikten sonra randevu sayfanız yayına hazırdır; aynı gün randevu almaya başlayabilirsiniz. Kurulum rehberi ve destek ekibi yanınızda.")],
  [tk("Müşterilerim uygulama indirmek zorunda mı?"), tk("Hayır. Müşterileriniz randevu sayfanızdan tarayıcıyla randevu alabilir. Dilerlerse iPhone ve Android uygulamasını da kullanabilirler.")],
  [tk("Birden fazla şubem ve çalışanım var, uygun mu?"), tk("Evet. Çoklu şube, rol bazlı ekip erişimi ve çalışan bazlı takvimler pakete dahildir. Güncel limitler fiyatlar sayfasında yazar.")],
  [tk("Mevcut müşteri listemi taşıyabilir miyim?"), tk("Evet. Müşteri kayıtlarınızı sisteme aktarabilir, kurulum desteğimizden yararlanabilirsiniz.")],
  [tk("İstediğim zaman bırakabilir miyim?"), tk("Evet. Taahhüt yoktur; aboneliğinizi dilediğiniz zaman sonlandırabilirsiniz.")],
] as const;

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

export async function generateMetadata() {
  const t = await getT();
  return createPublicMetadata({
    title: t("İşletme ve Randevu Yönetim Programı"),
    description: t("Online randevu, takvim, çalışan, müşteri, paket, kasa ve şube süreçlerinizi tek panelden yönetin. SeninRandevun işletme paneli lansmana özel ilk ay ücretsiz."),
    pathname: "/isletmeler",
    keywords: [t("randevu programı"), t("işletme yönetim programı"), t("online randevu sistemi"), t("müşteri takip programı"), t("kuaför randevu programı"), t("salon yönetim sistemi")],
    imageAlt: t("SeninRandevun işletme ve online randevu yönetim programı"),
    locale: await getLocale(),
  });
}

export default async function BusinessesPage() {
  const t = await getT();
  const locale = await getLocale();
  const intlLocale = await getIntlLocale();
  const [plans, counts] = await Promise.all([loadPublicPlans(), loadBusinessCount()]);
  const pageUrl = `${SEO_SITE_URL}${localizeHref("/isletmeler", locale)}`;
  const homeUrl = `${SEO_SITE_URL}${localizeHref("/", locale).replace(/^\/$/, "")}`;
  const businessFaqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "@id": `${pageUrl}#faq`,
    mainEntity: BUSINESS_FAQ.map(([question, answer]) => ({ "@type": "Question", name: t(question), acceptedAnswer: { "@type": "Answer", text: t(answer) } })),
  };
  const businessJsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      { "@type": "WebPage", "@id": `${pageUrl}#webpage`, url: pageUrl, name: t("Randevu ve İşletme Yönetim Programı"), description: t("Randevu, çalışan, müşteri, paket, kasa ve şube süreçlerini tek panelden yöneten işletme yazılımı."), inLanguage: intlLocale, isPartOf: { "@id": `${SEO_SITE_URL}/#website` } },
      { "@type": "SoftwareApplication", "@id": `${SEO_SITE_URL}/isletmeler#software`, name: t("SeninRandevun İşletme Yönetim Sistemi"), applicationCategory: "BusinessApplication", applicationSubCategory: "Appointment Scheduling Software", operatingSystem: "Web, iOS", url: pageUrl, description: t("Hizmet işletmeleri için randevu, ekip, müşteri, paket, kasa ve şube yönetimi."), offers: { "@type": "Offer", price: "0", priceCurrency: "TRY", description: t("Lansmana özel ilk ay ücretsiz") }, featureList: [t("Online randevu"), t("Takvim yönetimi"), t("Müşteri takibi"), t("Çalışan yönetimi"), t("Paket ve seans takibi"), t("Kasa ve gelir-gider takibi"), t("Şube yönetimi")], publisher: { "@id": `${SEO_SITE_URL}/#organization` } },
      { "@type": "BreadcrumbList", "@id": `${pageUrl}#breadcrumb`, itemListElement: [{ "@type": "ListItem", position: 1, name: t("Ana Sayfa"), item: homeUrl }, { "@type": "ListItem", position: 2, name: t("İşletmeler İçin"), item: pageUrl }] },
    ],
  };
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
          <span className={styles.eyebrow}><Gift size={13} aria-hidden="true" /> {t("İŞLETMELER İÇİN · İLK AY ÜCRETSİZ")}</span>
          <h1 id="biz-title" className={styles.title}>{t("Takviminizi değil,")}<br /><em>{t("işletmenizi yönetin.")}</em></h1>
          <p className={styles.lead}>{t("Online randevu, ekip, müşteri, kasa ve hatırlatmalar tek akıllı panelde. Siz hizmetinize odaklanın; SeninRandevun gününüzü düzenlesin.")}</p>
          <div className={styles.heroActions}>
            <Link href="/isletmeler/kayit" className={styles.btnLime}>{t("İlk ay ücretsiz başla")} <ArrowUpRight size={17} aria-hidden="true" /></Link>
            <Link href="/isletmeler/giris" className={styles.btnGhost}><LogIn size={16} aria-hidden="true" /> {t("İşletme girişi")}</Link>
          </div>
          <ul className={styles.heroProof}>
            <li><Check size={14} aria-hidden="true" /> {t("Kredi kartı gerekmez")}</li>
            <li><Check size={14} aria-hidden="true" /> {t("Kurulum desteği dahil")}</li>
            <li><Check size={14} aria-hidden="true" /> {t("Taahhüt yok")}</li>
          </ul>
        </div>
        <ProductMockup />
      </div>
    </section>

    <CategoryMarquee />

    {/* ─── Kanıt şeridi ─── */}
    <section className={styles.wrap} aria-label={t("SeninRandevun bir bakışta")}>
      <dl className={styles.proof} data-reveal="">
        {showCounts && counts ? <>
          <div><dt>{t("Yayında işletme")}</dt><dd>{counts.businesses.toLocaleString(intlLocale)}</dd></div>
          <div><dt>{t("Şehir", { ctx: "sayac" })}</dt><dd>{counts.cities.toLocaleString(intlLocale)}</dd></div>
        </> : <>
          <div><dt>{t("randevu, ekip, müşteri ve kasa")}</dt><dd>{t("Tek panel")}</dd></div>
          <div><dt>{t("online randevu sayfası")}</dt><dd>7/24</dd></div>
        </>}
        <div><dt>{t("web, iPhone ve Android")}</dt><dd>{t("Her cihazda")}</dd></div>
        <div><dt>{t("lansmana özel ücretsiz")}</dt><dd>{t("1 ay")}</dd></div>
      </dl>
    </section>

    {/* ─── Özellikler ─── */}
    <section className={styles.section} id="ozellikler" aria-labelledby="biz-features-title">
      <div className={styles.wrap}>
        <div className={styles.sectionHead} data-reveal="">
          <div><span className={styles.kicker}>{t("TEK PLATFORM · TAM KONTROL")}</span><h2 id="biz-features-title">{t("İhtiyacınız olan her şey,")}<br /><em>{t("tek pakette.")}</em></h2><p>{t("Ayrı uygulamalar, defterler ve mesaj grupları yerine birbirine bağlı tek bir sistem.")}</p></div>
          <Link href="/ozellikler" className={styles.textLink}>{t("Tüm özellikler")} <ArrowRight size={15} aria-hidden="true" /></Link>
        </div>
        <ul className={styles.features}>
          {FEATURES.map(({ icon: Icon, title, text, wide }, index) => <li key={title} className={`${styles.feature} ${wide ? styles.featureWide : ""}`} data-reveal="" style={{ "--i": index % 4 } as CSSProperties}>
            <span className={styles.featureIcon}><Icon size={21} aria-hidden="true" /></span>
            <h3>{t(title)}</h3>
            <p>{t(text)}</p>
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
            <span className={styles.kickerLight}><Sparkles size={13} aria-hidden="true" /> {t("BİRBİRİNE BAĞLI OPERASYON")}</span>
            <h2 id="biz-flow-title">{t("Bir randevu geldiğinde")}<br /><em>{t("her şey birlikte ilerler.")}</em></h2>
            <p>{t("Müşteri gelişinden tahsilata kadar bütün işleyiş tek akışta güncel kalır. Kimse kimseyi aramak zorunda kalmaz.")}</p>
            <div className={styles.flowRovi}><RoviMascot size={84} mood="thinking" alt="" /><p><b>{t("Rovi, işletme asistanınız")}</b>{t("Günü özetler, boşlukları ve bekleyen işleri hatırlatır.")}</p></div>
          </div>
          <ol className={styles.flowSteps}>
            {FLOW.map(({ icon: Icon, title, text }, index) => <li key={title}>
              <span className={styles.flowIcon}><Icon size={19} aria-hidden="true" /></span>
              <div><small>{t("ADIM 0{step}", { step: index + 1 })}</small><strong>{t(title)}</strong><p>{t(text)}</p></div>
            </li>)}
          </ol>
        </div>
      </div>
    </section>

    {/* ─── Fiyat ─── */}
    <section className={styles.section} aria-labelledby="biz-price-title">
      <div className={`${styles.wrap} ${styles.teaser}`}>
        <div className={styles.teaserCopy} data-reveal="">
          <span className={styles.kicker}>{t("ŞEFFAF FİYAT")}</span>
          {multiple
            ? <><h2 id="biz-price-title">{t("{count} paket.", { count: plans.length })}<br /><em>{t("Size uygun olanı seçin.")}</em></h2>
              <p>{t("Gizli ücret ve kurulum bedeli yok. Aylık {price} {symbol}'den başlayan paketlerle başlayın, ihtiyacınız büyüdükçe yükseltin.", { price: formatPrice(startingPrice), symbol: currencySymbol(plans[0].currency) })}</p></>
            : <><h2 id="biz-price-title">{t("Tek paket.")}<br /><em>{t("Her şey dahil.")}</em></h2>
              <p>{t("Özellik kilidi, gizli ücret ve kurulum bedeli yok. İlk ay ücretsiz; sonra işletmenize uygun dönemle devam edin.")}</p></>}
          <ul className={styles.checkList}>
            <li><ShieldCheck size={16} aria-hidden="true" /> {t("Siz onaylamadan ücretli dönem başlamaz")}</li>
            <li><UsersRound size={16} aria-hidden="true" /> {t("{staff} çalışana, {stores} şubeye kadar", { staff: multiple ? maxStaff : plan.maxStaff, stores: multiple ? maxStores : plan.maxStores })}</li>
            <li><Sparkles size={16} aria-hidden="true" /> {t("Yeni özellikler pakete otomatik eklenir")}</li>
          </ul>
        </div>
        <div className={styles.teaserCard} data-reveal="">
          <span className={styles.teaserBadge}><Gift size={13} aria-hidden="true" /> {plan.trialDays > 0 ? t("İlk {count} gün ücretsiz", { count: plan.trialDays }) : t("Lansmana özel")}</span>
          <strong>{plan.label}</strong>
          <div className={styles.teaserPrice}><b>{formatPrice(plan.monthlyPrice)} {symbol}</b><span>{t("/ ay")}</span></div>
          <small>{t("veya yıllık {price} {symbol}", { price: formatPrice(plan.yearlyPrice), symbol })}{saving > 0 ? ` · ${t("%{percent} tasarruf", { percent: saving })}` : ""}</small>
          {multiple && <ul className={styles.teaserPlans} aria-label={t("Diğer paketler")}>
            {plans.filter((item) => item.id !== plan.id).map((item) => <li key={item.id}><span>{item.label}</span><b>{formatPrice(item.monthlyPrice)} {currencySymbol(item.currency)}<small>{t("/ ay")}</small></b></li>)}
          </ul>}
          <Link href="/isletmeler/kayit" className={styles.btnLime}>{t("Ücretsiz başla")} <ArrowUpRight size={17} aria-hidden="true" /></Link>
          <Link href="/fiyatlar" className={styles.teaserLink}>{multiple ? t("Tüm paketleri karşılaştır") : t("Paket detayları ve karşılaştırma")} <ArrowRight size={14} aria-hidden="true" /></Link>
        </div>
      </div>
    </section>

    <BusinessFaq id="biz-faq-title" title={t("Aklınızdaki sorular.")} intro={t("Bulamadığınız bir şey mi var? Yardım merkezimiz ve destek ekibimiz yanınızda.")} items={BUSINESS_FAQ.map(([question, answer]) => [t(question), t(answer)])} />

    {/* ─── Son çağrı ─── */}
    <section className={styles.section} aria-labelledby="biz-final-title">
      <div className={styles.wrap}>
        <div className={styles.final} data-reveal="">
          <RoviMascot size={110} mood="wave" alt="" className={styles.finalRovi} />
          <span className={styles.kickerLight}>{t("İLK AY BOYUNCA TÜM ÖZELLİKLER AÇIK")}</span>
          <h2 id="biz-final-title">{t("Yarının işleyişini")}<br /><em>{t("bugün kurun.")}</em></h2>
          <p>{t("Kredi kartı yok. Kurulum ücreti yok. Sadece daha akıcı bir işletme günü.")}</p>
          <div className={styles.finalActions}>
            <Link href="/isletmeler/kayit" className={styles.btnLime}>{t("Ücretsiz hesabını aç")} <ArrowUpRight size={17} aria-hidden="true" /></Link>
            <Link href="/isletmeler/giris" className={styles.btnGhost}><LogIn size={16} aria-hidden="true" /> {t("Zaten hesabım var")}</Link>
          </div>
        </div>
      </div>
    </section>
    <ScrollReveal />
  </main></BusinessPage>;
}
