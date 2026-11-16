import React, { useState, useEffect } from "react";
import { Download, X, ShieldCheck, Mail } from "lucide-react";
import GoogleAuthButton from "../auth/GoogleAuthButton";
import { notifyHighIntentMilestone } from "../../utils/highIntentNotifier";

/**
 * GuestFloatingActionBar
 *
 * Sticky bottom action bar that surfaces in Guest Sandbox once active engagement
 * is verified (15s dwell time, >= 1 cell edit, or trial param). Bridges in-grid
 * evaluation directly to 1-click Google workspace preservation, email claim, or CSV export.
 */
export default function GuestFloatingActionBar({
  totalHours = 0,
  projectsCount = 3,
  clientsCount = 3,
  userCellEditCount = 0,
  isTrial = false,
  onClaimWorkspace,
  onExportCsv,
  onInitiateSignUp,
}) {
  const [dwellSeconds, setDwellSeconds] = useState(0);
  const [isDismissed, setIsDismissed] = useState(() => {
    try {
      return sessionStorage.getItem("velotime_floating_bar_dismissed") === "true";
    } catch {
      return false;
    }
  });

  useEffect(() => {
    if (isDismissed) return;
    const interval = setInterval(() => {
      setDwellSeconds((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [isDismissed]);

  const isFriday = new Date().getDay() === 5;
  // Surface the floating action bar once the visitor edits a cell, explores for 15s, or arrived via a Trial CTA
  const shouldShow = !isDismissed && (userCellEditCount >= 1 || dwellSeconds >= 15 || isTrial);

  if (!shouldShow) return null;

  const handleDismiss = () => {
    setIsDismissed(true);
    try {
      sessionStorage.setItem("velotime_floating_bar_dismissed", "true");
    } catch {}
  };

  return (
    <div className="fixed bottom-4 inset-x-0 mx-auto z-40 max-w-3xl px-4 select-none animate-in fade-in slide-in-from-bottom-3 duration-300 pointer-events-auto">
      <div className="bg-slate-950/95 dark:bg-zinc-900/95 backdrop-blur-md text-white border-2 border-slate-800 dark:border-zinc-700 shadow-2xl px-3.5 py-2.5 flex flex-col sm:flex-row items-center justify-between gap-3">
        {/* Left: Engagement stats and value prop */}
        <div className="flex items-center gap-2.5 min-w-0 w-full sm:w-auto">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0 hidden sm:block" />
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-mono text-[10px] font-bold px-1.5 py-0.2 bg-slate-800 text-slate-300 border border-slate-700 uppercase tracking-wider">
                {isFriday ? "Friday Timesheet Ready" : "Unsaved Sandbox Edits"}
              </span>
              <span className="text-[11px] text-slate-400 font-mono hidden md:inline">
                <ShieldCheck className="w-3 h-3 text-emerald-400 inline mr-1" />
                No Credit Card Required
              </span>
            </div>
            <div className="text-xs font-semibold text-slate-200 truncate mt-0.5">
              <span className="text-white font-bold">{totalHours.toFixed(1)}h logged</span> across{" "}
              <span className="text-white font-bold">{projectsCount} projects</span>. Save your workspace to keep your changes.
            </div>
          </div>
        </div>

        {/* Right: Direct 1-click Google Save + Email/Export options */}
        <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto justify-end flex-wrap sm:flex-nowrap">
          {onExportCsv && (
            <button
              type="button"
              onClick={onExportCsv}
              className="px-2.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 font-bold text-xs transition-colors inline-flex items-center gap-1.5 cursor-pointer"
              title="Download current entries as CSV"
            >
              <Download className="w-3.5 h-3.5 text-slate-400" />
              <span className="hidden lg:inline">CSV</span>
            </button>
          )}

          <button
            type="button"
            onClick={onClaimWorkspace}
            className="px-2.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 font-bold text-xs transition-colors inline-flex items-center gap-1.5 cursor-pointer"
            title="Save workspace with email or export options"
          >
            <Mail className="w-3.5 h-3.5 text-slate-400" />
            <span>Email / Export</span>
          </button>

          <GoogleAuthButton
            mode="signup"
            label="Save with Google — 60 Days Free"
            shortLabel="Save with Google"
            source="guest_floating_bar"
            onBeforeRedirect={() => {
              notifyHighIntentMilestone(null, "guest_signup_initiated", {
                headline: "[SIGNUP INITIATED] Guest clicked 1-Click Google Save in Floating Bar",
                details: `${totalHours.toFixed(1)}h logged across ${projectsCount} projects (${clientsCount} clients)`,
              });
              if (onInitiateSignUp) onInitiateSignUp();
            }}
            className="w-auto py-1.5 px-3 bg-white hover:bg-slate-100 text-slate-950 border border-white font-black text-xs inline-flex items-center gap-1.5 shadow-sm cursor-pointer"
          />

          <button
            type="button"
            onClick={handleDismiss}
            className="p-1 text-slate-400 hover:text-white transition-colors cursor-pointer shrink-0 ml-0.5"
            aria-label="Dismiss action bar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
