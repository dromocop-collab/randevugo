import { cache } from "react";
import { getBusinessBySlug } from "@/features/businesses/business-repository";

/** Aynı istek içinde metadata, layout ve sayfa işletmeyi tek sorguyla paylaşır. */
export const getBusinessBySlugCached = cache((slug: string) => getBusinessBySlug(slug));
