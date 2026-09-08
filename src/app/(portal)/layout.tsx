"use client";

import React, { useSyncExternalStore } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AuthProvider, useAuth } from "@/lib/context/AuthContext";
import { WORKSPACE_TOOLS } from "@/lib/portal/workspaceRegistry";
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

function PortalNavigationShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { profile, firebaseUser, loading, signInWithGoogle, signInWithDevAccount, signOut } = useAuth();
  const mounted = useMounted();

  const authorizedTools = mounted
    ? WORKSPACE_TOOLS.filter((tool) =>
        tool.requiredRoles.some((role) => hasRole(profile, role))
      )
    : [];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col md:flex-row">
      <aside className="w-full md:w-64 bg-slate-900 border-b md:border-b-0 md:border-r border-slate-800 p-4 flex flex-col justify-between shrink-0">
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="bg-yellow-400 text-slate-950 font-black px-2 py-1 rounded text-sm tracking-wider">
              EBB
            </div>
            <div>
              <div className="font-bold text-sm text-white">Eagleburger Band</div>
              <div className="text-[11px] text-slate-400">Musician Portal</div>
            </div>
          </div>

          <nav className="space-y-1">
            <Link
              href="/portal"
              suppressHydrationWarning
              className={`flex items-center gap-2.5 px-3 py-2 rounded text-xs font-semibold transition ${
                pathname === "/portal"
                  ? "bg-yellow-400 text-slate-950"
                  : "text-slate-300 hover:bg-slate-800"
              }`}
            >
              <Compass className="w-4 h-4" /> Home Base
            </Link>

            {mounted && authorizedTools.length > 0 && (
              <div className="pt-4 space-y-1">
                <div className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Management Tools
                </div>
                {authorizedTools.map((tool) => {
                  const Icon = tool.icon;
                  const isActive = pathname === tool.href;
                  return (
                    <Link
                      key={tool.id}
                      href={tool.href}
                      suppressHydrationWarning
                      className={`flex items-center gap-2.5 px-3 py-2 rounded text-xs font-medium transition ${
                        isActive
                          ? "bg-yellow-400 text-slate-950 font-semibold"
                          : "text-slate-400 hover:text-white hover:bg-slate-800/60"
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      <span>{tool.title}</span>
                    </Link>
                  );
                })}
              </div>
            )}
          </nav>
        </div>

        <div className="pt-4 border-t border-slate-800 mt-6">
          {!mounted || loading ? (
            <div className="text-xs text-slate-500">Loading...</div>
          ) : firebaseUser ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-slate-800 flex items-center justify-center font-bold text-yellow-400 text-xs">
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
                className="w-full flex items-center justify-center gap-1.5 text-xs text-slate-400 hover:text-red-400 py-1 rounded transition"
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

      <main className="flex-1 bg-slate-950 overflow-y-auto">{children}</main>
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