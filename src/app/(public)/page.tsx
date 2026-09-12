"use client";

import React, { useEffect, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { ContentPage, ContentPageSchema, ContentSection } from "@/lib/schema/page";
import PublicSectionRenderer from "@/components/cms/PublicSectionRenderer";

const DEFAULT_HOME_SECTIONS: ContentSection[] = [
  {
    id: "sec_hero",
    type: "hero",
    order: 1,
    isVisible: true,
    background: "default",
    padding: "standard",
    hero: {
      headline: "Pittsburgh's High-Energy Street Brass & Drum Powerhouse",
      subheadline: "Unstoppable brass fanfares, infectious street percussion, and high-stepping street revelry across Western Pennsylvania.",
      ctaText: "Book the Band",
      ctaHref: "/book",
      secondaryCtaText: "Upcoming Shows",
      secondaryCtaHref: "/gigs",
      badgeText: "Acoustic Brass & Percussion Battery",
      backgroundImageUrl: "",
    },
  },
  {
    id: "sec_media",
    type: "media_highlight",
    order: 2,
    isVisible: true,
    background: "default",
    padding: "standard",
    mediaHighlight: {
      title: "Live on the March",
      description: "Watch the Eagleburger Band marching in full stride — battery percussion and horns in high step.",
      mediaType: "youtube",
      url: "https://www.youtube.com/watch?v=v0x-fut30wE",
      caption: "Greenfield Holiday Parade — Pittsburgh, PA",
    },
  },
  {
    id: "sec_features",
    type: "features",
    order: 3,
    isVisible: true,
    background: "default",
    padding: "standard",
    features: {
      title: "Why Book the Eagleburger Band?",
      subtitle: "Mobile, acoustic, and always electrifying.",
      items: [
        {
          icon: "Zap",
          title: "100% Mobile & Acoustic",
          description: "No stage, cables, or power outlets required. We march, dance, and blow the roof off anywhere.",
        },
        {
          icon: "Drum",
          title: "Full Brass & Drumline Battery",
          description: "Sousaphones, trombones, trumpets, saxes, and pounding street drums that get crowds dancing.",
        },
        {
          icon: "Users",
          title: "Community & Event Focused",
          description: "Parades, street festivals, community block parties, celebrations, and festive gatherings.",
        },
      ],
    },
  },
  {
    id: "sec_gigs",
    type: "gig_feed_preview",
    order: 4,
    isVisible: true,
    background: "default",
    padding: "standard",
    gigFeedPreview: {
      title: "Upcoming Performances",
      maxItems: 3,
      ctaText: "View Full Performance Schedule",
      ctaHref: "/gigs",
    },
  },
  {
    id: "sec_booking",
    type: "booking_form",
    order: 5,
    isVisible: true,
    background: "surface",
    padding: "standard",
    bookingForm: {
      headline: "Book the Eagleburger Band",
      subheadline: "Planning a parade, festival, or block party? Inquire directly with our gig coordination team.",
      badgeText: "Direct Event Inquiry",
      defaultEventType: "Community Parade & Festival",
      buttonText: "Submit Booking Request",
    },
  },
];

export default function PublicHomePage() {
  const [pageData, setPageData] = useState<ContentPage | null>(null);

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
      : DEFAULT_HOME_SECTIONS;

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
    <div className="space-y-4 pb-16" suppressHydrationWarning>
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

      {/* Render All Dynamic Sections */}
      {sectionsToRender.map((section) => (
        <PublicSectionRenderer key={section.id} section={section} />
      ))}
    </div>
  );
}
