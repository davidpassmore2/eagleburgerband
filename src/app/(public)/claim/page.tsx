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
import { sendEmailVerification } from "firebase/auth";
import { useAuth } from "@/lib/context/AuthContext";
import { useAuthProvidersConfig } from "@/lib/hooks/useAuthProvidersConfig";
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
  HelpCircle,
  Loader2,
  RefreshCw,
} from "lucide-react";

function ClaimContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";

  const {
    firebaseUser,
    loading: authLoading,
    signInWithGoogle,
    signInWithApple,
    signInWithMicrosoft,
    signInWithGithub,
    signInWithPassword,
    signUpWithPassword,
    signOut,
  } = useAuth();

  const { config: authProvidersConfig } = useAuthProvidersConfig();

  const [loadingInvite, setLoadingInvite] = useState(Boolean(token));
  const [invite, setInvite] = useState<Invite | null>(null);
  const [sectionData, setSectionData] = useState<Section | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isClaiming, setIsClaiming] = useState(false);
  const [claimSuccess, setClaimSuccess] = useState(false);

  // Email verification state for password registrations
  const [verificationSent, setVerificationSent] = useState(false);
  const [isCheckingVerification, setIsCheckingVerification] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [verificationError, setVerificationError] = useState<string | null>(null);
  const [resendSuccess, setResendSuccess] = useState(false);

  // Email/password tab fallback
  const [authMode, setAuthMode] = useState<"google" | "password">("google");
  const [passwordMode, setPasswordMode] = useState<"signup" | "signin">("signup");
  const [passwordEmail, setPasswordEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  const hasSocial = Boolean(
    authProvidersConfig.google ||
    authProvidersConfig.apple ||
    authProvidersConfig.microsoft ||
    authProvidersConfig.github
  );

  // Synchronize authMode if social or password auth is disabled
  useEffect(() => {
    if (!hasSocial && authProvidersConfig.password && authMode === "google") {
      setAuthMode("password");
    } else if (hasSocial && !authProvidersConfig.password && authMode === "password") {
      setAuthMode("google");
    }
  }, [hasSocial, authProvidersConfig.password, authMode]);

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

    if (invite.status !== "pending") {
      setErrorMessage(`This invitation is no longer active (status: ${invite.status}).`);
      setIsClaiming(false);
      return;
    }

    try {
      setIsClaiming(true);
      await auth.currentUser?.getIdToken(true);

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

  // 3. Handle Social Sign-In & Claim (Google, Apple, Microsoft, GitHub)
  const handleSocialClaim = async (
    providerName: "Google" | "Apple" | "Microsoft" | "GitHub",
    signInFn: () => Promise<void>
  ) => {
    setErrorMessage(null);
    setIsClaiming(true);
    try {
      await signInFn();
      if (auth.currentUser) {
        const currentEmail = auth.currentUser.email?.toLowerCase().trim();
        const expectedEmail = invite?.email?.toLowerCase().trim();

        // Enforce strict email matching for Social Auth
        if (expectedEmail && currentEmail && currentEmail !== expectedEmail) {
          await signOut();
          setIsClaiming(false);
          setErrorMessage(
            `Email address mismatch: You signed in with ${providerName} as "${currentEmail}", but this invitation was issued to "${expectedEmail}". Please sign in with the account for "${expectedEmail}".`
          );
          return;
        }

        await finalizeClaim(
          auth.currentUser.uid,
          auth.currentUser.email || invite?.email || "",
          auth.currentUser.displayName || invite?.displayName || "Musician"
        );
      }
    } catch (err: unknown) {
      setIsClaiming(false);
      const e = err as { code?: string; message?: string };
      if (e.code === "auth/popup-closed-by-user" || e.code === "auth/cancelled-popup-request") {
        setErrorMessage(null);
      } else if (e.code === "auth/operation-not-allowed") {
        setErrorMessage(`${providerName} sign-in is not yet enabled in the Firebase Console.`);
      } else if (e.code === "auth/account-exists-with-different-credential") {
        setErrorMessage(`An account already exists with this email address using another sign-in method.`);
      } else {
        setErrorMessage(`${providerName} Sign-In was cancelled or failed. Please try again.`);
      }
    }
  };

  // 4. Handle Password Sign-In / Sign-Up Claim (with Email Verification)
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

        // Send email verification link before granting portal access
        if (auth.currentUser) {
          try {
            await sendEmailVerification(auth.currentUser);
          } catch (evErr) {
            console.warn("Could not dispatch verification email:", evErr);
          }
          setVerificationSent(true);
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

        // If existing user account is not verified, require verification
        if (auth.currentUser && !auth.currentUser.emailVerified) {
          try {
            await sendEmailVerification(auth.currentUser);
          } catch (evErr) {
            console.warn("Could not dispatch verification email:", evErr);
          }
          setVerificationSent(true);
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

  // State D2: Revoked / Cancelled Invitation
  if (invite && invite.status === "revoked") {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-center max-w-md mx-auto">
        <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 mb-4">
          <AlertCircle className="w-8 h-8" />
        </div>
        <h1 className="text-2xl font-bold text-white">Invitation Cancelled</h1>
        <p className="text-sm text-slate-400 mt-2">
          This onboarding invitation for <strong className="text-white">{invite.displayName}</strong> has been cancelled or revoked by band administration.
        </p>
        <div className="mt-6 flex flex-col sm:flex-row gap-3 w-full">
          <Link
            href="/login"
            className="flex-1 px-4 py-2.5 rounded-xl bg-yellow-400 hover:bg-yellow-300 text-slate-950 font-bold text-sm text-center transition"
          >
            Musician Login
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

  // State D3: Email Verification Pending
  if (verificationSent && invite) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-center max-w-md mx-auto">
        <div className="w-16 h-16 rounded-2xl bg-amber-400/10 border border-yellow-400/20 flex items-center justify-center text-yellow-400 mb-4 animate-pulse">
          <Mail className="w-8 h-8" />
        </div>
        <span className="text-xs font-mono font-bold uppercase tracking-wider px-2.5 py-1 rounded bg-yellow-400/10 text-yellow-400 border border-yellow-400/20 mb-2">
          Step 2 of 2: Verify Email
        </span>
        <h1 className="text-2xl font-bold text-white">Check Your Inbox</h1>
        <p className="text-sm text-slate-300 mt-2">
          We sent a verification link to <strong className="text-yellow-400 font-mono">{invite.email}</strong>.
        </p>
        <p className="text-xs text-slate-400 mt-2 leading-relaxed">
          To ensure account security, please open the email and click the confirmation link to verify ownership of this address, then click below to activate your roster spot.
        </p>

        {verificationError && (
          <div className="mt-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{verificationError}</span>
          </div>
        )}

        {resendSuccess && (
          <div className="mt-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>Verification email resent! Please check your spam folder if it doesn&apos;t arrive shortly.</span>
          </div>
        )}

        <div className="mt-6 space-y-3 w-full">
          <button
            type="button"
            disabled={isCheckingVerification}
            onClick={async () => {
              setIsCheckingVerification(true);
              setVerificationError(null);
              setResendSuccess(false);
              try {
                if (auth.currentUser) {
                  await auth.currentUser.reload();
                  if (auth.currentUser.emailVerified) {
                    await finalizeClaim(
                      auth.currentUser.uid,
                      auth.currentUser.email || invite.email,
                      auth.currentUser.displayName || invite.displayName || "Musician"
                    );
                  } else {
                    setVerificationError(
                      "Email not yet confirmed. Please click the link in your verification email and try again."
                    );
                  }
                } else {
                  setVerificationError("Session expired. Please sign in again.");
                  setVerificationSent(false);
                }
              } catch (err) {
                setVerificationError(err instanceof Error ? err.message : "Failed to check verification.");
              } finally {
                setIsCheckingVerification(false);
              }
            }}
            className="w-full py-3 px-4 rounded-xl bg-yellow-400 hover:bg-yellow-300 text-slate-950 font-bold text-sm transition flex items-center justify-center gap-2 shadow-lg shadow-yellow-400/10 cursor-pointer disabled:opacity-50"
          >
            {isCheckingVerification ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Checking Verification...</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                <span>I&apos;ve Verified &rarr; Activate My Spot</span>
              </>
            )}
          </button>

          <button
            type="button"
            disabled={resendCooldown > 0}
            onClick={async () => {
              try {
                if (auth.currentUser) {
                  await sendEmailVerification(auth.currentUser);
                  setResendSuccess(true);
                  setResendCooldown(60);
                  const timer = setInterval(() => {
                    setResendCooldown((prev) => {
                      if (prev <= 1) {
                        clearInterval(timer);
                        return 0;
                      }
                      return prev - 1;
                    });
                  }, 1000);
                }
              } catch {
                setVerificationError("Could not resend verification email. Please wait a moment.");
              }
            }}
            className="w-full py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 text-xs font-semibold transition cursor-pointer disabled:opacity-50"
          >
            {resendCooldown > 0 ? `Resend available in ${resendCooldown}s` : "Resend Verification Email"}
          </button>

          <button
            type="button"
            onClick={async () => {
              await signOut();
              setVerificationSent(false);
            }}
            className="text-xs text-slate-400 hover:text-slate-200 transition py-1"
          >
            Cancel & use a different sign-in method
          </button>
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
            {/* Primary Action: Multi-Platform Social Claim */}
            {hasSocial && authMode === "google" && (
              <div className="space-y-2.5">
                <div className="text-[11px] font-mono font-bold uppercase tracking-wider text-slate-400 text-center">
                  Claim spot with external account
                </div>
                <div className={`grid ${[authProvidersConfig.google, authProvidersConfig.apple, authProvidersConfig.microsoft, authProvidersConfig.github].filter(Boolean).length === 1 ? "grid-cols-1" : "grid-cols-2"} gap-2.5`}>
                  {/* Google */}
                  {authProvidersConfig.google && (
                    <button
                      type="button"
                      disabled={isClaiming}
                      onClick={() => handleSocialClaim("Google", signInWithGoogle)}
                      className="flex items-center justify-center gap-2.5 py-3 px-3 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-700/80 hover:border-slate-600 text-xs font-semibold transition disabled:opacity-50 shadow-sm cursor-pointer"
                    >
                      <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                        <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"/>
                        <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"/>
                        <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.15z"/>
                        <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"/>
                      </svg>
                      <span>Google</span>
                    </button>
                  )}

                  {/* Apple */}
                  {authProvidersConfig.apple && (
                    <button
                      type="button"
                      disabled={isClaiming}
                      onClick={() => handleSocialClaim("Apple", signInWithApple)}
                      className="flex items-center justify-center gap-2.5 py-3 px-3 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-700/80 hover:border-slate-600 text-xs font-semibold transition disabled:opacity-50 shadow-sm cursor-pointer"
                    >
                      <svg className="w-4 h-4 shrink-0 fill-current" viewBox="0 0 170 170">
                        <path d="M150.37 130.25c-2.45 5.66-5.35 10.87-8.71 15.66-4.58 6.53-8.33 11.05-11.22 13.56-4.48 4.12-9.28 6.23-14.42 6.35-3.69 0-8.14-1.05-13.32-3.18-5.19-2.12-9.97-3.17-14.34-3.17-4.58 0-9.49 1.05-14.75 3.17-5.26 2.13-9.5 3.24-12.74 3.35-4.35.13-9.16-1.9-14.42-6.08-3.7-3.04-7.66-7.79-11.89-14.24-5.23-7.98-9.39-16.71-12.47-26.2-3.08-9.48-4.63-18.7-4.63-27.65 0-12.42 3.08-23.01 9.24-31.78 6.16-8.77 14.07-13.29 23.73-13.56 4.48 0 9.41 1.15 14.78 3.44 5.38 2.29 9.17 3.51 11.39 3.65 1.8.14 5.76-1.15 11.89-3.86 6.13-2.71 11.45-3.88 15.96-3.52 11.75.95 21.09 5.51 28.02 13.68-10.45 6.32-15.54 14.88-15.26 25.68.27 8.35 3.52 15.35 9.75 21 6.23 5.66 13.58 8.76 22.06 9.32-2.12 6.32-4.68 12.43-7.67 18.32zM119.22 33.64c0-6.72 2.45-13.08 7.35-19.08 4.9-6 10.9-9.84 18-11.52.54 6.72-1.57 13.08-6.33 19.08-4.76 6-10.76 9.84-18 11.52-.36-.67-.62-1.42-.77-2.25-.16-.83-.25-1.66-.25-2.49z"/>
                      </svg>
                      <span>Apple</span>
                    </button>
                  )}

                  {/* Microsoft */}
                  {authProvidersConfig.microsoft && (
                    <button
                      type="button"
                      disabled={isClaiming}
                      onClick={() => handleSocialClaim("Microsoft", signInWithMicrosoft)}
                      className="flex items-center justify-center gap-2.5 py-3 px-3 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-700/80 hover:border-slate-600 text-xs font-semibold transition disabled:opacity-50 shadow-sm cursor-pointer"
                    >
                      <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 23 23">
                        <path fill="#f35325" d="M1 1h10v10H1z"/>
                        <path fill="#81bc06" d="M12 1h10v10H12z"/>
                        <path fill="#05a6f0" d="M1 12h10v10H1z"/>
                        <path fill="#ffba08" d="M12 12h10v10H12z"/>
                      </svg>
                      <span>Microsoft</span>
                    </button>
                  )}

                  {/* GitHub */}
                  {authProvidersConfig.github && (
                    <button
                      type="button"
                      disabled={isClaiming}
                      onClick={() => handleSocialClaim("GitHub", signInWithGithub)}
                      className="flex items-center justify-center gap-2.5 py-3 px-3 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-700/80 hover:border-slate-600 text-xs font-semibold transition disabled:opacity-50 shadow-sm cursor-pointer"
                    >
                      <svg className="w-4 h-4 shrink-0 fill-current" viewBox="0 0 24 24">
                        <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"/>
                      </svg>
                      <span>GitHub</span>
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Alternative Email/Password Mode Toggle */}
            {authProvidersConfig.password && (
              <div className="pt-2 text-center">
                {authMode === "google" && hasSocial ? (
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
                      {hasSocial && (
                        <button
                          type="button"
                          onClick={() => setAuthMode("google")}
                          className="px-3 py-2.5 rounded-xl bg-slate-900 text-slate-400 hover:text-white text-xs border border-slate-800 transition cursor-pointer"
                        >
                          Back to Social Sign-In
                        </button>
                      )}
                    </div>
                  </form>
                )}
              </div>
            )}
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

