import type { Metadata } from "next";
import { AuthShell } from "@/components/layout/auth-shell";
import { LoginForm } from "@/features/auth/auth-forms";
export const metadata: Metadata = { title: "Müşteri Girişi", description: "Randevularınızı görüntülemek ve yönetmek için müşteri hesabınıza giriş yapın.", robots: { index: false, follow: false } };
export default function Page(){return <AuthShell variant="customer" eyebrow="MÜŞTERİ HESABI" title="Randevularınız, sevdiğiniz yerler ve siz." subtitle="Yaklaşan randevularınızı yönetin, geçmişinizi görüntüleyin ve sevdiğiniz işletmelere yeniden ulaşın."><LoginForm accountType="customer" /></AuthShell>}
