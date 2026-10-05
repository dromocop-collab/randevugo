import type { Metadata } from "next";
import { AuthScreen, LoginForm } from "@/features/auth/auth-forms";

export const metadata: Metadata = {
  title: "Müşteri Girişi",
  description: "Randevularınızı görüntülemek ve yönetmek için müşteri hesabınıza giriş yapın.",
  robots: { index: false, follow: false },
};

export default function Page() {
  return (
    <AuthScreen variant="customer" mode="login">
      <LoginForm accountType="customer" />
    </AuthScreen>
  );
}
