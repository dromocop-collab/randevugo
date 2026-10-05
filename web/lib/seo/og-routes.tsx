import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { categoryDisplayName, seoCategory } from "@/lib/seo/categories";
import { renderOgCard } from "@/lib/seo/og-card";

/** public/ altındaki yerel görseli data URL olarak okur (yalnızca png/jpg). */
export async function localImageDataUrl(publicPath: string | undefined): Promise<string | null> {
  if (!publicPath || !publicPath.startsWith("/") || publicPath.includes("..")) return null;
  const extension = publicPath.split(".").pop()?.toLowerCase();
  const type = extension === "png" ? "image/png" : extension === "jpg" || extension === "jpeg" ? "image/jpeg" : null;
  if (!type) return null;
  try {
    const data = await readFile(join(process.cwd(), "public", publicPath));
    return `data:${type};base64,${data.toString("base64")}`;
  } catch {
    return null;
  }
}

/** Kategori tanıtım sayfaları (/kuafor-randevu vb.) için paylaşım kartı. */
export async function categoryLandingOg(slug: string, title?: string) {
  const category = seoCategory(slug);
  const label = category?.label ?? categoryDisplayName(slug);
  return renderOgCard({
    eyebrow: `${label} · Online randevu`,
    title: title ?? `${label} randevunu online al`,
    subtitle: category ? `${category.examples.charAt(0).toLocaleUpperCase("tr-TR")}${category.examples.slice(1)} için uygun saati seç.` : undefined,
    chips: ["Ücretsiz", "7/24"],
    image: await localImageDataUrl(category?.image),
  });
}
