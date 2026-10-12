import { z } from "zod";

export const PortalColorSchemeIdSchema = z.string().default("eagleburger-gold");
export type PortalColorSchemeId = string;

export const PortalThemeModeSchema = z.enum(["dark", "light"]);
export type PortalThemeMode = z.infer<typeof PortalThemeModeSchema>;

export const ThemeSocialLinksSchema = z.object({
  youtube: z.string().default("https://www.youtube.com/watch?v=v0x-fut30wE"),
  instagram: z.string().default("https://www.instagram.com/eagleburgerband"),
  facebook: z.string().default("https://www.facebook.com/col.eagleburger"),
});

export const ThemeScopeConfigSchema = z.object({
  schemeId: z.string().default("default"),
  primaryColor: z.string().default("#facc15"),       // EBB Gold / Accent
  accentColor: z.string().default("#f59e0b"),        // Secondary Accent / Amber
  logoColor: z.string().default("#facc15"),          // Dedicated Logo Emblem Hex Color
  backgroundColor: z.string().default("#0a0802"),    // Harmonious ambient background
  surfaceColor: z.string().default("#151105"),       // Card / Sidebar surface
  mutedSurfaceColor: z.string().default("#1e1808"),  // Inner wells, inputs, badges
  borderColor: z.string().default("#382c0f"),        // Card & separator borders
  textColor: z.string().default("#fefce8"),          // Text
  tagline: z.string().default("Brass, percussion, and mobile street revelry."),
});

export type ThemeScopeConfig = z.infer<typeof ThemeScopeConfigSchema>;

export const PublicThemeOptionSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().default(""),
  isDefault: z.boolean().default(false),
  primaryColor: z.string().default("#facc15"),
  accentColor: z.string().default("#f59e0b"),
  logoColor: z.string().default("#facc15"),
  backgroundColor: z.string().default("#020617"),
  surfaceColor: z.string().default("#0f172a"),
  mutedSurfaceColor: z.string().default("#1e293b"),
  borderColor: z.string().default("#334155"),
  textColor: z.string().default("#f8fafc"),
});

export type PublicThemeOption = z.infer<typeof PublicThemeOptionSchema>;

export const DEFAULT_PUBLIC_THEMES: PublicThemeOption[] = [
  {
    id: "default",
    name: "Eagleburger Gold (Default)",
    description: "The classic signature street brass dark look with gold emblem and amber highlights.",
    isDefault: true,
    primaryColor: "#facc15",
    accentColor: "#f59e0b",
    logoColor: "#facc15",
    backgroundColor: "#020617",
    surfaceColor: "#0f172a",
    mutedSurfaceColor: "#1e293b",
    borderColor: "#334155",
    textColor: "#f8fafc",
  },
  {
    id: "neon-parade",
    name: "Neon Parade",
    description: "Electric midnight navy atmosphere with cyan glow and cobalt stadium slate.",
    isDefault: false,
    primaryColor: "#38bdf8",
    accentColor: "#818cf8",
    logoColor: "#38bdf8",
    backgroundColor: "#040817",
    surfaceColor: "#091126",
    mutedSurfaceColor: "#0f1c3d",
    borderColor: "#1e2f5d",
    textColor: "#f0f9ff",
  },
  {
    id: "sousa-crimson",
    name: "Sousa Crimson",
    description: "Parade regalia with Bordeaux velvet background and ceremonial crimson brass highlights.",
    isDefault: false,
    primaryColor: "#f43f5e",
    accentColor: "#fb7185",
    logoColor: "#f43f5e",
    backgroundColor: "#0f0307",
    surfaceColor: "#1c070e",
    mutedSurfaceColor: "#2a0c16",
    borderColor: "#4c0f20",
    textColor: "#fff1f2",
  },
  {
    id: "emerald-groove",
    name: "Emerald Groove",
    description: "New Orleans second line funk with cypress night surfaces and vivid emerald accents.",
    isDefault: false,
    primaryColor: "#10b981",
    accentColor: "#34d399",
    logoColor: "#10b981",
    backgroundColor: "#02140d",
    surfaceColor: "#072618",
    mutedSurfaceColor: "#0c3623",
    borderColor: "#114b32",
    textColor: "#ecfdf5",
  },
  {
    id: "monongahela-steel",
    name: "Monongahela Steel",
    description: "Stealth industrial styling with graphite carbon background and burnished platinum accents.",
    isDefault: false,
    primaryColor: "#e2e8f0",
    accentColor: "#94a3b8",
    logoColor: "#e2e8f0",
    backgroundColor: "#090a0f",
    surfaceColor: "#13161c",
    mutedSurfaceColor: "#1c212a",
    borderColor: "#2d3545",
    textColor: "#ffffff",
  },
];

