import React, { useState, useEffect } from "react";
import {
  Bot,
  Activity,
  PlugZap,
  MessageSquare,
  Target,
  Brain,
  ShieldCheck,
  Download,
  RotateCcw,
  Check,
  X,
  HelpCircle,
  Plus,
  Trash2,
  Lock,
  AlertTriangle,
  Clock,
  SlidersHorizontal,
  ArrowRight,
  Copy,
} from "lucide-react";
import {
  MARKETING_AGENT_LS_KEY,
  DEFAULT_AGENT_CONFIG,
  AUTONOMY_MODES,
  COGNITIVE_LOOP_STAGES,
  SAMPLE_APPROVAL_CARDS,
} from "./marketingAgentConfig";

const SUB_TABS = [
  { id: "architecture", label: "Architecture & Loop", icon: Activity },
  { id: "channels", label: "Channels & Connectors", icon: PlugZap },
  { id: "approvals", label: "Approval Queue & Discord", icon: MessageSquare },
  { id: "scoring", label: "Scoring & Win Condition", icon: Target },
  { id: "memory", label: "Memory & Experiments", icon: Brain },
];

const CHANNEL_MODE_STYLES = {
  enabled:
    "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800",
  shadow:
    "bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-800",
  disabled:
    "bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-slate-400 border-slate-300 dark:border-zinc-700",
};

const EXPERIMENT_STATUS_OPTIONS = ["proposed", "queued", "testing", "paused"];

function loadInitialConfig() {
  try {
    const raw = localStorage.getItem(MARKETING_AGENT_LS_KEY);
    if (!raw) return DEFAULT_AGENT_CONFIG;
    const parsed = JSON.parse(raw);
    return {
      ...DEFAULT_AGENT_CONFIG,
      ...parsed,
      cadence: { ...DEFAULT_AGENT_CONFIG.cadence, ...(parsed.cadence || {}) },
      guardrails: { ...DEFAULT_AGENT_CONFIG.guardrails, ...(parsed.guardrails || {}) },
      winCondition: { ...DEFAULT_AGENT_CONFIG.winCondition, ...(parsed.winCondition || {}) },
    };
  } catch (e) {
    return DEFAULT_AGENT_CONFIG;
  }
}

