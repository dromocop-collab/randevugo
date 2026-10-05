import type { Metadata } from "next";
import { AuthScreen, RegisterForm } from "@/features/auth/auth-forms";

export const metadata: Metadata = {
  title: "Kayıt",
  description: "SeninRandevun ile işletmeniz için online randevu sistemi kurun.",
  robots: { index: false, follow: false },
};

export default function RegisterPage() {
  return (
    <AuthScreen variant="business" mode="register">
      <RegisterForm />
    </AuthScreen>
  );
}
