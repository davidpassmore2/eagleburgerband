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
  CheckCheck,
  ArrowRight,
  ExternalLink,
  Sparkles,
  Check,
  Inbox,
  X,
} from "lucide-react";
import { useManagerTaskQueue, ManagerTaskItem } from "@/lib/portal/useManagerTaskQueue";
import { useTheme } from "@/lib/context/ThemeContext";

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

  const { activePortalMode, getScopedStyles } = useTheme();

  const {
    totalCount,
    managerTaskCount,
    dispatchCount,
    tasks,
    recentDispatches,
    loading,
    markDispatchAsRead,
    dismissTask,
    clearAll,
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
        style={{
          backgroundColor: "var(--ebb-surface-muted, #1e293b)",
          borderColor: "var(--ebb-border, #334155)",
          color: "var(--ebb-text)",
        }}
        className="relative p-2 rounded-xl hover:opacity-90 border transition cursor-pointer flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-[var(--ebb-primary,#facc15)]/40"
        title={
          totalCount > 0
            ? `${totalCount} item${totalCount === 1 ? "" : "s"} awaiting attention`
            : "Tasks & Notifications"
        }
        aria-label="Toggle task and notification menu"
        aria-expanded={isOpen}
      >
        <Bell
          style={{
            color: totalCount > 0 ? "var(--ebb-primary, #facc15)" : "var(--ebb-text-muted, #94a3b8)",
          }}
          className="w-4 h-4 transition"
        />

        {/* Counter Badge Pill */}
        {totalCount > 0 && (
          <span
            style={
              hasUrgent
                ? {}
                : {
                    backgroundColor: "var(--ebb-primary, #facc15)",
                    color: "#0f172a",
                  }
            }
            className={`absolute -top-1 -right-1 px-1.5 min-w-[18px] h-[18px] text-[10px] font-black rounded-full flex items-center justify-center shadow-lg border border-[var(--ebb-surface,#0f172a)] ${
              hasUrgent
                ? "bg-rose-500 text-white animate-pulse"
                : ""
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
            data-ebb-mode={activePortalMode}
            style={{
              ...getScopedStyles("portal"),
              top: `${coords.top}px`,
              left: `${coords.left}px`,
              backgroundColor: "var(--ebb-surface)",
              borderColor: "var(--ebb-border)",
              color: "var(--ebb-text)",
              fontFamily: "var(--ebb-font-body, var(--font-poppins, sans-serif))",
            }}
            className={`fixed z-[100] w-[calc(100vw-24px)] max-w-[380px] rounded-2xl border shadow-2xl overflow-hidden animate-fadeIn ${
              activePortalMode === "light" ? "ebb-light text-slate-900" : "ebb-dark text-slate-100"
            }`}
          >
            {/* Popover Header */}
            <div
              suppressHydrationWarning
              style={{
                backgroundColor: "var(--ebb-surface-muted)",
                borderColor: "var(--ebb-border)",
              }}
              className="px-4 py-3 border-b flex items-center justify-between"
            >
              <div className="flex items-center gap-2">
                <span 
                  style={{ color: "var(--ebb-text)" }}
                  className="font-bold text-xs uppercase tracking-wider"
                >
                  Queue &amp; Dispatches
                </span>
                {totalCount > 0 && (
                  <span 
                    style={{
                      backgroundColor: "color-mix(in srgb, var(--ebb-primary) 18%, transparent)",
                      borderColor: "color-mix(in srgb, var(--ebb-primary) 35%, transparent)",
                      color: "var(--ebb-primary)",
                    }}
                    className="text-[10px] font-mono px-2 py-0.5 rounded-full font-bold border"
                  >
                    {totalCount} Total
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1.5">
                {totalCount > 0 && (
                  <button
                    type="button"
                    onClick={async () => {
                      await clearAll();
                    }}
                    style={{
                      backgroundColor: "color-mix(in srgb, var(--ebb-surface) 60%, transparent)",
                      borderColor: "var(--ebb-border)",
                      color: "var(--ebb-text)",
                    }}
                    className="px-2 py-1 rounded-lg text-[10px] font-bold hover:opacity-80 border transition cursor-pointer flex items-center gap-1"
                    title="Clear all tasks and notifications"
                  >
                    <CheckCheck className="w-3 h-3 text-emerald-400" />
                    <span>Clear All</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  style={{ color: "var(--ebb-text-muted)" }}
                  className="p-1 rounded-lg hover:opacity-80 transition cursor-pointer"
                  title="Close menu"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Scrollable Content Container */}
            <div 
              style={{
                backgroundColor: "var(--ebb-surface)",
              }}
              className="max-h-[70vh] overflow-y-auto divide-y divide-[var(--ebb-border)]/40 [scrollbar-width:thin]"
            >
              {/* Section A: Manager Action Queue */}
              {tasks.length > 0 && (
                <div className="p-3 space-y-2">
                  <div className="px-1 flex items-center justify-between">
                    <span 
                      style={{ color: "var(--ebb-primary)" }}
                      className="text-[10px] font-mono uppercase font-bold tracking-wider flex items-center gap-1.5"
                    >
                      <Sparkles className="w-3 h-3" style={{ color: "var(--ebb-primary)" }} />
                      Manager Tasks ({managerTaskCount})
                    </span>
                    <span 
                      style={{ color: "var(--ebb-text-muted)" }}
                      className="text-[10px]"
                    >
                      Action Required
                    </span>
                  </div>

                  <div className="space-y-1.5">
                    {tasks.map((task) => (
                      <div
                        key={task.id}
                        style={{
                          backgroundColor: task.priority === "urgent" 
                            ? "color-mix(in srgb, #e11d48 12%, var(--ebb-surface))" 
                            : "color-mix(in srgb, var(--ebb-surface-muted) 50%, var(--ebb-surface))",
                          borderColor: task.priority === "urgent"
                            ? "color-mix(in srgb, #e11d48 40%, transparent)"
                            : "var(--ebb-border)",
                        }}
                        className="p-2.5 rounded-xl border transition flex items-start justify-between gap-2.5 group hover:border-[var(--ebb-primary)]/50"
                      >
                        <Link
                          href={task.href}
                          onClick={() => setIsOpen(false)}
                          className="flex items-start gap-2.5 min-w-0 flex-1 cursor-pointer"
                        >
                          <div 
                            style={{
                              backgroundColor: "color-mix(in srgb, var(--ebb-surface-muted) 70%, var(--ebb-background))",
                              borderColor: "var(--ebb-border)",
                            }}
                            className="p-1.5 rounded-lg border shrink-0 mt-0.5"
                          >
                            {getTaskIcon(task.category)}
                          </div>
                          <div className="min-w-0">
                            <div 
                              style={{ color: "var(--ebb-text)" }}
                              className="text-xs font-bold flex items-center gap-1.5"
                            >
                              <span className="truncate">{task.title}</span>
                              <span
                                style={
                                  task.priority === "urgent"
                                    ? { backgroundColor: "#e11d48", color: "#ffffff" }
                                    : {
                                        backgroundColor: "color-mix(in srgb, var(--ebb-primary) 18%, transparent)",
                                        borderColor: "color-mix(in srgb, var(--ebb-primary) 35%, transparent)",
                                        color: "var(--ebb-primary)",
                                      }
                                }
                                className="text-[10px] font-mono px-1.5 py-0.2 rounded font-bold border"
                              >
                                {task.count}
                              </span>
                            </div>
                            <p 
                              style={{ color: "var(--ebb-text-muted)" }}
                              className="text-[11px] line-clamp-1 mt-0.5"
                            >
                              {task.description}
                            </p>
                          </div>
                        </Link>

                        <div className="flex items-center gap-1 shrink-0 self-center">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              dismissTask(task.id);
                            }}
                            style={{ color: "var(--ebb-text-muted)" }}
                            className="p-1.5 rounded-lg hover:text-emerald-400 hover:bg-emerald-500/10 border border-transparent hover:border-emerald-500/30 transition cursor-pointer"
                            title="Clear this task from queue"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                          <Link
                            href={task.href}
                            onClick={() => setIsOpen(false)}
                            style={{ color: "var(--ebb-text-muted)" }}
                            className="p-1 hover:text-[var(--ebb-primary)] transition"
                            title="Go to task workstation"
                          >
                            <ArrowRight className="w-3.5 h-3.5" />
                          </Link>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Section B: Personal Band Dispatches */}
              {recentDispatches.length > 0 && (
                <div className="p-3 space-y-2">
                  <div className="px-1 flex items-center justify-between">
                    <span 
                      style={{ color: "var(--ebb-accent, #a855f7)" }}
                      className="text-[10px] font-mono uppercase font-bold tracking-wider flex items-center gap-1.5"
                    >
                      <Bell className="w-3 h-3" style={{ color: "var(--ebb-accent, #a855f7)" }} />
                      Unread Dispatches ({dispatchCount})
                    </span>
                    <Link
                      href="/portal/notifications"
                      onClick={() => setIsOpen(false)}
                      style={{ color: "var(--ebb-text-muted)" }}
                      className="text-[10px] hover:text-[var(--ebb-text)] transition"
                    >
                      View feed &rarr;
                    </Link>
                  </div>

                  <div className="space-y-1.5">
                    {recentDispatches.slice(0, 4).map((dispatch) => (
                      <div
                        key={dispatch.id}
                        style={{
                          backgroundColor: "color-mix(in srgb, var(--ebb-accent, #a855f7) 10%, var(--ebb-surface))",
                          borderColor: "color-mix(in srgb, var(--ebb-accent, #a855f7) 25%, var(--ebb-border))",
                        }}
                        className="p-2.5 rounded-xl border flex items-start justify-between gap-3"
                      >
                        <div className="min-w-0 flex-1">
                          <div 
                            style={{ color: "var(--ebb-text)" }}
                            className="text-xs font-bold line-clamp-1"
                          >
                            {dispatch.title}
                          </div>
                          <p 
                            style={{ color: "var(--ebb-text-muted)" }}
                            className="text-[11px] line-clamp-1 mt-0.5"
                          >
                            {dispatch.message}
                          </p>
                          {dispatch.actionUrl && (
                            <Link
                              href={dispatch.actionUrl}
                              onClick={() => {
                                markDispatchAsRead(dispatch.id);
                                setIsOpen(false);
                              }}
                              style={{ color: "var(--ebb-primary)" }}
                              className="inline-flex items-center gap-1 text-[10px] hover:underline font-bold mt-1"
                            >
                              <span>{dispatch.actionLabel || "View Details"}</span>
                              <ExternalLink className="w-2.5 h-2.5" />
                            </Link>
                          )}
                        </div>

                        <button
                          type="button"
                          onClick={() => markDispatchAsRead(dispatch.id)}
                          style={{ color: "var(--ebb-text-muted)" }}
                          className="p-1 rounded-lg hover:text-emerald-400 hover:bg-emerald-500/10 border border-transparent hover:border-emerald-500/30 transition shrink-0 cursor-pointer"
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
                  <div 
                    style={{
                      backgroundColor: "color-mix(in srgb, var(--ebb-primary, #10b981) 15%, transparent)",
                      borderColor: "color-mix(in srgb, var(--ebb-primary, #10b981) 30%, transparent)",
                      color: "var(--ebb-primary, #10b981)",
                    }}
                    className="w-10 h-10 rounded-full border mx-auto flex items-center justify-center"
                  >
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <div>
                    <div 
                      style={{ color: "var(--ebb-text)" }}
                      className="text-xs font-bold"
                    >
                      All Caught Up!
                    </div>
                    <p 
                      style={{ color: "var(--ebb-text-muted)" }}
                      className="text-[11px] mt-0.5"
                    >
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
                backgroundColor: "var(--ebb-surface-muted)",
                borderColor: "var(--ebb-border)",
              }}
              className="p-2.5 border-t text-center"
            >
              <Link
                href="/portal/notifications"
                onClick={() => setIsOpen(false)}
                style={{ color: "var(--ebb-primary)" }}
                className="text-xs font-bold hover:opacity-80 transition flex items-center justify-center gap-1.5"
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
