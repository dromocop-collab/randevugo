import type { Metadata } from "next";
import { AuthScreen, LoginForm } from "@/features/auth/auth-forms";

export const metadata: Metadata = {
  title: "Giriş",
  description: "SeninRandevun işletme paneline giriş yapın.",
  robots: { index: false, follow: false },
};

export default function LoginPage() {
  return (
    <AuthScreen variant="business" mode="login">
      <LoginForm />
    </AuthScreen>
  );
}
