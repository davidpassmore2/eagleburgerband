# Stage 38 Walkthrough: Gig Compensation Models & Financial Transparency

## Overview
Stage 38 resolves the ambiguity in gig financial compensation by providing explicit support for the three core operational models of the Eagleburger Band:
1. **Community / Civic ($0 intake, $0 musician payout)**
2. **100% Band Fund ($X client fee directly builds the band treasury, $0 individual payout)**
3. **Individual Payout ($X / musician payout, with optional total fee / band cut tracking)**

---

## Key Changes Walkthrough

### 1. Schema Invariance & Type Safety
- **`src/lib/schema/gig.ts`**:
  - `GigCompensationTypeEnum` defines `"community" | "band_fund" | "individual"`.
  - `GigFinancialsSchema` specifies `totalFee`, `compensationType`, `settlementType`, `bandFundCut`, `fixedPerformerAmount`, `payouts`, and `notes`.
  - `InternalLogisticsSchema` includes `compensationType`, `compensation`, and `parkingNotes`.
- **`src/lib/logistics/diff.ts`**:
  - Tracks diffs on `compensationType` changes during gig logistics updates.

### 2. Gig Management Studio (`/admin/gigs`)
- **Interactive 3-Way Segmented Control**:
  - When creating or editing a gig, managers pick between **Community**, **Band Fund**, or **Individual**.
  - Selecting **Community** sets payout to $0 and informs that it is a civic/volunteer event.
  - Selecting **Band Fund** sets payout to $0 and exposes the total client fee directed to the treasury.
  - Selecting **Individual** allows defining the per-musician payout ($) and optional total event fee ($).
- **Gig Cards**:
  - Each gig card now displays a badge:
    - 🤝 `Community (Volunteer / $0 intake)` (Sky Blue)
    - 🏛️ `100% to Band Fund ($X fee)` (Amber)
    - 💵 `Individual ($X / musician)` (Emerald)

### 3. Musician Call Sheet Detail View (`/portal/gigs/[gigId]`)
- Replaced the old `"Volunteer / Band Fund"` fallback with a dedicated, contextual card:
  - Clear icon and model tag in the top right.
  - Explanatory copy breaking down why members are volunteering (Community), how client fees support the group (Band Fund), or what each musician can expect to take home (Individual).

### 4. Musician Gigs Schedule (`/portal/gigs`)
- Quick-scan compensation badges are rendered on all cards in the list view, letting musicians know the financial structure before submitting their RSVPs.

### 5. Financial Ledger Modal (`GigFinanceModal.tsx`)
- Updated settlement types to include `community`, synchronizing changes back to `internalLogistics.compensationType` and `financials.compensationType`.

### 6. Realistic Seed Data (`scripts/seed.ts`)
- Seeded gigs showcase all 3 models:
  - *Bloomfield Carnival* & *Lawrenceville Porchfest* -> Community
  - *Three Rivers Arts Festival* -> 100% Band Fund
  - *Mattress Factory*, *St. Patrick's Parade*, & *Millvale Days* -> Individual Payouts

---

## Verification Results
- **TypeScript**: `npx tsc --noEmit` passed with 0 errors.
- **ESLint**: `npm run lint` passed with 0 errors and 0 warnings.

