"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

export default function SectionAttendanceRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const gigId = params.get("gigId") || params.get("readiness");
      if (gigId) {
        router.replace(`/admin/gigs?readinessGigId=${encodeURIComponent(gigId)}`);
        return;
      }
    }
    router.replace("/admin/gigs");
  }, [router]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] p-12 text-slate-400 gap-3 text-xs">
      <Loader2 className="w-5 h-5 animate-spin text-yellow-400" />
      <p>Redirecting to Gig Management Studio (Section Readiness)...</p>
    </div>
  );
}