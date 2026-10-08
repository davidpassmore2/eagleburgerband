"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import {
  Bell,
  Flag,
  Calendar,
  Lightbulb,
  Mail,
  Receipt,
  UserCheck,
  CheckCircle2,
  ArrowRight,
  ExternalLink,
  Sparkles,
  Check,
  Inbox,
  X,
} from "lucide-react";
import { useManagerTaskQueue, ManagerTaskItem } from "@/lib/portal/useManagerTaskQueue";

interface ManagerNotificationBellProps {
  className?: string;
  align?: "left" | "right";
}

export default function ManagerNotificationBell({
  className = "",
  align = "right",
}: ManagerNotificationBellProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [coords, setCoords] = useState<{ top: number; left: number } | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  const {
    totalCount,
    managerTaskCount,
    dispatchCount,
    tasks,
    recentDispatches,
    loading,
    markDispatchAsRead,
  } = useManagerTaskQueue();

  const updatePosition = useCallback(() => {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const popoverWidth = Math.min(380, window.innerWidth - 24);
      let left = rect.left;

      if (align === "right" || left + popoverWidth > window.innerWidth - 12) {
        left = rect.right - popoverWidth;
      }

      left = Math.max(12, Math.min(left, window.innerWidth - popoverWidth - 12));
      const top = rect.bottom + 8;

      setCoords({ top, left });
    }
  }, [align]);

  const toggleOpen = () => {
    if (!isOpen) {
      updatePosition();
      setIsOpen(true);
    } else {
      setIsOpen(false);
    }
  };

  // Close when clicking outside or pressing Escape, and update position on resize/scroll
  useEffect(() => {
    if (!isOpen) return;

    updatePosition();

    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;
      if (
        popoverRef.current &&
        !popoverRef.current.contains(target) &&
        buttonRef.current &&
        !buttonRef.current.contains(target)
      ) {
        setIsOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    function handleReposition() {
      updatePosition();
    }

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    window.addEventListener("resize", handleReposition);
    window.addEventListener("scroll", handleReposition, true);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("resize", handleReposition);
      window.removeEventListener("scroll", handleReposition, true);
    };
  }, [isOpen, updatePosition]);

  const getTaskIcon = (category: ManagerTaskItem["category"]) => {
    switch (category) {
      case "comments":
        return <Flag className="w-4 h-4 text-rose-400" />;
      case "inquiries":
        return <Calendar className="w-4 h-4 text-amber-400" />;
      case "suggestions":
        return <Lightbulb className="w-4 h-4 text-yellow-400" />;
      case "contacts":
        return <Mail className="w-4 h-4 text-sky-400" />;
      case "reimbursements":
        return <Receipt className="w-4 h-4 text-emerald-400" />;
      case "auditions":
        return <Sparkles className="w-4 h-4 text-purple-400" />;
      case "onboarding":
        return <UserCheck className="w-4 h-4 text-teal-400" />;
      default:
        return <Inbox className="w-4 h-4 text-slate-400" />;
    }
  };

  const hasUrgent = tasks.some((t) => t.priority === "urgent");

  return (
    <div className={`relative inline-block ${className}`}>
      {/* Trigger Bell Button */}
      <button
        ref={buttonRef}
        type="button"
        onClick={toggleOpen}
        className="relative p-2 rounded-xl text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 transition cursor-pointer flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-yellow-400/40"
        title={
          totalCount > 0
            ? `${totalCount} item${totalCount === 1 ? "" : "s"} awaiting attention`
            : "Tasks & Notifications"
        }
        aria-label="Toggle task and notification menu"
        aria-expanded={isOpen}
      >
        <Bell
          className={`w-4 h-4 transition ${
            totalCount > 0 ? "text-yellow-400" : "text-slate-400"
          }`}
        />

        {/* Counter Badge Pill */}
        {totalCount > 0 && (
          <span
            className={`absolute -top-1 -right-1 px-1.5 min-w-[18px] h-[18px] text-[10px] font-black rounded-full flex items-center justify-center shadow-lg border border-slate-900 ${
              hasUrgent
                ? "bg-rose-500 text-white animate-pulse"
                : "bg-yellow-400 text-slate-950"
            }`}
          >
            {totalCount > 99 ? "99+" : totalCount}
          </span>
        )}
      </button>

      {/* Flyout Dropdown Popover via React Portal directly into document.body */}
      {isOpen &&
        coords &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            ref={popoverRef}
            suppressHydrationWarning
            style={{
              top: `${coords.top}px`,
              left: `${coords.left}px`,
              backgroundColor: "var(--ebb-surface, #0f172a)",
              borderColor: "var(--ebb-border, #334155)",
            }}
            className="fixed z-[100] w-[calc(100vw-24px)] max-w-[380px] rounded-2xl border shadow-2xl overflow-hidden animate-fadeIn"
          >
            {/* Popover Header */}
            <div
              suppressHydrationWarning
              style={{
                backgroundColor: "var(--ebb-surface-muted, #1e293b)",
                borderColor: "var(--ebb-border, #334155)",
              }}
              className="px-4 py-3 border-b flex items-center justify-between"
            >
              <div className="flex items-center gap-2">
                <span className="font-bold text-xs uppercase tracking-wider text-white">
                  Queue &amp; Dispatches
                </span>
                {totalCount > 0 && (
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-yellow-400/20 text-yellow-300 font-bold border border-yellow-400/30">
                    {totalCount} Total
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition cursor-pointer"
                title="Close menu"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Scrollable Content Container */}
            <div className="max-h-[70vh] overflow-y-auto divide-y divide-white/5 [scrollbar-width:thin]">
              {/* Section A: Manager Action Queue */}
              {tasks.length > 0 && (
                <div className="p-3 space-y-2">
                  <div className="px-1 flex items-center justify-between">
                    <span className="text-[10px] font-mono uppercase font-bold text-amber-400 tracking-wider flex items-center gap-1.5">
                      <Sparkles className="w-3 h-3 text-amber-400" />
                      Manager Tasks ({managerTaskCount})
                    </span>
                    <span className="text-[10px] text-slate-400">Action Required</span>
                  </div>

                  <div className="space-y-1.5">
                    {tasks.map((task) => (
                      <Link
                        key={task.id}
                        href={task.href}
                        onClick={() => setIsOpen(false)}
                        className={`p-2.5 rounded-xl border transition flex items-start justify-between gap-3 group cursor-pointer ${
                          task.priority === "urgent"
                            ? "bg-rose-950/20 border-rose-500/30 hover:border-rose-500/60"
                            : "bg-white/5 border-white/5 hover:bg-white/10 hover:border-white/20"
                        }`}
                      >
                        <div className="flex items-start gap-2.5 min-w-0">
                          <div className="p-1.5 rounded-lg bg-black/40 border border-white/10 shrink-0 mt-0.5">
                            {getTaskIcon(task.category)}
                          </div>
                          <div className="min-w-0">
                            <div className="text-xs font-bold text-white flex items-center gap-1.5">
                              <span className="truncate">{task.title}</span>
                              <span
                                className={`text-[10px] font-mono px-1.5 py-0.2 rounded font-bold ${
                                  task.priority === "urgent"
                                    ? "bg-rose-500 text-white"
                                    : "bg-amber-400/20 text-amber-300 border border-amber-400/30"
                                }`}
                              >
                                {task.count}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">
                              {task.description}
                            </p>
                          </div>
                        </div>

                        <div className="shrink-0 text-slate-500 group-hover:text-yellow-400 transition self-center">
                          <ArrowRight className="w-3.5 h-3.5" />
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {/* Section B: Personal Band Dispatches */}
              {recentDispatches.length > 0 && (
                <div className="p-3 space-y-2">
                  <div className="px-1 flex items-center justify-between">
                    <span className="text-[10px] font-mono uppercase font-bold text-purple-400 tracking-wider flex items-center gap-1.5">
                      <Bell className="w-3 h-3 text-purple-400" />
                      Unread Dispatches ({dispatchCount})
                    </span>
                    <Link
                      href="/portal/notifications"
                      onClick={() => setIsOpen(false)}
                      className="text-[10px] text-slate-400 hover:text-white transition"
                    >
                      View feed &rarr;
                    </Link>
                  </div>

                  <div className="space-y-1.5">
                    {recentDispatches.slice(0, 4).map((dispatch) => (
                      <div
                        key={dispatch.id}
                        className="p-2.5 rounded-xl bg-purple-950/20 border border-purple-500/20 flex items-start justify-between gap-3"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="text-xs font-bold text-white line-clamp-1">
                            {dispatch.title}
                          </div>
                          <p className="text-[11px] text-slate-300 line-clamp-1 mt-0.5">
                            {dispatch.message}
                          </p>
                          {dispatch.actionUrl && (
                            <Link
                              href={dispatch.actionUrl}
                              onClick={() => {
                                markDispatchAsRead(dispatch.id);
                                setIsOpen(false);
                              }}
                              className="inline-flex items-center gap-1 text-[10px] text-yellow-400 hover:underline font-bold mt-1"
                            >
                              <span>{dispatch.actionLabel || "View Details"}</span>
                              <ExternalLink className="w-2.5 h-2.5" />
                            </Link>
                          )}
                        </div>

                        <button
                          type="button"
                          onClick={() => markDispatchAsRead(dispatch.id)}
                          className="p-1 rounded-lg text-slate-400 hover:text-emerald-400 hover:bg-emerald-500/10 border border-transparent hover:border-emerald-500/30 transition shrink-0 cursor-pointer"
                          title="Mark as read"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Empty State: All clear */}
              {tasks.length === 0 && recentDispatches.length === 0 && !loading && (
                <div className="p-6 text-center space-y-2">
                  <div className="w-10 h-10 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 mx-auto flex items-center justify-center">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white">All Caught Up!</div>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      No pending leadership tasks or unread dispatches.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Popover Footer */}
            <div
              suppressHydrationWarning
              style={{
                backgroundColor: "var(--ebb-surface-muted, #1e293b)",
                borderColor: "var(--ebb-border, #334155)",
              }}
              className="p-2.5 border-t text-center"
            >
              <Link
                href="/portal/notifications"
                onClick={() => setIsOpen(false)}
                className="text-xs font-bold text-yellow-400 hover:text-yellow-300 transition flex items-center justify-center gap-1.5"
              >
                <span>Open Notification Studio</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
