"use client";

import React, { useState, useEffect, useRef } from "react";

interface PortalLoadingOverlayProps {
  show?: boolean;
  imageSrc?: string;
  label?: string;
  delayMs?: number;       // Debounce threshold before showing (default 150ms)
  minDurationMs?: number; // Minimum hold time once shown (default 400ms)
}

export function PortalLoadingOverlay({
  show = true,
  imageSrc = "/images/portal-loading-logo.png",
  label = "Loading...",
  delayMs = 150,
  minDurationMs = 400,
}: PortalLoadingOverlayProps) {
  const [shouldRender, setShouldRender] = useState(false);
  const [isFadingIn, setIsFadingIn] = useState(false);
  const [imageError, setImageError] = useState(false);

  const showTimerRef = useRef<NodeJS.Timeout | null>(null);
  const hideTimerRef = useRef<NodeJS.Timeout | null>(null);
  const shownAtRef = useRef<number>(0);

  useEffect(() => {
    if (show) {
      // Clear any pending hide timer if re-triggered
      if (hideTimerRef.current) {
        clearTimeout(hideTimerRef.current);
        hideTimerRef.current = null;
      }

      // Debounce entrance: only display if loading persists past delayMs
      if (!shouldRender && !showTimerRef.current) {
        showTimerRef.current = setTimeout(() => {
          shownAtRef.current = Date.now();
          setShouldRender(true);
          requestAnimationFrame(() => {
            setIsFadingIn(true);
          });
          showTimerRef.current = null;
        }, delayMs);
      }
    } else {
      // Cancel pending entrance if operation finished before delayMs threshold
      if (showTimerRef.current) {
        clearTimeout(showTimerRef.current);
        showTimerRef.current = null;
      }

      if (shouldRender) {
        const timeElapsed = Date.now() - shownAtRef.current;
        const remainingHoldTime = Math.max(0, minDurationMs - timeElapsed);

        if (hideTimerRef.current) {
          clearTimeout(hideTimerRef.current);
        }

        hideTimerRef.current = setTimeout(() => {
          // Smooth fade out
          setIsFadingIn(false);

          // Unmount from DOM after fade-out transition finishes (250ms)
          hideTimerRef.current = setTimeout(() => {
            setShouldRender(false);
            hideTimerRef.current = null;
          }, 250);
        }, remainingHoldTime);
      }
    }

    return () => {
      if (showTimerRef.current) clearTimeout(showTimerRef.current);
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    };
  }, [show, delayMs, minDurationMs, shouldRender]);

  if (!shouldRender) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label={label}
      className={`fixed inset-0 z-[99999] flex flex-col items-center justify-center bg-slate-950/70 backdrop-blur-sm pointer-events-auto select-none transition-opacity duration-250 ease-in-out ${
        isFadingIn ? "opacity-100" : "opacity-0"
      }`}
    >
      <div className="relative flex flex-col items-center justify-center">
        {!imageError ? (
          <div className="animate-portal-white-glow relative w-24 h-24 sm:w-28 sm:h-28 flex items-center justify-center">
            {/* Standard img to ensure direct .png loading without Next.js Image optimization caching hurdles */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={imageSrc}
              alt="Eagleburger Band"
              width={112}
              height={112}
              onError={() => setImageError(true)}
              className="w-full h-full object-contain pointer-events-none"
            />
          </div>
        ) : (
          /* Graceful fallback emblem with pulsing white glow if custom PNG is unavailable */
          <div className="animate-portal-white-glow w-24 h-24 sm:w-28 sm:h-28 rounded-2xl bg-amber-400/20 border border-yellow-400/40 flex flex-col items-center justify-center shadow-2xl">
            <span className="text-amber-400 font-black text-2xl tracking-wider font-mono">
              EBB
            </span>
            <span className="text-[9px] uppercase tracking-widest text-slate-300 font-bold mt-1">
              PORTAL
            </span>
          </div>
        )}

        {/* Subtle pulsing status indicator */}
        <span className="sr-only">{label}</span>
      </div>
    </div>
  );
}

export default PortalLoadingOverlay;
