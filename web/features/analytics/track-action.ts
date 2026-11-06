import { getFunctions, httpsCallable } from "firebase/functions";
import { getFirebaseApp } from "@/lib/firebase/client";
import { readMetaCookies, trackPixel } from "@/features/attribution/attribution";

// Canlı izleme için ekran adımı (ör. randevu ekranında "booking:datetime"). Sunucu yalnız tanıdığı adımları kabul eder;
// sayım değil, süper admin canlı panelindeki "şu an ne yapıyor" bilgisi ve adım hunisi içindir. Hata sessizce yutulur.
let lastSent = "";

export function trackAction(action: string) {
  if (typeof window === "undefined" || navigator.webdriver) return;
  if (String(getFirebaseApp().options.projectId ?? "").startsWith("demo-")) return;
  const key = `${window.location.pathname}|${action}`;
  if (key === lastSent) return;
  lastSent = key;
  // Kayıt formunun son adımı (Hesap) = Lead, WhatsApp kayıt tıklaması = Contact: Meta'ya hem tarayıcıdan (onay varsa) hem sunucudan, aynı kimlikle.
  // Sunucu: functions/src/analytics-domain.ts LEAD_SIGNUP_ACTION.
  // "WhatsApp'tan kaydol" tıklaması = Contact (sunucu: META_ACTION_EVENTS).
  const metaEvent = action === "signup:3" ? "Lead" : action === "signup:whatsapp" ? "Contact" : null;
  const lead = metaEvent !== null;
  const eventId = metaEvent ? `${metaEvent.toLowerCase()}-${crypto.randomUUID()}` : undefined;
  if (metaEvent && eventId) trackPixel(metaEvent, eventId);
  // Sayfa görüntülemesi 700 ms gecikmeyle gider (page-view-tracker); adım ondan sonra kaydedilsin ki canlı panelde
  // yol "İşletme kaydı → Kategori seçiyor" sırasıyla görünsün. Yol şimdi alınır (yönlendirme sonrası değişmesin).
  const path = window.location.pathname;
  const payload = { type: "action", action, path, ...(lead ? { eventId, ...readMetaCookies() } : {}) };
  // Tıklama adımı (WhatsApp'a geçiş) beklemez: telefonda uygulama açılınca sayfa askıya alınabilir.
  window.setTimeout(() => {
    void httpsCallable(getFunctions(getFirebaseApp(), "europe-west1"), "trackVisit")(payload).catch(() => undefined);
  }, action === "signup:whatsapp" ? 0 : 900);
}
