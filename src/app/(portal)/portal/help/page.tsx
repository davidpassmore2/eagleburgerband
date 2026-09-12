"use client";

import React, { useState, useMemo, useEffect, useSyncExternalStore } from "react";
import Link from "next/link";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { useAuth } from "@/lib/context/AuthContext";
import { Role, hasRole } from "@/lib/auth/permissions";
import { User, UserSchema } from "@/lib/schema/user";
import { Section, SectionSchema } from "@/lib/schema/section";
import {
  BookOpen,
  Search,
  Compass,
  ShieldCheck,
  HelpCircle,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  Filter,
  Copy,
  Check,
  Lightbulb,
  Shield,
  ShieldAlert,
  Users,
  User as UserIcon,
  Music,
  Calendar,
  DollarSign,
  Globe,
  UserPlus,
  Package,
  Megaphone,
  UserCheck,
  Mail,
  Phone,
  LayoutGrid,
  Table as TableIcon,
} from "lucide-react";

export type HelpCategory =
  | "All Routes"
  | "Musician Essentials"
  | "Performances & Logistics"
  | "Personnel & Attendance"
  | "Music & Repertoire"
  | "Business & Public Web"
  | "Portal Roles & Members"
  | "Permissions Matrix"
  | "FAQs";

interface RouteDoc {
  id: string;
  title: string;
  path: string;
  category: "Musician Essentials" | "Performances & Logistics" | "Personnel & Attendance" | "Music & Repertoire" | "Business & Public Web";
  roles: Role[];
  badge: string;
  iconName: string;
  summary: string;
  description: string;
  keyFeatures: string[];
  howToUse: string[];
  proTips: string[];
  relatedRoutes?: { title: string; path: string }[];
}

