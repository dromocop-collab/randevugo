import { cache } from "react";
import { getBusinessBySlug } from "@/features/businesses/business-repository";
import { withTimeout } from "@/lib/with-timeout";

/** Aynı istek içinde metadata, layout ve sayfa işletmeyi tek sorguyla paylaşır; veritabanı yanıt vermezse 8 sn'de vazgeçer. */
export const getBusinessBySlugCached = cache((slug: string) => withTimeout(getBusinessBySlug(slug), 8_000, "İşletme sorgusu"));
