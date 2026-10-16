# Stage 62: Verification Walkthrough & Testing Guide

This guide walks through verifying the Stage 62 deliverables:
1. **Authentication Providers Studio & Dynamic Login Controls**
2. **Centralized Finance Hub (`/portal/finance`)** with Treasury Overview, Expense Reimbursements, Charitable Giving, and Financial Ledger.
3. **Manager Submissions on Behalf of Members** and **Member Display Name Attribution**.

---

### Scenario 1: Authentication Providers Studio (`/admin/auth-providers`)

1. **Navigate to the Studio:**
   - Sign in as an administrator.
   - Go to `/portal/sections/business-admin` or `/admin`.
   - Click **Authentication Providers Studio** (located at `/admin/auth-providers`).
2. **Verify RBAC Protection:**
   - Sign in with an account having only `member` or `gig_manager` roles.
   - Attempt to access `/admin/auth-providers`.
   - Verify that access is blocked and the custom `AccessDenied` card is displayed ("The Authentication Providers Studio is strictly restricted to Band Administrators").
3. **Inspect the Studio Layout:**
   - **Breadcrumbs:** Verify the path renders `Portal Home > Business & Admin > Authentication Providers Studio` with working navigation links.
   - **Toggles Card:** Inspect the 6 method toggles (Google, Apple, Microsoft, GitHub, Magic Link, Password).
   - **Live Simulation Card:** Verify the simulation preview updates in real-time as you toggle options on and off.
   - **Setup Instructions:** Expand the Apple, Microsoft, and GitHub accordions to verify the exact redirect URI is displayed with a one-click Copy button (`https://eagleburger-band-beta.firebaseapp.com/__/auth/handler`).
4. **Test Lockout Guardrail:**
   - Toggle off all active providers so that zero methods remain enabled.
   - Click **Save Provider Configuration**.
   - Verify that saving is blocked with a prominent warning message:
     *"At least one authentication method must remain enabled to prevent locking musicians out of the portal."*

---

### Scenario 2: Dynamic Login Screen (`/login`)

1. **Verify Default State:**
   - Open `/login` in an incognito window.
   - Verify that Google is enabled by default, Apple/Microsoft/GitHub are hidden (as they await third-party console configuration), and the Magic Link and Password tabs are both visible.
2. **Test Single Social Provider Layout:**
   - In the Studio, keep only Google enabled under social methods.
   - Open `/login`. Verify the Google button renders full-width in a clean single-column format.
3. **Test Enabling Additional Providers:**
   - In the Studio, toggle on **GitHub** (or **Microsoft** / **Apple**) and save.
   - Open `/login`. Verify the buttons immediately transition to a 2-column grid.
4. **Test Disabling All Social Providers:**
   - In the Studio, toggle off Google, Apple, Microsoft, and GitHub, leaving only Magic Link and Password enabled.
   - Open `/login`.
   - Verify that the "Sign in with external account" block and the divider are completely hidden, presenting a clean email-only card.
5. **Test Single Email Method:**
   - In the Studio, toggle off Password and leave only Magic Link enabled.
   - Open `/login`. Verify the tab bar is replaced with a single header ("Passwordless Magic Link") and only the 1-click email form is shown.

---

### Scenario 3: Dynamic Onboarding Claim Screen (`/claim?token=...`)

1. **Open an Active Invite Token:**
   - Navigate to `/claim?token=<valid-token>`.
2. **Inspect External Account Options:**
   - Verify that only the social providers enabled in the Studio appear on the claim screen.
3. **Inspect Password Fallback:**
   - If Password authentication is enabled in the Studio, verify the "Prefer to use Email and Password?" toggle is accessible.
   - If Password authentication is disabled in the Studio, verify the password option is cleanly omitted.
4. **Email Matching Guardrail:**
   - If an invite is issued to `musician@example.com`, signing in with an external account whose email is `other@example.com` triggers a clear mismatch warning preventing unauthorized spot claiming.

---

### Scenario 4: Centralized Finance Hub - Treasury & Member Reimbursements (`/portal/finance`)

1. **Navigate to the Finance Hub:**
   - In the portal sidebar or `/portal/sections/finance`, click **Band Treasury & Reserves** or navigate to `/portal/finance`.
   - Verify breadcrumb: `Portal Home > Finance`.