export interface PortalThemeTokens {
  primaryColor: string;
  accentColor: string;
  backgroundColor: string;       // Ambient background
  surfaceColor: string;          // Sidebar and primary card surfaces
  mutedSurfaceColor: string;     // Inner wells, search inputs, active badges
  borderColor: string;           // Card and separator borders
  textColor: string;             // Crisp readable text
  previewSwatches: [string, string, string, string]; // [primary, accent, surface, bg]
}

export interface PortalColorScheme extends PortalThemeTokens {
  id: PortalColorSchemeId;
  name: string;
  tagline: string;
  description: string;
  logoColor?: string;
  mode?: PortalThemeMode;
  modes: {
    dark: PortalThemeTokens;
    light: PortalThemeTokens;
  };
}

export const PORTAL_COLOR_SCHEMES: PortalColorScheme[] = [
  {
    id: "eagleburger-gold",
    name: "Eagleburger Gold",
    tagline: "Signature Brass & Street Revelry",
    description: "The flagship street brass look featuring warm honey obsidian ambient tones, brass charcoal surfaces, and amber-gold highlights.",
    primaryColor: "#facc15",
    accentColor: "#f59e0b",
    logoColor: "#facc15",
    backgroundColor: "#0a0802",
    surfaceColor: "#151105",
    mutedSurfaceColor: "#1e1808",
    borderColor: "#382c0f",
    textColor: "#fefce8",
    previewSwatches: ["#facc15", "#f59e0b", "#151105", "#0a0802"],
    modes: {
      dark: {
        primaryColor: "#facc15",
        accentColor: "#f59e0b",
        backgroundColor: "#0a0802",
        surfaceColor: "#151105",
        mutedSurfaceColor: "#1e1808",
        borderColor: "#382c0f",
        textColor: "#fefce8",
        previewSwatches: ["#facc15", "#f59e0b", "#151105", "#0a0802"],
      },
      light: {
        primaryColor: "#b45309",
        accentColor: "#d97706",
        backgroundColor: "#fefce8",
        surfaceColor: "#ffffff",
        mutedSurfaceColor: "#fef9c3",
        borderColor: "#fde047",
        textColor: "#1c1917",
        previewSwatches: ["#b45309", "#d97706", "#ffffff", "#fefce8"],
      },
    },
  },
  {
    id: "neon-parade",
    name: "Neon Parade",
    tagline: "Electric Night & Stadium Illumination",
    description: "High-contrast midnight navy atmosphere, cobalt slate surfaces, and glowing electric cyan and indigo highlights.",
    primaryColor: "#38bdf8",
    accentColor: "#818cf8",
    logoColor: "#38bdf8",
    backgroundColor: "#040817",
    surfaceColor: "#091126",
    mutedSurfaceColor: "#0f1c3d",
    borderColor: "#1e2f5d",
    textColor: "#f0f9ff",
    previewSwatches: ["#38bdf8", "#818cf8", "#091126", "#040817"],
    modes: {
      dark: {
        primaryColor: "#38bdf8",
        accentColor: "#818cf8",
        backgroundColor: "#040817",
        surfaceColor: "#091126",
        mutedSurfaceColor: "#0f1c3d",
        borderColor: "#1e2f5d",
        textColor: "#f0f9ff",
        previewSwatches: ["#38bdf8", "#818cf8", "#091126", "#040817"],
      },
      light: {
        primaryColor: "#0284c7",
        accentColor: "#6366f1",
        backgroundColor: "#f0f9ff",
        surfaceColor: "#ffffff",
        mutedSurfaceColor: "#e0f2fe",
        borderColor: "#bae6fd",
        textColor: "#0f172a",
        previewSwatches: ["#0284c7", "#6366f1", "#ffffff", "#f0f9ff"],
      },
    },
  },
  {
    id: "sousa-crimson",
    name: "Sousa Crimson",
    tagline: "Parade Regalia & Ceremonial Brass",
    description: "Traditional marching corps atmosphere with deep royal Bordeaux velvet backgrounds, garnet surfaces, and bright crimson highlights.",
    primaryColor: "#f43f5e",
    accentColor: "#fb7185",
    logoColor: "#f43f5e",
    backgroundColor: "#0f0307",
    surfaceColor: "#1c070e",
    mutedSurfaceColor: "#2a0c16",
    borderColor: "#4c0f20",
    textColor: "#fff1f2",
    previewSwatches: ["#f43f5e", "#fb7185", "#1c070e", "#0f0307"],
    modes: {
      dark: {
        primaryColor: "#f43f5e",
        accentColor: "#fb7185",
        backgroundColor: "#0f0307",
        surfaceColor: "#1c070e",
        mutedSurfaceColor: "#2a0c16",
        borderColor: "#4c0f20",
        textColor: "#fff1f2",
        previewSwatches: ["#f43f5e", "#fb7185", "#1c070e", "#0f0307"],
      },
      light: {
        primaryColor: "#be123c",
        accentColor: "#e11d48",
        backgroundColor: "#fff1f2",
        surfaceColor: "#ffffff",
        mutedSurfaceColor: "#ffe4e6",
        borderColor: "#fecdd3",
        textColor: "#1c1917",
        previewSwatches: ["#be123c", "#e11d48", "#ffffff", "#fff1f2"],
      },
    },
  },
  {
    id: "emerald-groove",
    name: "Emerald Groove",
    tagline: "New Orleans Second Line Funk",
    description: "Second line syncopation with rich bayou ambient tones, dark cypress velvet surfaces, and vivid emerald and mint highlights.",
    primaryColor: "#10b981",
    accentColor: "#34d399",
    logoColor: "#10b981",
    backgroundColor: "#02140d",
    surfaceColor: "#072618",
    mutedSurfaceColor: "#0c3623",
    borderColor: "#114b32",
    textColor: "#ecfdf5",
    previewSwatches: ["#10b981", "#34d399", "#072618", "#02140d"],
    modes: {
      dark: {
        primaryColor: "#10b981",
        accentColor: "#34d399",
        backgroundColor: "#02140d",
        surfaceColor: "#072618",
        mutedSurfaceColor: "#0c3623",
        borderColor: "#114b32",
        textColor: "#ecfdf5",
        previewSwatches: ["#10b981", "#34d399", "#072618", "#02140d"],
      },
      light: {
        primaryColor: "#047857",
        accentColor: "#059669",
        backgroundColor: "#ecfdf5",
        surfaceColor: "#ffffff",
        mutedSurfaceColor: "#d1fae5",
        borderColor: "#a7f3d0",
        textColor: "#064e3b",
        previewSwatches: ["#047857", "#059669", "#ffffff", "#ecfdf5"],
      },
    },
  },
  {
    id: "monongahela-steel",
    name: "Monongahela Steel",
    tagline: "Pittsburgh Industrial Platinum",
    description: "Minimalist stealth industrial styling with graphite carbon backgrounds, cold rolled steel surfaces, and burnished platinum accents.",
    primaryColor: "#e2e8f0",
    accentColor: "#94a3b8",
    logoColor: "#e2e8f0",
    backgroundColor: "#090a0f",
    surfaceColor: "#13161c",
    mutedSurfaceColor: "#1c212a",
    borderColor: "#2d3545",
    textColor: "#ffffff",
    previewSwatches: ["#e2e8f0", "#94a3b8", "#13161c", "#090a0f"],
    modes: {
      dark: {
        primaryColor: "#e2e8f0",
        accentColor: "#94a3b8",
        backgroundColor: "#090a0f",
        surfaceColor: "#13161c",
        mutedSurfaceColor: "#1c212a",
        borderColor: "#2d3545",
        textColor: "#ffffff",
        previewSwatches: ["#e2e8f0", "#94a3b8", "#13161c", "#090a0f"],
      },
      light: {
        primaryColor: "#334155",
        accentColor: "#64748b",
        backgroundColor: "#f8fafc",
        surfaceColor: "#ffffff",
        mutedSurfaceColor: "#f1f5f9",
        borderColor: "#cbd5e1",
        textColor: "#0f172a",
        previewSwatches: ["#334155", "#64748b", "#ffffff", "#f8fafc"],
      },
    },
  },
];

