"use client";

import React, { createContext, useContext, useEffect, useState, useMemo, useSyncExternalStore } from "react";
import { doc, onSnapshot, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { 
  ThemeConfig, 
  ThemeSchema, 
  ThemeScopeConfig,
  PortalColorScheme,
  PortalColorSchemeId,
  PortalThemeMode,
  PORTAL_COLOR_SCHEMES,
  getPortalColorScheme
} from "@/lib/schema/theme";
import { useAuth } from "./AuthContext";

const DEFAULT_THEME: ThemeConfig = ThemeSchema.parse({});
const LOCAL_STORAGE_SCHEME_KEY = "ebb_portal_theme_scheme";
const LOCAL_STORAGE_MODE_KEY = "ebb_portal_theme_mode";

const storageSubscribe = (callback: () => void) => {
  if (typeof window === "undefined") return () => {};
  window.addEventListener("storage", callback);
  return () => window.removeEventListener("storage", callback);
};

const getLocalStorageScheme = (): string | null => {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(LOCAL_STORAGE_SCHEME_KEY);
  } catch {
    return null;
  }
};

const getLocalStorageMode = (): PortalThemeMode | null => {
  if (typeof window === "undefined") return null;
  try {
    const val = localStorage.getItem(LOCAL_STORAGE_MODE_KEY);
    return val === "light" || val === "dark" ? val : null;
  } catch {
    return null;
  }
};

const getServerScheme = (): null => null;
const getServerMode = (): null => null;

interface ThemeContextValue {
  theme: ThemeConfig;
  publicTheme: ThemeScopeConfig;
  portalTheme: ThemeScopeConfig;
  activePortalSchemeId: PortalColorSchemeId;
  activePortalMode: PortalThemeMode;
  activePortalScheme: PortalColorScheme;
  availablePortalSchemes: PortalColorScheme[];
  setMemberPortalTheme: (schemeId: PortalColorSchemeId, mode?: PortalThemeMode) => Promise<void>;
  setMemberPortalMode: (mode: PortalThemeMode) => Promise<void>;
  loading: boolean;
  getScopedStyles: (scope: "public" | "portal") => React.CSSProperties;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: DEFAULT_THEME,
  publicTheme: DEFAULT_THEME.public,
  portalTheme: DEFAULT_THEME.portal,
  activePortalSchemeId: "eagleburger-gold",
  activePortalMode: "dark",
  activePortalScheme: PORTAL_COLOR_SCHEMES[0],
  availablePortalSchemes: PORTAL_COLOR_SCHEMES,
  setMemberPortalTheme: async () => {},
  setMemberPortalMode: async () => {},
  loading: true,
  getScopedStyles: () => ({}),
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { profile, firebaseUser } = useAuth();
  const [theme, setTheme] = useState<ThemeConfig>(DEFAULT_THEME);
  const [loading, setLoading] = useState(true);

  // User override state (from immediate UI selection)
  const [overrideSchemeId, setOverrideSchemeId] = useState<PortalColorSchemeId | null>(null);
  const [overrideMode, setOverrideMode] = useState<PortalThemeMode | null>(null);

  // Synchronize localStorage via useSyncExternalStore to prevent SSR hydration mismatch
  const localSavedScheme = useSyncExternalStore(
    storageSubscribe,
    getLocalStorageScheme,
    getServerScheme
  );

  const localSavedMode = useSyncExternalStore(
    storageSubscribe,
    getLocalStorageMode,
    getServerMode
  );

  const profilePortalThemeSchemeId = profile?.portalThemeSchemeId;
  const portalConfigSchemeId = theme.portal?.schemeId;

