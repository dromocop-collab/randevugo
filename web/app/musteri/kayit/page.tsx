import type { Metadata } from "next";
import { AuthScreen, RegisterForm } from "@/features/auth/auth-forms";

export const metadata: Metadata = {
  title: "Müşteri Kaydı",
  description: "Ücretsiz müşteri hesabınızı oluşturun; randevularınızı tek yerden yönetin.",
  robots: { index: false, follow: false },
};

export default function Page() {
  return (
    <AuthScreen variant="customer" mode="register">
      <RegisterForm accountType="customer" />
    </AuthScreen>
  );
}
