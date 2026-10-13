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
      }

      @keyframes floatUp {
        to {
          transform: translateY(${fullscreen ? "-120vh" : "-120%"});
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

      const size = Math.random() * 50 + 20;
      const duration = Math.random() * 5 + 5;

      bubble.style.width = `${size}px`;
      bubble.style.height = `${size}px`;
      bubble.style.left = `${Math.random() * 100}%`;
      bubble.style.animationDuration = `${duration}s`;
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
  }, [enabled, opacity, density, fullscreen]);

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