export default function MarketingAgentConsole() {
  const [config, setConfig] = useState(loadInitialConfig);
  const [activeSubTab, setActiveSubTab] = useState("architecture");
  const [sampleDecisions, setSampleDecisions] = useState({});
  const [copiedSpec, setCopiedSpec] = useState(false);

  const [newExpTitle, setNewExpTitle] = useState("");
  const [newExpChannel, setNewExpChannel] = useState("Google Ads + Landing");
  const [newExpHypothesis, setNewExpHypothesis] = useState("");
  const [newExpMetric, setNewExpMetric] = useState("");
  const [newExpPoints, setNewExpPoints] = useState(25);

  useEffect(() => {
    try {
      localStorage.setItem(MARKETING_AGENT_LS_KEY, JSON.stringify(config));
    } catch (e) {}
  }, [config]);

  const activeChannelsCount = config.channels.filter((c) => c.mode === "enabled").length;
  const shadowChannelsCount = config.channels.filter((c) => c.mode === "shadow").length;

  const updateCadence = (field, value) => {
    setConfig((prev) => ({
      ...prev,
      cadence: { ...prev.cadence, [field]: value },
    }));
  };

  const updateGuardrail = (field, value) => {
    setConfig((prev) => ({
      ...prev,
      guardrails: { ...prev.guardrails, [field]: value },
    }));
  };

  const updateWinCondition = (field, value) => {
    setConfig((prev) => ({
      ...prev,
      winCondition: { ...prev.winCondition, [field]: value },
    }));
  };

  const updateChannel = (channelId, patch) => {
    setConfig((prev) => ({
      ...prev,
      channels: prev.channels.map((ch) =>
        ch.id === channelId ? { ...ch, ...patch } : ch
      ),
    }));
  };

  const updateScoringRulePoints = (ruleId, points) => {
    setConfig((prev) => ({
      ...prev,
      scoringRules: prev.scoringRules.map((rule) =>
        rule.id === ruleId ? { ...rule, points: Number(points) || 0 } : rule
      ),
    }));
  };

  const updateEscalationRoute = (ruleId, route) => {
    setConfig((prev) => ({
      ...prev,
      discordEscalationRules: prev.discordEscalationRules.map((rule) =>
        rule.id === ruleId ? { ...rule, route } : rule
      ),
    }));
  };

  const updateExperimentStatus = (expId, status) => {
    setConfig((prev) => ({
      ...prev,
      experiments: prev.experiments.map((exp) =>
        exp.id === expId ? { ...exp, status } : exp
      ),
    }));
  };

  const deleteExperiment = (expId) => {
    setConfig((prev) => ({
      ...prev,
      experiments: prev.experiments.filter((exp) => exp.id !== expId),
    }));
  };

  const handleAddExperiment = (e) => {
    e.preventDefault();
    if (!newExpTitle.trim() || !newExpHypothesis.trim()) return;
    const item = {
      id: `exp-${Date.now()}`,
      title: newExpTitle.trim(),
      channel: newExpChannel.trim() || "General",
      hypothesis: newExpHypothesis.trim(),
      successMetric: newExpMetric.trim() || "Evaluated over 7-day window",
      status: "proposed",
      expectedPoints: Number(newExpPoints) || 20,
    };
    setConfig((prev) => ({
      ...prev,
      experiments: [item, ...prev.experiments],
    }));
    setNewExpTitle("");
    setNewExpHypothesis("");
    setNewExpMetric("");
    setNewExpPoints(25);
  };

  const handleCopySpec = () => {
    const payload = JSON.stringify(
      {
        schemaVersion: "1.0.0-skeleton",
        exportedAt: new Date().toISOString(),
        ...config,
      },
      null,
      2
    );
    navigator.clipboard.writeText(payload);
    setCopiedSpec(true);
    setTimeout(() => setCopiedSpec(false), 2000);
  };

  const handleDownloadSpec = () => {
    const payload = JSON.stringify(
      {
        schemaVersion: "1.0.0-skeleton",
        exportedAt: new Date().toISOString(),
        ...config,
      },
      null,
      2
    );
    const blob = new Blob([payload], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "velotime-marketing-agent-spec.json";
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  const handleResetDefaults = () => {
    setConfig(DEFAULT_AGENT_CONFIG);
    setSampleDecisions({});
    try {
      localStorage.removeItem(MARKETING_AGENT_LS_KEY);
    } catch (e) {}
  };

  const selectedModeMeta =
    AUTONOMY_MODES.find((m) => m.id === config.autonomyMode) || AUTONOMY_MODES[1];

  return (
    <div className="space-y-5">
      {/* Top Status Banner */}
      <section className="bg-white dark:bg-zinc-900 border-2 border-slate-300 dark:border-zinc-700 p-5 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 text-[11px] font-mono font-bold uppercase tracking-wider bg-slate-900 dark:bg-white text-white dark:text-slate-900">
                <Bot className="w-3.5 h-3.5" />
                <span>SKELETON BLUEPRINT</span>
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 text-[11px] font-mono font-bold uppercase tracking-wider bg-amber-50 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                <span>RUNTIME NOT DEPLOYED</span>
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 dark:text-slate-100">
              Semi-Autonomous Marketing Agent Architecture
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 max-w-3xl">
              Blueprint workspace for the continuous market-signal loop, channel connectors, Discord escalation gates, anti-gaming scoring rules, and experiment memory. Changes save locally in your browser until we wire the backend daemon.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleCopySpec}
              className="px-3 py-2 text-xs font-semibold bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-zinc-700 flex items-center gap-1.5 cursor-pointer"
            >
              {copiedSpec ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Copied JSON</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy JSON Spec</span>
                </>
              )}
            </button>
            <button
              type="button"
              onClick={handleDownloadSpec}
              className="px-3 py-2 text-xs font-semibold bg-slate-900 dark:bg-white hover:bg-slate-800 dark:hover:bg-slate-200 text-white dark:text-slate-900 flex items-center gap-1.5 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export JSON Spec</span>
            </button>
            <button
              type="button"
              onClick={handleResetDefaults}
              className="px-3 py-2 text-xs font-semibold bg-white dark:bg-zinc-900 hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-600 dark:text-slate-400 border border-slate-300 dark:border-zinc-700 flex items-center gap-1.5 cursor-pointer"
              title="Reset saved blueprint settings to default"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset</span>
            </button>
          </div>
        </div>

        {/* Summary KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 pt-2 border-t border-slate-200 dark:border-zinc-800">
          <div className="p-3 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800">
            <div className="text-[10px] font-mono uppercase tracking-wider text-slate-500">
              Autonomy Mode
            </div>
            <div className="text-sm font-bold text-slate-900 dark:text-slate-100 mt-0.5">
              {selectedModeMeta.label}
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">{selectedModeMeta.risk}</div>
          </div>

          <div className="p-3 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800">
            <div className="text-[10px] font-mono uppercase tracking-wider text-slate-500">
              Weekly Win Target
            </div>
            <div className="text-sm font-bold font-mono text-slate-900 dark:text-slate-100 mt-0.5">
              {config.winCondition.weeklyPointTarget} pts / {config.winCondition.reviewWindowDays}d
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">
              Sleep after {config.winCondition.stopOnZeroProgressCycles} flat cycles
            </div>
          </div>

          <div className="p-3 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800">
            <div className="text-[10px] font-mono uppercase tracking-wider text-slate-500">
              Connectors Mapped
            </div>
            <div className="text-sm font-bold font-mono text-slate-900 dark:text-slate-100 mt-0.5">
              {activeChannelsCount} Enabled / {shadowChannelsCount} Shadow
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">
              {config.channels.length} total channels configured
            </div>
          </div>

          <div className="p-3 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800">
            <div className="text-[10px] font-mono uppercase tracking-wider text-slate-500">
              Hard Caps (Ad / Email)
            </div>
            <div className="text-sm font-bold font-mono text-slate-900 dark:text-slate-100 mt-0.5">
              ${config.guardrails.dailyAdSpendCapUsd}/day &middot; {config.guardrails.maxEmailsPerDay} emails
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">
              Max CPC ceiling: ${config.guardrails.maxCpcCeilingUsd}
            </div>
          </div>
        </div>
      </section>

      {/* Sub-navigation bar */}
      <div className="bg-white dark:bg-zinc-900 border border-slate-300 dark:border-zinc-700 overflow-x-auto">
        <nav className="flex min-w-max">
          {SUB_TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeSubTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveSubTab(tab.id)}
                className={`px-4 py-2.5 text-xs font-semibold border-r border-slate-300 dark:border-zinc-700 last:border-r-0 flex items-center gap-2 transition-colors cursor-pointer whitespace-nowrap ${
                  isActive
                    ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900"
                    : "bg-white dark:bg-zinc-900 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-zinc-800"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* SUB-TAB 1: Architecture & Loop */}
      {activeSubTab === "architecture" && (
        <div className="space-y-5">
          {/* Cognitive Loop */}
          <section className="bg-white dark:bg-zinc-900 border border-slate-300 dark:border-zinc-700 p-5 space-y-4">
            <div className="flex items-center justify-between gap-2">
              <div>
                <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-slate-100">
                  5-Stage Continuous Market Loop
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Low-token event-driven wakeups separated by deep sleep windows when no new signals arrive.
                </p>
              </div>
              <span className="text-[11px] font-mono text-slate-500">
                Active poll: {config.cadence.activePollMinutes}m / Idle sleep: {config.cadence.idleSleepHours}h
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
              {COGNITIVE_LOOP_STAGES.map((stage) => (
                <div
                  key={stage.step}
                  className="p-3.5 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 flex flex-col justify-between gap-3"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="px-1.5 py-0.5 text-[10px] font-mono font-bold bg-slate-900 dark:bg-white text-white dark:text-slate-900">
                        {stage.step}
                      </span>
                      <span className="text-[10px] font-mono text-slate-500 uppercase">
                        {stage.name}
                      </span>
                    </div>
                    <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100">
                      {stage.role}
                    </h3>
                    <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                      {stage.description}
                    </p>
                  </div>
                  <div className="pt-2 border-t border-slate-200 dark:border-zinc-800 space-y-1">
                    <div className="text-[10px] text-slate-500">{stage.cadenceNote}</div>
                    <div className="text-[10px] font-mono font-semibold text-slate-700 dark:text-slate-300">
                      Status: {stage.readiness}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Autonomy Mode + Cadence & Hard Guardrails */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <section className="bg-white dark:bg-zinc-900 border border-slate-300 dark:border-zinc-700 p-5 space-y-3">
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4 text-slate-700 dark:text-slate-300" />
                <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-slate-100">
                  Autonomy Operating Mode
                </h2>
              </div>
              <div className="space-y-2.5">
                {AUTONOMY_MODES.map((mode) => {
                  const isSelected = config.autonomyMode === mode.id;
                  return (
                    <label
                      key={mode.id}
                      className={`block p-3.5 border cursor-pointer transition-colors ${
                        isSelected
                          ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900 border-slate-900 dark:border-white"
                          : "bg-slate-50 dark:bg-zinc-950 text-slate-800 dark:text-slate-200 border-slate-200 dark:border-zinc-800 hover:border-slate-400"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <input
                            type="radio"
                            name="autonomyMode"
                            value={mode.id}
                            checked={isSelected}
                            onChange={() =>
                              setConfig((prev) => ({ ...prev, autonomyMode: mode.id }))
                            }
                            className="accent-rose-600"
                          />
                          <span className="text-xs font-bold">{mode.label}</span>
                        </div>
                        <span
                          className={`text-[10px] font-mono uppercase px-1.5 py-0.5 border ${
                            isSelected
                              ? "border-white/30 dark:border-slate-900/30 text-slate-200 dark:text-slate-700"
                              : "border-slate-300 dark:border-zinc-700 text-slate-500"
                          }`}
                        >
                          {mode.risk}
                        </span>
                      </div>
                      <p
                        className={`text-[11px] mt-1.5 leading-relaxed ${
                          isSelected
                            ? "text-slate-200 dark:text-slate-700"
                            : "text-slate-600 dark:text-slate-400"
                        }`}
                      >
                        {mode.summary}
                      </p>
                    </label>
                  );
                })}
              </div>
            </section>

            <section className="bg-white dark:bg-zinc-900 border border-slate-300 dark:border-zinc-700 p-5 space-y-4">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-slate-700 dark:text-slate-300" />
                <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-slate-100">
                  Sleep Cadence &amp; Hard Safety Caps
                </h2>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <label className="space-y-1">
                  <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 block">
                    Active Poll Interval (min)
                  </span>
                  <input
                    type="number"
                    min={15}
                    max={720}
                    value={config.cadence.activePollMinutes}
                    onChange={(e) =>
                      updateCadence("activePollMinutes", Number(e.target.value) || 60)
                    }
                    className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-zinc-950 border border-slate-300 dark:border-zinc-700 font-mono text-xs"
                  />
                </label>

                <label className="space-y-1">
                  <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 block">
                    Idle Deep Sleep (hours)
                  </span>
                  <input
                    type="number"
                    min={1}
                    max={48}
                    value={config.cadence.idleSleepHours}
                    onChange={(e) =>
                      updateCadence("idleSleepHours", Number(e.target.value) || 6)
                    }
                    className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-zinc-950 border border-slate-300 dark:border-zinc-700 font-mono text-xs"
                  />
                </label>

                <label className="space-y-1">
                  <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 block">
                    Daily Ad Spend Cap (USD)
                  </span>
                  <input
                    type="number"
                    min={5}
                    max={500}
                    value={config.guardrails.dailyAdSpendCapUsd}
                    onChange={(e) =>
                      updateGuardrail("dailyAdSpendCapUsd", Number(e.target.value) || 25)
                    }
                    className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-zinc-950 border border-slate-300 dark:border-zinc-700 font-mono text-xs"
                  />
                </label>

                <label className="space-y-1">
                  <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 block">
                    Max CPC Ceiling (USD)
                  </span>
                  <input
                    type="number"
                    min={1}
                    max={50}
                    value={config.guardrails.maxCpcCeilingUsd}
                    onChange={(e) =>
                      updateGuardrail("maxCpcCeilingUsd", Number(e.target.value) || 10)
                    }
                    className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-zinc-950 border border-slate-300 dark:border-zinc-700 font-mono text-xs"
                  />
                </label>

                <label className="space-y-1">
                  <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 block">
                    Max Cold Emails / Day
                  </span>
                  <input
                    type="number"
                    min={0}
                    max={250}
                    value={config.guardrails.maxEmailsPerDay}
                    onChange={(e) =>
                      updateGuardrail("maxEmailsPerDay", Number(e.target.value) || 100)
                    }
                    className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-zinc-950 border border-slate-300 dark:border-zinc-700 font-mono text-xs"
                  />
                </label>

                <label className="space-y-1">
                  <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 block">
                    Daily Discord Digest (ET)
                  </span>
                  <input
                    type="text"
                    value={config.cadence.dailyDigestTimeET}
                    onChange={(e) => updateCadence("dailyDigestTimeET", e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-zinc-950 border border-slate-300 dark:border-zinc-700 font-mono text-xs"
                  />
                </label>
              </div>

              <div className="pt-2 border-t border-slate-200 dark:border-zinc-800 space-y-2 text-xs">
                <label className="flex items-center justify-between gap-2 cursor-pointer">
                  <span className="text-slate-700 dark:text-slate-300">
                    Require approval before changing Ads spend or bids
                  </span>
                  <input
                    type="checkbox"
                    checked={config.guardrails.requireApprovalForSpendChange}
                    onChange={(e) =>
                      updateGuardrail("requireApprovalForSpendChange", e.target.checked)
                    }
                    className="accent-rose-600 w-4 h-4"
                  />
                </label>
                <label className="flex items-center justify-between gap-2 cursor-pointer">
                  <span className="text-slate-700 dark:text-slate-300">
                    Require approval before public Reddit / social replies
                  </span>
                  <input
                    type="checkbox"
                    checked={config.guardrails.requireApprovalForPublicPost}
                    onChange={(e) =>
                      updateGuardrail("requireApprovalForPublicPost", e.target.checked)
                    }
                    className="accent-rose-600 w-4 h-4"
                  />
                </label>
                <label className="flex items-center justify-between gap-2 cursor-pointer">
                  <span className="text-slate-700 dark:text-slate-300">
                    Require approval before launching new creative / landing experiments
                  </span>
                  <input
                    type="checkbox"
                    checked={config.guardrails.requireApprovalForNewExperiment}
                    onChange={(e) =>
                      updateGuardrail("requireApprovalForNewExperiment", e.target.checked)
                    }
                    className="accent-rose-600 w-4 h-4"
                  />
                </label>
              </div>
            </section>
          </div>
        </div>
      )}

      {/* SUB-TAB 2: Channels & Connectors */}
      {activeSubTab === "channels" && (
        <section className="bg-white dark:bg-zinc-900 border border-slate-300 dark:border-zinc-700 p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-slate-100">
                Channel Connectors &amp; Readiness Gap
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Maps existing VeloTime scripts/APIs to what is still required for scheduled agent autonomy.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {config.channels.map((ch) => (
              <div
                key={ch.id}
                className="p-4 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 space-y-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                      {ch.name}
                    </h3>
                    <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                      {ch.surface}
                    </p>
                  </div>
                  <select
                    value={ch.mode}
                    onChange={(e) => updateChannel(ch.id, { mode: e.target.value })}
                    aria-label={`${ch.name} mode`}
                    className={`px-2 py-1 text-[11px] font-mono font-bold uppercase border cursor-pointer ${
                      CHANNEL_MODE_STYLES[ch.mode] || CHANNEL_MODE_STYLES.disabled
                    }`}
                  >
                    <option value="enabled">Enabled</option>
                    <option value="shadow">Shadow</option>
                    <option value="disabled">Disabled</option>
                  </select>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] pt-2 border-t border-slate-200 dark:border-zinc-800">
                  <div>
                    <div className="font-mono uppercase text-[10px] text-slate-500">
                      Current Infrastructure
                    </div>
                    <div className="font-medium text-slate-800 dark:text-slate-200 mt-0.5">
                      {ch.currentInfra}
                    </div>
                  </div>
                  <div>
                    <div className="font-mono uppercase text-[10px] text-slate-500">
                      Needed for Autonomy
                    </div>
                    <div className="font-medium text-slate-800 dark:text-slate-200 mt-0.5">
                      {ch.missingForAutonomy}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-200 dark:border-zinc-800 text-[11px]">
                  <span className="font-mono text-slate-500">Cadence: {ch.triggerCadence}</span>
                  <label className="flex items-center gap-1.5 cursor-pointer font-medium text-slate-700 dark:text-slate-300">
                    <input
                      type="checkbox"
                      checked={ch.requireApproval}
                      onChange={(e) =>
                        updateChannel(ch.id, { requireApproval: e.target.checked })
                      }
                      className="accent-rose-600 w-3.5 h-3.5"
                    />
                    <span>Require approval</span>
                  </label>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* SUB-TAB 3: Approval Queue & Discord */}
      {activeSubTab === "approvals" && (
        <div className="space-y-5">
          <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-800 p-3.5 flex items-start gap-2.5 text-xs text-amber-900 dark:text-amber-200">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
            <div>
              <strong>Example Schema Preview (Not Connected to a Live Runner):</strong> The cards below preview how the future daemon will package high-leverage decisions for 1-click approval here or in Discord. Clicking Approve/Reject updates local preview state only.
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {SAMPLE_APPROVAL_CARDS.map((card) => {
              const decision = sampleDecisions[card.id];
              return (
                <div
                  key={card.id}
                  className="bg-white dark:bg-zinc-900 border border-slate-300 dark:border-zinc-700 p-4 flex flex-col justify-between gap-4"
                >
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] font-mono font-bold uppercase px-1.5 py-0.5 bg-slate-100 dark:bg-zinc-800 border border-slate-300 dark:border-zinc-700 text-slate-600 dark:text-slate-400">
                        {card.schemaTag}
                      </span>
                      <span className="text-[10px] font-mono text-slate-500">
                        Risk: {card.riskLevel}
                      </span>
                    </div>

                    <div>
                      <div className="text-[11px] font-mono font-semibold text-slate-500">
                        {card.channel}
                      </div>
                      <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 mt-0.5">
                        {card.title}
                      </h3>
                    </div>

                    <div className="space-y-1.5 text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                      <p>
                        <strong className="text-slate-800 dark:text-slate-200">Signal:</strong>{" "}
                        {card.signal}
                      </p>
                      <p>
                        <strong className="text-slate-800 dark:text-slate-200">Reasoning:</strong>{" "}
                        {card.reasoning}
                      </p>
                      <p>
                        <strong className="text-slate-800 dark:text-slate-200">Action:</strong>{" "}
                        {card.proposedAction}
                      </p>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-200 dark:border-zinc-800 space-y-2.5">
                    <div className="flex items-center justify-between text-[11px] font-mono">
                      <span className="text-slate-500">Expected Utility</span>
                      <span className="font-bold text-emerald-700 dark:text-emerald-400">
                        {card.expectedPoints}
                      </span>
                    </div>

                    {decision ? (
                      <div className="flex items-center justify-between px-2.5 py-1.5 bg-slate-100 dark:bg-zinc-800 border border-slate-300 dark:border-zinc-700 text-xs font-mono">
                        <span>Preview state: {decision}</span>
                        <button
                          type="button"
                          onClick={() =>
                            setSampleDecisions((prev) => {
                              const next = { ...prev };
                              delete next[card.id];
                              return next;
                            })
                          }
                          className="underline text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 cursor-pointer"
                        >
                          Clear
                        </button>
                      </div>
                    ) : (
                      <div className="grid grid-cols-3 gap-1.5">
                        <button
                          type="button"
                          onClick={() =>
                            setSampleDecisions((prev) => ({
                              ...prev,
                              [card.id]: "APPROVED",
                            }))
                          }
                          className="px-2 py-1.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-[11px] font-bold flex items-center justify-center gap-1 cursor-pointer hover:opacity-90"
                        >
                          <Check className="w-3 h-3" />
                          <span>Approve</span>
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setSampleDecisions((prev) => ({
                              ...prev,
                              [card.id]: "CLARIFY",
                            }))
                          }
                          className="px-2 py-1.5 bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-zinc-700 text-[11px] font-semibold flex items-center justify-center gap-1 cursor-pointer"
                        >
                          <HelpCircle className="w-3 h-3" />
                          <span>Ask Q</span>
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setSampleDecisions((prev) => ({
                              ...prev,
                              [card.id]: "REJECTED",
                            }))
                          }
                          className="px-2 py-1.5 bg-white dark:bg-zinc-900 text-rose-600 dark:text-rose-400 border border-slate-300 dark:border-zinc-700 text-[11px] font-semibold flex items-center justify-center gap-1 cursor-pointer"
                        >
                          <X className="w-3 h-3" />
                          <span>Reject</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Discord Escalation Routing Table */}
          <section className="bg-white dark:bg-zinc-900 border border-slate-300 dark:border-zinc-700 p-5 space-y-3">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-slate-100">
              Discord Escalation Routing Matrix
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Decide when the agent pings you immediately in Discord vs. batching updates into your daily {config.cadence.dailyDigestTimeET} ET digest.
            </p>
            <div className="divide-y divide-slate-200 dark:divide-zinc-800 border border-slate-200 dark:border-zinc-800">
              {config.discordEscalationRules.map((rule) => (
                <div
                  key={rule.id}
                  className="p-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 bg-slate-50 dark:bg-zinc-950"
                >
                  <span className="text-xs font-medium text-slate-800 dark:text-slate-200">
                    {rule.trigger}
                  </span>
                  <select
                    value={rule.route}
                    onChange={(e) => updateEscalationRoute(rule.id, e.target.value)}
                    aria-label={rule.trigger}
                    className="px-2.5 py-1 text-xs font-mono bg-white dark:bg-zinc-900 border border-slate-300 dark:border-zinc-700 cursor-pointer"
                  >
                    <option value="immediate_ping">Immediate Discord Ping</option>
                    <option value="daily_digest">Batch in Daily Digest</option>
                    <option value="log_only">Log Only (Silent)</option>
                  </select>
                </div>
              ))}
            </div>
          </section>
        </div>
      )}

      {/* SUB-TAB 4: Scoring & Win Condition */}
      {activeSubTab === "scoring" && (
        <div className="space-y-5">
          <section className="bg-white dark:bg-zinc-900 border border-slate-300 dark:border-zinc-700 p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-slate-100">
                  Defined Win Condition &amp; Stop Rule
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Multi-hour autonomous loops require hard point targets plus anti-gaming constraints so the agent never optimizes vanity clicks.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <label className="p-3 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 space-y-1">
                <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 block">
                  Weekly Point Target
                </span>
                <input
                  type="number"
                  min={20}
                  max={5000}
                  value={config.winCondition.weeklyPointTarget}
                  onChange={(e) =>
                    updateWinCondition("weeklyPointTarget", Number(e.target.value) || 250)
                  }
                  className="w-full px-2.5 py-1.5 bg-white dark:bg-zinc-900 border border-slate-300 dark:border-zinc-700 font-mono text-sm font-bold"
                />
              </label>

              <label className="p-3 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 space-y-1">
                <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 block">
                  Attribution Review Window (Days)
                </span>
                <input
                  type="number"
                  min={1}
                  max={30}
                  value={config.winCondition.reviewWindowDays}
                  onChange={(e) =>
                    updateWinCondition("reviewWindowDays", Number(e.target.value) || 7)
                  }
                  className="w-full px-2.5 py-1.5 bg-white dark:bg-zinc-900 border border-slate-300 dark:border-zinc-700 font-mono text-sm font-bold"
                />
              </label>

              <label className="p-3 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 space-y-1">
                <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 block">
                  Pause After Zero-Progress Cycles
                </span>
                <input
                  type="number"
                  min={1}
                  max={20}
                  value={config.winCondition.stopOnZeroProgressCycles}
                  onChange={(e) =>
                    updateWinCondition("stopOnZeroProgressCycles", Number(e.target.value) || 3)
                  }
                  className="w-full px-2.5 py-1.5 bg-white dark:bg-zinc-900 border border-slate-300 dark:border-zinc-700 font-mono text-sm font-bold"
                />
              </label>
            </div>
          </section>

          <section className="bg-white dark:bg-zinc-900 border border-slate-300 dark:border-zinc-700 p-5 space-y-3">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-slate-100">
              Points Ledger &amp; Anti-Gaming Constraints
            </h2>
            <div className="overflow-x-auto border border-slate-200 dark:border-zinc-800">
              <table className="w-full text-left text-xs border-collapse min-w-[680px]">
                <thead>
                  <tr className="bg-slate-100 dark:bg-zinc-800 border-b border-slate-200 dark:border-zinc-700 text-[11px] uppercase font-mono text-slate-600 dark:text-slate-300">
                    <th className="p-3">Signal / Outcome</th>
                    <th className="p-3">Category</th>
                    <th className="p-3 w-32">Points Weight</th>
                    <th className="p-3">Anti-Gaming Enforcement</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-zinc-800">
                  {config.scoringRules.map((rule) => (
                    <tr key={rule.id} className="bg-white dark:bg-zinc-900">
                      <td className="p-3 font-semibold text-slate-900 dark:text-slate-100">
                        {rule.label}
                      </td>
                      <td className="p-3 font-mono text-[11px] uppercase text-slate-500">
                        {rule.category}
                      </td>
                      <td className="p-3">
                        <input
                          type="number"
                          value={rule.points}
                          onChange={(e) =>
                            updateScoringRulePoints(rule.id, e.target.value)
                          }
                          aria-label={`${rule.label} points`}
                          className={`w-24 px-2 py-1 border font-mono text-xs font-bold ${
                            rule.points >= 0
                              ? "text-emerald-700 dark:text-emerald-400 border-slate-300 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-950"
                              : "text-rose-600 dark:text-rose-400 border-rose-300 dark:border-rose-800 bg-rose-50/40 dark:bg-rose-950/20"
                          }`}
                        />
                      </td>
                      <td className="p-3 text-slate-600 dark:text-slate-400">
                        {rule.antiGamingRule}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      )}

      {/* SUB-TAB 5: Memory & Experiments */}
      {activeSubTab === "memory" && (
        <div className="space-y-5">
          {/* Interactive Experiment Backlog */}
          <section className="bg-white dark:bg-zinc-900 border border-slate-300 dark:border-zinc-700 p-5 space-y-4">
            <div>
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-slate-100">
                Marketing Concept &amp; Experiment Backlog
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Hypotheses the agent can propose, test, and score against your 7-day attribution window.
              </p>
            </div>

            <form
              onSubmit={handleAddExperiment}
              className="p-4 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 grid grid-cols-1 md:grid-cols-12 gap-3"
            >
              <input
                type="text"
                placeholder="Experiment / concept title..."
                value={newExpTitle}
                onChange={(e) => setNewExpTitle(e.target.value)}
                className="md:col-span-4 px-2.5 py-1.5 bg-white dark:bg-zinc-900 border border-slate-300 dark:border-zinc-700 text-xs"
              />
              <input
                type="text"
                placeholder="Channel (e.g., Google Ads + /compare)"
                value={newExpChannel}
                onChange={(e) => setNewExpChannel(e.target.value)}
                className="md:col-span-3 px-2.5 py-1.5 bg-white dark:bg-zinc-900 border border-slate-300 dark:border-zinc-700 text-xs"
              />
              <input
                type="text"
                placeholder="Success metric..."
                value={newExpMetric}
                onChange={(e) => setNewExpMetric(e.target.value)}
                className="md:col-span-3 px-2.5 py-1.5 bg-white dark:bg-zinc-900 border border-slate-300 dark:border-zinc-700 text-xs"
              />
              <input
                type="number"
                placeholder="Pts"
                value={newExpPoints}
                onChange={(e) => setNewExpPoints(e.target.value)}
                className="md:col-span-2 px-2.5 py-1.5 bg-white dark:bg-zinc-900 border border-slate-300 dark:border-zinc-700 font-mono text-xs"
              />
              <input
                type="text"
                placeholder="Hypothesis (signal -> action -> expected outcome)..."
                value={newExpHypothesis}
                onChange={(e) => setNewExpHypothesis(e.target.value)}
                className="md:col-span-10 px-2.5 py-1.5 bg-white dark:bg-zinc-900 border border-slate-300 dark:border-zinc-700 text-xs"
              />
              <button
                type="submit"
                className="md:col-span-2 px-3 py-1.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer hover:opacity-90"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Idea</span>
              </button>
            </form>

            <div className="space-y-2.5">
              {config.experiments.map((exp) => (
                <div
                  key={exp.id}
                  className="p-4 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 flex flex-col lg:flex-row lg:items-center justify-between gap-3"
                >
                  <div className="space-y-1 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                        {exp.title}
                      </span>
                      <span className="px-1.5 py-0.5 text-[10px] font-mono bg-white dark:bg-zinc-900 border border-slate-300 dark:border-zinc-700 text-slate-600 dark:text-slate-400">
                        {exp.channel}
                      </span>
                      <span className="text-[11px] font-mono font-bold text-emerald-700 dark:text-emerald-400">
                        +{exp.expectedPoints} pts est.
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                      {exp.hypothesis}
                    </p>
                    <div className="text-[11px] font-mono text-slate-500">
                      Success Metric: {exp.successMetric}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <select
                      value={exp.status}
                      onChange={(e) => updateExperimentStatus(exp.id, e.target.value)}
                      aria-label={`${exp.title} status`}
                      className="px-2.5 py-1 text-xs font-mono uppercase bg-white dark:bg-zinc-900 border border-slate-300 dark:border-zinc-700 cursor-pointer"
                    >
                      {EXPERIMENT_STATUS_OPTIONS.map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => deleteExperiment(exp.id)}
                      className="p-1.5 text-slate-500 hover:text-rose-600 border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 cursor-pointer"
                      title="Remove experiment"
                      aria-label={`Remove ${exp.title}`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Locked Brand Guardrails + Seeded Market Memory */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <section className="bg-white dark:bg-zinc-900 border border-slate-300 dark:border-zinc-700 p-5 space-y-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-slate-800 dark:text-slate-200" />
                <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-slate-100">
                  Locked Brand &amp; Ethics Constraints
                </h2>
              </div>
              <div className="space-y-2.5">
                {config.brandGuardrails.map((rule) => (
                  <div
                    key={rule.id}
                    className="p-3 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 space-y-1"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                        {rule.title}
                      </span>
                      <span className="inline-flex items-center gap-1 text-[10px] font-mono uppercase text-slate-500">
                        <Lock className="w-3 h-3" />
                        <span>Locked</span>
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                      {rule.detail}
                    </p>
                  </div>
                ))}
              </div>
            </section>

            <section className="bg-white dark:bg-zinc-900 border border-slate-300 dark:border-zinc-700 p-5 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-slate-100">
                  Market Signals Memory Log
                </h2>
                <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 bg-slate-100 dark:bg-zinc-800 border border-slate-300 dark:border-zinc-700 text-slate-600 dark:text-slate-400">
                  Seeded Baseline
                </span>
              </div>
              <div className="space-y-2.5">
                {config.baselineSignals.map((sig) => (
                  <div
                    key={sig.id}
                    className="p-3 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 space-y-1"
                  >
                    <div className="flex items-center justify-between gap-2 text-[10px] font-mono text-slate-500">
                      <span>{sig.source}</span>
                      <span>
                        {sig.date} &middot; {sig.tag}
                      </span>
                    </div>
                    <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed flex items-start gap-1.5">
                      <ArrowRight className="w-3.5 h-3.5 shrink-0 mt-0.5 text-slate-400" />
                      <span>{sig.summary}</span>
                    </p>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </div>
      )}
    </div>
  );
}