  // Available portal themes dynamically merged from Firestore theme.portalThemes
  const availablePortalSchemes: PortalColorScheme[] = useMemo(() => {
    const list = theme.portalThemes && theme.portalThemes.length > 0
      ? theme.portalThemes
      : PORTAL_COLOR_SCHEMES;

    return list.map((opt) => {
      const swatches: [string, string, string, string] = opt.previewSwatches && opt.previewSwatches.length === 4
        ? (opt.previewSwatches as [string, string, string, string])
        : [opt.primaryColor, opt.accentColor, opt.surfaceColor, opt.backgroundColor];

      const isDefaultConfig = opt.id === (theme.portal?.schemeId || "eagleburger-gold");
      const configuredLogo = (isDefaultConfig && theme.portal?.logoColor) ? theme.portal.logoColor : opt.logoColor;

      const darkTokens = opt.modes?.dark ? {
        primaryColor: opt.modes.dark.primaryColor || opt.primaryColor,
        accentColor: opt.modes.dark.accentColor || opt.accentColor,
        logoColor: opt.modes.dark.logoColor || configuredLogo || opt.primaryColor,
        backgroundColor: opt.modes.dark.backgroundColor || opt.backgroundColor,
        surfaceColor: opt.modes.dark.surfaceColor || opt.surfaceColor,
        mutedSurfaceColor: opt.modes.dark.mutedSurfaceColor || opt.mutedSurfaceColor,
        borderColor: opt.modes.dark.borderColor || opt.borderColor,
        textColor: opt.modes.dark.textColor || opt.textColor,
        previewSwatches: swatches,
      } : {
        primaryColor: opt.primaryColor,
        accentColor: opt.accentColor,
        logoColor: configuredLogo || opt.primaryColor,
        backgroundColor: opt.backgroundColor,
        surfaceColor: opt.surfaceColor,
        mutedSurfaceColor: opt.mutedSurfaceColor,
        borderColor: opt.borderColor,
        textColor: opt.textColor,
        previewSwatches: swatches,
      };

      const lightTokens = opt.modes?.light ? {
        primaryColor: opt.modes.light.primaryColor || opt.primaryColor,
        accentColor: opt.modes.light.accentColor || opt.accentColor,
        logoColor: opt.modes.light.logoColor || (configuredLogo === opt.primaryColor ? (opt.modes.light.primaryColor || opt.primaryColor) : (configuredLogo || opt.primaryColor)),
        backgroundColor: opt.modes.light.backgroundColor || "#f8fafc",
        surfaceColor: opt.modes.light.surfaceColor || "#ffffff",
        mutedSurfaceColor: opt.modes.light.mutedSurfaceColor || "#f1f5f9",
        borderColor: opt.modes.light.borderColor || "#cbd5e1",
        textColor: opt.modes.light.textColor || "#0f172a",
        previewSwatches: [opt.primaryColor, opt.accentColor, "#ffffff", "#f8fafc"] as [string, string, string, string],
      } : {
        primaryColor: opt.primaryColor,
        accentColor: opt.accentColor,
        logoColor: configuredLogo || opt.primaryColor,
        backgroundColor: "#f8fafc",
        surfaceColor: "#ffffff",
        mutedSurfaceColor: "#f1f5f9",
        borderColor: "#cbd5e1",
        textColor: "#0f172a",
        previewSwatches: [opt.primaryColor, opt.accentColor, "#ffffff", "#f8fafc"] as [string, string, string, string],
      };

      return {
        id: opt.id,
        name: opt.name,
        tagline: opt.tagline || "",
        description: opt.description || "",
        logoColor: configuredLogo || opt.primaryColor,
        primaryColor: opt.primaryColor,
        accentColor: opt.accentColor,
        backgroundColor: opt.backgroundColor,
        surfaceColor: opt.surfaceColor,
        mutedSurfaceColor: opt.mutedSurfaceColor,
        borderColor: opt.borderColor,
        textColor: opt.textColor,
        previewSwatches: swatches,
        modes: {
          dark: darkTokens,
          light: lightTokens,
        },
      };
    });
  }, [theme.portalThemes, theme.portal?.schemeId, theme.portal?.logoColor]);

  // Derive activePortalSchemeId: override > profile preference > localStorage > ensemble default > fallback
  const activePortalSchemeId: PortalColorSchemeId = useMemo(() => {
    if (overrideSchemeId) return overrideSchemeId;
    if (profilePortalThemeSchemeId && availablePortalSchemes.some((s) => s.id === profilePortalThemeSchemeId)) {
      return profilePortalThemeSchemeId as PortalColorSchemeId;
    }
    if (localSavedScheme && availablePortalSchemes.some((s) => s.id === localSavedScheme)) {
      return localSavedScheme as PortalColorSchemeId;
    }
    if (portalConfigSchemeId && availablePortalSchemes.some((s) => s.id === portalConfigSchemeId)) {
      return portalConfigSchemeId as PortalColorSchemeId;
    }
    return availablePortalSchemes[0]?.id || "eagleburger-gold";
  }, [overrideSchemeId, profilePortalThemeSchemeId, localSavedScheme, portalConfigSchemeId, availablePortalSchemes]);

  const profilePortalThemeMode = profile?.portalThemeMode;

