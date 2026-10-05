import type { FaqEntry } from "@/lib/seo/text";
import styles from "./seo-blocks.module.css";

/** Görünür SSS — JSON-LD FAQPage yalnızca bu blokta görünen sorularla üretilmelidir. */
export function SeoFaq({ id, title, faq }: { id: string; title: string; faq: FaqEntry[] }) {
  if (faq.length === 0) return null;
  return (
    <section className={styles.faq} aria-labelledby={id}>
      <h2 id={id}>{title}</h2>
      {faq.map((entry) => (
        <details key={entry.question}>
          <summary>{entry.question}</summary>
          <p>{entry.answer}</p>
        </details>
      ))}
    </section>
  );
}
