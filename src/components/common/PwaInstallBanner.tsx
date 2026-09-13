"use client";

import { useState, useEffect, useSyncExternalStore } from "react";
import { Download, Share, PlusSquare, X, Smartphone, Check } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

const emptySubscribe = () => () => {};

function getStandaloneSnapshot(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

function getIOSSnapshot(): boolean {
  if (typeof window === "undefined") return false;
  const userAgent = window.navigator.userAgent.toLowerCase();
  return /iphone|ipad|ipod/.test(userAgent);
}

export default function PwaInstallBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const isStandalone = useSyncExternalStore(emptySubscribe, getStandaloneSnapshot, () => false);
  const isIOS = useSyncExternalStore(emptySubscribe, getIOSSnapshot, () => false);
  const [isVisible, setIsVisible] = useState(false);
  const [showIOSInstructions, setShowIOSInstructions] = useState(false);
  const [installedSuccessfully, setInstalledSuccessfully] = useState(false);

  useEffect(() => {
    if (isStandalone) return;

    // Check dismiss cooldown from localStorage (7 days)
    const dismissedUntil = localStorage.getItem("ebb_pwa_dismissed_until");
    if (dismissedUntil && Number(dismissedUntil) > Date.now()) {
      return;
    }

    // Capture beforeinstallprompt for Chromium/Android/Desktop
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setIsVisible(true);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    // On iOS devices not yet in standalone, show the banner after 3 seconds
    let timer: ReturnType<typeof setTimeout> | undefined;
    if (isIOS) {
      timer = setTimeout(() => {
        setIsVisible(true);
      }, 3000);
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      if (timer) clearTimeout(timer);
    };
  }, [isStandalone, isIOS]);

  const handleInstallClick = async () => {
    if (isIOS) {
      setShowIOSInstructions(true);
      return;
    }

    if (!deferredPrompt) return;

    try {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "accepted") {
        setInstalledSuccessfully(true);
        setTimeout(() => setIsVisible(false), 2500);
      }
      setDeferredPrompt(null);
    } catch (err) {
      console.error("PWA install error:", err);
    }
  };

  const handleDismiss = () => {
    setIsVisible(false);
    // Suppress for 7 days
    const sevenDays = Date.now() + 7 * 24 * 60 * 60 * 1000;
    localStorage.setItem("ebb_pwa_dismissed_until", sevenDays.toString());
  };

  if (isStandalone || !isVisible) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-6 md:max-w-md z-50 animate-in fade-in slide-in-from-bottom-5 duration-300">
      <div className="bg-slate-900/95 backdrop-blur-md border border-yellow-400/30 rounded-2xl p-4 shadow-2xl shadow-yellow-400/10 text-white relative">
        <button
          onClick={handleDismiss}
          className="absolute top-3 right-3 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition cursor-pointer"
          aria-label="Dismiss banner"
        >
          <X className="w-4 h-4" />
        </button>

        {installedSuccessfully ? (
          <div className="flex items-center gap-3 py-2 text-emerald-400">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center">
              <Check className="w-5 h-5" />
            </div>
            <div>
              <div className="font-bold text-xs uppercase tracking-wider">Installed!</div>
              <div className="text-[11px] text-slate-300">Eagleburger Band is now installed on your device.</div>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-start gap-3 pr-6">
              <div className="w-10 h-10 rounded-xl bg-yellow-400/10 border border-yellow-400/30 text-yellow-400 flex items-center justify-center shrink-0 shadow-md">
                <Smartphone className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-black uppercase tracking-wider text-white">
                    Eagleburger Stage App
                  </span>
                  <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-yellow-400/20 text-yellow-400 font-bold border border-yellow-400/30">
                    PWA
                  </span>
                </div>
                <p className="text-[11px] text-slate-300 leading-snug mt-0.5">
                  Install the Musician Portal for fast offline access to charts, gig call sheets, and rehearsal tools.
                </p>
              </div>
            </div>

            {showIOSInstructions && isIOS ? (
              <div className="bg-slate-950/80 rounded-xl p-3 border border-slate-800 space-y-2 text-xs text-slate-300">
                <div className="font-bold text-yellow-400 flex items-center gap-1.5 text-[11px] uppercase tracking-wider">
                  <span>How to install on iOS:</span>
                </div>
                <div className="space-y-1.5 text-[11px]">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-slate-800 text-yellow-400 font-mono font-bold flex items-center justify-center shrink-0 text-[10px]">1</span>
                    <span>Tap the Safari <strong>Share</strong> button <Share className="w-3.5 h-3.5 inline mx-0.5 text-sky-400" /> at the bottom.</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-slate-800 text-yellow-400 font-mono font-bold flex items-center justify-center shrink-0 text-[10px]">2</span>
                    <span>Scroll down and tap <strong>Add to Home Screen</strong> <PlusSquare className="w-3.5 h-3.5 inline mx-0.5 text-emerald-400" />.</span>
                  </div>
                </div>
              </div>
            ) : null}

            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={handleDismiss}
                className="px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
              >
                Not Now
              </button>
              <button
                type="button"
                onClick={handleInstallClick}
                className="inline-flex items-center gap-1.5 bg-yellow-400 hover:bg-yellow-300 text-slate-950 font-black px-4 py-1.5 rounded-xl text-xs uppercase tracking-wider transition shadow-lg shadow-yellow-400/20 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>{isIOS ? "Install Guide" : "Install App"}</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

