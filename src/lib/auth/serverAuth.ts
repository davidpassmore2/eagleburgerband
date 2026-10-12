import { NextRequest, NextResponse } from "next/server";
import { firebaseProjectId, isFirebaseEmulator } from "@/lib/firebase/emulator";
import { getDocument } from "@/lib/firebase/serverFirestore";
import { SUPER_ADMIN_EMAIL } from "@/lib/auth/superAdmin";
import { Role } from "@/lib/auth/permissions";

export interface VerifiedCaller {
  uid: string;
  email: string;
  displayName: string;
  roles: Role[];
}

interface LookedUpAccount {
  localId: string;
  email?: string;
  emailVerified?: boolean;
  disabled?: boolean;
}

function tokenClaims(idToken: string): Record<string, unknown> | null {
  try {
    return JSON.parse(Buffer.from(idToken.split(".")[1], "base64url").toString("utf8"));
  } catch {
    return null;
  }
}

async function lookupAccount(idToken: string): Promise<LookedUpAccount | null> {
  const host = isFirebaseEmulator()
    ? `http://${process.env.FIREBASE_AUTH_EMULATOR_HOST || "127.0.0.1:9099"}/identitytoolkit.googleapis.com`
    : "https://identitytoolkit.googleapis.com";
  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "local-api-key";
  const res = await fetch(`${host}/v1/accounts:lookup?key=${encodeURIComponent(apiKey)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ idToken }),
  });
  if (!res.ok) return null;
  const data = (await res.json()) as { users?: LookedUpAccount[] };
  return data.users?.[0] ?? null;
}

export async function getVerifiedCaller(req: NextRequest): Promise<VerifiedCaller | null> {
  const header = req.headers.get("authorization") || "";
  const idToken = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
  if (!idToken) return null;

  const account = await lookupAccount(idToken);
  if (!account || account.disabled) return null;

  const claims = tokenClaims(idToken);
  if (
    !claims ||
    claims.aud !== firebaseProjectId ||
    claims.iss !== `https://securetoken.google.com/${firebaseProjectId}` ||
    claims.sub !== account.localId
  ) {
    return null;
  }

  const profile = (await getDocument(`users/${account.localId}`))?.data ?? {};
  const roles = new Set<Role>(Array.isArray(profile.roles) ? (profile.roles as Role[]) : []);
  if (profile.role === "admin") roles.add("admin");
  if (account.emailVerified && account.email?.toLowerCase() === SUPER_ADMIN_EMAIL) roles.add("admin");

  return {
    uid: account.localId,
    email: (typeof profile.email === "string" && profile.email) || account.email || "",
    displayName: typeof profile.displayName === "string" ? profile.displayName : "",
    roles: [...roles],
  };
}

/**
 * Returns the verified caller when they hold one of `allowedRoles` (admins always pass),
 * otherwise the 401/403 response the route should return.
 */
export async function requireCaller(
  req: NextRequest,
  allowedRoles: Role[],
  deniedMessage = "You don't have permission to do this."
): Promise<VerifiedCaller | NextResponse> {
  const caller = await getVerifiedCaller(req);
  if (!caller) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }
  if (!caller.roles.includes("admin") && !allowedRoles.some((role) => caller.roles.includes(role))) {
    return NextResponse.json({ error: deniedMessage }, { status: 403 });
  }
  return caller;
}
