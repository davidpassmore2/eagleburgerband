# Stage 38: Gig Compensation Models & Financial Transparency Suite

## 1. Overview & Business Rationale
In previous iterations, gig compensation was stored primarily as a single flat number (`compensation` or `payPerMusician`). When set to `0`, portal views displayed ambiguous fallback text like `"Volunteer / Band Fund"`. This obscured critical business distinctions for Eagleburger Band performances:
1. **`community`**: Civic events, porchfests, and community parades with **$0 client intake** and **$0 musician payout**. Band members volunteer their sound and energy for civic causes.
2. **`band_fund`**: Gigs where **100% of the client fee proceeds** are directed to the Band Treasury to fund equipment, recording, insurance, sheet music, and tour travel (**$0 individual payout**).
3. **`individual`**: Contracted performances where the client fee is divided among participating musicians (**$X / musician payout**, with optional band fund retention).

Stage 38 establishes schema invariance, transparent UI controls, and unambiguous call sheet presentation across all portals.

---

## 2. Technical Architecture & Schema Invariance

### A. Firestore Schema Definitions (`src/lib/schema/gig.ts`)
- **`GigCompensationTypeEnum`**: Defined as `z.enum(["community", "band_fund", "individual"])`.
- **`PerformerPayoutRecordSchema`**: Validates individual payout states (`amount`, `paymentStatus`, `paymentMethod`, `paidAt`).
- **`GigFinancialsSchema`**: Standardizes the gig ledger with `totalFee`, `compensationType`, `settlementType`, `bandFundCut`, `fixedPerformerAmount`, `payouts`, and `notes`.
- **`InternalLogisticsSchema`**:
  - `compensationType: GigCompensationTypeEnum.default("community")`
  - `compensation: z.number().default(0)`
  - `parkingNotes: z.string().default("")`
- **`GigSchema`**: Formally includes `financials: GigFinancialsSchema`.

### B. Logistics Diff Tracking (`src/lib/logistics/diff.ts`)
- Added `compensationType` to `LogisticsFields` and `FIELD_LABELS` so administrative changes to the compensation model trigger automated logistics audit entries and notifications.

---

## 3. UI/UX Implementations

### A. Gig Logistics Edit Modal (`src/components/portal/EditGigLogisticsModal.tsx`)
- Integrated 3-way segmented button selector (`Community`, `Band Fund`, `Individual`) with distinct icons (`Heart`, `Landmark`, `DollarSign`).
- Dynamic informational banners:
  - **Community**: Informs user of $0 client intake / volunteer revelry.
  - **Band Fund**: Informs user of 100% treasury allocation.
  - **Individual**: Exposes musician payout input ($/musician).

### B. Gig Management Studio (`src/app/(portal)/admin/gigs/page.tsx`)
- **Create Performance Form**: Added segmented 3-way selector with contextual inputs for `totalFee` and `compensation`.
- **Edit Performance Modal**: Added matching segmented 3-way selector and contextual inputs.
- **Gig Cards in Admin Grid**: Displays prominent, color-coded compensation badges:
  - `🤝 Community (Volunteer / $0 intake)`
  - `🏛️ 100% to Band Fund ($X fee)`
  - `💵 Individual ($X / musician)`

### C. Musician Call Sheet Detail View (`src/app/(portal)/portal/gigs/[gigId]/page.tsx`)
- Replaced ambiguous `"Volunteer / Band Fund"` text with structured, explicit cards explaining exactly which compensation model applies, total client fee (if applicable), and estimated per-musician payouts.

### D. Musician Gigs Schedule (`src/app/(portal)/portal/gigs/page.tsx`)
- Rendered compensation model badges directly on each gig card header so roster musicians can evaluate compensation transparency before RSVPing.

### E. Financial Ledger Modal (`src/components/portal/GigFinanceModal.tsx`)
- Extended `settlementType` with `"community"`, synchronizing `compensationType` across both `financials` and `internalLogistics`.

---

## 4. Seed Data Synchronization (`scripts/seed.ts`)
All seeded performances now reflect explicit compensation models:
- **`gig_mattress_factory_2026`**: `individual` (\$65/musician, \$1,400 total fee, \$200 band cut)
- **`gig_bloomfield_2028`**: `community` (\$0 intake, \$0 musician payout, civic volunteer carnival)
- **`gig_st_patricks_2026`**: `individual` (\$200/musician, \$3,500 total fee, \$500 band cut)
- **`gig_lawrenceville_porchfest_2026`**: `community` (\$0 intake, \$0 musician payout, volunteer stoop crawl)
- **`gig_three_rivers_arts_2026`**: `band_fund` (100% to band fund, \$2,200 total fee, \$0 individual payout)
- **`gig_millvale_days_2026`**: `individual` (\$85/musician, \$1,500 total fee, \$250 band cut)

---

## 5. Suggestions Feature Hardening

### A. Seed Data Synchronization (`scripts/seed.ts`)

All 4 seeded suggestion objects now strictly use `SuggestionSchema` field names:

| Old (legacy) field      | New (schema-correct) field                      |
|-------------------------|-------------------------------------------------|
| `songTitle`             | `title`                                         |
| `pitchNotes`            | `description`                                   |
| `submittedByUid`        | `authorUid`                                     |
| `submittedByName`       | `authorName`                                    |
| `spotifyOrYoutubeUrl`   | `referenceUrl`                                  |
| `voters[]`              | `upvoteUids[]`                                  |
| `votesCount`            | _(removed — derived from `upvoteUids.length`)_  |

Added schema-required fields: `category`, `downvoteUids`, `targetRole`, `adminNotes`, `reviewedByUid`, `reviewedByName`, `reviewedAt`, `updatedAt`.

### B. Route Alias for `/portal/suggestions` (`src/app/(portal)/portal/suggestions/page.tsx`)

Previously, navigating to `/portal/suggestions` hit the catch-all 404 page. A new server component using Next.js `redirect()` now sends users straight to `/admin/suggestions`, the canonical triage workstation accessible to all roles from `member` upward (per `workspaceRegistry`).

### C. "Pitch a Tune" Quick-Action in Music Library (`src/app/(portal)/portal/library/page.tsx`)

Added a **Pitch a Tune** button in the Repertoire Catalog header:
- Visible to **all authenticated users** (not gated by `canManage`)
- Links to `/admin/suggestions?category=tune_request`
- Styled with a `Lightbulb` icon to suggest inspiration/ideas
- Placed between the search bar and the manager-only "Add New Chart" button

### D. Dual Catalog Write Pattern Documentation

The codebase intentionally writes to both `songs` and `tunes` Firestore collections simultaneously (`portal/library/page.tsx` lines ~366–369 and ~387–388). This dual-write maintains backwards compatibility. The canonical collection is `tunes`.

> **Future work:** consolidate reads and writes onto `tunes` only and deprecate the `songs` mirror once all consumers have been audited.

---

## 6. Quality Gate Results

| Gate | Result |
|------|--------|
| `npx tsc --noEmit` | ✅ 0 errors |
| `npm run lint` | ✅ 0 errors |
| `npm run build` | ✅ 61/61 routes compiled |
