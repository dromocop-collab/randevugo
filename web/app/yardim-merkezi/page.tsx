import type { Metadata } from "next";
import { HelpCenter } from "@/components/marketing/help-center";
import { MarketingPage } from "@/components/marketing/marketing-shell";

export const metadata: Metadata = { title: "Müşteri Yardım Merkezi", description: "Mağaza keşfi, online randevu, değişiklik, iptal, hesap ve güvenlik sorularınız için SeninRandevun müşteri yardım merkezi.", alternates: { canonical: "/yardim-merkezi" } };

export default function Page() { return <MarketingPage><HelpCenter mode="customer" /></MarketingPage>; }
