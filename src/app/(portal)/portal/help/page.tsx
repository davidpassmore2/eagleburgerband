"use client";

import React, { useState, useMemo, useEffect, useSyncExternalStore } from "react";
import Link from "next/link";
import PortalBreadcrumb from "@/components/portal/PortalBreadcrumb";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { useAuth } from "@/lib/context/AuthContext";
import { Role, hasRole } from "@/lib/auth/permissions";
import { User, UserSchema } from "@/lib/schema/user";
import { Section, SectionSchema } from "@/lib/schema/section";
import {
  BookOpen,
  Search,
  Compass,
  ShieldCheck,
  HelpCircle,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  Filter,
  Copy,
  Check,
  Lightbulb,
  Shield,
  ShieldAlert,
  Users,
  User as UserIcon,
  Music,
  Calendar,
  DollarSign,
  Globe,
  UserPlus,
  Package,
  Megaphone,
  UserCheck,
  Mail,
  Phone,
  LayoutGrid,
  Table as TableIcon,
  Receipt,
  Star,
  MessageSquareQuote,
  Send,
  ListMusic,
  PackageCheck,
  Library,
  BarChart3,
  Contact,
  Layers,
  HeartHandshake,
  Music2,
  Smartphone,
  Palette,
  LayoutTemplate,
  MessageSquare,
  Inbox,
  CheckSquare,
  Workflow,
  EyeOff,
  Bell,
  Shirt,
  FolderOpen,
  Activity,
  History,
  UserCog,
  SlidersHorizontal,
  KeyRound,
} from "lucide-react";

export type HelpCategory =
  | "All Routes"
  | "Musician Essentials"
  | "Gigs & Logistics"
  | "Personnel & Attendance"
  | "Music & Repertoire"
  | "Website & Intake"
  | "Finance"
  | "Business & Admin"
  | "Portal Roles & Members"
  | "Permissions Matrix"
  | "FAQs";

import { RouteDoc, ROUTE_DOCS, RoleDocItem, ROLE_DESCRIPTIONS, FAQS, RBAC_ROLES } from "@/lib/data/helpDocsData";
function getRouteIcon(iconName: string) {
  switch (iconName) {
    case "Calendar": return <Calendar className="w-4 h-4" />;
    case "Music2": return <Music2 className="w-4 h-4" />;
    case "Music": return <Music className="w-4 h-4" />;
    case "Users": return <Users className="w-4 h-4" />;
    case "Smartphone": return <Smartphone className="w-4 h-4" />;
    case "ListMusic": return <ListMusic className="w-4 h-4" />;
    case "UserCheck": return <UserCheck className="w-4 h-4" />;
    case "Send": return <Send className="w-4 h-4" />;
    case "Mail": return <Mail className="w-4 h-4" />;
    case "Layers": return <Layers className="w-4 h-4" />;
    case "CheckSquare": return <CheckSquare className="w-4 h-4" />;
    case "PackageCheck": return <PackageCheck className="w-4 h-4" />;
    case "Library": return <Library className="w-4 h-4" />;
    case "BarChart3": return <BarChart3 className="w-4 h-4" />;
    case "Lightbulb": return <Lightbulb className="w-4 h-4" />;
    case "DollarSign": return <DollarSign className="w-4 h-4" />;
    case "Receipt": return <Receipt className="w-4 h-4" />;
    case "HeartHandshake": return <HeartHandshake className="w-4 h-4" />;
    case "Inbox": return <Inbox className="w-4 h-4" />;
    case "Star": return <Star className="w-4 h-4" />;
    case "MessageSquareQuote": return <MessageSquareQuote className="w-4 h-4" />;
    case "UserPlus": return <UserPlus className="w-4 h-4" />;
    case "LayoutTemplate": return <LayoutTemplate className="w-4 h-4" />;
    case "Palette": return <Palette className="w-4 h-4" />;
    case "Contact": return <Contact className="w-4 h-4" />;
    case "MessageSquare": return <MessageSquare className="w-4 h-4" />;
    case "ShieldCheck": return <ShieldCheck className="w-4 h-4" />;
    case "Workflow": return <Workflow className="w-4 h-4" />;
    case "Bell": return <Bell className="w-4 h-4" />;
    case "Shirt": return <Shirt className="w-4 h-4" />;
    case "FolderOpen": return <FolderOpen className="w-4 h-4" />;
    case "Activity": return <Activity className="w-4 h-4" />;
    case "History": return <History className="w-4 h-4" />;
    case "UserCog": return <UserCog className="w-4 h-4" />;
    case "SlidersHorizontal": return <SlidersHorizontal className="w-4 h-4" />;
    case "KeyRound": return <KeyRound className="w-4 h-4" />;
    case "BookOpen": return <BookOpen className="w-4 h-4" />;
    default: return <Compass className="w-4 h-4" />;
  }
}

const emptySubscribe = () => () => {};
function useMounted() {
  return useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );
}

