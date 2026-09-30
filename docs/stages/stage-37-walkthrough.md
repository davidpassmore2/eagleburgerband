# Stage 37: Complete Portal Structural Consolidation Walkthrough

This walkthrough guides you through testing the unified, deduplicated, and streamlined **Eagleburger Band Web Portal**.

---

## Prerequisites
1. Ensure the Next.js development server is running (`npm run dev`).
2. Log in with administrative access or use Role Emulation (`admin`, `gig_manager`, or `member`).

---

## Verification Steps

### Step 1: Complete Client-Side Redirects Matrix
Test all retired and alias routes directly in your browser address bar to verify smooth client-side redirects with loading feedback:
1. `/admin/catalog` &rarr; Redirects to `/portal/library` (Repertoire Catalog).
2. `/admin/tunes` &rarr; Redirects to `/portal/library`.
3. `/admin/vault` &rarr; Redirects to `/portal/vault` (Rehearsal Vault).
4. `/admin/call-sheets` &rarr; Redirects to `/admin/dispatch` (Call Sheet Dispatch).
5. `/portal/inquiries` &rarr; Redirects to `/admin/inquiries` (Booking Leads).
6. `/portal/section` &rarr; Redirects to `/admin/attendance` (Section Attendance & Quorum).
7. `/portal/section/manage` &rarr; Redirects to `/admin/sections` (Band Sections).
8. `/admin/assets` &rarr; Redirects to `/admin/inventory` (Equipment & Assets).
9. `/admin/ledger` &rarr; Redirects to `/admin/finance` (Financial Ledger).
10. `/admin/crm` &rarr; Redirects to `/admin/contacts` (Client CRM & Contacts).
11. `/admin/moderation` &rarr; Redirects to `/admin/comments` (Comment Moderation).
12. `/portal/checkin` &rarr; Redirects to `/admin/checkin` (Downbeat Check-In Kiosk).
13. `/portal/perform` &rarr; Redirects to `/portal/gigs` (Performance Calendar).

---

### Step 2: Member Navigation Parity ("Performances & Logistics" & "Personnel & Attendance")
1. In the top role emulation banner, select **`member`** (or log in as a standard musician).
2. Open the portal navigation sidebar or tools explorer:
   - Expand **"Performances & Logistics"**:
     - Verify **"Performance Calendar & RSVPs"** (`/portal/gigs`) is visible and accessible.
     - Verify **"Musician Availability & Blackouts"** (`/portal/availability`) is visible and accessible.
   - Expand **"Personnel & Attendance"**:
     - Verify **"Member Directory & Roster"** (`/portal/roster`) is visible and accessible.
     - Verify **"My Profile & SMS Settings"** (`/portal/profile`) is visible and accessible.
   - Expand **"Business & Admin"**:
     - Verify **"Help & Documentation"** (`/portal/help`) is accessible.
3. Click **"Member Directory & Roster"**:
   - Verify musicians can browse active section rosters, search bandmates, and view contact info.

---

### Step 3: On-Stage Teleprompter Resilient Setlists (`/portal/perform/[gigId]`)
1. From `/portal/gigs`, click any scheduled performance to view its call sheet (`/portal/gigs/[gigId]`).
2. In the Repertoire Setlist section, click **"Stage View"** (or open `/portal/perform/[gigId]`).
3. Verify on-stage teleprompter behavior:
   - The top-left back button smoothly returns to the gig call sheet (`/portal/gigs/[gigId]`), NOT `/admin/setlists`.
   - Tunes render with key signatures, BPM cues, performance notes, and sheet music PDF links.
   - The fallback setlist cascade functions seamlessly across gig stage docs, embedded setlists, and master templates.

---

### Step 4: Unified Repertoire Catalog (`/portal/library`)
1. Navigate to `/portal/library`.
2. As a member:
   - Filter by status tabs (`All`, `Active Rotation`, `In Repertoire`, `Rehearsal/Review`, `Heavy Rotation`, `In Vault >90 Days`, `Unperformed`).
   - Use the tag filter dropdown (e.g. `Street Brass`, `Funk`).
   - Click the Drive sheet music link on a tune to open its PDF.
   - Click the audio preview button on a tune to play sample audio inline.
   - Vote thumbs-up / thumbs-down on a chart.
   - Click "Rehearsal Notes" to open the discussion modal and add a comment.
3. Switch role emulation to **`admin`** or **`catalog_manager`**:
   - Click **"+ Add New Chart"** to create a new tune and assign a chart lead from the band roster.
   - Click the edit pencil icon on a chart to update its metadata.
   - Confirm changes persist in real time to Firestore `tunes`.

---

### Step 5: Unified Rehearsal Audio Vault (`/portal/vault`)
1. Navigate to `/portal/vault`.
2. As a member:
   - Play audio tracks, switch stems (`full_mix`, `brass_stem`, `drum_line`, `reference_recording`), change playback tempo (0.75x–1.25x), and toggle the metronome.
3. As an `admin` or `catalog_manager`:
   - Click **"+ Upload Track"** to register a new rehearsal stem.
   - Verify the stem appears in the player.
   - Delete a test stem using the red trash icon and confirm deletion.

---

### Step 6: Booking Leads Studio & Link Validation
1. As an `admin` or `gig_manager`, navigate to `/portal` dashboard.
2. In the "Performance Logistics" quick hub card, click **"Client Inquiries Pipeline"**:
   - Verify it navigates directly to `/admin/inquiries`.
3. In the "Repertoire & Music Vault" hub card, click **"Master Chart Catalog"** or **"Submit New Arrangement"**:
   - Verify it navigates directly to `/portal/library`.

---

## Summary of Automated Checks
- `npx tsc --noEmit`: Exited with code 0 (zero compiler errors).
- `npm run lint`: Exited with code 0 (zero ESLint errors, zero ESLint warnings).
