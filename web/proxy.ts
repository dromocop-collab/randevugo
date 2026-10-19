import { NextResponse, type NextRequest } from "next/server";
import { DEFAULT_LOCALE, LOCALES, LOCALE_COOKIE, isLocaleBypassPath } from "@/i18n/config";

const CANONICAL_HOST = "seninrandevun.com";
const WWW_HOST = `www.${CANONICAL_HOST}`;

/**
 * 1) www.seninrandevun.com → seninrandevun.com (kalıcı). App Hosting gerçek alan adını x-forwarded-host ile iletir.
 *    Yanıt önbelleğe alınmaz: CDN www ve çıplak alan adını aynı anahtarla saklarsa yönlendirme döngüsü oluşmasın.
 * 2) Dil: sayfalar app/[lang]/ altında. Önekiz adresler (Türkçe) içeride /tr/... olarak yeniden yazılır;
 *    /en/... gibi önekli adresler olduğu gibi geçer. Görünen adres hiç değişmez.
 */
export function proxy(request: NextRequest) {
  const forwarded = request.headers.get("x-forwarded-host")?.split(",")[0]?.trim().toLowerCase();
  const host = (forwarded || request.headers.get("host") || "").replace(/:\d+$/, "").toLowerCase();
  if (host === WWW_HOST) {
    const target = new URL(request.nextUrl.pathname + request.nextUrl.search, `https://${CANONICAL_HOST}`);
    const response = NextResponse.redirect(target, 308);
    response.headers.set("Cache-Control", "private, no-store");
    response.headers.set("Vary", "Host, X-Forwarded-Host");
    return response;
  }

  const { pathname } = request.nextUrl;
  if (isLocaleBypassPath(pathname)) return NextResponse.next();

  const prefixed = LOCALES.find((locale) => pathname === `/${locale}` || pathname.startsWith(`/${locale}/`));
  // Next meta görselleri (opengraph-image, twitter-image, icon) içeride /tr/... adresiyle üretilir; yönlendirmeden sun.
  if (prefixed === DEFAULT_LOCALE && /\/(opengraph-image|twitter-image|icon|apple-icon)(-[\w-]+)?$/.test(pathname)) return NextResponse.next();
  if (prefixed === DEFAULT_LOCALE) {
    // /tr/kesfet → /kesfet (Türkçenin tek adresi önekizdir; çift içerik oluşmasın).
    const target = request.nextUrl.clone();
    target.pathname = pathname.slice(DEFAULT_LOCALE.length + 1) || "/";
    return NextResponse.redirect(target, 308);
  }
  if (prefixed) {
    const response = NextResponse.next();
    // Bilinçli seçimi hatırla (önekiz Türkçe adrese gelince istemci betiği buna bakar).
    if (request.cookies.get(LOCALE_COOKIE)?.value !== prefixed) {
      response.cookies.set(LOCALE_COOKIE, prefixed, { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" });
    }
    return response;
  }

  const rewritten = request.nextUrl.clone();
  rewritten.pathname = `/${DEFAULT_LOCALE}${pathname === "/" ? "" : pathname}`;
  return NextResponse.rewrite(rewritten);
}

export const config = {
  // Statik dosyalar ve görsel optimizasyonu hariç her istek.
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
