import type { Metadata } from "next";
import { AuthShell } from "@/components/layout/auth-shell";
import { RegisterForm } from "@/features/auth/auth-forms";
export const metadata: Metadata = { title: "İşletme Kaydı", description: "İşletmeniz için 14 günlük ücretsiz SeninRandevun çalışma alanı oluşturun." };
export default function Page(){return <AuthShell eyebrow="14 GÜN ÜCRETSİZ" title="İşletmenizin zamanını geri kazanın." subtitle="Mağazanızı birkaç dakikada kurun; hizmet, ekip ve müsaitliklerinizi ekleyip ilk online randevunuzu bugün alın."><RegisterForm accountType="business" /></AuthShell>}
