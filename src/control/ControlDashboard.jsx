import React, { useState, useEffect } from "react";
import { UserButton, useUser } from "@clerk/clerk-react";
import { 
  Terminal, 
  Eye, 
  Search, 
  Activity, 
  ArrowLeft, 
  Sun,
  Moon,
  Clock, 
  Radio
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
  const [theme, setTheme] = useState(() => {
    try {
      return localStorage.getItem("velotime_theme") || "light";
    } catch (e) {
      return "light";
    }
  });

  // Sync theme with document element and localStorage
  useEffect(() => {
    try {
      if (theme === "dark") {
        document.documentElement.classList.add("dark");
      } else {
        document.documentElement.classList.remove("dark");
      }
      localStorage.setItem("velotime_theme", theme);
    } catch (e) {}
  }, [theme]);

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
    { id: "scripts", label: "Scripts & Outreach", icon: Terminal, count: "11 Scripts" },
    { id: "posthog_audits", label: "PostHog Audits & AI", icon: Eye, count: "UX Audits" },
    { id: "gsc", label: "Search Console (GSC)", icon: Search, count: "Organic Telemetry" },
    { id: "posthog_mini", label: "PostHog Mini Dashboard", icon: Activity, count: "Live Stream" },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-gray-200 dark:bg-zinc-950 text-slate-900 dark:text-slate-100 font-sans">
      {/* Top Header - Matches VeloTime Main App Header Exactly */}
      <header className="bg-white dark:bg-zinc-900 border-b-2 border-slate-300 dark:border-zinc-700 px-6 py-3 flex items-center justify-between shrink-0 z-50 transition-colors">
        {/* Brand Title */}
        <div className="flex items-center gap-3">
          <a 
            href="/" 
            className="font-black text-xl text-slate-900 dark:text-slate-100 tracking-tighter cursor-pointer flex items-center gap-2"
            title="Return to VeloTime App"
          >
            <svg
              className="w-6 h-6 shrink-0"
              viewBox="0 0 200 200"
              fill="none"
            >
              <rect width="200" height="200" fill="#0F172A" />
              <path
                d="M 60 48 L 140 48 L 155 63 L 155 72 H 45 V 63 Z"
                fill="#F43F5E"
              />
              <path d="M 90 72 H 110 V 94 H 90 Z" fill="#F43F5E" />
              <path
                d="M 45 94 H 68 L 100 132 L 132 94 H 155 L 110 148 C 105 153 95 153 90 148 Z"
                fill="#FFFFFF"
              />
            </svg>
            <span>
              VELO<span className="text-rose-600">TIME</span>
            </span>
          </a>
          <span className="px-2 py-0.5 text-[10px] font-mono font-bold tracking-widest uppercase bg-slate-100 dark:bg-zinc-800 border border-slate-300 dark:border-zinc-700 text-slate-700 dark:text-slate-300">
            CONTROL
          </span>
        </div>

        {/* Center Tabs Navigation - Matches VeloTime App Segmented Nav */}
        <div className="hidden md:flex flex-1 justify-center max-w-2xl px-4">
          <nav className="flex w-full bg-slate-100 dark:bg-zinc-800 border border-slate-300 dark:border-zinc-700">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 px-4 py-2 font-semibold text-xs border-r border-slate-300 dark:border-zinc-700 last:border-r-0 transition-colors flex items-center justify-center gap-1.5 ${
                  activeTab === tab.id
                    ? "bg-white dark:bg-zinc-900 text-slate-900 dark:text-slate-100"
                    : "text-slate-600 dark:text-slate-400 hover:bg-white dark:bg-zinc-900 hover:text-slate-900 dark:text-slate-100"
                }`}
              >
                <tab.icon className="w-3.5 h-3.5 shrink-0" />
                <span>{tab.label}</span>
              </button>
            ))}
          </nav>
        </div>

        {/* Right Header Controls */}
        <div className="flex items-center gap-3">
          {/* Live Eastern Time Clock */}
          <div className="hidden lg:flex items-center gap-2 px-2.5 py-1 text-xs font-mono bg-slate-100 dark:bg-zinc-800 border border-slate-300 dark:border-zinc-700 text-slate-600 dark:text-slate-300 tabular-nums">
            <span className={`w-2 h-2 rounded-full ${isBusinessHours ? "bg-emerald-500 animate-pulse" : "bg-slate-400"}`} />
            <span>{timeStr || "EDT"}</span>
          </div>

          {/* Theme Toggle */}
          <button
            onClick={() => setTheme((prev) => (prev === "light" ? "dark" : "light"))}
            className="p-1.5 rounded text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-zinc-800 border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 transition-colors"
            title="Toggle Light/Dark Theme"
            aria-label="Toggle Theme"
          >
            {theme === "light" ? (
              <Moon className="w-4 h-4" />
            ) : (
              <Sun className="w-4 h-4" />
            )}
          </button>

          {/* User Details & Clerk Button */}
          <div className="text-right hidden sm:block">
            <div className="text-sm font-semibold text-slate-800 dark:text-slate-200">
              {user?.fullName || "Founder"}
            </div>
            <div className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
              Super Admin
            </div>
          </div>
          <UserButton afterSignOutUrl="/" />
        </div>
      </header>

      {/* Mobile Sub-Navigation Bar */}
      <div className="md:hidden bg-white dark:bg-zinc-900 border-b border-slate-300 dark:border-zinc-700 p-2 overflow-x-auto">
        <nav className="flex bg-slate-100 dark:bg-zinc-800 border border-slate-300 dark:border-zinc-700 min-w-max">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-3 py-1.5 font-semibold text-xs border-r border-slate-300 dark:border-zinc-700 last:border-r-0 transition-colors flex items-center gap-1.5 ${
                activeTab === tab.id
                  ? "bg-white dark:bg-zinc-900 text-slate-900 dark:text-slate-100"
                  : "text-slate-600 dark:text-slate-400 hover:bg-white dark:bg-zinc-900"
              }`}
            >
              <tab.icon className="w-3.5 h-3.5 shrink-0" />
              <span>{tab.label}</span>
            </button>
          ))}
        </nav>
      </div>

      {/* Main Content Workspace */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 flex flex-col gap-6">
        {activeTab === "scripts" && <ScriptsConsole />}
        {activeTab === "posthog_audits" && <PostHogAudits />}
        {activeTab === "gsc" && <GscTelemetry />}
        {activeTab === "posthog_mini" && <MiniPostHogDashboard />}
      </main>

      {/* Footer Bar */}
      <footer className="bg-white dark:bg-zinc-900 border-t border-slate-300 dark:border-zinc-700 px-6 py-2.5 text-xs text-slate-500 dark:text-zinc-500 flex flex-col sm:flex-row items-center justify-between gap-2 shrink-0">
        <div className="flex items-center gap-2 font-mono text-[11px]">
          <span className="w-2 h-2 rounded-full bg-emerald-500" />
          <span>VeloTime Mission Control System</span>
          <span>•</span>
          <span>Auth: 4thgencorei7@gmail.com</span>
        </div>
        <div className="flex items-center gap-4 text-[11px] font-mono">
          <a href="/" className="hover:text-slate-800 dark:hover:text-zinc-300 transition underline">
            Return to Timesheet App
          </a>
        </div>
      </footer>
    </div>
  );
}
