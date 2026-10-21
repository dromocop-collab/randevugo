import { getFunctions, httpsCallable } from "firebase/functions";
import { getFirebaseApp } from "@/lib/firebase/client";

// Canlı izleme için ekran adımı (ör. randevu ekranında "booking:datetime"). Sunucu yalnız tanıdığı adımları kabul eder;
// sayım değil, süper admin canlı panelindeki "şu an ne yapıyor" bilgisi ve adım hunisi içindir. Hata sessizce yutulur.
let lastSent = "";

export function trackAction(action: string) {
  if (typeof window === "undefined" || navigator.webdriver) return;
  const key = `${window.location.pathname}|${action}`;
  if (key === lastSent) return;
  lastSent = key;
  void httpsCallable(getFunctions(getFirebaseApp(), "europe-west1"), "trackVisit")({ type: "action", action, path: window.location.pathname }).catch(() => undefined);
}
