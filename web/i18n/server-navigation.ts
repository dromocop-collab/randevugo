import "server-only";
import { permanentRedirect as nextPermanentRedirect, redirect as nextRedirect } from "next/navigation";
import { localizeHref } from "./config";
import { getLocale } from "./server";

/** Sunucu bileşenlerinde dil korumalı yönlendirme. */
export async function redirect(href: string): Promise<never> {
  nextRedirect(localizeHref(href, await getLocale()));
}

export async function permanentRedirect(href: string): Promise<never> {
  nextPermanentRedirect(localizeHref(href, await getLocale()));
}

/** Sunucuda dile göre yol (meta veriler, JSON-LD, mutlak adresler). */
export async function localizedPath(href: string): Promise<string> {
  return localizeHref(href, await getLocale());
}
