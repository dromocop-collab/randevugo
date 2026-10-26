// Reklam/kaynak takibi (UTM). Siteye reklam linkiyle gelen ziyaretçinin utm_* / fbclid bilgisi tarayıcıda 30 gün tutulur
// ve işletme açılırken createBusiness'a gönderilir (sunucu: functions/src/ads-domain.ts sanitizeAttribution).
// Üçüncü tarafa gitmez; yalnız bizim sunucumuza, işletme açılırken.

const KEY = "sr_attribution";
const MAX_AGE_MS = 30 * 86_400_000;

export type StoredAttribution = {
  source: string | null;
  medium: string | null;
  campaign: string | null;
  content: string | null;
  term: string | null;
  clickId: "fbclid" | "gclid" | null;
  /** Meta tıklama kimliğinin değeri: Meta'ya "bu kayıt şu reklam tıklamasından" bildirmek için (fbc). */
  fbclid?: string | null;
  landingPath: string;
  referrerHost: string | null;
  capturedAt: number;
};

function referrerHost(): string | null {
  try {
    if (!document.referrer) return null;
    const host = new URL(document.referrer).hostname;
    return host && host !== window.location.hostname ? host.slice(0, 120) : null;
  } catch { return null; }
}

/** Sayfa açılışında çağrılır: linkte utm_* ya da fbclid/gclid varsa (son reklam tıklaması kazanır) kaydeder. */
export function captureAttribution() {
  try {
    const params = new URLSearchParams(window.location.search);
    const pick = (name: string) => params.get(name)?.trim().slice(0, 120) || null;
    const clickId = params.has("fbclid") ? "fbclid" : params.has("gclid") ? "gclid" : null;
    const source = pick("utm_source");
    const host = referrerHost();
    const hasCampaign = Boolean(source || clickId);
    const current = readAttribution();
    // UTM'siz ama sosyal ağdan gelen ziyaret: yalnız kayıt yoksa (organik Instagram/Facebook).
    const socialReferrer = !hasCampaign && host && /(^|\.)(instagram|facebook)\.com$/.test(host) && !current;
    if (!hasCampaign && !socialReferrer) return;
    const value: StoredAttribution = {
      source: source ?? (socialReferrer ? host : null),
      medium: pick("utm_medium") ?? (socialReferrer ? "social" : null),
      campaign: pick("utm_campaign"),
      content: pick("utm_content"),
      term: pick("utm_term"),
      clickId,
      fbclid: (params.get("fbclid") ?? "").trim().slice(0, 500) || null,
      landingPath: window.location.pathname.slice(0, 120),
      referrerHost: host,
      capturedAt: Date.now(),
    };
    window.localStorage.setItem(KEY, JSON.stringify(value));
  } catch { /* depolama kapalı olabilir */ }
}

export function readAttribution(): StoredAttribution | null {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return null;
    const value = JSON.parse(raw) as StoredAttribution;
    if (!value || typeof value.capturedAt !== "number" || Date.now() - value.capturedAt > MAX_AGE_MS) return null;
    return value;
  } catch { return null; }
}

/** Meta çerezleri (_fbp, _fbc) — yalnız pazarlama onayı verilip Pixel yüklendiyse vardır. */
export function readMetaCookies(): { fbp: string | null; fbc: string | null } {
  try {
    const read = (name: string) => document.cookie.split("; ").find((row) => row.startsWith(`${name}=`))?.slice(name.length + 1) ?? null;
    const stored = readAttribution();
    const fbc = read("_fbc") ?? (stored?.fbclid ? `fb.1.${stored.capturedAt}.${stored.fbclid}` : null);
    return { fbp: read("_fbp"), fbc };
  } catch { return { fbp: null, fbc: null }; }
}

/** Tarayıcı Pixel'i yüklüyse (onay verilmişse) olay gönderir; event_id sunucu bildirimiyle aynıdır (tekilleştirme). */
export function trackPixel(event: string, eventId: string) {
  try {
    const fbq = (window as unknown as { fbq?: (...args: unknown[]) => void }).fbq;
    if (typeof fbq === "function") fbq("track", event, {}, { eventID: eventId });
  } catch { /* Pixel yoksa sessiz */ }
}
