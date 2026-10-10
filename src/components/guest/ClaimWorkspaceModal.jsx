import React, { useState } from "react";
import { X, Sparkles, ShieldCheck, Download, ArrowRight, Check } from "lucide-react";
import { SignUp } from "@clerk/clerk-react";

/**
 * ClaimWorkspaceModal
 *
 * Appears when a guest user clicks "Save & Claim Workspace" or reaches
 * a gated export action. Provides clear reassurance that their data
 * is preserved and launches Clerk sign-up with zero credit card required.
 */
export default function ClaimWorkspaceModal({
  isOpen,
  onClose,
  totalHours = 16.0,
  projectsCount = 3,
  clientsCount = 3,
  onExportCsv,
  onInitiateSignUp,
}) {
  const [showClerkSignUp, setShowClerkSignUp] = useState(false);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs select-none">
      <div 
        className="bg-white dark:bg-zinc-900 border-2 border-slate-900 dark:border-zinc-700 max-w-lg w-full shadow-2xl relative overflow-hidden text-slate-900 dark:text-white"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Accent Stripe */}
        <div className="h-1.5 w-full bg-emerald-500" />

        {/* Modal Header */}
        <div className="p-6 border-b border-slate-200 dark:border-zinc-800 flex items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono font-bold uppercase px-1.5 py-0.5 bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800">
                14-Day Free Cloud Trial
              </span>
              <span className="text-xs font-mono text-slate-500">No Credit Card</span>
            </div>
            <h2 className="text-xl font-black tracking-tight text-slate-950 dark:text-white">
              Save & Claim Your Studio Workspace
            </h2>
            <p className="text-xs text-slate-600 dark:text-zinc-400">
              Your guest timesheet entries, client customizations, and project tasks are preserved and synced to your permanent organization.
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

        {/* Modal Body */}
        <div className="p-6 space-y-5">
          {showClerkSignUp ? (
            <div className="py-2 flex justify-center">
              <SignUp
                routing="hash"
                signInUrl="/?mode=signin"
                fallbackRedirectUrl="/"
              />
            </div>
          ) : (
            <>
              {/* Preserved Data Summary Box */}
              <div className="p-4 bg-slate-50 dark:bg-zinc-950 border border-slate-300 dark:border-zinc-800 space-y-2">
                <div className="text-[10px] font-mono uppercase text-slate-500 font-bold">
                  Data Preserved for Cloud Migration:
                </div>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="p-2 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800">
                    <div className="text-base font-black text-slate-900 dark:text-white tabular-nums">
                      {totalHours.toFixed(1)}h
                    </div>
                    <div className="text-[10px] text-slate-500 font-medium">Logged Hours</div>
                  </div>
                  <div className="p-2 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800">
                    <div className="text-base font-black text-slate-900 dark:text-white tabular-nums">
                      {clientsCount}
                    </div>
                    <div className="text-[10px] text-slate-500 font-medium">Studio Clients</div>
                  </div>
                  <div className="p-2 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800">
                    <div className="text-base font-black text-slate-900 dark:text-white tabular-nums">
                      {projectsCount * 3}
                    </div>
                    <div className="text-[10px] text-slate-500 font-medium">Deliverable Tasks</div>
                  </div>
                </div>
              </div>

              {/* Guarantees checklist */}
              <div className="space-y-1.5 text-xs text-slate-700 dark:text-zinc-300 font-medium">
                <div className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span>Full access to team timesheets, client invoicing, and PDF export.</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span>$5/user/mo after trial (vs $14/user on Harvest). Cancel anytime.</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span>Direct founder support (Dustin Gray • dgray@dg.tools).</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex flex-col sm:flex-row items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    if (onInitiateSignUp) onInitiateSignUp();
                    setShowClerkSignUp(true);
                  }}
                  className="w-full sm:flex-1 py-2.5 px-4 bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:text-slate-950 font-bold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-sm"
                >
                  <Sparkles className="w-3.5 h-3.5 text-emerald-400 dark:text-emerald-600" />
                  <span>Create Free Account (1-Click)</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>

                {onExportCsv && (
                  <button
                    type="button"
                    onClick={onExportCsv}
                    className="w-full sm:w-auto py-2.5 px-3 bg-white dark:bg-zinc-800 hover:bg-slate-100 dark:hover:bg-zinc-700 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-zinc-700 font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                    title="Download raw timesheet hours as a CSV file"
                  >
                    <Download className="w-3.5 h-3.5 text-slate-500" />
                    <span>Download CSV</span>
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
