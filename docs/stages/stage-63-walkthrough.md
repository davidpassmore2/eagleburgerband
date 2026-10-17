# Stage 63 Walkthrough: Discussion Stream Comment Likes & Member Tooltips

## Purpose
This walkthrough validates the comment liking workflow and interactive member tooltip behavior across the Eagleburger Band Portal discussion stream (`CommentsStream.tsx`).

---

### Scenario 1: Viewing Comments in the Discussion Stream
1. **Navigate to an Active Discussion Stream:**
   - Go to `/admin/suggestions` (Suggestion Triage).
   - Expand the **Discussion** toggle on any suggestion card.
   - Alternatively, open **Music & Repertoire** (`/portal/library` or `/admin/catalog`) and click the chart discussion modal.
2. **Inspect Comment Footer:**
   - Underneath each comment body, verify the new **Like** button row is rendered.
   - Unliked comments display the outline thumbs-up icon with text `Like`.
   - Hover over an unliked comment's like button:
     - Verify the floating tooltip appears above the button reading `"Be the first to like this comment!"`.

---

### Scenario 2: Liking a Comment
1. **Click the Like Button:**
   - Click the Like button on a comment.
   - Verify the button transitions immediately to the active gold theme (`bg-amber-400/15 text-amber-300`).
   - The thumb icon becomes filled in gold, and the count increases from `Like` to `1`.
   - On desktop, a subtitle note appears: `You liked this`.
2. **Hover Tooltip Verification:**
   - Hover over the Like button.
   - Verify the tooltip opens with header: `1 Member Liked`.
   - Verify your Display Name is listed with a gold indicator and badge: `[Your Name] (You)`.

---

### Scenario 3: Multiple Member Likes & Collective Tooltip
1. **Observe Multiple Likes:**
   - When other band members like the comment, verify the count updates in real-time (e.g. `3`).
   - Hover over the button:
     - Verify all member names appear in the list.
     - Verify your name displays `(You)`.
   - Verify the summary label displays: `You and 2 others liked this`.

---

### Scenario 4: Unliking a Comment (Removal from Tooltip)
1. **Click the Previously Liked Comment:**
   - Click the active gold Like button on the comment you liked earlier.
   - Verify the button transitions back to the unliked slate style.
   - The like count decrements (e.g. from `1` to `Like`, or from `3` to `2`).
2. **Hover Tooltip Verification After Unlike:**
   - Hover over the button again.
   - Verify your name has been **completely removed** from the tooltip list.
   - If you were the only liker, the tooltip returns to `"Be the first to like this comment!"`.

---

### Scenario 5: Security Rules Validation
1. **Attempting Unauthorized Updates:**
   - Non-authenticated requests are blocked with a toast prompt (`"Please sign in to like comments"`).
   - Firestore security rules verify `addsOrRemovesOnlyMe('likes')`, ensuring no user can alter another musician's reaction.

---

### Scenario 6: "My Availability & Blackouts" Member Experience
1. **Navigate to the Member Availability Hub:**
   - From the Portal sidebar or `/portal/sections/performances-logistics`, click **"My Availability & Blackouts"** (`/portal/availability`).
   - Also test opening via the PWA manifest app shortcut or the Portal dashboard quick actions.
2. **Review Personal Schedule Telemetry:**
   - Confirm the 4 telemetry summary cards are rendered:
     - **My Dispatch Status**: Shows active call sheet readiness or hiatus badge.
     - **My Blackout Windows**: Total number of your active personal blackout ranges.
     - **Gig Conflicts**: Live tally of personal blackouts overlapping with scheduled band gigs.
     - **Band Performances**: Total upcoming gigs.
3. **Log a Personal Blackout Date Range:**
   - Click **"Add Blackout Dates"**.
   - Select a date range or click on the interactive calendar.
   - Enter an optional reason (e.g. *"Family Camping Trip"*).
   - Note the live conflict engine warning if any scheduled performances fall within that range.
   - Click **"Log My Blackout Range"**.
   - Verify the blackout appears under **"My Scheduled Blackout Dates"**.
4. **Remove a Blackout Period:**
   - Click the trash icon next to a scheduled blackout window.
   - Verify the custom modal appears: `"Remove My Blackout Period?"`.
   - Click **"Remove Blackout"** and confirm it is removed from your calendar.

---

### Scenario 7: Band Rehearsals Hub Tabs, Admin Guard & Calendar View
1. **Navigate to Band Rehearsals Hub:**
   - Visit `/portal/rehearsals`.
2. **Verify Tab Titles:**
   - Confirm Tab 1 is titled **"My RSVPs"**.
   - Confirm Tab 2 is titled **"Rehearsal Locations"**.
   - Confirm Tab 3 is titled **"All-Member Blackout Calendar"**.
3. **Verify Recurrence Tab RBAC Guardrails:**
   - When signed in with the `admin` role:
     - Verify Tab 4 appears titled **"Recurrence"**.
     - Click **"Recurrence"** and verify the weekly rehearsal schedule settings form renders.
   - When signed in as a standard `member` or `guest`:
     - Verify the **"Recurrence"** tab button is completely omitted from the navigation bar.
     - Verify direct state tampering cannot render the settings form.
4. **Inspect the Redesigned All-Member Blackout Calendar:**
   - Click on the **"All-Member Blackout Calendar"** tab.
   - Verify the calendar now uses the pleasing month-view grid layout from the Gig Calendar & RSVPs page (`PortalMonthCalendar` design):
     - Month and year `<select>` jump controls with dynamic year selection.
     - `Today` quick reset button and month chevrons (`<` and `>`).
     - Spacious date cells with day numbers, "Today" gold ring highlights, rehearsal event pills, and blackout indicators with member name previews.
     - 3-card monthly KPI summary strip below the grid (Rehearsals in Month, Rehearsals with Blackouts, Total Registered Blackouts).
     - Clicking any active date opens the date detail inspection modal.

---

### Scenario 8: Centralized Member Season Analytics in My Attendance & Check-In
1. **Verify Member Home Page Streamlining:**
   - Visit `/portal` (Member Home).
   - Verify the dashboard layout flows smoothly from **What's Next** directly into **Thematic & Functional Action Hubs**.
   - Confirm the redundant **Member Season Analytics & Standing** section is no longer taking up vertical real estate on the home page.
2. **Navigate to My Attendance & Check-In:**
   - Go to `/portal/checkin` via the portal navigation or sidebar.
3. **Verify Centralized Analytics Card:**
   - Confirm **Member Season Analytics & Standing** is rendered prominently directly below the Active Call Sheet check-in hero banner.
   - Verify the 4 primary telemetry metric cards display personal data accurately:
     - **Shows Played**: Completed shows attended / total completed gigs.
     - **Reliability Rate**: Percentage reliability score with visual progress bar and standing badge (e.g. `Ironclad Roster`).
     - **Upcoming Roster**: Confirmed upcoming gigs / total upcoming season dates.
     - **Compensation**: Season earnings (Paid vs. Pending) and Reimbursement claims summary.
   - Verify the secondary footer audit links (Song Catalog, Peer Pitches, SMS Dispatch status, Claims Hub, Update Profile, Full Gig Roster) are fully functional.

