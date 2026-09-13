"use client";

import React, { useState, useSyncExternalStore } from "react";
import { 
  Smartphone, 
  Download, 
  CheckCircle2, 
  Share, 
  PlusSquare, 
  X, 
  Laptop,
} from "lucide-react";
import { 
  subscribePwa, 
  getStandaloneSnapshot, 
  getIOSSnapshot, 
  getDeferredPrompt,
  clearDeferredPrompt 
} from "@/lib/pwa/pwaStore";

interface PortalPwaCardProps {
  compact?: boolean;
}

export default function PortalPwaCard({ compact = false }: PortalPwaCardProps) {
  const isStandalone = useSyncExternalStore(subscribePwa, getStandaloneSnapshot, () => false);
  const isIOS = useSyncExternalStore(subscribePwa, getIOSSnapshot, () => false);
  const deferredPrompt = useSyncExternalStore(subscribePwa, getDeferredPrompt, () => null);
  const [showGuideModal, setShowGuideModal] = useState(false);
  const [justInstalled, setJustInstalled] = useState(false);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      try {
        await deferredPrompt.prompt();
        const choice = await deferredPrompt.userChoice;
        if (choice.outcome === "accepted") {
          setJustInstalled(true);
          clearDeferredPrompt();
        }
      } catch (err) {
        console.error("Install prompt error:", err);
      }
    } else {
      setShowGuideModal(true);
    }
  };

  if (isStandalone || justInstalled) {
    return (
      <div 
        suppressHydrationWarning
        style={{
          backgroundColor: "var(--ebb-surface)",
          borderColor: "var(--ebb-border)",
        }}
        className="border rounded-2xl p-4 sm:p-5 shadow flex items-center justify-between gap-4 transition-colors"
      >
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center shrink-0 shadow-sm">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-extrabold text-sm text-white">
                Eagleburger Musician App Active
              </h3>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 uppercase tracking-wider">
                Installed PWA
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5 leading-snug">
              Running in standalone app mode. Offline charts, call sheets, and gig dispatch ready.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div
        suppressHydrationWarning
        style={{
          backgroundColor: "var(--ebb-surface)",
          borderColor: "var(--ebb-border)",
        }}
        className={`border rounded-2xl ${compact ? "p-4" : "p-5"} shadow flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors`}
      >
        <div className="flex items-start sm:items-center gap-3.5">
          <div 
            suppressHydrationWarning
            style={{
              backgroundColor: "var(--ebb-surface-muted)",
              borderColor: "var(--ebb-border)",
              color: "var(--ebb-primary)",
            }}
            className="w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 shadow-sm"
          >
            <Smartphone className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-extrabold text-sm sm:text-base text-white">
                Install Musician Portal App
              </h3>
              <span 
                suppressHydrationWarning
                style={{
                  backgroundColor: "var(--ebb-surface-muted)",
                  borderColor: "var(--ebb-border)",
                  color: "var(--ebb-primary)",
                }}
                className="text-[9px] font-mono font-bold px-2 py-0.5 rounded border uppercase tracking-wider"
              >
                PWA
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5 leading-snug max-w-xl">
              Add the portal to your home screen or dock for 1-tap stage readiness, instant call sheets, and rehearsal charts.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setShowGuideModal(true)}
            className="px-3 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 transition cursor-pointer"
          >
            Instructions
          </button>

          <button
            type="button"
            onClick={handleInstallClick}
            className="inline-flex items-center gap-1.5 bg-yellow-400 hover:bg-yellow-300 text-slate-950 font-black px-4 py-2 rounded-xl text-xs uppercase tracking-wider transition shadow-lg shadow-yellow-400/20 cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>{deferredPrompt ? "Install App" : isIOS ? "iOS Add to Home" : "Install Guide"}</span>
          </button>
        </div>
      </div>

      {/* Installation Guide Modal */}
      {showGuideModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl p-6 max-w-lg w-full shadow-2xl relative space-y-5 text-white">
            <button
              onClick={() => setShowGuideModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-1.5 rounded-xl hover:bg-slate-800 transition cursor-pointer"
              aria-label="Close guide"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-yellow-400/10 border border-yellow-400/30 text-yellow-400 flex items-center justify-center">
                <Smartphone className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">How to Install the Musician App</h3>
                <p className="text-xs text-slate-400">Works on iPhones, iPads, Android devices, and laptops</p>
              </div>
            </div>

            {/* iOS Safari Instructions */}
            <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase tracking-wider text-yellow-400 flex items-center gap-1.5">
                  <Smartphone className="w-4 h-4" /> Apple iOS (iPhone &amp; iPad)
                </span>
                <span className="text-[10px] text-slate-500">Safari Browser</span>
              </div>
              <div className="space-y-2 text-xs text-slate-300">
                <div className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-slate-800 text-yellow-400 font-mono font-bold flex items-center justify-center shrink-0 text-[11px] mt-0.5">
                    1
                  </span>
                  <div>
                    Tap the <strong>Share</strong> button <Share className="w-3.5 h-3.5 inline mx-0.5 text-sky-400" /> at the bottom of Safari.
                  </div>
                </div>
                <div className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-slate-800 text-yellow-400 font-mono font-bold flex items-center justify-center shrink-0 text-[11px] mt-0.5">
                    2
                  </span>
                  <div>
                    Scroll down and tap <strong>Add to Home Screen</strong> <PlusSquare className="w-3.5 h-3.5 inline mx-0.5 text-emerald-400" />.
                  </div>
                </div>
                <div className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-slate-800 text-yellow-400 font-mono font-bold flex items-center justify-center shrink-0 text-[11px] mt-0.5">
                    3
                  </span>
                  <div>
                    Tap <strong>Add</strong> in the top right. Eagleburger will launch as a full-screen app!
                  </div>
                </div>
              </div>
            </div>

            {/* Android Chrome Instructions */}
            <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase tracking-wider text-yellow-400 flex items-center gap-1.5">
                  <Smartphone className="w-4 h-4" /> Android Devices
                </span>
                <span className="text-[10px] text-slate-500">Chrome / Edge</span>
              </div>
              <div className="space-y-2 text-xs text-slate-300">
                <div className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-slate-800 text-yellow-400 font-mono font-bold flex items-center justify-center shrink-0 text-[11px] mt-0.5">
                    1
                  </span>
                  <div>
                    Tap the <strong>three dots (&hellip;)</strong> in the upper-right corner of Chrome.
                  </div>
                </div>
                <div className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-slate-800 text-yellow-400 font-mono font-bold flex items-center justify-center shrink-0 text-[11px] mt-0.5">
                    2
                  </span>
                  <div>
                    Select <strong>Install app</strong> or <strong>Add to Home screen</strong>.
                  </div>
                </div>
              </div>
            </div>

            {/* Desktop Instructions */}
            <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase tracking-wider text-yellow-400 flex items-center gap-1.5">
                  <Laptop className="w-4 h-4" /> Mac &amp; Windows Desktop
                </span>
                <span className="text-[10px] text-slate-500">Chrome, Edge, Brave</span>
              </div>
              <div className="space-y-2 text-xs text-slate-300">
                <div className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-slate-800 text-yellow-400 font-mono font-bold flex items-center justify-center shrink-0 text-[11px] mt-0.5">
                    1
                  </span>
                  <div>
                    Look for the <strong>Install</strong> icon in your browser address bar on the right side.
                  </div>
                </div>
                <div className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-slate-800 text-yellow-400 font-mono font-bold flex items-center justify-center shrink-0 text-[11px] mt-0.5">
                    2
                  </span>
                  <div>
                    Click <strong>Install</strong> to add Eagleburger Band to your Applications or Start Menu.
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setShowGuideModal(false)}
                className="bg-slate-800 hover:bg-slate-700 text-white font-bold px-5 py-2.5 rounded-xl text-xs uppercase tracking-wider transition cursor-pointer"
              >
                Got It
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

