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

  // Derive activePortalSchemeId: override > profile preference > localStorage > ensemble default > fallback
  const activePortalSchemeId: PortalColorSchemeId = useMemo(() => {
    if (overrideSchemeId) return overrideSchemeId;
    if (profilePortalThemeSchemeId && PORTAL_COLOR_SCHEMES.some((s) => s.id === profilePortalThemeSchemeId)) {
      return profilePortalThemeSchemeId as PortalColorSchemeId;
    }
    if (localSavedScheme && PORTAL_COLOR_SCHEMES.some((s) => s.id === localSavedScheme)) {
      return localSavedScheme as PortalColorSchemeId;
    }
    if (portalConfigSchemeId && PORTAL_COLOR_SCHEMES.some((s) => s.id === portalConfigSchemeId)) {
      return portalConfigSchemeId as PortalColorSchemeId;
    }
    return "eagleburger-gold";
  }, [overrideSchemeId, profilePortalThemeSchemeId, localSavedScheme, portalConfigSchemeId]);

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
    return getPortalColorScheme(activePortalSchemeId, activePortalMode);
  }, [activePortalSchemeId, activePortalMode]);

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
      ["--ebb-mode" as string]: isPortal ? activePortalMode : "dark",
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
        availablePortalSchemes: PORTAL_COLOR_SCHEMES,
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

