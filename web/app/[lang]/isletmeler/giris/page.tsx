import type { Metadata } from "next";
import { AuthScreen, LoginForm } from "@/features/auth/auth-forms";
import { getT } from "@/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return {
  title: t("İşletme Girişi"),
  description: t("SeninRandevun işletme çalışma alanınıza giriş yapın."),
  robots: { index: false, follow: false },
  // Girişte "Ana ekrana ekle" denirse müşteri sitesi değil SR İşletme uygulaması kurulsun.
  manifest: "/pwa/isletme.webmanifest",
  appleWebApp: { capable: true, title: "SR İşletme", statusBarStyle: "default" }, // i18n-ignore — uygulama adı
  icons: { apple: "/pwa/apple-touch-icon.png" },
  };
}

export default function Page() {
  return (
    <AuthScreen variant="business" mode="login">
      <LoginForm accountType="business" />
    </AuthScreen>
  );
}
