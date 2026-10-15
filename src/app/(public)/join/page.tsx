"use client";

import React, { useState, useEffect } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { ContentPage, ContentPageSchema, DEFAULT_SYSTEM_PAGES } from "@/lib/schema/page";
import PublicPageHeader, { usePageBanner } from "@/components/public/PublicPageHeader";
import PublicSectionRenderer from "@/components/cms/PublicSectionRenderer";
import AuditionFormSection from "@/components/public/AuditionFormSection";
import { Music, Calendar, Layers, Award } from "lucide-react";

export default function JoinBandPage() {
  const [pageData, setPageData] = useState<ContentPage>(DEFAULT_SYSTEM_PAGES.join);
  const { isBannerActive } = usePageBanner(pageData?.headerImage);

  useEffect(() => {
    const unsub = onSnapshot(
      doc(db, "content_pages", "join"),
      (snap) => {
        if (snap.exists()) {
          const parsed = ContentPageSchema.safeParse(snap.data());
          if (parsed.success) {
            setPageData(parsed.data);
          }
        }
      },
      (err) => console.warn("CMS Join page notice:", err)
    );
    return () => unsub();
  }, []);

  const hasAuditionForm = pageData?.sections?.some((s) => s.type === "audition_form");
  const hasFeatures = pageData?.sections?.some((s) => s.type === "features");

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-12" suppressHydrationWarning>
      {/* Dynamic SEO Meta */}
      <title>{pageData?.seo?.metaTitle || pageData?.title || "Join the Band | Eagleburger Band"}</title>
      <meta
        name="description"
        content={pageData?.seo?.metaDescription || pageData?.description || "Audition to join the Eagleburger Band."}
      />
      {pageData?.seo?.keywords && <meta name="keywords" content={pageData.seo.keywords} />}

      {/* Hero Header */}
      {isBannerActive ? (
        <PublicPageHeader
          headerImage={pageData?.headerImage}
          fallbackTitle={pageData?.title || "Join the Eagleburger Band"}
          fallbackSubtitle={
            pageData?.description ||
            "Do you play brass or battery percussion? We are always looking for passionate, energetic musicians to blow the roof off Pittsburgh’s streets, parades, and festivals."
          }
        />
      ) : (
        <div className="text-center space-y-4 max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-yellow-400/10 border border-yellow-400/30 text-yellow-400 text-xs font-semibold uppercase tracking-wider">
            <Music className="w-3.5 h-3.5" />
            <span>Musician Recruitment</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-black text-white uppercase tracking-tight font-arvo">
            {pageData?.title || "Join the Eagleburger Band"}
          </h1>
          <p className="text-slate-400 text-sm sm:text-base leading-relaxed">
            {pageData?.description ||
              "Do you play brass or battery percussion? We are always looking for passionate, energetic musicians to blow the roof off Pittsburgh’s streets, parades, and festivals."}
          </p>
        </div>
      )}

      {/* Fallback Info Highlights if no features section configured */}
      {!hasFeatures && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-2">
            <div className="w-10 h-10 rounded-xl bg-yellow-400/10 border border-yellow-400/30 flex items-center justify-center text-yellow-400">
              <Layers className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-white uppercase tracking-wider font-arvo">100% Acoustic & Mobile</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              No cords, amps, or stages. We march through crowds, dance down streets, and perform in dynamic open-air spaces.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-2">
            <div className="w-10 h-10 rounded-xl bg-yellow-400/10 border border-yellow-400/30 flex items-center justify-center text-yellow-400">
              <Calendar className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-white uppercase tracking-wider font-arvo">Rehearsals & Gigs</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Weekly sectionals and full ensemble rehearsals in Pittsburgh. Gigs range from major holiday parades to art walks and private bashes.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-2">
            <div className="w-10 h-10 rounded-xl bg-yellow-400/10 border border-yellow-400/30 flex items-center justify-center text-yellow-400">
              <Award className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-white uppercase tracking-wider font-arvo">Welcoming Culture</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              From former college marching band vets to seasoned brass players and street drummers, we value camaraderie, groove, and heart.
            </p>
          </div>
        </div>
      )}

      {/* Render Dynamic CMS Sections */}
      {pageData?.sections && pageData.sections.length > 0 && (
        <div className="space-y-12">
          {pageData.sections.map((section) => (
            <PublicSectionRenderer key={section.id} section={section} />
          ))}
        </div>
      )}

      {/* Fallback Audition Form if not present in CMS sections */}
      {!hasAuditionForm && (
        <AuditionFormSection
          headline="Audition Application"
          subheadline="Tell us about your musical background and what section you want to rock with."
          badgeText="Musician Recruitment"
          buttonText="Submit Audition Request"
        />
      )}
    </div>
  );
}
