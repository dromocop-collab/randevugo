import { expect, test, type APIRequestContext, type Page } from "@playwright/test";

/**
 * Site-wide health sweep for every public route.
 *
 * Per route and device (projects in playwright.config.ts):
 *  - responds 200 (or lands on the intended redirect target)
 *  - no uncaught page errors
 *  - no console errors / failed same-origin requests
 *    (Firebase offline / permission noise is tolerated only when live data is
 *    unavailable, e.g. CI running against the demo Firebase project)
 *  - no horizontal overflow, measured 300ms and 1500ms after load
 *  - non-empty <title>, exactly one <h1>, every <img> has an alt attribute
 *  - every internal <a href> resolves (< 400)
 * Plus robots.txt, sitemap.xml and the URLs listed in the sitemap.
 *
 * Data-dependent routes (real businesses / cities) only run when the server can
 * reach Firestore, detected by the sitemap listing at least one /isletme/ page.
 */

type RouteSpec = {
  path: string;
  /** Needs real Firestore data (skipped when the server is offline). */
  live?: boolean;
  /** Expected final pathname after redirects. */
  redirectTo?: string;
};

const STATIC_ROUTES = [
  "/",
  "/berber-randevu",
  "/cerez-politikasi",
  "/danismanlik-randevu",
  "/fiyatlar",
  "/giris",
  "/gizlilik",
  "/guvenlik",
  "/guzellik-merkezi-randevu",
  "/hakkimizda",
  "/iletisim",
  "/isletmeler",
  "/isletmeler/giris",
  "/isletmeler/kayit",
  "/isletmeler/yardim",
  "/kategoriler",
  "/anket",
  "/kayit",
  "/kesfet",
  "/kuafor-randevu",
  "/kullanim-kosullari",
  "/kvkk",
  "/mobil-uygulama",
  "/mugla",
  "/musteri/giris",
  "/musteri/kayit",
  "/nail-studio-randevu",
  "/online-randevu",
  "/ozellikler",
  "/saglik-randevu",
  "/sifremi-unuttum",
  "/simdi-musait",
  "/siram",
  "/spa-randevu",
  "/spor-randevu",
  "/veteriner-randevu",
  "/yardim-merkezi",
  "/yazilim-web-randevu",
];

/**
 * Paths whose server render needs Firestore. When the backend is unreachable
 * (CI) they are slow (SSR Firestore reads retry for 15-60s), so the link crawl
 * skips them instead of timing out.
 */
const DATA_DEPENDENT_PATH = /^\/(isletme|sehir|randevu)\/|^\/mugla\/fethiye\/[^/]+/;

const LIVE_BUSINESS = process.env.E2E_BUSINESS_SLUG ?? "erdem-kuafor";
const LIVE_CITY = process.env.E2E_CITY_SLUG ?? "mugla";

const ROUTES: RouteSpec[] = [
  ...STATIC_ROUTES.map((path) => ({ path })),
  { path: `/isletme/${LIVE_BUSINESS}`, live: true },
  { path: `/isletme/${LIVE_BUSINESS}/randevu`, live: true },
  { path: `/isletme/${LIVE_BUSINESS}/canli-sira`, live: true },
  { path: `/sehir/${LIVE_CITY}`, live: true },
  { path: `/sehir/${LIVE_CITY}/kuafor`, live: true },
  // Server-rendered from Firestore; without a reachable backend SSR waits ~30s per request.
  { path: "/mugla/fethiye", live: true },
  { path: "/mugla/fethiye/kuafor", live: true },
  { path: `/${LIVE_BUSINESS}`, live: true, redirectTo: `/isletme/${LIVE_BUSINESS}` },
];

/** Short aliases configured in next.config.ts redirects(). */
const REDIRECTS: Array<[string, string]> = [
  ["/yardim", "/yardim-merkezi"],
  ["/destek", "/yardim-merkezi"],
  ["/ios", "/mobil-uygulama"],
  ["/android", "/mobil-uygulama"],
  ["/uygulama", "/mobil-uygulama"],
  ["/magazalar", "/kesfet"],
  ["/randevularim", "/hesabim"],
];