const ROUTE_DOCS: RouteDoc[] = [
  // --- Musician Essentials ---
  {
    id: "home-base",
    title: "Home Base & Musician Dashboard",
    path: "/portal",
    category: "Musician Essentials",
    roles: ["member"],
    badge: "Core Musician Dashboard",
    iconName: "Compass",
    summary: "Central hub for upcoming gigs, personal RSVP status, rehearsals, band alerts, and personal earnings.",
    description: "Home Base is the primary landing page for every Eagleburger Band musician. It provides a real-time snapshot of the ensemble's next scheduled performances, immediate calls for attendance confirmation, quick links to sheet music charts, and personal earnings from compensated performances.",
    keyFeatures: [
      "Live countdown and overview of the next upcoming performance.",
      "1-click RSVP status toggle (Attending, Declined, Tentative) for pending gigs.",
      "Calendar subscription modal offering universal webcal/iCal feeds for Apple Calendar, Google Calendar, and Outlook.",
      "Personal season gig tally and earnings reconciliation record.",
      "Pinned band announcements and operational alerts from gig managers."
    ],
    howToUse: [
      "Check your dashboard weekly for newly announced rehearsals, street parades, or private booking requests.",
      "Click 'Subscribe to Calendar' to auto-sync performance call times directly into your smartphone's native calendar app.",
      "Review any pending RSVPs and confirm your attendance so section leaders can monitor instrumentation balance.",
      "Use the quick links to immediately view call sheets, setlists, and sheet music charts for upcoming appearances."
    ],
    proTips: [
      "Keep calendar sync enabled—changes made by gig coordinators to call times or staging addresses sync automatically to your device.",
      "Always update your RSVP as soon as a gig is announced, even if tentative, to help coordinators forecast section rosters."
    ],
    relatedRoutes: [
      { title: "Gig Central", path: "/portal/gigs" },
      { title: "Music Vault", path: "/portal/library" }
    ]
  },
  {
    id: "gig-central",
    title: "Gig Central & Performance RSVPs",
    path: "/portal/gigs",
    category: "Musician Essentials",
    roles: ["member"],
    badge: "Performance Logistics",
    iconName: "Calendar",
    summary: "Complete performance schedule, call times, downbeat, uniform attire, compensation, and venue addresses.",
    description: "Gig Central displays the full roster of confirmed, tentative, and past performances. Musicians use this view to inspect detailed performance logistics—including staging addresses, unloading instructions, attire (e.g. Band Polo, Street Brass Festive), and compensation amounts—and manage their official attendance commitments.",
    keyFeatures: [
      "Chronological performance timeline with status badges (Confirmed, Pending, In Progress, Completed).",
      "Detailed logistical cards with Call Time, Downbeat, Expected End, and Venue Address.",
      "Three-state RSVP buttons: Attending (Green), Declined (Red), and Tentative (Amber).",
      "Real-time section attendance headcounts showing how many players are committed per instrument.",
      "Direct Google Maps navigation links to staging addresses and musician parking areas."
    ],
    howToUse: [
      "Navigate to Gig Central from the sidebar or Home Base.",
      "Click on any gig card to expand the full logistical drawer.",
      "Select your attendance status for upcoming shows.",
      "Note specific attire guidelines (e.g. brass sunglasses, band t-shirt, formal black) and downbeat times.",
      "If your status changes, update your RSVP promptly and leave a note if arriving late."
    ],
    proTips: [
      "Call time is strictly enforced for warmup, tuning, and staging—plan to arrive at least 15 minutes before stated call time.",
      "Attending counts update live: watch your section's headcount to ensure all necessary parts (e.g. Sousaphone, Snare) are covered."
    ],
    relatedRoutes: [
      { title: "Home Base", path: "/portal" },
      { title: "Call Sheet Dispatch", path: "/admin/dispatch" }
    ]
  },
  {
    id: "music-vault",
    title: "Music Vault & Sheet Music Repertoire",
    path: "/portal/library",
    category: "Musician Essentials",
    roles: ["admin", "catalog_manager", "section_leader", "member", "guest"],
    badge: "Sheet Music & Audio",
    iconName: "Music2",
    summary: "Interactive chart library, instrument part PDFs, rehearsal audio recordings, key signatures, and tempo notes.",
    description: "The Music Vault is the digital library for all active, rehearsal, and archival arrangements played by the Eagleburger Band. Musicians can filter charts by title, tempo, key, or genre, download instrument-specific PDF parts for printing or digital tablet readers, and listen to reference audio recordings.",
    keyFeatures: [
      "Instant search and filter by tune title, composer, arranger, style, and difficulty.",
      "Rotation and lifecycle filtering: Active rotation, In Repertoire (learn & maintain), Frequently Played, and Vaulted charts.",
      "Instrument-specific PDF part downloads (Trumpet 1/2, Trombone 1/2, Alto/Tenor/Bari Sax, Sousaphone, Snare, Bass Drum, Cymbals).",
      "Embedded reference audio recordings for practicing tempo, feel, and articulation.",
      "Tagging system (e.g. #parade, #funk, #second-line, #fanfare, #holiday).",
      "Direct setlist cross-referencing indicating which songs are scheduled for upcoming gigs."
    ],
    howToUse: [
      "Open the Music Vault from the sidebar navigation.",
      "Use the search box or genre tags to find the chart you need.",
      "Click your instrument section tab to view and download your specific part PDF.",
      "Load PDF parts into your digital reader (e.g. forScore, MobileSheets) or print 2-up for your flip folder.",
      "Stream the reference recording while reviewing the chart to master street cuts and solo sections."
    ],
    proTips: [
      "Use the 'In Repertoire' filter to quickly audit all deep-catalog tunes you should have ready in your flip folder even if not scheduled for this weekend.",
      "Store offline copies of all active parade charts on your tablet or smartphone before gig day in case venue reception is poor.",
      "Listen to the rehearsal audio to learn unwritten drum breaks, vocal cues, and street march choreo."
    ],
    relatedRoutes: [
      { title: "Catalog Studio", path: "/admin/catalog" },
      { title: "Setlist Studio", path: "/admin/setlists" }
    ]
  },
  {
    id: "band-roster",
    title: "Band Roster & Musician Directory",
    path: "/portal/roster",
    category: "Musician Essentials",
    roles: ["member"],
    badge: "Musician Directory",
    iconName: "Users",
    summary: "Ensemble membership directory, section rosters, instrument assignments, and contact channels.",
    description: "The Musician Directory lists all active members of the Eagleburger Band organized by instrument section. It allows musicians to connect with section leaders, find subs or doubling players, and check band-wide section representation.",
    keyFeatures: [
      "Section breakdown (Trumpets, Trombones, Saxophones, Sousaphones, Drum Battery).",
      "Designated Section Leader badges and contact buttons.",
      "Musician contact details (Email, Phone, Discord handle).",
      "Instrument doubling notes (e.g. Tenor Sax doubling on Flute or Percussion).",
      "Member status indicators (Active, Emeritus, Sub/Guest)."
    ],
    howToUse: [
      "Visit the Band Roster to locate musicians in your section or across the band.",
      "Click on a section leader to view their contact information for rehearsal questions or excused absences.",
      "Verify that your own profile information and instrument assignments are accurate in your profile settings."
    ],
    proTips: [
      "If you play multiple instruments, notify your Section Leader so you can be placed where instrumentation needs are highest.",
      "Use the directory to arrange carpools and gear transport for regional parades and festivals."
    ],
    relatedRoutes: [
      { title: "Band Sections", path: "/admin/sections" },
      { title: "Roster Administration", path: "/admin/roster" }
    ]
  },
  {
    id: "musician-profile",
    title: "My Profile & SMS Settings",
    path: "/portal/profile",
    category: "Musician Essentials",
    roles: ["member"],
    badge: "Profile & SMS Consent",
    iconName: "Smartphone",
    summary: "Personal musician contact information, mobile phone verification, and SMS text briefing opt-in/opt-out consent.",
    description: "The Musician Profile allows every band member to manage their contact details, verify their mobile phone number, and control their SMS notification preferences. Band members can opt into urgent SMS text briefings (call time shifts, gate access, parking updates) with timestamped consent records compliant with TCPA regulations.",
    keyFeatures: [
      "Contact information management including display name, email, and mobile phone number.",
      "Interactive SMS text briefing toggle with verified opt-in/opt-out consent tracking.",
      "Real-time timestamp logging (smsConsentUpdatedAt) for verifiable consent compliance.",
      "Live smartphone SMS briefing preview illustrating what text alerts look like in the field.",
      "Direct integration with the Broadcast Notification Suite for instant rehearsal and gig day alerts."
    ],
    howToUse: [
      "Navigate to My Profile from the sidebar or by clicking your pinned user avatar in the portal header.",
      "Enter your active mobile phone number with standard 10-digit area code.",
      "Toggle 'Enable SMS Text Briefings' to opt in to urgent gig alerts.",
      "Review the live sample SMS preview to see how broadcasts will appear on your phone.",
      "Click 'Save Profile Changes' to update your account and consent timestamp."
    ],
    proTips: [
      "Enable SMS alerts before parade season: street road closures and last-minute staging shifts are dispatched via text briefing.",
      "You can opt out anytime with 1 click in this studio or by replying STOP to any automated broadcast."
    ],
    relatedRoutes: [
      { title: "Home Base", path: "/portal" },
      { title: "Notification Suite", path: "/admin/notifications" }
    ]
  },

  // --- Performances & Logistics ---
  {
    id: "admin-gigs",
    title: "Gig Management Studio",
    path: "/admin/gigs",
    category: "Performances & Logistics",
    roles: ["admin", "gig_manager"],
    badge: "Logistics Administration",
    iconName: "Calendar",
    summary: "Comprehensive lifecycle management for band performances from initial booking to post-gig wrapup.",
    description: "The Gig Management Studio is the operational control center for gig managers and band administrators. Here, coordinators schedule new gigs, specify detailed call times and downbeats, establish financial compensation budgets, configure required instrumentation slots, and toggle public visibility on the marketing site.",
    keyFeatures: [
      "Full CRUD operations for gigs with automated Zod validation against GigSchema.",
      "Status workflow engine: Draft -> Confirmed -> In Progress -> Completed -> Cancelled.",
      "Logistics editor: Call Time, Downbeat, Attire guidelines, Unloading address, Musician compensation.",
      "Public marketing toggle (isPublic: boolean) controlling syndication to the public gigs page.",
      "Live RSVP telemetry showing total attending vs required instrumentation per section."
    ],
    howToUse: [
      "To schedule a gig, click '+ New Gig' and choose whether to create from scratch or convert an inbound booking inquiry.",
      "Enter public event details (Title, Venue, Date, City, Admission info).",
      "Configure internal logistics (Call Time, Downbeat, Attire, Parking & Unloading notes, Musician Pay).",
      "Toggle 'Publish to Fan Site' when the gig is confirmed and ready for public visibility.",
      "Save changes; real-time notifications and calendar feeds will automatically reflect the update."
    ],
    proTips: [
      "Set the public visibility flag only after contracts and venue permits are fully confirmed.",
      "Always specify exact unloading GPS coordinates—many street parades close down nearby roads hours in advance."
    ],
    relatedRoutes: [
      { title: "Call Sheet Dispatch", path: "/admin/dispatch" },
      { title: "Downbeat Check-In", path: "/admin/checkin" },
      { title: "Setlist Studio", path: "/admin/setlists" }
    ]
  },
  {
    id: "admin-setlists",
    title: "Setlist Studio",
    path: "/admin/setlists",
    category: "Performances & Logistics",
    roles: ["admin", "gig_manager", "catalog_manager"],
    badge: "Show Curation",
    iconName: "ListMusic",
    summary: "Curate and arrange performance setlists, tune orders, keys, transitions, and timing for specific gigs.",
    description: "Setlist Studio allows musical directors and gig coordinators to build performance setlists tailored to each gig's venue, crowd demographic, and performance length. Songs from the Master Catalog can be arranged into sets, annotated with tempo, key, and transition cues, and published to musician call sheets.",
    keyFeatures: [
      "Drag-and-drop tune ordering with estimated set duration calculation.",
      "Direct integration with the Master Catalog showing tune keys, tempos, and style tags.",
      "Performance notes per tune (e.g. 'Drum intro', 'Trumpet solo feature', 'Fade on repeat').",
      "Multi-set support (e.g. Set 1: Parade March, Set 2: Beer Garden Stage Show).",
      "1-click publish linking the curated setlist directly to the gig's digital call sheet."
    ],
    howToUse: [
      "Select the target performance from the gig dropdown.",
      "Browse the catalog drawer on the right and click '+' to add charts to the setlist.",
      "Reorder tunes using drag handles or up/down controls to balance energy and key flow.",
      "Add transition notes or soloist assignments directly on the tune card.",
      "Click 'Save Setlist' to immediately update the gig's call sheet and musician views."
    ],
    proTips: [
      "Avoid programming three high-register brass blowout charts in a row—alternate energetic funk tunes with vocal or rhythm features.",
      "Include 2-3 backup parade loops in your setlist for unexpected parade bottlenecks."
    ],
    relatedRoutes: [
      { title: "Catalog Studio", path: "/admin/catalog" },
      { title: "Call Sheet Dispatch", path: "/admin/dispatch" }
    ]
  },
  {
    id: "admin-checkin",
    title: "Downbeat Musician Check-In",
    path: "/admin/checkin",
    category: "Performances & Logistics",
    roles: ["admin", "gig_manager", "section_leader"],
    badge: "Day-of-Show Operations",
    iconName: "UserCheck",
    summary: "Fast mobile-first roll call at staging sites to record musician physical presence before the downbeat.",
    description: "Downbeat Check-In is designed for section leaders and gig managers on the street. With a streamlined, tap-to-verify interface, coordinators can rapidly confirm who has arrived at the staging area, identify missing instruments, and make last-minute lineup adjustments.",
    keyFeatures: [
      "High-speed 1-tap check-in with large tap targets optimized for outdoor mobile use.",
      "Section-by-section breakdown indicating present, late, and absent players.",
      "Instant instrumentation tally highlighting missing critical voices (e.g. no Sousaphone present).",
      "Timestamped attendance records stored directly into Firestore attendance tracking.",
      "Quick call/SMS shortcuts to reach players who have not checked in 15 minutes before downbeat."
    ],
    howToUse: [
      "Open Downbeat Check-In on your mobile device upon arriving at the staging area.",
      "Select the active performance.",
      "Tap on each arriving musician's name to toggle their status to 'Checked In'.",
      "Review the section summary at the top to confirm minimum instrumentation requirements.",
      "Mark any unexcused absences; records are archived automatically for attendance reporting."
    ],
    proTips: [
      "Section leaders should begin roll call 20 minutes before call time so coordinators know if emergency part reassignments are necessary.",
      "Offline resilient: if cell reception is weak at crowded festivals, status updates queue and sync once reconnected."
    ],
    relatedRoutes: [
      { title: "Call Sheet Dispatch", path: "/admin/dispatch" },
      { title: "Section Attendance", path: "/admin/attendance" }
    ]
  },
  {
    id: "admin-dispatch",
    title: "Call Sheet Dispatch & Live Communications",
    path: "/admin/dispatch",
    category: "Performances & Logistics",
    roles: ["admin", "gig_manager"],
    badge: "Dispatch & Alerts",
    iconName: "Send",
    summary: "Publish finalized call sheets, broadcast emergency logistics changes, and track musician acknowledgments.",
    description: "Call Sheet Dispatch is the central broadcasting station for finalized performance logistics. Gig managers use this workspace to lock in final call sheets, generate shareable links, and push real-time alerts to the band regarding parking changes, weather delays, or staging updates.",
    keyFeatures: [
      "Formal call sheet generation with complete itinerary, attire, setlist, and contact roster.",
      "Broadcast alerts with priority tiers: Routine Info (Blue), Urgent Logistics (Amber), Emergency (Red).",
      "Direct integration with Twilio SMS / Email webhooks for multi-channel dispatch.",
      "Live acknowledgment telemetry showing which musicians have opened and read the call sheet.",
      "Shareable public call-sheet URL for contracted guest musicians and sound engineers."
    ],
    howToUse: [
      "Select the upcoming gig and review the auto-assembled call sheet details.",
      "Verify that venue contact numbers, GPS staging links, and setlists are accurate.",
      "Click 'Dispatch Call Sheet' to push notifications to all rostered musicians.",
      "If rain or timing delays occur on gig day, use the 'Emergency Logistics Change' banner to blast instant updates."
    ],
    proTips: [
      "Dispatch call sheets 48 to 72 hours prior to performance day to allow musicians to plan transit and childcare.",
      "Always double check parking restrictions—remind brass players to pack their instrument cases if marching away from cars."
    ],
    relatedRoutes: [
      { title: "Gig Management", path: "/admin/gigs" },
      { title: "Broadcasts", path: "/admin/notifications" }
    ]
  },
  {
    id: "admin-notifications",
    title: "Email & SMS Notification Suite & Broadcast Studio",
    path: "/admin/notifications",
    category: "Performances & Logistics",
    roles: ["admin", "gig_manager", "membership_manager", "community_manager", "section_leader"],
    badge: "Email & SMS Broadcasts",
    iconName: "Mail",
    summary: "Full WYSIWYG email and SMS text briefing authoring, 3-mode channel routing, audience consent telemetry, and delivery audit logs.",
    description: "The Email & SMS Broadcast Notification Suite empowers band leadership to craft and dispatch branded HTML emails, instant mobile SMS briefings, or synchronized dual-channel broadcasts. Features 6 battle-tested scenario presets (New Member Invitations, Client Thank-Yous, Gig Call Sheets, RSVP Requests, Urgent Logistics, and Custom Announcements), live SMS consent telemetry (tracking opted-in, missing phone, and opted-out recipients), interactive preview simulator with smartphone chat bubble rendering, and granular delivery audit logs.",
    keyFeatures: [
      "3-Mode Dispatch Selector: Rich Email Broadcast, Instant SMS Text Briefing, or Dual (Both Email & SMS).",
      "SMS Text Briefing Editor with live character count (X/160 chars) and standard segment counter.",
      "Audience SMS Consent Telemetry computing verified opted-in, missing phone, and opted-out recipients before dispatch.",
      "WYSIWYG Rich-Text Editor with HTML code switching and automatic DOMPurify sanitization.",
      "6 Scenario Presets with tailored email copy and dedicated SMS text briefings for each event.",
      "Dynamic Variable Token Interpolation ({{recipient_name}}, {{gig_title}}, {{call_time}}, {{invite_url}}).",
      "Interactive Multi-Viewport Simulator: Desktop Email, Mobile Email, and Smartphone SMS Chat Bubble.",
      "Comprehensive Delivery Audit Log with channel filters (Email, SMS, Dual), search, and recipient inspection."
    ],
    howToUse: [
      "Choose your dispatch channel: Email Broadcast, SMS Text Briefing, or Both Email & SMS.",
      "Select a notification scenario preset (e.g. Gig Details or Urgent Update) or start from scratch.",
      "Choose your target audience (All Band, Section, Gig Attending Roster, Musician, CRM Client, or Direct).",
      "Review the Audience SMS Consent Telemetry banner to check how many recipients have opted in.",
      "Draft your SMS briefing text or rich email body, using dynamic tokens to personalize messages.",
      "Toggle between Desktop, Mobile, and SMS views in the live simulator to verify layout.",
      "Click 'Dispatch' to broadcast immediately and audit the delivery in the Delivery Logs tab."
    ],
    proTips: [
      "For day-of-show weather delays or gate shifts, select 'SMS Text Briefing' to reach musicians immediately without requiring them to check their inbox.",
      "Keep SMS text briefings under 160 characters when possible to fit within a single standard carrier segment.",
      "Check the SMS Consent Telemetry before dispatching—if key players are missing phones, remind them to update their profile."
    ],
    relatedRoutes: [
      { title: "My Profile & SMS Settings", path: "/portal/profile" },
      { title: "Call Sheet Dispatch", path: "/admin/dispatch" },
      { title: "Band Roster & Invites", path: "/admin/roster" },
      { title: "Client CRM & Contacts", path: "/admin/contacts" }
    ]
  },

  // --- Personnel & Attendance ---
  {
    id: "admin-sections",
    title: "Band Sections & Instrumentation",
    path: "/admin/sections",
    category: "Personnel & Attendance",
    roles: ["admin", "section_leader", "membership_manager"],
    badge: "Section Management",
    iconName: "Layers",
    summary: "Configure instrument sections, assign section leaders, audit part depth, and establish voicing requirements.",
    description: "The Band Sections workspace organizes the ensemble's musical voices. Administrators and section leaders manage section rosters, appoint section leaders, set target headcounts for parades and stage shows, and audit instrumentation balance.",
    keyFeatures: [
      "Section configuration for Trumpets, Trombones, Saxes, Sousaphones/Low Brass, and Drum Battery.",
      "Section Leader appointment with elevated section roll-call and suggestion permissions.",
      "Minimum and optimal headcount thresholds per section for parade readiness.",
      "Instrumentation balance audit highlighting under-represented voices (e.g. Bass Drum, Bari Sax)."
    ],
    howToUse: [
      "Review each section card to verify member counts and leadership designations.",
      "Click on a section to reassign musicians or appoint a new Section Leader.",
      "Adjust optimal headcount targets based on seasonal parade demands."
    ],
    proTips: [
      "Ensure every section has an active Section Leader and an assistant leader for backup on multi-gig weekends.",
      "Review section depth before agreeing to simultaneous or back-to-back parade bookings."
    ],
    relatedRoutes: [
      { title: "Roster Administration", path: "/admin/roster" },
      { title: "Section Attendance", path: "/admin/attendance" }
    ]
  },
  {
    id: "admin-roster-mgmt",
    title: "Roster Administration, Invites & Roles",
    path: "/admin/roster",
    category: "Personnel & Attendance",
    roles: ["admin", "membership_manager"],
    badge: "Member Administration",
    iconName: "Users",
    summary: "Manage member accounts, assign RBAC permissions, issue invite codes, and update instrument profiles.",
    description: "Roster Administration provides governance over all musician user profiles. Membership managers and admins grant role permissions, onboard new recruits via secure invite codes, track instrument capabilities, and manage membership statuses.",
    keyFeatures: [
      "Multi-role assignment engine (admin, gig_manager, catalog_manager, treasurer, section_leader, member).",
      "Secure 1-time invite code generator for onboarding vetted new brass and percussion players.",
      "Musician profile editing: Primary instrument, secondary instruments, contact numbers, jersey size.",
      "Active, Inactive, and Alumni status filters.",
      "Fast member search and exportable CSV directory."
    ],
    howToUse: [
      "To invite a new musician, click 'Generate Invite Code', choose their primary instrument, and share the link.",
      "To modify a member's permissions, click 'Edit Roles' and toggle authorized RBAC checkboxes.",
      "Keep instrument proficiencies up to date so section leaders know who can double on aux percussion or low brass."
    ],
    proTips: [
      "Follow the principle of least privilege: assign specialized roles (e.g. 'catalog_manager' or 'gig_manager') rather than full 'admin'.",
      "Deactivate inactive members before the summer season to maintain clean RSVP metrics."
    ],
    relatedRoutes: [
      { title: "Band Sections", path: "/admin/sections" },
      { title: "Equipment Assets", path: "/admin/inventory" }
    ]
  },
  {
    id: "admin-attendance-mgmt",
    title: "Section Attendance & Reliability Tracker",
    path: "/admin/attendance",
    category: "Personnel & Attendance",
    roles: ["admin", "section_leader"],
    badge: "Attendance Analytics",
    iconName: "CheckSquare",
    summary: "Historical attendance metrics, reliability scores, excused absence records, and rehearsal participation.",
    description: "The Attendance Tracker compiles attendance records from gig roll calls and rehearsals. Section leaders use this data to evaluate lineup reliability, reward high-attendance players with feature solo slots, and identify musicians who may need support.",
    keyFeatures: [
      "Ensemble-wide and section-filtered attendance rate percentages.",
      "Individual musician attendance histories: Gigs Attended, Excused Absences, No-Shows.",
      "Date range filtering (Full Year, Spring Season, Fall Parades).",
      "Reliability badge indicators (High Reliability > 85%, Moderate 60-84%, Needs Review < 60%)."
    ],
    howToUse: [
      "Filter records by instrument section or performance date range.",
      "Review attendance trends ahead of high-profile civic parades to select dependable core lineups.",
      "Manually record excused absences when musicians give advance notice of work or family conflicts."
    ],
    proTips: [
      "Reliability ratings help gig coordinators fairly distribute high-paying private gigs and VIP festival slots.",
      "Cross-reference low attendance with instrument shortages to proactively recruit section subs."
    ],
    relatedRoutes: [
      { title: "Downbeat Check-In", path: "/admin/checkin" },
      { title: "Band Sections", path: "/admin/sections" }
    ]
  },
  {
    id: "admin-inventory",
    title: "Equipment & Gear Asset Management",
    path: "/admin/inventory",
    category: "Personnel & Attendance",
    roles: ["admin", "asset_manager"],
    badge: "Asset Tracking",
    iconName: "PackageCheck",
    summary: "Track band-owned marching drums, harnesses, banners, megaphones, sousaphone stands, and merch.",
    description: "Equipment & Asset Management tracks all capital gear and instruments owned by the Eagleburger Band. The asset manager monitors who currently holds each drum or megaphone, records maintenance history and damage reports, and manages consumable supplies like drumsticks and harness padding.",
    keyFeatures: [
      "Complete equipment catalog with serial numbers, condition ratings (Mint, Good, Fair, Damaged), and purchase dates.",
      "Custodian assignment linking band instruments to active musicians.",
      "Check-in / Check-out custody logs for multi-gig festivals.",
      "Maintenance tracking for drumhead replacements, sousaphone bell repairs, and banner cleaning."
    ],
    howToUse: [
      "Click '+ Add Asset' to record newly acquired band property.",
      "Assign custody of marching drums, cymbals, or megaphones to the responsible musician.",
      "Log routine maintenance notes (e.g. 'Snare head replaced August 2026') and repair expenses."
    ],
    proTips: [
      "Perform a full asset audit twice yearly: before the Memorial Day kickoff and after the Greenfield Holiday Parade.",
      "Always record serial numbers—essential for filing insurance claims in the event of venue theft or damage."
    ],
    relatedRoutes: [
      { title: "Roster Administration", path: "/admin/roster" },
      { title: "Financial Ledger", path: "/admin/finance" }
    ]
  },

  // --- Music & Repertoire ---
  {
    id: "admin-catalog-mgmt",
    title: "Master Repertoire Catalog & Sheet Music",
    path: "/admin/catalog",
    category: "Music & Repertoire",
    roles: ["admin", "catalog_manager"],
    badge: "Catalog Administration",
    iconName: "Library",
    summary: "Master repository for all band charts, score uploads, instrument part PDF storage, and arrangers.",
    description: "The Master Catalog Studio is the administrative backend for the Music Vault. Catalog managers upload and version sheet music part PDFs, attach rehearsal audio tracks, organize difficulty levels, and maintain copyright compliance and arranger attribution.",
    keyFeatures: [
      "Tune metadata management: Title, Composer, Arranger, Musical Key, Tempo (BPM), Style/Genre.",
      "Direct PDF part file uploads to Firebase Storage for every instrument section.",
      "Reference audio MP3 / streaming links.",
      "Catalog lifecycle status: In Rehearsal, Active Gig Repertoire, Archival, Retired.",
      "Instant sync to the musician-facing Music Vault (/portal/library)."
    ],
    howToUse: [
      "Click '+ New Tune' to add a newly arranged street brass chart to the library.",
      "Enter tune details (Title, Key, Style, Tempo, Arranger credits).",
      "Upload individual instrument part PDFs (Trumpet, Trombone, Saxes, Sousaphone, Percussion).",
      "Set the catalog status to 'In Rehearsal' while the band woodsheds the chart, then switch to 'Active' when gig-ready."
    ],
    proTips: [
      "Label uploaded PDFs with consistent filenames (e.g. 'TuneTitle_Trumpet1.pdf') for clean mobile reader indexing.",
      "Always upload both transposed horn parts and concert pitch master lead sheets for rhythm section reference."
    ],
    relatedRoutes: [
      { title: "Music Vault", path: "/portal/library" },
      { title: "Catalog Analytics", path: "/admin/analytics/catalog" },
      { title: "Suggestion Triage", path: "/admin/suggestions" }
    ]
  },
  {
    id: "admin-catalog-analytics",
    title: "Repertoire Performance Analytics",
    path: "/admin/analytics/catalog",
    category: "Music & Repertoire",
    roles: ["admin", "catalog_manager"],
    badge: "Repertoire Intelligence",
    iconName: "BarChart3",
    summary: "Data analytics on song performance frequency, crowd favorites, and setlist diversity.",
    description: "Repertoire Analytics mines historical setlists to provide data-driven insights into the band's musical rotation. Musical directors can identify overplayed charts, uncover forgotten gems, and ensure the ensemble maintains a diverse, energetic catalog.",
    keyFeatures: [
      "Tune performance frequency leaderboard (Top 10 Most Played charts).",
      "Dormant charts report (songs not performed in the last 6 months).",
      "Genre and tempo distribution charts (balancing funk, second line, pop, and marches).",
      "Gig type correlation (which charts perform best at civic parades vs craft breweries)."
    ],
    howToUse: [
      "Inspect the leaderboard to see which tunes are anchoring the band's season.",
      "Review the 'Dormant Charts' list ahead of rehearsal planning to revive fan-favorite repertoire.",
      "Use genre breakdown charts to identify musical gaps when commissioning new arrangements."
    ],
    proTips: [
      "Aim for at least 30% rotation in your standard festival set to keep performances fresh for loyal fans.",
      "Retire charts that haven't been called in over 18 months to keep flip folders lightweight."
    ],
    relatedRoutes: [
      { title: "Master Catalog", path: "/admin/catalog" },
      { title: "Setlist Studio", path: "/admin/setlists" }
    ]
  },
  {
    id: "admin-tunes",
    title: "Repertoire Studio & Chart Library",
    path: "/admin/tunes",
    category: "Music & Repertoire",
    roles: ["admin", "catalog_manager", "section_leader", "member", "guest"],
    badge: "Repertoire & Charts",
    iconName: "Music",
    summary: "Search, view, and submit band charts, tempo/key info, sheet music parts, and arrangement links.",
    description: "Repertoire Studio is the open chart library and submission hub for the Eagleburger Band. All members can search active tunes, explore arrangements and sheet music links, and submit newly charted tunes with keys, tempos, genres, and difficulty levels.",
    keyFeatures: [
      "Open access for all musicians to browse, search, and submit band tunes and charts.",
      "Dual-sync catalog integration syncing records across the repertoire database.",
      "Four-stage lifecycle statuses: Active Rotation, In Repertoire (learn & maintain), In Rehearsal, and Archived.",
      "Detailed musical metadata: Key signature, BPM tempo, genre styling, and difficulty tier.",
      "Direct link attachment for rehearsal recordings, score PDFs, and chart contact attribution.",
      "Submitter chart editing permissions with admin and catalog manager deletion controls."
    ],
    howToUse: [
      "Open Repertoire Studio from the sidebar or Home Base quick actions.",
      "Use the instant search, genre filters, and status chips (All, Active, In Repertoire, In Rehearsal) to find charts.",
      "Click '+ Add Chart / Tune' to register a new chart or brass adaptation.",
      "Select the appropriate Library Status: choose 'In Repertoire' for tunes musicians must learn and keep ready even if called less frequently.",
      "Fill in the musical details (Title, Key, Tempo, Difficulty, Arranger) and external chart link.",
      "Save your submission; it will immediately appear in the band repertoire."
    ],
    proTips: [
      "'In Repertoire' status is ideal for staple secondary arrangements, crowd request songs, and festival rotation tunes that players must keep practiced but are not on every gig call sheet.",
      "Include the concert key and horn transpositions in the notes when submitting brass charts.",
      "Check existing catalog listings before submitting to ensure the tune isn't already in rehearsal."
    ],
    relatedRoutes: [
      { title: "Music Vault", path: "/portal/library" },
      { title: "Suggestion Triage", path: "/admin/suggestions" },
      { title: "Setlist Studio", path: "/admin/setlists" }
    ]
  },
  {
    id: "admin-suggestions",
    title: "Song Suggestion & Arrangement Triage",
    path: "/admin/suggestions",
    category: "Music & Repertoire",
    roles: ["admin", "catalog_manager", "section_leader", "member", "guest"],
    badge: "Creative Pipeline",
    iconName: "Lightbulb",
    summary: "Community suggestion box where musicians pitch new tunes, vote on arrangements, and assign charts.",
    description: "Suggestion Triage channels the band's creative ideas into an organized arranging pipeline. Musicians submit YouTube or Spotify links for potential brass band adaptations, vote on peers' pitches, and catalog managers assign approved tunes to in-house arrangers.",
    keyFeatures: [
      "Member song submission portal with link previews, tempo notes, and suggested instrument features.",
      "Upvoting and discussion thread per proposed chart.",
      "Triage workflow: New Submission -> Under Review -> Arranging -> Rehearsal -> Catalog.",
      "Arranger assignment and deadline tracking."
    ],
    howToUse: [
      "Browse member-submitted song suggestions and upvote the tunes that would work best for mobile brass.",
      "During musical planning meetings, review top-voted songs and discuss horn voicing viability.",
      "Move approved ideas to 'In Arranging' and designate the arranger responsible for scoring parts."
    ],
    proTips: [
      "Great street brass tunes need a recognizable brass hook and a strong singable horn line—keep mobile acoustics in mind.",
      "Encourage arrangers to write flexible percussion parts that can scale between 2 and 6 drummers."
    ],
    relatedRoutes: [
      { title: "Master Catalog", path: "/admin/catalog" },
      { title: "Repertoire Studio", path: "/admin/tunes" },
      { title: "Music Vault", path: "/portal/library" }
    ]
  },

  // --- Business & Public Web ---
  {
    id: "admin-finance",
    title: "Financial Ledger & Musician Payouts",
    path: "/admin/finance",
    category: "Business & Public Web",
    roles: ["admin", "treasurer"],
    badge: "Treasury & Accounting",
    iconName: "DollarSign",
    summary: "Band treasury accounting, gig fee revenues, merchandise, expense reconciliation, and musician payouts.",
    description: "The Financial Ledger is the band treasurer's workbench. It handles revenue tracking from contracted performances, merch sales, tips, and charitable contributions, reconciles travel and equipment expenses, and manages fair musician payout distributions.",
    keyFeatures: [
      "Gig payout reconciliation: calculate per-musician compensation based on confirmed attendance.",
      "Payout distribution tracking with settlement status (Unpaid, Venmo, Check, Cash).",
      "Band general fund balance and expense categorization (Permits, Insurance, Storage, Equipment).",
      "Automated earnings calculation feeding into each musician's personal Home Base overview.",
      "Tax-ready annual summary reports."
    ],
    howToUse: [
      "After gig completion, open the gig entry and confirm final revenue received from the organizer.",
      "Click 'Calculate Distributions' to allocate equal or tiered payouts among attended musicians.",
      "Execute payments via Venmo or check and mark each record as 'Paid'.",
      "Log band operating expenses (e.g. trailer rental, rehearsal hall fees, sheet music licensing)."
    ],
    proTips: [
      "Reconcile payouts within 48 hours of gig completion to maintain strong ensemble morale and trust.",
      "Always retain a 15-20% band fund deduction from paid gigs for equipment repairs, insurance, and trailer upkeep."
    ],
    relatedRoutes: [
      { title: "Charitable Giving", path: "/admin/giving" },
      { title: "Gig Management", path: "/admin/gigs" }
    ]
  },
  {
    id: "admin-giving-mgmt",
    title: "Charitable Giving & Donations Tracker",
    path: "/admin/giving",
    category: "Business & Public Web",
    roles: ["admin", "treasurer"],
    badge: "Philanthropy & Community",
    iconName: "HeartHandshake",
    summary: "Record band donations to worthy causes, manage beneficiary partners, and sync public community impact.",
    description: "The Charitable Giving Studio allows band management to track philanthropic contributions made by the Eagleburger Band to community organizations, youth music programs, and neighborhood relief funds. It maintains strict privacy by syncing organizations to the public /giving page while keeping confidential dollar amounts internal.",
    keyFeatures: [
      "Donation logging: Organization, category, donation amount, date, payment method, tax receipt URL.",
      "Cumulative philanthropy metrics: Total Donated, Number of Causes Supported, Average Contribution.",
      "Public visibility toggle per donation: syncs beneficiary organization and website to public site while withholding dollar amount.",
      "Direct integration with the fan-facing Community Giving showcase (/giving)."
    ],
    howToUse: [
      "Click '+ Record Donation' whenever the band makes a charitable contribution.",
      "Enter beneficiary name, donation amount, cause category, and optional organizer website.",
      "Upload receipt or acknowledgment letter for treasurer archives.",
      "Toggle 'Showcase on Public Giving Page' so fans and supporters can learn about the organizations the band champions."
    ],
    proTips: [
      "Categorize donations (e.g. Youth Music, Food Security, Arts Education) to highlight community impact in annual reviews.",
      "Check the public /giving page to ensure links to beneficiary websites are valid and active."
    ],
    relatedRoutes: [
      { title: "Public Giving Page", path: "/giving" },
      { title: "Financial Ledger", path: "/admin/finance" }
    ]
  },
  {
    id: "admin-inquiries",
    title: "Booking Leads & Inquiries Pipeline",
    path: "/admin/inquiries",
    category: "Business & Public Web",
    roles: ["admin", "gig_manager"],
    badge: "Client Pipeline",
    iconName: "Inbox",
    summary: "Triage incoming client gig inquiries submitted from the public site, manage quotes, and convert to gigs.",
    description: "The Booking Leads pipeline captures client requests submitted via the public /book form. Gig managers review event details, estimate performance fees, communicate with event organizers, and seamlessly convert approved leads into confirmed gigs in the Gig Management Studio.",
    keyFeatures: [
      "Lead pipeline stages: New Lead -> Contacted -> Quoted -> Confirmed/Booked -> Declined.",
      "Automated client details capture: Event Type, Date, Venue/Location, Estimated Budget, Audience Size.",
      "1-click 'Convert to Gig' button that generates a pre-populated draft gig entry in the Gig Studio.",
      "Internal coordinator notes and client response email templates."
    ],
    howToUse: [
      "Monitor the inbox for incoming booking requests.",
      "Review client budget and date against the existing gig calendar to verify band availability.",
      "Follow up with the organizer to negotiate performance length, call times, and compensation.",
      "Once agreed upon, click 'Convert to Gig' to immediately transition the lead into an active gig record."
    ],
    proTips: [
      "Respond to inquiries within 24 hours—event planners frequently contact multiple bands simultaneously.",
      "Ask clients about parade staging acoustics, parade route length, and shade/water provisions for outdoor dates."
    ],
    relatedRoutes: [
      { title: "Gig Management", path: "/admin/gigs" },
      { title: "CRM Contacts", path: "/admin/contacts" }
    ]
  },
  {
    id: "admin-contacts",
    title: "Client CRM & Venue Rolodex",
    path: "/admin/contacts",
    category: "Business & Public Web",
    roles: ["admin", "gig_manager"],
    badge: "CRM & Venues",
    iconName: "Contact",
    summary: "Rolodex of festival directors, parade marshals, brewery coordinators, and past corporate clients.",
    description: "The Client CRM maintains relationships with the band's performance partners across Western Pennsylvania. Gig coordinators store venue logistics contacts, stage managers, noise ordinances, and historical performance relationships.",
    keyFeatures: [
      "Contact directory categorized by client type: Festival, Parade, Wedding, Brewery, Civic/Municipal.",
      "Venue logistical profiles: Power availability, acoustic footprint, parking permits, load-in contacts.",
      "Historical gig connection linking each client to past performances and fees.",
      "Searchable notes for annual recurring bookings (e.g. 'Contact in March for Octoberfest')."
    ],
    howToUse: [
      "Add organizers to the CRM whenever a new gig contract is initiated.",
      "Store phone numbers and direct day-of-show contacts for parade marshals and festival stage hands.",
      "Review past contacts in the spring to proactively pitch the band for recurring summer festivals."
    ],
    proTips: [
      "Note specific venue quirks: which breweries provide meal vouchers, which parades have long staging delays, etc.",
      "Keep contact emails up to date—municipal committee chairs often change annually after local elections."
    ],
    relatedRoutes: [
      { title: "Booking Inquiries", path: "/admin/inquiries" },
      { title: "Gig Management", path: "/admin/gigs" }
    ]
  },
  {
    id: "admin-pages-mgmt",
    title: "Headless CMS Page Studio & SEO",
    path: "/admin/pages",
    category: "Business & Public Web",
    roles: ["admin", "web_manager"],
    badge: "Content Management",
    iconName: "LayoutTemplate",
    summary: "Multi-page public website builder, WYSIWYG rich text editor, section ordering, and full SEO Studio.",
    description: "The Headless CMS Page Studio empowers web managers to build and maintain the public marketing website without writing code. Managers can create new pages, arrange polymorphic sections (Hero Banners, WYSIWYG Rich Text, Video Reels, Feature Grids), preview live in the Page Simulator, and optimize search engine visibility in the SEO Studio.",
    keyFeatures: [
      "Multi-page management with dynamic URL slug routing (e.g. /about, /history, /giving, /book).",
      "Polymorphic section builder: Hero Banner, WYSIWYG Rich Text, YouTube Media Reel, Feature Grid, Gig Feed.",
      "Modern WYSIWYG rich text editor backed by DOMPurify sanitization with bold, italic, headings, lists, and secure links.",
      "Interactive Page Simulator for testing desktop and mobile layouts in real time before publishing.",
      "Complete SEO Studio: Google SERP snippet preview, Social Share Card preview, character meters, robots directives, and Schema.org JSON-LD."
    ],
    howToUse: [
      "Switch between existing pages or click '+ New Page' to create a custom page with a starting template.",
      "In the 'Section Builder' tab, add, reorder, edit, or remove sections.",
      "Use the 'Simulator' tab to preview live changes.",
      "Open the 'SEO Studio' tab to customize Google search titles, descriptions, keywords, and OpenGraph social images.",
      "Click 'Save Changes' to persist your updates directly to Firestore."
    ],
    proTips: [
      "Keep search titles between 40 and 60 characters and descriptions between 120 and 160 characters for optimal Google ranking.",
      "Always specify a high-resolution 1200x630 OpenGraph image so links shared on social media generate compelling visual cards."
    ],
    relatedRoutes: [
      { title: "Brand & Palette", path: "/admin/theme" },
      { title: "Public Website", path: "/" }
    ]
  },
  {
    id: "admin-theme-mgmt",
    title: "Brand, Palette & Style Customizer",
    path: "/admin/theme",
    category: "Business & Public Web",
    roles: ["admin", "web_manager"],
    badge: "Theme & Branding",
    iconName: "Palette",
    summary: "Scoped theme customizer distinguishing between Public Website styling, Musician Portal dark mode, and ensemble identity.",
    description: "The Brand & Palette Studio controls the visual identity of the entire digital platform. Web managers can independently customize color tokens for the fan-facing public site and the musician portal, configure ensemble typography, and update social media handles.",
    keyFeatures: [
      "Scoped theme architecture: Separate styling tokens for Public Website (marketing) and Musician Portal.",
      "Interactive color pickers for Primary Brand Color, Accent, Navigation Background, and Card Backgrounds.",
      "Ensemble identity editor: Band Name, Slogan/Tagline, Founded Year, and Official Logo URL.",
      "Social media links manager: YouTube, Instagram, Facebook, TikTok, Spotify.",
      "Live Theme Simulator providing instant visual feedback before saving changes."
    ],
    howToUse: [
      "Navigate through the tabs: 'Public Website Theme', 'Musician Portal Theme', 'Ensemble Identity & Socials', or 'Live Simulator'.",
      "Select color swatches or enter custom HEX codes to refine the band's visual identity.",
      "Verify contrast in the Live Simulator tab to ensure strong legibility on mobile devices.",
      "Click 'Save Theme Settings' to broadcast the new design tokens across the application."
    ],
    proTips: [
      "Keep the Musician Portal in high-contrast dark tones for easy reading backstage and in low-light gig environments.",
      "Ensure your primary brand color achieves at least 4.5:1 contrast ratio against dark backgrounds for accessibility compliance."
    ],
    relatedRoutes: [
      { title: "CMS Page Studio", path: "/admin/pages" },
      { title: "Public Website", path: "/" }
    ]
  },
  {
    id: "admin-comments-mgmt",
    title: "Public Comment & Community Moderation",
    path: "/admin/comments",
    category: "Business & Public Web",
    roles: ["admin"],
    badge: "Content Moderation",
    iconName: "MessageSquare",
    summary: "Review, approve, and moderate public comments and guestbook messages submitted by fans.",
    description: "Comment Moderation ensures that user-generated content, fan feedback, and guestbook entries on the public website maintain a family-friendly, positive environment. Administrators can review pending comments, approve or reject them, and flag abusive spam.",
    keyFeatures: [
      "Moderation queue with Pending, Approved, and Flagged status tabs.",
      "1-click Approve or Reject actions with automated content sanitization.",
      "Spam detection filtering against malicious links or inappropriate language.",
      "Audit log tracking which administrator approved each public post."
    ],
    howToUse: [
      "Check the moderation queue weekly for pending community comments.",
      "Review the comment text and author details.",
      "Click 'Approve' to display the comment publicly, or 'Delete' to purge inappropriate content."
    ],
    proTips: [
      "Never approve comments containing unsolicited external commercial links or private personal contact details.",
      "Highlight heartwarming fan stories from parades and share them with the band at rehearsals."
    ],
    relatedRoutes: [
      { title: "CMS Page Studio", path: "/admin/pages" },
      { title: "Public Website", path: "/" }
    ]
  }
];

