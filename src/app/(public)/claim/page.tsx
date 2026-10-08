"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { 
  doc, 
  getDoc, 
  updateDoc, 
  setDoc 
} from "firebase/firestore";
import { auth, db } from "@/lib/firebase/client";
import { useAuth } from "@/lib/context/AuthContext";
import { Invite, InviteSchema } from "@/lib/schema/invite";
import { Section } from "@/lib/schema/section";
import { 
  Users, 
  Sparkles, 
  CheckCircle2, 
  AlertCircle, 
  Music, 
  ArrowRight, 
  ShieldCheck, 
  Lock, 
  Mail, 
  Eye, 
  EyeOff, 
  HelpCircle 
} from "lucide-react";

function ClaimContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";

  const {
    firebaseUser,
    loading: authLoading,
    signInWithGoogle,
    signInWithPassword,
    signUpWithPassword,
    signOut,
  } = useAuth();

  const [loadingInvite, setLoadingInvite] = useState(Boolean(token));
  const [invite, setInvite] = useState<Invite | null>(null);
  const [sectionData, setSectionData] = useState<Section | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isClaiming, setIsClaiming] = useState(false);
  const [claimSuccess, setClaimSuccess] = useState(false);

  // Email/password tab fallback
  const [authMode, setAuthMode] = useState<"google" | "password">("google");
  const [passwordMode, setPasswordMode] = useState<"signup" | "signin">("signup");
  const [passwordEmail, setPasswordEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  // 1. Fetch & Validate Invite Document
  useEffect(() => {
    if (!token) return;

    let isMounted = true;
    async function fetchInvite() {
      try {
        setErrorMessage(null);
        const inviteDoc = await getDoc(doc(db, "invites", token));

        if (!inviteDoc.exists()) {
          if (isMounted) {
            setErrorMessage("This onboarding invitation token was not found or has expired.");
            setLoadingInvite(false);
          }
          return;
        }

        const data = inviteDoc.data();
        const parsed = InviteSchema.parse(data);

        if (isMounted) {
          setInvite(parsed);
          setPasswordEmail(parsed.email || "");

          // If assigned to a section, fetch section name
          if (parsed.sectionId) {
            try {
              const secDoc = await getDoc(doc(db, "sections", parsed.sectionId));
              if (secDoc.exists()) {
                setSectionData(secDoc.data() as Section);
              }
            } catch {
              // Non-critical
            }
          }
          setLoadingInvite(false);
        }
      } catch {
        if (isMounted) {
          setErrorMessage("Failed to load invitation. Please check your link or contact the band manager.");
          setLoadingInvite(false);
        }
      }
    }

    void fetchInvite();
    return () => {
      isMounted = false;
    };
  }, [token]);

  // 2. Helper to finalize claiming the invite into users/{uid}
  const finalizeClaim = async (uid: string, userEmail: string, displayName: string) => {
    if (!invite) return;

    try {
      setIsClaiming(true);

      // Create / update users profile
      const userProfilePayload = {
        schemaVersion: 1,
        uid,
        email: userEmail.toLowerCase().trim(),
        displayName: displayName || invite.displayName || "Musician",
        roles: Array.isArray(invite.roles) && invite.roles.length > 0 ? invite.roles : ["member"],
        role: "member",
        sectionId: invite.sectionId || null,
        instruments: invite.instruments || [],
        status: "active",
        portalThemeSchemeId: "eagleburger-gold",
        portalThemeMode: "dark",
        claimedInviteToken: token,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await setDoc(doc(db, "users", uid), userProfilePayload, { merge: true });

      // Mark invite as claimed
      await updateDoc(doc(db, "invites", token), {
        status: "claimed",
        claimedAt: new Date().toISOString(),
        claimedByUid: uid,
      });

      setClaimSuccess(true);
      setTimeout(() => {
        router.replace("/portal");
      }, 1200);
    } catch (err) {
      setErrorMessage("Could not complete invitation activation: " + (err instanceof Error ? err.message : String(err)));
      setIsClaiming(false);
    }
  };

  // 3. Handle Google Sign-In & Claim
  const handleGoogleClaim = async () => {
    setErrorMessage(null);
    setIsClaiming(true);
    try {
      await signInWithGoogle();
      if (auth.currentUser) {
        await finalizeClaim(
          auth.currentUser.uid,
          auth.currentUser.email || invite?.email || "",
          auth.currentUser.displayName || invite?.displayName || "Musician"
        );
      }
    } catch {
      setIsClaiming(false);
      setErrorMessage("Google Sign-In was cancelled or failed. Please try again.");
    }
  };

  // 4. Handle Password Sign-In / Sign-Up Claim
  const handlePasswordClaim = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);
    if (!passwordEmail || !password) {
      setPasswordError("Please enter your email and password.");
      return;
    }

    setIsClaiming(true);
    try {
      if (passwordMode === "signup") {
        const res = await signUpWithPassword(passwordEmail, password, invite?.displayName || "Musician");
        if (res.error) {
          setPasswordError(res.error);
          setIsClaiming(false);
          return;
        }
      } else {
        const res = await signInWithPassword(passwordEmail, password);
        if (res.error) {
          setPasswordError(res.error);
          setIsClaiming(false);
          return;
        }
      }

      if (auth.currentUser) {
        await finalizeClaim(
          auth.currentUser.uid,
          auth.currentUser.email || passwordEmail,
          auth.currentUser.displayName || invite?.displayName || "Musician"
        );
      }
    } catch (err) {
      setPasswordError("Authentication failed: " + (err instanceof Error ? err.message : String(err)));
      setIsClaiming(false);
    }
  };

  // State A: Loading Token
  if (loadingInvite || authLoading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-center">
        <div className="w-12 h-12 border-4 border-yellow-400/20 border-t-yellow-400 rounded-full animate-spin mb-4" />
        <h2 className="text-xl font-bold text-white">Verifying Onboarding Invitation...</h2>
        <p className="text-sm text-slate-400 mt-1">Preparing your musician profile credentials.</p>
      </div>
    );
  }

  // State B: Missing Token
  if (!token) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-center max-w-md mx-auto">
        <div className="w-16 h-16 rounded-2xl bg-yellow-400/10 border border-yellow-400/20 flex items-center justify-center text-yellow-400 mb-4">
          <HelpCircle className="w-8 h-8" />
        </div>
        <h1 className="text-2xl font-bold text-white">Musician Invitation Required</h1>
        <p className="text-sm text-slate-400 mt-2">
          This onboarding link appears to be missing an invitation token. Please check the full link provided by your band manager or section leader.
        </p>
        <div className="mt-6 flex flex-col sm:flex-row gap-3 w-full">
          <Link
            href="/login"
            className="flex-1 px-4 py-2.5 rounded-xl bg-yellow-400 hover:bg-yellow-300 text-slate-950 font-bold text-sm text-center transition"
          >
            Go to Member Login
          </Link>
          <Link
            href="/"
            className="flex-1 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 text-sm font-semibold text-center transition"
          >
            Public Site
          </Link>
        </div>
      </div>
    );
  }

  // State C: Token Not Found / Error
  if (errorMessage && !invite) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-center max-w-md mx-auto">
        <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 mb-4">
          <AlertCircle className="w-8 h-8" />
        </div>
        <h1 className="text-2xl font-bold text-white">Invalid Invitation</h1>
        <p className="text-sm text-slate-400 mt-2">{errorMessage}</p>
        <div className="mt-6 flex flex-col sm:flex-row gap-3 w-full">
          <Link
            href="/login"
            className="flex-1 px-4 py-2.5 rounded-xl bg-yellow-400 hover:bg-yellow-300 text-slate-950 font-bold text-sm text-center transition"
          >
            Sign In Existing Account
          </Link>
          <Link
            href="/contact"
            className="flex-1 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 text-sm font-semibold text-center transition"
          >
            Contact Manager
          </Link>
        </div>
      </div>
    );
  }

  // State D: Already Claimed
  if (invite && invite.status === "claimed" && !claimSuccess) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-center max-w-md mx-auto">
        <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 mb-4">
          <CheckCircle2 className="w-8 h-8" />
        </div>
        <h1 className="text-2xl font-bold text-white">Invitation Already Claimed</h1>
        <p className="text-sm text-slate-400 mt-2">
          This invitation for <strong className="text-white">{invite.displayName}</strong> ({invite.email}) has already been activated.
        </p>
        <div className="mt-6 w-full">
          <Link
            href={`/login?email=${encodeURIComponent(invite.email)}`}
            className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-yellow-400 hover:bg-yellow-300 text-slate-950 font-bold text-sm transition shadow-lg shadow-yellow-400/10"
          >
            <span>Proceed to Musician Login</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    );
  }

  // State E: Claim Success Transition
  if (claimSuccess) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-center max-w-md mx-auto">
        <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-4 animate-bounce">
          <Sparkles className="w-8 h-8" />
        </div>
        <h1 className="text-2xl font-bold text-white">Welcome to the Band!</h1>
        <p className="text-sm text-emerald-400 mt-2">
          Your roster spot is confirmed. Loading your musician portal...
        </p>
      </div>
    );
  }

  // State F: Active Pending Invite Ready to Claim
  return (
    <div className="min-h-[75vh] flex items-center justify-center p-4 sm:p-6">
      <div className="w-full max-w-lg bg-slate-950/80 border border-slate-800 rounded-3xl p-6 sm:p-8 backdrop-blur-xl shadow-2xl relative overflow-hidden">
        {/* Subtle Decorative Ambient Glow */}
        <div className="absolute -top-24 -right-24 w-60 h-60 bg-yellow-400/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-60 h-60 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Header Badge */}
        <div className="flex items-center justify-center mb-6">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-yellow-400/10 border border-yellow-400/20 text-yellow-400 text-xs font-mono font-bold">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Official Musician Onboarding</span>
          </div>
        </div>

        {/* Welcome Headline */}
        <div className="text-center space-y-2 mb-6">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Welcome, {invite?.displayName || "Musician"}!
          </h1>
          <p className="text-sm text-slate-400 max-w-sm mx-auto">
            You have been invited to join the <strong className="text-yellow-400 font-semibold">Eagleburger Band</strong> musician roster.
          </p>
        </div>

        {/* Section & Credentials Preview Card */}
        <div className="bg-slate-900/80 border border-slate-800/80 rounded-2xl p-4 mb-6 space-y-3">
          <div className="flex items-center justify-between text-xs text-slate-400 border-b border-slate-800/60 pb-2.5">
            <span className="flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5 text-slate-500" />
              Invited Email:
            </span>
            <span className="font-mono text-white font-medium">{invite?.email}</span>
          </div>

          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-400 flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-yellow-400" />
              Designated Section:
            </span>
            <span className="font-bold text-yellow-400 bg-yellow-400/10 px-2.5 py-1 rounded-lg border border-yellow-400/20">
              {sectionData ? sectionData.name : (invite?.sectionId ? invite.sectionId.toUpperCase() : "General Roster")}
            </span>
          </div>

          {invite?.instruments && invite.instruments.length > 0 && (
            <div className="flex items-center justify-between text-xs border-t border-slate-800/60 pt-2.5">
              <span className="text-slate-400 flex items-center gap-1.5">
                <Music className="w-3.5 h-3.5 text-slate-500" />
                Instruments:
              </span>
              <span className="text-slate-300 font-medium">
                {invite.instruments.join(", ")}
              </span>
            </div>
          )}
        </div>

        {/* Error Feedback */}
        {errorMessage && (
          <div className="p-3 mb-6 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-start gap-2.5 text-xs text-rose-400">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Interactive Claim Action Section */}
        {firebaseUser ? (
          <div className="space-y-4">
            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-2 text-center">
              <p className="text-xs text-slate-400">Currently signed in as:</p>
              <p className="text-sm font-bold text-white font-mono">{firebaseUser.email || firebaseUser.displayName}</p>
              {firebaseUser.email?.toLowerCase() !== invite?.email.toLowerCase() && (
                <p className="text-[11px] text-amber-400/90 bg-amber-400/10 p-2 rounded-xl border border-amber-400/20 text-left">
                  Note: This invite was sent to <strong className="text-amber-300">{invite?.email}</strong>. Accepting will link this roster position to your currently logged in account.
                </p>
              )}
            </div>

            <button
              type="button"
              disabled={isClaiming}
              onClick={() => finalizeClaim(
                firebaseUser.uid,
                firebaseUser.email || invite?.email || "",
                firebaseUser.displayName || invite?.displayName || "Musician"
              )}
              className="w-full flex items-center justify-center gap-2 px-5 py-3.5 rounded-2xl bg-yellow-400 hover:bg-yellow-300 text-slate-950 font-bold text-sm shadow-xl transition disabled:opacity-50 cursor-pointer"
            >
              {isClaiming ? (
                <div className="w-5 h-5 border-2 border-slate-950/30 border-t-slate-950 rounded-full animate-spin" />
              ) : (
                <Sparkles className="w-4 h-4" />
              )}
              <span>Accept Invitation & Enter Portal</span>
            </button>

            <div className="text-center pt-1">
              <button
                type="button"
                onClick={() => signOut()}
                className="text-xs text-slate-400 hover:text-slate-200 transition underline underline-offset-4 cursor-pointer"
              >
                Sign out or use a different account
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Primary Action: Google One-Click Claim */}
            <button
              type="button"
              disabled={isClaiming}
              onClick={handleGoogleClaim}
              className="w-full flex items-center justify-center gap-3 px-5 py-3.5 rounded-2xl bg-white hover:bg-slate-100 text-slate-900 font-bold text-sm shadow-xl transition disabled:opacity-50 cursor-pointer"
            >
              {isClaiming ? (
                <div className="w-5 h-5 border-2 border-slate-900/30 border-t-slate-900 rounded-full animate-spin" />
              ) : (
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
              )}
              <span>Claim Spot with Google</span>
            </button>

            {/* Alternative Email/Password Mode Toggle */}
            <div className="pt-2 text-center">
              {authMode === "google" ? (
                <button
                  type="button"
                  onClick={() => setAuthMode("password")}
                  className="text-xs text-slate-400 hover:text-yellow-400 transition inline-flex items-center gap-1 cursor-pointer"
                >
                  <Lock className="w-3.5 h-3.5" />
                  <span>Prefer to use Email and Password?</span>
                </button>
              ) : (
                <form onSubmit={handlePasswordClaim} className="space-y-3 text-left pt-2">
                  <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                    <span>{passwordMode === "signup" ? "Create Account Password" : "Enter Password"}</span>
                    <button
                      type="button"
                      onClick={() => setPasswordMode(passwordMode === "signup" ? "signin" : "signup")}
                      className="text-yellow-400 hover:underline cursor-pointer"
                    >
                      {passwordMode === "signup" ? "Already have account?" : "Need new account?"}
                    </button>
                  </div>

                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      placeholder="Enter account password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-yellow-400"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-2.5 text-slate-400 hover:text-white"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>

                  {passwordError && (
                    <p className="text-xs text-rose-400">{passwordError}</p>
                  )}

                  <div className="flex items-center gap-2 pt-1">
                    <button
                      type="submit"
                      disabled={isClaiming}
                      className="flex-1 py-2.5 rounded-xl bg-yellow-400 hover:bg-yellow-300 text-slate-950 font-bold text-xs transition cursor-pointer"
                    >
                      {isClaiming ? "Activating..." : (passwordMode === "signup" ? "Activate Spot" : "Sign In & Claim")}
                    </button>
                    <button
                      type="button"
                      onClick={() => setAuthMode("google")}
                      className="px-3 py-2.5 rounded-xl bg-slate-900 text-slate-400 hover:text-white text-xs border border-slate-800 transition cursor-pointer"
                    >
                      Back to Google
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        )}

        {/* Security & Support Guarantee */}
        <div className="mt-8 pt-4 border-t border-slate-800/60 flex items-center justify-between text-[11px] text-slate-500">
          <span className="flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
            Verified Ensemble Roster Invite
          </span>
          <Link href="/login" className="hover:text-slate-400 transition">
            Standard Login
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function ClaimPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-center">
          <div className="w-12 h-12 border-4 border-yellow-400/20 border-t-yellow-400 rounded-full animate-spin mb-4" />
          <h2 className="text-xl font-bold text-white">Loading Onboarding...</h2>
        </div>
      }
    >
      <ClaimContent />
    </Suspense>
  );
}

