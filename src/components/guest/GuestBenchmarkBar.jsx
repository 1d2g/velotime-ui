import React from "react";
import { Sparkles, ArrowRight, ShieldCheck } from "lucide-react";

/**
 * GuestBenchmarkBar
 *
 * Slim, high-contrast B2B bar positioned below the Founder Trust Banner.
 * Highlights the $5/user/mo vs Harvest $14/user/mo value proposition and
 * offers the 1-click 'Save & Claim Workspace' CTA.
 */
export default function GuestBenchmarkBar({
  totalHours = 0,
  onClaimWorkspace,
}) {
  return (
    <div className="w-full bg-slate-900 text-white border-b border-slate-800 px-4 py-2 text-xs font-sans z-40 shrink-0 select-none">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2.5">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 bg-primary-950 text-primary-300 border border-primary-700/60 uppercase">
            Pricing Benchmark
          </span>
          <span className="text-slate-300 text-xs">
            VeloTime is <strong className="text-white">$5/user/mo</strong> vs Harvest{" "}
            <span className="line-through text-slate-400">$14/user/mo</span>. A 12-person studio saves{" "}
            <strong className="text-emerald-400">$1,296/yr</strong>.
          </span>
          <span className="text-slate-500 hidden md:inline">•</span>
          <span className="text-slate-300 text-xs hidden md:inline flex items-center gap-1">
            <ShieldCheck className="w-3 h-3 text-emerald-400 inline" />
            14-Day Free Cloud Trial (No Credit Card)
          </span>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <div className="text-[11px] font-mono text-slate-400">
            <span className="text-white font-bold">{totalHours.toFixed(1)}h</span> logged in browser
          </div>
          <button
            type="button"
            onClick={onClaimWorkspace}
            className="px-3 py-1 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs transition-colors inline-flex items-center gap-1.5 shadow-sm cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5 text-slate-950" />
            <span>Save & Claim Workspace</span>
            <ArrowRight className="w-3 h-3 text-slate-950" />
          </button>
        </div>
      </div>
    </div>
  );
}
