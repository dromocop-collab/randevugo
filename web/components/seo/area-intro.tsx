import styles from "./seo-blocks.module.css";

/** Gerçek veriden üretilmiş giriş paragrafları (şehir / kategori sayfaları). */
export function AreaIntro({ id, title, paragraphs }: { id: string; title: string; paragraphs: string[] }) {
  if (paragraphs.length === 0) return null;
  return (
    <section className={styles.intro} aria-labelledby={id}>
      <h2 id={id}>{title}</h2>
      {paragraphs.map((text) => <p key={text}>{text}</p>)}
    </section>
  );
}
