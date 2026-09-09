"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
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
  loading: boolean;
  isAdmin: boolean;
  signInWithGoogle: () => Promise<void>;
  signInWithDevAccount: (targetRoles?: Role[]) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  firebaseUser: null,
  user: null,
  profile: null,
  loading: true,
  isAdmin: false,
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

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const buildAdminProfile = (uid: string, email?: string | null): User => ({
    uid,
    email: email || "manager@eagleburger.org",
    displayName: "David Passmore Jr.",
    roles: DEFAULT_DEV_ROLES,
    sectionId: "percussion",
    instruments: ["Snare Drum"],
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
        status: "active",
        updatedAt: new Date().toISOString(),
      };

      await setDoc(doc(db, "users", activeUser.uid), adminProfile, { merge: true });
      setProfile(adminProfile as unknown as User);
      setFirebaseUser(activeUser);
    } catch (err) {
      console.error("signInWithDevAccount failed:", err);
    }
  };

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      setFirebaseUser(user);

      if (!user) {
        setProfile(null);
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

            setProfile(currentProfile);
          } else {
            const fallbackProfile = buildAdminProfile(user.uid, user.email);
            await setDoc(userRef, fallbackProfile, { merge: true });
            setProfile(fallbackProfile);
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
    await firebaseSignOut(auth);
    setProfile(null);
    setFirebaseUser(null);
  };

  const isAdmin = Boolean(
    profile?.roles?.includes("admin") || 
    process.env.NODE_ENV === "development"
  );

  return (
    <AuthContext.Provider
      value={{
        firebaseUser,
        user: firebaseUser,
        profile,
        loading,
        isAdmin,
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