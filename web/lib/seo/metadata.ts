import type { Metadata } from "next";

export const SEO_SITE_URL = "https://seninrandevun.com";
export const SEO_SITE_NAME = "SeninRandevun";

type PublicMetadataInput = {
  title: string;
  description: string;
  pathname: string;
  keywords?: string[];
  image?: string;
  imageAlt?: string;
  imageWidth?: number;
  imageHeight?: number;
  type?: "website" | "article";
};

export function createPublicMetadata({
  title,
  description,
  pathname,
  keywords = [],
  image = "/og.png",
  imageAlt = title,
  imageWidth = 1729,
  imageHeight = 910,
  type = "website",
}: PublicMetadataInput): Metadata {
  const canonical = new URL(pathname, SEO_SITE_URL).toString();

  return {
    title,
    description,
    keywords,
    alternates: {
      canonical,
      languages: { "tr-TR": canonical, "x-default": canonical },
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        "max-image-preview": "large",
        "max-snippet": -1,
        "max-video-preview": -1,
      },
    },
    openGraph: {
      title,
      description,
      url: canonical,
      type,
      locale: "tr_TR",
      siteName: SEO_SITE_NAME,
      images: [{ url: image, width: imageWidth, height: imageHeight, alt: imageAlt }],
    },
    twitter: { card: "summary_large_image", title, description, images: [image] },
  };
}

export function safeJsonLd(value: unknown) {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}
