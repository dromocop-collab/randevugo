import { SeoLandingPage, seoLandingMetadata } from "@/components/seo/seo-landing-page";
import { seoCategoryContent } from "@/lib/seo-category-content";

const content = seoCategoryContent.nail;
// Kategori işletme listesi saatte bir yenilenir.
export const revalidate = 3600;

export function generateMetadata() { return seoLandingMetadata(content); }
export default function NailStudioRandevuPage() { return <SeoLandingPage {...content} />; }
