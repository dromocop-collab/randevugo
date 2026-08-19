"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { ArrowRight, ArrowUpRight, BadgeCheck, CalendarCheck2, Check, Clock3, Heart, MapPin, Search, ShieldCheck, Sparkles, Star, WandSparkles } from "lucide-react";
import { MarketingFooter, MarketingHeader } from "@/components/marketing/marketing-shell";
import { SearchBar } from "@/components/discovery/search-bar";
import { BusinessCard } from "@/components/discovery/business-card";
import { listDynamicCategories, type DynamicCategory } from "@/features/categories/category-request-repository";
import { getBusinessCities, getPopularBusinesses, searchBusinesses } from "@/features/discovery/search-repository";
import type { Business } from "@/types/business";

type HomeCategory = { slug: string; label: string; emoji: string; tone: string; image?: string; description?: string };

const DEFAULT_CATEGORIES: HomeCategory[] = [
  { slug: "kuafor", label: "Kuaför", emoji: "✦", tone: "mint", image: "/images/categories/kuafor.png", description: "Kesim, renklendirme ve bakım" },
  { slug: "berber", label: "Berber", emoji: "✂", tone: "blue", image: "/images/categories/berber.png", description: "Saç, sakal ve modern bakım" },
  { slug: "guzellik", label: "Güzellik", emoji: "◇", tone: "rose", image: "/images/categories/guzellik.png", description: "Cilt bakımı ve güzellik ritüelleri" },
  { slug: "spa", label: "Spa & Masaj", emoji: "◌", tone: "sand", image: "/images/categories/spa.png", description: "Rahatlama ve yenilenme" },
  { slug: "nail", label: "Nail Studio", emoji: "◆", tone: "violet", image: "/images/categories/nail.png", description: "Manikür, pedikür ve nail art" },
  { slug: "spor", label: "Spor & PT", emoji: "↗", tone: "lime", image: "/images/categories/spor.png", description: "Sana özel antrenman planları" },
  { slug: "saglik", label: "Sağlık", emoji: "+", tone: "cyan", image: "/images/categories/saglik.png", description: "Uzman sağlık hizmetleri" },
  { slug: "danismanlik", label: "Danışmanlık", emoji: "◎", tone: "amber", image: "/images/categories/danismanlik.png", description: "Doğru uzmanla yeni bir adım" },
  { slug: "veteriner", label: "Veteriner", emoji: "♥", tone: "coral", image: "/images/categories/veteriner.png", description: "Dostların için güvenilir bakım" },
];

const CUSTOMER_FAQ = [
  ["Randevu almak ücretli mi?", "Hayır. İşletme keşfetmek ve online randevu oluşturmak müşteriler için tamamen ücretsizdir."],
  ["Üye olmadan randevu alabilir miyim?", "İşletmenin sunduğu akışa göre temel iletişim bilgilerinle hızlıca randevu oluşturabilirsin."],
  ["Randevumu değiştirebilir miyim?", "İşletmenin iptal ve değişiklik kuralları doğrultusunda randevunu kolayca yönetebilirsin."],
];

