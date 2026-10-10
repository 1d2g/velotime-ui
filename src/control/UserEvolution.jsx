import React, { useState } from "react";
import { 
  Users, 
  Repeat, 
  Clock, 
  ExternalLink, 
  Search, 
  ArrowRight, 
  CheckCircle2, 
  MousePointer, 
  Sparkles, 
  Calendar, 
  MapPin, 
  Laptop, 
  ChevronDown, 
  ChevronUp,
  AlertCircle,
  Copy,
  Check,
  Code2
} from "lucide-react";
import { REPEAT_VISITORS_DATA } from "./mockControlData";

export default function UserEvolution() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCohort, setSelectedCohort] = useState("all"); // 'all' | '2' | '3+' | 'converted'
  const [expandedUserId, setExpandedUserId] = useState(REPEAT_VISITORS_DATA.profiles[0]?.id || null);
  const [copiedId, setCopiedId] = useState(null);
  const [showHogql, setShowHogql] = useState(false);

  const { scorecard, cohortDistribution, profiles, dropoffBottlenecks, hogqlQuery } = REPEAT_VISITORS_DATA;

  const handleCopyId = (id) => {
    navigator.clipboard.writeText(id);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const filteredProfiles = profiles.filter((p) => {
    const matchesSearch = 
      p.alias.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.primarySource.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;

    if (selectedCohort === "2") return p.totalSessions === 2;
    if (selectedCohort === "3+") return p.totalSessions >= 3;
    if (selectedCohort === "converted") return p.status.includes("Converted") || p.status.includes("High-Intent");
    return true;
  });

  return (
    <div className="space-y-6">
      {/* 1. Header & Scorecard Overview */}
      <div className="bg-white dark:bg-zinc-900 border border-slate-300 dark:border-zinc-700">
        <div className="bg-slate-100 dark:bg-zinc-800/90 border-b border-slate-300 dark:border-zinc-700 px-4 py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Repeat className="w-4 h-4 text-slate-700 dark:text-slate-300" />
            <span className="font-bold text-xs uppercase tracking-wider text-slate-800 dark:text-slate-200">
              Returning Visitors & Longitudinal User Evolution
            </span>
            <span className="text-[10px] font-mono px-1.5 py-0.5 bg-white dark:bg-zinc-900 border border-slate-300 dark:border-zinc-700 text-slate-600 dark:text-slate-400">
              Trailing 14 Days
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowHogql(!showHogql)}
              className="inline-flex items-center gap-1.5 px-3 py-1 bg-white dark:bg-zinc-900 hover:bg-slate-50 dark:hover:bg-zinc-800 text-slate-700 dark:text-slate-300 text-xs font-semibold border border-slate-300 dark:border-zinc-700 transition cursor-pointer"
            >
              <Code2 className="w-3.5 h-3.5" />
              <span>{showHogql ? "Hide HogQL Query" : "View PostHog HogQL"}</span>
            </button>
            <a
              href="https://us.posthog.com/project/527395/persons"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-900 dark:bg-white hover:bg-slate-800 dark:hover:bg-slate-100 text-white dark:text-slate-900 text-xs font-semibold transition"
            >
              <span>PostHog Cohorts</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>

        {/* Scorecard KPI Grid */}
        <div className="p-5 grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3.5 bg-slate-50 dark:bg-zinc-950 border border-slate-300 dark:border-zinc-800">
            <div className="text-[10px] font-mono uppercase text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <Repeat className="w-3 h-3" />
              <span>Repeat Visitor Rate</span>
            </div>
            <div className="text-xl font-black text-slate-900 dark:text-white tabular-nums mt-0.5">
              {scorecard.repeatRate}
            </div>
            <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold mt-0.5">
              {scorecard.repeatVisitorsCount} of {scorecard.totalTrackedPersons} visitors returned
            </div>
          </div>

          <div className="p-3.5 bg-slate-50 dark:bg-zinc-950 border border-slate-300 dark:border-zinc-800">
            <div className="text-[10px] font-mono uppercase text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <Clock className="w-3 h-3" />
              <span>Avg Latency to Return</span>
            </div>
            <div className="text-xl font-black text-slate-900 dark:text-white tabular-nums mt-0.5">
              {scorecard.avgDaysToReturn}
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">
              Days between 1st touch and return
            </div>
          </div>

          <div className="p-3.5 bg-slate-50 dark:bg-zinc-950 border border-slate-300 dark:border-zinc-800">
            <div className="text-[10px] font-mono uppercase text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <MousePointer className="w-3 h-3" />
              <span>Repeat Conversion Rate</span>
            </div>
            <div className="text-xl font-black text-emerald-600 dark:text-emerald-400 tabular-nums mt-0.5">
              {scorecard.repeatConversionRate}
            </div>
            <div className="text-[10px] text-slate-600 dark:text-zinc-400 font-semibold mt-0.5">
              {scorecard.conversionLift} lift vs 1st visit ({scorecard.firstTimeConversionRate})
            </div>
          </div>

          <div className="p-3.5 bg-slate-50 dark:bg-zinc-950 border border-slate-300 dark:border-zinc-800">
            <div className="text-[10px] font-mono uppercase text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <Users className="w-3 h-3" />
              <span>Avg Total Dwell Time</span>
            </div>
            <div className="text-xl font-black text-slate-900 dark:text-white tabular-nums mt-0.5">
              {scorecard.avgDwellRepeat}
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">
              vs {scorecard.avgDwellSingle} for single-visit bounces
            </div>
          </div>
        </div>

        {/* HogQL Query Drawer (Conditional) */}
        {showHogql && (
          <div className="p-4 bg-slate-950 border-t border-slate-300 dark:border-zinc-800 text-xs font-mono text-emerald-400">
            <div className="text-[10px] uppercase font-bold text-slate-400 mb-1.5 flex items-center justify-between">
              <span>PostHog ClickHouse HogQL Query (Execute via Project 527395 /query/ endpoint)</span>
              <button 
                type="button" 
                onClick={() => handleCopyId(hogqlQuery)} 
                className="text-slate-300 hover:text-white underline text-[10px]"
              >
                Copy SQL
              </button>
            </div>
            <pre className="overflow-x-auto whitespace-pre p-2 bg-slate-900 border border-slate-800 text-[11px] leading-relaxed">
              {hogqlQuery}
            </pre>
          </div>
        )}
      </div>

      {/* 2. Frequency Distribution & Retention Progression */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        {/* Left: Visit Frequency Breakdown */}
        <div className="md:col-span-5 bg-white dark:bg-zinc-900 border border-slate-300 dark:border-zinc-700">
          <div className="bg-slate-100 dark:bg-zinc-800/90 border-b border-slate-300 dark:border-zinc-700 px-4 py-2.5">
            <span className="font-bold text-xs uppercase tracking-wider text-slate-800 dark:text-slate-200">
              Visit Frequency Distribution
            </span>
          </div>
          <div className="p-5 space-y-3.5">
            {cohortDistribution.map((c, i) => (
              <div key={i} className="space-y-1">
                <div className="flex items-center justify-between text-xs font-semibold">
                  <div className="flex items-center gap-2">
                    <span className="text-slate-900 dark:text-white">{c.visits}</span>
                    <span className="text-[10px] font-mono text-slate-500 font-normal">({c.label})</span>
                  </div>
                  <span className="font-mono text-slate-700 dark:text-zinc-300 tabular-nums">
                    {c.count} users ({c.pct})
                  </span>
                </div>
                <div className="w-full h-2 bg-slate-100 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 overflow-hidden">
                  <div 
                    className={`h-full ${i === 0 ? "bg-slate-400 dark:bg-zinc-600" : i === 1 ? "bg-slate-700 dark:bg-zinc-400" : "bg-rose-600"}`} 
                    style={{ width: c.pct }}
                  />
                </div>
              </div>
            ))}

            <div className="pt-3 border-t border-slate-200 dark:border-zinc-800 text-xs text-slate-600 dark:text-zinc-400 leading-relaxed">
              <strong>Key Retention Finding:</strong> Visitors who return for a 2nd session exhibit a <strong>380% higher probability</strong> of testing the interactive demo matrix than first-time visitors.
            </div>
          </div>
        </div>

        {/* Right: Drop-off Bottlenecks in Repeat Sessions */}
        <div className="md:col-span-7 bg-white dark:bg-zinc-900 border border-slate-300 dark:border-zinc-700">
          <div className="bg-slate-100 dark:bg-zinc-800/90 border-b border-slate-300 dark:border-zinc-700 px-4 py-2.5 flex items-center justify-between">
            <span className="font-bold text-xs uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
              <span>Repeat Visitor Conversion Bottlenecks</span>
            </span>
            <span className="text-[10px] font-mono font-bold bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800 px-1.5 py-0.5">
              Action Required
            </span>
          </div>

          <div className="p-5 space-y-3">
            {dropoffBottlenecks.map((b) => (
              <div 
                key={b.id}
                className="p-3 bg-slate-50 dark:bg-zinc-950 border border-slate-300 dark:border-zinc-800 space-y-1.5"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-bold text-xs text-slate-900 dark:text-white">
                    {b.title}
                  </span>
                  <span className="text-[10px] font-mono font-bold uppercase px-1.5 py-0.5 bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 border border-rose-300 dark:border-rose-800">
                    {b.affectedPercentage}
                  </span>
                </div>
                <p className="text-xs text-slate-600 dark:text-zinc-400 leading-relaxed">
                  {b.description}
                </p>
                <div className="pt-1 text-[11px] text-slate-800 dark:text-zinc-200 font-semibold flex items-start gap-1.5">
                  <span className="text-rose-600 font-bold shrink-0">Prescribed Fix:</span>
                  <span>{b.recommendedAction}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 3. Longitudinal User Evolution Explorer */}
      <div className="bg-white dark:bg-zinc-900 border border-slate-300 dark:border-zinc-700">
        <div className="bg-slate-100 dark:bg-zinc-800/90 border-b border-slate-300 dark:border-zinc-700 px-4 py-2.5 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-slate-700 dark:text-slate-300" />
            <span className="font-bold text-xs uppercase tracking-wider text-slate-800 dark:text-slate-200">
              Individual User Journey Evolution
            </span>
            <span className="text-[10px] font-mono font-bold bg-white dark:bg-zinc-900 px-2 py-0.5 border border-slate-300 dark:border-zinc-700 text-slate-700 dark:text-slate-300">
              {filteredProfiles.length} PROFILES LOADED
            </span>
          </div>

          {/* Filter Bar & Cohort Segment Selector */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex bg-white dark:bg-zinc-950 border border-slate-300 dark:border-zinc-700">
              <button
                type="button"
                onClick={() => setSelectedCohort("all")}
                className={`px-2.5 py-1 text-xs font-semibold transition border-r border-slate-300 dark:border-zinc-700 ${
                  selectedCohort === "all" ? "bg-slate-100 dark:bg-zinc-800 text-slate-900 dark:text-white font-bold" : "text-slate-600 dark:text-slate-400"
                }`}
              >
                All Repeat
              </button>
              <button
                type="button"
                onClick={() => setSelectedCohort("2")}
                className={`px-2.5 py-1 text-xs font-semibold transition border-r border-slate-300 dark:border-zinc-700 ${
                  selectedCohort === "2" ? "bg-slate-100 dark:bg-zinc-800 text-slate-900 dark:text-white font-bold" : "text-slate-600 dark:text-slate-400"
                }`}
              >
                2 Visits
              </button>
              <button
                type="button"
                onClick={() => setSelectedCohort("3+")}
                className={`px-2.5 py-1 text-xs font-semibold transition border-r border-slate-300 dark:border-zinc-700 ${
                  selectedCohort === "3+" ? "bg-slate-100 dark:bg-zinc-800 text-slate-900 dark:text-white font-bold" : "text-slate-600 dark:text-slate-400"
                }`}
              >
                3+ Visits
              </button>
              <button
                type="button"
                onClick={() => setSelectedCohort("converted")}
                className={`px-2.5 py-1 text-xs font-semibold transition ${
                  selectedCohort === "converted" ? "bg-slate-100 dark:bg-zinc-800 text-slate-900 dark:text-white font-bold" : "text-slate-600 dark:text-slate-400"
                }`}
              >
                High-Intent / Converted
              </button>
            </div>

            <div className="relative">
              <input
                type="text"
                placeholder="Search by ID, city, source..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-7 pl-7 pr-3 bg-white dark:bg-zinc-950 border border-slate-300 dark:border-zinc-700 text-slate-900 dark:text-white text-xs w-52 focus:outline-none focus:border-slate-900 dark:focus:border-white font-sans"
              />
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2 top-2" />
            </div>
          </div>
        </div>

        {/* Profiles List */}
        <div className="p-5 space-y-4">
          {filteredProfiles.map((user) => {
            const isExpanded = expandedUserId === user.id;

            return (
              <div 
                key={user.id}
                className="border border-slate-300 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-950 transition"
              >
                {/* User Header Summary Row */}
                <div 
                  onClick={() => setExpandedUserId(isExpanded ? null : user.id)}
                  className="p-4 bg-white dark:bg-zinc-900 flex flex-col md:flex-row md:items-center justify-between gap-3 cursor-pointer hover:bg-slate-50 dark:hover:bg-zinc-800/40 border-b border-slate-200 dark:border-zinc-800"
                >
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-bold text-sm text-slate-900 dark:text-white">
                        {user.alias}
                      </span>
                      <span className={`text-[10px] font-mono font-bold px-2 py-0.5 border uppercase ${
                        user.status.includes("Converted") 
                          ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border-emerald-300 dark:border-emerald-800"
                          : user.status.includes("High-Intent")
                          ? "bg-cyan-50 dark:bg-cyan-950/40 text-cyan-700 dark:text-cyan-400 border-cyan-300 dark:border-cyan-800"
                          : "bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-zinc-700"
                      }`}>
                        {user.status}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-zinc-400">
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-slate-400" />
                        <span>{user.location}</span>
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <Laptop className="w-3 h-3 text-slate-400" />
                        <span>{user.device}</span>
                      </span>
                      <span>•</span>
                      <span className="font-medium text-slate-700 dark:text-zinc-300">
                        {user.primarySource}
                      </span>
                    </div>
                  </div>

                  {/* Summary Metric Counters */}
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <div className="text-xs font-mono font-bold text-slate-900 dark:text-white tabular-nums">
                        {user.totalSessions} Sessions • {user.pageviews} Views • {user.clicks} Clicks
                      </div>
                      <div className="text-[10px] font-mono text-slate-500">
                        Span: {user.spanHours} across {user.activeDays} distinct days
                      </div>
                    </div>

                    <div className="p-1 text-slate-400 hover:text-slate-900 dark:hover:text-white">
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </div>
                  </div>
                </div>

                {/* Expanded Session Evolution Timeline */}
                {isExpanded && (
                  <div className="p-5 space-y-4">
                    {/* User Evolution Insight */}
                    <div className="p-3 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-xs">
                      <div className="text-[10px] font-mono uppercase font-bold text-slate-500 mb-0.5">
                        Behavioral Evolution Narrative
                      </div>
                      <div className="text-slate-800 dark:text-zinc-200 leading-relaxed font-sans">
                        {user.evolutionSummary}
                      </div>
                    </div>

                    {/* Navigation Path Progression Badges */}
                    <div className="space-y-1.5">
                      <div className="text-[10px] font-mono uppercase font-bold text-slate-500">
                        Pages Traversed in Journey Lifecycle
                      </div>
                      <div className="flex flex-wrap items-center gap-1.5">
                        {user.pathsVisited.map((p, idx) => (
                          <React.Fragment key={idx}>
                            <span className="px-2 py-0.5 bg-white dark:bg-zinc-900 border border-slate-300 dark:border-zinc-700 text-xs font-mono text-slate-800 dark:text-zinc-200 font-semibold">
                              {p}
                            </span>
                            {idx < user.pathsVisited.length - 1 && (
                              <ArrowRight className="w-3 h-3 text-slate-400" />
                            )}
                          </React.Fragment>
                        ))}
                      </div>
                    </div>

                    {/* Step-by-Step Session Chronology */}
                    <div className="space-y-2 pt-2 border-t border-slate-200 dark:border-zinc-800">
                      <div className="text-[10px] font-mono uppercase font-bold text-slate-500">
                        Chronological Session History
                      </div>

                      <div className="space-y-2.5">
                        {user.journey.map((sess) => (
                          <div 
                            key={sess.sessionNumber}
                            className="p-3 bg-white dark:bg-zinc-900 border border-slate-300 dark:border-zinc-800 text-xs space-y-1.5"
                          >
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                              <div className="flex items-center gap-2">
                                <span className="font-mono font-bold text-xs bg-slate-100 dark:bg-zinc-800 px-1.5 py-0.5 border border-slate-300 dark:border-zinc-700 text-slate-800 dark:text-zinc-200">
                                  Session #{sess.sessionNumber}
                                </span>
                                <span className="font-mono text-slate-500 text-[11px] tabular-nums">
                                  {sess.date}
                                </span>
                              </div>

                              <div className="flex items-center gap-3 text-[11px] font-mono text-slate-600 dark:text-zinc-400 tabular-nums">
                                <span>Entry: <strong className="text-slate-900 dark:text-white font-semibold">{sess.entryUrl}</strong></span>
                                <span>•</span>
                                <span>Dwell: <strong className="text-slate-900 dark:text-white">{sess.dwell}</strong></span>
                                <span>•</span>
                                <span>Clicks: <strong className="text-emerald-600 dark:text-emerald-400 font-bold">{sess.clicks}</strong></span>
                              </div>
                            </div>

                            <div className="text-slate-700 dark:text-zinc-300 leading-relaxed font-sans text-xs">
                              {sess.notes}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* User Metadata & Deep Links */}
                    <div className="pt-3 border-t border-slate-200 dark:border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[11px] text-slate-500">
                          Distinct ID:
                        </span>
                        <code className="bg-white dark:bg-zinc-900 border border-slate-300 dark:border-zinc-700 px-2 py-0.5 font-mono text-[11px] text-slate-800 dark:text-zinc-200">
                          {user.id}
                        </code>
                        <button
                          type="button"
                          onClick={() => handleCopyId(user.id)}
                          className="p-1 text-slate-500 hover:text-slate-900 dark:hover:text-white transition"
                          title="Copy PostHog Distinct ID"
                        >
                          {copiedId === user.id ? (
                            <Check className="w-3.5 h-3.5 text-emerald-500" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>

                      <div className="flex items-center gap-2">
                        <a
                          href={`https://us.posthog.com/project/527395/person/${encodeURIComponent(user.id)}`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-zinc-900 hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-700 dark:text-slate-300 text-xs font-semibold border border-slate-300 dark:border-zinc-700 transition"
                        >
                          <span>PostHog Person Profile</span>
                          <ExternalLink className="w-3 h-3 text-slate-400" />
                        </a>
                        <a
                          href={`https://us.posthog.com/project/527395/replay?distinct_id=${encodeURIComponent(user.id)}`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 dark:bg-white hover:bg-slate-800 dark:hover:bg-slate-100 text-white dark:text-slate-900 text-xs font-semibold transition"
                        >
                          <span>Watch User Replays</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
