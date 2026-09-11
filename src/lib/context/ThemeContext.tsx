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
  PORTAL_COLOR_SCHEMES,
  getPortalColorScheme
} from "@/lib/schema/theme";
import { useAuth } from "./AuthContext";

const DEFAULT_THEME: ThemeConfig = ThemeSchema.parse({});
const LOCAL_STORAGE_KEY = "ebb_portal_theme_scheme";

const storageSubscribe = (callback: () => void) => {
  if (typeof window === "undefined") return () => {};
  window.addEventListener("storage", callback);
  return () => window.removeEventListener("storage", callback);
};

const getLocalStorageScheme = (): string | null => {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(LOCAL_STORAGE_KEY);
  } catch {
    return null;
  }
};

const getServerScheme = (): null => null;

interface ThemeContextValue {
  theme: ThemeConfig;
  publicTheme: ThemeScopeConfig;
  portalTheme: ThemeScopeConfig;
  activePortalSchemeId: PortalColorSchemeId;
  activePortalScheme: PortalColorScheme;
  availablePortalSchemes: PortalColorScheme[];
  setMemberPortalTheme: (schemeId: PortalColorSchemeId) => Promise<void>;
  loading: boolean;
  getScopedStyles: (scope: "public" | "portal") => React.CSSProperties;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: DEFAULT_THEME,
  publicTheme: DEFAULT_THEME.public,
  portalTheme: DEFAULT_THEME.portal,
  activePortalSchemeId: "eagleburger-gold",
  activePortalScheme: PORTAL_COLOR_SCHEMES[0],
  availablePortalSchemes: PORTAL_COLOR_SCHEMES,
  setMemberPortalTheme: async () => {},
  loading: true,
  getScopedStyles: () => ({}),
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { profile, firebaseUser } = useAuth();
  const [theme, setTheme] = useState<ThemeConfig>(DEFAULT_THEME);
  const [loading, setLoading] = useState(true);

  // User override state (from immediate UI selection)
  const [overrideSchemeId, setOverrideSchemeId] = useState<PortalColorSchemeId | null>(null);

  // Synchronize localStorage via useSyncExternalStore to prevent SSR hydration mismatch
  const localSavedScheme = useSyncExternalStore(
    storageSubscribe,
    getLocalStorageScheme,
    getServerScheme
  );

  // Derive activePortalSchemeId: override > profile preference > localStorage > ensemble default > fallback
  const activePortalSchemeId: PortalColorSchemeId = useMemo(() => {
    if (overrideSchemeId) return overrideSchemeId;
    if (profile?.portalThemeSchemeId && PORTAL_COLOR_SCHEMES.some((s) => s.id === profile.portalThemeSchemeId)) {
      return profile.portalThemeSchemeId as PortalColorSchemeId;
    }
    if (localSavedScheme && PORTAL_COLOR_SCHEMES.some((s) => s.id === localSavedScheme)) {
      return localSavedScheme as PortalColorSchemeId;
    }
    if (theme.portal?.schemeId && PORTAL_COLOR_SCHEMES.some((s) => s.id === theme.portal.schemeId)) {
      return theme.portal.schemeId as PortalColorSchemeId;
    }
    return "eagleburger-gold";
  }, [overrideSchemeId, profile?.portalThemeSchemeId, localSavedScheme, theme.portal?.schemeId]);

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
    return getPortalColorScheme(activePortalSchemeId);
  }, [activePortalSchemeId]);

  const setMemberPortalTheme = async (schemeId: PortalColorSchemeId) => {
    setOverrideSchemeId(schemeId);
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, schemeId);
    } catch {
      // ignore
    }

    if (firebaseUser?.uid) {
      try {
        await setDoc(
          doc(db, "users", firebaseUser.uid),
          { portalThemeSchemeId: schemeId, updatedAt: new Date().toISOString() },
          { merge: true }
        );
      } catch (err) {
        console.error("Failed to persist theme preference to Firestore:", err);
      }
    }
  };

  const portalTheme: ThemeScopeConfig = useMemo(() => {
    return {
      schemeId: activePortalScheme.id,
      primaryColor: activePortalScheme.primaryColor,
      accentColor: activePortalScheme.accentColor,
      backgroundColor: activePortalScheme.backgroundColor,
      surfaceColor: activePortalScheme.surfaceColor,
      mutedSurfaceColor: activePortalScheme.mutedSurfaceColor,
      borderColor: activePortalScheme.borderColor,
      textColor: activePortalScheme.textColor,
      tagline: theme.portal?.tagline || activePortalScheme.tagline,
    };
  }, [activePortalScheme, theme.portal?.tagline]);

  const getScopedStyles = (scope: "public" | "portal"): React.CSSProperties => {
    const scopeConfig = scope === "public" ? theme.public : portalTheme;
    const isPortal = scope === "portal";
    return {
      ["--ebb-primary" as string]: scopeConfig.primaryColor,
      ["--ebb-accent" as string]: scopeConfig.accentColor,
      ["--ebb-background" as string]: scopeConfig.backgroundColor,
      ["--ebb-surface" as string]: scopeConfig.surfaceColor,
      ["--ebb-surface-muted" as string]: isPortal ? activePortalScheme.mutedSurfaceColor : scopeConfig.mutedSurfaceColor || "#1e293b",
      ["--ebb-border" as string]: isPortal ? activePortalScheme.borderColor : scopeConfig.borderColor || "#334155",
      ["--ebb-text" as string]: scopeConfig.textColor,
    } as React.CSSProperties;
  };

  return (
    <ThemeContext.Provider
      value={{
        theme,
        publicTheme: theme.public,
        portalTheme,
        activePortalSchemeId,
        activePortalScheme,
        availablePortalSchemes: PORTAL_COLOR_SCHEMES,
        setMemberPortalTheme,
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

