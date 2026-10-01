import Link from "next/link";
import { ArrowRight, BarChart3, BellRing, CalendarCheck2, Check, Clock3, Gauge, LineChart, MessageSquareText, PackageCheck, PlayCircle, ShieldCheck, Sparkles, Store, UserCheck, UsersRound, WalletCards, WandSparkles } from "lucide-react";
import { BusinessPage } from "@/components/marketing/business-shell";
import { createPublicMetadata, safeJsonLd, SEO_SITE_URL } from "@/lib/seo/metadata";

const capabilities = [
  { icon: CalendarCheck2, title: "Akıllı randevu motoru", text: "Çalışan, hizmet, mola ve izinleri aynı anda hesaplayan kusursuz müsaitlik." },
  { icon: UsersRound, title: "Müşteri hafızası", text: "Ziyaret geçmişi, tercihler, notlar ve harcama özeti tek müşteri profilinde." },
  { icon: LineChart, title: "Canlı işletme analitiği", text: "Gelir, doluluk, iptal ve ekip performansını anlaşılır raporlarla izleyin." },
  { icon: Store, title: "Dijital mağazanız", text: "Hizmetlerinizi, ekibinizi, yorumlarınızı ve müsaitliğinizi 7/24 sergileyin." },
  { icon: MessageSquareText, title: "Otomatik iletişim", text: "Teyit, değişiklik ve hatırlatma akışlarını tek yerden yönetin." },
  { icon: ShieldCheck, title: "Güvenli operasyon", text: "Rol bazlı erişim, işletme izolasyonu ve KVKK odaklı veri süreçleri." },
];

const operationFlow = [
  { icon: CalendarCheck2, step: "01", title: "Randevu oluşur", text: "Müşteri uygun hizmeti, çalışanı ve saati seçer; kayıt takvime düşer." },
  { icon: UserCheck, step: "02", title: "Ekip anında görür", text: "İlgili çalışan bilgilendirilir, günlük akış herkes için güncel kalır." },
  { icon: WalletCards, step: "03", title: "Ödeme kaydedilir", text: "Tahsilat, paket veya seans bilgisi aynı müşteri hesabına işlenir." },
  { icon: WandSparkles, step: "04", title: "Rovi takip eder", text: "Bekleyen işleri ve dikkat edilmesi gereken noktaları anlaşılır biçimde gösterir." },
];

export const metadata = createPublicMetadata({
  title: "İşletme ve Randevu Yönetim Programı",
  description: "Randevu, çalışan, müşteri, paket, kasa ve şube süreçlerinizi tek panelden yönetin. SeninRandevun lansmana özel ilk 3 ay ücretsiz.",
  pathname: "/isletmeler",
  keywords: ["randevu programı", "işletme yönetim programı", "online randevu sistemi", "müşteri takip programı", "kuaför randevu programı", "salon yönetim sistemi"],
  imageAlt: "SeninRandevun işletme ve online randevu yönetim programı",
});

const businessJsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    { "@type": "WebPage", "@id": `${SEO_SITE_URL}/isletmeler#webpage`, url: `${SEO_SITE_URL}/isletmeler`, name: "Randevu ve İşletme Yönetim Programı", description: "Randevu, çalışan, müşteri, paket, kasa ve şube süreçlerini tek panelden yöneten işletme yazılımı.", inLanguage: "tr-TR", isPartOf: { "@id": `${SEO_SITE_URL}/#website` } },
    { "@type": "SoftwareApplication", "@id": `${SEO_SITE_URL}/isletmeler#software`, name: "SeninRandevun İşletme Yönetim Sistemi", applicationCategory: "BusinessApplication", applicationSubCategory: "Appointment Scheduling Software", operatingSystem: "Web, iOS", url: `${SEO_SITE_URL}/isletmeler`, description: "Hizmet işletmeleri için randevu, ekip, müşteri, paket, kasa ve şube yönetimi.", offers: { "@type": "Offer", price: "0", priceCurrency: "TRY", description: "Lansmana özel ilk 3 ay ücretsiz" }, featureList: ["Online randevu", "Takvim yönetimi", "Müşteri takibi", "Çalışan yönetimi", "Paket ve seans takibi", "Kasa ve gelir-gider takibi", "Şube yönetimi"], publisher: { "@id": `${SEO_SITE_URL}/#organization` } },
    { "@type": "BreadcrumbList", "@id": `${SEO_SITE_URL}/isletmeler#breadcrumb`, itemListElement: [{ "@type": "ListItem", position: 1, name: "Ana Sayfa", item: SEO_SITE_URL }, { "@type": "ListItem", position: 2, name: "İşletmeler İçin", item: `${SEO_SITE_URL}/isletmeler` }] },
  ],
};

