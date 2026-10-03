"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight, ArrowUpRight, BadgeCheck, BarChart3, CalendarCheck2, Check,
  CircleCheckBig, Clock3, Gift, Headphones, ShieldCheck, Sparkles, Store,
  UsersRound, WalletCards, Zap,
} from "lucide-react";
import { BusinessPage } from "@/components/marketing/business-shell";
import { PLAN_FEATURE_LIST, PLAN_PRICE } from "@/constants/plans";
import { ALL_SUBSCRIPTION_ENTITLEMENTS, entitlementLabel } from "@/constants/subscription-entitlements";
import { listPlatformPlans, type PlatformPlan } from "@/features/subscriptions/platform-plan-repository";
import { useAuth } from "@/hooks/use-auth";

const featureGroups = [
  { icon: CalendarCheck2, title: "Randevularınız düzenli kalsın", text: "Müşterileriniz günün her saati randevu alabilsin; siz çakışma ve müsaitlik hesabıyla uğraşmayın.", items: ["Online randevu", "Akıllı takvim", "Hatırlatmalar"] },
  { icon: UsersRound, title: "Müşteri kayıtlarınız düzenli kalsın", text: "Son ziyaret, kalan seans ve ödeme geçmişini tek profilde görün; ihtiyaç duyduğunuz bilgiye kolayca ulaşın.", items: ["Kolay müşteri takibi", "Paket ve seans", "Puan ve ödüller"] },
  { icon: WalletCards, title: "Kasanız net, gününüz rahat olsun", text: "Tahsilat, gelir–gider, ürün ve stok hareketleri tek işlemle güncellensin.", items: ["Kolay tahsilat", "Gelir–gider özeti", "Stok takibi"] },
  { icon: Sparkles, title: "Sıradaki adımı bilin", text: "Rovi günün akışını özetlesin, bekleyen işleri göstersin ve işletmenize uygun öneriler sunsun.", items: ["Günlük özet", "Akıllı öneriler", "Kurulum rehberi"] },
];

const FALLBACK_PLAN: PlatformPlan = {
  id: "RANDEVUGO", label: "SeninRandevun", yearlyPrice: PLAN_PRICE.yearly,
  monthlyPrice: PLAN_PRICE.monthly, currency: PLAN_PRICE.currency, trialDays: PLAN_PRICE.trialDays,
  maxStores: 3, maxStaff: 250, isActive: true, isRecommended: true,
  description: "Tüm randevu operasyonunu tek merkezden yönetin.",
  features: [...PLAN_FEATURE_LIST], entitlements: [...ALL_SUBSCRIPTION_ENTITLEMENTS],
};

