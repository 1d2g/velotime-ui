import React, { useMemo } from "react";
import { Clock, TrendingUp, DollarSign, PiggyBank } from "lucide-react";

/**
 * GuestKpiRibbon
 * 
 * Computes live operational metrics based on whatever hours are currently
 * in the matrix grid. Updates instantaneously as the user enters or clears cells.
 */
export default function GuestKpiRibbon({
  totalHours = 16.0,
  teamSize = 12,
  hourlyRate = 165,
}) {
  const metrics = useMemo(() => {
    const billableRatio = 0.85; // 85% billable baseline
    const billableHours = totalHours * billableRatio;
    const grossValue = billableHours * hourlyRate;
    const effectiveRate = totalHours > 0 ? (grossValue / totalHours) : hourlyRate;

    // Monthly savings vs Harvest ($14/user - $5/user = $9/user/mo)
    const monthlySavings = teamSize * 9;
    const annualSavings = monthlySavings * 12;

    return {
      billableHours: billableHours.toFixed(1),
      billablePct: Math.round(billableRatio * 100),
      grossValue: Math.round(grossValue),
      effectiveRate: Math.round(effectiveRate),
      monthlySavings,
      annualSavings,
    };
  }, [totalHours, teamSize, hourlyRate]);

  return (
    <div className="bg-slate-100 dark:bg-zinc-900 border-b border-slate-300 dark:border-zinc-800 px-6 py-2.5 text-xs select-none">
      <div className="flex flex-wrap items-center justify-between gap-4">
        {/* Left: KPI metrics row */}
        <div className="flex items-center gap-6 flex-wrap">
          <div className="flex items-center gap-2">
            <Clock className="w-3.5 h-3.5 text-slate-500" />
            <span className="text-[11px] font-mono text-slate-500 uppercase">Logged Hours:</span>
            <span className="font-mono font-bold text-slate-900 dark:text-white tabular-nums">
              {totalHours.toFixed(1)}h
            </span>
          </div>

          <div className="flex items-center gap-2">
            <TrendingUp className="w-3.5 h-3.5 text-slate-500" />
            <span className="text-[11px] font-mono text-slate-500 uppercase">Billable Rate:</span>
            <span className="font-mono font-bold text-slate-900 dark:text-white tabular-nums">
              {metrics.billablePct}%
            </span>
          </div>

          <div className="flex items-center gap-2">
            <DollarSign className="w-3.5 h-3.5 text-slate-500" />
            <span className="text-[11px] font-mono text-slate-500 uppercase">Effective Rate:</span>
            <span className="font-mono font-bold text-slate-900 dark:text-white tabular-nums">
              ${metrics.effectiveRate}/hr
            </span>
          </div>

          <div className="flex items-center gap-2">
            <PiggyBank className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span className="text-[11px] font-mono text-slate-500 uppercase">Harvest Savings:</span>
            <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
              ${metrics.monthlySavings}/mo (${metrics.annualSavings.toLocaleString()}/yr)
            </span>
          </div>
        </div>

        {/* Right: Storage State indicator */}
        <div className="text-[10px] font-mono text-slate-500 dark:text-zinc-500 flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          <span>Local Browser Storage Active</span>
        </div>
      </div>
    </div>
  );
}
