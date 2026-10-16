"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function CharitableGivingRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/portal/finance?tab=giving");
  }, [router]);

  return (
    <div className="min-h-[50vh] flex flex-col items-center justify-center p-6 text-center space-y-3">
      <div className="w-10 h-10 border-4 border-yellow-400/30 border-t-yellow-400 rounded-full animate-spin" />
      <p className="text-xs text-slate-400 font-mono">
        Redirecting to Centralized Finance Hub (Giving)...
      </p>
    </div>
  );
}
