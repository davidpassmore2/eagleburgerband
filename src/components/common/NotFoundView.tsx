"use client";

import { useSyncExternalStore } from "react";
import Link from "next/link";
import { AuthProvider, useAuth } from "@/lib/context/AuthContext";
import { 
  Music2, 
  Home, 
  Calendar, 
  Send, 
  HeartHandshake, 
  Shield, 
  ArrowLeft, 
  Compass,
  Search,
  Users,
  Music,
  UserCheck,
  Smartphone,
  LogIn
} from "lucide-react";

const emptySubscribe = () => () => {};
function useMounted() {
  return useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );
}

function NotFoundContent() {
  const mounted = useMounted();
  const { profile, firebaseUser } = useAuth();

  const publicStartingPoints = [
    {
      title: "Main Stage / Home",
      description: "Return to the official Eagleburger Band homepage.",
      href: "/",
      icon: Home,
      accent: "text-yellow-400 group-hover:border-yellow-400/40",
    },
    {
      title: "Performance Schedule",
      description: "Catch upcoming street shows, parades, and festivals.",
      href: "/gigs",
      icon: Calendar,
      accent: "text-emerald-400 group-hover:border-emerald-400/40",
    },
    {
      title: "Book the Band",
      description: "Inquire for festivals, weddings, block parties, and celebrations.",
      href: "/book",
      icon: Send,
      accent: "text-sky-400 group-hover:border-sky-400/40",
    },
    {
      title: "Community Giving",
      description: "Support brass music education and instrument repair funds.",
      href: "/giving",
      icon: HeartHandshake,
      accent: "text-rose-400 group-hover:border-rose-400/40",
    },
    {
      title: "Musician Portal",
      description: "Access call sheets, music charts, and gig dispatch.",
      href: "/portal",
      icon: Shield,
      accent: "text-amber-400 group-hover:border-amber-400/40",
    },
  ];

  const portalStartingPoints = [
    {
      title: "Portal Home Base",
      description: "Band dashboard, gig announcements, and upcoming calls.",
      href: "/portal",
      icon: Compass,
      accent: "text-yellow-400 group-hover:border-yellow-400/40",
    },
    {
      title: "Gig Schedule & Call Times",
      description: "Lineups, itineraries, locations, and uniform requirements.",
      href: "/portal/gigs",
      icon: Calendar,
      accent: "text-emerald-400 group-hover:border-emerald-400/40",
    },
    {
      title: "Music Library & Charts",
      description: "Sheet music PDFs, audio references, and part downloads.",
      href: "/portal/library",
      icon: Music,
      accent: "text-sky-400 group-hover:border-sky-400/40",
    },
    {
      title: "Musician Roster & Contacts",
      description: "Full band roster, section contacts, and instrumentation.",
      href: "/portal/roster",
      icon: Users,
      accent: "text-purple-400 group-hover:border-purple-400/40",
    },
    {
      title: "My Section Dispatch",
      description: "Section leader notes, part distribution, and roll calls.",
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
  ];

  const isAuthenticated = mounted && !!firebaseUser;
  const displayName = profile?.displayName || firebaseUser?.displayName || "Musician";
  const userRoles = profile?.roles?.length ? profile.roles.join(", ") : "Member";

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center px-4 py-16 selection:bg-yellow-400 selection:text-slate-950">
      <div className="max-w-2xl w-full text-center space-y-8">
        {/* Visual Badge */}
        <div className="relative inline-block">
          <div className="w-24 h-24 rounded-3xl bg-yellow-400/10 border border-yellow-400/30 text-yellow-400 mx-auto flex items-center justify-center shadow-2xl shadow-yellow-400/10 animate-pulse">
            <Music2 className="w-12 h-12" />
          </div>
          <span className="absolute -bottom-2 -right-2 px-2.5 py-0.5 rounded-full bg-yellow-400 text-slate-950 font-black text-xs font-mono tracking-wider shadow">
            404
          </span>
        </div>

        {/* Title & Description */}
        <div className="space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900 border border-slate-800 text-[11px] font-mono font-bold uppercase tracking-wider text-slate-400">
            <Compass className="w-3.5 h-3.5 text-yellow-400" />
            <span>Off-Beat Route or Sour Note</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-white uppercase tracking-tight">
            Page Took an Unexpected Rest
          </h1>
          <p className="text-sm text-slate-400 max-w-md mx-auto leading-relaxed">
            The link you followed appears to be malformed, mistyped, or moved to another section of the bandstand.
          </p>
        </div>

        {/* Authenticated Member Session Banner */}
        {isAuthenticated && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-left shadow-lg">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-yellow-400/20 text-yellow-400 flex items-center justify-center font-bold text-xs">
                {displayName.charAt(0).toUpperCase()}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-white">{displayName}</span>
                  <span className="text-[10px] font-mono px-2 py-0.2 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                    Logged In
                  </span>
                </div>
                <div className="text-[11px] text-slate-400">
                  Role: <span className="text-slate-300 font-medium capitalize">{userRoles}</span>
                </div>
              </div>
            </div>
            <Link
              href="/portal"
              className="inline-flex items-center gap-1.5 bg-yellow-400 hover:bg-yellow-300 text-slate-950 font-bold px-3 py-1.5 rounded-lg text-xs uppercase tracking-wider transition shadow shrink-0"
            >
              <Compass className="w-3.5 h-3.5" />
              <span>Go to Portal</span>
            </Link>
          </div>
        )}

        {/* Starting Points Hub: Show Portal Sections if Authenticated, else Public */}
        <div className="bg-slate-900/80 backdrop-blur border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-4 text-left shadow-2xl">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-yellow-400 flex items-center gap-1.5">
              <Search className="w-3.5 h-3.5" />
              <span>{isAuthenticated ? "Musician Portal Starting Points" : "Recommended Starting Points"}</span>
            </span>
            <span className="text-[11px] text-slate-500 font-mono">
              Choose your destination:
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            {(isAuthenticated ? portalStartingPoints : publicStartingPoints).map((point) => {
              const Icon = point.icon;
              return (
                <Link
                  key={point.href}
                  href={point.href}
                  className="group p-3.5 rounded-2xl bg-slate-950/80 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 transition flex items-start gap-3 shadow-sm"
                >
                  <div className={`w-9 h-9 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center shrink-0 transition ${point.accent}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white group-hover:text-yellow-400 transition flex items-center gap-1">
                      <span>{point.title}</span>
                    </div>
                    <div className="text-[11px] text-slate-400 leading-snug mt-0.5">
                      {point.description}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>

        {/* Quick Return Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 text-xs">
          {isAuthenticated ? (
            <>
              <Link
                href="/portal"
                className="inline-flex items-center gap-2 bg-yellow-400 hover:bg-yellow-300 text-slate-950 font-black px-6 py-3 rounded-xl uppercase tracking-wider transition shadow-lg shadow-yellow-400/10"
              >
                <Compass className="w-4 h-4" />
                <span>Return to Portal Home Base</span>
              </Link>
              <Link
                href="/"
                className="inline-flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-white font-bold px-5 py-3 rounded-xl uppercase tracking-wider transition border border-slate-700"
              >
                <Home className="w-4 h-4 text-yellow-400" />
                <span>Band Homepage</span>
              </Link>
            </>
          ) : (
            <>
              <Link
                href="/"
                className="inline-flex items-center gap-2 bg-yellow-400 hover:bg-yellow-300 text-slate-950 font-black px-6 py-3 rounded-xl uppercase tracking-wider transition shadow-lg shadow-yellow-400/10"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back to Band Homepage</span>
              </Link>
              <Link
                href="/login"
                className="inline-flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-white font-bold px-5 py-3 rounded-xl uppercase tracking-wider transition border border-slate-700"
              >
                <LogIn className="w-4 h-4 text-yellow-400" />
                <span>Musician Sign In</span>
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function NotFoundView() {
  return (
    <AuthProvider>
      <NotFoundContent />
    </AuthProvider>
  );
}

