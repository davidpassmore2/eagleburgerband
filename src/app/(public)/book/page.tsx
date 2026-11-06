"use client";

import React, { useEffect, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { ContentPage, ContentPageSchema, DEFAULT_SYSTEM_PAGES } from "@/lib/schema/page";
import PublicPageHeader from "@/components/public/PublicPageHeader";
import PublicSectionRenderer from "@/components/cms/PublicSectionRenderer";

export default function BookingPage() {
  const [pageData, setPageData] = useState<ContentPage>(DEFAULT_SYSTEM_PAGES.book);

  useEffect(() => {
    const unsub = onSnapshot(
      doc(db, "content_pages", "book"),
      (snap) => {
        if (snap.exists()) {
          const parsed = ContentPageSchema.safeParse(snap.data());
          if (parsed.success) {
            setPageData(parsed.data);
          }
        }
      },
      (err) => console.warn("CMS Book page notice:", err)
    );

    return () => unsub();
  }, []);

  const seo = pageData?.seo;
  const seoTitle = seo?.metaTitle?.trim() || `${pageData?.title || "Book the Band"} | Eagleburger Band`;
  const seoDesc = seo?.metaDescription?.trim() || pageData?.description || "Request the Eagleburger Band for parades, street festivals, weddings, and private events. Check musician availability and rates.";

  const sectionsToRender =
    pageData?.sections && pageData.sections.length > 0
      ? [...pageData.sections].sort((a, b) => a.order - b.order)
      : DEFAULT_SYSTEM_PAGES.book.sections;

  return (
    <div className="pb-16" suppressHydrationWarning>
      <title>{seoTitle}</title>
      <meta name="description" content={seoDesc} />
      {seo?.keywords && <meta name="keywords" content={seo.keywords} />}

      {/* Hero Header Image Banner from CMS Studio or Global Configuration */}
      <PublicPageHeader
        headerImage={pageData?.headerImage}
        fallbackTitle={pageData?.title}
        fallbackSubtitle={pageData?.description}
      />

      {/* Dynamic CMS Sections from CMS Studio */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12 pt-8">
        {sectionsToRender?.map((section) => (
          <PublicSectionRenderer key={section.id} section={section} />
        ))}
      </div>
    </div>
  );
}
