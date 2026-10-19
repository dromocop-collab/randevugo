import { localImageDataUrl } from "@/lib/seo/og-routes";
import { renderOgCard } from "@/lib/seo/og-card";
import { getTForParams } from "@/i18n/server";

export const alt = "SeninRandevun — yakınındaki işletmeyi keşfet, online randevu al";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image({ params }: { params: Promise<{ lang?: string }> }) {
  const { t } = await getTForParams(params);
  return renderOgCard({
    eyebrow: t("Kuaför · Berber · Güzellik · Sağlık"),
    title: t("Yakınındaki işletmeyi keşfet, online randevu al"),
    subtitle: t("Hizmetleri, fiyatları ve müsait saatleri karşılaştır."),
    chips: [t("Müşteriler için ücretsiz"), "7/24"],
    image: await localImageDataUrl("/images/home-hero-studio-v2.jpg"),
  });
}
