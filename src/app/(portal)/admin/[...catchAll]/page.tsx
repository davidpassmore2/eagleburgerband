"use client";

import { use } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/context/AuthContext";
import { 
  ShieldAlert, 
  FileQuestion, 
  ArrowLeft, 
  Calendar, 
  Users, 
  Music, 
  DollarSign, 
  Compass,
  Search
} from "lucide-react";

export default function AdminCatchAllNotFound({
  params,
}: {
  params: Promise<{ catchAll?: string[] }>;
}) {
  const resolvedParams = use(params);
  const attemptedPath = resolvedParams.catchAll ? `/admin/${resolvedParams.catchAll.join("/")}` : "/admin";
  const { profile, firebaseUser } = useAuth();

  const adminCategories = [
    {
      title: "Performances & Logistics",
      description: "Gigs, call sheets, dispatch map, check-in, set lists, and inventory.",
      href: "/admin/gigs",
      icon: Calendar,
      accent: "text-emerald-400 group-hover:border-emerald-400/40",
    },
    {
      title: "Personnel & Attendance",
      description: "Musician roster, section management, attendance tracking, and CRM.",
      href: "/admin/roster",
      icon: Users,
      accent: "text-purple-400 group-hover:border-purple-400/40",
    },
    {
      title: "Music & Repertoire",
      description: "Tune catalog, charts, recordings, arrangements, and suggestions.",
      href: "/admin/catalog",
      icon: Music,
      accent: "text-sky-400 group-hover:border-sky-400/40",
    },
    {
      title: "Business & Administration",
      description: "Financial ledger, donations, booking inquiries, and user roles.",
      href: "/admin/finance",
      icon: DollarSign,
      accent: "text-amber-400 group-hover:border-amber-400/40",
    },
  ];

  const displayName = profile?.displayName || firebaseUser?.displayName || "Administrator";
  const userRoles = profile?.roles?.length ? profile.roles.join(", ") : "Admin";

  return (
    <div className="p-6 sm:p-10 max-w-4xl mx-auto space-y-8">
      {/* Admin Session Header */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 flex items-center justify-center font-black text-sm">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-white">{displayName}</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20 font-semibold">
                Admin Clearance
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Active Roles: <span className="text-slate-300 font-medium capitalize">{userRoles}</span>
            </p>
          </div>
        </div>
        <div className="text-xs text-slate-500 font-mono">
          Administrative Suite
        </div>
      </div>

      {/* 404 Notice */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 text-center space-y-6 shadow-2xl">
        <div className="relative inline-block">
          <div className="w-20 h-20 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-400 mx-auto flex items-center justify-center shadow-xl shadow-rose-500/10">
            <FileQuestion className="w-10 h-10" />
          </div>
          <span className="absolute -bottom-2 -right-2 px-2.5 py-0.5 rounded-full bg-rose-500 text-white font-black text-[10px] font-mono tracking-wider shadow">
            404
          </span>
        </div>

        <div className="space-y-2 max-w-lg mx-auto">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-950 border border-slate-800 text-[11px] font-mono font-bold uppercase tracking-wider text-rose-400">
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>Admin Studio Route Not Found</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white uppercase tracking-tight">
            Administrative Tool Unmapped
          </h1>
          <p className="text-sm text-slate-400 leading-relaxed">
            The administrative studio or path you requested does not exist or has been reorganized.
          </p>
          <div className="text-xs font-mono text-slate-400 bg-slate-950/70 rounded-xl p-3 max-w-md mx-auto truncate border border-slate-800/80">
            Path: <span className="text-rose-400">{attemptedPath}</span>
          </div>
        </div>

        {/* Quick Return Action */}
        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          <Link
            href="/admin"
            className="inline-flex items-center gap-2 bg-yellow-400 hover:bg-yellow-300 text-slate-950 font-black px-6 py-2.5 rounded-xl uppercase tracking-wider text-xs transition shadow-lg shadow-yellow-400/10"
          >
            <ShieldAlert className="w-4 h-4" />
            <span>Admin Operations Hub</span>
          </Link>
          <Link
            href="/portal"
            className="inline-flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-white font-bold px-5 py-2.5 rounded-xl text-xs uppercase tracking-wider transition border border-slate-700"
          >
            <Compass className="w-4 h-4 text-yellow-400" />
            <span>Musician Portal Home</span>
          </Link>
        </div>
      </div>

      {/* Admin Studio Directory */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-4 shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <span className="text-xs font-mono font-bold uppercase tracking-wider text-yellow-400 flex items-center gap-1.5">
            <Search className="w-3.5 h-3.5" />
            <span>Authorized Management Domains</span>
          </span>
          <span className="text-[11px] text-slate-500 font-mono">
            Jump to studio cluster:
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          {adminCategories.map((cat) => {
            const Icon = cat.icon;
            return (
              <Link
                key={cat.href}
                href={cat.href}
                className="group p-3.5 rounded-2xl bg-slate-950/80 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 transition flex items-start gap-3 shadow-sm"
              >
                <div className={`w-9 h-9 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center shrink-0 transition ${cat.accent}`}>
                  <Icon className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-white group-hover:text-yellow-400 transition flex items-center gap-1">
                    <span>{cat.title}</span>
                  </div>
                  <div className="text-[11px] text-slate-400 leading-snug mt-0.5">
                    {cat.description}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Back to Public site */}
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

