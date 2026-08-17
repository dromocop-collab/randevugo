import type { Metadata } from "next";
import { SeoLandingPage } from "@/components/seo/seo-landing-page";
import { seoCategoryContent } from "@/lib/seo-category-content";

const content = seoCategoryContent.nail;
export const metadata: Metadata = { title: content.title, description: content.description, alternates: { canonical: "https://seninrandevun.com/nail-studio-randevu" }, openGraph: { title: content.title, description: content.description, url: "https://seninrandevun.com/nail-studio-randevu", type: "website" } };
export default function NailStudioRandevuPage() { return <SeoLandingPage {...content} />; }