  // Derive activePortalMode: override > profile preference > localStorage > default ("dark")
  const activePortalMode: PortalThemeMode = useMemo(() => {
    if (overrideMode) return overrideMode;
    if (profilePortalThemeMode === "light" || profilePortalThemeMode === "dark") {
      return profilePortalThemeMode;
    }
    if (localSavedMode) {
      return localSavedMode;
    }
    return "dark";
  }, [overrideMode, profilePortalThemeMode, localSavedMode]);

  useEffect(() => {
    const unsub = onSnapshot(
      doc(db, "theme", "config"),
      (snap) => {
        if (snap.exists()) {
          const parsed = ThemeSchema.safeParse(snap.data());
          if (parsed.success) {
            setTheme(parsed.data);
          } else {
            console.warn("Theme parsing warning, applying defaults:", parsed.error);
            setTheme(DEFAULT_THEME);
          }
        }
        setLoading(false);
      },
      (err) => {
        console.warn("Theme listener offline/fallback:", err);
        setLoading(false);
      }
    );

    return () => unsub();
  }, []);

  const activePortalScheme = useMemo(() => {
    return getPortalColorScheme(activePortalSchemeId, activePortalMode, availablePortalSchemes);
  }, [activePortalSchemeId, activePortalMode, availablePortalSchemes]);

  const setMemberPortalTheme = async (schemeId: PortalColorSchemeId, mode?: PortalThemeMode) => {
    setOverrideSchemeId(schemeId);
    if (mode) setOverrideMode(mode);
    try {
      localStorage.setItem(LOCAL_STORAGE_SCHEME_KEY, schemeId);
      if (mode) localStorage.setItem(LOCAL_STORAGE_MODE_KEY, mode);
    } catch {
      // ignore
    }

    if (firebaseUser?.uid) {
      try {
        const updatePayload: Record<string, unknown> = {
          portalThemeSchemeId: schemeId,
          updatedAt: new Date().toISOString(),
        };
        if (mode) {
          updatePayload.portalThemeMode = mode;
        }
        await setDoc(doc(db, "users", firebaseUser.uid), updatePayload, { merge: true });
      } catch (err) {
        console.error("Failed to persist theme preference to Firestore:", err);
      }
    }
  };

  const setMemberPortalMode = async (mode: PortalThemeMode) => {
    setOverrideMode(mode);
    try {
      localStorage.setItem(LOCAL_STORAGE_MODE_KEY, mode);
    } catch {
      // ignore
    }

    if (firebaseUser?.uid) {
      try {
        await setDoc(
          doc(db, "users", firebaseUser.uid),
          { portalThemeMode: mode, updatedAt: new Date().toISOString() },
          { merge: true }
        );
      } catch (err) {
        console.error("Failed to persist theme mode preference to Firestore:", err);
      }
    }
  };

  const portalTheme: ThemeScopeConfig = useMemo(() => {
    const isEnsembleDefault = activePortalScheme.id === (theme.portal?.schemeId || "eagleburger-gold");
    const activeLogoColor =
      activePortalScheme.logoColor ||
      (isEnsembleDefault ? theme.portal?.logoColor : undefined) ||
      activePortalScheme.primaryColor ||
      theme.portal?.logoColor ||
      "#facc15";

    return {
      schemeId: activePortalScheme.id,
      primaryColor: activePortalScheme.primaryColor,
      accentColor: activePortalScheme.accentColor,
      logoColor: activeLogoColor,
      backgroundColor: activePortalScheme.backgroundColor,
      surfaceColor: activePortalScheme.surfaceColor,
      mutedSurfaceColor: activePortalScheme.mutedSurfaceColor,
      borderColor: activePortalScheme.borderColor,
      textColor: activePortalScheme.textColor,
      tagline: activePortalScheme.tagline || theme.portal?.tagline,
    };
  }, [activePortalScheme, theme.portal?.schemeId, theme.portal?.tagline, theme.portal?.logoColor]);