export const PortalThemeTokensSchema = z.object({
  primaryColor: z.string().default("#facc15"),
  accentColor: z.string().default("#f59e0b"),
  backgroundColor: z.string().default("#0a0802"),
  surfaceColor: z.string().default("#151105"),
  mutedSurfaceColor: z.string().default("#1e1808"),
  borderColor: z.string().default("#382c0f"),
  textColor: z.string().default("#fefce8"),
  previewSwatches: z.tuple([z.string(), z.string(), z.string(), z.string()]).default(["#facc15", "#f59e0b", "#151105", "#0a0802"]),
});

export const PortalThemeOptionSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().default(""),
  tagline: z.string().default(""),
  isDefault: z.boolean().default(false),
  primaryColor: z.string().default("#facc15"),
  accentColor: z.string().default("#f59e0b"),
  logoColor: z.string().default("#facc15"),
  backgroundColor: z.string().default("#0a0802"),
  surfaceColor: z.string().default("#151105"),
  mutedSurfaceColor: z.string().default("#1e1808"),
  borderColor: z.string().default("#382c0f"),
  textColor: z.string().default("#fefce8"),
  previewSwatches: z.tuple([z.string(), z.string(), z.string(), z.string()]).default(["#facc15", "#f59e0b", "#151105", "#0a0802"]),
  modes: z.object({
    dark: PortalThemeTokensSchema.default(() => PortalThemeTokensSchema.parse({})),
    light: PortalThemeTokensSchema.default(() => PortalThemeTokensSchema.parse({})),
  }).optional(),
});

