import { z } from "zod";

export const ThemeSocialLinksSchema = z.object({
  youtube: z.string().default("https://www.youtube.com/watch?v=v0x-fut30wE"),
  instagram: z.string().default("https://www.instagram.com/eagleburgerband"),
  facebook: z.string().default("https://www.facebook.com/col.eagleburger"),
});

export const ThemeScopeConfigSchema = z.object({
  primaryColor: z.string().default("#facc15"),       // EBB Gold / Accent
  accentColor: z.string().default("#f59e0b"),        // Secondary Accent / Amber
  backgroundColor: z.string().default("#020617"),    // Deep Slate 950
  surfaceColor: z.string().default("#0f172a"),       // Card Surface Slate 900
  textColor: z.string().default("#f8fafc"),          // Text Slate 50
  tagline: z.string().default("Brass, percussion, and mobile street revelry."),
});

export type ThemeScopeConfig = z.infer<typeof ThemeScopeConfigSchema>;

export const ThemeSchema = z.object({
  // Global / Shared Ensemble Identity
  bandName: z.string().default("Eagleburger Band"),
  logoUrl: z.string().default("/ebb-logo.png"),
  activeSeason: z.string().default("2026 Season"),
  socialLinks: ThemeSocialLinksSchema.default(() => ({
    youtube: "https://www.youtube.com/watch?v=v0x-fut30wE",
    instagram: "https://www.instagram.com/eagleburgerband",
    facebook: "https://www.facebook.com/col.eagleburger",
  })),

  // Public Marketing Site Scope
  public: ThemeScopeConfigSchema.default(() => ({
    primaryColor: "#facc15",
    accentColor: "#f59e0b",
    backgroundColor: "#020617",
    surfaceColor: "#0f172a",
    textColor: "#f8fafc",
    tagline: "Pittsburgh's Premier Street Brass & Battery Powerhouse",
  })),

  // Musician Portal Scope
  portal: ThemeScopeConfigSchema.default(() => ({
    primaryColor: "#facc15",
    accentColor: "#0f172a",
    backgroundColor: "#020617",
    surfaceColor: "#0f172a",
    textColor: "#f8fafc",
    tagline: "Musician Operations & Repertoire Command Center",
  })),

  // Backwards compatibility legacy flat fields
  primaryColor: z.string().default("#facc15"),
  accentColor: z.string().default("#0f172a"),
  subheading: z.string().default("Brass, percussion, and mobile street revelry."),

  schemaVersion: z.number().default(2),
  updatedAt: z.string().default(() => new Date().toISOString()),
});

export type ThemeConfig = z.infer<typeof ThemeSchema>;

