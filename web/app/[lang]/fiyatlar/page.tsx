import Link from "@/i18n/link";
import type { CSSProperties } from "react";
import { ArrowRight, BadgeCheck, CalendarCheck2, Check, Clock3, Gift, Minus, Rocket, ShieldCheck, Store, Zap } from "lucide-react";
import { BusinessPage } from "@/components/marketing/business-shell";
import { RoviMascot } from "@/components/brand/rovi-mascot";
import { BusinessFaq } from "@/components/home/business-sections";
import { BusinessCtaLink, PricingPlans } from "@/components/home/pricing-plans";
import { ScrollReveal } from "@/components/home/scroll-reveal";
import { loadPublicPlans } from "@/components/home/public-plans";
import type { PlatformPlan } from "@/features/subscriptions/platform-plan-domain";
import { ALL_SUBSCRIPTION_ENTITLEMENTS, SUBSCRIPTION_ENTITLEMENTS, entitlementLabel } from "@/constants/subscription-entitlements";
import { safeJsonLd } from "@/lib/seo/metadata";
import styles from "@/components/home/business.module.css";
import { localizeHref, tk } from "@/i18n/config";
import { getLocale, getT } from "@/i18n/server";

// Paketler süper admin panelinden yönetilir; kayıtta anında (api/platform-plans/revalidate),
// aksi halde en geç 60 sn'de yenilenir. Değer sabit olmalı (segment config statik okunur).
export const revalidate = 60;

const COMPARISON: Array<[string, string, string]> = [
  [tk("Randevu alma"), tk("Telefon ve mesajla, mesai saatinde"), tk("7/24 online, saniyeler içinde")],
  [tk("Hatırlatma"), tk("Elle aranır ya da unutulur"), tk("Otomatik SMS ve bildirim")],
  [tk("Takvim"), tk("Defter, ajanda, karışık notlar"), tk("Çalışan bazlı, çakışmasız takvim")],
  [tk("Müşteri geçmişi"), tk("Hafızada veya dağınık"), tk("Tek profilde ziyaret, not, harcama")],
  [tk("Kasa ve paketler"), tk("Ayrı defter ve hesap tablosu"), tk("Tahsilat, seans ve stok tek akışta")],
  [tk("Raporlar"), tk("Ay sonu tahmini"), tk("Doluluk ve gelir anlık")],
];

const STEPS = [
  { icon: Clock3, title: tk("Hesabınızı açın"), text: tk("Kart bilgisi girmeden birkaç dakikada başlayın.") },
  { icon: Store, title: tk("Mağazanızı hazırlayın"), text: tk("Hizmet, ekip ve çalışma saatlerinizi rehberle ekleyin.") },
  { icon: Zap, title: tk("Randevu almaya başlayın"), text: tk("Bağlantınızı paylaşın; gerisini takvim halletsin.") },
];

