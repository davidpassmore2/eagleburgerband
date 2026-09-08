import { Role } from "@/lib/auth/permissions";
import {
  Palette,
  FileText,
  Contact2,
  Inbox,
  MessageSquareQuote,
  Lightbulb,
  Library,
  Music,
  DollarSign,
  Layers,
  Users,
  CalendarCheck,
  LucideIcon,
} from "lucide-react";

export interface WorkspaceTool {
  id: string;
  title: string;
  description: string;
  href: string;
  icon: LucideIcon;
  requiredRoles: Role[];
  badgeCountKey?: "openSuggestions" | "flaggedComments";
}

export const WORKSPACE_TOOLS: WorkspaceTool[] = [
  {
    id: "sections-admin",
    title: "Band Sections",
    description: "Manage section titles, descriptions, leaders, and member rosters.",
    href: "/admin/sections",
    icon: Layers,
    requiredRoles: ["admin"],
  },
  {
    id: "roster-admin",
    title: "Band Roster & Invites",
    description: "Manage member accounts and issue onboarding tokens.",
    href: "/admin/roster",
    icon: Users,
    requiredRoles: ["admin"],
  },
  {
    id: "theme-manager",
    title: "Brand & Palette",
    description: "Adjust dynamic site colors and presets.",
    href: "/admin/theme",
    icon: Palette,
    requiredRoles: ["admin", "web_manager"],
  },
  {
    id: "cms-pages",
    title: "Page Studio",
    description: "Edit /about, /giving, and press kit narratives.",
    href: "/admin/pages",
    icon: FileText,
    requiredRoles: ["admin", "web_manager"],
  },
  {
    id: "client-crm",
    title: "Client CRM & Contacts",
    description: "Manage client directory, gig counts, and institutional notes.",
    href: "/admin/contacts",
    icon: Contact2,
    requiredRoles: ["admin", "gig_manager"],
  },
  {
    id: "booking-leads",
    title: "Booking Leads",
    description: "Triage inbound gig inquiries.",
    href: "/admin/inquiries",
    icon: Inbox,
    requiredRoles: ["admin", "gig_manager"],
  },
  {
    id: "catalog-manager",
    title: "Catalog Studio",
    description: "Promote tune lifecycle phases and maintain master charts.",
    href: "/admin/catalog",
    icon: Library,
    requiredRoles: ["admin", "catalog_manager"],
  },
  {
    id: "setlist-builder",
    title: "Setlist Studio",
    description: "Sequence performance sets for upcoming shows.",
    href: "/admin/setlists",
    icon: Music,
    requiredRoles: ["admin", "catalog_manager"],
  },
  {
    id: "community-moderation",
    title: "Comment Moderation",
    description: "Audit discourse, pin notices, and manage flagged feedback.",
    href: "/admin/comments",
    icon: MessageSquareQuote,
    requiredRoles: ["admin", "community_manager"],
  },
  {
    id: "suggestion-triage",
    title: "Suggestion Triage",
    description: "Review ideas from the member suggestion box.",
    href: "/admin/suggestions",
    icon: Lightbulb,
    requiredRoles: ["admin", "web_manager", "community_manager"],
  },
  {
    id: "charitable-giving",
    title: "Giving Ledger",
    description: "Log donations and export fiscal sponsorship accounting.",
    href: "/admin/giving",
    icon: DollarSign,
    requiredRoles: ["admin", "treasurer"],
  },
  {
    id: "section-headcount",
    title: "Section Attendance",
    description: "Review gig attendance breakdown for your section.",
    href: "/portal/section",
    icon: CalendarCheck,
    requiredRoles: ["admin", "section_leader"],
  },
];