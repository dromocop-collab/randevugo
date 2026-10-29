// Veri çekme botları — proxy.ts (403) ve robots.ts (Disallow) ortak listesi. Test: bot-policy.test.mjs
// Arama motorları (Googlebot, Bingbot, YandexBot…) ve bağlantı önizleyicileri (WhatsApp, Facebook, Telegram, X)
// SEO ve paylaşım için AÇIK kalır.

/** robots.txt'de tüm siteyi kapattığımız yapay zekâ / veri toplama / SEO tarayıcıları. */
export const BLOCKED_CRAWLERS = [
  "GPTBot", "ChatGPT-User", "OAI-SearchBot", "CCBot", "ClaudeBot", "Claude-Web", "anthropic-ai", "Google-Extended",
  "Bytespider", "Amazonbot", "PerplexityBot", "cohere-ai", "Diffbot", "ImagesiftBot", "Omgilibot", "Timpibot",
  "AhrefsBot", "SemrushBot", "MJ12bot", "DotBot", "DataForSeoBot", "PetalBot", "BLEXBot", "serpstatbot", "SeekportBot",
] as const;

/** Kütüphane/komut satırı istemcileri ve otomasyon araçları: gerçek tarayıcı değil. */
const SCRIPT_CLIENT = /(python-requests|python-urllib|python-httpx|aiohttp|scrapy|curl\/|wget\/|go-http-client|libwww-perl|java\/|apache-httpclient|node-fetch|undici|axios\/|got \(|phantomjs|headlesschrome|puppeteer|playwright|selenium|zgrab|masscan|nikto|sqlmap|nmap|httrack|colly)/i;
/** Başsız tarayıcıyla gelen ama izin verdiğimiz denetim araçları (Google render, PageSpeed). */
const ALLOWED_AUTOMATION = /(googlebot|google-inspectiontool|chrome-lighthouse|bingbot|adsbot-google|mediapartners-google)/i;
const CRAWLER_PATTERN = new RegExp(BLOCKED_CRAWLERS.map((name) => name.replace(/[.*+?^${}()|[\]\\-]/g, "\\$&")).join("|"), "i");

/** Bu kullanıcı aracısı sayfaları/uç noktaları kopyalamaya mı çalışıyor? Boş UA engellenmez (sağlık denetimleri). */
export function isBlockedUserAgent(userAgent: string | null | undefined): boolean {
  const ua = (userAgent ?? "").trim();
  if (!ua) return false;
  if (ALLOWED_AUTOMATION.test(ua)) return false;
  return CRAWLER_PATTERN.test(ua) || SCRIPT_CLIENT.test(ua);
}
