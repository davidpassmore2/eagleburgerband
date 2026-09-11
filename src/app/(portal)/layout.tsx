"use client";

import React, { useSyncExternalStore, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AuthProvider, useAuth } from "@/lib/context/AuthContext";
import { ThemeProvider, useTheme } from "@/lib/context/ThemeContext";
import { WORKSPACE_TOOLS, ToolCategory } from "@/lib/portal/workspaceRegistry";
import { hasRole } from "@/lib/auth/permissions";
import { LogIn, LogOut, Compass, BookOpen, Palette, SlidersHorizontal } from "lucide-react";
import PortalThemeModal from "@/components/portal/PortalThemeModal";
import { RoleEmulationBanner } from "@/components/portal/RoleEmulationBanner";
import { RoleEmulationModal } from "@/components/portal/RoleEmulationModal";

const emptySubscribe = () => () => {};
function useMounted() {
  return useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );
}

const CATEGORY_ORDER: ToolCategory[] = [
  "Performances & Logistics",
  "Personnel & Attendance",
  "Music & Repertoire",
  "Business & Admin",
];

function PortalNavigationShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { profile, firebaseUser, loading, signInWithGoogle, signInWithDevAccount, signOut, isRealAdmin, isEmulating, emulatedRoles } = useAuth();
  const { theme, getScopedStyles, activePortalScheme } = useTheme();
  const mounted = useMounted();
  const [isThemeModalOpen, setIsThemeModalOpen] = useState(false);
  const [isEmulationModalOpen, setIsEmulationModalOpen] = useState(false);

  const authorizedTools = useMemo(() => {
    if (!mounted) return [];
    return WORKSPACE_TOOLS.filter((tool) =>
      tool.id !== "help" && tool.requiredRoles.some((role) => hasRole(profile, role))
    );
  }, [mounted, profile]);

  const isPortalActive = pathname === "/portal";
  const isHelpActive = pathname === "/portal/help" || pathname.startsWith("/portal/help/");

  return (
    <div 
      suppressHydrationWarning
      style={{
        ...getScopedStyles("portal"),
        backgroundColor: "var(--ebb-background)",
      }}
      className="min-h-screen text-slate-100 flex flex-col md:flex-row transition-colors duration-300"
    >
      {/* Sidebar container with pinned header and footer */}
      <aside 
        suppressHydrationWarning
        style={{
          backgroundColor: "var(--ebb-surface)",
          borderColor: "var(--ebb-border)",
        }}
        className="w-full md:w-64 border-b md:border-b-0 md:border-r p-4 flex flex-col justify-between shrink-0 md:h-screen md:sticky md:top-0 transition-colors duration-300"
      >
        <div className="flex flex-col min-h-0 flex-1">
          {/* Pinned Top Brand Header */}
          <div 
            suppressHydrationWarning
            style={{ borderColor: "var(--ebb-border)" }}
            className="flex items-center gap-3 pb-4 border-b shrink-0"
          >
            <div 
              suppressHydrationWarning
              className="text-slate-950 font-black px-2 py-1 rounded text-sm tracking-wider shadow"
              style={{ backgroundColor: "var(--ebb-primary)" }}
            >
              EBB
            </div>
            <div>
              <div className="font-bold text-sm text-white">{theme.bandName}</div>
              <div className="text-[11px] text-slate-400">Musician Portal</div>
            </div>
          </div>

          {/* Sleek Scrollable Navigation Container */}
          <nav className="flex-1 overflow-y-auto space-y-4 pt-4 pr-1 [scrollbar-width:thin] [scrollbar-color:rgba(148,163,184,0.2)_transparent] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-slate-700/60 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-yellow-400/50">
            <div className="space-y-1">
              <Link
                href="/portal"
                suppressHydrationWarning
                style={isPortalActive ? { backgroundColor: "var(--ebb-primary)" } : undefined}
                className={`flex items-center gap-2.5 px-3 py-2 rounded text-xs font-semibold transition ${
                  isPortalActive
                    ? "text-slate-950 font-bold shadow"
                    : "text-slate-300 hover:bg-slate-800"
                }`}
              >
                <Compass className="w-4 h-4" /> Home Base
              </Link>

              <Link
                href="/portal/help"
                suppressHydrationWarning
                style={isHelpActive ? { backgroundColor: "var(--ebb-primary)" } : undefined}
                className={`flex items-center gap-2.5 px-3 py-2 rounded text-xs font-semibold transition ${
                  isHelpActive
                    ? "text-slate-950 font-bold shadow"
                    : "text-slate-300 hover:bg-slate-800"
                }`}
              >
                <BookOpen className="w-4 h-4" /> Help & Guides
              </Link>
            </div>

            {mounted && authorizedTools.length > 0 && (
              <div className="space-y-4">
                {CATEGORY_ORDER.map((category) => {
                  const groupTools = authorizedTools.filter((tool) => tool.category === category);
                  if (groupTools.length === 0) return null;

                  return (
                    <div key={category} className="space-y-1">
                      <div className="px-3 text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400">
                        {category}
                      </div>
                      <div className="space-y-0.5">
                        {groupTools.map((tool) => {
                          const Icon = tool.icon;
                          const isActive = pathname === tool.href || pathname.startsWith(`${tool.href}/`);
                          return (
                            <Link
                              key={tool.id}
                              href={tool.href}
                              suppressHydrationWarning
                              style={isActive ? { backgroundColor: "var(--ebb-primary)" } : undefined}
                              className={`flex items-center gap-2.5 px-3 py-2 rounded text-xs font-medium transition ${
                                isActive
                                  ? "text-slate-950 font-semibold shadow"
                                  : "text-slate-400 hover:text-white hover:bg-slate-800/60"
                              }`}
                            >
                              <Icon className="w-4 h-4 shrink-0" />
                              <span className="truncate">{tool.title}</span>
                            </Link>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </nav>
        </div>

        {/* Pinned Bottom User Card */}
        <div 
          suppressHydrationWarning
          style={{ borderColor: "var(--ebb-border)" }}
          className="pt-4 border-t mt-4 shrink-0"
        >
          {!mounted || loading ? (
            <div className="text-xs text-slate-500">Loading...</div>
          ) : firebaseUser ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div 
                  suppressHydrationWarning
                  className="w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs shrink-0 border"
                  style={{ 
                    backgroundColor: "var(--ebb-surface-muted)",
                    borderColor: "var(--ebb-border)",
                    color: "var(--ebb-primary)" 
                  }}
                >
                  {profile?.displayName?.[0] || "U"}
                </div>
                <div className="overflow-hidden flex-1">
                  <div className="text-xs font-bold text-white truncate">
                    {profile?.displayName || firebaseUser.displayName || "Musician"}
                  </div>
                  <div className="text-[10px] text-slate-400 truncate">
                    {profile?.roles?.join(", ") || "member"}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1.5 pt-1">
                {isRealAdmin && (
                  <button
                    type="button"
                    suppressHydrationWarning
                    onClick={() => setIsEmulationModalOpen(true)}
                    title={isEmulating ? `Emulating: ${emulatedRoles?.join(", ")}` : "Test role permissions"}
                    style={{
                      backgroundColor: isEmulating ? "rgba(245, 158, 11, 0.2)" : "var(--ebb-surface-muted)",
                      borderColor: isEmulating ? "#b45309" : "var(--ebb-border)",
                      color: isEmulating ? "#fde047" : undefined,
                    }}
                    className="flex-1 flex items-center justify-center gap-1 text-xs text-slate-200 hover:text-white py-1.5 px-2 rounded-xl transition border font-medium"
                  >
                    <SlidersHorizontal className="w-3.5 h-3.5 text-amber-400" />
                    <span>{isEmulating ? "Emulating" : "Roles"}</span>
                  </button>
                )}

                <button
                  type="button"
                  suppressHydrationWarning
                  onClick={() => setIsThemeModalOpen(true)}
                  title={`Change theme (Current: ${activePortalScheme.name})`}
                  style={{
                    backgroundColor: "var(--ebb-surface-muted)",
                    borderColor: "var(--ebb-border)",
                  }}
                  className="flex-1 flex items-center justify-center gap-1.5 text-xs text-slate-200 hover:text-white py-1.5 px-2 rounded-xl transition border font-medium"
                >
                  <Palette className="w-3.5 h-3.5" style={{ color: "var(--ebb-primary)" }} />
                  <span>Theme</span>
                </button>

                <button
                  type="button"
                  suppressHydrationWarning
                  onClick={signOut}
                  title="Sign out of musician portal"
                  style={{
                    backgroundColor: "var(--ebb-surface-muted)",
                    borderColor: "var(--ebb-border)",
                  }}
                  className="flex items-center justify-center gap-1 text-xs text-slate-400 hover:text-rose-400 py-1.5 px-2.5 rounded-xl transition border font-medium"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Exit</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <button
                onClick={() => signInWithDevAccount()}
                className="w-full flex items-center justify-center gap-2 bg-yellow-400 hover:bg-yellow-300 text-slate-950 font-bold px-3 py-1.5 rounded text-xs transition shadow"
              >
                <LogIn className="w-3.5 h-3.5" /> Quick Sign In (Admin)
              </button>
              <div className="flex items-center justify-between gap-2 pt-1 text-[10px] text-slate-400">
                <button
                  onClick={signInWithGoogle}
                  className="hover:text-slate-300 transition"
                >
                  Google Sign-In
                </button>
                <button
                  type="button"
                  onClick={() => setIsThemeModalOpen(true)}
                  className="flex items-center gap-1 hover:text-yellow-400 transition"
                >
                  <Palette className="w-3 h-3" /> Theme
                </button>
              </div>
            </div>
          )}
        </div>
      </aside>

      <main 
        suppressHydrationWarning
        style={{ backgroundColor: "var(--ebb-background)" }}
        className="flex-1 overflow-y-auto min-w-0 transition-colors duration-300 flex flex-col"
      >
        <RoleEmulationBanner onOpenCustomModal={() => setIsEmulationModalOpen(true)} />
        <div className="flex-1 min-w-0">
          {children}
        </div>
      </main>

      {/* Interactive Portal Theme Selector Modal */}
      <PortalThemeModal 
        isOpen={isThemeModalOpen} 
        onClose={() => setIsThemeModalOpen(false)} 
      />

      {/* Role Emulation Sandbox Modal */}
      <RoleEmulationModal 
        isOpen={isEmulationModalOpen} 
        onClose={() => setIsEmulationModalOpen(false)} 
      />
    </div>
  );
}

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <ThemeProvider>
        <PortalNavigationShell>{children}</PortalNavigationShell>
      </ThemeProvider>
    </AuthProvider>
  );
}