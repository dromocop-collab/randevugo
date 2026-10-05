import Link from "next/link";
import { ArrowRight } from "lucide-react";
import styles from "./seo-blocks.module.css";

export type CloudLink = { href: string; label: string; meta?: string };

/** Açıklayıcı bağlantı metinli iç bağlantı bloğu (ör. "Bu bölgedeki diğer kategoriler"). */
export function LinkCloud({ id, kicker, title, links, description }: { id: string; kicker?: string; title: string; links: CloudLink[]; description?: string }) {
  if (links.length === 0) return null;
  return (
    <section className={styles.cloud} aria-labelledby={id}>
      <header>
        {kicker && <span className={styles.kicker}>{kicker}</span>}
        <h2 id={id}>{title}</h2>
        {description && <p>{description}</p>}
      </header>
      <ul>
        {links.map((link) => (
          <li key={link.href}>
            <Link href={link.href} className={styles.cloudLink}>
              <span>{link.label}{link.meta && <small>{link.meta}</small>}</span>
              <ArrowRight size={14} aria-hidden="true" />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
