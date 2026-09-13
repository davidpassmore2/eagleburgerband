import { MetadataRoute } from "next";
import { bandConfig } from "@/band.config";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${bandConfig.name} Member Portal`,
    short_name: bandConfig.shortName,
    description: "Authenticated musician portal for Eagleburger Band gigs, call sheets, repertoire, and logistics.",
    start_url: "/portal",
    scope: "/",
    display: "standalone",
    orientation: "any",
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
    shortcuts: [
      {
        name: "My Gigs & Logistics",
        short_name: "Gigs",
        description: "View upcoming gigs, call times, and logistics",
        url: "/portal/gigs",
        icons: [{ src: "/icon-192.png", sizes: "192x192" }],
      },
      {
        name: "Music Library & Charts",
        short_name: "Library",
        description: "Access repertoire charts and setlists",
        url: "/portal/library",
        icons: [{ src: "/icon-192.png", sizes: "192x192" }],
      },
      {
        name: "Availability Calendar",
        short_name: "Availability",
        description: "Manage your gig availability and blackouts",
        url: "/portal/availability",
        icons: [{ src: "/icon-192.png", sizes: "192x192" }],
      },
    ],
  };
}