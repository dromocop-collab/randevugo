"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type CSSProperties, type ReactNode } from "react";
import { MarketingFooter, MarketingHeader } from "@/components/marketing/marketing-shell";
import { SearchBar } from "@/components/discovery/search-bar";
import { BusinessCard } from "@/components/discovery/business-card";
import { listDynamicCategories, type DynamicCategory } from "@/features/categories/category-request-repository";
import { getBusinessCities, getPopularBusinesses, searchBusinesses } from "@/features/discovery/search-repository";
import type { Business } from "@/types/business";

const DEFAULT_CATEGORIES = [
  { slug: "kuafor", label: "Kuaför", emoji: "✦" }, { slug: "berber", label: "Berber", emoji: "✂" },
  { slug: "guzellik", label: "Güzellik", emoji: "◇" }, { slug: "spa", label: "Spa", emoji: "◌" },
  { slug: "nail", label: "Nail Studio", emoji: "◆" }, { slug: "spor", label: "Spor", emoji: "↗" },
  { slug: "saglik", label: "Sağlık", emoji: "+" }, { slug: "danismanlik", label: "Danışmanlık", emoji: "◎" },
  { slug: "veteriner", label: "Veteriner", emoji: "♥" },
];

const OWNER_FEATURES = [
  { number: "01", title: "Akıllı randevu motoru", text: "Çalışan, hizmet süresi, mola ve izinleri aynı anda hesaplar. Çakışmaya izin vermez." },
  { number: "02", title: "Müşteri hafızası", text: "Ziyaret geçmişi, notlar, tercihler ve harcama özetiyle her müşteriyi tanırsınız." },
  { number: "03", title: "Canlı iş zekâsı", text: "Doluluk, gelir, iptal ve ekip performansını tek bakışta görürsünüz." },
  { number: "04", title: "Kendi dijital mağazanız", text: "Markanıza özel profil, hizmet vitrini, yorumlar ve 7/24 randevu sayfası." },
];

const FAQ = [
  ["14 günlük denemede hangi özellikler açık?", "Tamamı. Kredi kartı istemeden mağazanızı, hizmetlerinizi, çalışanlarınızı ve çalışma saatlerinizi ekleyebilir; online randevu almaya başlayabilirsiniz."],
  ["Müşteriler uygulama indirmek zorunda mı?", "Hayır. Size özel bağlantıdan mobil veya masaüstü tarayıcıyla saniyeler içinde randevu alabilirler."],
  ["Her çalışan için ayrı müsaitlik tanımlanabilir mi?", "Evet. Her çalışan için hizmet, vardiya, mola ve izin tanımlayabilir; uygun saatleri otomatik oluşturabilirsiniz."],
  ["Verilerim ve müşteri bilgilerim güvende mi?", "Rol bazlı erişim, güvenli bulut altyapısı ve KVKK odaklı veri süreçleriyle korunur."],
];

