import { redirect } from "next/navigation";

/**
 * Route alias: /portal/suggestions → /admin/suggestions
 *
 * The canonical Suggestions triage workstation lives under /admin/suggestions
 * and is accessible to all roles (member and above) via workspaceRegistry.
 * This redirect ensures that any user or link pointing to /portal/suggestions
 * lands on the correct destination without a 404 catch-all.
 */
export default function PortalSuggestionsRedirect() {
  redirect("/admin/suggestions");
}