export default function PortalHelpCenterPage() {
  const { profile, isRealAdmin, setEmulatedRoles, emulatedRoles, isEmulating, clearEmulation } = useAuth();
  const mounted = useMounted();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<HelpCategory>("All Routes");
  const [selectedRoleFilter, setSelectedRoleFilter] = useState<string>("all");
  const [expandedRoutes, setExpandedRoutes] = useState<Record<string, boolean>>({});
  const [copiedPath, setCopiedPath] = useState<string | null>(null);

  // Firestore real-time users and sections data
  const [users, setUsers] = useState<User[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [roleViewMode, setRoleViewMode] = useState<"cards" | "matrix">("cards");
  const [expandedRoles, setExpandedRoles] = useState<Record<string, boolean>>({
    admin: true,
    gig_manager: true,
    catalog_manager: true,
    section_leader: true,
    treasurer: true,
    web_manager: true,
    membership_manager: true,
    asset_manager: true,
    community_manager: true,
    member: false,
    guest: false,
  });

  useEffect(() => {
    const unsubUsers = onSnapshot(
      collection(db, "users"),
      (snap) => {
        const list: User[] = [];
        snap.forEach((d) => {
          const parsed = UserSchema.safeParse(d.data());
          if (parsed.success) {
            list.push(parsed.data);
          } else {
            const raw = d.data();
            list.push({
              schemaVersion: 1,
              uid: raw.uid || d.id,
              email: raw.email || "",
              displayName: raw.displayName || "Band Member",
              realName: raw.realName || "",
              shirtSize: raw.shirtSize || "",
              dietaryPreference: raw.dietaryPreference || "",
              dietaryNotes: raw.dietaryNotes || "",
              emergencyContact: raw.emergencyContact || { name: "", relationship: "", phone: "" },
              roles: Array.isArray(raw.roles) ? raw.roles : ["member"],
              sectionId: raw.sectionId || null,
              instruments: Array.isArray(raw.instruments) ? raw.instruments : [],
              selectedInstrument: raw.selectedInstrument || "",
              favoriteToolIds: [],
              portalThemeSchemeId: "eagleburger-gold",
              portalThemeMode: "dark",
              status: raw.status === "inactive" || raw.status === "pending" || raw.status === "hiatus" ? raw.status : "active",
              onHiatus: Boolean(raw.onHiatus || raw.status === "hiatus"),
              hiatusReason: raw.hiatusReason || "",
              phone: raw.phone || "",
              smsConsent: Boolean(raw.smsConsent),
              smsConsentUpdatedAt: raw.smsConsentUpdatedAt || "",
              hideEmailInRoster: Boolean(raw.hideEmailInRoster),
              hidePhoneInRoster: Boolean(raw.hidePhoneInRoster),
              payoutPreferences: raw.payoutPreferences || {
                preferredMethod: "venmo",
                venmoHandle: "",
                paypalEmail: "",
                zelleIdentifier: "",
                notes: "",
              },
              notificationPreferences: raw.notificationPreferences || {
                gigAlerts: true,
                logisticsChanges: true,
                rehearsalNotices: true,
                broadcasts: true,
                suggestionActivity: true,
                emailDigest: false,
                smsEmergencyOnly: true,
                updatedAt: new Date().toISOString(),
              },
              metadata: {},
              createdAt: raw.createdAt || new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            });

          }
        });
        list.sort((a, b) => (a.displayName || "").localeCompare(b.displayName || ""));
        setUsers(list);
      },
      (err) => {
        console.warn("Failed to subscribe to users in Help page:", err);
      }
    );

    const unsubSections = onSnapshot(
      collection(db, "sections"),
      (snap) => {
        const list: Section[] = [];
        snap.forEach((d) => {
          const parsed = SectionSchema.safeParse(d.data());
          if (parsed.success) list.push(parsed.data);
        });
        setSections(list);
      },
      (err) => {
        console.warn("Failed to subscribe to sections in Help page:", err);
      }
    );

    return () => {
      unsubUsers();
      unsubSections();
    };
  }, []);

  const sectionMap = useMemo(() => {
    const map: Record<string, string> = {};
    sections.forEach((s) => {
      map[s.id] = s.name;
    });
    return map;
  }, [sections]);

  const toggleRouteExpand = (id: string) => {
    setExpandedRoutes((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const expandAll = () => {
    const allExpanded: Record<string, boolean> = {};
    ROUTE_DOCS.forEach((r) => {
      allExpanded[r.id] = true;
    });
    setExpandedRoutes(allExpanded);
  };

  const collapseAll = () => {
    setExpandedRoutes({});
  };

  const toggleRoleExpand = (role: string) => {
    setExpandedRoles((prev) => ({ ...prev, [role]: !prev[role] }));
  };

  const expandAllRoles = () => {
    const all: Record<string, boolean> = {};
    ROLE_DESCRIPTIONS.forEach((r) => {
      all[r.role] = true;
    });
    setExpandedRoles(all);
  };

  const collapseAllRoles = () => {
    setExpandedRoles({});
  };

  const getRoleIcon = (role: Role) => {
    switch (role) {
      case "admin":
        return <ShieldAlert className="w-5 h-5 text-amber-400" />;
      case "gig_manager":
        return <Calendar className="w-5 h-5 text-sky-400" />;
      case "catalog_manager":
        return <Music className="w-5 h-5 text-emerald-400" />;
      case "section_leader":
        return <Users className="w-5 h-5 text-indigo-400" />;
      case "treasurer":
        return <DollarSign className="w-5 h-5 text-emerald-300" />;
      case "web_manager":
        return <Globe className="w-5 h-5 text-cyan-400" />;
      case "membership_manager":
        return <UserPlus className="w-5 h-5 text-pink-400" />;
      case "asset_manager":
        return <Package className="w-5 h-5 text-orange-400" />;
      case "community_manager":
        return <Megaphone className="w-5 h-5 text-yellow-400" />;
      case "member":
        return <UserCheck className="w-5 h-5 text-emerald-400" />;
      case "guest":
        return <UserIcon className="w-5 h-5 text-slate-400" />;
      default:
        return <Shield className="w-5 h-5 text-slate-400" />;
    }
  };

  const handleCopyPath = (path: string) => {
    if (typeof window !== "undefined" && navigator?.clipboard) {
      navigator.clipboard.writeText(window.location.origin + path);
      setCopiedPath(path);
      setTimeout(() => setCopiedPath(null), 2000);
    }
  };

  // Filtered roles based on search
  const filteredRoles = useMemo(() => {
    if (!searchQuery.trim()) return ROLE_DESCRIPTIONS;
    const query = searchQuery.toLowerCase().trim();

    return ROLE_DESCRIPTIONS.filter((r) => {
      const matchRole = r.role.toLowerCase().includes(query);
      const matchTitle = r.title.toLowerCase().includes(query);
      const matchTarget = r.target.toLowerCase().includes(query);
      const matchSummary = r.summary.toLowerCase().includes(query);
      const matchResp = r.responsibilities.some((x) => x.toLowerCase().includes(query));
      const matchAuth = r.authorities.some((x) => x.toLowerCase().includes(query));

      const matchMember = users.some(
        (u) =>
          u.roles?.includes(r.role) &&
          ((u.displayName || "").toLowerCase().includes(query) ||
            (u.email || "").toLowerCase().includes(query) ||
            (u.instruments || []).some((inst) => inst.toLowerCase().includes(query)) ||
            (u.sectionId && (sectionMap[u.sectionId] || "").toLowerCase().includes(query)))
      );

      return matchRole || matchTitle || matchTarget || matchSummary || matchResp || matchAuth || matchMember;
    });
  }, [searchQuery, users, sectionMap]);

  // Filtered routes
  const filteredRoutes = useMemo(() => {
    return ROUTE_DOCS.filter((route) => {
      // Category filter
      if (selectedCategory !== "All Routes" && route.category !== selectedCategory) {
        return false;
      }

      // Role filter
      if (selectedRoleFilter === "my-roles") {
        if (!mounted) return true;
        const canAccess = route.roles.some((r) => hasRole(profile, r));
        if (!canAccess) return false;
      } else if (selectedRoleFilter !== "all") {
        if (!route.roles.includes(selectedRoleFilter as Role)) {
          return false;
        }
      }

      // Search query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const matchesTitle = route.title.toLowerCase().includes(query);
        const matchesPath = route.path.toLowerCase().includes(query);
        const matchesSummary = route.summary.toLowerCase().includes(query);
        const matchesDesc = route.description.toLowerCase().includes(query);
        const matchesFeatures = route.keyFeatures.some((f) => f.toLowerCase().includes(query));
        const matchesHowTo = route.howToUse.some((h) => h.toLowerCase().includes(query));
        const matchesTips = route.proTips.some((t) => t.toLowerCase().includes(query));

        return (
          matchesTitle ||
          matchesPath ||
          matchesSummary ||
          matchesDesc ||
          matchesFeatures ||
          matchesHowTo ||
          matchesTips
        );
      }

      return true;
    });
  }, [searchQuery, selectedCategory, selectedRoleFilter, profile, mounted]);

  return (
    <div suppressHydrationWarning className="min-h-screen p-4 sm:p-6 lg:p-8 space-y-8 max-w-7xl mx-auto">
      {/* Hero Header Banner */}
      <div 
        suppressHydrationWarning
        className="border rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden transition-colors"
        style={{
          backgroundColor: "var(--ebb-surface)",
          borderColor: "var(--ebb-border)",
        }}
      >
        <div className="relative z-10 space-y-3 max-w-3xl">
          <PortalBreadcrumb className="mb-2" />
          <div 
            suppressHydrationWarning
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full border text-xs font-mono font-bold uppercase tracking-wider"
            style={{
              backgroundColor: "var(--ebb-surface-muted)",
              borderColor: "var(--ebb-border)",
              color: "var(--ebb-primary)",
            }}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Portal Help & Documentation Center</span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-black uppercase tracking-tight text-white">
            Eagleburger Portal Guide & Knowledge Base
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
            Welcome to the official manual for the Eagleburger Band platform. Discover comprehensive workflows, step-by-step guides, best practices, and access rules for every workspace route.
          </p>
        </div>

        {/* Quick Stat Chips */}
        <div className="relative z-10 pt-4 flex flex-wrap items-center gap-3 text-xs">
          <div 
            suppressHydrationWarning
            className="border px-3.5 py-1.5 rounded-xl font-mono text-slate-300 flex items-center gap-2 shadow-sm"
            style={{
              backgroundColor: "var(--ebb-surface-muted)",
              borderColor: "var(--ebb-border)",
            }}
          >
            <Sparkles className="w-3.5 h-3.5" style={{ color: "var(--ebb-primary)" }} />
            <span><strong>{ROUTE_DOCS.length}</strong> Workspaces Documented</span>
          </div>
          <div 
            suppressHydrationWarning
            className="border px-3.5 py-1.5 rounded-xl font-mono text-slate-300 flex items-center gap-2 shadow-sm"
            style={{
              backgroundColor: "var(--ebb-surface-muted)",
              borderColor: "var(--ebb-border)",
            }}
          >
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span><strong>11</strong> Defined Portal Roles</span>
          </div>
          <div 
            suppressHydrationWarning
            className="border px-3.5 py-1.5 rounded-xl font-mono text-slate-300 flex items-center gap-2 shadow-sm"
            style={{
              backgroundColor: "var(--ebb-surface-muted)",
              borderColor: "var(--ebb-border)",
            }}
          >
            <Users className="w-3.5 h-3.5 text-sky-400" />
            <span><strong>{users.length}</strong> Roster Members</span>
          </div>
        </div>
      </div>

      {/* Featured Status Matrix Guide Banner */}
      <div
        className="rounded-2xl border p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm"
        style={{
          backgroundColor: "rgba(245, 158, 11, 0.08)",
          borderColor: "rgba(245, 158, 11, 0.3)",
        }}
      >
        <div className="flex items-start gap-3">
          <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 shrink-0">
            <Workflow className="w-5 h-5" />
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider font-mono text-amber-400">
                New Documentation Guide
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-400/20 text-amber-300 border border-amber-400/40">
                Stage 50
              </span>
            </div>
            <h3 className="text-sm sm:text-base font-bold text-white">
              Status Matrix & Lifecycle Guide
            </h3>
            <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
              Explore how booking leads convert to gigs, the 4-state RSVP system (In, Probable, Tentative, Declined),
              playing strength quorum rules, and automated dispatches.
            </p>
          </div>
        </div>

        <Link
          href="/portal/status-matrix"
          className="px-4 py-2 rounded-xl text-xs font-bold border flex items-center gap-1.5 transition hover:brightness-125 shrink-0 self-stretch sm:self-auto justify-center"
          style={{
            backgroundColor: "var(--ebb-primary)",
            borderColor: "var(--ebb-primary)",
            color: "#020617",
          }}
        >
          <span>Open Status Matrix</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* Interactive Search & Filter Controls */}
      <div 
        suppressHydrationWarning
        className="border rounded-2xl p-4 sm:p-5 shadow space-y-4 transition-colors"
        style={{
          backgroundColor: "var(--ebb-surface)",
          borderColor: "var(--ebb-border)",
        }}
      >
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              suppressHydrationWarning
              placeholder="Search by route, title, role, member name, feature, instrument..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                backgroundColor: "var(--ebb-surface-muted)",
                borderColor: "var(--ebb-border)",
              }}
              className="w-full border rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none"
            />
            {searchQuery && (
              <button
                type="button"
                suppressHydrationWarning
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-xs"
              >
                Clear
              </button>
            )}
          </div>

          {/* Role Filter Selector */}
          <div className="flex items-center gap-2 shrink-0">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={selectedRoleFilter}
              suppressHydrationWarning
              onChange={(e) => setSelectedRoleFilter(e.target.value)}
              style={{
                backgroundColor: "var(--ebb-surface-muted)",
                borderColor: "var(--ebb-border)",
              }}
              className="border text-xs text-slate-200 rounded-xl px-3 py-2.5 focus:outline-none"
            >
              <option value="all">All Roles</option>
              <option value="my-roles">My Accessible Tools</option>
              <option value="member">Member</option>
              <option value="section_leader">Section Leader</option>
              <option value="gig_manager">Gig Manager</option>
              <option value="catalog_manager">Catalog Manager</option>
              <option value="membership_manager">Membership Manager</option>
              <option value="asset_manager">Asset Manager</option>
              <option value="community_manager">Community Manager</option>
              <option value="treasurer">Treasurer</option>
              <option value="web_manager">Web Manager</option>
              <option value="admin">Full Admin</option>
              <option value="guest">Guest</option>
            </select>

            <button
              type="button"
              suppressHydrationWarning
              onClick={expandAll}
              style={{
                backgroundColor: "var(--ebb-surface-muted)",
                borderColor: "var(--ebb-border)",
              }}
              className="px-3 py-2 border text-slate-300 rounded-xl text-xs font-semibold transition hover:brightness-110"
            >
              Expand All
            </button>
            <button
              type="button"
              suppressHydrationWarning
              onClick={collapseAll}
              style={{
                backgroundColor: "var(--ebb-surface-muted)",
                borderColor: "var(--ebb-border)",
              }}
              className="px-3 py-2 border text-slate-400 rounded-xl text-xs font-semibold transition hover:brightness-110"
            >
              Collapse
            </button>
          </div>
        </div>

        {/* Category Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-xs">
          {(
            [
              "All Routes",
              "Musician Essentials",
              "Gigs & Logistics",
              "Personnel & Attendance",
              "Music & Repertoire",
              "Website & Intake",
              "Finance",
              "Business & Admin",
              "Portal Roles & Members",
              "Permissions Matrix",
              "FAQs",
            ] as HelpCategory[]
          ).map((cat) => {
            const isSelected = selectedCategory === cat;
            return (
              <button
                key={cat}
                type="button"
                suppressHydrationWarning
                onClick={() => setSelectedCategory(cat)}
                style={
                  isSelected
                    ? {
                        backgroundColor: "var(--ebb-primary)",
                        color: "#020617",
                        borderColor: "var(--ebb-primary)",
                      }
                    : {
                        backgroundColor: "var(--ebb-surface-muted)",
                        borderColor: "var(--ebb-border)",
                        color: "#94a3b8",
                      }
                }
                className="px-3.5 py-1.5 rounded-xl font-bold transition shrink-0 border"
              >
                {cat}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Content Area */}
      {selectedCategory === "Portal Roles & Members" ? (
        /* Portal Roles & Member Directory View */
        <div className="space-y-6">
          {/* Header Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4" style={{ borderColor: "var(--ebb-border)" }}>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-black uppercase tracking-tight" style={{ color: "var(--ebb-text)" }}>
                  Portal Roles & Assigned Musicians
                </h2>
                <span 
                  className="px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold"
                  style={{
                    backgroundColor: "var(--ebb-surface-muted)",
                    color: "var(--ebb-primary)",
                    border: "1px solid var(--ebb-border)",
                  }}
                >
                  {filteredRoles.length} Roles
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Explore operational responsibilities, system clearances, and discover which band members hold each role.
              </p>
            </div>

            <div className="flex items-center gap-2 self-start sm:self-center shrink-0">
              {/* View Mode Switcher */}
              <div 
                className="flex items-center p-1 rounded-xl border text-xs"
                style={{
                  backgroundColor: "var(--ebb-surface-muted)",
                  borderColor: "var(--ebb-border)",
                }}
              >
                <button
                  type="button"
                  suppressHydrationWarning
                  onClick={() => setRoleViewMode("cards")}
                  style={
                    roleViewMode === "cards"
                      ? {
                          backgroundColor: "var(--ebb-primary)",
                          color: "#020617",
                        }
                      : {
                          color: "#94a3b8",
                        }
                  }
                  className="px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition"
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                  <span>Role Cards</span>
                </button>
                <button
                  type="button"
                  suppressHydrationWarning
                  onClick={() => setRoleViewMode("matrix")}
                  style={
                    roleViewMode === "matrix"
                      ? {
                          backgroundColor: "var(--ebb-primary)",
                          color: "#020617",
                        }
                      : {
                          color: "#94a3b8",
                        }
                  }
                  className="px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition"
                >
                  <TableIcon className="w-3.5 h-3.5" />
                  <span>Matrix Table</span>
                </button>
              </div>

              {roleViewMode === "cards" && (
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    suppressHydrationWarning
                    onClick={expandAllRoles}
                    style={{
                      backgroundColor: "var(--ebb-surface-muted)",
                      borderColor: "var(--ebb-border)",
                    }}
                    className="px-2.5 py-1.5 rounded-xl border text-xs text-slate-300 font-semibold hover:brightness-110 transition"
                  >
                    Expand All
                  </button>
                  <button
                    type="button"
                    suppressHydrationWarning
                    onClick={collapseAllRoles}
                    style={{
                      backgroundColor: "var(--ebb-surface-muted)",
                      borderColor: "var(--ebb-border)",
                    }}
                    className="px-2.5 py-1.5 rounded-xl border text-xs text-slate-400 font-semibold hover:brightness-110 transition"
                  >
                    Collapse
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Admin Emulation Sandbox Callout Banner */}
          {mounted && isRealAdmin && (
            <div
              suppressHydrationWarning
              className="p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs shadow-sm transition-colors"
              style={{
                backgroundColor: "rgba(139, 92, 246, 0.08)",
                borderColor: "rgba(167, 139, 250, 0.3)",
                color: "#e2e8f0",
              }}
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-purple-500/20 border border-purple-500/40 flex items-center justify-center shrink-0">
                  <Sparkles className="w-4 h-4 text-purple-300" />
                </div>
                <div>
                  <p className="font-bold text-white flex items-center gap-2">
                    <span>Role Emulation Sandbox (Administrator Clearance)</span>
                    {isEmulating && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-purple-500/30 text-purple-300 border border-purple-400/40">
                        Active: {emulatedRoles?.map((r) => `@${r}`).join(", ")}
                      </span>
                    )}
                  </p>
                  <p className="text-[11px] text-slate-300 mt-0.5">
                    Click <strong>&quot;Emulate Role&quot;</strong> on any position below to test the portal under that role&apos;s permissions, navigation routes, and capabilities without altering your database account.
                  </p>
                </div>
              </div>
              {isEmulating && (
                <button
                  type="button"
                  suppressHydrationWarning
                  onClick={clearEmulation}
                  className="px-3 py-1.5 rounded-xl border border-purple-400/50 bg-purple-500/20 text-purple-200 font-bold hover:bg-purple-500/30 transition text-xs shrink-0 self-start sm:self-center shadow-sm"
                >
                  Exit Emulation
                </button>
              )}
            </div>
          )}

          {roleViewMode === "matrix" ? (
            /* Matrix Mode */
            <div 
              className="border rounded-2xl overflow-hidden shadow"
              suppressHydrationWarning
              style={{
                backgroundColor: "var(--ebb-surface)",
                borderColor: "var(--ebb-border)",
              }}
            >
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead 
                    className="text-[10px] font-mono uppercase tracking-wider text-slate-400 border-b"
                    suppressHydrationWarning
                    style={{
                      backgroundColor: "var(--ebb-surface-muted)",
                      borderColor: "var(--ebb-border)",
                    }}
                  >
                    <tr>
                      <th className="p-3.5">Role Key</th>
                      <th className="p-3.5">Display Name</th>
                      <th className="p-3.5">Target Position</th>
                      <th className="p-3.5">Assigned Members</th>
                      <th className="p-3.5">Operational Scope</th>
                      <th className="p-3.5">Authorized Routes</th>
                      {mounted && isRealAdmin && <th className="p-3.5 text-right">Testing Action</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y" style={{ borderColor: "var(--ebb-border)" }}>
                    {RBAC_ROLES.map((r) => {
                      const assignedMembers = users.filter((u) => u.roles?.includes(r.role as Role));
                      const isCurrentEmulated = isEmulating && emulatedRoles?.length === 1 && emulatedRoles[0] === r.role;
                      return (
                        <tr 
                          key={r.role} 
                          className="hover:brightness-110 transition"
                          style={{ borderColor: "var(--ebb-border)" }}
                        >
                          <td className="p-3.5 font-mono font-bold" style={{ color: "var(--ebb-primary)" }}>{r.role}</td>
                          <td className="p-3.5 font-bold" style={{ color: "var(--ebb-text)" }}>{r.title}</td>
                          <td className="p-3.5 text-slate-400">{r.target}</td>
                          <td className="p-3.5">
                            {assignedMembers.length === 0 ? (
                              <span className="text-slate-500 italic">None assigned</span>
                            ) : (
                              <div className="flex flex-wrap gap-1">
                                {assignedMembers.map((m) => (
                                  <span 
                                    key={m.uid}
                                    className="px-2 py-0.5 rounded text-[11px] font-medium border"
                                    style={{
                                      backgroundColor: "var(--ebb-surface-muted)",
                                      borderColor: "var(--ebb-border)",
                                      color: m.uid === profile?.uid ? "var(--ebb-primary)" : "var(--ebb-text)",
                                    }}
                                  >
                                    {m.displayName}{m.uid === profile?.uid ? " (You)" : ""}
                                  </span>
                                ))}
                              </div>
                            )}
                          </td>
                          <td className="p-3.5 leading-relaxed">{r.scope}</td>
                          <td className="p-3.5 font-mono text-[11px] text-slate-400">{r.routes}</td>
                          {mounted && isRealAdmin && (
                            <td className="p-3.5 text-right">
                              <button
                                type="button"
                                suppressHydrationWarning
                                onClick={() => {
                                  if (isCurrentEmulated) {
                                    clearEmulation();
                                  } else {
                                    setEmulatedRoles([r.role as Role]);
                                  }
                                }}
                                style={{
                                  backgroundColor: isCurrentEmulated
                                    ? "rgba(139, 92, 246, 0.25)"
                                    : "var(--ebb-surface-muted)",
                                  borderColor: isCurrentEmulated
                                    ? "rgba(167, 139, 250, 0.6)"
                                    : "var(--ebb-border)",
                                  color: isCurrentEmulated ? "#c4b5fd" : "#cbd5e1",
                                }}
                                className="px-2.5 py-1 text-xs font-bold rounded-xl border transition hover:brightness-125 inline-flex items-center gap-1.5 shadow-sm"
                              >
                                <Sparkles className={`w-3 h-3 ${isCurrentEmulated ? "text-purple-300" : "text-purple-400"}`} />
                                <span>{isCurrentEmulated ? "Reset" : "Emulate"}</span>
                              </button>
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            /* Cards Mode with Assigned Members Roster */
            <div className="space-y-6">
              {filteredRoles.length === 0 ? (
                <div 
                  className="border rounded-2xl p-12 text-center space-y-3"
                  suppressHydrationWarning
                  style={{
                    backgroundColor: "var(--ebb-surface)",
                    borderColor: "var(--ebb-border)",
                  }}
                >
                  <HelpCircle className="w-8 h-8 text-slate-500 mx-auto" />
                  <div className="text-base font-bold text-white">No roles match your search filter</div>
                  <p className="text-xs text-slate-400 max-w-md mx-auto">
                    Try clearing your search query to explore all 11 defined portal roles and their assigned band members.
                  </p>
                  <button
                    type="button"
                    suppressHydrationWarning
                    onClick={() => setSearchQuery("")}
                    style={{
                      backgroundColor: "var(--ebb-primary)",
                      color: "#020617",
                    }}
                    className="font-bold px-4 py-2 rounded-xl text-xs transition shadow"
                  >
                    Clear Search
                  </button>
                </div>
              ) : (
                filteredRoles.map((r) => {
                  const isExpanded = Boolean(expandedRoles[r.role]);
                  const assignedMembers = users.filter((u) => u.roles?.includes(r.role));
                  const isCurrentEmulated = isEmulating && emulatedRoles?.length === 1 && emulatedRoles[0] === r.role;

                  return (
                    <div
                      key={r.role}
                      className="border rounded-2xl overflow-hidden shadow-xl transition"
                      suppressHydrationWarning
                      style={{
                        backgroundColor: "var(--ebb-surface)",
                        borderColor: "var(--ebb-border)",
                      }}
                    >
                      {/* Role Card Header */}
                      <div 
                        className="p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                        suppressHydrationWarning
                        style={{ backgroundColor: "var(--ebb-surface)" }}
                      >
                        <div className="flex items-start sm:items-center gap-3.5">
                          <div 
                            className="w-10 h-10 rounded-2xl border flex items-center justify-center shrink-0 mt-0.5 sm:mt-0 shadow-sm"
                            suppressHydrationWarning
                            style={{
                              backgroundColor: "var(--ebb-surface-muted)",
                              borderColor: "var(--ebb-border)",
                            }}
                          >
                            {getRoleIcon(r.role)}
                          </div>
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="text-base font-extrabold text-white">
                                {r.title}
                              </h3>
                              <span 
                                className="border font-mono text-[10px] font-bold px-2 py-0.5 rounded-full"
                                suppressHydrationWarning
                                style={{
                                  backgroundColor: "var(--ebb-surface-muted)",
                                  borderColor: "var(--ebb-border)",
                                  color: "var(--ebb-primary)",
                                }}
                              >
                                @{r.role}
                              </span>
                              <span 
                                className="border text-[10px] font-bold px-2 py-0.5 rounded-full text-slate-300"
                                suppressHydrationWarning
                                style={{
                                  backgroundColor: "var(--ebb-surface-muted)",
                                  borderColor: "var(--ebb-border)",
                                }}
                              >
                                {r.badge}
                              </span>
                            </div>
                            <p className="text-xs text-slate-400 mt-1 line-clamp-1">
                              Target Position: <strong className="text-slate-300">{r.target}</strong>
                            </p>
                          </div>
                        </div>

                        {/* Action Buttons & Member Badge */}
                        <div className="flex items-center gap-2 sm:gap-3 shrink-0 self-end sm:self-center flex-wrap">
                          {/* Admin Emulation Action */}
                          {mounted && isRealAdmin && (
                            <button
                              type="button"
                              suppressHydrationWarning
                              onClick={() => {
                                if (isCurrentEmulated) {
                                  clearEmulation();
                                } else {
                                  setEmulatedRoles([r.role as Role]);
                                }
                              }}
                              style={{
                                backgroundColor: isCurrentEmulated
                                  ? "rgba(139, 92, 246, 0.25)"
                                  : "var(--ebb-surface-muted)",
                                borderColor: isCurrentEmulated
                                  ? "rgba(167, 139, 250, 0.6)"
                                  : "var(--ebb-border)",
                                color: isCurrentEmulated ? "#c4b5fd" : "#cbd5e1",
                              }}
                              className="px-2.5 py-1.5 rounded-xl border text-xs font-bold transition flex items-center gap-1.5 hover:brightness-125 shadow-sm"
                              title={
                                isCurrentEmulated
                                  ? "Currently emulating this role (Click to exit emulation)"
                                  : `Emulate @${r.role} across the portal`
                              }
                            >
                              <Sparkles
                                className={`w-3.5 h-3.5 ${
                                  isCurrentEmulated ? "text-purple-300" : "text-purple-400"
                                }`}
                              />
                              <span>{isCurrentEmulated ? "Emulating (Exit)" : "Emulate Role"}</span>
                            </button>
                          )}

                          {/* Member Count Chip */}
                          <div 
                            className="px-3 py-1 rounded-full text-xs font-bold border flex items-center gap-1.5"
                            style={
                              assignedMembers.length > 0
                                ? {
                                    backgroundColor: "rgba(16, 185, 129, 0.1)",
                                    borderColor: "rgba(16, 185, 129, 0.3)",
                                    color: "#34d399",
                                  }
                                : {
                                    backgroundColor: "rgba(245, 158, 11, 0.1)",
                                    borderColor: "rgba(245, 158, 11, 0.3)",
                                    color: "#fbbf24",
                                  }
                            }
                          >
                            <Users className="w-3.5 h-3.5" />
                            <span>
                              {assignedMembers.length} {assignedMembers.length === 1 ? "Member" : "Members"} Assigned
                            </span>
                          </div>

                          <button
                            type="button"
                            suppressHydrationWarning
                            onClick={() => toggleRoleExpand(r.role)}
                            style={{
                              backgroundColor: "var(--ebb-surface-muted)",
                              borderColor: "var(--ebb-border)",
                            }}
                            className="p-2 rounded-xl border text-slate-300 hover:text-white transition flex items-center gap-1 text-xs font-semibold"
                          >
                            <span>{isExpanded ? "Hide Details" : "View Details & Members"}</span>
                            {isExpanded ? (
                              <ChevronUp className="w-3.5 h-3.5" />
                            ) : (
                              <ChevronDown className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      </div>

                      {/* Detailed Role Drawer */}
                      {isExpanded && (
                        <div 
                          className="p-5 sm:p-6 border-t space-y-6"
                          suppressHydrationWarning
                          style={{
                            backgroundColor: "var(--ebb-surface-muted)",
                            borderColor: "var(--ebb-border)",
                          }}
                        >
                          {/* Operational Mission & Summary */}
                          <div className="space-y-1.5">
                            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 font-mono">
                              Operational Mission & Ensemble Purpose
                            </h4>
                            <p className="text-xs sm:text-sm text-slate-200 leading-relaxed">
                              {r.summary}
                            </p>
                          </div>

                          {/* Two-Column Grid: Responsibilities vs Authorities */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Responsibilities */}
                            <div 
                              className="border rounded-2xl p-4 space-y-3 shadow-sm"
                              suppressHydrationWarning
                              style={{
                                backgroundColor: "var(--ebb-surface)",
                                borderColor: "var(--ebb-border)",
                              }}
                            >
                              <h4 className="text-xs font-bold text-white flex items-center gap-2">
                                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                                <span>Key Responsibilities & Workflows</span>
                              </h4>
                              <ul className="space-y-2 text-xs text-slate-300">
                                {r.responsibilities.map((resp, i) => (
                                  <li key={i} className="flex items-start gap-2">
                                    <span className="text-emerald-400 font-bold shrink-0 mt-0.5">•</span>
                                    <span>{resp}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>

                            {/* System Authorities */}
                            <div 
                              className="border rounded-2xl p-4 space-y-3 shadow-sm"
                              suppressHydrationWarning
                              style={{
                                backgroundColor: "var(--ebb-surface)",
                                borderColor: "var(--ebb-border)",
                              }}
                            >
                              <h4 className="text-xs font-bold text-white flex items-center gap-2">
                                <ShieldCheck className="w-4 h-4 text-sky-400" />
                                <span>System Permissions & Clearances</span>
                              </h4>
                              <ul className="space-y-2 text-xs text-slate-300">
                                {r.authorities.map((auth, i) => (
                                  <li key={i} className="flex items-start gap-2">
                                    <span className="text-sky-400 font-bold shrink-0 mt-0.5">•</span>
                                    <span>{auth}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          </div>

                          {/* Authorized Workspaces / Route Launchers */}
                          <div className="space-y-2">
                            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 font-mono">
                              Authorized Workspaces & Quick Launch
                            </h4>
                            <div className="flex flex-wrap gap-2">
                              {r.routes.map((rt, idx) => (
                                <Link
                                  key={idx}
                                  href={rt.path}
                                  suppressHydrationWarning
                                  style={{
                                    backgroundColor: "var(--ebb-surface)",
                                    borderColor: "var(--ebb-border)",
                                    color: "var(--ebb-primary)",
                                  }}
                                  className="border px-3 py-1.5 rounded-xl font-medium text-xs transition flex items-center gap-1.5 hover:brightness-110 shadow-sm"
                                >
                                  <span>{rt.title}</span>
                                  <ExternalLink className="w-3 h-3" />
                                </Link>
                              ))}
                            </div>
                          </div>

                          {/* Assigned Band Members Section */}
                          <div className="space-y-3 pt-2 border-t" style={{ borderColor: "var(--ebb-border)" }}>
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <Users className="w-4 h-4 text-slate-400" />
                                <h4 className="text-xs font-bold uppercase tracking-wider text-white font-mono">
                                  Band Members Assigned to @{r.role} ({assignedMembers.length})
                                </h4>
                              </div>
                              <span className="text-[11px] text-slate-400">
                                Live from Band Roster
                              </span>
                            </div>

                            {assignedMembers.length === 0 ? (
                              <div 
                                className="border rounded-xl p-4 text-center space-y-2"
                                suppressHydrationWarning
                                style={{
                                  backgroundColor: "var(--ebb-surface)",
                                  borderColor: "var(--ebb-border)",
                                }}
                              >
                                <p className="text-xs text-slate-400">
                                  No musicians currently hold the <strong>@{r.role}</strong> role.
                                </p>
                                <p className="text-[11px] text-slate-500">
                                  Band Directors and Membership Managers can assign roles in the Roster Administration workspace.
                                </p>
                                <Link
                                  href="/admin/roster"
                                  className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-400 hover:underline pt-1"
                                >
                                  <span>Open Roster Admin to Assign</span>
                                  <ArrowRight className="w-3 h-3" />
                                </Link>
                              </div>
                            ) : (
                              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                {assignedMembers.map((member) => {
                                  const isSelf = member.uid === profile?.uid;
                                  const sectionName = member.sectionId ? sectionMap[member.sectionId] || member.sectionId : "Band Member";
                                  const instrumentsText = member.instruments && member.instruments.length > 0 ? member.instruments.join(", ") : null;

                                  return (
                                    <div 
                                      key={member.uid}
                                      className="border rounded-xl p-3 flex items-center justify-between gap-3 shadow-sm hover:brightness-105 transition"
                                      suppressHydrationWarning
                                      style={{
                                        backgroundColor: "var(--ebb-surface)",
                                        borderColor: "var(--ebb-border)",
                                      }}
                                    >
                                      <div className="flex items-center gap-2.5 min-w-0">
                                        <div 
                                          className="w-8 h-8 rounded-full border flex items-center justify-center font-bold text-xs shrink-0"
                                          suppressHydrationWarning
                                          style={{
                                            backgroundColor: "var(--ebb-surface-muted)",
                                            borderColor: "var(--ebb-border)",
                                            color: "var(--ebb-primary)",
                                          }}
                                        >
                                          {(member.displayName || "M").charAt(0).toUpperCase()}
                                        </div>
                                        <div className="min-w-0">
                                          <div className="flex items-center gap-1.5 flex-wrap">
                                            <span className="text-xs font-bold text-white truncate">
                                              {member.displayName}
                                            </span>
                                            {isSelf && (
                                              <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-amber-400/20 text-amber-300 border border-amber-400/30">
                                                You
                                              </span>
                                            )}
                                          </div>
                                          <p className="text-[11px] text-slate-400 truncate">
                                            {sectionName}{instrumentsText ? ` • ${instrumentsText}` : ""}
                                          </p>
                                        </div>
                                      </div>

                                      {/* Contact Buttons */}
                                      {(() => {
                                        const isLeaderViewer = Boolean(
                                          profile && (
                                            profile.roles?.some((r) =>
                                              ["admin", "gig_manager", "section_leader", "membership_manager"].includes(r)
                                            )
                                          )
                                        );
                                        const isSelf = profile?.uid === member.uid;
                                        const canViewPrivate = isLeaderViewer || isSelf;

                                        const showEmail = member.email && (!member.hideEmailInRoster || canViewPrivate);
                                        const showPhone = member.phone && (!member.hidePhoneInRoster || canViewPrivate);
                                        const isEmailPrivate = Boolean(member.hideEmailInRoster);
                                        const isPhonePrivate = Boolean(member.hidePhoneInRoster);

                                        return (
                                          <div className="flex items-center gap-1 shrink-0">
                                            {showEmail ? (
                                              <a
                                                href={`mailto:${member.email}`}
                                                title={`Email ${member.displayName} (${member.email})${isEmailPrivate ? " [Private to members]" : ""}`}
                                                className={`p-1.5 rounded-lg border transition ${
                                                  isEmailPrivate
                                                    ? "text-amber-400 border-amber-500/30 hover:text-amber-300"
                                                    : "text-slate-400 hover:text-white"
                                                }`}
                                                style={{
                                                  backgroundColor: "var(--ebb-surface-muted)",
                                                  borderColor: isEmailPrivate ? "rgba(245, 158, 11, 0.3)" : "var(--ebb-border)",
                                                }}
                                              >
                                                <Mail className="w-3.5 h-3.5" />
                                              </a>
                                            ) : member.email && isEmailPrivate ? (
                                              <span
                                                title="Email is set to private by this member"
                                                className="p-1.5 rounded-lg border text-slate-600 cursor-not-allowed"
                                                style={{
                                                  backgroundColor: "var(--ebb-surface-muted)",
                                                  borderColor: "var(--ebb-border)",
                                                }}
                                              >
                                                <EyeOff className="w-3.5 h-3.5" />
                                              </span>
                                            ) : null}

                                            {showPhone ? (
                                              <a
                                                href={`tel:${member.phone}`}
                                                title={`Call ${member.displayName} (${member.phone})${isPhonePrivate ? " [Private to members]" : ""}`}
                                                className={`p-1.5 rounded-lg border transition ${
                                                  isPhonePrivate
                                                    ? "text-amber-400 border-amber-500/30 hover:text-amber-300"
                                                    : "text-slate-400 hover:text-white"
                                                }`}
                                                style={{
                                                  backgroundColor: "var(--ebb-surface-muted)",
                                                  borderColor: isPhonePrivate ? "rgba(245, 158, 11, 0.3)" : "var(--ebb-border)",
                                                }}
                                              >
                                                <Phone className="w-3.5 h-3.5" />
                                              </a>
                                            ) : member.phone && isPhonePrivate ? (
                                              <span
                                                title="Phone number is set to private by this member"
                                                className="p-1.5 rounded-lg border text-slate-600 cursor-not-allowed"
                                                style={{
                                                  backgroundColor: "var(--ebb-surface-muted)",
                                                  borderColor: "var(--ebb-border)",
                                                }}
                                              >
                                                <EyeOff className="w-3.5 h-3.5" />
                                              </span>
                                            ) : null}
                                          </div>
                                        );
                                      })()}
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>
      ) : selectedCategory === "Permissions Matrix" ? (
        /* RBAC Roles Matrix View */
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-3" style={{ borderColor: "var(--ebb-border)" }}>
            <div>
              <h2 className="text-xl font-black uppercase" style={{ color: "var(--ebb-text)" }}>Role-Based Access Control (RBAC) Matrix</h2>
              <p className="text-xs text-slate-400">
                Review the scope, responsibilities, assigned band members, and route authorizations assigned to each band role.
              </p>
            </div>
            <button
              type="button"
              suppressHydrationWarning
              onClick={() => {
                setSelectedCategory("Portal Roles & Members");
                setRoleViewMode("cards");
              }}
              style={{
                backgroundColor: "var(--ebb-surface-muted)",
                borderColor: "var(--ebb-border)",
                color: "var(--ebb-primary)",
              }}
              className="border px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 hover:brightness-110 self-start sm:self-center shrink-0"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Switch to Role Cards & Roster</span>
            </button>
          </div>

          <div 
            className="border rounded-2xl overflow-hidden shadow"
            suppressHydrationWarning
            style={{
              backgroundColor: "var(--ebb-surface)",
              borderColor: "var(--ebb-border)",
            }}
          >
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead 
                  className="text-[10px] font-mono uppercase tracking-wider text-slate-400 border-b"
                  suppressHydrationWarning
                  style={{
                    backgroundColor: "var(--ebb-surface-muted)",
                    borderColor: "var(--ebb-border)",
                  }}
                >
                  <tr>
                    <th className="p-3.5">Role Key</th>
                    <th className="p-3.5">Display Name</th>
                    <th className="p-3.5">Target Position</th>
                    <th className="p-3.5">Assigned Members</th>
                    <th className="p-3.5">Operational Scope</th>
                    <th className="p-3.5">Authorized Routes</th>
                  </tr>
                </thead>
                <tbody className="divide-y" style={{ borderColor: "var(--ebb-border)" }}>
                  {RBAC_ROLES.map((r) => {
                    const assignedMembers = users.filter((u) => u.roles?.includes(r.role as Role));
                    return (
                      <tr 
                        key={r.role} 
                        className="hover:brightness-110 transition"
                        style={{ borderColor: "var(--ebb-border)" }}
                      >
                        <td className="p-3.5 font-mono font-bold" style={{ color: "var(--ebb-primary)" }}>{r.role}</td>
                        <td className="p-3.5 font-bold" style={{ color: "var(--ebb-text)" }}>{r.title}</td>
                        <td className="p-3.5 text-slate-400">{r.target}</td>
                        <td className="p-3.5">
                          {assignedMembers.length === 0 ? (
                            <span className="text-slate-500 italic">None assigned</span>
                          ) : (
                            <div className="flex flex-wrap gap-1">
                              {assignedMembers.map((m) => (
                                <span 
                                  key={m.uid}
                                  className="px-2 py-0.5 rounded text-[11px] font-medium border"
                                  style={{
                                    backgroundColor: "var(--ebb-surface-muted)",
                                    borderColor: "var(--ebb-border)",
                                    color: m.uid === profile?.uid ? "var(--ebb-primary)" : "var(--ebb-text)",
                                  }}
                                >
                                  {m.displayName}{m.uid === profile?.uid ? " (You)" : ""}
                                </span>
                              ))}
                            </div>
                          )}
                        </td>
                        <td className="p-3.5 leading-relaxed">{r.scope}</td>
                        <td className="p-3.5 font-mono text-[11px] text-slate-400">{r.routes}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : selectedCategory === "FAQs" ? (
        /* FAQs View */
        <div className="space-y-6 max-w-4xl">
          <div className="border-b pb-3" style={{ borderColor: "var(--ebb-border)" }}>
            <h2 className="text-xl font-black uppercase" style={{ color: "var(--ebb-text)" }}>Frequently Asked Questions & Troubleshooting</h2>
            <p className="text-xs text-slate-400">
              Common questions about gig RSVPs, mobile calendar sync, sheet music, payouts, and permissions.
            </p>
          </div>

          <div className="space-y-3">
            {FAQS.map((faq, idx) => (
              <div
                key={idx}
                className="border rounded-2xl p-5 space-y-2 shadow"
                suppressHydrationWarning
                style={{
                  backgroundColor: "var(--ebb-surface)",
                  borderColor: "var(--ebb-border)",
                }}
              >
                <div className="flex items-start gap-2.5 text-sm font-bold" style={{ color: "var(--ebb-text)" }}>
                  <HelpCircle className="w-4 h-4 shrink-0 mt-0.5" style={{ color: "var(--ebb-primary)" }} />
                  <span>{faq.q}</span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed pl-6.5">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      ) : (
        /* Route Documentation Cards List */
        <div className="space-y-6">
          <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: "var(--ebb-border)" }}>
            <div>
              <h2 className="text-xl font-black uppercase" style={{ color: "var(--ebb-text)" }}>
                {selectedCategory === "All Routes" ? "Complete Workspace Directory" : selectedCategory}
              </h2>
              <p className="text-xs text-slate-400">
                Showing <strong>{filteredRoutes.length}</strong> documented workspaces
              </p>
            </div>
          </div>

          {filteredRoutes.length === 0 ? (
            <div 
              className="border rounded-2xl p-12 text-center space-y-3"
              suppressHydrationWarning
              style={{
                backgroundColor: "var(--ebb-surface)",
                borderColor: "var(--ebb-border)",
              }}
            >
              <HelpCircle className="w-8 h-8 text-slate-500 mx-auto" />
              <div className="text-base font-bold text-white">No workspaces match your filter criteria</div>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                Try clearing your search query or selecting &quot;All Roles&quot; to see all portal route documentation.
              </p>
              <button
                type="button"
                suppressHydrationWarning
                onClick={() => {
                  setSearchQuery("");
                  setSelectedRoleFilter("all");
                  setSelectedCategory("All Routes");
                }}
                style={{
                  backgroundColor: "var(--ebb-primary)",
                  color: "#020617",
                }}
                className="font-bold px-4 py-2 rounded-xl text-xs transition shadow"
              >
                Reset All Filters
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredRoutes.map((route) => {
                const isExpanded = Boolean(expandedRoutes[route.id]);
                const isCopied = copiedPath === route.path;

                return (
                  <div
                    key={route.id}
                    className="border rounded-2xl overflow-hidden shadow-xl transition"
                    suppressHydrationWarning
                    style={{
                      backgroundColor: "var(--ebb-surface)",
                      borderColor: "var(--ebb-border)",
                    }}
                  >
                    {/* Collapsible Card Header */}
                    <div 
                      className="p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
                      suppressHydrationWarning
                      style={{ backgroundColor: "var(--ebb-surface)" }}
                    >
                      <div className="flex items-start sm:items-center gap-3">
                        <div 
                          className="w-9 h-9 rounded-xl border flex items-center justify-center shrink-0 mt-0.5 sm:mt-0"
                          suppressHydrationWarning
                          style={{
                            backgroundColor: "var(--ebb-surface-muted)",
                            borderColor: "var(--ebb-border)",
                            color: "var(--ebb-primary)",
                          }}
                        >
                          {getRouteIcon(route.iconName)}
                        </div>
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="text-sm sm:text-base font-extrabold text-white">
                              {route.title}
                            </h3>
                            <span 
                              className="border font-mono text-[10px] px-2 py-0.5 rounded-full"
                              suppressHydrationWarning
                              style={{
                                backgroundColor: "var(--ebb-surface-muted)",
                                borderColor: "var(--ebb-border)",
                                color: "#94a3b8",
                              }}
                            >
                              {route.path}
                            </span>
                            <span 
                              className="border text-[10px] font-bold px-2 py-0.5 rounded-full"
                              suppressHydrationWarning
                              style={{
                                backgroundColor: "var(--ebb-surface-muted)",
                                borderColor: "var(--ebb-border)",
                                color: "var(--ebb-primary)",
                              }}
                            >
                              {route.badge}
                            </span>
                          </div>
                          <p className="text-xs text-slate-400 mt-1 line-clamp-1">
                            {route.summary}
                          </p>
                        </div>
                      </div>

                      {/* Header Action Buttons */}
                      <div className="flex items-center gap-2 shrink-0 self-end sm:self-center pt-2 sm:pt-0">
                        <button
                          type="button"
                          suppressHydrationWarning
                          title="Copy link to workspace"
                          onClick={() => handleCopyPath(route.path)}
                          style={{
                            backgroundColor: "var(--ebb-surface-muted)",
                            borderColor: "var(--ebb-border)",
                          }}
                          className="p-2 rounded-xl border text-slate-400 hover:text-white transition"
                        >
                          {isCopied ? (
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>

                        <Link
                          href={route.launchPath || (route.path.includes("[") ? "/portal/gigs" : route.path)}
                          suppressHydrationWarning
                          style={{
                            backgroundColor: "var(--ebb-primary)",
                            color: "#020617",
                          }}
                          className="px-3 py-1.5 rounded-xl font-bold text-xs transition flex items-center gap-1.5 shadow"
                        >
                          <span>Launch</span>
                          <ExternalLink className="w-3 h-3" />
                        </Link>

                        <button
                          type="button"
                          suppressHydrationWarning
                          onClick={() => toggleRouteExpand(route.id)}
                          style={{
                            backgroundColor: "var(--ebb-surface-muted)",
                            borderColor: "var(--ebb-border)",
                          }}
                          className="p-2 rounded-xl border text-slate-400 hover:text-white transition flex items-center gap-1 text-xs font-semibold"
                        >
                          <span>{isExpanded ? "Hide Guide" : "Read Guide"}</span>
                          {isExpanded ? (
                            <ChevronUp className="w-3.5 h-3.5" />
                          ) : (
                            <ChevronDown className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Detailed Expanded Drawer */}
                    {isExpanded && (
                      <div 
                        className="p-5 sm:p-6 border-t space-y-6"
                        suppressHydrationWarning
                        style={{
                          backgroundColor: "var(--ebb-surface-muted)",
                          borderColor: "var(--ebb-border)",
                        }}
                      >
                        {/* What It Is Description */}
                        <div className="space-y-1.5">
                          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 font-mono">
                            What It Is & Operational Purpose
                          </h4>
                          <p className="text-xs sm:text-sm text-slate-200 leading-relaxed">
                            {route.description}
                          </p>
                        </div>

                        {/* Authorized Roles Badges */}
                        <div className="space-y-1.5">
                          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 font-mono">
                            Authorized Access Roles
                          </h4>
                          <div className="flex flex-wrap gap-1.5">
                            {route.roles.map((r) => (
                              <span
                                key={r}
                                className="border font-mono text-[11px] px-2.5 py-1 rounded-lg"
                                suppressHydrationWarning
                                style={{
                                  backgroundColor: "var(--ebb-surface)",
                                  borderColor: "var(--ebb-border)",
                                  color: "var(--ebb-primary)",
                                }}
                              >
                                @{r}
                              </span>
                            ))}
                          </div>
                        </div>

                        {/* Two Column Section: Key Features vs How to Use */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          {/* Key Features */}
                          <div 
                            className="border rounded-2xl p-4 space-y-3 shadow-sm"
                            suppressHydrationWarning
                            style={{
                              backgroundColor: "var(--ebb-surface)",
                              borderColor: "var(--ebb-border)",
                            }}
                          >
                            <h4 className="text-xs font-bold text-white flex items-center gap-2">
                              <Sparkles className="w-4 h-4" style={{ color: "var(--ebb-primary)" }} />
                              Key Features & Capabilities
                            </h4>
                            <ul className="space-y-2 text-xs text-slate-300">
                              {route.keyFeatures.map((feat, i) => (
                                <li key={i} className="flex items-start gap-2">
                                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                                  <span>{feat}</span>
                                </li>
                              ))}
                            </ul>
                          </div>

                          {/* How to Use Step-by-Step */}
                          <div 
                            className="border rounded-2xl p-4 space-y-3 shadow-sm"
                            suppressHydrationWarning
                            style={{
                              backgroundColor: "var(--ebb-surface)",
                              borderColor: "var(--ebb-border)",
                            }}
                          >
                            <h4 className="text-xs font-bold text-white flex items-center gap-2">
                              <ArrowRight className="w-4 h-4 text-cyan-400" />
                              Step-by-Step Usage Guide
                            </h4>
                            <ol className="space-y-2 text-xs text-slate-300">
                              {route.howToUse.map((step, i) => (
                                <li key={i} className="flex items-start gap-2.5">
                                  <span 
                                    className="w-4 h-4 rounded-full font-mono text-[10px] flex items-center justify-center font-bold shrink-0 mt-0.5"
                                    suppressHydrationWarning
                                    style={{
                                      backgroundColor: "var(--ebb-surface-muted)",
                                      color: "var(--ebb-primary)",
                                      borderColor: "var(--ebb-border)",
                                    }}
                                  >
                                    {i + 1}
                                  </span>
                                  <span>{step}</span>
                                </li>
                              ))}
                            </ol>
                          </div>
                        </div>

                        {/* Pro Tips & Best Practices */}
                        <div 
                          className="border rounded-2xl p-4 space-y-2 shadow-sm"
                          suppressHydrationWarning
                          style={{
                            backgroundColor: "var(--ebb-surface-muted)",
                            borderColor: "var(--ebb-border)",
                          }}
                        >
                          <div className="text-xs font-bold flex items-center gap-2" style={{ color: "var(--ebb-primary)" }}>
                            <Lightbulb className="w-4 h-4" />
                            <span>Pro Tips & Ensemble Best Practices</span>
                          </div>
                          <ul className="space-y-1.5 text-xs text-slate-300">
                            {route.proTips.map((tip, i) => (
                              <li key={i} className="flex items-start gap-2">
                                <span className="font-bold" style={{ color: "var(--ebb-primary)" }}>•</span>
                                <span>{tip}</span>
                              </li>
                            ))}
                          </ul>
                        </div>

                        {/* Related Routes */}
                        {route.relatedRoutes && route.relatedRoutes.length > 0 && (
                          <div className="pt-2 flex flex-wrap items-center gap-2 text-xs">
                            <span className="text-slate-400 font-mono text-[10px] uppercase">Connected Tools:</span>
                            {route.relatedRoutes.map((rel, idx) => (
                              <Link
                                key={idx}
                                href={rel.path}
                                suppressHydrationWarning
                                style={{
                                  backgroundColor: "var(--ebb-surface)",
                                  borderColor: "var(--ebb-border)",
                                  color: "var(--ebb-primary)",
                                }}
                                className="border px-3 py-1 rounded-xl font-medium transition flex items-center gap-1 hover:brightness-110"
                              >
                                <span>{rel.title}</span>
                                <ArrowRight className="w-3 h-3" />
                              </Link>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
