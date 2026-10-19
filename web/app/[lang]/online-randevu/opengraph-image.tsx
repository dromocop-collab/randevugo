import { localImageDataUrl } from "@/lib/seo/og-routes";
import { renderOgCard } from "@/lib/seo/og-card";
import { getTForParams } from "@/i18n/server";

export const alt = "Online randevu al — SeninRandevun";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image({ params }: { params: Promise<{ lang?: string }> }) {
  const { t } = await getTForParams(params);
  return renderOgCard({
    eyebrow: t("Online randevu"),
    title: t("Uygun saati seç, randevunu saniyeler içinde al"),
    subtitle: t("Kuaförden veterinere yakınındaki işletmeler tek yerde."),
    chips: [t("Ücretsiz"), "7/24"],
    image: await localImageDataUrl("/images/booking-flow-hero.png"),
  });
}
