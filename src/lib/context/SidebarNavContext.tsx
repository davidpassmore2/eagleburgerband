"use client";

import React, { createContext, useContext, useEffect, useState, useMemo } from "react";
import { doc, onSnapshot, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import {
  SidebarNavigationConfig,
  SidebarNavigationConfigSchema,
  SidebarSectionConfig,
  ResolvedSidebarSection,
  getDefaultSidebarNavigationConfig,
  resolveSidebarNavigation,
} from "@/lib/schema/sidebarNavigation";
import { WORKSPACE_TOOLS } from "@/lib/portal/workspaceRegistry";
import { useAuth } from "@/lib/context/AuthContext";
import { logAdminAction } from "@/lib/logging/adminLogger";

interface SidebarNavContextValue {
  config: SidebarNavigationConfig;
  sections: ResolvedSidebarSection[];
  loading: boolean;
  saveConfig: (newSections: SidebarSectionConfig[]) => Promise<void>;
  resetToDefaults: () => Promise<void>;
}

const DEFAULT_CONFIG = getDefaultSidebarNavigationConfig();

const SidebarNavContext = createContext<SidebarNavContextValue>({
  config: DEFAULT_CONFIG,
  sections: resolveSidebarNavigation(DEFAULT_CONFIG, WORKSPACE_TOOLS),
  loading: true,
  saveConfig: async () => {},
  resetToDefaults: async () => {},
});

export function SidebarNavProvider({ children }: { children: React.ReactNode }) {
  const { profile, firebaseUser } = useAuth();
  const [config, setConfig] = useState<SidebarNavigationConfig>(DEFAULT_CONFIG);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const docRef = doc(db, "navigation_config", "sidebar");
    const unsub = onSnapshot(
      docRef,
      (snap) => {
        if (snap.exists()) {
          const parsed = SidebarNavigationConfigSchema.safeParse(snap.data());
          if (parsed.success) {
            setConfig(parsed.data);
          } else {
            console.warn("Sidebar navigation config validation warning, applying defaults:", parsed.error);
            setConfig(DEFAULT_CONFIG);
          }
        } else {
          setConfig(DEFAULT_CONFIG);
        }
        setLoading(false);
      },
      (err) => {
        console.warn("Sidebar navigation listener error, falling back to defaults:", err);
        setConfig(DEFAULT_CONFIG);
        setLoading(false);
      }
    );

    return () => unsub();
  }, []);

  const sections: ResolvedSidebarSection[] = useMemo(() => {
    return resolveSidebarNavigation(config, WORKSPACE_TOOLS);
  }, [config]);

  const saveConfig = async (newSections: SidebarSectionConfig[]): Promise<void> => {
    const payload: SidebarNavigationConfig = {
      schemaVersion: 1,
      updatedAt: new Date().toISOString(),
      updatedBy: profile?.displayName || firebaseUser?.displayName || profile?.uid || "admin",
      sections: newSections,
    };

    const validated = SidebarNavigationConfigSchema.parse(payload);
    await setDoc(doc(db, "navigation_config", "sidebar"), validated);

    // Record admin action
    if (firebaseUser?.uid) {
      await logAdminAction({
        action: "system_config",
        category: "system",
        actor: {
          uid: firebaseUser.uid,
          displayName: profile?.displayName || firebaseUser.displayName || "Admin",
          email: firebaseUser.email,
        },
        targetId: "navigation_config/sidebar",
        targetName: "Sidebar Navigation",
        description: `Updated sidebar navigation section and link order/visibility (${newSections.length} sections configured)`,
        metadata: {
          sectionCount: newSections.length,
          visibleSections: newSections.filter((s) => s.isVisible).length,
          totalLinks: newSections.reduce((acc, s) => acc + (s.links?.length || 0), 0),
          visibleLinks: newSections.reduce((acc, s) => acc + (s.links?.filter((l) => l.isVisible).length || 0), 0),
        },
      });
    }
  };

  const resetToDefaults = async (): Promise<void> => {
    const defaults = getDefaultSidebarNavigationConfig();
    defaults.updatedAt = new Date().toISOString();
    defaults.updatedBy = profile?.displayName || firebaseUser?.displayName || "admin";

    await setDoc(doc(db, "navigation_config", "sidebar"), defaults);

    if (firebaseUser?.uid) {
      await logAdminAction({
        action: "system_config",
        category: "system",
        actor: {
          uid: firebaseUser.uid,
          displayName: profile?.displayName || firebaseUser.displayName || "Admin",
          email: firebaseUser.email,
        },
        targetId: "navigation_config/sidebar",
        targetName: "Sidebar Navigation",
        description: "Reset sidebar navigation configuration to system defaults",
        metadata: {
          action: "reset_to_defaults",
        },
      });
    }
  };

  return (
    <SidebarNavContext.Provider
      value={{
        config,
        sections,
        loading,
        saveConfig,
        resetToDefaults,
      }}
    >
      {children}
    </SidebarNavContext.Provider>
  );
}

export function useSidebarNav() {
  const context = useContext(SidebarNavContext);
  if (!context) {
    throw new Error("useSidebarNav must be used within a SidebarNavProvider");
  }
  return context;
}

