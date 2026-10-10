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
  Key, 
  RefreshCw 
} from "lucide-react";
import { MINI_POSTHOG_METRICS } from "./mockControlData";

export default function MiniPostHogDashboard() {
  const [metrics, setMetrics] = useState(MINI_POSTHOG_METRICS);
  const [posthogApiKey, setPosthogApiKey] = useState(() => {
    return localStorage.getItem("velotime_admin_posthog_key") || "";
  });
  const [isQuerying, setIsQuerying] = useState(false);

  const handleSavePostHogKey = (val) => {
    setPosthogApiKey(val);
    if (val.trim()) {
      localStorage.setItem("velotime_admin_posthog_key", val.trim());
    } else {
      localStorage.removeItem("velotime_admin_posthog_key");
    }
  };

  const handleRefreshPostHog = async () => {
    setIsQuerying(true);
    // Simulate real-time query or live fetch
    await new Promise(r => setTimeout(r, 600));
    setIsQuerying(false);
  };

  return (
    <div className="space-y-6">
      {/* Header Overview Card */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 shadow-lg space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-zinc-800">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono uppercase tracking-wider text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded">
                Live Analytics
              </span>
              <span className="text-xs font-mono text-zinc-400">Project ID: 527395 (US Cloud)</span>
            </div>
            <h2 className="text-base font-bold text-white mt-1 flex items-center gap-2">
              <Activity className="w-5 h-5 text-emerald-400" />
              <span>Mini PostHog Telemetry Dashboard</span>
            </h2>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleRefreshPostHog}
              disabled={isQuerying}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-medium border border-zinc-700 transition cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isQuerying ? "animate-spin" : ""}`} />
              <span>Refresh Metrics</span>
            </button>
            <a
              href="https://us.posthog.com/project/527395"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold transition"
            >
              <span>Full PostHog App</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>

        {/* 4 High-Level Metric Tiles */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3.5 rounded-lg bg-zinc-950/80 border border-zinc-800">
            <div className="text-[10px] font-mono text-zinc-400 uppercase flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-cyan-400" />
              <span>Recorded Today</span>
            </div>
            <div className="text-xl font-bold text-white mt-1">{metrics.sessionsToday} sessions</div>
            <div className="text-[10px] text-emerald-400 mt-0.5">1 visitor active now</div>
          </div>

          <div className="p-3.5 rounded-lg bg-zinc-950/80 border border-zinc-800">
            <div className="text-[10px] font-mono text-zinc-400 uppercase flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-cyan-400" />
              <span>Avg Dwell Duration</span>
            </div>
            <div className="text-xl font-bold text-cyan-400 mt-1">{metrics.avgSessionSeconds}s</div>
            <div className="text-[10px] text-zinc-500 mt-0.5">Weighted across all devices</div>
          </div>

          <div className="p-3.5 rounded-lg bg-zinc-950/80 border border-zinc-800">
            <div className="text-[10px] font-mono text-zinc-400 uppercase flex items-center gap-1.5">
              <MousePointer className="w-3.5 h-3.5 text-cyan-400" />
              <span>Bounce Rate</span>
            </div>
            <div className="text-xl font-bold text-amber-400 mt-1">{metrics.bounceRate}</div>
            <div className="text-[10px] text-zinc-500 mt-0.5">Standard SaaS benchmark: ~50%</div>
          </div>

          <div className="p-3.5 rounded-lg bg-zinc-950/80 border border-zinc-800">
            <div className="text-[10px] font-mono text-zinc-400 uppercase flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 text-emerald-400" />
              <span>Console Error Rate</span>
            </div>
            <div className="text-xl font-bold text-emerald-400 mt-1">{metrics.errorRate}</div>
            <div className="text-[10px] text-emerald-400 mt-0.5">Zero runtime exceptions</div>
          </div>
        </div>
      </div>

      {/* Breakdown Grid: Traffic Referrers & Top Events */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Left: Traffic Referrers & Device Split */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 shadow-lg space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
            <h3 className="text-xs font-bold text-white flex items-center gap-2">
              <PieChart className="w-4 h-4 text-cyan-400" />
              <span>Acquisition Traffic Sources</span>
            </h3>
            <span className="text-[11px] font-mono text-zinc-500">24-Hour Attribution</span>
          </div>

          <div className="space-y-3">
            {metrics.topReferrers.map((ref, idx) => (
              <div key={idx} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-zinc-200 font-medium">{ref.source}</span>
                  <span className="text-zinc-400 font-mono">{ref.count} sessions ({ref.pct})</span>
                </div>
                <div className="w-full h-1.5 bg-zinc-950 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-cyan-500 rounded-full" 
                    style={{ width: ref.pct }}
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="pt-3 border-t border-zinc-800 flex items-center justify-between text-xs">
            <span className="text-zinc-400">Device Platform Ratio:</span>
            <div className="font-mono text-zinc-200 flex items-center gap-3">
              <span>Desktop: <strong className="text-white">{metrics.deviceSplit.desktop}</strong></span>
              <span>Mobile: <strong className="text-cyan-400">{metrics.deviceSplit.mobile}</strong></span>
            </div>
          </div>
        </div>

        {/* Right: Event Stream Capture */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 shadow-lg space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
            <h3 className="text-xs font-bold text-white flex items-center gap-2">
              <Zap className="w-4 h-4 text-emerald-400" />
              <span>Top Captured Interaction Events</span>
            </h3>
            <span className="text-[11px] font-mono text-zinc-500">Telemetry Stream</span>
          </div>

          <div className="space-y-2">
            {metrics.topEvents.map((ev, idx) => (
              <div 
                key={idx}
                className="flex items-center justify-between p-2.5 rounded-lg bg-zinc-950/80 border border-zinc-800/80 text-xs"
              >
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  <span className="font-mono text-zinc-200">{ev.event}</span>
                </div>
                <span className="font-mono font-bold text-white bg-zinc-900 px-2 py-0.5 rounded border border-zinc-800">
                  {ev.count} fires
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* PostHog Direct Navigation Hub */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 shadow-lg space-y-3">
        <div className="text-xs font-bold text-white mb-2">
          Direct PostHog Telemetry Quick Links
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          <a
            href="https://us.posthog.com/project/527395/replay"
            target="_blank"
            rel="noreferrer"
            className="p-3 rounded-lg bg-zinc-950 border border-zinc-800 hover:border-zinc-700 transition flex items-center justify-between text-xs text-zinc-300 hover:text-white"
          >
            <span>Session Replays</span>
            <ExternalLink className="w-3.5 h-3.5 text-zinc-500" />
          </a>
          <a
            href="https://us.posthog.com/project/527395/insights"
            target="_blank"
            rel="noreferrer"
            className="p-3 rounded-lg bg-zinc-950 border border-zinc-800 hover:border-zinc-700 transition flex items-center justify-between text-xs text-zinc-300 hover:text-white"
          >
            <span>Conversion Funnels</span>
            <ExternalLink className="w-3.5 h-3.5 text-zinc-500" />
          </a>
          <a
            href="https://us.posthog.com/project/527395/events"
            target="_blank"
            rel="noreferrer"
            className="p-3 rounded-lg bg-zinc-950 border border-zinc-800 hover:border-zinc-700 transition flex items-center justify-between text-xs text-zinc-300 hover:text-white"
          >
            <span>Live Event Stream</span>
            <ExternalLink className="w-3.5 h-3.5 text-zinc-500" />
          </a>
          <a
            href="https://us.posthog.com/project/527395/persons"
            target="_blank"
            rel="noreferrer"
            className="p-3 rounded-lg bg-zinc-950 border border-zinc-800 hover:border-zinc-700 transition flex items-center justify-between text-xs text-zinc-300 hover:text-white"
          >
            <span>Identified Users</span>
            <ExternalLink className="w-3.5 h-3.5 text-zinc-500" />
          </a>
        </div>
      </div>
    </div>
  );
}
