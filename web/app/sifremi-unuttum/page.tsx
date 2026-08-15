import type { Metadata } from "next";
import { AuthShell } from "@/components/layout/auth-shell";
import { ForgotPasswordForm } from "@/features/auth/auth-forms";

export const metadata: Metadata = {
  title: "Sifremi Unuttum | SeninRandevun",
  description: "SeninRandevun sifrenizi guvenli sekilde sifirlayin.",
};

export default function ForgotPasswordPage() {
  return (
    <AuthShell
      eyebrow="HESAP GUVENLIGI"
      title="Sifrenizi guvenli sekilde yenileyin"
      subtitle="Kayitli e-posta adresinize sifirlama baglantisi gonderelim. Baglanti geldiginde yeni sifre belirleyip hesabiniza geri donebilirsiniz."
    >
      <ForgotPasswordForm />
    </AuthShell>
  );
}
