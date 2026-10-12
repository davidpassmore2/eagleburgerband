"use client";

import React from "react";
import { ThemeProvider, useTheme } from "@/lib/context/ThemeContext";

function PublicThemeContainer({ children }: { children: React.ReactNode }) {
  const { getScopedStyles } = useTheme();
  return (
    <div
      className="public-site min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-yellow-400 selection:text-slate-950 transition-colors duration-200"
      style={getScopedStyles("public")}
      suppressHydrationWarning
    >
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

