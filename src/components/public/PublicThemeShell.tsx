"use client";

import React from "react";
import { ThemeProvider, useTheme } from "@/lib/context/ThemeContext";
import PublicBubbleOverlay from "./PublicBubbleOverlay";

function PublicThemeContainer({ children }: { children: React.ReactNode }) {
  const { getScopedStyles, theme } = useTheme();
  return (
    <div
      className="public-site min-h-screen flex flex-col selection:bg-yellow-400 selection:text-slate-950 relative"
      data-ebb-public="true"
      style={{
        ...getScopedStyles("public"),
        backgroundColor: "var(--ebb-background)",
        color: "var(--ebb-text)",
      }}
      suppressHydrationWarning
    >
      <PublicBubbleOverlay config={theme.specialEffects?.bubbles} fullscreen />
      {children}
    </div>
  );
}

export default function PublicThemeShell({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <PublicThemeContainer>{children}</PublicThemeContainer>
    </ThemeProvider>
  );
}

