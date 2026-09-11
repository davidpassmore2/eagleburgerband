"use client";

import React, { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import {
  collection,
  doc,
  onSnapshot,
  setDoc,
  deleteDoc,
} from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { useAuth } from "@/lib/context/AuthContext";
import { canManageContent } from "@/lib/auth/permissions";
import { User } from "@/lib/schema/user";
import {
  ContentPage,
  ContentPageSchema,
  ContentSection,
  SectionType,
  PageSeo,
  PageSeoSchema,
} from "@/lib/schema/page";
import { WysiwygEditor, sanitizeHtml } from "@/components/cms/WysiwygEditor";
import {
  Save,
  Eye,
  Sparkles,
  Video,
  Layers,
  Loader2,
  ShieldAlert,
  Check,
  ExternalLink,
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  FileText,
  Calendar,
  Settings,
  X,
  Globe,
  AlignLeft,
  AlignCenter,
  Edit3,
  Search,
  Share2,
  CheckCircle2,
  AlertTriangle,
  Tag,
  ChevronDown,
  ChevronUp,
  Smartphone,
  Monitor,
} from "lucide-react";

const DEFAULT_HOME_PAGE: ContentPage = ContentPageSchema.parse({
  id: "home",
  slug: "home",
  title: "Home",
  description: "Official Website of the Eagleburger Band",
  isPublished: true,
  seo: {
    metaTitle: "Eagleburger Band | High-Energy Mobile Brass & Drums",
    metaDescription: "The Eagleburger Band brings high-energy acoustic brass and infectious drumline grooves to parades, festivals, and celebrations across Western PA.",
    keywords: "brass band, pittsburgh street music, mobile brass, parade band, live music pittsburgh",
    ogImageUrl: "",
    ogType: "website",
    canonicalUrl: "",
    noIndex: false,
    noFollow: false,
    structuredDataType: "MusicGroup",
    structuredDataJson: "",
  },
  sections: [
    {
      id: "sec_hero",
      type: "hero",
      order: 1,
      hero: {
        headline: "Pittsburgh's High-Energy Street Brass & Drum Powerhouse",
        subheadline: "Unstoppable brass, infectious percussion grooves, and high-stepping street revelry.",
        ctaText: "Book the Band",
        ctaHref: "/book",
        secondaryCtaText: "Upcoming Shows",
        secondaryCtaHref: "/gigs",
        badgeText: "Acoustic Brass & Drums",
        backgroundImageUrl: "",
      },
    },
    {
      id: "sec_media",
      type: "media_highlight",
      order: 2,
      mediaHighlight: {
        title: "Live on the March",
        description: "Watch the Eagleburger Band bring the energy to the streets at the Greenfield Holiday Parade.",
        mediaType: "youtube",
        url: "https://www.youtube.com/watch?v=v0x-fut30wE",
        caption: "Greenfield Holiday Parade Performance — Brass & Battery in Full Stride",
      },
    },
    {
      id: "sec_features",
      type: "features",
      order: 3,
      features: {
        title: "Why Event Organizers Choose Eagleburger",
        subtitle: "100% mobile acoustic performance that electrifies crowds anywhere.",
        items: [
          {
            icon: "Zap",
            title: "100% Mobile & Acoustic",
            description: "No stage, cables, generators, or PA systems required. We play while marching, dancing, and mingling directly with crowds.",
          },
          {
            icon: "Music",
            title: "Massive Brass & Drumline Sound",
            description: "Sousaphones, trombones, trumpets, saxophones, and marching drums delivering high-decibel acoustic excitement.",
          },
          {
            icon: "Calendar",
            title: "Parades, Festivals & Celebrations",
            description: "Civic parades, street festivals, beer gardens, wedding send-offs, and community block parties across Western PA.",
          },
        ],
      },
    },
    {
      id: "sec_gig_feed",
      type: "gig_feed_preview",
      order: 4,
      gigFeedPreview: {
        title: "Upcoming Performances",
        maxItems: 3,
        ctaText: "View Full Performance Schedule",
        ctaHref: "/gigs",
      },
    },
  ],
});

export default function CMSPagesStudio() {
  const { profile, loading: authLoading } = useAuth();
  const [pages, setPages] = useState<ContentPage[]>([DEFAULT_HOME_PAGE]);
  const [selectedPageId, setSelectedPageId] = useState<string>("home");
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [activeTab, setActiveTab] = useState<"builder" | "preview" | "seo" | "settings">("builder");

  // New Page Modal State
  const [isNewPageModalOpen, setIsNewPageModalOpen] = useState(false);
  const [newPageTitle, setNewPageTitle] = useState("");
  const [newPageSlug, setNewPageSlug] = useState("");
  const [newPageDesc, setNewPageDesc] = useState("");
  const [newPageTemplate, setNewPageTemplate] = useState<"story" | "empty" | "media">("story");
  const [newPageMetaTitle, setNewPageMetaTitle] = useState("");
  const [newPageMetaDesc, setNewPageMetaDesc] = useState("");
  const [newPageKeywords, setNewPageKeywords] = useState("");
  const [newPageOgImage, setNewPageOgImage] = useState("");
  const [showNewPageSeoAccordion, setShowNewPageSeoAccordion] = useState(false);

  // SEO Tab Device Switcher
  const [serpDevice, setSerpDevice] = useState<"desktop" | "mobile">("desktop");

  // Add Section Dropdown State
  const [showAddSectionMenu, setShowAddSectionMenu] = useState(false);

  useEffect(() => {
    if (authLoading) return;

    const unsub = onSnapshot(
      collection(db, "content_pages"),
      (snap) => {
        const pageMap = new Map<string, ContentPage>();
        snap.forEach((d) => {
          const parsed = ContentPageSchema.safeParse({ ...d.data(), id: d.id });
          if (parsed.success) {
            pageMap.set(parsed.data.id, parsed.data);
          }
        });

        // Ensure DEFAULT_HOME_PAGE is present if no "home" page exists in Firestore
        if (!pageMap.has("home")) {
          pageMap.set("home", DEFAULT_HOME_PAGE);
        }

        const loadedPages = Array.from(pageMap.values());
        loadedPages.sort((a, b) => {
          if (a.id === "home") return -1;
          if (b.id === "home") return 1;
          return a.title.localeCompare(b.title);
        });

        setPages(loadedPages);
        setLoading(false);
      },
      (err) => {
        console.warn("CMS Page collection listener error:", err);
        setLoading(false);
      }
    );

    return () => unsub();
  }, [authLoading]);

  const uniquePages = useMemo(() => {
    const seen = new Set<string>();
    return pages.filter((p) => {
      if (!p.id || seen.has(p.id)) return false;
      seen.add(p.id);
      return true;
    });
  }, [pages]);

  const activePage = useMemo(() => {
    return uniquePages.find((p) => p.id === selectedPageId) || uniquePages[0] || DEFAULT_HOME_PAGE;
  }, [uniquePages, selectedPageId]);

  const updateActivePage = (updater: (prev: ContentPage) => ContentPage) => {
    setPages((prevPages) =>
      prevPages.map((p) => (p.id === activePage.id ? updater(p) : p))
    );
  };

  const updateActivePageSeo = (patch: Partial<PageSeo>) => {
    updateActivePage((prev) => ({
      ...prev,
      seo: {
        ...(prev.seo || PageSeoSchema.parse({})),
        ...patch,
      },
    }));
  };

  // Section Manipulation
  const handleAddSection = (type: SectionType) => {
    const randomSuffix = Math.random().toString(36).substring(2, 7);
    const newId = `sec_${Date.now()}_${randomSuffix}`;
    const nextOrder = (activePage.sections?.length || 0) + 1;

    let newSection: ContentSection = {
      id: newId,
      type,
      order: nextOrder,
    };

    if (type === "rich_text") {
      newSection = {
        ...newSection,
        richText: {
          title: "Our Story & Tradition",
          body: "<h2>Brass in the Streets</h2><p>Founded with a passion for unstoppable mobile street revelry, the Eagleburger Band brings joy to every neighborhood.</p>",
          alignment: "left",
          stylePreset: "standard",
        },
      };
    } else if (type === "hero") {
      newSection = {
        ...newSection,
        hero: {
          headline: activePage.title,
          subheadline: "Pittsburgh's mobile street brass experience.",
          ctaText: "Book Now",
          ctaHref: "/book",
          secondaryCtaText: "Performances",
          secondaryCtaHref: "/gigs",
          badgeText: "Eagleburger Band",
          backgroundImageUrl: "",
        },
      };
    } else if (type === "media_highlight") {
      newSection = {
        ...newSection,
        mediaHighlight: {
          title: "Featured Performance Reel",
          description: "Watch our musicians in full flight during regional festivals and street parades.",
          mediaType: "youtube",
          url: "https://www.youtube.com/watch?v=v0x-fut30wE",
          caption: "Live Street March",
        },
      };
    } else if (type === "features") {
      newSection = {
        ...newSection,
        features: {
          title: "Performance Highlights",
          subtitle: "What makes our performances legendary.",
          items: [
            { icon: "Zap", title: "Pure Acoustic Power", description: "No cables or soundboards needed." },
            { icon: "Users", title: "Crowd Immersion", description: "We march and perform directly alongside fans." },
          ],
        },
      };
    } else if (type === "gig_feed_preview") {
      newSection = {
        ...newSection,
        gigFeedPreview: {
          title: "Upcoming Appearances",
          maxItems: 3,
          ctaText: "Full Schedule",
          ctaHref: "/gigs",
        },
      };
    }

    updateActivePage((prev) => ({
      ...prev,
      sections: [...(prev.sections || []), newSection],
    }));
    setShowAddSectionMenu(false);
  };

  const handleRemoveSection = (sectionId: string) => {
    updateActivePage((prev) => ({
      ...prev,
      sections: prev.sections.filter((s) => s.id !== sectionId),
    }));
  };

  const handleMoveSection = (index: number, direction: "up" | "down") => {
    const sections = [...activePage.sections];
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= sections.length) return;

    const temp = sections[index];
    sections[index] = sections[targetIndex];
    sections[targetIndex] = temp;

    // Reassign order
    sections.forEach((s, idx) => {
      s.order = idx + 1;
    });

    updateActivePage((prev) => ({
      ...prev,
      sections,
    }));
  };

  const handleUpdateSection = (sectionId: string, patch: Partial<ContentSection>) => {
    updateActivePage((prev) => ({
      ...prev,
      sections: prev.sections.map((s) => (s.id === sectionId ? { ...s, ...patch } : s)),
    }));
  };

  // Save Page
  const handleSavePage = async () => {
    setIsSaving(true);
    setSavedSuccess(false);

    try {
      const validated = ContentPageSchema.parse({
        ...activePage,
        updatedAt: new Date().toISOString(),
      });

      await setDoc(doc(db, "content_pages", activePage.id), validated, { merge: true });
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    } catch (err) {
      alert("Failed to save CMS Page: " + (err instanceof Error ? err.message : String(err)));
    } finally {
      setIsSaving(false);
    }
  };

  // Create Page
  const handleCreatePage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPageTitle.trim()) return;

    const slug = (newPageSlug.trim() || newPageTitle.toLowerCase().replace(/[^a-z0-9]+/g, "-")).replace(/^-|-$/g, "");
    if (!slug) {
      alert("Please provide a valid page title or URL slug.");
      return;
    }
    const pageId = slug;

    if (pages.some((p) => p.id === pageId || p.slug === slug)) {
      alert(`A page with slug "/${slug}" already exists. Please choose a different title or slug.`);
      return;
    }

    const randomSuffix = Math.random().toString(36).substring(2, 7);
    let initialSections: ContentSection[] = [];
    if (newPageTemplate === "story") {
      initialSections = [
        {
          id: `sec_${Date.now()}_${randomSuffix}_1`,
          type: "hero",
          order: 1,
          hero: {
            headline: newPageTitle,
            subheadline: newPageDesc || "Pittsburgh street brass & community revelry.",
            ctaText: "Book the Band",
            ctaHref: "/book",
            secondaryCtaText: "Upcoming Shows",
            secondaryCtaHref: "/gigs",
            badgeText: "Eagleburger Band",
            backgroundImageUrl: "",
          },
        },
        {
          id: `sec_${Date.now()}_${randomSuffix}_2`,
          type: "rich_text",
          order: 2,
          richText: {
            title: "About Our Ensemble",
            body: "<h2>Brass, Rhythm & Community</h2><p>The Eagleburger Band brings acoustic power and joyful street grooves to celebrations across Western PA.</p>",
            alignment: "left",
            stylePreset: "standard",
          },
        },
      ];
    } else if (newPageTemplate === "media") {
      initialSections = [
        {
          id: `sec_${Date.now()}_${randomSuffix}_1`,
          type: "hero",
          order: 1,
          hero: {
            headline: newPageTitle,
            subheadline: "Watch and listen to the band in action.",
            ctaText: "Inquire Now",
            ctaHref: "/book",
            secondaryCtaText: "Schedule",
            secondaryCtaHref: "/gigs",
            badgeText: "Media & Press",
            backgroundImageUrl: "",
          },
        },
        {
          id: `sec_${Date.now()}_${randomSuffix}_2`,
          type: "media_highlight",
          order: 2,
          mediaHighlight: {
            title: "Live Street March Reel",
            description: "Greenfield Holiday Parade performance highlight reel.",
            mediaType: "youtube",
            url: "https://www.youtube.com/watch?v=v0x-fut30wE",
            caption: "Eagleburger Band live in Pittsburgh.",
          },
        },
      ];
    }

    const seoMetaTitle = newPageMetaTitle.trim() || `${newPageTitle.trim()} | Eagleburger Band`;
    const seoMetaDesc = newPageMetaDesc.trim() || newPageDesc.trim() || `${newPageTitle.trim()} — Official Eagleburger Band`;

    const newPage: ContentPage = {
      id: pageId,
      slug,
      title: newPageTitle.trim(),
      description: newPageDesc.trim() || `${newPageTitle} — Eagleburger Band`,
      isPublished: true,
      seo: {
        metaTitle: seoMetaTitle,
        metaDescription: seoMetaDesc,
        keywords: newPageKeywords.trim(),
        ogImageUrl: newPageOgImage.trim(),
        ogType: "website",
        canonicalUrl: "",
        noIndex: false,
        noFollow: false,
        structuredDataType: "WebPage",
        structuredDataJson: "",
      },
      sections: initialSections,
      schemaVersion: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    try {
      const validated = ContentPageSchema.parse(newPage);
      await setDoc(doc(db, "content_pages", pageId), validated);
      setPages((prev) => {
        const map = new Map(prev.map((p) => [p.id, p]));
        map.set(pageId, validated);
        const sorted = Array.from(map.values());
        sorted.sort((a, b) => {
          if (a.id === "home") return -1;
          if (b.id === "home") return 1;
          return a.title.localeCompare(b.title);
        });
        return sorted;
      });
      setSelectedPageId(pageId);
      setIsNewPageModalOpen(false);
      setNewPageTitle("");
      setNewPageSlug("");
      setNewPageDesc("");
      setNewPageMetaTitle("");
      setNewPageMetaDesc("");
      setNewPageKeywords("");
      setNewPageOgImage("");
      setShowNewPageSeoAccordion(false);
    } catch (err) {
      alert("Failed to create page: " + (err instanceof Error ? err.message : String(err)));
    }
  };

  // Delete Page
  const handleDeletePage = async () => {
    if (activePage.id === "home") {
      alert("The home page cannot be deleted.");
      return;
    }

    if (!confirm(`Are you sure you want to permanently delete the page "${activePage.title}"?`)) {
      return;
    }

    try {
      await deleteDoc(doc(db, "content_pages", activePage.id));
      setPages((prev) => prev.filter((p) => p.id !== activePage.id));
      setSelectedPageId("home");
    } catch (err) {
      alert("Failed to delete page: " + (err instanceof Error ? err.message : String(err)));
    }
  };

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center p-12 text-slate-400 gap-2 text-xs">
        <Loader2 className="w-4 h-4 animate-spin text-yellow-400" />
        Loading Headless CMS Studio...
      </div>
    );
  }

  if (!canManageContent(profile as unknown as User)) {
    return (
      <div className="p-8 text-rose-400 text-xs font-semibold flex items-center gap-2">
        <ShieldAlert className="w-4 h-4" />
        Web Manager or Admin privileges required to manage public site content.
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      {/* Studio Header Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shadow-xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-yellow-400 bg-slate-950 px-2.5 py-0.5 rounded border border-slate-800">
              Headless CMS Studio
            </span>
            <span className="text-xs text-slate-400 font-mono">
              /{activePage.slug === "home" ? "" : activePage.slug}
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white">Dynamic Page Builder</h1>
          <p className="text-xs text-slate-400">
            Create and edit content pages, configure sections, and use secure WYSIWYG formatting for public experiences.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <Link
            href={activePage.slug === "home" ? "/" : `/${activePage.slug}`}
            target="_blank"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-300 hover:text-yellow-400 bg-slate-800 hover:bg-slate-700 px-3.5 py-2.5 rounded-xl transition border border-slate-700"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>View Live Page</span>
          </Link>

          <button
            type="button"
            onClick={handleSavePage}
            disabled={isSaving}
            className="inline-flex items-center gap-2 bg-yellow-400 hover:bg-yellow-300 text-slate-950 font-black px-5 py-2.5 rounded-xl text-xs uppercase tracking-wider transition shadow-lg shadow-yellow-400/20 disabled:opacity-50"
          >
            {isSaving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : savedSuccess ? (
              <Check className="w-4 h-4 text-emerald-950" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            <span>{savedSuccess ? "Saved!" : "Save Changes"}</span>
          </button>
        </div>
      </div>

      {/* Page Selector & Toolbar Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 shadow">
        {/* Page Switcher Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
          {uniquePages.map((p) => {
            const isSelected = p.id === selectedPageId;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => {
                  setSelectedPageId(p.id);
                  setActiveTab("builder");
                }}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 shrink-0 border ${
                  isSelected
                    ? "bg-yellow-400 text-slate-950 border-yellow-400 shadow"
                    : "bg-slate-950 text-slate-400 border-slate-800 hover:text-white"
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>{p.title}</span>
                <span
                  className={`w-2 h-2 rounded-full ${
                    p.isPublished ? "bg-emerald-500" : "bg-slate-600"
                  }`}
                  title={p.isPublished ? "Published" : "Draft"}
                />
              </button>
            );
          })}

          <button
            type="button"
            onClick={() => setIsNewPageModalOpen(true)}
            className="px-3 py-2 rounded-xl text-xs font-bold text-yellow-400 hover:text-yellow-300 border border-dashed border-yellow-400/40 hover:border-yellow-400 bg-yellow-400/5 transition flex items-center gap-1 shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Page</span>
          </button>
        </div>

        {/* View Mode Tabs (Builder vs Preview vs Page Settings) */}
        <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab("builder")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
              activeTab === "builder"
                ? "bg-yellow-400 text-slate-950 shadow"
                : "text-slate-400 hover:text-white"
            }`}
          >
            Section Builder ({activePage.sections?.length || 0})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("preview")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition ${
              activeTab === "preview"
                ? "bg-yellow-400 text-slate-950 shadow"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            <span>Simulator</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("seo")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition ${
              activeTab === "seo"
                ? "bg-yellow-400 text-slate-950 shadow"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <Search className="w-3.5 h-3.5" />
            <span>SEO Studio</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("settings")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition ${
              activeTab === "settings"
                ? "bg-yellow-400 text-slate-950 shadow"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <Settings className="w-3.5 h-3.5" />
            <span>Settings</span>
          </button>
        </div>
      </div>

      {/* Main Studio Body */}
      {activeTab === "builder" && (
        <div className="space-y-6">
          {/* Action Bar: Add Section */}
          <div className="flex items-center justify-between">
            <div className="text-xs font-mono font-bold uppercase tracking-wider text-slate-400">
              Page Layout Sections
            </div>

            <div className="relative">
              <button
                type="button"
                onClick={() => setShowAddSectionMenu(!showAddSectionMenu)}
                className="bg-yellow-400 hover:bg-yellow-300 text-slate-950 font-bold px-3.5 py-1.5 rounded-xl text-xs flex items-center gap-1.5 transition shadow"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Section</span>
              </button>

              {showAddSectionMenu && (
                <div className="absolute right-0 top-full mt-2 w-56 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-2 z-30 space-y-1 text-xs">
                  <button
                    type="button"
                    onClick={() => handleAddSection("hero")}
                    className="w-full text-left px-3 py-2 rounded-xl hover:bg-slate-800 text-slate-200 hover:text-yellow-400 flex items-center gap-2 transition"
                  >
                    <Sparkles className="w-4 h-4 text-yellow-400" />
                    <div>
                      <div className="font-bold">Hero Banner</div>
                      <div className="text-[10px] text-slate-400">Headline & CTA buttons</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleAddSection("rich_text")}
                    className="w-full text-left px-3 py-2 rounded-xl hover:bg-slate-800 text-slate-200 hover:text-yellow-400 flex items-center gap-2 transition"
                  >
                    <Edit3 className="w-4 h-4 text-purple-400" />
                    <div>
                      <div className="font-bold">Rich Text (WYSIWYG)</div>
                      <div className="text-[10px] text-slate-400">Formatted body copy & links</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleAddSection("media_highlight")}
                    className="w-full text-left px-3 py-2 rounded-xl hover:bg-slate-800 text-slate-200 hover:text-yellow-400 flex items-center gap-2 transition"
                  >
                    <Video className="w-4 h-4 text-red-400" />
                    <div>
                      <div className="font-bold">Media Video Reel</div>
                      <div className="text-[10px] text-slate-400">YouTube video embed</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleAddSection("features")}
                    className="w-full text-left px-3 py-2 rounded-xl hover:bg-slate-800 text-slate-200 hover:text-yellow-400 flex items-center gap-2 transition"
                  >
                    <Layers className="w-4 h-4 text-blue-400" />
                    <div>
                      <div className="font-bold">Performance Features</div>
                      <div className="text-[10px] text-slate-400">3-card value props</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleAddSection("gig_feed_preview")}
                    className="w-full text-left px-3 py-2 rounded-xl hover:bg-slate-800 text-slate-200 hover:text-yellow-400 flex items-center gap-2 transition"
                  >
                    <Calendar className="w-4 h-4 text-emerald-400" />
                    <div>
                      <div className="font-bold">Upcoming Gig Feed</div>
                      <div className="text-[10px] text-slate-400">Live calendar preview</div>
                    </div>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Section Stack */}
          {(!activePage.sections || activePage.sections.length === 0) ? (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center text-slate-500 text-xs space-y-3">
              <Layers className="w-8 h-8 mx-auto text-slate-600" />
              <div>This page has no sections configured yet.</div>
              <button
                type="button"
                onClick={() => handleAddSection("rich_text")}
                className="bg-yellow-400 text-slate-950 font-bold px-4 py-2 rounded-xl text-xs"
              >
                Add First Section
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              {activePage.sections.map((section, idx) => (
                <div
                  key={section.id}
                  className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-lg transition-all"
                >
                  {/* Section Bar */}
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3 flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono font-bold bg-slate-950 text-slate-400 px-2 py-0.5 rounded border border-slate-800">
                        #{idx + 1}
                      </span>
                      <span className="text-xs font-extrabold uppercase text-white tracking-wider flex items-center gap-1.5">
                        {section.type === "hero" && <Sparkles className="w-3.5 h-3.5 text-yellow-400" />}
                        {section.type === "rich_text" && <Edit3 className="w-3.5 h-3.5 text-purple-400" />}
                        {section.type === "media_highlight" && <Video className="w-3.5 h-3.5 text-red-400" />}
                        {section.type === "features" && <Layers className="w-3.5 h-3.5 text-blue-400" />}
                        {section.type === "gig_feed_preview" && <Calendar className="w-3.5 h-3.5 text-emerald-400" />}
                        {section.type.replace("_", " ")}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        disabled={idx === 0}
                        onClick={() => handleMoveSection(idx, "up")}
                        className="p-1 text-slate-400 hover:text-white disabled:opacity-30 rounded hover:bg-slate-800"
                        title="Move Up"
                      >
                        <ArrowUp className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        disabled={idx === (activePage.sections?.length || 1) - 1}
                        onClick={() => handleMoveSection(idx, "down")}
                        className="p-1 text-slate-400 hover:text-white disabled:opacity-30 rounded hover:bg-slate-800"
                        title="Move Down"
                      >
                        <ArrowDown className="w-4 h-4" />
                      </button>
                      <div className="w-[1px] h-4 bg-slate-800 mx-1" />
                      <button
                        type="button"
                        onClick={() => handleRemoveSection(section.id)}
                        className="p-1 text-slate-400 hover:text-rose-400 rounded hover:bg-slate-800"
                        title="Delete Section"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Section Editor Form by Type */}
                  {section.type === "hero" && section.hero && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="sm:col-span-2">
                        <label className="text-[11px] font-semibold text-slate-300 block mb-1">Badge Text</label>
                        <input
                          type="text"
                          value={section.hero.badgeText}
                          onChange={(e) =>
                            handleUpdateSection(section.id, {
                              hero: { ...section.hero!, badgeText: e.target.value },
                            })
                          }
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-yellow-400"
                        />
                      </div>

                      <div className="sm:col-span-2">
                        <label className="text-[11px] font-semibold text-slate-300 block mb-1">Headline</label>
                        <input
                          type="text"
                          value={section.hero.headline}
                          onChange={(e) =>
                            handleUpdateSection(section.id, {
                              hero: { ...section.hero!, headline: e.target.value },
                            })
                          }
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-yellow-400"
                        />
                      </div>

                      <div className="sm:col-span-2">
                        <label className="text-[11px] font-semibold text-slate-300 block mb-1">Subheadline</label>
                        <textarea
                          rows={2}
                          value={section.hero.subheadline}
                          onChange={(e) =>
                            handleUpdateSection(section.id, {
                              hero: { ...section.hero!, subheadline: e.target.value },
                            })
                          }
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-yellow-400"
                        />
                      </div>

                      <div>
                        <label className="text-[11px] font-semibold text-slate-300 block mb-1">Primary CTA Button</label>
                        <input
                          type="text"
                          value={section.hero.ctaText}
                          onChange={(e) =>
                            handleUpdateSection(section.id, {
                              hero: { ...section.hero!, ctaText: e.target.value },
                            })
                          }
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-yellow-400"
                        />
                      </div>

                      <div>
                        <label className="text-[11px] font-semibold text-slate-300 block mb-1">Primary CTA Link</label>
                        <input
                          type="text"
                          value={section.hero.ctaHref}
                          onChange={(e) =>
                            handleUpdateSection(section.id, {
                              hero: { ...section.hero!, ctaHref: e.target.value },
                            })
                          }
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-yellow-400"
                        />
                      </div>
                    </div>
                  )}

                  {section.type === "rich_text" && section.richText && (
                    <div className="space-y-3">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div className="sm:col-span-2">
                          <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                            Section Title (Optional)
                          </label>
                          <input
                            type="text"
                            value={section.richText.title}
                            onChange={(e) =>
                              handleUpdateSection(section.id, {
                                richText: { ...section.richText!, title: e.target.value },
                              })
                            }
                            placeholder="e.g. Band History & Legacy"
                            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-yellow-400"
                          />
                        </div>

                        <div>
                          <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                            Alignment
                          </label>
                          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
                            <button
                              type="button"
                              onClick={() =>
                                handleUpdateSection(section.id, {
                                  richText: { ...section.richText!, alignment: "left" },
                                })
                              }
                              className={`flex-1 py-1 rounded-lg text-xs font-semibold flex items-center justify-center gap-1 transition ${
                                section.richText.alignment === "left"
                                  ? "bg-yellow-400 text-slate-950 shadow"
                                  : "text-slate-400"
                              }`}
                            >
                              <AlignLeft className="w-3.5 h-3.5" /> Left
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                handleUpdateSection(section.id, {
                                  richText: { ...section.richText!, alignment: "center" },
                                })
                              }
                              className={`flex-1 py-1 rounded-lg text-xs font-semibold flex items-center justify-center gap-1 transition ${
                                section.richText.alignment === "center"
                                  ? "bg-yellow-400 text-slate-950 shadow"
                                  : "text-slate-400"
                              }`}
                            >
                              <AlignCenter className="w-3.5 h-3.5" /> Center
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Secure WYSIWYG Editor */}
                      <div>
                        <label className="text-[11px] font-semibold text-slate-300 block mb-1.5 flex items-center justify-between">
                          <span>WYSIWYG Rich Text Content *</span>
                          <span className="text-[10px] font-mono text-emerald-400">DOMPurify Active</span>
                        </label>
                        <WysiwygEditor
                          value={section.richText.body}
                          onChange={(cleanBody) =>
                            handleUpdateSection(section.id, {
                              richText: { ...section.richText!, body: cleanBody },
                            })
                          }
                          placeholder="Compose your rich story copy, formatted lists, headings, and callout quotes..."
                        />
                      </div>
                    </div>
                  )}

                  {section.type === "media_highlight" && section.mediaHighlight && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="text-[11px] font-semibold text-slate-300 block mb-1">Section Title</label>
                        <input
                          type="text"
                          value={section.mediaHighlight.title}
                          onChange={(e) =>
                            handleUpdateSection(section.id, {
                              mediaHighlight: { ...section.mediaHighlight!, title: e.target.value },
                            })
                          }
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-yellow-400"
                        />
                      </div>

                      <div>
                        <label className="text-[11px] font-semibold text-slate-300 block mb-1">YouTube Video URL</label>
                        <input
                          type="text"
                          value={section.mediaHighlight.url}
                          onChange={(e) =>
                            handleUpdateSection(section.id, {
                              mediaHighlight: { ...section.mediaHighlight!, url: e.target.value },
                            })
                          }
                          placeholder="https://www.youtube.com/watch?v=..."
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-yellow-400"
                        />
                      </div>

                      <div className="sm:col-span-2">
                        <label className="text-[11px] font-semibold text-slate-300 block mb-1">Description</label>
                        <textarea
                          rows={2}
                          value={section.mediaHighlight.description}
                          onChange={(e) =>
                            handleUpdateSection(section.id, {
                              mediaHighlight: { ...section.mediaHighlight!, description: e.target.value },
                            })
                          }
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-yellow-400"
                        />
                      </div>
                    </div>
                  )}

                  {section.type === "features" && section.features && (
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="text-[11px] font-semibold text-slate-300 block mb-1">Section Title</label>
                          <input
                            type="text"
                            value={section.features.title}
                            onChange={(e) =>
                              handleUpdateSection(section.id, {
                                features: { ...section.features!, title: e.target.value },
                              })
                            }
                            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-yellow-400"
                          />
                        </div>

                        <div>
                          <label className="text-[11px] font-semibold text-slate-300 block mb-1">Subtitle</label>
                          <input
                            type="text"
                            value={section.features.subtitle}
                            onChange={(e) =>
                              handleUpdateSection(section.id, {
                                features: { ...section.features!, subtitle: e.target.value },
                              })
                            }
                            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-yellow-400"
                          />
                        </div>
                      </div>

                      <div className="space-y-2 pt-2">
                        <div className="flex items-center justify-between text-xs font-semibold text-slate-400">
                          <span>Feature Cards ({section.features.items?.length || 0})</span>
                          <button
                            type="button"
                            onClick={() => {
                              const items = [
                                ...(section.features?.items || []),
                                { icon: "Zap", title: "New Feature", description: "Highlight details..." },
                              ];
                              handleUpdateSection(section.id, {
                                features: { ...section.features!, items },
                              });
                            }}
                            className="text-yellow-400 hover:underline flex items-center gap-1"
                          >
                            <Plus className="w-3 h-3" /> Add Item
                          </button>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                          {section.features.items?.map((item, itemIdx) => (
                            <div key={itemIdx} className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-2">
                              <div className="flex items-center justify-between">
                                <input
                                  type="text"
                                  value={item.title}
                                  placeholder="Title"
                                  onChange={(e) => {
                                    const updated = [...section.features!.items];
                                    updated[itemIdx] = { ...updated[itemIdx], title: e.target.value };
                                    handleUpdateSection(section.id, {
                                      features: { ...section.features!, items: updated },
                                    });
                                  }}
                                  className="bg-transparent text-xs font-bold text-white focus:outline-none border-b border-slate-800 w-full pb-1"
                                />
                                <button
                                  type="button"
                                  onClick={() => {
                                    const updated = section.features!.items.filter((_, i) => i !== itemIdx);
                                    handleUpdateSection(section.id, {
                                      features: { ...section.features!, items: updated },
                                    });
                                  }}
                                  className="text-slate-500 hover:text-rose-400 pl-2"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>

                              <textarea
                                rows={2}
                                value={item.description}
                                placeholder="Description"
                                onChange={(e) => {
                                  const updated = [...section.features!.items];
                                  updated[itemIdx] = { ...updated[itemIdx], description: e.target.value };
                                  handleUpdateSection(section.id, {
                                    features: { ...section.features!, items: updated },
                                  });
                                }}
                                className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-[11px] text-slate-300 focus:outline-none"
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {section.type === "gig_feed_preview" && section.gigFeedPreview && (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div>
                        <label className="text-[11px] font-semibold text-slate-300 block mb-1">Section Title</label>
                        <input
                          type="text"
                          value={section.gigFeedPreview.title}
                          onChange={(e) =>
                            handleUpdateSection(section.id, {
                              gigFeedPreview: { ...section.gigFeedPreview!, title: e.target.value },
                            })
                          }
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-yellow-400"
                        />
                      </div>

                      <div>
                        <label className="text-[11px] font-semibold text-slate-300 block mb-1">Max Items Shown</label>
                        <input
                          type="number"
                          min="1"
                          max="10"
                          value={section.gigFeedPreview.maxItems}
                          onChange={(e) =>
                            handleUpdateSection(section.id, {
                              gigFeedPreview: {
                                ...section.gigFeedPreview!,
                                maxItems: parseInt(e.target.value) || 3,
                              },
                            })
                          }
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-yellow-400"
                        />
                      </div>

                      <div>
                        <label className="text-[11px] font-semibold text-slate-300 block mb-1">CTA Button Text</label>
                        <input
                          type="text"
                          value={section.gigFeedPreview.ctaText}
                          onChange={(e) =>
                            handleUpdateSection(section.id, {
                              gigFeedPreview: { ...section.gigFeedPreview!, ctaText: e.target.value },
                            })
                          }
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-yellow-400"
                        />
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Simulator / Live Preview Mode */}
      {activeTab === "preview" && (
        <div className="bg-slate-950 border border-slate-800 rounded-3xl p-6 sm:p-10 space-y-12 shadow-2xl">
          <div className="border-b border-slate-800 pb-4 flex items-center justify-between text-xs text-slate-400">
            <span className="font-mono text-yellow-400 font-bold uppercase">
              Simulator: /{activePage.slug === "home" ? "" : activePage.slug}
            </span>
            <span>Live Unsaved Preview</span>
          </div>

          {activePage.sections?.map((section) => (
            <div key={section.id} className="space-y-4">
              {section.type === "hero" && section.hero && (
                <div className="text-center space-y-4 max-w-3xl mx-auto py-8">
                  {section.hero.badgeText && (
                    <span className="inline-block bg-yellow-400/10 text-yellow-400 text-xs font-black uppercase px-3 py-1 rounded-full border border-yellow-400/20">
                      {section.hero.badgeText}
                    </span>
                  )}
                  <h2 className="text-3xl sm:text-5xl font-black text-white uppercase tracking-tight">
                    {section.hero.headline}
                  </h2>
                  <p className="text-sm text-slate-400 max-w-xl mx-auto">{section.hero.subheadline}</p>
                </div>
              )}

              {section.type === "rich_text" && section.richText && (
                <div
                  className={`max-w-3xl mx-auto space-y-3 ${
                    section.richText.alignment === "center" ? "text-center" : "text-left"
                  }`}
                >
                  {section.richText.title && (
                    <h3 className="text-2xl font-black text-white uppercase tracking-tight">
                      {section.richText.title}
                    </h3>
                  )}
                  <div
                    className="prose prose-invert prose-yellow max-w-none text-xs text-slate-300 leading-relaxed"
                    dangerouslySetInnerHTML={{ __html: sanitizeHtml(section.richText.body) }}
                  />
                </div>
              )}

              {section.type === "media_highlight" && section.mediaHighlight && (
                <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 text-center space-y-3 max-w-2xl mx-auto">
                  <span className="text-xs font-bold text-yellow-400 uppercase tracking-wider block">
                    {section.mediaHighlight.title}
                  </span>
                  <p className="text-xs text-slate-300">{section.mediaHighlight.description}</p>
                  <div className="text-xs text-slate-500 font-mono">
                    Video: {section.mediaHighlight.url}
                  </div>
                </div>
              )}

              {section.type === "features" && section.features && (
                <div className="space-y-4 max-w-4xl mx-auto text-center">
                  <h3 className="text-2xl font-black text-white uppercase">{section.features.title}</h3>
                  <p className="text-xs text-slate-400">{section.features.subtitle}</p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                    {section.features.items?.map((it, i) => (
                      <div key={i} className="bg-slate-900 p-4 rounded-2xl border border-slate-800 text-left space-y-1">
                        <div className="font-extrabold text-xs text-white">{it.title}</div>
                        <p className="text-[11px] text-slate-400 leading-relaxed">{it.description}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* SEO Studio Mode */}
      {activeTab === "seo" && (() => {
        const seo = activePage.seo || {
          metaTitle: "",
          metaDescription: "",
          keywords: "",
          ogImageUrl: "",
          ogType: "website" as const,
          canonicalUrl: "",
          noIndex: false,
          noFollow: false,
          structuredDataType: "WebPage" as const,
          structuredDataJson: "",
        };

        const effectiveTitle = seo.metaTitle.trim() || (activePage.id === "home" ? "Eagleburger Band | High-Energy Mobile Brass Band" : `${activePage.title} | Eagleburger Band`);
        const effectiveDesc = seo.metaDescription.trim() || activePage.description || "The Eagleburger Band brings high-energy acoustic brass and infectious drumline excitement to parades, festivals, and celebrations across Western PA.";
        const effectiveSlug = activePage.id === "home" ? "" : activePage.slug;
        const effectiveUrl = `https://eagleburgerband.com${effectiveSlug ? `/${effectiveSlug}` : ""}`;

        const titleLength = seo.metaTitle.length;
        const descLength = seo.metaDescription.length;

        // Health checks
        const hasTitle = Boolean(seo.metaTitle.trim());
        const titleLengthOptimal = titleLength >= 35 && titleLength <= 65;
        const hasDesc = Boolean(seo.metaDescription.trim());
        const descLengthOptimal = descLength >= 80 && descLength <= 165;
        const hasOgImage = Boolean(seo.ogImageUrl.trim());
        const isIndexed = !seo.noIndex;
        const isSlugClean = /^[a-z0-9-]+$/.test(activePage.slug);

        const checkList = [
          { label: "Meta Title configured", ok: hasTitle, hint: "Required for Google search results." },
          { label: "Meta Title length optimal (35–65 chars)", ok: titleLengthOptimal, hint: `Current: ${titleLength} chars.` },
          { label: "Meta Description configured", ok: hasDesc, hint: "Summarizes the page for search snippets." },
          { label: "Meta Description length optimal (80–165 chars)", ok: descLengthOptimal, hint: `Current: ${descLength} chars.` },
          { label: "Social Share Card Image set", ok: hasOgImage, hint: "Boosts engagement when shared on social media." },
          { label: "Search Indexing enabled", ok: isIndexed, hint: seo.noIndex ? "Page is marked noindex (hidden from search engines)." : "Search engines will index this page." },
          { label: "Clean URL slug structure", ok: isSlugClean, hint: `/${activePage.slug}` },
        ];

        const score = Math.round((checkList.filter(c => c.ok).length / checkList.length) * 100);

        const keywordChips = (seo.keywords || "")
          .split(",")
          .map(k => k.trim())
          .filter(Boolean);

        return (
          <div className="space-y-6 max-w-6xl">
            {/* Header / Overview Card */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-yellow-400/10 border border-yellow-400/20 text-yellow-400 text-xs font-mono font-bold uppercase tracking-wider mb-2">
                  <Search className="w-3.5 h-3.5" />
                  <span>SEO & Social Share Studio</span>
                </div>
                <h3 className="text-xl font-extrabold text-white">
                  Search Engine Optimization & Social Sharing
                </h3>
                <p className="text-xs text-slate-400 max-w-2xl mt-1">
                  Optimize how <strong className="text-white">/{activePage.slug}</strong> appears on Google Search, Facebook, Twitter/X, and messaging apps.
                </p>
              </div>

              {/* SEO Score Meter */}
              <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 min-w-[200px] text-right">
                <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400">SEO Health Score</div>
                <div className="text-2xl font-black text-white flex items-center justify-end gap-2 mt-0.5">
                  <span className={score >= 80 ? "text-emerald-400" : score >= 50 ? "text-yellow-400" : "text-amber-400"}>
                    {score}%
                  </span>
                  <span className="text-xs font-normal text-slate-500">/ 100</span>
                </div>
                <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden mt-2">
                  <div
                    className={`h-full transition-all duration-500 rounded-full ${
                      score >= 80 ? "bg-emerald-500" : score >= 50 ? "bg-yellow-400" : "bg-amber-400"
                    }`}
                    style={{ width: `${score}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Two Column Workspace: Left = Form Fields, Right = Live Simulators */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Left Column: SEO Form Controls (7 cols) */}
              <div className="lg:col-span-7 space-y-6">
                {/* Basic Meta Tags */}
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4 shadow">
                  <div className="border-b border-slate-800 pb-3 flex items-center justify-between">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                      <FileText className="w-4 h-4 text-yellow-400" />
                      Core Search Metadata
                    </h4>
                    <span className="text-[10px] text-slate-500 font-mono">Google SERP Directives</span>
                  </div>

                  {/* Meta Title */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-semibold text-slate-300">
                        Search Title (Meta Title)
                      </label>
                      <span
                        className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${
                          titleLength === 0
                            ? "text-slate-500 bg-slate-950 border-slate-800"
                            : titleLengthOptimal
                            ? "text-emerald-400 bg-emerald-500/10 border-emerald-500/30"
                            : titleLength > 65
                            ? "text-rose-400 bg-rose-500/10 border-rose-500/30"
                            : "text-yellow-400 bg-yellow-500/10 border-yellow-500/30"
                        }`}
                      >
                        {titleLength} / 60 chars {titleLength > 65 ? "(Too Long)" : titleLengthOptimal ? "(Optimal)" : ""}
                      </span>
                    </div>
                    <input
                      type="text"
                      placeholder={`${activePage.title} | Eagleburger Band`}
                      value={seo.metaTitle}
                      onChange={(e) => updateActivePageSeo({ metaTitle: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-yellow-400"
                    />
                    <p className="text-[11px] text-slate-400 leading-normal">
                      The title displayed in Google search results and browser tabs. Recommended between 40 and 60 characters.
                    </p>
                  </div>

                  {/* Meta Description */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-semibold text-slate-300">
                        Search Description (Meta Description)
                      </label>
                      <span
                        className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${
                          descLength === 0
                            ? "text-slate-500 bg-slate-950 border-slate-800"
                            : descLengthOptimal
                            ? "text-emerald-400 bg-emerald-500/10 border-emerald-500/30"
                            : descLength > 165
                            ? "text-rose-400 bg-rose-500/10 border-rose-500/30"
                            : "text-yellow-400 bg-yellow-500/10 border-yellow-500/30"
                        }`}
                      >
                        {descLength} / 160 chars {descLength > 165 ? "(Truncated in Google)" : descLengthOptimal ? "(Optimal)" : ""}
                      </span>
                    </div>
                    <textarea
                      rows={3}
                      placeholder={activePage.description || "The Eagleburger Band brings high-energy acoustic street brass to events across Western PA."}
                      value={seo.metaDescription}
                      onChange={(e) => updateActivePageSeo({ metaDescription: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-yellow-400 leading-relaxed"
                    />
                    <p className="text-[11px] text-slate-400 leading-normal">
                      A concise summary shown under the title on Google search results. Recommended between 120 and 160 characters.
                    </p>
                  </div>

                  {/* Target Keywords */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                      <Tag className="w-3.5 h-3.5 text-yellow-400" />
                      Target Keywords (Comma Separated)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. brass band, parade music, pittsburgh street band"
                      value={seo.keywords}
                      onChange={(e) => updateActivePageSeo({ keywords: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-yellow-400"
                    />
                    {keywordChips.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {keywordChips.map((chip, idx) => (
                          <span
                            key={idx}
                            className="bg-yellow-400/10 text-yellow-400 border border-yellow-400/20 px-2 py-0.5 rounded-lg text-[10px] font-medium"
                          >
                            #{chip}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* OpenGraph & Social Media Sharing */}
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4 shadow">
                  <div className="border-b border-slate-800 pb-3 flex items-center justify-between">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                      <Share2 className="w-4 h-4 text-cyan-400" />
                      Social Media Sharing (OpenGraph)
                    </h4>
                    <span className="text-[10px] text-slate-500 font-mono">Twitter, FB, LinkedIn</span>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-300">
                      Social Share Image URL (OG Image)
                    </label>
                    <input
                      type="url"
                      placeholder="https://eagleburgerband.com/images/band-hero.jpg"
                      value={seo.ogImageUrl}
                      onChange={(e) => updateActivePageSeo({ ogImageUrl: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-yellow-400 font-mono"
                    />
                    <p className="text-[11px] text-slate-400 leading-normal">
                      High-resolution image (recommended 1200 x 630 pixels) displayed when this page link is shared on Facebook, Twitter/X, Discord, or iMessage.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-300">OpenGraph Type</label>
                      <select
                        value={seo.ogType}
                        onChange={(e) => updateActivePageSeo({ ogType: e.target.value as "website" | "article" | "music.band" })}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-yellow-400"
                      >
                        <option value="website">website (Default)</option>
                        <option value="article">article (Story/Press)</option>
                        <option value="music.band">music.band (Ensemble)</option>
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-300">Canonical URL Override</label>
                      <input
                        type="url"
                        placeholder={effectiveUrl}
                        value={seo.canonicalUrl}
                        onChange={(e) => updateActivePageSeo({ canonicalUrl: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-yellow-400 font-mono"
                      />
                    </div>
                  </div>
                </div>

                {/* Robots Directives & Structured Data */}
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4 shadow">
                  <div className="border-b border-slate-800 pb-3 flex items-center justify-between">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                      <ShieldAlert className="w-4 h-4 text-emerald-400" />
                      Robots Directives & Schema.org Structured Data
                    </h4>
                    <span className="text-[10px] text-slate-500 font-mono">Advanced Crawlers</span>
                  </div>

                  {/* Robots Switches */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 flex items-center justify-between">
                      <div>
                        <div className="text-xs font-bold text-white">Index in Search Engines</div>
                        <div className="text-[10px] text-slate-400">
                          {seo.noIndex ? "noindex (Hidden from search)" : "index (Search visible)"}
                        </div>
                      </div>
                      <input
                        type="checkbox"
                        checked={!seo.noIndex}
                        onChange={(e) => updateActivePageSeo({ noIndex: !e.target.checked })}
                        className="w-4 h-4 rounded border-slate-800 bg-slate-900 text-yellow-400 cursor-pointer"
                      />
                    </div>

                    <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 flex items-center justify-between">
                      <div>
                        <div className="text-xs font-bold text-white">Follow Links</div>
                        <div className="text-[10px] text-slate-400">
                          {seo.noFollow ? "nofollow (Don't pass pagerank)" : "follow (Pass pagerank)"}
                        </div>
                      </div>
                      <input
                        type="checkbox"
                        checked={!seo.noFollow}
                        onChange={(e) => updateActivePageSeo({ noFollow: !e.target.checked })}
                        className="w-4 h-4 rounded border-slate-800 bg-slate-900 text-yellow-400 cursor-pointer"
                      />
                    </div>
                  </div>

                  {/* Structured Data Type */}
                  <div className="space-y-1.5 pt-2">
                    <label className="text-xs font-semibold text-slate-300">
                      Schema.org Structured Data (JSON-LD)
                    </label>
                    <select
                      value={seo.structuredDataType}
                      onChange={(e) => updateActivePageSeo({ structuredDataType: e.target.value as "none" | "MusicGroup" | "WebPage" | "Event" | "custom" })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-yellow-400"
                    >
                      <option value="WebPage">WebPage Schema (Standard search snippet)</option>
                      <option value="MusicGroup">MusicGroup Schema (Band, Ensemble rich snippet)</option>
                      <option value="Event">Event Schema (Live performances & schedule)</option>
                      <option value="custom">Custom JSON-LD</option>
                      <option value="none">None (Disable JSON-LD on this page)</option>
                    </select>
                  </div>

                  {seo.structuredDataType === "custom" && (
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-300">Custom JSON-LD Snippet</label>
                      <textarea
                        rows={5}
                        placeholder={`{\n  "@context": "https://schema.org",\n  "@type": "MusicGroup",\n  "name": "Eagleburger Band"\n}`}
                        value={seo.structuredDataJson}
                        onChange={(e) => updateActivePageSeo({ structuredDataJson: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-emerald-400 font-mono focus:outline-none focus:border-yellow-400"
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Right Column: Interactive Simulators (5 cols) */}
              <div className="lg:col-span-5 space-y-6">
                {/* Google SERP Snippet Preview */}
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3 shadow-xl sticky top-6">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                    <div className="flex items-center gap-2">
                      <Globe className="w-4 h-4 text-blue-400" />
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                        Google Search Preview
                      </h4>
                    </div>
                    {/* Device Toggle */}
                    <div className="flex items-center bg-slate-950 rounded-lg p-0.5 border border-slate-800 text-[10px]">
                      <button
                        type="button"
                        onClick={() => setSerpDevice("desktop")}
                        className={`px-2 py-1 rounded flex items-center gap-1 font-semibold transition ${
                          serpDevice === "desktop" ? "bg-slate-800 text-white" : "text-slate-400 hover:text-white"
                        }`}
                      >
                        <Monitor className="w-3 h-3" />
                        <span>Desktop</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setSerpDevice("mobile")}
                        className={`px-2 py-1 rounded flex items-center gap-1 font-semibold transition ${
                          serpDevice === "mobile" ? "bg-slate-800 text-white" : "text-slate-400 hover:text-white"
                        }`}
                      >
                        <Smartphone className="w-3 h-3" />
                        <span>Mobile</span>
                      </button>
                    </div>
                  </div>

                  {/* The Google SERP Result Box */}
                  <div className={`bg-[#202124] rounded-2xl p-4 border border-slate-700/50 space-y-1.5 font-sans ${
                    serpDevice === "mobile" ? "max-w-xs mx-auto" : ""
                  }`}>
                    {/* Favicon & Breadcrumb */}
                    <div className="flex items-center gap-2 text-[11px] text-[#dadce0]">
                      <div className="w-5 h-5 rounded-full bg-yellow-400 flex items-center justify-center text-slate-950 font-black text-[10px]">
                        E
                      </div>
                      <div className="leading-tight truncate">
                        <div className="font-medium text-[#bdc1c6] text-[11px]">Eagleburger Band</div>
                        <div className="text-[10px] text-[#9aa0a6] truncate font-mono">
                          {effectiveUrl}
                        </div>
                      </div>
                    </div>

                    {/* Blue Title Link */}
                    <div className="text-[#8ab4f8] hover:underline text-base font-medium cursor-pointer leading-snug line-clamp-2 pt-0.5">
                      {effectiveTitle}
                    </div>

                    {/* Snippet Description */}
                    <div className="text-xs text-[#bdc1c6] leading-relaxed line-clamp-2">
                      {effectiveDesc}
                    </div>
                  </div>

                  {/* Social Share Card Preview */}
                  <div className="pt-4 border-t border-slate-800 space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                        <Share2 className="w-3.5 h-3.5 text-cyan-400" />
                        Social Share Card Preview
                      </h4>
                      <span className="text-[10px] font-mono text-slate-500">Facebook & X</span>
                    </div>

                    <div className="bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden shadow">
                      {/* Image container */}
                      <div className="relative h-40 bg-slate-900 border-b border-slate-800 flex items-center justify-center overflow-hidden">
                        {seo.ogImageUrl ? (
                          /* eslint-disable-next-line @next/next/no-img-element */
                          <img
                            src={seo.ogImageUrl}
                            alt="Social Share Thumbnail"
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              e.currentTarget.style.display = "none";
                            }}
                          />
                        ) : (
                          <div className="text-center p-4 space-y-1">
                            <Sparkles className="w-6 h-6 text-yellow-400 mx-auto opacity-70" />
                            <div className="text-xs font-extrabold text-slate-300 tracking-wider">
                              EAGLEBURGER BAND
                            </div>
                            <div className="text-[10px] text-slate-500">
                              Add OG Image URL to display visual card
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Card Content */}
                      <div className="p-3 space-y-1 bg-slate-900/60">
                        <div className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">
                          eagleburgerband.com
                        </div>
                        <div className="text-xs font-bold text-white line-clamp-1">
                          {effectiveTitle}
                        </div>
                        <div className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">
                          {effectiveDesc}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* SEO Health Audit Checklist */}
                  <div className="pt-4 border-t border-slate-800 space-y-2.5">
                    <div className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                      SEO Quality Checklist
                    </div>
                    <div className="space-y-1.5 text-xs">
                      {checkList.map((item, i) => (
                        <div key={i} className="flex items-start gap-2 text-slate-300">
                          {item.ok ? (
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                          ) : (
                            <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                          )}
                          <div className="flex-1">
                            <div className={`text-[11px] font-medium ${item.ok ? "text-slate-200" : "text-amber-300"}`}>
                              {item.label}
                            </div>
                            <div className="text-[10px] text-slate-500">{item.hint}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Page Settings Mode */}
      {activeTab === "settings" && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6 shadow-xl max-w-2xl">
          <div className="border-b border-slate-800 pb-3 flex items-center justify-between">
            <div>
              <h3 className="text-base font-extrabold text-white">Page Settings & Metadata</h3>
              <p className="text-xs text-slate-400">Manage page title, public URL slug, and visibility.</p>
            </div>
            <button
              type="button"
              onClick={() => setActiveTab("seo")}
              className="px-3 py-1.5 bg-yellow-400/10 hover:bg-yellow-400/20 text-yellow-400 border border-yellow-400/30 rounded-xl text-xs font-bold transition flex items-center gap-1.5"
            >
              <Search className="w-3.5 h-3.5" />
              <span>SEO Tools</span>
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">Page Title *</label>
              <input
                type="text"
                required
                value={activePage.title}
                onChange={(e) => updateActivePage((prev) => ({ ...prev, title: e.target.value }))}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-yellow-400"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">
                URL Path Slug * {activePage.id === "home" && "(Home page slug is locked)"}
              </label>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono text-slate-500">eagleburgerband.com/</span>
                <input
                  type="text"
                  disabled={activePage.id === "home"}
                  value={activePage.slug}
                  onChange={(e) => updateActivePage((prev) => ({ ...prev, slug: e.target.value }))}
                  className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white font-mono focus:outline-none focus:border-yellow-400 disabled:opacity-50"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">Meta Description</label>
              <textarea
                rows={2}
                value={activePage.description}
                onChange={(e) => updateActivePage((prev) => ({ ...prev, description: e.target.value }))}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-yellow-400"
              />
            </div>

            <div className="flex items-center gap-2 pt-2">
              <input
                type="checkbox"
                id="pagePublished"
                checked={activePage.isPublished}
                onChange={(e) => updateActivePage((prev) => ({ ...prev, isPublished: e.target.checked }))}
                className="w-4 h-4 rounded border-slate-800 bg-slate-950 text-yellow-400 cursor-pointer"
              />
              <label htmlFor="pagePublished" className="text-xs text-slate-300 cursor-pointer">
                Page is published and accessible to the public
              </label>
            </div>

            {activePage.id !== "home" && (
              <div className="pt-6 border-t border-slate-800 flex justify-end">
                <button
                  type="button"
                  onClick={handleDeletePage}
                  className="text-xs font-semibold text-rose-400 hover:text-rose-300 flex items-center gap-1.5 transition"
                >
                  <Trash2 className="w-4 h-4" /> Delete this page
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* New Page Modal */}
      {isNewPageModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Globe className="w-5 h-5 text-yellow-400" />
                <h3 className="text-base font-extrabold text-white">Create New CMS Page</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsNewPageModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreatePage} className="space-y-4">
              <div>
                <label className="text-[11px] font-semibold text-slate-300 block mb-1">Page Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. About the Band, History, FAQs"
                  value={newPageTitle}
                  onChange={(e) => {
                    setNewPageTitle(e.target.value);
                    if (!newPageSlug) {
                      setNewPageSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, "-"));
                    }
                  }}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-yellow-400"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-300 block mb-1">URL Path Slug *</label>
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] font-mono text-slate-500">/</span>
                  <input
                    type="text"
                    required
                    placeholder="about"
                    value={newPageSlug}
                    onChange={(e) => setNewPageSlug(e.target.value)}
                    className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-yellow-400"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-300 block mb-1">Starting Template</label>
                <select
                  value={newPageTemplate}
                  onChange={(e) => setNewPageTemplate(e.target.value as "story" | "empty" | "media")}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-yellow-400"
                >
                  <option value="story">Story & History (Hero + Rich Text WYSIWYG)</option>
                  <option value="media">Media & Press (Hero + Video Reel)</option>
                  <option value="empty">Empty Canvas</option>
                </select>
              </div>

              {/* Expandable SEO drawer in creation modal */}
              <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-950/50">
                <button
                  type="button"
                  onClick={() => setShowNewPageSeoAccordion(!showNewPageSeoAccordion)}
                  className="w-full p-2.5 flex items-center justify-between text-left text-xs font-semibold text-slate-300 hover:text-white transition"
                >
                  <div className="flex items-center gap-1.5 text-yellow-400">
                    <Search className="w-3.5 h-3.5" />
                    <span>SEO & Search Presence (Optional)</span>
                  </div>
                  {showNewPageSeoAccordion ? (
                    <ChevronUp className="w-3.5 h-3.5 text-slate-400" />
                  ) : (
                    <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                  )}
                </button>

                {showNewPageSeoAccordion && (
                  <div className="p-3 border-t border-slate-800 space-y-3">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-[11px] font-semibold text-slate-300">
                          Meta Title
                        </label>
                        <span className="text-[10px] text-slate-500 font-mono">
                          {newPageMetaTitle.length} / 60
                        </span>
                      </div>
                      <input
                        type="text"
                        placeholder={newPageTitle ? `${newPageTitle} | Eagleburger Band` : "Custom search title"}
                        value={newPageMetaTitle}
                        onChange={(e) => setNewPageMetaTitle(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-yellow-400"
                      />
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-[11px] font-semibold text-slate-300">
                          Meta Description
                        </label>
                        <span className="text-[10px] text-slate-500 font-mono">
                          {newPageMetaDesc.length} / 160
                        </span>
                      </div>
                      <textarea
                        rows={2}
                        placeholder={newPageDesc || "Brief summary for search engine snippets"}
                        value={newPageMetaDesc}
                        onChange={(e) => setNewPageMetaDesc(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-yellow-400"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                        Target Keywords (Comma Separated)
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. brass band, parade, live music"
                        value={newPageKeywords}
                        onChange={(e) => setNewPageKeywords(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-yellow-400"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                        Social Share Image URL (OpenGraph)
                      </label>
                      <input
                        type="url"
                        placeholder="https://.../share-card.jpg"
                        value={newPageOgImage}
                        onChange={(e) => setNewPageOgImage(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-yellow-400 font-mono"
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsNewPageModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-yellow-400 hover:bg-yellow-300 text-slate-950 font-bold px-4 py-2 rounded-xl text-xs transition"
                >
                  Create Page
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
