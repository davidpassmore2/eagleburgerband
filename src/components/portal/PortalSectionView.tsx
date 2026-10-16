"use client";

import React, { useMemo } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/context/AuthContext";
import { hasRole } from "@/lib/auth/permissions";
import { WORKSPACE_TOOLS } from "@/lib/portal/workspaceRegistry";
import {
  PORTAL_SECTIONS,
  getSectionBySlug,
} from "@/lib/portal/portalSections";
import PortalBreadcrumb from "@/components/portal/PortalBreadcrumb";
import {
  ArrowRight,
  Sparkles,
  HelpCircle,
  Compass,
  ArrowUpRight,
  ShieldAlert,
} from "lucide-react";

export default function PortalSectionView({ slug }: { slug: string }) {
  const { profile } = useAuth();

  const sectionInfo = useMemo(() => getSectionBySlug(slug), [slug]);

  // Filter tools for this category that the user has permission to view
  const authorizedTools = useMemo(() => {
    if (!sectionInfo) return [];
    return WORKSPACE_TOOLS.filter(
      (tool) =>
        tool.category === sectionInfo.category &&
        tool.requiredRoles.some((role) => hasRole(profile, role))
    );
  }, [sectionInfo, profile]);

  // If slug is not recognized, render a clean fallback
  if (!sectionInfo) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 text-center space-y-6">
        <PortalBreadcrumb className="mb-4" />
        <div className="w-16 h-16 rounded-2xl bg-amber-400/10 border border-amber-400/30 text-amber-400 flex items-center justify-center mx-auto shadow-inner">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <h1 className="text-2xl sm:text-3xl font-black text-white uppercase tracking-tight">
          Section Not Found
        </h1>
        <p className="text-sm text-slate-400 max-w-md mx-auto">
          The portal section &ldquo;{slug}&rdquo; does not exist or has been relocated.
        </p>
        <Link
          href="/portal"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-yellow-400 hover:bg-yellow-300 text-slate-950 font-bold text-xs uppercase tracking-wider transition shadow-lg shadow-yellow-400/20"
        >
          <Compass className="w-4 h-4" />
          Return to Portal Home
        </Link>
      </div>
    );
  }

  const SectionIcon = sectionInfo.icon;
  const otherSections = PORTAL_SECTIONS.filter((s) => s.slug !== slug);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-10">
      {/* Top Universal Breadcrumb */}
      <PortalBreadcrumb className="mb-2" />

      {/* Section Hero Header */}
      <div className="relative overflow-hidden rounded-3xl bg-slate-900/60 border border-slate-800/80 p-6 sm:p-10 shadow-2xl backdrop-blur-xs">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-start sm:items-center gap-4 sm:gap-5">
            <div
              className={`w-14 h-14 sm:w-16 sm:h-16 rounded-2xl ${sectionInfo.colorScheme.bgGlow} border ${sectionInfo.colorScheme.border} ${sectionInfo.colorScheme.accent} flex items-center justify-center shrink-0 shadow-inner`}
            >
              <SectionIcon className="w-7 h-7 sm:w-8 sm:h-8" />
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700 tracking-wider uppercase">
                  {sectionInfo.badge}
                </span>
                <span className="text-[10px] font-mono font-medium text-slate-400">
                  {authorizedTools.length} {authorizedTools.length === 1 ? "tool" : "tools"} available
                </span>
              </div>
              <h1 className="text-2xl sm:text-4xl font-arvo font-bold text-white uppercase tracking-tight">
                {sectionInfo.title}
              </h1>
              <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
                {sectionInfo.description}
              </p>
            </div>
          </div>

          <Link
            href="/portal"
            className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400 hover:text-amber-400 transition self-start md:self-auto py-2"
          >
            <Compass className="w-3.5 h-3.5" />
            <span>Portal Home</span>
          </Link>
        </div>
      </div>

      {/* "What Can I Do in This Section?" Information Area */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 px-1">
          <Sparkles className="w-4 h-4 text-amber-400" />
          <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-amber-400">
            What Can I Do in This Section?
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {sectionInfo.whatCanIDo.map((item, idx) => (
            <div
              key={idx}
              className="p-5 rounded-2xl bg-slate-900/40 border border-slate-800/60 hover:border-slate-700 transition space-y-2 flex flex-col justify-start"
            >
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-yellow-400/10 text-yellow-400 flex items-center justify-center text-xs font-bold shrink-0">
                  {idx + 1}
                </div>
                <h3 className="text-sm font-bold text-white tracking-tight">
                  {item.title}
                </h3>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed pl-8">
                {item.description}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Operational Hubs & Tools Grid */}
      <div className="space-y-4">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <SectionIcon className="w-4 h-4 text-slate-400" />
            <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-300">
              Tools & Sub-Areas ({authorizedTools.length})
            </h2>
          </div>
          <span className="text-[11px] text-slate-400 hidden sm:inline">
            Direct access based on your assigned roles
          </span>
        </div>

        {authorizedTools.length === 0 ? (
          <div className="p-8 rounded-2xl bg-slate-900/20 border border-slate-800 text-center space-y-2 text-slate-400 text-xs">
            <HelpCircle className="w-6 h-6 mx-auto text-slate-500 mb-2" />
            <p>You do not currently have access to any tools in this section.</p>
            <p className="text-[11px] text-slate-400">
              If you require access, reach out to band management or your section leader.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {authorizedTools.map((tool) => {
              const ToolIcon = tool.icon;
              const isManagerOnly = !tool.requiredRoles.includes("member") && !tool.requiredRoles.includes("guest");

              return (
                <Link
                  key={tool.id}
                  href={tool.href}
                  className="group relative flex flex-col justify-between p-5 rounded-2xl bg-slate-900/50 border border-slate-800 hover:border-yellow-400/40 hover:bg-slate-800/40 transition-all duration-200 shadow-md hover:shadow-xl hover:-translate-y-0.5 cursor-pointer"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700/80 text-yellow-400 group-hover:bg-yellow-400 group-hover:text-slate-950 transition-colors flex items-center justify-center shrink-0">
                        <ToolIcon className="w-5 h-5" />
                      </div>
                      {isManagerOnly ? (
                        <span className="text-[9px] font-mono font-bold px-2 py-0.5 rounded-full bg-amber-400/10 text-amber-400 border border-amber-400/30 uppercase tracking-wider">
                          Management
                        </span>
                      ) : (
                        <span className="text-[9px] font-mono font-medium px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700/60 uppercase tracking-wider">
                          All Members
                        </span>
                      )}
                    </div>

                    <div>
                      <h3 className="font-bold text-white text-sm group-hover:text-yellow-400 transition-colors flex items-center gap-1.5">
                        <span>{tool.title}</span>
                      </h3>
                      <p className="text-xs text-slate-400 mt-1 line-clamp-2">
                        {tool.href.startsWith("/admin/") ? "Administrative management & studio tool." : "Musician portal tool and member workspace."}
                      </p>
                    </div>
                  </div>

                  <div className="pt-4 mt-3 border-t border-slate-800/60 flex items-center justify-between text-[11px] text-slate-400 group-hover:text-yellow-400 transition-colors font-medium">
                    <span>Open Tool</span>
                    <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      {/* Jump to Another Section Footer */}
      <div className="pt-6 border-t border-slate-800/80 space-y-3">
        <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-400">
          Explore Other Portal Sections
        </h3>
        <div className="flex flex-wrap gap-2">
          {otherSections.map((sec) => (
            <Link
              key={sec.slug}
              href={sec.href}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white text-xs transition font-medium"
            >
              <span>{sec.title}</span>
              <ArrowUpRight className="w-3 h-3 text-slate-400" />
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

