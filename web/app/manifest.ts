import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "SeninRandevun",
    short_name: "SeninRandevun",
    description:
      "Türkiye'nin akıllı online randevu platformu. İşletmenizi dijitale taşıyın.",
    start_url: "/",
    display: "standalone",
    background_color: "#eef3f9",
    theme_color: "#0284c7",
    icons: [
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
      },
      {
        src: "/apple-icon.png",
        sizes: "180x180",
        type: "image/png",
      },
    ],
  };
}
