import type { Metadata } from "next";
import { getT } from "@/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return {
    title: t("Canlı Sıramı Takip Et"),
    description: t("Katıldığınız canlı sıranın güncel durumunu güvenle takip edin."),
    robots: { index: false, follow: false, noarchive: true },
  };
}

export default function MyQueueLayout({ children }: { children: React.ReactNode }) {
  return children;
}
