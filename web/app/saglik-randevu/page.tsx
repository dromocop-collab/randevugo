import type { Metadata } from "next";
import { SeoLandingPage } from "@/components/seo/seo-landing-page";
import { seoCategoryContent } from "@/lib/seo-category-content";

const content = seoCategoryContent.saglik;
export const metadata: Metadata = { title: content.title, description: content.description, alternates: { canonical: "https://seninrandevun.com/saglik-randevu" }, openGraph: { title: content.title, description: content.description, url: "https://seninrandevun.com/saglik-randevu", type: "website" } };
export default function SaglikRandevuPage() { return <SeoLandingPage {...content} />; }
