import Link from "next/link";
import { ArrowRight, BadgeCheck, CalendarCheck2, Check, Clock3, Heart, MapPin, ShieldCheck, Sparkles, Star } from "lucide-react";
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

      <section className="customer-how-section"><div className="customer-how-copy"><span>3 KOLAY ADIM</span><h2>Planın hazırsa,<br />randevun da hazır.</h2><p>Telefon trafiği ve bekleme olmadan gerçek müsaitlik üzerinden randevunu oluştur.</p><Link href="/kesfet">Şimdi keşfet <ArrowRight size={15} /></Link></div><div className="customer-how-steps">{[["01","Ara ve keşfet","Hizmet, kategori veya konumla sana uygun işletmeyi bul."],["02","Saatini seç","Canlı müsaitlik arasından programına uyan saati seç."],["03","Randevunu al","Bilgilerini onayla; randevun anında oluşsun."]].map(([no,title,text]) => <article key={no}><span>{no}</span><div><h3>{title}</h3><p>{text}</p></div><CalendarCheck2 size={20} /></article>)}</div></section>

      <section className="customer-confidence"><div><Heart size={22} /><strong>İyi hissettiren seçimler</strong><p>Gerçek yorumlar ve detaylı işletme profilleriyle kararını güvenle ver.</p></div><div><ShieldCheck size={22} /><strong>Kontrol sende</strong><p>Randevu bilgilerine kolayca ulaş, işletmenin kurallarıyla değiştir veya yönet.</p></div><div><Clock3 size={22} /><strong>Zamanın sana kalsın</strong><p>Aramak, beklemek ve tekrar tekrar saat sormak yok. Dilediğin an planla.</p></div></section>

      <section className="customer-faq-section"><div><span>MERAK ETTİKLERİN</span><h2>Randevu almadan önce.</h2><p>SeninRandevun müşteriler için kolay, hızlı ve ücretsiz bir keşif deneyimidir.</p></div><div>{CUSTOMER_FAQ.map(([question,answer]) => <details key={question}><summary>{question}<span>+</span></summary><p>{answer}</p></details>)}</div></section>
    </main>
    <MarketingFooter />
  </div>;
}
