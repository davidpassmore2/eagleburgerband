# Stage 35: Integrating Logged Charitable Gifts into Band Finance & Treasury Reporting

## Overview
Stage 35 reconciles charitable giving and philanthropic community grants directly into the central **Financial Ledger & Treasury Suite** ([`src/app/(portal)/admin/finance/page.tsx`](file:///c:/repos/eagleburgerband/src/app/(portal)/admin/finance/page.tsx)):
1. **Real-time Data Integration**: Directly subscribes to the Firestore `donations` collection using `DonationSchema` from `@/lib/schema/donation`.
2. **Reconciled Treasury Net Calculation**: Reconciles the liquid net treasury formula to deduct charitable grant outflows (`Net = Starting Baseline + Inflows - Operating Expenses & Payouts - Charitable Giving Outflow`).
3. **5-KPI Treasury Metric Cards**: Adds a dedicated **Charitable Giving** card alongside Current Treasury, Total Income, Operating & Payouts, and Opening Baseline.
4. **Dedicated Charitable Giving Reporting Tab**: Introduces a third primary view in `/admin/finance` featuring philanthropic KPIs, cause category distribution bars, search/filter toolbar, and a master table of all logged gifts.
5. **Expense Category Alignment**: Adds `charitable_giving` ("Charitable Gifts & Community Grants", icon: `HeartHandshake`) into `ExpenseCategory` and `EXPENSE_CATEGORIES`.

---

## Technical Architecture & Changes

### 1. Central Financial Suite ([`src/app/(portal)/admin/finance/page.tsx`](file:///c:/repos/eagleburgerband/src/app/(portal)/admin/finance/page.tsx))
- **Schema & Reactive Subscriptions**:
  - Imported `Donation`, `DonationSchema`, and `DonationCategory` from `@/lib/schema/donation`.
  - Added reactive `onSnapshot` listener to `collection(db, "donations")` with Zod parsing and sorting by `dateDonated`.
  - Added `DONATION_CATEGORY_LABELS` mapping all 6 giving categories to styled badge colors.
- **Calculations**:
  - `totalCharitableGiving`: Total dollars disbursed to community non-profits and causes.
  - `currentYearCharitableGiving`: Giving budget disbursed within the current fiscal year.
  - `uniqueCausesCount`: Count of distinct non-profit organizations supported.
  - `availableDonationYears`: Extracted set of unique fiscal years for filtering.
  - `currentTreasuryNet`: Reconciled formula incorporating `totalCharitableGiving` outflow.
- **5-Card Treasury Metric Grid**:
  - Positioned prominently above the primary tabs for immediate visibility across all financial views.
- **Main View Navigation Tabs**:
  - `Ledger & Settlements`
  - `Member Reimbursements` (with pending claim badge)
  - `Charitable Giving` (with total disbursed badge)
- **Charitable Giving View**:
  - Direct CTA button: "Open Giving Studio" (`/admin/giving`).
  - Philanthropic KPI summary: All-Time Disbursed, Current Fiscal Year Total, Beneficiary Orgs, and Average Gift Size.
  - Cause category distribution breakdown with responsive progress bars.
  - Interactive search and category/fiscal year filter controls.
  - Master table of logged gifts detailing dates, organizations, websites, cause descriptions, categories, fiscal years, public visibility, disbursed amounts, and notes.

### 2. Help Documentation Center ([`src/app/(portal)/portal/help/page.tsx`](file:///c:/repos/eagleburgerband/src/app/(portal)/portal/help/page.tsx))
- Updated the `admin-finance` route documentation to include:
  - Description of the reconciled 5-card treasury metric grid.
  - Guidance on the dedicated Charitable Giving reporting view and philanthropic outflow tracking.
  - Usage workflows for tracking and reporting tax-exempt giving totals.

