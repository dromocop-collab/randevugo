/* SeninRandevun İşletme / Yönetim PWA service worker.
 *
 * Bilerek minimal: HİÇBİR sayfa, kod veya veri önbelleğe alınmaz (yayından sonra eski sürüm takılması olmasın).
 * Yalnız sayfa gezinmesi ağda başarısız olursa kendi içindeki "Bağlantı yok" sayfasını döndürür.
 * Bildirimler bu dosyada DEĞİL: /firebase-messaging-sw.js kendi kapsamında (/firebase-cloud-messaging-push-scope) çalışır.
 *
 * ACİL DURDURMA: KILL_SWITCH = true yapıp yayınlamak tüm cihazlarda bu SW'yi kaldırır.
 */
const KILL_SWITCH = false;
const VERSION = "2026-10-14";

self.addEventListener("install", () => self.skipWaiting());

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    if (KILL_SWITCH) {
      await self.registration.unregister();
      const windows = await self.clients.matchAll({ type: "window" });
      windows.forEach((client) => client.navigate(client.url).catch(() => undefined));
      return;
    }
    // Önceki sürümlerden kalabilecek önbellekleri temizle (bu sürüm önbellek kullanmaz).
    const keys = await caches.keys();
    await Promise.all(keys.filter((key) => key.startsWith("sr-app-")).map((key) => caches.delete(key)));
    await self.clients.claim();
  })());
});

const OFFLINE_HTML = `<!doctype html><html lang="tr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>Bağlantı yok · SeninRandevun</title><meta name="theme-color" content="#0b6b45">
<style>
:root{color-scheme:light dark;--bg:#f3f6f4;--card:#fff;--ink:#10241c;--muted:#5b6b63;--core:#0b6b45}
@media (prefers-color-scheme:dark){:root{--bg:#0f1b16;--card:#15241d;--ink:#eef6f0;--muted:#9fb3a8;--core:#2fae74}}
*{box-sizing:border-box}body{margin:0;min-height:100vh;display:grid;place-items:center;padding:24px;background:var(--bg);color:var(--ink);font:16px/1.5 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif}
main{width:min(420px,100%);padding:28px 24px;border-radius:24px;background:var(--card);text-align:center;box-shadow:0 10px 30px rgb(0 0 0 / .08)}
img{width:72px;height:72px;border-radius:18px}h1{margin:16px 0 6px;font-size:21px}p{margin:0 0 20px;color:var(--muted);font-size:14.5px}
a{display:inline-block;padding:12px 20px;border-radius:14px;background:var(--core);color:#fff;font-weight:700;text-decoration:none}
</style></head><body><main>
<img src="/pwa/icon-192.png" alt="" onerror="this.remove()">
<h1>İnternet bağlantısı yok</h1>
<p>Randevu ve işletme bilgileri her zaman canlı gösterilir. Bağlantınız gelince kaldığınız yerden devam edebilirsiniz.</p>
<a href="" onclick="location.reload();return false">Tekrar dene</a>
</main><script>addEventListener("online",()=>location.reload())</script></body></html>`;

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (KILL_SWITCH || request.mode !== "navigate" || request.method !== "GET") return;
  event.respondWith(
    fetch(request).catch(() => new Response(OFFLINE_HTML, {
      status: 503,
      headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store", "X-SR-Offline": VERSION },
    })),
  );
});
