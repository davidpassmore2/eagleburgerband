"use client";

import React, { useEffect, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { ContentPage, ContentPageSchema, DEFAULT_SYSTEM_PAGES } from "@/lib/schema/page";
import PublicSectionRenderer from "@/components/cms/PublicSectionRenderer";
import PublicPageHeader from "@/components/public/PublicPageHeader";

export default function PublicHomePage() {
  const [pageData, setPageData] = useState<ContentPage>(DEFAULT_SYSTEM_PAGES.home);

  useEffect(() => {
    const unsub = onSnapshot(
      doc(db, "content_pages", "home"),
      (snap) => {
        if (snap.exists()) {
          const parsed = ContentPageSchema.safeParse(snap.data());
          if (parsed.success) {
            setPageData(parsed.data);
          }
        }
      },
      (err) => {
        console.warn("CMS Home Page load notice:", err);
      }
    );

    return () => unsub();
  }, []);

  const sectionsToRender =
    pageData?.sections && pageData.sections.length > 0
      ? [...pageData.sections].sort((a, b) => a.order - b.order)
      : DEFAULT_SYSTEM_PAGES.home.sections;

  const seo = pageData?.seo;
  const seoTitle = seo?.metaTitle?.trim() || "Eagleburger Band | Pittsburgh High-Energy Street Brass";
  const seoDesc = seo?.metaDescription?.trim() || pageData?.description || "The Eagleburger Band brings high-energy acoustic street brass and drum powerhouse excitement to parades, festivals, and celebrations across Western PA.";
  const keywords = seo?.keywords?.trim() || "brass band, pittsburgh street music, mobile brass, parade band, live music pittsburgh";
  const canonicalUrl = seo?.canonicalUrl?.trim() || "https://eagleburgerband.com";
  const ogImage = seo?.ogImageUrl?.trim() || "";
  const ogType = seo?.ogType || "website";
  const robots = seo?.noIndex
    ? "noindex, nofollow"
    : seo?.noFollow
    ? "index, nofollow"
    : "index, follow";

  const jsonLd = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "MusicGroup",
    name: "Eagleburger Band",
    url: "https://eagleburgerband.com",
    genre: "Brass Band / Street Music",
    description: seoDesc,
    sameAs: [
      "https://www.youtube.com/@eagleburgerband",
      "https://www.instagram.com/eagleburgerband",
    ],
  });

  return (
    <div className="pb-16" suppressHydrationWarning>
      <title>{seoTitle}</title>
      <meta name="description" content={seoDesc} />
      {keywords && <meta name="keywords" content={keywords} />}
      <meta name="robots" content={robots} />
      <link rel="canonical" href={canonicalUrl} />
      <meta property="og:title" content={seoTitle} />
      <meta property="og:description" content={seoDesc} />
      <meta property="og:url" content={canonicalUrl} />
      <meta property="og:type" content={ogType} />
      {ogImage && <meta property="og:image" content={ogImage} />}
      <meta name="twitter:card" content={ogImage ? "summary_large_image" : "summary"} />
      <meta name="twitter:title" content={seoTitle} />
      <meta name="twitter:description" content={seoDesc} />
      {ogImage && <meta name="twitter:image" content={ogImage} />}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLd }}
      />

      {/* Optional Hero Header Image Banner from CMS Studio */}
      <PublicPageHeader
        headerImage={pageData?.headerImage}
        fallbackTitle={pageData?.title}
        fallbackSubtitle={pageData?.description}
      />

      {/* Render All Dynamic Sections */}
      <div>
        {sectionsToRender.map((section) => (
          <PublicSectionRenderer key={section.id} section={section} />
        ))}
      </div>
    </div>
  );
}
