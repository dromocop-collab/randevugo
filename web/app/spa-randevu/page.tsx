import { SeoLandingPage } from "@/components/seo/seo-landing-page";
import { seoCategoryContent } from "@/lib/seo-category-content";
import { createProfessionMetadata } from "@/lib/profession-seo";

const content = seoCategoryContent.spa;
export const metadata = createProfessionMetadata(content);
export default function SpaRandevuPage() { return <SeoLandingPage {...content} />; }
