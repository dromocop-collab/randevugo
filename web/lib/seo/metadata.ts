import type { Metadata } from "next";
import { SITE_LOCALE, SITE_NAME, SITE_URL, absoluteUrl } from "@/lib/seo/site";
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
};

export function robotsFor(indexable: boolean): Metadata["robots"] {
  return indexable
    ? { index: true, follow: true, googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1, "max-video-preview": -1 } }
    : { index: false, follow: true, googleBot: { index: false, follow: true } };
}

export function canonicalAlternates(pathname: string): Metadata["alternates"] {
  const canonical = absoluteUrl(pathname);
  return { canonical, languages: { "tr-TR": canonical, "x-default": canonical } };
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
}: PublicMetadataInput): Metadata {
  const canonical = absoluteUrl(pathname);
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
    alternates: canonicalAlternates(pathname),
    robots: robotsFor(!noindex),
    openGraph: {
      title: ogTitle,
      description: text,
      url: canonical,
      type,
      locale: SITE_LOCALE,
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
