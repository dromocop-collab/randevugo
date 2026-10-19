import type { Metadata } from "next";
import { getT } from "@/i18n/server";
import { AuthScreen, LoginForm } from "@/features/auth/auth-forms";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return {
    title: t("Giriş"),
    description: t("SeninRandevun işletme paneline giriş yapın."),
    robots: { index: false, follow: false },
  };
}

export default function LoginPage() {
  return (
    <AuthScreen variant="business" mode="login">
      <LoginForm />
    </AuthScreen>
  );
}
