# Stage 47: Member Onboarding Portal, Mobile Chart Viewer & Section RSVP Experience Implementation Plan

## Problem Statement & Goals
With the platform live on `beta.eagleburgerband.com`, Stage 47 focuses on the end-to-end musician experience for user acceptance testing (UAT):
1. **Personalized Onboarding & Claim Flow (`/claim`):**
   - Currently, `/admin/roster` generates onboarding links pointing to `/claim?token=...`, but no `/claim` route exists (resulting in a 404).
   - Create a dedicated public onboarding page (`src/app/(public)/claim/page.tsx`) that validates the invite token in real time, displays a personalized welcome banner with their assigned section and instruments, and enables one-click sign-in via Google or Email/Password to automatically link and activate their member profile.
   - Gracefully handle expired, invalid, or already-claimed tokens with helpful recovery guidance.
2. **Repertoire & Sheet Music Mobile Chart Viewer:**
   - Enhance the member music library (`/portal/library`) and live performance mode (`/portal/perform/[gigId]`) with a streamlined mobile chart viewer modal.
   - Allow musicians to filter and jump directly to their section's specific part (e.g. 1st Trumpet, 2nd Trombone, Sousaphone, Snare Drum) when viewing charts attached to tunes.
   - Support quick external Google Drive chart preview and full-screen popup view.
3. **Streamlined Section RSVP & Headcount Transparency:**
   - Optimize the gig call sheet RSVP widget (`/portal/gigs/[gigId]`) for mobile touch devices.
   - Add section-level attendance visibility: musicians can immediately see how many players in their section have RSVP'd attending, helping the band gauge section balance (e.g., "Percussion: 4/5 Attending").
   - Provide section leaders with one-tap attendance summaries.

---

## Technical Scope & Architecture

### 1. Zod Schema Verification (`src/lib/schema/`)
- Verify `InviteSchema` in `src/lib/schema/invite.ts`:
  - `token: z.string()`
  - `email: z.string()`
  - `displayName: z.string().default("")`
  - `sectionId: z.string().nullable().default(null)`
  - `instruments: z.array(z.string()).default([])` (ensure instruments array exists with default)
  - `roles: z.array(RoleEnum).default(["member"])`
  - `status: InviteStatusEnum.default("pending")`
  - `createdAt: z.string()`
  - `claimedAt: z.string().nullable().default(null)`
  - `claimedByUid: z.string().nullable().default(null)`

### 2. Onboarding Landing Page (`src/app/(public)/claim/page.tsx`)
- Reads `token` query param using Next.js `useSearchParams()`.
- Real-time Firestore fetch from `invites/{token}`.
- If pending:
  - Fetches section title and badge from `sections/{sectionId}`.
  - Presents a branded welcome screen with the musician's name, assigned section, and band crest.
  - Primary CTA: **Continue with Google** (or password sign-in).
  - Automatically claims the invite token, creates/updates `users/{uid}`, and redirects to `/portal`.
- If already claimed:
  - Displays "This invite has already been claimed" with a direct link to `/login`.
- If invalid/expired:
  - Displays helpful error card with contact button to request a new invite.

### 3. Repertoire Library & Section Part Viewer (`src/app/(portal)/portal/library/page.tsx`)
- Add an interactive **"My Section Parts"** filter based on the logged-in user's `profile.sectionId`.
- In tune detail/modal, highlight attachments matching the musician's section or instrument.
- Integrate full-screen clean preview mode for mobile music stands.

### 4. Gig RSVP & Section Strength Widget (`src/app/(portal)/portal/gigs/[gigId]/page.tsx` & `/portal/gigs/page.tsx`)
- Display live **Section Roster Breakdown** in the Call Sheet RSVP card:
  - Shows attendees grouped by section (Percussion, Trumpets, Trombones, Sousaphones, Saxophones, Auxiliary).
  - Shows min recommended thresholds so section leaders immediately see if their section meets performance requirements.
- 1-tap RSVP button group (`Attending`, `Tentative`, `Declined`) with instant feedback.