export default function PricingPage() {
  const { user, status } = useAuth();
  const [plans, setPlans] = useState<PlatformPlan[]>([FALLBACK_PLAN]);
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">("yearly");
  const signedIn = status === "authenticated" && Boolean(user);
  const primaryHref = signedIn ? "/dashboard" : "/isletmeler/kayit";
  const primaryLabel = signedIn ? "Panelime devam et" : "Ücretsiz denemeyi başlat";
  const featuredPlan = plans.find((plan) => plan.isRecommended) ?? plans[0] ?? FALLBACK_PLAN;
  const maximumTrialDays = Math.max(0, ...plans.map((plan) => plan.trialDays));
  const allPublishedFeatures = useMemo(() => plans.flatMap((plan) => {
    const entitlementFeatures = (plan.entitlements.length ? plan.entitlements : ALL_SUBSCRIPTION_ENTITLEMENTS).map(entitlementLabel);
    return [...plan.features, ...entitlementFeatures];
  }).filter((feature, index, values) => values.indexOf(feature) === index), [plans]);
  const faqs = useMemo(() => [
    ["Ücretsiz deneme dönemi nasıl çalışır?", `Seçtiğiniz pakette ${maximumTrialDays || featuredPlan.trialDays} güne kadar ücretsiz deneme sunulur. Başlamak için kredi kartı gerekmez.`],
    ["Ücretsiz dönemde özellik kısıtlaması var mı?", "Deneme boyunca seçtiğiniz paketin kapsamındaki özellikleri kullanabilirsiniz. Her paketin özellikleri fiyat kartında açıkça listelenir."],
    ["Ücretsiz dönem bitince hangi seçenekler var?", "Aylık veya yıllık ödeme seçeneğini tercih edebilir, işletmeniz büyüdükçe paketinizi değiştirebilirsiniz."],
    ["Çalışan ve şube sınırı var mı?", "Her paketin çalışan ve şube kapasitesi farklıdır. Güncel limitleri paket kartlarından karşılaştırabilirsiniz."],
    ["Mevcut müşteri kayıtlarımı taşıyabilir miyim?", "Evet. Müşteri listenizi sisteme aktarabilir, hızlı kurulum rehberinden ve ekibimizin desteğinden yararlanabilirsiniz."],
  ], [featuredPlan.trialDays, maximumTrialDays]);

  useEffect(() => {
    let active = true;
    listPlatformPlans()
      .then((rows) => {
        const available = rows.filter((plan) => plan.isActive);
        if (active && available.length) setPlans(available);
      })
      .catch(() => { /* Güvenli varsayılan paket görünmeye devam eder. */ });
    return () => { active = false; };
  }, []);

  const pricingJsonLd = useMemo(() => ({
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "SeninRandevun",
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    url: "https://seninrandevun.com/fiyatlar",
    offers: plans.flatMap((plan) => [
      { "@type": "Offer", name: `${plan.label} aylık`, price: plan.monthlyPrice, priceCurrency: plan.currency, availability: "https://schema.org/InStock" },
      { "@type": "Offer", name: `${plan.label} yıllık`, price: plan.yearlyPrice, priceCurrency: plan.currency, availability: "https://schema.org/InStock" },
    ]),
    featureList: plans.flatMap((plan) => plan.entitlements.map(entitlementLabel)).filter((value, index, values) => values.indexOf(value) === index),
  }), [plans]);

  return <BusinessPage className="pricing-v2"><main>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(pricingJsonLd).replace(/</g, "\\u003c") }} />
    <section className="pricing-hero">
      <div className="pricing-hero__eyebrow"><Gift size={15}/> LANSMANA ÖZEL · {maximumTrialDays} GÜNE KADAR ÜCRETSİZ</div>
      <h1>Randevularınız, müşterileriniz<br/><em>ve kasanız tek yerde.</em></h1>
      <p>Dağınık defterler ve ayrı uygulamalar yerine işletmenizi tek ekrandan yönetin. Daha az operasyon yükü, daha düzenli ve daha net bir gün.</p>
        <div className="pricing-hero__actions"><Link href={primaryHref}>{primaryLabel}<ArrowUpRight size={18}/></Link><a href="#urun-onizleme">Nasıl çalıştığını gör<ArrowRight size={17}/></a></div>
      <div className="pricing-hero__trust"><span><CircleCheckBig/> Kredi kartı gerekmez</span><span><CircleCheckBig/> Kolay kurulum</span><span><CircleCheckBig/> İhtiyacına uygun paket</span></div>
    </section>

    <section className="pricing-plan-stage" aria-label="Dinamik fiyatlandırma paketleri">
      <div className="pricing-plan-stage__head"><div><span>İŞLETMENİZE UYGUN PAKET</span><h2>İhtiyacınız kadarını seçin.</h2><p>Paketler, fiyatlar ve kullanım hakları yönetim panelinden güncel olarak yayınlanır.</p></div><div className="pricing-cycle" aria-label="Ödeme dönemi"><button type="button" className={billingCycle === "monthly" ? "is-active" : ""} onClick={() => setBillingCycle("monthly")}>Aylık</button><button type="button" className={billingCycle === "yearly" ? "is-active" : ""} onClick={() => setBillingCycle("yearly")}>Yıllık</button></div></div>
      <div className="pricing-plan-grid">{plans.map((plan) => <PublicPlanCard key={plan.id} plan={plan} cycle={billingCycle} href={primaryHref} ctaLabel={primaryLabel}/>)}</div>
      <div className="pricing-plan-assurance"><ShieldCheck/><p><b>Güvenli ve şeffaf başlangıç</b><span>Ücret tahsil edilmeden ücretli paket açılmaz. Paket değişiminde mevcut işletme kayıtlarınız korunur.</span></p></div>
    </section>

    <section className="pricing-value-strip" aria-label="SeninRandevun avantajları">
      <article><i><CalendarCheck2/></i><div><b>Randevularınız düzenli</b><p>Takvim, ekip ve müşteriler aynı akışta çalışır.</p></div></article>
      <article><i><WalletCards/></i><div><b>Kasanız kontrol altında</b><p>Tahsilat, paket ve seans birlikte güncellenir.</p></div></article>
      <article><i><BarChart3/></i><div><b>Kararlarınız veriye dayalı</b><p>Performansı ve büyümeyi net biçimde görün.</p></div></article>
      <article><i><Headphones/></i><div><b>Kurulumda yalnız değilsiniz</b><p>Akıllı rehber ve destek merkezi yanınızda.</p></div></article>
    </section>

    <section className="pricing-steps" aria-label="Başlangıç adımları">
      <div><span>01</span><i><Clock3/></i><b>Hesabınızı açın</b><p>Kart bilgisi girmeden birkaç dakikada başlayın.</p></div>
      <div><span>02</span><i><Store/></i><b>Mağazanızı hazırlayın</b><p>Hizmet, ekip ve çalışma saatlerinizi kolayca ekleyin.</p></div>
      <div><span>03</span><i><Zap/></i><b>Randevu almaya başlayın</b><p>Bağlantınızı paylaşın, operasyonu tek yerden yönetin.</p></div>
    </section>

    <section className="pricing-product" id="urun-onizleme">
      <div className="pricing-product__copy"><div className="section-kicker">ÜRÜNÜ İŞ ÜSTÜNDE GÖRÜN</div><h2>Sabah baktığınızda<br/>ne yapacağınız belli.</h2><p>Bugünün randevuları, bekleyen işler, kasa durumu ve Rovi’nin önerileri aynı ekranda. Aradığınızı menüler arasında kaybolmadan bulun.</p><ul><li><BadgeCheck/>Günün akışını anında görün</li><li><BadgeCheck/>Müşteriye tek profilden ulaşın</li><li><BadgeCheck/>Kasa ve paketleri birlikte yönetin</li></ul></div>
      <div className="pricing-product__demo" aria-label="Örnek işletme paneli">
        <header><span><i/><i/><i/></span><b>ÖRNEK İŞLETME PANELİ</b><em>CANLI</em></header>
        <div className="pricing-product__body"><aside><strong>SR</strong><span className="active"><BarChart3/>Özet</span><span><CalendarCheck2/>Takvim</span><span><UsersRound/>Müşteriler</span><span><WalletCards/>Kasa</span></aside><section><div className="pricing-demo-title"><span><small>GÜNAYDIN</small><b>Bugünün akışı hazır.</b></span><i><Sparkles/></i></div><div className="pricing-demo-stats"><article><small>BUGÜN</small><b>8 randevu</b><span>2 randevu yaklaşıyor</span></article><article><small>KASA</small><b>₺4.250</b><span>Güncel tahsilat</span></article><article><small>TAKİP</small><b>3 işlem</b><span>İşlem bekliyor</span></article></div><div className="pricing-demo-lower"><article><small>YAKLAŞAN</small><div><time>14:30</time><span><b>Ayşe Yılmaz</b><em>Saç kesimi · Elif</em></span></div><div><time>15:15</time><span><b>Deniz Kaya</b><em>Bakım paketi · Büşra</em></span></div></article><article><small><Sparkles/> ROVİ ÖNERİSİ</small><b>Yarın 14:00 için takvimde boşluk var.</b><p>Bekleme listenizi ve ekip planını kontrol edebilirsiniz.</p><span>Takvimi incele <ArrowRight/></span></article></div></section></div>
      </div>
    </section>

    <section className="pricing-features" id="paket-kapsami">
      <div className="pricing-section-heading"><div className="section-kicker">DÖRT TEMEL SONUÇ</div><h2>Daha az uğraşın.<br/>İşletmenize odaklanın.</h2><p>Uzun özellik listeleri yerine her gün doğrudan kullanacağınız dört temel fayda.</p></div>
      <div className="pricing-feature-grid">{featureGroups.map(({ icon: Icon, title, text, items }) => <article key={title}><i><Icon/></i><h3>{title}</h3><p>{text}</p><ul>{items.map(item => <li key={item}><BadgeCheck/>{item}</li>)}</ul></article>)}</div>
      <details className="pricing-all-features"><summary>Yayınlanan paketlerdeki tüm özellikleri gör <span>+</span></summary><div>{allPublishedFeatures.map(feature => <span key={feature}><Check/>{feature}</span>)}</div></details>
    </section>

    <section className="pricing-promise">
      <div><span>RİSKSİZ BAŞLANGIÇ</span><h2>Önce işletmenizde deneyin.<br/>Değerini görün, sonra karar verin.</h2></div>
      <div><p><strong>{maximumTrialDays} güne kadar</strong> ücretsiz kullanım</p><p><strong>0 ₺</strong> kurulum maliyeti</p><p><strong>Siz seçmeden</strong> ücretli plan başlamaz</p></div>
    </section>

    <section className="pricing-faq"><div className="pricing-section-heading"><div className="section-kicker">MERAK EDİLENLER</div><h2>Sık sorulan sorular.</h2></div><div>{faqs.map(([question, answer]) => <details key={question}><summary>{question}<span>+</span></summary><p>{answer}</p></details>)}</div></section>

    <section className="pricing-final-cta"><div><span><Sparkles/> LANSMANA ÖZEL</span><h2>İşletme sisteminizi kurmaya<br/>bugün başlayın.</h2><p>{maximumTrialDays} güne kadar ücretsiz. Kredi kartı ve kurulum ücreti yok.</p></div><Link href={primaryHref}>{primaryLabel}<ArrowUpRight/></Link></section>
  </main></BusinessPage>;
}

