import { categoryLandingOg } from "@/lib/seo/og-routes";
import { getTForParams } from "@/i18n/server";

export const alt = "Sağlık randevusu — SeninRandevun";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image({ params }: { params: Promise<{ lang?: string }> }) {
  return categoryLandingOg(await getTForParams(params), "saglik");
}
