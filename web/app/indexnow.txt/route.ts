import { indexNowKey } from "@/lib/seo/indexnow";

/** IndexNow anahtar dosyası; anahtar tanımlı değilse 404. */
export function GET() {
  const key = indexNowKey();
  if (!key) return new Response("Not found", { status: 404 });
  return new Response(key, { headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "public, max-age=3600" } });
}
