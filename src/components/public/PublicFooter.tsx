"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { 
  NavLink, 
  SocialLink, 
  SiteNavigationSchema, 
  DEFAULT_FOOTER_LINKS, 
  DEFAULT_SOCIAL_LINKS 
} from "@/lib/schema/siteConfig";
import { Music2, ExternalLink } from "lucide-react";
import { SocialIcon, getSocialBrandColors } from "@/components/ui/SocialIcon";

export default function PublicFooter() {
  const [links, setLinks] = useState<NavLink[]>(
    DEFAULT_FOOTER_LINKS.map((l) => ({ ...l, isExternal: false, isButton: false, openInNewTab: false }))
  );
  const [socialLinks, setSocialLinks] = useState<SocialLink[]>(
    DEFAULT_SOCIAL_LINKS.filter((s) => s.isVisible !== false)
  );

  useEffect(() => {
    const unsub = onSnapshot(
      doc(db, "site_navigation", "config"),
      (snap) => {
        if (snap.exists()) {
          const parsed = SiteNavigationSchema.safeParse(snap.data());
          if (parsed.success) {
            if (parsed.data.footerLinks?.length > 0) {
              const activeLinks = parsed.data.footerLinks
                .filter((l) => l.isVisible !== false)
                .sort((a, b) => a.order - b.order);
              setLinks(activeLinks);
            }
            if (parsed.data.socialLinks?.length > 0) {
              const activeSocial = parsed.data.socialLinks
                .filter((s) => s.isVisible !== false)
                .sort((a, b) => a.order - b.order);
              setSocialLinks(activeSocial);
            }
          }
        }
      },
      (err) => {
        console.warn("Public footer nav listener error:", err);
      }
    );

    return () => unsub();
  }, []);

  return (
    <footer 
      className="border-t border-slate-800 bg-slate-950 text-slate-400 py-12 px-4 sm:px-6 lg:px-8"
      suppressHydrationWarning
    >
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-8 mb-12">
        {/* Col 1: Band Bio & Social Media Channels */}
        <div className="space-y-4 md:col-span-2">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-yellow-400 flex items-center justify-center text-slate-950 font-black">
              <Music2 className="w-5 h-5" />
            </div>
            <span className="text-lg font-black text-white uppercase tracking-wider">
              Eagleburger Band
            </span>
          </div>
          <p className="text-xs text-slate-400 max-w-md leading-relaxed">
            Pittsburgh&apos;s mobile acoustic street brass and drumline powerhouse. Bringing thunderous horns and unstoppable drum grooves to parades, festivals, and celebrations across Western Pennsylvania.
          </p>

          {/* Social Media Links with Brand Font Icons */}
          {socialLinks.length > 0 && (
            <div className="pt-2 space-y-2">
              <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400 block font-semibold">
                Follow & Stream
              </span>
              <div className="flex flex-wrap items-center gap-2.5" suppressHydrationWarning>
                {socialLinks.map((social) => {
                  const colors = getSocialBrandColors(social.platform);
                  return (
                    <a
                      key={social.id}
                      href={social.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      title={social.label}
                      aria-label={social.label}
                      suppressHydrationWarning
                      className={`w-9 h-9 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-400 ${colors.hoverBorder} ${colors.hoverBg} ${colors.hoverText} transition shadow-sm group`}
                    >
                      <SocialIcon platform={social.platform} className="w-4 h-4 transition-transform group-hover:scale-110" />
                    </a>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Col 2: Dynamic Navigation */}
        <div>
          <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-3">Explore</h4>
          <ul className="space-y-2 text-xs" suppressHydrationWarning>
            {links.map((link) => (
              <li key={link.id}>
                {link.isExternal ? (
                  <a
                    href={link.href}
                    target={link.openInNewTab ? "_blank" : undefined}
                    rel={link.openInNewTab ? "noopener noreferrer" : undefined}
                    suppressHydrationWarning
                    className="hover:text-yellow-400 transition-colors inline-flex items-center gap-1"
                  >
                    <span>{link.label}</span>
                    <ExternalLink className="w-2.5 h-2.5 text-slate-500" />
                  </a>
                ) : (
                  <Link 
                    href={link.href} 
                    suppressHydrationWarning 
                    className="hover:text-yellow-400 transition-colors"
                  >
                    {link.label}
                  </Link>
                )}
              </li>
            ))}
          </ul>
        </div>

        {/* Col 3: Community & Booking Callout */}
        <div>
          <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-3">Booking Inquiries</h4>
          <p className="text-xs text-slate-400 leading-relaxed mb-3">
            Planning a festival, parade, block party, or special event? Inquire with our gig coordination team.
          </p>
          <Link
            href="/book"
            suppressHydrationWarning
            className="inline-block bg-slate-900 hover:bg-slate-800 border border-slate-700 text-yellow-400 font-bold px-4 py-2 rounded-lg text-xs transition"
          >
            Submit Inquiry &rarr;
          </Link>
        </div>
      </div>

      <div className="max-w-7xl mx-auto border-t border-slate-900 pt-6 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-4" suppressHydrationWarning>
        <p>&copy; {new Date().getFullYear()} Eagleburger Band. Pittsburgh, PA. All rights reserved.</p>
        <div className="flex items-center gap-4">
          <span>Acoustic &bull; Mobile &bull; Electric</span>
          <Link 
            href="/portal" 
            suppressHydrationWarning 
            className="text-slate-600 hover:text-slate-400"
          >
            Portal
          </Link>
        </div>
      </div>
    </footer>
  );
}

