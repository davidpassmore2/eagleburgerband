export const firebaseProjectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "eagleburger-band-dev";

export function isFirebaseEmulator(): boolean {
  return (
    process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATOR === "true" ||
    (process.env.NODE_ENV === "development" &&
      process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATOR !== "false" &&
      (!process.env.NEXT_PUBLIC_FIREBASE_API_KEY || process.env.NEXT_PUBLIC_FIREBASE_API_KEY === "local-api-key"))
  );
}
