"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/context/AuthContext";
import { 
  Shield, 
  Sparkles, 
  Mail, 
  Lock, 
  User, 
  ArrowRight, 
  CheckCircle2, 
  AlertCircle, 
  Eye, 
  EyeOff, 
  RefreshCw,
  HelpCircle,
  ArrowLeft
} from "lucide-react";

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTarget = searchParams.get("redirect") || "/portal";
  const emailParam = searchParams.get("email") || "";
  const isMagicCallback = searchParams.get("magic") === "true";

  const {
    firebaseUser,
    profile,
    loading: authLoading,
    signInWithGoogle,
    signInWithApple,
    signInWithMicrosoft,
    signInWithGithub,
    signInWithPassword,
    signUpWithPassword,
    sendPasswordReset,
    sendMagicLink,
    signInWithMagicLink,
    isMagicLink
  } = useAuth();

  // Active form tab: "magic" | "password"
  const [activeTab, setActiveTab] = useState<"magic" | "password">("magic");
  // Password mode: "signin" | "signup" | "reset"
  const [passwordMode, setPasswordMode] = useState<"signin" | "signup" | "reset">("signin");

  // Form states
  const [email, setEmail] = useState(emailParam);
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Status feedback
  const [statusMessage, setStatusMessage] = useState<{ type: "success" | "error" | "info"; text: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isMagicVerifying, setIsMagicVerifying] = useState(false);

  // Handle incoming passwordless magic link verification
  useEffect(() => {
    if (typeof window === "undefined") return;

    if (isMagicCallback || isMagicLink(window.location.href)) {
      let isMounted = true;

      const executeMagicLinkSignIn = async () => {
        // Yield tick to avoid synchronous cascading render warning
        await Promise.resolve();
        if (!isMounted) return;

        setIsMagicVerifying(true);
        setStatusMessage({
          type: "info",
          text: "Verifying your magic sign-in link...",
        });

        const storedEmail = emailParam || window.localStorage.getItem("ebb_email_for_sign_in") || email;
        const res = await signInWithMagicLink(storedEmail, window.location.href);
        if (!isMounted) return;

        if (res.error) {
          setStatusMessage({ type: "error", text: res.error });
          setIsMagicVerifying(false);
        } else {
          setStatusMessage({ type: "success", text: "Magic link verified! Taking you to the portal..." });
          setTimeout(() => {
            router.replace(redirectTarget);
          }, 800);
        }
      };

      void executeMagicLinkSignIn();

      return () => {
        isMounted = false;
      };
    }
  }, [isMagicCallback, emailParam, email, isMagicLink, signInWithMagicLink, router, redirectTarget]);

  // Handle existing authenticated user redirect
  useEffect(() => {
    if (!authLoading && firebaseUser && profile && !isMagicVerifying) {
      router.replace(redirectTarget);
    }
  }, [authLoading, firebaseUser, profile, isMagicVerifying, router, redirectTarget]);

  // Social OAuth Handler
  const handleSocialSignIn = async (
    providerName: "Google" | "Apple" | "Microsoft" | "GitHub",
    fn: () => Promise<void>
  ) => {
    setStatusMessage(null);
    setIsSubmitting(true);
    try {
      await fn();
      setStatusMessage({ type: "success", text: `Authenticated with ${providerName}! Redirecting...` });
      setTimeout(() => {
        router.replace(redirectTarget);
      }, 500);
    } catch (err: unknown) {
      const e = err as { code?: string; message?: string };
      console.error(`${providerName} login failed:`, e);
      if (e.code === "auth/popup-closed-by-user") {
        setStatusMessage({ type: "info", text: "Sign-in cancelled." });
      } else {
        setStatusMessage({ type: "error", text: e.message || `Failed to sign in with ${providerName}.` });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Magic Link Dispatch Handler
  const handleSendMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setStatusMessage({ type: "error", text: "Please enter your email address." });
      return;
    }

    setStatusMessage(null);
    setIsSubmitting(true);
    const res = await sendMagicLink(email.trim(), redirectTarget);
    setIsSubmitting(false);

    if (res.error) {
      setStatusMessage({ type: "error", text: res.error });
    } else {
      setStatusMessage({
        type: "success",
        text: `1-Click sign-in link dispatched to ${email.trim()}! Check your inbox on this device.`,
      });
    }
  };

  // Password / Register / Reset Handler
  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setStatusMessage({ type: "error", text: "Email address required." });
      return;
    }

    setStatusMessage(null);
    setIsSubmitting(true);

    if (passwordMode === "reset") {
      const res = await sendPasswordReset(email.trim());
      setIsSubmitting(false);
      if (res.error) {
        setStatusMessage({ type: "error", text: res.error });
      } else {
        setStatusMessage({
          type: "success",
          text: `Password reset instructions sent to ${email.trim()}.`,
        });
        setPasswordMode("signin");
      }
      return;
    }

    if (passwordMode === "signup") {
      if (!password || password.length < 6) {
        setIsSubmitting(false);
        setStatusMessage({ type: "error", text: "Password must be at least 6 characters." });
        return;
      }
      const res = await signUpWithPassword(email.trim(), password, displayName.trim());
      setIsSubmitting(false);
      if (res.error) {
        setStatusMessage({ type: "error", text: res.error });
      } else {
        setStatusMessage({ type: "success", text: "Account created! Redirecting to musician portal..." });
        setTimeout(() => router.replace(redirectTarget), 600);
      }
      return;
    }

    // Default: Sign In
    if (!password) {
      setIsSubmitting(false);
      setStatusMessage({ type: "error", text: "Please enter your password." });
      return;
    }

    const res = await signInWithPassword(email.trim(), password);
    setIsSubmitting(false);
    if (res.error) {
      setStatusMessage({ type: "error", text: res.error });
    } else {
      setStatusMessage({ type: "success", text: "Welcome back! Entering musician portal..." });
      setTimeout(() => router.replace(redirectTarget), 500);
    }
  };

  if (isMagicVerifying) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center p-4">
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 max-w-md w-full text-center space-y-4 shadow-2xl">
          <div className="w-14 h-14 rounded-2xl bg-yellow-400/20 text-yellow-400 mx-auto flex items-center justify-center animate-pulse">
            <Sparkles className="w-7 h-7" />
          </div>
          <h2 className="text-xl font-black text-white uppercase tracking-tight">
            Verifying Magic Link
          </h2>
          <p className="text-sm text-slate-400 leading-relaxed">
            Please hold on while we verify your one-click sign-in credentials and configure your member session...
          </p>
          <div className="flex items-center justify-center gap-2 text-xs font-mono text-yellow-400">
            <RefreshCw className="w-4 h-4 animate-spin" />
            <span>Establishing secure connection...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[85vh] flex flex-col items-center justify-center px-4 py-12">
      {/* Back Link */}
      <div className="w-full max-w-md mb-6">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400 hover:text-yellow-400 transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Return to Eagleburger Band Home</span>
        </Link>
      </div>

      {/* Main Login Card */}
      <div className="w-full max-w-md bg-slate-900/90 backdrop-blur border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
        {/* Header Branding */}
        <div className="text-center space-y-2 pb-2">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-yellow-400/10 border border-yellow-400/30 text-yellow-400 shadow-inner">
            <Shield className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-black text-white uppercase tracking-tight">
            Musician & Crew Portal
          </h1>
          <p className="text-xs text-slate-400 leading-relaxed">
            Sign in to access call sheets, rehearsal charts, instrument sections, and gig dispatch.
          </p>
        </div>

        {/* Status Notification Banner */}
        {statusMessage && (
          <div
            className={`p-3.5 rounded-2xl text-xs flex items-start gap-2.5 border transition-all ${
              statusMessage.type === "success"
                ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
                : statusMessage.type === "error"
                ? "bg-rose-500/10 border-rose-500/30 text-rose-300"
                : "bg-yellow-400/10 border-yellow-400/30 text-yellow-300"
            }`}
          >
            {statusMessage.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400 mt-0.5" />
            ) : statusMessage.type === "error" ? (
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
            ) : (
              <Sparkles className="w-4 h-4 shrink-0 text-yellow-400 mt-0.5" />
            )}
            <span className="leading-relaxed font-medium">{statusMessage.text}</span>
          </div>
        )}

        {/* 1. Multi-Platform Social Provider Grid */}
        <div className="space-y-2.5">
          <div className="text-[11px] font-mono font-bold uppercase tracking-wider text-slate-400 text-center">
            Sign in with external account
          </div>
          <div className="grid grid-cols-2 gap-2.5">
            {/* Google */}
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => handleSocialSignIn("Google", signInWithGoogle)}
              className="flex items-center justify-center gap-2.5 py-2.5 px-3 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-700/80 hover:border-slate-600 text-xs font-semibold transition disabled:opacity-50 shadow-sm"
            >
              <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"/>
                <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"/>
                <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.15z"/>
                <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"/>
              </svg>
              <span>Google</span>
            </button>

            {/* Apple */}
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => handleSocialSignIn("Apple", signInWithApple)}
              className="flex items-center justify-center gap-2.5 py-2.5 px-3 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-700/80 hover:border-slate-600 text-xs font-semibold transition disabled:opacity-50 shadow-sm"
            >
              <svg className="w-4 h-4 shrink-0 fill-current" viewBox="0 0 170 170">
                <path d="M150.37 130.25c-2.45 5.66-5.35 10.87-8.71 15.66-4.58 6.53-8.33 11.05-11.22 13.56-4.48 4.12-9.28 6.23-14.42 6.35-3.69 0-8.14-1.05-13.32-3.18-5.19-2.12-9.97-3.17-14.34-3.17-4.58 0-9.49 1.05-14.75 3.17-5.26 2.13-9.5 3.24-12.74 3.35-4.35.13-9.16-1.9-14.42-6.08-3.7-3.04-7.66-7.79-11.89-14.24-5.23-7.98-9.39-16.71-12.47-26.2-3.08-9.48-4.63-18.7-4.63-27.65 0-12.42 3.08-23.01 9.24-31.78 6.16-8.77 14.07-13.29 23.73-13.56 4.48 0 9.41 1.15 14.78 3.44 5.38 2.29 9.17 3.51 11.39 3.65 1.8.14 5.76-1.15 11.89-3.86 6.13-2.71 11.45-3.88 15.96-3.52 11.75.95 21.09 5.51 28.02 13.68-10.45 6.32-15.54 14.88-15.26 25.68.27 8.35 3.52 15.35 9.75 21 6.23 5.66 13.58 8.76 22.06 9.32-2.12 6.32-4.68 12.43-7.67 18.32zM119.22 33.64c0-6.72 2.45-13.08 7.35-19.08 4.9-6 10.9-9.84 18-11.52.54 6.72-1.57 13.08-6.33 19.08-4.76 6-10.76 9.84-18 11.52-.36-.67-.62-1.42-.77-2.25-.16-.83-.25-1.66-.25-2.49z"/>
              </svg>
              <span>Apple</span>
            </button>

            {/* Microsoft */}
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => handleSocialSignIn("Microsoft", signInWithMicrosoft)}
              className="flex items-center justify-center gap-2.5 py-2.5 px-3 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-700/80 hover:border-slate-600 text-xs font-semibold transition disabled:opacity-50 shadow-sm"
            >
              <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 23 23">
                <path fill="#f35325" d="M1 1h10v10H1z"/>
                <path fill="#81bc06" d="M12 1h10v10H12z"/>
                <path fill="#05a6f0" d="M1 12h10v10H1z"/>
                <path fill="#ffba08" d="M12 12h10v10H12z"/>
              </svg>
              <span>Microsoft</span>
            </button>

            {/* GitHub */}
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => handleSocialSignIn("GitHub", signInWithGithub)}
              className="flex items-center justify-center gap-2.5 py-2.5 px-3 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-700/80 hover:border-slate-600 text-xs font-semibold transition disabled:opacity-50 shadow-sm"
            >
              <svg className="w-4 h-4 shrink-0 fill-current" viewBox="0 0 24 24">
                <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"/>
              </svg>
              <span>GitHub</span>
            </button>
          </div>
        </div>

        {/* Divider */}
        <div className="relative flex items-center justify-center">
          <div className="border-t border-slate-800 w-full" />
          <span className="bg-slate-900 px-3 text-[10px] font-mono font-bold uppercase tracking-wider text-slate-500 shrink-0">
            Or continue with email
          </span>
        </div>

        {/* 2. Email Auth Tabs */}
        <div className="space-y-4">
          <div className="flex rounded-xl bg-slate-950 p-1 border border-slate-800 text-xs font-semibold">
            <button
              type="button"
              onClick={() => {
                setActiveTab("magic");
                setStatusMessage(null);
              }}
              className={`flex-1 py-1.5 rounded-lg transition text-center flex items-center justify-center gap-1.5 ${
                activeTab === "magic"
                  ? "bg-yellow-400 text-slate-950 font-black shadow"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Passwordless Link</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab("password");
                setStatusMessage(null);
              }}
              className={`flex-1 py-1.5 rounded-lg transition text-center flex items-center justify-center gap-1.5 ${
                activeTab === "password"
                  ? "bg-yellow-400 text-slate-950 font-black shadow"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <Lock className="w-3.5 h-3.5" />
              <span>Password</span>
            </button>
          </div>

          {/* TAB A: Passwordless Magic Link */}
          {activeTab === "magic" && (
            <form onSubmit={handleSendMagicLink} className="space-y-3">
              <div className="space-y-1">
                <label className="block text-[11px] font-mono font-bold text-slate-300 uppercase tracking-wider">
                  Musician Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@domain.com"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-yellow-400 font-medium"
                  />
                </div>
              </div>

              <p className="text-[11px] text-slate-400 leading-relaxed">
                We will email you a secure 1-click login link. Tap it on your phone or desktop to access your portal immediately without remembering a password.
              </p>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full flex items-center justify-center gap-2 bg-yellow-400 hover:bg-yellow-300 text-slate-950 font-black py-2.5 px-4 rounded-xl text-xs uppercase tracking-wider transition shadow-lg shadow-yellow-400/10 disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Dispatching Link...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Send 1-Click Sign-In Link</span>
                  </>
                )}
              </button>
            </form>
          )}

          {/* TAB B: Password / Register / Reset Suite */}
          {activeTab === "password" && (
            <form onSubmit={handlePasswordSubmit} className="space-y-3">
              {passwordMode === "reset" ? (
                // Password Reset View
                <div className="space-y-3">
                  <div className="space-y-1">
                    <label className="block text-[11px] font-mono font-bold text-slate-300 uppercase tracking-wider">
                      Account Email Address
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="you@domain.com"
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-yellow-400 font-medium"
                      />
                    </div>
                  </div>

                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    Enter the email registered with the band. We will send you instructions to reset your password.
                  </p>

                  <div className="flex gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setPasswordMode("signin")}
                      className="px-3 py-2 rounded-xl border border-slate-800 hover:bg-slate-800 text-slate-400 hover:text-white text-xs font-semibold transition"
                    >
                      Back
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="flex-1 flex items-center justify-center gap-2 bg-yellow-400 hover:bg-yellow-300 text-slate-950 font-black py-2.5 px-4 rounded-xl text-xs uppercase tracking-wider transition disabled:opacity-50"
                    >
                      {isSubmitting ? "Sending..." : "Send Reset Email"}
                    </button>
                  </div>
                </div>
              ) : (
                // Normal Sign-in / Sign-up View
                <>
                  {passwordMode === "signup" && (
                    <div className="space-y-1">
                      <label className="block text-[11px] font-mono font-bold text-slate-300 uppercase tracking-wider">
                        Musician Full Name
                      </label>
                      <div className="relative">
                        <User className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          required
                          value={displayName}
                          onChange={(e) => setDisplayName(e.target.value)}
                          placeholder="First & Last Name"
                          className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-yellow-400 font-medium"
                        />
                      </div>
                    </div>
                  )}

                  <div className="space-y-1">
                    <label className="block text-[11px] font-mono font-bold text-slate-300 uppercase tracking-wider">
                      Email Address
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="you@domain.com"
                        className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-yellow-400 font-medium"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <label className="block text-[11px] font-mono font-bold text-slate-300 uppercase tracking-wider">
                        Password
                      </label>
                      {passwordMode === "signin" && (
                        <button
                          type="button"
                          onClick={() => setPasswordMode("reset")}
                          className="text-[11px] text-yellow-400 hover:underline font-semibold"
                        >
                          Forgot?
                        </button>
                      )}
                    </div>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type={showPassword ? "text" : "password"}
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full pl-10 pr-10 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-yellow-400 font-medium"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full flex items-center justify-center gap-2 bg-yellow-400 hover:bg-yellow-300 text-slate-950 font-black py-2.5 px-4 rounded-xl text-xs uppercase tracking-wider transition shadow-lg shadow-yellow-400/10 disabled:opacity-50 mt-2"
                  >
                    {isSubmitting ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Processing...</span>
                      </>
                    ) : (
                      <>
                        <ArrowRight className="w-4 h-4" />
                        <span>
                          {passwordMode === "signup" ? "Register Member Account" : "Sign In to Portal"}
                        </span>
                      </>
                    )}
                  </button>

                  {/* Toggle between Sign-in and Sign-up */}
                  <div className="text-center pt-1 text-xs text-slate-400">
                    {passwordMode === "signin" ? (
                      <span>
                        New to the band?{" "}
                        <button
                          type="button"
                          onClick={() => setPasswordMode("signup")}
                          className="text-yellow-400 hover:underline font-bold ml-1"
                        >
                          Register here
                        </button>
                      </span>
                    ) : (
                      <span>
                        Already have an account?{" "}
                        <button
                          type="button"
                          onClick={() => setPasswordMode("signin")}
                          className="text-yellow-400 hover:underline font-bold ml-1"
                        >
                          Sign in
                        </button>
                      </span>
                    )}
                  </div>
                </>
              )}
            </form>
          )}
        </div>

        {/* Footer Support Info */}
        <div className="text-center pt-2 text-[11px] text-slate-500 flex items-center justify-center gap-1 border-t border-slate-800/80">
          <HelpCircle className="w-3.5 h-3.5" />
          <span>Need access? Contact your section leader or band director.</span>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[70vh] flex items-center justify-center text-xs text-slate-400 font-mono">
          Loading authentication portal...
        </div>
      }
    >
      <LoginContent />
    </Suspense>
  );
}

