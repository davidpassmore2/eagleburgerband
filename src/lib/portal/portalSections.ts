import { LucideIcon } from "lucide-react";
import {
  BookOpen,
  Calendar,
  Users,
  Music2,
  LayoutTemplate,
  DollarSign,
  ShieldCheck,
} from "lucide-react";
import { ToolCategory } from "./workspaceRegistry";

export interface PortalSectionInfo {
  slug: string;
  category: ToolCategory;
  title: string;
  badge: string;
  description: string;
  icon: LucideIcon;
  href: string;
  colorScheme: {
    accent: string;
    border: string;
    bgGlow: string;
    text: string;
  };
  whatCanIDo: {
    title: string;
    description: string;
  }[];
}

export const PORTAL_SECTIONS: PortalSectionInfo[] = [
  {
    slug: "help-docs",
    category: "Help, Guides & Docs",
    title: "Help, Guides & Docs",
    badge: "Knowledge Base",
    description: "Searchable feature guides, system documentation, status lifecycles, and stage changelogs.",
    icon: BookOpen,
    href: "/portal/sections/help-docs",
    colorScheme: {
      accent: "text-sky-400",
      border: "border-sky-400/30",
      bgGlow: "bg-sky-400/10",
      text: "text-sky-300",
    },
    whatCanIDo: [
      {
        title: "Search Documentation & Guides",
        description: "Find quick answers and operational playbooks for rehearsals, call sheets, and music charts.",
      },
      {
        title: "Review Member Status Lifecycles",
        description: "Understand the differences between active, probationary, hiatus, and alumnus statuses in the Status Matrix.",
      },
      {
        title: "Explore Stage Release Changelogs",
        description: "Track platform enhancements, bug fixes, and continuous delivery history across every stage.",
      },
    ],
  },
  {
    slug: "performances-logistics",
    category: "Performances & Logistics",
    title: "Performances & Logistics",
    badge: "Live Operations",
    description: "Rehearsal schedules, gig call sheets, downbeat check-ins, blackout dates, and event dispatch.",
    icon: Calendar,
    href: "/portal/sections/performances-logistics",
    colorScheme: {
      accent: "text-emerald-400",
      border: "border-emerald-400/30",
      bgGlow: "bg-emerald-400/10",
      text: "text-emerald-300",
    },
    whatCanIDo: [
      {
        title: "RSVP & Check Rehearsals",
        description: "View weekly rehearsal dates, downbeat times, locations, and confirm your attendance.",
      },
      {
        title: "Review Gig Call Sheets",
        description: "Access complete call sheets with schedules, map links, uniform requirements, and logistics notes.",
      },
      {
        title: "My Availability & Blackouts",
        description: "Manage your personal schedule, log blackout dates, and toggle hiatus mode so leadership knows your availability.",
      },
      {
        title: "Day-of-Show Check-In & Dispatch",
        description: "Check in on gig day and receive automated notifications, SMS broadcasts, and call sheet updates.",
      },
    ],
  },
  {
    slug: "personnel-attendance",
    category: "Personnel & Attendance",
    title: "Personnel & Attendance",
    badge: "Band Roster",
    description: "Musician roster, section assignments, personal profile settings, attendance records, and uniform sizes.",
    icon: Users,
    href: "/portal/sections/personnel-attendance",
    colorScheme: {
      accent: "text-purple-400",
      border: "border-purple-400/30",
      bgGlow: "bg-purple-400/10",
      text: "text-purple-300",
    },
    whatCanIDo: [
      {
        title: "Browse the Band Roster",
        description: "Find fellow musicians, section leaders, and contact info across all brass and percussion sections.",
      },
      {
        title: "Manage Profile & SMS Notifications",
        description: "Update your mobile phone number, SMS preferences, emergency contacts, and instrument assignments.",
      },
      {
        title: "Track Personal Attendance",
        description: "Review your personal attendance history, check-in timestamps, and overall participation rate.",
      },
      {
        title: "Manage Sections & Inventory",
        description: "Section leaders and admins can oversee section roll calls, uniform shirt sizes, and band-owned equipment.",
      },
    ],
  },
  {
    slug: "music-repertoire",
    category: "Music & Repertoire",
    title: "Music & Repertoire",
    badge: "Charts & Audio",
    description: "Sheet music charts, setlist sequencing, audio reference recordings, suggestion triage, and repertoire analytics.",
    icon: Music2,
    href: "/portal/sections/music-repertoire",
    colorScheme: {
      accent: "text-amber-400",
      border: "border-amber-400/30",
      bgGlow: "bg-amber-400/10",
      text: "text-amber-300",
    },
    whatCanIDo: [
      {
        title: "Access Song Catalog & Sheet Music",
        description: "Search charts by title, tempo, key, and instrumentation. Download part PDFs for rehearsal or performance.",
      },
      {
        title: "Curate & Sequence Setlists",
        description: "Design balanced gig setlists, calculate set timing, organize transitions, and publish running orders.",
      },
      {
        title: "Listen to the Rehearsal Vault",
        description: "Stream high-quality rehearsal takes, section recordings, and tempo references directly in the browser.",
      },
      {
        title: "Suggest & Vote on Tunes",
        description: "Submit new song ideas for the band, upvote suggestions from other members, and track tune approval status.",
      },
      {
        title: "Analyze Repertoire & Performance History",
        description: "Explore setlist frequency, song performance history, and key variety across past shows.",
      },
    ],
  },
  {
    slug: "website-intake",
    category: "Website & Intake",
    title: "Website & Intake",
    badge: "Public & Intake",
    description: "CMS page studio, media asset library, booking leads, audition applications, and fan reviews.",
    icon: LayoutTemplate,
    href: "/portal/sections/website-intake",
    colorScheme: {
      accent: "text-pink-400",
      border: "border-pink-400/30",
      bgGlow: "bg-pink-400/10",
      text: "text-pink-300",
    },
    whatCanIDo: [
      {
        title: "Edit CMS Pages & Sections",
        description: "Customize headlines, hero banners, audition forms, and section ordering across all public system pages.",
      },
      {
        title: "Review Booking Leads & Inquiries",
        description: "Triage incoming performance requests from parade organizers, festivals, weddings, and community hosts.",
      },
      {
        title: "Manage Musician Auditions",
        description: "Review incoming player applications, instruments, and experience submissions from prospective members.",
      },
      {
        title: "Curate Testimonials & Media",
        description: "Publish glowing reviews from clients and upload performance photos to the shared cloud media library.",
      },
    ],
  },
  {
    slug: "finance",
    category: "Finance",
    title: "Finance",
    badge: "Treasury & Funds",
    description: "Band ledger, expense reimbursements, operational budgets, and charitable philanthropy.",
    icon: DollarSign,
    href: "/portal/sections/finance",
    colorScheme: {
      accent: "text-yellow-400",
      border: "border-yellow-400/30",
      bgGlow: "bg-yellow-400/10",
      text: "text-yellow-300",
    },
    whatCanIDo: [
      {
        title: "View Treasury & Reserve Health",
        description: "Review current operating fund balances, baseline reserves, season inflows/outflows, and transparent financial metrics.",
      },
      {
        title: "Submit & Track Expense Reimbursements",
        description: "Submit receipts for band repairs, travel fuel, lunch, or supplies with your Display Name. Treasurers can review, approve, or submit on behalf of members.",
      },
      {
        title: "Suggest & Support Charitable Causes",
        description: "Suggest local Pittsburgh grassroots organizations and youth music programs for band philanthropy, and explore funded beneficiaries.",
      },
      {
        title: "Reconcile Financial Ledger & Settlements",
        description: "Authorized treasurers can execute gig payout splits, record manual ledger transactions, and audit the complete history.",
      },
    ],
  },
  {
    slug: "business-admin",
    category: "Business & Admin",
    title: "Business & Admin",
    badge: "Admin & Operations",
    description: "Client CRM, comment moderation, audit logs, portal analytics, and third-party integrations.",
    icon: ShieldCheck,
    href: "/portal/sections/business-admin",
    colorScheme: {
      accent: "text-rose-400",
      border: "border-rose-400/30",
      bgGlow: "bg-rose-400/10",
      text: "text-rose-300",
    },
    whatCanIDo: [
      {
        title: "Manage Client CRM & Contacts",
        description: "Maintain relationship notes, coordinator emails, phone numbers, and past gigs for all venue partners.",
      },
      {
        title: "Inspect Security Audit Logs",
        description: "Monitor real-time system audit entries, administrative role changes, and data mutation history.",
      },
      {
        title: "Track Portal Usage Analytics",
        description: "Evaluate active user trends, popular studio features, and navigation heatmaps to improve workflows.",
      },
      {
        title: "Configure Integrations & Auth Methods",
        description: "Manage external authentication providers (Google, Apple, Microsoft, GitHub), third-party API keys, and navigation.",
      },
    ],
  },
];

/**
 * Find section info by category name.
 */
export function getSectionByCategory(category: string): PortalSectionInfo | undefined {
  return PORTAL_SECTIONS.find(
    (s) => s.category.toLowerCase() === category.toLowerCase()
  );
}

/**
 * Find section info by URL slug.
 */
export function getSectionBySlug(slug: string): PortalSectionInfo | undefined {
  return PORTAL_SECTIONS.find((s) => s.slug === slug);
}

/**
 * Get the section homepage URL for a given category.
 * Falls back to "/portal" if category is not recognized.
 */
export function getSectionHref(category: string): string {
  const section = getSectionByCategory(category);
  return section ? section.href : "/portal";
}

