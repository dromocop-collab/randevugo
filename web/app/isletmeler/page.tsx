import Link from "next/link";
import { ArrowRight, BarChart3, CalendarCheck2, Check, Clock3, Gauge, LineChart, MessageSquareText, ShieldCheck, Sparkles, Store, UsersRound, WandSparkles } from "lucide-react";
import { BusinessPage } from "@/components/marketing/business-shell";

const capabilities = [
  { icon: CalendarCheck2, title: "Akıllı randevu motoru", text: "Çalışan, hizmet, mola ve izinleri aynı anda hesaplayan kusursuz müsaitlik." },
  { icon: UsersRound, title: "Müşteri hafızası", text: "Ziyaret geçmişi, tercihler, notlar ve harcama özeti tek müşteri profilinde." },
  { icon: LineChart, title: "Canlı büyüme analitiği", text: "Gelir, doluluk, iptal ve ekip performansını aksiyona dönüştüren raporlar." },
  { icon: Store, title: "Dijital mağazanız", text: "Hizmetlerinizi, ekibinizi, yorumlarınızı ve müsaitliğinizi 7/24 sergileyin." },
  { icon: MessageSquareText, title: "Otomatik iletişim", text: "Teyit ve hatırlatma akışlarıyla telefon trafiğini ve no-show oranını azaltın." },
  { icon: ShieldCheck, title: "Güvenli operasyon", text: "Rol bazlı erişim, işletme izolasyonu ve KVKK odaklı veri süreçleri." },
];

export const metadata = { title: "İşletmeler İçin Online Randevu Sistemi", description: "Takvim, müşteri CRM, ekip, dijital mağaza ve büyüme analitiğini tek platformdan yönetin." };

export default function BusinessesPage() {
  return <BusinessPage className="business-landing"><main>
    <section className="business-hero"><div className="business-hero-art" /><div className="business-hero-overlay" /><div className="business-hero-content"><div className="business-eyebrow"><Sparkles size={14} /> Türkiye&apos;nin yeni nesil işletme çalışma alanı</div><h1>Takviminizi değil,<br /><em>işletmenizi büyütün.</em></h1><p>Randevu, ekip, müşteri ve gelir operasyonunuzu tek akıllı sistemde birleştirin. Siz hizmetinize odaklanın; SeninRandevun geri kalanını akıcı hâle getirsin.</p><div className="business-hero-actions"><Link href="/isletmeler/kayit">14 gün ücretsiz başla <ArrowRight size={16} /></Link><Link href="/ozellikler">Ürünü keşfet</Link></div><div className="business-hero-proof"><span><Check size={13} /> Kredi kartı gerekmez</span><span><Check size={13} /> Kurulum desteği dahil</span><span><Check size={13} /> İstediğin zaman ayrıl</span></div></div><div className="business-floating-stat stat-one"><Gauge size={18} /><div><b>%84</b><small>doluluk oranı</small></div></div><div className="business-floating-stat stat-two"><BarChart3 size={18} /><div><b>+%27</b><small>aylık büyüme</small></div></div></section>

    <section className="business-proof-strip"><div><strong>50K+</strong><span>yönetilen randevu</span></div><div><strong>7/24</strong><span>online rezervasyon</span></div><div><strong>%37</strong><span>daha az telefon trafiği</span></div><div><strong>4.9/5</strong><span>işletme memnuniyeti</span></div></section>

    <section className="business-capabilities"><div className="business-section-head"><div><span>TEK PLATFORM · TAM KONTROL</span><h2>Günün karmaşasını<br />sade bir akışa dönüştürün.</h2></div><p>İşletmenizin ön yüzünden arka ofisine kadar tüm deneyimi birbirine bağlı, hızlı ve ölçülebilir hâle getiriyoruz.</p></div><div className="business-capability-grid">{capabilities.map(({icon:Icon,title,text},index)=><article key={title} style={{"--i":index} as React.CSSProperties}><div><Icon size={21}/></div><span>0{index+1}</span><h3>{title}</h3><p>{text}</p><Link href="/ozellikler">Detayları gör <ArrowRight size={13}/></Link></article>)}</div></section>

    <section className="business-product-scene"><div className="business-product-copy"><span>HER EKRANDA HAZIR</span><h2>İşletmeniz sizinle hareket eder.</h2><p>Masada, resepsiyonda veya hareket hâlindeyken aynı güncel operasyon görünümüne ulaşın.</p><ul><li><Clock3 size={16}/> Canlı günlük akış</li><li><UsersRound size={16}/> Ekip ve müşteri görünümü</li><li><WandSparkles size={16}/> Akıllı iş önerileri</li></ul><Link href="/isletmeler/kayit">Çalışma alanını aç <ArrowRight size={15}/></Link></div><div className="business-product-ui"><div className="product-ui-bar"><i/><i/><i/><span>seninrandevun.com/dashboard</span></div><div className="product-ui-body"><aside><b>S</b>{[1,2,3,4,5].map(i=><i key={i}/>)}</aside><div className="product-ui-main"><div className="product-ui-head"><div><small>Bugünün akışı</small><strong>Günaydın, Elif</strong></div><button>+ Randevu</button></div><div className="product-ui-stats"><span><small>Randevu</small><b>12</b></span><span><small>Doluluk</small><b>%84</b></span><span><small>Gelir</small><b>₺8.450</b></span></div><div className="product-ui-grid"><div>{["09:30  Selin · Saç kesimi","11:00  Merve · Manikür","13:30  Deniz · Cilt bakımı","15:00  Aylin · Fön"].map(x=><p key={x}>{x}<i/></p>)}</div><div className="product-ui-chart">{[40,68,53,84,92,76,55].map((h,i)=><i key={i} style={{height:`${h}%`}}/>)}</div></div></div></div></div></section>

    <section className="business-final-cta"><span>14 GÜN BOYUNCA TÜM ÖZELLİKLER AÇIK</span><h2>Yarının işleyişini<br />bugün kurun.</h2><p>Kredi kartı yok. Kurulum ücreti yok. Sadece daha akıcı bir işletme deneyimi.</p><Link href="/isletmeler/kayit">Ücretsiz denemeyi başlat <ArrowRight size={17}/></Link></section>
  </main></BusinessPage>;
}