/** Console / network noise caused by Firebase being unreachable or the demo project. */
const OFFLINE_NOISE = [
  /firestore/i,
  /firebase/i,
  /googleapis\.com/i,
  /cloudfunctions\.net/i,
  /access control checks/i,
  /Access-Control-Allow-Origin/i,
  /gstatic\.com/i,
  /recaptcha/i,
  /app[- ]?check/i,
  /permission[-_ ]denied/i,
  /missing or insufficient permissions/i,
  /api key not valid/i,
  /invalid[-_ ]api[-_ ]key/i,
  /network[-_ ]request[-_ ]failed/i,
  /installations/i,
  /messaging/i,
  /ERR_NAME_NOT_RESOLVED|ERR_INTERNET_DISCONNECTED|ERR_CONNECTION/i,
  /\/_next\/image\?/i,
  /WebChannelConnection|transport errored/i,
];

/** Always-benign browser noise unrelated to the app. */
const ALWAYS_IGNORED = [
  /Download the React DevTools/i,
  /\[Fast Refresh\]/i,
  /\[HMR\]/i,
  // Firestore SDK logs this at error level when a listener's connection drops
  // during navigation; it reconnects on its own.
  /Could not reach Cloud Firestore backend/i,
];

// ---------------------------------------------------------------- helpers

let liveDataProbe: Promise<boolean> | undefined;
function hasLiveData(request: APIRequestContext): Promise<boolean> {
  if (process.env.E2E_LIVE_DATA === "0") return Promise.resolve(false);
  if (process.env.E2E_LIVE_DATA === "1") return Promise.resolve(true);
  liveDataProbe ??= request
    .get("/sitemap.xml", { timeout: 30_000 })
    .then(async (res) => res.ok() && /\/isletme\//.test(await res.text()))
    .catch(() => false);
  return liveDataProbe;
}

/**
 * Next streams a 200 shell when a route segment has loading.tsx, so notFound()
 * thrown later still ends up as HTTP 200 ("soft 404"). The RSC payload keeps
 * this digest, which we treat as a 404.
 */
const SOFT_404_MARKER = "NEXT_HTTP_ERROR_FALLBACK;404";
const SOFT_404 = 1404;

const linkStatusCache = new Map<string, Promise<number>>();
function linkStatus(request: APIRequestContext, url: string): Promise<number> {
  let pending = linkStatusCache.get(url);
  if (!pending) {
    pending = (async () => {
      for (let attempt = 0; attempt < 2; attempt += 1) {
        try {
          const res = await request.get(url, { maxRedirects: 5, timeout: 30_000 });
          const type = res.headers()["content-type"] ?? "";
          if (res.status() === 200 && type.includes("text/html") && (await res.text()).includes(SOFT_404_MARKER)) {
            return SOFT_404;
          }
          return res.status();
        } catch {
          // retry once on transient network errors
        }
      }
      return 0;
    })();
    linkStatusCache.set(url, pending);
  }
  return pending;
}

async function mapLimit<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (next < items.length) {
        const index = next++;
        results[index] = await fn(items[index]);
      }
    }),
  );
  return results;
}

type OverflowReport = {
  scrollWidth: number;
  clientWidth: number;
  offenders: Array<{ selector: string; right: number; width: number; text: string }>;
};

/**
 * Measures horizontal overflow and names the deepest elements sticking out.
 *
 * `unmask: false` – plain document scroll width (what the user can scroll to).
 * `unmask: true`  – body / page wrappers use `overflow-x: clip` as a safety net,
 *   which hides overflow by cutting content off instead of fixing it. This mode
 *   lifts the clip on the ancestors of <main> for a moment and lists every
 *   non-decorative element that would leave the viewport (i.e. is cut off).
 */
