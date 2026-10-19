import type { Metadata } from "next";
import { createPublicMetadata } from "@/lib/seo/metadata";
import { getLocale, getT } from "@/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return createPublicMetadata({
    title: t("Yakındaki İşletmeleri Keşfet ve Online Randevu Al"),
    description: t("Kuaför, berber, güzellik merkezi, sağlık, spor ve daha fazlasını şehir ve kategoriye göre keşfet; puanları, fiyatları karşılaştır ve online randevu al."),
    pathname: "/kesfet",
    keywords: [t("yakındaki işletmeler"), t("online randevu al"), t("kuaför randevu"), t("berber randevu"), t("güzellik merkezi randevu"), t("işletme keşfet")],
    image: null,
    locale: await getLocale(),
  });
}

export default function KesfetLayout({ children }: { children: React.ReactNode }) {
  return children;
}
