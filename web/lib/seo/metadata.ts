import type { Metadata } from "next";
import { SITE_NAME, SITE_URL, absoluteUrl } from "@/lib/seo/site";
import { DEFAULT_LOCALE, LOCALES, LOCALE_LABELS, localizeHref, type Locale } from "@/i18n/config";
import { fitDescription } from "@/lib/seo/text";
import { serializeJsonLd } from "@/lib/seo/schema";

export const SEO_SITE_URL = SITE_URL;
export const SEO_SITE_NAME = SITE_NAME;

/** Varsayılan paylaşım görseli (işletme tarafı tanıtım görseli). */
export const DEFAULT_OG_IMAGE = { url: "/og-v2.png", width: 1200, height: 630 } as const;

type PublicMetadataInput = {
  /** Şablon "%s | SeninRandevun" eklenir; marka adını başlığa yazmayın. */
  title: string;
  description: string;
  pathname: string;
  keywords?: string[];
  /**
   * Paylaşım görseli. `null` → aynı klasördeki `opengraph-image` dosyası kullanılır
   * (images alanı hiç yazılmaz ki dosya tabanlı görsel devreye girsin).
   */
  image?: string | null;
  imageAlt?: string;
  imageWidth?: number;
  imageHeight?: number;
  type?: "website" | "article";
  /** Arama sonuçlarından çıkar (bağlantılar takip edilmeye devam eder). */
  noindex?: boolean;
  /** Sayfanın dili: canonical bu dilin adresi olur, diğer diller hreflang ile bağlanır. */
  locale?: Locale;
};

export function robotsFor(indexable: boolean): Metadata["robots"] {
  return indexable
    ? { index: true, follow: true, googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1, "max-video-preview": -1 } }
    : { index: false, follow: true, googleBot: { index: false, follow: true } };
}

/** Her dil kendi adresini canonical gösterir; tüm diller hreflang ile birbirine bağlanır (x-default: Türkçe). */
export function canonicalAlternates(pathname: string, locale: Locale = DEFAULT_LOCALE): Metadata["alternates"] {
  const languages: Record<string, string> = {};
  for (const item of LOCALES) languages[LOCALE_LABELS[item].intl] = absoluteUrl(localizeHref(pathname, item));
  languages["x-default"] = absoluteUrl(localizeHref(pathname, DEFAULT_LOCALE));
  return { canonical: absoluteUrl(localizeHref(pathname, locale)), languages };
}

export function createPublicMetadata({
  title,
  description,
  pathname,
  keywords,
  image = DEFAULT_OG_IMAGE.url,
  imageAlt,
  imageWidth,
  imageHeight,
  type = "website",
  noindex = false,
  locale = DEFAULT_LOCALE,
}: PublicMetadataInput): Metadata {
  const canonical = absoluteUrl(localizeHref(pathname, locale));
  const text = fitDescription(description, 160);
  const ogTitle = `${title} | ${SITE_NAME}`;
  const images = image === null
    ? undefined
    : [{
      url: image,
      width: imageWidth ?? (image === DEFAULT_OG_IMAGE.url ? DEFAULT_OG_IMAGE.width : undefined),
      height: imageHeight ?? (image === DEFAULT_OG_IMAGE.url ? DEFAULT_OG_IMAGE.height : undefined),
      alt: imageAlt ?? title,
    }];

  return {
    title,
    description: text,
    ...(keywords && keywords.length ? { keywords } : {}),
    alternates: canonicalAlternates(pathname, locale),
    robots: robotsFor(!noindex),
    openGraph: {
      title: ogTitle,
      description: text,
      url: canonical,
      type,
      locale: LOCALE_LABELS[locale].og,
      alternateLocale: LOCALES.filter((item) => item !== locale).map((item) => LOCALE_LABELS[item].og),
      siteName: SITE_NAME,
      ...(images ? { images } : {}),
    },
    twitter: {
      card: "summary_large_image",
      title: ogTitle,
      description: text,
      ...(images ? { images: images.map((item) => item.url) } : {}),
    },
  };
}

/** Geriye dönük uyumluluk: JSON-LD'yi `<script>` içine güvenle yazar. */
export function safeJsonLd(value: unknown) {
  return serializeJsonLd(value);
}
