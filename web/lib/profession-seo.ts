import type { Metadata } from "next";

const SITE_URL = "https://seninrandevun.com";
const CATEGORY_IMAGES: Record<string, string> = {
  kuafor: "/images/categories/kuafor.png",
  berber: "/images/categories/berber.png",
  guzellik: "/images/categories/guzellik.png",
  spa: "/images/categories/spa.png",
  nail: "/images/categories/nail.png",
  spor: "/images/categories/spor.png",
  saglik: "/images/categories/saglik.png",
  danismanlik: "/images/categories/danismanlik.png",
  veteriner: "/images/categories/veteriner.png",
};

export function createProfessionMetadata(content: { title: string; description: string; pathname: string; category?: string }): Metadata {
  const url = `${SITE_URL}${content.pathname}`;
  const image = CATEGORY_IMAGES[content.category ?? ""] ?? "/og.png";
  const keyword = content.category?.replaceAll("-", " ") ?? "online randevu";
  return {
    title: content.title,
    description: content.description,
    keywords: [`${keyword} randevu`, `online ${keyword} randevu`, `${keyword} randevusu al`, "yakınımdaki işletmeler", "SeninRandevun"],
    alternates: { canonical: url, languages: { "tr-TR": url } },
    robots: { index: true, follow: true, googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1, "max-video-preview": -1 } },
    openGraph: { title: content.title, description: content.description, url, type: "website", locale: "tr_TR", siteName: "SeninRandevun", images: [{ url: image, width: 1024, height: 1024, alt: `${content.title} — SeninRandevun` }] },
    twitter: { card: "summary_large_image", title: content.title, description: content.description, images: [image] },
  };
}
