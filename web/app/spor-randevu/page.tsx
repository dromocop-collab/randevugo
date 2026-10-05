import { SeoLandingPage } from "@/components/seo/seo-landing-page";
import { seoCategoryContent } from "@/lib/seo-category-content";
import { createProfessionMetadata } from "@/lib/profession-seo";

const content = seoCategoryContent.spor;
// Kategori işletme listesi saatte bir yenilenir.
export const revalidate = 3600;

export const metadata = createProfessionMetadata(content);
export default function SporRandevuPage() { return <SeoLandingPage {...content} />; }
