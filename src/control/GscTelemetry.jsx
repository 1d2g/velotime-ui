import React, { useState } from "react";
import { 
  Search, 
  TrendingUp, 
  ExternalLink, 
  Filter, 
  CheckCircle2, 
  Layers, 
  BarChart2, 
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
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 shadow-lg space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-zinc-800">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono uppercase tracking-wider text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 px-2 py-0.5 rounded">
                Organic Search
              </span>
              <span className="text-xs font-mono text-zinc-400">sc-domain:dg.tools</span>
            </div>
            <h2 className="text-base font-bold text-white mt-1 flex items-center gap-2">
              <Search className="w-5 h-5 text-cyan-400" />
              <span>Google Search Console Telemetry</span>
            </h2>
          </div>

          <a
            href="https://search.google.com/search-console"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-semibold border border-zinc-700 transition"
          >
            <span>Open Google Search Console</span>
            <ExternalLink className="w-3.5 h-3.5 text-zinc-400" />
          </a>
        </div>

        {/* 4 Scorecard KPI Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3.5 rounded-lg bg-zinc-950/80 border border-zinc-800">
            <div className="text-[10px] font-mono text-zinc-400 uppercase">Weekly Clicks (7d)</div>
            <div className="text-xl font-bold text-emerald-400 mt-1">{scorecard.totalClicks7d}</div>
            <div className="text-[10px] text-zinc-500 mt-0.5">Goal: &ge; {scorecard.targetClicks}/week (Met)</div>
          </div>
          <div className="p-3.5 rounded-lg bg-zinc-950/80 border border-zinc-800">
            <div className="text-[10px] font-mono text-zinc-400 uppercase">Daily Impressions</div>
            <div className="text-xl font-bold text-cyan-400 mt-1">{scorecard.avgDailyImpressions}</div>
            <div className="text-[10px] text-zinc-500 mt-0.5">Goal: &ge; {scorecard.targetImpressions}/day (Met)</div>
          </div>
          <div className="p-3.5 rounded-lg bg-zinc-950/80 border border-zinc-800">
            <div className="text-[10px] font-mono text-zinc-400 uppercase">Avg Rank Position</div>
            <div className="text-xl font-bold text-white mt-1">{scorecard.avgPosition}</div>
            <div className="text-[10px] text-zinc-500 mt-0.5">Across 40+ keywords</div>
          </div>
          <div className="p-3.5 rounded-lg bg-zinc-950/80 border border-zinc-800">
            <div className="text-[10px] font-mono text-zinc-400 uppercase">Indexed URLs</div>
            <div className="text-xl font-bold text-white mt-1">{scorecard.indexedPagesCount}</div>
            <div className="text-[10px] text-emerald-400 mt-0.5">100% sitemap coverage</div>
          </div>
        </div>
      </div>

      {/* Search Analytics Detail Tabs & Search Bar */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 shadow-lg space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-zinc-800">
          <div className="flex items-center gap-1.5 bg-zinc-950 p-1 rounded-lg border border-zinc-800">
            <button
              type="button"
              onClick={() => setSelectedTab("queries")}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition cursor-pointer ${
                selectedTab === "queries"
                  ? "bg-zinc-800 text-white shadow-sm"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              Top Search Queries ({topQueries.length})
            </button>
            <button
              type="button"
              onClick={() => setSelectedTab("pages")}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition cursor-pointer ${
                selectedTab === "pages"
                  ? "bg-zinc-800 text-white shadow-sm"
                  : "text-zinc-400 hover:text-white"
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
                className="h-8 pl-8 pr-3 rounded-lg bg-zinc-950 border border-zinc-800 text-white text-xs w-56 focus:outline-none focus:border-cyan-500"
              />
              <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-2.5 top-2.5" />
            </div>
          )}
        </div>

        {/* Queries Table */}
        {selectedTab === "queries" && (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-zinc-800 text-zinc-400 font-mono text-[11px] uppercase">
                  <th className="py-2.5 px-3">Search Query</th>
                  <th className="py-2.5 px-3 text-right">Impressions</th>
                  <th className="py-2.5 px-3 text-right">Clicks</th>
                  <th className="py-2.5 px-3 text-right">CTR</th>
                  <th className="py-2.5 px-3 text-right">Avg Position</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60 font-sans">
                {filteredQueries.map((q, idx) => (
                  <tr key={idx} className="hover:bg-zinc-800/40 transition">
                    <td className="py-2.5 px-3 font-medium text-white flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                      <span>{q.query}</span>
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-zinc-300">{q.impressions}</td>
                    <td className="py-2.5 px-3 text-right font-mono text-emerald-400 font-bold">{q.clicks}</td>
                    <td className="py-2.5 px-3 text-right font-mono text-zinc-400">{q.ctr}</td>
                    <td className="py-2.5 px-3 text-right font-mono text-cyan-400 font-semibold">{q.pos}</td>
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
                <tr className="border-b border-zinc-800 text-zinc-400 font-mono text-[11px] uppercase">
                  <th className="py-2.5 px-3">Page URL</th>
                  <th className="py-2.5 px-3 text-right">Impressions</th>
                  <th className="py-2.5 px-3 text-right">Clicks</th>
                  <th className="py-2.5 px-3 text-right">Coverage Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60 font-sans">
                {landingPages.map((p, idx) => (
                  <tr key={idx} className="hover:bg-zinc-800/40 transition">
                    <td className="py-2.5 px-3 font-mono text-cyan-300">
                      <a href={p.url} target="_blank" rel="noreferrer" className="hover:underline flex items-center gap-1.5">
                        <span>{p.url.replace("https://velotime.dg.tools", "") || "/"}</span>
                        <ExternalLink className="w-3 h-3 text-zinc-500" />
                      </a>
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-zinc-300">{p.impressions}</td>
                    <td className="py-2.5 px-3 text-right font-mono text-emerald-400 font-bold">{p.clicks}</td>
                    <td className="py-2.5 px-3 text-right">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
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
