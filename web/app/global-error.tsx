"use client";

import { useSyncExternalStore } from "react";
import { DEFAULT_LOCALE, splitLocale, type Locale } from "@/i18n/config";

// Kök layout (ve onunla birlikte dil sağlayıcısı) çöktüğünde gösterilir; sözlük paketi yüklenemeyebileceği için
// metinler burada her dil için doğrudan yazılır. Yeni dil eklerken buraya da ekleyin.
const COPY: Record<Locale, { title: string; body: string; retry: string }> = {
  // i18n-ignore
  tr: { title: "Beklenmeyen bir hata oluştu", body: "Lütfen sayfayı yenileyin veya biraz sonra tekrar deneyin.", retry: "Tekrar dene" },
  en: { title: "Something went wrong", body: "Please refresh the page or try again in a moment.", retry: "Try again" },
};

const noop = () => () => {};

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const locale = useSyncExternalStore(noop, () => splitLocale(window.location.pathname).locale, () => DEFAULT_LOCALE);
  const copy = COPY[locale] ?? COPY[DEFAULT_LOCALE];
  return (
    <html lang={locale}>
      <body style={{ margin: 0, minHeight: "100vh", display: "grid", placeItems: "center", background: "#f6f8f4", color: "#10281d", fontFamily: "system-ui, -apple-system, sans-serif" }}>
        <main style={{ maxWidth: 420, padding: 24, textAlign: "center" }}>
          <h1 style={{ fontSize: 22, margin: "0 0 8px" }}>{copy.title}</h1>
          <p style={{ margin: "0 0 20px", color: "#5b6b62", lineHeight: 1.5 }}>{copy.body}</p>
          <button onClick={reset} style={{ border: 0, borderRadius: 999, padding: "12px 22px", background: "#14532d", color: "#fff", fontWeight: 600, cursor: "pointer" }}>{copy.retry}</button>
        </main>
      </body>
    </html>
  );
}
