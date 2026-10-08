# Stage 50: Lifecycle-Aware Gig Email Dispatch & Member Hiatus Walkthrough

## Feature Walkthrough & Verification Guide

This guide walks through verifying the newly implemented gig availability dispatches, blackout date filtering, musician hiatus status, and confirmed performance communications.

---

### Scenario 1: Member Sets Hiatus Status (Self-Service)

1. **Navigate to the Musician Availability Hub:**
   - Log into the portal and go to `/portal/availability`.
2. **Review Member Dispatch Status Banner:**
   - At the top of the page, observe the banner:
     - Badge: `⚡ ACTIVE MUSICIAN`.
     - Text: "You are currently an active performer receiving all gig announcements, availability roll calls, and confirmed call sheets."
3. **Toggle Hiatus Mode:**
   - Click the button **🌴 Go On Hiatus**.
   - Observe the instant toast feedback: *"🌴 Hiatus mode enabled. You will not receive gig dispatch emails."*
   - Observe the banner state update to:
     - Amber theme with Palm Tree icon.
     - Badge: `🌴 ON HIATUS (MUTED)`.
     - Button: **Resume Active Status**.
4. **Verify in Notification Preferences:**
   - Go to `/portal/notifications` -> **Preferences** tab.
   - Observe the matching Master Hiatus Safeguard card indicating `On Hiatus`.

---

### Scenario 2: Manager Toggles Member Hiatus in Admin Roster

1. **Navigate to Admin Roster:**
   - Go to `/admin/roster`.
2. **Inspect the Status Column:**
   - Active members display the green `ACTIVE` pill.
   - Members on hiatus display the amber `🌴 HIATUS` pill.
3. **Toggle Status with One Click:**
   - Click **Hiatus** next to any active musician.
   - Toast displays: *"[Musician Name] is now on Hiatus (dispatches muted)."*
   - Click **Resume** to restore active status.

---

### Scenario 3: Blackout Date Declaration

1. **Declare a Blackout Period:**
   - Go to `/portal/availability`.
   - Click **+ Add Blackout**.
   - Select a date range covering a test date (e.g., `2026-11-15` to `2026-11-17`).
   - Enter reason: *"Out of town for family event"*.
   - Click **Add Blackout Period**.
   - Verify the blackout is saved to `users/{uid}/blackouts`.

---

### Scenario 4: Creating a Gig & Initial Availability Dispatch

1. **Open Create Gig Modal:**
   - Navigate to `/admin/gigs`.
   - Click **+ Create Performance**.
2. **Fill in Performance Details:**
   - Set Date: `2026-11-16` (matching the test blackout date).
   - Enter Title: *"South Side Music Showcase"*.
   - Venue: *"Rex Theater"*.
   - Call Time: *"6:00 PM"*, Downbeat: *"7:00 PM"*.
3. **Verify the Dispatch Checkbox:**
   - Note the checkbox: `[x] Dispatch Initial Availability Request Email`.
   - Subtitle: *"Sends an RSVP invitation email to active band members requesting them to mark their availability. Automatically filters out members on hiatus and those with this date blacked out."*
4. **Submit Performance Creation:**
   - Click **Create Performance**.
   - The engine automatically resolves recipients:
     - Members with `2026-11-16` blacked out are excluded.
     - Members on hiatus are excluded.
   - Toast confirms:
     `Performance created! Availability dispatch sent to X musician(s) (Y blacked out, Z on hiatus skipped).`

---

### Scenario 5: Lead Conversion Initial Dispatch

1. **Navigate to Inbound Booking Inquiries:**
   - Go to `/admin/inquiries`.
2. **Convert an Inquiry to a Performance:**
   - Find a pending booking inquiry.
   - Click **Convert to Gig**.
   - The system creates the draft gig in Firestore and immediately triggers `/api/email/gig-availability`.
   - Toast confirms:
     `Converted to gig! Availability request sent to X member(s) (Y blacked out, Z on hiatus skipped).`

---

### Scenario 6: Gig Confirmation Dispatch to Attending Musicians

1. **Mark Musicians Attending:**
   - Go to `/portal/gigs/[gigId]` and submit RSVP as **Attending** (In).
2. **Confirm Performance in Admin Gigs:**
   - Go to `/admin/gigs`.
   - Find the gig and click **Edit**.
   - Change Status from `Draft` to **Confirmed & Dispatched**.
   - Observe the Confirmation Dispatch banner appears with:
     - Checkbox: `[x] Send Confirmation Dispatch Email to Attending Members`.
     - Button: **Dispatch Now to Confirmed List**.
   - Click **Save Changes**.
   - The confirmation email is immediately sent to all musicians marked "attending" (in) who are not on hiatus.
   - Toast displays:
     `Gig confirmed! Confirmation dispatch sent to X attendee(s) marked 'in'.`
3. **Use Quick Action on Gig Card:**
   - On the confirmed gig card, observe the **Dispatch Confirmed** action button.
   - Clicking it allows gig managers to re-dispatch the confirmation email at any point.

---

### Scenario 7: Subsequent Dispatches in Dispatch Studio

1. **Navigate to Dispatch Studio:**
   - Go to `/admin/dispatch`.
   - Select the confirmed performance from the right-hand column.
2. **Verify Audience Targeting:**
   - In the center panel, check the **Target Recipients** card:
     - Badge: `CONFIRMED ROSTER`.
     - Stats: `X active musicians marked attending • Y on hiatus (muted)`.
3. **Open Email Modal:**
   - Click **Email Call Sheet**.
   - In the recipient list preview:
     - Active attending musicians are listed with their verified emails.
     - Any musician on hiatus is struck through with a `Hiatus (Muted)` badge.
   - Click **Send to X Musicians**.
   - Dispatches are delivered strictly to the confirmed attendee roster.

---

### Scenario 8: 4-State RSVP System with "Probable" Availability

1. **Mark RSVP as "Probable":**
   - On the Home Base dashboard (`/portal`), locate the Next Performance spotlight or Upcoming Gigs queue.
   - Click the cyan **Probable** button.
   - Observe that the RSVP status updates to `Probable` with the cyan indicator.
2. **Review Quorum on Call Sheet Detail:**
   - Go to `/portal/gigs/[gigId]`.
   - Observe the headcount summary bar displays:
     - `X Confirmed In`, `Y Probable`, `Z Tentative`, `W Out`.
   - In the Section Breakdown cards, quorum status reflects combined available strength:
     - `✓ Quorum Met (X/Min req incl. Y prob.)`.
3. **Inspect Manager Section Attendance Matrix:**
   - Go to `/admin/attendance`.
   - Select the gig.
   - Progress bar displays: `Available: X (A In + B Prob) / Required: Min`.
   - Musicians are grouped under dedicated headings: `Confirmed In`, `Probable`, `Tentative`, and `Declined`.
4. **Broadcast to Confirmed + Probable Roster:**
   - In `/admin/dispatch`, target audience automatically counts both In and Probable performers as committed performers (`CONFIRMED ROSTER`).
   - Dispatches reach all active non-hiatus musicians who RSVP'd either "attending" or "probable".

