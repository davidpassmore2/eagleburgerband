"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { WORKSPACE_TOOLS } from "@/lib/portal/workspaceRegistry";
import { getSectionHref, getSectionBySlug } from "@/lib/portal/portalSections";

export interface PortalBreadcrumbProps {
  section?: string;
  pageTitle?: string;
  pageHref?: string;
  subPage?: string;
  className?: string;
}

// Route overrides for portal pages not directly registered as top-level tools
const ROUTE_OVERRIDES: Record<string, { section: string; pageTitle: string; pageHref?: string }> = {
  "/admin": { section: "Business & Admin", pageTitle: "Admin Command Center", pageHref: "/admin" },
  "/portal/section": { section: "Personnel & Attendance", pageTitle: "Band Sections", pageHref: "/admin/sections" },
  "/portal/section/manage": { section: "Personnel & Attendance", pageTitle: "Band Sections", pageHref: "/admin/sections" },
  "/portal/suggestions": { section: "Music & Repertoire", pageTitle: "Suggestion Triage & Voting", pageHref: "/admin/suggestions" },
};

/**
 * Standard portal breadcrumb navigation component.
 * Always begins with "Portal Home", followed by a link to the section homepage,
 * and then the specific sub areas or child pages.
 */
export default function PortalBreadcrumb({
  section: customSection,
  pageTitle: customPageTitle,
  pageHref: customPageHref,
  subPage,
  className = "",
}: PortalBreadcrumbProps) {
  const pathname = usePathname();

  // Handle portal home root
  if (pathname === "/portal") {
    return (
      <nav aria-label="Breadcrumb" className={`flex items-center gap-2 text-xs text-slate-400 ${className}`}>
        <span className="text-white font-medium">Portal Home</span>
      </nav>
    );
  }

  // Handle all-sections index
  if (pathname === "/portal/sections") {
    return (
      <nav aria-label="Breadcrumb" className={`flex items-center gap-2 text-xs text-slate-400 ${className}`}>
        <Link href="/portal" className="hover:text-amber-400 transition">
          Portal Home
        </Link>
        <ChevronRight className="w-3 h-3 text-slate-600 shrink-0" />
        <span className="text-white font-medium">Portal Sections</span>
      </nav>
    );
  }

  // Check if currently on a section homepage (/portal/sections/[slug])
  const isSectionHomePage = pathname.startsWith("/portal/sections/");
  const sectionSlug = isSectionHomePage
    ? pathname.replace("/portal/sections/", "").split("/")[0]
    : null;
  const sectionFromSlug = sectionSlug ? getSectionBySlug(sectionSlug) : null;

  if (isSectionHomePage && sectionFromSlug) {
    return (
      <nav aria-label="Breadcrumb" className={`flex items-center gap-2 text-xs text-slate-400 ${className}`}>
        <Link href="/portal" className="hover:text-amber-400 transition">
          Portal Home
        </Link>
        <ChevronRight className="w-3 h-3 text-slate-600 shrink-0" />
        <span className="text-white font-medium">{sectionFromSlug.title}</span>
      </nav>
    );
  }

  // Find exact matching tool or prefix parent
  const matchedTool = WORKSPACE_TOOLS.find((t) => t.href === pathname);
  const prefixTool = !matchedTool
    ? WORKSPACE_TOOLS.find((t) => pathname.startsWith(t.href + "/"))
    : null;

  const override = ROUTE_OVERRIDES[pathname];

  const section =
    customSection ||
    override?.section ||
    matchedTool?.category ||
    prefixTool?.category ||
    "Musician Portal";

  const pageTitle =
    customPageTitle ||
    override?.pageTitle ||
    matchedTool?.title ||
    prefixTool?.title ||
    "Portal";

  const pageHref =
    customPageHref ||
    override?.pageHref ||
    matchedTool?.href ||
    prefixTool?.href;

  const sectionHref = getSectionHref(section);
  const isSubPage = Boolean(subPage || (prefixTool && pathname !== prefixTool.href));

  return (
    <nav aria-label="Breadcrumb" className={`flex items-center gap-2 text-xs text-slate-400 ${className}`}>
      <Link href="/portal" className="hover:text-amber-400 transition">
        Portal Home
      </Link>
      <ChevronRight className="w-3 h-3 text-slate-600 shrink-0" />
      <Link href={sectionHref} className="hover:text-amber-400 transition">
        {section}
      </Link>
      <ChevronRight className="w-3 h-3 text-slate-600 shrink-0" />
      {isSubPage ? (
        <>
          {pageHref ? (
            <Link href={pageHref} className="hover:text-amber-400 transition">
              {pageTitle}
            </Link>
          ) : (
            <span>{pageTitle}</span>
          )}
          <ChevronRight className="w-3 h-3 text-slate-600 shrink-0" />
          <span className="text-white font-medium">{subPage || "Details"}</span>
        </>
      ) : (
        <span className="text-white font-medium">{pageTitle}</span>
      )}
    </nav>
  );
}