export type PortalThemeOption = z.infer<typeof PortalThemeOptionSchema>;

export const DEFAULT_PORTAL_THEMES: PortalThemeOption[] = PORTAL_COLOR_SCHEMES.map((scheme, idx) => ({
  id: scheme.id,
  name: scheme.name,
  tagline: scheme.tagline,
  description: scheme.description,
  isDefault: idx === 0,
  primaryColor: scheme.primaryColor,
  accentColor: scheme.accentColor,
  logoColor: scheme.logoColor || scheme.primaryColor,
  backgroundColor: scheme.backgroundColor,
  surfaceColor: scheme.surfaceColor,
  mutedSurfaceColor: scheme.mutedSurfaceColor,
  borderColor: scheme.borderColor,
  textColor: scheme.textColor,
  previewSwatches: scheme.previewSwatches,
  modes: scheme.modes,
}));

export const TypographyConfigSchema = z.object({
  headingFont: z.enum(["montserrat", "oswald", "cinzel", "bebas-neue", "inter"]).default("montserrat"),
  bodyFont: z.enum(["inter", "roboto", "space-grotesk"]).default("inter"),
  headingTracking: z.enum(["normal", "wide", "wider"]).default("wide"),
  headingUppercase: z.boolean().default(true),
});

export type TypographyConfig = z.infer<typeof TypographyConfigSchema>;

