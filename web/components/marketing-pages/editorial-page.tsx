import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import { RoviMascot } from "@/components/brand/rovi-mascot";
import { Crumbs, PageCta, cx } from "./ui";
import mp from "./mp.module.css";
import s from "./editorial.module.css";

export type EditorialSection = { id: string; icon: ReactNode; title: string; body: ReactNode; points?: string[] };

/** Hakkımızda / Güvenlik gibi metin ağırlıklı sayfalar için sade editoryal düzen. */
export function EditorialPage({
  eyebrow, eyebrowIcon, title, intro, crumb, highlights, sections, tocLabel, related, cta,
}: {
  eyebrow: string;
  eyebrowIcon: ReactNode;
  title: ReactNode;
  intro: string;
  crumb: string;
  highlights: Array<{ icon: ReactNode; title: string; text: string }>;
  sections: EditorialSection[];
  tocLabel: string;
  related: Array<{ href: string; label: string; text: string }>;
  cta?: { title: ReactNode; text: string; primary: { href: string; label: string }; secondary?: { href: string; label: string } };
}) {
  return (
    <main className={mp.page}>
      <section className={mp.hero}>
        <div className={mp.heroGrid} aria-hidden="true" />
        <div className={cx(mp.shell, s.heroInner)}>
          <div className={s.heroCopy}>
            <Crumbs items={[{ href: "/", label: "Ana Sayfa" }, { label: crumb }]} />
            <span className={cx(mp.eyebrow, mp.rise)}>{eyebrowIcon} {eyebrow}</span>
            <h1 className={cx(mp.title, s.title, mp.rise)} style={{ "--i": 1 } as CSSProperties}>{title}</h1>
            <p className={cx(mp.lead, mp.rise)} style={{ "--i": 2 } as CSSProperties}>{intro}</p>
          </div>
          <div className={s.heroMascot} aria-hidden="true"><RoviMascot size={150} alt="" priority /></div>
        </div>
      </section>

      <div className={mp.shell}>
        <ul className={s.highlights} aria-label="Öne çıkanlar">
          {highlights.map((item, i) => (
            <li key={item.title} className={mp.rise} style={{ "--i": i } as CSSProperties}>
              <span>{item.icon}</span>
              <div><b>{item.title}</b><small>{item.text}</small></div>
            </li>
          ))}
        </ul>

        <div className={s.layout}>
          <nav className={s.toc} aria-label={tocLabel}>
            <span>{tocLabel}</span>
            <ol>{sections.map((section, i) => <li key={section.id}><a href={`#${section.id}`}><i>{String(i + 1).padStart(2, "0")}</i>{section.title}</a></li>)}</ol>
          </nav>
          <div className={s.articles}>
            {sections.map((section, i) => (
              <article key={section.id} id={section.id} className={cx(s.article, mp.reveal)} aria-labelledby={`${section.id}-baslik`}>
                <div className={s.articleHead}>
                  <span className={s.articleIcon}>{section.icon}</span>
                  <i>{String(i + 1).padStart(2, "0")}</i>
                </div>
                <h2 id={`${section.id}-baslik`}>{section.title}</h2>
                <div className={s.body}>{section.body}</div>
                {section.points && <ul className={s.points}>{section.points.map((point) => <li key={point}>{point}</li>)}</ul>}
              </article>
            ))}
          </div>
        </div>

        <section className={s.related} aria-labelledby="ilgili-baslik">
          <h2 id="ilgili-baslik" className={s.relatedTitle}>İlgili sayfalar</h2>
          <ul>
            {related.map((item) => (
              <li key={item.href}>
                <Link href={item.href} className={mp.card}>
                  <div><b>{item.label}</b><small>{item.text}</small></div>
                  <ArrowUpRight size={18} aria-hidden="true" />
                </Link>
              </li>
            ))}
          </ul>
        </section>

        {cta && (
          <PageCta title={cta.title} text={cta.text}>
            <Link href={cta.primary.href} className={cx(mp.btn, mp.btnLime)}>{cta.primary.label} <ArrowRight size={17} aria-hidden="true" /></Link>
            {cta.secondary && <Link href={cta.secondary.href} className={cx(mp.btn, mp.btnGlass)}>{cta.secondary.label}</Link>}
          </PageCta>
        )}
      </div>
    </main>
  );
}
