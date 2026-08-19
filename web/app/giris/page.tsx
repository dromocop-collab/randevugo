import type { Metadata } from "next";
import { AuthShell } from "@/components/layout/auth-shell";
import { LoginForm } from "@/features/auth/auth-forms";

export const metadata: Metadata = {
  title: "Giriş | SeninRandevun",
  description: "SeninRandevun işletme paneline giriş yapın.",
};

export default function LoginPage() {
  return (
    <AuthShell
      eyebrow="YENİDEN HOŞ GELDİNİZ"
      title="Günün kontrolü yeniden sizde."
      subtitle="Randevu, ekip, müşteri ve büyüme verilerinize güvenli oturumunuzla her cihazdan ulaşın."
    >
      <LoginForm />
    </AuthShell>
  );
}
