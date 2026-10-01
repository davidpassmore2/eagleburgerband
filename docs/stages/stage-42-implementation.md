# Stage 42 — Unified "My Band Hub", Availability Conflict Engine & CMS Page Header Images

## Overview
Stage 42 delivers major operational upgrades for both the Musician Portal and the Public Marketing site. It transforms the portal homebase (`/portal`) into an active daily musician command center, enhances member scheduling on `/portal/availability` with an interactive calendar and real-time gig conflict detection, and introduces flexible page header image management into the CMS Page Studio (`/admin/pages`) with dynamic rendering across public routes.

---

## Workstreams

### Workstream 1: Unified "My Band Hub" & Command Center (`/portal`)
- **Immediate Next Performance Card:**
  - Dynamic countdown to the member's next upcoming gig.
  - Call time, downbeat time, venue address with navigation link, and attire requirements.
  - 1-tap quick RSVP status switcher (`Attending`, `Tentative`, `Declined`) directly from the home dashboard.
  - Quick access buttons to the gig's interactive call sheet (`/portal/gigs/[id]`) and stage performance view (`/portal/perform/[id]`).
- **Musician Financial & Attendance Snapshot:**
  - Quick tally of member's pending vs. paid expense reimbursements.
  - Recent check-in and attendance standing.
- **Unread Alerts & Broadcasts Indicator:**
  - Live indicator linking to `/portal/notifications` for unread broadcasts and announcements.

---

### Workstream 2: Interactive Availability Calendar & Conflict Engine (`/portal/availability`)
- **Visual Multi-Month Calendar View:**
  - Toggle between compact list mode and a visual multi-month calendar grid.
  - Color-coded date markers: Gigs Scheduled (Gold/Blue), Member Blackouts (Rose), Pending RSVPs (Amber).
- **Automated Gig Conflict Warning:**
  - When a member selects a blackout date window, dynamically check against active gigs.
  - If a conflict is detected, alert the musician with gig details (e.g., *"Warning: You have already RSVP'd Attending to Bloomfield Parade on this date"*) and offer 1-click RSVP update.

---

### Workstream 3: Public Site Header Image Selection via CMS (`/admin/pages` & Public Pages)
- **Page Schema Extension (`src/lib/schema/page.ts`):**
  - Add `headerImage` configuration to `ContentPageSchema` (`imageUrl`, `overlayOpacity`, `alignment`, `heightPreset`).
- **CMS Studio UI in `/admin/pages`:**
  - "Header & Page Banner" editor in CMS Page Studio with live image preview, curated presets (Parade, Taproom, Night Concert, Brass Crowd), and custom URL input.
- **Public Rendering Integration:**
  - Render custom header banners dynamically in `/[slug]` and canonical public routes (`/gigs`, `/book`, `/contact`, `/join`, `/giving`, `/testimonials`).

---

## Quality Gates

| Gate | Command |
|---|---|
| TypeScript | `npx tsc --noEmit` |
| Lint | `npm run lint` |
| Build | `npm run build` |
| Seed | `npm run seed` |

## Status

| Workstream | Status |
|---|---|
| 1 — Unified "My Band Hub" & Command Center | ✅ Complete |
| 2 — Interactive Availability & Conflict Engine | ✅ Complete |
| 3 — CMS Page Header Images & Public Rendering | ✅ Complete |
