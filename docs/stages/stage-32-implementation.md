# Stage 32: PWA Install Suite, Collapsible/Pinnable Admin Sidebar & Real Super Admin Account Migration Implementation Plan

## Overview
Stage 32 addresses three key requirements:
1. **PWA Install Banner**: Prompt for mobile and desktop musician portal installation with Chromium native install events and iOS Safari guidance.
2. **Collapsible & Pinnable Portal Sidebar Menu**: Toggleable sidebar navigation with smooth slide-in/out animations, collapse controls, and persistent **Pin Open** state in `localStorage`.
3. **Real User Account Migration & Super Admin David Passmore**: Decommission fake persistent dev admin auto-login logic and establish the official Super Admin account for **David Passmore** (`davidpassmore@gmail.com`) with initial password `admin39`, granting immediate access to all 8 operational clearances and seamless forward compatibility with Google OAuth.

---

## Technical Architecture

### 1. PWA Install Suite ([`src/components/common/PwaInstallBanner.tsx`](file:///c:/repos/eagleburgerband/src/components/common/PwaInstallBanner.tsx))
- **Native Prompt Interception**: Captures `beforeinstallprompt` event and presents a styled banner on Android/Chrome/Edge.
- **iOS Safari Guide**: Detects iOS standalone mode and displays step-by-step instructions for adding the app to the home screen.
- **Dismissal Cooldown**: Dismissing the banner records a 7-day suppression timer in `localStorage` (`ebb_pwa_dismissed_until`).
- **Hydration Safe**: Uses `useSyncExternalStore` for standalone and iOS detection.

### 2. Collapsible & Pinnable Sidebar Navigation ([`src/app/(portal)/layout.tsx`](file:///c:/repos/eagleburgerband/src/app/(portal)/layout.tsx))
- **Persistent Pin Mode**: Stores pinned state in `localStorage` (`ebb_sidebar_pinned`).
- **Desktop Docked Mode**: When pinned, the sidebar is a fixed 64px width dock. Clicking `PinOff` unpins the sidebar and auto-collapses it.
- **Desktop Drawer Mode**: When unpinned, the sidebar slides off-screen. A floating navigation trigger appears in the header (`PanelLeftOpen`), sliding the menu into view over a subtle backdrop scrim. Clicking `Pin` locks it open again.
- **Mobile Drawer Mode**: Top mobile bar with hamburger toggle (`Menu`/`X`) sliding out an off-canvas drawer.

### 3. Super Admin Account & Real User Migration ([`src/lib/context/AuthContext.tsx`](file:///c:/repos/eagleburgerband/src/lib/context/AuthContext.tsx), [`scripts/seed.ts`](file:///c:/repos/eagleburgerband/scripts/seed.ts))
- **Super Admin Credentials**:
  - Email: `davidpassmore@gmail.com`
  - Initial Password: `admin39`
  - Display Name: `David Passmore`
  - Roles: `["admin", "web_manager", "gig_manager", "catalog_manager", "community_manager", "treasurer", "section_leader", "member"]`
  - Section: `percussion` (Section Leader)
- **Auto-Provisioning & Resilience**:
  - `signInWithPassword`: If `davidpassmore@gmail.com` with `admin39` is entered and the account is not yet initialized in Firebase Auth, it auto-provisions the user account.
  - `onAuthStateChanged`: Ensures the user's Firestore document is populated with all super admin roles, whether logged in via password or Google Auth.
  - Decommissioned old fake dev fallback where any unauthenticated or empty user was given dev admin privileges.

