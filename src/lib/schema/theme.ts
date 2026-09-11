import { z } from "zod";

export const PortalColorSchemeIdSchema = z.enum([
  "eagleburger-gold",
  "neon-parade",
  "sousa-crimson",
  "emerald-groove",
  "monongahela-steel",
]);

export type PortalColorSchemeId = z.infer<typeof PortalColorSchemeIdSchema>;

export const ThemeSocialLinksSchema = z.object({
  youtube: z.string().default("https://www.youtube.com/watch?v=v0x-fut30wE"),
  instagram: z.string().default("https://www.instagram.com/eagleburgerband"),
  facebook: z.string().default("https://www.facebook.com/col.eagleburger"),
});

export const ThemeScopeConfigSchema = z.object({
  schemeId: PortalColorSchemeIdSchema.default("eagleburger-gold"),
  primaryColor: z.string().default("#facc15"),       // EBB Gold / Accent
  accentColor: z.string().default("#f59e0b"),        // Secondary Accent / Amber
  backgroundColor: z.string().default("#0a0802"),    // Harmonious ambient background
  surfaceColor: z.string().default("#151105"),       // Card / Sidebar surface
  mutedSurfaceColor: z.string().default("#1e1808"),  // Inner wells, inputs, badges
  borderColor: z.string().default("#382c0f"),        // Card & separator borders
  textColor: z.string().default("#fefce8"),          // Text
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
    schemeId: "eagleburger-gold" as const,
    primaryColor: "#facc15",
    accentColor: "#f59e0b",
    backgroundColor: "#020617",
    surfaceColor: "#0f172a",
    mutedSurfaceColor: "#1e293b",
    borderColor: "#334155",
    textColor: "#f8fafc",
    tagline: "Pittsburgh's Premier Street Brass & Battery Powerhouse",
  })),

  // Musician Portal Scope
  portal: ThemeScopeConfigSchema.default(() => ({
    schemeId: "eagleburger-gold" as const,
    primaryColor: "#facc15",
    accentColor: "#f59e0b",
    backgroundColor: "#0a0802",
    surfaceColor: "#151105",
    mutedSurfaceColor: "#1e1808",
    borderColor: "#382c0f",
    textColor: "#fefce8",
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

export interface PortalColorScheme {
  id: PortalColorSchemeId;
  name: string;
  tagline: string;
  description: string;
  primaryColor: string;
  accentColor: string;
  backgroundColor: string;       // Deep harmonious ambient background
  surfaceColor: string;          // Sidebar and primary card surfaces
  mutedSurfaceColor: string;     // Inner wells, search inputs, active badges
  borderColor: string;           // Harmonious card and separator borders
  textColor: string;             // Crisp readable text
  previewSwatches: [string, string, string, string]; // [primary, accent, surface, bg]
}

export const PORTAL_COLOR_SCHEMES: PortalColorScheme[] = [
  {
    id: "eagleburger-gold",
    name: "Eagleburger Gold",
    tagline: "Signature Brass & Street Revelry",
    description: "The flagship street brass look featuring warm honey obsidian ambient tones, brass charcoal surfaces, and amber-gold highlights.",
    primaryColor: "#facc15",
    accentColor: "#f59e0b",
    backgroundColor: "#0a0802",
    surfaceColor: "#151105",
    mutedSurfaceColor: "#1e1808",
    borderColor: "#382c0f",
    textColor: "#fefce8",
    previewSwatches: ["#facc15", "#f59e0b", "#151105", "#0a0802"],
  },
  {
    id: "neon-parade",
    name: "Neon Parade",
    tagline: "Electric Night & Stadium Illumination",
    description: "High-contrast midnight navy atmosphere, cobalt slate surfaces, and glowing electric cyan and indigo highlights.",
    primaryColor: "#38bdf8",
    accentColor: "#818cf8",
    backgroundColor: "#040817",
    surfaceColor: "#091126",
    mutedSurfaceColor: "#0f1c3d",
    borderColor: "#1e2f5d",
    textColor: "#f0f9ff",
    previewSwatches: ["#38bdf8", "#818cf8", "#091126", "#040817"],
  },
  {
    id: "sousa-crimson",
    name: "Sousa Crimson",
    tagline: "Parade Regalia & Ceremonial Brass",
    description: "Traditional marching corps atmosphere with deep royal Bordeaux velvet backgrounds, garnet surfaces, and bright crimson highlights.",
    primaryColor: "#f43f5e",
    accentColor: "#fb7185",
    backgroundColor: "#0f0307",
    surfaceColor: "#1c070e",
    mutedSurfaceColor: "#2a0c16",
    borderColor: "#4c0f20",
    textColor: "#fff1f2",
    previewSwatches: ["#f43f5e", "#fb7185", "#1c070e", "#0f0307"],
  },
  {
    id: "emerald-groove",
    name: "Emerald Groove",
    tagline: "New Orleans Second Line Funk",
    description: "Second line syncopation with rich bayou ambient tones, dark cypress velvet surfaces, and vivid emerald and mint highlights.",
    primaryColor: "#10b981",
    accentColor: "#34d399",
    backgroundColor: "#02140d",
    surfaceColor: "#072618",
    mutedSurfaceColor: "#0c3623",
    borderColor: "#114b32",
    textColor: "#ecfdf5",
    previewSwatches: ["#10b981", "#34d399", "#072618", "#02140d"],
  },
  {
    id: "monongahela-steel",
    name: "Monongahela Steel",
    tagline: "Pittsburgh Industrial Platinum",
    description: "Minimalist stealth industrial styling with graphite carbon backgrounds, cold rolled steel surfaces, and burnished platinum accents.",
    primaryColor: "#e2e8f0",
    accentColor: "#94a3b8",
    backgroundColor: "#090a0f",
    surfaceColor: "#13161c",
    mutedSurfaceColor: "#1c212a",
    borderColor: "#2d3545",
    textColor: "#ffffff",
    previewSwatches: ["#e2e8f0", "#94a3b8", "#13161c", "#090a0f"],
  },
];

export function getPortalColorScheme(id: string): PortalColorScheme {
  const found = PORTAL_COLOR_SCHEMES.find((s) => s.id === id);
  return found || PORTAL_COLOR_SCHEMES[0];
}

