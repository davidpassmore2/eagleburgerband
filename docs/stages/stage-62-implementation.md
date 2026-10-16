# Stage 62: Multi-Provider OAuth Authentication & Authentication Providers Studio

## Overview & Scope

Stage 62 expands external identity provider authentication across the Eagleburger Band platform, enabling musicians, leadership, and onboarding invitees to authenticate using **Google**, **Apple**, **Microsoft**, or **GitHub**, while providing Band Administrators with complete control over which authentication methods appear on public login and onboarding screens.

Key achievements:
1. **Authentication Providers Studio (`/admin/auth-providers`):**
   - Built an administrative control center located under **Business & Admin** restricted strictly to the `admin` role.
   - Includes real-time toggles for all 6 authentication methods:
     - Google OAuth
     - Apple Sign In
     - Microsoft Entra / Personal
     - GitHub OAuth
     - Passwordless Magic Link (Email)
     - Password Authentication (Email)
   - **Lockout Prevention Guardrail:** Prevents admins from accidentally disabling all authentication methods (at least 1 method must remain active).
   - **Live Preview Simulation:** Real-time preview card demonstrates exactly how the login card will render to musicians.
   - **OAuth Setup Guide:** Direct step-by-step accordion instructions for configuring Apple Developer, Azure App Registrations, and GitHub OAuth Apps with the exact Firebase callback URL:
     `https://eagleburger-band-beta.firebaseapp.com/__/auth/handler`.
   - **Admin Audit Trail:** Automatically writes configuration updates to `admin_audit_log`.

