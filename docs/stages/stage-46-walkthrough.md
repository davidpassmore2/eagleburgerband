# Stage 46 Walkthrough: Multi-Environment Architecture & Cloud Beta Migration

## Overview
Stage 46 established a multi-environment configuration separating local emulator-based development (`dev`) from a live Google Cloud Firebase environment (`beta` at `eagleburger-band-beta`) tailored for band member acceptance testing, in preparation for eventual production deployment (`prod`).

---

## Changes Implemented

### 1. Multi-Project Aliasing & Environment Configuration
- Added the `"beta": "eagleburger-band-beta"` alias to [`.firebaserc`](file:///c:/repos/eagleburgerband/.firebaserc).
- Documented environment variables and `NEXT_PUBLIC_USE_FIREBASE_EMULATOR` flags in [`.env.example`](file:///c:/repos/eagleburgerband/.env.example).
- Configured [`.env.beta`](file:///c:/repos/eagleburgerband/.env.beta) with live beta credentials.
- Updated [`src/lib/firebase/client.ts`](file:///c:/repos/eagleburgerband/src/lib/firebase/client.ts) to support explicit cloud connection toggling and safe storage fallbacks.

### 2. Cloud Beta Provisioning Script
- Implemented [`scripts/seed-beta.ts`](file:///c:/repos/eagleburgerband/scripts/seed-beta.ts) and added `"seed:beta"` to [`package.json`](file:///c:/repos/eagleburgerband/package.json).
- Supports both interactive password prompts and inline argument passing (`npm run seed:beta -- <password>`).
- Successfully authenticated Super Admin (`davidpassmore@gmail.com` with UID `6YsnQAfYJtceFgjeAIRfCX0flxd2`).
- Seeded 10 collections adhering to all Zod schemas:
  - `users`: Super Admin profile with all 9 administrative roles.
  - `sections`: 6 core band sections.
  - `theme/config`: Dynamic v2 public & portal themes.
  - `site_navigation/config`: Global navigation schema and active banner.
  - `content_pages`: 7 system CMS pages.
  - `resources`: 8 media assets.
  - `portal_metrics_config/global`: Usage analytics capture configuration.
  - `tunes`: 9 canonical repertoire charts.
  - `setlists`: 3 master templates + 3 stage setlists.
  - `gigs`: 3 initial verification gigs with call sheets, setlists, and RSVPs.

### 3. Vercel Hosting & Google Sign-In Integration
- Deployed Next.js application to Vercel connected to custom domain **`beta.eagleburgerband.com`**.
- Configured public client environment variables (`NEXT_PUBLIC_FIREBASE_*`) in Vercel.
- Whitelisted `beta.eagleburgerband.com` under Firebase Authentication Authorized Domains.
- Enabled Google Sign-In provider in Firebase Authentication with project support email.
- Added cross-platform environment switching scripts in `package.json`:
  - `npm run env:beta`: Switches `.env.local` to live cloud Firebase.
  - `npm run env:dev`: Switches `.env.local` back to local emulators.

---

## Verification Results
- **TypeScript:** `npx tsc --noEmit` exited with 0.
- **Lint:** `npm run lint` exited with 0 (0 warnings, 0 errors).
- **Seed Execution:** `npm run seed:beta` successfully connected and seeded all 10 collections into `eagleburger-band-beta`.
- **Production Build:** `npm run build` compiled all 64 static/dynamic routes in 11.8s.
- **Live Deployment:** Successfully authenticated Super Admin (`davidpassmore@gmail.com`) via Google Sign-In at `https://beta.eagleburgerband.com`.

---

## How to Test
1. **Live Cloud Beta:**
   - Navigate to `https://beta.eagleburgerband.com/login`.
   - Sign in via Google or Email/Password to test call sheets, repertoire charts, and roster management.
2. **Running Against Cloud Beta Locally:**
   - Run `npm run env:beta` to point `.env.local` to cloud Firebase.
   - Run `npm run dev` to test locally against live cloud data.
3. **Switching to Offline Development:**
   - Run `npm run env:dev` to point `.env.local` back to emulators.
   - Run `npm run emulators` and `npm run dev`.
4. **Re-seeding Beta Anytime:**
   - Execute `npm run seed:beta` from PowerShell whenever baseline data needs to be restored or updated.

