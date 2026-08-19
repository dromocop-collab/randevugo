import { SeoLandingPage } from "@/components/seo/seo-landing-page";
import { seoCategoryContent } from "@/lib/seo-category-content";
import { createProfessionMetadata } from "@/lib/profession-seo";

const content = seoCategoryContent.saglik;
export const metadata = createProfessionMetadata(content);
export default function SaglikRandevuPage() { return <SeoLandingPage {...content} />; }
