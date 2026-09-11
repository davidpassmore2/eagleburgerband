"use client";

import React, { useEffect, useState, use } from "react";
import Link from "next/link";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { ContentPage, ContentPageSchema } from "@/lib/schema/page";
import { sanitizeHtml } from "@/components/cms/WysiwygEditor";
import {
  Loader2,
  FileQuestion,
  ArrowRight,
  Sparkles,
} from "lucide-react";

function getStructuredDataJson(page: ContentPage): string | null {
  const seo = page.seo;
  if (!seo || seo.structuredDataType === "none") return null;

  if (seo.structuredDataType === "custom" && seo.structuredDataJson?.trim()) {
    try {
      const parsed = JSON.parse(seo.structuredDataJson);
      return JSON.stringify(parsed);
    } catch {
      return null;
    }
  }

  if (seo.structuredDataType === "MusicGroup") {
    return JSON.stringify({
      "@context": "https://schema.org",
      "@type": "MusicGroup",
      name: "Eagleburger Band",
      url: "https://eagleburgerband.com",
      genre: "Brass Band / Street Music",
      description: seo.metaDescription || page.description,
      sameAs: [
        "https://www.youtube.com/@eagleburgerband",
        "https://www.instagram.com/eagleburgerband",
      ],
    });
  }

  if (seo.structuredDataType === "Event") {
    return JSON.stringify({
      "@context": "https://schema.org",
      "@type": "Event",
      name: seo.metaTitle || page.title,
      description: seo.metaDescription || page.description,
      url: `https://eagleburgerband.com/${page.slug}`,
      performer: {
        "@type": "MusicGroup",
        name: "Eagleburger Band",
      },
    });
  }

  // Default: WebPage
  return JSON.stringify({
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: seo.metaTitle || `${page.title} | Eagleburger Band`,
    description: seo.metaDescription || page.description,
    url: `https://eagleburgerband.com/${page.slug}`,
  });
}

