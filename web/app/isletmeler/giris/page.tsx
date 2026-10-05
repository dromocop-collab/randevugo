import type { Metadata } from "next";
import { AuthScreen, LoginForm } from "@/features/auth/auth-forms";

export const metadata: Metadata = {
  title: "İşletme Girişi",
  description: "SeninRandevun işletme çalışma alanınıza giriş yapın.",
  robots: { index: false, follow: false },
};

export default function Page() {
  return (
    <AuthScreen variant="business" mode="login">
      <LoginForm accountType="business" />
    </AuthScreen>
  );
}