export default function BusinessesPage() {
  return <BusinessPage className="business-landing"><main>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(businessJsonLd) }}/>
      <section className="business-hero"><div className="business-hero-art" /><div className="business-hero-overlay" /><div className="business-hero-content"><div className="business-eyebrow"><Sparkles size={14} /> Türkiye&apos;nin yeni nesil işletme çalışma alanı</div><h1>Takviminizi değil,<br /><em>işletmenizi yönetin.</em></h1><p>Randevu, ekip, müşteri, kasa ve gelir operasyonunuzu tek akıllı sistemde birleştirin. Siz hizmetinize odaklanın; SeninRandevun günlük işleyişinizi düzenlesin.</p><div className="business-hero-actions"><Link href="/isletmeler/kayit">İlk 3 ay ücretsiz başla <ArrowRight size={16} /></Link><Link href="#isletme-akisi"><PlayCircle size={16}/> Nasıl çalışır?</Link></div><div className="business-hero-proof"><span><Check size={13} /> Kredi kartı gerekmez</span><span><Check size={13} /> Kurulum desteği dahil</span><span><Check size={13} /> İstediğin zaman ayrıl</span></div></div><div className="business-floating-stat stat-one"><Gauge size={18} /><div><b>Canlı</b><small>takvim görünümü</small></div></div><div className="business-floating-stat stat-two"><BarChart3 size={18} /><div><b>Tek merkez</b><small>bağlı operasyon</small></div></div></section>

      <section className="business-proof-strip"><div><strong>Tek panel</strong><span>randevu, müşteri ve kasa</span></div><div><strong>7/24</strong><span>online randevu sayfası</span></div><div><strong>Rol bazlı</strong><span>ekip erişimi</span></div><div><strong>90 gün</strong><span>lansmana özel ücretsiz</span></div></section>

      <section id="isletme-akisi" className="business-workflow">
        <div className="business-workflow-copy"><span><Sparkles size={14}/> BİRBİRİNE BAĞLI OPERASYON</span><h2>Bir randevu geldiğinde<br/><em>her şey birlikte ilerler.</em></h2><p>Ayrı defterlere, mesajlara ve hesaplara bölünmeden; müşteri gelişinden tahsilata kadar bütün işleyiş tek akışta güncel kalır.</p><div className="business-workflow-list">{operationFlow.map(({icon:Icon,step,title,text})=><article key={title}><i><Icon size={20}/></i><div><small>{step} · ADIM</small><b>{title}</b><p>{text}</p></div></article>)}</div><div className="business-workflow-actions"><Link href="/isletmeler/kayit">Çalışma alanını ücretsiz aç <ArrowRight size={16}/></Link><Link href="/ozellikler">Tüm özellikleri incele</Link></div></div>
        <div className="business-workflow-visual" aria-label="SeninRandevun işletme akışı örneği"><header><span><i/> İŞLETME AKIŞI</span><b>Bugün · Canlı</b></header><div className="business-flow-summary"><div><small>BUGÜNÜN PLANI</small><strong>Günün kontrol altında.</strong></div><span><BellRing size={18}/><i/></span></div><div className="business-flow-events"><article style={{"--flow-delay":"0s"} as React.CSSProperties}><time>10:30</time><i><CalendarCheck2/></i><div><b>Yeni randevu</b><span>Saç bakımı · Elif</span></div><em>Onaylandı</em></article><article style={{"--flow-delay":"1.3s"} as React.CSSProperties}><time>12:00</time><i><PackageCheck/></i><div><b>Paket seansı</b><span>Müşteri hesabına işlendi</span></div><em>4/5 kaldı</em></article><article style={{"--flow-delay":"2.6s"} as React.CSSProperties}><time>14:15</time><i><WalletCards/></i><div><b>Ödeme alındı</b><span>Kasa otomatik güncellendi</span></div><em>₺1.250</em></article></div><div className="business-flow-rovi"><span><WandSparkles size={19}/></span><div><small>ROVİ’DEN KISA NOT</small><b>Yarın 14:00 için uygun bir boşluk var.</b><p>Takvim ve ekip müsaitliği birlikte kontrol edildi.</p></div><ArrowRight size={18}/></div><div className="business-flow-orbit orbit-one"><UsersRound size={17}/><span><b>128</b><small>müşteri</small></span></div><div className="business-flow-orbit orbit-two"><BarChart3 size={17}/><span><b>%82</b><small>doluluk</small></span></div></div>
      </section>

    <section className="business-capabilities"><div className="business-section-head"><div><span>TEK PLATFORM · TAM KONTROL</span><h2>Günün karmaşasını<br />sade bir akışa dönüştürün.</h2></div><p>İşletmenizin ön yüzünden arka ofisine kadar tüm deneyimi birbirine bağlı, hızlı ve ölçülebilir hâle getiriyoruz.</p></div><div className="business-capability-grid">{capabilities.map(({icon:Icon,title,text},index)=><article key={title} style={{"--i":index} as React.CSSProperties}><div><Icon size={21}/></div><span>0{index+1}</span><h3>{title}</h3><p>{text}</p><Link href="/ozellikler">Detayları gör <ArrowRight size={13}/></Link></article>)}</div></section>

    <section className="business-product-scene"><div className="business-product-copy"><span>HER EKRANDA HAZIR</span><h2>İşletmeniz sizinle hareket eder.</h2><p>Masada, resepsiyonda veya hareket hâlindeyken aynı güncel operasyon görünümüne ulaşın.</p><ul><li><Clock3 size={16}/> Canlı günlük akış</li><li><UsersRound size={16}/> Ekip ve müşteri görünümü</li><li><WandSparkles size={16}/> Akıllı iş önerileri</li></ul><Link href="/isletmeler/kayit">Çalışma alanını aç <ArrowRight size={15}/></Link></div><div className="business-product-ui"><div className="product-ui-bar"><i/><i/><i/><span>seninrandevun.com/dashboard</span></div><div className="product-ui-body"><aside><b>S</b>{[1,2,3,4,5].map(i=><i key={i}/>)}</aside><div className="product-ui-main"><div className="product-ui-head"><div><small>Bugünün akışı</small><strong>Günaydın, Elif</strong></div><button>+ Randevu</button></div><div className="product-ui-stats"><span><small>Randevu</small><b>12</b></span><span><small>Doluluk</small><b>%84</b></span><span><small>Gelir</small><b>₺8.450</b></span></div><div className="product-ui-grid"><div>{["09:30  Selin · Saç kesimi","11:00  Merve · Manikür","13:30  Deniz · Cilt bakımı","15:00  Aylin · Fön"].map(x=><p key={x}>{x}<i/></p>)}</div><div className="product-ui-chart">{[40,68,53,84,92,76,55].map((h,i)=><i key={i} style={{height:`${h}%`}}/>)}</div></div></div></div></div></section>

    <section className="business-final-cta"><span>İLK 3 AY BOYUNCA TÜM ÖZELLİKLER AÇIK</span><h2>Yarının işleyişini<br />bugün kurun.</h2><p>Kredi kartı yok. Kurulum ücreti yok. Sadece daha akıcı bir işletme deneyimi.</p><Link href="/isletmeler/kayit">Ücretsiz hesabını aç <ArrowRight size={17}/></Link></section>
  </main></BusinessPage>;
}
