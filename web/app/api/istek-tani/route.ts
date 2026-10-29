// GEÇİCİ teşhis ucu (bot engeli için CDN'in ilettiği başlıklar) — kaldırılacak.
import { NextResponse, type NextRequest } from "next/server";

export const dynamic = "force-dynamic";

export function GET(request: NextRequest) {
  const names = [...request.headers.keys()].filter((name) => name !== "cookie" && name !== "authorization").sort();
  const pick = (name: string) => request.headers.get(name);
  return NextResponse.json({
    names,
    userAgent: pick("user-agent"),
    viaLike: Object.fromEntries(names.filter((name) => /agent|ua|client|original|forwarded|via/i.test(name)).map((name) => [name, pick(name)?.slice(0, 200)])),
  }, { headers: { "Cache-Control": "private, no-store" } });
}
