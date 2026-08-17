import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "İşletme Keşfet | Yakınındaki Randevu Alınabilecek İşletmeler",
  description: "Kuaför, berber, güzellik merkezi, sağlık, spor ve daha fazlasını şehir ve kategoriye göre keşfedin. Size uygun işletmeden online randevu alın.",
  alternates: { canonical: "https://seninrandevun.com/kesfet" },
  openGraph: {
    title: "İşletme Keşfet | SeninRandevun",
    description: "Yakınınızdaki işletmeleri keşfedin ve uygun saatten online randevu alın.",
    url: "https://seninrandevun.com/kesfet",
    type: "website",
  },
};

export default function KesfetLayout({ children }: { children: React.ReactNode }) {
  return children;
}
