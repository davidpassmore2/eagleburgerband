"use client";

import React, { useState, useEffect } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { ContentPage, ContentPageSchema, DEFAULT_SYSTEM_PAGES } from "@/lib/schema/page";
import PublicPageHeader, { usePageBanner } from "@/components/public/PublicPageHeader";
import PublicSectionRenderer from "@/components/cms/PublicSectionRenderer";
import { Mail } from "lucide-react";

export default function ContactPage() {
  const [pageData, setPageData] = useState<ContentPage>(DEFAULT_SYSTEM_PAGES.contact);
  const { isBannerActive } = usePageBanner(pageData?.headerImage);

  useEffect(() => {
    const unsub = onSnapshot(
      doc(db, "content_pages", "contact"),
      (snap) => {
        if (snap.exists()) {
          const parsed = ContentPageSchema.safeParse(snap.data());
          if (parsed.success) {
            setPageData(parsed.data);
          }
        }
      },
      (err) => console.warn("CMS Contact page notice:", err)
    );
    return () => unsub();
  }, []);

  const seo = pageData?.seo;
  const seoTitle = seo?.metaTitle?.trim() || `${pageData?.title || "Contact Us"} | Eagleburger Band`;
  const seoDesc = seo?.metaDescription?.trim() || pageData?.description || "Contact the Eagleburger Band management for appearances, press, questions, or bookings.";

  const sectionsToRender =
    pageData?.sections && pageData.sections.length > 0
      ? [...pageData.sections].sort((a, b) => a.order - b.order)
      : DEFAULT_SYSTEM_PAGES.contact.sections;

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

      <div className={`max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12 ${isBannerActive ? "pt-8 sm:pt-12" : "pt-8"}`}>
        {/* Header (rendered if no header image banner is active) */}
        {!isBannerActive && (
          <div className="text-center space-y-4 max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-yellow-400/10 border border-yellow-400/30 text-yellow-400 text-xs font-semibold uppercase tracking-wider">
              <Mail className="w-3.5 h-3.5" />
              <span>Get in Touch</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-black text-white uppercase tracking-tight font-arvo">
              {pageData?.title || "Contact the Eagleburger Band"}
            </h1>
            <p className="text-slate-400 text-sm sm:text-base leading-relaxed">
              {pageData?.description ||
                "Have a question about our community appearances, press inquiries, merchandise, or general feedback? Send us a message and our team will get back to you."}
            </p>
          </div>
        )}

        {/* Render Dynamic CMS Sections from CMS Studio */}
        {sectionsToRender && sectionsToRender.length > 0 && (
          <div className="space-y-12">
            {sectionsToRender.map((section) => (
              <PublicSectionRenderer key={section.id} section={section} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
