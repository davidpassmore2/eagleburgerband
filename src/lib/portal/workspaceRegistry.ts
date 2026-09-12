import { LucideIcon } from "lucide-react";
import {
  Users,
  Layers,
  Calendar,
  ListMusic,
  Send,
  DollarSign,
  Contact,
  Inbox,
  Library,
  Lightbulb,
  Palette,
  MessageSquare,
  UserCheck,
  BarChart3,
  CheckSquare,
  PackageCheck,
  Music2,
  Music,
  LayoutTemplate,
  HeartHandshake,
  BookOpen,
  Mail,
  Smartphone,
  Receipt,
  UserCog,
  ShieldCheck,
} from "lucide-react";
import { Role } from "@/lib/auth/permissions";

export type ToolCategory =
  | "Performances & Logistics"
  | "Personnel & Attendance"
  | "Music & Repertoire"
  | "Business & Admin";

export interface WorkspaceTool {
  id: string;
  title: string;
  href: string;
  icon: LucideIcon;
  requiredRoles: Role[];
  category: ToolCategory;
}

export const WORKSPACE_TOOLS: WorkspaceTool[] = [
  // --- Performances & Logistics ---
  {
    id: "gigs",
    title: "Gig Management Studio",
    href: "/admin/gigs",
    icon: Calendar,
    requiredRoles: ["admin", "gig_manager"],
    category: "Performances & Logistics",
  },
  {
    id: "setlists",
    title: "Setlist Studio",
    href: "/admin/setlists",
    icon: ListMusic,
    requiredRoles: ["admin", "gig_manager", "catalog_manager"],
    category: "Performances & Logistics",
  },
  {
    id: "checkin",
    title: "Downbeat Check-In",
    href: "/admin/checkin",
    icon: UserCheck,
    requiredRoles: ["admin", "gig_manager", "section_leader"],
    category: "Performances & Logistics",
  },
  {
    id: "call-sheets",
    title: "Call Sheet Dispatch",
    href: "/admin/dispatch",
    icon: Send,
    requiredRoles: ["admin", "gig_manager"],
    category: "Performances & Logistics",
  },
  {
    id: "notifications",
    title: "Email & Broadcast Suite",
    href: "/admin/notifications",
    icon: Mail,
    requiredRoles: ["admin", "gig_manager", "membership_manager", "community_manager", "section_leader"],
    category: "Performances & Logistics",
  },

  // --- Personnel & Attendance ---
  {
    id: "profile",
    title: "My Profile & SMS Settings",
    href: "/portal/profile",
    icon: Smartphone,
    requiredRoles: ["member", "guest"],
    category: "Personnel & Attendance",
  },
  {
    id: "sections",
    title: "Band Sections",
    href: "/admin/sections",
    icon: Layers,
    requiredRoles: ["admin", "section_leader", "membership_manager"],
    category: "Personnel & Attendance",
  },
  {
    id: "roster",
    title: "Band Roster & Invites",
    href: "/admin/roster",
    icon: Users,
    requiredRoles: ["admin", "membership_manager"],
    category: "Personnel & Attendance",
  },
  {
    id: "attendance",
    title: "Section Attendance",
    href: "/admin/attendance",
    icon: CheckSquare,
    requiredRoles: ["admin", "section_leader"],
    category: "Personnel & Attendance",
  },
  {
    id: "assets",
    title: "Equipment & Assets",
    href: "/admin/inventory",
    icon: PackageCheck,
    requiredRoles: ["admin", "asset_manager"],
    category: "Personnel & Attendance",
  },
  {
    id: "users",
    title: "User & Role Studio",
    href: "/admin/users",
    icon: UserCog,
    requiredRoles: ["admin"],
    category: "Personnel & Attendance",
  },

  // --- Music & Repertoire ---
  {
    id: "tunes",
    title: "Tunes & Chart Library",
    href: "/admin/tunes",
    icon: Music,
    requiredRoles: ["admin", "catalog_manager", "section_leader", "member", "guest"],
    category: "Music & Repertoire",
  },
  {
    id: "library",
    title: "Repertoire Catalog",
    href: "/portal/library",
    icon: ListMusic,
    requiredRoles: ["admin", "catalog_manager", "section_leader", "member", "guest"],
    category: "Music & Repertoire",
  },
  {
    id: "catalog",
    title: "Catalog Studio",
    href: "/admin/catalog",
    icon: Library,
    requiredRoles: ["admin", "catalog_manager"],
    category: "Music & Repertoire",
  },
  {
    id: "catalog-analytics",
    title: "Repertoire Analytics",
    href: "/admin/analytics/catalog",
    icon: BarChart3,
    requiredRoles: ["admin", "catalog_manager"],
    category: "Music & Repertoire",
  },
  {
    id: "vault",
    title: "Rehearsal Vault",
    href: "/portal/vault",
    icon: Music2,
    requiredRoles: ["admin", "catalog_manager", "section_leader", "member"],
    category: "Music & Repertoire",
  },
  {
    id: "suggestions",
    title: "Suggestion Triage & Voting",
    href: "/admin/suggestions",
    icon: Lightbulb,
    requiredRoles: ["admin", "catalog_manager", "gig_manager", "web_manager", "community_manager", "section_leader", "member", "guest"],
    category: "Music & Repertoire",
  },

  // --- Business & Admin ---
  {
    id: "reimbursements",
    title: "Expense Reimbursements",
    href: "/portal/reimbursements",
    icon: Receipt,
    requiredRoles: ["member", "guest"],
    category: "Business & Admin",
  },
  {
    id: "finance",
    title: "Financial Ledger",
    href: "/admin/finance",
    icon: DollarSign,
    requiredRoles: ["admin", "treasurer"],
    category: "Business & Admin",
  },
  {
    id: "crm",
    title: "Client CRM & Contacts",
    href: "/admin/contacts",
    icon: Contact,
    requiredRoles: ["admin", "gig_manager"],
    category: "Business & Admin",
  },
  {
    id: "inquiries",
    title: "Booking Leads",
    href: "/admin/inquiries",
    icon: Inbox,
    requiredRoles: ["admin", "gig_manager"],
    category: "Business & Admin",
  },
  {
    id: "pages",
    title: "CMS Page Studio",
    href: "/admin/pages",
    icon: LayoutTemplate,
    requiredRoles: ["admin", "web_manager"],
    category: "Business & Admin",
  },
  {
    id: "brand",
    title: "Brand & Palette",
    href: "/admin/theme",
    icon: Palette,
    requiredRoles: ["admin", "web_manager"],
    category: "Business & Admin",
  },
  {
    id: "giving",
    title: "Charitable Giving & Donations",
    href: "/admin/giving",
    icon: HeartHandshake,
    requiredRoles: ["admin", "treasurer"],
    category: "Business & Admin",
  },
  {
    id: "moderation",
    title: "Comment Moderation",
    href: "/admin/comments",
    icon: MessageSquare,
    requiredRoles: ["admin"],
    category: "Business & Admin",
  },
  {
    id: "admin-log",
    title: "Admin Action Audit Log",
    href: "/admin/audit-log",
    icon: ShieldCheck,
    requiredRoles: ["admin"],
    category: "Business & Admin",
  },
  {
    id: "help",
    title: "Help & Documentation",
    href: "/portal/help",
    icon: BookOpen,
    requiredRoles: ["member"],
    category: "Business & Admin",
  },
];