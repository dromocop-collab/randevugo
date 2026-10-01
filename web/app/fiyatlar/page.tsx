"use client";

import Link from "next/link";
import {
  ArrowRight, ArrowUpRight, BadgeCheck, BarChart3, CalendarCheck2, Check,
  CircleCheckBig, Clock3, Gift, Headphones, ShieldCheck, Sparkles, Store,
  UsersRound, WalletCards, Zap,
} from "lucide-react";
import { BusinessPage } from "@/components/marketing/business-shell";
import { PLAN_FEATURE_LIST, PLAN_PRICE } from "@/constants/plans";
import { useAuth } from "@/hooks/use-auth";

const featureGroups = [
  { icon: CalendarCheck2, title: "Randevularınız düzenli kalsın", text: "Müşterileriniz günün her saati randevu alabilsin; siz çakışma ve müsaitlik hesabıyla uğraşmayın.", items: ["Online randevu", "Akıllı takvim", "Hatırlatmalar"] },
  { icon: UsersRound, title: "Müşteri kayıtlarınız düzenli kalsın", text: "Son ziyaret, kalan seans ve ödeme geçmişini tek profilde görün; ihtiyaç duyduğunuz bilgiye kolayca ulaşın.", items: ["Kolay müşteri takibi", "Paket ve seans", "Puan ve ödüller"] },
  { icon: WalletCards, title: "Kasanız net, gününüz rahat olsun", text: "Tahsilat, gelir–gider, ürün ve stok hareketleri tek işlemle güncellensin.", items: ["Kolay tahsilat", "Gelir–gider özeti", "Stok takibi"] },
  { icon: Sparkles, title: "Sıradaki adımı bilin", text: "Rovi günün akışını özetlesin, bekleyen işleri göstersin ve işletmenize uygun öneriler sunsun.", items: ["Günlük özet", "Akıllı öneriler", "Kurulum rehberi"] },
];

const faqs = [
  ["Lansmana özel 3 ay ücretsiz dönem nasıl çalışır?", "İşletme hesabınızı lansman döneminde açtığınızda tüm özellikler 90 gün boyunca ücretsiz kullanıma açılır. Başlamak için kredi kartı gerekmez."],
  ["Ücretsiz dönemde özellik kısıtlaması var mı?", "Hayır. Takvim, müşteri yönetimi, kasa, paketler, raporlar, mağaza ve işletme asistanı dahil plan kapsamındaki özellikleri deneyebilirsiniz."],
  ["Ücretsiz dönem bitince hangi seçenekler var?", `Aylık ${PLAN_PRICE.monthly.toLocaleString("tr-TR")} ₺ veya iki ay avantaj sağlayan yıllık ${PLAN_PRICE.yearly.toLocaleString("tr-TR")} ₺ seçeneklerinden size uygun olanla devam edebilirsiniz.`],
  ["Çalışan, müşteri veya randevu sınırı var mı?", "Müşteri ve randevu sayısı sınırsızdır. Tek başınıza başlayabilir, işletmeniz büyüdükçe ekibinizi ve şubelerinizi ekleyebilirsiniz."],
  ["Mevcut müşteri kayıtlarımı taşıyabilir miyim?", "Evet. Müşteri listenizi sisteme aktarabilir, hızlı kurulum rehberinden ve ekibimizin desteğinden yararlanabilirsiniz."],
];