2. **Schema & Firestore Security Rules:**
   - Defined `AuthProvidersConfigSchema` in [`src/lib/schema/authProvidersConfig.ts`](file:///c:/repos/eagleburgerband/src/lib/schema/authProvidersConfig.ts) with safe `.default()` values:
     - `google: true`, `magicLink: true`, `password: true` (existing working flow preserved)
     - `apple: false`, `microsoft: false`, `github: false` (disabled by default until configured and toggled on)
   - Integrated into `SystemConfigDocumentSchema` in [`src/lib/schema/systemConfig.ts`](file:///c:/repos/eagleburgerband/src/lib/schema/systemConfig.ts).
   - Delegated security rule updates via the `firestore-rules-author` subagent in [`firestore.rules`](file:///c:/repos/eagleburgerband/firestore.rules):
     - `match /system_config/{configId}` allows public read if `configId == 'auth_providers'`, allowing unauthenticated visitors on `/login` and `/claim` to render only enabled methods.
     - Write permissions remain strictly restricted to `isAdmin()`.

3. **Dynamic Login Screen (`/login`):**
   - Listens to real-time provider configuration via `useAuthProvidersConfig`.
   - Conditionally renders social buttons based on active providers (`google`, `apple`, `microsoft`, `github`).
   - Automatically adapts grid layout: single column if only 1 social provider is active, 2 columns if multiple, hides the social card and divider entirely if none are active.
   - Adapts email section: if both Magic Link and Password are enabled, renders the tab switcher; if only one is enabled, hides the tab switcher and renders that method directly.
   - Automatically syncs active tab state if an admin disables the currently selected tab.

4. **Dynamic Onboarding Claim Screen (`/claim`):**
   - Listens to real-time provider configuration via `useAuthProvidersConfig`.
   - Conditionally renders enabled social claim buttons.
   - Conditionally renders or hides the email/password fallback option based on `config.password`.
   - Automatically defaults to password mode if no social providers are enabled.
   - Enforces strict email verification matching before claiming roster spots.

5. **Hardened OAuth Providers in AuthContext:**
   - [`src/lib/context/AuthContext.tsx`](file:///c:/repos/eagleburgerband/src/lib/context/AuthContext.tsx):
     - **Apple (`apple.com`):** Configured `OAuthProvider` with `email` and `name` scopes and English locale.
     - **Microsoft (`microsoft.com`):** Configured `OAuthProvider` with `select_account` prompt and multi-tenant `tenant: "common"` (supporting personal Outlook/Hotmail/Xbox and Microsoft 365 accounts).
     - **GitHub (`github.com`):** Configured `GithubAuthProvider` requesting `read:user` and `user:email` scopes to resolve primary emails even when set to private.

---

## 1. Provider Setup Details

### Callback URL
All third-party consoles must whitelist the authorized Firebase authentication redirect handler:
`https://eagleburger-band-beta.firebaseapp.com/__/auth/handler`

### Apple (`apple.com`)
- **Required Console Credentials:**
  - Services ID (configured in Apple Developer Portal under Identifiers > Services IDs)
  - Apple Developer Team ID (10-character alphanumeric ID)
  - Key ID (associated with the "Sign In with Apple" private key)
  - Private Key (`.p8` file uploaded to Firebase Console)

### Microsoft (`microsoft.com`)
- **Azure App Registration:**
  - Supported Account Types: Multi-tenant & personal Microsoft accounts (`common`)
  - Redirect URI: Web -> `https://eagleburger-band-beta.firebaseapp.com/__/auth/handler`
- **Required Console Credentials:**
  - Application (client) ID
  - Client Secret (Value from Azure Certificates & Secrets)

### GitHub (`github.com`)
- **GitHub Developer Settings:**
  - Register new OAuth App at `https://github.com/settings/developers`
  - Homepage URL: `https://beta.eagleburgerband.com`
  - Authorization callback URL: `https://eagleburger-band-beta.firebaseapp.com/__/auth/handler`
- **Required Console Credentials:**
  - Client ID
  - Client Secret

---

## 2. Code Changes Summary

- **[`firestore.rules`](file:///c:/repos/eagleburgerband/firestore.rules):** Allowed public read on `system_config/auth_providers`; admin write.
- **[`src/lib/schema/authProvidersConfig.ts`](file:///c:/repos/eagleburgerband/src/lib/schema/authProvidersConfig.ts):** Defined Zod schema and defaults for auth method configuration.
- **[`src/lib/schema/systemConfig.ts`](file:///c:/repos/eagleburgerband/src/lib/schema/systemConfig.ts):** Registered `authProviders` in `SystemConfigDocumentSchema`.
- **[`src/lib/hooks/useAuthProvidersConfig.ts`](file:///c:/repos/eagleburgerband/src/lib/hooks/useAuthProvidersConfig.ts):** Real-time subscription hook and admin mutation helper with audit logging.
- **[`src/lib/portal/workspaceRegistry.ts`](file:///c:/repos/eagleburgerband/src/lib/portal/workspaceRegistry.ts):** Registered `auth-providers` workspace tool for `admin` role under "Business & Admin".
- **[`src/lib/portal/portalSections.ts`](file:///c:/repos/eagleburgerband/src/lib/portal/portalSections.ts):** Added Authentication Providers card to Business & Admin section.
- **[`src/app/(portal)/admin/auth-providers/page.tsx`](file:///c:/repos/eagleburgerband/src/app/(portal)/admin/auth-providers/page.tsx):** Admin Studio with breadcrumbs, toggles, lockout check, live preview, and OAuth guide.
- **[`src/app/(public)/login/page.tsx`](file:///c:/repos/eagleburgerband/src/app/(public)/login/page.tsx):** Dynamic button and tab rendering driven by `useAuthProvidersConfig`.
- **[`src/app/(public)/claim/page.tsx`](file:///c:/repos/eagleburgerband/src/app/(public)/claim/page.tsx):** Dynamic claim button and password fallback driven by `useAuthProvidersConfig`.
- **[`src/lib/context/AuthContext.tsx`](file:///c:/repos/eagleburgerband/src/lib/context/AuthContext.tsx):** Hardened OAuth provider parameters for Apple, Microsoft, and GitHub.
