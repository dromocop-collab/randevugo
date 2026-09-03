import type { Metadata } from "next";
import { AuthShell } from "@/components/layout/auth-shell";
import { RegisterForm } from "@/features/auth/auth-forms";
export const metadata: Metadata = { title: "İşletme Kaydı", description: "İşletmeniz için ilk 12 ay ücretsiz SeninRandevun çalışma alanı oluşturun.", robots: { index: false, follow: false } };
export default function Page(){return <AuthShell eyebrow="İLK 12 AY ÜCRETSİZ" title="İşletmenizin zamanını geri kazanın." subtitle="Mağazanızı birkaç dakikada kurun; hizmet, ekip ve müsaitliklerinizi ekleyip ilk online randevunuzu bugün alın."><RegisterForm accountType="business" /></AuthShell>}
