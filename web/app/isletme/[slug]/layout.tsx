import type { Metadata } from "next";
import type { ReactNode } from "react";

const SITE_URL = "https://seninrandevun.com";

function labelFromSlug(slug: string) {
  return decodeURIComponent(slug)
    .replace(/[-_]+/g, " ")
    .replace(/\b\p{L}/gu, (letter) => letter.toLocaleUpperCase("tr-TR"));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const label = labelFromSlug(slug);
  const canonical = `${SITE_URL}/isletme/${encodeURIComponent(slug)}`;
  const title = `${label} | Hizmetler, Yorumlar ve Online Randevu`;
  const description = `${label} hizmetlerini, çalışma saatlerini, ekibini ve müşteri yorumlarını inceleyin. SeninRandevun üzerinden uygun saati seçerek online randevu alın.`;

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: { title, description, url: canonical, type: "website", locale: "tr_TR", images: ["/og.png"] },
    twitter: { card: "summary_large_image", title, description, images: ["/og.png"] },
    robots: { index: true, follow: true, googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1 } },
  };
}

export default function BusinessProfileLayout({ children }: { children: ReactNode }) {
  return children;
}