function measureOverflow(page: Page, unmask = false): Promise<OverflowReport> {
  return page.evaluate((unmaskClip) => {
    const doc = document.documentElement;
    const clientWidth = doc.clientWidth;
    const restore: Array<() => void> = [];
    if (unmaskClip) {
      const start = document.querySelector("main") ?? document.body.firstElementChild ?? document.body;
      for (let node: HTMLElement | null = start.parentElement; node; node = node.parentElement) {
        if (/(hidden|clip)/.test(getComputedStyle(node).overflowX)) {
          const previous = node.style.getPropertyValue("overflow-x");
          const priority = node.style.getPropertyPriority("overflow-x");
          node.style.setProperty("overflow-x", "visible", "important");
          const target = node;
          restore.push(() => target.style.setProperty("overflow-x", previous, priority));
        }
      }
    }

    try {
      const scrollWidth = Math.max(doc.scrollWidth, document.body?.scrollWidth ?? 0);
      const offenders: Array<{ selector: string; right: number; width: number; text: string }> = [];
      if (!unmaskClip && scrollWidth <= clientWidth + 1) return { scrollWidth, clientWidth, offenders };

      const describe = (el: Element) => {
        const parts: string[] = [];
        let node: Element | null = el;
        while (node && node !== document.body && parts.length < 4) {
          let part = node.tagName.toLowerCase();
          if (node.id) {
            parts.unshift(`${part}#${node.id}`);
            break;
          }
          const classes = Array.from(node.classList).filter((c) => !c.includes(":")).slice(0, 2);
          if (classes.length) part += `.${classes.map((c) => CSS.escape(c)).join(".")}`;
          const parent: Element | null = node.parentElement;
          if (parent) {
            const same = Array.from(parent.children).filter((c) => c.tagName === node!.tagName);
            if (same.length > 1) part += `:nth-of-type(${same.indexOf(node) + 1})`;
          }
          parts.unshift(part);
          node = parent;
        }
        return parts.join(" > ");
      };

      const sticksOut = (el: Element) => {
        const rect = el.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) return false;
        if (rect.right <= clientWidth + 1) return false;
        if (unmaskClip) {
          // Decorative layers (blobs, glows, cursors) are allowed to bleed out.
          if (el.closest("[aria-hidden='true'], [role='presentation']")) return false;
          const style = getComputedStyle(el);
          if (style.position === "fixed" || style.visibility === "hidden" || style.opacity === "0") return false;
        }
        for (let p = el.parentElement; p && p !== document.body && p !== doc; p = p.parentElement) {
          if (/(hidden|clip|auto|scroll)/.test(getComputedStyle(p).overflowX)) return false;
        }
        return true;
      };

      const all = Array.from(document.body.querySelectorAll("*")).filter(sticksOut);
      const set = new Set(all);
      const deepest = all.filter((el) => !Array.from(el.querySelectorAll("*")).some((c) => set.has(c)));
      for (const el of deepest.slice(0, 6)) {
        const rect = el.getBoundingClientRect();
        offenders.push({
          selector: describe(el),
          right: Math.round(rect.right),
          width: Math.round(rect.width),
          text: (el.textContent ?? "").replace(/\s+/g, " ").trim().slice(0, 60),
        });
      }
      return { scrollWidth, clientWidth, offenders };
    } finally {
      for (const undo of restore.reverse()) undo();
    }
  }, unmask);
}

function describeStatus(status: number) {
  if (status === 0) return "network error";
  if (status === SOFT_404) return "soft-404 (200 + not-found)";
  return String(status);
}

function formatOverflow(label: string, report: OverflowReport) {
  return `${label}: scrollWidth ${report.scrollWidth} > clientWidth ${report.clientWidth}\n${report.offenders
    .map((o) => `  - ${o.selector} (right=${o.right}px width=${o.width}px) "${o.text}"`)
    .join("\n")}`;
}

// ---------------------------------------------------------------- tests

