import type { Metadata } from "next";
import { SeoLandingPage } from "@/components/seo/seo-landing-page";
import { seoCategoryContent } from "@/lib/seo-category-content";

const content = seoCategoryContent.spa;
export const metadata: Metadata = { title: content.title, description: content.description, alternates: { canonical: "https://seninrandevun.com/spa-randevu" }, openGraph: { title: content.title, description: content.description, url: "https://seninrandevun.com/spa-randevu", type: "website" } };
export default function SpaRandevuPage() { return <SeoLandingPage {...content} />; }
