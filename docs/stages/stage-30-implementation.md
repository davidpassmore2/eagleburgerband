# Stage 30 Implementation Plan: CMS Studio Section Customizers, Public Event Landing Pages & Fan Calendar Suite

**Stage Number:** 30  
**Branch:** `feature/stage-30`  
**Status:** In Review / Ready for Execution  

---

## 1. Overview & Objective
Stage 30 delivers deep visual configuration controls for the public CMS modular section engine, and establishes rich public event landing pages (`/gigs/[id]`) with OpenStreetMap (LeafletJS) venue mapping and 1-click Google/Apple calendar integration.

---

## 2. Selected Feature Scope

### Theme 1: CMS Studio Section Customizers
- **Testimonials Showcase Editor** (Line 2):
  - Manage client quote cards with interactive star rating picker (1–5 stars).
  - Event tag / category chip (e.g., "Wedding", "Parade", "Festival", "Block Party").
  - Avatar URL input with live thumbnail preview.
  - Reordering (Move Up / Down) and deletion.
- **Stats Counter Studio** (Line 3):
  - Dynamic numerical counters with value, label, and helper description.
  - Curated Lucide icon picker (`Award`, `Users`, `Flame`, `Music`, `Calendar`, `Sparkles`, `MapPin`, `Volume2`, `Heart`, `Clock`) with live icon preview.
  - Reordering (Move Up / Down).
- **CTA Banner Studio** (Line 4):
  - Dual action button configuration: labels, destination links, and button style variants (`solid-yellow`, `outline`, `white`).
  - Badge text with live icon preview.
  - 4 Banner background style presets (`primary` gold, `dark` slate, `gradient` vibrant amber, `forest` brass).
- **Gig Feed Preview Controls** (Line 5):
  - Display limit count (1 to 10 gigs).
  - Subtitle customization.
  - Toggles for venue address visibility (`showVenueAddress`) and ticket links (`showTicketLinks`).
  - Customizable "View Full Schedule" CTA button.
  - Direct links on cards to new `/gigs/[id]` event pages.

### Theme 2: Public Event Detail & Fan Calendar Suite
- **Public Shareable Event Landing Page (`/gigs/[id]`)** (Line 1):
  - Dedicated public dynamic route [`src/app/(public)/gigs/[id]/page.tsx`](file:///c:/repos/eagleburgerband/src/app/(public)/gigs/[id]/page.tsx).
  - High-impact hero banner with date badge, downbeat callout, venue, city, description, admission badge, and ticket buttons.
  - Social sharing bar (Copy link with tooltip, Facebook share, Twitter/X share, Email).
  - Strict privacy guardrail: only exposes public details (`publicDetails`), never internal logistics or musician payouts.
- **LeafletJS OpenStreetMap Venue Map & Directions** (Line 2):
  - Reusable client-only component [`src/components/public/EventVenueMap.tsx`](file:///c:/repos/eagleburgerband/src/components/public/EventVenueMap.tsx) dynamically loaded with `ssr: false` to guarantee Next.js 16 Turbopack compatibility.
  - Standard OpenStreetMap tiles (`https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png`).
  - Custom SVG brass pin marker with venue popup.
  - 1-click external navigation buttons: "Open in Google Maps" and "Open in Apple Maps".
  - **Toggleable 1-click external navigation**: "Open in Google Maps" and "Open in Apple Maps" buttons can be toggled on/off (via `showExternalDirections` configuration / schema flag, defaulting to on).
  - Pittsburgh venue coordinate resolution with safe city-center fallback.
- **1-Click "Add to Calendar" Integration** (Line 3):
  - Reusable component [`src/components/public/AddToCalendarButton.tsx`](file:///c:/repos/eagleburgerband/src/components/public/AddToCalendarButton.tsx).
  - **Google Calendar**: Direct one-click template link pre-populating event title, start/end time, venue location, and description.
  - **Apple / Outlook Calendar (.ics)**: Instant client-side standard RFC-5545 `.ics` file generation and download.
  - Embedded in both `/gigs/[id]` and the `/gigs` listing cards.

---

## 3. Targeted File Manifest & Dependencies

- `package.json`: Add `leaflet` and `@types/leaflet`.
- `src/lib/schema/page.ts`: Schema enhancements for testimonials, stats, cta_banner, and gig_feed_preview with safe `.default()` values.
- `src/lib/schema/gig.ts`: Add optional `address` and `coordinates` to `PublicDetailsSchema`.
- `src/components/public/EventVenueMap.tsx`: Standalone client component for OpenStreetMap & LeafletJS.
- `src/components/public/AddToCalendarButton.tsx`: Google and Apple/Outlook calendar helper dropdown.
- `src/app/(public)/gigs/[id]/page.tsx`: Dynamic public event detail page.
- `src/app/(public)/gigs/page.tsx`: Link gigs to `/gigs/[id]` and add calendar quick-actions.
- `src/components/cms/PublicSectionRenderer.tsx`: Section preset renderers supporting new styling and data fields.
- `src/app/(portal)/admin/pages/page.tsx`: CMS Page Studio interactive customizer cards for Testimonials, Stats, CTA, and Gig Feed.
- `docs/stages/stage-30-implementation.md`: This implementation plan.
- `docs/stages/stage-30-walkthrough.md`: Verification results and walkthrough document.

---

## 4. Verification Plan

- **Dependencies**: `npm install leaflet @types/leaflet`
- **TypeScript**: `npx tsc --noEmit` (0 errors)
- **ESLint**: `npm run lint` (0 errors)
- **Next.js Production Build**: `npm run build` (49+ routes compiled cleanly)
- **Functional Testing**: Live testing of map rendering, calendar downloads, and CMS customizer state changes.
