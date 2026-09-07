# Architecture Overview

- **Framework:** Next.js (App Router, React 19, TypeScript)
- **Deployment:** Vercel (Production apex domain + beta subdomain on `next-trunk`)
- **Backend & Auth:** Google Cloud Firebase (Auth, Cloud Firestore, Storage)
- **State & Evolution:** Contract-First Zod validation with document `schemaVersion`
- **Component Primitives:** Tailwind CSS + Radix UI (shadcn/ui style)
- **Client App Model:** Progressive Web App (PWA) with offline caching