export const VisualPolishConfigSchema = z.object({
  borderRadius: z.enum(["sharp", "modern", "pill"]).default("modern"),
  glowIntensity: z.enum(["none", "subtle", "vivid"]).default("subtle"),
  backgroundTexture: z.enum(["solid", "grid", "vignette", "mesh"]).default("solid"),
});

export type VisualPolishConfig = z.infer<typeof VisualPolishConfigSchema>;

export const ThemeSchema = z.object({
  // Global / Shared Ensemble Identity
  bandName: z.string().default("Eagleburger Band"),
  monogram: z.string().default("EBB"),
  logoUrl: z.string().default("/images/eagleburger-logo.png"),
  faviconUrl: z.string().default("/favicon.ico"),
  activeSeason: z.string().default("2026 Season"),

  // Typography & Lettering
  typography: TypographyConfigSchema.default({
    headingFont: "montserrat",
    bodyFont: "inter",
    headingTracking: "wide",
    headingUppercase: true,
  }),

  // Visual Polish & Effects
  visualPolish: VisualPolishConfigSchema.default({
    borderRadius: "modern",
    glowIntensity: "subtle",
    backgroundTexture: "solid",
  }),

  socialLinks: ThemeSocialLinksSchema.default(() => ({
    youtube: "https://www.youtube.com/watch?v=v0x-fut30wE",
    instagram: "https://www.instagram.com/eagleburgerband",
    facebook: "https://www.facebook.com/col.eagleburger",
  })),

  // Available Public Themes (Managed Presets)
  publicThemes: z.array(PublicThemeOptionSchema).default(() => DEFAULT_PUBLIC_THEMES),

  // Available Musician Portal Theme Presets (Managed Presets for Member Selection)
  portalThemes: z.array(PortalThemeOptionSchema).default(() => DEFAULT_PORTAL_THEMES),

  // Public Marketing Site Scope
  public: ThemeScopeConfigSchema.default(() => ({
    schemeId: "default",
    primaryColor: "#facc15",
    accentColor: "#f59e0b",
    logoColor: "#facc15",
    backgroundColor: "#020617",
    surfaceColor: "#0f172a",
    mutedSurfaceColor: "#1e293b",
    borderColor: "#334155",
    textColor: "#f8fafc",
    tagline: "Pittsburgh's Premier Street Brass & Battery Powerhouse",
  })),

  // Musician Portal Scope
  portal: ThemeScopeConfigSchema.default(() => ({
    schemeId: "eagleburger-gold",
    primaryColor: "#facc15",
    accentColor: "#f59e0b",
    logoColor: "#facc15",
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
  logoColor: z.string().default("#facc15"),
  subheading: z.string().default("Brass, percussion, and mobile street revelry."),

  schemaVersion: z.number().default(2),
  updatedAt: z.string().default(() => new Date().toISOString()),
});

export type ThemeConfig = z.infer<typeof ThemeSchema>;

export function getPortalColorScheme(
  id: string, 
  mode: PortalThemeMode = "dark",
  availableSchemes: PortalColorScheme[] = PORTAL_COLOR_SCHEMES
): PortalColorScheme {
  const base = availableSchemes.find((s) => s.id === id) || availableSchemes[0] || PORTAL_COLOR_SCHEMES[0];
  const tokens = base.modes?.[mode] || base.modes?.dark || {
    primaryColor: base.primaryColor,
    accentColor: base.accentColor,
    backgroundColor: base.backgroundColor,
    surfaceColor: base.surfaceColor,
    mutedSurfaceColor: base.mutedSurfaceColor,
    borderColor: base.borderColor,
    textColor: base.textColor,
    previewSwatches: base.previewSwatches,
  };
  return {
    ...base,
    ...tokens,
    mode,
  };
}

