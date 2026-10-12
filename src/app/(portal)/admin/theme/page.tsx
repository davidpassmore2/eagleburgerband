"use client";

import React, { useEffect, useState } from "react";
import { doc, onSnapshot, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { useAuth } from "@/lib/context/AuthContext";
import { canManageTheme } from "@/lib/auth/permissions";
import { User } from "@/lib/schema/user";
import { 
  ThemeConfig, 
  ThemeSchema, 
  ThemeScopeConfig, 
  PORTAL_COLOR_SCHEMES,
  PublicThemeOption,
  DEFAULT_PUBLIC_THEMES,
  PortalThemeOption,
  DEFAULT_PORTAL_THEMES,
  TypographyConfig,
  VisualPolishConfig,
} from "@/lib/schema/theme";
import { toast } from "@/lib/context/ToastContext";
import UnsavedChangesBar from "@/components/portal/UnsavedChangesBar";
import PortalBreadcrumb from "@/components/portal/PortalBreadcrumb";
import EbbLogo from "@/components/common/EbbLogo";
import { 
  Save, 
  Check, 
  Loader2, 
  ShieldAlert, 
  Sparkles,
  RefreshCw,
  Globe,
  LayoutDashboard,
  Building2,
  Compass,
  Send,
  Video,
  Camera,
  Share2,
  Palette,
  Plus,
  Trash2,
  CheckCircle,
  Info,
  Type,
  Sliders,
  Wand2,
  Layers,
  ExternalLink,
} from "lucide-react";

const HEADING_FONT_CONFIG: Record<
  TypographyConfig["headingFont"],
  { name: string; family: string; subtitle: string; preview: string; category: "slab" | "sans" | "serif" }
> = {
  arvo: {
    name: "Arvo",
    family: "'Arvo', serif",
    subtitle: "Bold Geometric Slab Serif",
    preview: "BRASS POWER",
    category: "slab",
  },
  rokkitt: {
    name: "Rokkitt",
    family: "'Rokkitt', serif",
    subtitle: "Vintage Heavy Industrial Slab",
    preview: "STREET BEAT",
    category: "slab",
  },
  "alfa-slab-one": {
    name: "Alfa Slab One",
    family: "'Alfa Slab One', serif",
    subtitle: "Ultra-Heavy Bold Poster Slab",
    preview: "BIG SOUND",
    category: "slab",
  },
  "crete-round": {
    name: "Crete Round",
    family: "'Crete Round', serif",
    subtitle: "Warm Curved Balanced Slab",
    preview: "FANFARE",
    category: "slab",
  },
  "bree-serif": {
    name: "Bree Serif",
    family: "'Bree Serif', serif",
    subtitle: "Punchy Upright Character Slab",
    preview: "GROOVE",
    category: "slab",
  },
  montserrat: {
    name: "Montserrat",
    family: "'Montserrat', sans-serif",
    subtitle: "Bold Classic & Balanced Brass",
    preview: "BRASS ANTHEM",
    category: "sans",
  },
  oswald: {
    name: "Oswald",
    family: "'Oswald', sans-serif",
    subtitle: "Punchy Condensed Street Beat",
    preview: "HIGH OCTANE",
    category: "sans",
  },
  "bebas-neue": {
    name: "Bebas Neue",
    family: "'Bebas Neue', sans-serif",
    subtitle: "Tall Display Headline Impact",
    preview: "PITTSBURGH",
    category: "sans",
  },
  anton: {
    name: "Anton",
    family: "'Anton', sans-serif",
    subtitle: "Heavyweight Festival Headline",
    preview: "BRASS FEST",
    category: "sans",
  },
  teko: {
    name: "Teko",
    family: "'Teko', sans-serif",
    subtitle: "Ultra-Tall Compressed Display",
    preview: "STREET MARCH",
    category: "sans",
  },
  righteous: {
    name: "Righteous",
    family: "'Righteous', sans-serif",
    subtitle: "Retro Groove & Funky Rhythm",
    preview: "FUNK VIBE",
    category: "sans",
  },
  syne: {
    name: "Syne",
    family: "'Syne', sans-serif",
    subtitle: "Expressive Avant-Garde Sans",
    preview: "ELECTRIC",
    category: "sans",
  },
  "archivo-black": {
    name: "Archivo Black",
    family: "'Archivo Black', sans-serif",
    subtitle: "Maximum Impact Solid Sans",
    preview: "IMPACT",
    category: "sans",
  },
  inter: {
    name: "Inter",
    family: "'Inter', sans-serif",
    subtitle: "Modern Clean Precision",
    preview: "PRECISION",
    category: "sans",
  },
  cinzel: {
    name: "Cinzel",
    family: "'Cinzel', serif",
    subtitle: "Regal Ceremonial Fanfare",
    preview: "FANFARE VIBE",
    category: "serif",
  },
  "playfair-display": {
    name: "Playfair Display",
    family: "'Playfair Display', serif",
    subtitle: "High-Contrast Editorial Serif",
    preview: "SYMPHONY",
    category: "serif",
  },
  fraunces: {
    name: "Fraunces",
    family: "'Fraunces', serif",
    subtitle: "Expressive Vintage Old-Style",
    preview: "SECOND LINE",
    category: "serif",
  },
  "abril-fatface": {
    name: "Abril Fatface",
    family: "'Abril Fatface', serif",
    subtitle: "Dramatic Titling Fatface",
    preview: "REVELRY",
    category: "serif",
  },
};

const BODY_FONT_CONFIG: Record<
  TypographyConfig["bodyFont"],
  { name: string; family: string; subtitle: string; category: "sans" | "serif" }
> = {
  inter: {
    name: "Inter",
    family: "'Inter', sans-serif",
    subtitle: "Crisp High Legibility (Default)",
    category: "sans",
  },
  poppins: {
    name: "Poppins",
    family: "'Poppins', sans-serif",
    subtitle: "Geometric Friendly Modern Sans",
    category: "sans",
  },
  "plus-jakarta-sans": {
    name: "Plus Jakarta Sans",
    family: "'Plus Jakarta Sans', sans-serif",
    subtitle: "Contemporary Refined Geometric",
    category: "sans",
  },
  "dm-sans": {
    name: "DM Sans",
    family: "'DM Sans', sans-serif",
    subtitle: "Precise Low-Contrast Modern Sans",
    category: "sans",
  },
  outfit: {
    name: "Outfit",
    family: "'Outfit', sans-serif",
    subtitle: "Polished Accessible Clean Sans",
    category: "sans",
  },
  "work-sans": {
    name: "Work Sans",
    family: "'Work Sans', sans-serif",
    subtitle: "Sturdy Screen-Optimized Sans",
    category: "sans",
  },
  roboto: {
    name: "Roboto",
    family: "'Roboto', sans-serif",
    subtitle: "Clean Geometric Everyday Sans",
    category: "sans",
  },
  "space-grotesk": {
    name: "Space Grotesk",
    family: "'Space Grotesk', sans-serif",
    subtitle: "Distinctive Groove & Tech Edge",
    category: "sans",
  },
  "open-sans": {
    name: "Open Sans",
    family: "'Open Sans', sans-serif",
    subtitle: "Universal Neutral Open Sans",
    category: "sans",
  },
  raleway: {
    name: "Raleway",
    family: "'Raleway', sans-serif",
    subtitle: "Elegant Sophisticated Sans",
    category: "sans",
  },
  merriweather: {
    name: "Merriweather",
    family: "'Merriweather', serif",
    subtitle: "Warm Editorial Classic Book Serif",
    category: "serif",
  },
  lora: {
    name: "Lora",
    family: "'Lora', serif",
    subtitle: "Contemporary Flowing Literary Serif",
    category: "serif",
  },
  bitter: {
    name: "Bitter",
    family: "'Bitter', serif",
    subtitle: "Contemporary Reading Slab Serif",
    category: "serif",
  },
  "pt-serif": {
    name: "PT Serif",
    family: "'PT Serif', serif",
    subtitle: "Classic Universal Text Serif",
    category: "serif",
  },
  "source-serif-4": {
    name: "Source Serif 4",
    family: "'Source Serif 4', serif",
    subtitle: "Sturdy Digital Reading Serif",
    category: "serif",
  },
  "eb-garamond": {
    name: "EB Garamond",
    family: "'EB Garamond', serif",
    subtitle: "Classic Renaissance Humanist Serif",
    category: "serif",
  },
};

const TRACKING_CONFIG: Record<TypographyConfig["headingTracking"], { label: string; value: string }> = {
  normal: { label: "Normal", value: "0" },
  wide: { label: "Wide (+0.05em)", value: "0.05em" },
  wider: { label: "Wider (+0.10em)", value: "0.10em" },
};

const BORDER_RADIUS_CONFIG: Record<
  VisualPolishConfig["borderRadius"],
  { label: string; description: string; classCard: string; classButton: string; styleRadius: string }
> = {
  sharp: {
    label: "Sharp",
    description: "Brutalist 2px/4px angles",
    classCard: "rounded-sm",
    classButton: "rounded-none",
    styleRadius: "4px",
  },
  modern: {
    label: "Modern",
    description: "Balanced 12px/16px curves",
    classCard: "rounded-2xl",
    classButton: "rounded-xl",
    styleRadius: "16px",
  },
  pill: {
    label: "Pill / Soft",
    description: "Organic 24px/9999px pill curves",
    classCard: "rounded-3xl",
    classButton: "rounded-full",
    styleRadius: "28px",
  },
};

const GLOW_CONFIG: Record<VisualPolishConfig["glowIntensity"], { label: string; description: string; shadow: string }> = {
  none: { label: "None", description: "Flat & minimal", shadow: "none" },
  subtle: { label: "Subtle", description: "Soft ambient halo", shadow: "0 0 16px rgba(250, 204, 21, 0.25)" },
  vivid: { label: "Vivid", description: "High-voltage neon punch", shadow: "0 0 28px rgba(250, 204, 21, 0.65)" },
};

const TEXTURE_CONFIG: Record<
  VisualPolishConfig["backgroundTexture"],
  { label: string; description: string; getStyle: (primaryColor?: string) => React.CSSProperties }
> = {
  solid: {
    label: "Solid Carbon",
    description: "Deep uniform dark tone",
    getStyle: () => ({ backgroundColor: "#020617" }),
  },
  grid: {
    label: "Dot Grid",
    description: "Subtle technical grid matrix",
    getStyle: () => ({
      backgroundColor: "#020617",
      backgroundImage: "radial-gradient(rgba(255, 255, 255, 0.12) 1px, transparent 1px)",
      backgroundSize: "16px 16px",
    }),
  },
  vignette: {
    label: "Vignette",
    description: "Focal spotlight gradient",
    getStyle: () => ({
      background: "radial-gradient(circle at center, #1e293b 0%, #020617 100%)",
    }),
  },
  mesh: {
    label: "Brass Mesh",
    description: "Dual-source brass ambient light",
    getStyle: (primary = "#facc15") => ({
      backgroundColor: "#030712",
      backgroundImage: `radial-gradient(at 0% 0%, ${primary}25 0px, transparent 50%), radial-gradient(at 100% 100%, #f59e0b25 0px, transparent 50%)`,
    }),
  },
};

const DEFAULT_THEME: ThemeConfig = ThemeSchema.parse({});

type TabType = "public" | "portal" | "identity";

export default function ThemeCustomizerPage() {
  const { profile, loading: authLoading } = useAuth();
  const [theme, setTheme] = useState<ThemeConfig>(DEFAULT_THEME);
  const [savedTheme, setSavedTheme] = useState<ThemeConfig | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>("public");
  const [selectedPublicThemeId, setSelectedPublicThemeId] = useState<string>("default");
  const [selectedPortalThemeId, setSelectedPortalThemeId] = useState<string>("eagleburger-gold");
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [identityScope, setIdentityScope] = useState<"public" | "portal">("public");
  const [simulatorScope, setSimulatorScope] = useState<"public" | "portal">("public");
  const [headingCategoryFilter, setHeadingCategoryFilter] = useState<"all" | "slab" | "sans" | "serif">("all");
  const [bodyCategoryFilter, setBodyCategoryFilter] = useState<"all" | "sans" | "serif">("all");

  useEffect(() => {
    if (authLoading) return;

    const unsub = onSnapshot(
      doc(db, "theme", "config"),
      (snap) => {
        if (snap.exists()) {
          const parsed = ThemeSchema.safeParse(snap.data());
          if (parsed.success) {
            setTheme(parsed.data);
            setSavedTheme(parsed.data);
          } else {
            console.warn("Theme parsing issue, using defaults:", parsed.error);
            const fallback = { ...DEFAULT_THEME, ...snap.data() } as ThemeConfig;
            setTheme(fallback);
            setSavedTheme(fallback);
          }
        } else {
          setSavedTheme(DEFAULT_THEME);
        }
        setLoading(false);
      },
      (err) => {
        console.error("Theme listener error:", err);
        setLoading(false);
      }
    );

    return () => unsub();
  }, [authLoading]);

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center p-12 text-slate-400 gap-2 text-xs">
        <Loader2 className="w-4 h-4 animate-spin text-yellow-400" />
        Loading brand palette & theme studio...
      </div>
    );
  }

  if (!canManageTheme(profile as unknown as User)) {
    return (
      <div className="p-8 text-rose-400 text-xs font-semibold flex items-center gap-2">
        <ShieldAlert className="w-4 h-4" />
        Web Manager or Admin privileges required to customize brand & palette.
      </div>
    );
  }

  const updatePublicScope = (patch: Partial<ThemeScopeConfig>) => {
    setTheme((prev) => ({
      ...prev,
      public: { ...prev.public, ...patch },
    }));
  };

  const updatePortalScope = (patch: Partial<ThemeScopeConfig>) => {
    setTheme((prev) => ({
      ...prev,
      portal: { ...prev.portal, ...patch },
    }));
  };

  const resetScope = (scope: TabType) => {
    if (scope === "public") {
      setTheme((prev) => ({ ...prev, public: DEFAULT_THEME.public }));
      toast.info("Reset public website styling to factory defaults.");
    } else if (scope === "portal") {
      setTheme((prev) => ({ ...prev, portal: DEFAULT_THEME.portal }));
      toast.info("Reset musician portal styling to factory defaults.");
    } else {
      setTheme((prev) => ({
        ...prev,
        bandName: DEFAULT_THEME.bandName,
        monogram: DEFAULT_THEME.monogram,
        logoUrl: DEFAULT_THEME.logoUrl,
        faviconUrl: DEFAULT_THEME.faviconUrl,
        activeSeason: DEFAULT_THEME.activeSeason,
        publicTypography: DEFAULT_THEME.publicTypography,
        publicVisualPolish: DEFAULT_THEME.publicVisualPolish,
        portalTypography: DEFAULT_THEME.portalTypography,
        portalVisualPolish: DEFAULT_THEME.portalVisualPolish,
      }));
      toast.info("Reset brand identity, typography, and visual polish to defaults.");
    }
  };

  const getEffectiveTypography = (scope: "public" | "portal"): TypographyConfig => {
    if (scope === "public") {
      return theme.publicTypography || theme.typography || DEFAULT_THEME.publicTypography;
    }
    return theme.portalTypography || theme.typography || DEFAULT_THEME.portalTypography;
  };

  const getEffectiveVisualPolish = (scope: "public" | "portal"): VisualPolishConfig => {
    if (scope === "public") {
      return theme.publicVisualPolish || theme.visualPolish || DEFAULT_THEME.publicVisualPolish;
    }
    return theme.portalVisualPolish || theme.visualPolish || DEFAULT_THEME.portalVisualPolish;
  };

  const updateScopedTypography = (scope: "public" | "portal", patch: Partial<TypographyConfig>) => {
    const key = scope === "public" ? "publicTypography" : "portalTypography";
    setTheme((prev) => ({
      ...prev,
      [key]: {
        ...getEffectiveTypography(scope),
        ...patch,
      },
    }));
  };

  const updateScopedVisualPolish = (scope: "public" | "portal", patch: Partial<VisualPolishConfig>) => {
    const key = scope === "public" ? "publicVisualPolish" : "portalVisualPolish";
    setTheme((prev) => ({
      ...prev,
      [key]: {
        ...getEffectiveVisualPolish(scope),
        ...patch,
      },
    }));
  };

  const publicThemes: PublicThemeOption[] = (theme.publicThemes && theme.publicThemes.length > 0)
    ? theme.publicThemes
    : DEFAULT_PUBLIC_THEMES;

  const selectedTheme = publicThemes.find((t) => t.id === selectedPublicThemeId) || publicThemes[0];

  const handleUpdateSelectedPublicTheme = (patch: Partial<PublicThemeOption>) => {
    const updatedList = publicThemes.map((item) => {
      if (item.id === selectedTheme.id) {
        return { ...item, ...patch };
      }
      return item;
    });

    const isCurrentlyActive = (theme.public.schemeId || "default") === selectedTheme.id;
    setTheme((prev) => ({
      ...prev,
      publicThemes: updatedList,
      ...(isCurrentlyActive
        ? {
            public: {
              ...prev.public,
              ...patch,
              schemeId: selectedTheme.id,
            },
          }
        : {}),
    }));
  };

  const handleApplyPublicTheme = (themeOption: PublicThemeOption) => {
    setTheme((prev) => ({
      ...prev,
      public: {
        ...prev.public,
        schemeId: themeOption.id,
        primaryColor: themeOption.primaryColor,
        accentColor: themeOption.accentColor,
        logoColor: themeOption.logoColor,
        backgroundColor: themeOption.backgroundColor,
        surfaceColor: themeOption.surfaceColor,
        mutedSurfaceColor: themeOption.mutedSurfaceColor,
        borderColor: themeOption.borderColor,
        textColor: themeOption.textColor,
      },
    }));
    toast.success(`"${themeOption.name}" applied as active public site theme! Click "Save Brand Settings" to publish.`);
  };

  const handleCreatePublicTheme = () => {
    const newId = `custom-${Date.now()}`;
    const newTheme: PublicThemeOption = {
      id: newId,
      name: `Custom Theme ${publicThemes.length + 1}`,
      description: "Custom user-generated public site styling.",
      isDefault: false,
      primaryColor: selectedTheme.primaryColor || "#facc15",
      accentColor: selectedTheme.accentColor || "#f59e0b",
      logoColor: selectedTheme.logoColor || "#facc15",
      backgroundColor: selectedTheme.backgroundColor || "#020617",
      surfaceColor: selectedTheme.surfaceColor || "#0f172a",
      mutedSurfaceColor: selectedTheme.mutedSurfaceColor || "#1e293b",
      borderColor: selectedTheme.borderColor || "#334155",
      textColor: selectedTheme.textColor || "#f8fafc",
    };
    setTheme((prev) => ({
      ...prev,
      publicThemes: [...publicThemes, newTheme],
    }));
    setSelectedPublicThemeId(newId);
    toast.success("Created new custom theme! You can now customize its colors and name.");
  };

  const handleDeletePublicTheme = (id: string) => {
    if (id === "default") {
      toast.error("The default Eagleburger Gold theme cannot be deleted.");
      return;
    }
    const updatedList = publicThemes.filter((t) => t.id !== id);
    const wasActive = theme.public.schemeId === id;
    const fallbackTheme = updatedList[0] || DEFAULT_PUBLIC_THEMES[0];

    setTheme((prev) => ({
      ...prev,
      publicThemes: updatedList,
      ...(wasActive
        ? {
            public: {
              ...prev.public,
              schemeId: fallbackTheme.id,
              primaryColor: fallbackTheme.primaryColor,
              accentColor: fallbackTheme.accentColor,
              logoColor: fallbackTheme.logoColor,
              backgroundColor: fallbackTheme.backgroundColor,
              surfaceColor: fallbackTheme.surfaceColor,
              mutedSurfaceColor: fallbackTheme.mutedSurfaceColor,
              borderColor: fallbackTheme.borderColor,
              textColor: fallbackTheme.textColor,
            },
          }
        : {}),
    }));

    setSelectedPublicThemeId(fallbackTheme.id);
    toast.info("Theme option removed.");
  };

  const handleResetSelectedTheme = () => {
    const factory = DEFAULT_PUBLIC_THEMES.find((t) => t.id === selectedTheme.id);
    if (factory) {
      handleUpdateSelectedPublicTheme({
        name: factory.name,
        description: factory.description,
        primaryColor: factory.primaryColor,
        accentColor: factory.accentColor,
        logoColor: factory.logoColor,
        backgroundColor: factory.backgroundColor,
        surfaceColor: factory.surfaceColor,
        mutedSurfaceColor: factory.mutedSurfaceColor,
        borderColor: factory.borderColor,
        textColor: factory.textColor,
      });
      toast.info(`Reset "${factory.name}" to factory default values.`);
    } else {
      const def = DEFAULT_PUBLIC_THEMES[0];
      handleUpdateSelectedPublicTheme({
        primaryColor: def.primaryColor,
        accentColor: def.accentColor,
        logoColor: def.logoColor,
        backgroundColor: def.backgroundColor,
        surfaceColor: def.surfaceColor,
        mutedSurfaceColor: def.mutedSurfaceColor,
        borderColor: def.borderColor,
        textColor: def.textColor,
      });
      toast.info("Reset custom theme colors to default palette.");
    }
  };

  const portalThemes: PortalThemeOption[] = (theme.portalThemes && theme.portalThemes.length > 0)
    ? theme.portalThemes
    : DEFAULT_PORTAL_THEMES;

  const selectedPortalTheme = portalThemes.find((t) => t.id === selectedPortalThemeId) || portalThemes[0];

  const handleUpdateSelectedPortalTheme = (patch: Partial<PortalThemeOption>) => {
    const updatedList = portalThemes.map((item) => {
      if (item.id === selectedPortalTheme.id) {
        return { ...item, ...patch };
      }
      return item;
    });

    const isCurrentlyActive = (theme.portal.schemeId || "eagleburger-gold") === selectedPortalTheme.id;
    setTheme((prev) => ({
      ...prev,
      portalThemes: updatedList,
      ...(isCurrentlyActive
        ? {
            portal: {
              ...prev.portal,
              ...patch,
              schemeId: selectedPortalTheme.id,
            },
          }
        : {}),
    }));
  };

  const handleApplyPortalTheme = (themeOption: PortalThemeOption) => {
    setTheme((prev) => ({
      ...prev,
      portal: {
        ...prev.portal,
        schemeId: themeOption.id,
        primaryColor: themeOption.primaryColor,
        accentColor: themeOption.accentColor,
        logoColor: themeOption.logoColor || themeOption.primaryColor,
        backgroundColor: themeOption.backgroundColor,
        surfaceColor: themeOption.surfaceColor,
        mutedSurfaceColor: themeOption.mutedSurfaceColor,
        borderColor: themeOption.borderColor,
        textColor: themeOption.textColor,
      },
    }));
    toast.success(`"${themeOption.name}" set as ensemble default portal theme! Click "Save Brand Settings" to publish.`);
  };

  const handleCreatePortalTheme = () => {
    const newId = `custom-portal-${Date.now()}`;
    const newTheme: PortalThemeOption = {
      id: newId,
      name: `Custom Theme ${portalThemes.length + 1}`,
      description: "Custom atmospheric theme for musician portal operations.",
      tagline: "",
      isDefault: false,
      primaryColor: selectedPortalTheme.primaryColor || "#facc15",
      accentColor: selectedPortalTheme.accentColor || "#f59e0b",
      logoColor: selectedPortalTheme.logoColor || "#facc15",
      backgroundColor: selectedPortalTheme.backgroundColor || "#0a0802",
      surfaceColor: selectedPortalTheme.surfaceColor || "#151105",
      mutedSurfaceColor: selectedPortalTheme.mutedSurfaceColor || "#1e1808",
      borderColor: selectedPortalTheme.borderColor || "#382c0f",
      textColor: selectedPortalTheme.textColor || "#fefce8",
      previewSwatches: [
        selectedPortalTheme.primaryColor || "#facc15",
        selectedPortalTheme.accentColor || "#f59e0b",
        selectedPortalTheme.surfaceColor || "#151105",
        selectedPortalTheme.backgroundColor || "#0a0802"
      ],
    };
    setTheme((prev) => ({
      ...prev,
      portalThemes: [...portalThemes, newTheme],
    }));
    setSelectedPortalThemeId(newId);
    toast.success("Created new custom portal theme! Customize its palette below.");
  };

  const handleDeletePortalTheme = (id: string) => {
    if (id === "eagleburger-gold") {
      toast.error("The default Eagleburger Gold portal theme cannot be deleted.");
      return;
    }
    const updatedList = portalThemes.filter((t) => t.id !== id);
    const wasActive = theme.portal.schemeId === id;
    const fallbackTheme = updatedList[0] || DEFAULT_PORTAL_THEMES[0];

    setTheme((prev) => ({
      ...prev,
      portalThemes: updatedList,
      ...(wasActive
        ? {
            portal: {
              ...prev.portal,
              schemeId: fallbackTheme.id,
              primaryColor: fallbackTheme.primaryColor,
              accentColor: fallbackTheme.accentColor,
              logoColor: fallbackTheme.logoColor || fallbackTheme.primaryColor,
              backgroundColor: fallbackTheme.backgroundColor,
              surfaceColor: fallbackTheme.surfaceColor,
              mutedSurfaceColor: fallbackTheme.mutedSurfaceColor,
              borderColor: fallbackTheme.borderColor,
              textColor: fallbackTheme.textColor,
            },
          }
        : {}),
    }));

    setSelectedPortalThemeId(fallbackTheme.id);
    toast.info("Portal theme option removed.");
  };

  const handleResetSelectedPortalTheme = () => {
    const factory = DEFAULT_PORTAL_THEMES.find((t) => t.id === selectedPortalTheme.id);
    if (factory) {
      handleUpdateSelectedPortalTheme({
        name: factory.name,
        description: factory.description,
        primaryColor: factory.primaryColor,
        accentColor: factory.accentColor,
        logoColor: factory.logoColor,
        backgroundColor: factory.backgroundColor,
        surfaceColor: factory.surfaceColor,
        mutedSurfaceColor: factory.mutedSurfaceColor,
        borderColor: factory.borderColor,
        textColor: factory.textColor,
        previewSwatches: factory.previewSwatches,
      });
      toast.info(`Reset "${factory.name}" to factory default values.`);
    } else {
      const def = DEFAULT_PORTAL_THEMES[0];
      handleUpdateSelectedPortalTheme({
        primaryColor: def.primaryColor,
        accentColor: def.accentColor,
        logoColor: def.logoColor,
        backgroundColor: def.backgroundColor,
        surfaceColor: def.surfaceColor,
        mutedSurfaceColor: def.mutedSurfaceColor,
        borderColor: def.borderColor,
        textColor: def.textColor,
        previewSwatches: def.previewSwatches,
      });
      toast.info("Reset custom portal theme colors to default palette.");
    }
  };

  const isDirty = Boolean(savedTheme && JSON.stringify(theme) !== JSON.stringify(savedTheme));

  const handleSaveTheme = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsSaving(true);
    setSavedSuccess(false);

    try {
      const payloadToValidate = {
        ...theme,
        // Sync legacy flat fields for backwards compatibility
        primaryColor: theme.public.primaryColor,
        accentColor: theme.public.accentColor,
        subheading: theme.public.tagline,
        schemaVersion: 2,
        updatedAt: new Date().toISOString(),
      };

      const validated = ThemeSchema.parse(payloadToValidate);
      await setDoc(doc(db, "theme", "config"), validated, { merge: true });

      setSavedTheme(validated);
      setSavedSuccess(true);
      toast.success("Theme settings saved successfully!");
      setTimeout(() => setSavedSuccess(false), 3000);
    } catch (err) {
      toast.error("Failed to save theme settings: " + (err instanceof Error ? err.message : String(err)));
    } finally {
      setIsSaving(false);
    }
  };

  const handleDiscard = () => {
    if (savedTheme) {
      setTheme(savedTheme);
      toast.info("Theme modifications reverted to saved state.");
    }
  };

  return (
    <div className={`p-4 sm:p-6 max-w-6xl mx-auto space-y-6 ${isDirty ? "pb-24" : ""}`}>
      <PortalBreadcrumb className="mb-2" />
      {/* Header Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shadow-xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-yellow-400 bg-slate-950 px-2.5 py-0.5 rounded border border-slate-800">
              Brand & Theme Studio
            </span>
            <span className="text-xs font-mono text-slate-400">
              v2 Scoped Schemas
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white">Brand & Palette Customizer</h1>
          <p className="text-xs text-slate-400">
            Define independent style themes for the Public Fan Site and Musician Portal, alongside global ensemble identity tokens.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={(e) => handleSaveTheme(e)}
            disabled={isSaving || !isDirty}
            className={`font-bold px-4 py-2.5 rounded-xl text-xs flex items-center gap-1.5 transition shadow-md ${
              isDirty
                ? "bg-yellow-400 hover:bg-yellow-300 text-slate-950"
                : "bg-slate-800 text-slate-500 cursor-not-allowed opacity-60"
            }`}
          >
            {isSaving ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : savedSuccess ? (
              <Check className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <Save className="w-3.5 h-3.5" />
            )}
            <span>{isSaving ? "Saving..." : savedSuccess ? "Settings Saved!" : isDirty ? "Save Brand Settings" : "Saved"}</span>
          </button>
        </div>
      </div>

      {/* Scope Navigation Tabs */}
      <div className="flex border-b border-slate-800 gap-2">
        <button
          type="button"
          onClick={() => setActiveTab("public")}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition ${
            activeTab === "public"
              ? "border-yellow-400 text-yellow-400 bg-slate-900/50 rounded-t-xl"
              : "border-transparent text-slate-400 hover:text-white"
          }`}
        >
          <Globe className="w-4 h-4" />
          <span>Public Website Theme</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("portal")}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition ${
            activeTab === "portal"
              ? "border-yellow-400 text-yellow-400 bg-slate-900/50 rounded-t-xl"
              : "border-transparent text-slate-400 hover:text-white"
          }`}
        >
          <LayoutDashboard className="w-4 h-4" />
          <span>Musician Portal Theme</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("identity")}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition ${
            activeTab === "identity"
              ? "border-yellow-400 text-yellow-400 bg-slate-900/50 rounded-t-xl"
              : "border-transparent text-slate-400 hover:text-white"
          }`}
        >
          <Sparkles className="w-4 h-4" />
          <span>Brand Identity & Visual Polish</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Tab-Dependent Customizer Form */}
        <div className="lg:col-span-7 space-y-4">
          {activeTab === "public" && (
            <div className="space-y-4">
              {/* Presets Gallery Card */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 shadow-xl">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
                  <div>
                    <h2 className="text-sm font-bold text-white flex items-center gap-2">
                      <Globe className="w-4 h-4 text-yellow-400" /> Public Site Themes & Palettes
                    </h2>
                    <p className="text-[11px] text-slate-400">
                      Select, generate, and edit style presets for the public fan site. The default theme preserves the signature Eagleburger look.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleCreatePublicTheme}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-yellow-400/10 text-yellow-400 border border-yellow-400/30 hover:bg-yellow-400/20 transition self-start sm:self-auto"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Create Theme</span>
                  </button>
                </div>

                {/* Themes Grid */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400">
                      Available Presets ({publicThemes.length})
                    </span>
                    <span className="text-[10px] text-slate-500">
                      Click to edit or preview
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {publicThemes.map((option) => {
                      const isSelected = selectedTheme.id === option.id;
                      const isActiveLive = (theme.public.schemeId || "default") === option.id;

                      return (
                        <div
                          key={option.id}
                          onClick={() => setSelectedPublicThemeId(option.id)}
                          className={`p-3.5 rounded-xl border cursor-pointer transition text-left space-y-2.5 relative ${
                            isSelected
                              ? "border-yellow-400 bg-slate-950/90 shadow-md ring-1 ring-yellow-400/40"
                              : "border-slate-800 bg-slate-950/40 hover:border-slate-700 hover:bg-slate-950/70"
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <div className="text-xs font-bold text-white flex items-center gap-1.5">
                                {option.name}
                                {option.isDefault && (
                                  <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 border border-slate-700">
                                    Default
                                  </span>
                                )}
                              </div>
                              <p className="text-[10px] text-slate-400 line-clamp-1 mt-0.5">
                                {option.description || "Public site color theme"}
                              </p>
                            </div>

                            {isActiveLive ? (
                              <span className="shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                                <CheckCircle className="w-2.5 h-2.5" /> Live
                              </span>
                            ) : null}
                          </div>

                          {/* Swatches strip */}
                          <div className="flex items-center justify-between pt-1 border-t border-slate-800/60">
                            <div className="flex items-center gap-1.5">
                              <span
                                title="Primary Color"
                                className="w-4 h-4 rounded-full border border-slate-800 shadow-sm"
                                style={{ backgroundColor: option.primaryColor }}
                              />
                              <span
                                title="Accent Color"
                                className="w-4 h-4 rounded-full border border-slate-800 shadow-sm"
                                style={{ backgroundColor: option.accentColor }}
                              />
                              <span
                                title="Logo Tint"
                                className="w-4 h-4 rounded-full border border-slate-800 shadow-sm"
                                style={{ backgroundColor: option.logoColor || option.primaryColor }}
                              />
                              <span
                                title="Surface Color"
                                className="w-4 h-4 rounded-full border border-slate-800 shadow-sm"
                                style={{ backgroundColor: option.surfaceColor }}
                              />
                              <span
                                title="Background Color"
                                className="w-4 h-4 rounded-full border border-slate-800 shadow-sm"
                                style={{ backgroundColor: option.backgroundColor }}
                              />
                            </div>
                            <span className="text-[10px] font-mono text-slate-500">
                              {isSelected ? "Editing" : "Select"}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Theme Customizer Form */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 shadow-xl">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-yellow-400 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                        Theme Editor
                      </span>
                      <span className="text-xs font-bold text-white">
                        {selectedTheme.name}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Adjust colors, surfaces, and emblem tints for this theme preset.
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    {(theme.public.schemeId || "default") !== selectedTheme.id ? (
                      <button
                        type="button"
                        onClick={() => handleApplyPublicTheme(selectedTheme)}
                        className="text-xs font-bold px-3 py-1.5 rounded-xl bg-yellow-400 hover:bg-yellow-300 text-slate-950 flex items-center gap-1.5 transition shadow"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Apply as Live Site Theme</span>
                      </button>
                    ) : (
                      <span className="text-[11px] font-bold px-2.5 py-1 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                        <CheckCircle className="w-3.5 h-3.5" />
                        <span>Active on Live Site</span>
                      </span>
                    )}

                    <button
                      type="button"
                      onClick={handleResetSelectedTheme}
                      title="Reset this preset to defaults"
                      className="text-xs text-slate-400 hover:text-white px-2.5 py-1.5 rounded-xl border border-slate-800 hover:border-slate-700 flex items-center gap-1 transition"
                    >
                      <RefreshCw className="w-3 h-3" />
                      <span className="hidden sm:inline">Reset</span>
                    </button>

                    {!selectedTheme.isDefault && (
                      <button
                        type="button"
                        onClick={() => handleDeletePublicTheme(selectedTheme.id)}
                        title="Delete custom theme"
                        className="text-xs text-rose-400 hover:text-rose-300 px-2.5 py-1.5 rounded-xl border border-rose-900/40 hover:border-rose-800 flex items-center gap-1 transition"
                      >
                        <Trash2 className="w-3 h-3" />
                        <span className="hidden sm:inline">Delete</span>
                      </button>
                    )}
                  </div>
                </div>

                <div className="space-y-4">
                  {/* Notice callout regarding page headline & copy */}
                  <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3 flex items-start gap-2.5 text-slate-400 text-xs">
                    <Info className="w-4 h-4 text-yellow-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-semibold text-slate-200">Marketing Taglines & Headlines: </span>
                      Hero headlines, marketing copy, and home page taglines are managed in the{" "}
                      <a href="/admin/pages" className="text-yellow-400 hover:underline font-semibold">
                        Page Editor (Admin &gt; Pages)
                      </a>
                      . This studio manages visual color palettes, surfaces, and logo emblem styling.
                    </div>
                  </div>

                  {/* Theme Info Fields */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                        Preset Display Name
                      </label>
                      <input
                        type="text"
                        value={selectedTheme.name}
                        onChange={(e) => handleUpdateSelectedPublicTheme({ name: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-yellow-400"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                        Preset Description / Vibe
                      </label>
                      <input
                        type="text"
                        value={selectedTheme.description || ""}
                        onChange={(e) => handleUpdateSelectedPublicTheme({ description: e.target.value })}
                        placeholder="e.g. Signature brass, dark ambient revelry"
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-yellow-400"
                      />
                    </div>
                  </div>

                  {/* Palette Controls */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-800/60">
                    <div>
                      <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                        Primary Brand Accent (Hex)
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={selectedTheme.primaryColor}
                          onChange={(e) => handleUpdateSelectedPublicTheme({ primaryColor: e.target.value })}
                          className="w-8 h-8 rounded border border-slate-800 bg-slate-950 cursor-pointer"
                        />
                        <input
                          type="text"
                          value={selectedTheme.primaryColor}
                          onChange={(e) => handleUpdateSelectedPublicTheme({ primaryColor: e.target.value })}
                          className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-yellow-400"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                        Secondary Accent / Highlight (Hex)
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={selectedTheme.accentColor}
                          onChange={(e) => handleUpdateSelectedPublicTheme({ accentColor: e.target.value })}
                          className="w-8 h-8 rounded border border-slate-800 bg-slate-950 cursor-pointer"
                        />
                        <input
                          type="text"
                          value={selectedTheme.accentColor}
                          onChange={(e) => handleUpdateSelectedPublicTheme({ accentColor: e.target.value })}
                          className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-yellow-400"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                        Logo Emblem Tint (Hex)
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={selectedTheme.logoColor || selectedTheme.primaryColor || "#facc15"}
                          onChange={(e) => handleUpdateSelectedPublicTheme({ logoColor: e.target.value })}
                          className="w-8 h-8 rounded border border-slate-800 bg-slate-950 cursor-pointer"
                        />
                        <input
                          type="text"
                          value={selectedTheme.logoColor || selectedTheme.primaryColor || "#facc15"}
                          onChange={(e) => handleUpdateSelectedPublicTheme({ logoColor: e.target.value })}
                          className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-yellow-400"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                        Site Background (Hex)
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={selectedTheme.backgroundColor}
                          onChange={(e) => handleUpdateSelectedPublicTheme({ backgroundColor: e.target.value })}
                          className="w-8 h-8 rounded border border-slate-800 bg-slate-950 cursor-pointer"
                        />
                        <input
                          type="text"
                          value={selectedTheme.backgroundColor}
                          onChange={(e) => handleUpdateSelectedPublicTheme({ backgroundColor: e.target.value })}
                          className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-yellow-400"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                        Card / Surface Background (Hex)
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={selectedTheme.surfaceColor}
                          onChange={(e) => handleUpdateSelectedPublicTheme({ surfaceColor: e.target.value })}
                          className="w-8 h-8 rounded border border-slate-800 bg-slate-950 cursor-pointer"
                        />
                        <input
                          type="text"
                          value={selectedTheme.surfaceColor}
                          onChange={(e) => handleUpdateSelectedPublicTheme({ surfaceColor: e.target.value })}
                          className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-yellow-400"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                        Inner Wells / Muted Surfaces (Hex)
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={selectedTheme.mutedSurfaceColor || "#1e293b"}
                          onChange={(e) => handleUpdateSelectedPublicTheme({ mutedSurfaceColor: e.target.value })}
                          className="w-8 h-8 rounded border border-slate-800 bg-slate-950 cursor-pointer"
                        />
                        <input
                          type="text"
                          value={selectedTheme.mutedSurfaceColor || "#1e293b"}
                          onChange={(e) => handleUpdateSelectedPublicTheme({ mutedSurfaceColor: e.target.value })}
                          className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-yellow-400"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                        Border & Separators (Hex)
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={selectedTheme.borderColor || "#334155"}
                          onChange={(e) => handleUpdateSelectedPublicTheme({ borderColor: e.target.value })}
                          className="w-8 h-8 rounded border border-slate-800 bg-slate-950 cursor-pointer"
                        />
                        <input
                          type="text"
                          value={selectedTheme.borderColor || "#334155"}
                          onChange={(e) => handleUpdateSelectedPublicTheme({ borderColor: e.target.value })}
                          className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-yellow-400"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                        Main Text Color (Hex)
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={selectedTheme.textColor || "#f8fafc"}
                          onChange={(e) => handleUpdateSelectedPublicTheme({ textColor: e.target.value })}
                          className="w-8 h-8 rounded border border-slate-800 bg-slate-950 cursor-pointer"
                        />
                        <input
                          type="text"
                          value={selectedTheme.textColor || "#f8fafc"}
                          onChange={(e) => handleUpdateSelectedPublicTheme({ textColor: e.target.value })}
                          className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-yellow-400"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === "portal" && (
            <div className="space-y-4">
              {/* Portal Themes Gallery Card */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 shadow-xl">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
                  <div>
                    <h2 className="text-sm font-bold text-white flex items-center gap-2">
                      <LayoutDashboard className="w-4 h-4 text-yellow-400" /> Musician Portal Themes & Presets
                    </h2>
                    <p className="text-[11px] text-slate-400">
                      Manage color themes available to band members in their personal Portal Theme chooser. Create new options, customize palette tokens, and set the ensemble default.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleCreatePortalTheme}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-yellow-400/10 text-yellow-400 border border-yellow-400/30 hover:bg-yellow-400/20 transition self-start sm:self-auto"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Create Portal Theme</span>
                  </button>
                </div>

                {/* Themes Grid */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400">
                      Available Themes ({portalThemes.length})
                    </span>
                    <span className="text-[10px] text-slate-500">
                      Click to edit or preview
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {portalThemes.map((option) => {
                      const isSelected = selectedPortalTheme.id === option.id;
                      const isActiveLive = (theme.portal.schemeId || "eagleburger-gold") === option.id;

                      return (
                        <div
                          key={option.id}
                          onClick={() => setSelectedPortalThemeId(option.id)}
                          className={`p-3.5 rounded-xl border cursor-pointer transition text-left space-y-2.5 relative ${
                            isSelected
                              ? "border-yellow-400 bg-slate-950/90 shadow-md ring-1 ring-yellow-400/40"
                              : "border-slate-800 bg-slate-950/40 hover:border-slate-700 hover:bg-slate-950/70"
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <div className="text-xs font-bold text-white flex items-center gap-1.5">
                                {option.name}
                                {option.isDefault && (
                                  <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 border border-slate-700">
                                    Default
                                  </span>
                                )}
                              </div>
                              <p className="text-[10px] text-slate-400 line-clamp-1 mt-0.5">
                                {option.description || "Musician portal theme"}
                              </p>
                            </div>

                            {isActiveLive ? (
                              <span className="shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                                <CheckCircle className="w-2.5 h-2.5" /> Ensemble Default
                              </span>
                            ) : null}
                          </div>

                          {/* Swatches strip */}
                          <div className="flex items-center justify-between pt-1 border-t border-slate-800/60">
                            <div className="flex items-center gap-1.5">
                              <span
                                title="Primary Tool Highlight"
                                className="w-4 h-4 rounded-full border border-slate-800 shadow-sm"
                                style={{ backgroundColor: option.primaryColor }}
                              />
                              <span
                                title="Secondary Accent"
                                className="w-4 h-4 rounded-full border border-slate-800 shadow-sm"
                                style={{ backgroundColor: option.accentColor }}
                              />
                              <span
                                title="Logo Tint"
                                className="w-4 h-4 rounded-full border border-slate-800 shadow-sm"
                                style={{ backgroundColor: option.logoColor || option.primaryColor }}
                              />
                              <span
                                title="Surface Color"
                                className="w-4 h-4 rounded-full border border-slate-800 shadow-sm"
                                style={{ backgroundColor: option.surfaceColor }}
                              />
                              <span
                                title="Background Color"
                                className="w-4 h-4 rounded-full border border-slate-800 shadow-sm"
                                style={{ backgroundColor: option.backgroundColor }}
                              />
                            </div>
                            <span className="text-[10px] font-mono text-slate-500">
                              {isSelected ? "Editing" : "Select"}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Portal Theme Customizer Form */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 shadow-xl">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-yellow-400 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                        Theme Editor
                      </span>
                      <span className="text-xs font-bold text-white">
                        {selectedPortalTheme.name}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Adjust surfaces, tool highlights, and emblem tint for this portal theme preset.
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    {(theme.portal.schemeId || "eagleburger-gold") !== selectedPortalTheme.id ? (
                      <button
                        type="button"
                        onClick={() => handleApplyPortalTheme(selectedPortalTheme)}
                        className="text-xs font-bold px-3 py-1.5 rounded-xl bg-yellow-400 hover:bg-yellow-300 text-slate-950 flex items-center gap-1.5 transition shadow"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Set as Ensemble Default</span>
                      </button>
                    ) : (
                      <span className="text-[11px] font-bold px-2.5 py-1 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                        <CheckCircle className="w-3.5 h-3.5" />
                        <span>Active Ensemble Default</span>
                      </span>
                    )}

                    <button
                      type="button"
                      onClick={handleResetSelectedPortalTheme}
                      title="Reset this preset to defaults"
                      className="text-xs text-slate-400 hover:text-white px-2.5 py-1.5 rounded-xl border border-slate-800 hover:border-slate-700 flex items-center gap-1 transition"
                    >
                      <RefreshCw className="w-3 h-3" />
                      <span className="hidden sm:inline">Reset</span>
                    </button>

                    {!selectedPortalTheme.isDefault && (
                      <button
                        type="button"
                        onClick={() => handleDeletePortalTheme(selectedPortalTheme.id)}
                        title="Delete custom theme"
                        className="text-xs text-rose-400 hover:text-rose-300 px-2.5 py-1.5 rounded-xl border border-rose-900/40 hover:border-rose-800 flex items-center gap-1 transition"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Delete</span>
                      </button>
                    )}
                  </div>
                </div>

                <div className="space-y-4">
                  {/* Informational Callout */}
                  <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3 flex items-start gap-2.5 text-slate-400 text-xs">
                    <Info className="w-4 h-4 text-yellow-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-semibold text-slate-200">Musician Preference Availability: </span>
                      Any preset saved here is automatically made available to all musicians in their personal Portal Theme chooser (the palette button in the navigation header). The legacy operational subheading field has been retired from this form.
                    </div>
                  </div>

                  {/* Theme Info Fields */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                        Preset Display Name
                      </label>
                      <input
                        type="text"
                        value={selectedPortalTheme.name}
                        onChange={(e) => handleUpdateSelectedPortalTheme({ name: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-yellow-400"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                        Preset Description / Character
                      </label>
                      <input
                        type="text"
                        value={selectedPortalTheme.description || ""}
                        onChange={(e) => handleUpdateSelectedPortalTheme({ description: e.target.value })}
                        placeholder="e.g. Traditional marching corps atmosphere with royal garnet surfaces"
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-yellow-400"
                      />
                    </div>
                  </div>

                  {/* Palette Controls */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-800/60">
                    <div>
                      <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                        Tool Highlight / Active Accent (Hex)
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={selectedPortalTheme.primaryColor}
                          onChange={(e) => handleUpdateSelectedPortalTheme({ primaryColor: e.target.value })}
                          className="w-8 h-8 rounded border border-slate-800 bg-slate-950 cursor-pointer"
                        />
                        <input
                          type="text"
                          value={selectedPortalTheme.primaryColor}
                          onChange={(e) => handleUpdateSelectedPortalTheme({ primaryColor: e.target.value })}
                          className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-yellow-400"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                        Secondary Accent / Badge Tint (Hex)
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={selectedPortalTheme.accentColor}
                          onChange={(e) => handleUpdateSelectedPortalTheme({ accentColor: e.target.value })}
                          className="w-8 h-8 rounded border border-slate-800 bg-slate-950 cursor-pointer"
                        />
                        <input
                          type="text"
                          value={selectedPortalTheme.accentColor}
                          onChange={(e) => handleUpdateSelectedPortalTheme({ accentColor: e.target.value })}
                          className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-yellow-400"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                        Portal Logo Emblem Tint (Hex)
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={selectedPortalTheme.logoColor || selectedPortalTheme.primaryColor || "#facc15"}
                          onChange={(e) => handleUpdateSelectedPortalTheme({ logoColor: e.target.value })}
                          className="w-8 h-8 rounded border border-slate-800 bg-slate-950 cursor-pointer"
                        />
                        <input
                          type="text"
                          value={selectedPortalTheme.logoColor || selectedPortalTheme.primaryColor || "#facc15"}
                          onChange={(e) => handleUpdateSelectedPortalTheme({ logoColor: e.target.value })}
                          className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-yellow-400"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                        Ambient Workspace Background (Hex)
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={selectedPortalTheme.backgroundColor}
                          onChange={(e) => handleUpdateSelectedPortalTheme({ backgroundColor: e.target.value })}
                          className="w-8 h-8 rounded border border-slate-800 bg-slate-950 cursor-pointer"
                        />
                        <input
                          type="text"
                          value={selectedPortalTheme.backgroundColor}
                          onChange={(e) => handleUpdateSelectedPortalTheme({ backgroundColor: e.target.value })}
                          className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-yellow-400"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                        Card & Sidebar Surface (Hex)
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={selectedPortalTheme.surfaceColor}
                          onChange={(e) => handleUpdateSelectedPortalTheme({ surfaceColor: e.target.value })}
                          className="w-8 h-8 rounded border border-slate-800 bg-slate-950 cursor-pointer"
                        />
                        <input
                          type="text"
                          value={selectedPortalTheme.surfaceColor}
                          onChange={(e) => handleUpdateSelectedPortalTheme({ surfaceColor: e.target.value })}
                          className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-yellow-400"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                        Inner Well / Search Input Surface (Hex)
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={selectedPortalTheme.mutedSurfaceColor || "#1e1808"}
                          onChange={(e) => handleUpdateSelectedPortalTheme({ mutedSurfaceColor: e.target.value })}
                          className="w-8 h-8 rounded border border-slate-800 bg-slate-950 cursor-pointer"
                        />
                        <input
                          type="text"
                          value={selectedPortalTheme.mutedSurfaceColor || "#1e1808"}
                          onChange={(e) => handleUpdateSelectedPortalTheme({ mutedSurfaceColor: e.target.value })}
                          className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-yellow-400"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                        Card & Divider Border Tint (Hex)
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={selectedPortalTheme.borderColor || "#382c0f"}
                          onChange={(e) => handleUpdateSelectedPortalTheme({ borderColor: e.target.value })}
                          className="w-8 h-8 rounded border border-slate-800 bg-slate-950 cursor-pointer"
                        />
                        <input
                          type="text"
                          value={selectedPortalTheme.borderColor || "#382c0f"}
                          onChange={(e) => handleUpdateSelectedPortalTheme({ borderColor: e.target.value })}
                          className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-yellow-400"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                        High-Contrast Text Color (Hex)
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={selectedPortalTheme.textColor || "#fefce8"}
                          onChange={(e) => handleUpdateSelectedPortalTheme({ textColor: e.target.value })}
                          className="w-8 h-8 rounded border border-slate-800 bg-slate-950 cursor-pointer"
                        />
                        <input
                          type="text"
                          value={selectedPortalTheme.textColor || "#fefce8"}
                          onChange={(e) => handleUpdateSelectedPortalTheme({ textColor: e.target.value })}
                          className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-yellow-400"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === "identity" && (
            <div className="space-y-4">
              {/* Card 1: Core Ensemble Identity & Assets */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 shadow-xl">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div>
                    <h2 className="text-sm font-bold text-white flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-yellow-400" /> Core Ensemble Identity & Assets
                    </h2>
                    <p className="text-[11px] text-slate-400">
                      Primary organizational naming, monogram badge, active marching season, and global image assets.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => resetScope("identity")}
                    className="text-xs text-slate-500 hover:text-slate-300 flex items-center gap-1 transition"
                  >
                    <RefreshCw className="w-3 h-3" /> Defaults
                  </button>
                </div>

                <div className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="sm:col-span-2">
                      <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                        Official Ensemble Name
                      </label>
                      <input
                        type="text"
                        required
                        value={theme.bandName}
                        onChange={(e) => setTheme({ ...theme, bandName: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-yellow-400 font-medium"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                        Band Monogram
                      </label>
                      <input
                        type="text"
                        maxLength={6}
                        value={theme.monogram || "EBB"}
                        onChange={(e) => setTheme({ ...theme, monogram: e.target.value.toUpperCase() })}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-yellow-400 font-mono font-bold tracking-wider focus:outline-none focus:border-yellow-400 uppercase"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                        Active Marching Season
                      </label>
                      <input
                        type="text"
                        value={theme.activeSeason}
                        onChange={(e) => setTheme({ ...theme, activeSeason: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-yellow-400"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                        Logo Asset URI
                      </label>
                      <input
                        type="text"
                        value={theme.logoUrl}
                        onChange={(e) => setTheme({ ...theme, logoUrl: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-yellow-400 font-mono"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                        Favicon URI
                      </label>
                      <input
                        type="text"
                        value={theme.faviconUrl || "/favicon.ico"}
                        onChange={(e) => setTheme({ ...theme, faviconUrl: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-yellow-400 font-mono"
                      />
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 text-[11px] text-slate-400 flex items-start gap-2.5">
                    <Info className="w-4 h-4 text-yellow-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="text-slate-300 font-medium">Looking for social links or website content? </span>
                      Official social media channels (YouTube, Instagram, Facebook), public bios, and hero media are managed directly in the{" "}
                      <a
                        href="/admin/pages"
                        className="text-yellow-400 hover:text-yellow-300 underline font-semibold inline-flex items-center gap-1"
                      >
                        Public Page Editor <ExternalLink className="w-3 h-3 inline" />
                      </a>.
                    </div>
                  </div>
                </div>
              </div>

              {/* Scope Switcher: Public Site Tone vs Musician Portal Tone */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-white flex items-center gap-2">
                    <Sliders className="w-4 h-4 text-yellow-400" /> Aesthetic Tone Scope
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Customize independent styles: punchy street marketing for the public site vs functional focus for the musician portal.
                  </p>
                </div>

                <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800 self-start sm:self-auto">
                  <button
                    type="button"
                    onClick={() => {
                      setIdentityScope("public");
                      setSimulatorScope("public");
                    }}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                      identityScope === "public"
                        ? "bg-yellow-400 text-slate-950 shadow"
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    <Globe className="w-3.5 h-3.5" />
                    <span>Public Site Tone</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIdentityScope("portal");
                      setSimulatorScope("portal");
                    }}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                      identityScope === "portal"
                        ? "bg-yellow-400 text-slate-950 shadow"
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    <LayoutDashboard className="w-3.5 h-3.5" />
                    <span>Musician Portal Tone</span>
                  </button>
                </div>
              </div>

              {/* Card 2: Typography & Lettering (Scoped) */}
              {(() => {
                const currentTypo = getEffectiveTypography(identityScope);
                return (
                  <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-5 shadow-xl">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <h2 className="text-sm font-bold text-white flex items-center gap-2">
                            <Type className="w-4 h-4 text-yellow-400" /> Typography & Lettering
                          </h2>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-yellow-400/10 text-yellow-400 border border-yellow-400/30 uppercase font-bold">
                            {identityScope === "public" ? "Public Site" : "Musician Portal"}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          Configure headline fonts (including slab serifs like Arvo), body copy (including Poppins & serifs), uppercase transforms, and letter tracking.
                        </p>
                      </div>
                    </div>

                    {/* Headings Font Family */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-[11px] font-semibold text-slate-300">
                          Headings Font Family
                        </label>
                        <span className="text-[10px] font-mono text-slate-500">
                          Active: {HEADING_FONT_CONFIG[currentTypo.headingFont].name} ({HEADING_FONT_CONFIG[currentTypo.headingFont].category})
                        </span>
                      </div>

                      {/* Headings Category Filter Pills */}
                      <div className="flex flex-wrap gap-1.5 pb-1">
                        {(["all", "slab", "sans", "serif"] as const).map((cat) => {
                          const count =
                            cat === "all"
                              ? Object.keys(HEADING_FONT_CONFIG).length
                              : Object.values(HEADING_FONT_CONFIG).filter((f) => f.category === cat).length;
                          const label =
                            cat === "all" ? "All Fonts" : cat === "slab" ? "Slab Serif" : cat === "sans" ? "Sans-Serif" : "Classic Serif";
                          const isActive = headingCategoryFilter === cat;
                          return (
                            <button
                              key={cat}
                              type="button"
                              onClick={() => setHeadingCategoryFilter(cat)}
                              className={`text-[10px] font-medium px-2 py-0.5 rounded-md transition ${
                                isActive
                                  ? "bg-yellow-400 text-slate-950 font-bold shadow-sm"
                                  : "bg-slate-900 text-slate-400 hover:text-slate-200 hover:bg-slate-800"
                              }`}
                            >
                              {label} ({count})
                            </button>
                          );
                        })}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                        {(Object.keys(HEADING_FONT_CONFIG) as Array<TypographyConfig["headingFont"]>)
                          .filter((fontKey) => headingCategoryFilter === "all" || HEADING_FONT_CONFIG[fontKey].category === headingCategoryFilter)
                          .map((fontKey) => {
                            const cfg = HEADING_FONT_CONFIG[fontKey];
                            const isSelected = currentTypo.headingFont === fontKey;
                            return (
                              <button
                                key={fontKey}
                                type="button"
                                onClick={() => updateScopedTypography(identityScope, { headingFont: fontKey })}
                                className={`p-3 rounded-xl text-left border transition relative flex flex-col justify-between ${
                                  isSelected
                                    ? "bg-yellow-400/10 border-yellow-400/80 ring-1 ring-yellow-400/50"
                                    : "bg-slate-950 border-slate-800 hover:border-slate-700 hover:bg-slate-900/50"
                                }`}
                              >
                                <div className="flex items-center justify-between gap-1 mb-1">
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-xs font-bold text-white">{cfg.name}</span>
                                    <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 uppercase">
                                      {cfg.category}
                                    </span>
                                  </div>
                                  {isSelected && <CheckCircle className="w-3.5 h-3.5 text-yellow-400 shrink-0" />}
                                </div>
                                <div
                                  className="text-base text-yellow-400 font-bold truncate tracking-wide"
                                  style={{ fontFamily: cfg.family }}
                                >
                                  {cfg.preview}
                                </div>
                                <div className="text-[10px] text-slate-400 mt-1">{cfg.subtitle}</div>
                              </button>
                            );
                          })}
                      </div>
                    </div>

                    {/* Body Font Family */}
                    <div className="space-y-2 pt-2 border-t border-slate-800/80">
                      <div className="flex items-center justify-between">
                        <label className="text-[11px] font-semibold text-slate-300">
                          Body Copy Font Family
                        </label>
                        <span className="text-[10px] font-mono text-slate-500">
                          Active: {BODY_FONT_CONFIG[currentTypo.bodyFont].name} ({BODY_FONT_CONFIG[currentTypo.bodyFont].category})
                        </span>
                      </div>

                      {/* Body Category Filter Pills */}
                      <div className="flex flex-wrap gap-1.5 pb-1">
                        {(["all", "sans", "serif"] as const).map((cat) => {
                          const count =
                            cat === "all"
                              ? Object.keys(BODY_FONT_CONFIG).length
                              : Object.values(BODY_FONT_CONFIG).filter((f) => f.category === cat).length;
                          const label =
                            cat === "all" ? "All Fonts" : cat === "sans" ? "Sans-Serif" : "Reading Serif";
                          const isActive = bodyCategoryFilter === cat;
                          return (
                            <button
                              key={cat}
                              type="button"
                              onClick={() => setBodyCategoryFilter(cat)}
                              className={`text-[10px] font-medium px-2 py-0.5 rounded-md transition ${
                                isActive
                                  ? "bg-yellow-400 text-slate-950 font-bold shadow-sm"
                                  : "bg-slate-900 text-slate-400 hover:text-slate-200 hover:bg-slate-800"
                              }`}
                            >
                              {label} ({count})
                            </button>
                          );
                        })}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                        {(Object.keys(BODY_FONT_CONFIG) as Array<TypographyConfig["bodyFont"]>)
                          .filter((fontKey) => bodyCategoryFilter === "all" || BODY_FONT_CONFIG[fontKey].category === bodyCategoryFilter)
                          .map((fontKey) => {
                            const cfg = BODY_FONT_CONFIG[fontKey];
                            const isSelected = currentTypo.bodyFont === fontKey;
                            return (
                              <button
                                key={fontKey}
                                type="button"
                                onClick={() => updateScopedTypography(identityScope, { bodyFont: fontKey })}
                                className={`p-3 rounded-xl text-left border transition relative flex flex-col justify-between ${
                                  isSelected
                                    ? "bg-yellow-400/10 border-yellow-400/80 ring-1 ring-yellow-400/50"
                                    : "bg-slate-950 border-slate-800 hover:border-slate-700 hover:bg-slate-900/50"
                                }`}
                              >
                                <div className="flex items-center justify-between gap-1 mb-1">
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-xs font-bold text-white">{cfg.name}</span>
                                    <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 uppercase">
                                      {cfg.category}
                                    </span>
                                  </div>
                                  {isSelected && <CheckCircle className="w-3.5 h-3.5 text-yellow-400 shrink-0" />}
                                </div>
                                <div
                                  className="text-xs text-slate-300 line-clamp-2"
                                  style={{ fontFamily: cfg.family }}
                                >
                                  Street brass melodies, drums & rhythm
                                </div>
                                <div className="text-[10px] text-slate-400 mt-1">{cfg.subtitle}</div>
                              </button>
                            );
                          })}
                      </div>
                    </div>

                    {/* Tracking & Uppercase Controls */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-800/80">
                      <div>
                        <label className="text-[11px] font-semibold text-slate-300 block mb-1.5">
                          Headings Letter Tracking
                        </label>
                        <div className="flex gap-2">
                          {(Object.keys(TRACKING_CONFIG) as Array<TypographyConfig["headingTracking"]>).map((trackKey) => {
                            const track = TRACKING_CONFIG[trackKey];
                            const isSelected = currentTypo.headingTracking === trackKey;
                            return (
                              <button
                                key={trackKey}
                                type="button"
                                onClick={() => updateScopedTypography(identityScope, { headingTracking: trackKey })}
                                className={`flex-1 py-1.5 px-2 rounded-xl text-xs font-medium border transition ${
                                  isSelected
                                    ? "bg-yellow-400 text-slate-950 border-yellow-400 font-bold"
                                    : "bg-slate-950 text-slate-400 border-slate-800 hover:text-white hover:border-slate-700"
                                }`}
                              >
                                {track.label}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      <div>
                        <label className="text-[11px] font-semibold text-slate-300 block mb-1.5">
                          Headings Lettercase
                        </label>
                        <label className="flex items-center gap-2.5 p-2 rounded-xl bg-slate-950 border border-slate-800 cursor-pointer hover:border-slate-700 transition">
                          <input
                            type="checkbox"
                            checked={currentTypo.headingUppercase}
                            onChange={(e) => updateScopedTypography(identityScope, { headingUppercase: e.target.checked })}
                            className="w-4 h-4 rounded text-yellow-400 bg-slate-900 border-slate-700 focus:ring-yellow-400 focus:ring-offset-slate-900"
                          />
                          <span className="text-xs text-white font-medium select-none">
                            Force uppercase for {identityScope === "public" ? "public titles & headlines" : "portal headers"}
                          </span>
                        </label>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Card 3: Visual Polish & Atmosphere (Scoped) */}
              {(() => {
                const currentPolish = getEffectiveVisualPolish(identityScope);
                return (
                  <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-5 shadow-xl">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <h2 className="text-sm font-bold text-white flex items-center gap-2">
                            <Sliders className="w-4 h-4 text-yellow-400" /> Visual Polish & Atmosphere
                          </h2>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-yellow-400/10 text-yellow-400 border border-yellow-400/30 uppercase font-bold">
                            {identityScope === "public" ? "Public Site" : "Musician Portal"}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          Configure corner geometry profiles, ambient glow radiance, and atmospheric background textures.
                        </p>
                      </div>
                    </div>

                    {/* Corner Radius Profile */}
                    <div className="space-y-2">
                      <label className="text-[11px] font-semibold text-slate-300 block">
                        Corner Radius Profile
                      </label>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                        {(Object.keys(BORDER_RADIUS_CONFIG) as Array<VisualPolishConfig["borderRadius"]>).map((radKey) => {
                          const rad = BORDER_RADIUS_CONFIG[radKey];
                          const isSelected = currentPolish.borderRadius === radKey;
                          return (
                            <button
                              key={radKey}
                              type="button"
                              onClick={() => updateScopedVisualPolish(identityScope, { borderRadius: radKey })}
                              className={`p-3 text-left border transition relative flex flex-col justify-between ${
                                isSelected
                                  ? "bg-yellow-400/10 border-yellow-400/80 ring-1 ring-yellow-400/50"
                                  : "bg-slate-950 border-slate-800 hover:border-slate-700 hover:bg-slate-900/50"
                              } ${rad.classCard}`}
                            >
                              <div className="flex items-center justify-between gap-1 mb-2">
                                <span className="text-xs font-bold text-white">{rad.label}</span>
                                {isSelected && <CheckCircle className="w-3.5 h-3.5 text-yellow-400 shrink-0" />}
                              </div>
                              <div className="flex items-center gap-2">
                                <div
                                  className="w-7 h-7 bg-yellow-400/20 border border-yellow-400/60"
                                  style={{ borderRadius: rad.styleRadius }}
                                />
                                <span className="text-[10px] text-slate-400">{rad.description}</span>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Accent Glow Intensity */}
                    <div className="space-y-2 pt-2 border-t border-slate-800/80">
                      <label className="text-[11px] font-semibold text-slate-300 block">
                        Accent Glow Intensity
                      </label>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                        {(Object.keys(GLOW_CONFIG) as Array<VisualPolishConfig["glowIntensity"]>).map((glowKey) => {
                          const glow = GLOW_CONFIG[glowKey];
                          const isSelected = currentPolish.glowIntensity === glowKey;
                          return (
                            <button
                              key={glowKey}
                              type="button"
                              onClick={() => updateScopedVisualPolish(identityScope, { glowIntensity: glowKey })}
                              className={`p-3 rounded-xl text-left border transition relative flex flex-col justify-between ${
                                isSelected
                                  ? "bg-yellow-400/10 border-yellow-400/80 ring-1 ring-yellow-400/50"
                                  : "bg-slate-950 border-slate-800 hover:border-slate-700 hover:bg-slate-900/50"
                              }`}
                            >
                              <div className="flex items-center justify-between gap-1 mb-1">
                                <span className="text-xs font-bold text-white">{glow.label}</span>
                                {isSelected && <CheckCircle className="w-3.5 h-3.5 text-yellow-400 shrink-0" />}
                              </div>
                              <div className="flex items-center gap-2 mt-1">
                                <div
                                  className="w-3.5 h-3.5 rounded-full bg-yellow-400 shrink-0"
                                  style={{ boxShadow: glow.shadow }}
                                />
                                <span className="text-[10px] text-slate-400">{glow.description}</span>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Background Texture / Pattern */}
                    <div className="space-y-2 pt-2 border-t border-slate-800/80">
                      <label className="text-[11px] font-semibold text-slate-300 block">
                        Background Texture & Atmosphere
                      </label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                        {(Object.keys(TEXTURE_CONFIG) as Array<VisualPolishConfig["backgroundTexture"]>).map((texKey) => {
                          const tex = TEXTURE_CONFIG[texKey];
                          const isSelected = currentPolish.backgroundTexture === texKey;
                          return (
                            <button
                              key={texKey}
                              type="button"
                              onClick={() => updateScopedVisualPolish(identityScope, { backgroundTexture: texKey })}
                              className={`p-2.5 rounded-xl text-left border transition relative flex flex-col justify-between ${
                                isSelected
                                  ? "bg-yellow-400/10 border-yellow-400/80 ring-1 ring-yellow-400/50"
                                  : "bg-slate-950 border-slate-800 hover:border-slate-700 hover:bg-slate-900/50"
                              }`}
                            >
                              <div className="flex items-center justify-between gap-1 mb-2">
                                <span className="text-xs font-bold text-white">{tex.label}</span>
                                {isSelected && <CheckCircle className="w-3.5 h-3.5 text-yellow-400 shrink-0" />}
                              </div>
                              <div
                                className="w-full h-10 rounded-lg border border-slate-800 mb-1.5"
                                style={tex.getStyle(theme.public.primaryColor)}
                              />
                              <div className="text-[10px] text-slate-400">{tex.description}</div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
          )}
        </div>

        {/* Right Column: Context-Aware Live Preview Simulator */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-yellow-400" />
                {activeTab === "public"
                  ? "Public Site Live Preview"
                  : activeTab === "portal"
                  ? "Musician Portal Live Preview"
                  : "Brand Identity & Specimen Studio"}
              </span>
              <span className="text-[10px] font-mono text-slate-500">Live Simulator</span>
            </div>

            {/* Simulated Preview Box */}
            {activeTab === "public" && (
              <div
                className="p-5 rounded-xl space-y-3.5 border transition-colors shadow-inner"
                style={{
                  backgroundColor: selectedTheme.backgroundColor,
                  borderColor: (selectedTheme.borderColor || selectedTheme.accentColor) + "50",
                  color: selectedTheme.textColor || "#f8fafc",
                }}
              >
                {/* Simulator Scope Status */}
                <div
                  className="flex items-center justify-between text-[11px] pb-2 border-b"
                  style={{ borderColor: (selectedTheme.borderColor || "#334155") + "60" }}
                >
                  <div className="flex items-center gap-1.5 font-bold">
                    <span className="opacity-70">Preset:</span>
                    <span style={{ color: selectedTheme.primaryColor }}>{selectedTheme.name}</span>
                  </div>
                  {(theme.public.schemeId || "default") === selectedTheme.id ? (
                    <span className="text-[10px] text-emerald-400 font-semibold flex items-center gap-1">
                      <CheckCircle className="w-3 h-3" /> Active on Live Site
                    </span>
                  ) : (
                    <span className="text-[10px] text-yellow-400/90 font-mono">
                      Preview Draft
                    </span>
                  )}
                </div>

                {/* Public Header Mock */}
                <div
                  className="p-3 rounded-xl flex items-center justify-between border shadow-sm"
                  style={{
                    backgroundColor: selectedTheme.surfaceColor,
                    borderColor: (selectedTheme.borderColor || selectedTheme.primaryColor) + "40",
                  }}
                >
                  <div className="flex items-center gap-2.5">
                    <EbbLogo className="w-8 h-8" color={selectedTheme.logoColor || selectedTheme.primaryColor || "#facc15"} />
                    <div>
                      <div className="text-xs font-extrabold uppercase tracking-tight">
                        {theme.bandName}
                      </div>
                      <div
                        className="text-[10px] font-semibold uppercase tracking-wider"
                        style={{ color: selectedTheme.primaryColor }}
                      >
                        Pittsburgh Brass & Battery
                      </div>
                    </div>
                  </div>

                  <span
                    className="text-[10px] font-bold px-2 py-0.5 rounded border"
                    style={{
                      borderColor: selectedTheme.primaryColor,
                      color: selectedTheme.primaryColor,
                    }}
                  >
                    Book
                  </span>
                </div>

                {/* Public Hero Mock */}
                <div className="space-y-2 py-1">
                  <div className="flex items-center gap-2">
                    <span
                      className="text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded"
                      style={{
                        backgroundColor: selectedTheme.primaryColor + "20",
                        color: selectedTheme.primaryColor,
                      }}
                    >
                      {theme.activeSeason}
                    </span>
                    <span
                      className="text-[10px] font-bold px-2 py-0.5 rounded border"
                      style={{
                        borderColor: selectedTheme.accentColor + "60",
                        backgroundColor: selectedTheme.accentColor + "20",
                        color: selectedTheme.accentColor,
                      }}
                    >
                      Accent Highlight
                    </span>
                  </div>
                  <h3 className="text-base font-black leading-tight">
                    Pittsburgh's Premier Street Brass & Battery Powerhouse
                  </h3>
                  <p className="text-[11px] opacity-80 leading-relaxed">
                    Mobile street revelry, New Orleans funk, and high-energy brass power across Western PA.
                  </p>
                </div>

                {/* Muted Well / Event Feature Mock */}
                <div
                  className="p-2.5 rounded-xl border text-[11px] flex items-center justify-between shadow-inner"
                  style={{
                    backgroundColor: selectedTheme.mutedSurfaceColor || "#1e293b",
                    borderColor: selectedTheme.borderColor || "#334155",
                  }}
                >
                  <div>
                    <span className="font-bold block">Next Appearance: Shadyside Arts Festival</span>
                    <span className="text-[10px] opacity-70">Main Stage & Mobile Second Line</span>
                  </div>
                  <span
                    className="text-[10px] font-mono font-bold px-2 py-0.5 rounded shadow-sm"
                    style={{
                      backgroundColor: selectedTheme.primaryColor + "30",
                      color: selectedTheme.primaryColor,
                      border: `1px solid ${selectedTheme.primaryColor}50`,
                    }}
                  >
                    Sat 3:00 PM
                  </span>
                </div>

                {/* Public Booking Banner Mock */}
                <div
                  className="p-3 rounded-xl flex items-center justify-between"
                  style={{
                    backgroundColor: selectedTheme.surfaceColor,
                    borderLeft: `4px solid ${selectedTheme.primaryColor}`,
                  }}
                >
                  <div className="text-[11px] font-semibold">Available for Parades & Festivals</div>
                  <button
                    type="button"
                    className="text-[10px] font-bold px-2.5 py-1 rounded shadow"
                    style={{
                      backgroundColor: selectedTheme.primaryColor,
                      color: "#020617",
                    }}
                  >
                    Get a Quote
                  </button>
                </div>
              </div>
            )}

            {activeTab === "portal" && (
              <div
                className="p-5 rounded-xl space-y-3.5 border transition-colors shadow-inner"
                style={{
                  backgroundColor: selectedPortalTheme.backgroundColor,
                  borderColor: (selectedPortalTheme.borderColor || selectedPortalTheme.accentColor) + "50",
                  color: selectedPortalTheme.textColor || "#fefce8",
                }}
              >
                {/* Simulator Scope Status */}
                <div
                  className="flex items-center justify-between text-[11px] pb-2 border-b"
                  style={{ borderColor: (selectedPortalTheme.borderColor || "#382c0f") + "60" }}
                >
                  <div className="flex items-center gap-1.5 font-bold">
                    <span className="opacity-70">Preset:</span>
                    <span style={{ color: selectedPortalTheme.primaryColor }}>{selectedPortalTheme.name}</span>
                  </div>
                  {(theme.portal.schemeId || "eagleburger-gold") === selectedPortalTheme.id ? (
                    <span className="text-[10px] text-emerald-400 font-semibold flex items-center gap-1">
                      <CheckCircle className="w-3 h-3" /> Ensemble Default
                    </span>
                  ) : (
                    <span className="text-[10px] text-yellow-400/90 font-mono">
                      Preview Draft
                    </span>
                  )}
                </div>

                {/* Portal Sidebar Segment Mock */}
                <div
                  className="p-4 rounded-xl space-y-3 border shadow-sm"
                  style={{
                    backgroundColor: selectedPortalTheme.surfaceColor,
                    borderColor: (selectedPortalTheme.borderColor || selectedPortalTheme.primaryColor) + "50",
                  }}
                >
                  <div 
                    className="flex items-center gap-2 pb-2 border-b"
                    style={{ borderColor: selectedPortalTheme.borderColor || "#382c0f" }}
                  >
                    <EbbLogo className="w-7 h-7" color={selectedPortalTheme.logoColor || selectedPortalTheme.primaryColor || "#facc15"} />
                    <div>
                      <div className="text-xs font-bold" style={{ color: selectedPortalTheme.textColor }}>
                        {theme.bandName}
                      </div>
                      <div className="text-[10px] opacity-75">Musician Portal</div>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="text-[9px] font-mono uppercase font-bold opacity-60">
                      Performances & Logistics
                    </div>

                    <div
                      className="flex items-center gap-2 px-2.5 py-1.5 rounded text-xs font-bold shadow-sm"
                      style={{
                        backgroundColor: selectedPortalTheme.primaryColor,
                        color: "#020617",
                      }}
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>Call Sheet Dispatch</span>
                    </div>

                    <div className="flex items-center justify-between px-2.5 py-1.5 rounded text-xs opacity-75 hover:opacity-100 transition">
                      <div className="flex items-center gap-2">
                        <Compass className="w-3.5 h-3.5" />
                        <span>Gig Central RSVPs</span>
                      </div>
                      <span
                        className="text-[9px] font-bold px-1.5 py-0.5 rounded shadow-sm"
                        style={{
                          backgroundColor: selectedPortalTheme.accentColor + "25",
                          color: selectedPortalTheme.accentColor,
                          border: `1px solid ${selectedPortalTheme.accentColor}40`,
                        }}
                      >
                        3 Pending
                      </span>
                    </div>
                  </div>
                </div>

                {/* Harmonious Inner Well Card Mock */}
                <div
                  className="p-3.5 rounded-xl border space-y-2 shadow-sm"
                  style={{
                    backgroundColor: selectedPortalTheme.mutedSurfaceColor || "#1e1808",
                    borderColor: selectedPortalTheme.borderColor || "#382c0f",
                  }}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold" style={{ color: selectedPortalTheme.textColor }}>
                      Next Rehearsal RSVP
                    </span>
                    <span
                      className="text-[9px] font-mono font-bold px-2 py-0.5 rounded border"
                      style={{
                        backgroundColor: `${selectedPortalTheme.primaryColor}20`,
                        borderColor: `${selectedPortalTheme.primaryColor}50`,
                        color: selectedPortalTheme.primaryColor,
                      }}
                    >
                      Confirmed (18 / 22)
                    </span>
                  </div>
                  <p className="text-[10px] opacity-70 leading-relaxed">
                    Wednesday 7:00 PM @ Rehearsal Hall — Street parade run-through with full brass & battery.
                  </p>
                </div>

                {/* Tactical Alert Mock */}
                <div
                  className="p-3 rounded-xl text-xs space-y-1.5 border shadow-sm"
                  style={{
                    backgroundColor: selectedPortalTheme.surfaceColor,
                    borderColor: selectedPortalTheme.borderColor || "#382c0f",
                    borderLeft: `4px solid ${selectedPortalTheme.primaryColor}`,
                  }}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold" style={{ color: selectedPortalTheme.textColor }}>
                      Repertoire Update: "Fat Bottomed Girls"
                    </span>
                    <span
                      className="text-[9px] font-bold px-1.5 py-0.5 rounded font-mono"
                      style={{
                        backgroundColor: selectedPortalTheme.accentColor + "20",
                        color: selectedPortalTheme.accentColor,
                      }}
                    >
                      Priority
                    </span>
                  </div>
                  <div className="text-[10px] opacity-70 font-mono">
                    Active season: {theme.activeSeason}
                  </div>
                </div>
              </div>
            )}

            {activeTab === "identity" && (() => {
              const simTypo = getEffectiveTypography(simulatorScope);
              const simPolish = getEffectiveVisualPolish(simulatorScope);
              const simPrimaryColor = simulatorScope === "public"
                ? (theme.public.primaryColor || "#facc15")
                : (selectedPortalTheme.primaryColor || "#facc15");
              const simBgColor = simulatorScope === "public"
                ? (theme.public.backgroundColor || "#020617")
                : (selectedPortalTheme.backgroundColor || "#0a0802");
              const simBorderColor = simulatorScope === "public"
                ? (theme.public.borderColor || "#334155")
                : (selectedPortalTheme.borderColor || "#382c0f");
              const simTextColor = simulatorScope === "public"
                ? (theme.public.textColor || "#f8fafc")
                : (selectedPortalTheme.textColor || "#fefce8");
              const simLogoColor = simulatorScope === "public"
                ? (selectedTheme.logoColor || theme.public.logoColor || theme.public.primaryColor || "#facc15")
                : (selectedPortalTheme.logoColor || selectedPortalTheme.primaryColor || "#facc15");

              return (
                <div className="space-y-4">
                  {/* Google Fonts stylesheet with slab serifs, classic serifs, and modern sans */}
                  <link
                    rel="stylesheet"
                    href="https://fonts.googleapis.com/css2?family=Abril+Fatface&family=Alfa+Slab+One&family=Anton&family=Archivo+Black&family=Arvo:wght@400;700&family=Bebas+Neue&family=Bitter:wght@400;500;600&family=Bree+Serif&family=Cinzel:wght@600;700;900&family=Crete+Round&family=DM+Sans:wght@400;500;700&family=EB+Garamond:wght@400;500;600&family=Fraunces:opsz,wght@9..144,600;9..144,800&family=Inter:wght@400;500;600;700&family=Lora:ital,wght@0,400;0,600;1,400&family=Merriweather:wght@400;700&family=Montserrat:wght@600;700;900&family=Open+Sans:wght@400;600&family=Oswald:wght@600;700&family=Outfit:wght@400;500;600&family=Playfair+Display:wght@600;700;900&family=Plus+Jakarta+Sans:wght@400;500;600;700&family=Poppins:wght@400;500;600;700&family=PT+Serif:wght@400;700&family=Raleway:wght@400;500;600&family=Righteous&family=Roboto:wght@400;500;700&family=Rokkitt:wght@600;800&family=Source+Serif+4:opsz,wght@8..60,400;8..60,600&family=Space+Grotesk:wght@400;500;700&family=Syne:wght@600;700;800&family=Teko:wght@500;600;700&family=Work+Sans:wght@400;500;600&display=swap"
                  />

                  {/* Simulator Scope Switcher */}
                  <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800">
                    <button
                      type="button"
                      onClick={() => setSimulatorScope("public")}
                      className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                        simulatorScope === "public"
                          ? "bg-yellow-400 text-slate-950 shadow font-extrabold"
                          : "text-slate-400 hover:text-white"
                      }`}
                    >
                      <Globe className="w-3.5 h-3.5" />
                      <span>Public Fan Tone Preview</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setSimulatorScope("portal")}
                      className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                        simulatorScope === "portal"
                          ? "bg-yellow-400 text-slate-950 shadow font-extrabold"
                          : "text-slate-400 hover:text-white"
                      }`}
                    >
                      <LayoutDashboard className="w-3.5 h-3.5" />
                      <span>Portal Tone Preview</span>
                    </button>
                  </div>

                  {/* Identity Header Specimen */}
                  <div className="bg-slate-950 border border-slate-800 p-4 rounded-xl flex items-center gap-3.5 shadow-md">
                    <div className="flex items-center gap-2.5 shrink-0">
                      <div
                        className="w-12 h-12 font-black text-base flex items-center justify-center font-mono transition-all duration-300"
                        style={{
                          backgroundColor: simPrimaryColor,
                          color: simBgColor,
                          borderRadius: BORDER_RADIUS_CONFIG[simPolish.borderRadius].styleRadius,
                          boxShadow: GLOW_CONFIG[simPolish.glowIntensity].shadow,
                        }}
                      >
                        {theme.monogram || "EBB"}
                      </div>
                      <EbbLogo className="w-9 h-9 shrink-0 transition-colors duration-300" color={simLogoColor} />
                    </div>
                    <div className="min-w-0">
                      <h3
                        className="text-base font-extrabold text-white leading-tight truncate transition-all duration-200"
                        style={{
                          fontFamily: HEADING_FONT_CONFIG[simTypo.headingFont].family,
                          letterSpacing: TRACKING_CONFIG[simTypo.headingTracking].value,
                          textTransform: simTypo.headingUppercase ? "uppercase" : "none",
                        }}
                      >
                        {theme.bandName}
                      </h3>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-yellow-400/10 text-yellow-400 border border-yellow-400/30 font-bold">
                          {theme.activeSeason}
                        </span>
                        <span className="text-[10px] font-mono text-slate-400">
                          {simulatorScope === "public" ? "Public Marketing" : "Musician Portal"} • {BORDER_RADIUS_CONFIG[simPolish.borderRadius].label}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Live Typography Specimens Card */}
                  <div className="bg-slate-950 border border-slate-800 p-4 rounded-xl space-y-3">
                    <div className="flex items-center justify-between text-[10px] font-mono uppercase tracking-wider text-slate-400 border-b border-slate-800 pb-2">
                      <span className="flex items-center gap-1.5 text-yellow-400 font-bold">
                        <Type className="w-3.5 h-3.5" /> Typography Specimens
                      </span>
                      <span className="text-slate-400 font-semibold">
                        {HEADING_FONT_CONFIG[simTypo.headingFont].name} + {BODY_FONT_CONFIG[simTypo.bodyFont].name}
                      </span>
                    </div>

                    <div className="space-y-1.5">
                      <div className="text-[10px] font-mono text-slate-400">
                        Heading Display ({HEADING_FONT_CONFIG[simTypo.headingFont].category})
                      </div>
                      <div
                        className="text-base sm:text-lg font-black leading-snug transition-all duration-200"
                        style={{
                          color: simPrimaryColor,
                          fontFamily: HEADING_FONT_CONFIG[simTypo.headingFont].family,
                          letterSpacing: TRACKING_CONFIG[simTypo.headingTracking].value,
                          textTransform: simTypo.headingUppercase ? "uppercase" : "none",
                        }}
                      >
                        {simulatorScope === "public"
                          ? "Pittsburgh Street Brass & Battery"
                          : "Repertoire Setlist & Gig Operations"}
                      </div>
                    </div>

                    <div className="space-y-1.5 pt-2 border-t border-slate-900">
                      <div className="text-[10px] font-mono text-slate-400">
                        Body Copy ({BODY_FONT_CONFIG[simTypo.bodyFont].category})
                      </div>
                      <p
                        className="text-xs text-slate-300 leading-relaxed transition-all duration-200"
                        style={{
                          fontFamily: BODY_FONT_CONFIG[simTypo.bodyFont].family,
                        }}
                      >
                        {simulatorScope === "public"
                          ? "The Eagleburger Band delivers raw, acoustic funk grooves, second-line anthems, and thunderous percussion across Pittsburgh festivals, parades, and street corners."
                          : "Rehearsal call time: 18:30 at Liberty Ave staging area. Horn section warm-up begins at 18:45 sharp. Access sheet music charts and recordings below."}
                      </p>
                    </div>
                  </div>

                  {/* Atmosphere & Texture Specimen Card */}
                  <div className="space-y-1.5">
                    <div className="text-[10px] font-mono text-slate-400 uppercase tracking-wider flex items-center justify-between">
                      <span className="text-yellow-400 font-bold flex items-center gap-1">
                        <Layers className="w-3 h-3" /> Atmosphere & Surface Specimen
                      </span>
                      <span>{TEXTURE_CONFIG[simPolish.backgroundTexture].label}</span>
                    </div>
                    <div
                      className="p-4 border transition-all duration-300 space-y-3"
                      style={{
                        ...TEXTURE_CONFIG[simPolish.backgroundTexture].getStyle(simPrimaryColor),
                        borderRadius: BORDER_RADIUS_CONFIG[simPolish.borderRadius].styleRadius,
                        borderColor: simBorderColor,
                        boxShadow: GLOW_CONFIG[simPolish.glowIntensity].shadow,
                      }}
                    >
                      <div className="flex items-center justify-between">
                        <span
                          className="text-xs font-bold text-white tracking-wide"
                          style={{
                            fontFamily: HEADING_FONT_CONFIG[simTypo.headingFont].family,
                            textTransform: simTypo.headingUppercase ? "uppercase" : "none",
                          }}
                        >
                          {simulatorScope === "public" ? "Featured Festival Show" : "Bloomfield Parade Warmup"}
                        </span>
                        <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                          {simulatorScope === "public" ? "Upcoming" : "Confirmed"}
                        </span>
                      </div>
                      <p
                        className="text-[11px] text-slate-300"
                        style={{
                          fontFamily: BODY_FONT_CONFIG[simTypo.bodyFont].family,
                        }}
                      >
                        {simulatorScope === "public"
                          ? "Catch the full 24-piece mobile hornline and battery live at Three Rivers Arts Festival."
                          : "Full battery roll-off at Liberty Ave staging zone. Repertoire charts active in portal."}
                      </p>
                      <div className="flex items-center justify-between pt-1">
                        <button
                          type="button"
                          className="text-[10px] font-bold px-3 py-1 bg-yellow-400 text-slate-950 transition shadow"
                          style={{
                            borderRadius: BORDER_RADIUS_CONFIG[simPolish.borderRadius].styleRadius,
                          }}
                        >
                          {simulatorScope === "public" ? "Get Directions" : "View Setlist"}
                        </button>
                        <span className="text-[10px] font-mono text-slate-400">
                          Glow: {GLOW_CONFIG[simPolish.glowIntensity].label}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Identity Asset Specs Table */}
                  <div className="bg-slate-950 border border-slate-800 p-3.5 rounded-xl space-y-2 text-xs text-slate-300">
                    <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400 pb-1 border-b border-slate-800 font-bold flex items-center justify-between">
                      <span>Active Tokens ({simulatorScope === "public" ? "Public Site" : "Musician Portal"})</span>
                      <span className="text-yellow-400 font-mono text-[9px]">{simulatorScope.toUpperCase()}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-[11px]">
                      <div className="flex justify-between py-0.5 border-b border-slate-900">
                        <span className="text-slate-500">Monogram:</span>
                        <span className="font-mono text-yellow-400 font-bold">{theme.monogram || "EBB"}</span>
                      </div>
                      <div className="flex justify-between py-0.5 border-b border-slate-900">
                        <span className="text-slate-500">Season:</span>
                        <span className="font-mono text-slate-300">{theme.activeSeason}</span>
                      </div>
                      <div className="flex justify-between py-0.5 border-b border-slate-900">
                        <span className="text-slate-500">Heading Font:</span>
                        <span className="font-mono text-slate-300">
                          {HEADING_FONT_CONFIG[simTypo.headingFont].name}
                        </span>
                      </div>
                      <div className="flex justify-between py-0.5 border-b border-slate-900">
                        <span className="text-slate-500">Body Font:</span>
                        <span className="font-mono text-slate-300">
                          {BODY_FONT_CONFIG[simTypo.bodyFont].name}
                        </span>
                      </div>
                      <div className="flex justify-between py-0.5 border-b border-slate-900">
                        <span className="text-slate-500">Radius:</span>
                        <span className="font-mono text-slate-300">
                          {BORDER_RADIUS_CONFIG[simPolish.borderRadius].label}
                        </span>
                      </div>
                      <div className="flex justify-between py-0.5 border-b border-slate-900">
                        <span className="text-slate-500">Texture:</span>
                        <span className="font-mono text-slate-300">
                          {TEXTURE_CONFIG[simPolish.backgroundTexture].label}
                        </span>
                      </div>
                      <div className="flex justify-between py-0.5 border-b border-slate-900">
                        <span className="text-slate-500">Logo Tint:</span>
                        <span className="font-mono text-slate-300 flex items-center gap-1.5">
                          <span className="w-2.5 h-2.5 rounded-full border border-slate-700 shrink-0" style={{ backgroundColor: simLogoColor }} />
                          <span className="text-[10px]">{simLogoColor}</span>
                        </span>
                      </div>
                      <div className="flex justify-between py-0.5 col-span-2">
                        <span className="text-slate-500">Logo URI:</span>
                        <span className="font-mono text-[10px] text-slate-400 truncate max-w-[200px]">
                          {theme.logoUrl}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}

            <div className="text-[11px] text-slate-500 flex items-center gap-1.5 pt-1">
              <Sparkles className="w-3.5 h-3.5 text-yellow-400 shrink-0" />
              <span>
                Theme adjustments synchronize in real-time to connected Firebase sessions.
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Sticky Bottom Save / Discard Bar */}
      <UnsavedChangesBar
        isDirty={isDirty}
        isSaving={isSaving}
        onSave={() => handleSaveTheme()}
        onDiscard={handleDiscard}
        saveLabel="Save Brand Settings"
        message="Unsaved Brand Theme Changes"
        subMessage="You have pending changes to the public or portal color themes."
      />
    </div>
  );
}