import React, { useState, useEffect } from "react";
import { UserButton, useUser } from "@clerk/clerk-react";
import { 
  Terminal, 
  Eye, 
  Search, 
  Activity, 
  ArrowLeft, 
  ShieldCheck, 
  Clock, 
  Radio, 
  Layers
} from "lucide-react";
import ScriptsConsole from "./ScriptsConsole";
import PostHogAudits from "./PostHogAudits";
import GscTelemetry from "./GscTelemetry";
import MiniPostHogDashboard from "./MiniPostHogDashboard";

export default function ControlDashboard() {
  const { user } = useUser();
  const [activeTab, setActiveTab] = useState("scripts"); // 'scripts' | 'posthog_audits' | 'gsc' | 'posthog_mini'
  const [timeStr, setTimeStr] = useState("");
  const [isBusinessHours, setIsBusinessHours] = useState(false);

  // Live Eastern Time Clock & Business Hours Check
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const timeFmt = new Intl.DateTimeFormat("en-US", {
        timeZone: "America/New_York",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: true
      }).format(now);
      const dayFmt = new Intl.DateTimeFormat("en-US", {
        timeZone: "America/New_York",
        weekday: "short"
      }).format(now);
      const hour24 = parseInt(new Intl.DateTimeFormat("en-US", {
        timeZone: "America/New_York",
        hour: "numeric",
        hour12: false
      }).format(now), 10);

      setTimeStr(`${dayFmt} ${timeFmt} EDT`);
      const isWeekday = dayFmt !== "Sat" && dayFmt !== "Sun";
      setIsBusinessHours(isWeekday && hour24 >= 9 && hour24 < 17);
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const tabs = [
    { id: "scripts", label: "Script Automation Console", icon: Terminal, count: "11 Scripts" },
    { id: "posthog_audits", label: "PostHog Audits & AI", icon: Eye, count: "Latest Audit" },
    { id: "gsc", label: "Google Search Console", icon: Search, count: "142 Pages" },
    { id: "posthog_mini", label: "Mini PostHog Dashboard", icon: Activity, count: "Live Telemetry" },
  ];

  return (
    <div className="min-h-screen bg-[#080B11] text-slate-100 font-sans flex flex-col selection:bg-cyan-500/30 selection:text-white">
      {/* Precision Background Atmosphere */}
      <div 
        className="fixed inset-0 pointer-events-none opacity-20 z-0"
        style={{
          backgroundImage: `
            linear-gradient(rgba(255, 255, 255, 0.04) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255, 255, 255, 0.04) 1px, transparent 1px)
          `,
          backgroundSize: "40px 40px"
        }}
      />

      {/* Top Mission Control Header */}
      <header className="sticky top-0 z-30 w-full bg-zinc-950/80 backdrop-blur-md border-b border-zinc-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          {/* Left: Brand & Admin Indicator */}
          <div className="flex items-center gap-3">
            <a 
              href="/"
              className="flex items-center gap-2 group transition"
              title="Return to VeloTime App"
            >
              <div className="w-8 h-8 rounded-lg bg-zinc-900 border border-zinc-700 flex items-center justify-center text-white shadow-sm group-hover:border-zinc-500 transition">
                <svg className="w-5 h-5" viewBox="0 0 200 200" fill="none">
                  <rect width="200" height="200" rx="36" fill="#0F172A" />
                  <path d="M 60 48 L 140 48 L 155 63 L 155 72 H 45 V 63 Z" fill="#F43F5E" />
                  <path d="M 90 72 H 110 V 94 H 90 Z" fill="#F43F5E" />
                  <path d="M 45 94 H 68 L 100 132 L 132 94 H 155 L 110 148 C 105 153 95 153 90 148 Z" fill="#FFFFFF" />
                </svg>
              </div>
              <div className="hidden sm:block">
                <span className="font-extrabold text-sm tracking-wider uppercase text-white font-sans">
                  VELO<span className="text-rose-500">TIME</span>
                </span>
              </div>
            </a>

            <div className="h-5 w-px bg-zinc-800 hidden sm:block" />

            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-cyan-500/10 border border-cyan-500/25 text-cyan-400 font-mono text-[11px] font-bold tracking-wide">
                <Radio className="w-3 h-3 animate-pulse" />
                <span>MISSION CONTROL</span>
              </span>

              <span className="hidden md:inline-flex items-center gap-1.5 text-xs text-zinc-400 font-mono bg-zinc-900 px-2.5 py-0.5 rounded border border-zinc-800">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>4thgencorei7@gmail.com</span>
              </span>
            </div>
          </div>

          {/* Right: Live Clock, Business Hours Status & User Button */}
          <div className="flex items-center gap-3">
            <div className="hidden lg:flex items-center gap-3 font-mono text-xs text-zinc-400 bg-zinc-900/90 px-3 py-1.5 rounded-lg border border-zinc-800">
              <div className="flex items-center gap-1.5 text-zinc-300">
                <Clock className="w-3.5 h-3.5 text-zinc-400" />
                <span>{timeStr}</span>
              </div>
              <div className="h-3 w-px bg-zinc-700" />
              <div className="flex items-center gap-1.5">
                <span className={`w-2 h-2 rounded-full ${isBusinessHours ? "bg-emerald-400" : "bg-amber-400"}`} />
                <span className={isBusinessHours ? "text-emerald-400" : "text-amber-400"}>
                  {isBusinessHours ? "B2B Dispatch Active" : "Weekend/Off-Hours Guard"}
                </span>
              </div>
            </div>

            <a
              href="/"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-800 text-xs font-medium transition cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5 text-zinc-400" />
              <span className="hidden sm:inline">Workspace</span>
            </a>

            <div className="pl-1">
              <UserButton afterSignOutUrl="/control" />
            </div>
          </div>
        </div>

        {/* Navigation Tabs Bar */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <nav className="flex items-center gap-1 overflow-x-auto py-2 border-t border-zinc-900">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
                    isActive
                      ? "bg-zinc-800 text-white border border-zinc-700 shadow-sm"
                      : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900 border border-transparent"
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? "text-cyan-400" : "text-zinc-500"}`} />
                  <span>{tab.label}</span>
                  <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded ${
                    isActive ? "bg-zinc-900 text-zinc-300" : "text-zinc-500"
                  }`}>
                    {tab.count}
                  </span>
                </button>
              );
            })}
          </nav>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 relative z-10">
        {activeTab === "scripts" && <ScriptsConsole />}
        {activeTab === "posthog_audits" && <PostHogAudits />}
        {activeTab === "gsc" && <GscTelemetry />}
        {activeTab === "posthog_mini" && <MiniPostHogDashboard />}
      </main>

      {/* Mission Control Footer */}
      <footer className="w-full border-t border-zinc-900 bg-zinc-950/40 py-4 px-6 relative z-10">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between text-xs text-zinc-500 gap-2">
          <div className="font-mono text-[11px]">
            VeloTime Mission Control &bull; Strictly Authorized: 4thgencorei7@gmail.com
          </div>
          <div className="flex items-center gap-4 text-[11px] font-mono">
            <a href="https://github.com/1d2g/velotime-landing" target="_blank" rel="noreferrer" className="hover:text-zinc-300">
              velotime-landing
            </a>
            <span>&bull;</span>
            <a href="https://github.com/1d2g/velotime-ui" target="_blank" rel="noreferrer" className="hover:text-zinc-300">
              velotime-ui
            </a>
            <span>&bull;</span>
            <a href="https://us.posthog.com/project/527395" target="_blank" rel="noreferrer" className="hover:text-zinc-300">
              PostHog 527395
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
