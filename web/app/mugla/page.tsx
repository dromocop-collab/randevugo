import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, MapPin } from "lucide-react";
import { MarketingPage } from "@/components/marketing/marketing-shell";
import { SITE_URL, jsonLd } from "@/lib/seo/local-seo";

export const metadata: Metadata = { title: "Muğla Online Randevu ve Yerel İşletmeler", description: "Muğla'daki hizmet işletmelerini keşfedin, Fethiye'deki uygun saatleri görün ve online randevu alın.", alternates: { canonical: "/mugla" }, openGraph: { title: "Muğla Online Randevu | SeninRandevun", url: `${SITE_URL}/mugla`, type: "website" } };

export default function MuglaPage() {
  const schema = { "@context":"https://schema.org", "@type":"BreadcrumbList", itemListElement:[{ "@type":"ListItem", position:1, name:"Ana Sayfa", item:SITE_URL },{ "@type":"ListItem", position:2, name:"Muğla", item:`${SITE_URL}/mugla` }] };
  return <MarketingPage><main className="content-page"><script type="application/ld+json" dangerouslySetInnerHTML={{__html:jsonLd(schema)}}/><nav className="text-xs font-bold text-[#0b6b45]"><Link href="/">Ana Sayfa</Link> / Muğla</nav><section className="mt-10 rounded-[34px] bg-[linear-gradient(135deg,#eff7ec,#dfeee1)] p-8 sm:p-14"><MapPin className="text-[#0b6b45]"/><h1 className="mt-5 text-5xl font-bold tracking-[-.055em] text-[#10241c] sm:text-7xl">Muğla&apos;da online randevu</h1><p className="mt-6 max-w-2xl text-base leading-8 text-[#60756a]">Muğla&apos;nın ilçelerindeki gerçek işletmeleri, hizmetleri ve müsait saatleri tek yerde keşfedin.</p><Link href="/mugla/fethiye" className="mt-8 inline-flex items-center gap-3 rounded-full bg-[#0b6b45] px-6 py-4 text-sm font-bold text-white">Fethiye işletmelerini keşfet <ArrowRight size={17}/></Link></section></main></MarketingPage>;
}
