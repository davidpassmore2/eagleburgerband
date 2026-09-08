"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { 
  User as FirebaseUser,
  onAuthStateChanged,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  signOut as fbSignOut
} from "firebase/auth";
import { collection, doc, onSnapshot, query, where, getDocs, setDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase/client";
import { User, UserSchema } from "@/lib/schema/user";

interface AuthContextType {
  firebaseUser: FirebaseUser | null;
  profile: User | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signInWithDevAccount: (email?: string, password?: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  firebaseUser: null,
  profile: null,
  loading: true,
  signInWithGoogle: async () => {},
  signInWithDevAccount: async () => {},
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (usr) => {
      setFirebaseUser(usr);
      if (!usr) {
        setProfile(null);
        setLoading(false);
      }
    });
    return () => unsubscribeAuth();
  }, []);

  useEffect(() => {
    if (!firebaseUser) return;

    // 1. Listen to user document keyed by Auth UID
    const userDocRef = doc(db, "users", firebaseUser.uid);
    const unsubscribeDoc = onSnapshot(userDocRef, async (snap) => {
      if (snap.exists()) {
        const parsed = UserSchema.safeParse(snap.data());
        if (parsed.success) {
          setProfile(parsed.data);
          setLoading(false);
          return;
        }
      }

      // 2. Fallback: match by email (links seeded profiles to the authenticated UID)
      if (firebaseUser.email) {
        const q = query(
          collection(db, "users"),
          where("email", "==", firebaseUser.email.toLowerCase())
        );
        const querySnap = await getDocs(q);

        if (!querySnap.empty) {
          const seededData = querySnap.docs[0].data();
          const linkedProfile = {
            ...seededData,
            uid: firebaseUser.uid,
          };
          const parsed = UserSchema.safeParse(linkedProfile);
          if (parsed.success) {
            await setDoc(userDocRef, parsed.data);
            setProfile(parsed.data);
            setLoading(false);
            return;
          }
        }
      }

      setProfile(null);
      setLoading(false);
    });

    return () => unsubscribeDoc();
  }, [firebaseUser]);

  const signInWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    await signInWithPopup(auth, provider);
  };

  const signInWithDevAccount = async (
    email = "director@eagleburgerband.com",
    password = "password123"
  ) => {
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (err: unknown) {
      const fbErr = err as { code?: string };
      if (
        fbErr.code === "auth/user-not-found" ||
        fbErr.code === "auth/invalid-credential"
      ) {
        await createUserWithEmailAndPassword(auth, email, password);
      } else {
        throw err;
      }
    }
  };

  const signOut = async () => {
    await fbSignOut(auth);
  };

  return (
    <AuthContext.Provider
      value={{
        firebaseUser,
        profile,
        loading,
        signInWithGoogle,
        signInWithDevAccount,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);