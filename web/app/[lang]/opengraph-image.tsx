import { localImageDataUrl } from "@/lib/seo/og-routes";
import { renderOgCard } from "@/lib/seo/og-card";

export const alt = "SeninRandevun — yakınındaki işletmeyi keşfet, online randevu al";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  return renderOgCard({
    eyebrow: "Kuaför · Berber · Güzellik · Sağlık",
    title: "Yakınındaki işletmeyi keşfet, online randevu al",
    subtitle: "Hizmetleri, fiyatları ve müsait saatleri karşılaştır.",
    chips: ["Müşteriler için ücretsiz", "7/24"],
    image: await localImageDataUrl("/images/home-hero-studio-v2.jpg"),
  });
}
