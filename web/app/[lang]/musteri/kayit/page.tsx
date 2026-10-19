import type { Metadata } from "next";
import { getT } from "@/i18n/server";
import { AuthScreen, RegisterForm } from "@/features/auth/auth-forms";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return {
    title: t("Müşteri Kaydı"),
    description: t("Ücretsiz müşteri hesabınızı oluşturun; randevularınızı tek yerden yönetin."),
    robots: { index: false, follow: false },
  };
}

export default function Page() {
  return (
    <AuthScreen variant="customer" mode="register">
      <RegisterForm accountType="customer" />
    </AuthScreen>
  );
}
