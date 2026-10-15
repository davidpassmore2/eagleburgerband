# Stage 60: Theme Inheritance, Suggestion Archiving, Blackout & Hiatus Attendance Guardrails & Past Event Locks

## Overview & Scope

Stage 60 addresses member usability, availability protections, and governance workflows across the Member Portal:
1. **Notifications Flyout Theme Inheritance:**
   - Ensured the notifications slide-out panel correctly inherits custom portal theme palettes (`--ebb-surface`, `--ebb-surface-muted`, `--ebb-border`, `--ebb-primary`, `--ebb-text-base`), providing visual consistency with the member's chosen theme.
2. **Suggestion Triage & Member Voice Archiving:**
   - Added universal archival capability (`isArchived`, `archivedAt`, `archivedByUid`) across Suggestion Triage and Member Voice regardless of status or type.
   - Built a bottom drawer/section with a **"Show Archived Items"** button to load archived submissions.
   - Provided an **"Unarchive"** action on archived submissions to restore them cleanly to the active list.
   - Hardened `firestore.rules` to allow both authors and reviewers to update suggestion archival fields.
3. **Personal Blackout Period Attendance Guardrails:**
   - Automated blackout conflict evaluation for logged-in musicians across all gigs and rehearsals.
   - Added an **"In My Blackout"** badge (`<InMyBlackoutChip />`) to event headers and RSVP controls when dates intersect the user's blackout window.
   - Disabled attendance confirmation buttons (In, Probable, Tentative, Declined) with informative tooltips and toast alerts during blackout periods.
4. **Past Event Attendance Locking:**
   - Disabled attendance/RSVP controls for all gigs and rehearsals that have concluded.
   - Added date-time evaluation utilities (`isGigInPast`, `isEventInPast`) checking downbeat/end times against the current moment.
   - Applied tooltips ("Event is in the past", "Rehearsal is in the past") and protected backend mutation handlers.
5. **Hiatus Status Attendance Guardrails & "On Hiatus" Badging:**
   - Checked member hiatus status (`profile?.onHiatus || profile?.status === "hiatus"`).
   - Created reusable `<OnHiatusChip />` status component with a coffee icon.
   - Displayed the "On Hiatus" chip on gig call sheets, rehearsals, dashboard spotlight, month calendar, and day modal.
   - Disabled all attendance controls and rehearsal note inputs with informative "On Hiatus" tooltips and toast guardrails.

---

## 1. Theme Inheritance in Notifications Flyout

- **Files Modified:**
  - [`src/components/portal/NotificationsFlyout.tsx`](file:///c:/repos/eagleburgerband/src/components/portal/NotificationsFlyout.tsx) (or relevant notification component)
- **Changes:**
  - Replaced hard-coded dark slate colors with portal CSS custom properties (`var(--ebb-surface)`, `var(--ebb-border)`, `var(--ebb-text-base)`).
  - Ensured theme background and borders adapt dynamically to high-contrast, emerald, amber, or royal purple member themes.

---

## 2. Suggestion Triage & Member Voice Archiving

- **Files Modified:**
  - [`src/app/(portal)/portal/suggestions/page.tsx`](file:///c:/repos/eagleburgerband/src/app/(portal)/portal/suggestions/page.tsx)
  - [`firestore.rules`](file:///c:/repos/eagleburgerband/firestore.rules)
- **Key Capabilities:**
  - **Archive Action:** Any suggestion can be archived by its author or authorized reviewers, setting `isArchived: true`.
  - **Archived Items Drawer:** Active list filters out archived submissions; clicking "Show Archived Items" at the bottom reveals them.
  - **Unarchive Action:** Restores archived suggestions (`isArchived: false`) back to the primary review queue.
  - **Security Rules:** Granted permissions for authors and reviewers to manage archival fields while preserving voting integrity.

---

## 3. Blackout Period & Past Event Attendance Guardrails

- **Files Created / Modified:**
  - [`src/components/portal/InMyBlackoutChip.tsx`](file:///c:/repos/eagleburgerband/src/components/portal/InMyBlackoutChip.tsx)
  - [`src/lib/utils/dateTimeFormat.ts`](file:///c:/repos/eagleburgerband/src/lib/utils/dateTimeFormat.ts)
  - [`src/app/(portal)/portal/gigs/page.tsx`](file:///c:/repos/eagleburgerband/src/app/(portal)/portal/gigs/page.tsx)
  - [`src/app/(portal)/portal/gigs/[gigId]/page.tsx`](file:///c:/repos/eagleburgerband/src/app/(portal)/portal/gigs/%5BgigId%5D/page.tsx)
  - [`src/app/(portal)/portal/rehearsals/page.tsx`](file:///c:/repos/eagleburgerband/src/app/(portal)/portal/rehearsals/page.tsx)
  - [`src/app/(portal)/portal/page.tsx`](file:///c:/repos/eagleburgerband/src/app/(portal)/portal/page.tsx)
  - [`src/components/portal/MemberRehearsalsSection.tsx`](file:///c:/repos/eagleburgerband/src/components/portal/MemberRehearsalsSection.tsx)
  - [`src/components/portal/PortalDayEventsModal.tsx`](file:///c:/repos/eagleburgerband/src/components/portal/PortalDayEventsModal.tsx)
- **Key Capabilities:**
  - Dynamic `useUserBlackouts()` hook integration across all event views.
  - `<InMyBlackoutChip />` badge displayed on any gig or rehearsal falling on a blackout date.
  - Attendance RSVP controls disabled with tooltips indicating blackout conflicts.
  - `isGigInPast()` and `isEventInPast()` utilities disallow updates to past events with clear warnings.

---

## 4. Hiatus Status Attendance Guardrails & "On Hiatus" Chip

- **Files Created / Modified:**
  - [`src/components/portal/OnHiatusChip.tsx`](file:///c:/repos/eagleburgerband/src/components/portal/OnHiatusChip.tsx)
  - [`src/app/(portal)/portal/gigs/page.tsx`](file:///c:/repos/eagleburgerband/src/app/(portal)/portal/gigs/page.tsx)
  - [`src/app/(portal)/portal/gigs/[gigId]/page.tsx`](file:///c:/repos/eagleburgerband/src/app/(portal)/portal/gigs/%5BgigId%5D/page.tsx)
  - [`src/app/(portal)/portal/rehearsals/page.tsx`](file:///c:/repos/eagleburgerband/src/app/(portal)/portal/rehearsals/page.tsx)
  - [`src/app/(portal)/portal/page.tsx`](file:///c:/repos/eagleburgerband/src/app/(portal)/portal/page.tsx)
  - [`src/components/portal/MemberRehearsalsSection.tsx`](file:///c:/repos/eagleburgerband/src/components/portal/MemberRehearsalsSection.tsx)
  - [`src/components/portal/PortalDayEventsModal.tsx`](file:///c:/repos/eagleburgerband/src/components/portal/PortalDayEventsModal.tsx)
  - [`src/components/portal/PortalMonthCalendar.tsx`](file:///c:/repos/eagleburgerband/src/components/portal/PortalMonthCalendar.tsx)
- **Key Capabilities:**
  - Members marked as on hiatus see `<OnHiatusChip />` across all event listings, detail call sheets, and calendar views.
  - All RSVP options (In, Probable, Tentative, Declined) and rehearsal note inputs are disabled with an "On Hiatus" tooltip.
  - Submission handlers guard against updates while on hiatus with user-friendly error toasts.

