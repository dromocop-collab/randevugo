import type { Metadata } from "next";
import { SeoLandingPage } from "@/components/seo/seo-landing-page";
import { seoCategoryContent } from "@/lib/seo-category-content";

const content = seoCategoryContent.spor;
export const metadata: Metadata = { title: content.title, description: content.description, alternates: { canonical: "https://seninrandevun.com/spor-randevu" }, openGraph: { title: content.title, description: content.description, url: "https://seninrandevun.com/spor-randevu", type: "website" } };
export default function SporRandevuPage() { return <SeoLandingPage {...content} />; }
