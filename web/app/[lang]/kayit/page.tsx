import type { Metadata } from "next";
import { getT } from "@/i18n/server";
import { AuthScreen, RegisterForm } from "@/features/auth/auth-forms";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return {
    title: t("Kayıt"),
    description: t("SeninRandevun ile işletmeniz için online randevu sistemi kurun."),
    robots: { index: false, follow: false },
  };
}

export default function RegisterPage() {
  return (
    <AuthScreen variant="business" mode="register">
      <RegisterForm />
    </AuthScreen>
  );
}
