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
  // Kayıt formunun son adımı (Hesap) = Lead: Meta'ya hem tarayıcıdan (onay varsa) hem sunucudan, aynı kimlikle.
  // Sunucu: functions/src/analytics-domain.ts LEAD_SIGNUP_ACTION.
  const lead = action === "signup:3";
  const eventId = lead ? `lead-${crypto.randomUUID()}` : undefined;
  if (lead && eventId) trackPixel("Lead", eventId);
  void httpsCallable(getFunctions(getFirebaseApp(), "europe-west1"), "trackVisit")({
    type: "action", action, path: window.location.pathname, ...(lead ? { eventId, ...readMetaCookies() } : {}),
  }).catch(() => undefined);
}
