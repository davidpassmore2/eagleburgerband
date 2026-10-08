# Stage 50: Lifecycle-Aware Gig Email Dispatch & Member Hiatus Safeguard Engine

## Overview & Objectives

Stage 50 implements an intelligent, lifecycle-aware email dispatch workflow that automates gig personnel communications across the performance lifecycle, respects musician availability and blackout dates, introduces a band member hiatus mode, and strictly targets confirmed performers for subsequent dispatches:

1. **Initial Availability Dispatch:** When a performance is created or converted from an inbound lead, an availability email is dispatched requesting active musicians to submit their RSVP (Attending / In vs Declined / Out) in the portal.
2. **Blackout Date Filtering:** Musician blackout calendars (`users/{uid}/blackouts`) are dynamically audited. Any musician with an overlapping blackout period is automatically excluded from initial gig availability requests.
3. **Member "Hiatus" Status:** Introduces a first-class `hiatus` status (`status: "hiatus"` and `onHiatus: boolean`). When enabled by a member or manager, all gig notifications and dispatch emails are muted.
4. **Gig Confirmation Dispatch:** When a gig transitions to `"confirmed"` status, a dedicated confirmation dispatch is sent to all members marked "attending" (in), confirming call times, downbeat, venue, and attire.
5. **Scoped Subsequent Dispatches:** In the Dispatch Studio (`/admin/dispatch`), dispatches for confirmed gigs are strictly scoped to confirmed attendees who are active and not on hiatus.

---

## Technical Architecture & Core Modules

### 1. Schema Extensions (`src/lib/schema/`)
- **`src/lib/schema/user.ts`:**
  - Expanded `status` enum: `z.enum(["active", "inactive", "pending", "hiatus"]).default("active")`.
  - Added `onHiatus: z.boolean().default(false)` and `hiatusReason: z.string().default("")`.
  - Guaranteed schema invariance with safe defaults for backward compatibility.
- **`src/lib/schema/email.ts`:**
  - Added `SendGigAvailabilityEmailSchema`: validates payload for availability requests (`gigId`, `gigTitle`, `date`, `callTime`, `downbeat`, `venue`, `address`, `notes`, `recipientEmails`, `actorUid`).
  - Added `SendGigConfirmationEmailSchema`: validates payload for gig confirmations (`gigId`, `gigTitle`, `date`, `callTime`, `downbeat`, `venue`, `address`, `attire`, `notes`, `setlistUrl`, `recipientEmails`, `actorUid`).

### 2. Recipient Resolution Engine (`src/lib/portal/gigDispatchEngine.ts`)
Created a standalone recipient resolution engine that executes server-side or client-side:
- **`resolveGigAvailabilityRecipients(gigDate: string)`:**
  1. Reads all band members from `users`.
  2. Queries all blackout date windows via `collectionGroup(db, "blackouts")`.
  3. Formats and compares ISO `YYYY-MM-DD` strings (`normalizedGigDate >= bo.startDate && normalizedGigDate <= bo.endDate`).
  4. Strictly filters out:
     - Members on hiatus (`onHiatus === true || status === "hiatus"`).
     - Inactive or pending accounts (`status === "inactive" || status === "pending"`).
     - Members with a blackout period covering the performance date.
     - Members with `notificationPreferences.gigAlerts === false`.
  5. Returns eligible recipients, audit counts, and lists of excluded blackout/hiatus members.
- **`resolveGigConfirmedRecipients(gigId: string)`:**
  1. Queries `gigs/{gigId}/rsvps` for all entries with `status === "attending"`.
  2. Fetches the associated member documents in `users`.
  3. Verifies that the musician has not since been placed on hiatus (`onHiatus !== true && status !== "hiatus"`).
  4. Returns the validated recipient list for confirmation dispatches.

### 3. Branded Email Templates (`src/lib/email/templates.ts`)
- **`renderGigAvailabilityRequestEmail(params)`:**
  - Subject: `Action Required: Mark Your Availability for [Gig Title] ([Date])`
  - Highlighting date, call time, downbeat, venue, and performance notes.
  - Prominent 1-click CTA button linking directly to the live gig in Gig Central (`/portal/gigs/[gigId]`).
  - Explanatory footer noting that members on hiatus or with blackouts were automatically excluded.
- **`renderGigConfirmedEmail(params)`:**
  - Subject: `🎉 Gig Confirmed: [Gig Title] — [Date]`
  - Celebratory confirmation notice acknowledging that the musician is receiving the alert because they RSVP'd "attending".
  - Full call sheet logistics table (Call Time, Downbeat, Venue, Address, Attire guidelines, Notes).
  - CTA button linking to live charts and stage view.

### 4. API Endpoints
- **`POST /api/email/gig-availability` (`src/app/api/email/gig-availability/route.ts`):**
  - Validates payload with `SendGigAvailabilityEmailSchema`.
  - Enforces RBAC permissions (`admin`, `gig_manager`, `web_manager`).
  - Calls `resolveGigAvailabilityRecipients` to compute the filtered recipient list (skipping hiatus & blackouts).
  - Dispatches transactional emails via Resend (`sendTransactionalEmail` with `templateType: "rsvp_request"`).
  - Records delivery in `email_logs`.
