"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/context/AuthContext";
import { 
  initMetricsConfigListener, 
  recordRouteView, 
  recordInteraction 
} from "@/lib/metrics/usageTracker";

export function PortalUsageTracker() {
  const pathname = usePathname();
  const { profile, firebaseUser, loading } = useAuth();
  const userRef = useRef({ profile, firebaseUser });

  useEffect(() => {
    userRef.current = { profile, firebaseUser };
  }, [profile, firebaseUser]);

  // Initialize real-time config listener on mount
  useEffect(() => {
    const unsub = initMetricsConfigListener();
    return () => unsub();
  }, []);

  // Track route views on pathname or user change
  useEffect(() => {
    if (loading || !pathname) return;
    const uid = firebaseUser?.uid || profile?.uid;
    if (!uid) return;

    recordRouteView({
      pathname,
      user: {
        uid,
        displayName: profile?.displayName || firebaseUser?.displayName || "Musician",
        email: profile?.email || firebaseUser?.email || "",
        roles: profile?.roles || ["member"],
      },
    });
  }, [pathname, profile, firebaseUser, loading]);

  // Listen to custom interaction events dispatched anywhere across portal UI
  useEffect(() => {
    const handleCustomInteraction = (e: Event) => {
      const customEvent = e as CustomEvent<{
        action: string;
        details?: string;
        pathname?: string;
        metadata?: Record<string, unknown>;
      }>;
      const detail = customEvent.detail;
      if (!detail || !detail.action) return;

      const currentAuth = userRef.current;
      const uid = currentAuth.firebaseUser?.uid || currentAuth.profile?.uid;
      if (!uid) return;

      recordInteraction({
        action: detail.action,
        details: detail.details,
        pathname: detail.pathname || pathname,
        user: {
          uid,
          displayName: currentAuth.profile?.displayName || currentAuth.firebaseUser?.displayName || "Musician",
          email: currentAuth.profile?.email || currentAuth.firebaseUser?.email || "",
          roles: currentAuth.profile?.roles || ["member"],
        },
        metadata: detail.metadata,
      });
    };

    window.addEventListener("ebb-portal-interaction", handleCustomInteraction);
    return () => {
      window.removeEventListener("ebb-portal-interaction", handleCustomInteraction);
    };
  }, [pathname]);

  return null;
}

