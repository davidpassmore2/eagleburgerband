"use client";

import React, { createContext, useContext, useEffect, useState, useSyncExternalStore } from "react";
import { 
  User as FirebaseUser, 
  onAuthStateChanged, 
  signInWithEmailAndPassword, 
  signInAnonymously, 
  signInWithPopup,
  GoogleAuthProvider,
  signOut as firebaseSignOut 
} from "firebase/auth";
import { 
  doc, 
  setDoc, 
  onSnapshot 
} from "firebase/firestore";
import { auth, db } from "@/lib/firebase/client";
import { User } from "@/lib/schema/user";
import { Role } from "@/lib/auth/permissions";

interface AuthContextValue {
  firebaseUser: FirebaseUser | null;
  user: FirebaseUser | null;
  profile: User | null;
  realProfile: User | null;
  loading: boolean;
  isAdmin: boolean;
  isRealAdmin: boolean;
  isEmulating: boolean;
  emulatedRoles: Role[] | null;
  setEmulatedRoles: (roles: Role[] | null) => void;
  clearEmulation: () => void;
  signInWithGoogle: () => Promise<void>;
  signInWithDevAccount: (targetRoles?: Role[]) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  firebaseUser: null,
  user: null,
  profile: null,
  realProfile: null,
  loading: true,
  isAdmin: false,
  isRealAdmin: false,
  isEmulating: false,
  emulatedRoles: null,
  setEmulatedRoles: () => {},
  clearEmulation: () => {},
  signInWithGoogle: async () => {},
  signInWithDevAccount: async () => {},
  signOut: async () => {},
});

const DEFAULT_DEV_ROLES: Role[] = [
  "admin", 
  "gig_manager", 
  "catalog_manager", 
  "web_manager", 
  "treasurer", 
  "section_leader"
];

// External store for hydration-safe and effect-free emulated roles
let cachedRawRoles: string | null = null;
let cachedRoles: Role[] | null = null;

function getEmulatedRolesSnapshot(): Role[] | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem("ebb_emulated_roles");
    if (raw === cachedRawRoles) return cachedRoles;
    cachedRawRoles = raw;
    if (!raw) {
      cachedRoles = null;
    } else {
      const parsed = JSON.parse(raw);
      cachedRoles = Array.isArray(parsed) && parsed.length > 0 ? (parsed as Role[]) : null;
    }
    return cachedRoles;
  } catch {
    return null;
  }
}

function getServerSnapshot(): Role[] | null {
  return null;
}

const emulationListeners = new Set<() => void>();

function subscribeEmulation(callback: () => void) {
  emulationListeners.add(callback);
  window.addEventListener("storage", callback);
  return () => {
    emulationListeners.delete(callback);
    window.removeEventListener("storage", callback);
  };
}

