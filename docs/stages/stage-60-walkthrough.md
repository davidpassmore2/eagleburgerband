# Stage 60: Verification Walkthrough & Testing Guide

This guide walks through verifying the newly implemented Stage 60 features: Theme Inheritance, Suggestion Archiving, Blackout Attendance Guardrails, Past Event RSVP Locks, and Hiatus Attendance Safeguards.

---

### Scenario 1: Suggestion Triage & Member Voice Archiving (`/portal/suggestions`)

1. **Navigate to Suggestions:**
   - Go to `/portal/suggestions`.
2. **Archive an Item:**
   - On any submission created by you (or any item if logged in with reviewer/admin privileges), click the **Archive** button.
   - Verify that the item immediately disappears from the active list.
3. **View Archived Items:**
   - Scroll to the bottom of the submissions list.
   - Click the **"Show Archived Items"** button.
   - Verify that the archived submissions load and display with an **"Archived"** indicator.
4. **Unarchive an Item:**
   - Click the **"Unarchive"** button on an archived submission.
   - Verify that it transitions back into the main active list immediately.

---

### Scenario 2: Personal Blackout Attendance Guardrails

1. **Setup Blackout Date:**
   - Go to `/portal/availability` and schedule a blackout period that covers an upcoming gig or rehearsal date.
2. **Inspect Gig Card & Call Sheet:**
   - Navigate to `/portal/gigs` or `/portal/gigs/[gigId]`.
   - Verify that the gig card displays the **"In My Blackout"** chip (`<InMyBlackoutChip />`).
   - Observe that the attendance RSVP buttons (`In`, `Probable`, `Maybe`, `Out`) are disabled with the tooltip `"in my blackout"`.
3. **Inspect Rehearsals Hub:**
   - Navigate to `/portal/rehearsals`.
   - Verify that the rehearsal occurring during your blackout displays the **"In My Blackout"** chip.
   - Verify that attendance buttons and the personal note save button are disabled.

---

### Scenario 3: Past Event RSVP Locks

1. **Navigate to Gigs or Rehearsals:**
   - Go to `/portal/gigs`, `/portal/rehearsals`, or open a past event in `/portal`'s Month Calendar.
2. **Verify Past Event Attendance Status:**
   - For any gig or rehearsal whose scheduled date and time has passed, verify that all attendance buttons are disabled.
   - Hover over the buttons and observe the tooltip: `"Event is in the past"` or `"Rehearsal is in the past"`.
   - Attempting to submit attendance shows an error toast preventing retroactive modifications.

---

### Scenario 4: Member on Hiatus Attendance Safeguards

1. **Verify Hiatus State:**
   - For a user account marked with `onHiatus: true` or `status: "hiatus"`:
2. **Inspect Gigs & Rehearsals:**
   - Navigate to `/portal`, `/portal/gigs`, `/portal/gigs/[gigId]`, and `/portal/rehearsals`.
   - Verify that an **"On Hiatus"** badge (`<OnHiatusChip />`) appears on event headers and next to RSVP sections.
   - Verify that all attendance buttons and note inputs are disabled with the tooltip `"On Hiatus"`.
   - In `/portal` month calendar (expanded view), verify that the `hiatus` pill appears on calendar entries.
   - Attempting an RSVP update triggers a warning toast: `"Attendance controls are disabled while on hiatus."`

