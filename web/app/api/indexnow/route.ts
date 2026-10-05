import { timingSafeEqual } from "node:crypto";
import sitemap from "@/app/sitemap";
import { indexNowKey, submitIndexNow } from "@/lib/seo/indexnow";

export const dynamic = "force-dynamic";

function authorized(request: Request) {
  const secret = process.env.INDEXNOW_SECRET ?? "";
  const header = request.headers.get("authorization") ?? "";
  const given = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (secret.length < 16 || given.length !== secret.length) return false;
  return timingSafeEqual(Buffer.from(given), Buffer.from(secret));
}

/**
 * POST /api/indexnow  (Authorization: Bearer $INDEXNOW_SECRET)
 * Gövde: { "urls": ["https://seninrandevun.com/isletme/..."] } — boşsa sitemap'teki tüm adresler gönderilir.
 */
export async function POST(request: Request) {
  if (!authorized(request)) return Response.json({ error: "unauthorized" }, { status: 401 });
  if (!indexNowKey()) return Response.json({ error: "INDEXNOW_KEY tanımlı değil" }, { status: 503 });
  const body = (await request.json().catch(() => ({}))) as { urls?: unknown };
  const urls = Array.isArray(body.urls) && body.urls.length > 0 ? body.urls : (await sitemap()).map((item) => item.url);
  const result = await submitIndexNow(urls);
  return Response.json(result, { status: result.ok ? 200 : 502 });
}
