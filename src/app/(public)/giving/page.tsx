"use client";

import React, { useEffect, useState } from "react";
import { onSnapshot, doc } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { ContentPage, ContentPageSchema, DEFAULT_SYSTEM_PAGES, ContentSection } from "@/lib/schema/page";
import PublicPageHeader, { usePageBanner } from "@/components/public/PublicPageHeader";
import PublicSectionRenderer from "@/components/cms/PublicSectionRenderer";
import { HeartHandshake } from "lucide-react";

const DEFAULT_PUBLIC_GIFTS_SECTION: ContentSection = {
  id: "sec_giving_public_gifts",
  type: "public_gifts",
  order: 1,
  isVisible: true,
  background: "default",
  padding: "standard",
  publicGifts: {
    title: "Band Gifts & Community Philanthropy",
    subtitle: "A portion of performance proceeds is awarded as Band Gifts to grassroots organizations across Western Pennsylvania.",
    badgeText: "Band Gifts in Action",
    showCategoryFilter: true,
    showSearch: true,
    showAmountsIfAllowed: true,
    maxItems: 24,
    ctaText: "Book Band for a Benefit",
    ctaHref: "/book",
  },
};

export default function PublicGivingPage() {
  const [pageData, setPageData] = useState<ContentPage>(DEFAULT_SYSTEM_PAGES.giving);
  const { isBannerActive } = usePageBanner(pageData?.headerImage);

  useEffect(() => {
    const unsub = onSnapshot(
      doc(db, "content_pages", "giving"),
      (snap) => {
        if (snap.exists()) {
          const parsed = ContentPageSchema.safeParse(snap.data());
          if (parsed.success) {
            setPageData(parsed.data);
          }
        }
      },
      (err) => console.warn("CMS Giving page notice:", err)
    );
    return () => unsub();
  }, []);

  const seo = pageData?.seo;
  const seoTitle = seo?.metaTitle?.trim() || `${pageData?.title || "Community Giving"} | Eagleburger Band`;
  const seoDesc = seo?.metaDescription?.trim() || pageData?.description || "Explore grassroots organizations and community causes supported by the Eagleburger Band through our Band Gifts program.";

  const hasPublicGiftsSection = pageData?.sections?.some((s) => s.type === "public_gifts");

  return (
    <div className="pb-20" suppressHydrationWarning>
      {/* Dynamic SEO Meta */}
      <title>{seoTitle}</title>
      <meta name="description" content={seoDesc} />
      {seo?.keywords && <meta name="keywords" content={seo.keywords} />}

      {/* Hero Header Image Banner from CMS Studio */}
      <PublicPageHeader
        headerImage={pageData?.headerImage}
        fallbackTitle={pageData?.title || "Music on the Streets, Support in the Community"}
        fallbackSubtitle={
          pageData?.description ||
          "A portion of our performance proceeds is donated to grassroots organizations making Pittsburgh a healthier, more vibrant, and more musical place for everyone."
        }
      />

      {/* Header (rendered if no header image banner is active) */}
      {!isBannerActive && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
          <div className="text-center space-y-4 max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-yellow-400/10 border border-yellow-400/30 text-yellow-400 text-xs font-bold uppercase tracking-wider">
              <HeartHandshake className="w-4 h-4" />
              <span>Philanthropy &amp; Regional Support</span>
            </div>
            <h1 className="text-3xl sm:text-5xl font-black text-white uppercase tracking-tight font-arvo">
              {pageData?.title || "Community Giving & Impact"}
            </h1>
            <p className="text-slate-400 text-sm sm:text-base leading-relaxed">
              {pageData?.description ||
                "A portion of our performance proceeds is donated to grassroots organizations making Pittsburgh a healthier, more vibrant, and more musical place for everyone."}
            </p>
          </div>
        </section>
      )}

      {/* Main CMS Dynamic Sections */}
      <div className={`max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12 ${isBannerActive ? "pt-8 sm:pt-12" : "pt-10"}`}>
        {/* If the CMS page configured sections, render them */}
        {pageData?.sections && pageData.sections.length > 0 ? (
          <div className="space-y-12">
            {pageData.sections.map((section) => (
              <PublicSectionRenderer key={section.id} section={section} />
            ))}

            {/* If an existing CMS record lacks the public_gifts section, render the newly-made section component */}
            {!hasPublicGiftsSection && (
              <PublicSectionRenderer section={DEFAULT_PUBLIC_GIFTS_SECTION} />
            )}
          </div>
        ) : (
          /* Fallback when no CMS sections configured at all */
          <div className="space-y-12">
            <PublicSectionRenderer section={DEFAULT_PUBLIC_GIFTS_SECTION} />
          </div>
        )}
      </div>
    </div>
  );
}