  const getScopedStyles = (scope: "public" | "portal"): React.CSSProperties => {
    const scopeConfig = scope === "public" ? theme.public : portalTheme;
    const isPortal = scope === "portal";
    const primaryTextColor =
      isPortal && (activePortalMode === "light" || activePortalSchemeId === "sousa-crimson")
        ? "#ffffff"
        : "#0f172a";

    const activeTypography = isPortal
      ? theme.portalTypography || theme.typography || {
          headingFont: "inter" as const,
          bodyFont: "inter" as const,
          headingTracking: "normal" as const,
          headingUppercase: false,
        }
      : theme.publicTypography || theme.typography || {
          headingFont: "montserrat" as const,
          bodyFont: "inter" as const,
          headingTracking: "wide" as const,
          headingUppercase: true,
        };

    const activeVisualPolish = isPortal
      ? theme.portalVisualPolish || theme.visualPolish || {
          borderRadius: "modern" as const,
          glowIntensity: "none" as const,
          backgroundTexture: "solid" as const,
        }
      : theme.publicVisualPolish || theme.visualPolish || {
          borderRadius: "modern" as const,
          glowIntensity: "subtle" as const,
          backgroundTexture: "solid" as const,
        };

    const headingFontFamilyMap: Record<string, string> = {
      montserrat: "'Montserrat', sans-serif",
      oswald: "'Oswald', sans-serif",
      arvo: "'Arvo', serif",
      rokkitt: "'Rokkitt', serif",
      "alfa-slab-one": "'Alfa Slab One', serif",
      "crete-round": "'Crete Round', serif",
      "bree-serif": "'Bree Serif', serif",
      cinzel: "'Cinzel', serif",
      "playfair-display": "'Playfair Display', serif",
      fraunces: "'Fraunces', serif",
      "abril-fatface": "'Abril Fatface', serif",
      "bebas-neue": "'Bebas Neue', sans-serif",
      anton: "'Anton', sans-serif",
      teko: "'Teko', sans-serif",
      righteous: "'Righteous', sans-serif",
      syne: "'Syne', sans-serif",
      "archivo-black": "'Archivo Black', sans-serif",
      inter: "'Inter', sans-serif",
    };

    const bodyFontFamilyMap: Record<string, string> = {
      inter: "'Inter', sans-serif",
      poppins: "'Poppins', sans-serif",
      "plus-jakarta-sans": "'Plus Jakarta Sans', sans-serif",
      "dm-sans": "'DM Sans', sans-serif",
      outfit: "'Outfit', sans-serif",
      "work-sans": "'Work Sans', sans-serif",
      roboto: "'Roboto', sans-serif",
      "space-grotesk": "'Space Grotesk', sans-serif",
      "open-sans": "'Open Sans', sans-serif",
      raleway: "'Raleway', sans-serif",
      merriweather: "'Merriweather', serif",
      lora: "'Lora', serif",
      bitter: "'Bitter', serif",
      "pt-serif": "'PT Serif', serif",
      "source-serif-4": "'Source Serif 4', serif",
      "eb-garamond": "'EB Garamond', serif",
    };

    const radiusMap: Record<string, string> = {
      sharp: "4px",
      modern: "16px",
      pill: "28px",
    };

    const trackingMap: Record<string, string> = {
      normal: "0",
      wide: "0.05em",
      wider: "0.10em",
    };

    return {
      ["--ebb-primary" as string]: scopeConfig.primaryColor,
      ["--ebb-primary-text" as string]: primaryTextColor,
      ["--ebb-accent" as string]: scopeConfig.accentColor,
      ["--ebb-logo-color" as string]: scopeConfig.logoColor || scopeConfig.primaryColor || "#facc15",
      ["--ebb-background" as string]: scopeConfig.backgroundColor,
      ["--ebb-surface" as string]: scopeConfig.surfaceColor,
      ["--ebb-surface-muted" as string]: isPortal ? activePortalScheme.mutedSurfaceColor : scopeConfig.mutedSurfaceColor || "#1e293b",
      ["--ebb-border" as string]: isPortal ? activePortalScheme.borderColor : scopeConfig.borderColor || "#334155",
      ["--ebb-text" as string]: scopeConfig.textColor,
      ["--ebb-mode" as string]: isPortal ? activePortalMode : "dark",
      ["--ebb-font-heading" as string]: headingFontFamilyMap[activeTypography.headingFont] || "'Montserrat', sans-serif",
      ["--ebb-font-body" as string]: bodyFontFamilyMap[activeTypography.bodyFont] || "'Inter', sans-serif",
      ["--ebb-tracking-heading" as string]: trackingMap[activeTypography.headingTracking] || "0.05em",
      ["--ebb-transform-heading" as string]: activeTypography.headingUppercase ? "uppercase" : "none",
      ["--ebb-radius" as string]: radiusMap[activeVisualPolish.borderRadius] || "16px",
      ["--ebb-glow-intensity" as string]: activeVisualPolish.glowIntensity,
    } as React.CSSProperties;
  };

  return (
    <ThemeContext.Provider
      value={{
        theme,
        publicTheme: theme.public,
        portalTheme,
        activePortalSchemeId,
        activePortalMode,
        activePortalScheme,
        availablePortalSchemes,
        setMemberPortalTheme,
        setMemberPortalMode,
        loading,
        getScopedStyles,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}

