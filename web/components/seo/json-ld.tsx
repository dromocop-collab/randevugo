import { serializeJsonLd } from "@/lib/seo/schema";

/** Sunucuda çizilen JSON-LD bloğu. */
export function JsonLd({ data }: { data: unknown }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(data) }} />;
}
