"use client";

import React from "react";
import Link from "next/link";
import { ShieldAlert, ArrowLeft } from "lucide-react";

export interface AccessDeniedProps {
  title?: string;
  message: string;
  actionHref?: string;
  actionLabel?: string;
}

export default function AccessDenied({
  title = "Permission Required",
  message,
  actionHref = "/portal",
  actionLabel = "Return to Home Base",
}: AccessDeniedProps) {
  return (
    <div className="bg-slate-900 border border-rose-500/30 rounded-2xl p-6 sm:p-8 max-w-lg mx-auto my-8 shadow-xl space-y-4 text-center">
      <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-400 flex items-center justify-center mx-auto">
        <ShieldAlert className="w-6 h-6" />
      </div>

      <div className="space-y-1">
        <h2 className="text-lg font-bold text-white">{title}</h2>
        <p className="text-xs text-rose-300 leading-relaxed max-w-md mx-auto">
          {message}
        </p>
      </div>

      {actionHref && (
        <div className="pt-2">
          <Link
            href={actionHref}
            className="inline-flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-4 py-2 rounded-xl text-xs font-bold transition shadow-sm"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>{actionLabel}</span>
          </Link>
        </div>
      )}
    </div>
  );
}

