import React, { useState } from "react";
import { 
  Activity, 
  ExternalLink, 
  Users, 
  Clock, 
  MousePointer, 
  AlertTriangle, 
  PieChart, 
  Zap, 
  RefreshCw 
} from "lucide-react";
import { MINI_POSTHOG_METRICS } from "./mockControlData";

export default function MiniPostHogDashboard() {
  const [metrics, setMetrics] = useState(MINI_POSTHOG_METRICS);
  const [isQuerying, setIsQuerying] = useState(false);

  const handleRefreshPostHog = async () => {
    setIsQuerying(true);
    // Simulate real-time query
    await new Promise(r => setTimeout(r, 600));
    setIsQuerying(false);
  };

  return (
    <div className="space-y-6">
      {/* Header Overview Card */}
      <div className="bg-white dark:bg-zinc-900 border border-slate-300 dark:border-zinc-700">
        <div className="bg-slate-100 dark:bg-zinc-800/90 border-b border-slate-300 dark:border-zinc-700 px-4 py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-slate-700 dark:text-slate-300" />
            <span className="font-bold text-xs uppercase tracking-wider text-slate-800 dark:text-slate-200">
              Mini PostHog Telemetry Dashboard
            </span>
            <span className="text-[10px] font-mono px-1.5 py-0.5 bg-white dark:bg-zinc-900 border border-slate-300 dark:border-zinc-700 text-slate-600 dark:text-slate-400">
              Project 527395
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleRefreshPostHog}
              disabled={isQuerying}
              className="inline-flex items-center gap-1.5 px-3 py-1 bg-white dark:bg-zinc-900 hover:bg-slate-50 dark:hover:bg-zinc-800 text-slate-700 dark:text-slate-300 text-xs font-semibold border border-slate-300 dark:border-zinc-700 transition cursor-pointer"
            >
              <RefreshCw className={`w-3 h-3 ${isQuerying ? "animate-spin" : ""}`} />
              <span>Refresh Telemetry</span>
            </button>
            <a
              href="https://us.posthog.com/project/527395"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-900 dark:bg-white hover:bg-slate-800 dark:hover:bg-slate-100 text-white dark:text-slate-900 text-xs font-semibold transition"
            >
              <span>Full PostHog App</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>

        {/* 4 High-Level Metric Tiles */}
        <div className="p-5 grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3.5 bg-slate-50 dark:bg-zinc-950 border border-slate-300 dark:border-zinc-800">
            <div className="text-[10px] font-mono text-slate-500 dark:text-slate-400 uppercase flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5" />
              <span>Recorded Today</span>
            </div>
            <div className="text-xl font-black text-slate-900 dark:text-white tabular-nums mt-0.5">{metrics.sessionsToday} sessions</div>
            <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold mt-0.5">1 visitor active now</div>
          </div>

          <div className="p-3.5 bg-slate-50 dark:bg-zinc-950 border border-slate-300 dark:border-zinc-800">
            <div className="text-[10px] font-mono text-slate-500 dark:text-slate-400 uppercase flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" />
              <span>Avg Dwell Duration</span>
            </div>
            <div className="text-xl font-black text-slate-900 dark:text-white tabular-nums mt-0.5">{metrics.avgSessionSeconds}s</div>
            <div className="text-[10px] text-slate-500 mt-0.5">Weighted across all viewports</div>
          </div>

          <div className="p-3.5 bg-slate-50 dark:bg-zinc-950 border border-slate-300 dark:border-zinc-800">
            <div className="text-[10px] font-mono text-slate-500 dark:text-slate-400 uppercase flex items-center gap-1.5">
              <MousePointer className="w-3.5 h-3.5" />
              <span>Bounce Rate</span>
            </div>
            <div className="text-xl font-black text-amber-600 dark:text-amber-400 tabular-nums mt-0.5">{metrics.bounceRate}</div>
            <div className="text-[10px] text-slate-500 mt-0.5">SaaS baseline: ~50%</div>
          </div>

          <div className="p-3.5 bg-slate-50 dark:bg-zinc-950 border border-slate-300 dark:border-zinc-800">
            <div className="text-[10px] font-mono text-slate-500 dark:text-slate-400 uppercase flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>Console Error Rate</span>
            </div>
            <div className="text-xl font-black text-emerald-600 dark:text-emerald-400 tabular-nums mt-0.5">{metrics.errorRate}</div>
            <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold mt-0.5">Zero runtime exceptions</div>
          </div>
        </div>
      </div>

      {/* Breakdown Grid: Traffic Referrers & Top Events */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Left: Traffic Referrers & Device Split */}
        <div className="bg-white dark:bg-zinc-900 border border-slate-300 dark:border-zinc-700">
          <div className="bg-slate-100 dark:bg-zinc-800/90 border-b border-slate-300 dark:border-zinc-700 px-4 py-2.5 flex items-center justify-between">
            <span className="font-bold text-xs uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-2">
              <PieChart className="w-3.5 h-3.5" />
              <span>Acquisition Traffic Sources</span>
            </span>
            <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400 font-bold">24-HR ATTRIBUTION</span>
          </div>

          <div className="p-5 space-y-4">
            <div className="space-y-3">
              {metrics.topReferrers.map((ref, idx) => (
                <div key={idx} className="space-y-1">
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <span className="text-slate-800 dark:text-zinc-200">{ref.source}</span>
                    <span className="text-slate-600 dark:text-zinc-400 font-mono tabular-nums">{ref.count} sessions ({ref.pct})</span>
                  </div>
                  <div className="w-full h-2 bg-slate-100 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 overflow-hidden">
                    <div 
                      className="h-full bg-slate-900 dark:bg-rose-500" 
                      style={{ width: ref.pct }}
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-3 border-t border-slate-200 dark:border-zinc-800 flex items-center justify-between text-xs font-semibold">
              <span className="text-slate-600 dark:text-zinc-400">Device Platform Ratio:</span>
              <div className="font-mono text-slate-900 dark:text-zinc-200 flex items-center gap-3 tabular-nums">
                <span>Desktop: <strong className="text-slate-900 dark:text-white">{metrics.deviceSplit.desktop}</strong></span>
                <span>Mobile: <strong className="text-rose-600 dark:text-rose-400">{metrics.deviceSplit.mobile}</strong></span>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Event Stream Capture */}
        <div className="bg-white dark:bg-zinc-900 border border-slate-300 dark:border-zinc-700">
          <div className="bg-slate-100 dark:bg-zinc-800/90 border-b border-slate-300 dark:border-zinc-700 px-4 py-2.5 flex items-center justify-between">
            <span className="font-bold text-xs uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-2">
              <Zap className="w-3.5 h-3.5" />
              <span>Captured Interaction Events</span>
            </span>
            <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400 font-bold">TELEMETRY STREAM</span>
          </div>

          <div className="p-5 space-y-2">
            {metrics.topEvents.map((ev, idx) => (
              <div 
                key={idx}
                className="flex items-center justify-between p-2.5 bg-slate-50 dark:bg-zinc-950 border border-slate-300 dark:border-zinc-800 text-xs"
              >
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span className="font-mono text-slate-800 dark:text-zinc-200 font-semibold">{ev.event}</span>
                </div>
                <span className="font-mono font-bold text-slate-900 dark:text-white bg-white dark:bg-zinc-900 px-2 py-0.5 border border-slate-300 dark:border-zinc-700 tabular-nums">
                  {ev.count} fires
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* PostHog Direct Navigation Hub */}
      <div className="bg-white dark:bg-zinc-900 border border-slate-300 dark:border-zinc-700">
        <div className="bg-slate-100 dark:bg-zinc-800/90 border-b border-slate-300 dark:border-zinc-700 px-4 py-2.5">
          <span className="font-bold text-xs uppercase tracking-wider text-slate-800 dark:text-slate-200">
            Direct PostHog Telemetry Quick Navigation
          </span>
        </div>
        <div className="p-5 grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          <a
            href="https://us.posthog.com/project/527395/replay"
            target="_blank"
            rel="noreferrer"
            className="p-3 bg-slate-50 dark:bg-zinc-950 border border-slate-300 dark:border-zinc-800 hover:bg-slate-100 dark:hover:bg-zinc-900 transition flex items-center justify-between text-xs text-slate-800 dark:text-zinc-300 hover:text-slate-900 dark:hover:text-white font-semibold"
          >
            <span>Session Replays</span>
            <ExternalLink className="w-3.5 h-3.5 text-slate-500" />
          </a>
          <a
            href="https://us.posthog.com/project/527395/insights"
            target="_blank"
            rel="noreferrer"
            className="p-3 bg-slate-50 dark:bg-zinc-950 border border-slate-300 dark:border-zinc-800 hover:bg-slate-100 dark:hover:bg-zinc-900 transition flex items-center justify-between text-xs text-slate-800 dark:text-zinc-300 hover:text-slate-900 dark:hover:text-white font-semibold"
          >
            <span>Conversion Funnels</span>
            <ExternalLink className="w-3.5 h-3.5 text-slate-500" />
          </a>
          <a
            href="https://us.posthog.com/project/527395/events"
            target="_blank"
            rel="noreferrer"
            className="p-3 bg-slate-50 dark:bg-zinc-950 border border-slate-300 dark:border-zinc-800 hover:bg-slate-100 dark:hover:bg-zinc-900 transition flex items-center justify-between text-xs text-slate-800 dark:text-zinc-300 hover:text-slate-900 dark:hover:text-white font-semibold"
          >
            <span>Live Event Stream</span>
            <ExternalLink className="w-3.5 h-3.5 text-slate-500" />
          </a>
          <a
            href="https://us.posthog.com/project/527395/persons"
            target="_blank"
            rel="noreferrer"
            className="p-3 bg-slate-50 dark:bg-zinc-950 border border-slate-300 dark:border-zinc-800 hover:bg-slate-100 dark:hover:bg-zinc-900 transition flex items-center justify-between text-xs text-slate-800 dark:text-zinc-300 hover:text-slate-900 dark:hover:text-white font-semibold"
          >
            <span>Identified Users</span>
            <ExternalLink className="w-3.5 h-3.5 text-slate-500" />
          </a>
        </div>
      </div>
    </div>
  );
}
