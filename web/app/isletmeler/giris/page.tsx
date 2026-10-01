import type { Metadata } from "next";
import { AuthShell } from "@/components/layout/auth-shell";
import { LoginForm } from "@/features/auth/auth-forms";
export const metadata: Metadata = { title: "İşletme Girişi", description: "SeninRandevun işletme çalışma alanınıza giriş yapın.", robots: { index: false, follow: false } };
export default function Page(){return <AuthShell eyebrow="İŞLETME ÇALIŞMA ALANI" title="Günün kontrolü yeniden sizde." subtitle="Randevu, ekip, müşteri, kasa ve işletme verilerinize güvenli oturumunuzla her cihazdan ulaşın."><LoginForm accountType="business" /></AuthShell>}
