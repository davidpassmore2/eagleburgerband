"use client";

import React from "react";
import { AlertCircle, Save, Loader2, Undo2 } from "lucide-react";

export interface UnsavedChangesBarProps {
  /** Whether there are unsaved changes */
  isDirty: boolean;
  /** Whether a save request is in flight */
  isSaving: boolean;
  /** Callback invoked when the user clicks save */
  onSave: () => void | Promise<void>;
  /** Optional callback to discard changes and revert to saved state */
  onDiscard?: () => void;
  /** Main message title (default: "You have unsaved changes") */
  message?: string;
  /** Subtitle or helper description */
  subMessage?: string;
  /** Custom label for the save button (default: "Save Changes") */
  saveLabel?: string;
  /** Custom label while saving is in progress (default: "Saving...") */
  savingLabel?: string;
  /** Custom label for the discard button (default: "Discard Changes") */
  discardLabel?: string;
  /** Optional HTML form ID to link form submission */
  formId?: string;
  /** Additional custom classes for outer container */
  className?: string;
}

/**
 * Reusable sticky bottom action bar that activates whenever a form is dirty.
 * Provides clear tactile affordance, dirty status indicator, discard/reset action,
 * and save button with loading spinner state.
 */
export default function UnsavedChangesBar({
  isDirty,
  isSaving,
  onSave,
  onDiscard,
  message = "You have unsaved changes",
  subMessage = "Don't forget to save your updates before leaving this page.",
  saveLabel = "Save Changes",
  savingLabel = "Saving...",
  discardLabel = "Discard",
  formId,
  className = "",
}: UnsavedChangesBarProps) {
  return (
    <div
      role="region"
      aria-label="Unsaved changes notification"
      aria-live="polite"
      className={`fixed bottom-0 inset-x-0 z-40 transition-all duration-300 ease-out transform ${
        isDirty
          ? "translate-y-0 opacity-100 pointer-events-auto"
          : "translate-y-full opacity-0 pointer-events-none"
      } ${className}`}
    >
      <div className="bg-slate-900/95 backdrop-blur-md border-t border-amber-500/40 shadow-[0_-8px_30px_rgba(0,0,0,0.6)] px-4 sm:px-6 py-3.5">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          {/* Status & Message */}
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="relative shrink-0">
              <span className="flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-400" />
              </span>
            </div>
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
              <div>
                <p className="text-xs sm:text-sm font-bold text-white leading-tight">
                  {message}
                </p>
                {subMessage && (
                  <p className="text-[11px] text-slate-400 hidden sm:block leading-tight mt-0.5">
                    {subMessage}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
            {onDiscard && (
              <button
                type="button"
                onClick={onDiscard}
                disabled={isSaving}
                className="px-3.5 py-2 text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                title="Discard unsaved changes and revert to initial state"
              >
                <Undo2 className="w-3.5 h-3.5" />
                <span>{discardLabel}</span>
              </button>
            )}

            <button
              type={formId ? "submit" : "button"}
              form={formId}
              onClick={formId ? undefined : () => onSave()}
              disabled={!isDirty || isSaving}
              className="bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold px-5 py-2 rounded-xl text-xs flex items-center gap-2 transition shadow-lg shadow-amber-500/20 disabled:opacity-50 cursor-pointer shrink-0"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>{savingLabel}</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>{saveLabel}</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