export default function HomePage() {
  const [popular, setPopular] = useState<Business[]>([]);
  const [results, setResults] = useState<Business[]>([]);
  const [cities, setCities] = useState<string[]>([]);
  const [categories, setCategories] = useState<HomeCategory[]>(DEFAULT_CATEGORIES);
  const [searched, setSearched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeCategory, setActiveCategory] = useState("");

  useEffect(() => {
    Promise.all([getPopularBusinesses(8), getBusinessCities(), listDynamicCategories()])
      .then(([businesses, cityList, dynamic]) => {
        setPopular(businesses);
        setCities(cityList);
        const known = new Set(DEFAULT_CATEGORIES.map((item) => item.slug));
        const additions = dynamic.filter((item: DynamicCategory) => !known.has(item.slug)).map((item: DynamicCategory) => ({ slug: item.slug, label: item.label, emoji: item.emoji || "•", tone: "mint" }));
        setCategories([...DEFAULT_CATEGORIES, ...additions]);
      }).catch(() => undefined);
  }, []);

  async function runSearch(params: { searchText: string; category: string; city: string }) {
    setLoading(true); setSearched(true); setActiveCategory(params.category);
    try { setResults(await searchBusinesses({ searchText: params.searchText, category: params.category || undefined, city: params.city || undefined })); }
    catch { setResults([]); } finally { setLoading(false); }
    requestAnimationFrame(() => document.querySelector("#magazalar")?.scrollIntoView({ behavior: "smooth", block: "start" }));
  }

  async function selectCategory(category: string) {
    const next = activeCategory === category ? "" : category;
    setActiveCategory(next);
    if (!next) { setSearched(false); setResults([]); return; }
    setLoading(true); setSearched(true);
    try { setResults(await searchBusinesses({ category: next })); } catch { setResults([]); } finally { setLoading(false); }
    requestAnimationFrame(() => document.querySelector("#magazalar")?.scrollIntoView({ behavior: "smooth", block: "start" }));
  }

  const visibleBusinesses = useMemo(() => searched ? results : popular, [searched, results, popular]);

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
        <div className="customer-search-wrap">
          <div className="customer-search-title"><span><Search size={16} /></span><div><strong>Randevuna buradan başla</strong><small>Hizmet, işletme veya şehir ara</small></div></div>
          <SearchBar onSearch={runSearch} cities={cities} dynamicCategories={categories.slice(DEFAULT_CATEGORIES.length).map(item => ({ value: item.slug, label: item.label }))} className="customer-home-search" />
          <div className="customer-search-note"><span><WandSparkles size={13} /> Popüler aramalar:</span><button onClick={() => selectCategory("kuafor")}>Kuaför</button><button onClick={() => selectCategory("guzellik")}>Cilt bakımı</button><button onClick={() => selectCategory("nail")}>Nail studio</button></div>
        </div>
      </section>

      <section className="customer-category-section" id="kategoriler">
        <div className="customer-section-heading"><div><span>KATEGORİLER</span><h2>Bugün neye ihtiyacın var?</h2></div><Link href="/kesfet">Tümünü keşfet <ArrowRight size={15} /></Link></div>
        <div className="customer-category-grid">{categories.slice(0, 9).map((category, index) => <button key={category.slug} className={`customer-category-card tone-${category.tone} ${activeCategory === category.slug ? "active" : ""}`} onClick={() => selectCategory(category.slug)} style={{ "--delay": `${index * 65}ms` } as React.CSSProperties}>
          <span className="customer-category-media">{category.image ? <Image src={category.image} alt={`${category.label} hizmetleri`} fill sizes="(max-width: 760px) 100vw, (max-width: 1050px) 50vw, 33vw" /> : <b>{category.emoji}</b>}<i>{String(index + 1).padStart(2, "0")}</i></span>
          <span className="customer-category-body"><small><b>{category.emoji}</b> HEMEN KEŞFET</small><strong>{category.label}</strong><em>{category.description || "Yakınındaki uzmanları keşfet"}</em></span>
          <span className="customer-category-action" aria-hidden="true"><span>İncele</span><ArrowUpRight size={18} /></span>
        </button>)}</div>
      </section>

      <section className="customer-business-section" id="magazalar">
        <div className="customer-section-heading"><div><span>{searched ? "ARAMA SONUÇLARI" : "ÖNE ÇIKAN MAĞAZALAR"}</span><h2>{searched ? `${visibleBusinesses.length} eşleşme bulundu` : "Sevilen yerleri keşfet."}</h2></div>{searched ? <button className="clear-home-search" onClick={() => { setSearched(false); setResults([]); setActiveCategory(""); }}>Aramayı temizle</button> : <Link href="/kesfet">Tüm mağazalar <ArrowRight size={15} /></Link>}</div>
        {loading ? <div className="business-skeletons">{[1,2,3,4].map(item => <div key={item} />)}</div> : visibleBusinesses.length > 0 ? <div className="business-grid">{visibleBusinesses.slice(0,8).map(business => <BusinessCard key={business.id} business={business} />)}</div> : <div className="customer-empty"><Search size={28} /><h3>Şimdilik eşleşme bulamadık.</h3><p>Başka bir kategori, hizmet veya şehir deneyebilirsin.</p><button onClick={() => { setSearched(false); setActiveCategory(""); }}>Popüler mağazalara dön</button></div>}
      </section>

      <section className="customer-how-section"><div className="customer-how-copy"><span>3 KOLAY ADIM</span><h2>Planın hazırsa,<br />randevun da hazır.</h2><p>Telefon trafiği ve bekleme olmadan gerçek müsaitlik üzerinden randevunu oluştur.</p><Link href="/kesfet">Şimdi keşfet <ArrowRight size={15} /></Link></div><div className="customer-how-steps">{[["01","Ara ve keşfet","Hizmet, kategori veya konumla sana uygun işletmeyi bul."],["02","Saatini seç","Canlı müsaitlik arasından programına uyan saati seç."],["03","Randevunu al","Bilgilerini onayla; randevun anında oluşsun."]].map(([no,title,text]) => <article key={no}><span>{no}</span><div><h3>{title}</h3><p>{text}</p></div><CalendarCheck2 size={20} /></article>)}</div></section>

      <section className="customer-confidence"><div><Heart size={22} /><strong>İyi hissettiren seçimler</strong><p>Gerçek yorumlar ve detaylı işletme profilleriyle kararını güvenle ver.</p></div><div><ShieldCheck size={22} /><strong>Kontrol sende</strong><p>Randevu bilgilerine kolayca ulaş, işletmenin kurallarıyla değiştir veya yönet.</p></div><div><Clock3 size={22} /><strong>Zamanın sana kalsın</strong><p>Aramak, beklemek ve tekrar tekrar saat sormak yok. Dilediğin an planla.</p></div></section>

      <section className="customer-faq-section"><div><span>MERAK ETTİKLERİN</span><h2>Randevu almadan önce.</h2><p>SeninRandevun müşteriler için kolay, hızlı ve ücretsiz bir keşif deneyimidir.</p></div><div>{CUSTOMER_FAQ.map(([question,answer]) => <details key={question}><summary>{question}<span>+</span></summary><p>{answer}</p></details>)}</div></section>
    </main>
    <MarketingFooter />
  </div>;
}
