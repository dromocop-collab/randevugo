import Link from "next/link";
import { ChevronRight } from "lucide-react";
import type { Crumb } from "@/lib/seo/schema";
import styles from "./seo-blocks.module.css";

/** Görünür sayfa yolu. Son öğe bağlantı değildir (aria-current="page"). JSON-LD ile aynı listeyi kullanın. */
export function Breadcrumbs({ items, className, tone = "default" }: { items: Crumb[]; className?: string; tone?: "default" | "onDark" }) {
  return (
    <nav aria-label="Sayfa yolu" className={`${styles.crumbs} ${tone === "onDark" ? styles.crumbsOnDark : ""} ${className ?? ""}`}>
      <ol>
        {items.map((item, index) => {
          const last = index === items.length - 1;
          return (
            <li key={`${item.path}-${index}`}>
              {last ? <span aria-current="page">{item.name}</span> : <Link href={item.path}>{item.name}</Link>}
              {!last && <ChevronRight size={13} aria-hidden="true" />}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
