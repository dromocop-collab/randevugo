import type { Metadata } from "next";
import { AuthScreen, ForgotPasswordForm } from "@/features/auth/auth-forms";

export const metadata: Metadata = {
  title: "Şifremi Unuttum",
  description: "SeninRandevun şifrenizi e-postanıza gelen kodla güvenle yenileyin.",
  robots: { index: false, follow: false },
};

export default function ForgotPasswordPage() {
  return (
    <AuthScreen variant="customer" mode="forgot">
      <ForgotPasswordForm />
    </AuthScreen>
  );
}