2. **Inspect Treasury Overview Tab:**
   - Verify real-time financial stats: Band Fund Reserve, Total Inflows, Total Expenses, and Community Giving.
   - Verify Treasury Baseline card displays audited starting balance and date.
   - Verify Recent Financial Activity shows recent ledger entries with net amount indicators.
3. **Submit Expense Reimbursement as Member:**
   - Click the **Expense Reimbursements** tab (`?tab=reimbursements`) or click **Submit Reimbursement**.
   - Verify modal opens showing the member's **Display Name** automatically in the claimant badge.
   - Enter amount (e.g., `$35.00`), select category (`Gear & Repairs`), date, description (`Drum sticks & gaffer tape`), and optional receipt link.
   - Click **Submit Receipt Claim**.
   - Verify claim appears in **My Reimbursement Claims** with status `submitted`.

---

### Scenario 5: Manager Capabilities & "Submit on Behalf of Musician"

1. **Access as Treasurer or Admin:**
   - Sign in as an account with `treasurer` or `admin` role.
   - Navigate to `/portal/finance?tab=reimbursements`.
   - Verify the purple **Treasurer Review & Payout Queue** card is visible.
2. **Review Member Submission:**
   - Locate the claim submitted in Scenario 4.
   - Click **Approve**. Verify the status transitions to `approved`.
   - Click **Pay Out**. In the payout modal, enter a payment reference (e.g. `Venmo #40921`) and confirm.
   - Verify status transitions to `paid` and an expense transaction is automatically recorded in the ledger!
3. **Submit on Behalf of Another Member:**
   - Click the purple **Submit on Behalf** button.
   - In the modal, open the **Select Musician to Reimburse** dropdown.
   - Select another musician from the active band roster.
   - Verify the musician's name, email, and saved payout preferences automatically populate.
   - Fill in amount (`$65.00`) and description (`Trailer hitch lock`).
   - Click **Submit on Behalf**.
   - In the queue, verify the item is created and marked with:
     `Submitted by [Manager Name] on behalf of [Musician Name]`.

---

### Scenario 6: Charitable Giving & Member Suggestions (`/portal/finance?tab=giving`)

1. **Navigate to Charitable Giving Tab:**
   - Click the **Charitable Giving** tab (`?tab=giving`).
   - Inspect the **Supported Beneficiaries** gallery with category badges and impact statements.
2. **Submit a Charitable Suggestion as Member:**
   - Click **Suggest a Charitable Cause**.
   - Verify the modal shows the member's **Display Name**.
   - Enter Organization Name (`Pittsburgh Youth Drum Line`), Category (`Youth & Education`), Target Amount (`$250`), and Rationale (`Providing snare drums for local middle school music access`).
   - Click **Submit Suggestion**.
   - Verify the suggestion appears under **Causes Suggested by Band Members** with badge `Suggestion`.
3. **Manager Triage:**
   - As a Treasurer or Admin, verify the suggestion has an **Approve & Activate** action.
   - Click **Approve & Activate** and verify it moves into the active supported beneficiaries list!

---

### Scenario 7: Legacy Route Redirects

1. **Test Historical Bookmarks:**
   - Open `/portal/reimbursements` -> Verify automatic redirect to `/portal/finance?tab=reimbursements`.
   - Open `/admin/finance` -> Verify automatic redirect to `/portal/finance?tab=ledger`.
   - Open `/admin/giving` -> Verify automatic redirect to `/portal/finance?tab=giving`.

---

### Scenario 8: Suggestion Triage Guidance & Terminology Alignment

1. **Category Guidance Dynamic Panel:**
   - Navigate to `/admin/suggestions`.
   - Click through each of the category filter buttons: `[All Suggestions]`, `[Tune Requests]`, `[Gig Outreach]`, `[Website Requests]`, `[General Feedback]`.
   - Verify that the card directly below the tabs dynamically updates with:
     - Reviewer leadership role (`Catalog Manager`, `Gig Manager`, `Web Manager`, `Community Manager`, or `All Leadership`).
     - Real-time active suggestion count.
     - Specific purpose description for that category.
     - Practical submission tip (e.g., YouTube/Spotify links, dates & contacts, etc.).
2. **Terminology Consistency:**
   - Verify all page headers, search placeholders, modal titles, form labels, and delete prompts use **"Suggestion"** consistently (with zero references to "proposal" across portal pages).
