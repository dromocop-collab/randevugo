import type { Metadata } from "next";
import type { ReactNode } from "react";
import { getT } from "@/i18n/server";
import { ProtectedRoute } from "@/lib/auth/protected-route";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t("Hesabım ve Randevularım"), robots: { index: false, follow: false } };
}

export default function CustomerAccountLayout({ children }: { children: ReactNode }) {
  return <ProtectedRoute loginPath="/musteri/giris">{children}</ProtectedRoute>;
}
