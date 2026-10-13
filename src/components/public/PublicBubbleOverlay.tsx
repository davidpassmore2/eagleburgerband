"use client";

import React, { useEffect, useRef } from "react";
import { BubbleEffectConfig } from "@/lib/schema/theme";

interface PublicBubbleOverlayProps {
  config?: BubbleEffectConfig;
  fullscreen?: boolean;
  className?: string;
}

export default function PublicBubbleOverlay({
  config,
  fullscreen = true,
  className = "",
}: PublicBubbleOverlayProps) {
  const localContainerRef = useRef<HTMLDivElement>(null);

  const enabled = Boolean(config?.enabled);
  const opacity = typeof config?.opacity === "number" ? Math.max(0, Math.min(1, config.opacity)) : 0.7;
  const density = config?.density || "medium";
  const variability = typeof config?.variability === "number" ? Math.max(0, Math.min(1, config.variability)) : 0.5;

  useEffect(() => {
    if (!enabled || typeof document === "undefined") {
      return;
    }

    const parent = fullscreen ? document.body : localContainerRef.current;
    if (!parent) return;

    // Create the overlay host element
    const overlayHost = document.createElement("div");
    overlayHost.setAttribute("data-bubble-overlay", "true");

    if (fullscreen) {
      Object.assign(overlayHost.style, {
        position: "fixed",
        top: "0",
        left: "0",
        width: "100vw",
        height: "100vh",
        pointerEvents: "none",
        zIndex: "2147483647",
        opacity: String(opacity),
        transition: "opacity 300ms ease",
      });
    } else {
      Object.assign(overlayHost.style, {
        position: "absolute",
        top: "0",
        left: "0",
        width: "100%",
        height: "100%",
        pointerEvents: "none",
        zIndex: "10",
        opacity: String(opacity),
        transition: "opacity 300ms ease",
      });
    }

    // Isolate bubble styles with Shadow DOM
    const shadow = overlayHost.attachShadow ? overlayHost.attachShadow({ mode: "open" }) : overlayHost;
    parent.appendChild(overlayHost);

    const style = document.createElement("style");
    style.textContent = `
      .bubble {
        position: absolute;
        bottom: -60px;
        border-radius: 50%;
        background: transparent;
        pointer-events: none;
        animation: floatUp linear forwards;
        box-shadow: inset 0 0 8px rgba(255, 255, 255, 0.4), 0 0 4px rgba(255, 255, 255, 0.2);
        border: 1px solid rgba(255, 255, 255, 0.15);
        will-change: transform, opacity;
      }

      @keyframes floatUp {
        0% {
          transform: translate3d(0, 0, 0);
        }
        35% {
          transform: translate3d(var(--arc-x1, 0px), ${fullscreen ? "-40vh" : "-40%"}, 0);
        }
        70% {
          transform: translate3d(var(--arc-x2, 0px), ${fullscreen ? "-80vh" : "-80%"}, 0);
        }
        100% {
          transform: translate3d(var(--arc-x3, 0px), ${fullscreen ? "-120vh" : "-120%"}, 0);
          opacity: 0;
        }
      }
    `;
    shadow.appendChild(style);

    const container = document.createElement("div");
    container.id = "bubble-container";
    Object.assign(container.style, {
      position: "absolute",
      width: "100%",
      height: "100%",
      overflow: "hidden",
    });
    shadow.appendChild(container);

    function getSubtleTint() {
      const hue = Math.floor(Math.random() * 360);
      return `hsla(${hue}, 30%, 85%, 0.15)`;
    }

    function spawnBubble() {
      if (typeof document !== "undefined" && document.hidden) return;

      const bubble = document.createElement("div");
      bubble.className = "bubble";

      // 1. Size differentiation governed by variability (base: 45px)
      // At variability=0: fixed 45px. At variability=1: 12px to 95px range.
      const minSize = 45 - 33 * variability;
      const maxSize = 45 + 50 * variability;
      const size = Math.round(minSize + Math.random() * (maxSize - minSize));

      // 2. Speed / duration variance governed by variability (base: 7.0s)
      // At variability=0: fixed 7.0s. At variability=1: 2.0s (swift) to 13.0s (gentle floater).
      const minDuration = 7.0 - 5.0 * variability;
      const maxDuration = 7.0 + 6.0 * variability;
      const duration = minDuration + Math.random() * (maxDuration - minDuration);

      // 3. Vertical movement arc differentiation (horizontal sway / drift)
      // At variability=0: pure straight vertical (0px). At variability=1: wide organic arcs.
      const maxArc = (fullscreen ? 90 : 45) * variability;
      const swayDirection = (Math.random() - 0.5) * 2; // -1 to +1
      const arcType = Math.random();

      let arcX1 = 0;
      let arcX2 = 0;
      let arcX3 = 0;

      if (arcType < 0.35) {
        // C-curve (parabolic lateral drift)
        arcX1 = Math.round(swayDirection * maxArc * 0.6);
        arcX2 = Math.round(swayDirection * maxArc * 1.0);
        arcX3 = Math.round(swayDirection * maxArc * 0.75);
      } else if (arcType < 0.70) {
        // S-curve (subtle wavering sway)
        arcX1 = Math.round(swayDirection * maxArc * 0.7);
        arcX2 = Math.round(-swayDirection * maxArc * 0.5);
        arcX3 = Math.round(swayDirection * maxArc * 0.3);
      } else {
        // Progressive wind draft
        arcX1 = Math.round(swayDirection * maxArc * 0.35);
        arcX2 = Math.round(swayDirection * maxArc * 0.7);
        arcX3 = Math.round(swayDirection * maxArc * 1.0);
      }

      bubble.style.width = `${size}px`;
      bubble.style.height = `${size}px`;
      bubble.style.left = `${Math.random() * 100}%`;
      bubble.style.animationDuration = `${duration.toFixed(2)}s`;
      bubble.style.setProperty("--arc-x1", `${arcX1}px`);
      bubble.style.setProperty("--arc-x2", `${arcX2}px`);
      bubble.style.setProperty("--arc-x3", `${arcX3}px`);
      bubble.style.background = `radial-gradient(circle at 30% 30%, rgba(255, 255, 255, 0.5), ${getSubtleTint()})`;

      container.appendChild(bubble);
      setTimeout(() => {
        bubble.remove();
      }, duration * 1000);
    }

    // Spawn rate interval based on density
    const spawnIntervalMs = density === "high" ? 110 : density === "low" ? 450 : 220;

    // Spawn an initial gentle bubble immediately
    spawnBubble();
    const intervalId = setInterval(spawnBubble, spawnIntervalMs);

    return () => {
      clearInterval(intervalId);
      overlayHost.remove();
    };
  }, [enabled, opacity, density, variability, fullscreen]);

  if (!enabled) return null;

  if (!fullscreen) {
    return (
      <div
        ref={localContainerRef}
        aria-hidden="true"
        className={`absolute inset-0 w-full h-full pointer-events-none overflow-hidden ${className}`}
      />
    );
  }

  return null;
}

