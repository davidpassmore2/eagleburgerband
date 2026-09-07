import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, connectAuthEmulator } from "firebase/auth";
import { getFirestore, connectFirestoreEmulator } from "firebase/firestore";
import { getStorage, connectStorageEmulator } from "firebase/storage";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "local-api-key",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "localhost",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "eagleburger-band-dev",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "eagleburger-band-dev.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef",
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

let isEmulated = false;

if (typeof window !== "undefined" && process.env.NODE_ENV === "development") {
  if (!isEmulated) {
    connectAuthEmulator(auth, "http://localhost:9099", { disableWarnings: true });
    connectFirestoreEmulator(db, "localhost", 8080);
    connectStorageEmulator(storage, "localhost", 9199);
    isEmulated = true;
  }
}

export { app, auth, db, storage };