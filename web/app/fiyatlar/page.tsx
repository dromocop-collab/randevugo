import Link from "next/link";
import type { CSSProperties } from "react";
import { ArrowRight, BadgeCheck, CalendarCheck2, Check, Clock3, Gift, Minus, Rocket, ShieldCheck, Store, Zap } from "lucide-react";
import { BusinessPage } from "@/components/marketing/business-shell";
import { RoviMascot } from "@/components/brand/rovi-mascot";
import { BusinessFaq } from "@/components/home/business-sections";
import { BusinessCtaLink, PricingPlans } from "@/components/home/pricing-plans";
import { ScrollReveal } from "@/components/home/scroll-reveal";
import { featuredPlan, loadPublicPlans } from "@/components/home/public-plans";
import { ALL_SUBSCRIPTION_ENTITLEMENTS, SUBSCRIPTION_ENTITLEMENTS, entitlementLabel } from "@/constants/subscription-entitlements";
import { safeJsonLd } from "@/lib/seo/metadata";
import styles from "@/components/home/business.module.css";

// Paketler süper admin panelinden yönetilir; kayıtta anında (api/platform-plans/revalidate),
// aksi halde en geç 60 sn'de yenilenir. Değer sabit olmalı (segment config statik okunur).
export const revalidate = 60;

const COMPARISON: Array<[string, string, string]> = [
  ["Randevu alma", "Telefon ve mesajla, mesai saatinde", "7/24 online, saniyeler içinde"],
  ["Hatırlatma", "Elle aranır ya da unutulur", "Otomatik SMS ve bildirim"],
  ["Takvim", "Defter, ajanda, karışık notlar", "Çalışan bazlı, çakışmasız takvim"],
  ["Müşteri geçmişi", "Hafızada veya dağınık", "Tek profilde ziyaret, not, harcama"],
  ["Kasa ve paketler", "Ayrı defter ve hesap tablosu", "Tahsilat, seans ve stok tek akışta"],
  ["Raporlar", "Ay sonu tahmini", "Doluluk ve gelir anlık"],
];

const STEPS = [
  { icon: Clock3, title: "Hesabınızı açın", text: "Kart bilgisi girmeden birkaç dakikada başlayın." },
  { icon: Store, title: "Mağazanızı hazırlayın", text: "Hizmet, ekip ve çalışma saatlerinizi rehberle ekleyin." },
  { icon: Zap, title: "Randevu almaya başlayın", text: "Bağlantınızı paylaşın; gerisini takvim halletsin." },
];

