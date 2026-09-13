"use client";

import { use } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/context/AuthContext";
import { 
  Compass, 
  Calendar, 
  Users, 
  Music, 
  UserCheck, 
  Smartphone, 
  HelpCircle, 
  ShieldAlert,
  ArrowLeft,
  Search,
  FileQuestion
} from "lucide-react";

export default function PortalCatchAllNotFound({
  params,
}: {
  params: Promise<{ catchAll?: string[] }>;
}) {
  const resolvedParams = use(params);
  const attemptedPath = resolvedParams.catchAll ? `/portal/${resolvedParams.catchAll.join("/")}` : "/portal";
  const { profile, firebaseUser, authProviderId, isRealAdmin } = useAuth();

  const portalSections = [
    {
      title: "Portal Home Base",
      description: "Musician announcements, call sheets, and status overview.",
      href: "/portal",
      icon: Compass,
      accent: "text-yellow-400 group-hover:border-yellow-400/40",
    },
    {
      title: "Gig Schedule & Calls",
      description: "Upcoming performances, call times, and uniform details.",
      href: "/portal/gigs",
      icon: Calendar,
      accent: "text-emerald-400 group-hover:border-emerald-400/40",
    },
    {
      title: "Music Library & Charts",
      description: "Repertoire, sheet music PDFs, and rehearsal recordings.",
      href: "/portal/library",
      icon: Music,
      accent: "text-sky-400 group-hover:border-sky-400/40",
    },
    {
      title: "Band Roster & Directory",
      description: "Musician roster, section contacts, and instrument assignments.",
      href: "/portal/roster",
      icon: Users,
      accent: "text-purple-400 group-hover:border-purple-400/40",
    },
    {
      title: "My Section Dispatch",
      description: "Section leader notes, part distribution, and section roll call.",
      href: "/portal/section",
      icon: UserCheck,
      accent: "text-amber-400 group-hover:border-amber-400/40",
    },
    {
      title: "Musician Profile & SMS",
      description: "Manage phone number, text alert preferences, and instrument info.",
      href: "/portal/profile",
      icon: Smartphone,
      accent: "text-teal-400 group-hover:border-teal-400/40",
    },
    {
      title: "Help & Musician Handbook",
      description: "Band policies, check-in guides, and member documentation.",
      href: "/portal/help",
      icon: HelpCircle,
      accent: "text-indigo-400 group-hover:border-indigo-400/40",
    },
    ...(isRealAdmin || profile?.roles?.some(r => ["admin", "web_manager", "gig_manager", "catalog_manager", "treasurer"].includes(r))
      ? [
          {
            title: "Admin Operations Hub",
            description: "Access administrative studios, finance, CRM, and logistics.",
            href: "/admin",
            icon: ShieldAlert,
            accent: "text-rose-400 group-hover:border-rose-400/40",
          },
        ]
      : []),
  ];

  const displayName = profile?.displayName || firebaseUser?.displayName || "Musician";
  const userRoles = profile?.roles?.length ? profile.roles.join(", ") : "Band Member";
  const providerLabel = authProviderId === "google.com"
    ? "Google"
    : authProviderId === "apple.com"
    ? "Apple"
    : authProviderId === "microsoft.com"
    ? "Microsoft"
    : authProviderId === "github.com"
    ? "GitHub"
    : authProviderId === "password"
    ? "Verified Email"
    : null;

  return (
    <div className="p-6 sm:p-10 max-w-4xl mx-auto space-y-8">
      {/* Authenticated Member Header */}
      {firebaseUser && (
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-lg">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-yellow-400/10 border border-yellow-400/30 text-yellow-400 flex items-center justify-center font-black text-sm">
              {displayName.charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-white">{displayName}</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-semibold">
                  Authenticated
                </span>
                {providerLabel && (
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                    {providerLabel}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Role: <span className="text-slate-300 font-medium capitalize">{userRoles}</span>
                {profile?.sectionId && (
                  <span className="ml-2 pl-2 border-l border-slate-700">Section: <span className="text-yellow-400 font-medium capitalize">{profile.sectionId}</span></span>
                )}
              </p>
            </div>
          </div>
          <div className="text-xs text-slate-500 font-mono">
            Musician Portal Session Active
          </div>
        </div>
      )}

      {/* 404 Notification */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 text-center space-y-6 shadow-2xl">
        <div className="relative inline-block">
          <div className="w-20 h-20 rounded-2xl bg-yellow-400/10 border border-yellow-400/30 text-yellow-400 mx-auto flex items-center justify-center shadow-xl shadow-yellow-400/10">
            <FileQuestion className="w-10 h-10" />
          </div>
          <span className="absolute -bottom-2 -right-2 px-2.5 py-0.5 rounded-full bg-yellow-400 text-slate-950 font-black text-[10px] font-mono tracking-wider shadow">
            404
          </span>
        </div>

        <div className="space-y-2 max-w-lg mx-auto">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-950 border border-slate-800 text-[11px] font-mono font-bold uppercase tracking-wider text-yellow-400">
            <Compass className="w-3.5 h-3.5" />
            <span>Unrecognized Portal Route</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white uppercase tracking-tight">
            Portal Page Not Found
          </h1>
          <p className="text-sm text-slate-400 leading-relaxed">
            The portal address you requested does not exist or has been moved to a different section.
          </p>
          <div className="text-xs font-mono text-slate-400 bg-slate-950/70 rounded-xl p-3 max-w-md mx-auto truncate border border-slate-800/80">
            Path: <span className="text-amber-400">{attemptedPath}</span>
          </div>
        </div>

        {/* Quick Return Action */}
        <div className="flex items-center justify-center gap-3 pt-2">
          <Link
            href="/portal"
            className="inline-flex items-center gap-2 bg-yellow-400 hover:bg-yellow-300 text-slate-950 font-black px-6 py-2.5 rounded-xl uppercase tracking-wider text-xs transition shadow-lg shadow-yellow-400/10"
          >
            <Compass className="w-4 h-4" />
            <span>Return to Portal Home Base</span>
          </Link>
        </div>
      </div>

      {/* Starting Points Grid for Musician Portal */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-4 shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <span className="text-xs font-mono font-bold uppercase tracking-wider text-yellow-400 flex items-center gap-1.5">
            <Search className="w-3.5 h-3.5" />
            <span>Verified Portal Sections</span>
          </span>
          <span className="text-[11px] text-slate-500 font-mono">
            Jump to an active section:
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          {portalSections.map((section) => {
            const Icon = section.icon;
            return (
              <Link
                key={section.href}
                href={section.href}
                className="group p-3.5 rounded-2xl bg-slate-950/80 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 transition flex items-start gap-3 shadow-sm"
              >
                <div className={`w-9 h-9 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center shrink-0 transition ${section.accent}`}>
                  <Icon className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-white group-hover:text-yellow-400 transition flex items-center gap-1">
                    <span>{section.title}</span>
                  </div>
                  <div className="text-[11px] text-slate-400 leading-snug mt-0.5">
                    {section.description}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Link back to public site */}
      <div className="text-center pt-2">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-xs text-slate-500 hover:text-slate-300 transition"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Exit to Public Website</span>
        </Link>
      </div>
    </div>
  );
}

