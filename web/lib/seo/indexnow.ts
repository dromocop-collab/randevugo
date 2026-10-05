import { SITE_URL } from "@/lib/seo/site";

/**
 * IndexNow (Bing, Yandex, Seznam, Naver): değişen adresleri arama motorlarına anında bildirir.
 * Google IndexNow kullanmaz; Google için sitemap + Search Console yeterlidir.
 *
 * Ortam değişkenleri:
 *  - INDEXNOW_KEY: 8–128 karakter [a-zA-Z0-9-]. /indexnow.txt bu anahtarı yayınlar.
 *  - INDEXNOW_SECRET: /api/indexnow çağrısını yetkilendiren gizli değer.
 */
export function indexNowKey(): string | null {
  const key = process.env.INDEXNOW_KEY?.trim();
  return key && /^[A-Za-z0-9-]{8,128}$/.test(key) ? key : null;
}

export function sameSiteUrls(urls: unknown[]): string[] {
  const host = new URL(SITE_URL).host;
  return [...new Set(urls.filter((value): value is string => typeof value === "string").filter((value) => {
    try { return new URL(value).host === host; } catch { return false; }
  }))].slice(0, 10_000);
}

export async function submitIndexNow(urls: string[]): Promise<{ ok: boolean; status: number; submitted: number }> {
  const key = indexNowKey();
  const list = sameSiteUrls(urls);
  if (!key || list.length === 0) return { ok: false, status: 0, submitted: 0 };
  const response = await fetch("https://api.indexnow.org/indexnow", {
    method: "POST",
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify({ host: new URL(SITE_URL).host, key, keyLocation: `${SITE_URL}/indexnow.txt`, urlList: list }),
  });
  return { ok: response.ok, status: response.status, submitted: list.length };
}
