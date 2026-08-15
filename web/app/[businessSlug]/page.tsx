"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";

/**
 * Backward compatibility redirect.
 * Old route: /[businessSlug]
 * New route: /isletme/[slug]
 */
export default function BusinessSlugRedirect() {
  const params = useParams<{ businessSlug: string }>();
  const router = useRouter();

  useEffect(() => {
    if (params.businessSlug) {
      router.replace(`/isletme/${params.businessSlug}`);
    }
  }, [params.businessSlug, router]);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <p className="text-sm text-[var(--text-3)]">Yönlendiriliyor...</p>
    </div>
  );
}