function notifyEmulationChange() {
  emulationListeners.forEach((cb) => cb());
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [rawProfile, setRawProfile] = useState<User | null>(null);
  const emulatedRoles = useSyncExternalStore(
    subscribeEmulation,
    getEmulatedRolesSnapshot,
    getServerSnapshot
  );
  const [loading, setLoading] = useState(true);

  const setEmulatedRoles = (roles: Role[] | null) => {
    try {
      if (roles && roles.length > 0) {
        sessionStorage.setItem("ebb_emulated_roles", JSON.stringify(roles));
      } else {
        sessionStorage.removeItem("ebb_emulated_roles");
      }
    } catch {
      // Ignore sessionStorage access errors
    }
    notifyEmulationChange();
  };

  const clearEmulation = () => {
    setEmulatedRoles(null);
  };

  const buildAdminProfile = (uid: string, email?: string | null): User => ({
    uid,
    email: email || "manager@eagleburger.org",
    displayName: "David Passmore Jr.",
    roles: DEFAULT_DEV_ROLES,
    sectionId: "percussion",
    instruments: ["Snare Drum"],
    portalThemeSchemeId: "eagleburger-gold",
    status: "active",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  } as unknown as User);

  const signInWithGoogle = async () => {
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (err) {
      console.error("signInWithGoogle failed:", err);
    }
  };

  const signInWithDevAccount = async (targetRoles: Role[] = DEFAULT_DEV_ROLES) => {
    try {
      let activeUser = auth.currentUser;
      if (!activeUser) {
        try {
          const cred = await signInWithEmailAndPassword(
            auth, 
            "manager@eagleburger.org", 
            "Eagleburger2026!"
          );
          activeUser = cred.user;
        } catch {
          const cred = await signInAnonymously(auth);
          activeUser = cred.user;
        }
      }

      if (!activeUser) return;

      const adminProfile = {
        uid: activeUser.uid,
        email: activeUser.email || "manager@eagleburger.org",
        displayName: "David Passmore Jr.",
        roles: targetRoles,
        sectionId: "percussion",
        instruments: ["Snare Drum"],
        portalThemeSchemeId: "eagleburger-gold",
        status: "active",
        updatedAt: new Date().toISOString(),
      };

      await setDoc(doc(db, "users", activeUser.uid), adminProfile, { merge: true });
      setRawProfile(adminProfile as unknown as User);
      setFirebaseUser(activeUser);
    } catch (err) {
      console.error("signInWithDevAccount failed:", err);
    }
  };

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      setFirebaseUser(user);

      if (!user) {
        setRawProfile(null);
        setLoading(false);
        return;
      }

      const userRef = doc(db, "users", user.uid);
      const unsubscribeProfile = onSnapshot(
        userRef, 
        async (snapshot) => {
          if (snapshot.exists()) {
            const data = snapshot.data();
            
            let resolvedRoles: Role[] = Array.isArray(data.roles) ? data.roles : [];
            if (typeof data.role === "string" && !resolvedRoles.includes(data.role as Role)) {
              resolvedRoles.push(data.role as Role);
            }
            if (resolvedRoles.length === 0) {
              resolvedRoles = ["member"];
            }

            if (
              process.env.NODE_ENV === "development" && 
              !resolvedRoles.includes("admin")
            ) {
              resolvedRoles = DEFAULT_DEV_ROLES;
              await setDoc(userRef, { roles: resolvedRoles }, { merge: true });
            }

            const currentProfile = {
              ...data,
              uid: user.uid,
              displayName: data.displayName || "David Passmore Jr.",
              email: data.email || user.email,
              roles: resolvedRoles,
              sectionId: data.sectionId || "percussion",
              instruments: data.instruments || ["Snare Drum"],
            } as unknown as User;

            setRawProfile(currentProfile);
          } else {
            const fallbackProfile = buildAdminProfile(user.uid, user.email);
            await setDoc(userRef, fallbackProfile, { merge: true });
            setRawProfile(fallbackProfile);
          }
          setLoading(false);
        },
        (error) => {
          console.error("Profile snapshot listener error:", error);
          setLoading(false);
        }
      );

      return () => unsubscribeProfile();
    });

    return () => unsubscribeAuth();
  }, []);

  const signOut = async () => {
    try {
      sessionStorage.removeItem("ebb_emulated_roles");
    } catch {
      // Ignore
    }
    setEmulatedRoles(null);
    await firebaseSignOut(auth);
    setRawProfile(null);
    setFirebaseUser(null);
  };

  const isRealAdmin = Boolean(
    rawProfile?.roles?.includes("admin") || 
    (typeof (rawProfile as unknown as Record<string, unknown>)?.role === "string" && (rawProfile as unknown as Record<string, unknown>)?.role === "admin") ||
    process.env.NODE_ENV === "development"
  );

  const isEmulating = Boolean(
    isRealAdmin &&
    emulatedRoles &&
    emulatedRoles.length > 0
  );

  const effectiveProfile: User | null = rawProfile
    ? isEmulating
      ? ({
          ...rawProfile,
          roles: emulatedRoles,
        } as unknown as User)
      : rawProfile
    : null;

  const isAdmin = Boolean(
    isEmulating
      ? emulatedRoles?.includes("admin")
      : isRealAdmin
  );

  return (
    <AuthContext.Provider
      value={{
        firebaseUser,
        user: firebaseUser,
        profile: effectiveProfile,
        realProfile: rawProfile,
        loading,
        isAdmin,
        isRealAdmin,
        isEmulating,
        emulatedRoles,
        setEmulatedRoles,
        clearEmulation,
        signInWithGoogle,
        signInWithDevAccount,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}