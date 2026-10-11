import React, { useState } from "react";
import { Sliders, TrendingDown, ChevronDown, ChevronUp, Sparkles, Check, ArrowRight } from "lucide-react";

/**
 * PricingBenchmarkChart Component
 *
 * Provides a clean, interactive B2B SaaS pricing comparison chart comparing
 * VeloTime ($5/user/mo) against Harvest ($14/user/mo) and Toggl Track ($18/user/mo).
 * Features an interactive team size slider (1-50 seats) and visual comparative cost bars.
 */
export default function PricingBenchmarkChart({ onClaimWorkspace, defaultCollapsed = false }) {
  const [teamSize, setTeamSize] = useState(12);
  const [isCollapsed, setIsCollapsed] = useState(() => {
    try {
      return sessionStorage.getItem("velotime_pricing_chart_collapsed") === "true" || defaultCollapsed;
    } catch {
      return defaultCollapsed;
    }
  });

  const toggleCollapse = () => {
    setIsCollapsed((prev) => {
      const next = !prev;
      try {
        sessionStorage.setItem("velotime_pricing_chart_collapsed", next ? "true" : "false");
      } catch {}
      return next;
    });
  };

  const presetSeats = [5, 10, 12, 20, 35, 50];

  const velotimeRate = 5;
  const harvestRate = 14;
  const togglRate = 18;

  const velotimeMonthly = teamSize * velotimeRate;
  const harvestMonthly = teamSize * harvestRate;
  const togglMonthly = teamSize * togglRate;

  const velotimeAnnual = velotimeMonthly * 12;
  const harvestAnnual = harvestMonthly * 12;
  const togglAnnual = togglMonthly * 12;

  const savingsHarvestAnnual = harvestAnnual - velotimeAnnual;
  const savingsTogglAnnual = togglAnnual - velotimeAnnual;

  // Percentage widths relative to Toggl
  const veloWidthPct = Math.round((velotimeMonthly / togglMonthly) * 100);
  const harvestWidthPct = Math.round((harvestMonthly / togglMonthly) * 100);

  // If collapsed, display a sleek, compact summary strip
  if (isCollapsed) {
    return (
      <div
        id="pricing-benchmark-collapsed"
        className="w-full bg-slate-50 dark:bg-zinc-900 border border-slate-300 dark:border-zinc-700 px-4 py-2 flex items-center justify-between gap-4 select-none mb-3 shadow-2xs"
      >
        <div className="flex items-center gap-3 flex-wrap">
          <span className="font-mono text-[10px] font-black px-2 py-0.5 bg-slate-900 text-white dark:bg-zinc-100 dark:text-zinc-950 uppercase tracking-wider">
            Pricing Benchmark
          </span>
          <span className="text-xs text-slate-700 dark:text-slate-300 font-medium">
            VeloTime <strong className="text-slate-950 dark:text-white font-bold">$5/seat/mo</strong> vs.
            Harvest <span className="line-through text-slate-400">$14/mo</span> vs.
            Toggl <span className="line-through text-slate-400">$18/mo</span>
          </span>
          <span className="text-slate-300 dark:text-slate-700 hidden sm:inline">•</span>
          <span className="text-xs font-bold text-slate-900 dark:text-white hidden sm:inline">
            Saving <span className="text-rose-600 dark:text-rose-400">${savingsHarvestAnnual.toLocaleString()}/yr</span> on {teamSize} seats
          </span>
        </div>

        <button
          type="button"
          onClick={toggleCollapse}
          className="flex items-center gap-1 text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer shrink-0"
        >
          <span>Show Calculator & Chart</span>
          <ChevronDown className="w-3.5 h-3.5" />
        </button>
      </div>
    );
  }

  return (
    <section
      id="pricing-benchmark-expanded"
      aria-label="Pricing Benchmark Comparison"
      className="w-full bg-white dark:bg-zinc-900 border-2 border-slate-900 dark:border-zinc-700 p-4 sm:p-5 mb-4 shadow-sm select-none relative"
    >
      {/* Header Row: Title & Slider Control */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-zinc-800">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="font-mono text-[10px] font-black px-2 py-0.5 bg-slate-900 text-white dark:bg-zinc-100 dark:text-zinc-950 uppercase tracking-wider">
              Fair SaaS Pricing Benchmark
            </span>
            <span className="text-xs text-slate-500 dark:text-zinc-400 font-medium">
              Enterprise-grade speed without the legacy SaaS markup
            </span>
          </div>
          <h2 className="text-base sm:text-lg font-black text-slate-950 dark:text-white tracking-tight">
            See What Your Agency Preserves with VeloTime
          </h2>
        </div>

        {/* Team Size Slider & Presets */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 bg-slate-50 dark:bg-zinc-950/60 border border-slate-200 dark:border-zinc-800 p-2.5 sm:px-4 sm:py-2">
          <div className="flex items-center justify-between sm:justify-start gap-2">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-300">
              <Sliders className="w-3.5 h-3.5 text-slate-500" />
              <span>Team Size:</span>
              <span className="font-mono text-sm font-black text-slate-950 dark:text-white px-1.5 py-0.5 bg-white dark:bg-zinc-800 border border-slate-300 dark:border-zinc-700 min-w-[2rem] text-center">
                {teamSize}
              </span>
              <span className="text-slate-400 font-normal">seats</span>
            </div>

            {/* Minimize Toggle */}
            <button
              type="button"
              onClick={toggleCollapse}
              className="lg:hidden p-1 text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
              title="Collapse benchmark chart"
            >
              <ChevronUp className="w-4 h-4" />
            </button>
          </div>

          <div className="flex items-center gap-3">
            <input
              type="range"
              min="1"
              max="50"
              value={teamSize}
              onChange={(e) => setTeamSize(Number(e.target.value))}
              className="w-28 sm:w-36 accent-rose-500 cursor-pointer"
              aria-label="Team size slider"
            />

            {/* Quick Presets */}
            <div className="hidden sm:flex items-center gap-1">
              {presetSeats.map((seats) => (
                <button
                  key={seats}
                  type="button"
                  onClick={() => setTeamSize(seats)}
                  className={`px-1.5 py-0.5 text-[10px] font-mono font-bold transition-colors cursor-pointer ${
                    teamSize === seats
                      ? "bg-slate-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                      : "bg-white dark:bg-zinc-800 text-slate-600 dark:text-zinc-400 border border-slate-200 dark:border-zinc-700 hover:bg-slate-100 dark:hover:bg-zinc-700"
                  }`}
                >
                  {seats}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={toggleCollapse}
              className="hidden lg:flex items-center gap-1 text-xs font-bold text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer ml-1 pl-2 border-l border-slate-300 dark:border-zinc-700"
              title="Collapse benchmark chart"
            >
              <ChevronUp className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Comparison: 3 Columns */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 my-4">
        {/* Card 1: VeloTime (Hero with signature Rose accent) */}
        <div className="bg-white dark:bg-zinc-900 border-2 border-rose-500 p-4 relative shadow-sm flex flex-col justify-between">
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <span className="font-mono text-[10px] font-black uppercase px-2 py-0.5 bg-rose-50 text-rose-800 dark:bg-rose-950/60 dark:text-rose-400 border border-rose-300 dark:border-rose-800">
                VeloTime (Your Workspace)
              </span>
              <span className="text-[10px] font-mono font-bold text-rose-600 dark:text-rose-400">
                Flat $5/mo
              </span>
            </div>

            <div className="pt-1">
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-black text-slate-950 dark:text-white tracking-tight">
                  ${velotimeMonthly.toLocaleString()}
                </span>
                <span className="text-xs text-slate-500 font-medium">/ month</span>
              </div>
              <p className="text-xs font-bold text-rose-600 dark:text-rose-400 mt-0.5">
                ${velotimeAnnual.toLocaleString()} / year total
              </p>
            </div>

            <ul className="text-[11px] text-slate-600 dark:text-zinc-300 space-y-1 pt-1.5 border-t border-slate-100 dark:border-zinc-800">
              <li className="flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                <span>10-second weekly keyboard matrix</span>
              </li>
              <li className="flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                <span>Client invoicing, live timers & audit notes</span>
              </li>
              <li className="flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                <span>Zero contractor surcharges or feature paywalls</span>
              </li>
            </ul>
          </div>

          <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-zinc-800">
            <div className="flex items-center justify-between text-[11px] font-medium text-slate-500">
              <span>Cost Share:</span>
              <span className="font-mono font-bold text-slate-900 dark:text-white">
                {veloWidthPct}% of Toggl
              </span>
            </div>
            <div className="w-full h-2 bg-slate-100 dark:bg-zinc-800 mt-1 overflow-hidden">
              <div
                className="h-full bg-rose-500 transition-all duration-300"
                style={{ width: `${veloWidthPct}%` }}
              />
            </div>
          </div>
        </div>

        {/* Card 2: Harvest */}
        <div className="bg-slate-50 dark:bg-zinc-950/40 border border-slate-300 dark:border-zinc-700 p-4 flex flex-col justify-between">
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <span className="font-mono text-[10px] font-bold uppercase px-2 py-0.5 bg-slate-200 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 border border-slate-300 dark:border-zinc-700">
                Harvest
              </span>
              <span className="text-[10px] font-mono text-slate-400">
                $14/seat/mo
              </span>
            </div>

            <div className="pt-1">
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-black text-slate-800 dark:text-slate-200 tracking-tight">
                  ${harvestMonthly.toLocaleString()}
                </span>
                <span className="text-xs text-slate-400 font-medium">/ month</span>
              </div>
              <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
                ${harvestAnnual.toLocaleString()} / year total
              </p>
            </div>

            <div className="pt-1.5 border-t border-slate-200 dark:border-zinc-800 space-y-1">
              <div className="flex items-center gap-1.5 text-[11px] text-slate-700 dark:text-zinc-300 font-bold">
                <span className="text-slate-400">Annual Penalty:</span>
                <span className="text-slate-950 dark:text-white font-mono">
                  +${savingsHarvestAnnual.toLocaleString()}/yr
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-zinc-400 leading-snug">
                Legacy single-entry popup forms and $14/seat contractor licensing penalties.
              </p>
            </div>
          </div>

          <div className="mt-3 pt-2.5 border-t border-slate-200 dark:border-zinc-800">
            <div className="flex items-center justify-between text-[11px] font-medium text-slate-400">
              <span>Cost Share:</span>
              <span className="font-mono font-bold text-slate-600 dark:text-zinc-400">
                {harvestWidthPct}% of Toggl
              </span>
            </div>
            <div className="w-full h-2 bg-slate-200 dark:bg-zinc-800 mt-1 overflow-hidden">
              <div
                className="h-full bg-slate-400 dark:bg-zinc-600 transition-all duration-300"
                style={{ width: `${harvestWidthPct}%` }}
              />
            </div>
          </div>
        </div>

        {/* Card 3: Toggl Track */}
        <div className="bg-slate-50 dark:bg-zinc-950/40 border border-slate-300 dark:border-zinc-700 p-4 flex flex-col justify-between">
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <span className="font-mono text-[10px] font-bold uppercase px-2 py-0.5 bg-slate-200 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 border border-slate-300 dark:border-zinc-700">
                Toggl Track (Premium)
              </span>
              <span className="text-[10px] font-mono text-slate-400">
                $18/seat/mo
              </span>
            </div>

            <div className="pt-1">
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-black text-slate-800 dark:text-slate-200 tracking-tight">
                  ${togglMonthly.toLocaleString()}
                </span>
                <span className="text-xs text-slate-400 font-medium">/ month</span>
              </div>
              <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
                ${togglAnnual.toLocaleString()} / year total
              </p>
            </div>

            <div className="pt-1.5 border-t border-slate-200 dark:border-zinc-800 space-y-1">
              <div className="flex items-center gap-1.5 text-[11px] text-slate-700 dark:text-zinc-300 font-bold">
                <span className="text-slate-400">Annual Penalty:</span>
                <span className="text-slate-950 dark:text-white font-mono">
                  +${savingsTogglAnnual.toLocaleString()}/yr
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-zinc-400 leading-snug">
                Intrusive floating stopwatches and $18/seat recurring overhead for basic agency reporting.
              </p>
            </div>
          </div>

          <div className="mt-3 pt-2.5 border-t border-slate-200 dark:border-zinc-800">
            <div className="flex items-center justify-between text-[11px] font-medium text-slate-400">
              <span>Cost Share:</span>
              <span className="font-mono font-bold text-slate-600 dark:text-zinc-400">
                100% (Baseline)
              </span>
            </div>
            <div className="w-full h-2 bg-slate-200 dark:bg-zinc-800 mt-1 overflow-hidden">
              <div className="h-full bg-slate-600 dark:bg-zinc-500 w-full transition-all duration-300" />
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Summary Bar */}
      <div className="bg-slate-950 text-white p-3 sm:px-4 sm:py-3 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 flex-wrap">
          <div className="w-6 h-6 rounded-full bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400 shrink-0">
            <TrendingDown className="w-3.5 h-3.5" />
          </div>
          <span className="text-xs font-semibold text-slate-300">
            Annual Cash Kept in Your Agency:
          </span>
          <span className="font-mono text-xs font-black text-white px-2 py-0.5 bg-slate-800 border border-slate-700">
            ${savingsHarvestAnnual.toLocaleString()}/yr vs. Harvest
          </span>
          <span className="text-slate-600 hidden sm:inline">•</span>
          <span className="font-mono text-xs font-black text-rose-400 px-2 py-0.5 bg-rose-950/60 border border-rose-800/80">
            ${savingsTogglAnnual.toLocaleString()}/yr vs. Toggl
          </span>
        </div>

        {onClaimWorkspace && (
          <button
            type="button"
            onClick={onClaimWorkspace}
            className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-rose-500 hover:bg-rose-600 text-white text-xs font-black transition-colors cursor-pointer shrink-0 shadow-xs"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Lock In $5/Seat Pricing</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </section>
  );
}
