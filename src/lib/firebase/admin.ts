import crypto from "node:crypto";

interface ServiceAccountCredentials {
  client_email: string;
  private_key: string;
  project_id?: string;
}

function getServiceAccountCredentials(): ServiceAccountCredentials | null {
  const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (serviceAccountKey) {
    try {
      const parsed = typeof serviceAccountKey === "string" 
        ? JSON.parse(serviceAccountKey) 
        : serviceAccountKey;
      if (parsed.client_email && parsed.private_key) {
        return {
          client_email: parsed.client_email,
          private_key: parsed.private_key,
          project_id: parsed.project_id,
        };
      }
    } catch (err) {
      console.error("[deleteAuthUser] Failed to parse FIREBASE_SERVICE_ACCOUNT_KEY:", err);
    }
  }

  if (process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) {
    return {
      client_email: process.env.FIREBASE_CLIENT_EMAIL,
      private_key: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
      project_id: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    };
  }

  return null;
}

async function getGoogleAccessToken(creds: ServiceAccountCredentials): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const header = Buffer.from(JSON.stringify({ alg: "RS256", typ: "JWT" })).toString("base64url");
  const payload = Buffer.from(
    JSON.stringify({
      iss: creds.client_email,
      scope: "https://www.googleapis.com/auth/identitytoolkit https://www.googleapis.com/auth/firebase",
      aud: "https://oauth2.googleapis.com/token",
      exp: now + 3600,
      iat: now,
    })
  ).toString("base64url");

  const sign = crypto.createSign("RSA-SHA256");
  sign.update(`${header}.${payload}`);
  const signature = sign.sign(creds.private_key, "base64url");
  const jwt = `${header}.${payload}.${signature}`;

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Google OAuth2 token exchange failed (${res.status}): ${errText}`);
  }

  const data = (await res.json()) as { access_token: string };
  return data.access_token;
}

/**
 * Permanently delete a user account from Firebase Authentication.
 * Uses native node:crypto and Google Identity Toolkit REST API directly.
 * Bypasses firebase-admin/jwks-rsa/jose CommonJS/ESM bundling conflicts on Vercel.
 */
export async function deleteAuthUser(uid: string): Promise<{ success: boolean; error?: string }> {
  try {
    // 1. Emulator mode fallback
    if (process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATOR === "true") {
      const emulatorHost = process.env.FIREBASE_AUTH_EMULATOR_HOST || "127.0.0.1:9099";
      const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "eagleburger-band-dev";
      const emuUrl = `http://${emulatorHost}/identitytoolkit.googleapis.com/v1/projects/${projectId}/accounts:delete`;
      const res = await fetch(emuUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ localId: uid }),
      });
      if (res.ok || res.status === 404) return { success: true };
      const errData = await res.text();
      return { success: false, error: errData };
    }

    // 2. Production / Cloud mode using Service Account
    const creds = getServiceAccountCredentials();
    if (!creds) {
      return {
        success: false,
        error: "Firebase Service Account key not configured in environment (set FIREBASE_SERVICE_ACCOUNT_KEY in Vercel to allow authentication deletions).",
      };
    }

    const accessToken = await getGoogleAccessToken(creds);
    const deleteUrl = "https://identitytoolkit.googleapis.com/v1/accounts:delete";

    const res = await fetch(deleteUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ localId: uid }),
    });

    if (res.ok) {
      return { success: true };
    }

    const errData = (await res.json()) as { error?: { message?: string } };
    const errMsg = errData.error?.message || "Failed to delete user";

    if (errMsg.includes("USER_NOT_FOUND")) {
      return { success: true };
    }

    return { success: false, error: errMsg };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[deleteAuthUser] Error deleting user from Firebase Auth:", message);
    return { success: false, error: message };
  }
}
