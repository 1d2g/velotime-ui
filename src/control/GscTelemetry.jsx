import React, { useState } from "react";
import { 
  Search, 
  ExternalLink, 
  CheckCircle2, 
  Globe 
} from "lucide-react";
import { GSC_TELEMETRY } from "./mockControlData";

export default function GscTelemetry() {
  const [queryFilter, setQueryFilter] = useState("");
  const [selectedTab, setSelectedTab] = useState("queries"); // 'queries' | 'pages'

  const { scorecard, topQueries, landingPages } = GSC_TELEMETRY;

  const filteredQueries = topQueries.filter(q => 
    q.query.toLowerCase().includes(queryFilter.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Search Console Scorecard Overview */}
      <div className="bg-white dark:bg-zinc-900 border border-slate-300 dark:border-zinc-700">
        <div className="bg-slate-100 dark:bg-zinc-800/90 border-b border-slate-300 dark:border-zinc-700 px-4 py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Search className="w-4 h-4 text-slate-700 dark:text-slate-300" />
            <span className="font-bold text-xs uppercase tracking-wider text-slate-800 dark:text-slate-200">
              Google Search Console Organic Telemetry
            </span>
            <span className="text-[10px] font-mono px-1.5 py-0.5 bg-white dark:bg-zinc-900 border border-slate-300 dark:border-zinc-700 text-slate-600 dark:text-slate-400">
              sc-domain:dg.tools
            </span>
          </div>

          <a
            href="https://search.google.com/search-console"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1 bg-white dark:bg-zinc-900 hover:bg-slate-50 dark:hover:bg-zinc-800 text-slate-700 dark:text-slate-300 text-xs font-semibold border border-slate-300 dark:border-zinc-700 transition"
          >
            <span>Search Console</span>
            <ExternalLink className="w-3 h-3 text-slate-500" />
          </a>
        </div>

        {/* 4 Scorecard KPI Cards */}
        <div className="p-5 grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3.5 bg-slate-50 dark:bg-zinc-950 border border-slate-300 dark:border-zinc-800">
            <div className="text-[10px] font-mono uppercase text-slate-500 dark:text-slate-400">Weekly Clicks (7d)</div>
            <div className="text-xl font-black text-slate-900 dark:text-white tabular-nums mt-0.5">{scorecard.totalClicks7d}</div>
            <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold mt-0.5">Target &ge; {scorecard.targetClicks}/week (Met)</div>
          </div>
          <div className="p-3.5 bg-slate-50 dark:bg-zinc-950 border border-slate-300 dark:border-zinc-800">
            <div className="text-[10px] font-mono uppercase text-slate-500 dark:text-slate-400">Daily Impressions</div>
            <div className="text-xl font-black text-slate-900 dark:text-white tabular-nums mt-0.5">{scorecard.avgDailyImpressions}</div>
            <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold mt-0.5">Target &ge; {scorecard.targetImpressions}/day (Met)</div>
          </div>
          <div className="p-3.5 bg-slate-50 dark:bg-zinc-950 border border-slate-300 dark:border-zinc-800">
            <div className="text-[10px] font-mono uppercase text-slate-500 dark:text-slate-400">Avg Rank Position</div>
            <div className="text-xl font-black text-slate-900 dark:text-white tabular-nums mt-0.5">{scorecard.avgPosition}</div>
            <div className="text-[10px] text-slate-500 mt-0.5">Across 40+ keywords</div>
          </div>
          <div className="p-3.5 bg-slate-50 dark:bg-zinc-950 border border-slate-300 dark:border-zinc-800">
            <div className="text-[10px] font-mono uppercase text-slate-500 dark:text-slate-400">Indexed URLs</div>
            <div className="text-xl font-black text-slate-900 dark:text-white tabular-nums mt-0.5">{scorecard.indexedPagesCount}</div>
            <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold mt-0.5">100% sitemap coverage</div>
          </div>
        </div>
      </div>

      {/* Search Analytics Detail Tabs & Search Bar */}
      <div className="bg-white dark:bg-zinc-900 border border-slate-300 dark:border-zinc-700">
        <div className="bg-slate-100 dark:bg-zinc-800/90 border-b border-slate-300 dark:border-zinc-700 px-4 py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex bg-white dark:bg-zinc-950 border border-slate-300 dark:border-zinc-700">
            <button
              type="button"
              onClick={() => setSelectedTab("queries")}
              className={`px-3 py-1.5 text-xs font-semibold transition border-r border-slate-300 dark:border-zinc-700 ${
                selectedTab === "queries"
                  ? "bg-slate-100 dark:bg-zinc-800 text-slate-900 dark:text-white font-bold"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              Top Search Queries ({topQueries.length})
            </button>
            <button
              type="button"
              onClick={() => setSelectedTab("pages")}
              className={`px-3 py-1.5 text-xs font-semibold transition ${
                selectedTab === "pages"
                  ? "bg-slate-100 dark:bg-zinc-800 text-slate-900 dark:text-white font-bold"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              Landing Pages Indexation ({landingPages.length})
            </button>
          </div>

          {selectedTab === "queries" && (
            <div className="relative">
              <input
                type="text"
                placeholder="Filter search queries..."
                value={queryFilter}
                onChange={(e) => setQueryFilter(e.target.value)}
                className="h-8 pl-8 pr-3 bg-white dark:bg-zinc-950 border border-slate-300 dark:border-zinc-700 text-slate-900 dark:text-white text-xs w-56 focus:outline-none focus:border-slate-900 dark:focus:border-white font-sans"
              />
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
            </div>
          )}
        </div>

        {/* Queries Table */}
        {selectedTab === "queries" && (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 dark:bg-zinc-950 border-b border-slate-300 dark:border-zinc-700 text-slate-600 dark:text-slate-400 font-mono text-[10px] uppercase tracking-wider">
                  <th className="py-2.5 px-4">Search Query</th>
                  <th className="py-2.5 px-4 text-right">Impressions</th>
                  <th className="py-2.5 px-4 text-right">Clicks</th>
                  <th className="py-2.5 px-4 text-right">CTR</th>
                  <th className="py-2.5 px-4 text-right">Avg Position</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-zinc-800 font-sans">
                {filteredQueries.map((q, idx) => (
                  <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-zinc-800/40 transition">
                    <td className="py-2.5 px-4 font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-900 dark:bg-white" />
                      <span>{q.query}</span>
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono text-slate-700 dark:text-zinc-300 tabular-nums">{q.impressions}</td>
                    <td className="py-2.5 px-4 text-right font-mono text-emerald-600 dark:text-emerald-400 font-bold tabular-nums">{q.clicks}</td>
                    <td className="py-2.5 px-4 text-right font-mono text-slate-600 dark:text-zinc-400 tabular-nums">{q.ctr}</td>
                    <td className="py-2.5 px-4 text-right font-mono text-slate-900 dark:text-zinc-100 font-semibold tabular-nums">{q.pos}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Landing Pages Table */}
        {selectedTab === "pages" && (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 dark:bg-zinc-950 border-b border-slate-300 dark:border-zinc-700 text-slate-600 dark:text-slate-400 font-mono text-[10px] uppercase tracking-wider">
                  <th className="py-2.5 px-4">Landing Page Route</th>
                  <th className="py-2.5 px-4 text-right">Impressions</th>
                  <th className="py-2.5 px-4 text-right">Clicks</th>
                  <th className="py-2.5 px-4 text-right">Indexing Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-zinc-800 font-sans">
                {landingPages.map((p, idx) => (
                  <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-zinc-800/40 transition">
                    <td className="py-2.5 px-4 font-mono text-slate-900 dark:text-slate-100 font-semibold">
                      <a href={p.url} target="_blank" rel="noreferrer" className="hover:underline hover:text-rose-600 flex items-center gap-1.5">
                        <span>{p.url.replace("https://velotime.dg.tools", "") || "/"}</span>
                        <ExternalLink className="w-3 h-3 text-slate-400" />
                      </a>
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono text-slate-700 dark:text-zinc-300 tabular-nums">{p.impressions}</td>
                    <td className="py-2.5 px-4 text-right font-mono text-emerald-600 dark:text-emerald-400 font-bold tabular-nums">{p.clicks}</td>
                    <td className="py-2.5 px-4 text-right">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-mono font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>{p.status}</span>
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