export interface RoleDocItem {
  role: Role;
  title: string;
  badge: string;
  target: string;
  summary: string;
  responsibilities: string[];
  authorities: string[];
  routes: { title: string; path: string }[];
  accentBorder: string;
}

const ROLE_DESCRIPTIONS: RoleDocItem[] = [
  {
    role: "admin",
    title: "Executive Band Director & Administrator",
    badge: "Executive Clearance",
    target: "Band Directors, General Managers & Executive Board",
    summary: "Unrestricted operational and executive authority across the entire Eagleburger Band web platform. Responsible for orchestrating ensemble logistics, financial oversight, role security clearances, system administration, and high-level band policies.",
    responsibilities: [
      "Govern security policies, user role assignments, and member account permissions.",
      "Oversee band-wide financial health, gig revenue distribution, and charitable outreach.",
      "Supervise public website publication, theme palettes, and public press inquiries.",
      "Administer member onboarding, section leadership designations, and operational dispute resolution."
    ],
    authorities: [
      "Unrestricted access to all 24 portal and administrative workspaces.",
      "Assign and revoke any administrative, musical, or operational role.",
      "Reconcile band ledgers, record gig cashflows, and authorize musician payout distributions.",
      "Publish and modify public website CMS pages, theme palettes, and SEO metadata."
    ],
    routes: [
      { title: "Gig Operations", path: "/admin/gigs" },
      { title: "Financial Ledger", path: "/admin/finance" },
      { title: "Roster Administration", path: "/admin/roster" },
      { title: "CMS Page Studio", path: "/admin/pages" },
      { title: "Brand & Theme", path: "/admin/theme" },
      { title: "Charitable Giving", path: "/admin/giving" },
    ],
    accentBorder: "rgba(234, 179, 8, 0.5)",
  },
  {
    role: "gig_manager",
    title: "Gig & Performance Operations Manager",
    badge: "Performance Operations",
    target: "Gig Coordinators, Event Leads & Stage Managers",
    summary: "Operational commander for all live performances, street parades, festival appearances, and private bookings. Coordinates staging logistics, call times, uniform requirements, downbeat roll calls, and mass communications.",
    responsibilities: [
      "Create, schedule, and maintain upcoming gigs, rehearsals, and street parade dates.",
      "Establish precise logistical timelines: call time, staging location, warm-up, downbeat, and conclusion.",
      "Define gig compensation, dress code attire, and client staging requirements.",
      "Issue emergency gig updates via Call Sheet Dispatch and oversee Downbeat Check-In on show day."
    ],
    authorities: [
      "Create and edit gigs in the Gig Management workspace (/admin/gigs).",
      "Publish and broadcast Call Sheet Dispatch emails and SMS alerts (/admin/dispatch).",
      "Triage inbound gig inquiries and convert leads into confirmed performances (/admin/inquiries).",
      "Verify real-time attendance during day-of-show Downbeat Check-In (/admin/checkin)."
    ],
    routes: [
      { title: "Gig Management", path: "/admin/gigs" },
      { title: "Setlist Designer", path: "/admin/setlists" },
      { title: "Live Check-In", path: "/admin/checkin" },
      { title: "Call Sheet Dispatch", path: "/admin/dispatch" },
      { title: "Performance Inquiries", path: "/admin/inquiries" },
      { title: "Broadcast Studio", path: "/admin/notifications" },
    ],
    accentBorder: "rgba(56, 189, 248, 0.5)",
  },
  {
    role: "catalog_manager",
    title: "Music Librarian & Catalog Manager",
    badge: "Repertoire & Arrangements",
    target: "Music Librarians, Arrangers & Band Music Directors",
    summary: "Custodian of the ensemble's musical library and repertoire. Manages sheet music part distributions, arranges charts for brass and percussion voicings, uploads rehearsal reference recordings, and programs performance setlists.",
    responsibilities: [
      "Curate the Master Music Catalog with chart metadata, key signatures, tempos, and arrangers.",
      "Upload sheet music PDFs for each brass and percussion part to secure cloud storage.",
      "Link high-fidelity reference audio tracks and rehearsal practice recordings for member study.",
      "Design chronological setlists for upcoming gigs, balancing tempos, genres, and stamina.",
      "Review member song suggestions and shepherd promising chart ideas into active arranging."
    ],
    authorities: [
      "Add, update, and archive tunes in the Repertoire Catalog (/admin/catalog).",
      "Manage sheet music part files and reference audio attachments.",
      "Assemble, reorder, and publish gig setlists (/admin/setlists).",
      "Review, upvote, and triage member song suggestions (/admin/suggestions).",
      "Analyze catalog analytics, play counts, and chart performance frequencies (/admin/analytics/catalog)."
    ],
    routes: [
      { title: "Master Catalog", path: "/admin/catalog" },
      { title: "Setlist Designer", path: "/admin/setlists" },
      { title: "Repertoire Analytics", path: "/admin/analytics/catalog" },
      { title: "Song Suggestions", path: "/admin/suggestions" },
      { title: "Music Vault", path: "/portal/library" },
    ],
    accentBorder: "rgba(16, 185, 129, 0.5)",
  },
  {
    role: "section_leader",
    title: "Section Leader & Voicing Principal",
    badge: "Section Leadership",
    target: "Instrument Voicing Leads (Trumpet, Trombone, Sax, Sousaphone, Percussion, Auxiliary)",
    summary: "Musical and operational leaders for individual instrument sections. Responsible for monitoring section attendance, ensuring adequate part coverage (e.g. 1st vs 2nd parts, lead sousaphone), welcoming new section recruits, and executing roll call on gig day.",
    responsibilities: [
      "Review gig RSVP headcounts to ensure balanced instrumentation before every performance.",
      "Coordinate instrument subbing and part reassignments if a key player is unavailable.",
      "Run Downbeat Check-In on show day to verify on-time arrival and proper attire.",
      "Guide new section members through charts, street choreography, and band traditions."
    ],
    authorities: [
      "Access the Section Command workspace (/admin/sections) to review section rosters and balance.",
      "Execute Downbeat Check-In verification for their section (/admin/checkin).",
      "Review historical attendance reliability and gig analytics for their section (/admin/attendance)."
    ],
    routes: [
      { title: "Section Command", path: "/admin/sections" },
      { title: "Live Check-In", path: "/admin/checkin" },
      { title: "Attendance Analytics", path: "/admin/attendance" },
      { title: "Musician Roster", path: "/portal/roster" },
    ],
    accentBorder: "rgba(129, 140, 248, 0.5)",
  },
  {
    role: "treasurer",
    title: "Band Treasurer & Financial Controller",
    badge: "Financial Management",
    target: "Band Treasurer, Bookkeeper & Business Officers",
    summary: "Financial steward of the ensemble. Manages the official ledger, tracks gig income, calculates per-player stipend distributions, reconciles operating expenses, and oversees charitable giving allocations.",
    responsibilities: [
      "Maintain accurate entries in the Financial Ledger for all gig deposits, stipends, and operating expenses.",
      "Calculate and record per-player earnings following paid performances.",
      "Track charitable contributions and community donations in the Giving Manager.",
      "Generate financial balance sheets, cashflow reports, and annual budget projections."
    ],
    authorities: [
      "Create, edit, and reconcile ledger records in the Financial Ledger (/admin/finance).",
      "Manage beneficiary profiles and record donations in the Giving Manager (/admin/giving).",
      "Record member payout disbursements and track payment methods (Venmo, Check, Cash)."
    ],
    routes: [
      { title: "Financial Ledger", path: "/admin/finance" },
      { title: "Charitable Giving", path: "/admin/giving" },
      { title: "Home Base", path: "/portal" },
    ],
    accentBorder: "rgba(52, 211, 153, 0.5)",
  },
  {
    role: "web_manager",
    title: "Web & Digital Content Manager",
    badge: "Public Marketing & CMS",
    target: "Webmasters, Digital Marketers & Creative Directors",
    summary: "Oversees the public-facing brand, content marketing, and visual design systems. Designs and publishes dynamic web pages using the Headless CMS Studio, manages search engine optimization (SEO), and customizes theme color schemes.",
    responsibilities: [
      "Author and publish dynamic public pages (Story, Media, Book Us) using the CMS Section Builder.",
      "Format public copy using the secure WYSIWYG rich text editor with sanitized HTML.",
      "Configure meta titles, OpenGraph share cards, and JSON-LD structured data in the SEO Studio.",
      "Maintain visual brand harmony by customizing public and musician portal color schemes."
    ],
    authorities: [
      "Full create/read/update/delete control over CMS pages in the CMS Page Studio (/admin/pages).",
      "Modify global brand logos, typography, and color schemes in the Theme Studio (/admin/theme).",
      "Moderate public community comments and contact inquiries (/admin/comments)."
    ],
    routes: [
      { title: "CMS Page Studio", path: "/admin/pages" },
      { title: "Brand & Theme Studio", path: "/admin/theme" },
      { title: "Comment Moderation", path: "/admin/comments" },
    ],
    accentBorder: "rgba(45, 212, 191, 0.5)",
  },
  {
    role: "membership_manager",
    title: "Personnel & Membership Coordinator",
    badge: "Personnel & Recruitment",
    target: "Band Secretary, Musician Recruitment & Onboarding Leads",
    summary: "Manages the human side of the ensemble. Coordinates musician recruitment, issues secure registration invite codes, updates member profiles, and ensures accurate instrument section assignments.",
    responsibilities: [
      "Generate and distribute secure cryptographic invitation tokens for prospective musicians.",
      "Review onboarding profiles, emergency contacts, instrument proficiencies, and T-shirt sizes.",
      "Assign newly rostered players to their proper instrument sections and notify Section Leaders.",
      "Maintain member active/inactive/alumni status records."
    ],
    authorities: [
      "Generate single-use or multi-use membership invitations in Roster Admin (/admin/roster).",
      "Edit member profile information, section groupings, and account status.",
      "Access the Section Command workspace (/admin/sections) to balance section rosters."
    ],
    routes: [
      { title: "Roster Administration", path: "/admin/roster" },
      { title: "Section Command", path: "/admin/sections" },
      { title: "Member Directory", path: "/portal/roster" },
    ],
    accentBorder: "rgba(244, 114, 182, 0.5)",
  },
  {
    role: "asset_manager",
    title: "Equipment & Uniform Quartermaster",
    badge: "Gear & Uniform Custody",
    target: "Quartermasters, Gear Custodians & Drum Technicians",
    summary: "Custodian of physical band assets, marching instruments, marching drum carriers, harnesses, banners, sound gear, and performance uniform jackets.",
    responsibilities: [
      "Maintain the band's equipment inventory: marching drums, sousaphone stands, banners, and megaphones.",
      "Track checkout custody of band-owned instruments, marching harnesses, and uniform pieces.",
      "Coordinate routine maintenance, drumhead replacements, slide lubrication, and instrument repairs.",
      "Conduct seasonal equipment audits to prevent gear loss."
    ],
    authorities: [
      "Manage inventory records, serial numbers, condition ratings, and checkout logs (/admin/inventory).",
      "Issue gear assignments to members and log returns.",
      "Submit gear replacement and repair budget requests to the Treasurer."
    ],
    routes: [
      { title: "Gear & Uniform Inventory", path: "/admin/inventory" },
      { title: "Home Base", path: "/portal" },
    ],
    accentBorder: "rgba(251, 146, 60, 0.5)",
  },
  {
    role: "community_manager",
    title: "Community & Public Relations Manager",
    badge: "Community & Outreach",
    target: "PR Leads, Social Media Coordinators & Community Liaisons",
    summary: "Builds bridges between the Eagleburger Band, our fan community, local civic organizations, festival directors, and charitable partners.",
    responsibilities: [
      "Respond to public inquiries, fan messages, and event collaboration proposals.",
      "Coordinate philanthropic appearances, non-profit benefit parades, and school brass clinics.",
      "Collaborate with Web Managers to publish news, parade photos, and community donation highlights.",
      "Moderate public fan comments and guestbook messages."
    ],
    authorities: [
      "Review and triage public inquiries in Performance Inquiries (/admin/inquiries).",
      "Manage outreach beneficiary relationships in Charitable Giving (/admin/giving).",
      "Review and approve public fan comments in Comment Moderation (/admin/comments).",
      "Draft and publish announcements in the Broadcast Studio (/admin/notifications)."
    ],
    routes: [
      { title: "Performance Inquiries", path: "/admin/inquiries" },
      { title: "Charitable Giving", path: "/admin/giving" },
      { title: "External Contacts", path: "/admin/contacts" },
      { title: "Broadcast Studio", path: "/admin/notifications" },
      { title: "Comment Moderation", path: "/admin/comments" },
    ],
    accentBorder: "rgba(250, 204, 21, 0.5)",
  },
  {
    role: "member",
    title: "Active Musician & Performing Member",
    badge: "Active Performer",
    target: "All Rostered Brass, Woodwind, Percussion & Visual Artists",
    summary: "The core heartbeat of the Eagleburger Band. Active musicians rehearse, perform at parades and gigs, maintain personal attendance commitments, practice repertoire charts, and bring street brass energy to Pittsburgh.",
    responsibilities: [
      "Promptly RSVP (Attending, Tentative, Declined) to all scheduled gigs and rehearsals in Gig Central.",
      "Arrive on time for designated call times, in specified band uniform, ready for warmup and downbeat.",
      "Practice charts and download updated sheet music parts from the Music Vault.",
      "Subscribe personal smartphone calendars to the band's auto-updating iCal feed.",
      "Participate in ensemble voting on repertoire suggestions and community initiatives."
    ],
    authorities: [
      "Access the Musician Portal dashboard (/portal) and personal earnings tally.",
      "Submit RSVPs and view detailed logistical call sheets (/portal/gigs).",
      "Download sheet music part PDFs and listen to practice tracks (/portal/library).",
      "Browse the band-wide Musician Directory (/portal/roster).",
      "Browse, search, and submit band charts and sheet music in Repertoire Studio (/admin/tunes).",
      "Submit song pitches and upvote charts in Song Suggestions (/admin/suggestions)."
    ],
    routes: [
      { title: "Home Base", path: "/portal" },
      { title: "Gig Central", path: "/portal/gigs" },
      { title: "Music Vault", path: "/portal/library" },
      { title: "Repertoire Studio", path: "/admin/tunes" },
      { title: "Musician Directory", path: "/portal/roster" },
      { title: "Song Suggestions", path: "/admin/suggestions" },
      { title: "Help Center", path: "/portal/help" },
    ],
    accentBorder: "rgba(74, 222, 128, 0.5)",
  },
  {
    role: "guest",
    title: "Guest Musician & Substitute Performer",
    badge: "Guest / Substitute",
    target: "Guest Solos, Substitute Brass Players & Contracted Performers",
    summary: "External musicians and guest performers who join the Eagleburger Band for specific gigs, festival appearances, or temporary subbing assignments.",
    responsibilities: [
      "Review logistical call sheets for assigned performances.",
      "Practice assigned chart parts and attend designated staging rehearsals.",
      "Confirm attendance for contracted performance dates."
    ],
    authorities: [
      "View specific performance call sheets and logistical details for assigned performances.",
      "Download assigned sheet music parts from the Music Vault (/portal/library).",
      "Browse repertoire charts and submit new arrangements in Repertoire Studio (/admin/tunes).",
      "Pitch tune ideas and vote on charts in Song Suggestions (/admin/suggestions)."
    ],
    routes: [
      { title: "Gig Central", path: "/portal/gigs" },
      { title: "Music Vault", path: "/portal/library" },
      { title: "Repertoire Studio", path: "/admin/tunes" },
      { title: "Song Suggestions", path: "/admin/suggestions" },
    ],
    accentBorder: "rgba(148, 163, 184, 0.5)",
  }
];

