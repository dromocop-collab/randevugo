import type { Metadata } from "next";
import { AuthShell } from "@/components/layout/auth-shell";
import { LoginForm } from "@/features/auth/auth-forms";

export const metadata: Metadata = {
  title: "Giris | RandevuGo",
  description: "RandevuGo isletme paneline giris yapin.",
};

export default function LoginPage() {
  return (
    <AuthShell
      eyebrow="KURUMSAL GIRIS"
      title="Operasyon panelinize guvenle baglanin"
      subtitle="Isletmenizin tum randevu, ekip ve gelir akisina tek panelden ulasin. Guvenli oturum yonetimi ve tenant izolasyonu ile profesyonel deneyim."
    >
      <LoginForm />
    </AuthShell>
  );
}
