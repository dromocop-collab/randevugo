import type { Metadata } from "next";
import type { ReactNode } from "react";
import { ProtectedRoute } from "@/lib/auth/protected-route";

export const metadata: Metadata = { title: "Hesabım ve Randevularım", robots: { index: false, follow: false } };

export default function CustomerAccountLayout({ children }: { children: ReactNode }) {
  return <ProtectedRoute loginPath="/musteri/giris">{children}</ProtectedRoute>;
}
