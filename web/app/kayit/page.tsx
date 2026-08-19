import type { Metadata } from "next";
import { AuthShell } from "@/components/layout/auth-shell";
import { RegisterForm } from "@/features/auth/auth-forms";

export const metadata: Metadata = {
  title: "Kayıt | SeninRandevun",
  description: "SeninRandevun ile işletmeniz için online randevu sistemi kurun.",
};

export default function RegisterPage() {
  return (
    <AuthShell
      eyebrow="14 GÜN ÜCRETSİZ"
      title="İşletmenizin zamanını geri kazanın."
      subtitle="Mağazanızı birkaç dakikada kurun; hizmet, ekip ve müsaitliklerinizi ekleyip ilk online randevunuzu bugün alın."
    >
      <RegisterForm />
    </AuthShell>
  );
}
