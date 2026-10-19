import { renderOgCard } from "@/lib/seo/og-card";

export const alt = "Senin randevu karakterin ne? — SeninRandevun";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return renderOgCard({
    eyebrow: "1 dakikalık test",
    title: "Senin randevu karakterin ne?",
    subtitle: "8 eğlenceli soru: Telefon Ninjası mı, Defter Ustası mı, Gece Kuşu mu?",
    chips: ["8 soru", "~1 dakika"],
  });
}
