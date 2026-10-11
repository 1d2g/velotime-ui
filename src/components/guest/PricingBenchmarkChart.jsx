import React, { useState } from "react";
import { Sliders } from "lucide-react";

/**
 * PricingBenchmarkChart Component
 *
 * Compact B2B SaaS pricing comparison widget that fits directly inside the grey
 * timesheet header banner without taking up extra vertical space.
 * Features an interactive team size slider (1-50 seats) and a 3-bar comparative chart
 * showing VeloTime ($5/mo) vs Harvest ($14/mo) and Toggl Track ($18/mo).
 */
export default function PricingBenchmarkChart({ initialSeats = 12 }) {
  const [teamSize, setTeamSize] = useState(initialSeats);

  const velotimeRate = 5;
  const harvestRate = 14;
  const togglRate = 18;

  const velotimeMonthly = teamSize * velotimeRate;
  const harvestMonthly = teamSize * harvestRate;
  const togglMonthly = teamSize * togglRate;

  const savingsHarvestAnnual = (harvestMonthly - velotimeMonthly) * 12;

  // Proportional widths relative to Toggl ($18/mo = 100%)
  const veloWidthPct = Math.round((velotimeRate / togglRate) * 100); // ~28%
  const harvestWidthPct = Math.round((harvestRate / togglRate) * 100); // ~78%

  return (
    <div
      id="pricing-benchmark-widget"
      className="bg-white dark:bg-zinc-900 border-2 border-slate-900 dark:border-zinc-700 px-3 py-1.5 shadow-2xs select-none w-full max-w-[420px]"
      title={`VeloTime: $${velotimeMonthly}/mo vs Harvest: $${harvestMonthly}/mo vs Toggl: $${togglMonthly}/mo for ${teamSize} seats`}
    >
      {/* Top Meta Row: Badge, Annual Savings Readout, and Team Slider */}
      <div className="flex items-center justify-between gap-2 pb-1 border-b border-slate-200 dark:border-zinc-800 text-[11px]">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="font-mono text-[9px] font-black px-1.5 py-0.2 bg-slate-900 text-white dark:bg-zinc-100 dark:text-zinc-950 uppercase tracking-wider shrink-0">
            Benchmark
          </span>
          <span className="text-slate-800 dark:text-slate-200 font-semibold truncate text-[11px]">
            Save <strong className="text-rose-600 dark:text-rose-400 font-black">${savingsHarvestAnnual.toLocaleString()}/yr</strong> vs Harvest
          </span>
        </div>

        {/* Team Size Slider */}
        <div className="flex items-center gap-1.5 shrink-0 pl-1">
          <Sliders className="w-3 h-3 text-slate-400" />
          <input
            type="range"
            min="1"
            max="50"
            value={teamSize}
            onChange={(e) => setTeamSize(Number(e.target.value))}
            className="w-14 sm:w-18 h-1.5 accent-rose-500 cursor-pointer bg-slate-200 dark:bg-zinc-800"
            aria-label="Team size slider"
          />
          <span className="font-mono text-[10px] font-black text-slate-900 dark:text-white min-w-[2.4rem] text-right">
            {teamSize} seats
          </span>
        </div>
      </div>

      {/* 3-Row Mini Comparison Bar Chart */}
      <div className="pt-1 space-y-1">
        {/* Row 1: VeloTime (Hero with signature Rose highlight) */}
        <div className="flex items-center gap-2 text-[10px] leading-none">
          <span className="w-14 font-black text-slate-950 dark:text-white shrink-0">
            VeloTime
          </span>
          <span className="font-mono text-slate-500 dark:text-zinc-400 w-6 text-right shrink-0">
            $5
          </span>
          <div className="flex-1 h-2 bg-slate-100 dark:bg-zinc-800 overflow-hidden">
            <div
              className="h-full bg-rose-500 transition-all duration-200"
              style={{ width: `${veloWidthPct}%` }}
            />
          </div>
          <span className="font-mono font-black text-rose-600 dark:text-rose-400 w-12 text-right shrink-0">
            ${velotimeMonthly}/mo
          </span>
        </div>

        {/* Row 2: Harvest */}
        <div className="flex items-center gap-2 text-[10px] leading-none">
          <span className="w-14 font-medium text-slate-500 dark:text-zinc-400 shrink-0">
            Harvest
          </span>
          <span className="font-mono text-slate-400 dark:text-zinc-500 w-6 text-right shrink-0">
            $14
          </span>
          <div className="flex-1 h-2 bg-slate-100 dark:bg-zinc-800 overflow-hidden">
            <div
              className="h-full bg-slate-400 dark:bg-zinc-600 transition-all duration-200"
              style={{ width: `${harvestWidthPct}%` }}
            />
          </div>
          <span className="font-mono font-medium text-slate-500 dark:text-zinc-400 w-12 text-right shrink-0">
            ${harvestMonthly}/mo
          </span>
        </div>

        {/* Row 3: Toggl Track */}
        <div className="flex items-center gap-2 text-[10px] leading-none">
          <span className="w-14 font-medium text-slate-500 dark:text-zinc-400 shrink-0">
            Toggl
          </span>
          <span className="font-mono text-slate-400 dark:text-zinc-500 w-6 text-right shrink-0">
            $18
          </span>
          <div className="flex-1 h-2 bg-slate-100 dark:bg-zinc-800 overflow-hidden">
            <div className="h-full bg-slate-600 dark:bg-zinc-500 w-full" />
          </div>
          <span className="font-mono font-medium text-slate-500 dark:text-zinc-400 w-12 text-right shrink-0">
            ${togglMonthly}/mo
          </span>
        </div>
      </div>
    </div>
  );
}
