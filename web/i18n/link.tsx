"use client";

import NextLink from "next/link";
import { forwardRef, type ComponentProps } from "react";
import { localizeHref } from "./config";
import { useLocale } from "./client";

type Props = ComponentProps<typeof NextLink>;

/**
 * next/link yerine: site içi yolları geçerli dile göre yazar ("/kesfet" → İngilizcede "/en/kesfet").
 * Dış bağlantılar, #çapa ve dosya yolları olduğu gibi kalır. Sunucu bileşenlerinden de kullanılabilir.
 */
const Link = forwardRef<HTMLAnchorElement, Props>(function Link({ href, ...rest }, ref) {
  const locale = useLocale();
  const localized = typeof href === "string"
    ? localizeHref(href, locale)
    : href && typeof href === "object" && typeof href.pathname === "string"
      ? { ...href, pathname: localizeHref(href.pathname, locale) }
      : href;
  return <NextLink ref={ref} href={localized} {...rest} />;
});

export default Link;
