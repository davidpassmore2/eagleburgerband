"use client";

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useRef,
  useMemo,
  Suspense,
} from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { PortalLoadingOverlay } from "@/components/portal/PortalLoadingOverlay";

interface PortalLoadingContextValue {
  isLoading: boolean;
  startLoading: (key?: string) => void;
  stopLoading: (key?: string) => void;
  withLoading: <T>(promise: Promise<T>, key?: string) => Promise<T>;
}

const PortalLoadingContext = createContext<PortalLoadingContextValue | null>(null);

function NavigationWatcher({ onRouteSettled }: { onRouteSettled: () => void }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    // When pathname or searchParams change, the route transition has settled
    onRouteSettled();
  }, [pathname, searchParams, onRouteSettled]);

  return null;
}

export function PortalLoadingProvider({ children }: { children: React.ReactNode }) {
  const [activeKeys, setActiveKeys] = useState<Set<string>>(() => new Set());
  const [isNavigating, setIsNavigating] = useState(false);
  const navigationTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const startLoading = useCallback((key?: string) => {
    const effectiveKey = key || `manual-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    setActiveKeys((prev) => {
      const next = new Set(prev);
      next.add(effectiveKey);
      return next;
    });
  }, []);

  const stopLoading = useCallback((key?: string) => {
    setActiveKeys((prev) => {
      if (!key) {
        // Clear all manual keys if no key specified
        return new Set();
      }
      const next = new Set(prev);
      next.delete(key);
      return next;
    });
  }, []);

  const withLoading = useCallback(
    async <T,>(promise: Promise<T>, key?: string): Promise<T> => {
      const taskKey = key || `task-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      startLoading(taskKey);
      try {
        return await promise;
      } finally {
        stopLoading(taskKey);
      }
    },
    [startLoading, stopLoading]
  );

  const handleRouteSettled = useCallback(() => {
    if (navigationTimeoutRef.current) {
      clearTimeout(navigationTimeoutRef.current);
      navigationTimeoutRef.current = null;
    }
    setIsNavigating(false);
  }, []);

  // Intercept internal portal navigation link clicks
  useEffect(() => {
    const handleDocumentClick = (e: MouseEvent) => {
      // Ignore right clicks or clicks with modifiers
      if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;

      const target = e.target as HTMLElement | null;
      const anchor = target?.closest("a");
      if (!anchor) return;

      const href = anchor.getAttribute("href");
      if (!href) return;

      // Check if it's an internal portal link
      const isPortalRoute =
        href.startsWith("/portal") ||
        href.startsWith("/admin");

      // Ignore external, hash-only, or mailto/tel links
      if (!isPortalRoute || href.startsWith("#") || anchor.target === "_blank") {
        return;
      }

      // Check if target is different from current URL
      try {
        const currentUrl = new URL(window.location.href);
        const targetUrl = new URL(href, window.location.origin);

        const isSamePage =
          currentUrl.pathname === targetUrl.pathname &&
          currentUrl.search === targetUrl.search;

        if (!isSamePage) {
          setIsNavigating(true);

          // Safety timeout in case navigation is aborted or rejected
          if (navigationTimeoutRef.current) {
            clearTimeout(navigationTimeoutRef.current);
          }
          navigationTimeoutRef.current = setTimeout(() => {
            setIsNavigating(false);
          }, 3000);
        }
      } catch {
        // Ignore URL parse failures
      }
    };

    document.addEventListener("click", handleDocumentClick, { capture: true });
    return () => {
      document.removeEventListener("click", handleDocumentClick, { capture: true });
      if (navigationTimeoutRef.current) {
        clearTimeout(navigationTimeoutRef.current);
      }
    };
  }, []);

  // Intercept global fetch calls inside portal for automated service call loading
  useEffect(() => {
    if (typeof window === "undefined") return;

    const originalFetch = window.fetch;
    let counter = 0;

    window.fetch = async (...args) => {
      const callId = `fetch-${++counter}-${Date.now()}`;
      const urlString =
        typeof args[0] === "string"
          ? args[0]
          : args[0] instanceof Request
          ? args[0].url
          : "";

      const isInternalOrPrefetch =
        urlString.includes("/_next/") ||
        urlString.includes("/api/telemetry") ||
        urlString.includes("_rsc=") ||
        (typeof args[1]?.headers === "object" &&
          args[1]?.headers !== null &&
          "RSC" in (args[1].headers as Record<string, unknown>));

      if (!isInternalOrPrefetch) {
        startLoading(callId);
      }

      try {
        return await originalFetch(...args);
      } finally {
        if (!isInternalOrPrefetch) {
          stopLoading(callId);
        }
      }
    };

    return () => {
      window.fetch = originalFetch;
    };
  }, [startLoading, stopLoading]);

  const isLoading = useMemo(() => {
    return isNavigating || activeKeys.size > 0;
  }, [isNavigating, activeKeys]);

  const contextValue = useMemo<PortalLoadingContextValue>(
    () => ({
      isLoading,
      startLoading,
      stopLoading,
      withLoading,
    }),
    [isLoading, startLoading, stopLoading, withLoading]
  );

  return (
    <PortalLoadingContext.Provider value={contextValue}>
      <Suspense fallback={null}>
        <NavigationWatcher onRouteSettled={handleRouteSettled} />
      </Suspense>
      {children}
      <PortalLoadingOverlay show={isLoading} />
    </PortalLoadingContext.Provider>
  );
}

export function usePortalLoading(): PortalLoadingContextValue {
  const ctx = useContext(PortalLoadingContext);
  if (!ctx) {
    throw new Error("usePortalLoading must be used within a PortalLoadingProvider");
  }
  return ctx;
}

