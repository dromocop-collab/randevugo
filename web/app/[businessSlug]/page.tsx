import { permanentRedirect } from "next/navigation";

/**
 * Backward compatibility redirect.
 * Old route: /[businessSlug]
 * New route: /isletme/[slug]
 */
export default async function BusinessSlugRedirect({
  params,
}: {
  params: Promise<{ businessSlug: string }>;
}) {
  const { businessSlug } = await params;
  permanentRedirect(`/isletme/${encodeURIComponent(businessSlug)}`);
}
