"use client";

import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import { CheckCircle2, AlertCircle, Info, X } from "lucide-react";

export type ToastType = "success" | "error" | "info";

export interface ToastItem {
  id: string;
  type: ToastType;
  message: string;
  duration?: number;
}

interface ToastContextValue {
  showToast: (type: ToastType, message: string, duration?: number) => void;
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

// Global dispatcher to allow imperative calls: toast.success("Saved!")
type ToastListener = (type: ToastType, message: string, duration?: number) => void;
const listeners = new Set<ToastListener>();

export const toast = {
  success: (message: string, duration?: number) => {
    listeners.forEach((l) => l("success", message, duration));
  },
  error: (message: string, duration?: number) => {
    listeners.forEach((l) => l("error", message, duration));
  },
  info: (message: string, duration?: number) => {
    listeners.forEach((l) => l("info", message, duration));
  },
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    (type: ToastType, message: string, duration = 4000) => {
      const id = `toast_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
      setToasts((prev) => [...prev, { id, type, message, duration }]);

      if (duration > 0) {
        setTimeout(() => {
          removeToast(id);
        }, duration);
      }
    },
    [removeToast]
  );

  useEffect(() => {
    const listener: ToastListener = (type, message, duration) => {
      showToast(type, message, duration);
    };
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, [showToast]);

  return (
    <ToastContext.Provider value={{ showToast, removeToast }}>
      {children}

      {/* Floating Toast Notification Container */}
      <div
        className="fixed bottom-5 right-5 z-[9999] flex flex-col gap-2.5 max-w-sm w-full pointer-events-none px-4 sm:px-0"
        aria-live="polite"
      >
        {toasts.map((t) => {
          const isSuccess = t.type === "success";
          const isError = t.type === "error";

          return (
            <div
              key={t.id}
              className={`pointer-events-auto flex items-start gap-3 p-4 rounded-xl border shadow-2xl backdrop-blur-md transition-all animate-fadeIn ${
                isSuccess
                  ? "bg-slate-900/95 border-emerald-500/40 text-emerald-300 ring-1 ring-emerald-500/20"
                  : isError
                  ? "bg-slate-900/95 border-rose-500/40 text-rose-300 ring-1 ring-rose-500/20"
                  : "bg-slate-900/95 border-yellow-400/40 text-yellow-300 ring-1 ring-yellow-400/20"
              }`}
            >
              <div className="shrink-0 mt-0.5">
                {isSuccess && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
                {isError && <AlertCircle className="w-4 h-4 text-rose-400" />}
                {!isSuccess && !isError && <Info className="w-4 h-4 text-yellow-400" />}
              </div>

              <div className="flex-1 text-xs font-semibold text-white leading-relaxed whitespace-pre-line">
                {t.message}
              </div>

              <button
                type="button"
                onClick={() => removeToast(t.id)}
                className="shrink-0 text-slate-400 hover:text-white transition p-0.5"
                aria-label="Close notification"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}

