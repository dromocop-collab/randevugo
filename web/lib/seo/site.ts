/**
 * Sitenin kanonik adresi ve marka bilgileri. Saf modül: Next.js veya Firebase içe aktarmaz,
 * böylece birim testlerinden de kullanılabilir.
 */
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://seninrandevun.com").replace(/\/+$/, "");
export const SITE_NAME = "SeninRandevun";
export const SITE_LOCALE = "tr_TR";
export const SITE_LANGUAGE = "tr-TR";
export const SITE_DESCRIPTION =
  "Yakınınızdaki kuaför, berber, güzellik, sağlık, spor ve bakım işletmelerini keşfedin; müsait saatleri karşılaştırıp saniyeler içinde online randevu alın.";
export const SITE_LOGO_PATH = "/logo.png";
export const SITE_CONTACT = {
  telephone: "+90-530-478-8298",
  email: "info@seninrandevun.com",
} as const;
export const SITE_SAME_AS = [
  "https://instagram.com/seninrandevun",
  "https://twitter.com/seninrandevun",
  "https://linkedin.com/company/seninrandevun",
] as const;

/** Göreli yolu (ör. "/kesfet") kanonik mutlak adrese çevirir. Mutlak adresler olduğu gibi döner. */
export function absoluteUrl(path = "/"): string {
  if (/^https?:\/\//i.test(path)) return path;
  const clean = path.startsWith("/") ? path : `/${path}`;
  return clean === "/" ? SITE_URL : `${SITE_URL}${clean}`;
}

/** İşletme vitrin yolu. Slug bir kez kodlanır; zaten kodlanmışsa çift kodlanmaz. */
export function businessPath(slug: string): string {
  let decoded = slug;
  try { decoded = decodeURIComponent(slug); } catch { /* geçersiz kodlama: olduğu gibi kullan */ }
  return `/isletme/${encodeURIComponent(decoded)}`;
}
