import { renderOgCard } from "@/lib/seo/og-card";

export const alt = "Yakındaki işletmeleri keşfet — SeninRandevun";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return renderOgCard({
    eyebrow: "Keşfet",
    title: "Yakınındaki işletmeleri keşfet",
    subtitle: "Şehir, kategori veya hizmet adıyla ara; puanları ve fiyatları karşılaştır.",
    chips: ["Gerçek yorumlar", "Canlı müsaitlik"],
  });
}
