"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

export default function CheckInSelectorRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/portal/checkin");
  }, [router]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] p-12 text-slate-400 gap-3 text-xs">
      <Loader2 className="w-5 h-5 animate-spin text-yellow-400" />
      <p>Redirecting to My Attendance &amp; Check-In...</p>
    </div>
  );
}