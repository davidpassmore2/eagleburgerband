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
  PageHeaderImage,
  PageHeaderImageSchema,
  DEFAULT_SYSTEM_PAGES,
  DEFAULT_SYSTEM_PAGES_LIST,
  SYSTEM_PAGE_IDS,
} from "@/lib/schema/page";
import {
  SiteNavigation,
  SiteNavigationSchema,
  NavLink,
  SocialLink,
  SocialPlatform,
  DEFAULT_SOCIAL_LINKS,
} from "@/lib/schema/siteConfig";
import { WysiwygEditor } from "@/components/cms/WysiwygEditor";
import PublicSectionRenderer from "@/components/cms/PublicSectionRenderer";
import PublicPageHeader from "@/components/public/PublicPageHeader";
import { SocialIcon } from "@/components/ui/SocialIcon";
import { toast } from "@/lib/context/ToastContext";
import ResourceAssetPickerModal from "@/components/cms/ResourceAssetPickerModal";
import { ResourceAsset, ResourceCategory } from "@/lib/schema/resource";
import UnsavedChangesBar from "@/components/portal/UnsavedChangesBar";
import PortalBreadcrumb from "@/components/portal/PortalBreadcrumb";
import {
  Save,
  Eye,
  EyeOff,
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
  MoveVertical,
  FileText,
  Calendar,
  Settings,
  X,
  FolderOpen,
  Globe,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Image as ImageIcon,
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
  Compass,
  Megaphone,
  HelpCircle,
  MessageSquare,
  BarChart3,
  Send,
  Star,
  Sliders,
  Type,
} from "lucide-react";

