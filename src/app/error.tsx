"use client";

import { useEffect } from "react";
import Link from "next/link";
import { 
  AlertTriangle, 
  RotateCcw, 
  Home, 
  Calendar, 
  Send, 
  HeartHandshake, 
  Shield, 
  ArrowLeft, 
  Compass,
  Search
} from "lucide-react";

export default function GlobalRouteError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log unexpected client-side or route boundary errors for telemetry
    console.error("[Route Error Boundary Caught]:", error);
  }, [error]);

  const startingPoints = [
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
      title: "Musician & Crew Portal",
      description: "Access call sheets, music charts, and gig dispatch.",
      href: "/portal",
      icon: Shield,
      accent: "text-amber-400 group-hover:border-amber-400/40",
    },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center px-4 py-16 selection:bg-yellow-400 selection:text-slate-950">
      <div className="max-w-2xl w-full text-center space-y-8">
        {/* Visual Badge */}
        <div className="relative inline-block">
          <div className="w-24 h-24 rounded-3xl bg-rose-500/10 border border-rose-500/30 text-rose-400 mx-auto flex items-center justify-center shadow-2xl shadow-rose-500/10 animate-pulse">
            <AlertTriangle className="w-12 h-12" />
          </div>
          {error.digest && (
            <span className="absolute -bottom-2 -right-2 px-2.5 py-0.5 rounded-full bg-rose-500 text-white font-mono text-[10px] tracking-wider shadow">
              #{error.digest.slice(0, 6)}
            </span>
          )}
        </div>

        {/* Title & Description */}
        <div className="space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900 border border-slate-800 text-[11px] font-mono font-bold uppercase tracking-wider text-rose-400">
            <Compass className="w-3.5 h-3.5" />
            <span>Unscheduled Tempo Disruption</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-white uppercase tracking-tight">
            Something Struck a Flat Note
          </h1>
          <p className="text-sm text-slate-400 max-w-md mx-auto leading-relaxed">
            The band hit an unexpected hiccup loading this route. You can attempt to retry the action or navigate back to one of our main stages below.
          </p>
          {error.message && (
            <div className="text-[11px] font-mono text-slate-500 bg-slate-900/50 rounded-lg p-2 max-w-md mx-auto truncate border border-slate-800/60">
              Error details: {error.message}
            </div>
          )}
        </div>

        {/* Primary Action Button */}
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={() => reset()}
            className="inline-flex items-center gap-2 bg-yellow-400 hover:bg-yellow-300 text-slate-950 font-black px-6 py-3 rounded-xl uppercase tracking-wider transition shadow-lg shadow-yellow-400/10 text-xs cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Try Again</span>
          </button>
        </div>

        {/* Starting Points Hub */}
        <div className="bg-slate-900/80 backdrop-blur border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-4 text-left shadow-2xl">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-yellow-400 flex items-center gap-1.5">
              <Search className="w-3.5 h-3.5" />
              <span>Band Starting Points</span>
            </span>
            <span className="text-[11px] text-slate-500 font-mono">
              Safe routes back to the music:
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            {startingPoints.map((point) => {
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

        {/* Quick Return */}
        <div className="flex items-center justify-center gap-4 text-xs">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-slate-400 hover:text-white transition"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Return to Eagleburger Band Home</span>
          </Link>
        </div>
      </div>
    </div>
  );
}

