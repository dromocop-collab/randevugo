import Link from "next/link";
import { Apple, ArrowRight, ArrowUpRight, BadgeCheck, BellRing, Building2, CalendarCheck2, Check, Clock3, Compass, Heart, MapPin, MessageCircleMore, Navigation, Scissors, ShieldCheck, Sparkles, Star, Stethoscope, TimerReset, WandSparkles } from "lucide-react";
import { MarketingFooter, MarketingHeader } from "@/components/marketing/marketing-shell";
import { AppStoreButton } from "@/components/marketing/app-store-button";
import { IosAppVisual } from "@/components/marketing/ios-app-visual";
import { APP_STORE_URL } from "@/lib/app-store";
import { HomeInteractive } from "./home-client";

const CUSTOMER_FAQ = [
  ["Randevu almak ücretli mi?", "Hayır. İşletme keşfetmek ve online randevu oluşturmak müşteriler için tamamen ücretsizdir."],
  ["Üye olmadan randevu alabilir miyim?", "İşletmenin sunduğu akışa göre temel iletişim bilgilerinle hızlıca randevu oluşturabilirsin."],
  ["Randevumu değiştirebilir miyim?", "İşletmenin iptal ve değişiklik kuralları doğrultusunda randevunu kolayca yönetebilirsin."],
  ["Yakınımdaki işletmeleri nasıl bulurum?", "Keşfet ekranında şehir, kategori, işletme veya hizmet adıyla arama yapabilir; yayınlanmış işletmelerin profillerini karşılaştırabilirsin."],
  ["Hangi hizmetler için randevu alabilirim?", "Kuaför, berber, güzellik merkezi, spa, nail studio, sağlık, spor, veteriner ve danışmanlık dahil birçok alanda randevu alabilirsin."],
];

const SEO_JOURNEYS = [
  { href: "/kuafor-randevu", title: "Kuaför randevusu", text: "Saç kesimi, boya, röfle ve bakım hizmetlerini keşfet.", icon: Scissors },
  { href: "/guzellik-merkezi-randevu", title: "Güzellik merkezi", text: "Cilt bakımı ve güzellik uygulamaları için uygun saati bul.", icon: Sparkles },
  { href: "/saglik-randevu", title: "Sağlık randevusu", text: "Yayınlanmış sağlık işletmelerini ve müsaitliklerini incele.", icon: Stethoscope },
  { href: "/isletmeler", title: "İşletmeler için", text: "Takvimini, ekibini ve müşterilerini tek merkezden yönet.", icon: Building2 },
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
            <a className="home-ios-quick-link" href={APP_STORE_URL} target="_blank" rel="noopener noreferrer"><Apple size={18} fill="currentColor"/><span><small>YENİ · APP STORE&apos;DA</small><b>iOS uygulamasını ücretsiz indir</b></span><ArrowRight size={15}/></a>
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

      <section className="home-seo-hub">
        <div className="home-seo-intro"><span><Compass size={14}/> TÜRKİYE&apos;NİN RANDEVU REHBERİ</span><h2>İhtiyacın olan uzman,<br/><em>birkaç dokunuş uzağında.</em></h2><p>SeninRandevun; yerel işletmeleri, sundukları hizmetleri ve gerçek müsaitliklerini tek bir deneyimde buluşturur. Telefon trafiği olmadan araştır, karşılaştır ve online randevunu oluştur.</p><Link href="/online-randevu">Online randevu nasıl çalışır? <ArrowRight size={15}/></Link></div>
        <div className="home-seo-links">{SEO_JOURNEYS.map(({href,title,text,icon:Icon},index)=><Link href={href} key={href}><span><Icon size={20}/></span><div><small>0{index+1} · HIZLI KEŞİF</small><h3>{title}</h3><p>{text}</p></div><ArrowUpRight size={18}/></Link>)}</div>
      </section>

      <section className="home-business-cta"><div><span><Building2 size={15}/> İŞLETMELER İÇİN SENİNRANDEVUN</span><h2>Takvimin dolsun.<br/>Günün sadeleşsin.</h2><p>Online randevu sayfanı oluştur; hizmetlerini, çalışanlarını, çalışma saatlerini ve müşteri ilişkilerini tek panelden yönet.</p></div><div><Link href="/isletmeler/kayit">İlk 3 ay ücretsiz başla <ArrowRight size={16}/></Link><Link href="/isletmeler">İşletme özelliklerini gör</Link><small><BadgeCheck size={13}/> Kurulum birkaç dakika · Kredi kartı gerekmez</small></div></section>

      <section className="home-ios-promo">
        <div className="home-ios-copy"><span><Apple size={15} fill="currentColor"/> APP STORE&apos;DA YAYINDA <i/></span><h2>SeninRandevun<br/><em>artık cebinde.</em></h2><p>İşletmeleri keşfet, uygun saati seç ve bütün randevularını iPhone veya iPad&apos;inden yönet.</p><div><AppStoreButton compact/><Link href="/mobil-uygulama">Uygulamayı keşfet <ArrowRight size={15}/></Link></div><small><BadgeCheck size={13}/> Apple tarafından onaylandı · Müşteriler için ücretsiz</small></div>
        <IosAppVisual compact/>
      </section>

      <section className="customer-faq-section"><div><span>MERAK ETTİKLERİN</span><h2>Randevu almadan önce.</h2><p>SeninRandevun müşteriler için kolay, hızlı ve ücretsiz bir keşif deneyimidir.</p></div><div>{CUSTOMER_FAQ.map(([question,answer]) => <details key={question}><summary>{question}<span>+</span></summary><p>{answer}</p></details>)}</div></section>
    </main>
    <MarketingFooter />
  </div>;
}
