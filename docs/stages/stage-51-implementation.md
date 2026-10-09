# Stage 51: Musician Operations, Live Calendar Sync, Offline Stage Mode & Portal Polish

## Overview & Scope

Stage 51 delivers high-impact operational upgrades for band musicians, stage performers, section coordinators, and administrators:

1. **Part 1 (Option 2): Live Calendar Subscription (Webcal / iCal Sync)**
   - Member-specific real-time iCal feed with tokenized authentication (`/api/calendar/[token]`).
   - Feed mode filtering: "Only My Gigs (In & Probable)" (`?mode=mine`) vs. "All Band Gigs" (`?mode=all`).
   - 1-click subscription buttons for Apple Calendar / iOS (`webcal://`), Google Calendar (`render?cid=`), and Outlook 365 (`addcalendar?url=`).
   - Secure feed token reset with confirmation dialog and automatic link regeneration.
   - Rich event payloads including Call Time, Downbeat, Venue, Address, Attire, Musician RSVP status, and direct call sheet links.

2. **Part 2 (Option 3): Stage & Parade Mode (Live Setlist PWA View)**
   - High-contrast outdoor Sunlight Mode toggle (`Sun` / `Moon` icon) for glare-heavy day parades and outdoor festivals (`/portal/perform/[gigId]`).
   - Offline resilience via `localStorage` snapshot cache (`ebb_stage_${gigId}`) with instant mount hydration if connectivity drops on parade routes.
   - Real-time connectivity badge: `LIVE CLOUD SYNC` (green ping) vs. `OFFLINE CACHED` (amber indicator).
   - Setlist Quick-Jump Drawer: tap the chart counter to view the full sequence and jump directly to any song.
   - Reference Concert Pitch Tone: Web Audio API sine oscillator playing the keynote pitch (Bb, Eb, F, etc.) for ~2 seconds when tapping the Key badge.

3. **Part 3 (Option 4): `UnsavedChangesBar` Expansion**
   - Implemented the sticky bottom `UnsavedChangesBar` pattern across key administrative studios:
     - **Brand & Theme Studio (`/admin/theme`)**: dirty tracking between draft state and saved Firestore theme, discard button to revert changes, save state spinner, and disabled header button when clean.
     - **Setlist Studio (`/admin/setlists`)**: dirty tracking for active gig sequences (`activeTab === "gigs"`), instant discard to revert sequence, and sticky save bar.

4. **Part 4 (Option 5): Global Feedback Polish & Elimination of Native Modals**
   - Verified 100% of raw `alert()` popups across `src/` were eliminated in favor of global typed `toast` alerts (`toast.success`, `toast.error`, `toast.info`).
   - Replaced browser `prompt()` in `admin/setlists` ("Save as Reusable Setlist") with the in-app Setlist Editor modal, pre-populating current sequence, suggested titles, and tags.

5. **Part 5 (Option 6): Day-of-Show Musician Check-In & Roll Call**
   - Added a prominent **Self-Service Check-In Banner** to `/portal/checkin/[gigId]`:
     - 1-tap "I'M ON SITE" and "RUNNING LATE" actions for the logged-in musician.
     - Confirmed status badge with arrival timestamp and section assignment.
     - Highlighted "YOU" badge in the roster list for immediate personal visual feedback.
   - Added direct navigation to `/portal/checkin/[gigId]` from the gig call sheet (`/portal/gigs/[gigId]`):
     - Shortcut in the Performance RSVP card ("Day of show? Roll Call & Check-In →").
     - "Check-In" badge button in the Repertoire Setlist header.

---

## Execution Checklist & Status

- [x] **Part 1 (Option 2):** Calendar Feed Sync Polish & 1-Click Subscribe UI
- [x] **Part 2 (Option 3):** Stage & Parade Mode with Offline Setlist Viewer & Audio Pitch
- [x] **Part 3 (Option 4):** `UnsavedChangesBar` in Theme Studio & Setlist Studio
- [x] **Part 4 (Option 5):** Global Toast Notification & Native Modal Elimination
- [x] **Part 5 (Option 6):** Day-of-Show Musician Check-In & Attendance Roll Call
- [x] **Verification:** `npx tsc --noEmit` cleanly passes with 0 errors.

---

## Modified Files

1. `src/app/api/calendar/[token]/route.ts`: Supports `?mode=all` and `?mode=mine` filtering, dynamic calendar titles, and direct call sheet links.
2. `src/components/portal/CalendarSubscribeModal.tsx`: Feed mode toggle, 1-click launchers for Apple, Google, and Outlook, token reset confirmation.
3. `src/app/(portal)/portal/perform/[gigId]/page.tsx`: Offline caching, live online/offline badge, sunlight high-contrast toggle, setlist quick-jump drawer, Web Audio pitch tone.
4. `src/app/(portal)/admin/theme/page.tsx`: `UnsavedChangesBar` integration, dirty state detection, discard handler.
5. `src/app/(portal)/admin/setlists/page.tsx`: `UnsavedChangesBar` integration for active gig sequences, eliminated native `prompt()` in favor of editor modal.
6. `src/app/(portal)/portal/checkin/[gigId]/page.tsx`: Self-service check-in banner, highlighted musician card, typed `gigId` and `checkInMethod`.
7. `src/app/(portal)/portal/gigs/[gigId]/page.tsx`: Added check-in links to RSVP card and setlist header.

