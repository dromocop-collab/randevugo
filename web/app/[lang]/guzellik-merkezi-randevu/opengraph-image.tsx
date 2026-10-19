import { categoryLandingOg } from "@/lib/seo/og-routes";

export const alt = "Güzellik merkezi randevusu — SeninRandevun";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return categoryLandingOg("guzellik");
}
