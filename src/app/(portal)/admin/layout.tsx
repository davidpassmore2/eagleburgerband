"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/context/AuthContext";
import { WORKSPACE_TOOLS } from "@/lib/portal/workspaceRegistry";
import { hasAnyRole, Role } from "@/lib/auth/permissions";
import { ShieldAlert, ArrowLeft, Lock } from "lucide-react";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { profile, loading } = useAuth();

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[60vh] text-xs font-mono text-slate-400">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-yellow-400 animate-ping" />
          <span>Verifying administrative authorization...</span>
        </div>
      </div>
    );
  }

  // Determine required roles for the current admin path
  const currentTool = WORKSPACE_TOOLS.find(
    (t) => pathname === t.href || pathname.startsWith(t.href + "/")
  );

  const requiredRoles: Role[] = currentTool?.requiredRoles || ["admin"];
  const isAuthorized = hasAnyRole(profile, requiredRoles);

  if (!isAuthorized) {
    return (
      <div className="max-w-xl mx-auto my-12 p-6 sm:p-8 bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl space-y-6 text-center">
        <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 mx-auto flex items-center justify-center">
          <ShieldAlert className="w-8 h-8" />
        </div>

        <div className="space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-[10px] font-mono font-bold uppercase tracking-wider text-amber-400">
            <Lock className="w-3 h-3" />
            <span>Administrative Clearance Required</span>
          </div>
          <h2 className="text-xl font-black text-white uppercase tracking-tight">
            {currentTool?.title || "Restricted Management Studio"}
          </h2>
          <p className="text-xs text-slate-400 leading-relaxed">
            Your current account role(s) <span className="font-mono text-slate-200">[{profile?.roles?.join(", ") || "member"}]</span> do not have clearance to access this administration console.
          </p>
        </div>

        <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4 text-left space-y-2 text-xs">
          <div className="text-[11px] font-mono font-bold uppercase tracking-wider text-slate-400">
            Access Requirements
          </div>
          <div className="text-slate-300 flex flex-wrap gap-1.5">
            {requiredRoles.map((r) => (
              <span key={r} className="px-2 py-0.5 rounded bg-slate-900 text-yellow-400 border border-slate-800 font-mono text-[11px] font-semibold">
                {r}
              </span>
            ))}
          </div>
          <p className="text-[11px] text-slate-500 leading-relaxed pt-1">
            If you need clearance for this studio, please contact the band director or executive committee.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <Link
            href="/portal"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-yellow-400 hover:bg-yellow-300 text-slate-950 font-black px-5 py-2.5 rounded-xl text-xs uppercase tracking-wider transition shadow-lg shadow-yellow-400/10"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Return to Musician Portal</span>
          </Link>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

