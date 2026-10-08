# Stage 47 Walkthrough: Member Onboarding Portal, Mobile Sheet Music Viewer & Section Quorum Transparency

## Overview
Stage 47 delivers the end-to-end musician onboarding and mobile performance kit required for live ensemble User Acceptance Testing (UAT). Band administrators can generate invite links directly from the roster manager, new and returning musicians can claim their spot via a dedicated `/claim` landing page with Google or email/password authentication, performers can rehearse and read charts through the mobile `SheetMusicViewerModal` in `/portal/library`, and section leaders can monitor real-time instrumentation health with section quorum badges in `/portal/gigs/[gigId]`.

---

## Changes Implemented

### 1. Zod Schema Enhancement for Musician Invitations
- **File:** [`src/lib/schema/invite.ts`](file:///c:/repos/eagleburgerband/src/lib/schema/invite.ts)
- Enhanced `InviteSchema` with:
  - `instruments: z.array(z.string()).default([])`
  - `notes: z.string().default("")`
- Preserves full schema invariance with safe fallback defaults so existing pending or historical invites load without breakage.

### 2. Admin Roster Invite Management
- **File:** [`src/app/(portal)/admin/roster/page.tsx`](file:///c:/repos/eagleburgerband/src/app/(portal)/admin/roster/page.tsx)
- Updated the "Create Member Invitation" modal to capture:
  - Target email address
  - Preferred display name
  - Section assignment (from active ensemble sections)
  - Instrument(s) (comma-separated with badge chips)
  - Administrative onboarding notes
- Automatically constructs valid invite documents with UUID tokens in `invites/{token}` and presents copyable onboarding URLs formatted as:
  `https://beta.eagleburgerband.com/claim?token={token}` (or window origin in local development).

### 3. Public Musician Onboarding & Spot Claiming Flow
- **File:** [`src/app/(public)/claim/page.tsx`](file:///c:/repos/eagleburgerband/src/app/(public)/claim/page.tsx)
- Created a dedicated onboarding claim route at `/claim?token=...`:
  - **Invitation Verification:** Fetches and validates token from Firestore `invites/{token}` against `InviteSchema`.
  - **Section Personalization:** Displays recipient's designated band section, instrument assignment, and personalized welcome banner.
  - **Authentication Adaptability:**
    - For unauthenticated users: Offers One-Click "Claim Spot with Google" or Email/Password registration/sign-in.
    - For already authenticated users: Displays currently logged-in account details, warns if email differs from invite, and provides an "Accept Invitation & Enter Portal" action with account-switching support.
  - **Atomic Profile Provisioning:** Upon claim confirmation, provisions or updates `users/{uid}` with musician roles, section assignment, instrument tags, and marks `invites/{token}` as claimed.

### 4. Sheet Music & Chart Viewer Modal with Audio Player
- **Files:**
  - Component: [`src/components/portal/SheetMusicViewerModal.tsx`](file:///c:/repos/eagleburgerband/src/components/portal/SheetMusicViewerModal.tsx)
  - Integration: [`src/app/(portal)/portal/library/page.tsx`](file:///c:/repos/eagleburgerband/src/app/(portal)/portal/library/page.tsx)
- Wired the "Charts" button on all library cards and table rows to launch the modal with `key={selectedTuneForCharts?.id || "empty"}` for state isolation:
  - **Metadata Header:** Key signature, BPM tempo, meter, and section indicators.
  - **Rehearsal Notes:** Displays arrangement instructions, tempo changes, and performance notes.
  - **Embedded Audio Player:** Audio scrubber with play/pause, timecode, and cleanup handlers for reference recordings.
  - **Sheet Music Viewer:** Embedded Google Drive preview iframe with direct link fallback to external Drive viewer.
  - **Stand Mode:** One-click fullscreen toggle maximizing chart readability on mobile and tablet music stands.

### 5. Section Quorum & Instrumentation Transparency
- **File:** [`src/app/(portal)/portal/gigs/[gigId]/page.tsx`](file:///c:/repos/eagleburgerband/src/app/(portal)/portal/gigs/[gigId]/page.tsx)
- Transformed the flat gig RSVP list into structured section-by-section breakdown:
  - Real-time subscription to `sections` collection.
  - Grouping of "Attending" RSVPs by musician section.
  - Quorum threshold evaluation: compares attending head count against section target size (`section.targetRosterCount` or default 3).
  - Clear visual status badges:
    - `Quorum Met` (emerald badge) when attendance meets or exceeds threshold.
    - `Needs X more` (amber badge) when section attendance is below quorum.
  - Displays attending musician names, avatar initials, and instrument designations per section.

### 6. User Lifecycle & Complete Purge Infrastructure
- **Files:**
  - Route: [`src/app/api/admin/users/purge/route.ts`](file:///c:/repos/eagleburgerband/src/app/api/admin/users/purge/route.ts)
  - Firebase REST Helper: [`src/lib/firebase/admin.ts`](file:///c:/repos/eagleburgerband/src/lib/firebase/admin.ts)
  - Studio UI: [`src/app/(portal)/admin/users/page.tsx`](file:///c:/repos/eagleburgerband/src/app/(portal)/admin/users/page.tsx)
  - Inactive Guard: [`src/app/(portal)/layout.tsx`](file:///c:/repos/eagleburgerband/src/app/(portal)/layout.tsx)
  - Auth Kill-Switch: [`src/lib/context/AuthContext.tsx`](file:///c:/repos/eagleburgerband/src/lib/context/AuthContext.tsx)
- **Features:**
  - **"Remove & Purge"**: Immediately removes the user from all Firebase records:
    - Calls Google Identity Toolkit REST API (`/v1/accounts:delete`) using direct RS256 JWT service account credentials via `node:crypto`, bypassing Vercel `firebase-admin`/`jwks-rsa` ESM bundle errors.
    - Permanently deletes Firestore document `users/{uid}` and unclaims linked `invites`.
    - Logs an immutable security entry in `admin_logs`.
    - **Session Termination Guard**: `AuthContext` checks `await user.reload()` before auto-provisioning missing profiles; if the account was deleted in Firebase Auth (`auth/user-not-found`), it immediately clears local credentials, terminates the open session, and redirects to `/login`.
  - **"Deactivate / Reactivate"**: Keeps all Firestore records and Firebase Auth credentials intact, marks user `status: "inactive"`, displays an informative "Account Deactivated" screen in portal layout, and allows one-click reactivation.

### 7. Booking Request Validation & UX Fixes
- **Files:**
  - Schema: [`src/lib/schema/lead.ts`](file:///c:/repos/eagleburgerband/src/lib/schema/lead.ts)
  - Component: [`src/components/public/BookingFormSection.tsx`](file:///c:/repos/eagleburgerband/src/components/public/BookingFormSection.tsx)
- **Fixes:**
  - Updated `BookingInputSchema.budget` to accept numeric strings, numbers, and empty strings (`""`) up to $1,000,000, eliminating the false "Invalid input" error when entering budgets or leaving the optional field blank.
  - Allowed empty strings on optional phone numbers and corrected the label formatting from `(\$)` to `($)`.

### 8. Cloud Datastore Performance & Loading Overlay Polish
- **File:** [`src/lib/context/PortalLoadingContext.tsx`](file:///c:/repos/eagleburgerband/src/lib/context/PortalLoadingContext.tsx)
- **Fix:** Removed global `window.fetch` monkey-patching. Background Cloud Firestore sync requests (`firestore.googleapis.com`) and route prefetching now run silently in the background without causing the full-screen portal loading overlay to flash while scrolling.

### 9. Onboarding Security Hardening
- **File:** [`src/app/(public)/claim/page.tsx`](file:///c:/repos/eagleburgerband/src/app/(public)/claim/page.tsx)
- **Features:**
  - **Strict Google Email Matching**: Compares `auth.currentUser.email` with `invite.email`. If an unauthorized Google account attempts to claim an invite link, the claim is rejected and the user is signed out immediately.
  - **Email Verification for Password Registrations**: When setting an account password, dispatches `sendEmailVerification()` and transitions to a "Step 2 of 2: Verify Email" screen. Access to `/portal` is only granted once the recipient confirms ownership via the link sent to their inbox.

---

## Verification Results

| Verification Step | Command / Tool | Status | Details |
|---|---|---|---|
| **TypeScript Typecheck** | `npx tsc --noEmit` | **PASSED** | 0 errors |
| **ESLint Validation** | `npm run lint` | **PASSED** | 0 errors, 0 warnings |
| **Next.js Production Build** | `npm run build` | **PASSED** | 65 routes compiled cleanly with Turbopack (including `/claim` and `/api/admin/users/purge`) |

---

## How to Test in Beta

### Test Flow 1: Generate & Claim an Onboarding Invite with Security Verification
1. Sign in as Admin at `https://beta.eagleburgerband.com/admin/roster` (or localhost).
2. Click **"Invite Member"** and send an invite to a test email (e.g. `test@example.com`).
3. Open an Incognito window and navigate to the claim link (`/claim?token=...`).
4. Test **Google Sign-In**: Attempting to claim with an account other than `test@example.com` will be cleanly blocked.
5. Test **Password Registration**: Entering a password transitions to "Step 2 of 2: Verify Email" and dispatches a verification email.

### Test Flow 2: Remove & Purge Member Records
1. Go to `/admin/users`.
2. Locate a test member and click **"Remove & Purge"**.
3. Type the user's name/email in the modal and confirm.
4. The user is instantly deleted from both Cloud Firestore and Firebase Authentication. Any open session for that user in another tab will terminate and redirect to `/login`.

### Test Flow 3: View Sheet Music & Section Quorum
1. Navigate to `/portal/library` and click **"Charts"** on any tune to launch the `SheetMusicViewerModal` with Google Drive sheet preview and Stand Mode.
2. Navigate to `/portal/gigs/[gigId]` to view the real-time **Musician Attendance & Section Quorum** breakdown.
