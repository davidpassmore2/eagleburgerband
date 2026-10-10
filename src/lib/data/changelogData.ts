export interface StageChangelogItem {
  stage: number;
  title: string;
  category: string;
  accomplishments: string[];
}

export const STAGE_CHANGELOG: StageChangelogItem[] = [
  {
    stage: 53,
    title: "Universal Navigation Breadcrumbs, Section Instruments & Apparel Fulfillment",
    category: "Personnel & Navigation",
    accomplishments: [
      "Deployed universal PortalBreadcrumb across all 38+ portal and admin routes, matching sidebar navigation text.",
      "Added dual names (Display Name vs. Real/Legal Name) and section instrument catalogs with presets in /admin/sections.",
      "Added member shirt size preferences (XS–XXL) in /portal/profile.",
      "Added sortable column headers to admin roster tables.",
      "Built Community Manager fulfillment dashboard at /admin/shirt-sizes with real-time size metrics and .csv export with bottom summary breakdown.",
    ],
  },
  {
    stage: 52,
    title: "Automated Dispatch Boundaries & Gig Cancellation Alerts",
    category: "Performances & Logistics",
    accomplishments: [
      "Built automated gig cancellation broadcast modal notifying assigned musicians upon cancellation.",
      "Added comprehensive admin audit logging for gig dispatch and cancellations.",
      "Resolved nested modal scrollbar clipping in /admin/gigs.",
    ],
  },
  {
    stage: 51,
    title: "Live Calendar Sync, Offline Stage Mode & Portal Polish",
    category: "Performances & Mobile",
    accomplishments: [
      "Built live tokenized Webcal / iCal subscription feed (/api/calendar/[token]).",
      "Added feed filtering options: 'Only My Gigs' (?mode=mine) vs. 'All Band Gigs' (?mode=all).",
      "Polished portal mobile navigation and offline stage readiness.",
    ],
  },
  {
    stage: 50,
    title: "Lifecycle-Aware Gig Dispatch & Member Hiatus Safeguard",
    category: "Personnel & Logistics",
    accomplishments: [
      "Added automated gig availability invitations triggered upon lead conversion.",
      "Implemented first-class hiatus member status with automatic notification suppression.",
      "Built blackout date conflict filters preventing alerts to unavailable musicians.",
    ],
  },
  {
    stage: 49,
    title: "Manager Task Queue & Strict Invite-Only Auth",
    category: "Business & Admin",
    accomplishments: [
      "Created real-time Manager Task Queue watching pending RSVPs, open leads, and triage items.",
      "Enforced strict invite-only onboarding preventing unauthorized account creation.",
      "Modernized portal typography and layout using Arvo font stacks.",
    ],
  },
  {
    stage: 48,
    title: "Resend Email Integration & Transactional Communications",
    category: "Communications & Infrastructure",
    accomplishments: [
      "Integrated Resend API for transactional email delivery.",
      "Built automated invitation emails with onboarding links for new musicians.",
      "Added automated call sheet broadcasts and public booking inquiry confirmations.",
    ],
  },
  {
    stage: 47,
    title: "Member Onboarding & Section RSVP Experience",
    category: "Personnel & Attendance",
    accomplishments: [
      "Created public member claim and onboarding portal at /claim?token=....",
      "Added section-wide RSVP status views on gig call sheets.",
      "Optimized mobile chart viewer stand-mode with orientation locking.",
    ],
  },
  {
    stage: 46,
    title: "Multi-Environment Architecture & Cloud Beta Migration",
    category: "Infrastructure & Security",
    accomplishments: [
      "Established dual-environment configuration (dev emulators vs. beta live cloud project).",
      "Created environment switcher scripts and deployment pipelines.",
      "Hardened Cloud Firestore Security Rules for staging deployment.",
    ],
  },
  {
    stage: 45,
    title: "Usage Telemetry & Heatmap Analytics",
    category: "Business & Analytics",
    accomplishments: [
      "Built non-blocking telemetry tracking member portal navigation events (route_view).",
      "Excluded admin routes to ensure pure member engagement metrics.",
      "Created /admin/analytics/usage dashboard with activity heatmaps and page traffic charts.",
    ],
  },
  {
    stage: 44,
    title: "Public Media, Selector Columns & Catalog Ratings",
    category: "Website & Repertoire",
    accomplishments: [
      "Enhanced public header/footer styling with customizable drop shadows and opacity.",
      "Enabled custom hero banner images on public event landing pages.",
      "Added 5-star catalog rating component for members in /portal/library.",
    ],
  },
  {
    stage: 43,
    title: "Official Brand Logo Integration",
    category: "Brand & Assets",
    accomplishments: [
      "Integrated official high-resolution Eagleburger Band logo assets into public and portal headers.",
      "Built responsive logo rendering with fallback avatars.",
      "Added brand favicon and touch icons.",
    ],
  },
  {
    stage: 42,
    title: "'My Band Hub', Availability Conflicts & CMS Headers",
    category: "Portal & Logistics",
    accomplishments: [
      "Built 'My Band Hub' dashboard on /portal with countdown to next gig and call time.",
      "Built availability conflict engine alerting gig managers when musicians have blackouts.",
      "Added CMS hero header image upload and styling options.",
    ],
  },
  {
    stage: 41,
    title: "Full Architectural Sweep & RBAC Alignment",
    category: "Architecture & Security",
    accomplishments: [
      "Aligned RBAC permissions across all admin pages and workspaceRegistry.ts.",
      "Standardized subcollection schemas (blackouts, invites, ratings).",
      "Hardened TypeScript typing, eliminating untyped data access.",
    ],
  },
  {
    stage: 40,
    title: "Toast Notification Suite & Schema Invariance",
    category: "Platform & UX",
    accomplishments: [
      "Built lightweight zero-dependency Toast notification system (ToastContext) replacing browser alerts.",
      "Enforced schema invariance across all Firestore writes with safe defaults.",
      "Replaced alert() popups with responsive toast notifications across all admin workflows.",
    ],
  },
  {
    stage: 39,
    title: "Member Experience Polish & Architectural Review",
    category: "Personnel & Architecture",
    accomplishments: [
      "Added member notification inbox (/portal/notifications) with category preference toggles.",
      "Conducted comprehensive architectural review (stage-39-arch-review.md) across all collections and routes.",
      "Established refactoring priorities for schema invariance and error boundaries.",
    ],
  },
  {
    stage: 38,
    title: "Gig Compensation Models & Financial Transparency",
    category: "Finance & Logistics",
    accomplishments: [
      "Defined three clear gig compensation models: community ($0), band_fund (100% treasury), and individual (split payout).",
      "Built member payout estimator showing projected earnings per gig.",
      "Added financial transparency metrics to gig call sheets.",
    ],
  },
  {
    stage: 37,
    title: "Data Architecture Refactoring & Tune Schema Consolidation",
    category: "Music & Architecture",
    accomplishments: [
      "Unified music collections into canonical tunes collection with TuneSchema validation.",
      "Added 'review' status to TuneStatusEnum and consolidated arrangement fields.",
      "Removed legacy schema dependencies across all portal and admin views.",
    ],
  },
  {
    stage: 36,
    title: "Dual Theme Mode & Reusable Setlists",
    category: "Music & UX",
    accomplishments: [
      "Added Light / Dark theme mode toggle with user preference persistence.",
      "Created dedicated setlist_manager RBAC role.",
      "Introduced reusable setlist templates and setlist circulation analytics.",
    ],
  },
  {
    stage: 35,
    title: "Charitable Giving & Treasury Reporting Integration",
    category: "Finance & Community",
    accomplishments: [
      "Connected Firestore donations collection directly to /admin/finance.",
      "Reconciled treasury formulas to account for civic and nonprofit donations.",
      "Added dedicated 5-KPI metric cards including Charitable Giving and Liquid Treasury.",
    ],
  },
  {
    stage: 34,
    title: "Workspace Taxonomy Unification & Help Center",
    category: "Docs & Navigation",
    accomplishments: [
      "Consolidated portal and CMS taxonomy into 7 unified categories.",
      "Completely overhauled /portal/help knowledge base with role guides and search.",
      "Added searchable FAQ and operational guides for new band members.",
    ],
  },
  {
    stage: 33,
    title: "Member Portal PWA Optimization",
    category: "Mobile & PWA",
    accomplishments: [
      "Configured web app manifest (/manifest.webmanifest), start_url: /portal, and standalone display.",
      "Added Apple Web App meta tags and generated official PWA icon assets (icon-192, icon-512).",
      "Enabled quick home-screen access for musicians on iOS and Android.",
    ],
  },
  {
    stage: 32,
    title: "PWA Install Suite & Collapsible Admin Sidebar",
    category: "Portal Navigation",
    accomplishments: [
      "Built Progressive Web App (PWA) install prompt banners for mobile and desktop Standby.",
      "Implemented collapsible, pinnable portal sidebar with smooth transitions.",
      "Migrated developer accounts to real super-admin account (davidpassmore@gmail.com).",
    ],
  },
  {
    stage: 31,
    title: "Multi-Platform Authentication Hub",
    category: "Auth & Identity",
    accomplishments: [
      "Upgraded sign-in to a dedicated branded portal login page (/login).",
      "Added passwordless magic links, Apple, Microsoft, GitHub OAuth, and email/password accounts.",
      "Added smart return redirects and automatic invite-token linking.",
    ],
  },
  {
    stage: 30,
    title: "CMS Section Customizers & Fan Calendar Suite",
    category: "Website & Fan Engagement",
    accomplishments: [
      "Built visual section customizers in CMS Page Studio for headers, media, and features.",
      "Created rich public event landing pages (/gigs/[id]) with OpenStreetMap (Leaflet) venue mapping.",
      "Added 1-click 'Add to Google/Apple Calendar' buttons for fans.",
    ],
  },
  {
    stage: 29,
    title: "Modular Public Section Engine & Social Media Integration",
    category: "Website & Marketing",
    accomplishments: [
      "Refactored public website into a modular component engine (PublicSectionRenderer).",
      "Built interactive navigation management, global announcement banners, and social links.",
      "Integrated public booking form into modular page presets.",
    ],
  },
  {
    stage: 28,
    title: "Repertoire Ratings, Comments & Action Audit Log",
    category: "Music & Governance",
    accomplishments: [
      "Added net upvote/downvote scoring to charts in the repertoire catalog.",
      "Added expandable inline discussion drawers (CommentsStream) under each chart.",
      "Built /admin/audit-log logging administrative actions with timestamps and actor details.",
    ],
  },
  {
    stage: 27,
    title: "Broadcast Suite, Member Profiles & Self-Deactivation",
    category: "Personnel & Comms",
    accomplishments: [
      "Built /admin/notifications for targeted email and SMS announcements.",
      "Enhanced /portal/profile with musician contact info, payout handles, and privacy toggles.",
      "Added self-service band departure/hiatus workflow with audit logging.",
    ],
  },
  {
    stage: 26,
    title: "Portal Theme System & Role Emulation Suite",
    category: "Theme & Security",
    accomplishments: [
      "Created ThemeContext offering 6 preset portal theme schemes (Classic Brass, Dark Mode, etc.).",
      "Built RoleEmulationModal allowing admins to preview portal views as any band role.",
      "Saved theme preferences to local storage with seamless switching.",
    ],
  },
  {
    stage: 25,
    title: "Headless CMS Page Studio & Public Website v2",
    category: "Website & CMS",
    accomplishments: [
      "Built /admin/pages visual page builder with WYSIWYG editor and SEO meta controls.",
      "Launched dynamic public marketing website (/, /[slug], /gigs, /about).",
      "Created /giving donation portal and /admin/theme branding suite.",
    ],
  },
  {
    stage: 24,
    title: "Admin Financial Ledger & Treasury Management",
    category: "Finance & Treasury",
    accomplishments: [
      "Built /admin/finance with season revenue totals, deposit tracking, and expense logging.",
      "Added categorized expense tracking with receipt upload capabilities.",
      "Calculated net band profit and liquid treasury balances.",
    ],
  },
  {
    stage: 23,
    title: "Portal Navigation Shell & Workspace Registry",
    category: "Navigation & RBAC",
    accomplishments: [
      "Re-architected portal navigation into a centralized registry (workspaceRegistry.ts).",
      "Grouped 24+ tools into clear categories with dynamic RBAC visibility filtering.",
      "Introduced standardized breadcrumb and layout navigation across all portal pages.",
    ],
  },
  {
    stage: 22,
    title: "Downbeat Check-In & Attendance Analytics",
    category: "Personnel & Operations",
    accomplishments: [
      "Built /admin/checkin mobile roll-call tool for rapid on-site attendance marking.",
      "Supported 1-tap member check-in at downbeat with tardy/absent tracking.",
      "Generated member and section attendance reliability metrics over time.",
    ],
  },
  {
    stage: 21,
    title: "Rehearsal Vault & Blackout Availability Calendar",
    category: "Music & Logistics",
    accomplishments: [
      "Created /portal/vault for reference rehearsal audio recordings, sheet music notes, and video links.",
      "Built /portal/availability date-range calendar allowing musicians to log vacation and blackout dates.",
      "Surfaced musician blackout conflicts directly to gig managers during dispatch.",
    ],
  },
  {
    stage: 20,
    title: "Admin Operations Studio & Gig Workflows",
    category: "Performances & Operations",
    accomplishments: [
      "Enhanced /admin/gigs with 1-click duplicate gig cloning and season archiving.",
      "Added bulk status updates and rapid call sheet export actions.",
      "Streamlined management of recurring festival and seasonal parade bookings.",
    ],
  },
  {
    stage: 19,
    title: "Suggestion Triage Expansion & Role-Based Queues",
    category: "Community & Feedback",
    accomplishments: [
      "Expanded suggestion triage from just tunes to gig outreach, website requests, and general feedback.",
      "Routed categories to corresponding roles (gig_manager, web_manager, community_manager).",
      "Enabled member upvoting on community suggestions.",
    ],
  },
  {
    stage: 18,
    title: "Tune Performance Analytics & Repertoire Intelligence",
    category: "Music & Analytics",
    accomplishments: [
      "Built /admin/analytics/catalog providing visual charts on tune play frequency and recency.",
      "Added 'Most Played', 'Least Played', and 'Dormant' tune reports to prevent setlist fatigue.",
      "Generated intelligent repertoire rotation recommendations for setlist managers.",
    ],
  },
  {
    stage: 17,
    title: "Logistics Change Notifications & Webhooks",
    category: "Performances & Comms",
    accomplishments: [
      "Implemented automated logistics change detection (call time, downbeat, venue shifts).",
      "Built LogisticsChangeModal prompting managers to notify musicians when modifying critical details.",
      "Added /api/webhooks/logistics-alert infrastructure for instant alerts.",
    ],
  },
  {
    stage: 16,
    title: "Booking Inquiry Lead Management Enhancement",
    category: "Website & Intake",
    accomplishments: [
      "Added communication log history and follow-up reminders to /admin/inquiries.",
      "Enabled custom pricing quotes, deposit deadlines, and client contact archiving.",
      "Streamlined lead status workflows (New, In Discussion, Quoted, Contracted, Archived).",
    ],
  },
  {
    stage: 15,
    title: "Section Leader Instrumentation Audit Drawer",
    category: "Personnel & Sections",
    accomplishments: [
      "Built slide-out instrumentation audit drawer in /admin/gigs for section leaders.",
      "Displayed real-time roll call counts by section against minimum recommended thresholds.",
      "Added visual deficiency alerts for missing critical instruments (e.g. Bass Drum, Tuba).",
    ],
  },
  {
    stage: 14,
    title: "Musician iCal Calendar Subscription Feed",
    category: "Performances & Calendar",
    accomplishments: [
      "Built tokenized HTTP calendar feed endpoint exporting performances to .ics format.",
      "Enabled 1-click subscription for Apple Calendar, Google Calendar, and Outlook.",
      "Supported automatic calendar updates when gig times or locations change.",
    ],
  },
  {
    stage: 13,
    title: "Financial Ledger & Musician Payouts",
    category: "Finance & Treasury",
    accomplishments: [
      "Created foundational financial ledger tracking client fees, deposits, and gig payouts.",
      "Added musician compensation calculations based on gig attendance and performance tier.",
      "Generated payout summaries for the band treasurer.",
    ],
  },
  {
    stage: 12,
    title: "Stage Readiness & Offline Print Toolbar",
    category: "Performances & Operations",
    accomplishments: [
      "Added one-click printable stage sheets, setlists, and call sheets with high-contrast print CSS.",
      "Integrated stage readiness indicators showing section attendance and instrumentation health.",
      "Built offline caching foundations for spotty outdoor venue connectivity.",
    ],
  },
  {
    stage: 11,
    title: "Gig Setlist Management Modal",
    category: "Performances & Music",
    accomplishments: [
      "Created dedicated interactive modal within the gig workflow for assembling setlists.",
      "Added live duration estimators, encore slots, and set breaks.",
      "Enabled instant setlist sync to musician mobile portal views.",
    ],
  },
  {
    stage: 10,
    title: "Musician Repertoire Library & Mobile Chart Viewer",
    category: "Music & Repertoire",
    accomplishments: [
      "Built member-facing sheet music library at /portal/library.",
      "Added section-specific chart filtering, key signatures, tempos, and audio reference links.",
      "Optimized mobile chart viewing experience for performance stands and tablets.",
    ],
  },
  {
    stage: 9,
    title: "Gig Dispatch, Call Sheets & Musician Schedule",
    category: "Performances & Logistics",
    accomplishments: [
      "Built /admin/dispatch to publish official gig call sheets with attire, maps, and schedules.",
      "Created member schedule view (/portal/gigs) displaying personalized upcoming performances.",
      "Added interactive member RSVP buttons (In, Out, Tentative) with real-time roster counts.",
    ],
  },
  {
    stage: 8,
    title: "Public Booking Inquiry Pipeline",
    category: "Website & Intake",
    accomplishments: [
      "Created public /book form for clients to submit private event and wedding inquiries.",
      "Built /admin/inquiries triage dashboard for gig managers to review incoming leads.",
      "Added conversion pipeline allowing approved booking inquiries to turn directly into scheduled gigs.",
    ],
  },
  {
    stage: 7,
    title: "Roster, Sections & User Administration",
    category: "Personnel & Administration",
    accomplishments: [
      "Built /admin/sections to manage instrument sections (Trumpets, Trombones, Saxophones, Percussion, etc.).",
      "Built /admin/users for assigning RBAC roles, contact info, and section assignments.",
      "Implemented member activation/deactivation controls.",
    ],
  },
  {
    stage: 6,
    title: "Community Engagement & Suggestion Moderation",
    category: "Community & Repertoire",
    accomplishments: [
      "Created /admin/suggestions allowing community members and musicians to suggest tunes.",
      "Built triage workflow allowing catalog managers to approve, reject, or queue suggestions.",
      "Added status notifications and feedback notes on triaged suggestions.",
    ],
  },
  {
    stage: 5,
    title: "Repertoire Catalog & Setlist Studio",
    category: "Music & Repertoire",
    accomplishments: [
      "Created /admin/setlists for designing gig setlists and performance song sequences.",
      "Enabled setlist duration calculations, intermission markers, and tune ordering.",
      "Added sheet music and chart link references to tunes in the repertoire catalog.",
    ],
  },
  {
    stage: 4,
    title: "Gig Engine & Admin CRM Tooling",
    category: "Performances & CRM",
    accomplishments: [
      "Built /admin/gigs dashboard for creating, scheduling, and editing band performances.",
      "Added support for venue details, call times, downbeat schedules, and public visibility flags.",
      "Implemented real-time synchronization between admin gig changes and musician portal views.",
    ],
  },
  {
    stage: 3,
    title: "Authentication & RBAC Foundation",
    category: "Auth & Identity",
    accomplishments: [
      "Integrated Firebase Authentication with session management and user profile initialization.",
      "Implemented role-based access control (RBAC) with hierarchical band roles (admin, web_manager, gig_manager, catalog_manager, community_manager, treasurer, section_leader, member, guest).",
      "Built foundational member portal layout (/portal) with authenticated route protection.",
    ],
  },
  {
    stage: 2,
    title: "Firebase Emulators & Schemas",
    category: "Infrastructure & Data",
    accomplishments: [
      "Configured local Firebase Emulators (Firestore, Auth, Storage) for offline development.",
      "Defined initial Zod validation schemas (UserSchema, GigSchema, TuneSchema, SectionSchema) with safe defaults.",
      "Created deterministic seed engine (scripts/seed.ts) populating brass band roster, charts, and gigs.",
    ],
  },
  {
    stage: 1,
    title: "Architecture & Foundation",
    category: "Foundation & Setup",
    accomplishments: [
      "Initialized Next.js App Router codebase with Tailwind CSS, TypeScript, and Turbopack.",
      "Established project directory structure, coding standards, and documentation guidelines.",
      "Built base public layout with Eagleburger Band branding, color tokens, and navigation shell.",
    ],
  },
];

