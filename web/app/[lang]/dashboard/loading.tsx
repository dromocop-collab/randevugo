import { BrandPageLoader } from "@/components/ui/brand-page-loader";
import { getT } from "@/i18n/server";

export default async function DashboardLoading() {
  const t = await getT();
  return <BrandPageLoader label={t("İşletme merkeziniz hazırlanıyor")} />;
}
