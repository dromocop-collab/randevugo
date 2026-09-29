import Link from "next/link";
import { MarketingPage } from "@/components/marketing/marketing-shell";

export interface ContentSection { title: string; body: string; bullets?: string[] }

function sectionId(title: string) {
  return title.toLocaleLowerCase("tr-TR").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/ı/g, "i").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

export function ContentPage({ eyebrow, title, intro, sections, cta = true }: { eyebrow: string; title: string; intro: string; sections: ContentSection[]; cta?: boolean }) {
  return <MarketingPage><main className="content-page"><section className="content-hero"><span>{eyebrow}</span><h1>{title}</h1><p>{intro}</p></section><section className="content-sections">{sections.map((section,index) => <article id={sectionId(section.title)} key={section.title}><b>{String(index + 1).padStart(2,"0")}</b><div><h2>{section.title}</h2><p>{section.body}</p>{section.bullets && <ul>{section.bullets.map(item => <li key={item}>{item}</li>)}</ul>}</div></article>)}</section>{cta && <section className="content-cta"><p>İşletmenizi bugünden daha akıllı yönetin.</p><Link href="/isletmeler/kayit">İlk 3 ay ücretsiz başla →</Link></section>}</main></MarketingPage>;
}
