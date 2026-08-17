import type { Metadata } from "next";
import { SeoLandingPage } from "@/components/seo/seo-landing-page";
import { seoCategoryContent } from "@/lib/seo-category-content";

const content = seoCategoryContent.veteriner;
export const metadata: Metadata = { title: content.title, description: content.description, alternates: { canonical: "https://seninrandevun.com/veteriner-randevu" }, openGraph: { title: content.title, description: content.description, url: "https://seninrandevun.com/veteriner-randevu", type: "website" } };
export default function VeterinerRandevuPage() { return <SeoLandingPage {...content} />; }
