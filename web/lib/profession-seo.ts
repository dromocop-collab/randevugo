import type { Metadata } from "next";
import { createPublicMetadata } from "@/lib/seo/metadata";

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
  yazilim: "/images/categories/yazilim.png",
};

export function createProfessionMetadata(content: { title: string; description: string; pathname: string; category?: string }): Metadata {
  const image = CATEGORY_IMAGES[content.category ?? ""] ?? "/og.png";
  const keyword = content.category?.replaceAll("-", " ") ?? "online randevu";
  return createPublicMetadata({
    title: content.title,
    description: content.description,
    pathname: content.pathname,
    keywords: [`${keyword} randevu`, `online ${keyword} randevu`, `${keyword} randevusu al`, "yakınımdaki işletmeler", "SeninRandevun"],
    image,
    imageAlt: `${content.title} — SeninRandevun`,
    imageWidth: image === "/og.png" ? 1729 : 1024,
    imageHeight: image === "/og.png" ? 910 : 1024,
  });
}
