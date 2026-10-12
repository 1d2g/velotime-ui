import React, { useState } from "react";
import { Sparkles, ArrowRight, X, ShieldCheck, ArrowLeft } from "lucide-react";

/**
 * GuestReturnBanner
 *
 * Slim, high-contrast banner displayed when a recurring visitor arrives back
 * in the Guest Sandbox with existing preserved timesheet modifications in localStorage.
 */
export default function GuestReturnBanner({
  totalHours = 0,
  clientsCount = 3,
  onClaimWorkspace,
}) {
  const [isDismissed, setIsDismissed] = useState(() => {
    try {
      return sessionStorage.getItem("velotime_return_banner_dismissed") === "true";
    } catch {
      return false;
    }
  });

  if (isDismissed) return null;

  const handleDismiss = () => {
    setIsDismissed(true);
    try {
      sessionStorage.setItem("velotime_return_banner_dismissed", "true");
    } catch {}
  };

  return (
    <div className="w-full bg-slate-900 text-white border-b border-slate-800 px-4 py-2 text-xs font-sans z-45 shrink-0 select-none">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2.5">
        <div className="flex items-center gap-2 flex-wrap min-w-0">
          <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 bg-rose-950 text-rose-300 border border-rose-700/60 uppercase tracking-wider">
            Welcome Back
          </span>
          <span className="text-slate-200 text-xs">
            Your previous test workspace with <strong className="text-white">{totalHours.toFixed(1)}h</strong> across{" "}
            <strong className="text-white">{clientsCount} clients</strong> has been preserved.
          </span>
          <span className="text-slate-500 hidden md:inline">•</span>
          <span className="text-slate-400 text-xs hidden md:inline flex items-center gap-1">
            <ShieldCheck className="w-3 h-3 text-emerald-400 inline" />
            Zero credit card required
          </span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <a
            href="https://velotime.dg.tools"
            className="text-slate-400 hover:text-white text-xs font-semibold inline-flex items-center gap-1 px-1.5 py-1 transition-colors"
            title="Read overview, features, and pricing on main site"
          >
            <ArrowLeft className="w-3 h-3 text-slate-400" />
            <span className="hidden sm:inline">Main Site</span>
          </a>

          <button
            type="button"
            onClick={onClaimWorkspace}
            className="px-3 py-1 bg-rose-500 hover:bg-rose-600 text-white font-black text-xs transition-colors inline-flex items-center gap-1.5 shadow-sm cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5 text-white" />
            <span>Deploy to Studio (14-Day Free Trial)</span>
            <ArrowRight className="w-3 h-3 text-white" />
          </button>

          <button
            type="button"
            onClick={handleDismiss}
            className="p-1 text-slate-400 hover:text-white transition-colors cursor-pointer shrink-0 ml-0.5"
            aria-label="Dismiss return banner"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
