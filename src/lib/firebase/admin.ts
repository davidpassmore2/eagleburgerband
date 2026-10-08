/**
 * Firebase Admin Authentication Deletion Utility
 * Lazily loads firebase-admin only when called at runtime on the server.
 */
export async function deleteAuthUser(uid: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { getApps, initializeApp, cert } = await import("firebase-admin/app");
    const { getAuth } = await import("firebase-admin/auth");

    let app = getApps().length > 0 ? getApps()[0] : null;

    if (!app) {
      // 1. Direct JSON service account key (e.g. Vercel environment variable or .env.local)
      const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
      if (serviceAccountKey) {
        try {
          const parsed = typeof serviceAccountKey === "string" 
            ? JSON.parse(serviceAccountKey) 
            : serviceAccountKey;

          app = initializeApp({
            credential: cert(parsed),
            projectId: parsed.project_id || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
          });
        } catch (err) {
          console.error("[Firebase Admin] Failed to parse FIREBASE_SERVICE_ACCOUNT_KEY:", err);
        }
      }

      // 2. Client Email + Private Key split environment variables
      if (!app && process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) {
        try {
          app = initializeApp({
            credential: cert({
              projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
              clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
              privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
            }),
            projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
          });
        } catch (err) {
          console.error("[Firebase Admin] Failed to initialize with split keys:", err);
        }
      }

      // 3. Local offline emulator mode
      if (!app && process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATOR === "true") {
        process.env.FIREBASE_AUTH_EMULATOR_HOST = process.env.FIREBASE_AUTH_EMULATOR_HOST || "127.0.0.1:9099";
        try {
          app = initializeApp({
            projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "eagleburger-band-dev",
          });
        } catch (err) {
          console.error("[Firebase Admin] Emulator init error:", err);
        }
      }
    }

    if (!app) {
      return { 
        success: false, 
        error: "Firebase Admin Service Account is not configured in environment. Please set FIREBASE_SERVICE_ACCOUNT_KEY." 
      };
    }

    const auth = getAuth(app);
    await auth.deleteUser(uid);
    return { success: true };
  } catch (err: unknown) {
    const e = err as { code?: string; message?: string };
    // If user already not found in Auth, count as successful removal
    if (e.code === "auth/user-not-found") {
      return { success: true };
    }
    console.error(`[Firebase Admin] Failed to delete user ${uid} from Auth:`, err);
    return { success: false, error: e.message || "Failed to delete user from Firebase Auth." };
  }
}
