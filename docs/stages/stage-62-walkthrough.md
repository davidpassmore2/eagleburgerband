# Stage 62: Verification Walkthrough & Testing Guide

This guide walks through verifying the Stage 62 Authentication Providers Studio, dynamic login screen toggling, and multi-provider external authentication (Google, Apple, Microsoft, GitHub, Magic Link, Password).

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
   - **Toggles Card:** Inspect the 6 method toggles:
     - Google OAuth
     - Apple Sign In
     - Microsoft Entra / Personal
     - GitHub OAuth
     - Passwordless Magic Link
     - Password Authentication
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
   - If an invite is issued to `musician@example.com`, signing in with an external account whose email is `other@example.com` triggers a clear mismatch warning preventing unauthorized spot claiming:
     *"Email address mismatch: You signed in with [Provider] as 'other@example.com', but this invitation was issued to 'musician@example.com'."*
