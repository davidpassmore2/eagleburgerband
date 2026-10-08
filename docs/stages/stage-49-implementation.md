# Stage 49: Portal Experience Polish, Manager Task Queue, Strict Invite-Only Auth & Roster Migration Suite

## Overview & Objectives

Stage 49 focused on refining portal usability, eliminating initial state flashes, providing band leadership with a unified action center, establishing strict access security for beta onboarding, and enabling reliable data portability between environments:

1. **Portal Layout & Overview Polish:** Modernized typography with Arvo font stacks, reordered dashboard sections to prioritize actionable callouts, and eliminated flickering on route transitions.
2. **Manager Task Queue & Notification Bell:** Created a real-time reactive task queue that watches flagged comments, booking inquiries, song pitches, contact messages, reimbursement requests, audition submissions, and pending user approvals, surfaced through an unclipped fixed-portal bell widget.
3. **Beta Testing Guide & Workflow:** Documented standardized test scripts for external musician onboarding via email invitation links.
4. **Option C — Strict Invite-Only Authentication:** Disabled direct public registrations on `/login`, guarded OAuth and passwordless sign-ins against uninvited account creation, and polished the forgot password workflow.
5. **Cloudinary Media Storage Integration:** Configured client-side upload widget variables for direct media ingestion in the Resource Library.
6. **Roster Data Portability (CSV & JSON):** Built an end-to-end import/export suite supporting both CSV and JSON formats, enabling beta ensemble data to seamlessly populate production with auto-generated onboarding invitations.

---

## Technical Architecture & Core Modules

### 1. Flash Mitigation & UI Modernization
- **Public Announcement Banner:** Refactored `src/components/public/PublicAnnouncementBanner.tsx` with a strict `isLoaded` flag and `null` initial state to eliminate flashes of disabled announcements during client hydration and page transitions.
- **Portal Overview Dashboard (`/portal`):**
  - Refactored RSVP fetching in `src/app/(portal)/portal/page.tsx` from serial scans to parallelized `Promise.all` using direct document reads (`gigs/{id}/rsvps/{uid}`).
  - Reordered sections: Action Needed (RSVP prompt) now sits directly under the welcome header with Rose alert branding, followed by Next Performance, with `PortalPwaCard` relocated to the bottom.
  - Replaced "Welcome back" with "Welcome" and updated category navigation headers in `src/app/(portal)/layout.tsx` to use the Arvo serif font stack with active accent highlights (`var(--ebb-primary)`).

### 2. Manager Task Queue (`useManagerTaskQueue.ts` & `ManagerNotificationBell.tsx`)
- **Task Aggregator Hook (`src/lib/portal/useManagerTaskQueue.ts`):**
  - Subscribes in real-time to actionable items across 7 Firestore collections, scoped by RBAC clearance:
    - Flagged Comments (`comments` with `status == "flagged"`)
    - Inbound Gig Inquiries (`inquiries` with `status == "pending"`)
    - Fan/Member Song Pitches (`suggestions` with `status == "pending"`)
    - Contact Form Messages (`contact_messages` with `status == "unread"`)
    - Expense Reimbursements (`reimbursements` with `status == "pending"`)
    - Audition Submissions (`auditions` with `status == "pending"`)
    - Pending Users (`users` with `status == "pending"`)
  - Calculates dynamic badge totals and tracks read/unread dispatches.
- **Notification Bell Dropdown (`src/components/portal/ManagerNotificationBell.tsx`):**
  - Mounts via React Portal (`createPortal(..., document.body)`) with `fixed z-[100]` positioning and dynamic button coordinate tracking (`getBoundingClientRect()`), permanently preventing overflow clipping from sidebar headers.
  - Integrated into desktop sidebar, mobile sticky header, and desktop unpinned strip.

### 3. Option C — Strict Invite-Only Authentication
- **Login Page Enforcement (`src/app/(public)/login/page.tsx`):**
  - Removed `passwordMode === "signup"` and the "Register here" toggle.
  - Replaced with an informative **Membership by Invitation Only** card directing prospective musicians to `/join`.
