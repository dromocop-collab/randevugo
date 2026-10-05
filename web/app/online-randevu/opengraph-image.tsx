import { localImageDataUrl } from "@/lib/seo/og-routes";
import { renderOgCard } from "@/lib/seo/og-card";

export const alt = "Online randevu al — SeninRandevun";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  return renderOgCard({
    eyebrow: "Online randevu",
    title: "Uygun saati seç, randevunu saniyeler içinde al",
    subtitle: "Kuaförden veterinere yakınındaki işletmeler tek yerde.",
    chips: ["Ücretsiz", "7/24"],
    image: await localImageDataUrl("/images/booking-flow-hero.png"),
  });
}
