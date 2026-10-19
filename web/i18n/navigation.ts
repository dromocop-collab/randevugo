"use client";

import { usePathname as useNextPathname, useRouter as useNextRouter } from "next/navigation";
import { useMemo } from "react";
import { localizeHref, splitLocale } from "./config";
import { useLocale } from "./client";

/** Dil öneki olmadan yol: "/en/dashboard/ayarlar" → "/dashboard/ayarlar" (eski karşılaştırmalar aynen çalışır). */
export function usePathname(): string {
  const pathname = useNextPathname();
  return splitLocale(pathname ?? "/").path;
}

/** next/navigation useRouter; push/replace/prefetch site içi yolları geçerli dile göre yazar. */
export function useRouter(): ReturnType<typeof useNextRouter> {
  const router = useNextRouter();
  const locale = useLocale();
  return useMemo(() => ({
    ...router,
    push: (href: string, options?: Parameters<typeof router.push>[1]) => router.push(localizeHref(href, locale), options),
    replace: (href: string, options?: Parameters<typeof router.replace>[1]) => router.replace(localizeHref(href, locale), options),
    prefetch: (href: string, options?: Parameters<typeof router.prefetch>[1]) => router.prefetch(localizeHref(href, locale), options),
  }), [router, locale]);
}

/** window.location ile tam sayfa geçişler için: localizedLocation("/giris"). */
export function useLocalizeHref(): (href: string) => string {
  const locale = useLocale();
  return (href: string) => localizeHref(href, locale);
}
