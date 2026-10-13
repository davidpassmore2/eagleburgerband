# Stage 59: Band Rehearsal Hub, OpenStreetMap Geocoding, Blackout Intelligence & "What's Next" Portal UX

## Overview & Scope

Stage 59 implements a full-featured rehearsal lifecycle management system and delivers extensive usability improvements across the member portal:
1. **Band Rehearsal Hub (`/portal/rehearsals`):**
   - Recurring weekly rehearsal schedule configuration (day of week, start/end time, default grounds location, minimum quorum).
   - Dynamic rehearsal session generation, cancellation with reason capture, and instant reactivation.
   - Interactive Leaflet / OpenStreetMap ground picker (`RehearsalMapPicker`) requiring zero API keys, backed by free Nominatim reverse geocoding to normalize venue locations and street addresses.
   - Comprehensive 4-state RSVP attendance planning (In, Probable, Tentative, Declined).
   - Automated blackout conflict detection that dynamically tags unavailable members as **"Blackout"** for the rehearsal date.
   - Section-by-section roster visibility showing attending, projected, and blackout members with live quorum health.
   - Real-time rehearsal session discussion notes and comments.
   - Ensemble blackout calendar (`RehearsalBlackoutCalendar`) tracking member conflict density alongside scheduled rehearsals.
2. **"What's Next" Dashboard Layout (`/portal`):**
   - Consolidated the top of the Member Portal home screen into an integrated **"What's Next"** section with side-by-side cards for **Next Gig** and **Next Rehearsal**.
   - Redesigned `MemberRehearsalsSection.tsx` into a concise card matching the proportions, typography, and 1-click action buttons of the Next Gig spotlight.
3. **Terminology Harmonization Across the Member Portal:**
   - Standardized all user-facing copy: **"gig"** replaced **"performance"** and **"rehearsal"** replaced **"practice"** throughout all navigation paths, Help Center guides, Status Matrix, and operational modals.
4. **Time & Date Formatting Standards:**
   - Formatted all rehearsal and gig dates/times in user-friendly, non-military 12-hour EST formatting.
5. **Architectural Hardening:**
   - Full Zod schemas (`RehearsalSettingsSchema`, `RehearsalLocationSchema`, `RehearsalSchema`, `RehearsalRsvpSchema`) with safe defaults adhering to Project Rule 2.
   - Firestore security rules authoring and deployment for rehearsal collections and subcollections.

---

## 1. Band Rehearsal Architecture & Data Models

- **File Created:**
  - [`src/lib/schema/rehearsal.ts`](file:///c:/repos/eagleburgerband/src/lib/schema/rehearsal.ts)
- **Schemas Defined:**
  - `RehearsalSettingsSchema`: Controls weekly day of week (0-6), start time, end time, default location ID, and default quorum threshold.
  - `RehearsalLocationSchema`: Stores venue name, address, latitude, longitude, parking notes, indoor/outdoor flag, and access notes.
  - `RehearsalSchema`: Represents specific rehearsal sessions (date, times, location, status `active` or `cancelled`, cancellation reason, notes count).
  - `RehearsalRsvpSchema`: Musician RSVP plans (`in`, `probable`, `tentative`, `declined`, `blackout`), instrument, timestamp, and optional note.
  - `RehearsalCommentSchema`: Discussion and logistics comments attached to individual rehearsals.

---

## 2. Rehearsals Hub (`/portal/rehearsals`)

- **Files Created / Modified:**
  - [`src/app/(portal)/portal/rehearsals/page.tsx`](file:///c:/repos/eagleburgerband/src/app/(portal)/portal/rehearsals/page.tsx)
  - [`src/components/portal/RehearsalMapPicker.tsx`](file:///c:/repos/eagleburgerband/src/components/portal/RehearsalMapPicker.tsx)
  - [`src/components/portal/RehearsalBlackoutCalendar.tsx`](file:///c:/repos/eagleburgerband/src/components/portal/RehearsalBlackoutCalendar.tsx)
- **Key Capabilities:**
  - **Weekly Recurring Schedule:** Gig managers and admins can set the band's default practice cadence (e.g. Every Monday at 7:00 PM EST).
  - **OpenStreetMap & Free Reverse Geocoding:** Zero-API-key Leaflet map integration allowing users to click anywhere or drag a pin to select coordinates. Queries OpenStreetMap's free Nominatim reverse geocoding API to suggest friendly street names and normalized addresses.
  - **Full Member Roster Visibility:** Displays every registered musician grouped by instrument section (Trumpet, Trombone, Saxophone, Rhythm, etc.) with color-coded status badges, showing who is committed (`In`), probable (`Probable`), tentative, declined, or barred by a date blackout (`Blackout`).
  - **Blackout Conflict Detection:** Cross-references the active date against `/availability/{uid}` blackout ranges, automatically highlighting musicians who have conflicting commitments.
  - **Session Cancellation & Reactivation:** Allows gig coordinators to call off a rehearsal with an emergency explanation (e.g. severe thunderstorms, venue maintenance) or reactivate it if logistics clear up.
  - **Discussion Thread:** Musician comment stream for carpooling, warm-up questions, and equipment arrangements.

---

## 3. "What's Next" Member Portal Consolidation

- **Files Modified:**
  - [`src/app/(portal)/portal/page.tsx`](file:///c:/repos/eagleburgerband/src/app/(portal)/portal/page.tsx)
  - [`src/components/portal/MemberRehearsalsSection.tsx`](file:///c:/repos/eagleburgerband/src/components/portal/MemberRehearsalsSection.tsx)
- **Layout & Structure:**
  - Created a responsive 2-column grid (`grid grid-cols-1 lg:grid-cols-2 gap-5 items-stretch`) housing:
    1. **Next Gig Card:** Live countdown, date/time badges, call time, downbeat, attire requirements, venue navigation link, and 1-click RSVP toggles.
    2. **Next Rehearsal Card:** Streamlined from the previous multi-section banner into a compact card with identical proportions, countdown, location directions, quorum bar, 1-click RSVP buttons, and Rehearsal Hub / Cancel Rehearsal management buttons.

---

## 4. UX Terminology Harmonization

- **Terminology Systematically Replaced:**
  - `"performance"` → `"gig"`
  - `"practice"` → `"rehearsal"`
- **Files Standardized:**
  - `src/app/(portal)/portal/page.tsx`
  - `src/app/(portal)/portal/help/page.tsx`
  - `src/app/(portal)/portal/status-matrix/page.tsx`
  - `src/app/(portal)/portal/rehearsals/page.tsx`
  - `src/app/(portal)/portal/vault/page.tsx`
  - `src/app/(portal)/portal/profile/page.tsx`
  - `src/app/(portal)/portal/notifications/page.tsx`
  - `src/app/(portal)/portal/reimbursements/page.tsx`
  - `src/lib/portal/workspaceRegistry.ts`
  - `src/components/portal/EditGigLogisticsModal.tsx`
  - `src/components/portal/LogisticsChangeModal.tsx`
  - `src/components/portal/MemberAnalyticsCard.tsx`
  - `src/components/portal/PortalDayEventsModal.tsx`
  - `src/components/portal/RehearsalBlackoutCalendar.tsx`
  - `src/components/portal/RehearsalMapPicker.tsx`

