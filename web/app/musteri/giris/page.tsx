import type { Metadata } from "next";
import { AuthShell } from "@/components/layout/auth-shell";
import { LoginForm } from "@/features/auth/auth-forms";
export const metadata: Metadata = { title: "Müşteri Girişi", description: "Randevularınızı görüntülemek ve yönetmek için müşteri hesabınıza giriş yapın.", robots: { index: false, follow: false } };
export default function Page(){return <AuthShell variant="customer" eyebrow="SANA ÖZEL RANDEVU ALANI" title="Planların, favorilerin ve yeni keşiflerin burada." subtitle="Yaklaşan randevularını yönet, sevdiğin işletmelere yeniden ulaş ve sana uygun yeni deneyimleri keşfet."><LoginForm accountType="customer" /></AuthShell>}