export default function HomePage() {
  const [mode, setMode] = useState<"owner" | "customer">("owner");
  const [popular, setPopular] = useState<Business[]>([]);
  const [results, setResults] = useState<Business[]>([]);
  const [cities, setCities] = useState<string[]>([]);
  const [categories, setCategories] = useState(DEFAULT_CATEGORIES);
  const [searched, setSearched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeCategory, setActiveCategory] = useState("");

  useEffect(() => {
    Promise.all([getPopularBusinesses(8), getBusinessCities(), listDynamicCategories()])
      .then(([businesses, cityList, dynamic]) => {
        setPopular(businesses); setCities(cityList);
        const known = new Set(DEFAULT_CATEGORIES.map((item) => item.slug));
        const additions = dynamic.filter((item: DynamicCategory) => !known.has(item.slug)).map((item: DynamicCategory) => ({ slug: item.slug, label: item.label, emoji: item.emoji || "•" }));
        setCategories([...DEFAULT_CATEGORIES, ...additions]);
      }).catch(() => undefined);
  }, []);

  async function runSearch(params: { searchText: string; category: string; city: string }) {
    setLoading(true); setSearched(true);
    try { setResults(await searchBusinesses({ searchText: params.searchText, category: params.category || undefined, city: params.city || undefined })); }
    catch { setResults([]); } finally { setLoading(false); }
  }

  async function selectCategory(category: string) {
    const next = activeCategory === category ? "" : category;
    setActiveCategory(next);
    if (!next) { setSearched(false); setResults([]); return; }
    setLoading(true); setSearched(true);
    try { setResults(await searchBusinesses({ category: next })); } catch { setResults([]); } finally { setLoading(false); }
  }

  const visibleBusinesses = useMemo(() => searched ? results : popular, [searched, results, popular]);

  return (
    <div className="marketing-page home-v2">
      <MarketingHeader />
      <main>
        <section className="home-hero">
          <div className="hero-noise" /><div className="hero-orb hero-orb-one" /><div className="hero-orb hero-orb-two" />
          <div className="hero-layout">
            <div className="hero-copy">
              <div className="eyebrow"><span /> 14 gün ücretsiz · Kart bilgisi gerekmez</div>
              <h1>İşletmenizin<br /><em>zamanını büyütün.</em></h1>
              <p>Randevular, müşteriler, ekip ve mağazanız tek bir akıllı sistemde. Siz işinize odaklanın, kalanını SeninRandevun yönetsin.</p>
              <div className="hero-actions"><Link href="/kayit" className="hero-primary">Ücretsiz mağazanı aç <span>↗</span></Link><a href="#canli-demo" className="hero-secondary"><i>▶</i> Sistemi keşfet</a></div>
              <div className="hero-proof"><div className="proof-avatars"><b>A</b><b>E</b><b>M</b><b>+</b></div><p><strong>1.000+ işletme</strong><br />zamanını bizimle yönetiyor</p></div>
            </div>
            <DashboardPreview />
          </div>
          <div className="trust-strip"><span>AKILLI TAKVİM</span><i /><span>MÜŞTERİ CRM</span><i /><span>7/24 RANDEVU</span><i /><span>GELİR ANALİZİ</span><i /><span>EKİP YÖNETİMİ</span></div>
        </section>

        <section className="audience-switch-section" id="canli-demo">
          <div className="section-kicker">İKİ TARAF, TEK KUSURSUZ DENEYİM</div>
          <div className="audience-toggle" role="tablist"><button className={mode === "owner" ? "active" : ""} onClick={() => setMode("owner")}>İşletmem için</button><button className={mode === "customer" ? "active" : ""} onClick={() => setMode("customer")}>Randevu almak için</button></div>
          {mode === "owner" ? <div className="owner-experience"><SectionHeading title={<>Bir panel değil,<br /><em>büyüme sistemi.</em></>} text="Günün karmaşasını sadeleştiren, müşterinizi tanıyan ve size neyin işe yaradığını söyleyen dijital çalışma arkadaşınız." /><div className="feature-ledger">{OWNER_FEATURES.map((feature) => <article key={feature.number}><span>{feature.number}</span><div><h3>{feature.title}</h3><p>{feature.text}</p></div><b>↗</b></article>)}</div></div> : <div className="customer-experience"><SectionHeading title={<>Aradığın hizmete,<br /><em>tam zamanında.</em></>} text="Telefon trafiği yok, beklemek yok. Yakınındaki işletmelerin gerçek müsaitliğini gör ve saniyeler içinde yerini ayır." /><div className="customer-steps">{[["01","İşletmeni bul","Konum, kategori veya hizmetle keşfet."],["02","Canlı saatleri gör","Gerçek müsaitlikten sana uygun olanı seç."],["03","Randevunu yönet","Onayını al, gerektiğinde değiştir."]].map(([no,title,text]) => <article key={no}><span>{no}</span><h3>{title}</h3><p>{text}</p></article>)}</div></div>}
        </section>

        <section className="discovery-section">
          <div className="discovery-head"><div><div className="section-kicker">HEMEN RANDEVU AL</div><h2>Şehrindeki iyi işleri keşfet.</h2></div><Link href="/kesfet">Tüm işletmeler <span>→</span></Link></div>
          <SearchBar onSearch={runSearch} cities={cities} dynamicCategories={categories.slice(DEFAULT_CATEGORIES.length).map(item => ({ value: item.slug, label: item.label }))} className="home-search" />
          <div className="category-rail">{categories.map(category => <button key={category.slug} className={activeCategory === category.slug ? "active" : ""} onClick={() => selectCategory(category.slug)}><span>{category.emoji}</span>{category.label}</button>)}</div>
          {loading ? <div className="business-skeletons">{[1,2,3,4].map(item => <div key={item} />)}</div> : visibleBusinesses.length > 0 ? <div className="business-grid">{visibleBusinesses.slice(0,8).map(business => <BusinessCard key={business.id} business={business} />)}</div> : searched ? <div className="empty-results"><span>⌕</span><h3>Henüz eşleşme bulamadık.</h3><p>Farklı bir kategori, şehir veya hizmet deneyin.</p><button onClick={() => { setSearched(false); setActiveCategory(""); }}>Aramayı temizle</button></div> : <div className="discovery-placeholder"><div><strong>81</strong><span>şehirde keşfet</span></div><p>Yeni işletmeler eklendikçe burada sana en yakın ve en çok sevilen yerler görünecek.</p><Link href="/kesfet">Keşfetmeye başla →</Link></div>}
        </section>

        <section className="metrics-section"><div><strong>50K+</strong><span>Yönetilen randevu</span></div><div><strong>%37</strong><span>Daha az telefon trafiği</span></div><div><strong>4.9/5</strong><span>İşletme memnuniyeti</span></div><div><strong>7/24</strong><span>Online rezervasyon</span></div></section>
        <section className="trial-section"><div className="trial-orbit orbit-one" /><div className="trial-orbit orbit-two" /><div className="trial-content"><div className="section-kicker light">BUGÜN BAŞLA</div><h2>14 gün sonra işlerin<br />neden daha <em>hafif</em>?</h2><p>Mağazanı dakikalar içinde kur. Tüm özellikleri ücretsiz dene. Kredi kartı yok, sürpriz ücret yok.</p><div><Link href="/kayit">Ücretsiz denemeyi başlat <span>↗</span></Link><small>Kurulum desteği dahil · İstediğin zaman ayrıl</small></div></div><div className="trial-checklist">{["Mağazanı ve hizmetlerini yayınla","Çalışan ve müsaitliklerini tanımla","Müşterilerine özel linkini paylaş","İlk online randevunu al"].map((item,index) => <div key={item}><span>0{index+1}</span><p>{item}</p><b>✓</b></div>)}</div></section>
        <section className="faq-section"><div><div className="section-kicker">AKLINA TAKILANLAR</div><h2>Başlamadan önce.</h2><p>Başka sorun varsa ekibimiz gerçek bir insanla yardımcı olur.</p><Link href="/iletisim">Bize ulaş →</Link></div><div className="faq-list">{FAQ.map(([q,a]) => <details key={q}><summary>{q}<span>+</span></summary><p>{a}</p></details>)}</div></section>
      </main>
      <MarketingFooter />
    </div>
  );
}

