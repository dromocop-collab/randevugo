import type { MetadataRoute } from "next";
import { SEO_CATEGORIES } from "@/lib/seo/categories";
import { LOCAL_CATEGORIES, businessesForCategory, type LocalCategorySlug } from "@/lib/seo/local-seo";
import { categoryCounts, getSeoIndex, groupByCity, type SeoBusiness } from "@/lib/seo/seo-data";
import { absoluteUrl, businessPath } from "@/lib/seo/site";
import { seoSlug } from "@/lib/seo/text";

/** Statik sayfalarda lastModified yalnızca derleme hattı gerçek bir zaman verirse yazılır. */
const configuredBuildTime = process.env.NEXT_PUBLIC_BUILD_TIME ? new Date(process.env.NEXT_PUBLIC_BUILD_TIME) : undefined;
const STATIC_LAST_MODIFIED = configuredBuildTime && Number.isFinite(configuredBuildTime.getTime()) ? configuredBuildTime : undefined;

export const revalidate = 3600;

/**
 * Next.js sitemap üreticisi görsel adreslerindeki `&` karakterini XML'e kaçışlamaz;
 * Firebase Storage token adresleri Search Console'da ayrıştırma hatası verir.
 */
function xmlSafeUrl(url: string): string {
  return url.replace(/&(?!amp;)/g, "&amp;");
}

function entry(path: string, options: Omit<MetadataRoute.Sitemap[number], "url" | "alternates"> = {}): MetadataRoute.Sitemap[number] {
  const url = absoluteUrl(path);
  return {
    url,
    lastModified: STATIC_LAST_MODIFIED,
    alternates: { languages: { "tr-TR": url, "x-default": url } },
    ...options,
    ...(options.images ? { images: options.images.map((image) => xmlSafeUrl(absoluteUrl(image))) } : {}),
  };
}

/** Listedeki en yeni güncelleme tarihi (şehir/kategori sayfaları için gerçek değişiklik zamanı). */
function latest(rows: SeoBusiness[]): Date | undefined {
  const times = rows.map((row) => (row.updatedAt ? Date.parse(row.updatedAt) : Number.NaN)).filter(Number.isFinite);
  return times.length ? new Date(Math.max(...times)) : STATIC_LAST_MODIFIED;
}

const STATIC_PAGES: [string, number, MetadataRoute.Sitemap[number]["changeFrequency"]][] = [
  ["/", 1, "daily"],
  ["/kesfet", 0.9, "daily"],
  ["/kategoriler", 0.88, "daily"],
  ["/online-randevu", 0.85, "weekly"],
  ["/simdi-musait", 0.7, "daily"],
  ["/isletmeler", 0.8, "weekly"],
  ["/fiyatlar", 0.7, "monthly"],
  ["/ozellikler", 0.7, "monthly"],
  ["/mobil-uygulama", 0.7, "monthly"],
  ["/yardim-merkezi", 0.5, "monthly"],
  ["/isletmeler/yardim", 0.5, "monthly"],
  ["/hakkimizda", 0.4, "yearly"],
  ["/iletisim", 0.4, "yearly"],
  ["/guvenlik", 0.3, "yearly"],
  ["/kvkk", 0.2, "yearly"],
  ["/gizlilik", 0.2, "yearly"],
  ["/kullanim-kosullari", 0.2, "yearly"],
  ["/cerez-politikasi", 0.2, "yearly"],
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const index = await getSeoIndex();
  const cities = groupByCity(index);
  const urls: MetadataRoute.Sitemap = [];

  for (const [path, priority, changeFrequency] of STATIC_PAGES) {
    urls.push(entry(path, { priority, changeFrequency, lastModified: path === "/" || path === "/kesfet" ? latest(index) : STATIC_LAST_MODIFIED }));
  }

  // Kategori tanıtım sayfaları
  for (const category of Object.values(SEO_CATEGORIES)) {
    if (!category.landing) continue;
    const rows = index.filter((row) => row.category === category.slug);
    urls.push(entry(category.landing, { priority: 0.85, changeFrequency: "weekly", lastModified: latest(rows), images: category.image ? [category.image] : undefined }));
  }

  // Şehir ve şehir × kategori sayfaları: yalnızca en az bir yayında işletme varsa
  for (const city of cities) {
    urls.push(entry(`/sehir/${city.slug}`, { priority: 0.85, changeFrequency: "daily", lastModified: latest(city.businesses) }));
    for (const item of categoryCounts(city.businesses)) {
      const rows = city.businesses.filter((row) => row.category === item.slug);
      const image = SEO_CATEGORIES[item.slug]?.image;
      urls.push(entry(`/sehir/${city.slug}/${item.slug}`, { priority: 0.8, changeFrequency: "daily", lastModified: latest(rows), images: image ? [image] : undefined }));
    }
  }

  // Fethiye ilçe sayfaları (eski yerel adresler; kanonik ve içerik olarak bağımsız)
  const fethiye = index.filter((row) => row.citySlug === "mugla" && seoSlug(row.district).includes("fethiye"));
  if (fethiye.length > 0) {
    urls.push(entry("/mugla/fethiye", { priority: 0.8, changeFrequency: "daily", lastModified: latest(fethiye) }));
    for (const slug of Object.keys(LOCAL_CATEGORIES) as LocalCategorySlug[]) {
      const rows = businessesForCategory(fethiye, slug);
      if (rows.length === 0) continue;
      urls.push(entry(`/mugla/fethiye/${slug}`, { priority: 0.75, changeFrequency: "daily", lastModified: latest(rows) }));
    }
  }

  // Tüm yayındaki, gizlenmemiş işletmeler (dizin bunları zaten süzer)
  for (const business of index) {
    const images = [business.coverUrl, business.logoUrl].filter((image): image is string => Boolean(image));
    urls.push(entry(businessPath(business.slug), {
      priority: business.isVerified ? 0.8 : 0.75,
      changeFrequency: "weekly",
      lastModified: business.updatedAt ? new Date(business.updatedAt) : STATIC_LAST_MODIFIED,
      images: images.length ? images : undefined,
    }));
  }

  // Aynı URL iki kez yazılmasın.
  const seen = new Set<string>();
  return urls.filter((item) => (seen.has(item.url) ? false : (seen.add(item.url), true)));
}

