import { renderOgCard } from "@/lib/seo/og-card";

export const alt = "Tüm kategoriler — SeninRandevun";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return renderOgCard({
    eyebrow: "Tüm kategoriler",
    title: "Ne için randevu almak istersin?",
    subtitle: "Kuaför, berber, güzellik, spa, sağlık, spor, veteriner ve daha fazlası.",
    chips: ["Gerçek yorumlar", "Ücretsiz"],
  });
}
