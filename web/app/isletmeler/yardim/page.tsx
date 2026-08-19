import type { Metadata } from "next";
import { HelpCenter } from "@/components/marketing/help-center";
import { BusinessPage } from "@/components/marketing/business-shell";

export const metadata: Metadata = { title: "İşletme Yardım Merkezi", description: "SeninRandevun işletme kurulumu, takvim, çalışan, müşteri, abonelik ve analitik rehberleri.", alternates: { canonical: "/isletmeler/yardim" } };

export default function Page() { return <BusinessPage><HelpCenter mode="business" /></BusinessPage>; }
