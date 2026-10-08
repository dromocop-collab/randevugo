import type { Metadata } from "next";
import { BusinessSignupWizard } from "@/features/auth/business-signup-wizard";
export const metadata: Metadata = { title: "İşletme Kaydı", description: "İşletmeniz için ilk ay ücretsiz SeninRandevun çalışma alanı oluşturun.", robots: { index: false, follow: false } };
export default function Page(){return <BusinessSignupWizard/>}
