"use client";

import React, { createContext, useContext, useEffect, useState, useSyncExternalStore } from "react";
import { 
  User as FirebaseUser, 
  onAuthStateChanged, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  updateProfile,
  signInAnonymously, 
  signInWithPopup,
  GoogleAuthProvider,
  OAuthProvider,
  GithubAuthProvider,
  sendPasswordResetEmail,
  sendSignInLinkToEmail,
  isSignInWithEmailLink,
  signInWithEmailLink,
  signOut as firebaseSignOut 
} from "firebase/auth";
import { 
  doc, 
  setDoc, 
  onSnapshot,
  collection,
  query,
  where,
  getDocs,
  updateDoc
} from "firebase/firestore";
import { auth, db } from "@/lib/firebase/client";
import { User } from "@/lib/schema/user";
import { Role } from "@/lib/auth/permissions";

export interface AuthContextValue {
  firebaseUser: FirebaseUser | null;
  user: FirebaseUser | null;
  profile: User | null;
  realProfile: User | null;
  loading: boolean;
  isAdmin: boolean;
  isRealAdmin: boolean;
  isEmulating: boolean;
  emulatedRoles: Role[] | null;
  authProviderId: string | null;
  setEmulatedRoles: (roles: Role[] | null) => void;
  clearEmulation: () => void;
  signInWithGoogle: () => Promise<void>;
  signInWithApple: () => Promise<void>;
  signInWithMicrosoft: () => Promise<void>;
  signInWithGithub: () => Promise<void>;
  signInWithPassword: (email: string, password: string) => Promise<{ error?: string }>;
  signUpWithPassword: (email: string, password: string, displayName: string) => Promise<{ error?: string }>;
  sendPasswordReset: (email: string) => Promise<{ error?: string; success?: boolean }>;
  sendMagicLink: (email: string, targetRedirect?: string) => Promise<{ error?: string; success?: boolean }>;
  signInWithMagicLink: (email: string, href: string) => Promise<{ error?: string; success?: boolean }>;
  isMagicLink: (href: string) => boolean;
  signInWithDevAccount: (targetRoles?: Role[], personaName?: string, personaSection?: string) => Promise<void>;
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
  authProviderId: null,
  setEmulatedRoles: () => {},
  clearEmulation: () => {},
  signInWithGoogle: async () => {},
  signInWithApple: async () => {},
  signInWithMicrosoft: async () => {},
  signInWithGithub: async () => {},
  signInWithPassword: async () => ({}),
  signUpWithPassword: async () => ({}),
  sendPasswordReset: async () => ({}),
  sendMagicLink: async () => ({}),
  signInWithMagicLink: async () => ({}),
  isMagicLink: () => false,
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

  const buildDefaultProfile = (uid: string, email?: string | null, displayName?: string | null): User => ({
    uid,
    email: email || "member@eagleburger.org",
    displayName: displayName || (email ? email.split("@")[0] : "Musician"),
    roles: ["member"],
    sectionId: null,
    instruments: [],
    portalThemeSchemeId: "eagleburger-gold",
    status: "active",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  } as unknown as User);

