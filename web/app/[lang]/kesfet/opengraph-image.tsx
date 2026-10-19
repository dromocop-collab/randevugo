import { renderOgCard } from "@/lib/seo/og-card";
import { getTForParams } from "@/i18n/server";

export const alt = "Yakındaki işletmeleri keşfet — SeninRandevun";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image({ params }: { params: Promise<{ lang?: string }> }) {
  const { t } = await getTForParams(params);
  return renderOgCard({ cta: t("Online randevu al"),
    eyebrow: t("Keşfet"),
    title: t("Yakınındaki işletmeleri keşfet"),
    subtitle: t("Şehir, kategori veya hizmet adıyla ara; puanları ve fiyatları karşılaştır."),
    chips: [t("Gerçek yorumlar"), t("Canlı müsaitlik")],
  });
}
