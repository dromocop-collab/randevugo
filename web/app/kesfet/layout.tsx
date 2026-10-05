import type { Metadata } from "next";
import { createPublicMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = createPublicMetadata({
  title: "Yakındaki İşletmeleri Keşfet ve Online Randevu Al",
  description: "Kuaför, berber, güzellik merkezi, sağlık, spor ve daha fazlasını şehir ve kategoriye göre keşfet; puanları, fiyatları karşılaştır ve online randevu al.",
  pathname: "/kesfet",
  keywords: ["yakındaki işletmeler", "online randevu al", "kuaför randevu", "berber randevu", "güzellik merkezi randevu", "işletme keşfet"],
  image: null,
});

export default function KesfetLayout({ children }: { children: React.ReactNode }) {
  return children;
}
