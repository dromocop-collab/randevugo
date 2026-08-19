import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
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
};

export default nextConfig;