export default function DynamicPublicCmsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const resolvedParams = use(params);
  const slug = resolvedParams.slug;

  const [page, setPage] = useState<ContentPage | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!slug) return;

    const q = query(
      collection(db, "content_pages"),
      where("slug", "==", slug)
    );

    const unsub = onSnapshot(
      q,
      (snap) => {
        if (!snap.empty) {
          const docData = snap.docs[0].data();
          const parsed = ContentPageSchema.safeParse({ ...docData, id: snap.docs[0].id });
          if (parsed.success && parsed.data.isPublished) {
            setPage(parsed.data);
          } else {
            setPage(null);
          }
        } else {
          setPage(null);
        }
        setLoading(false);
      },
      (err) => {
        console.warn("Error fetching dynamic CMS page:", err);
        setLoading(false);
      }
    );

    return () => unsub();
  }, [slug]);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-24 text-slate-400 gap-2 text-xs">
        <Loader2 className="w-5 h-5 animate-spin text-yellow-400" />
        Loading page content...
      </div>
    );
  }

  if (!page) {
    return (
      <div className="max-w-2xl mx-auto py-24 px-4 text-center space-y-6" suppressHydrationWarning>
        <div className="w-16 h-16 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center mx-auto text-slate-500">
          <FileQuestion className="w-8 h-8" />
        </div>
        <div className="space-y-2">
          <h1 className="text-3xl font-black text-white uppercase">Page Not Found</h1>
          <p className="text-xs sm:text-sm text-slate-400 leading-relaxed max-w-md mx-auto">
            The page you are looking for does not exist or has not yet been published by band management.
          </p>
        </div>
        <div className="flex items-center justify-center gap-3 pt-2">
          <Link
            href="/"
            suppressHydrationWarning
            className="bg-yellow-400 hover:bg-yellow-300 text-slate-950 font-bold px-5 py-2.5 rounded-xl text-xs uppercase tracking-wider transition shadow"
          >
            Back to Home
          </Link>
          <Link
            href="/gigs"
            suppressHydrationWarning
            className="bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 px-5 py-2.5 rounded-xl text-xs font-semibold transition"
          >
            View Shows
          </Link>
        </div>
      </div>
    );
  }

  // Sorted sections
  const sortedSections = [...(page.sections || [])].sort((a, b) => a.order - b.order);

  const seo = page.seo;
  const seoTitle = seo?.metaTitle?.trim() || `${page.title} | Eagleburger Band`;
  const seoDesc = seo?.metaDescription?.trim() || page.description || "The Eagleburger Band - High-energy acoustic mobile brass and drum powerhouse.";
  const keywords = seo?.keywords?.trim() || "";
  const canonicalUrl = seo?.canonicalUrl?.trim() || `https://eagleburgerband.com/${page.slug}`;
  const ogImage = seo?.ogImageUrl?.trim() || "";
  const ogType = seo?.ogType || "website";
  const robots = seo?.noIndex
    ? "noindex, nofollow"
    : seo?.noFollow
    ? "index, nofollow"
    : "index, follow";

  const jsonLd = getStructuredDataJson(page);

  return (
    <div className="space-y-16 pb-20" suppressHydrationWarning>
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
      {jsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: jsonLd }}
        />
      )}

      {sortedSections.map((section) => (
        <section key={section.id} className="relative">
          {/* Hero Section */}
          {section.type === "hero" && section.hero && (
            <div className="relative overflow-hidden pt-12 pb-16 border-b border-slate-800 bg-gradient-to-b from-slate-900 to-slate-950">
              <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-6">
                {section.hero.badgeText && (
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-yellow-400/10 border border-yellow-400/30 text-yellow-400 text-xs font-mono font-bold uppercase tracking-wider">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>{section.hero.badgeText}</span>
                  </div>
                )}

                <h1 className="text-4xl sm:text-6xl font-black text-white uppercase tracking-tight leading-tight">
                  {section.hero.headline}
                </h1>

                {section.hero.subheadline && (
                  <p className="text-sm sm:text-base text-slate-300 max-w-2xl mx-auto leading-relaxed">
                    {section.hero.subheadline}
                  </p>
                )}

                {(section.hero.ctaText || section.hero.secondaryCtaText) && (
                  <div className="pt-4 flex flex-wrap items-center justify-center gap-4">
                    {section.hero.ctaText && (
                      <Link
                        href={section.hero.ctaHref || "/book"}
                        suppressHydrationWarning
                        className="bg-yellow-400 hover:bg-yellow-300 text-slate-950 font-bold px-6 py-3 rounded-2xl text-xs uppercase tracking-wider transition shadow-lg shadow-yellow-400/20 hover:scale-105 active:scale-95"
                      >
                        {section.hero.ctaText}
                      </Link>
                    )}
                    {section.hero.secondaryCtaText && (
                      <Link
                        href={section.hero.secondaryCtaHref || "/gigs"}
                        suppressHydrationWarning
                        className="bg-slate-900 hover:bg-slate-800 border border-slate-700 text-white font-bold px-6 py-3 rounded-2xl text-xs uppercase tracking-wider transition"
                      >
                        {section.hero.secondaryCtaText}
                      </Link>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Rich Text Section (Sanitized WYSIWYG) */}
          {section.type === "rich_text" && section.richText && (
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
              <div
                className={`bg-slate-900/40 border border-slate-800/80 rounded-3xl p-6 sm:p-10 space-y-6 ${
                  section.richText.alignment === "center" ? "text-center" : "text-left"
                }`}
              >
                {section.richText.title && (
                  <h2 className="text-2xl sm:text-3xl font-extrabold text-white uppercase tracking-tight">
                    {section.richText.title}
                  </h2>
                )}

                <div
                  className="prose prose-invert prose-yellow max-w-none text-xs sm:text-sm text-slate-300 leading-relaxed
                    [&>h2]:text-xl [&>h2]:font-extrabold [&>h2]:text-white [&>h2]:mt-6 [&>h2]:mb-3
                    [&>h3]:text-base [&>h3]:font-bold [&>h3]:text-yellow-400 [&>h3]:mt-4 [&>h3]:mb-2
                    [&>p]:mb-4 [&>p]:leading-relaxed
                    [&>ul]:list-disc [&>ul]:pl-5 [&>ul]:mb-4 [&>ul]:space-y-1.5
                    [&>ol]:list-decimal [&>ol]:pl-5 [&>ol]:mb-4 [&>ol]:space-y-1.5
                    [&>blockquote]:border-l-4 [&>blockquote]:border-yellow-400 [&>blockquote]:pl-4 [&>blockquote]:italic [&>blockquote]:text-slate-400 [&>blockquote]:my-4
                    [&>a]:text-yellow-400 [&>a]:underline hover:[&>a]:text-yellow-300"
                  dangerouslySetInnerHTML={{
                    __html: sanitizeHtml(section.richText.body),
                  }}
                />
              </div>
            </div>
          )}

          {/* Media Highlight Section */}
          {section.type === "media_highlight" && section.mediaHighlight && (
            <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-10 space-y-6 shadow-2xl text-center">
                <div className="space-y-2 max-w-2xl mx-auto">
                  <h2 className="text-2xl sm:text-3xl font-extrabold text-white uppercase">
                    {section.mediaHighlight.title}
                  </h2>
                  {section.mediaHighlight.description && (
                    <p className="text-xs sm:text-sm text-slate-400">
                      {section.mediaHighlight.description}
                    </p>
                  )}
                </div>

                <div className="aspect-video w-full max-w-3xl mx-auto rounded-2xl overflow-hidden bg-slate-950 border border-slate-800 shadow-inner">
                  {section.mediaHighlight.url.includes("youtube.com") ||
                  section.mediaHighlight.url.includes("youtu.be") ? (
                    <iframe
                      src={
                        section.mediaHighlight.url.includes("watch?v=")
                          ? section.mediaHighlight.url.replace("watch?v=", "embed/")
                          : section.mediaHighlight.url
                      }
                      title={section.mediaHighlight.title}
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                      className="w-full h-full border-0"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-500 text-xs">
                      Media source: {section.mediaHighlight.url}
                    </div>
                  )}
                </div>

                {section.mediaHighlight.caption && (
                  <p className="text-[11px] font-mono text-slate-500">
                    {section.mediaHighlight.caption}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Features Section */}
          {section.type === "features" && section.features && (
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8 text-center">
              <div className="space-y-2 max-w-2xl mx-auto">
                <h2 className="text-2xl sm:text-3xl font-extrabold text-white uppercase">
                  {section.features.title}
                </h2>
                {section.features.subtitle && (
                  <p className="text-xs sm:text-sm text-slate-400">
                    {section.features.subtitle}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {section.features.items?.map((item, i) => (
                  <div
                    key={i}
                    className="bg-slate-900 border border-slate-800 rounded-3xl p-6 text-left space-y-3 hover:border-yellow-400/40 transition shadow-xl"
                  >
                    <div className="font-extrabold text-sm text-white">{item.title}</div>
                    <p className="text-xs text-slate-400 leading-relaxed">{item.description}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Gig Feed Preview */}
          {section.type === "gig_feed_preview" && section.gigFeedPreview && (
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-10 flex flex-col sm:flex-row items-center justify-between gap-6 shadow-xl">
                <div className="space-y-1">
                  <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-yellow-400">
                    Live Performance Calendar
                  </span>
                  <h3 className="text-2xl font-extrabold text-white">
                    {section.gigFeedPreview.title}
                  </h3>
                </div>

                <Link
                  href={section.gigFeedPreview.ctaHref || "/gigs"}
                  suppressHydrationWarning
                  className="bg-yellow-400 hover:bg-yellow-300 text-slate-950 font-bold px-5 py-2.5 rounded-xl text-xs uppercase tracking-wider transition flex items-center gap-1.5 shrink-0"
                >
                  <span>{section.gigFeedPreview.ctaText || "View Schedule"}</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          )}
        </section>
      ))}
    </div>
  );
}
