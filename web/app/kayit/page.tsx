import type { Metadata } from "next";
import { AuthShell } from "@/components/layout/auth-shell";
import { RegisterForm } from "@/features/auth/auth-forms";

export const metadata: Metadata = {
  title: "Kayit | SeninRandevun",
  description: "SeninRandevun ile isletmeniz icin online randevu sistemi kurun.",
};

export default function RegisterPage() {
  return (
    <AuthShell
      eyebrow="YENI HESAP"
      title="Isletmenizi premium randevu altyapisina tasiyin"
      subtitle="Dakikalar icinde kaydolun, onboarding ile isletmenizi olusturun ve ozel rezervasyon sayfanizi hemen yayina alin."
    >
      <RegisterForm />
    </AuthShell>
  );
}