export default function CMSPagesStudio() {
  const { profile, loading: authLoading } = useAuth();
  const [pages, setPages] = useState<ContentPage[]>(DEFAULT_SYSTEM_PAGES_LIST);
  const [selectedPageId, setSelectedPageId] = useState<string>("home");
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [studioScope, setStudioScope] = useState<"pages" | "global">("pages");
  const [globalNavTab, setGlobalNavTab] = useState<"header_nav" | "announcement" | "footer_social">("header_nav");
  const [simulatedActiveRoute, setSimulatedActiveRoute] = useState<string>("/gigs");
  const [activeTab, setActiveTab] = useState<"builder" | "banner" | "preview" | "seo" | "settings">("builder");

  // Saved baselines for dirty-state detection and discard/revert
  const [savedPagesState, setSavedPagesState] = useState<Record<string, string>>({});
  const [savedNavState, setSavedNavState] = useState<string>("");

  // Site Navigation & Announcement Banner State
  const [siteNav, setSiteNav] = useState<SiteNavigation>(() => SiteNavigationSchema.parse({}));
  const [isSavingNav, setIsSavingNav] = useState(false);
  const [navSavedSuccess, setNavSavedSuccess] = useState(false);

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

  // Resource Asset Picker Modal State
  const [isAssetPickerOpen, setIsAssetPickerOpen] = useState(false);
  const [pickerTarget, setPickerTarget] = useState<
    "header" | { sectionId: string; field: "heroBg" | "mediaUrl" } | "browse"
  >("browse");
  const [pickerFilterCategory, setPickerFilterCategory] = useState<ResourceCategory | "all">("all");

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

        // Ensure all DEFAULT_SYSTEM_PAGES_LIST are present if not yet saved in Firestore
        DEFAULT_SYSTEM_PAGES_LIST.forEach((sysPage) => {
          if (!pageMap.has(sysPage.id)) {
            pageMap.set(sysPage.id, sysPage);
          }
        });

        const loadedPages = Array.from(pageMap.values());
        const SYSTEM_ORDER = ["home", "gigs", "book", "join", "testimonials", "giving", "contact"];
        loadedPages.sort((a, b) => {
          const idxA = SYSTEM_ORDER.indexOf(a.id);
          const idxB = SYSTEM_ORDER.indexOf(b.id);
          if (idxA !== -1 && idxB !== -1) return idxA - idxB;
          if (idxA !== -1) return -1;
          if (idxB !== -1) return 1;
          return a.title.localeCompare(b.title);
        });

        setPages(loadedPages);
        setSavedPagesState((prev) => {
          const next = { ...prev };
          loadedPages.forEach((p) => {
            if (!next[p.id]) {
              next[p.id] = JSON.stringify(p);
            }
          });
          return next;
        });
        setLoading(false);
      },
      (err) => {
        console.warn("CMS Page collection listener error:", err);
        setLoading(false);
      }
    );

    const unsubNav = onSnapshot(
      doc(db, "site_navigation", "config"),
      (snap) => {
        if (snap.exists()) {
          const parsed = SiteNavigationSchema.safeParse(snap.data());
          if (parsed.success) {
            setSiteNav(parsed.data);
            setSavedNavState((prev) => prev || JSON.stringify(parsed.data));
          }
        }
      },
      (err) => console.warn("site_navigation listener error:", err)
    );

    return () => {
      unsub();
      unsubNav();
    };
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
    return uniquePages.find((p) => p.id === selectedPageId) || uniquePages[0] || DEFAULT_SYSTEM_PAGES.home;
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
      isVisible: true,
      background: "default",
      padding: "standard",
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
          subtitle: "Catch the Eagleburger Band live on the streets and stages of Pittsburgh",
          maxItems: 3,
          showVenueAddress: true,
          showTicketLinks: true,
          ctaText: "Full Schedule",
          ctaHref: "/gigs",
        },
      };
    } else if (type === "booking_form") {
      newSection = {
        ...newSection,
        bookingForm: {
          headline: "Book the Eagleburger Band",
          subheadline: "Bring mobile acoustic brass and high-energy drumline grooves to your festival, parade, or celebration.",
          badgeText: "Direct Event Inquiry",
          defaultEventType: "Community Parade & Festival",
          buttonText: "Submit Booking Inquiry",
        },
      };
    } else if (type === "testimonials") {
      newSection = {
        ...newSection,
        testimonials: {
          title: "What Organizers & Audiences Say",
          subtitle: "From parade routes to street festivals, hear the crowd reaction.",
          items: [
            {
              quote: "The Eagleburger Band brought unmatched energy to our parade. People were dancing in the streets!",
              author: "Sarah M.",
              roleOrEvent: "Community Festival Coordinator",
              rating: 5,
              avatarUrl: "",
              tag: "Parade",
            },
            {
              quote: "Completely acoustic and mobile. They marched right through the crowd and blew everyone away.",
              author: "David R.",
              roleOrEvent: "Art Festival Director",
              rating: 5,
              avatarUrl: "",
              tag: "Street Festival",
            },
          ],
        },
      };
    } else if (type === "faq") {
      newSection = {
        ...newSection,
        faq: {
          title: "Frequently Asked Questions",
          subtitle: "Everything you need to know about booking and performance logistics.",
          items: [
            {
              question: "Do you need electrical outlets or a stage?",
              answer: "None! The Eagleburger Band is 100% mobile and acoustic. We perform anywhere — streets, lawns, pavilions, stairwells, and parade routes.",
              category: "Logistics",
            },
            {
              question: "How large is the ensemble?",
              answer: "We typically march with 15 to 25 musicians featuring full brass (trumpets, trombones, sousaphones, saxophones) and a high-impact drumline battery.",
              category: "Ensemble",
            },
            {
              question: "How far in advance should we book?",
              answer: "For summer parades and festival weekends, booking 2 to 6 months in advance is recommended. However, we always welcome inquiries for upcoming events.",
              category: "Booking",
            },
          ],
        },
      };
    } else if (type === "cta_banner") {
      newSection = {
        ...newSection,
        ctaBanner: {
          headline: "Ready to Bring Unstoppable Brass Energy to Your Event?",
          subheadline: "Inquire today to check musician availability, rates, and custom parade setlists.",
          buttonText: "Book the Band Now",
          buttonHref: "/book",
          buttonStyle: "solid-yellow",
          secondaryButtonText: "View Schedule",
          secondaryButtonHref: "/gigs",
          secondaryButtonStyle: "outline",
          badgeText: "Live Street Brass",
          variant: "primary",
        },
      };
    } else if (type === "stats_counter") {
      newSection = {
        ...newSection,
        statsCounter: {
          title: "By the Numbers",
          subtitle: "Pittsburgh's most dynamic street brass sound.",
          metrics: [
            { value: "100%", label: "Acoustic & Mobile", description: "Zero cables or outlets required", icon: "Award" },
            { value: "50+", label: "Parades & Festivals", description: "Across Western Pennsylvania", icon: "Calendar" },
            { value: "25+", label: "Active Musicians", description: "Horns, saxes, sousaphones & battery", icon: "Users" },
            { value: "10K+", label: "Smiles Brought", description: "Dancing crowds at every downbeat", icon: "Sparkles" },
          ],
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

  // Site Navigation Management Handlers
  const handleSaveNavigation = async () => {
    setIsSavingNav(true);
    setNavSavedSuccess(false);
    try {
      const validated = SiteNavigationSchema.parse({
        ...siteNav,
        updatedAt: new Date().toISOString(),
      });
      await setDoc(doc(db, "site_navigation", "config"), validated);
      const serialized = JSON.stringify(validated);
      setSavedNavState(serialized);
      setNavSavedSuccess(true);
      toast.success("Site navigation saved!");
      setTimeout(() => setNavSavedSuccess(false), 3000);
    } catch (err) {
      toast.error("Failed to save site navigation: " + (err instanceof Error ? err.message : String(err)));
    } finally {
      setIsSavingNav(false);
    }
  };

  const handleMoveHeaderLink = (index: number, direction: "up" | "down") => {
    const links = [...siteNav.headerLinks];
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= links.length) return;
    const temp = links[index];
    links[index] = links[targetIndex];
    links[targetIndex] = temp;
    links.forEach((l, i) => {
      l.order = i + 1;
    });
    setSiteNav((prev) => ({ ...prev, headerLinks: links }));
  };

  const handleToggleHeaderLinkVisibility = (index: number) => {
    const links = [...siteNav.headerLinks];
    links[index] = { ...links[index], isVisible: !links[index].isVisible };
    setSiteNav((prev) => ({ ...prev, headerLinks: links }));
  };

  const handleUpdateHeaderLink = (index: number, patch: Partial<NavLink>) => {
    const links = [...siteNav.headerLinks];
    links[index] = { ...links[index], ...patch };
    setSiteNav((prev) => ({ ...prev, headerLinks: links }));
  };

  const handleRemoveHeaderLink = (index: number) => {
    const links = siteNav.headerLinks.filter((_, i) => i !== index);
    setSiteNav((prev) => ({ ...prev, headerLinks: links }));
  };

  const handleAddHeaderLink = (label = "New Link", href = "/") => {
    const newLink: NavLink = {
      id: `nav_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      label,
      href,
      isVisible: true,
      order: siteNav.headerLinks.length + 1,
      icon: "",
      isButton: false,
      isExternal: false,
      openInNewTab: false,
    };
    setSiteNav((prev) => ({ ...prev, headerLinks: [...prev.headerLinks, newLink] }));
  };

  const handleMoveFooterLink = (index: number, direction: "up" | "down") => {
    const links = [...siteNav.footerLinks];
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= links.length) return;
    const temp = links[index];
    links[index] = links[targetIndex];
    links[targetIndex] = temp;
    links.forEach((l, i) => {
      l.order = i + 1;
    });
    setSiteNav((prev) => ({ ...prev, footerLinks: links }));
  };

  const handleToggleFooterLinkVisibility = (index: number) => {
    const links = [...siteNav.footerLinks];
    links[index] = { ...links[index], isVisible: !links[index].isVisible };
    setSiteNav((prev) => ({ ...prev, footerLinks: links }));
  };

  const handleUpdateFooterLink = (index: number, patch: Partial<NavLink>) => {
    const links = [...siteNav.footerLinks];
    links[index] = { ...links[index], ...patch };
    setSiteNav((prev) => ({ ...prev, footerLinks: links }));
  };

  const handleRemoveFooterLink = (index: number) => {
    const links = siteNav.footerLinks.filter((_, i) => i !== index);
    setSiteNav((prev) => ({ ...prev, footerLinks: links }));
  };

  const handleAddFooterLink = (label = "New Footer Link", href = "/") => {
    const newLink: NavLink = {
      id: `nav_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      label,
      href,
      isVisible: true,
      order: siteNav.footerLinks.length + 1,
      icon: "",
      isButton: false,
      isExternal: false,
      openInNewTab: false,
    };
    setSiteNav((prev) => ({ ...prev, footerLinks: [...prev.footerLinks, newLink] }));
  };

  // Social Links Handlers
  const handleMoveSocialLink = (index: number, direction: "up" | "down") => {
    const socials = [...(siteNav.socialLinks || DEFAULT_SOCIAL_LINKS)];
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= socials.length) return;
    const temp = socials[index];
    socials[index] = socials[targetIndex];
    socials[targetIndex] = temp;
    socials.forEach((s, i) => {
      s.order = i + 1;
    });
    setSiteNav((prev) => ({ ...prev, socialLinks: socials }));
  };

  const handleToggleSocialLinkVisibility = (index: number) => {
    const socials = [...(siteNav.socialLinks || DEFAULT_SOCIAL_LINKS)];
    socials[index] = { ...socials[index], isVisible: !socials[index].isVisible };
    setSiteNav((prev) => ({ ...prev, socialLinks: socials }));
  };

  const handleUpdateSocialLink = (index: number, patch: Partial<SocialLink>) => {
    const socials = [...(siteNav.socialLinks || DEFAULT_SOCIAL_LINKS)];
    socials[index] = { ...socials[index], ...patch };
    setSiteNav((prev) => ({ ...prev, socialLinks: socials }));
  };

  const handleRemoveSocialLink = (index: number) => {
    const socials = (siteNav.socialLinks || DEFAULT_SOCIAL_LINKS).filter((_, i) => i !== index);
    setSiteNav((prev) => ({ ...prev, socialLinks: socials }));
  };

  const handleAddSocialLink = (
    platform: SocialPlatform = "custom",
    label = "Social Channel",
    href = "https://"
  ) => {
    const newSocial: SocialLink = {
      id: `soc_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      platform,
      label,
      href,
      isVisible: true,
      order: (siteNav.socialLinks?.length || 0) + 1,
    };
    setSiteNav((prev) => ({
      ...prev,
      socialLinks: [...(prev.socialLinks || DEFAULT_SOCIAL_LINKS), newSocial],
    }));
  };

  // Update Header Banner
  const updateHeaderImage = (updates: Partial<PageHeaderImage>) => {
    updateActivePage((prev) => {
      const current = prev.headerImage || PageHeaderImageSchema.parse({});
      return {
        ...prev,
        headerImage: {
          ...current,
          ...updates,
        },
      };
    });
  };

  // Banner Image Drag-to-Reposition State & Handlers
  const isDraggingBannerRef = React.useRef(false);
  const dragStartYRef = React.useRef(0);
  const dragStartPosRef = React.useRef(50);

  const handleBannerDragStart = (e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    isDraggingBannerRef.current = true;
    dragStartYRef.current = e.clientY;
    dragStartPosRef.current = activePage.headerImage?.verticalPosition ?? 50;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (!isDraggingBannerRef.current) return;
      const deltaY = moveEvent.clientY - dragStartYRef.current;
      // Dragging down (deltaY > 0) pulls image down, showing top (decreases verticalPosition)
      // Dragging up (deltaY < 0) pushes image up, showing bottom (increases verticalPosition)
      const deltaPercent = (deltaY / 120) * 100;
      const newPos = Math.max(0, Math.min(100, Math.round(dragStartPosRef.current - deltaPercent)));
      updateHeaderImage({ verticalPosition: newPos });
    };

    const handleMouseUp = () => {
      isDraggingBannerRef.current = false;
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
  };

  const handleBannerTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length !== 1) return;
    const touch = e.touches[0];
    isDraggingBannerRef.current = true;
    dragStartYRef.current = touch.clientY;
    dragStartPosRef.current = activePage.headerImage?.verticalPosition ?? 50;

    const handleTouchMove = (moveEvent: TouchEvent) => {
      if (!isDraggingBannerRef.current || moveEvent.touches.length !== 1) return;
      const moveTouch = moveEvent.touches[0];
      const deltaY = moveTouch.clientY - dragStartYRef.current;
      const deltaPercent = (deltaY / 120) * 100;
      const newPos = Math.max(0, Math.min(100, Math.round(dragStartPosRef.current - deltaPercent)));
      updateHeaderImage({ verticalPosition: newPos });
    };

    const handleTouchEnd = () => {
      isDraggingBannerRef.current = false;
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", handleTouchEnd);
    };

    window.addEventListener("touchmove", handleTouchMove);
    window.addEventListener("touchend", handleTouchEnd);
  };

  // Resource Asset Selection Handler
  const handleSelectAsset = (asset: ResourceAsset) => {
    if (pickerTarget === "header") {
      updateHeaderImage({
        imageUrl: asset.url,
        altText: asset.altText || asset.name,
      });
      toast.success(`Selected "${asset.name}" as page header banner.`);
    } else if (typeof pickerTarget === "object" && pickerTarget !== null) {
      if (pickerTarget.field === "heroBg") {
        const targetSec = activePage.sections?.find((s) => s.id === pickerTarget.sectionId);
        if (targetSec && targetSec.hero) {
          handleUpdateSection(pickerTarget.sectionId, {
            hero: { ...targetSec.hero, backgroundImageUrl: asset.url },
          });
          toast.success(`Set hero background to "${asset.name}".`);
        }
      } else if (pickerTarget.field === "mediaUrl") {
        const targetSec = activePage.sections?.find((s) => s.id === pickerTarget.sectionId);
        if (targetSec && targetSec.mediaHighlight) {
          handleUpdateSection(pickerTarget.sectionId, {
            mediaHighlight: { ...targetSec.mediaHighlight, url: asset.url },
          });
          toast.success(`Set media highlight URL to "${asset.name}".`);
        }
      }
    }
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
      const serialized = JSON.stringify(validated);
      setSavedPagesState((prev) => ({ ...prev, [activePage.id]: serialized }));
      setSavedSuccess(true);
      toast.success(`Page "${activePage.title}" saved successfully!`);
      setTimeout(() => setSavedSuccess(false), 3000);
    } catch (err) {
      toast.error("Failed to save CMS Page: " + (err instanceof Error ? err.message : String(err)));
    } finally {
      setIsSaving(false);
    }
  };

  // Discard Handlers
  const handleDiscardPageChanges = () => {
    const savedJson = savedPagesState[activePage.id];
    if (savedJson) {
      try {
        const parsed = JSON.parse(savedJson);
        setPages((prev) => prev.map((p) => (p.id === activePage.id ? parsed : p)));
        toast.info(`Discarded unsaved changes for "${activePage.title}".`);
      } catch (err) {
        console.error("Failed to discard page changes:", err);
      }
    }
  };

  const handleDiscardNavChanges = () => {
    if (savedNavState) {
      try {
        const parsed = JSON.parse(savedNavState);
        setSiteNav(parsed);
        toast.info("Discarded unsaved changes for global navigation.");
      } catch (err) {
        console.error("Failed to discard nav changes:", err);
      }
    }
  };

  // Compute Dirty State for active scope
  const isPageDirty = useMemo(() => {
    const savedJson = savedPagesState[activePage.id];
    if (!savedJson) return false;
    return JSON.stringify(activePage) !== savedJson;
  }, [activePage, savedPagesState]);

  const isNavDirty = useMemo(() => {
    if (!savedNavState) return false;
    return JSON.stringify(siteNav) !== savedNavState;
  }, [siteNav, savedNavState]);

  const isCurrentDirty = studioScope === "global" ? isNavDirty : isPageDirty;
  const isCurrentSaving = studioScope === "global" ? isSavingNav : isSaving;

  // Accidental window unload protection
  useEffect(() => {
    if (!isPageDirty && !isNavDirty) return;
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isPageDirty, isNavDirty]);

  // Create Page
  const handleCreatePage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPageTitle.trim()) return;

    const slug = (newPageSlug.trim() || newPageTitle.toLowerCase().replace(/[^a-z0-9]+/g, "-")).replace(/^-|-$/g, "");
    if (!slug) {
      toast.error("Please provide a valid page title or URL slug.");
      return;
    }
    const pageId = slug;

    if (pages.some((p) => p.id === pageId || p.slug === slug)) {
      toast.error(`A page with slug "/${slug}" already exists. Please choose a different title or slug.`);
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
          isVisible: true,
          background: "default",
          padding: "standard",
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
          isVisible: true,
          background: "default",
          padding: "standard",
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
          isVisible: true,
          background: "default",
          padding: "standard",
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
          isVisible: true,
          background: "default",
          padding: "standard",
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
      headerImage: PageHeaderImageSchema.parse({}),
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
      setSavedPagesState((prev) => ({ ...prev, [pageId]: JSON.stringify(validated) }));
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
      toast.success(`Page "${newPageTitle}" created!`);
    } catch (err) {
      toast.error("Failed to create page: " + (err instanceof Error ? err.message : String(err)));
    }
  };

  // Delete Page
  const handleDeletePage = async () => {
    if ((SYSTEM_PAGE_IDS as readonly string[]).includes(activePage.id)) {
      toast.error(`The "${activePage.title}" page is a core site page and cannot be deleted.`);
      return;
    }

    if (!confirm(`Are you sure you want to permanently delete the page "${activePage.title}"?`)) {
      return;
    }

    try {
      await deleteDoc(doc(db, "content_pages", activePage.id));
      setSavedPagesState((prev) => {
        const next = { ...prev };
        delete next[activePage.id];
        return next;
      });
      setPages((prev) => prev.filter((p) => p.id !== activePage.id));
      setSelectedPageId("home");
      toast.success(`Page "${activePage.title}" deleted.`);
    } catch (err) {
      toast.error("Failed to delete page: " + (err instanceof Error ? err.message : String(err)));
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
    <div className={`p-4 sm:p-6 max-w-7xl mx-auto space-y-6 transition-all ${isCurrentDirty ? "pb-28 sm:pb-32" : ""}`}>
      <PortalBreadcrumb className="mb-2" />
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
            onClick={studioScope === "global" ? handleSaveNavigation : handleSavePage}
            disabled={isCurrentSaving || !isCurrentDirty}
            className={`inline-flex items-center gap-2 font-black px-5 py-2.5 rounded-xl text-xs uppercase tracking-wider transition shadow-lg ${
              !isCurrentDirty
                ? "bg-slate-800 text-slate-500 border border-slate-700/60 cursor-not-allowed shadow-none"
                : "bg-yellow-400 hover:bg-yellow-300 text-slate-950 cursor-pointer shadow-yellow-400/20"
            }`}
          >
            {isCurrentSaving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (studioScope === "global" ? navSavedSuccess : savedSuccess) ? (
              <Check className="w-4 h-4 text-emerald-950" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            <span>
              {studioScope === "global"
                ? isSavingNav
                  ? "Saving Global Config..."
                  : navSavedSuccess
                  ? "Global Config Saved!"
                  : isNavDirty
                  ? "Save Global Nav & Alerts"
                  : "Global Nav Saved"
                : isSaving
                ? "Saving Page..."
                : savedSuccess
                ? "Page Saved!"
                : isPageDirty
                ? `Save Page: ${activePage.title}`
                : `Saved: ${activePage.title}`}
            </span>
          </button>
        </div>
      </div>

      {/* Primary Scope Switcher: Page Content vs Global Site Header & Alerts */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-2.5 flex items-center justify-between flex-wrap gap-3 shadow-md">
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => setStudioScope("pages")}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-2 relative ${
              studioScope === "pages"
                ? "bg-yellow-400 text-slate-950 font-black shadow-md shadow-yellow-400/20 ring-2 ring-yellow-400/40"
                : "bg-slate-950 text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-800"
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Page Content Studio</span>
            {isPageDirty && (
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" title="Unsaved page changes" />
            )}
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-900 text-slate-400 font-mono">
              Individual Pages
            </span>
          </button>

          <button
            type="button"
            onClick={() => setStudioScope("global")}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-2 relative ${
              studioScope === "global"
                ? "bg-yellow-400 text-slate-950 font-black shadow-md shadow-yellow-400/20 ring-2 ring-yellow-400/40"
                : "bg-slate-950 text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-800"
            }`}
          >
            <Globe className="w-4 h-4" />
            <span>Global Public Site Nav &amp; Alerts</span>
            {isNavDirty && (
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" title="Unsaved global navigation changes" />
            )}
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-900 text-yellow-400 font-mono font-bold">
              Global Header &amp; Alerts
            </span>
          </button>
        </div>

        <div className="text-xs text-slate-400 font-mono px-2 hidden lg:block">
          {studioScope === "pages"
            ? `Editing Page: ${activePage.title} (/${activePage.slug === "home" ? "" : activePage.slug})`
            : "Global Public Site: Header Nav, Announcement Alert, Footer & Social Links"}
        </div>
      </div>

      {studioScope === "pages" && (
        <>
          {/* 1. DISTINCT SECTION: PAGE SELECTOR */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-3.5 shadow-md">
            <div className="flex items-center justify-between flex-wrap gap-2.5 pb-2.5 border-b border-slate-800/80">
              <div className="flex items-center gap-2.5">
                <div className="w-2.5 h-2.5 rounded-full bg-yellow-400 shrink-0" />
                <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-yellow-400">
                  Page Selector
                </h2>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700 font-mono">
                  {uniquePages.length} Pages Available
                </span>
              </div>

              <button
                type="button"
                onClick={() => setIsNewPageModalOpen(true)}
                className="px-3.5 py-1.5 rounded-xl text-xs font-bold text-yellow-400 hover:text-slate-950 hover:bg-yellow-400 border border-yellow-400/40 hover:border-yellow-400 bg-yellow-400/10 transition flex items-center gap-1.5 shrink-0 shadow-sm"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>New Custom Page</span>
              </button>
            </div>

            {/* Page Selection Buttons (Wrapping) */}
            <div className="flex flex-wrap items-center gap-2">
              {uniquePages.map((p) => {
                const isSelected = p.id === selectedPageId;
                const pageHasUnsaved = Boolean(savedPagesState[p.id] && JSON.stringify(p) !== savedPagesState[p.id]);
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => {
                      setSelectedPageId(p.id);
                    }}
                    className={`px-4 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-2.5 shrink-0 border ${
                      isSelected
                        ? "bg-yellow-400 text-slate-950 border-yellow-400 shadow-md shadow-yellow-400/20 ring-2 ring-yellow-400/40 font-black"
                        : "bg-slate-950 text-slate-300 border-slate-800 hover:bg-slate-800/80 hover:text-white"
                    }`}
                  >
                    <FileText className={`w-3.5 h-3.5 ${isSelected ? "text-slate-950" : "text-yellow-400"}`} />
                    <span className="tracking-wide">{p.title}</span>
                    {pageHasUnsaved && (
                      <span
                        className="w-2 h-2 rounded-full bg-amber-400 ring-2 ring-amber-400/30 animate-pulse"
                        title="Unsaved changes in memory"
                      />
                    )}
                    <span
                      className={`w-2 h-2 rounded-full ${
                        p.isPublished ? "bg-emerald-500" : "bg-slate-500"
                      }`}
                      title={p.isPublished ? "Published" : "Draft"}
                    />
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. DISTINCT SECTION: PAGE FUNCTION & TOOL SELECTOR */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-3.5 shadow-md">
            {/* Section Header with Active Page context */}
            <div className="flex items-center justify-between flex-wrap gap-2.5 pb-2.5 border-b border-slate-800/80">
              <div className="flex items-center gap-3 flex-wrap">
                <div className="w-2.5 h-2.5 rounded-full bg-yellow-400 shrink-0" />
                <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-yellow-400">
                  Function Selector
                </h2>
                <span className="text-slate-600 font-mono text-xs hidden sm:inline">•</span>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider font-semibold">
                    Active Page:
                  </span>
                  <span className="text-white font-extrabold text-sm tracking-tight">
                    {activePage.title}
                  </span>
                  <span className="text-slate-500 font-mono text-xs">
                    (/{activePage.slug === "home" ? "" : activePage.slug})
                  </span>
                </div>
              </div>

              {/* Active Page Status Badge */}
              <span
                className={`text-[10px] font-mono px-2.5 py-0.5 rounded-full uppercase font-bold border shrink-0 ${
                  activePage.isPublished
                    ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                    : "bg-amber-500/10 text-amber-400 border-amber-500/30"
                }`}
              >
                {activePage.isPublished ? "● Published" : "○ Draft"}
              </span>
            </div>

            {/* Function Ribbon (Wrapping) */}
            <div className="flex flex-wrap items-center gap-2 bg-slate-950 p-2 rounded-xl border border-slate-800">
              <button
                type="button"
                onClick={() => setActiveTab("builder")}
                className={`px-3.5 py-2 rounded-lg text-xs font-bold transition flex items-center gap-1.5 shrink-0 ${
                  activeTab === "builder"
                    ? "bg-yellow-400 text-slate-950 shadow font-black"
                    : "text-slate-400 hover:text-white hover:bg-slate-900"
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Section Builder ({activePage.sections?.length || 0})</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("banner")}
                className={`px-3.5 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 transition shrink-0 ${
                  activeTab === "banner"
                    ? "bg-yellow-400 text-slate-950 shadow font-black"
                    : "text-slate-400 hover:text-white hover:bg-slate-900"
                }`}
              >
                <ImageIcon className="w-3.5 h-3.5" />
                <span>Page Banner {activePage.headerImage?.imageUrl ? "● Set" : ""}</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("seo")}
                className={`px-3.5 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 transition shrink-0 ${
                  activeTab === "seo"
                    ? "bg-yellow-400 text-slate-950 shadow font-black"
                    : "text-slate-400 hover:text-white hover:bg-slate-900"
                }`}
              >
                <Search className="w-3.5 h-3.5" />
                <span>SEO Studio</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("settings")}
                className={`px-3.5 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 transition shrink-0 ${
                  activeTab === "settings"
                    ? "bg-yellow-400 text-slate-950 shadow font-black"
                    : "text-slate-400 hover:text-white hover:bg-slate-900"
                }`}
              >
                <Settings className="w-3.5 h-3.5" />
                <span>Page Settings</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("preview")}
                className={`px-3.5 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 transition shrink-0 ${
                  activeTab === "preview"
                    ? "bg-yellow-400 text-slate-950 shadow font-black"
                    : "text-slate-400 hover:text-white hover:bg-slate-900"
                }`}
              >
                <Eye className="w-3.5 h-3.5" />
                <span>Simulator</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setPickerTarget("browse");
                  setPickerFilterCategory("all");
                  setIsAssetPickerOpen(true);
                }}
                className="px-3.5 py-2 rounded-lg text-xs font-bold text-yellow-400 hover:text-slate-950 hover:bg-yellow-400 border border-yellow-400/30 hover:border-yellow-400 bg-yellow-400/10 transition flex items-center gap-1.5 shrink-0 shadow-sm"
                title="Browse all images, documents, and media resources"
              >
                <FolderOpen className="w-3.5 h-3.5" />
                <span>Resource Library</span>
              </button>

              <button
                type="button"
                onClick={() => setStudioScope("global")}
                className="px-3.5 py-2 rounded-lg text-xs font-bold text-slate-300 hover:text-yellow-400 border border-slate-700 hover:border-yellow-400 bg-slate-900 transition flex items-center gap-1.5 shrink-0 ml-auto"
                title="Switch to Global Navigation & Banners Studio"
              >
                <Globe className="w-3.5 h-3.5 text-yellow-400" />
                <span>Global Nav &amp; Banners &rarr;</span>
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
                <div className="absolute right-0 top-full mt-2 w-64 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-2 z-30 space-y-1 text-xs max-h-96 overflow-y-auto">
                  <button
                    type="button"
                    onClick={() => handleAddSection("hero")}
                    className="w-full text-left px-3 py-2 rounded-xl hover:bg-slate-800 text-slate-200 hover:text-yellow-400 flex items-center gap-2 transition"
                  >
                    <Sparkles className="w-4 h-4 text-yellow-400 shrink-0" />
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
                    <Edit3 className="w-4 h-4 text-purple-400 shrink-0" />
                    <div>
                      <div className="font-bold">Rich Text (WYSIWYG)</div>
                      <div className="text-[10px] text-slate-400">Formatted body copy & links</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleAddSection("booking_form")}
                    className="w-full text-left px-3 py-2 rounded-xl hover:bg-slate-800 text-slate-200 hover:text-yellow-400 flex items-center gap-2 transition"
                  >
                    <Send className="w-4 h-4 text-yellow-400 shrink-0" />
                    <div>
                      <div className="font-bold">Booking Request Form</div>
                      <div className="text-[10px] text-slate-400">Preset lead inquiry form</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleAddSection("testimonials")}
                    className="w-full text-left px-3 py-2 rounded-xl hover:bg-slate-800 text-slate-200 hover:text-yellow-400 flex items-center gap-2 transition"
                  >
                    <MessageSquare className="w-4 h-4 text-sky-400 shrink-0" />
                    <div>
                      <div className="font-bold">Reviews & Testimonials</div>
                      <div className="text-[10px] text-slate-400">Organizer quotes & ratings</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleAddSection("faq")}
                    className="w-full text-left px-3 py-2 rounded-xl hover:bg-slate-800 text-slate-200 hover:text-yellow-400 flex items-center gap-2 transition"
                  >
                    <HelpCircle className="w-4 h-4 text-teal-400 shrink-0" />
                    <div>
                      <div className="font-bold">FAQ Accordion</div>
                      <div className="text-[10px] text-slate-400">Logistics & common questions</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleAddSection("cta_banner")}
                    className="w-full text-left px-3 py-2 rounded-xl hover:bg-slate-800 text-slate-200 hover:text-yellow-400 flex items-center gap-2 transition"
                  >
                    <Megaphone className="w-4 h-4 text-amber-400 shrink-0" />
                    <div>
                      <div className="font-bold">CTA Callout Banner</div>
                      <div className="text-[10px] text-slate-400">High-impact action card</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleAddSection("stats_counter")}
                    className="w-full text-left px-3 py-2 rounded-xl hover:bg-slate-800 text-slate-200 hover:text-yellow-400 flex items-center gap-2 transition"
                  >
                    <BarChart3 className="w-4 h-4 text-indigo-400 shrink-0" />
                    <div>
                      <div className="font-bold">Metrics Counter</div>
                      <div className="text-[10px] text-slate-400">Ensemble key stats</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleAddSection("media_highlight")}
                    className="w-full text-left px-3 py-2 rounded-xl hover:bg-slate-800 text-slate-200 hover:text-yellow-400 flex items-center gap-2 transition"
                  >
                    <Video className="w-4 h-4 text-red-400 shrink-0" />
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
                    <Layers className="w-4 h-4 text-blue-400 shrink-0" />
                    <div>
                      <div className="font-bold">Performance Features</div>
                      <div className="text-[10px] text-slate-400">Feature value props</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleAddSection("gig_feed_preview")}
                    className="w-full text-left px-3 py-2 rounded-xl hover:bg-slate-800 text-slate-200 hover:text-yellow-400 flex items-center gap-2 transition"
                  >
                    <Calendar className="w-4 h-4 text-emerald-400 shrink-0" />
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
                  className={`bg-slate-900 border rounded-2xl p-5 space-y-4 shadow-lg transition-all ${
                    section.isVisible === false ? "border-slate-800/60 opacity-60 bg-slate-900/50" : "border-slate-800"
                  }`}
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
                        {section.type === "booking_form" && <Send className="w-3.5 h-3.5 text-yellow-400" />}
                        {section.type === "testimonials" && <MessageSquare className="w-3.5 h-3.5 text-sky-400" />}
                        {section.type === "faq" && <HelpCircle className="w-3.5 h-3.5 text-teal-400" />}
                        {section.type === "cta_banner" && <Megaphone className="w-3.5 h-3.5 text-amber-400" />}
                        {section.type === "stats_counter" && <BarChart3 className="w-3.5 h-3.5 text-indigo-400" />}
                        {section.type === "media_highlight" && <Video className="w-3.5 h-3.5 text-red-400" />}
                        {section.type === "features" && <Layers className="w-3.5 h-3.5 text-blue-400" />}
                        {section.type === "gig_feed_preview" && <Calendar className="w-3.5 h-3.5 text-emerald-400" />}
                        {section.type.replace("_", " ")}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      {/* Section Visibility Toggle */}
                      <button
                        type="button"
                        onClick={() =>
                          handleUpdateSection(section.id, {
                            isVisible: section.isVisible === false ? true : false,
                          })
                        }
                        className={`px-2 py-1 rounded-lg text-xs font-mono font-semibold flex items-center gap-1.5 transition ${
                          section.isVisible !== false
                            ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                            : "bg-slate-800 text-slate-500 border border-slate-700 line-through"
                        }`}
                        title={section.isVisible !== false ? "Visible on public site" : "Hidden from public site"}
                      >
                        {section.isVisible !== false ? (
                          <Eye className="w-3 h-3" />
                        ) : (
                          <EyeOff className="w-3 h-3" />
                        )}
                        <span>{section.isVisible !== false ? "Visible" : "Hidden"}</span>
                      </button>

                      {/* Section Background Preset */}
                      <select
                        value={section.background || "default"}
                        onChange={(e) =>
                          handleUpdateSection(section.id, {
                            background: e.target.value as "default" | "surface" | "gradient" | "muted",
                          })
                        }
                        className="bg-slate-950 border border-slate-800 text-[11px] text-slate-300 rounded-lg px-2 py-1 focus:outline-none focus:border-yellow-400 font-mono"
                        title="Section Background Style"
                      >
                        <option value="default">Bg: Default</option>
                        <option value="surface">Bg: Surface</option>
                        <option value="gradient">Bg: Gradient</option>
                        <option value="muted">Bg: Muted</option>
                      </select>

                      {/* Section Padding Preset */}
                      <select
                        value={section.padding || "standard"}
                        onChange={(e) =>
                          handleUpdateSection(section.id, {
                            padding: e.target.value as "compact" | "standard" | "generous",
                          })
                        }
                        className="bg-slate-950 border border-slate-800 text-[11px] text-slate-300 rounded-lg px-2 py-1 focus:outline-none focus:border-yellow-400 font-mono"
                        title="Section Padding Spacing"
                      >
                        <option value="compact">Pad: Compact</option>
                        <option value="standard">Pad: Standard</option>
                        <option value="generous">Pad: Generous</option>
                      </select>

                      <div className="w-[1px] h-4 bg-slate-800 mx-0.5" />

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
                      <div className="w-[1px] h-4 bg-slate-800 mx-0.5" />
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

                      <div className="sm:col-span-2">
                        <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                          Hero Background Image URL (Optional)
                        </label>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={section.hero.backgroundImageUrl || ""}
                            onChange={(e) =>
                              handleUpdateSection(section.id, {
                                hero: { ...section.hero!, backgroundImageUrl: e.target.value },
                              })
                            }
                            placeholder="e.g. https://... or select from Resource Library"
                            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-yellow-400 font-mono"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              setPickerTarget({ sectionId: section.id, field: "heroBg" });
                              setPickerFilterCategory("hero");
                              setIsAssetPickerOpen(true);
                            }}
                            className="px-3.5 py-2 rounded-xl bg-yellow-400/10 border border-yellow-400/30 hover:bg-yellow-400 hover:text-slate-950 text-yellow-400 text-xs font-bold transition flex items-center gap-1.5 shrink-0"
                            title="Browse Resource Library"
                          >
                            <FolderOpen className="w-3.5 h-3.5" />
                            <span>Browse Library</span>
                          </button>
                        </div>
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
                        <label className="text-[11px] font-semibold text-slate-300 block mb-1">YouTube Video / Media URL</label>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={section.mediaHighlight.url}
                            onChange={(e) =>
                              handleUpdateSection(section.id, {
                                mediaHighlight: { ...section.mediaHighlight!, url: e.target.value },
                              })
                            }
                            placeholder="https://www.youtube.com/watch?v=... or media URL"
                            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-yellow-400 font-mono"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              setPickerTarget({ sectionId: section.id, field: "mediaUrl" });
                              setPickerFilterCategory("all");
                              setIsAssetPickerOpen(true);
                            }}
                            className="px-3.5 py-2 rounded-xl bg-yellow-400/10 border border-yellow-400/30 hover:bg-yellow-400 hover:text-slate-950 text-yellow-400 text-xs font-bold transition flex items-center gap-1.5 shrink-0"
                            title="Browse Resource Library"
                          >
                            <FolderOpen className="w-3.5 h-3.5" />
                            <span>Browse</span>
                          </button>
                        </div>
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
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                        <label className="text-[11px] font-semibold text-slate-300 block mb-1">Subtitle (Optional)</label>
                        <input
                          type="text"
                          value={section.gigFeedPreview.subtitle || ""}
                          placeholder="e.g. Catch the Eagleburger Band live"
                          onChange={(e) =>
                            handleUpdateSection(section.id, {
                              gigFeedPreview: { ...section.gigFeedPreview!, subtitle: e.target.value },
                            })
                          }
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-yellow-400"
                        />
                      </div>

                      <div>
                        <label className="text-[11px] font-semibold text-slate-300 block mb-1">Max Items Shown (1-10)</label>
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

                      <div>
                        <label className="text-[11px] font-semibold text-slate-300 block mb-1">CTA Target Link</label>
                        <input
                          type="text"
                          value={section.gigFeedPreview.ctaHref || "/gigs"}
                          onChange={(e) =>
                            handleUpdateSection(section.id, {
                              gigFeedPreview: { ...section.gigFeedPreview!, ctaHref: e.target.value },
                            })
                          }
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-yellow-400"
                        />
                      </div>

                      <div className="flex items-center gap-6 pt-5">
                        <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300">
                          <input
                            type="checkbox"
                            checked={section.gigFeedPreview.showVenueAddress !== false}
                            onChange={(e) =>
                              handleUpdateSection(section.id, {
                                gigFeedPreview: { ...section.gigFeedPreview!, showVenueAddress: e.target.checked },
                              })
                            }
                            className="rounded bg-slate-950 border-slate-700 text-yellow-400 focus:ring-0"
                          />
                          <span>Show Venue Address</span>
                        </label>

                        <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300">
                          <input
                            type="checkbox"
                            checked={section.gigFeedPreview.showTicketLinks !== false}
                            onChange={(e) =>
                              handleUpdateSection(section.id, {
                                gigFeedPreview: { ...section.gigFeedPreview!, showTicketLinks: e.target.checked },
                              })
                            }
                            className="rounded bg-slate-950 border-slate-700 text-yellow-400 focus:ring-0"
                          />
                          <span>Show Ticket Links</span>
                        </label>
                      </div>
                    </div>
                  )}

                  {section.type === "booking_form" && (
                    <div className="space-y-4">
                      <div className="bg-yellow-400/5 border border-yellow-400/20 rounded-xl p-3.5 flex items-start gap-3 text-xs text-yellow-300">
                        <Send className="w-4 h-4 shrink-0 text-yellow-400 mt-0.5" />
                        <div className="space-y-1">
                          <div className="font-bold">Dynamic Booking Request Preset</div>
                          <div className="text-[11px] text-slate-400 leading-relaxed">
                            Embeds the full public event inquiry form with honeypot bot trap, submission cooldown, and DOMPurify sanitization. Inquiries directly route to Portal Inquiries and CRM Booking Leads.
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="text-[11px] font-semibold text-slate-300 block mb-1">Badge Text</label>
                          <input
                            type="text"
                            value={section.bookingForm?.badgeText ?? "Direct Event Inquiry"}
                            onChange={(e) =>
                              handleUpdateSection(section.id, {
                                bookingForm: {
                                  headline: section.bookingForm?.headline || "Book the Eagleburger Band",
                                  subheadline: section.bookingForm?.subheadline || "",
                                  badgeText: e.target.value,
                                  defaultEventType: section.bookingForm?.defaultEventType || "Community Parade & Festival",
                                  buttonText: section.bookingForm?.buttonText || "Submit Booking Inquiry",
                                },
                              })
                            }
                            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-yellow-400"
                          />
                        </div>

                        <div>
                          <label className="text-[11px] font-semibold text-slate-300 block mb-1">Default Event Type</label>
                          <select
                            value={section.bookingForm?.defaultEventType ?? "Community Parade & Festival"}
                            onChange={(e) =>
                              handleUpdateSection(section.id, {
                                bookingForm: {
                                  headline: section.bookingForm?.headline || "Book the Eagleburger Band",
                                  subheadline: section.bookingForm?.subheadline || "",
                                  badgeText: section.bookingForm?.badgeText || "Direct Event Inquiry",
                                  defaultEventType: e.target.value,
                                  buttonText: section.bookingForm?.buttonText || "Submit Booking Inquiry",
                                },
                              })
                            }
                            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-yellow-400"
                          >
                            <option value="Community Parade & Festival">Community Parade & Festival</option>
                            <option value="Wedding / Private Celebration">Wedding / Private Celebration</option>
                            <option value="Street Party / Porchfest">Street Party / Porchfest</option>
                            <option value="Corporate / Brewery Event">Corporate / Brewery Event</option>
                            <option value="School / Educational Clinic">School / Educational Clinic</option>
                            <option value="Other High-Energy Gathering">Other High-Energy Gathering</option>
                          </select>
                        </div>

                        <div className="sm:col-span-2">
                          <label className="text-[11px] font-semibold text-slate-300 block mb-1">Headline</label>
                          <input
                            type="text"
                            value={section.bookingForm?.headline ?? "Book the Eagleburger Band"}
                            onChange={(e) =>
                              handleUpdateSection(section.id, {
                                bookingForm: {
                                  headline: e.target.value,
                                  subheadline: section.bookingForm?.subheadline || "",
                                  badgeText: section.bookingForm?.badgeText || "Direct Event Inquiry",
                                  defaultEventType: section.bookingForm?.defaultEventType || "Community Parade & Festival",
                                  buttonText: section.bookingForm?.buttonText || "Submit Booking Inquiry",
                                },
                              })
                            }
                            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-yellow-400"
                          />
                        </div>

                        <div className="sm:col-span-2">
                          <label className="text-[11px] font-semibold text-slate-300 block mb-1">Subheadline</label>
                          <textarea
                            rows={2}
                            value={section.bookingForm?.subheadline ?? "Bring mobile acoustic brass and high-energy drumline grooves to your festival, parade, or celebration."}
                            onChange={(e) =>
                              handleUpdateSection(section.id, {
                                bookingForm: {
                                  headline: section.bookingForm?.headline || "Book the Eagleburger Band",
                                  subheadline: e.target.value,
                                  badgeText: section.bookingForm?.badgeText || "Direct Event Inquiry",
                                  defaultEventType: section.bookingForm?.defaultEventType || "Community Parade & Festival",
                                  buttonText: section.bookingForm?.buttonText || "Submit Booking Inquiry",
                                },
                              })
                            }
                            className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-yellow-400"
                          />
                        </div>

                        <div>
                          <label className="text-[11px] font-semibold text-slate-300 block mb-1">Submit Button Text</label>
                          <input
                            type="text"
                            value={section.bookingForm?.buttonText ?? "Submit Booking Inquiry"}
                            onChange={(e) =>
                              handleUpdateSection(section.id, {
                                bookingForm: {
                                  headline: section.bookingForm?.headline || "Book the Eagleburger Band",
                                  subheadline: section.bookingForm?.subheadline || "",
                                  badgeText: section.bookingForm?.badgeText || "Direct Event Inquiry",
                                  defaultEventType: section.bookingForm?.defaultEventType || "Community Parade & Festival",
                                  buttonText: e.target.value,
                                },
                              })
                            }
                            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-yellow-400"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {section.type === "testimonials" && (
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="text-[11px] font-semibold text-slate-300 block mb-1">Section Title</label>
                          <input
                            type="text"
                            value={section.testimonials?.title ?? "What Organizers & Audiences Say"}
                            onChange={(e) =>
                              handleUpdateSection(section.id, {
                                testimonials: {
                                  title: e.target.value,
                                  subtitle: section.testimonials?.subtitle || "",
                                  items: section.testimonials?.items || [],
                                },
                              })
                            }
                            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-yellow-400"
                          />
                        </div>

                        <div>
                          <label className="text-[11px] font-semibold text-slate-300 block mb-1">Subtitle</label>
                          <input
                            type="text"
                            value={section.testimonials?.subtitle ?? "From parade routes to street festivals, hear the crowd reaction."}
                            onChange={(e) =>
                              handleUpdateSection(section.id, {
                                testimonials: {
                                  title: section.testimonials?.title || "",
                                  subtitle: e.target.value,
                                  items: section.testimonials?.items || [],
                                },
                              })
                            }
                            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-yellow-400"
                          />
                        </div>
                      </div>

                      <div className="space-y-3 pt-2">
                        <div className="flex items-center justify-between text-xs font-semibold text-slate-400">
                          <span>Testimonials ({section.testimonials?.items?.length || 0})</span>
                          <button
                            type="button"
                            onClick={() => {
                              const items = [
                                ...(section.testimonials?.items || []),
                                { 
                                  quote: "The Eagleburger Band brought high-voltage energy to our event!", 
                                  author: "New Reviewer", 
                                  roleOrEvent: "Community Coordinator", 
                                  rating: 5,
                                  avatarUrl: "",
                                  tag: "Parade",
                                },
                              ];
                              handleUpdateSection(section.id, {
                                testimonials: {
                                  title: section.testimonials?.title || "What Organizers & Audiences Say",
                                  subtitle: section.testimonials?.subtitle || "",
                                  items,
                                },
                              });
                            }}
                            className="text-yellow-400 hover:underline flex items-center gap-1 text-xs"
                          >
                            <Plus className="w-3 h-3" /> Add Quote
                          </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {section.testimonials?.items?.map((item, itemIdx) => (
                            <div key={itemIdx} className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-3 shadow">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <span className="text-[11px] font-bold text-yellow-400">Quote #{itemIdx + 1}</span>
                                  {/* Star Rating Selector */}
                                  <div className="flex items-center gap-0.5">
                                    {[1, 2, 3, 4, 5].map((starVal) => (
                                      <button
                                        key={starVal}
                                        type="button"
                                        onClick={() => {
                                          const updated = [...section.testimonials!.items];
                                          updated[itemIdx] = { ...updated[itemIdx], rating: starVal };
                                          handleUpdateSection(section.id, {
                                            testimonials: { ...section.testimonials!, items: updated },
                                          });
                                        }}
                                        className="p-0.5 hover:scale-110 transition-transform"
                                        title={`${starVal} Stars`}
                                      >
                                        <Star
                                          className={`w-3.5 h-3.5 ${
                                            starVal <= (item.rating || 5)
                                              ? "fill-yellow-400 text-yellow-400"
                                              : "text-slate-600"
                                          }`}
                                        />
                                      </button>
                                    ))}
                                  </div>
                                </div>

                                <div className="flex items-center gap-1">
                                  <button
                                    type="button"
                                    disabled={itemIdx === 0}
                                    onClick={() => {
                                      const updated = [...section.testimonials!.items];
                                      const temp = updated[itemIdx];
                                      updated[itemIdx] = updated[itemIdx - 1];
                                      updated[itemIdx - 1] = temp;
                                      handleUpdateSection(section.id, {
                                        testimonials: { ...section.testimonials!, items: updated },
                                      });
                                    }}
                                    className="p-1 text-slate-500 hover:text-white disabled:opacity-20"
                                    title="Move Up"
                                  >
                                    <ArrowUp className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    disabled={itemIdx === section.testimonials!.items.length - 1}
                                    onClick={() => {
                                      const updated = [...section.testimonials!.items];
                                      const temp = updated[itemIdx];
                                      updated[itemIdx] = updated[itemIdx + 1];
                                      updated[itemIdx + 1] = temp;
                                      handleUpdateSection(section.id, {
                                        testimonials: { ...section.testimonials!, items: updated },
                                      });
                                    }}
                                    className="p-1 text-slate-500 hover:text-white disabled:opacity-20"
                                    title="Move Down"
                                  >
                                    <ArrowDown className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const updated = section.testimonials!.items.filter((_, i) => i !== itemIdx);
                                      handleUpdateSection(section.id, {
                                        testimonials: { ...section.testimonials!, items: updated },
                                      });
                                    }}
                                    className="p-1 text-slate-500 hover:text-rose-400"
                                    title="Delete"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>

                              <textarea
                                rows={2}
                                value={item.quote}
                                placeholder="Quote content..."
                                onChange={(e) => {
                                  const updated = [...section.testimonials!.items];
                                  updated[itemIdx] = { ...updated[itemIdx], quote: e.target.value };
                                  handleUpdateSection(section.id, {
                                    testimonials: { ...section.testimonials!, items: updated },
                                  });
                                }}
                                className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-yellow-400"
                              />

                              <div className="grid grid-cols-2 gap-2">
                                <input
                                  type="text"
                                  value={item.author}
                                  placeholder="Author Name"
                                  onChange={(e) => {
                                    const updated = [...section.testimonials!.items];
                                    updated[itemIdx] = { ...updated[itemIdx], author: e.target.value };
                                    handleUpdateSection(section.id, {
                                      testimonials: { ...section.testimonials!, items: updated },
                                    });
                                  }}
                                  className="bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-yellow-400"
                                />
                                <input
                                  type="text"
                                  value={item.roleOrEvent}
                                  placeholder="Role / Organization"
                                  onChange={(e) => {
                                    const updated = [...section.testimonials!.items];
                                    updated[itemIdx] = { ...updated[itemIdx], roleOrEvent: e.target.value };
                                    handleUpdateSection(section.id, {
                                      testimonials: { ...section.testimonials!, items: updated },
                                    });
                                  }}
                                  className="bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-yellow-400"
                                />
                              </div>

                              <div className="grid grid-cols-2 gap-2">
                                <input
                                  type="text"
                                  value={item.tag || ""}
                                  placeholder="Category Tag (e.g. Festival)"
                                  onChange={(e) => {
                                    const updated = [...section.testimonials!.items];
                                    updated[itemIdx] = { ...updated[itemIdx], tag: e.target.value };
                                    handleUpdateSection(section.id, {
                                      testimonials: { ...section.testimonials!, items: updated },
                                    });
                                  }}
                                  className="bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-yellow-400"
                                />
                                <div className="flex items-center gap-1.5">
                                  <input
                                    type="text"
                                    value={item.avatarUrl || ""}
                                    placeholder="Avatar URL (optional)"
                                    onChange={(e) => {
                                      const updated = [...section.testimonials!.items];
                                      updated[itemIdx] = { ...updated[itemIdx], avatarUrl: e.target.value };
                                      handleUpdateSection(section.id, {
                                        testimonials: { ...section.testimonials!, items: updated },
                                      });
                                    }}
                                    className="flex-1 bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-yellow-400"
                                  />
                                  {item.avatarUrl && (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img
                                      src={item.avatarUrl}
                                      alt=""
                                      className="w-7 h-7 rounded-full object-cover border border-yellow-400/40 shrink-0"
                                    />
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {section.type === "faq" && (
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="text-[11px] font-semibold text-slate-300 block mb-1">Section Title</label>
                          <input
                            type="text"
                            value={section.faq?.title ?? "Frequently Asked Questions"}
                            onChange={(e) =>
                              handleUpdateSection(section.id, {
                                faq: {
                                  title: e.target.value,
                                  subtitle: section.faq?.subtitle || "",
                                  items: section.faq?.items || [],
                                },
                              })
                            }
                            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-yellow-400"
                          />
                        </div>

                        <div>
                          <label className="text-[11px] font-semibold text-slate-300 block mb-1">Subtitle</label>
                          <input
                            type="text"
                            value={section.faq?.subtitle ?? "Everything you need to know about booking and performance logistics."}
                            onChange={(e) =>
                              handleUpdateSection(section.id, {
                                faq: {
                                  title: section.faq?.title || "",
                                  subtitle: e.target.value,
                                  items: section.faq?.items || [],
                                },
                              })
                            }
                            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-yellow-400"
                          />
                        </div>
                      </div>

                      <div className="space-y-2 pt-2">
                        <div className="flex items-center justify-between text-xs font-semibold text-slate-400">
                          <span>Questions & Answers ({section.faq?.items?.length || 0})</span>
                          <button
                            type="button"
                            onClick={() => {
                              const items = [
                                ...(section.faq?.items || []),
                                { question: "New Question?", answer: "Clear, helpful answer.", category: "General" },
                              ];
                              handleUpdateSection(section.id, {
                                faq: {
                                  title: section.faq?.title || "Frequently Asked Questions",
                                  subtitle: section.faq?.subtitle || "",
                                  items,
                                },
                              });
                            }}
                            className="text-yellow-400 hover:underline flex items-center gap-1 text-xs"
                          >
                            <Plus className="w-3 h-3" /> Add Question
                          </button>
                        </div>

                        <div className="space-y-3">
                          {section.faq?.items?.map((item, itemIdx) => (
                            <div key={itemIdx} className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-2">
                              <div className="flex items-center justify-between gap-2">
                                <input
                                  type="text"
                                  value={item.question}
                                  placeholder="Question"
                                  onChange={(e) => {
                                    const updated = [...section.faq!.items];
                                    updated[itemIdx] = { ...updated[itemIdx], question: e.target.value };
                                    handleUpdateSection(section.id, {
                                      faq: { ...section.faq!, items: updated },
                                    });
                                  }}
                                  className="flex-1 bg-transparent text-xs font-bold text-white focus:outline-none border-b border-slate-800 pb-1"
                                />
                                <input
                                  type="text"
                                  value={item.category}
                                  placeholder="Category"
                                  onChange={(e) => {
                                    const updated = [...section.faq!.items];
                                    updated[itemIdx] = { ...updated[itemIdx], category: e.target.value };
                                    handleUpdateSection(section.id, {
                                      faq: { ...section.faq!, items: updated },
                                    });
                                  }}
                                  className="w-28 bg-slate-900 border border-slate-800 rounded px-2 py-0.5 text-[10px] text-slate-400 font-mono"
                                />
                                <button
                                  type="button"
                                  onClick={() => {
                                    const updated = section.faq!.items.filter((_, i) => i !== itemIdx);
                                    handleUpdateSection(section.id, {
                                      faq: { ...section.faq!, items: updated },
                                    });
                                  }}
                                  className="text-slate-500 hover:text-rose-400"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>

                              <textarea
                                rows={2}
                                value={item.answer}
                                placeholder="Answer explanation"
                                onChange={(e) => {
                                  const updated = [...section.faq!.items];
                                  updated[itemIdx] = { ...updated[itemIdx], answer: e.target.value };
                                  handleUpdateSection(section.id, {
                                    faq: { ...section.faq!, items: updated },
                                  });
                                }}
                                className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-xs text-slate-300 focus:outline-none"
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {section.type === "cta_banner" && (
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="sm:col-span-2">
                          <label className="text-[11px] font-semibold text-slate-300 block mb-1">Headline</label>
                          <input
                            type="text"
                            value={section.ctaBanner?.headline ?? "Ready to Bring Unstoppable Brass Energy to Your Event?"}
                            onChange={(e) =>
                              handleUpdateSection(section.id, {
                                ctaBanner: {
                                  headline: e.target.value,
                                  subheadline: section.ctaBanner?.subheadline || "",
                                  buttonText: section.ctaBanner?.buttonText || "Book the Band Now",
                                  buttonHref: section.ctaBanner?.buttonHref || "/book",
                                  buttonStyle: section.ctaBanner?.buttonStyle || "solid-yellow",
                                  secondaryButtonText: section.ctaBanner?.secondaryButtonText || "",
                                  secondaryButtonHref: section.ctaBanner?.secondaryButtonHref || "",
                                  secondaryButtonStyle: section.ctaBanner?.secondaryButtonStyle || "outline",
                                  badgeText: section.ctaBanner?.badgeText || "",
                                  variant: section.ctaBanner?.variant || "primary",
                                },
                              })
                            }
                            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-yellow-400"
                          />
                        </div>

                        <div>
                          <label className="text-[11px] font-semibold text-slate-300 block mb-1">Banner Style Variant</label>
                          <select
                            value={section.ctaBanner?.variant ?? "primary"}
                            onChange={(e) =>
                              handleUpdateSection(section.id, {
                                ctaBanner: {
                                  headline: section.ctaBanner?.headline || "",
                                  subheadline: section.ctaBanner?.subheadline || "",
                                  buttonText: section.ctaBanner?.buttonText || "Book the Band Now",
                                  buttonHref: section.ctaBanner?.buttonHref || "/book",
                                  buttonStyle: section.ctaBanner?.buttonStyle || "solid-yellow",
                                  secondaryButtonText: section.ctaBanner?.secondaryButtonText || "",
                                  secondaryButtonHref: section.ctaBanner?.secondaryButtonHref || "",
                                  secondaryButtonStyle: section.ctaBanner?.secondaryButtonStyle || "outline",
                                  badgeText: section.ctaBanner?.badgeText || "",
                                  variant: e.target.value as "primary" | "dark" | "gradient" | "forest",
                                },
                              })
                            }
                            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-yellow-400"
                          >
                            <option value="primary">Primary (Yellow Accent)</option>
                            <option value="dark">Dark (Subtle Slate)</option>
                            <option value="gradient">Gradient (Vibrant Amber)</option>
                            <option value="forest">Forest (Emerald & Brass)</option>
                          </select>
                        </div>

                        <div className="sm:col-span-3">
                          <label className="text-[11px] font-semibold text-slate-300 block mb-1">Subheadline</label>
                          <textarea
                            rows={2}
                            value={section.ctaBanner?.subheadline ?? "Inquire today to check musician availability, rates, and custom parade setlists."}
                            onChange={(e) =>
                              handleUpdateSection(section.id, {
                                ctaBanner: {
                                  headline: section.ctaBanner?.headline || "",
                                  subheadline: e.target.value,
                                  buttonText: section.ctaBanner?.buttonText || "Book the Band Now",
                                  buttonHref: section.ctaBanner?.buttonHref || "/book",
                                  buttonStyle: section.ctaBanner?.buttonStyle || "solid-yellow",
                                  secondaryButtonText: section.ctaBanner?.secondaryButtonText || "",
                                  secondaryButtonHref: section.ctaBanner?.secondaryButtonHref || "",
                                  secondaryButtonStyle: section.ctaBanner?.secondaryButtonStyle || "outline",
                                  badgeText: section.ctaBanner?.badgeText || "",
                                  variant: section.ctaBanner?.variant || "primary",
                                },
                              })
                            }
                            className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-yellow-400"
                          />
                        </div>

                        <div>
                          <label className="text-[11px] font-semibold text-slate-300 block mb-1">Badge Text (Optional)</label>
                          <input
                            type="text"
                            value={section.ctaBanner?.badgeText ?? ""}
                            onChange={(e) =>
                              handleUpdateSection(section.id, {
                                ctaBanner: {
                                  headline: section.ctaBanner?.headline || "",
                                  subheadline: section.ctaBanner?.subheadline || "",
                                  buttonText: section.ctaBanner?.buttonText || "Book the Band Now",
                                  buttonHref: section.ctaBanner?.buttonHref || "/book",
                                  buttonStyle: section.ctaBanner?.buttonStyle || "solid-yellow",
                                  secondaryButtonText: section.ctaBanner?.secondaryButtonText || "",
                                  secondaryButtonHref: section.ctaBanner?.secondaryButtonHref || "",
                                  secondaryButtonStyle: section.ctaBanner?.secondaryButtonStyle || "outline",
                                  badgeText: e.target.value,
                                  variant: section.ctaBanner?.variant || "primary",
                                },
                              })
                            }
                            placeholder="e.g. Live Street Brass"
                            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-yellow-400"
                          />
                        </div>

                        <div>
                          <label className="text-[11px] font-semibold text-slate-300 block mb-1">Primary Button Style</label>
                          <select
                            value={section.ctaBanner?.buttonStyle ?? "solid-yellow"}
                            onChange={(e) =>
                              handleUpdateSection(section.id, {
                                ctaBanner: {
                                  headline: section.ctaBanner?.headline || "",
                                  subheadline: section.ctaBanner?.subheadline || "",
                                  buttonText: section.ctaBanner?.buttonText || "Book the Band Now",
                                  buttonHref: section.ctaBanner?.buttonHref || "/book",
                                  buttonStyle: e.target.value as "solid-yellow" | "white" | "outline",
                                  secondaryButtonText: section.ctaBanner?.secondaryButtonText || "",
                                  secondaryButtonHref: section.ctaBanner?.secondaryButtonHref || "",
                                  secondaryButtonStyle: section.ctaBanner?.secondaryButtonStyle || "outline",
                                  badgeText: section.ctaBanner?.badgeText || "",
                                  variant: section.ctaBanner?.variant || "primary",
                                },
                              })
                            }
                            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-yellow-400"
                          >
                            <option value="solid-yellow">Solid Yellow</option>
                            <option value="white">White Highlight</option>
                            <option value="outline">Outline Border</option>
                          </select>
                        </div>

                        <div>
                          <label className="text-[11px] font-semibold text-slate-300 block mb-1">Secondary Button Style</label>
                          <select
                            value={section.ctaBanner?.secondaryButtonStyle ?? "outline"}
                            onChange={(e) =>
                              handleUpdateSection(section.id, {
                                ctaBanner: {
                                  headline: section.ctaBanner?.headline || "",
                                  subheadline: section.ctaBanner?.subheadline || "",
                                  buttonText: section.ctaBanner?.buttonText || "Book the Band Now",
                                  buttonHref: section.ctaBanner?.buttonHref || "/book",
                                  buttonStyle: section.ctaBanner?.buttonStyle || "solid-yellow",
                                  secondaryButtonText: section.ctaBanner?.secondaryButtonText || "",
                                  secondaryButtonHref: section.ctaBanner?.secondaryButtonHref || "",
                                  secondaryButtonStyle: e.target.value as "solid-yellow" | "white" | "outline",
                                  badgeText: section.ctaBanner?.badgeText || "",
                                  variant: section.ctaBanner?.variant || "primary",
                                },
                              })
                            }
                            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-yellow-400"
                          >
                            <option value="outline">Outline Border</option>
                            <option value="white">White Highlight</option>
                            <option value="solid-yellow">Solid Yellow</option>
                          </select>
                        </div>

                        <div>
                          <label className="text-[11px] font-semibold text-slate-300 block mb-1">Primary Button Text</label>
                          <input
                            type="text"
                            value={section.ctaBanner?.buttonText ?? "Book the Band Now"}
                            onChange={(e) =>
                              handleUpdateSection(section.id, {
                                ctaBanner: {
                                  headline: section.ctaBanner?.headline || "",
                                  subheadline: section.ctaBanner?.subheadline || "",
                                  buttonText: e.target.value,
                                  buttonHref: section.ctaBanner?.buttonHref || "/book",
                                  buttonStyle: section.ctaBanner?.buttonStyle || "solid-yellow",
                                  secondaryButtonText: section.ctaBanner?.secondaryButtonText || "",
                                  secondaryButtonHref: section.ctaBanner?.secondaryButtonHref || "",
                                  secondaryButtonStyle: section.ctaBanner?.secondaryButtonStyle || "outline",
                                  badgeText: section.ctaBanner?.badgeText || "",
                                  variant: section.ctaBanner?.variant || "primary",
                                },
                              })
                            }
                            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-yellow-400"
                          />
                        </div>

                        <div>
                          <label className="text-[11px] font-semibold text-slate-300 block mb-1">Primary Button Link</label>
                          <input
                            type="text"
                            value={section.ctaBanner?.buttonHref ?? "/book"}
                            onChange={(e) =>
                              handleUpdateSection(section.id, {
                                ctaBanner: {
                                  headline: section.ctaBanner?.headline || "",
                                  subheadline: section.ctaBanner?.subheadline || "",
                                  buttonText: section.ctaBanner?.buttonText || "Book the Band Now",
                                  buttonHref: e.target.value,
                                  buttonStyle: section.ctaBanner?.buttonStyle || "solid-yellow",
                                  secondaryButtonText: section.ctaBanner?.secondaryButtonText || "",
                                  secondaryButtonHref: section.ctaBanner?.secondaryButtonHref || "",
                                  secondaryButtonStyle: section.ctaBanner?.secondaryButtonStyle || "outline",
                                  badgeText: section.ctaBanner?.badgeText || "",
                                  variant: section.ctaBanner?.variant || "primary",
                                },
                              })
                            }
                            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-yellow-400"
                          />
                        </div>

                        <div>
                          <label className="text-[11px] font-semibold text-slate-300 block mb-1">Secondary Button Text</label>
                          <input
                            type="text"
                            value={section.ctaBanner?.secondaryButtonText ?? ""}
                            placeholder="e.g. View Schedule"
                            onChange={(e) =>
                              handleUpdateSection(section.id, {
                                ctaBanner: {
                                  headline: section.ctaBanner?.headline || "",
                                  subheadline: section.ctaBanner?.subheadline || "",
                                  buttonText: section.ctaBanner?.buttonText || "Book the Band Now",
                                  buttonHref: section.ctaBanner?.buttonHref || "/book",
                                  buttonStyle: section.ctaBanner?.buttonStyle || "solid-yellow",
                                  secondaryButtonText: e.target.value,
                                  secondaryButtonHref: section.ctaBanner?.secondaryButtonHref || "",
                                  secondaryButtonStyle: section.ctaBanner?.secondaryButtonStyle || "outline",
                                  badgeText: section.ctaBanner?.badgeText || "",
                                  variant: section.ctaBanner?.variant || "primary",
                                },
                              })
                            }
                            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-yellow-400"
                          />
                        </div>

                        <div>
                          <label className="text-[11px] font-semibold text-slate-300 block mb-1">Secondary Button Link</label>
                          <input
                            type="text"
                            value={section.ctaBanner?.secondaryButtonHref ?? "/gigs"}
                            onChange={(e) =>
                              handleUpdateSection(section.id, {
                                ctaBanner: {
                                  headline: section.ctaBanner?.headline || "",
                                  subheadline: section.ctaBanner?.subheadline || "",
                                  buttonText: section.ctaBanner?.buttonText || "Book the Band Now",
                                  buttonHref: section.ctaBanner?.buttonHref || "/book",
                                  buttonStyle: section.ctaBanner?.buttonStyle || "solid-yellow",
                                  secondaryButtonText: section.ctaBanner?.secondaryButtonText || "",
                                  secondaryButtonHref: e.target.value,
                                  secondaryButtonStyle: section.ctaBanner?.secondaryButtonStyle || "outline",
                                  badgeText: section.ctaBanner?.badgeText || "",
                                  variant: section.ctaBanner?.variant || "primary",
                                },
                              })
                            }
                            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-yellow-400"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {section.type === "stats_counter" && (
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="text-[11px] font-semibold text-slate-300 block mb-1">Section Title</label>
                          <input
                            type="text"
                            value={section.statsCounter?.title ?? "By the Numbers"}
                            onChange={(e) =>
                              handleUpdateSection(section.id, {
                                statsCounter: {
                                  title: e.target.value,
                                  subtitle: section.statsCounter?.subtitle || "",
                                  metrics: section.statsCounter?.metrics || [],
                                },
                              })
                            }
                            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-yellow-400"
                          />
                        </div>

                        <div>
                          <label className="text-[11px] font-semibold text-slate-300 block mb-1">Subtitle</label>
                          <input
                            type="text"
                            value={section.statsCounter?.subtitle ?? "Pittsburgh's most dynamic street brass sound."}
                            onChange={(e) =>
                              handleUpdateSection(section.id, {
                                statsCounter: {
                                  title: section.statsCounter?.title || "",
                                  subtitle: e.target.value,
                                  metrics: section.statsCounter?.metrics || [],
                                },
                              })
                            }
                            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-yellow-400"
                          />
                        </div>
                      </div>

                      <div className="space-y-3 pt-2">
                        <div className="flex items-center justify-between text-xs font-semibold text-slate-400">
                          <span>Metrics ({section.statsCounter?.metrics?.length || 0})</span>
                          <button
                            type="button"
                            onClick={() => {
                              const metrics = [
                                ...(section.statsCounter?.metrics || []),
                                { value: "100+", label: "Performances", description: "Across Western PA", icon: "Award" },
                              ];
                              handleUpdateSection(section.id, {
                                statsCounter: {
                                  title: section.statsCounter?.title || "By the Numbers",
                                  subtitle: section.statsCounter?.subtitle || "",
                                  metrics,
                                },
                              });
                            }}
                            className="text-yellow-400 hover:underline flex items-center gap-1 text-xs"
                          >
                            <Plus className="w-3 h-3" /> Add Metric
                          </button>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                          {section.statsCounter?.metrics?.map((metric, metricIdx) => (
                            <div key={metricIdx} className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800 space-y-2.5 shadow">
                              <div className="flex items-center justify-between">
                                <span className="text-[11px] font-bold text-yellow-400">Item #{metricIdx + 1}</span>
                                <div className="flex items-center gap-1">
                                  <button
                                    type="button"
                                    disabled={metricIdx === 0}
                                    onClick={() => {
                                      const updated = [...section.statsCounter!.metrics];
                                      const temp = updated[metricIdx];
                                      updated[metricIdx] = updated[metricIdx - 1];
                                      updated[metricIdx - 1] = temp;
                                      handleUpdateSection(section.id, {
                                        statsCounter: { ...section.statsCounter!, metrics: updated },
                                      });
                                    }}
                                    className="p-1 text-slate-500 hover:text-white disabled:opacity-20"
                                    title="Move Up"
                                  >
                                    <ArrowUp className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    disabled={metricIdx === section.statsCounter!.metrics.length - 1}
                                    onClick={() => {
                                      const updated = [...section.statsCounter!.metrics];
                                      const temp = updated[metricIdx];
                                      updated[metricIdx] = updated[metricIdx + 1];
                                      updated[metricIdx + 1] = temp;
                                      handleUpdateSection(section.id, {
                                        statsCounter: { ...section.statsCounter!, metrics: updated },
                                      });
                                    }}
                                    className="p-1 text-slate-500 hover:text-white disabled:opacity-20"
                                    title="Move Down"
                                  >
                                    <ArrowDown className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const updated = section.statsCounter!.metrics.filter((_, i) => i !== metricIdx);
                                      handleUpdateSection(section.id, {
                                        statsCounter: { ...section.statsCounter!, metrics: updated },
                                      });
                                    }}
                                    className="p-1 text-slate-500 hover:text-rose-400"
                                    title="Delete"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>

                              <div>
                                <label className="text-[10px] text-slate-400 block mb-0.5">Icon</label>
                                <select
                                  value={metric.icon || "Award"}
                                  onChange={(e) => {
                                    const updated = [...section.statsCounter!.metrics];
                                    updated[metricIdx] = { ...updated[metricIdx], icon: e.target.value };
                                    handleUpdateSection(section.id, {
                                      statsCounter: { ...section.statsCounter!, metrics: updated },
                                    });
                                  }}
                                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2 py-1 text-xs text-white focus:outline-none focus:border-yellow-400 font-mono"
                                >
                                  {["Award", "Calendar", "Users", "Sparkles", "Music", "MapPin", "Flame", "Volume2", "Heart", "Clock", "Zap", "Drum"].map((iconName) => (
                                    <option key={iconName} value={iconName}>{iconName}</option>
                                  ))}
                                </select>
                              </div>

                              <div>
                                <label className="text-[10px] text-slate-400 block mb-0.5">Metric Value</label>
                                <input
                                  type="text"
                                  value={metric.value}
                                  placeholder="e.g. 100%"
                                  onChange={(e) => {
                                    const updated = [...section.statsCounter!.metrics];
                                    updated[metricIdx] = { ...updated[metricIdx], value: e.target.value };
                                    handleUpdateSection(section.id, {
                                      statsCounter: { ...section.statsCounter!, metrics: updated },
                                    });
                                  }}
                                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2 py-1 text-xs text-white font-mono focus:outline-none focus:border-yellow-400"
                                />
                              </div>

                              <div>
                                <label className="text-[10px] text-slate-400 block mb-0.5">Label</label>
                                <input
                                  type="text"
                                  value={metric.label}
                                  placeholder="e.g. Acoustic & Mobile"
                                  onChange={(e) => {
                                    const updated = [...section.statsCounter!.metrics];
                                    updated[metricIdx] = { ...updated[metricIdx], label: e.target.value };
                                    handleUpdateSection(section.id, {
                                      statsCounter: { ...section.statsCounter!, metrics: updated },
                                    });
                                  }}
                                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2 py-1 text-xs text-white focus:outline-none focus:border-yellow-400"
                                />
                              </div>

                              <div>
                                <label className="text-[10px] text-slate-400 block mb-0.5">Description (Optional)</label>
                                <input
                                  type="text"
                                  value={metric.description || ""}
                                  placeholder="e.g. Zero wires needed"
                                  onChange={(e) => {
                                    const updated = [...section.statsCounter!.metrics];
                                    updated[metricIdx] = { ...updated[metricIdx], description: e.target.value };
                                    handleUpdateSection(section.id, {
                                      statsCounter: { ...section.statsCounter!, metrics: updated },
                                    });
                                  }}
                                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2 py-1 text-[11px] text-slate-300 focus:outline-none focus:border-yellow-400"
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Page Banner Image Studio */}
      {activeTab === "banner" && (() => {
        const header = activePage.headerImage || PageHeaderImageSchema.parse({});
        const hasImage = Boolean(header.imageUrl && header.imageUrl.trim());

        return (
          <div className="space-y-6">
            {/* Header Card */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6 shadow-xl">
              <div className="border-b border-slate-800 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-yellow-400 flex items-center justify-center text-slate-950 font-black shadow-md shadow-yellow-400/20">
                    <ImageIcon className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-extrabold text-white flex items-center gap-2">
                      <span>Page Banner Image</span>
                      <span className="text-xs font-mono text-yellow-400 bg-yellow-400/10 border border-yellow-400/30 px-2 py-0.5 rounded-full">
                        /{activePage.slug === "home" ? "" : activePage.slug} ({activePage.title})
                      </span>
                    </h3>
                    <p className="text-xs text-slate-400">
                      Configure the specific hero banner image, opacity, dimensions, and typography for this page using Resource Library assets.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={() => {
                      setPickerTarget("header");
                      setPickerFilterCategory("header");
                      setIsAssetPickerOpen(true);
                    }}
                    className="px-3.5 py-2 rounded-xl bg-yellow-400 hover:bg-yellow-300 text-slate-950 text-xs font-bold transition flex items-center gap-1.5 shadow-md shadow-yellow-400/20"
                  >
                    <FolderOpen className="w-3.5 h-3.5" />
                    <span>Choose from Resource Library</span>
                  </button>

                  {hasImage && (
                    <button
                      type="button"
                      onClick={() => updateHeaderImage({ imageUrl: "" })}
                      className="px-3 py-2 rounded-xl bg-slate-950 hover:bg-slate-800 text-rose-400 border border-slate-800 hover:border-rose-500/40 text-xs font-semibold transition flex items-center gap-1.5"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Remove Banner</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Two-Column Configuration Options */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-2">
                {/* Left Column: Image Source & Dimensions */}
                <div className="bg-slate-950 border border-slate-800 rounded-xl p-5 space-y-4">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2 border-b border-slate-800/80 pb-2">
                    <Sliders className="w-3.5 h-3.5 text-yellow-400" />
                    <span>Image Source &amp; Dimensions</span>
                  </h4>

                  <div className="space-y-3">
                    <div>
                      <label className="text-[11px] font-bold uppercase tracking-wider text-slate-300 block mb-1">
                        Image URL (Resource Asset or Direct URL)
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={header.imageUrl || ""}
                          onChange={(e) => updateHeaderImage({ imageUrl: e.target.value })}
                          placeholder="https://... or pick from Resource Library"
                          className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-yellow-400 font-mono"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            setPickerTarget("header");
                            setPickerFilterCategory("header");
                            setIsAssetPickerOpen(true);
                          }}
                          className="px-3 py-2 bg-yellow-400/10 hover:bg-yellow-400/20 text-yellow-400 border border-yellow-400/30 rounded-xl text-xs font-bold transition flex items-center gap-1 shrink-0"
                          title="Open Resource Library"
                        >
                          <FolderOpen className="w-3.5 h-3.5" />
                          <span>Resources</span>
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="text-[11px] font-bold uppercase tracking-wider text-slate-300 block mb-1">
                        Image Alt Text (Accessibility &amp; SEO)
                      </label>
                      <input
                        type="text"
                        value={header.altText || ""}
                        onChange={(e) => updateHeaderImage({ altText: e.target.value })}
                        placeholder="e.g. Eagleburger Band marching in parade"
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-yellow-400"
                      />
                    </div>

                    {/* Height Preset */}
                    <div>
                      <label className="text-[11px] font-bold uppercase tracking-wider text-slate-300 block mb-1.5">
                        Height Preset
                      </label>
                      <div className="grid grid-cols-3 gap-2">
                        {[
                          { id: "compact", label: "Compact", px: "280px" },
                          { id: "standard", label: "Standard", px: "380px" },
                          { id: "cinematic", label: "Cinematic", px: "540px" },
                        ].map((preset) => (
                          <button
                            key={preset.id}
                            type="button"
                            onClick={() =>
                              updateHeaderImage({
                                heightPreset: preset.id as "compact" | "standard" | "cinematic",
                              })
                            }
                            className={`p-2.5 rounded-xl border text-center transition ${
                              (header.heightPreset || "standard") === preset.id
                                ? "border-yellow-400 bg-yellow-400/10 text-yellow-400 font-bold"
                                : "border-slate-800 bg-slate-900 text-slate-400 hover:text-white"
                            }`}
                          >
                            <div className="text-xs font-bold">{preset.label}</div>
                            <div className="text-[10px] font-mono opacity-60">{preset.px}</div>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Overlay Opacity */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-[11px] font-bold uppercase tracking-wider text-slate-300">
                          Dark Overlay Opacity
                        </label>
                        <span className="text-xs font-mono text-yellow-400 font-bold">
                          {header.overlayOpacity ?? 50}%
                        </span>
                      </div>
                      <input
                        type="range"
                        min={0}
                        max={100}
                        step={5}
                        value={header.overlayOpacity ?? 50}
                        onChange={(e) =>
                          updateHeaderImage({ overlayOpacity: parseInt(e.target.value, 10) })
                        }
                        className="w-full accent-yellow-400 cursor-pointer"
                      />
                      <div className="flex justify-between text-[10px] text-slate-500 mt-0.5 font-mono">
                        <span>0% (Raw Image)</span>
                        <span>50% (Balanced)</span>
                        <span>100% (Dark)</span>
                      </div>
                    </div>

                    {/* Vertical Image Placement & Focal Point */}
                    <div className="space-y-3 pt-3 border-t border-slate-900">
                      <div className="flex items-center justify-between">
                        <div>
                          <label className="text-[11px] font-bold uppercase tracking-wider text-slate-300 block">
                            Vertical Image Placement
                          </label>
                          <span className="text-[10px] text-slate-500">
                            Reposition focal point via dragging or alignment buttons
                          </span>
                        </div>
                        <span className="text-xs font-mono text-yellow-400 font-bold bg-yellow-400/10 px-2 py-0.5 rounded border border-yellow-400/20">
                          {header.verticalPosition === 0
                            ? "Top (0%)"
                            : header.verticalPosition === 50 || header.verticalPosition === undefined
                            ? "Middle (50%)"
                            : header.verticalPosition === 100
                            ? "Bottom (100%)"
                            : `${header.verticalPosition}%`}
                        </span>
                      </div>

                      {/* Fixed Alignment Buttons */}
                      <div className="grid grid-cols-3 gap-2">
                        {[
                          { label: "Top", pos: 0, icon: ArrowUp },
                          { label: "Middle", pos: 50, icon: MoveVertical },
                          { label: "Bottom", pos: 100, icon: ArrowDown },
                        ].map((btn) => {
                          const isActive = (header.verticalPosition ?? 50) === btn.pos;
                          return (
                            <button
                              key={btn.label}
                              type="button"
                              onClick={() => updateHeaderImage({ verticalPosition: btn.pos })}
                              className={`py-2 px-3 rounded-xl border text-xs font-semibold transition flex items-center justify-center gap-1.5 ${
                                isActive
                                  ? "border-yellow-400 bg-yellow-400/10 text-yellow-400 font-bold shadow-sm"
                                  : "border-slate-800 bg-slate-900 text-slate-400 hover:text-white"
                              }`}
                            >
                              <btn.icon className="w-3.5 h-3.5" />
                              <span>{btn.label}</span>
                            </button>
                          );
                        })}
                      </div>

                      {/* Interactive Drag Reposition Viewport */}
                      {hasImage && (
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-[10px] font-mono text-slate-400">
                            <span className="flex items-center gap-1">
                              <MoveVertical className="w-3 h-3 text-yellow-400" />
                              <span>Custom Drag Viewport:</span>
                            </span>
                            <span className="text-slate-500">Click &amp; drag vertically</span>
                          </div>

                          <div
                            onMouseDown={handleBannerDragStart}
                            onTouchStart={handleBannerTouchStart}
                            className="relative h-28 w-full rounded-xl overflow-hidden border border-slate-800 bg-slate-900 cursor-grab active:cursor-grabbing select-none group shadow-inner"
                            title="Click and drag up or down to adjust image vertical focal point"
                          >
                            {/* Live Background Image with Object Position */}
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={header.imageUrl}
                              alt="Reposition Preview"
                              className="w-full h-full object-cover pointer-events-none select-none transition-[object-position] duration-75"
                              style={{ objectPosition: `center ${header.verticalPosition ?? 50}%` }}
                            />

                            {/* Guideline Overlay */}
                            <div
                              className="absolute inset-x-0 border-t-2 border-yellow-400/80 pointer-events-none transition-all duration-75 shadow-sm"
                              style={{ top: `${header.verticalPosition ?? 50}%` }}
                            >
                              <span className="absolute right-2 -top-4 text-[9px] font-mono font-bold bg-slate-950/90 text-yellow-400 px-1.5 py-0.2 rounded border border-yellow-400/30">
                                {header.verticalPosition ?? 50}%
                              </span>
                            </div>

                            {/* Subtle dark gradient overlay */}
                            <div className="absolute inset-0 bg-slate-950/20 group-hover:bg-slate-950/10 transition pointer-events-none" />

                            {/* Drag Prompt Pill */}
                            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-slate-950/85 backdrop-blur-sm border border-slate-700/80 rounded-full px-2.5 py-0.5 text-[10px] font-mono text-slate-300 pointer-events-none flex items-center gap-1 group-hover:border-yellow-400/50 group-hover:text-yellow-300 transition">
                              <MoveVertical className="w-3 h-3" />
                              <span>Drag Image Up / Down</span>
                            </div>
                          </div>

                          {/* Precision Slider */}
                          <div className="pt-1">
                            <input
                              type="range"
                              min={0}
                              max={100}
                              step={1}
                              value={header.verticalPosition ?? 50}
                              onChange={(e) =>
                                updateHeaderImage({ verticalPosition: parseInt(e.target.value, 10) })
                              }
                              className="w-full accent-yellow-400 cursor-pointer"
                            />
                            <div className="flex justify-between text-[10px] text-slate-500 font-mono mt-0.5">
                              <span>0% (Top)</span>
                              <span>50% (Middle)</span>
                              <span>100% (Bottom)</span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right Column: Typography & Text Alignment */}
                <div className="bg-slate-950 border border-slate-800 rounded-xl p-5 space-y-4">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2 border-b border-slate-800/80 pb-2">
                    <Type className="w-3.5 h-3.5 text-yellow-400" />
                    <span>Overlay Typography &amp; Content</span>
                  </h4>

                  <div className="space-y-3">
                    <div>
                      <label className="text-[11px] font-bold uppercase tracking-wider text-slate-300 block mb-1">
                        Hero Badge Text (Optional)
                      </label>
                      <input
                        type="text"
                        value={header.badgeText || ""}
                        onChange={(e) => updateHeaderImage({ badgeText: e.target.value })}
                        placeholder="e.g. Acoustic Brass & Percussion"
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-yellow-400 uppercase font-mono"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-bold uppercase tracking-wider text-slate-300 block mb-1">
                        Custom Headline (Optional)
                      </label>
                      <input
                        type="text"
                        value={header.customTitle || ""}
                        onChange={(e) => updateHeaderImage({ customTitle: e.target.value })}
                        placeholder={`Leave blank to use page title ("${activePage.title}")`}
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-yellow-400"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-bold uppercase tracking-wider text-slate-300 block mb-1">
                        Custom Subheadline (Optional)
                      </label>
                      <textarea
                        rows={2}
                        value={header.customSubtitle || ""}
                        onChange={(e) => updateHeaderImage({ customSubtitle: e.target.value })}
                        placeholder="Leave blank to use page description"
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-yellow-400"
                      />
                    </div>

                    {/* Headline Alignment */}
                    <div>
                      <label className="text-[11px] font-bold uppercase tracking-wider text-slate-300 block mb-1.5">
                        Headline Alignment
                      </label>
                      <div className="grid grid-cols-3 gap-2">
                        {(["left", "center", "right"] as const).map((align) => (
                          <button
                            key={align}
                            type="button"
                            onClick={() => updateHeaderImage({ headlineAlignment: align })}
                            className={`py-2 px-3 rounded-xl border text-xs font-semibold capitalize transition flex items-center justify-center gap-1.5 ${
                              (header.headlineAlignment || "center") === align
                                ? "border-yellow-400 bg-yellow-400/10 text-yellow-400 font-bold"
                                : "border-slate-800 bg-slate-900 text-slate-400 hover:text-white"
                            }`}
                          >
                            {align === "left" && <AlignLeft className="w-3.5 h-3.5" />}
                            {align === "center" && <AlignCenter className="w-3.5 h-3.5" />}
                            {align === "right" && <AlignRight className="w-3.5 h-3.5" />}
                            <span>{align}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Live Banner Preview */}
              <div className="pt-2">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Eye className="w-4 h-4 text-yellow-400" />
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-300 font-mono">
                      Live Page Banner Preview ({activePage.title})
                    </span>
                  </div>
                  <span className="text-[10px] font-mono text-slate-500">
                    Renders at top of /{activePage.slug === "home" ? "" : activePage.slug}
                  </span>
                </div>

                {hasImage ? (
                  <div
                    onMouseDown={handleBannerDragStart}
                    onTouchStart={handleBannerTouchStart}
                    className="rounded-2xl overflow-hidden border border-slate-800 shadow-2xl relative cursor-grab active:cursor-grabbing group"
                    title="Click and drag vertically to adjust banner focal point"
                  >
                    <PublicPageHeader
                      headerImage={header}
                      fallbackTitle={activePage.title}
                      fallbackSubtitle={activePage.description}
                    />
                    <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition pointer-events-none bg-slate-950/85 backdrop-blur-md px-2.5 py-1 rounded-lg border border-slate-700 text-[10px] font-mono text-yellow-300 flex items-center gap-1 shadow-lg">
                      <MoveVertical className="w-3 h-3" />
                      <span>Drag to Reposition ({header.verticalPosition ?? 50}%)</span>
                    </div>
                  </div>
                ) : (
                  <div className="p-8 text-center bg-slate-950 rounded-xl border border-dashed border-slate-800 text-slate-500 space-y-2">
                    <ImageIcon className="w-8 h-8 mx-auto text-slate-700" />
                    <p className="text-xs font-semibold">No banner image set for &quot;{activePage.title}&quot;.</p>
                    <p className="text-[11px]">
                      Click &quot;Choose from Resource Library&quot; or select a preset above to configure a specific banner for this page.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {/* Simulator / Live Preview Mode */}
      {activeTab === "preview" && (
        <div className="bg-slate-950 border border-slate-800 rounded-3xl p-6 sm:p-10 space-y-12 shadow-2xl">
          <div className="border-b border-slate-800 pb-4 flex items-center justify-between text-xs text-slate-400">
            <span className="font-mono text-yellow-400 font-bold uppercase">
              Simulator: /{activePage.slug === "home" ? "" : activePage.slug}
            </span>
            <span className="font-mono text-emerald-400">Universal Section Engine Active</span>
          </div>

          {activePage.headerImage?.imageUrl && (
            <div className="rounded-2xl overflow-hidden border border-slate-800 shadow-xl mb-6">
              <PublicPageHeader
                headerImage={activePage.headerImage}
                fallbackTitle={activePage.title}
                fallbackSubtitle={activePage.description}
              />
            </div>
          )}

          <div className="space-y-12">
            {activePage.sections?.map((section) => (
              <PublicSectionRenderer key={section.id} section={section} />
            ))}
          </div>
        </div>
      )}
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

        </>
      )}

      {/* 2. GLOBAL PUBLIC SITE STUDIO (Nav, Page Banner, Announcements, Footer) */}
      {studioScope === "global" && (
        <div className="space-y-6">
          {/* Global Studio Section Header & Tab Bar */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-3.5 shadow-md">
            <div className="flex items-center justify-between flex-wrap gap-2.5 pb-2.5 border-b border-slate-800/80">
              <div className="flex items-center gap-2.5">
                <div className="w-2.5 h-2.5 rounded-full bg-yellow-400 shrink-0" />
                <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-yellow-400">
                  Global Public Site Configuration
                </h2>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700 font-mono">
                  Applied across all public site routes
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setStudioScope("pages")}
                  className="px-3.5 py-1.5 rounded-xl text-xs font-bold text-slate-300 hover:text-white border border-slate-700 hover:border-slate-600 bg-slate-950 transition flex items-center gap-1.5"
                >
                  <FileText className="w-3.5 h-3.5 text-yellow-400" />
                  <span>&larr; Switch to Page Content Studio</span>
                </button>
              </div>
            </div>

            {/* Global Tabs Ribbon */}
            <div className="flex flex-wrap items-center gap-2 bg-slate-950 p-2 rounded-xl border border-slate-800">
              <button
                type="button"
                onClick={() => setGlobalNavTab("header_nav")}
                className={`px-3.5 py-2 rounded-lg text-xs font-bold transition flex items-center gap-1.5 shrink-0 ${
                  globalNavTab === "header_nav"
                    ? "bg-yellow-400 text-slate-950 shadow font-black"
                    : "text-slate-400 hover:text-white hover:bg-slate-900"
                }`}
              >
                <Compass className="w-3.5 h-3.5" />
                <span>Header Navigation &amp; Active Route ({siteNav.headerLinks.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setGlobalNavTab("announcement")}
                className={`px-3.5 py-2 rounded-lg text-xs font-bold transition flex items-center gap-1.5 shrink-0 ${
                  globalNavTab === "announcement"
                    ? "bg-yellow-400 text-slate-950 shadow font-black"
                    : "text-slate-400 hover:text-white hover:bg-slate-900"
                }`}
              >
                <Megaphone className="w-3.5 h-3.5" />
                <span>Announcement Alert {siteNav.announcementBanner?.enabled ? "● Active" : ""}</span>
              </button>

              <button
                type="button"
                onClick={() => setGlobalNavTab("footer_social")}
                className={`px-3.5 py-2 rounded-lg text-xs font-bold transition flex items-center gap-1.5 shrink-0 ${
                  globalNavTab === "footer_social"
                    ? "bg-yellow-400 text-slate-950 shadow font-black"
                    : "text-slate-400 hover:text-white hover:bg-slate-900"
                }`}
              >
                <Globe className="w-3.5 h-3.5" />
                <span>Footer &amp; Social Links</span>
              </button>
            </div>
          </div>

          {/* TAB 1: HEADER NAVIGATION & ACTIVE ROUTE SIMULATOR */}
          {globalNavTab === "header_nav" && (
            <div className="space-y-6">
              {/* Brand Tagline & Header Appearance Card */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-yellow-400" />
                    <div>
                      <h3 className="text-base font-extrabold text-white">Brand Tagline &amp; Header Styling</h3>
                      <p className="text-xs text-slate-400">
                        Manage the public header tagline, faint drop shadow, and background opacity overlay across all public pages.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Brand Tagline */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold uppercase tracking-wider text-slate-300 block">
                      Public Header &amp; Footer Tagline
                    </label>
                    <input
                      type="text"
                      value={siteNav.brandTagline || ""}
                      onChange={(e) => setSiteNav((prev) => ({ ...prev, brandTagline: e.target.value }))}
                      placeholder="e.g. Pittsburgh Brass & Battery"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs font-semibold text-white focus:outline-none focus:border-yellow-400"
                    />
                    <p className="text-[11px] text-slate-500">
                      Displayed across the sticky public header and beside the musician portal link in the footer.
                    </p>
                  </div>

                  {/* Header Background Opacity */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] font-bold uppercase tracking-wider text-slate-300">
                        Header Background Opacity
                      </label>
                      <span className="text-xs font-mono font-bold text-yellow-400 bg-yellow-400/10 px-2 py-0.5 rounded border border-yellow-400/20">
                        {siteNav.headerOpacity ?? 90}%
                      </span>
                    </div>

                    <input
                      type="range"
                      min={0}
                      max={100}
                      step={5}
                      value={siteNav.headerOpacity ?? 90}
                      onChange={(e) =>
                        setSiteNav((prev) => ({
                          ...prev,
                          headerOpacity: Number(e.target.value),
                        }))
                      }
                      className="w-full accent-yellow-400 bg-slate-950 h-2 rounded-lg cursor-pointer"
                    />

                    {/* Quick Opacity Presets */}
                    <div className="flex items-center gap-1.5 pt-1">
                      {[
                        { label: "Transparent (0%)", val: 0 },
                        { label: "Glass (50%)", val: 50 },
                        { label: "Frosted (75%)", val: 75 },
                        { label: "Standard (90%)", val: 90 },
                        { label: "Solid (100%)", val: 100 },
                      ].map((preset) => (
                        <button
                          key={preset.val}
                          type="button"
                          onClick={() =>
                            setSiteNav((prev) => ({
                              ...prev,
                              headerOpacity: preset.val,
                            }))
                          }
                          className={`px-2 py-1 rounded text-[10px] font-mono transition cursor-pointer ${
                            (siteNav.headerOpacity ?? 90) === preset.val
                              ? "bg-yellow-400 text-slate-950 font-bold"
                              : "bg-slate-950 text-slate-400 hover:text-white border border-slate-800"
                          }`}
                        >
                          {preset.label}
                        </button>
                      ))}
                    </div>

                    <p className="text-[11px] text-slate-500">
                      Controls the background translucency over scrolled page hero banners. Supported by backdrop blur and faint drop shadow.
                    </p>
                  </div>
                </div>
              </div>

              {/* Header Navigation Management Card */}
              {/* Header Navigation Management */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6 shadow-xl">
            <div className="border-b border-slate-800 pb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Compass className="w-5 h-5 text-yellow-400" />
                <div>
                  <h3 className="text-base font-extrabold text-white">Header Navigation Links</h3>
                  <p className="text-xs text-slate-400">
                    Configure the top navigation bar. Reorder, toggle visibility, or designate CTA action buttons.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => handleAddHeaderLink("New Link", "/")}
                className="bg-yellow-400 hover:bg-yellow-300 text-slate-950 font-bold px-3.5 py-1.5 rounded-xl text-xs flex items-center gap-1.5 transition shadow"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Header Link</span>
              </button>
            </div>

            {/* Quick Add from CMS Pages */}
            <div className="bg-slate-950 border border-slate-800/80 rounded-xl p-3 flex items-center justify-between flex-wrap gap-2 text-xs">
              <span className="text-slate-400 font-mono text-[11px]">Quick-add published page:</span>
              <div className="flex items-center gap-1.5 flex-wrap">
                {uniquePages.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => handleAddHeaderLink(p.title, p.slug === "home" ? "/" : `/${p.slug}`)}
                    className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-yellow-400/40 text-slate-300 hover:text-white rounded-lg text-[11px] font-medium transition"
                  >
                    + {p.title}
                  </button>
                ))}
              </div>
            </div>

            {/* Header Links List */}
            <div className="space-y-3">
              {siteNav.headerLinks.map((link, idx) => (
                <div
                  key={link.id}
                  className={`bg-slate-950 border rounded-xl p-3.5 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 transition ${
                    link.isVisible ? "border-slate-800" : "border-slate-800/50 opacity-60 bg-slate-950/50"
                  }`}
                >
                  <div className="flex items-center gap-3 flex-1">
                    <span className="text-[10px] font-mono font-bold bg-slate-900 text-slate-400 px-2 py-1 rounded border border-slate-800 shrink-0">
                      #{idx + 1}
                    </span>

                    <input
                      type="text"
                      value={link.label}
                      placeholder="Link Label"
                      onChange={(e) => handleUpdateHeaderLink(idx, { label: e.target.value })}
                      className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs font-bold text-white focus:outline-none focus:border-yellow-400 w-36"
                    />

                    <input
                      type="text"
                      value={link.href}
                      placeholder="/path or https://"
                      onChange={(e) => handleUpdateHeaderLink(idx, { href: e.target.value })}
                      className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-300 font-mono focus:outline-none focus:border-yellow-400 flex-1"
                    />
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {/* Button Style Toggle */}
                    <button
                      type="button"
                      onClick={() => handleUpdateHeaderLink(idx, { isButton: !link.isButton })}
                      className={`px-2 py-1 rounded-lg text-[11px] font-mono font-bold transition border ${
                        link.isButton
                          ? "bg-yellow-400 text-slate-950 border-yellow-400"
                          : "bg-slate-900 text-slate-400 border-slate-800 hover:text-white"
                      }`}
                      title="Render as CTA Button in Header"
                    >
                      {link.isButton ? "CTA Button" : "Text Link"}
                    </button>

                    {/* Visibility Toggle */}
                    <button
                      type="button"
                      onClick={() => handleToggleHeaderLinkVisibility(idx)}
                      className={`p-1.5 rounded-lg border transition ${
                        link.isVisible
                          ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                          : "bg-slate-900 text-slate-500 border-slate-800 line-through"
                      }`}
                      title={link.isVisible ? "Link is visible" : "Link is hidden"}
                    >
                      {link.isVisible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                    </button>

                    <div className="w-[1px] h-4 bg-slate-800 mx-1" />

                    <button
                      type="button"
                      disabled={idx === 0}
                      onClick={() => handleMoveHeaderLink(idx, "up")}
                      className="p-1 text-slate-400 hover:text-white disabled:opacity-30 rounded hover:bg-slate-900"
                      title="Move Up"
                    >
                      <ArrowUp className="w-4 h-4" />
                    </button>

                    <button
                      type="button"
                      disabled={idx === siteNav.headerLinks.length - 1}
                      onClick={() => handleMoveHeaderLink(idx, "down")}
                      className="p-1 text-slate-400 hover:text-white disabled:opacity-30 rounded hover:bg-slate-900"
                      title="Move Down"
                    >
                      <ArrowDown className="w-4 h-4" />
                    </button>

                    <div className="w-[1px] h-4 bg-slate-800 mx-1" />

                    <button
                      type="button"
                      onClick={() => handleRemoveHeaderLink(idx)}
                      className="p-1 text-slate-500 hover:text-rose-400 rounded hover:bg-slate-900"
                      title="Delete Link"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

              {/* Active Route Simulator Card */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-5 shadow-xl">
                <div className="border-b border-slate-800 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Compass className="w-5 h-5 text-yellow-400" />
                    <div>
                      <h3 className="text-base font-extrabold text-white">Live Active Route Simulator</h3>
                      <p className="text-xs text-slate-400">
                        Select a public route to preview how the navigation header dynamically highlights the active link.
                      </p>
                    </div>
                  </div>
                  <span className="text-[11px] font-mono text-yellow-400 bg-yellow-400/10 px-2.5 py-1 rounded-lg border border-yellow-400/30 font-bold">
                    Active: {simulatedActiveRoute}
                  </span>
                </div>

                {/* Route Selector Pills */}
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-semibold text-slate-400 mr-1">Simulate Route:</span>
                  {[
                    { label: "Home (/)", path: "/" },
                    { label: "Performances (/gigs)", path: "/gigs" },
                    { label: "Book the Band (/book)", path: "/book" },
                    { label: "Community Giving (/giving)", path: "/giving" },
                    { label: "Join the Band (/join)", path: "/join" },
                    { label: "Testimonials (/testimonials)", path: "/testimonials" },
                    { label: "Contact Us (/contact)", path: "/contact" },
                  ].map((rt) => (
                    <button
                      key={rt.path}
                      type="button"
                      onClick={() => setSimulatedActiveRoute(rt.path)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-mono transition ${
                        simulatedActiveRoute === rt.path
                          ? "bg-yellow-400 text-slate-950 font-bold shadow-md shadow-yellow-400/20"
                          : "bg-slate-950 text-slate-400 hover:text-white border border-slate-800"
                      }`}
                    >
                      {rt.label}
                    </button>
                  ))}
                </div>

                {/* Simulated Header Viewport */}
                <div className="rounded-2xl border border-slate-800 overflow-hidden shadow-2xl bg-slate-950">
                  <div className="bg-slate-900/80 px-4 py-2 border-b border-slate-800 flex items-center justify-between text-xs text-slate-400">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full bg-rose-500/80" />
                      <div className="w-2.5 h-2.5 rounded-full bg-amber-500/80" />
                      <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
                      <span className="font-mono text-[11px] text-slate-500 ml-2">
                        https://eagleburgerband.com{simulatedActiveRoute}
                      </span>
                    </div>
                    <span className="text-[10px] font-mono text-emerald-400 font-bold">
                      Header Active State Preview
                    </span>
                  </div>

                  <div 
                    className="p-4 sm:p-6 flex items-center justify-between border-b border-slate-800/80 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.5)] transition-colors duration-150"
                    style={{
                      backgroundColor: `rgba(2, 6, 23, ${(Math.max(0, Math.min(100, siteNav.headerOpacity ?? 90))) / 100})`,
                    }}
                  >
                    {/* Brand */}
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 flex items-center justify-center shrink-0">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img 
                          src="/images/eagleburger-logo.png" 
                          alt="Eagleburger Band Logo" 
                          className="w-full h-full object-contain"
                          suppressHydrationWarning
                        />
                      </div>
                      <div>
                        <span className="text-base font-bold tracking-tight text-white uppercase font-arvo">
                          EAGLEBURGER BAND
                        </span>
                        <span className="block text-[10px] font-semibold text-yellow-400 tracking-wider uppercase font-arvo">
                          {siteNav.brandTagline || "Pittsburgh Brass & Battery"}
                        </span>
                      </div>
                    </div>

                    {/* Nav Links Preview */}
                    <div className="hidden md:flex items-center gap-1.5">
                      {siteNav.headerLinks
                        .filter((l) => l.isVisible !== false)
                        .map((link) => {
                          const isActive =
                            link.href === "/"
                              ? simulatedActiveRoute === "/"
                              : simulatedActiveRoute === link.href || simulatedActiveRoute.startsWith(link.href + "/");

                          if (link.isButton) {
                            return (
                              <span
                                key={link.id}
                                className="px-3.5 py-1.5 rounded-xl text-xs font-bold font-poppins uppercase tracking-wider bg-yellow-400 text-slate-950 shadow-sm"
                              >
                                {link.label}
                              </span>
                            );
                          }

                          return (
                            <span
                              key={link.id}
                              className={`text-xs px-3 py-1.5 rounded-xl font-poppins uppercase tracking-wider transition flex items-center gap-1.5 ${
                                isActive
                                  ? "bg-yellow-400/15 text-yellow-400 border border-yellow-400/40 font-bold shadow-sm shadow-yellow-400/10 ring-1 ring-yellow-400/20"
                                  : "text-slate-300 hover:text-yellow-400 font-semibold"
                              }`}
                            >
                              <span>{link.label}</span>
                              {isActive && (
                                <span className="w-1.5 h-1.5 rounded-full bg-yellow-400 animate-pulse" />
                              )}
                            </span>
                          );
                        })}
                    </div>

                    {/* CTA Simulation */}
                    <div className="flex items-center gap-2">
                      <span className="px-3.5 py-1.5 rounded-xl text-xs font-bold font-poppins uppercase tracking-wider bg-yellow-400 text-slate-950 shadow">
                        Book the Band
                      </span>
                    </div>
                  </div>

                  <div className="p-4 bg-slate-950 text-slate-500 text-xs flex items-center justify-between">
                    <span>
                      Active link receives high-contrast yellow accent, border glow, and pulse indicator.
                    </span>
                    <span className="font-mono text-[11px] text-slate-400">
                      Synchronized via usePathname()
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: ANNOUNCEMENT ALERT BANNER */}
          {globalNavTab === "announcement" && (
            <div className="space-y-6">
              {/* Site Announcement Banner Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6 shadow-xl">
            <div className="border-b border-slate-800 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Megaphone className="w-5 h-5 text-yellow-400" />
                <div>
                  <h3 className="text-base font-extrabold text-white">Global Announcement Banner</h3>
                  <p className="text-xs text-slate-400">
                    Display an urgent alert, concert update, or special callout across the top of all public pages.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={siteNav.announcementBanner?.enabled ?? false}
                    onChange={(e) =>
                      setSiteNav((prev) => ({
                        ...prev,
                        announcementBanner: {
                          ...(prev.announcementBanner || { enabled: false, message: "", linkText: "", linkHref: "", bannerType: "highlight" }),
                          enabled: e.target.checked,
                        },
                      }))
                    }
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-yellow-400"></div>
                </label>
                <span className={`text-xs font-bold font-mono ${siteNav.announcementBanner?.enabled ? "text-yellow-400" : "text-slate-500"}`}>
                  {siteNav.announcementBanner?.enabled ? "Active" : "Disabled"}
                </span>
              </div>
            </div>

            {/* Live Banner Preview */}
            <div className="space-y-2">
              <div className="text-[11px] font-mono text-slate-400 uppercase tracking-wider">
                Live Banner Preview
              </div>
              <div
                className={`rounded-xl p-3 text-xs flex items-center justify-between gap-4 transition border ${
                  siteNav.announcementBanner?.bannerType === "alert"
                    ? "bg-rose-950/90 text-rose-200 border-rose-500/40"
                    : siteNav.announcementBanner?.bannerType === "info"
                    ? "bg-sky-950/90 text-sky-200 border-sky-500/40"
                    : "bg-yellow-400 text-slate-950 font-semibold border-yellow-500"
                }`}
              >
                <div className="flex items-center gap-2">
                  <Megaphone className="w-4 h-4 shrink-0" />
                  <span className="font-semibold">
                    {siteNav.announcementBanner?.message || "Sample announcement banner message for visitors."}
                  </span>
                  {siteNav.announcementBanner?.linkText && (
                    <span className="underline font-bold ml-1">
                      {siteNav.announcementBanner.linkText} &rarr;
                    </span>
                  )}
                </div>
                <span className="text-[10px] font-mono opacity-60">
                  {siteNav.announcementBanner?.enabled ? "Visible on Public Site" : "Preview (Currently Inactive)"}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="sm:col-span-2">
                <label className="text-xs font-semibold text-slate-300 block mb-1">Banner Announcement Text</label>
                <input
                  type="text"
                  value={siteNav.announcementBanner?.message ?? ""}
                  onChange={(e) =>
                    setSiteNav((prev) => ({
                      ...prev,
                      announcementBanner: {
                        ...(prev.announcementBanner || { enabled: false, message: "", linkText: "", linkHref: "", bannerType: "highlight" }),
                        message: e.target.value,
                      },
                    }))
                  }
                  placeholder="e.g. Next stop: Greenfield Holiday Parade this weekend! Check our full schedule."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-yellow-400"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Banner Color / Style</label>
                <select
                  value={siteNav.announcementBanner?.bannerType ?? "highlight"}
                  onChange={(e) =>
                    setSiteNav((prev) => ({
                      ...prev,
                      announcementBanner: {
                        ...(prev.announcementBanner || { enabled: false, message: "", linkText: "", linkHref: "", bannerType: "highlight" }),
                        bannerType: e.target.value as "highlight" | "info" | "alert",
                      },
                    }))
                  }
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-yellow-400"
                >
                  <option value="highlight">Highlight (Gold - Standard)</option>
                  <option value="info">Info (Sky Blue - Informational)</option>
                  <option value="alert">Alert (Rose - Rainouts / Urgency)</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Link Action Text (Optional)</label>
                <input
                  type="text"
                  value={siteNav.announcementBanner?.linkText ?? ""}
                  onChange={(e) =>
                    setSiteNav((prev) => ({
                      ...prev,
                      announcementBanner: {
                        ...(prev.announcementBanner || { enabled: false, message: "", linkText: "", linkHref: "", bannerType: "highlight" }),
                        linkText: e.target.value,
                      },
                    }))
                  }
                  placeholder="e.g. View Gig Times"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-yellow-400"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="text-xs font-semibold text-slate-300 block mb-1">Link URL (Optional)</label>
                <input
                  type="text"
                  value={siteNav.announcementBanner?.linkHref ?? ""}
                  onChange={(e) =>
                    setSiteNav((prev) => ({
                      ...prev,
                      announcementBanner: {
                        ...(prev.announcementBanner || { enabled: false, message: "", linkText: "", linkHref: "", bannerType: "highlight" }),
                        linkHref: e.target.value,
                      },
                    }))
                  }
                  placeholder="e.g. /gigs or https://..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-yellow-400"
                />
              </div>
            </div>
          </div>
            </div>
          )}

          {/* TAB 4: FOOTER LINKS & SOCIAL MEDIA */}
          {globalNavTab === "footer_social" && (
            <div className="space-y-6">
              {/* Brand Tagline & Footer Bio Card */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-yellow-400" />
                    <div>
                      <h3 className="text-base font-extrabold text-white">Brand Tagline &amp; Footer Description</h3>
                      <p className="text-xs text-slate-400">
                        Manage the public tagline and the brand bio paragraph displayed in the footer across all public pages.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold uppercase tracking-wider text-slate-300 block">
                      Public Header &amp; Footer Tagline
                    </label>
                    <input
                      type="text"
                      value={siteNav.brandTagline || ""}
                      onChange={(e) => setSiteNav((prev) => ({ ...prev, brandTagline: e.target.value }))}
                      placeholder="e.g. Pittsburgh Brass & Battery"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs font-semibold text-white focus:outline-none focus:border-yellow-400"
                    />
                    <p className="text-[11px] text-slate-500">
                      Displayed across the sticky public header and beside the musician portal link in the footer.
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold uppercase tracking-wider text-slate-300 block">
                      Footer Description / Band Bio
                    </label>
                    <textarea
                      rows={3}
                      value={siteNav.footerDescription ?? ""}
                      onChange={(e) => setSiteNav((prev) => ({ ...prev, footerDescription: e.target.value }))}
                      placeholder="Pittsburgh's mobile acoustic street brass and drumline powerhouse..."
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs font-semibold text-white focus:outline-none focus:border-yellow-400 leading-relaxed resize-y"
                    />
                    <p className="text-[11px] text-slate-500">
                      Displayed directly below the band logo in the public site footer.
                    </p>
                  </div>
                </div>
              </div>

              {/* Footer Navigation Management */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6 shadow-xl">
            <div className="border-b border-slate-800 pb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Compass className="w-5 h-5 text-yellow-400" />
                <div>
                  <h3 className="text-base font-extrabold text-white">Footer Navigation Links</h3>
                  <p className="text-xs text-slate-400">
                    Configure the bottom navigation links shown on all pages.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => handleAddFooterLink("New Footer Link", "/")}
                className="bg-yellow-400 hover:bg-yellow-300 text-slate-950 font-bold px-3.5 py-1.5 rounded-xl text-xs flex items-center gap-1.5 transition shadow"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Footer Link</span>
              </button>
            </div>

            {/* Footer Links List */}
            <div className="space-y-3">
              {siteNav.footerLinks.map((link, idx) => (
                <div
                  key={link.id}
                  className={`bg-slate-950 border rounded-xl p-3.5 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 transition ${
                    link.isVisible ? "border-slate-800" : "border-slate-800/50 opacity-60 bg-slate-950/50"
                  }`}
                >
                  <div className="flex items-center gap-3 flex-1">
                    <span className="text-[10px] font-mono font-bold bg-slate-900 text-slate-400 px-2 py-1 rounded border border-slate-800 shrink-0">
                      #{idx + 1}
                    </span>

                    <input
                      type="text"
                      value={link.label}
                      placeholder="Link Label"
                      onChange={(e) => handleUpdateFooterLink(idx, { label: e.target.value })}
                      className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs font-bold text-white focus:outline-none focus:border-yellow-400 w-36"
                    />

                    <input
                      type="text"
                      value={link.href}
                      placeholder="/path or https://"
                      onChange={(e) => handleUpdateFooterLink(idx, { href: e.target.value })}
                      className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-300 font-mono focus:outline-none focus:border-yellow-400 flex-1"
                    />
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {/* Visibility Toggle */}
                    <button
                      type="button"
                      onClick={() => handleToggleFooterLinkVisibility(idx)}
                      className={`p-1.5 rounded-lg border transition ${
                        link.isVisible
                          ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                          : "bg-slate-900 text-slate-500 border-slate-800 line-through"
                      }`}
                      title={link.isVisible ? "Link is visible" : "Link is hidden"}
                    >
                      {link.isVisible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                    </button>

                    <div className="w-[1px] h-4 bg-slate-800 mx-1" />

                    <button
                      type="button"
                      disabled={idx === 0}
                      onClick={() => handleMoveFooterLink(idx, "up")}
                      className="p-1 text-slate-400 hover:text-white disabled:opacity-30 rounded hover:bg-slate-900"
                      title="Move Up"
                    >
                      <ArrowUp className="w-4 h-4" />
                    </button>

                    <button
                      type="button"
                      disabled={idx === siteNav.footerLinks.length - 1}
                      onClick={() => handleMoveFooterLink(idx, "down")}
                      className="p-1 text-slate-400 hover:text-white disabled:opacity-30 rounded hover:bg-slate-900"
                      title="Move Down"
                    >
                      <ArrowDown className="w-4 h-4" />
                    </button>

                    <div className="w-[1px] h-4 bg-slate-800 mx-1" />

                    <button
                      type="button"
                      onClick={() => handleRemoveFooterLink(idx)}
                      className="p-1 text-slate-500 hover:text-rose-400 rounded hover:bg-slate-900"
                      title="Delete Link"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
              {/* Footer Social Media Channels Management */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6 shadow-xl">
            <div className="border-b border-slate-800 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Share2 className="w-5 h-5 text-yellow-400" />
                <div>
                  <h3 className="text-base font-extrabold text-white">Footer Social Media Channels</h3>
                  <p className="text-xs text-slate-400">
                    Configure official social media channels, streaming links, and corresponding font icons in the website footer.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleAddSocialLink("youtube", "YouTube", "https://www.youtube.com/@EagleburgerBand")}
                  className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold px-3 py-1.5 rounded-xl text-xs flex items-center gap-1.5 transition"
                  title="Add YouTube Channel"
                >
                  <Plus className="w-3.5 h-3.5 text-red-400" />
                  <span>YouTube</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleAddSocialLink("instagram", "Instagram", "https://www.instagram.com/eagleburgerband")}
                  className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold px-3 py-1.5 rounded-xl text-xs flex items-center gap-1.5 transition"
                  title="Add Instagram Profile"
                >
                  <Plus className="w-3.5 h-3.5 text-pink-400" />
                  <span>Instagram</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleAddSocialLink("custom", "Social Channel", "https://")}
                  className="bg-yellow-400 hover:bg-yellow-300 text-slate-950 font-bold px-3 py-1.5 rounded-xl text-xs flex items-center gap-1.5 transition shadow"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Channel</span>
                </button>
              </div>
            </div>

            {/* Social Links List */}
            <div className="space-y-3">
              {(siteNav.socialLinks || DEFAULT_SOCIAL_LINKS).length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-500 border border-dashed border-slate-800 rounded-xl">
                  No social channels configured. Click &quot;Add Channel&quot; to configure profiles.
                </div>
              ) : (
                (siteNav.socialLinks || DEFAULT_SOCIAL_LINKS).map((social, idx) => (
                  <div
                    key={social.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-xl bg-slate-950 border border-slate-800/80 hover:border-slate-700 transition"
                  >
                    <div className="flex items-center gap-3 flex-1">
                      <span className="w-6 text-center font-mono text-xs text-slate-500">
                        #{idx + 1}
                      </span>

                      {/* Icon preview */}
                      <div className="w-8 h-8 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-300 shrink-0">
                        <SocialIcon platform={social.platform} className="w-4 h-4" />
                      </div>

                      {/* Platform select */}
                      <select
                        value={social.platform}
                        onChange={(e) =>
                          handleUpdateSocialLink(idx, {
                            platform: e.target.value as SocialPlatform,
                            label:
                              social.label === "" ||
                              ["youtube", "instagram", "facebook", "tiktok", "spotify", "twitter", "bluesky", "custom"].includes(
                                social.label.toLowerCase()
                              )
                                ? e.target.value.charAt(0).toUpperCase() + e.target.value.slice(1)
                                : social.label,
                          })
                        }
                        className="bg-slate-900 border border-slate-800 rounded-lg px-2 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-yellow-400 font-medium"
                      >
                        <option value="youtube">YouTube</option>
                        <option value="instagram">Instagram</option>
                        <option value="facebook">Facebook</option>
                        <option value="tiktok">TikTok</option>
                        <option value="spotify">Spotify</option>
                        <option value="bluesky">Bluesky</option>
                        <option value="twitter">X / Twitter</option>
                        <option value="custom">Custom Platform</option>
                      </select>

                      {/* Channel Label */}
                      <input
                        type="text"
                        value={social.label}
                        placeholder="Channel Name"
                        onChange={(e) => handleUpdateSocialLink(idx, { label: e.target.value })}
                        className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs font-bold text-white focus:outline-none focus:border-yellow-400 w-32"
                      />

                      {/* Channel URL */}
                      <input
                        type="text"
                        value={social.href}
                        placeholder="https://..."
                        onChange={(e) => handleUpdateSocialLink(idx, { href: e.target.value })}
                        className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-300 font-mono focus:outline-none focus:border-yellow-400 flex-1"
                      />
                    </div>

                    <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                      {/* Visibility Toggle */}
                      <button
                        type="button"
                        onClick={() => handleToggleSocialLinkVisibility(idx)}
                        className={`p-1.5 rounded-lg border transition ${
                          social.isVisible
                            ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                            : "bg-slate-900 text-slate-500 border-slate-800 line-through"
                        }`}
                        title={social.isVisible ? "Channel is visible in footer" : "Channel is hidden"}
                      >
                        {social.isVisible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                      </button>

                      <div className="w-[1px] h-4 bg-slate-800 mx-1" />

                      <button
                        type="button"
                        disabled={idx === 0}
                        onClick={() => handleMoveSocialLink(idx, "up")}
                        className="p-1 text-slate-400 hover:text-white disabled:opacity-30 rounded hover:bg-slate-900"
                        title="Move Up"
                      >
                        <ArrowUp className="w-4 h-4" />
                      </button>

                      <button
                        type="button"
                        disabled={idx === (siteNav.socialLinks || DEFAULT_SOCIAL_LINKS).length - 1}
                        onClick={() => handleMoveSocialLink(idx, "down")}
                        className="p-1 text-slate-400 hover:text-white disabled:opacity-30 rounded hover:bg-slate-900"
                        title="Move Down"
                      >
                        <ArrowDown className="w-4 h-4" />
                      </button>

                      <div className="w-[1px] h-4 bg-slate-800 mx-1" />

                      <button
                        type="button"
                        onClick={() => handleRemoveSocialLink(idx)}
                        className="p-1 text-slate-500 hover:text-rose-400 rounded hover:bg-slate-900"
                        title="Delete Channel"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
            </div>
          )}
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

      {/* Resource Asset Picker Modal */}
      <ResourceAssetPickerModal
        isOpen={isAssetPickerOpen}
        onClose={() => setIsAssetPickerOpen(false)}
        onSelectAsset={handleSelectAsset}
        filterCategory={pickerFilterCategory}
        title={
          pickerTarget === "header"
            ? "Choose Page Header Banner"
            : pickerTarget === "browse"
            ? "Media & Resource Library"
            : "Choose Section Media"
        }
      />

      {/* Sticky Bottom Bar for Unsaved Changes */}
      <UnsavedChangesBar
        isDirty={isCurrentDirty}
        isSaving={isCurrentSaving}
        onSave={studioScope === "global" ? handleSaveNavigation : handleSavePage}
        onDiscard={studioScope === "global" ? handleDiscardNavChanges : handleDiscardPageChanges}
        message={
          studioScope === "global"
            ? "Unsaved global navigation & alert changes"
            : `Unsaved changes on "${activePage.title}"`
        }
        subMessage={
          studioScope === "global"
            ? "Save your site-wide navigation links and announcement banner updates, or discard to restore."
            : "Save your page content layout or discard to restore the last saved version."
        }
        saveLabel={
          studioScope === "global"
            ? "Save Global Nav & Alerts"
            : `Save Page: ${activePage.title}`
        }
        savingLabel={
          studioScope === "global"
            ? "Saving Global Config..."
            : "Saving Page..."
        }
        discardLabel="Discard Changes"
      />
    </div>
  );
}
