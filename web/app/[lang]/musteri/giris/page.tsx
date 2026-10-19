import type { Metadata } from "next";
import { getT } from "@/i18n/server";
import { AuthScreen, LoginForm } from "@/features/auth/auth-forms";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return {
    title: t("Müşteri Girişi"),
    description: t("Randevularınızı görüntülemek ve yönetmek için müşteri hesabınıza giriş yapın."),
    robots: { index: false, follow: false },
  };
}

export default function Page() {
  return (
    <AuthScreen variant="customer" mode="login">
      <LoginForm accountType="customer" />
    </AuthScreen>
  );
}
