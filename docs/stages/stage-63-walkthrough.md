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

