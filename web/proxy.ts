import { NextResponse, type NextRequest } from "next/server";

const CANONICAL_HOST = "seninrandevun.com";
const WWW_HOST = `www.${CANONICAL_HOST}`;

// www.seninrandevun.com → seninrandevun.com (kalıcı). App Hosting gerçek alan adını x-forwarded-host ile iletir.
// Yanıt önbelleğe alınmaz: CDN www ve çıplak alan adını aynı anahtarla saklarsa yönlendirme döngüsü oluşmasın.
export function proxy(request: NextRequest) {
  const forwarded = request.headers.get("x-forwarded-host")?.split(",")[0]?.trim().toLowerCase();
  const host = (forwarded || request.headers.get("host") || "").replace(/:\d+$/, "").toLowerCase();
  if (host !== WWW_HOST) return NextResponse.next();

  const target = new URL(request.nextUrl.pathname + request.nextUrl.search, `https://${CANONICAL_HOST}`);
  const response = NextResponse.redirect(target, 308);
  response.headers.set("Cache-Control", "private, no-store");
  response.headers.set("Vary", "Host, X-Forwarded-Host");
  return response;
}

export const config = {
  // Statik dosyalar ve görsel optimizasyonu hariç her istek.
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
