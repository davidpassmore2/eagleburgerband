"use client";

import React, { useMemo } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/context/AuthContext";
import { hasRole } from "@/lib/auth/permissions";
import { WORKSPACE_TOOLS } from "@/lib/portal/workspaceRegistry";
import { PORTAL_SECTIONS } from "@/lib/portal/portalSections";
import PortalBreadcrumb from "@/components/portal/PortalBreadcrumb";
import {
  Compass,
  ArrowRight,
  Layers,
} from "lucide-react";

export default function PortalSectionsIndexPage() {
  const { profile } = useAuth();

  // Map each section to count the tools available to the current user
  const sectionsWithCounts = useMemo(() => {
    return PORTAL_SECTIONS.map((sec) => {
      const authorizedTools = WORKSPACE_TOOLS.filter(
        (t) =>
          t.category === sec.category &&
          t.requiredRoles.some((role) => hasRole(profile, role))
      );
      return {
        ...sec,
        toolCount: authorizedTools.length,
      };
    });
  }, [profile]);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-10">
      {/* Universal Breadcrumb */}
      <PortalBreadcrumb className="mb-2" />

      {/* Header */}
      <div className="relative overflow-hidden rounded-3xl bg-slate-900/60 border border-slate-800/80 p-6 sm:p-10 shadow-2xl backdrop-blur-xs">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-start sm:items-center gap-4 sm:gap-5">
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-yellow-400/10 border border-yellow-400/30 text-yellow-400 flex items-center justify-center shrink-0 shadow-inner">
              <Layers className="w-7 h-7 sm:w-8 sm:h-8" />
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700 tracking-wider uppercase">
                  Portal Architecture
                </span>
                <span className="text-[10px] font-mono font-medium text-slate-400">
                  7 Core Operational Sections
                </span>
              </div>
              <h1 className="text-2xl sm:text-4xl font-arvo font-bold text-white uppercase tracking-tight">
                Portal Sections Directory
              </h1>
              <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
                Choose a portal section below to explore operational tools, call sheets, repertoire, rosters, and administrative workflows.
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

      {/* Section Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {sectionsWithCounts.map((section) => {
          const Icon = section.icon;

          return (
            <Link
              key={section.slug}
              href={section.href}
              className="group flex flex-col justify-between p-6 rounded-2xl bg-slate-900/50 border border-slate-800 hover:border-yellow-400/40 hover:bg-slate-800/40 transition-all duration-200 shadow-lg hover:shadow-xl hover:-translate-y-1 cursor-pointer"
            >
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div
                    className={`w-12 h-12 rounded-xl ${section.colorScheme.bgGlow} border ${section.colorScheme.border} ${section.colorScheme.accent} flex items-center justify-center shrink-0`}
                  >
                    <Icon className="w-6 h-6" />
                  </div>
                  <span className="text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700 uppercase tracking-wider">
                    {section.toolCount} {section.toolCount === 1 ? "tool" : "tools"}
                  </span>
                </div>

                <div>
                  <span className="text-[10px] font-mono font-bold text-yellow-400 uppercase tracking-wider">
                    {section.badge}
                  </span>
                  <h2 className="text-lg font-bold text-white group-hover:text-yellow-400 transition-colors">
                    {section.title}
                  </h2>
                  <p className="text-xs text-slate-400 mt-1.5 leading-relaxed line-clamp-3">
                    {section.description}
                  </p>
                </div>
              </div>

              <div className="pt-4 mt-4 border-t border-slate-800/70 flex items-center justify-between text-xs font-semibold text-slate-400 group-hover:text-yellow-400 transition-colors">
                <span>Explore Section</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

