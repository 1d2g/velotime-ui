import React, { useEffect } from "react";
import { CheckCircle2, ArrowRight, X, Sparkles, Check } from "lucide-react";

/**
 * WalkthroughCompletionModal Component
 *
 * Appears when the evaluator completes the 3-step interactive guided tutorial.
 * Celebrates keyboard mastery and lets them continue exploring or claim their workspace.
 */
export default function WalkthroughCompletionModal({
  isOpen,
  onClose,
  onClaimWorkspace,
}) {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      id="walkthrough-completion-modal"
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xs select-none animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white dark:bg-zinc-900 border-2 border-slate-900 dark:border-zinc-700 max-w-lg w-full shadow-2xl relative overflow-hidden text-slate-900 dark:text-white">
        {/* Top Accent Stripe */}
        <div className="h-1.5 w-full bg-rose-500" />

        {/* Modal Header */}
        <div className="p-6 border-b border-slate-200 dark:border-zinc-800 flex items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono font-bold uppercase px-2 py-0.5 bg-rose-50 text-rose-800 dark:bg-rose-950/60 dark:text-rose-400 border border-rose-300 dark:border-rose-800">
                Tutorial Complete • Keyboard Mastery
              </span>
            </div>
            <h2 className="text-xl font-black tracking-tight text-slate-950 dark:text-white">
              You Have Mastered the Keyboard Flow
            </h2>
            <p className="text-xs text-slate-600 dark:text-zinc-400">
              You just logged hours, attached an audit note, and glided into the next deliverable without touching your mouse once.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer shrink-0"
            aria-label="Close dialog"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 3-Step Mastery Recap */}
        <div className="p-6 space-y-4">
          <div className="border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-950/50 p-3.5 space-y-2 text-xs text-slate-700 dark:text-zinc-300 font-medium">
            <div className="flex items-center gap-2">
              <Check className="w-3.5 h-3.5 text-rose-500 shrink-0" />
              <span>Step 1: Direct in-cell hours logging with zero popups</span>
            </div>
            <div className="flex items-center gap-2">
              <Check className="w-3.5 h-3.5 text-rose-500 shrink-0" />
              <span>Step 2: Inline audit note drawer via Tab or Spacebar</span>
            </div>
            <div className="flex items-center gap-2">
              <Check className="w-3.5 h-3.5 text-rose-500 shrink-0" />
              <span>Step 3: Continuous keyboard glide into the next deliverable</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-2 flex flex-col sm:flex-row items-center gap-2.5 justify-end">
            <button
              type="button"
              onClick={onClose}
              className="w-full sm:w-auto px-4 py-2 border border-slate-300 dark:border-zinc-700 hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-700 dark:text-slate-300 font-bold text-xs transition-colors cursor-pointer"
            >
              Explore Grid Freely
            </button>

            {onClaimWorkspace && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onClaimWorkspace();
                }}
                className="w-full sm:w-auto px-4 py-2 bg-rose-500 hover:bg-rose-600 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-sm"
              >
                <Sparkles className="w-3.5 h-3.5 text-white" />
                <span>Save & Claim Workspace</span>
                <ArrowRight className="w-3.5 h-3.5 text-white" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
