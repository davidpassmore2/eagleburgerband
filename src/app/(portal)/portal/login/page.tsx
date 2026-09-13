"use client";

import { useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function PortalLoginRedirectContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const params = searchParams.toString();
    const target = params ? `/login?${params}` : "/login";
    router.replace(target);
  }, [router, searchParams]);

  return (
    <div className="min-h-[50vh] flex items-center justify-center text-xs text-slate-400 font-mono">
      Redirecting to member login...
    </div>
  );
}

export default function PortalLoginRedirectPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[50vh] flex items-center justify-center text-xs text-slate-400 font-mono">
          Loading login portal...
        </div>
      }
    >
      <PortalLoginRedirectContent />
    </Suspense>
  );
}

