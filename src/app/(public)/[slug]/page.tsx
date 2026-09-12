"use client";

import React, { useEffect, useState, use } from "react";
import Link from "next/link";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { ContentPage, ContentPageSchema } from "@/lib/schema/page";
import {
  Loader2,
  FileQuestion,
} from "lucide-react";
import PublicSectionRenderer from "@/components/cms/PublicSectionRenderer";

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
        <PublicSectionRenderer key={section.id} section={section} />
      ))}
    </div>
  );
}
