import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Online Randevu Sistemi Fiyatları | İşletme Planları",
  description: "SeninRandevun online randevu sistemi planlarını inceleyin. Takvim, çalışan, müşteri, analitik ve online rezervasyon özellikleriyle işletmenizi büyütün.",
  alternates: { canonical: "https://seninrandevun.com/fiyatlar" },
  openGraph: {
    title: "Online Randevu Sistemi Fiyatları | SeninRandevun",
    description: "İşletmeniz için online randevu ve yönetim planlarını karşılaştırın.",
    url: "https://seninrandevun.com/fiyatlar",
    type: "website",
  },
};

export default function FiyatlarLayout({ children }: { children: React.ReactNode }) {
  return children;
}
