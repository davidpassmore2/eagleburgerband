<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

# Agent Instructions & Project Rules

1. **Branch Model:** Feature branches branch off and merge into `next-trunk`.
2. **Schema Invariance:** Never mutate Firestore directly without defining or updating the corresponding Zod schema in `src/lib/schema/` with safe `.default()` values.
3. **RBAC Guardrails:** Portal routes and operations must respect role permissions (`admin`, `web_manager`, `gig_manager`, `catalog_manager`, `community_manager`, `treasurer`, `section_leader`, `member`, `guest`).
4. **Sanitization:** Raw HTML/Markdown must pass through `isomorphic-dompurify` or `rehype-sanitize`. Never use un-sanitized `dangerouslySetInnerHTML`.

<!-- END:nextjs-agent-rules -->
