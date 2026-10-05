import type { NextConfig } from "next";
import path from "node:path";

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "X-XSS-Protection", value: "1; mode=block" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(self)" },
];

const nextConfig: NextConfig = {
  // Keep Next.js tracing inside the web app. Without an explicit root, a
  // package-lock.json in a parent directory can make Next infer the wrong
  // workspace and print misleading startup warnings.
  outputFileTracingRoot: path.resolve(__dirname),
  turbopack: {
    root: path.resolve(__dirname),
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "firebasestorage.googleapis.com",
        pathname: "/v0/b/randevugo-d1d2e.firebasestorage.app/o/**",
      },
      {
        protocol: "https",
        hostname: "storage.googleapis.com",
        pathname: "/randevugo-d1d2e.firebasestorage.app/**",
      },
    ],
  },
  allowedDevOrigins: ["192.168.1.168"],
  // Sık yazılan kısa adresler gerçek 308 ile doğru sayfaya gider (arama motorları için de net).
  async redirects() {
    const aliases: Record<string, string> = {
      "/yardim": "/yardim-merkezi",
      "/destek": "/yardim-merkezi",
      "/ios": "/mobil-uygulama",
      "/android": "/mobil-uygulama",
      "/uygulama": "/mobil-uygulama",
      "/magazalar": "/kesfet",
      "/randevularim": "/hesabim",
    };
    return Object.entries(aliases).map(([source, destination]) => ({ source, destination, permanent: true }));
  },
  // Takvim/Cüzdan dosyaları aynı alan adından sunulur (iOS Safari "Takvime ekle" sayfasını doğrudan açar).
  async rewrites() {
    const fn = "https://europe-west1-randevugo-d1d2e.cloudfunctions.net/appointmentPass";
    return [
      { source: "/.well-known/apple-app-site-association", destination: "/api/apple-app-site-association" },
      { source: "/.well-known/assetlinks.json", destination: "/api/assetlinks" },
      { source: "/api/randevu/:token/takvim.ics", destination: `${fn}?token=:token&kind=ics` },
      { source: "/api/randevu/:token/cuzdan.pkpass", destination: `${fn}?token=:token&kind=pkpass` },
    ];
  },
  async headers() {
    return [
      {
        source: "/.well-known/apple-app-site-association",
        headers: [
          { key: "Content-Type", value: "application/json" },
          { key: "Cache-Control", value: "public, max-age=300, must-revalidate" },
        ],
      },
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
