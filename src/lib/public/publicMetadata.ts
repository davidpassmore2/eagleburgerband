import type { Metadata } from "next";
import { getDocument, findDocuments } from "@/lib/firebase/serverFirestore";
import {
  ContentPage,
  ContentPageSchema,
  DEFAULT_SYSTEM_PAGES,
  SystemPageId,
} from "@/lib/schema/page";

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "https://eagleburgerband.com";

/**
 * Server-side loader for a CMS page from Firestore content_pages collection.
 * Supports direct ID lookup (system pages) and slug lookup (custom pages).
 * Falls back to DEFAULT_SYSTEM_PAGES if Firestore is unavailable or unpopulated.
 */
export async function getPublicContentPage(pageIdOrSlug: string): Promise<ContentPage | null> {
  if (!pageIdOrSlug || pageIdOrSlug === "." || pageIdOrSlug === ".." || pageIdOrSlug.includes("/")) return null;

  try {
    // 1. Check direct doc by ID (used for standard system pages)
    const doc = await getDocument(`content_pages/${encodeURIComponent(pageIdOrSlug)}`);
    if (doc) {
      const parsed = ContentPageSchema.safeParse(doc.data);
      if (parsed.success) {
        return parsed.data;
      }
    }

    // 2. Check by slug field (for custom CMS pages)
    const matches = await findDocuments("content_pages", "slug", pageIdOrSlug);
    if (matches.length > 0) {
      const parsed = ContentPageSchema.safeParse(matches[0].data);
      if (parsed.success) {
        return parsed.data;
      }
    }
  } catch (err) {
    console.warn(`[getPublicContentPage] Server fetch note for "${pageIdOrSlug}":`, err instanceof Error ? err.message : String(err));
  }

  // Fallback to built-in system page defaults
  if (pageIdOrSlug in DEFAULT_SYSTEM_PAGES) {
    return DEFAULT_SYSTEM_PAGES[pageIdOrSlug as SystemPageId];
  }

  return null;
}

/**
 * Builds dynamic Next.js Metadata (including OpenGraph and Twitter cards)
 * from a CMS ContentPage document.
 */
export function buildPageMetadata(page: ContentPage | null, fallbackId?: string): Metadata {
  const defaultPage = fallbackId && fallbackId in DEFAULT_SYSTEM_PAGES
    ? DEFAULT_SYSTEM_PAGES[fallbackId as SystemPageId]
    : undefined;

  const activePage = page || defaultPage;

  const seo = activePage?.seo;
  const title =
    seo?.metaTitle?.trim() ||
    (activePage?.title ? `${activePage.title} | Eagleburger Band` : "Eagleburger Band | Pittsburgh Street Brass & Drums");

  const description =
    seo?.metaDescription?.trim() ||
    activePage?.description?.trim() ||
    "Pittsburgh's premier mobile acoustic street brass and drumline powerhouse.";

  const rawKeywords = seo?.keywords?.trim();
  const keywords = rawKeywords ? rawKeywords.split(",").map((k) => k.trim()).filter(Boolean) : undefined;

  const ogImageUrl = seo?.ogImageUrl?.trim() || activePage?.headerImage?.imageUrl?.trim() || undefined;
  const canonicalUrl = seo?.canonicalUrl?.trim() || (activePage?.slug ? `${BASE_URL}/${activePage.slug === "home" ? "" : activePage.slug}` : undefined);

  const robots = seo?.noIndex
    ? { index: false, follow: !seo.noFollow }
    : seo?.noFollow
    ? { index: true, follow: false }
    : undefined;

  return {
    title,
    description,
    keywords,
    alternates: canonicalUrl ? { canonical: canonicalUrl } : undefined,
    robots,
    openGraph: {
      title,
      description,
      type: "website",
      locale: "en_US",
      siteName: "Eagleburger Band",
      url: canonicalUrl,
      images: ogImageUrl
        ? [
            {
              url: ogImageUrl,
              alt: activePage?.headerImage?.altText || title,
            },
          ]
        : undefined,
    },
    twitter: {
      card: ogImageUrl ? "summary_large_image" : "summary",
      title,
      description,
      images: ogImageUrl ? [ogImageUrl] : undefined,
    },
  };
}

/**
 * Convenience helper to load a CMS page and return its dynamic Metadata.
 */
export async function getPublicPageMetadata(pageIdOrSlug: string): Promise<Metadata> {
  const page = await getPublicContentPage(pageIdOrSlug);
  return buildPageMetadata(page, pageIdOrSlug);
}
