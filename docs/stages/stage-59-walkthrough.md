# Stage 59: Band Rehearsals Hub, OpenStreetMap Geocoding & "What's Next" Walkthrough

## Feature Walkthrough & Verification Guide

This guide walks through verifying the newly implemented Band Rehearsal Hub, OpenStreetMap location picker, blackout intelligence, and the consolidated "What's Next" Member Portal layout.

---

### Scenario 1: "What's Next" Side-by-Side Dashboard (`/portal`)

1. **Navigate to the Musician Home Screen:**
   - Go to `/portal`.
2. **Inspect the "What's Next" Section:**
   - Observe the unified section header: **What's Next**.
   - Verify the 2-column layout displaying **Next Gig** on the left and **Next Rehearsal** on the right with balanced height and alignment.
3. **Verify the Next Gig Card:**
   - Confirms next gig countdown badge, venue address with Google Maps link, call time, downbeat, and uniform attire.
   - 1-click RSVP buttons (`In`, `Probable`, `Maybe`, `Out`) update status immediately.
4. **Verify the Next Rehearsal Card:**
   - Confirms rehearsal date, countdown, and active/cancelled status.
   - Shows rehearsal start & end times in 12-hour non-military EST formatting.
   - Shows rehearsal ground venue name and location pin.
   - Displays live quorum progress (`X In / Y Proj (Z% Quorum)`).
   - 1-click attendance plan buttons update RSVP instantly.
   - Action buttons: **Rehearsal Hub** navigates to `/portal/rehearsals`, and coordinators can click **Cancel Rehearsal** to trigger the emergency cancellation dialog.

---

### Scenario 2: Band Rehearsals Hub (`/portal/rehearsals`)

1. **Navigate to the Rehearsal Hub:**
   - Go to `/portal/rehearsals` via the sidebar or from the Next Rehearsal card.
2. **Inspect the Recurring Schedule Configuration:**
   - Logged-in gig managers and administrators can set the recurring rehearsal cadence:
     - Day of week (e.g. Monday).
     - Start time and end time (12-hour EST).
     - Default rehearsal ground location.
     - Target quorum threshold.
   - Click **Save Settings** to persist to Firestore.
3. **Inspect the OpenStreetMap Ground Picker:**
   - Click **+ Add / Edit Location** to open the Leaflet / OpenStreetMap map interface.
   - Click any location on the map or drag the pin.
   - Observe that the free Nominatim reverse geocoder queries the coordinates and auto-fills the venue street address and neighborhood without requiring an API key.
   - Add parking or grounds notes and save the rehearsal location.
4. **Inspect Member Attendance Plans & Full Roster Visibility:**
   - Select an upcoming rehearsal session from the schedule carousel.
   - Click any of the 4 RSVP buttons (`In`, `Probable`, `Tentative`, `Declined`) to record your attendance plan.
   - Scroll down to the **Ensemble Attendance Roster**:
     - View all band members grouped by section (Trumpets, Trombones, Percussion, etc.).
     - Observe real-time status badges for every member.
     - If a member has an active blackout logged for that date in Musician Availability, verify they are automatically badged with the **Blackout** indicator.
5. **Test Session Cancellation & Reactivation:**
   - Click **Cancel Rehearsal**:
     - Enter a cancellation reason (e.g., "Thunderstorms predicted; practice cancelled").
     - Confirm cancellation.
     - Observe that the rehearsal banner changes to red, displaying the cancellation badge and explanation.
   - Click **Reactivate Rehearsal** to clear the cancellation and restore normal active status.
6. **Inspect the Member Blackouts Calendar:**
   - Scroll to the **Member Blackouts & Rehearsal Calendar** component.
   - Review the monthly calendar showing rehearsal days alongside individual musician blackout bars to quickly identify potential quorum conflicts.

---

### Scenario 3: UX Terminology Consistency

1. **Verify Member Portal Terminology:**
   - Notice that **"gig"** has replaced **"performance"** across the site:
     - Dashboard: *Upcoming Gig Schedule*, *Next Gig*, *Gig Logistics*.
     - Navigation: *Gigs & Logistics*.
     - Status Matrix: *Gig Lifecycle*, *Gig Inquiries*, *Gig Quorum*.
     - Help Center: *Gig Operations*, *Gigs & Logistics*.
   - Notice that **"rehearsal"** has replaced **"practice"**:
     - *Band Rehearsals Hub* (`/portal/rehearsals`).
     - *Rehearsal Vault & Media* (`/portal/vault`).
     - *Rehearsal Schedule & RSVPs*.

