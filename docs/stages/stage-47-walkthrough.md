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

---

## Verification Results

| Verification Step | Command / Tool | Status | Details |
|---|---|---|---|
| **TypeScript Typecheck** | `npx tsc --noEmit` | **PASSED** | 0 errors |
| **ESLint Validation** | `npm run lint` | **PASSED** | 0 errors, 0 warnings |
| **Next.js Production Build** | `npm run build` | **PASSED** | 65 routes compiled cleanly with Turbopack (including `/claim`) |

---

## How to Test in Beta

### Test Flow 1: Generate & Claim an Onboarding Invite
1. Sign in as Admin at `https://beta.eagleburgerband.com/admin/roster` (or localhost).
2. Click **"Invite Member"**.
3. Fill in the musician's name, email, section (e.g., *Trumpet*), and instrument (*Trumpet 1*).
4. Click **"Create & Copy Link"**.
5. Open an Incognito window and navigate to the copied claim link (`/claim?token=...`).
6. Confirm the welcome message displays the musician's name, section, and instruments.
7. Click **"Claim Spot with Google"** (or create an email account) to accept the invitation and enter the musician portal.

### Test Flow 2: View Sheet Music & Rehearsal Audio
1. Navigate to `/portal/library`.
2. Find any chart in the catalog (e.g., *Iron City Funk* or *Cissy Strut*).
3. Click the **"Charts"** button.
4. Verify the `SheetMusicViewerModal` opens with tempo, key signature, notes, and the Google Drive chart preview.
5. If an audio reference sample is attached, test the audio playback scrubber.
6. Click the fullscreen button to test **Stand Mode**.

### Test Flow 3: Verify Section Quorum on Call Sheets
1. Navigate to `/portal/gigs/[gigId]` for an upcoming performance.
2. Scroll to the **"Musician Attendance & Section Quorum"** section.
3. Verify sections show attending musicians grouped by section, along with `Quorum Met` or `Needs X more` status tags.
