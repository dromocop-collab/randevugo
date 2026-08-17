import type { Metadata } from "next";
import { SeoLandingPage } from "@/components/seo/seo-landing-page";
import { seoCategoryContent } from "@/lib/seo-category-content";

const content = seoCategoryContent.danismanlik;
export const metadata: Metadata = { title: content.title, description: content.description, alternates: { canonical: "https://seninrandevun.com/danismanlik-randevu" }, openGraph: { title: content.title, description: content.description, url: "https://seninrandevun.com/danismanlik-randevu", type: "website" } };
export default function DanismanlikRandevuPage() { return <SeoLandingPage {...content} />; }
