import type { Metadata } from "next";
import { BusinessSignupWizard } from "@/features/auth/business-signup-wizard";
import { getT } from "@/i18n/server";
export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t("İşletme Kaydı"), description: t("İşletmeniz için ilk ay ücretsiz SeninRandevun çalışma alanı oluşturun."), robots: { index: false, follow: false } };
}
export default function Page(){return <BusinessSignupWizard/>}
