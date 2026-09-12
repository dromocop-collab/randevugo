import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CalendarCheck2, MapPin, ShieldCheck } from "lucide-react";
import { MarketingPage } from "@/components/marketing/marketing-shell";
import { LocalBusinessGrid } from "@/components/seo/local-business-grid";
import { GEO_CATEGORIES, businessesInCategory, isGeoCategory, resolveCity } from "@/lib/seo/geo-seo";
import { SITE_URL, jsonLd } from "@/lib/seo/local-seo";

type Props = { params: Promise<{ city: string; category: string }> };
export const revalidate = 3600;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { city: citySlug, category } = await params;
  const resolved = await resolveCity(citySlug);
  if (!resolved || !isGeoCategory(category)) return { robots: { index: false, follow: true } };
  const rows = businessesInCategory(resolved.businesses, category);
  const label = GEO_CATEGORIES[category].label;
  const title = `${resolved.city} ${label} Randevusu ve Fiyatları`;
  const description = `${resolved.city}'daki ${label.toLocaleLowerCase("tr-TR")} işletmelerini, hizmetlerini, puanlarını ve uygun randevu saatlerini karşılaştır. Online randevunu kolayca al.`;
  const canonical = `/sehir/${citySlug}/${category}`;
  return { title, description, robots: { index: rows.length > 0, follow: true }, alternates: { canonical }, openGraph: { title, description, url: `${SITE_URL}${canonical}`, type: "website", images: [GEO_CATEGORIES[category].image] }, twitter: { card: "summary_large_image", title, description, images: [GEO_CATEGORIES[category].image] } };
}

export default async function CityCategoryPage({ params }: Props) {
  const { city: citySlug, category } = await params;
  const resolved = await resolveCity(citySlug);
  if (!resolved || !isGeoCategory(category)) notFound();
  const item = GEO_CATEGORIES[category];
  const rows = businessesInCategory(resolved.businesses, category);
  if (rows.length === 0) notFound();
  const url = `${SITE_URL}/sehir/${citySlug}/${category}`;
  const faq = [{ q: `${resolved.city} ${item.label.toLocaleLowerCase("tr-TR")} fiyatlarını görebilir miyim?`, a: "İşletmelerin yayınladığı hizmet süreleri ve fiyatları profil sayfalarında görebilirsiniz." }, { q: "Randevu saatleri güncel mi?", a: "Müsaitlik; çalışma saatleri, çalışan uygunluğu ve mevcut randevular dikkate alınarak anlık hesaplanır." }, { q: "Online randevu ücretli mi?", a: "SeninRandevun üzerinden işletme keşfetmek ve randevu oluşturmak müşteriler için ücretsizdir." }];
  const schema = { "@context": "https://schema.org", "@graph": [{ "@type": "CollectionPage", name: `${resolved.city} ${item.label} Randevusu`, url }, { "@type": "ItemList", numberOfItems: rows.length, itemListElement: rows.map((business, index) => ({ "@type": "ListItem", position: index + 1, url: `${SITE_URL}/isletme/${business.slug}`, name: business.name })) }, { "@type": "FAQPage", mainEntity: faq.map((entry) => ({ "@type": "Question", name: entry.q, acceptedAnswer: { "@type": "Answer", text: entry.a } })) }, { "@type": "BreadcrumbList", itemListElement: [{ "@type": "ListItem", position: 1, name: "Ana Sayfa", item: SITE_URL }, { "@type": "ListItem", position: 2, name: resolved.city, item: `${SITE_URL}/sehir/${citySlug}` }, { "@type": "ListItem", position: 3, name: item.label, item: url }] }] };
  return <MarketingPage><main className="content-page"><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(schema) }}/><nav className="text-xs font-bold text-[#0b6b45]"><Link href="/">Ana Sayfa</Link> / <Link href={`/sehir/${citySlug}`}>{resolved.city}</Link> / {item.label}</nav><section className="geo-seo-hero geo-seo-category"><span><MapPin size={14}/> {resolved.city.toLocaleUpperCase("tr-TR")} · {item.label.toLocaleUpperCase("tr-TR")}</span><h1>{resolved.city} {item.label.toLocaleLowerCase("tr-TR")} randevusu.</h1><p>Yakınındaki işletmeleri, hizmetleri ve uygun saatleri tek yerde karşılaştır; sana uyan randevuyu güvenle oluştur.</p><div><ShieldCheck size={15}/> {rows.length} aktif işletme <CalendarCheck2 size={15}/> Online randevu</div></section><section className="py-14"><LocalBusinessGrid businesses={rows}/></section><section className="geo-faq"><h2>Sık sorulan sorular</h2>{faq.map((entry) => <details key={entry.q}><summary>{entry.q}</summary><p>{entry.a}</p></details>)}</section></main></MarketingPage>;
}
