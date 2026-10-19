import type { Metadata } from "next";
import { getT } from "@/i18n/server";
import { AuthScreen, ForgotPasswordForm } from "@/features/auth/auth-forms";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return {
    title: t("Şifremi Unuttum"),
    description: t("SeninRandevun şifrenizi e-postanıza gelen kodla güvenle yenileyin."),
    robots: { index: false, follow: false },
  };
}

export default function ForgotPasswordPage() {
  return (
    <AuthScreen variant="customer" mode="forgot">
      <ForgotPasswordForm />
    </AuthScreen>
  );
}
