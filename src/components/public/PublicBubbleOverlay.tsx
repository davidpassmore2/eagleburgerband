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
      .bubble-mover {
        position: absolute;
        bottom: -80px;
        pointer-events: none;
        animation: floatUp linear forwards;
        will-change: transform;
      }

      .bubble-deflector {
        width: 100%;
        height: 100%;
        pointer-events: none;
        transform: translate3d(var(--mouse-nudge-x, 0px), var(--mouse-nudge-y, 0px), 0);
        transition: transform 0.38s cubic-bezier(0.18, 0.89, 0.32, 1.25);
        will-change: transform;
      }

      .bubble-body {
        position: relative;
        border-radius: 50%;
        background: transparent;
        pointer-events: none;
        box-shadow: inset 0 0 8px rgba(255, 255, 255, 0.4), 0 0 4px rgba(255, 255, 255, 0.2);
        border: 1px solid rgba(255, 255, 255, 0.16);
        will-change: transform, opacity;
        animation: bubbleGrow ease-out forwards;
        transform-origin: center center;
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
        }
      }

      @keyframes bubbleGrow {
        0% {
          transform: scale(0.85);
          opacity: 0.25;
        }
        15% {
          transform: scale(1);
          opacity: 1;
        }
        100% {
          transform: scale(var(--target-scale, 1.35));
          opacity: 1;
        }
      }

      .bubble-body.popping {
        animation: bubblePop 0.22s cubic-bezier(0.1, 0.9, 0.25, 1.2) forwards !important;
      }

      @keyframes bubblePop {
        0% {
          transform: scale(var(--target-scale, 1.35));
          opacity: 1;
        }
        40% {
          transform: scale(calc(var(--target-scale, 1.35) * 1.28));
          opacity: 0.9;
          box-shadow: inset 0 0 14px rgba(255, 255, 255, 0.9), 0 0 18px rgba(255, 255, 255, 0.7);
        }
        100% {
          transform: scale(calc(var(--target-scale, 1.35) * 1.55));
          opacity: 0;
          filter: blur(2px);
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

    let mouseX = -9999;
    let mouseY = -9999;
    let prevMouseX = -9999;
    let prevMouseY = -9999;
    let mouseVx = 0;
    let mouseVy = 0;
    let rafId: number | null = null;
    let lastMoveTime = 0;

    function triggerBubblePop(mover: HTMLElement, body: HTMLElement) {
      if (mover.getAttribute("data-popping") === "true") return;
      mover.setAttribute("data-popping", "true");
      mover.style.animationPlayState = "paused";
      body.classList.add("popping");
      setTimeout(() => {
        mover.remove();
      }, 220);
    }

    function applyMouseInfluence() {
      rafId = null;

      const movers = container.querySelectorAll<HTMLElement>(".bubble-mover");
      const interactionRadius = fullscreen ? 180 : 100;

      for (let i = 0; i < movers.length; i++) {
        const mover = movers[i];
        if (mover.getAttribute("data-popping") === "true") continue;

        const deflector = mover.querySelector<HTMLElement>(".bubble-deflector");
        const body = mover.querySelector<HTMLElement>(".bubble-body");
        if (!deflector || !body) continue;

        if (mouseX === -9999 || mouseY === -9999) {
          deflector.style.setProperty("--mouse-nudge-x", "0px");
          deflector.style.setProperty("--mouse-nudge-y", "0px");
          continue;
        }

        const rect = body.getBoundingClientRect();
        let bubbleX: number;
        let bubbleY: number;

        if (fullscreen) {
          bubbleX = rect.left + rect.width / 2;
          bubbleY = rect.top + rect.height / 2;
        } else if (localContainerRef.current) {
          const cRect = localContainerRef.current.getBoundingClientRect();
          bubbleX = rect.left + rect.width / 2 - cRect.left;
          bubbleY = rect.top + rect.height / 2 - cRect.top;
        } else {
          continue;
        }

        const dx = bubbleX - mouseX;
        const dy = bubbleY - mouseY;
        const dist = Math.hypot(dx, dy);

        // 1. Direct hit / Poke: If cursor touches the bubble body, pop it immediately!
        const pokeRadius = Math.max(18, rect.width * 0.45);
        if (dist < pokeRadius) {
          triggerBubblePop(mover, body);
          continue;
        }

        // 2. Proximity Deflection & Wake Draft
        if (dist < interactionRadius) {
          const proximity = 1 - dist / interactionRadius;
          const power = Math.pow(proximity, 1.4);
          const angle = Math.atan2(dy, dx);

          // Radial repulsion away from cursor
          const repelDist = (fullscreen ? 75 : 40) * power;
          let pushX = Math.cos(angle) * repelDist;
          let pushY = Math.sin(angle) * repelDist;

          // Velocity wind draft (air wake from moving mouse)
          pushX += Math.max(-50, Math.min(50, mouseVx * 0.4)) * proximity;
          pushY += Math.max(-50, Math.min(50, mouseVy * 0.4)) * proximity;

          deflector.style.setProperty("--mouse-nudge-x", `${Math.round(pushX)}px`);
          deflector.style.setProperty("--mouse-nudge-y", `${Math.round(pushY)}px`);
        } else {
          // Out of range: smoothly return to natural path
          deflector.style.setProperty("--mouse-nudge-x", "0px");
          deflector.style.setProperty("--mouse-nudge-y", "0px");
        }
      }
    }

    function onPointerMove(e: PointerEvent | MouseEvent) {
      const now = performance.now();
      const dt = Math.max(1, now - lastMoveTime);
      lastMoveTime = now;

      let clientX = e.clientX;
      let clientY = e.clientY;

      if (!fullscreen && localContainerRef.current) {
        const cRect = localContainerRef.current.getBoundingClientRect();
        clientX = e.clientX - cRect.left;
        clientY = e.clientY - cRect.top;
      }

      if (prevMouseX !== -9999) {
        const rawVx = ((clientX - prevMouseX) / dt) * 16.6;
        const rawVy = ((clientY - prevMouseY) / dt) * 16.6;
        mouseVx = mouseVx * 0.5 + rawVx * 0.5;
        mouseVy = mouseVy * 0.5 + rawVy * 0.5;
      }

      prevMouseX = clientX;
      prevMouseY = clientY;
      mouseX = clientX;
      mouseY = clientY;

      if (!rafId) {
        rafId = requestAnimationFrame(applyMouseInfluence);
      }
    }

    function onPointerLeave() {
      mouseX = -9999;
      mouseY = -9999;
      prevMouseX = -9999;
      prevMouseY = -9999;
      mouseVx = 0;
      mouseVy = 0;
      if (!rafId) {
        rafId = requestAnimationFrame(applyMouseInfluence);
      }
    }

    // Attach listeners
    const eventTarget = fullscreen ? window : (localContainerRef.current || window);
    eventTarget.addEventListener("pointermove", onPointerMove as EventListener, { passive: true });
    eventTarget.addEventListener("pointerleave", onPointerLeave as EventListener, { passive: true });

    function spawnBubble() {
      if (typeof document !== "undefined" && document.hidden) return;

      const mover = document.createElement("div");
      mover.className = "bubble-mover";

      const deflector = document.createElement("div");
      deflector.className = "bubble-deflector";

      const body = document.createElement("div");
      body.className = "bubble-body";

      // 1. Initial size governed by variability (base: 45px)
      const minSize = 45 - 33 * variability;
      const maxSize = 45 + 50 * variability;
      const size = Math.round(minSize + Math.random() * (maxSize - minSize));

      // 2. Speed / full flight duration governed by variability (base: 7.0s)
      const minDuration = 7.0 - 5.0 * variability;
      const maxDuration = 7.0 + 6.0 * variability;
      const duration = minDuration + Math.random() * (maxDuration - minDuration);

      // 3. Random scale factor: bubble grows to this extent as it ascends
      // Base growth: 1.10x up to 1.85x based on variability
      const minScale = 1.10;
      const maxScale = 1.30 + 0.55 * variability;
      const targetScale = parseFloat((minScale + Math.random() * (maxScale - minScale)).toFixed(2));

      // 4. Random lifespan: bubble ascends and pops when this lifespan is reached
      // Ensures bubble floats into view before popping (min ~25-35% of full ascent, up to 95%)
      const minLifespanRatio = Math.max(0.25, 0.38 - 0.18 * variability);
      const lifespanRatio = minLifespanRatio + Math.random() * (0.95 - minLifespanRatio);
      const lifespanSec = parseFloat((duration * lifespanRatio).toFixed(2));
      const lifespanMs = Math.round(lifespanSec * 1000);

      // 5. Vertical movement arc differentiation (horizontal sway / drift)
      const maxArc = (fullscreen ? 90 : 45) * variability;
      const swayDirection = (Math.random() - 0.5) * 2;
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

      // Configure Mover (spatial ascent & sway arc)
      mover.style.left = `${Math.random() * 100}%`;
      mover.style.animationDuration = `${duration.toFixed(2)}s`;
      mover.style.setProperty("--arc-x1", `${arcX1}px`);
      mover.style.setProperty("--arc-x2", `${arcX2}px`);
      mover.style.setProperty("--arc-x3", `${arcX3}px`);

      // Configure Body (size, grow animation, and color)
      body.style.width = `${size}px`;
      body.style.height = `${size}px`;
      body.style.animationDuration = `${lifespanSec}s`;
      body.style.setProperty("--target-scale", String(targetScale));
      body.style.background = `radial-gradient(circle at 30% 30%, rgba(255, 255, 255, 0.55), ${getSubtleTint()})`;

      deflector.appendChild(body);
      mover.appendChild(deflector);
      container.appendChild(mover);

      // Trigger pop when lifespan is reached
      setTimeout(() => {
        triggerBubblePop(mover, body);
      }, lifespanMs);
    }

    // Spawn rate interval based on density
    const spawnIntervalMs = density === "high" ? 110 : density === "low" ? 450 : 220;

    // Spawn an initial gentle bubble immediately
    spawnBubble();
    const intervalId = setInterval(spawnBubble, spawnIntervalMs);

    return () => {
      clearInterval(intervalId);
      if (rafId) cancelAnimationFrame(rafId);
      eventTarget.removeEventListener("pointermove", onPointerMove as EventListener);
      eventTarget.removeEventListener("pointerleave", onPointerLeave as EventListener);
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

