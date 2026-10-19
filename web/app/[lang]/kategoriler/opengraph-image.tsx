import { renderOgCard } from "@/lib/seo/og-card";
import { getTForParams } from "@/i18n/server";

export const alt = "Tüm kategoriler — SeninRandevun";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image({ params }: { params: Promise<{ lang?: string }> }) {
  const { t } = await getTForParams(params);
  return renderOgCard({
    eyebrow: t("Tüm kategoriler"),
    title: t("Ne için randevu almak istersin?"),
    subtitle: t("Kuaför, berber, güzellik, spa, sağlık, spor, veteriner ve daha fazlası."),
    chips: [t("Gerçek yorumlar"), t("Ücretsiz")],
  });
}
