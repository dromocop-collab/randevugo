import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, Compass, MapPin, ShieldCheck } from "lucide-react";
import { MarketingPage } from "@/components/marketing/marketing-shell";
import { LocalBusinessGrid } from "@/components/seo/local-business-grid";
import { GEO_CATEGORIES, businessesInCategory, resolveCity } from "@/lib/seo/geo-seo";
import { SITE_URL, jsonLd } from "@/lib/seo/local-seo";

type Props = { params: Promise<{ city: string }> };
export const revalidate = 3600;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { city: slug } = await params;
  const resolved = await resolveCity(slug);
  if (!resolved) return { title: "Şehir bulunamadı", robots: { index: false, follow: true } };
  const title = `${resolved.city} Online Randevu ve Yakındaki İşletmeler`;
  const description = `${resolved.city}'daki kuaför, berber, güzellik, sağlık ve bakım işletmelerini keşfet; hizmetleri ve müsait saatleri karşılaştırarak online randevu al.`;
  const canonical = `/sehir/${slug}`;
  return { title, description, alternates: { canonical }, openGraph: { title, description, url: `${SITE_URL}${canonical}`, type: "website", images: ["/og.png"] }, twitter: { card: "summary_large_image", title, description, images: ["/og.png"] } };
}

export default async function CityPage({ params }: Props) {
  const { city: slug } = await params;
  const resolved = await resolveCity(slug);
  if (!resolved) notFound();
  const url = `${SITE_URL}/sehir/${slug}`;
  const categories = Object.entries(GEO_CATEGORIES).filter(([category]) => businessesInCategory(resolved.businesses, category as keyof typeof GEO_CATEGORIES).length > 0);
  const schema = { "@context": "https://schema.org", "@graph": [{ "@type": "CollectionPage", name: `${resolved.city} Online Randevu`, url, description: `${resolved.city}'daki aktif işletmeler ve online randevu seçenekleri.` }, { "@type": "ItemList", numberOfItems: resolved.businesses.length, itemListElement: resolved.businesses.slice(0, 30).map((business, index) => ({ "@type": "ListItem", position: index + 1, url: `${SITE_URL}/isletme/${business.slug}`, name: business.name })) }, { "@type": "BreadcrumbList", itemListElement: [{ "@type": "ListItem", position: 1, name: "Ana Sayfa", item: SITE_URL }, { "@type": "ListItem", position: 2, name: resolved.city, item: url }] }] };
  return <MarketingPage><main className="content-page"><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(schema) }}/><nav className="text-xs font-bold text-[#0b6b45]"><Link href="/">Ana Sayfa</Link> / {resolved.city}</nav><section className="geo-seo-hero"><span><MapPin size={14}/> {resolved.city.toLocaleUpperCase("tr-TR")} · CANLI KEŞİF</span><h1>{resolved.city}&apos;da online randevu al.</h1><p>Şehrindeki yayınlanmış işletmeleri, hizmet detaylarını ve uygun saatleri keşfet. Sana uyan işletmeyi seçerek randevunu online oluştur.</p><div><ShieldCheck size={15}/> {resolved.businesses.length} aktif işletme</div></section>{categories.length > 0 && <section className="geo-category-links"><header><span>KATEGORİYE GÖRE KEŞFET</span><h2>{resolved.city}&apos;da ne arıyorsun?</h2></header><div>{categories.map(([category, item]) => <Link key={category} href={`/sehir/${slug}/${category}`}><Compass size={17}/><span><b>{item.label}</b><small>{businessesInCategory(resolved.businesses, category as keyof typeof GEO_CATEGORIES).length} işletme</small></span><ArrowRight size={15}/></Link>)}</div></section>}<section className="py-14"><header className="mb-7"><span className="text-[10px] font-black tracking-[.17em] text-[#0b6b45]">YAYINDAKİ İŞLETMELER</span><h2 className="mt-3 text-4xl font-bold tracking-[-.05em] text-[#10241c]">{resolved.city}&apos;daki işletmeleri keşfet</h2></header><LocalBusinessGrid businesses={resolved.businesses}/></section></main></MarketingPage>;
}
