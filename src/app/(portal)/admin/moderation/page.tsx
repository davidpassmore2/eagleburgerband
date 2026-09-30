"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

export default function AdminModerationRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/admin/comments");
  }, [router]);

  return (
    <div className="flex items-center justify-center min-h-[50vh] text-slate-400 gap-2 text-xs">
      <Loader2 className="w-4 h-4 animate-spin text-yellow-400" />
      Redirecting to Comment Moderation...
    </div>
  );
}
