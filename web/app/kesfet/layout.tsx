import type { Metadata } from "next";
import { createPublicMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = createPublicMetadata({
  title: "Yakındaki İşletmeleri Keşfet",
  description: "Kuaför, berber, güzellik merkezi, sağlık, spor ve daha fazlasını şehir ve kategoriye göre keşfedin. Size uygun işletmeden online randevu alın.",
  pathname: "/kesfet",
  keywords: ["yakındaki işletmeler", "online randevu al", "kuaför randevu", "berber randevu", "güzellik merkezi randevu", "işletme keşfet"],
  imageAlt: "SeninRandevun işletme keşfet sayfası",
});

export default function KesfetLayout({ children }: { children: React.ReactNode }) {
  return children;
}