  // 1. Social OAuth Providers
  const signInWithGoogle = async () => {
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: "select_account" });
      await signInWithPopup(auth, provider);
    } catch (err) {
      console.error("signInWithGoogle failed:", err);
      throw err;
    }
  };

  const signInWithApple = async () => {
    try {
      const provider = new OAuthProvider("apple.com");
      provider.addScope("email");
      provider.addScope("name");
      await signInWithPopup(auth, provider);
    } catch (err) {
      console.error("signInWithApple failed:", err);
      throw err;
    }
  };

  const signInWithMicrosoft = async () => {
    try {
      const provider = new OAuthProvider("microsoft.com");
      provider.setCustomParameters({ prompt: "select_account" });
      await signInWithPopup(auth, provider);
    } catch (err) {
      console.error("signInWithMicrosoft failed:", err);
      throw err;
    }
  };

  const signInWithGithub = async () => {
    try {
      const provider = new GithubAuthProvider();
      provider.addScope("read:user");
      provider.addScope("user:email");
      await signInWithPopup(auth, provider);
    } catch (err) {
      console.error("signInWithGithub failed:", err);
      throw err;
    }
  };

  // 2. Email & Password Suite
  const signInWithPassword = async (email: string, password: string): Promise<{ error?: string }> => {
    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
      return {};
    } catch (err: unknown) {
      const e = err as { code?: string; message?: string };
      console.error("signInWithPassword failed:", e);
      if (e.code === "auth/invalid-credential" || e.code === "auth/user-not-found" || e.code === "auth/wrong-password") {
        return { error: "Invalid email or password. Please verify and try again." };
      }
      return { error: e.message || "Failed to sign in. Please try again." };
    }
  };

  const signUpWithPassword = async (
    email: string, 
    password: string, 
    displayName: string
  ): Promise<{ error?: string }> => {
    try {
      const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
      if (displayName.trim()) {
        await updateProfile(cred.user, { displayName: displayName.trim() });
      }
      return {};
    } catch (err: unknown) {
      const e = err as { code?: string; message?: string };
      console.error("signUpWithPassword failed:", e);
      if (e.code === "auth/email-already-in-use") {
        return { error: "An account with this email already exists. Please sign in instead." };
      }
      if (e.code === "auth/weak-password") {
        return { error: "Password should be at least 6 characters." };
      }
      return { error: e.message || "Failed to create account. Please try again." };
    }
  };

  const sendPasswordReset = async (email: string): Promise<{ error?: string; success?: boolean }> => {
    try {
      await sendPasswordResetEmail(auth, email.trim());
      return { success: true };
    } catch (err: unknown) {
      const e = err as { code?: string; message?: string };
      console.error("sendPasswordReset failed:", e);
      return { error: e.message || "Failed to send password reset email. Please check the address." };
    }
  };

  // 3. Passwordless Magic Link Suite
  const sendMagicLink = async (
    email: string, 
    targetRedirect = "/portal"
  ): Promise<{ error?: string; success?: boolean }> => {
    try {
      const origin = typeof window !== "undefined" ? window.location.origin : "http://localhost:3000";
      const actionCodeSettings = {
        url: `${origin}/login?email=${encodeURIComponent(email.trim().toLowerCase())}&redirect=${encodeURIComponent(targetRedirect)}&magic=true`,
        handleCodeInApp: true,
      };
      await sendSignInLinkToEmail(auth, email.trim(), actionCodeSettings);
      if (typeof window !== "undefined") {
        window.localStorage.setItem("ebb_email_for_sign_in", email.trim().toLowerCase());
      }
      return { success: true };
    } catch (err: unknown) {
      const e = err as { code?: string; message?: string };
      console.error("sendMagicLink failed:", e);
      return { error: e.message || "Failed to dispatch sign-in link. Please check the address." };
    }
  };

  const signInWithMagicLink = async (
    email: string, 
    href: string
  ): Promise<{ error?: string; success?: boolean }> => {
    try {
      if (!isSignInWithEmailLink(auth, href)) {
        return { error: "Invalid or expired sign-in link." };
      }
      let resolvedEmail = email;
      if (!resolvedEmail && typeof window !== "undefined") {
        resolvedEmail = window.localStorage.getItem("ebb_email_for_sign_in") || "";
      }
      if (!resolvedEmail) {
        return { error: "Email address required to confirm magic link sign-in." };
      }
      await signInWithEmailLink(auth, resolvedEmail.trim().toLowerCase(), href);
      if (typeof window !== "undefined") {
        window.localStorage.removeItem("ebb_email_for_sign_in");
      }
      return { success: true };
    } catch (err: unknown) {
      const e = err as { code?: string; message?: string };
      console.error("signInWithMagicLink failed:", e);
      return { error: e.message || "Failed to complete magic link authentication." };
    }
  };

  const isMagicLink = (href: string): boolean => {
    return isSignInWithEmailLink(auth, href);
  };

  // 4. Dev Account & Persona Fast Switcher
  const signInWithDevAccount = async (
    targetRoles: Role[] = DEFAULT_DEV_ROLES,
    personaName = "David Passmore Jr.",
    personaSection = "percussion"
  ) => {
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
        displayName: personaName,
        roles: targetRoles,
        sectionId: personaSection,
        instruments: personaSection === "percussion" ? ["Snare Drum"] : [],
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

  // Auth State Listener with Roster & Invite Auto-Matching
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

            // Only promote manager@eagleburger.org in development
            if (
              process.env.NODE_ENV === "development" && 
              user.email === "manager@eagleburger.org" &&
              !resolvedRoles.includes("admin")
            ) {
              resolvedRoles = DEFAULT_DEV_ROLES;
              await setDoc(userRef, { roles: resolvedRoles }, { merge: true });
            }

            const currentProfile = {
              ...data,
              uid: user.uid,
              displayName: data.displayName || user.displayName || "Musician",
              email: data.email || user.email,
              roles: resolvedRoles,
              sectionId: data.sectionId || null,
              instruments: data.instruments || [],
            } as unknown as User;

            setRawProfile(currentProfile);
          } else {
            // First time sign-in: Check for matching pending invite in Firestore
            let inviteMatchedProfile: User | null = null;
            if (user.email) {
              try {
                const invitesQuery = query(
                  collection(db, "invites"), 
                  where("email", "==", user.email.toLowerCase().trim())
                );
                const snap = await getDocs(invitesQuery);
                snap.forEach((d) => {
                  const inv = d.data();
                  if (inv.status === "pending" && !inviteMatchedProfile) {
                    inviteMatchedProfile = {
                      uid: user.uid,
                      email: user.email!,
                      displayName: user.displayName || inv.displayName || "Musician",
                      roles: Array.isArray(inv.roles) && inv.roles.length > 0 ? inv.roles : ["member"],
                      sectionId: inv.sectionId || null,
                      instruments: inv.instruments || [],
                      portalThemeSchemeId: "eagleburger-gold",
                      status: "active",
                      createdAt: new Date().toISOString(),
                      updatedAt: new Date().toISOString(),
                    } as unknown as User;

                    // Mark invite as claimed
                    updateDoc(doc(db, "invites", d.id), {
                      status: "claimed",
                      claimedByUid: user.uid,
                      claimedAt: new Date().toISOString(),
                    }).catch(console.error);
                  }
                });
              } catch (inviteErr) {
                console.warn("Could not query invites for new member:", inviteErr);
              }
            }

            // Default fallback profile
            const isDevAdmin = process.env.NODE_ENV === "development" && (user.email === "manager@eagleburger.org" || !user.email);
            const fallbackProfile = inviteMatchedProfile || (
              isDevAdmin
                ? {
                    uid: user.uid,
                    email: user.email || "manager@eagleburger.org",
                    displayName: user.displayName || "David Passmore Jr.",
                    roles: DEFAULT_DEV_ROLES,
                    sectionId: "percussion",
                    instruments: ["Snare Drum"],
                    portalThemeSchemeId: "eagleburger-gold",
                    status: "active",
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                  }
                : buildDefaultProfile(user.uid, user.email, user.displayName)
            );

            await setDoc(userRef, fallbackProfile, { merge: true });
            setRawProfile(fallbackProfile as unknown as User);
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
    (process.env.NODE_ENV === "development" && (rawProfile?.email === "manager@eagleburger.org" || !rawProfile?.email))
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

  const authProviderId = firebaseUser?.providerData?.[0]?.providerId || null;

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
        authProviderId,
        setEmulatedRoles,
        clearEmulation,
        signInWithGoogle,
        signInWithApple,
        signInWithMicrosoft,
        signInWithGithub,
        signInWithPassword,
        signUpWithPassword,
        sendPasswordReset,
        sendMagicLink,
        signInWithMagicLink,
        isMagicLink,
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