- **`POST /api/email/gig-confirmation` (`src/app/api/email/gig-confirmation/route.ts`):**
  - Validates payload with `SendGigConfirmationEmailSchema`.
  - Enforces RBAC clearance.
  - Calls `resolveGigConfirmedRecipients` to isolate musicians marked "attending" who are not on hiatus.
  - Dispatches transactional emails via Resend (`templateType: "gig_details"`).
  - Records delivery in `email_logs`.

---

## UI Integrations & Triggers

### 1. Musician Hiatus Mode (`/portal/availability` & `/portal/notifications`)
- **Availability Hub (`src/app/(portal)/portal/availability/page.tsx`):**
  - Added a prominent Hiatus Status banner at the top of the availability calendar.
  - Displays live status:
    - **Active Musician (⚡):** Green indicator, receiving all gig calls. Button to "Go On Hiatus".
    - **On Hiatus (🌴):** Amber badge with dispatch mute warning. Button to "Resume Active Status".
  - Instant Firestore update to `users/{uid}` modifying `onHiatus` and `status`.
- **Notification Preferences (`src/app/(portal)/portal/notifications/page.tsx`):**
  - Added Master Hiatus Safeguard card at the top of the Preferences tab with one-click toggle.

### 2. Admin Roster Management (`/admin/roster`)
- **Roster Table (`src/app/(portal)/admin/roster/page.tsx`):**
  - Enhanced the Status column to display amber `HIATUS` badges with a palm tree icon.
  - Added a 1-click `Hiatus` / `Resume` toggle button for each performer, giving managers complete oversight.

### 3. Gig Creation Initial Dispatch (`/admin/gigs`)
- **Create Performance Modal:**
  - Added checkbox: `[x] Dispatch Initial Availability Request Email` (enabled by default).
  - Explanatory note: "Automatically filters out members on hiatus and those with this date blacked out."
  - On submit: creates gig document and calls `/api/email/gig-availability`, notifying managers of exact dispatched count.

### 4. Inbound Lead Conversion Initial Dispatch (`/admin/inquiries`)
- **Convert to Gig Handler:**
  - Upon converting a booking lead into a performance, automatically creates the draft gig and triggers `/api/email/gig-availability`.
  - Toast confirmation surfaces recipient telemetry (`X members dispatched, Y blacked out, Z on hiatus skipped`).

### 5. Gig Confirmation Trigger & Controls (`/admin/gigs`)
- **Edit Gig Modal:**
  - When status changes to `"confirmed"`, automatically dispatches `/api/email/gig-confirmation` to all musicians marked "attending".
  - Added explicit "Dispatch Now to Confirmed List" button inside Edit modal to re-send at any time.
- **Admin Gig Cards:**
  - Confirmed gigs feature a direct `Dispatch Confirmed` action button right alongside `Call Sheet`.

### 6. Subsequent Dispatches (`/admin/dispatch`)
- **Dispatch Studio:**
  - `usersMap` now tracks member hiatus status in real-time.
  - For confirmed performances, subsequent call sheet dispatches strictly filter for `status === "attending" || status === "probable"` and exclude members on hiatus.
  - Target Audience card explicitly displays: `CONFIRMED ROSTER: X active confirmed musicians (In & Probable) • Y on hiatus (muted)`.
  - Modal recipient preview displays a strikethrough and `Hiatus (Muted)` badge for any attending/probable musician currently on hiatus.

### 7. 4-State RSVP System with "Probable" Availability (`src/lib/schema/attendance.ts`)
- **RSVP Status Model:**
  - `RsvpStatusEnum = z.enum(["attending", "probable", "tentative", "declined"])`.
  - Added `"probable"` to support realistic band commitment thresholds, enabling managers to lock in gigs based on combined committed strength (**In + Probable**).
- **Headcount & Quorum Logic:**
  - **Quorum Assessment:** Available playing strength = `attendingCount + probableCount`. Quorum thresholds and instrument audits in `/admin/attendance`, `/portal/gigs/[gigId]`, and the Instrumentation Audit Drawer evaluate both "In" and "Probable" performers.
  - **Confirmation Dispatch Targeting:** `resolveGigConfirmedRecipients(gigId)` includes all musicians marked `"attending"` or `"probable"` (excluding hiatus), ensuring all committed players receive confirmed call sheets and revisions.
  - **Calendar & UI Integration:**
    - Distinct Cyan styling for `"probable"` badges and dot markers on the monthly calendar.
    - 4-button selector (`In`, `Probable`, `Tentative/Maybe`, `Out`) available on Home Base spotlight hero, Upcoming Gigs queue, Call Sheet detail view, and Day Events modal.
    - Personal calendar subscription feed (`/api/calendar/[token]`) synchronizes both "In" and "Probable" performances.

