import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { categoryDisplayName, seoCategory } from "@/lib/seo/categories";
import { renderOgCard } from "@/lib/seo/og-card";
import { LOCALE_LABELS, type Locale, type TFunction } from "@/i18n/config";

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

const upperFirst = (value: string, intl: string) => value.charAt(0).toLocaleUpperCase(intl) + value.slice(1);

/** Kategori tanıtım sayfaları (/kuafor-randevu vb.) için paylaşım kartı; metinler t ile etkin dilde yazılır. */
export async function categoryLandingOg({ t, locale }: { t: TFunction; locale: Locale }, slug: string, title?: string) {
  const category = seoCategory(slug);
  const label = t(category?.label ?? categoryDisplayName(slug));
  const examples = category ? t(category.examples) : "";
  return renderOgCard({ cta: t("Online randevu al"),
    eyebrow: t("{label} · Online randevu", { label }),
    title: title ?? t("{label} randevunu online al", { label }),
    subtitle: examples ? upperFirst(t("{examples} için uygun saati seç.", { examples }), LOCALE_LABELS[locale].intl) : undefined,
    chips: [t("Ücretsiz"), t("7/24")],
    image: await localImageDataUrl(category?.image),
  });
}
