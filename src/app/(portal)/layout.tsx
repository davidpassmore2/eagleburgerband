"use client";

import React, { useSyncExternalStore, useMemo } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AuthProvider, useAuth } from "@/lib/context/AuthContext";
import { WORKSPACE_TOOLS, ToolCategory } from "@/lib/portal/workspaceRegistry";
import { hasRole } from "@/lib/auth/permissions";
import { LogIn, LogOut, Compass } from "lucide-react";

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
  const { profile, firebaseUser, loading, signInWithGoogle, signInWithDevAccount, signOut } = useAuth();
  const mounted = useMounted();

  const authorizedTools = useMemo(() => {
    if (!mounted) return [];
    return WORKSPACE_TOOLS.filter((tool) =>
      tool.requiredRoles.some((role) => hasRole(profile, role))
    );
  }, [mounted, profile]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col md:flex-row">
      {/* Sidebar container with pinned header and footer */}
      <aside className="w-full md:w-64 bg-slate-900 border-b md:border-b-0 md:border-r border-slate-800 p-4 flex flex-col justify-between shrink-0 md:h-screen md:sticky md:top-0">
        <div className="flex flex-col min-h-0 flex-1">
          {/* Pinned Top Brand Header */}
          <div className="flex items-center gap-3 pb-4 border-b border-slate-800/80 shrink-0">
            <div className="bg-yellow-400 text-slate-950 font-black px-2 py-1 rounded text-sm tracking-wider">
              EBB
            </div>
            <div>
              <div className="font-bold text-sm text-white">Eagleburger Band</div>
              <div className="text-[11px] text-slate-400">Musician Portal</div>
            </div>
          </div>

          {/* Sleek Scrollable Navigation Container */}
          <nav className="flex-1 overflow-y-auto space-y-4 pt-4 pr-1 [scrollbar-width:thin] [scrollbar-color:rgba(148,163,184,0.2)_transparent] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-slate-700/60 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-yellow-400/50">
            <Link
              href="/portal"
              suppressHydrationWarning
              className={`flex items-center gap-2.5 px-3 py-2 rounded text-xs font-semibold transition ${
                pathname === "/portal"
                  ? "bg-yellow-400 text-slate-950 font-bold shadow"
                  : "text-slate-300 hover:bg-slate-800"
              }`}
            >
              <Compass className="w-4 h-4" /> Home Base
            </Link>

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
                              className={`flex items-center gap-2.5 px-3 py-2 rounded text-xs font-medium transition ${
                                isActive
                                  ? "bg-yellow-400 text-slate-950 font-semibold shadow"
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
        <div className="pt-4 border-t border-slate-800 mt-4 shrink-0">
          {!mounted || loading ? (
            <div className="text-xs text-slate-500">Loading...</div>
          ) : firebaseUser ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-slate-800 flex items-center justify-center font-bold text-yellow-400 text-xs shrink-0">
                  {profile?.displayName?.[0] || "U"}
                </div>
                <div className="overflow-hidden">
                  <div className="text-xs font-bold text-white truncate">
                    {profile?.displayName || firebaseUser.displayName || "Musician"}
                  </div>
                  <div className="text-[10px] text-slate-400 truncate">
                    {profile?.roles?.join(", ") || "member"}
                  </div>
                </div>
              </div>
              <button
                onClick={signOut}
                className="w-full flex items-center justify-center gap-1.5 text-xs text-slate-400 hover:text-red-400 py-1 rounded transition hover:bg-slate-800/50"
              >
                <LogOut className="w-3.5 h-3.5" /> Sign Out
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              <button
                onClick={() => signInWithDevAccount()}
                className="w-full flex items-center justify-center gap-2 bg-yellow-400 hover:bg-yellow-300 text-slate-950 font-bold px-3 py-1.5 rounded text-xs transition shadow"
              >
                <LogIn className="w-3.5 h-3.5" /> Quick Sign In (Admin)
              </button>
              <button
                onClick={signInWithGoogle}
                className="w-full text-center text-[10px] text-slate-400 hover:text-slate-300 py-1 transition"
              >
                Sign in with Google Popup
              </button>
            </div>
          )}
        </div>
      </aside>

      <main className="flex-1 bg-slate-950 overflow-y-auto min-w-0">{children}</main>
    </div>
  );
}

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <PortalNavigationShell>{children}</PortalNavigationShell>
    </AuthProvider>
  );
}