import type { Metadata } from "next";
import { getT } from "@/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return {
    title: t("Randevu Oluştur"),
    robots: { index: false, follow: false, noarchive: true },
  };
}

export default function BookingFlowLayout({ children }: { children: React.ReactNode }) {
  return children;
}
