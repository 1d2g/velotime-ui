import React, { useState, useEffect } from "react";
import { Sparkles, Download, ArrowRight, X, ShieldCheck, ArrowLeft } from "lucide-react";

/**
 * GuestFloatingActionBar
 *
 * Sticky bottom action bar that surfaces in Guest Sandbox once active engagement
 * is verified (45s dwell time OR >= 2 cell edits). Bridges in-grid evaluation
 * directly to cloud workspace preservation and CSV export.
 */
export default function GuestFloatingActionBar({
  totalHours = 0,
  projectsCount = 3,
  clientsCount = 3,
  userCellEditCount = 0,
  onClaimWorkspace,
  onExportCsv,
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

  const shouldShow =
    !isDismissed && (dwellSeconds >= 45 || userCellEditCount >= 2);

  if (!shouldShow) return null;

  const handleDismiss = () => {
    setIsDismissed(true);
    try {
      sessionStorage.setItem("velotime_floating_bar_dismissed", "true");
    } catch {}
  };

  return (
    <div className="fixed bottom-4 inset-x-0 mx-auto z-40 max-w-3xl px-4 select-none animate-in fade-in slide-in-from-bottom-3 duration-300 pointer-events-auto">
      <div className="bg-slate-950/95 dark:bg-zinc-900/95 backdrop-blur-md text-white border-2 border-slate-800 dark:border-zinc-700 shadow-2xl p-3 sm:p-3.5 flex flex-col sm:flex-row items-center justify-between gap-3">
        {/* Left: Engagement stats and value prop */}
        <div className="flex items-center gap-2.5 min-w-0 w-full sm:w-auto">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0 hidden sm:block" />
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-mono text-[10px] font-bold px-1.5 py-0.2 bg-slate-800 text-slate-300 border border-slate-700 uppercase tracking-wider">
                Active Sandbox
              </span>
              <span className="text-xs text-slate-400 font-mono hidden md:inline">
                <ShieldCheck className="w-3 h-3 text-emerald-400 inline mr-1" />
                14-Day Free Cloud Trial
              </span>
            </div>
            <div className="text-xs font-semibold text-slate-200 truncate mt-0.5">
              <span className="text-white font-bold">{totalHours.toFixed(1)}h logged</span> across{" "}
              <span className="text-white font-bold">{projectsCount} projects</span>. Keep test data & invite your team.
            </div>
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto justify-end">
          <a
            href="https://velotime.dg.tools"
            className="px-2 py-1.5 text-slate-400 hover:text-white text-xs font-semibold inline-flex items-center gap-1 transition-colors"
            title="Read overview, features, and pricing on main site"
          >
            <ArrowLeft className="w-3 h-3 text-slate-400" />
            <span className="hidden sm:inline">Main Site</span>
          </a>

          {onExportCsv && (
            <button
              type="button"
              onClick={onExportCsv}
              className="px-2.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 font-bold text-xs transition-colors inline-flex items-center gap-1.5 cursor-pointer"
              title="Download current entries as CSV"
            >
              <Download className="w-3.5 h-3.5 text-slate-400" />
              <span>Export CSV</span>
            </button>
          )}

          <button
            type="button"
            onClick={onClaimWorkspace}
            className="px-3.5 py-1.5 bg-rose-500 hover:bg-rose-600 text-white font-black text-xs transition-colors inline-flex items-center gap-1.5 shadow-sm cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5 text-white" />
            <span>Save & Claim Workspace</span>
            <ArrowRight className="w-3.5 h-3.5 text-white" />
          </button>

          <button
            type="button"
            onClick={handleDismiss}
            className="p-1 text-slate-400 hover:text-white transition-colors cursor-pointer shrink-0 ml-1"
            aria-label="Dismiss action bar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
