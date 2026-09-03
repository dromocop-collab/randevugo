"use client";

import Link from "next/link";
import { BusinessPage } from "@/components/marketing/business-shell";
import { PLAN_FEATURE_LIST, PLAN_PRICE } from "@/constants/plans";
import { useAuth } from "@/hooks/use-auth";

const groups = [
  ["Randevu", "Akıllı takvim, çakışma kontrolü, çalışan müsaitliği ve 7/24 online rezervasyon."],
  ["Müşteri", "Sınırsız müşteri kaydı, ziyaret geçmişi, notlar ve CRM görünümü."],
  ["Büyüme", "Gelir, doluluk, iptal, hizmet ve ekip performans analitiği."],
  ["Mağaza", "Markanıza özel profil, keşfet görünürlüğü, yorumlar ve paylaşılabilir bağlantı."],
];

export default function PricingPage() {
  const { user, status } = useAuth();
  const signedIn = status === "authenticated" && Boolean(user);
  return <BusinessPage className="pricing-v2"><main>
    <section className="pricing-hero"><div className="section-kicker">TEK PLAN · TÜM ÖZELLİKLER</div><h1>İşletmeniz büyürken<br /><em>fiyatınız sürpriz yapmasın.</em></h1><p>Özellik kilidi, kurulum ücreti veya gizli maliyet yok. Tüm işletmeler için tek güçlü plan.</p></section>
    <section className="pricing-stage">
      <article className="pricing-card"><div className="pricing-card-top"><div><span>SENİNRANDEVUN</span><h2>Her şey dahil</h2></div><b>LANSMAN KAMPANYASI</b></div><div className="price-line"><strong>0</strong><div><span>₺</span><small>/ ilk yıl</small></div></div><p>İlk 12 ay ücretsiz · sonrasında yılda <b>{PLAN_PRICE.yearly.toLocaleString("tr-TR")} ₺</b></p><div className="trial-line"><i /> Tüm özellikler 365 gün açık · kredi kartı gerekmez</div><Link href={signedIn ? "/dashboard" : "/isletmeler/kayit"}>{signedIn ? "Panelime devam et" : "Ücretsiz hesabını aç"}<span>↗</span></Link><div className="pricing-trust"><span>Kredi kartı yok</span><span>Kurulum ücreti yok</span><span>Kurulum desteği</span></div></article>
      <div className="pricing-side"><span>PLANINIZA DAHİL</span>{groups.map(([title,text],index)=><article key={title}><b>0{index+1}</b><div><h3>{title}</h3><p>{text}</p></div></article>)}</div>
    </section>
    <section className="pricing-features"><div><div className="section-kicker">SINIR YOK</div><h2>Büyümek için gereken<br />her şey dahil.</h2></div><div>{PLAN_FEATURE_LIST.map(feature=><span key={feature}>✓ {feature}</span>)}</div></section>
    <section className="pricing-faq"><h2>Sık sorulanlar</h2><div>{[["İlk yıl ücretsiz kampanyası nasıl çalışır?","Yeni işletme kayıtları tüm özellikleri kayıt tarihinden itibaren 12 ay ücretsiz kullanır. Kart bilgisi istenmez."],["Çalışan veya randevu limiti var mı?","250 çalışana kadar destek verilir; müşteri ve randevu sayısı sınırsızdır."],["Ücretsiz dönem bitince ne olur?",`12 ay sonunda kullanım, o tarihteki güncel abonelik koşullarına göre devam eder. Mevcut yıllık fiyat ${PLAN_PRICE.yearly.toLocaleString("tr-TR")} ₺'dir.`],["Mevcut verilerimi taşıyabilir miyim?","Müşteri listenizi aktarabilir, kurulum desteğimizden yararlanabilirsiniz."]].map(([q,a])=><details key={q}><summary>{q}<span>+</span></summary><p>{a}</p></details>)}</div></section>
  </main></BusinessPage>;
}
