"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { NavLink, SiteNavigationSchema, DEFAULT_HEADER_LINKS } from "@/lib/schema/siteConfig";
import { 
  Music2, 
  Calendar, 
  Send, 
  HeartHandshake, 
  Shield, 
  Menu, 
  X,
  ExternalLink,
  Users,
  Sparkles
} from "lucide-react";

const ICON_MAP: Record<string, React.ReactNode> = {
  Calendar: <Calendar className="w-4 h-4" />,
  Send: <Send className="w-4 h-4" />,
  HeartHandshake: <HeartHandshake className="w-4 h-4 text-rose-400" />,
  Music2: <Music2 className="w-4 h-4" />,
  Shield: <Shield className="w-4 h-4 text-yellow-400" />,
  Users: <Users className="w-4 h-4" />,
  Sparkles: <Sparkles className="w-4 h-4" />,
};

export default function PublicHeaderNav() {
  const [links, setLinks] = useState<NavLink[]>(
    DEFAULT_HEADER_LINKS.map((l) => ({ ...l, isExternal: false, isButton: false, openInNewTab: false }))
  );
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const unsub = onSnapshot(
      doc(db, "site_navigation", "config"),
      (snap) => {
        if (snap.exists()) {
          const parsed = SiteNavigationSchema.safeParse(snap.data());
          if (parsed.success) {
            const activeLinks = parsed.data.headerLinks
              .filter((l) => l.isVisible !== false)
              .sort((a, b) => a.order - b.order);
            setLinks(activeLinks);
          }
        }
      },
      (err) => {
        console.warn("Public nav listener error:", err);
      }
    );

    return () => unsub();
  }, []);

  return (
    <header 
      className="sticky top-0 z-40 bg-slate-950/90 backdrop-blur-md border-b border-slate-800"
      suppressHydrationWarning
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
        {/* Logo / Brand */}
        <Link href="/" className="flex items-center gap-3 group" suppressHydrationWarning>
          <div className="w-11 h-11 rounded-xl bg-yellow-400 flex items-center justify-center text-slate-950 font-black shadow-lg shadow-yellow-400/20 group-hover:scale-105 transition-transform">
            <Music2 className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xl font-black tracking-tight text-white group-hover:text-yellow-400 transition-colors uppercase">
              Eagleburger Band
            </span>
            <span className="block text-[11px] font-semibold text-yellow-400/90 tracking-wider uppercase">
              Pittsburgh Brass & Battery
            </span>
          </div>
        </Link>

        {/* Desktop Navigation Links */}
        <nav className="hidden md:flex items-center gap-8" suppressHydrationWarning>
          {links.map((link) => {
            const iconElement = link.icon ? ICON_MAP[link.icon] : null;

            if (link.isExternal) {
              return (
                <a
                  key={link.id}
                  href={link.href}
                  target={link.openInNewTab ? "_blank" : undefined}
                  rel={link.openInNewTab ? "noopener noreferrer" : undefined}
                  suppressHydrationWarning
                  className="text-sm font-semibold text-slate-300 hover:text-yellow-400 transition-colors flex items-center gap-1.5"
                >
                  {iconElement}
                  <span>{link.label}</span>
                  <ExternalLink className="w-3 h-3 text-slate-500" />
                </a>
              );
            }

            return (
              <Link
                key={link.id}
                href={link.href}
                suppressHydrationWarning
                className="text-sm font-semibold text-slate-300 hover:text-yellow-400 transition-colors flex items-center gap-1.5"
              >
                {iconElement}
                <span>{link.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Action CTAs (Musician Portal & Book Button) */}
        <div className="hidden sm:flex items-center gap-4" suppressHydrationWarning>
          <Link
            href="/portal"
            suppressHydrationWarning
            className="inline-flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white px-3 py-2 rounded-lg border border-slate-800 hover:border-slate-700 bg-slate-900/50 transition-colors"
          >
            <Shield className="w-3.5 h-3.5 text-yellow-400" />
            Musician Portal
          </Link>
          <Link
            href="/book"
            suppressHydrationWarning
            className="inline-flex items-center gap-2 bg-yellow-400 hover:bg-yellow-300 text-slate-950 font-black px-5 py-2.5 rounded-xl text-xs uppercase tracking-wider transition-all shadow-lg shadow-yellow-400/20 hover:scale-105 active:scale-95"
          >
            <Send className="w-3.5 h-3.5" />
            Book the Band
          </Link>
        </div>

        {/* Mobile Menu Toggle */}
        <button
          type="button"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="md:hidden p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-900 transition"
          aria-label="Toggle navigation menu"
        >
          {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-slate-950/95 border-b border-slate-800 px-4 pt-2 pb-6 space-y-4 animate-in slide-in-from-top-2 duration-150" suppressHydrationWarning>
          <nav className="flex flex-col space-y-2" suppressHydrationWarning>
            {links.map((link) => {
              const iconElement = link.icon ? ICON_MAP[link.icon] : null;

              if (link.isExternal) {
                return (
                  <a
                    key={link.id}
                    href={link.href}
                    target={link.openInNewTab ? "_blank" : undefined}
                    rel={link.openInNewTab ? "noopener noreferrer" : undefined}
                    onClick={() => setMobileMenuOpen(false)}
                    suppressHydrationWarning
                    className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-semibold text-slate-300 hover:text-yellow-400 hover:bg-slate-900 transition"
                  >
                    {iconElement}
                    <span>{link.label}</span>
                    <ExternalLink className="w-3 h-3 text-slate-500 ml-auto" />
                  </a>
                );
              }

              return (
                <Link
                  key={link.id}
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  suppressHydrationWarning
                  className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-semibold text-slate-300 hover:text-yellow-400 hover:bg-slate-900 transition"
                >
                  {iconElement}
                  <span>{link.label}</span>
                </Link>
              );
            })}
          </nav>

          <div className="pt-3 border-t border-slate-800/80 flex flex-col gap-2.5" suppressHydrationWarning>
            <Link
              href="/book"
              onClick={() => setMobileMenuOpen(false)}
              suppressHydrationWarning
              className="w-full inline-flex items-center justify-center gap-2 bg-yellow-400 text-slate-950 font-black px-4 py-3 rounded-xl text-xs uppercase tracking-wider transition"
            >
              <Send className="w-3.5 h-3.5" />
              Book the Band
            </Link>
            <Link
              href="/portal"
              onClick={() => setMobileMenuOpen(false)}
              suppressHydrationWarning
              className="w-full inline-flex items-center justify-center gap-2 text-xs font-semibold text-slate-400 hover:text-white px-3 py-2.5 rounded-xl border border-slate-800 bg-slate-900/50"
            >
              <Shield className="w-3.5 h-3.5 text-yellow-400" />
              Musician Portal Access
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}

