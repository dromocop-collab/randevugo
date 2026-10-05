import Link from "next/link";
import type { ReactNode } from "react";
import { RoviMascot } from "@/components/brand/rovi-mascot";
import mp from "./mp.module.css";

export function cx(...names: Array<string | false | null | undefined>) {
  return names.filter(Boolean).join(" ");
}

/** Hero içindeki görünür içerik haritası (JSON-LD sayfa düzeninde ayrıca verilir). */
export function Crumbs({ items }: { items: Array<{ href?: string; label: string }> }) {
  return (
    <nav aria-label="İçerik haritası">
      <ol className={mp.crumbs}>
        {items.map((item) => (
          <li key={item.label}>{item.href ? <Link href={item.href}>{item.label}</Link> : <span aria-current="page">{item.label}</span>}</li>
        ))}
      </ol>
    </nav>
  );
}

export function SectionHead({ kicker, title, sub, center, id }: { kicker: ReactNode; title: ReactNode; sub?: ReactNode; center?: boolean; id?: string }) {
  return (
    <header className={cx(mp.sectionHead, center && mp.sectionHeadCenter)}>
      <span className={mp.kicker}>{kicker}</span>
      <h2 className={mp.h2} id={id}>{title}</h2>
      {sub && <p className={mp.sub}>{sub}</p>}
    </header>
  );
}

/** Sayfa sonu yeşil çağrı bandı. */
export function PageCta({ title, text, children, mascot = true }: { title: ReactNode; text?: ReactNode; children: ReactNode; mascot?: boolean }) {
  return (
    <section className={cx(mp.cta, mp.reveal)}>
      <div>
        <h2>{title}</h2>
        {text && <p>{text}</p>}
      </div>
      <div className={mp.ctaActions}>{children}</div>
      {mascot && <span className={mp.ctaMascot} aria-hidden="true"><RoviMascot size={150} mood="wave" alt="" interactive={false} /></span>}
    </section>
  );
}
