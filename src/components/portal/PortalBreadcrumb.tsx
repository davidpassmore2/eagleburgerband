"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { WORKSPACE_TOOLS } from "@/lib/portal/workspaceRegistry";

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
 * Directly aligns the breadcrumb section text with the category header in the sidebar,
 * and the link text with the tool title used in the navigation bar.
 */
export default function PortalBreadcrumb({
  section: customSection,
  pageTitle: customPageTitle,
  pageHref: customPageHref,
  subPage,
  className = "",
}: PortalBreadcrumbProps) {
  const pathname = usePathname();

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

  const isSubPage = Boolean(subPage || (prefixTool && pathname !== prefixTool.href));

  return (
    <nav aria-label="Breadcrumb" className={`flex items-center gap-2 text-xs text-slate-400 ${className}`}>
      <Link href="/portal" className="hover:text-amber-400 transition">
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

