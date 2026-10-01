"use client";

import React, { useEffect, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { ContentPage, ContentPageSchema, DEFAULT_SYSTEM_PAGES } from "@/lib/schema/page";
import PublicPageHeader from "@/components/public/PublicPageHeader";
import PublicSectionRenderer from "@/components/cms/PublicSectionRenderer";
import BookingFormSection from "@/components/public/BookingFormSection";

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

  return (
    <div className="space-y-8 pb-16" suppressHydrationWarning>
      <title>{seoTitle}</title>
      <meta name="description" content={seoDesc} />
      {seo?.keywords && <meta name="keywords" content={seo.keywords} />}

      {/* Hero Header Image Banner from CMS Studio or Global Configuration */}
      <PublicPageHeader
        headerImage={pageData?.headerImage}
        fallbackTitle={pageData?.title}
        fallbackSubtitle={pageData?.description}
      />

      {/* Custom Sections from CMS Studio (e.g. FAQ or Info Cards) */}
      {pageData?.sections?.map((section) => (
        <PublicSectionRenderer key={section.id} section={section} />
      ))}

      {/* Core Booking Form Engine */}
      <BookingFormSection
        headline={pageData?.headerImage?.customTitle || pageData?.title || "Book the Eagleburger Band"}
        subheadline={pageData?.headerImage?.customSubtitle || pageData?.description || "Tell us about your event. We will check band availability, outline performance options, and follow up with you promptly."}
        badgeText={pageData?.headerImage?.badgeText || "Direct Event Inquiry"}
        defaultEventType="Community Parade & Festival"
        buttonText="Submit Booking Request"
      />
    </div>
  );
}