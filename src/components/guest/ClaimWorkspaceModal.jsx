import React, { useState } from "react";
import { X, Sparkles, ShieldCheck, Download, ArrowRight, Check, ArrowLeft } from "lucide-react";
import { SignUp } from "@clerk/clerk-react";
import GoogleAuthButton from "../auth/GoogleAuthButton";

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
        <div className="h-1.5 w-full bg-rose-500" />

        {/* Modal Header */}
        <div className="p-6 border-b border-slate-200 dark:border-zinc-800 flex items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono font-bold uppercase px-1.5 py-0.5 bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-400 border border-rose-300 dark:border-rose-800">
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
            <div className="py-2 flex flex-col items-center">
              <button
                type="button"
                onClick={() => setShowClerkSignUp(false)}
                className="self-start mb-3 text-xs text-slate-500 hover:text-slate-900 dark:hover:text-zinc-200 flex items-center gap-1.5 font-medium transition-colors cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back to claim options</span>
              </button>
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
                  <Check className="w-3.5 h-3.5 text-rose-500 dark:text-rose-400 shrink-0" />
                  <span>Full access to team timesheets, client invoicing, and PDF export.</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-rose-500 dark:text-rose-400 shrink-0" />
                  <span>$5/user/mo after trial (vs $14/user on Harvest). Cancel anytime.</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-rose-500 dark:text-rose-400 shrink-0" />
                  <span>Direct founder support (Dustin Gray • dgray@dg.tools).</span>
                </div>
              </div>

              {/* Action Buttons: 1-Click Google Sign Up + Email Fallback */}
              <div className="pt-2 space-y-2.5">
                <GoogleAuthButton
                  mode="signup"
                  label="Sign up with Google (1-Click)"
                  source="claim_workspace_modal"
                  onBeforeRedirect={() => {
                    if (onInitiateSignUp) onInitiateSignUp();
                  }}
                  className="w-full py-2.5 px-4 bg-white hover:bg-slate-50 text-slate-900 border-2 border-slate-900 dark:border-white font-bold text-xs flex items-center justify-center gap-2.5 transition-all shadow-md hover:shadow-lg cursor-pointer"
                />

                <div className="relative flex py-1 items-center">
                  <div className="flex-grow border-t border-slate-200 dark:border-zinc-800"></div>
                  <span className="flex-shrink mx-3 text-[10px] uppercase tracking-wider text-slate-400 dark:text-zinc-500 font-semibold">
                    or continue with email
                  </span>
                  <div className="flex-grow border-t border-slate-200 dark:border-zinc-800"></div>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      if (onInitiateSignUp) onInitiateSignUp();
                      try {
                        if (typeof window !== "undefined" && window.posthog) {
                          window.posthog.capture("signup_page_viewed", { source: "claim_workspace_modal_email" });
                        }
                      } catch (e) {}
                      setShowClerkSignUp(true);
                    }}
                    className="w-full sm:flex-1 py-2.5 px-4 bg-slate-900 hover:bg-slate-800 text-white dark:bg-zinc-800 dark:hover:bg-zinc-700 font-bold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-sm"
                  >
                    <span>Continue with Email</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>

                  {onExportCsv && (
                    <button
                      type="button"
                      onClick={onExportCsv}
                      className="w-full sm:w-auto py-2.5 px-3 bg-white dark:bg-zinc-900 hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-zinc-700 font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                      title="Download raw timesheet hours as a CSV file"
                    >
                      <Download className="w-3.5 h-3.5 text-slate-500" />
                      <span>Download CSV</span>
                    </button>
                  )}
                </div>
              </div>

              <div className="pt-2 text-center border-t border-slate-200 dark:border-zinc-800 space-y-1.5">
                <p className="text-[11px] text-slate-500 dark:text-zinc-400">
                  Ready to activate team billing?{" "}
                  <button
                    type="button"
                    onClick={() => {
                      try {
                        sessionStorage.setItem("velotime_auto_upgrade_checkout", "true");
                      } catch {}
                      if (onInitiateSignUp) onInitiateSignUp();
                      setShowClerkSignUp(true);
                    }}
                    className="text-slate-900 dark:text-white font-bold hover:underline cursor-pointer"
                  >
                    Subscribe directly to Pro ($5/seat/mo) &rarr;
                  </button>
                </p>
                <div>
                  <a
                    href="https://velotime.dg.tools"
                    className="text-[11px] text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 font-medium inline-flex items-center gap-1 transition-colors"
                  >
                    <ArrowLeft className="w-3 h-3" />
                    <span>Return to main site (Features, Comparison & Pricing)</span>
                  </a>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
