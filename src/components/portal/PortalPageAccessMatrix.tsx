"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import {
  WORKSPACE_TOOLS,
  WorkspaceTool,
  ToolCategory,
} from "@/lib/portal/workspaceRegistry";
import { Role } from "@/lib/auth/permissions";
import { RoleEnum } from "@/lib/schema/user";
import { toast } from "@/lib/context/ToastContext";
import {
  Shield,
  ShieldCheck,
  Search,
  ExternalLink,
  Copy,
  Check,
  Layers,
  Sparkles,
  Table as TableIcon,
  LayoutGrid,
  Lock,
  Unlock,
  Users,
  Compass,
  LayoutDashboard,
  Filter,
} from "lucide-react";

export interface RoleMeta {
  role: Role;
  title: string;
  badge: string;
  target: string;
  description: string;
  colorClass: string;
}

export const ROLE_METADATA: Record<Role, RoleMeta> = {
  admin: {
    role: "admin",
    title: "Full Administrator",
    badge: "Executive",
    target: "Band Directors & Tech Leads",
    description: "Universal administrative clearance across all portal tools, user roles, and security controls.",
    colorClass: "bg-amber-400/10 text-amber-400 border-amber-400/30",
  },
  web_manager: {
    role: "web_manager",
    title: "Web & Content Manager",
    badge: "Public Brand",
    target: "Webmasters & Marketers",
    description: "CMS page publishing, brand palettes, resource library, and SEO configuration.",
    colorClass: "bg-sky-400/10 text-sky-400 border-sky-400/30",
  },
  gig_manager: {
    role: "gig_manager",
    title: "Gig Operations Manager",
    badge: "Performance Ops",
    target: "Gig Coordinators & Event Leads",
    description: "Performance scheduling, call sheet dispatches, logistics, and inbound booking leads.",
    colorClass: "bg-purple-400/10 text-purple-400 border-purple-400/30",
  },
  catalog_manager: {
    role: "catalog_manager",
    title: "Music Librarian",
    badge: "Music Catalog",
    target: "Librarians & Arrangers",
    description: "Sheet music library, repertoire charts, rehearsal vault, and song suggestions.",
    colorClass: "bg-indigo-400/10 text-indigo-400 border-indigo-400/30",
  },
  setlist_manager: {
    role: "setlist_manager",
    title: "Setlist Manager",
    badge: "Setlists",
    target: "Setlist Curators & Drum Majors",
    description: "Curates, arranges, and sequences reusable performance setlists across gigs.",
    colorClass: "bg-violet-400/10 text-violet-400 border-violet-400/30",
  },
  community_manager: {
    role: "community_manager",
    title: "Community & PR Manager",
    badge: "Community PR",
    target: "PR Leads & Event Liaisons",
    description: "Comment moderation, client reviews, testimonials, and member shirt sizes.",
    colorClass: "bg-pink-400/10 text-pink-400 border-pink-400/30",
  },
  treasurer: {
    role: "treasurer",
    title: "Band Treasurer",
    badge: "Finance Officer",
    target: "Treasurer & Bookkeepers",
    description: "Financial ledger, gig payouts, member expense reimbursements, and charitable giving.",
    colorClass: "bg-emerald-400/10 text-emerald-400 border-emerald-400/30",
  },
  section_leader: {
    role: "section_leader",
    title: "Section Leader",
    badge: "Section Lead",
    target: "Instrument Section Principals",
    description: "Section attendance, part balances, and downbeat roll-call execution on gig day.",
    colorClass: "bg-teal-400/10 text-teal-400 border-teal-400/30",
  },
  membership_manager: {
    role: "membership_manager",
    title: "Membership Coordinator",
    badge: "Personnel",
    target: "Recruitment Leads & Secretary",
    description: "Musician roster, onboarding invites, audition reviews, and section assignments.",
    colorClass: "bg-blue-400/10 text-blue-400 border-blue-400/30",
  },
  asset_manager: {
    role: "asset_manager",
    title: "Equipment Quartermaster",
    badge: "Gear Custody",
    target: "Quartermasters & Drum Techs",
    description: "Band instruments, marching drums, banners, uniforms, and maintenance checkout logs.",
    colorClass: "bg-orange-400/10 text-orange-400 border-orange-400/30",
  },
  member: {
    role: "member",
    title: "Active Musician",
    badge: "Core Member",
    target: "Performing Band Members",
    description: "Standard member clearance: gig calendar, sheet music vault, directory, profile, and expense claims.",
    colorClass: "bg-lime-400/10 text-lime-400 border-lime-400/30",
  },
  guest: {
    role: "guest",
    title: "Guest / Sub Musician",
    badge: "Substitute",
    target: "Temporary Performers",
    description: "Guest performer clearance: assigned gig call sheets and practice parts.",
    colorClass: "bg-slate-400/10 text-slate-400 border-slate-400/30",
  },
};

