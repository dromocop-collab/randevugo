import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "SeninRandevun",
    short_name: "SeninRandevun",
    description:
      "Yakınınızdaki güvenilir işletmeleri keşfedin, uygun saati seçin ve online randevunuzu saniyeler içinde oluşturun.",
    start_url: "/",
    display: "standalone",
    background_color: "#f6f4ec",
    theme_color: "#0b6b45",
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
