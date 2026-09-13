"use client";

import React, { useMemo } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/context/AuthContext";
import { WORKSPACE_TOOLS, ToolCategory } from "@/lib/portal/workspaceRegistry";
import { hasAnyRole } from "@/lib/auth/permissions";
import { Shield, ArrowRight, Sparkles } from "lucide-react";

const CATEGORIES: ToolCategory[] = [
  "Performances & Logistics",
  "Personnel & Attendance",
  "Music & Repertoire",
  "Business & Admin",
];

export default function AdminHubPage() {
  const { profile } = useAuth();

  const authorizedAdminTools = useMemo(() => {
    return WORKSPACE_TOOLS.filter(
      (tool) =>
        tool.href.startsWith("/admin/") &&
        tool.requiredRoles.some((role) => hasAnyRole(profile, [role]))
    );
  }, [profile]);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-yellow-400/20 text-yellow-400 flex items-center justify-center shrink-0 border border-yellow-400/30 shadow-inner">
            <Shield className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono font-black uppercase tracking-wider text-yellow-400">
                Command & Management
              </span>
              <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                {profile?.roles?.join(", ") || "admin"}
              </span>
            </div>
            <h1 className="text-2xl font-black text-white uppercase tracking-tight">
              Administrative Studios Hub
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Direct access to performance logistics, roster management, music catalog, and financial studios.
            </p>
          </div>
        </div>

        <Link
          href="/portal"
          className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400 hover:text-yellow-400 transition"
        >
          <span>Return to Musician Home Base</span>
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>

      {/* Categorized Tools Grid */}
      <div className="space-y-8">
        {CATEGORIES.map((category) => {
          const toolsInCategory = authorizedAdminTools.filter(
            (t) => t.category === category
          );
          if (toolsInCategory.length === 0) return null;

          return (
            <div key={category} className="space-y-3">
              <div className="flex items-center gap-2 text-xs font-mono font-bold uppercase tracking-wider text-slate-400">
                <Sparkles className="w-3.5 h-3.5 text-yellow-400" />
                <span>{category}</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {toolsInCategory.map((tool) => {
                  const Icon = tool.icon;
                  return (
                    <Link
                      key={tool.id}
                      href={tool.href}
                      className="group p-4 rounded-2xl bg-slate-900/80 hover:bg-slate-800/90 border border-slate-800 hover:border-yellow-400/50 transition-all shadow-sm flex items-start justify-between"
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-9 h-9 rounded-xl bg-slate-950 border border-slate-800 group-hover:border-yellow-400/40 text-yellow-400 flex items-center justify-center shrink-0 transition">
                          <Icon className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="text-xs font-bold text-white group-hover:text-yellow-400 transition">
                            {tool.title}
                          </div>
                          <div className="text-[10px] font-mono text-slate-500 mt-1">
                            {tool.href}
                          </div>
                        </div>
                      </div>
                      <ArrowRight className="w-4 h-4 text-slate-600 group-hover:text-yellow-400 group-hover:translate-x-0.5 transition shrink-0 mt-1" />
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

