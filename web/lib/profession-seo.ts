import type { Metadata } from "next";
import { seoCategory } from "@/lib/seo/categories";
import { createPublicMetadata } from "@/lib/seo/metadata";

type ProfessionMetadataInput = {
  /** Sayfadaki h1; meta başlık verilmezse o kullanılır. */
  title: string;
  description: string;
  pathname: string;
  category?: string;
  /** Arama sonucu başlığı (marka şablonla eklenir). */
  metaTitle?: string;
  /** 140–160 karakterlik arama sonucu açıklaması. */
  metaDescription?: string;
};

/** Kategori tanıtım sayfaları. Paylaşım görseli aynı klasördeki opengraph-image dosyasından gelir. */
export function createProfessionMetadata(content: ProfessionMetadataInput): Metadata {
  const category = seoCategory(content.category);
  const noun = category?.noun ?? "online";
  return createPublicMetadata({
    title: content.metaTitle ?? content.title,
    description: content.metaDescription ?? content.description,
    pathname: content.pathname,
    keywords: category ? [`${noun} randevu`, `online ${noun} randevusu`, `yakınımdaki ${noun}`, `${noun} fiyatları`] : undefined,
    image: null,
  });
}
