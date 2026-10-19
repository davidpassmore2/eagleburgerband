"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { ContentPage, ContentPageSchema, DEFAULT_SYSTEM_PAGES } from "@/lib/schema/page";
import PublicPageHeader, { usePageBanner } from "@/components/public/PublicPageHeader";
import PublicSectionRenderer from "@/components/cms/PublicSectionRenderer";
import ContactFormSection from "@/components/public/ContactFormSection";
import { Mail, Calendar, Music2 } from "lucide-react";

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

  const hasContactForm = pageData?.sections?.some((s) => s.type === "contact_form");
  const hasFeatures = pageData?.sections?.some((s) => s.type === "features");

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

      <div className={`max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12 ${isBannerActive ? "pt-8 sm:pt-12" : "pt-8"}`}>
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

        {/* Fallback Quick Paths Cards if no features section configured */}
        {!hasFeatures && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Link
              href="/book"
              suppressHydrationWarning
              className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-yellow-400/50 hover:bg-slate-900 transition flex items-start gap-4 group"
            >
              <div className="w-10 h-10 rounded-xl bg-yellow-400/10 border border-yellow-400/30 flex items-center justify-center text-yellow-400 shrink-0 group-hover:scale-105 transition-transform">
                <Calendar className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white group-hover:text-yellow-400 transition-colors font-arvo">
                  Looking to Book the Band? &rarr;
                </h3>
                <p className="text-xs text-slate-400 mt-1 font-poppins font-normal">
                  Planning a parade, street festival, wedding, or block party? Use our dedicated Booking Inquiry form for availability and pricing.
                </p>
              </div>
            </Link>

            <Link
              href="/join"
              suppressHydrationWarning
              className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-yellow-400/50 hover:bg-slate-900 transition flex items-start gap-4 group"
            >
              <div className="w-10 h-10 rounded-xl bg-yellow-400/10 border border-yellow-400/30 flex items-center justify-center text-yellow-400 shrink-0 group-hover:scale-105 transition-transform">
                <Music2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white group-hover:text-yellow-400 transition-colors font-arvo">
                  Interested in Playing With Us? &rarr;
                </h3>
                <p className="text-xs text-slate-400 mt-1 font-poppins font-normal">
                  Brass musician or percussionist? Check out our rehearsal schedule and submit an audition request to join our ranks.
                </p>
              </div>
            </Link>
          </div>
        )}

        {/* Render Dynamic CMS Sections from CMS Studio */}
        {pageData?.sections && pageData.sections.length > 0 && (
          <div className="space-y-12">
            {pageData.sections.map((section) => (
              <PublicSectionRenderer key={section.id} section={section} />
            ))}
          </div>
        )}

        {/* Fallback Contact Form if not present in CMS sections */}
        {!hasContactForm && (
          <ContactFormSection
            headline="Send Us a Message"
            subheadline="Have questions about band merchandise, media requests, or general inquiries? Send our coordination team a note."
            badgeText="Direct Band Contact"
            buttonText="Send Message"
          />
        )}
      </div>
    </div>
  );
}