const ALL_ROLES: Role[] = RoleEnum.options;

// Supplemental core portal entries to guarantee full coverage
const ROOT_PORTAL_PAGES: WorkspaceTool[] = [
  {
    id: "portal-home",
    title: "Member Portal Home & Overview",
    href: "/portal",
    icon: LayoutDashboard,
    requiredRoles: ["member", "guest"],
    category: "Help, Guides & Docs",
  },
  {
    id: "admin-hub",
    title: "Admin Studio Hub & Navigation",
    href: "/admin",
    icon: ShieldCheck,
    requiredRoles: [
      "admin",
      "web_manager",
      "gig_manager",
      "catalog_manager",
      "setlist_manager",
      "community_manager",
      "treasurer",
      "section_leader",
      "membership_manager",
      "asset_manager",
    ],
    category: "Business & Admin",
  },
];

// Unified list of all portal pages
const ALL_PAGES: WorkspaceTool[] = [...ROOT_PORTAL_PAGES, ...WORKSPACE_TOOLS];

const CATEGORIES: ToolCategory[] = [
  "Help, Guides & Docs",
  "Performances & Logistics",
  "Personnel & Attendance",
  "Music & Repertoire",
  "Website & Intake",
  "Finance",
  "Business & Admin",
];

export default function PortalPageAccessMatrix() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedRole, setSelectedRole] = useState<Role | "all">("all");
  const [viewMode, setViewMode] = useState<"table" | "cards">("table");
  const [copiedHref, setCopiedHref] = useState<string | null>(null);

  // Check if a specific role grants access to a tool
  const checkRoleAccess = (tool: WorkspaceTool, role: Role) => {
    if (role === "admin") return true;
    return tool.requiredRoles.includes(role);
  };

  // Determine access clearance classification
  const getAccessScope = (tool: WorkspaceTool) => {
    if (tool.requiredRoles.length === 1 && tool.requiredRoles[0] === "admin") {
      return {
        label: "Admin Exclusive",
        color: "bg-amber-500/10 text-amber-400 border-amber-500/20",
        icon: Lock,
      };
    }
    if (tool.requiredRoles.includes("member") || tool.requiredRoles.includes("guest")) {
      return {
        label: "All Band Members",
        color: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
        icon: Unlock,
      };
    }
    return {
      label: "Role Delegated",
      color: "bg-blue-500/10 text-blue-400 border-blue-500/20",
      icon: Shield,
    };
  };

  // Filtered pages
  const filteredPages = useMemo(() => {
    return ALL_PAGES.filter((page) => {
      // Category filter
      if (selectedCategory !== "all" && page.category !== selectedCategory) {
        return false;
      }

      // Role filter / Simulator
      if (selectedRole !== "all") {
        const hasAccess = checkRoleAccess(page, selectedRole);
        if (!hasAccess) return false;
      }

      // Text search
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const matchesTitle = page.title.toLowerCase().includes(query);
        const matchesHref = page.href.toLowerCase().includes(query);
        const matchesCategory = page.category.toLowerCase().includes(query);
        const matchesRole = page.requiredRoles.some((r) => r.toLowerCase().includes(query));
        if (!matchesTitle && !matchesHref && !matchesCategory && !matchesRole) {
          return false;
        }
      }

      return true;
    });
  }, [searchQuery, selectedCategory, selectedRole]);

  // Role coverage counts (how many pages each role can access)
  const roleCoverageCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    ALL_ROLES.forEach((role) => {
      counts[role] = ALL_PAGES.filter((p) => checkRoleAccess(p, role)).length;
    });
    return counts;
  }, []);

  // Summary counts
  const summaryStats = useMemo(() => {
    let adminExclusive = 0;
    let allMembers = 0;
    let roleDelegated = 0;

    ALL_PAGES.forEach((p) => {
      if (p.requiredRoles.length === 1 && p.requiredRoles[0] === "admin") {
        adminExclusive++;
      } else if (p.requiredRoles.includes("member") || p.requiredRoles.includes("guest")) {
        allMembers++;
      } else {
        roleDelegated++;
      }
    });

    return {
      total: ALL_PAGES.length,
      adminExclusive,
      allMembers,
      roleDelegated,
    };
  }, []);

  const handleCopyLink = (href: string) => {
    const fullUrl = `${window.location.origin}${href}`;
    navigator.clipboard.writeText(fullUrl);
    setCopiedHref(href);
    toast.success(`Copied path ${href} to clipboard`);
    setTimeout(() => {
      setCopiedHref(null);
    }, 2000);
  };

  return (
    <div className="space-y-6">
      {/* Overview & Security Context Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-900/90 to-amber-950/20 border border-slate-800 rounded-2xl p-5 space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-yellow-400/10 text-yellow-400 border border-yellow-400/20 flex items-center gap-1.5">
                <Compass className="w-3.5 h-3.5" /> Portal Route & RBAC Matrix
              </span>
              <span className="text-xs text-slate-400 font-mono">
                {ALL_PAGES.length} Total Routes
              </span>
            </div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              Portal Pages & Role Access Directory
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 max-w-3xl">
              Inspect all registered portal routes, workspace tools, and the specific RBAC roles that grant visibility and operational clearance.
              Administrators (<code className="text-amber-400 font-mono text-xs">admin</code>) retain universal clearance across all routes.
            </p>
          </div>

          <div className="flex items-center gap-2 bg-slate-950 border border-slate-800 p-1 rounded-xl shrink-0">
            <button
              type="button"
              onClick={() => setViewMode("table")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
                viewMode === "table"
                  ? "bg-yellow-400 text-slate-950 shadow-sm"
                  : "text-slate-400 hover:text-white"
              }`}
              title="Table Matrix View"
            >
              <TableIcon className="w-3.5 h-3.5" />
              <span>Table</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode("cards")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
                viewMode === "cards"
                  ? "bg-yellow-400 text-slate-950 shadow-sm"
                  : "text-slate-400 hover:text-white"
              }`}
              title="Card Grid View"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Cards</span>
            </button>
          </div>
        </div>

        {/* Quick KPI Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-slate-800/80">
          <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3">
            <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              Total Routes
            </div>
            <div className="text-xl font-bold text-white font-mono mt-0.5">
              {summaryStats.total}
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">Across 7 Categories</div>
          </div>

          <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3">
            <div className="text-[11px] font-semibold text-emerald-400 uppercase tracking-wider flex items-center gap-1">
              <Unlock className="w-3 h-3" /> Member Clearances
            </div>
            <div className="text-xl font-bold text-emerald-400 font-mono mt-0.5">
              {summaryStats.allMembers}
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">All Performing Members</div>
          </div>

          <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3">
            <div className="text-[11px] font-semibold text-blue-400 uppercase tracking-wider flex items-center gap-1">
              <Shield className="w-3 h-3" /> Role Delegated
            </div>
            <div className="text-xl font-bold text-blue-400 font-mono mt-0.5">
              {summaryStats.roleDelegated}
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">Section Leads & Managers</div>
          </div>

          <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3">
            <div className="text-[11px] font-semibold text-amber-400 uppercase tracking-wider flex items-center gap-1">
              <Lock className="w-3 h-3" /> Admin Exclusive
            </div>
            <div className="text-xl font-bold text-amber-400 font-mono mt-0.5">
              {summaryStats.adminExclusive}
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">Executive Clearances Only</div>
          </div>
        </div>
      </div>

      {/* Role Filter & Access Simulator Bar */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 space-y-3">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-yellow-400" />
            <span className="text-xs font-bold text-white uppercase tracking-wider">
              Role Access Simulator & Filter:
            </span>
            <span className="text-[11px] text-slate-400">
              Select a role to inspect all pages granting them access
            </span>
          </div>

          {selectedRole !== "all" && (
            <button
              type="button"
              onClick={() => setSelectedRole("all")}
              className="text-xs text-amber-400 hover:text-amber-300 font-medium underline transition"
            >
              Reset Role Filter (Show All)
            </button>
          )}
        </div>

        {/* Role Pills */}
        <div className="flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={() => setSelectedRole("all")}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition border flex items-center gap-1.5 ${
              selectedRole === "all"
                ? "bg-yellow-400 text-slate-950 border-yellow-400 font-bold shadow-xs"
                : "bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700 hover:text-white"
            }`}
          >
            <span>All Roles</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-black/20 font-mono">
              {ALL_PAGES.length}
            </span>
          </button>

          {ALL_ROLES.map((role) => {
            const meta = ROLE_METADATA[role];
            const isSelected = selectedRole === role;
            const count = roleCoverageCounts[role] || 0;

            return (
              <button
                key={role}
                type="button"
                onClick={() => setSelectedRole(role)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition border flex items-center gap-1.5 ${
                  isSelected
                    ? "bg-yellow-400 text-slate-950 border-yellow-400 font-bold shadow-xs"
                    : `${meta.colorClass} hover:brightness-125`
                }`}
                title={meta.description}
              >
                <span>{role}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                    isSelected ? "bg-black/20 text-slate-950" : "bg-black/30 text-slate-300"
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Active Role Meta Card (when a role is selected) */}
        {selectedRole !== "all" && (
          <div className="bg-slate-950/80 border border-amber-400/30 rounded-xl p-3 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 animate-in fade-in duration-150">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-white">
                  {ROLE_METADATA[selectedRole].title}
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded font-mono font-bold bg-amber-400/20 text-amber-300 border border-amber-400/30">
                  {ROLE_METADATA[selectedRole].badge}
                </span>
                <span className="text-xs text-slate-400">
                  &bull; Target: {ROLE_METADATA[selectedRole].target}
                </span>
              </div>
              <p className="text-xs text-slate-300">
                {ROLE_METADATA[selectedRole].description}
              </p>
            </div>

            <div className="text-right shrink-0">
              <div className="text-xs font-bold text-amber-400 font-mono">
                {filteredPages.length} of {ALL_PAGES.length} Pages Accessible
              </div>
              <div className="text-[10px] text-slate-500">
                {Math.round((filteredPages.length / ALL_PAGES.length) * 100)}% Portal Clearance
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Category Tabs & Search Bar */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-slate-900/60 border border-slate-800 rounded-2xl p-3">
        {/* Category Filter */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
          <button
            type="button"
            onClick={() => setSelectedCategory("all")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition shrink-0 ${
              selectedCategory === "all"
                ? "bg-slate-100 text-slate-950 shadow-sm"
                : "text-slate-400 hover:text-white hover:bg-slate-800"
            }`}
          >
            All Categories
          </button>
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition shrink-0 ${
                selectedCategory === cat
                  ? "bg-slate-100 text-slate-950 shadow-sm"
                  : "text-slate-400 hover:text-white hover:bg-slate-800"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div className="relative w-full md:w-72">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search page, path, or role..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-yellow-400"
          />
        </div>
      </div>

      {/* Main Pages Content View */}
      {filteredPages.length === 0 ? (
        <div className="p-12 text-center text-slate-500 bg-slate-900/40 rounded-2xl border border-slate-800 text-xs space-y-2">
          <div>No portal pages matched the selected filters.</div>
          <button
            type="button"
            onClick={() => {
              setSearchQuery("");
              setSelectedCategory("all");
              setSelectedRole("all");
            }}
            className="text-yellow-400 hover:underline font-semibold"
          >
            Clear all filters
          </button>
        </div>
      ) : viewMode === "table" ? (
        /* Table Matrix View */
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/80 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  <th className="py-3 px-4">Portal Page / Workspace Tool</th>
                  <th className="py-3 px-4">Route Path</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Clearance Scope</th>
                  <th className="py-3 px-4">Roles Granting Access</th>
                  <th className="py-3 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {filteredPages.map((page) => {
                  const Icon = page.icon;
                  const scope = getAccessScope(page);
                  const ScopeIcon = scope.icon;

                  return (
                    <tr
                      key={page.id}
                      className="hover:bg-slate-800/40 transition group"
                    >
                      {/* Tool Title & Icon */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="p-2 rounded-lg bg-slate-800/80 text-yellow-400 border border-slate-700 shrink-0">
                            <Icon className="w-4 h-4" />
                          </div>
                          <div>
                            <span className="font-bold text-white text-sm block">
                              {page.title}
                            </span>
                            <span className="text-[10px] font-mono text-slate-500">
                              ID: {page.id}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Route Path */}
                      <td className="py-3 px-4">
                        <code className="text-amber-300/90 font-mono text-xs bg-slate-950/70 px-2 py-0.5 rounded border border-slate-800 block w-fit">
                          {page.href}
                        </code>
                      </td>

                      {/* Category */}
                      <td className="py-3 px-4">
                        <span className="text-[11px] font-medium text-slate-300 bg-slate-800/60 px-2 py-0.5 rounded-md border border-slate-700/60">
                          {page.category}
                        </span>
                      </td>

                      {/* Clearance Scope */}
                      <td className="py-3 px-4">
                        <span
                          className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border inline-flex items-center gap-1 ${scope.color}`}
                        >
                          <ScopeIcon className="w-3 h-3" />
                          <span>{scope.label}</span>
                        </span>
                      </td>

                      {/* Roles Granting Access */}
                      <td className="py-3 px-4">
                        <div className="flex flex-wrap gap-1 max-w-md">
                          {page.requiredRoles.map((role) => {
                            const isFilterRole = selectedRole === role;
                            const meta = ROLE_METADATA[role];

                            return (
                              <span
                                key={role}
                                className={`text-[10px] font-semibold px-2 py-0.5 rounded border transition flex items-center gap-1 ${
                                  isFilterRole
                                    ? "bg-yellow-400 text-slate-950 border-yellow-400 font-bold shadow-xs"
                                    : meta
                                    ? meta.colorClass
                                    : "bg-slate-800 text-slate-300 border-slate-700"
                                }`}
                                title={meta?.description || role}
                              >
                                {isFilterRole && <Check className="w-2.5 h-2.5" />}
                                {role}
                              </span>
                            );
                          })}

                          {/* Show inherited admin access note if not explicitly listed */}
                          {!page.requiredRoles.includes("admin") && (
                            <span
                              className="text-[10px] font-mono text-slate-500 px-1.5 py-0.5 rounded bg-slate-950/40 border border-slate-800/40"
                              title="Administrators inherit universal clearance"
                            >
                              +admin (universal)
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Actions: Copy & Jump */}
                      <td className="py-3 px-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleCopyLink(page.href)}
                            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
                            title="Copy full URL"
                          >
                            {copiedHref === page.href ? (
                              <Check className="w-3.5 h-3.5 text-emerald-400" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                          <Link
                            href={page.href}
                            className="p-1.5 text-slate-400 hover:text-yellow-400 rounded-lg hover:bg-slate-800 transition flex items-center gap-1"
                            title="Visit page"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Card Grid View */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredPages.map((page) => {
            const Icon = page.icon;
            const scope = getAccessScope(page);
            const ScopeIcon = scope.icon;

            return (
              <div
                key={page.id}
                className="bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-2xl p-4 flex flex-col justify-between gap-4 transition shadow-md"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2.5 rounded-xl bg-slate-950 text-yellow-400 border border-slate-800">
                        <Icon className="w-4 h-4" />
                      </div>
                      <div>
                        <h3 className="font-bold text-white text-sm">
                          {page.title}
                        </h3>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {page.category}
                        </span>
                      </div>
                    </div>

                    <span
                      className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border inline-flex items-center gap-1 shrink-0 ${scope.color}`}
                    >
                      <ScopeIcon className="w-2.5 h-2.5" />
                      <span>{scope.label}</span>
                    </span>
                  </div>

                  <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-2 font-mono text-xs text-amber-300 flex items-center justify-between">
                    <span className="truncate">{page.href}</span>
                    <button
                      type="button"
                      onClick={() => handleCopyLink(page.href)}
                      className="text-slate-400 hover:text-white p-1 rounded hover:bg-slate-800 shrink-0 ml-1"
                      title="Copy URL"
                    >
                      {copiedHref === page.href ? (
                        <Check className="w-3 h-3 text-emerald-400" />
                      ) : (
                        <Copy className="w-3 h-3" />
                      )}
                    </button>
                  </div>

                  {/* Required Roles */}
                  <div className="space-y-1">
                    <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
                      Authorized Roles:
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {page.requiredRoles.map((role) => {
                        const isFilterRole = selectedRole === role;
                        const meta = ROLE_METADATA[role];
                        return (
                          <span
                            key={role}
                            className={`text-[10px] font-semibold px-2 py-0.5 rounded border ${
                              isFilterRole
                                ? "bg-yellow-400 text-slate-950 border-yellow-400 font-bold"
                                : meta
                                ? meta.colorClass
                                : "bg-slate-800 text-slate-300 border-slate-700"
                            }`}
                          >
                            {isFilterRole && <Check className="w-2.5 h-2.5 inline mr-0.5" />}
                            {role}
                          </span>
                        );
                      })}
                      {!page.requiredRoles.includes("admin") && (
                        <span className="text-[10px] font-mono text-slate-500 px-1.5 py-0.5 rounded bg-slate-950/40 border border-slate-800/40">
                          +admin
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-800/80 flex items-center justify-end">
                  <Link
                    href={page.href}
                    className="text-xs font-semibold text-slate-300 hover:text-yellow-400 flex items-center gap-1 transition"
                  >
                    <span>Open Workspace</span>
                    <ExternalLink className="w-3 h-3" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