test.describe("site health: public routes", () => {
  test.describe.configure({ retries: process.env.CI ? 2 : 1 });

  for (const route of ROUTES) {
    test(`${route.path}`, async ({ page, request, baseURL }, testInfo) => {
      testInfo.setTimeout(90_000);
      const live = await hasLiveData(request);
      test.skip(Boolean(route.live) && !live, "needs live Firestore data");

      const origin = new URL(baseURL!).origin;
      const tolerated = live ? ALWAYS_IGNORED : [...ALWAYS_IGNORED, ...OFFLINE_NOISE];
      const isTolerated = (text: string) => tolerated.some((re) => re.test(text));

      const pageErrors: string[] = [];
      const consoleErrors: string[] = [];
      const failedRequests: string[] = [];
      page.on("pageerror", (error) => {
        const text = `${error.name}: ${error.message}`;
        if (!isTolerated(text)) pageErrors.push(text);
      });
      page.on("console", (message) => {
        if (message.type() !== "error") return;
        const location = message.location();
        const text = `${message.text()}${location?.url ? ` @ ${location.url}:${location.lineNumber}` : ""}`;
        if (!isTolerated(text)) consoleErrors.push(text);
      });
      page.on("response", (response) => {
        const url = response.url();
        if (!url.startsWith(origin) || response.status() < 400) return;
        const text = `${response.status()} ${response.request().method()} ${url}`;
        if (!isTolerated(text)) failedRequests.push(text);
      });

      const response = await page.goto(route.path, { waitUntil: "load", timeout: 60_000 });
      expect(response, `${route.path} should return a response`).not.toBeNull();
      if (route.redirectTo) {
        const head = await request.get(route.path, { maxRedirects: 0 });
        expect
          .soft(head.status(), `${route.path} should answer with a real HTTP redirect to ${route.redirectTo}, not 200 + meta refresh`)
          .toBe(308);
        await page.waitForURL((url) => url.pathname === route.redirectTo, { timeout: 15_000 });
        await page.waitForLoadState("load");
      }
      const finalPath = new URL(page.url()).pathname;
      if (route.redirectTo) {
        expect(finalPath, `${route.path} should redirect`).toBe(route.redirectTo);
      } else {
        expect(finalPath.replace(/\/$/, "") || "/", `${route.path} should not redirect`).toBe(route.path);
      }
      if (!route.redirectTo) expect(response!.status(), `${route.path} HTTP status`).toBe(200);
      expect
        .soft(await page.content().then((html) => html.includes(SOFT_404_MARKER)), `${route.path} rendered not-found`)
        .toBe(false);

      // Overflow after first paint settles and after late content (fonts, data, animations).
      await page.waitForTimeout(300);
      const early = await measureOverflow(page);
      await page.waitForTimeout(1200);
      const late = await measureOverflow(page);
      expect.soft(early.scrollWidth, formatOverflow("overflow @300ms", early)).toBeLessThanOrEqual(early.clientWidth + 1);
      expect.soft(late.scrollWidth, formatOverflow("overflow @1500ms", late)).toBeLessThanOrEqual(late.clientWidth + 1);
      const clipped = await measureOverflow(page, true);
      expect
        .soft(
          clipped.offenders,
          `content cut off by page-level overflow-x clip (viewport ${clipped.clientWidth}px):\n${clipped.offenders
            .map((o) => `  - ${o.selector} (right=${o.right}px width=${o.width}px) "${o.text}"`)
            .join("\n")}`,
        )
        .toEqual([]);

      // Client-rendered pages (booking wizard) may still show a skeleton; give them a moment.
      await page
        .waitForFunction(() => document.querySelector("h1") !== null && !document.querySelector("main[aria-busy='true']"), undefined, {
          timeout: 20_000,
        })
        .catch(() => {});
      const stillLoading = await page.locator("main[aria-busy='true']").count();
      expect.soft(stillLoading, `${route.path} still shows its loading skeleton after 20s`).toBe(0);
      const structure = await page.evaluate(() => ({
        title: document.title.trim(),
        h1: Array.from(document.querySelectorAll("h1")).map((h) => (h.textContent ?? "").replace(/\s+/g, " ").trim().slice(0, 80)),
        imagesWithoutAlt: Array.from(document.querySelectorAll("img:not([alt])")).map(
          (img) => (img as HTMLImageElement).currentSrc || img.getAttribute("src") || "(no src)",
        ),
      }));
      expect.soft(structure.title, "document <title>").not.toBe("");
      expect.soft(structure.h1, `exactly one <h1> (found ${structure.h1.length})`).toHaveLength(1);
      expect.soft(structure.imagesWithoutAlt, "images missing alt attribute").toEqual([]);

      expect.soft(pageErrors, "uncaught page errors").toEqual([]);
      expect.soft(consoleErrors, "console errors").toEqual([]);
      expect.soft(failedRequests, "failed same-origin requests").toEqual([]);

      // Internal link crawl.
      const hrefs = await page.$$eval("a[href]", (anchors) => anchors.map((a) => (a as HTMLAnchorElement).href));
      const internal = Array.from(
        new Set(
          hrefs
            .map((href) => {
              try {
                const url = new URL(href);
                url.hash = "";
                return url;
              } catch {
                return null;
              }
            })
            .filter((url): url is URL => Boolean(url && url.origin === origin))
            .map((url) => url.toString()),
        ),
      ).sort();
      const checkable = live ? internal : internal.filter((url) => !DATA_DEPENDENT_PATH.test(new URL(url).pathname));
      const statuses = await mapLimit(checkable, 6, (url) => linkStatus(request, url));
      const broken = checkable
        .map((url, index) => ({ url: url.replace(origin, ""), status: statuses[index] }))
        .filter(({ status }) => status === 0 || status >= 400)
        .map(({ url, status }) => `${describeStatus(status)} ${url}`);
      expect.soft(broken, `broken internal links on ${route.path}`).toEqual([]);
    });
  }
});