export default function PricingPage() {
  const { user, status } = useAuth();
  const signedIn = status === "authenticated" && Boolean(user);
  const primaryHref = signedIn ? "/dashboard" : "/isletmeler/kayit";
  const primaryLabel = signedIn ? "Panelime devam et" : "3 ay ücretsiz başla";

  return <BusinessPage className="pricing-v2"><main>
    <section className="pricing-hero">
      <div className="pricing-hero__eyebrow"><Gift size={15}/> LANSMANA ÖZEL · 90 GÜN ÜCRETSİZ</div>
      <h1>Randevularınız, müşterileriniz<br/><em>ve kasanız tek yerde.</em></h1>
      <p>Dağınık defterler ve ayrı uygulamalar yerine işletmenizi tek ekrandan yönetin. Daha az operasyon yükü, daha düzenli ve daha net bir gün.</p>
        <div className="pricing-hero__actions"><Link href={primaryHref}>{primaryLabel}<ArrowUpRight size={18}/></Link><a href="#urun-onizleme">Nasıl çalıştığını gör<ArrowRight size={17}/></a></div>
      <div className="pricing-hero__trust"><span><CircleCheckBig/> Kredi kartı gerekmez</span><span><CircleCheckBig/> Kolay kurulum</span><span><CircleCheckBig/> Tüm özellikler açık</span></div>
    </section>

    <section className="pricing-stage" aria-label="Fiyatlandırma">
      <article className="pricing-card">
        <div className="pricing-card__campaign"><span><Sparkles size={14}/> LANSMAN FIRSATI</span><b>İlk 3 ay bizden</b></div>
        <div className="pricing-card__free"><strong>0</strong><span><b>₺</b><small>90 gün boyunca</small></span></div>
        <p className="pricing-card__lead">İşletme akışınızı kurun ve tüm sistemi kendi çalışma düzeninizle ücretsiz deneyin.</p>
        <div className="pricing-card__options">
          <div><small>AYLIK PLAN</small><p><b>{PLAN_PRICE.monthly.toLocaleString("tr-TR")} ₺</b><span>/ ay</span></p><em>Esnek kullanım</em></div>
          <div className="is-highlighted"><span className="pricing-save">2 AY BİZDEN</span><small>YILLIK PLAN</small><p><b>{PLAN_PRICE.yearly.toLocaleString("tr-TR")} ₺</b><span>/ yıl</span></p><em>Ayda yaklaşık {PLAN_PRICE.monthlyEquivalent} ₺</em></div>
        </div>
        <Link className="pricing-card__cta" href={primaryHref}><span>{primaryLabel}<small>Kurulum ücreti yok</small></span><ArrowUpRight size={21}/></Link>
        <div className="pricing-card__foot"><ShieldCheck size={16}/><span>Kart bilgisi istemiyoruz. 90 gün sonunda siz seçmeden ücretli plan başlamaz.</span></div>
      </article>

      <aside className="pricing-value-panel">
        <div className="pricing-value-panel__head"><span>TEK PAKETTE TAM OPERASYON</span><h2>Birden fazla araç yerine<br/>tek çalışma merkezi.</h2></div>
        <div className="pricing-value-list">
          <article><i><CalendarCheck2/></i><div><b>Randevularınız düzenli</b><p>Takvim, ekip ve müşteriler aynı akışta çalışır.</p></div><Check/></article>
          <article><i><WalletCards/></i><div><b>Kasanız kontrol altında</b><p>Tahsilat, paket, seans ve stok birlikte güncellenir.</p></div><Check/></article>
          <article><i><BarChart3/></i><div><b>Kararlarınız veriye dayalı</b><p>Nelerin iyi çalıştığını ve neyi düzenlemeniz gerektiğini görün.</p></div><Check/></article>
          <article><i><Headphones/></i><div><b>Kurulumda yalnız değilsiniz</b><p>Akıllı rehber ve destek merkezi her adımda yanınızda.</p></div><Check/></article>
        </div>
        <div className="pricing-value-panel__numbers"><div><b>Tek kişi</b><span>kolayca başlayın</span></div><div><b>Ekibinizle</b><span>birlikte büyüyün</span></div><div><b>Tek ekran</b><span>her şeyi yönetin</span></div></div>
      </aside>
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
      <details className="pricing-all-features"><summary>Plan kapsamındaki tüm özellikleri gör <span>+</span></summary><div>{PLAN_FEATURE_LIST.map(feature => <span key={feature}><Check/>{feature}</span>)}</div></details>
    </section>

    <section className="pricing-promise">
      <div><span>RİSKSİZ BAŞLANGIÇ</span><h2>Önce işletmenizde deneyin.<br/>Değerini görün, sonra karar verin.</h2></div>
      <div><p><strong>90 gün</strong> ücretsiz kullanım</p><p><strong>0 ₺</strong> kurulum maliyeti</p><p><strong>Siz seçmeden</strong> ücretli plan başlamaz</p></div>
    </section>

    <section className="pricing-faq"><div className="pricing-section-heading"><div className="section-kicker">MERAK EDİLENLER</div><h2>Sık sorulan sorular.</h2></div><div>{faqs.map(([question, answer]) => <details key={question}><summary>{question}<span>+</span></summary><p>{answer}</p></details>)}</div></section>

    <section className="pricing-final-cta"><div><span><Sparkles/> LANSMANA ÖZEL</span><h2>İşletme sisteminizi kurmaya<br/>bugün başlayın.</h2><p>İlk 3 ay ücretsiz. Kredi kartı ve kurulum ücreti yok.</p></div><Link href={primaryHref}>{primaryLabel}<ArrowUpRight/></Link></section>
  </main></BusinessPage>;
}
