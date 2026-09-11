"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { ThemeConfig, ThemeSchema, ThemeScopeConfig } from "@/lib/schema/theme";

const DEFAULT_THEME: ThemeConfig = ThemeSchema.parse({});

interface ThemeContextValue {
  theme: ThemeConfig;
  publicTheme: ThemeScopeConfig;
  portalTheme: ThemeScopeConfig;
  loading: boolean;
  getScopedStyles: (scope: "public" | "portal") => React.CSSProperties;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: DEFAULT_THEME,
  publicTheme: DEFAULT_THEME.public,
  portalTheme: DEFAULT_THEME.portal,
  loading: true,
  getScopedStyles: () => ({}),
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<ThemeConfig>(DEFAULT_THEME);
  const [loading, setLoading] = useState(true);

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

  const getScopedStyles = (scope: "public" | "portal"): React.CSSProperties => {
    const scopeConfig = scope === "public" ? theme.public : theme.portal;
    return {
      ["--ebb-primary" as string]: scopeConfig.primaryColor,
      ["--ebb-accent" as string]: scopeConfig.accentColor,
      ["--ebb-background" as string]: scopeConfig.backgroundColor,
      ["--ebb-surface" as string]: scopeConfig.surfaceColor,
      ["--ebb-text" as string]: scopeConfig.textColor,
    } as React.CSSProperties;
  };

  return (
    <ThemeContext.Provider
      value={{
        theme,
        publicTheme: theme.public,
        portalTheme: theme.portal,
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

