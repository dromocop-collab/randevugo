import type { Metadata } from "next";
import { AuthShell } from "@/components/layout/auth-shell";
import { RegisterForm } from "@/features/auth/auth-forms";
export const metadata: Metadata = { title: "Müşteri Kaydı", description: "Ücretsiz müşteri hesabınızı oluşturun; randevularınızı tek yerden yönetin.", robots: { index: false, follow: false } };
export default function Page(){return <AuthShell variant="customer" eyebrow="TAMAMEN ÜCRETSİZ" title="İyi hizmetlere giden kısa yolunuz." subtitle="Ücretsiz hesabınızı açın, mağazaları keşfedin ve tüm randevularınızı tek güvenli alanda yönetin."><RegisterForm accountType="customer" /></AuthShell>}