const RBAC_ROLES = [
  {
    role: "admin",
    title: "Full Administrator",
    target: "Band Directors & Technical Leads",
    scope: "Unrestricted access to all workspaces, security settings, role assignments, financial ledgers, and database backups.",
    routes: "All 24 portal & admin routes"
  },
  {
    role: "web_manager",
    title: "Web & Content Manager",
    target: "Communications & Marketing Leads",
    scope: "Full management of public marketing pages, CMS Page Studio, WYSIWYG section builder, SEO settings, brand theme, and palette customizer.",
    routes: "/admin/pages, /admin/theme, /admin/comments, /portal/*"
  },
  {
    role: "gig_manager",
    title: "Gig & Operations Manager",
    target: "Gig Coordinators & Event Managers",
    scope: "Scheduling gigs, configuring logistics (call time, downbeat, pay, attire), publishing call sheets, emergency dispatch, and booking inquiries triage.",
    routes: "/admin/gigs, /admin/setlists, /admin/checkin, /admin/dispatch, /admin/inquiries, /admin/contacts, /admin/notifications"
  },
  {
    role: "catalog_manager",
    title: "Catalog & Music Librarian",
    target: "Librarians, Arrangers & Music Directors",
    scope: "Master music catalog, uploading sheet music part PDFs to storage, reference audio links, setlist curation, and song suggestion triage.",
    routes: "/admin/catalog, /admin/analytics/catalog, /admin/setlists, /admin/suggestions, /portal/library"
  },
  {
    role: "community_manager",
    title: "Community & Public Relations Manager",
    target: "PR Leads, Social Media Coordinators & Community Liaisons",
    scope: "Reviewing public inquiries, coordinating benefit events, managing giving beneficiaries, and moderating public fan comments.",
    routes: "/admin/inquiries, /admin/giving, /admin/comments, /admin/contacts, /admin/notifications"
  },
  {
    role: "membership_manager",
    title: "Membership & Personnel Manager",
    target: "Band Secretary & Personnel Coordinator",
    scope: "Musician roster management, issuing new member invite codes, updating player profiles, and assigning section groupings.",
    routes: "/admin/roster, /admin/sections, /portal/*"
  },
  {
    role: "treasurer",
    title: "Treasurer & Finance Officer",
    target: "Band Treasurer & Business Manager",
    scope: "Financial ledger management, recording gig payouts, distribution tracking to musicians, charitable donations tracker, and expense accounting.",
    routes: "/admin/finance, /admin/giving, /portal/*"
  },
  {
    role: "section_leader",
    title: "Section Leader",
    target: "Instrument Voicing Leads (Trumpet, Trombone, Sax, Sousaphone, Drums)",
    scope: "Day-of-show roll call via Downbeat Check-In, reviewing section attendance metrics, section rosters, and rehearsal music charts.",
    routes: "/admin/checkin, /admin/sections, /admin/attendance, /portal/*"
  },
  {
    role: "asset_manager",
    title: "Asset & Equipment Custodian",
    target: "Quartermaster & Gear Coordinator",
    scope: "Tracking band property, marching drum maintenance, harness custody, sousaphone stand storage, and banner inventory.",
    routes: "/admin/inventory, /portal/*"
  },
  {
    role: "member",
    title: "Active Band Musician",
    target: "All Rostered Brass & Percussion Players",
    scope: "Access to personal dashboard, upcoming gigs calendar, RSVP submissions, sheet music downloads, reference audio, repertoire chart browsing and submissions, song pitches, roster directory, and calendar sync.",
    routes: "/portal, /portal/gigs, /portal/library, /admin/tunes, /admin/suggestions, /portal/roster, /portal/help"
  },
  {
    role: "guest",
    title: "Guest Musician / Sub",
    target: "Occasional Subs & Contracted Players",
    scope: "Access to assigned gig call sheets, sheet music parts in the music vault, repertoire studio chart browsing and submissions, and tune suggestions.",
    routes: "/portal/gigs, /portal/library, /admin/tunes, /admin/suggestions"
  }
];

