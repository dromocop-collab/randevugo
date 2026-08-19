import Link from "next/link";
import { MarketingPage } from "@/components/marketing/marketing-shell";

export interface ContentSection { title: string; body: string; bullets?: string[] }

export function ContentPage({ eyebrow, title, intro, sections, cta = true }: { eyebrow: string; title: string; intro: string; sections: ContentSection[]; cta?: boolean }) {
  return <MarketingPage><main className="content-page"><section className="content-hero"><span>{eyebrow}</span><h1>{title}</h1><p>{intro}</p></section><section className="content-sections">{sections.map((section,index) => <article key={section.title}><b>0{index + 1}</b><div><h2>{section.title}</h2><p>{section.body}</p>{section.bullets && <ul>{section.bullets.map(item => <li key={item}>{item}</li>)}</ul>}</div></article>)}</section>{cta && <section className="content-cta"><p>İşletmenizi bugünden daha akıllı yönetin.</p><Link href="/kayit">14 gün ücretsiz başla →</Link></section>}</main></MarketingPage>;
}