export default async function PricingPage() {
  const t = await getT();
  const locale = await getLocale();
  const plans = await loadPublicPlans();
  const trialDays = Math.max(0, ...plans.map((item) => item.trialDays));
  const multiple = plans.length > 1;
  const storeLimit = (maxStores: number) => maxStores <= 1 ? t("1 şube") : t("{count} şubeye kadar", { count: maxStores });
  const staffLimit = (maxStaff: number) => maxStaff >= 100 ? t("sınırsız çalışan") : t("{count} çalışan", { count: maxStaff });
  const limitText = (item: PlatformPlan) => item.smsMonthlyQuota !== null
    ? t("{plan}: {stores}, {staff}, ayda {sms} SMS", { plan: item.label, stores: storeLimit(item.maxStores), staff: staffLimit(item.maxStaff), sms: item.smsMonthlyQuota })
    : t("{plan}: {stores}, {staff}", { plan: item.label, stores: storeLimit(item.maxStores), staff: staffLimit(item.maxStaff) });
  const smsPlans = plans.filter((item) => item.smsMonthlyQuota !== null);
  const included = new Set(plans.flatMap((item) => item.entitlements.length ? item.entitlements : ALL_SUBSCRIPTION_ENTITLEMENTS));
  const groups = SUBSCRIPTION_ENTITLEMENTS.reduce<Record<string, typeof SUBSCRIPTION_ENTITLEMENTS[number][]>>((acc, item) => {
    if (included.has(item.key)) (acc[item.group] ??= []).push(item);
    return acc;
  }, {});

  const faqs = [
    [t("Ücretsiz deneme kampanyası nasıl çalışır?"), trialDays
      ? t("İşletmeler seçtikleri pakette belirtilen deneme süresinden yararlanır (şu anda {count} gün). Başlamak için kredi kartı gerekmez; deneme boyunca en kapsamlı paketteki tüm özellikler açıktır; deneme bitince size uyan paketi seçersiniz.", { count: trialDays })
      : t("İşletmeler seçtikleri pakette belirtilen deneme süresinden yararlanır. Başlamak için kredi kartı gerekmez; deneme boyunca en kapsamlı paketteki tüm özellikler açıktır; deneme bitince size uyan paketi seçersiniz.")],
    [t("Çalışan veya randevu limiti var mı?"), t("Randevu sayısı sınırsızdır. Şube, çalışan ve SMS sınırları pakete göre değişir: {limits}.", { limits: plans.map(limitText).join("; ") })],
    ...(smsPlans.length ? [[t("SMS hatırlatmaları dahil mi?"), t("Evet. Randevu onayı, hatırlatma, iptal ve değişiklik SMS'leri paketinizin aylık SMS kotasından düşer; kota her ay yenilenir. Kota biterse işletme panelinden ek SMS paketi alabilirsiniz. Uygulama bildirimleri her pakette sınırsızdır.")] as const] : []),
    ...(multiple ? [[t("Paketler arasında geçiş yapabilir miyim?"), t("Evet. İşletme panelinizdeki Abonelik sayfasından dilediğiniz zaman paket değiştirebilirsiniz; kayıtlarınız korunur.")] as const] : []),
    [t("İstediğim zaman ayrılabilir miyim?"), t("Evet. Taahhüt yoktur; aboneliğinizi dilediğiniz zaman sonlandırabilirsiniz.")],
    [t("Mevcut verilerimi taşıyabilir miyim?"), t("Müşteri listenizi aktarabilir, kurulum desteğimizden yararlanabilirsiniz.")],
    [t("Deneme bitince ne olur?"), t("Siz onaylamadan ücretli dönem başlamaz. Aylık veya yıllık ödeme seçeneğiyle devam edebilirsiniz; kayıtlarınız korunur.")],
  ] as const;

  const pricingJsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "SeninRandevun",
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web, iOS, Android",
    url: `https://seninrandevun.com${localizeHref("/fiyatlar", locale)}`,
    offers: plans.flatMap((item) => [
      { "@type": "Offer", name: t("{plan} aylık", { plan: item.label }), price: item.monthlyPrice, priceCurrency: item.currency, availability: "https://schema.org/InStock" },
      { "@type": "Offer", name: t("{plan} yıllık", { plan: item.label }), price: item.yearlyPrice, priceCurrency: item.currency, availability: "https://schema.org/InStock" },
    ]),
    featureList: [...included].map((key) => t(entitlementLabel(key))),
  };

  return <BusinessPage className={styles.page}><main className={styles.main}>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(pricingJsonLd) }} />

    <section className={`${styles.hero} ${styles.priceHero}`} aria-labelledby="price-title">
      <div className={styles.heroBackdrop} aria-hidden="true"><span className={styles.heroGrid} /><span className={`${styles.heroGlow} ${styles.glowA}`} /><span className={`${styles.heroGlow} ${styles.glowB}`} /></div>
      <div className={`${styles.wrap} ${styles.priceHeroInner}`}>
        <span className={styles.eyebrow}><Gift size={13} aria-hidden="true" /> {t("LANSMANA ÖZEL")}{trialDays ? ` · ${t("{count} GÜN ÜCRETSİZ", { count: trialDays })}` : ""}</span>
        {multiple
          ? <><h1 id="price-title" className={styles.title}>{t("İşletmenize uygun")} <em>{t("paketi seçin.")}</em></h1>
            <p className={styles.lead}>{t("Randevu, ekip, müşteri ve hatırlatmalar her pakette. İhtiyacınız büyüdükçe paketinizi yükseltin; kurulum ücreti ve taahhüt yok.")}</p></>
          : <><h1 id="price-title" className={styles.title}>{t("Tek paket.")} <em>{t("Her şey dahil.")}</em></h1>
            <p className={styles.lead}>{t("Randevu, ekip, müşteri, kasa ve hatırlatmalar tek fiyatta. Özellik kilidi, kurulum ücreti ve taahhüt yok.")}</p></>}
      </div>
    </section>

    <section className={`${styles.wrap} ${styles.priceStage}`} aria-label={t("Paketler ve fiyatlar")}>
      <PricingPlans plans={plans} />
      <ul className={styles.assurance}>
        <li><ShieldCheck size={16} aria-hidden="true" /> {t("Kredi kartı gerekmez")}</li>
        <li><BadgeCheck size={16} aria-hidden="true" /> {t("Siz onaylamadan ücret alınmaz")}</li>
        <li><Rocket size={16} aria-hidden="true" /> {t("Kurulum desteği dahil")}</li>
      </ul>
    </section>

    {/* ─── Paket kapsamı ─── */}
    <section className={styles.section} aria-labelledby="price-scope-title">
      <div className={styles.wrap}>
        <div className={styles.sectionHead} data-reveal="">
          <div><span className={styles.kicker}>{t("PAKET KAPSAMI")}</span>{multiple
            ? <><h2 id="price-scope-title">{t("Paketleri")}<br /><em>{t("yan yana karşılaştırın.")}</em></h2><p>{t("Her pakette hangi modüllerin açık olduğunu görün. Yeni özellikler geldikçe paketlere eklenir.")}</p></>
            : <><h2 id="price-scope-title">{t("Her modül açık,")}<br /><em>{t("her gün kullanılır.")}</em></h2><p>{t("Paketlerde yayınlanan tüm yetkiler. Yeni özellikler geldikçe pakete eklenir.")}</p></>}</div>
        </div>
        {plans.length > 1 ? <div className={styles.tableWrap} data-reveal="">
          <table className={styles.table}>
            <thead><tr><th scope="col">{t("Özellik")}</th>{plans.map((item) => <th key={item.id} scope="col">{item.label}</th>)}</tr></thead>
            <tbody>{SUBSCRIPTION_ENTITLEMENTS.filter((item) => included.has(item.key)).map((item) => <tr key={item.key}>
              <th scope="row">{t(item.label)}<small>{t(item.description)}</small></th>
              {plans.map((p) => {
                const has = (p.entitlements.length ? p.entitlements : ALL_SUBSCRIPTION_ENTITLEMENTS).includes(item.key);
                return <td key={p.id}>{has ? <Check size={17} aria-label={t("Dahil")} className={styles.yes} /> : <Minus size={17} aria-label={t("Dahil değil")} className={styles.no} />}</td>;
              })}
            </tr>)}</tbody>
          </table>
        </div> : <div className={styles.scopeGrid}>
          {Object.entries(groups).map(([group, items], index) => <article key={group} className={styles.scopeCard} data-reveal="" style={{ "--i": index } as CSSProperties}>
            <h3>{t(group)}</h3>
            <ul>{items.map((item) => <li key={item.key}><span><Check size={12} aria-hidden="true" /></span><div><b>{t(item.label)}</b><small>{t(item.description)}</small></div></li>)}</ul>
          </article>)}
        </div>}
      </div>
    </section>

    {/* ─── Karşılaştırma ─── */}
    <section className={styles.section} aria-labelledby="price-compare-title">
      <div className={styles.wrap}>
        <div className={styles.sectionHead} data-reveal="">
          <div><span className={styles.kicker}>{t("FARKI GÖRÜN")}</span><h2 id="price-compare-title">{t("Defter ve telefon yerine")}<br /><em>{t("tek akıllı sistem.")}</em></h2></div>
        </div>
        <div className={styles.tableWrap} data-reveal="">
          <table className={`${styles.table} ${styles.compare}`}>
            <thead><tr><th scope="col"><span className={styles.srOnly}>{t("Konu", { ctx: "karsilastirma" })}</span></th><th scope="col">{t("Klasik yöntem")}</th><th scope="col" className={styles.compareUs}>SeninRandevun</th></tr></thead>
            <tbody>{COMPARISON.map(([topic, before, after]) => <tr key={topic}>
              <th scope="row">{t(topic)}</th>
              <td className={styles.compareOld}><Minus size={14} aria-hidden="true" /> {t(before)}</td>
              <td className={styles.compareUs}><Check size={14} aria-hidden="true" /> {t(after)}</td>
            </tr>)}</tbody>
          </table>
        </div>
      </div>
    </section>

    {/* ─── Başlangıç ─── */}
    <section className={styles.section} aria-labelledby="price-steps-title">
      <div className={styles.wrap}>
        <div className={styles.sectionHead} data-reveal="">
          <div><span className={styles.kicker}>{t("3 ADIMDA HAZIR")}</span><h2 id="price-steps-title">{t("Bugün başlayın,")}<br /><em>{t("bugün randevu alın.")}</em></h2></div>
          <Link href="/isletmeler" className={styles.textLink}>{t("İşletmeler için SeninRandevun")} <ArrowRight size={15} aria-hidden="true" /></Link>
        </div>
        <ol className={styles.startSteps}>
          {STEPS.map(({ icon: Icon, title, text }, index) => <li key={title} data-reveal="" style={{ "--i": index } as CSSProperties}>
            <span className={styles.startNo}>0{index + 1}</span>
            <span className={styles.featureIcon}><Icon size={20} aria-hidden="true" /></span>
            <h3>{t(title)}</h3>
            <p>{t(text)}</p>
          </li>)}
        </ol>
      </div>
    </section>

    <BusinessFaq id="price-faq-title" title={t("Fiyatlarla ilgili sorular.")} intro={t("Paket, deneme süresi ve ödeme hakkında merak edilenler.")} items={faqs} />

    <section className={styles.section} aria-labelledby="price-final-title">
      <div className={styles.wrap}>
        <div className={styles.final} data-reveal="">
          <RoviMascot size={110} mood="happy" alt="" className={styles.finalRovi} />
          <span className={styles.kickerLight}><CalendarCheck2 size={13} aria-hidden="true" /> {trialDays ? t("{count} GÜN ÜCRETSİZ", { count: trialDays }) : t("HEMEN BAŞLAYIN")}</span>
          <h2 id="price-final-title">{t("İşletme sisteminizi")}<br /><em>{t("bugün kurun.")}</em></h2>
          <p>{t("Kredi kartı ve kurulum ücreti yok. Beğenmezseniz hiçbir şey ödemezsiniz.")}</p>
          <div className={styles.finalActions}><BusinessCtaLink className={styles.btnLime} /></div>
        </div>
      </div>
    </section>
    <ScrollReveal />
  </main></BusinessPage>;
}
