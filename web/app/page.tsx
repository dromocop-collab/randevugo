import Link from "next/link";
import { ArrowRight, BadgeCheck, BellRing, CalendarCheck2, Check, Clock3, Compass, Heart, MapPin, MessageCircleMore, Navigation, ShieldCheck, Sparkles, Star, TimerReset, WandSparkles } from "lucide-react";
import { MarketingFooter, MarketingHeader } from "@/components/marketing/marketing-shell";
import { HomeInteractive } from "./home-client";

const CUSTOMER_FAQ = [
  ["Randevu almak ücretli mi?", "Hayır. İşletme keşfetmek ve online randevu oluşturmak müşteriler için tamamen ücretsizdir."],
  ["Üye olmadan randevu alabilir miyim?", "İşletmenin sunduğu akışa göre temel iletişim bilgilerinle hızlıca randevu oluşturabilirsin."],
  ["Randevumu değiştirebilir miyim?", "İşletmenin iptal ve değişiklik kuralları doğrultusunda randevunu kolayca yönetebilirsin."],
];

export default function HomePage() {
  return <div className="marketing-page customer-home">
    <MarketingHeader />
    <main>
      <section className="customer-home-hero">
        <div className="customer-hero-grid" /><div className="customer-hero-orb orb-a" /><div className="customer-hero-orb orb-b" />
        <div className="customer-hero-inner">
          <div className="customer-hero-copy">
            <div className="customer-eyebrow"><Sparkles size={14} /> Şehrindeki iyi hizmetleri keşfet</div>
            <h1>Aradığın hizmet,<br /><em>sana uygun zamanda.</em></h1>
            <p>Yakınındaki güvenilir işletmeleri keşfet, gerçek yorumları incele ve müsait saatten saniyeler içinde randevunu al.</p>
            <div className="customer-hero-trust"><span><BadgeCheck size={15} /> Doğrulanmış işletmeler</span><span><ShieldCheck size={15} /> Güvenli randevu</span><span><Clock3 size={15} /> 7/24 online</span></div>
          </div>
          <div className="customer-hero-art" aria-hidden="true">
            <div className="customer-art-image" />
            <div className="customer-art-card art-card-a"><span><Check size={15} /></span><div><b>Randevun hazır</b><small>Bugün · 15:30</small></div></div>
            <div className="customer-art-card art-card-b"><span><Star size={15} /></span><div><b>4.9 müşteri puanı</b><small>Gerçek değerlendirmeler</small></div></div>
            <div className="customer-art-pin"><MapPin size={18} /></div>
          </div>
        </div>

        <HomeInteractive />
      </section>

      <section className="customer-live-section">
        <div className="customer-live-copy">
          <span><WandSparkles size={14} /> AKILLI RANDEVU DENEYİMİ</span>
          <h2>Planın sadece oluşmaz.<br /><em>Seninle hareket eder.</em></h2>
          <p>Keşiften randevu anına kadar ihtiyacın olan her şey tek akışta. Doğru işletmeyi bul, detayları karşılaştır ve gününü kesintisiz planla.</p>
          <div className="customer-live-actions"><Link href="/kesfet">Yakınındakileri gör <Compass size={16} /></Link><Link href="/hesabim">Randevularım <ArrowRight size={15} /></Link></div>
          <div className="customer-live-proof"><span><i /> Canlı müsaitlik</span><span><BadgeCheck size={13} /> Güvenli profiller</span><span><TimerReset size={13} /> Anında plan</span></div>
        </div>
        <div className="customer-live-visual" aria-label="Örnek randevu akışı">
          <div className="customer-live-phone">
            <header><div><small>BUGÜNÜN PLANI</small><strong>İyi hissetmeye hazır.</strong></div><span><BellRing size={16} /><i /></span></header>
            <div className="customer-live-date"><b>04</b><span>EYLÜL<small>Cuma · Fethiye</small></span><em>1 plan</em></div>
            <article><div className="customer-live-time"><b>15:30</b><span>45 dk</span></div><div><small>GÜZELLİK &amp; BAKIM</small><strong>Cilt bakım randevusu</strong><p><MapPin size={12} /> Merkeze 1,8 km</p></div><span><Check size={15} /></span></article>
            <div className="customer-live-route"><Navigation size={15} /><span><b>Yola çıkış önerisi</b><small>15:12 · Trafik sakin görünüyor</small></span><ArrowRight size={14} /></div>
          </div>
          <div className="customer-live-float live-float-one"><MessageCircleMore size={16} /><span><b>Hatırlatma hazır</b><small>Randevudan önce haber verelim</small></span></div>
          <div className="customer-live-float live-float-two"><Star size={16} /><span><b>4.9</b><small>doğrulanmış puan</small></span></div>
        </div>
      </section>

      <section className="customer-how-section"><div className="customer-how-copy"><span>3 KOLAY ADIM</span><h2>Planın hazırsa,<br />randevun da hazır.</h2><p>Telefon trafiği ve bekleme olmadan gerçek müsaitlik üzerinden randevunu oluştur.</p><Link href="/kesfet">Şimdi keşfet <ArrowRight size={15} /></Link></div><div className="customer-how-steps">{[["01","Ara ve keşfet","Hizmet, kategori veya konumla sana uygun işletmeyi bul."],["02","Saatini seç","Canlı müsaitlik arasından programına uyan saati seç."],["03","Randevunu al","Bilgilerini onayla; randevun anında oluşsun."]].map(([no,title,text]) => <article key={no}><span>{no}</span><div><h3>{title}</h3><p>{text}</p></div><CalendarCheck2 size={20} /></article>)}</div></section>

      <section className="customer-confidence"><div><Heart size={22} /><strong>İyi hissettiren seçimler</strong><p>Gerçek yorumlar ve detaylı işletme profilleriyle kararını güvenle ver.</p></div><div><ShieldCheck size={22} /><strong>Kontrol sende</strong><p>Randevu bilgilerine kolayca ulaş, işletmenin kurallarıyla değiştir veya yönet.</p></div><div><Clock3 size={22} /><strong>Zamanın sana kalsın</strong><p>Aramak, beklemek ve tekrar tekrar saat sormak yok. Dilediğin an planla.</p></div></section>

      <section className="customer-faq-section"><div><span>MERAK ETTİKLERİN</span><h2>Randevu almadan önce.</h2><p>SeninRandevun müşteriler için kolay, hızlı ve ücretsiz bir keşif deneyimidir.</p></div><div>{CUSTOMER_FAQ.map(([question,answer]) => <details key={question}><summary>{question}<span>+</span></summary><p>{answer}</p></details>)}</div></section>
    </main>
    <MarketingFooter />
  </div>;
}