const FAQS = [
  {
    q: "How do I sync the band's gig calendar to my phone (Apple Calendar or Google Calendar)?",
    a: "Go to Home Base (/portal) and click 'Subscribe to Calendar'. Copy your personal iCal webcal subscription feed URL. In Apple Calendar on iOS, tap 'Calendars' -> 'Add Calendar' -> 'Add Subscription Calendar' and paste the URL. In Google Calendar, go to 'Other calendars' -> '+' -> 'From URL'. All gig schedule additions and time changes will now sync automatically to your device!"
  },
  {
    q: "What should I do if my availability changes after I already RSVP'd 'Attending'?",
    a: "Open Gig Central (/portal/gigs), locate the gig, and update your RSVP button to 'Declined' or 'Tentative' immediately. If the gig is within 48 hours, also contact your Section Leader directly via the Roster Directory (/portal/roster) so they can arrange a replacement for your instrument part."
  },
  {
    q: "Where do I find my instrument's sheet music or practice recordings?",
    a: "Navigate to the Music Vault (/portal/library). You can search by song title or filter by genre tag. Click on your instrument section (e.g. Trumpet 1, Trombone 2, Snare) to download your part PDF, or press play on the audio player to hear the reference track."
  },
  {
    q: "How do musician payouts work for paid performances?",
    a: "When the band receives payment for a contracted gig, the Treasurer reconciles attendance records in the Financial Ledger (/admin/finance) and calculates per-player distributions. Once distributed, your earnings are marked in the system and reflect directly on your personal Home Base dashboard."
  },
  {
    q: "How do I pitch a new song for the band to learn and arrange?",
    a: "Submit your idea in the Song Suggestion Triage (/admin/suggestions). Include a YouTube or streaming reference link and note what makes it great for street brass (e.g. great bass line, energetic drum groove). Other musicians can upvote your idea, and catalog managers review high-scoring pitches for arranging."
  },
  {
    q: "How do I request additional permissions (e.g. Gig Manager, Section Leader)?",
    a: "Role permissions are governed in Roster Administration (/admin/roster). Contact a Band Administrator or Membership Manager to have the appropriate role assigned to your musician profile."
  }
];

const emptySubscribe = () => () => {};
function useMounted() {
  return useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );
}

