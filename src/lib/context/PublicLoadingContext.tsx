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

interface PublicLoadingContextValue {
  isLoading: boolean;
  startLoading: (key?: string) => void;
  stopLoading: (key?: string) => void;
  withLoading: <T>(promise: Promise<T>, key?: string) => Promise<T>;
}

const PublicLoadingContext = createContext<PublicLoadingContextValue | null>(null);

function NavigationWatcher({ onRouteSettled }: { onRouteSettled: () => void }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    // When pathname or searchParams change, the route transition has completed
    onRouteSettled();
  }, [pathname, searchParams, onRouteSettled]);

  return null;
}

export function PublicLoadingProvider({ children }: { children: React.ReactNode }) {
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

  // Intercept public site navigation clicks
  useEffect(() => {
    const handleDocumentClick = (e: MouseEvent) => {
      // Ignore right clicks or clicks with modifiers
      if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;

      const target = e.target as HTMLElement | null;
      const anchor = target?.closest("a");
      if (!anchor) return;

      const href = anchor.getAttribute("href");
      if (!href) return;

      // Ignore external, hash-only, mailto/tel, or new-tab links
      if (
        href.startsWith("http://") ||
        href.startsWith("https://") ||
        href.startsWith("mailto:") ||
        href.startsWith("tel:") ||
        href.startsWith("#") ||
        anchor.target === "_blank" ||
        anchor.hasAttribute("download")
      ) {
        return;
      }

      // Check if it's an internal route path
      if (!href.startsWith("/")) {
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
          }, 3500);
        }
      } catch {
        // Ignore URL parse failures
      }
    };

    // Listen to browser Back/Forward navigation
    const handlePopState = () => {
      setIsNavigating(true);
      if (navigationTimeoutRef.current) {
        clearTimeout(navigationTimeoutRef.current);
      }
      navigationTimeoutRef.current = setTimeout(() => {
        setIsNavigating(false);
      }, 3500);
    };

    document.addEventListener("click", handleDocumentClick, { capture: true });
    window.addEventListener("popstate", handlePopState);

    return () => {
      document.removeEventListener("click", handleDocumentClick, { capture: true });
      window.removeEventListener("popstate", handlePopState);
      if (navigationTimeoutRef.current) {
        clearTimeout(navigationTimeoutRef.current);
      }
    };
  }, []);

  const isLoading = useMemo(() => {
    return isNavigating || activeKeys.size > 0;
  }, [isNavigating, activeKeys]);

  const contextValue = useMemo<PublicLoadingContextValue>(
    () => ({
      isLoading,
      startLoading,
      stopLoading,
      withLoading,
    }),
    [isLoading, startLoading, stopLoading, withLoading]
  );

  return (
    <PublicLoadingContext.Provider value={contextValue}>
      <Suspense fallback={null}>
        <NavigationWatcher onRouteSettled={handleRouteSettled} />
      </Suspense>
      {children}
      <PortalLoadingOverlay show={isLoading} label="Loading Eagleburger Band..." fallbackBadge="BAND" />
    </PublicLoadingContext.Provider>
  );
}

export function usePublicLoading(): PublicLoadingContextValue {
  const ctx = useContext(PublicLoadingContext);
  if (!ctx) {
    throw new Error("usePublicLoading must be used within a PublicLoadingProvider");
  }
  return ctx;
}