- **Auth Guardrails (`src/lib/context/AuthContext.tsx`):**
  - In `onAuthStateChanged`, if a user document `users/{uid}` does not exist:
    - Searches `invites` for a matching `email` with `status == "pending"`.
    - If found: claims the invitation, creates the member profile, and authenticates.
    - If **not** found (and not Super Admin): immediately invokes `firebaseSignOut(auth)`, clears emulated state, and sets an `authNotice` banner explaining that access is invite-only.
  - In `sendMagicLink`: checks `users` and `invites` prior to dispatching email links, preventing uninvited email spam.
  - In `handleSocialSignIn`: removed optimistic redirects so uninvited Google/Apple/Microsoft/GitHub sign-ins fail gracefully.

### 4. Enhanced Forgot Password Experience
- **Pre-Flight Validation:** `sendPasswordReset(email)` verifies whether the account exists in Firestore before invoking Firebase Auth. If an unclaimed invitation exists, it informs the user to check their email for their invite link.
- **Dedicated Request & Confirmation Views:**
  - Password reset form with clear instructions and loading state.
  - Confirmation screen displaying the target email, next-step checklist (spam folder, 1-hour expiration), "Return to Sign In" action, and a **30-second cooldown countdown timer** for resending.

### 5. Band Roster Import & Export Suite
- **I/O Processing Engine (`src/lib/portal/rosterDataIo.ts`):**
  - **CSV Serialization & RFC-4180 Parser:** Handles quoted strings, multi-line notes, and case-insensitive header mapping.
  - **JSON Package Formatter:** Formats structured export bundles with version metadata and member arrays.
  - **Section Resolution:** Intelligently maps input section names or IDs to Firestore `sections`.
- **Export Modal (`src/components/portal/RosterExportModal.tsx`):**
  - Allows exporting full ensemble roster as either a CSV spreadsheet or JSON package with auto-generated date slugs (`eagleburger-roster-YYYY-MM-DD.csv`).
- **Import Modal (`src/components/portal/RosterImportModal.tsx`):**
  - Drag-and-drop or file browse for `.csv` and `.json`, plus raw text pasting.
  - Pre-flight validation with statistics for new members, existing members, and syntax errors.
  - **Update existing members toggle:** Merges section assignments and instruments without overwriting user IDs.
  - **Auto-generate pending invitations toggle:** Automatically creates matching `invites` records in Firestore (`status: "pending"`). This allows imported beta members to seamlessly log into production under Option C without manual admin intervention.
- **Admin Roster Header Integration (`src/app/(portal)/admin/roster/page.tsx`):**
  - Added dedicated **Download Roster** and **Upload / Import** buttons alongside **Issue Invite Link**.
- **Schema Compliance:**
  - Updated `src/lib/schema/user.ts` to include `createdAt: z.string().optional().default(() => new Date().toISOString())`.

---

## File Changes Summary

| Module | Files Modified / Created | Purpose |
|---|---|---|
| **Portal Layout & Overview** | `src/app/(portal)/layout.tsx`<br>`src/app/(portal)/portal/page.tsx`<br>`src/components/public/PublicAnnouncementBanner.tsx` | Typography polish, section reordering, RSVP parallelization, flash fixes |
| **Manager Task Queue** | `src/lib/portal/useManagerTaskQueue.ts`<br>`src/components/portal/ManagerNotificationBell.tsx` | Real-time multi-collection task tracking, portal-mounted notification bell |
| **Invite-Only Auth & Reset** | `src/app/(public)/login/page.tsx`<br>`src/lib/context/AuthContext.tsx` | Option C invite-only enforcement, uninvited sign-out guard, forgot password UX |
| **Roster Migration Suite** | `src/lib/portal/rosterDataIo.ts`<br>`src/components/portal/RosterExportModal.tsx`<br>`src/components/portal/RosterImportModal.tsx`<br>`src/app/(portal)/admin/roster/page.tsx`<br>`src/lib/schema/user.ts`<br>`src/app/(portal)/portal/help/page.tsx` | CSV/JSON import/export engine, modals, header buttons, UserSchema alignment |

---

## Verification & Status

- **Type Safety:** Full `npx tsc --noEmit` check passed with **0 errors**.
- **Schema Invariance:** All Firestore mutations adhere strictly to Zod schemas with safe `.default()` values.
- **RBAC Guardrails:** Manager notifications and roster import/export are protected by appropriate clearance checks.
- **Status:** Stage 49 complete.