function SectionHeading({ title, text }: { title: ReactNode; text: string }) { return <div className="section-heading"><h2>{title}</h2><p>{text}</p></div>; }

function DashboardPreview() {
  const appointments = [["09:30","Selin A.","Saç kesimi","EA"],["11:00","Merve K.","Manikür","MK"],["13:30","Deniz T.","Cilt bakımı","DT"],["15:00","Aylin S.","Fön & şekil","AS"]];
  return <div className="product-stage" aria-label="SeninRandevun panel önizlemesi"><div className="stage-glow" /><div className="product-window"><div className="window-bar"><div><i /><i /><i /></div><span>seninrandevun.com/dashboard</span><b>•••</b></div><div className="demo-body"><aside className="demo-sidebar"><div className="demo-logo">S</div>{["⌂","▦","◫","♧","◎"].map((icon,index) => <span key={icon} className={index === 0 ? "active" : ""}>{icon}</span>)}</aside><div className="demo-main"><div className="demo-head"><div><small>19 Ağustos, Çarşamba</small><h2>Günaydın, Elif 👋</h2></div><button>+ Yeni randevu</button></div><div className="demo-stats"><article><small>Bugünkü randevu</small><strong>12</strong><i>+18%</i></article><article><small>Doluluk oranı</small><strong>%84</strong><i>+9%</i></article><article><small>Bugünkü gelir</small><strong>₺8.450</strong><i>+24%</i></article></div><div className="demo-grid"><article className="agenda-card"><div className="card-title"><b>Bugünün akışı</b><span>Tümünü gör</span></div>{appointments.map((row,i) => <div className="agenda-row" key={row[0]}><time>{row[0]}</time><b style={{"--row": i} as CSSProperties}>{row[3]}</b><p><strong>{row[1]}</strong><small>{row[2]}</small></p><span>{i === 2 ? "Bekliyor" : "Onaylı"}</span></div>)}</article><article className="chart-card"><div className="card-title"><b>Haftalık doluluk</b><span>Bu hafta</span></div><div className="chart-bars">{[42,67,54,82,91,76,48].map((height,i) => <div key={i}><i style={{height: `${height}%`}} /><small>{["Pzt","Sal","Çar","Per","Cum","Cmt","Paz"][i]}</small></div>)}</div></article></div></div></div></div><div className="floating-note note-one"><span>✓</span><p><b>Yeni randevu</b><small>Merve · 11:00</small></p></div><div className="floating-note note-two"><span>↗</span><p><b>%24 büyüme</b><small>Bu ay</small></p></div></div>;
}
