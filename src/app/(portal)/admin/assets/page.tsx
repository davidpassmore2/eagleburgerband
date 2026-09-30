"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

export default function AdminAssetsRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/admin/inventory");
  }, [router]);

  return (
    <div className="flex items-center justify-center min-h-[50vh] text-slate-400 gap-2 text-xs">
      <Loader2 className="w-4 h-4 animate-spin text-yellow-400" />
      Redirecting to Equipment & Assets...
    </div>
  );
}
