# Stage 62: Multi-Provider OAuth Authentication, Authentication Providers Studio & Centralized Finance Hub

## Overview & Scope

Stage 62 delivers two major milestones:
1. **Multi-Provider Authentication & Studio Controls:** Expands external identity provider authentication across the Eagleburger Band platform, enabling musicians and onboarding invitees to authenticate using **Google**, **Apple**, **Microsoft**, or **GitHub**, with an administrative control center located under **Business & Admin** to toggle active methods visible on public screens without breaking existing workflows.
2. **Centralized Finance Hub (`/portal/finance`):** Unifies fragmented financial workflows into a single, cohesive hub serving both regular band members and managers (Treasurers/Admins). It provides transparent treasury health, member expense reimbursements with Display Name attribution, member-suggested charitable causes, full managerial review queues, and the capability for managers to submit expenses and record donations **on behalf of other band members**.

---

## 1. Centralized Finance Hub Architecture (`/portal/finance`)

Located at [`src/app/(portal)/portal/finance/page.tsx`](file:///c:/repos/eagleburgerband/src/app/(portal)/portal/finance/page.tsx), the Finance Hub provides universal breadcrumb navigation (`Portal Home > Finance > [Tab Title]`) and 4 role-adaptive tabs:

```
┌────────────────────────────────────────────────────────────────────────┐
│  PORTAL HOME > FINANCE                                                 │
│  Eagleburger Band Financial Hub & Treasury                             │
│  [ Treasury Overview ]  [ Reimbursements ]  [ Giving ]  [ Ledger ]     │
└────────────────────────────────────────────────────────────────────────┘
```

### Tab 1: Treasury Overview (`?tab=treasury`)
* **For All Members:**
  * **Band Fund Reserve:** Displays current operating reserve, computed in real-time from the audited starting baseline plus season inflows minus outflows.
  * **Financial Transparency Metrics:** Overview of Total Inflows (gig fees, tip contributions, merch sales), Total Expenses (gear repairs, fuel, lunch, practice space, uniforms), and Total Philanthropic Contributions.
  * **Recent Financial Activity:** Recent transparent transactions with category icons and net cashflow indicators.
* **For Treasurers & Admins:**
  * **Adjust Treasury Baseline Modal:** Ability to update the audited starting reserve balance and effective rollover date (`settings/treasury`).
  * **Disbursement Quick Actions:** Direct navigation to pending reimbursement reviews and community cause suggestions.

### Tab 2: Expense Reimbursements (`?tab=reimbursements`)
* **For All Members:**
  * **Personal Summary Stat Cards:** Total Submitted, Approved, and Paid reimbursements.
  * **Submit Receipt Claim:** Modal pre-populating the member's **Display Name** (`applicantName: profile.displayName`), amount, expense date, category, optional gig association, receipt URL/notes, and payout method/handle.
  * **My Submissions Table:** Chronological history of personal claims with live status badges (`submitted`, `approved`, `paid`, `rejected`), rejection reasons, and disbursement payout references.
* **For Treasurers & Admins (Manager Queue):**
  * **Review & Payout Queue:** Filterable by status (`submitted`, `approved`, `paid`, `rejected`) with one-click Approve, Pay Out (creates ledger transaction, records payout reference & date, marks paid), or Reject with explanatory notes.
  * **"Submit on Behalf of Musician" Modal:**
    * Searchable dropdown of active musicians from the roster (`users`).
    * Automatically populates the selected musician's **Display Name**, email, section, and saved payout preferences.
    * Transparently records `applicantName` (musician reimbursed), `submittedByName` (manager submitting), and `submittedOnBehalf: true`.

### Tab 3: Charitable Giving & Philanthropy (`?tab=giving`)
* **For All Members:**
  * **Giving Impact Overview:** Total dollars donated, number of regional grassroots organizations supported.
  * **Supported Beneficiaries Directory:** Searchable and filterable directory of nonprofits funded by the band, with cause descriptions, category badges, public impact statements, and external website links.
  * **"Suggest a Charitable Cause" Modal:**
    * Automatically stamps the member's **Display Name** (`suggestedByName: profile.displayName`).
    * Captures Organization Name, Category, Website, Suggested Target Amount, and Rationale ("Why should the band support this cause?").
    * Saves to `donations` with `status: "suggested"`.
  * **Community Suggestions Queue:** Transparent list of causes suggested by bandmates with status badges (`suggested`, `approved`, `completed`).
* **For Treasurers & Admins (Manager Queue):**
  * **Suggestion Triage:** Review member ideas, approve for upcoming funding rounds, or mark as completed with donation details.
  * **"Record Direct Donation":** Add new donations directly, toggle public visibility, set fiscal year, and optionally attribute to a specific member suggestion.

### Tab 4: Financial Ledger & Transactions (`?tab=ledger`)
* **For All Members:** Read-only view of transparent ledger entries (inflows, outflows, payouts).
* **For Treasurers & Admins:** Full transaction controls: manual entry modal (gig fee, tips, merch, equipment, fuel, etc.), category and date filters, and deletion with audit trail.

---

## 2. Authentication Providers Studio (`/admin/auth-providers`)

* **Control Center:** Located under **Business & Admin** restricted strictly to the `admin` role.
* **Real-Time Method Toggles:**
  * Google OAuth
  * Apple Sign In
  * Microsoft Entra / Personal
  * GitHub OAuth
  * Passwordless Magic Link (Email)
  * Email & Password
* **Lockout Prevention Guardrail:** Prevents admins from accidentally disabling all authentication methods (at least 1 method must remain active).
* **Live Preview Simulation:** Real-time preview card demonstrates exactly how the login card will render to musicians.
* **OAuth Setup Guide:** Direct step-by-step accordion instructions for configuring Apple Developer, Azure App Registrations, and GitHub OAuth Apps with the exact Firebase callback URL:
  `https://eagleburger-band-beta.firebaseapp.com/__/auth/handler`.
* **Admin Audit Trail:** Automatically writes configuration updates to `admin_audit_log`.

---

## 3. Schema & Firestore Security Rules (Rule 2 Compliance)

### Schemas
* **[`src/lib/schema/authProvidersConfig.ts`](file:///c:/repos/eagleburgerband/src/lib/schema/authProvidersConfig.ts):** Defined default provider visibility (`google: true`, `magicLink: true`, `password: true`, `apple: false`, `microsoft: false`, `github: false`).
* **[`src/lib/schema/donation.ts`](file:///c:/repos/eagleburgerband/src/lib/schema/donation.ts):**
  * Added `status: z.enum(["suggested", "approved", "completed", "archived"]).default("completed")`.
  * Added `targetAmount: z.number().default(0)`.
  * Added `suggestedByUid`, `suggestedByName`, `submittedByUid`, `submittedByName`, `submittedOnBehalf: z.boolean().default(false)`.
  * Added `rationale: z.string().default("")`.
  * Added `reviewedByUid`, `reviewedByName`, `reviewedAt`.
  * Updated `PublicBeneficiarySchema` to omit internal/manager fields.
* **[`src/lib/schema/reimbursement.ts`](file:///c:/repos/eagleburgerband/src/lib/schema/reimbursement.ts):**
  * Added `submittedByUid: z.string().nullable().default(null)`.
  * Added `submittedByName: z.string().nullable().default(null)`.
  * Added `submittedOnBehalf: z.boolean().default(false)`.

### Firestore Security Rules ([`firestore.rules`](file:///c:/repos/eagleburgerband/firestore.rules))
* Delegated to `firestore-rules-author` subagent:
  * `system_config/auth_providers`: Public read for unauthenticated visitors on login and claim; admin write.
  * `donations`: Authenticated band members (`isMember()`) can create donation suggestions where `status == 'suggested'` and `suggestedByUid == request.auth.uid`. Write/update/delete reserved for `treasurer` and `community_manager`.

---

## 4. Navigation & Route Modernization

* **[`src/lib/portal/workspaceRegistry.ts`](file:///c:/repos/eagleburgerband/src/lib/portal/workspaceRegistry.ts):**
  * `Band Treasury & Reserves`: `/portal/finance?tab=treasury` (`member`, `guest`)
  * `Expense Reimbursements`: `/portal/finance?tab=reimbursements` (`member`, `guest`)
  * `Charitable Philanthropy & Giving`: `/portal/finance?tab=giving` (`member`, `guest`)
  * `Financial Ledger & Management`: `/portal/finance?tab=ledger` (`admin`, `treasurer`)
  * `Authentication Providers Studio`: `/admin/auth-providers` (`admin`)
* **Legacy Route Redirects:**
  * `/admin/finance` -> Redirects to `/portal/finance?tab=ledger`
  * `/portal/reimbursements` -> Redirects to `/portal/finance?tab=reimbursements`
  * `/admin/giving` -> Redirects to `/portal/finance?tab=giving`
* **[`src/lib/portal/portalSections.ts`](file:///c:/repos/eagleburgerband/src/lib/portal/portalSections.ts):**
  * Updated `whatCanIDo` highlighting the centralized finance hub capabilities.
