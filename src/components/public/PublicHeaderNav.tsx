"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { NavLink, SiteNavigationSchema, DEFAULT_HEADER_LINKS } from "@/lib/schema/siteConfig";
import { 
  Music2, 
  Shield, 
  Menu, 
  X,
  LogIn
} from "lucide-react";
import { useAuth } from "@/lib/context/AuthContext";

export default function PublicHeaderNav() {
  const pathname = usePathname();
  const { firebaseUser, profile } = useAuth();
  const [links, setLinks] = useState<NavLink[]>(
    DEFAULT_HEADER_LINKS.map((l) => ({ ...l, isExternal: false, isButton: false, openInNewTab: false }))
  );
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isRouteActive = (href: string) => {
    if (!pathname) return false;
    if (href === "/") {
      return pathname === "/";
    }
    return pathname === href || pathname.startsWith(href + "/");
  };

  useEffect(() => {
    let isMounted = true;

    getDoc(doc(db, "site_navigation", "config"))
      .then((snap) => {
        if (!isMounted) return;
        if (snap.exists()) {
          const parsed = SiteNavigationSchema.safeParse(snap.data());
          if (parsed.success) {
            const activeLinks = parsed.data.headerLinks
              .filter((l) => l.isVisible !== false)
              .sort((a, b) => a.order - b.order);
            setLinks(activeLinks);
          }
        }
      })
      .catch((err) => {
        console.warn("Public nav fetch error:", err);
      });

    return () => {
      isMounted = false;
    };
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
            <span className="text-xl font-bold tracking-tight text-white group-hover:text-yellow-400 transition-colors uppercase font-arvo">
              EAGLEBURGER BAND
            </span>
            <span className="block text-[11px] font-semibold text-yellow-400/90 tracking-wider uppercase font-arvo">
              Pittsburgh Brass &amp; Battery
            </span>
          </div>
        </Link>

        {/* Desktop Navigation Links */}
        <nav className="hidden md:flex items-center gap-1.5 lg:gap-2" suppressHydrationWarning>
          {links.map((link) => {
            const isActive = !link.isExternal && isRouteActive(link.href);

            // CTA Button link
            if (link.isButton) {
              if (link.isExternal) {
                return (
                  <a
                    key={link.id}
                    href={link.href}
                    target={link.openInNewTab ? "_blank" : undefined}
                    rel={link.openInNewTab ? "noopener noreferrer" : undefined}
                    suppressHydrationWarning
                    className="inline-flex items-center justify-center bg-yellow-400 hover:bg-yellow-300 text-slate-950 font-bold px-4 py-2 rounded-xl text-xs uppercase tracking-wider transition-all shadow-md shadow-yellow-400/20 hover:scale-105 active:scale-95 font-poppins"
                  >
                    <span>{link.label}</span>
                  </a>
                );
              }

              return (
                <Link
                  key={link.id}
                  href={link.href}
                  suppressHydrationWarning
                  className="inline-flex items-center justify-center bg-yellow-400 hover:bg-yellow-300 text-slate-950 font-bold px-4 py-2 rounded-xl text-xs uppercase tracking-wider transition-all shadow-md shadow-yellow-400/20 hover:scale-105 active:scale-95 font-poppins"
                >
                  <span>{link.label}</span>
                </Link>
              );
            }

            // Standard Text link: uppercase, small font (text-xs), Poppins font, no icon
            if (link.isExternal) {
              return (
                <a
                  key={link.id}
                  href={link.href}
                  target={link.openInNewTab ? "_blank" : undefined}
                  rel={link.openInNewTab ? "noopener noreferrer" : undefined}
                  suppressHydrationWarning
                  className="text-xs font-semibold font-poppins uppercase tracking-wider text-slate-300 hover:text-yellow-400 hover:bg-slate-900/60 px-3 py-1.5 rounded-xl transition-colors"
                >
                  <span>{link.label}</span>
                </a>
              );
            }

            return (
              <Link
                key={link.id}
                href={link.href}
                suppressHydrationWarning
                className={`text-xs font-semibold font-poppins uppercase tracking-wider transition-all px-3 py-1.5 rounded-xl ${
                  isActive
                    ? "bg-yellow-400/15 text-yellow-400 border border-yellow-400/40 font-bold shadow-sm shadow-yellow-400/10"
                    : "text-slate-300 hover:text-yellow-400 hover:bg-slate-900/60"
                }`}
              >
                <span>{link.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Action CTAs (Musician Portal / Sign In & Book Button) */}
        <div className="hidden sm:flex items-center gap-3" suppressHydrationWarning>
          {firebaseUser ? (
            <Link
              href="/portal"
              suppressHydrationWarning
              className="inline-flex items-center gap-1.5 text-xs font-semibold font-poppins uppercase tracking-wider text-yellow-400 hover:text-white px-3 py-2 rounded-xl border border-yellow-400/30 hover:border-yellow-400/60 bg-yellow-400/10 transition-colors shadow-sm"
            >
              <Shield className="w-3.5 h-3.5 text-yellow-400" />
              <span>{profile?.displayName ? `${profile.displayName.split(" ")[0]}'s Portal` : "Musician Portal"}</span>
            </Link>
          ) : (
            <Link
              href="/login"
              suppressHydrationWarning
              className="inline-flex items-center gap-1.5 text-xs font-semibold font-poppins uppercase tracking-wider text-slate-300 hover:text-white px-3 py-2 rounded-xl border border-slate-800 hover:border-slate-700 bg-slate-900/60 hover:bg-slate-800 transition-colors"
            >
              <LogIn className="w-3.5 h-3.5 text-yellow-400" />
              <span>Member Sign In</span>
            </Link>
          )}
          <Link
            href="/book"
            suppressHydrationWarning
            className="inline-flex items-center justify-center bg-yellow-400 hover:bg-yellow-300 text-slate-950 font-bold px-4 py-2 rounded-xl text-xs uppercase tracking-wider transition-all shadow-lg shadow-yellow-400/20 hover:scale-105 active:scale-95 font-poppins"
          >
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
              const isActive = !link.isExternal && isRouteActive(link.href);

              // Mobile CTA button
              if (link.isButton) {
                if (link.isExternal) {
                  return (
                    <a
                      key={link.id}
                      href={link.href}
                      target={link.openInNewTab ? "_blank" : undefined}
                      rel={link.openInNewTab ? "noopener noreferrer" : undefined}
                      onClick={() => setMobileMenuOpen(false)}
                      suppressHydrationWarning
                      className="w-full inline-flex items-center justify-center bg-yellow-400 text-slate-950 font-bold px-4 py-2.5 rounded-xl text-xs uppercase tracking-wider transition font-poppins"
                    >
                      <span>{link.label}</span>
                    </a>
                  );
                }

                return (
                  <Link
                    key={link.id}
                    href={link.href}
                    onClick={() => setMobileMenuOpen(false)}
                    suppressHydrationWarning
                    className="w-full inline-flex items-center justify-center bg-yellow-400 text-slate-950 font-bold px-4 py-2.5 rounded-xl text-xs uppercase tracking-wider transition font-poppins"
                  >
                    <span>{link.label}</span>
                  </Link>
                );
              }

              // Mobile Text link: uppercase, small font (text-xs), Poppins font, no icon
              if (link.isExternal) {
                return (
                  <a
                    key={link.id}
                    href={link.href}
                    target={link.openInNewTab ? "_blank" : undefined}
                    rel={link.openInNewTab ? "noopener noreferrer" : undefined}
                    onClick={() => setMobileMenuOpen(false)}
                    suppressHydrationWarning
                    className="flex items-center px-3.5 py-2 rounded-xl text-xs font-semibold font-poppins uppercase tracking-wider text-slate-300 hover:text-yellow-400 hover:bg-slate-900 transition"
                  >
                    <span>{link.label}</span>
                  </a>
                );
              }

              return (
                <Link
                  key={link.id}
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  suppressHydrationWarning
                  className={`flex items-center px-3.5 py-2 rounded-xl text-xs font-semibold font-poppins uppercase tracking-wider transition ${
                    isActive
                      ? "bg-yellow-400/15 text-yellow-400 border border-yellow-400/40 font-bold shadow-sm"
                      : "text-slate-300 hover:text-yellow-400 hover:bg-slate-900"
                  }`}
                >
                  <span>{link.label}</span>
                  {isActive && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-yellow-400 shadow-sm shadow-yellow-400/50" />}
                </Link>
              );
            })}
          </nav>

          <div className="pt-3 border-t border-slate-800/80 flex flex-col gap-2.5" suppressHydrationWarning>
            <Link
              href="/book"
              onClick={() => setMobileMenuOpen(false)}
              suppressHydrationWarning
              className="w-full inline-flex items-center justify-center bg-yellow-400 text-slate-950 font-bold px-4 py-2.5 rounded-xl text-xs uppercase tracking-wider transition font-poppins"
            >
              Book the Band
            </Link>
            {firebaseUser ? (
              <Link
                href="/portal"
                onClick={() => setMobileMenuOpen(false)}
                suppressHydrationWarning
                className="w-full inline-flex items-center justify-center gap-2 text-xs font-semibold font-poppins uppercase tracking-wider text-yellow-300 px-3 py-2.5 rounded-xl border border-yellow-400/30 bg-yellow-400/10"
              >
                <Shield className="w-3.5 h-3.5 text-yellow-400" />
                <span>Musician Portal Access</span>
              </Link>
            ) : (
              <Link
                href="/login"
                onClick={() => setMobileMenuOpen(false)}
                suppressHydrationWarning
                className="w-full inline-flex items-center justify-center gap-2 text-xs font-semibold font-poppins uppercase tracking-wider text-slate-300 hover:text-white px-3 py-2.5 rounded-xl border border-slate-800 bg-slate-900/50"
              >
                <LogIn className="w-3.5 h-3.5 text-yellow-400" />
                <span>Member Sign In</span>
              </Link>
            )}
          </div>
        </div>
      )}
    </header>
  );
}