test.describe("site health: redirects, robots, sitemap", () => {
  test.skip(({ browserName }) => browserName !== "chromium", "HTTP-only checks run once");

  for (const [from, to] of REDIRECTS) {
    test(`redirect ${from} -> ${to}`, async ({ request }) => {
      const res = await request.get(from, { maxRedirects: 0 });
      expect([301, 307, 308]).toContain(res.status());
      expect(new URL(res.headers()["location"] ?? "", "http://x").pathname).toBe(to);
    });
  }

  /** Unknown URLs must answer with a real 404 so search engines drop them. */
  for (const path of [
    "/bu-sayfa-yok-e2e",
    "/isletme/bu-isletme-yok-e2e",
    "/isletme/bu-isletme-yok-e2e/randevu",
    "/sehir/bu-sehir-yok-e2e",
    "/mugla/fethiye/bu-kategori-yok-e2e",
  ]) {
    test(`unknown ${path} returns 404`, async ({ request }) => {
      test.setTimeout(90_000);
      test.skip(DATA_DEPENDENT_PATH.test(path) && !(await hasLiveData(request)), "needs live Firestore data");
      const res = await request.get(path, { maxRedirects: 0, timeout: 75_000 });
      const body = await res.text();
      expect(
        { status: res.status(), rendersNotFound: res.status() === 404 || body.includes(SOFT_404_MARKER) },
        "unknown URL should be a hard 404",
      ).toEqual({ status: 404, rendersNotFound: true });
    });
  }

  test("robots.txt", async ({ request }) => {
    const res = await request.get("/robots.txt");
    expect(res.status()).toBe(200);
    const body = await res.text();
    expect(body).toMatch(/User-Agent:\s*\*/i);
    expect(body).toMatch(/Sitemap:\s*https?:\/\/\S+\/sitemap\.xml/i);
  });

  test("sitemap.xml and its URLs", async ({ request, baseURL }) => {
    test.setTimeout(180_000);
    const res = await request.get("/sitemap.xml");
    expect(res.status()).toBe(200);
    const xml = await res.text();
    const locs = Array.from(xml.matchAll(/<loc>([^<]+)<\/loc>/g), (m) => m[1].replace(/&amp;/g, "&"));
    expect(locs.length, "sitemap should list URLs").toBeGreaterThan(10);

    // Sitemap uses the canonical production origin; check the same paths on the server under test.
    const MAX = 80;
    const step = Math.max(1, Math.ceil(locs.length / MAX));
    const sample = locs.filter((_, index) => index % step === 0);
    const targets = sample.map((loc) => {
      const url = new URL(loc);
      return new URL(url.pathname + url.search, baseURL).toString();
    });
    const statuses = await mapLimit(targets, 6, (url) => linkStatus(request, url));
    const broken = sample
      .map((loc, index) => ({ loc, status: statuses[index] }))
      .filter(({ status }) => status !== 200)
      .map(({ loc, status }) => `${describeStatus(status)} ${loc}`);
    expect(broken, "sitemap URLs not returning 200").toEqual([]);
  });
});
