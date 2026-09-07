import { MetadataRoute } from "next";
import { bandConfig } from "@/band.config";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: bandConfig.name,
    short_name: bandConfig.shortName,
    description: bandConfig.description,
    start_url: "/portal",
    display: "standalone",
    background_color: bandConfig.pwa.backgroundColor,
    theme_color: bandConfig.pwa.themeColor,
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
        src: "/icon-512-maskable.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}