export default function PortalHelpCenterPage() {
  const { profile, isRealAdmin, setEmulatedRoles, emulatedRoles, isEmulating, clearEmulation } = useAuth();
  const mounted = useMounted();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<HelpCategory>("All Routes");
  const [selectedRoleFilter, setSelectedRoleFilter] = useState<string>("all");
  const [expandedRoutes, setExpandedRoutes] = useState<Record<string, boolean>>({});
  const [copiedPath, setCopiedPath] = useState<string | null>(null);

  // Firestore real-time users and sections data
  const [users, setUsers] = useState<User[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [roleViewMode, setRoleViewMode] = useState<"cards" | "matrix">("cards");
  const [expandedRoles, setExpandedRoles] = useState<Record<string, boolean>>({
    admin: true,
    gig_manager: true,
    catalog_manager: true,
    section_leader: true,
    treasurer: true,
    web_manager: true,
    membership_manager: true,
    asset_manager: true,
    community_manager: true,
    member: false,
    guest: false,
  });

  useEffect(() => {
    const unsubUsers = onSnapshot(
      collection(db, "users"),
      (snap) => {
        const list: User[] = [];
        snap.forEach((d) => {
          const parsed = UserSchema.safeParse(d.data());
          if (parsed.success) {
            list.push(parsed.data);
          } else {
            const raw = d.data();
            list.push({
              schemaVersion: 1,
              uid: raw.uid || d.id,
              email: raw.email || "",
              displayName: raw.displayName || "Band Member",
              roles: Array.isArray(raw.roles) ? raw.roles : ["member"],
              sectionId: raw.sectionId || null,
              instruments: Array.isArray(raw.instruments) ? raw.instruments : [],
              favoriteToolIds: [],
              portalThemeSchemeId: "eagleburger-gold",
              status: raw.status === "inactive" || raw.status === "pending" ? raw.status : "active",
              phone: raw.phone || "",
              smsConsent: Boolean(raw.smsConsent),
              smsConsentUpdatedAt: raw.smsConsentUpdatedAt || "",
              payoutPreferences: raw.payoutPreferences || {
                preferredMethod: "venmo",
                venmoHandle: "",
                paypalEmail: "",
                zelleIdentifier: "",
                notes: "",
              },
              metadata: {},
              updatedAt: new Date().toISOString(),
            });

          }
        });
        list.sort((a, b) => (a.displayName || "").localeCompare(b.displayName || ""));
        setUsers(list);
      },
      (err) => {
        console.warn("Failed to subscribe to users in Help page:", err);
      }
    );

    const unsubSections = onSnapshot(
      collection(db, "sections"),
      (snap) => {
        const list: Section[] = [];
        snap.forEach((d) => {
          const parsed = SectionSchema.safeParse(d.data());
          if (parsed.success) list.push(parsed.data);
        });
        setSections(list);
      },
      (err) => {
        console.warn("Failed to subscribe to sections in Help page:", err);
      }
    );

    return () => {
      unsubUsers();
      unsubSections();
    };
  }, []);

  const sectionMap = useMemo(() => {
    const map: Record<string, string> = {};
    sections.forEach((s) => {
      map[s.id] = s.name;
    });
    return map;
  }, [sections]);

  const toggleRouteExpand = (id: string) => {
    setExpandedRoutes((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const expandAll = () => {
    const allExpanded: Record<string, boolean> = {};
    ROUTE_DOCS.forEach((r) => {
      allExpanded[r.id] = true;
    });
    setExpandedRoutes(allExpanded);
  };

  const collapseAll = () => {
    setExpandedRoutes({});
  };

  const toggleRoleExpand = (role: string) => {
    setExpandedRoles((prev) => ({ ...prev, [role]: !prev[role] }));
  };

  const expandAllRoles = () => {
    const all: Record<string, boolean> = {};
    ROLE_DESCRIPTIONS.forEach((r) => {
      all[r.role] = true;
    });
    setExpandedRoles(all);
  };

  const collapseAllRoles = () => {
    setExpandedRoles({});
  };

  const getRoleIcon = (role: Role) => {
    switch (role) {
      case "admin":
        return <ShieldAlert className="w-5 h-5 text-amber-400" />;
      case "gig_manager":
        return <Calendar className="w-5 h-5 text-sky-400" />;
      case "catalog_manager":
        return <Music className="w-5 h-5 text-emerald-400" />;
      case "section_leader":
        return <Users className="w-5 h-5 text-indigo-400" />;
      case "treasurer":
        return <DollarSign className="w-5 h-5 text-emerald-300" />;
      case "web_manager":
        return <Globe className="w-5 h-5 text-cyan-400" />;
      case "membership_manager":
        return <UserPlus className="w-5 h-5 text-pink-400" />;
      case "asset_manager":
        return <Package className="w-5 h-5 text-orange-400" />;
      case "community_manager":
        return <Megaphone className="w-5 h-5 text-yellow-400" />;
      case "member":
        return <UserCheck className="w-5 h-5 text-emerald-400" />;
      case "guest":
        return <UserIcon className="w-5 h-5 text-slate-400" />;
      default:
        return <Shield className="w-5 h-5 text-slate-400" />;
    }
  };

  const handleCopyPath = (path: string) => {
    if (typeof window !== "undefined" && navigator?.clipboard) {
      navigator.clipboard.writeText(window.location.origin + path);
      setCopiedPath(path);
      setTimeout(() => setCopiedPath(null), 2000);
    }
  };

  // Filtered roles based on search
  const filteredRoles = useMemo(() => {
    if (!searchQuery.trim()) return ROLE_DESCRIPTIONS;
    const query = searchQuery.toLowerCase().trim();

    return ROLE_DESCRIPTIONS.filter((r) => {
      const matchRole = r.role.toLowerCase().includes(query);
      const matchTitle = r.title.toLowerCase().includes(query);
      const matchTarget = r.target.toLowerCase().includes(query);
      const matchSummary = r.summary.toLowerCase().includes(query);
      const matchResp = r.responsibilities.some((x) => x.toLowerCase().includes(query));
      const matchAuth = r.authorities.some((x) => x.toLowerCase().includes(query));

      const matchMember = users.some(
        (u) =>
          u.roles?.includes(r.role) &&
          ((u.displayName || "").toLowerCase().includes(query) ||
            (u.email || "").toLowerCase().includes(query) ||
            (u.instruments || []).some((inst) => inst.toLowerCase().includes(query)) ||
            (u.sectionId && (sectionMap[u.sectionId] || "").toLowerCase().includes(query)))
      );

      return matchRole || matchTitle || matchTarget || matchSummary || matchResp || matchAuth || matchMember;
    });
  }, [searchQuery, users, sectionMap]);

  // Filtered routes
  const filteredRoutes = useMemo(() => {
    return ROUTE_DOCS.filter((route) => {
      // Category filter
      if (selectedCategory !== "All Routes" && route.category !== selectedCategory) {
        return false;
      }

      // Role filter
      if (selectedRoleFilter === "my-roles") {
        if (!mounted) return true;
        const canAccess = route.roles.some((r) => hasRole(profile, r));
        if (!canAccess) return false;
      } else if (selectedRoleFilter !== "all") {
        if (!route.roles.includes(selectedRoleFilter as Role)) {
          return false;
        }
      }

      // Search query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const matchesTitle = route.title.toLowerCase().includes(query);
        const matchesPath = route.path.toLowerCase().includes(query);
        const matchesSummary = route.summary.toLowerCase().includes(query);
        const matchesDesc = route.description.toLowerCase().includes(query);
        const matchesFeatures = route.keyFeatures.some((f) => f.toLowerCase().includes(query));
        const matchesHowTo = route.howToUse.some((h) => h.toLowerCase().includes(query));
        const matchesTips = route.proTips.some((t) => t.toLowerCase().includes(query));

        return (
          matchesTitle ||
          matchesPath ||
          matchesSummary ||
          matchesDesc ||
          matchesFeatures ||
          matchesHowTo ||
          matchesTips
        );
      }

      return true;
    });
  }, [searchQuery, selectedCategory, selectedRoleFilter, profile, mounted]);

  return (
    <div suppressHydrationWarning className="min-h-screen p-4 sm:p-6 lg:p-8 space-y-8 max-w-7xl mx-auto">
      {/* Hero Header Banner */}
      <div 
        suppressHydrationWarning
        className="border rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden transition-colors"
        style={{
          backgroundColor: "var(--ebb-surface)",
          borderColor: "var(--ebb-border)",
        }}
      >
        <div className="relative z-10 space-y-3 max-w-3xl">
          <div 
            suppressHydrationWarning
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full border text-xs font-mono font-bold uppercase tracking-wider"
            style={{
              backgroundColor: "var(--ebb-surface-muted)",
              borderColor: "var(--ebb-border)",
              color: "var(--ebb-primary)",
            }}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Portal Help & Documentation Center</span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-black uppercase tracking-tight text-white">
            Eagleburger Portal Guide & Knowledge Base
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
            Welcome to the official manual for the Eagleburger Band platform. Discover comprehensive workflows, step-by-step guides, best practices, and access rules for every workspace route.
          </p>
        </div>

        {/* Quick Stat Chips */}
        <div className="relative z-10 pt-4 flex flex-wrap items-center gap-3 text-xs">
          <div 
            suppressHydrationWarning
            className="border px-3.5 py-1.5 rounded-xl font-mono text-slate-300 flex items-center gap-2 shadow-sm"
            style={{
              backgroundColor: "var(--ebb-surface-muted)",
              borderColor: "var(--ebb-border)",
            }}
          >
            <Sparkles className="w-3.5 h-3.5" style={{ color: "var(--ebb-primary)" }} />
            <span><strong>23</strong> Workspaces Documented</span>
          </div>
          <div 
            suppressHydrationWarning
            className="border px-3.5 py-1.5 rounded-xl font-mono text-slate-300 flex items-center gap-2 shadow-sm"
            style={{
              backgroundColor: "var(--ebb-surface-muted)",
              borderColor: "var(--ebb-border)",
            }}
          >
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span><strong>11</strong> Defined Portal Roles</span>
          </div>
          <div 
            suppressHydrationWarning
            className="border px-3.5 py-1.5 rounded-xl font-mono text-slate-300 flex items-center gap-2 shadow-sm"
            style={{
              backgroundColor: "var(--ebb-surface-muted)",
              borderColor: "var(--ebb-border)",
            }}
          >
            <Users className="w-3.5 h-3.5 text-sky-400" />
            <span><strong>{users.length}</strong> Roster Members</span>
          </div>
        </div>
      </div>

      {/* Interactive Search & Filter Controls */}
      <div 
        suppressHydrationWarning
        className="border rounded-2xl p-4 sm:p-5 shadow space-y-4 transition-colors"
        style={{
          backgroundColor: "var(--ebb-surface)",
          borderColor: "var(--ebb-border)",
        }}
      >
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              suppressHydrationWarning
              placeholder="Search by route, title, role, member name, feature, instrument..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                backgroundColor: "var(--ebb-surface-muted)",
                borderColor: "var(--ebb-border)",
              }}
              className="w-full border rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none"
            />
            {searchQuery && (
              <button
                type="button"
                suppressHydrationWarning
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-xs"
              >
                Clear
              </button>
            )}
          </div>

          {/* Role Filter Selector */}
          <div className="flex items-center gap-2 shrink-0">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={selectedRoleFilter}
              suppressHydrationWarning
              onChange={(e) => setSelectedRoleFilter(e.target.value)}
              style={{
                backgroundColor: "var(--ebb-surface-muted)",
                borderColor: "var(--ebb-border)",
              }}
              className="border text-xs text-slate-200 rounded-xl px-3 py-2.5 focus:outline-none"
            >
              <option value="all">All Roles</option>
              <option value="my-roles">My Accessible Tools</option>
              <option value="member">Member</option>
              <option value="section_leader">Section Leader</option>
              <option value="gig_manager">Gig Manager</option>
              <option value="catalog_manager">Catalog Manager</option>
              <option value="membership_manager">Membership Manager</option>
              <option value="asset_manager">Asset Manager</option>
              <option value="community_manager">Community Manager</option>
              <option value="treasurer">Treasurer</option>
              <option value="web_manager">Web Manager</option>
              <option value="admin">Full Admin</option>
              <option value="guest">Guest</option>
            </select>

            <button
              type="button"
              suppressHydrationWarning
              onClick={expandAll}
              style={{
                backgroundColor: "var(--ebb-surface-muted)",
                borderColor: "var(--ebb-border)",
              }}
              className="px-3 py-2 border text-slate-300 rounded-xl text-xs font-semibold transition hover:brightness-110"
            >
              Expand All
            </button>
            <button
              type="button"
              suppressHydrationWarning
              onClick={collapseAll}
              style={{
                backgroundColor: "var(--ebb-surface-muted)",
                borderColor: "var(--ebb-border)",
              }}
              className="px-3 py-2 border text-slate-400 rounded-xl text-xs font-semibold transition hover:brightness-110"
            >
              Collapse
            </button>
          </div>
        </div>

        {/* Category Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-xs">
          {(
            [
              "All Routes",
              "Musician Essentials",
              "Performances & Logistics",
              "Personnel & Attendance",
              "Music & Repertoire",
              "Business & Public Web",
              "Portal Roles & Members",
              "Permissions Matrix",
              "FAQs",
            ] as HelpCategory[]
          ).map((cat) => {
            const isSelected = selectedCategory === cat;
            return (
              <button
                key={cat}
                type="button"
                suppressHydrationWarning
                onClick={() => setSelectedCategory(cat)}
                style={
                  isSelected
                    ? {
                        backgroundColor: "var(--ebb-primary)",
                        color: "#020617",
                        borderColor: "var(--ebb-primary)",
                      }
                    : {
                        backgroundColor: "var(--ebb-surface-muted)",
                        borderColor: "var(--ebb-border)",
                        color: "#94a3b8",
                      }
                }
                className="px-3.5 py-1.5 rounded-xl font-bold transition shrink-0 border"
              >
                {cat}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Content Area */}
      {selectedCategory === "Portal Roles & Members" ? (
        /* Portal Roles & Member Directory View */
        <div className="space-y-6">
          {/* Header Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4" style={{ borderColor: "var(--ebb-border)" }}>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-black uppercase tracking-tight" style={{ color: "var(--ebb-text)" }}>
                  Portal Roles & Assigned Musicians
                </h2>
                <span 
                  className="px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold"
                  style={{
                    backgroundColor: "var(--ebb-surface-muted)",
                    color: "var(--ebb-primary)",
                    border: "1px solid var(--ebb-border)",
                  }}
                >
                  {filteredRoles.length} Roles
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Explore operational responsibilities, system clearances, and discover which band members hold each role.
              </p>
            </div>

            <div className="flex items-center gap-2 self-start sm:self-center shrink-0">
              {/* View Mode Switcher */}
              <div 
                className="flex items-center p-1 rounded-xl border text-xs"
                style={{
                  backgroundColor: "var(--ebb-surface-muted)",
                  borderColor: "var(--ebb-border)",
                }}
              >
                <button
                  type="button"
                  suppressHydrationWarning
                  onClick={() => setRoleViewMode("cards")}
                  style={
                    roleViewMode === "cards"
                      ? {
                          backgroundColor: "var(--ebb-primary)",
                          color: "#020617",
                        }
                      : {
                          color: "#94a3b8",
                        }
                  }
                  className="px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition"
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                  <span>Role Cards</span>
                </button>
                <button
                  type="button"
                  suppressHydrationWarning
                  onClick={() => setRoleViewMode("matrix")}
                  style={
                    roleViewMode === "matrix"
                      ? {
                          backgroundColor: "var(--ebb-primary)",
                          color: "#020617",
                        }
                      : {
                          color: "#94a3b8",
                        }
                  }
                  className="px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition"
                >
                  <TableIcon className="w-3.5 h-3.5" />
                  <span>Matrix Table</span>
                </button>
              </div>

              {roleViewMode === "cards" && (
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    suppressHydrationWarning
                    onClick={expandAllRoles}
                    style={{
                      backgroundColor: "var(--ebb-surface-muted)",
                      borderColor: "var(--ebb-border)",
                    }}
                    className="px-2.5 py-1.5 rounded-xl border text-xs text-slate-300 font-semibold hover:brightness-110 transition"
                  >
                    Expand All
                  </button>
                  <button
                    type="button"
                    suppressHydrationWarning
                    onClick={collapseAllRoles}
                    style={{
                      backgroundColor: "var(--ebb-surface-muted)",
                      borderColor: "var(--ebb-border)",
                    }}
                    className="px-2.5 py-1.5 rounded-xl border text-xs text-slate-400 font-semibold hover:brightness-110 transition"
                  >
                    Collapse
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Admin Emulation Sandbox Callout Banner */}
          {mounted && isRealAdmin && (
            <div
              suppressHydrationWarning
              className="p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs shadow-sm transition-colors"
              style={{
                backgroundColor: "rgba(139, 92, 246, 0.08)",
                borderColor: "rgba(167, 139, 250, 0.3)",
                color: "#e2e8f0",
              }}
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-purple-500/20 border border-purple-500/40 flex items-center justify-center shrink-0">
                  <Sparkles className="w-4 h-4 text-purple-300" />
                </div>
                <div>
                  <p className="font-bold text-white flex items-center gap-2">
                    <span>Role Emulation Sandbox (Administrator Clearance)</span>
                    {isEmulating && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-purple-500/30 text-purple-300 border border-purple-400/40">
                        Active: {emulatedRoles?.map((r) => `@${r}`).join(", ")}
                      </span>
                    )}
                  </p>
                  <p className="text-[11px] text-slate-300 mt-0.5">
                    Click <strong>&quot;Emulate Role&quot;</strong> on any position below to test the portal under that role&apos;s permissions, navigation routes, and capabilities without altering your database account.
                  </p>
                </div>
              </div>
              {isEmulating && (
                <button
                  type="button"
                  suppressHydrationWarning
                  onClick={clearEmulation}
                  className="px-3 py-1.5 rounded-xl border border-purple-400/50 bg-purple-500/20 text-purple-200 font-bold hover:bg-purple-500/30 transition text-xs shrink-0 self-start sm:self-center shadow-sm"
                >
                  Exit Emulation
                </button>
              )}
            </div>
          )}

          {roleViewMode === "matrix" ? (
            /* Matrix Mode */
            <div 
              className="border rounded-2xl overflow-hidden shadow"
              suppressHydrationWarning
              style={{
                backgroundColor: "var(--ebb-surface)",
                borderColor: "var(--ebb-border)",
              }}
            >
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead 
                    className="text-[10px] font-mono uppercase tracking-wider text-slate-400 border-b"
                    suppressHydrationWarning
                    style={{
                      backgroundColor: "var(--ebb-surface-muted)",
                      borderColor: "var(--ebb-border)",
                    }}
                  >
                    <tr>
                      <th className="p-3.5">Role Key</th>
                      <th className="p-3.5">Display Name</th>
                      <th className="p-3.5">Target Position</th>
                      <th className="p-3.5">Assigned Members</th>
                      <th className="p-3.5">Operational Scope</th>
                      <th className="p-3.5">Authorized Routes</th>
                      {mounted && isRealAdmin && <th className="p-3.5 text-right">Testing Action</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y" style={{ borderColor: "var(--ebb-border)" }}>
                    {RBAC_ROLES.map((r) => {
                      const assignedMembers = users.filter((u) => u.roles?.includes(r.role as Role));
                      const isCurrentEmulated = isEmulating && emulatedRoles?.length === 1 && emulatedRoles[0] === r.role;
                      return (
                        <tr 
                          key={r.role} 
                          className="hover:brightness-110 transition"
                          style={{ borderColor: "var(--ebb-border)" }}
                        >
                          <td className="p-3.5 font-mono font-bold" style={{ color: "var(--ebb-primary)" }}>{r.role}</td>
                          <td className="p-3.5 font-bold" style={{ color: "var(--ebb-text)" }}>{r.title}</td>
                          <td className="p-3.5 text-slate-400">{r.target}</td>
                          <td className="p-3.5">
                            {assignedMembers.length === 0 ? (
                              <span className="text-slate-500 italic">None assigned</span>
                            ) : (
                              <div className="flex flex-wrap gap-1">
                                {assignedMembers.map((m) => (
                                  <span 
                                    key={m.uid}
                                    className="px-2 py-0.5 rounded text-[11px] font-medium border"
                                    style={{
                                      backgroundColor: "var(--ebb-surface-muted)",
                                      borderColor: "var(--ebb-border)",
                                      color: m.uid === profile?.uid ? "var(--ebb-primary)" : "var(--ebb-text)",
                                    }}
                                  >
                                    {m.displayName}{m.uid === profile?.uid ? " (You)" : ""}
                                  </span>
                                ))}
                              </div>
                            )}
                          </td>
                          <td className="p-3.5 leading-relaxed">{r.scope}</td>
                          <td className="p-3.5 font-mono text-[11px] text-slate-400">{r.routes}</td>
                          {mounted && isRealAdmin && (
                            <td className="p-3.5 text-right">
                              <button
                                type="button"
                                suppressHydrationWarning
                                onClick={() => {
                                  if (isCurrentEmulated) {
                                    clearEmulation();
                                  } else {
                                    setEmulatedRoles([r.role as Role]);
                                  }
                                }}
                                style={{
                                  backgroundColor: isCurrentEmulated
                                    ? "rgba(139, 92, 246, 0.25)"
                                    : "var(--ebb-surface-muted)",
                                  borderColor: isCurrentEmulated
                                    ? "rgba(167, 139, 250, 0.6)"
                                    : "var(--ebb-border)",
                                  color: isCurrentEmulated ? "#c4b5fd" : "#cbd5e1",
                                }}
                                className="px-2.5 py-1 text-xs font-bold rounded-xl border transition hover:brightness-125 inline-flex items-center gap-1.5 shadow-sm"
                              >
                                <Sparkles className={`w-3 h-3 ${isCurrentEmulated ? "text-purple-300" : "text-purple-400"}`} />
                                <span>{isCurrentEmulated ? "Reset" : "Emulate"}</span>
                              </button>
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            /* Cards Mode with Assigned Members Roster */
            <div className="space-y-6">
              {filteredRoles.length === 0 ? (
                <div 
                  className="border rounded-2xl p-12 text-center space-y-3"
                  suppressHydrationWarning
                  style={{
                    backgroundColor: "var(--ebb-surface)",
                    borderColor: "var(--ebb-border)",
                  }}
                >
                  <HelpCircle className="w-8 h-8 text-slate-500 mx-auto" />
                  <div className="text-base font-bold text-white">No roles match your search filter</div>
                  <p className="text-xs text-slate-400 max-w-md mx-auto">
                    Try clearing your search query to explore all 11 defined portal roles and their assigned band members.
                  </p>
                  <button
                    type="button"
                    suppressHydrationWarning
                    onClick={() => setSearchQuery("")}
                    style={{
                      backgroundColor: "var(--ebb-primary)",
                      color: "#020617",
                    }}
                    className="font-bold px-4 py-2 rounded-xl text-xs transition shadow"
                  >
                    Clear Search
                  </button>
                </div>
              ) : (
                filteredRoles.map((r) => {
                  const isExpanded = Boolean(expandedRoles[r.role]);
                  const assignedMembers = users.filter((u) => u.roles?.includes(r.role));
                  const isCurrentEmulated = isEmulating && emulatedRoles?.length === 1 && emulatedRoles[0] === r.role;

                  return (
                    <div
                      key={r.role}
                      className="border rounded-2xl overflow-hidden shadow-xl transition"
                      suppressHydrationWarning
                      style={{
                        backgroundColor: "var(--ebb-surface)",
                        borderColor: "var(--ebb-border)",
                      }}
                    >
                      {/* Role Card Header */}
                      <div 
                        className="p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                        suppressHydrationWarning
                        style={{ backgroundColor: "var(--ebb-surface)" }}
                      >
                        <div className="flex items-start sm:items-center gap-3.5">
                          <div 
                            className="w-10 h-10 rounded-2xl border flex items-center justify-center shrink-0 mt-0.5 sm:mt-0 shadow-sm"
                            suppressHydrationWarning
                            style={{
                              backgroundColor: "var(--ebb-surface-muted)",
                              borderColor: "var(--ebb-border)",
                            }}
                          >
                            {getRoleIcon(r.role)}
                          </div>
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="text-base font-extrabold text-white">
                                {r.title}
                              </h3>
                              <span 
                                className="border font-mono text-[10px] font-bold px-2 py-0.5 rounded-full"
                                suppressHydrationWarning
                                style={{
                                  backgroundColor: "var(--ebb-surface-muted)",
                                  borderColor: "var(--ebb-border)",
                                  color: "var(--ebb-primary)",
                                }}
                              >
                                @{r.role}
                              </span>
                              <span 
                                className="border text-[10px] font-bold px-2 py-0.5 rounded-full text-slate-300"
                                suppressHydrationWarning
                                style={{
                                  backgroundColor: "var(--ebb-surface-muted)",
                                  borderColor: "var(--ebb-border)",
                                }}
                              >
                                {r.badge}
                              </span>
                            </div>
                            <p className="text-xs text-slate-400 mt-1 line-clamp-1">
                              Target Position: <strong className="text-slate-300">{r.target}</strong>
                            </p>
                          </div>
                        </div>

                        {/* Action Buttons & Member Badge */}
                        <div className="flex items-center gap-2 sm:gap-3 shrink-0 self-end sm:self-center flex-wrap">
                          {/* Admin Emulation Action */}
                          {mounted && isRealAdmin && (
                            <button
                              type="button"
                              suppressHydrationWarning
                              onClick={() => {
                                if (isCurrentEmulated) {
                                  clearEmulation();
                                } else {
                                  setEmulatedRoles([r.role as Role]);
                                }
                              }}
                              style={{
                                backgroundColor: isCurrentEmulated
                                  ? "rgba(139, 92, 246, 0.25)"
                                  : "var(--ebb-surface-muted)",
                                borderColor: isCurrentEmulated
                                  ? "rgba(167, 139, 250, 0.6)"
                                  : "var(--ebb-border)",
                                color: isCurrentEmulated ? "#c4b5fd" : "#cbd5e1",
                              }}
                              className="px-2.5 py-1.5 rounded-xl border text-xs font-bold transition flex items-center gap-1.5 hover:brightness-125 shadow-sm"
                              title={
                                isCurrentEmulated
                                  ? "Currently emulating this role (Click to exit emulation)"
                                  : `Emulate @${r.role} across the portal`
                              }
                            >
                              <Sparkles
                                className={`w-3.5 h-3.5 ${
                                  isCurrentEmulated ? "text-purple-300" : "text-purple-400"
                                }`}
                              />
                              <span>{isCurrentEmulated ? "Emulating (Exit)" : "Emulate Role"}</span>
                            </button>
                          )}

                          {/* Member Count Chip */}
                          <div 
                            className="px-3 py-1 rounded-full text-xs font-bold border flex items-center gap-1.5"
                            style={
                              assignedMembers.length > 0
                                ? {
                                    backgroundColor: "rgba(16, 185, 129, 0.1)",
                                    borderColor: "rgba(16, 185, 129, 0.3)",
                                    color: "#34d399",
                                  }
                                : {
                                    backgroundColor: "rgba(245, 158, 11, 0.1)",
                                    borderColor: "rgba(245, 158, 11, 0.3)",
                                    color: "#fbbf24",
                                  }
                            }
                          >
                            <Users className="w-3.5 h-3.5" />
                            <span>
                              {assignedMembers.length} {assignedMembers.length === 1 ? "Member" : "Members"} Assigned
                            </span>
                          </div>

                          <button
                            type="button"
                            suppressHydrationWarning
                            onClick={() => toggleRoleExpand(r.role)}
                            style={{
                              backgroundColor: "var(--ebb-surface-muted)",
                              borderColor: "var(--ebb-border)",
                            }}
                            className="p-2 rounded-xl border text-slate-300 hover:text-white transition flex items-center gap-1 text-xs font-semibold"
                          >
                            <span>{isExpanded ? "Hide Details" : "View Details & Members"}</span>
                            {isExpanded ? (
                              <ChevronUp className="w-3.5 h-3.5" />
                            ) : (
                              <ChevronDown className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      </div>

                      {/* Detailed Role Drawer */}
                      {isExpanded && (
                        <div 
                          className="p-5 sm:p-6 border-t space-y-6"
                          suppressHydrationWarning
                          style={{
                            backgroundColor: "var(--ebb-surface-muted)",
                            borderColor: "var(--ebb-border)",
                          }}
                        >
                          {/* Operational Mission & Summary */}
                          <div className="space-y-1.5">
                            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 font-mono">
                              Operational Mission & Ensemble Purpose
                            </h4>
                            <p className="text-xs sm:text-sm text-slate-200 leading-relaxed">
                              {r.summary}
                            </p>
                          </div>

                          {/* Two-Column Grid: Responsibilities vs Authorities */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Responsibilities */}
                            <div 
                              className="border rounded-2xl p-4 space-y-3 shadow-sm"
                              suppressHydrationWarning
                              style={{
                                backgroundColor: "var(--ebb-surface)",
                                borderColor: "var(--ebb-border)",
                              }}
                            >
                              <h4 className="text-xs font-bold text-white flex items-center gap-2">
                                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                                <span>Key Responsibilities & Workflows</span>
                              </h4>
                              <ul className="space-y-2 text-xs text-slate-300">
                                {r.responsibilities.map((resp, i) => (
                                  <li key={i} className="flex items-start gap-2">
                                    <span className="text-emerald-400 font-bold shrink-0 mt-0.5">•</span>
                                    <span>{resp}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>

                            {/* System Authorities */}
                            <div 
                              className="border rounded-2xl p-4 space-y-3 shadow-sm"
                              suppressHydrationWarning
                              style={{
                                backgroundColor: "var(--ebb-surface)",
                                borderColor: "var(--ebb-border)",
                              }}
                            >
                              <h4 className="text-xs font-bold text-white flex items-center gap-2">
                                <ShieldCheck className="w-4 h-4 text-sky-400" />
                                <span>System Permissions & Clearances</span>
                              </h4>
                              <ul className="space-y-2 text-xs text-slate-300">
                                {r.authorities.map((auth, i) => (
                                  <li key={i} className="flex items-start gap-2">
                                    <span className="text-sky-400 font-bold shrink-0 mt-0.5">•</span>
                                    <span>{auth}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          </div>

                          {/* Authorized Workspaces / Route Launchers */}
                          <div className="space-y-2">
                            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 font-mono">
                              Authorized Workspaces & Quick Launch
                            </h4>
                            <div className="flex flex-wrap gap-2">
                              {r.routes.map((rt, idx) => (
                                <Link
                                  key={idx}
                                  href={rt.path}
                                  suppressHydrationWarning
                                  style={{
                                    backgroundColor: "var(--ebb-surface)",
                                    borderColor: "var(--ebb-border)",
                                    color: "var(--ebb-primary)",
                                  }}
                                  className="border px-3 py-1.5 rounded-xl font-medium text-xs transition flex items-center gap-1.5 hover:brightness-110 shadow-sm"
                                >
                                  <span>{rt.title}</span>
                                  <ExternalLink className="w-3 h-3" />
                                </Link>
                              ))}
                            </div>
                          </div>

                          {/* Assigned Band Members Section */}
                          <div className="space-y-3 pt-2 border-t" style={{ borderColor: "var(--ebb-border)" }}>
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <Users className="w-4 h-4 text-slate-400" />
                                <h4 className="text-xs font-bold uppercase tracking-wider text-white font-mono">
                                  Band Members Assigned to @{r.role} ({assignedMembers.length})
                                </h4>
                              </div>
                              <span className="text-[11px] text-slate-400">
                                Live from Band Roster
                              </span>
                            </div>

                            {assignedMembers.length === 0 ? (
                              <div 
                                className="border rounded-xl p-4 text-center space-y-2"
                                suppressHydrationWarning
                                style={{
                                  backgroundColor: "var(--ebb-surface)",
                                  borderColor: "var(--ebb-border)",
                                }}
                              >
                                <p className="text-xs text-slate-400">
                                  No musicians currently hold the <strong>@{r.role}</strong> role.
                                </p>
                                <p className="text-[11px] text-slate-500">
                                  Band Directors and Membership Managers can assign roles in the Roster Administration workspace.
                                </p>
                                <Link
                                  href="/admin/roster"
                                  className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-400 hover:underline pt-1"
                                >
                                  <span>Open Roster Admin to Assign</span>
                                  <ArrowRight className="w-3 h-3" />
                                </Link>
                              </div>
                            ) : (
                              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                {assignedMembers.map((member) => {
                                  const isSelf = member.uid === profile?.uid;
                                  const sectionName = member.sectionId ? sectionMap[member.sectionId] || member.sectionId : "Band Member";
                                  const instrumentsText = member.instruments && member.instruments.length > 0 ? member.instruments.join(", ") : null;

                                  return (
                                    <div 
                                      key={member.uid}
                                      className="border rounded-xl p-3 flex items-center justify-between gap-3 shadow-sm hover:brightness-105 transition"
                                      suppressHydrationWarning
                                      style={{
                                        backgroundColor: "var(--ebb-surface)",
                                        borderColor: "var(--ebb-border)",
                                      }}
                                    >
                                      <div className="flex items-center gap-2.5 min-w-0">
                                        <div 
                                          className="w-8 h-8 rounded-full border flex items-center justify-center font-bold text-xs shrink-0"
                                          suppressHydrationWarning
                                          style={{
                                            backgroundColor: "var(--ebb-surface-muted)",
                                            borderColor: "var(--ebb-border)",
                                            color: "var(--ebb-primary)",
                                          }}
                                        >
                                          {(member.displayName || "M").charAt(0).toUpperCase()}
                                        </div>
                                        <div className="min-w-0">
                                          <div className="flex items-center gap-1.5 flex-wrap">
                                            <span className="text-xs font-bold text-white truncate">
                                              {member.displayName}
                                            </span>
                                            {isSelf && (
                                              <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-amber-400/20 text-amber-300 border border-amber-400/30">
                                                You
                                              </span>
                                            )}
                                          </div>
                                          <p className="text-[11px] text-slate-400 truncate">
                                            {sectionName}{instrumentsText ? ` • ${instrumentsText}` : ""}
                                          </p>
                                        </div>
                                      </div>

                                      {/* Contact Buttons */}
                                      <div className="flex items-center gap-1 shrink-0">
                                        {member.email && (
                                          <a
                                            href={`mailto:${member.email}`}
                                            title={`Email ${member.displayName} (${member.email})`}
                                            className="p-1.5 rounded-lg border text-slate-400 hover:text-white transition"
                                            style={{
                                              backgroundColor: "var(--ebb-surface-muted)",
                                              borderColor: "var(--ebb-border)",
                                            }}
                                          >
                                            <Mail className="w-3.5 h-3.5" />
                                          </a>
                                        )}
                                        {member.phone && (
                                          <a
                                            href={`tel:${member.phone}`}
                                            title={`Call ${member.displayName} (${member.phone})`}
                                            className="p-1.5 rounded-lg border text-slate-400 hover:text-white transition"
                                            style={{
                                              backgroundColor: "var(--ebb-surface-muted)",
                                              borderColor: "var(--ebb-border)",
                                            }}
                                          >
                                            <Phone className="w-3.5 h-3.5" />
                                          </a>
                                        )}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>
      ) : selectedCategory === "Permissions Matrix" ? (
        /* RBAC Roles Matrix View */
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-3" style={{ borderColor: "var(--ebb-border)" }}>
            <div>
              <h2 className="text-xl font-black uppercase" style={{ color: "var(--ebb-text)" }}>Role-Based Access Control (RBAC) Matrix</h2>
              <p className="text-xs text-slate-400">
                Review the scope, responsibilities, assigned band members, and route authorizations assigned to each band role.
              </p>
            </div>
            <button
              type="button"
              suppressHydrationWarning
              onClick={() => {
                setSelectedCategory("Portal Roles & Members");
                setRoleViewMode("cards");
              }}
              style={{
                backgroundColor: "var(--ebb-surface-muted)",
                borderColor: "var(--ebb-border)",
                color: "var(--ebb-primary)",
              }}
              className="border px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 hover:brightness-110 self-start sm:self-center shrink-0"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Switch to Role Cards & Roster</span>
            </button>
          </div>

          <div 
            className="border rounded-2xl overflow-hidden shadow"
            suppressHydrationWarning
            style={{
              backgroundColor: "var(--ebb-surface)",
              borderColor: "var(--ebb-border)",
            }}
          >
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead 
                  className="text-[10px] font-mono uppercase tracking-wider text-slate-400 border-b"
                  suppressHydrationWarning
                  style={{
                    backgroundColor: "var(--ebb-surface-muted)",
                    borderColor: "var(--ebb-border)",
                  }}
                >
                  <tr>
                    <th className="p-3.5">Role Key</th>
                    <th className="p-3.5">Display Name</th>
                    <th className="p-3.5">Target Position</th>
                    <th className="p-3.5">Assigned Members</th>
                    <th className="p-3.5">Operational Scope</th>
                    <th className="p-3.5">Authorized Routes</th>
                  </tr>
                </thead>
                <tbody className="divide-y" style={{ borderColor: "var(--ebb-border)" }}>
                  {RBAC_ROLES.map((r) => {
                    const assignedMembers = users.filter((u) => u.roles?.includes(r.role as Role));
                    return (
                      <tr 
                        key={r.role} 
                        className="hover:brightness-110 transition"
                        style={{ borderColor: "var(--ebb-border)" }}
                      >
                        <td className="p-3.5 font-mono font-bold" style={{ color: "var(--ebb-primary)" }}>{r.role}</td>
                        <td className="p-3.5 font-bold" style={{ color: "var(--ebb-text)" }}>{r.title}</td>
                        <td className="p-3.5 text-slate-400">{r.target}</td>
                        <td className="p-3.5">
                          {assignedMembers.length === 0 ? (
                            <span className="text-slate-500 italic">None assigned</span>
                          ) : (
                            <div className="flex flex-wrap gap-1">
                              {assignedMembers.map((m) => (
                                <span 
                                  key={m.uid}
                                  className="px-2 py-0.5 rounded text-[11px] font-medium border"
                                  style={{
                                    backgroundColor: "var(--ebb-surface-muted)",
                                    borderColor: "var(--ebb-border)",
                                    color: m.uid === profile?.uid ? "var(--ebb-primary)" : "var(--ebb-text)",
                                  }}
                                >
                                  {m.displayName}{m.uid === profile?.uid ? " (You)" : ""}
                                </span>
                              ))}
                            </div>
                          )}
                        </td>
                        <td className="p-3.5 leading-relaxed">{r.scope}</td>
                        <td className="p-3.5 font-mono text-[11px] text-slate-400">{r.routes}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : selectedCategory === "FAQs" ? (
        /* FAQs View */
        <div className="space-y-6 max-w-4xl">
          <div className="border-b pb-3" style={{ borderColor: "var(--ebb-border)" }}>
            <h2 className="text-xl font-black uppercase" style={{ color: "var(--ebb-text)" }}>Frequently Asked Questions & Troubleshooting</h2>
            <p className="text-xs text-slate-400">
              Common questions about gig RSVPs, mobile calendar sync, sheet music, payouts, and permissions.
            </p>
          </div>

          <div className="space-y-3">
            {FAQS.map((faq, idx) => (
              <div
                key={idx}
                className="border rounded-2xl p-5 space-y-2 shadow"
                suppressHydrationWarning
                style={{
                  backgroundColor: "var(--ebb-surface)",
                  borderColor: "var(--ebb-border)",
                }}
              >
                <div className="flex items-start gap-2.5 text-sm font-bold" style={{ color: "var(--ebb-text)" }}>
                  <HelpCircle className="w-4 h-4 shrink-0 mt-0.5" style={{ color: "var(--ebb-primary)" }} />
                  <span>{faq.q}</span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed pl-6.5">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      ) : (
        /* Route Documentation Cards List */
        <div className="space-y-6">
          <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: "var(--ebb-border)" }}>
            <div>
              <h2 className="text-xl font-black uppercase" style={{ color: "var(--ebb-text)" }}>
                {selectedCategory === "All Routes" ? "Complete Workspace Directory" : selectedCategory}
              </h2>
              <p className="text-xs text-slate-400">
                Showing <strong>{filteredRoutes.length}</strong> documented workspaces
              </p>
            </div>
          </div>

          {filteredRoutes.length === 0 ? (
            <div 
              className="border rounded-2xl p-12 text-center space-y-3"
              suppressHydrationWarning
              style={{
                backgroundColor: "var(--ebb-surface)",
                borderColor: "var(--ebb-border)",
              }}
            >
              <HelpCircle className="w-8 h-8 text-slate-500 mx-auto" />
              <div className="text-base font-bold text-white">No workspaces match your filter criteria</div>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                Try clearing your search query or selecting &quot;All Roles&quot; to see all portal route documentation.
              </p>
              <button
                type="button"
                suppressHydrationWarning
                onClick={() => {
                  setSearchQuery("");
                  setSelectedRoleFilter("all");
                  setSelectedCategory("All Routes");
                }}
                style={{
                  backgroundColor: "var(--ebb-primary)",
                  color: "#020617",
                }}
                className="font-bold px-4 py-2 rounded-xl text-xs transition shadow"
              >
                Reset All Filters
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredRoutes.map((route) => {
                const isExpanded = Boolean(expandedRoutes[route.id]);
                const isCopied = copiedPath === route.path;

                return (
                  <div
                    key={route.id}
                    className="border rounded-2xl overflow-hidden shadow-xl transition"
                    suppressHydrationWarning
                    style={{
                      backgroundColor: "var(--ebb-surface)",
                      borderColor: "var(--ebb-border)",
                    }}
                  >
                    {/* Collapsible Card Header */}
                    <div 
                      className="p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
                      suppressHydrationWarning
                      style={{ backgroundColor: "var(--ebb-surface)" }}
                    >
                      <div className="flex items-start sm:items-center gap-3">
                        <div 
                          className="w-9 h-9 rounded-xl border flex items-center justify-center shrink-0 mt-0.5 sm:mt-0"
                          suppressHydrationWarning
                          style={{
                            backgroundColor: "var(--ebb-surface-muted)",
                            borderColor: "var(--ebb-border)",
                            color: "var(--ebb-primary)",
                          }}
                        >
                          <Compass className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="text-sm sm:text-base font-extrabold text-white">
                              {route.title}
                            </h3>
                            <span 
                              className="border font-mono text-[10px] px-2 py-0.5 rounded-full"
                              suppressHydrationWarning
                              style={{
                                backgroundColor: "var(--ebb-surface-muted)",
                                borderColor: "var(--ebb-border)",
                                color: "#94a3b8",
                              }}
                            >
                              {route.path}
                            </span>
                            <span 
                              className="border text-[10px] font-bold px-2 py-0.5 rounded-full"
                              suppressHydrationWarning
                              style={{
                                backgroundColor: "var(--ebb-surface-muted)",
                                borderColor: "var(--ebb-border)",
                                color: "var(--ebb-primary)",
                              }}
                            >
                              {route.badge}
                            </span>
                          </div>
                          <p className="text-xs text-slate-400 mt-1 line-clamp-1">
                            {route.summary}
                          </p>
                        </div>
                      </div>

                      {/* Header Action Buttons */}
                      <div className="flex items-center gap-2 shrink-0 self-end sm:self-center pt-2 sm:pt-0">
                        <button
                          type="button"
                          suppressHydrationWarning
                          title="Copy link to workspace"
                          onClick={() => handleCopyPath(route.path)}
                          style={{
                            backgroundColor: "var(--ebb-surface-muted)",
                            borderColor: "var(--ebb-border)",
                          }}
                          className="p-2 rounded-xl border text-slate-400 hover:text-white transition"
                        >
                          {isCopied ? (
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>

                        <Link
                          href={route.path}
                          suppressHydrationWarning
                          style={{
                            backgroundColor: "var(--ebb-primary)",
                            color: "#020617",
                          }}
                          className="px-3 py-1.5 rounded-xl font-bold text-xs transition flex items-center gap-1.5 shadow"
                        >
                          <span>Launch</span>
                          <ExternalLink className="w-3 h-3" />
                        </Link>

                        <button
                          type="button"
                          suppressHydrationWarning
                          onClick={() => toggleRouteExpand(route.id)}
                          style={{
                            backgroundColor: "var(--ebb-surface-muted)",
                            borderColor: "var(--ebb-border)",
                          }}
                          className="p-2 rounded-xl border text-slate-400 hover:text-white transition flex items-center gap-1 text-xs font-semibold"
                        >
                          <span>{isExpanded ? "Hide Guide" : "Read Guide"}</span>
                          {isExpanded ? (
                            <ChevronUp className="w-3.5 h-3.5" />
                          ) : (
                            <ChevronDown className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Detailed Expanded Drawer */}
                    {isExpanded && (
                      <div 
                        className="p-5 sm:p-6 border-t space-y-6"
                        suppressHydrationWarning
                        style={{
                          backgroundColor: "var(--ebb-surface-muted)",
                          borderColor: "var(--ebb-border)",
                        }}
                      >
                        {/* What It Is Description */}
                        <div className="space-y-1.5">
                          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 font-mono">
                            What It Is & Operational Purpose
                          </h4>
                          <p className="text-xs sm:text-sm text-slate-200 leading-relaxed">
                            {route.description}
                          </p>
                        </div>

                        {/* Authorized Roles Badges */}
                        <div className="space-y-1.5">
                          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 font-mono">
                            Authorized Access Roles
                          </h4>
                          <div className="flex flex-wrap gap-1.5">
                            {route.roles.map((r) => (
                              <span
                                key={r}
                                className="border font-mono text-[11px] px-2.5 py-1 rounded-lg"
                                suppressHydrationWarning
                                style={{
                                  backgroundColor: "var(--ebb-surface)",
                                  borderColor: "var(--ebb-border)",
                                  color: "var(--ebb-primary)",
                                }}
                              >
                                @{r}
                              </span>
                            ))}
                          </div>
                        </div>

                        {/* Two Column Section: Key Features vs How to Use */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          {/* Key Features */}
                          <div 
                            className="border rounded-2xl p-4 space-y-3 shadow-sm"
                            suppressHydrationWarning
                            style={{
                              backgroundColor: "var(--ebb-surface)",
                              borderColor: "var(--ebb-border)",
                            }}
                          >
                            <h4 className="text-xs font-bold text-white flex items-center gap-2">
                              <Sparkles className="w-4 h-4" style={{ color: "var(--ebb-primary)" }} />
                              Key Features & Capabilities
                            </h4>
                            <ul className="space-y-2 text-xs text-slate-300">
                              {route.keyFeatures.map((feat, i) => (
                                <li key={i} className="flex items-start gap-2">
                                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                                  <span>{feat}</span>
                                </li>
                              ))}
                            </ul>
                          </div>

                          {/* How to Use Step-by-Step */}
                          <div 
                            className="border rounded-2xl p-4 space-y-3 shadow-sm"
                            suppressHydrationWarning
                            style={{
                              backgroundColor: "var(--ebb-surface)",
                              borderColor: "var(--ebb-border)",
                            }}
                          >
                            <h4 className="text-xs font-bold text-white flex items-center gap-2">
                              <ArrowRight className="w-4 h-4 text-cyan-400" />
                              Step-by-Step Usage Guide
                            </h4>
                            <ol className="space-y-2 text-xs text-slate-300">
                              {route.howToUse.map((step, i) => (
                                <li key={i} className="flex items-start gap-2.5">
                                  <span 
                                    className="w-4 h-4 rounded-full font-mono text-[10px] flex items-center justify-center font-bold shrink-0 mt-0.5"
                                    suppressHydrationWarning
                                    style={{
                                      backgroundColor: "var(--ebb-surface-muted)",
                                      color: "var(--ebb-primary)",
                                      borderColor: "var(--ebb-border)",
                                    }}
                                  >
                                    {i + 1}
                                  </span>
                                  <span>{step}</span>
                                </li>
                              ))}
                            </ol>
                          </div>
                        </div>

                        {/* Pro Tips & Best Practices */}
                        <div 
                          className="border rounded-2xl p-4 space-y-2 shadow-sm"
                          suppressHydrationWarning
                          style={{
                            backgroundColor: "var(--ebb-surface-muted)",
                            borderColor: "var(--ebb-border)",
                          }}
                        >
                          <div className="text-xs font-bold flex items-center gap-2" style={{ color: "var(--ebb-primary)" }}>
                            <Lightbulb className="w-4 h-4" />
                            <span>Pro Tips & Ensemble Best Practices</span>
                          </div>
                          <ul className="space-y-1.5 text-xs text-slate-300">
                            {route.proTips.map((tip, i) => (
                              <li key={i} className="flex items-start gap-2">
                                <span className="font-bold" style={{ color: "var(--ebb-primary)" }}>•</span>
                                <span>{tip}</span>
                              </li>
                            ))}
                          </ul>
                        </div>

                        {/* Related Routes */}
                        {route.relatedRoutes && route.relatedRoutes.length > 0 && (
                          <div className="pt-2 flex flex-wrap items-center gap-2 text-xs">
                            <span className="text-slate-400 font-mono text-[10px] uppercase">Connected Tools:</span>
                            {route.relatedRoutes.map((rel, idx) => (
                              <Link
                                key={idx}
                                href={rel.path}
                                suppressHydrationWarning
                                style={{
                                  backgroundColor: "var(--ebb-surface)",
                                  borderColor: "var(--ebb-border)",
                                  color: "var(--ebb-primary)",
                                }}
                                className="border px-3 py-1 rounded-xl font-medium transition flex items-center gap-1 hover:brightness-110"
                              >
                                <span>{rel.title}</span>
                                <ArrowRight className="w-3 h-3" />
                              </Link>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
