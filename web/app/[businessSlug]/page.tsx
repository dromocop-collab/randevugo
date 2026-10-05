import { notFound, permanentRedirect } from "next/navigation";
import { getBusinessBySlugCached } from "@/features/businesses/business-slug-cache";

// Sık yazılan kısa adresler doğru sayfalara gider.
const ALIASES: Record<string, string> = {
  yardim: "/yardim-merkezi",
  destek: "/yardim-merkezi",
  ios: "/mobil-uygulama",
  android: "/mobil-uygulama",
  uygulama: "/mobil-uygulama",
  kategoriler: "/kesfet",
  magazalar: "/kesfet",
  randevularim: "/hesabim",
};

/**
 * Eski adres uyumluluğu: /[businessSlug] → /isletme/[slug].
 * Yalnızca gerçekten var olan işletmeler yönlendirilir; diğer adresler 404 döner.
 */
export default async function BusinessSlugRedirect({
  params,
}: {
  params: Promise<{ businessSlug: string }>;
}) {
  const { businessSlug } = await params;
  const slug = decodeURIComponent(businessSlug).toLowerCase();
  if (ALIASES[slug]) permanentRedirect(ALIASES[slug]);
  const business = await getBusinessBySlugCached(slug).catch(() => null);
  if (!business || business.status !== "active" || !business.isPublished) notFound();
  permanentRedirect(`/isletme/${encodeURIComponent(business.slug ?? slug)}`);
}
