export const bandConfig = {
  name: "Eagleburger Band",
  shortName: "Eagleburger",
  tagline: "Pittsburgh's Premier Street Brass & Percussion Ensemble",
  description:
    "Mobile groove, brass power, and outdoor high-energy street performances.",
  url: "https://eagleburgerband.com",
  betaUrl: "https://beta.eagleburgerband.com",
  contactEmail: "info@eagleburgerband.com",
  bookingEmail: "booking@eagleburgerband.com",
  socials: {
    instagram: "https://www.instagram.com/eagleburgerband",
    facebook: "https://www.facebook.com/col.eagleburger",
    youtube: "https://www.youtube.com/@EagleburgerBand",
  },
  defaultTheme: {
    preset: "classic_brass",
    primary: "#FFD200",
    primaryForeground: "#0F172A",
    background: "#0B0F19",
    surface: "#151C2C",
    border: "#232F48",
    accent: "#F59E0B",
    mutedText: "#94A3B8",
  },
  pwa: {
    themeColor: "#FFD200",
    backgroundColor: "#0B0F19",
  },
} as const;

export type BandConfig = typeof bandConfig;