function PublicPlanCard({ plan, cycle, href, ctaLabel }: { plan: PlatformPlan; cycle: "monthly" | "yearly"; href: string; ctaLabel: string }) {
  const price = cycle === "yearly" ? plan.yearlyPrice : plan.monthlyPrice;
  const currency = plan.currency === "TRY" ? "₺" : plan.currency;
  const entitlements = plan.entitlements.length ? plan.entitlements : ALL_SUBSCRIPTION_ENTITLEMENTS;
  const visibleFeatures = plan.features.length ? plan.features.slice(0, 6) : entitlements.slice(0, 6).map(entitlementLabel);
  const monthlyEquivalent = plan.yearlyPrice > 0 ? Math.round(plan.yearlyPrice / 12) : 0;
  return <article className={`pricing-public-plan ${plan.isRecommended ? "is-recommended" : ""}`}>
    {plan.isRecommended && <span className="pricing-public-plan__recommended"><Sparkles size={12}/> EN ÇOK TERCİH EDİLEN</span>}
    <div className="pricing-public-plan__body">
      <div className="pricing-public-plan__summary"><div className="pricing-public-plan__top"><span>{plan.id}</span><h3>{plan.label}</h3><p>{plan.description || "İşletmenizin ihtiyaçlarına göre hazırlanmış yönetim paketi."}</p></div><div className="pricing-public-plan__price"><b>{price.toLocaleString("tr-TR")} {currency}</b><span>/ {cycle === "yearly" ? "yıl" : "ay"}</span>{cycle === "yearly" && monthlyEquivalent > 0 && <small>Ayda yaklaşık {monthlyEquivalent.toLocaleString("tr-TR")} {currency}</small>}</div><div className="pricing-public-plan__limits"><span><Store/> {plan.maxStores} mağaza</span><span><UsersRound/> {plan.maxStaff} çalışan</span><span><Gift/> {plan.trialDays} gün deneme</span></div></div>
      <div className="pricing-public-plan__benefits"><span className="pricing-public-plan__benefits-label">PAKETLE GELENLER</span><ul>{visibleFeatures.map((feature) => <li key={feature}><span><Check/></span>{feature}</li>)}</ul><details><summary>Tüm paket yetkilerini gör <span>+</span></summary><div>{entitlements.map((key) => <p key={key}><BadgeCheck/>{entitlementLabel(key)}</p>)}</div></details></div>
    </div>
    <Link href={href}>{ctaLabel}<ArrowUpRight size={18}/></Link>
  </article>;
}
