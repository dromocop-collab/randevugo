"use client";

// Kök layout dahil her şey çöktüğünde gösterilir; kendi <html>/<body> etiketlerini içermek zorundadır.
export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="tr">
      <body style={{ margin: 0, minHeight: "100vh", display: "grid", placeItems: "center", background: "#f6f8f4", color: "#10281d", fontFamily: "system-ui, -apple-system, sans-serif" }}>
        <main style={{ maxWidth: 420, padding: 24, textAlign: "center" }}>
          <h1 style={{ fontSize: 22, margin: "0 0 8px" }}>Beklenmeyen bir hata oluştu</h1>
          <p style={{ margin: "0 0 20px", color: "#5b6b62", lineHeight: 1.5 }}>Lütfen sayfayı yenileyin veya biraz sonra tekrar deneyin.</p>
          <button onClick={reset} style={{ border: 0, borderRadius: 999, padding: "12px 22px", background: "#14532d", color: "#fff", fontWeight: 600, cursor: "pointer" }}>Tekrar dene</button>
        </main>
      </body>
    </html>
  );
}