export default async function PricingPage() {
  const plans = await loadPublicPlans();
  const plan = featuredPlan(plans);
  const trialDays = Math.max(0, ...plans.map((item) => item.trialDays));
  const multiple = plans.length > 1;
  const maxStaff = Math.max(...plans.map((item) => item.maxStaff));
  const maxStores = Math.max(...plans.map((item) => item.maxStores));
  const included = new Set(plans.flatMap((item) => item.entitlements.length ? item.entitlements : ALL_SUBSCRIPTION_ENTITLEMENTS));
  const groups = SUBSCRIPTION_ENTITLEMENTS.reduce<Record<string, typeof SUBSCRIPTION_ENTITLEMENTS[number][]>>((acc, item) => {
    if (included.has(item.key)) (acc[item.group] ??= []).push(item);
    return acc;
  }, {});

  const faqs = [
    ["Ücretsiz deneme kampanyası nasıl çalışır?", `İşletmeler seçtikleri pakette belirtilen deneme süresinden yararlanır${trialDays ? ` (şu anda ${trialDays} gün)` : ""}. Başlamak için kredi kartı gerekmez; deneme boyunca paketteki tüm özellikler açıktır.`],
    ["Çalışan veya randevu limiti var mı?", multiple
      ? `Randevu sayısı sınırsızdır. Çalışan ve şube limitleri pakete göre değişir; paketlerimizde ${maxStaff} çalışana ve ${maxStores} şubeye kadar destek vardır. Her paketin limitleri kartında yazar.`
      : `Randevu sayısı sınırsızdır. ${plan.label} paketinde ${plan.maxStaff} çalışana ve ${plan.maxStores} şubeye kadar destek vardır.`],
    ...(multiple ? [["Paketler arasında geçiş yapabilir miyim?", "Evet. İşletme panelinizdeki Abonelik sayfasından dilediğiniz zaman paket değiştirebilirsiniz; kayıtlarınız korunur."] as const] : []),
    ["İstediğim zaman ayrılabilir miyim?", "Evet. Taahhüt yoktur; aboneliğinizi dilediğiniz zaman sonlandırabilirsiniz."],
    ["Mevcut verilerimi taşıyabilir miyim?", "Müşteri listenizi aktarabilir, kurulum desteğimizden yararlanabilirsiniz."],
    ["Deneme bitince ne olur?", "Siz onaylamadan ücretli dönem başlamaz. Aylık veya yıllık ödeme seçeneğiyle devam edebilirsiniz; kayıtlarınız korunur."],
  ] as const;

  const pricingJsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "SeninRandevun",
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web, iOS, Android",
    url: "https://seninrandevun.com/fiyatlar",
    offers: plans.flatMap((item) => [
      { "@type": "Offer", name: `${item.label} aylık`, price: item.monthlyPrice, priceCurrency: item.currency, availability: "https://schema.org/InStock" },
      { "@type": "Offer", name: `${item.label} yıllık`, price: item.yearlyPrice, priceCurrency: item.currency, availability: "https://schema.org/InStock" },
    ]),
    featureList: [...included].map(entitlementLabel),
  };

  return <BusinessPage className={styles.page}><main className={styles.main}>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(pricingJsonLd) }} />

    <section className={`${styles.hero} ${styles.priceHero}`} aria-labelledby="price-title">
      <div className={styles.heroBackdrop} aria-hidden="true"><span className={styles.heroGrid} /><span className={`${styles.heroGlow} ${styles.glowA}`} /><span className={`${styles.heroGlow} ${styles.glowB}`} /></div>
      <div className={`${styles.wrap} ${styles.priceHeroInner}`}>
        <span className={styles.eyebrow}><Gift size={13} aria-hidden="true" /> LANSMANA ÖZEL{trialDays ? ` · ${trialDays} GÜN ÜCRETSİZ` : ""}</span>
        {multiple
          ? <><h1 id="price-title" className={styles.title}>İşletmenize uygun <em>paketi seçin.</em></h1>
            <p className={styles.lead}>Randevu, ekip, müşteri ve hatırlatmalar her pakette. İhtiyacınız büyüdükçe paketinizi yükseltin; kurulum ücreti ve taahhüt yok.</p></>
          : <><h1 id="price-title" className={styles.title}>Tek paket. <em>Her şey dahil.</em></h1>
            <p className={styles.lead}>Randevu, ekip, müşteri, kasa ve hatırlatmalar tek fiyatta. Özellik kilidi, kurulum ücreti ve taahhüt yok.</p></>}
      </div>
    </section>

    <section className={`${styles.wrap} ${styles.priceStage}`} aria-label="Paketler ve fiyatlar">
      <PricingPlans plans={plans} />
      <ul className={styles.assurance}>
        <li><ShieldCheck size={16} aria-hidden="true" /> Kredi kartı gerekmez</li>
        <li><BadgeCheck size={16} aria-hidden="true" /> Siz onaylamadan ücret alınmaz</li>
        <li><Rocket size={16} aria-hidden="true" /> Kurulum desteği dahil</li>
      </ul>
    </section>

    {/* ─── Paket kapsamı ─── */}
    <section className={styles.section} aria-labelledby="price-scope-title">
      <div className={styles.wrap}>
        <div className={styles.sectionHead} data-reveal="">
          <div><span className={styles.kicker}>PAKET KAPSAMI</span>{multiple
            ? <><h2 id="price-scope-title">Paketleri<br /><em>yan yana karşılaştırın.</em></h2><p>Her pakette hangi modüllerin açık olduğunu görün. Yeni özellikler geldikçe paketlere eklenir.</p></>
            : <><h2 id="price-scope-title">Her modül açık,<br /><em>her gün kullanılır.</em></h2><p>Paketlerde yayınlanan tüm yetkiler. Yeni özellikler geldikçe pakete eklenir.</p></>}</div>
        </div>
        {plans.length > 1 ? <div className={styles.tableWrap} data-reveal="">
          <table className={styles.table}>
            <thead><tr><th scope="col">Özellik</th>{plans.map((item) => <th key={item.id} scope="col">{item.label}</th>)}</tr></thead>
            <tbody>{SUBSCRIPTION_ENTITLEMENTS.filter((item) => included.has(item.key)).map((item) => <tr key={item.key}>
              <th scope="row">{item.label}<small>{item.description}</small></th>
              {plans.map((p) => {
                const has = (p.entitlements.length ? p.entitlements : ALL_SUBSCRIPTION_ENTITLEMENTS).includes(item.key);
                return <td key={p.id}>{has ? <Check size={17} aria-label="Dahil" className={styles.yes} /> : <Minus size={17} aria-label="Dahil değil" className={styles.no} />}</td>;
              })}
            </tr>)}</tbody>
          </table>
        </div> : <div className={styles.scopeGrid}>
          {Object.entries(groups).map(([group, items], index) => <article key={group} className={styles.scopeCard} data-reveal="" style={{ "--i": index } as CSSProperties}>
            <h3>{group}</h3>
            <ul>{items.map((item) => <li key={item.key}><span><Check size={12} aria-hidden="true" /></span><div><b>{item.label}</b><small>{item.description}</small></div></li>)}</ul>
          </article>)}
        </div>}
      </div>
    </section>

    {/* ─── Karşılaştırma ─── */}
    <section className={styles.section} aria-labelledby="price-compare-title">
      <div className={styles.wrap}>
        <div className={styles.sectionHead} data-reveal="">
          <div><span className={styles.kicker}>FARKI GÖRÜN</span><h2 id="price-compare-title">Defter ve telefon yerine<br /><em>tek akıllı sistem.</em></h2></div>
        </div>
        <div className={styles.tableWrap} data-reveal="">
          <table className={`${styles.table} ${styles.compare}`}>
            <thead><tr><th scope="col"><span className={styles.srOnly}>Konu</span></th><th scope="col">Klasik yöntem</th><th scope="col" className={styles.compareUs}>SeninRandevun</th></tr></thead>
            <tbody>{COMPARISON.map(([topic, before, after]) => <tr key={topic}>
              <th scope="row">{topic}</th>
              <td className={styles.compareOld}><Minus size={14} aria-hidden="true" /> {before}</td>
              <td className={styles.compareUs}><Check size={14} aria-hidden="true" /> {after}</td>
            </tr>)}</tbody>
          </table>
        </div>
      </div>
    </section>

    {/* ─── Başlangıç ─── */}
    <section className={styles.section} aria-labelledby="price-steps-title">
      <div className={styles.wrap}>
        <div className={styles.sectionHead} data-reveal="">
          <div><span className={styles.kicker}>3 ADIMDA HAZIR</span><h2 id="price-steps-title">Bugün başlayın,<br /><em>bugün randevu alın.</em></h2></div>
          <Link href="/isletmeler" className={styles.textLink}>İşletmeler için SeninRandevun <ArrowRight size={15} aria-hidden="true" /></Link>
        </div>
        <ol className={styles.startSteps}>
          {STEPS.map(({ icon: Icon, title, text }, index) => <li key={title} data-reveal="" style={{ "--i": index } as CSSProperties}>
            <span className={styles.startNo}>0{index + 1}</span>
            <span className={styles.featureIcon}><Icon size={20} aria-hidden="true" /></span>
            <h3>{title}</h3>
            <p>{text}</p>
          </li>)}
        </ol>
      </div>
    </section>

    <BusinessFaq id="price-faq-title" title="Fiyatlarla ilgili sorular." intro="Paket, deneme süresi ve ödeme hakkında merak edilenler." items={faqs} />

    <section className={styles.section} aria-labelledby="price-final-title">
      <div className={styles.wrap}>
        <div className={styles.final} data-reveal="">
          <RoviMascot size={110} mood="happy" alt="" className={styles.finalRovi} />
          <span className={styles.kickerLight}><CalendarCheck2 size={13} aria-hidden="true" /> {trialDays ? `${trialDays} GÜN ÜCRETSİZ` : "HEMEN BAŞLAYIN"}</span>
          <h2 id="price-final-title">İşletme sisteminizi<br /><em>bugün kurun.</em></h2>
          <p>Kredi kartı ve kurulum ücreti yok. Beğenmezseniz hiçbir şey ödemezsiniz.</p>
          <div className={styles.finalActions}><BusinessCtaLink className={styles.btnLime} /></div>
        </div>
      </div>
    </section>
    <ScrollReveal />
  </main></BusinessPage>;
}
