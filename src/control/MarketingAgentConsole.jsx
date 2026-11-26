import React, { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "@clerk/clerk-react";
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
  Compass,
  Play,
  Power,
  RefreshCw,
} from "lucide-react";
import {
  MARKETING_AGENT_LS_KEY,
  DEFAULT_AGENT_CONFIG,
  ORG_ROLES,
  AUTONOMY_MODES,
  COGNITIVE_LOOP_STAGES,
  SAMPLE_APPROVAL_CARDS,
  SAMPLE_BET_MEMOS,
  SAMPLE_CAPABILITY_REQUESTS,
} from "./marketingAgentConfig";

const API_BASE =
  import.meta.env.VITE_API_URL || "https://time-production-b6d9.up.railway.app";

const SUB_TABS = [
  { id: "cmo_scout", label: "CMO Scout & Bets", icon: Compass },
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

function ReasoningTraceDetails({
  thoughtSummary,
  searchQueries = [],
  groundingSources = [],
  triageReason,
}) {
  const queries = Array.isArray(searchQueries) ? searchQueries.filter(Boolean) : [];
  const sources = Array.isArray(groundingSources) ? groundingSources.filter((s) => s?.uri) : [];
  if (!thoughtSummary && queries.length === 0 && sources.length === 0 && !triageReason) {
    return null;
  }
  return (
    <details className="mt-2 border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
      <summary className="px-2.5 py-1.5 text-[10px] font-mono uppercase tracking-wider text-slate-600 dark:text-slate-400 cursor-pointer select-none">
        Thought Process &amp; Search Sources
        {sources.length > 0 ? ` (${sources.length} sources)` : ""}
      </summary>
      <div className="px-2.5 pb-2.5 pt-1.5 border-t border-slate-200 dark:border-zinc-800 space-y-2 text-[11px] text-slate-600 dark:text-slate-400">
        {triageReason && (
          <div>
            <span className="font-semibold text-slate-700 dark:text-slate-300">Routing Note:</span>{" "}
            {triageReason}
          </div>
        )}
        {thoughtSummary && (
          <pre className="whitespace-pre-wrap font-sans text-[11px] leading-relaxed max-h-60 overflow-y-auto text-slate-700 dark:text-slate-300">
            {thoughtSummary}
          </pre>
        )}
        {queries.length > 0 && (
          <div className="space-y-0.5">
            <div className="text-[10px] font-mono uppercase text-slate-500">Search Queries</div>
            <ul className="list-disc list-inside font-mono text-[10px] text-slate-600 dark:text-slate-400 space-y-0.5">
              {queries.map((q, idx) => (
                <li key={`${q}-${idx}`}>{q}</li>
              ))}
            </ul>
          </div>
        )}
        {sources.length > 0 && (
          <div className="space-y-0.5">
            <div className="text-[10px] font-mono uppercase text-slate-500">Grounding Sources</div>
            <ul className="list-disc list-inside text-[11px] space-y-0.5">
              {sources.map((src, idx) => (
                <li key={`${src.uri}-${idx}`}>
                  <a
                    href={src.uri}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline hover:text-slate-900 dark:hover:text-slate-200 break-all"
                  >
                    {src.title || src.uri}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </details>
  );
}

const EXPERIMENT_STATUS_OPTIONS = ["proposed", "queued", "testing", "paused"];

function mergeConfig(parsed) {
  const p = parsed && typeof parsed === "object" ? parsed : {};
  return {
    ...DEFAULT_AGENT_CONFIG,
    ...p,
    modelRouting: {
      ...DEFAULT_AGENT_CONFIG.modelRouting,
      ...(p.modelRouting || {}),
    },
    exploreExploitSplit: {
      ...DEFAULT_AGENT_CONFIG.exploreExploitSplit,
      ...(p.exploreExploitSplit || {}),
    },
    cadence: { ...DEFAULT_AGENT_CONFIG.cadence, ...(p.cadence || {}) },
    guardrails: { ...DEFAULT_AGENT_CONFIG.guardrails, ...(p.guardrails || {}) },
    winCondition: { ...DEFAULT_AGENT_CONFIG.winCondition, ...(p.winCondition || {}) },
    scoutMissions: p.scoutMissions || DEFAULT_AGENT_CONFIG.scoutMissions,
    brandGuardrails: DEFAULT_AGENT_CONFIG.brandGuardrails,
  };
}

function loadInitialConfig() {
  try {
    const raw = localStorage.getItem(MARKETING_AGENT_LS_KEY);
    if (!raw) return DEFAULT_AGENT_CONFIG;
    return mergeConfig(JSON.parse(raw));
  } catch (e) {
    return DEFAULT_AGENT_CONFIG;
  }
}

export default function MarketingAgentConsole() {
  const { getToken } = useAuth();

  const [config, setConfig] = useState(loadInitialConfig);
  const [activeSubTab, setActiveSubTab] = useState("cmo_scout");
  const [sampleDecisions, setSampleDecisions] = useState({});
  const [copiedSpec, setCopiedSpec] = useState(false);

  // Live backend state
  const [backendStatus, setBackendStatus] = useState("connecting"); // 'connecting' | 'connected' | 'offline'
  const [killSwitch, setKillSwitch] = useState(false);
  const [capabilities, setCapabilities] = useState(null);
  const [liveApprovals, setLiveApprovals] = useState([]);
  const [liveSignals, setLiveSignals] = useState([]);
  const [liveScoreLedger, setLiveScoreLedger] = useState([]);
  const [liveRuns, setLiveRuns] = useState([]);
  const [weeklyPoints, setWeeklyPoints] = useState(0);
  const [weekKey, setWeekKey] = useState("");
  const [syncNotice, setSyncNotice] = useState("");
  const [isPulsing, setIsPulsing] = useState(false);

  // Experiment form state
  const [newExpTitle, setNewExpTitle] = useState("");
  const [newExpChannel, setNewExpChannel] = useState("Google Ads + Landing");
  const [newExpHypothesis, setNewExpHypothesis] = useState("");
  const [newExpMetric, setNewExpMetric] = useState("");
  const [newExpPoints, setNewExpPoints] = useState(25);

  // Manual Bet Memo form state
  const [betTitle, setBetTitle] = useState("");
  const [betChannel, setBetChannel] = useState("");
  const [betEvidence, setBetEvidence] = useState("");
  const [betIcp, setBetIcp] = useState("");
  const [betMvpTest, setBetMvpTest] = useState("");
  const [betCostUsd, setBetCostUsd] = useState(0);
  const [betPoints, setBetPoints] = useState(50);
  const [betKillCriteria, setBetKillCriteria] = useState("");

  const hasLoadedRemoteRef = useRef(false);
  const saveTimerRef = useRef(null);
  const pulsePollTimerRef = useRef(null);

  useEffect(() => {
    return () => {
      if (pulsePollTimerRef.current) clearInterval(pulsePollTimerRef.current);
    };
  }, []);

  const authFetch = useCallback(
    async (path, options = {}) => {
      const token = await getToken();
      const res = await fetch(`${API_BASE}${path}`, {
        ...options,
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          ...(options.headers || {}),
        },
      });
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(text || `HTTP ${res.status}`);
      }
      return res.json();
    },
    [getToken]
  );

  const applyRemoteState = useCallback((data) => {
    if (!data) return;
    if (data.config) {
      setConfig(mergeConfig(data.config));
    }
    setKillSwitch(Boolean(data.killSwitch));
    setCapabilities(data.capabilities || null);
    setLiveApprovals(Array.isArray(data.approvals) ? data.approvals : []);
    setLiveSignals(Array.isArray(data.signals) ? data.signals : []);
    setLiveScoreLedger(Array.isArray(data.scoreLedger) ? data.scoreLedger : []);
    setLiveRuns(Array.isArray(data.runs) ? data.runs : []);
    setWeeklyPoints(Number(data.weeklyPoints || 0));
    setWeekKey(data.weekKey || "");
  }, []);

  const refreshBackendState = useCallback(async () => {
    try {
      const data = await authFetch("/api/control/marketing-agent/state");
      applyRemoteState(data);
      setBackendStatus("connected");
      hasLoadedRemoteRef.current = true;
    } catch (err) {
      setBackendStatus("offline");
    }
  }, [authFetch, applyRemoteState]);

  useEffect(() => {
    refreshBackendState();
  }, [refreshBackendState]);

  // Persist locally always; debounce remote sync when backend is connected
  useEffect(() => {
    try {
      localStorage.setItem(MARKETING_AGENT_LS_KEY, JSON.stringify(config));
    } catch (e) {}

    if (backendStatus !== "connected" || !hasLoadedRemoteRef.current) return;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(async () => {
      try {
        await authFetch("/api/control/marketing-agent/config", {
          method: "PUT",
          body: JSON.stringify(config),
        });
        setSyncNotice("Saved to PostgreSQL");
        setTimeout(() => setSyncNotice(""), 2000);
      } catch (err) {
        setSyncNotice("Save failed (kept locally)");
      }
    }, 600);

    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [config, backendStatus, authFetch]);

  const handleToggleKillSwitch = async () => {
    const next = !killSwitch;
    setKillSwitch(next);
    if (backendStatus === "connected") {
      try {
        await authFetch("/api/control/marketing-agent/kill-switch", {
          method: "POST",
          body: JSON.stringify({ killSwitch: next }),
        });
        await refreshBackendState();
      } catch (err) {
        setSyncNotice("Failed to toggle remote kill switch");
      }
    }
  };

  const handleRunPulse = async (pulseMode = "full") => {
    if (backendStatus !== "connected" || isPulsing) return;
    if (pulsePollTimerRef.current) {
      clearInterval(pulsePollTimerRef.current);
      pulsePollTimerRef.current = null;
    }
    setIsPulsing(true);
    setSyncNotice(
      pulseMode === "deep_strategy"
        ? "Deep Strategy pulse (Carbon) started in background - polling every 5s..."
        : "Pulse (Hydrogen triage -> Neon CMO) started in background - polling every 5s..."
    );
    try {
      const res = await authFetch("/api/control/marketing-agent/pulse", {
        method: "POST",
        body: JSON.stringify({ mode: pulseMode }),
      });

      if (res.accepted) {
        await refreshBackendState();
        let polls = 0;
        pulsePollTimerRef.current = setInterval(async () => {
          polls += 1;
          try {
            const latest = await authFetch("/api/control/marketing-agent/state");
            applyRemoteState(latest);
            const topRun = Array.isArray(latest.runs) ? latest.runs[0] : null;
            if ((topRun && topRun.status !== "running") || polls >= 36) {
              clearInterval(pulsePollTimerRef.current);
              pulsePollTimerRef.current = null;
              setIsPulsing(false);
              setSyncNotice(topRun?.summary || "Pulse completed");
            }
          } catch {
            if (polls >= 36) {
              clearInterval(pulsePollTimerRef.current);
              pulsePollTimerRef.current = null;
              setIsPulsing(false);
            }
          }
        }, 5000);
        return;
      }

      if (res.state) applyRemoteState(res.state);
      setSyncNotice(res.result?.run?.summary || "Pulse completed");
      setIsPulsing(false);
    } catch (err) {
      setSyncNotice(`Pulse error: ${err.message}`);
      setIsPulsing(false);
    }
  };

  const handleRegisterDiscordCommands = async () => {
    if (backendStatus !== "connected") return;
    try {
      const res = await authFetch("/api/control/marketing-agent/discord/register-commands", {
        method: "POST",
      });
      setSyncNotice(`Registered ${res.count || 5} Discord slash commands (/status, /pause, /resume, /pulse, /strategize).`);
    } catch (err) {
      setSyncNotice(`Discord command registration failed: ${err.message}`);
    }
  };

  const updateModelRouting = (field, value) => {
    setConfig((prev) => ({
      ...prev,
      modelRouting: {
        ...prev.modelRouting,
        [field]: value,
      },
    }));
  };

  const handleDecideLiveApproval = async (id, status) => {
    if (backendStatus !== "connected") return;
    try {
      await authFetch(`/api/control/marketing-agent/approvals/${id}/decide`, {
        method: "POST",
        body: JSON.stringify({ status }),
      });
      await refreshBackendState();
    } catch (err) {
      setSyncNotice(`Decision failed: ${err.message}`);
    }
  };

  const handleCreateBetMemo = async (e) => {
    e.preventDefault();
    if (!betTitle.trim() || !betMvpTest.trim() || !betKillCriteria.trim()) return;
    const payload = {
      marketEvidence: betEvidence.trim() || "Founder-logged market hypothesis",
      targetIcp: betIcp.trim() || "Retainer agencies & consultancies",
      mvpTest: betMvpTest.trim(),
      estimatedCostUsd: Number(betCostUsd) || 0,
      expectedPoints: Number(betPoints) || 50,
      killCriteria: betKillCriteria.trim(),
    };

    if (backendStatus === "connected") {
      try {
        await authFetch("/api/control/marketing-agent/approvals", {
          method: "POST",
          body: JSON.stringify({
            kind: "bet_memo",
            channel: betChannel.trim() || "CMO Exploration",
            title: betTitle.trim(),
            payload,
          }),
        });
        await refreshBackendState();
        setSyncNotice("Bet Memo saved to PostgreSQL");
      } catch (err) {
        setSyncNotice(`Bet Memo error: ${err.message}`);
        return;
      }
    } else {
      setLiveApprovals((prev) => [
        {
          id: `local-bet-${Date.now()}`,
          kind: "bet_memo",
          channel: betChannel.trim() || "CMO Exploration",
          title: betTitle.trim(),
          payload,
          status: "pending",
          created_at: new Date().toISOString(),
        },
        ...prev,
      ]);
    }

    setBetTitle("");
    setBetChannel("");
    setBetEvidence("");
    setBetIcp("");
    setBetMvpTest("");
    setBetCostUsd(0);
    setBetPoints(50);
    setBetKillCriteria("");
  };

  const activeChannelsCount = config.channels.filter((c) => c.mode === "enabled").length;
  const shadowChannelsCount = config.channels.filter((c) => c.mode === "shadow").length;

  const updateExploreSplit = (explorePct) => {
    const clamped = Math.max(0, Math.min(80, Number(explorePct) || 0));
    setConfig((prev) => ({
      ...prev,
      exploreExploitSplit: {
        ...prev.exploreExploitSplit,
        explorePct: clamped,
        exploitPct: 100 - clamped,
      },
    }));
  };

  const updateExploreField = (field, value) => {
    setConfig((prev) => ({
      ...prev,
      exploreExploitSplit: {
        ...prev.exploreExploitSplit,
        [field]: value,
      },
    }));
  };

  const toggleScoutMission = (missionId) => {
    setConfig((prev) => ({
      ...prev,
      scoutMissions: (prev.scoutMissions || []).map((m) =>
        m.id === missionId ? { ...m, enabled: !m.enabled } : m
      ),
    }));
  };

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
        schemaVersion: "2.0.0-head-of-marketing",
        exportedAt: new Date().toISOString(),
        killSwitch,
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
        schemaVersion: "2.0.0-head-of-marketing",
        exportedAt: new Date().toISOString(),
        killSwitch,
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

  const liveBetMemos = liveApprovals.filter((a) => a.kind === "bet_memo");
  const liveCapRequests = liveApprovals.filter((a) => a.kind === "capability_request");
  const liveActionApprovals = liveApprovals.filter(
    (a) => a.kind !== "bet_memo" && a.kind !== "capability_request"
  );

  return (
    <div className="space-y-5">
      {/* Top Status Banner */}
      <section className="bg-white dark:bg-zinc-900 border-2 border-slate-300 dark:border-zinc-700 p-5 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 text-[11px] font-mono font-bold uppercase tracking-wider bg-slate-900 dark:bg-white text-white dark:text-slate-900">
                <Bot className="w-3.5 h-3.5" />
                <span>AGENTIC HEAD OF MARKETING</span>
              </span>
              {backendStatus === "connected" ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 text-[11px] font-mono font-bold uppercase tracking-wider bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  <span>BACKEND API LIVE</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 text-[11px] font-mono font-bold uppercase tracking-wider bg-amber-50 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                  <span>
                    {backendStatus === "connecting"
                      ? "CONNECTING TO BACKEND..."
                      : "LOCAL BLUEPRINT MODE (AWAITING BACKEND DEPLOY)"}
                  </span>
                </span>
              )}
              {killSwitch && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 text-[11px] font-mono font-bold uppercase tracking-wider bg-rose-600 text-white">
                  KILL SWITCH ENGAGED
                </span>
              )}
            </div>

            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 dark:text-slate-100">
              VeloTime Autonomous Growth &amp; Exploration Engine
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 max-w-3xl">
              Balances daily channel optimization ({config.exploreExploitSplit.exploitPct}% Exploit) with active market discovery, new-channel scouting, and falsifiable CMO Bet Memos ({config.exploreExploitSplit.explorePct}% Explore).
            </p>

            {/* Exact live capabilities matrix when connected */}
            {capabilities && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {[
                  { label: "Postgres Store", ok: capabilities.postgres },
                  {
                    label: capabilities.llm
                      ? `LLM Brain (${capabilities.llmProvider})`
                      : "LLM Brain: Missing Key",
                    ok: capabilities.llm,
                  },
                  {
                    label: capabilities.webSearch
                      ? `Web Scout (${capabilities.webSearchProvider})`
                      : "Web Scout: Missing Key",
                    ok: capabilities.webSearch,
                  },
                  {
                    label: capabilities.posthog
                      ? "PostHog Poller: Ready"
                      : "PostHog Poller: Missing Key",
                    ok: capabilities.posthog,
                  },
                  {
                    label: capabilities.discordBot
                      ? "Discord 2-Way Bot: Ready"
                      : capabilities.discordWebhook
                        ? "Discord: 1-Way Webhook Only"
                        : "Discord: Not Configured",
                    ok: capabilities.discordBot,
                  },
                  {
                    label: capabilities.googleAdsApi
                      ? "Google Ads API: Ready"
                      : "Google Ads API: Pending Token",
                    ok: capabilities.googleAdsApi,
                  },
                ].map((cap) => (
                  <span
                    key={cap.label}
                    className={`px-2 py-0.5 text-[10px] font-mono font-semibold border ${
                      cap.ok
                        ? "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800"
                        : "bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-slate-400 border-slate-300 dark:border-zinc-700"
                    }`}
                  >
                    {cap.label}
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleToggleKillSwitch}
              className={`px-3 py-2 text-xs font-bold border flex items-center gap-1.5 cursor-pointer ${
                killSwitch
                  ? "bg-rose-600 text-white border-rose-700 hover:bg-rose-700"
                  : "bg-white dark:bg-zinc-900 text-slate-800 dark:text-slate-200 border-slate-300 dark:border-zinc-700 hover:bg-slate-100 dark:hover:bg-zinc-800"
              }`}
            >
              <Power className="w-3.5 h-3.5" />
              <span>{killSwitch ? "Resume Agent" : "Kill Switch"}</span>
            </button>

            <button
              type="button"
              onClick={() => handleRunPulse("full")}
              disabled={backendStatus !== "connected" || isPulsing}
              className="px-3 py-2 text-xs font-bold bg-slate-900 dark:bg-white text-white dark:text-slate-900 flex items-center gap-1.5 cursor-pointer disabled:opacity-40"
              title="Run deterministic pollers + Hydrogen triage -> Neon CMO check"
            >
              {isPulsing ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Play className="w-3.5 h-3.5" />
              )}
              <span>{isPulsing ? "Pulsing..." : "Run Pulse (Neon)"}</span>
            </button>

            <button
              type="button"
              onClick={() => handleRunPulse("deep_strategy")}
              disabled={backendStatus !== "connected" || isPulsing}
              className="px-3 py-2 text-xs font-bold bg-white dark:bg-zinc-900 text-slate-900 dark:text-slate-100 border border-slate-900 dark:border-slate-300 flex items-center gap-1.5 cursor-pointer disabled:opacity-40"
              title="Invoke frontier Carbon reasoning for deep GTM & new-channel exploration"
            >
              <Compass className="w-3.5 h-3.5" />
              <span>Deep Strategy (Carbon)</span>
            </button>

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
                  <span>Copy JSON</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handleDownloadSpec}
              className="px-3 py-2 text-xs font-semibold bg-white dark:bg-zinc-900 hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-zinc-700 flex items-center gap-1.5 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export</span>
            </button>

            <button
              type="button"
              onClick={handleResetDefaults}
              className="p-2 text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 bg-white dark:bg-zinc-900 border border-slate-300 dark:border-zinc-700 cursor-pointer"
              title="Reset local blueprint settings to default"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {syncNotice && (
          <div className="text-[11px] font-mono px-3 py-1.5 bg-slate-100 dark:bg-zinc-800 border border-slate-300 dark:border-zinc-700 text-slate-700 dark:text-slate-300">
            {syncNotice}
          </div>
        )}

        {/* Summary KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 pt-2 border-t border-slate-200 dark:border-zinc-800">
          <div className="p-3 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800">
            <div className="text-[10px] font-mono uppercase tracking-wider text-slate-500">
              Autonomy &amp; Split
            </div>
            <div className="text-sm font-bold text-slate-900 dark:text-slate-100 mt-0.5">
              {selectedModeMeta.label}
            </div>
            <div className="text-[11px] font-mono text-slate-500 mt-0.5">
              {config.exploreExploitSplit.exploitPct}% Exploit / {config.exploreExploitSplit.explorePct}% Explore
            </div>
          </div>

          <div className="p-3 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800">
            <div className="text-[10px] font-mono uppercase tracking-wider text-slate-500">
              Weekly Score {weekKey ? `(${weekKey})` : ""}
            </div>
            <div className="text-sm font-bold font-mono text-slate-900 dark:text-slate-100 mt-0.5">
              {weeklyPoints} / {config.winCondition.weeklyPointTarget} pts
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">
              Max {config.exploreExploitSplit.maxConcurrentBets} concurrent bets
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
              {liveSignals.length} live signals recorded
            </div>
          </div>

          <div className="p-3 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800">
            <div className="text-[10px] font-mono uppercase tracking-wider text-slate-500">
              Hard Caps (Ad / Explore)
            </div>
            <div className="text-sm font-bold font-mono text-slate-900 dark:text-slate-100 mt-0.5">
              ${config.guardrails.dailyAdSpendCapUsd}/day &middot; ${config.exploreExploitSplit.monthlyExplorationBudgetUsd}/mo test
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">
              Max emails: {config.guardrails.maxEmailsPerDay}/day
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

      {/* SUB-TAB 0: CMO Scout & Bets (Head of Marketing Layer) */}
      {activeSubTab === "cmo_scout" && (
        <div className="space-y-5">
          {/* 3-Role Marketing Org + Explore/Exploit Split */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            <section className="lg:col-span-7 bg-white dark:bg-zinc-900 border border-slate-300 dark:border-zinc-700 p-5 space-y-3">
              <div>
                <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-slate-100">
                  3-Role Cognitive Marketing Org
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Separates divergent channel discovery from ruthless CMO filtering and daily guardrailed ops.
                </p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {ORG_ROLES.map((role) => (
                  <div
                    key={role.id}
                    className="p-3.5 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 flex flex-col justify-between gap-2"
                  >
                    <div>
                      <div className="text-[10px] font-mono uppercase text-slate-500">
                        {role.subtitle}
                      </div>
                      <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 mt-0.5">
                        {role.title}
                      </h3>
                      <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed mt-1.5">
                        {role.focus}
                      </p>
                    </div>
                    <div className="pt-2 border-t border-slate-200 dark:border-zinc-800 text-[10px] font-mono font-semibold text-slate-700 dark:text-slate-300">
                      {role.allocationLabel}
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className="lg:col-span-5 bg-white dark:bg-zinc-900 border border-slate-300 dark:border-zinc-700 p-5 space-y-4">
              <div>
                <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-slate-100">
                  Explore vs. Exploit Allocation
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Reserves dedicated cycles for net-new channels and angles outside existing playbooks.
                </p>
              </div>

              <div className="p-3.5 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 space-y-2">
                <div className="flex items-center justify-between text-xs font-mono font-bold">
                  <span>Exploit: {config.exploreExploitSplit.exploitPct}%</span>
                  <span>Explore: {config.exploreExploitSplit.explorePct}%</span>
                </div>
                <input
                  type="range"
                  min={10}
                  max={60}
                  step={5}
                  value={config.exploreExploitSplit.explorePct}
                  onChange={(e) => updateExploreSplit(e.target.value)}
                  className="w-full accent-slate-900 dark:accent-white cursor-pointer"
                  aria-label="Exploration allocation percentage"
                />
                <div className="flex justify-between text-[10px] font-mono text-slate-500">
                  <span>10% Explore (Conservative)</span>
                  <span>30% Balanced</span>
                  <span>60% Heavy Discovery</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <label className="space-y-1">
                  <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 block">
                    Max Concurrent Bets
                  </span>
                  <input
                    type="number"
                    min={1}
                    max={8}
                    value={config.exploreExploitSplit.maxConcurrentBets}
                    onChange={(e) =>
                      updateExploreField("maxConcurrentBets", Number(e.target.value) || 3)
                    }
                    className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-zinc-950 border border-slate-300 dark:border-zinc-700 font-mono text-xs"
                  />
                </label>

                <label className="space-y-1">
                  <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 block">
                    Monthly Test Budget (USD)
                  </span>
                  <input
                    type="number"
                    min={0}
                    max={2000}
                    value={config.exploreExploitSplit.monthlyExplorationBudgetUsd}
                    onChange={(e) =>
                      updateExploreField(
                        "monthlyExplorationBudgetUsd",
                        Number(e.target.value) || 0
                      )
                    }
                    className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-zinc-950 border border-slate-300 dark:border-zinc-700 font-mono text-xs"
                  />
                </label>
              </div>
            </section>
          </div>

          {/* Scout Research Missions */}
          <section className="bg-white dark:bg-zinc-900 border border-slate-300 dark:border-zinc-700 p-5 space-y-3">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-slate-100">
              Scout Research Missions (Autonomous Market Discovery)
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {(config.scoutMissions || []).map((mission) => (
                <label
                  key={mission.id}
                  className="p-3.5 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 flex items-start justify-between gap-3 cursor-pointer"
                >
                  <div className="space-y-1">
                    <div className="text-xs font-bold text-slate-900 dark:text-slate-100">
                      {mission.name}
                    </div>
                    <div className="text-[11px] text-slate-600 dark:text-slate-400">
                      Surfaces: {mission.targetSurface}
                    </div>
                    <div className="text-[10px] font-mono text-slate-500">
                      Query seed: {mission.queryHint}
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={Boolean(mission.enabled)}
                    onChange={() => toggleScoutMission(mission.id)}
                    className="accent-rose-600 w-4 h-4 mt-0.5 shrink-0"
                  />
                </label>
              ))}
            </div>
          </section>

          {/* CMO Bet Memos (Live DB + Sample Schema + Draft Form) */}
          <section className="bg-white dark:bg-zinc-900 border border-slate-300 dark:border-zinc-700 p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div>
                <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-slate-100">
                  CMO Bet Memos (Mandatory Kill Criteria)
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Every new channel or positioning pitch requires market evidence, a 7-day MVP test, and an explicit kill threshold.
                </p>
              </div>
              <span className="text-[11px] font-mono text-slate-500">
                {liveBetMemos.length} live DB memo(s)
              </span>
            </div>

            <form
              onSubmit={handleCreateBetMemo}
              className="p-4 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 grid grid-cols-1 md:grid-cols-12 gap-2.5"
            >
              <input
                type="text"
                placeholder="Bet title (e.g., CAS Bookkeeper Partner Program)"
                value={betTitle}
                onChange={(e) => setBetTitle(e.target.value)}
                className="md:col-span-4 px-2.5 py-1.5 bg-white dark:bg-zinc-900 border border-slate-300 dark:border-zinc-700 text-xs"
              />
              <input
                type="text"
                placeholder="New channel / surface"
                value={betChannel}
                onChange={(e) => setBetChannel(e.target.value)}
                className="md:col-span-3 px-2.5 py-1.5 bg-white dark:bg-zinc-900 border border-slate-300 dark:border-zinc-700 text-xs"
              />
              <input
                type="text"
                placeholder="Target ICP"
                value={betIcp}
                onChange={(e) => setBetIcp(e.target.value)}
                className="md:col-span-3 px-2.5 py-1.5 bg-white dark:bg-zinc-900 border border-slate-300 dark:border-zinc-700 text-xs"
              />
              <input
                type="number"
                placeholder="Cost $"
                value={betCostUsd}
                onChange={(e) => setBetCostUsd(e.target.value)}
                className="md:col-span-1 px-2 py-1.5 bg-white dark:bg-zinc-900 border border-slate-300 dark:border-zinc-700 font-mono text-xs"
              />
              <input
                type="number"
                placeholder="Pts"
                value={betPoints}
                onChange={(e) => setBetPoints(e.target.value)}
                className="md:col-span-1 px-2 py-1.5 bg-white dark:bg-zinc-900 border border-slate-300 dark:border-zinc-700 font-mono text-xs"
              />
              <input
                type="text"
                placeholder="Market evidence (quotes, pricing shifts, forum signal)..."
                value={betEvidence}
                onChange={(e) => setBetEvidence(e.target.value)}
                className="md:col-span-6 px-2.5 py-1.5 bg-white dark:bg-zinc-900 border border-slate-300 dark:border-zinc-700 text-xs"
              />
              <input
                type="text"
                placeholder="7-day MVP validation test..."
                value={betMvpTest}
                onChange={(e) => setBetMvpTest(e.target.value)}
                className="md:col-span-6 px-2.5 py-1.5 bg-white dark:bg-zinc-900 border border-slate-300 dark:border-zinc-700 text-xs"
              />
              <input
                type="text"
                placeholder="Mandatory Kill Criteria (e.g., Kill if < 2 replies in 7 days)..."
                value={betKillCriteria}
                onChange={(e) => setBetKillCriteria(e.target.value)}
                className="md:col-span-10 px-2.5 py-1.5 bg-white dark:bg-zinc-900 border border-slate-300 dark:border-zinc-700 text-xs"
              />
              <button
                type="submit"
                className="md:col-span-2 px-3 py-1.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Log Bet</span>
              </button>
            </form>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {liveBetMemos.map((memo) => (
                <div
                  key={memo.id}
                  className="p-4 bg-slate-50 dark:bg-zinc-950 border-2 border-slate-900 dark:border-slate-200 flex flex-col justify-between gap-3"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] font-mono font-bold uppercase px-1.5 py-0.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900">
                        LIVE BET MEMO &middot; {memo.status}
                      </span>
                      <span className="text-[10px] font-mono text-slate-500">
                        Cost: ${memo.payload?.estimatedCostUsd || 0} &middot; +{memo.payload?.expectedPoints || 0} pts
                      </span>
                    </div>
                    <div>
                      <div className="text-[11px] font-mono text-slate-500">{memo.channel}</div>
                      <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                        {memo.title}
                      </h3>
                    </div>
                    <div className="space-y-1 text-[11px] text-slate-600 dark:text-slate-400">
                      <p><strong>Evidence:</strong> {memo.payload?.marketEvidence}</p>
                      <p><strong>ICP:</strong> {memo.payload?.targetIcp}</p>
                      <p><strong>7-Day Test:</strong> {memo.payload?.mvpTest}</p>
                      <p><strong>Kill Criteria:</strong> {memo.payload?.killCriteria}</p>
                    </div>
                    <ReasoningTraceDetails
                      thoughtSummary={memo.payload?.thoughtSummary}
                      searchQueries={memo.payload?.searchQueries}
                      groundingSources={memo.payload?.groundingSources}
                      triageReason={memo.payload?.triageReason}
                    />
                  </div>
                  {memo.status === "pending" && backendStatus === "connected" && (
                    <div className="grid grid-cols-3 gap-1.5 pt-2 border-t border-slate-200 dark:border-zinc-800">
                      <button
                        type="button"
                        onClick={() => handleDecideLiveApproval(memo.id, "approved")}
                        className="px-2 py-1.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-[11px] font-bold cursor-pointer"
                      >
                        Approve Bet
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDecideLiveApproval(memo.id, "clarify")}
                        className="px-2 py-1.5 bg-white dark:bg-zinc-900 border border-slate-300 dark:border-zinc-700 text-[11px] font-semibold cursor-pointer"
                      >
                        Ask Q
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDecideLiveApproval(memo.id, "rejected")}
                        className="px-2 py-1.5 bg-white dark:bg-zinc-900 text-rose-600 border border-slate-300 dark:border-zinc-700 text-[11px] font-semibold cursor-pointer"
                      >
                        Kill
                      </button>
                    </div>
                  )}
                </div>
              ))}

              {liveBetMemos.length === 0 &&
                SAMPLE_BET_MEMOS.map((memo) => (
                  <div
                    key={memo.id}
                    className="p-4 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 space-y-2"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] font-mono font-bold uppercase px-1.5 py-0.5 bg-white dark:bg-zinc-900 border border-slate-300 dark:border-zinc-700 text-slate-600 dark:text-slate-400">
                        {memo.schemaTag}
                      </span>
                      <span className="text-[10px] font-mono text-slate-500">
                        Est. Cost: ${memo.estimatedCostUsd} &middot; +{memo.expectedPoints} pts
                      </span>
                    </div>
                    <div>
                      <div className="text-[11px] font-mono text-slate-500">{memo.channel}</div>
                      <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                        {memo.title}
                      </h3>
                    </div>
                    <div className="space-y-1 text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                      <p><strong>Evidence:</strong> {memo.marketEvidence}</p>
                      <p><strong>ICP:</strong> {memo.targetIcp}</p>
                      <p><strong>7-Day Test:</strong> {memo.mvpTest}</p>
                      <p><strong>Kill Criteria:</strong> {memo.killCriteria}</p>
                    </div>
                  </div>
                ))}
            </div>
          </section>

          {/* New Channel / Capability Requests */}
          <section className="bg-white dark:bg-zinc-900 border border-slate-300 dark:border-zinc-700 p-5 space-y-3">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-slate-100">
              New Channel &amp; Capability Requests
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              When the Scout identifies high-upside distribution outside your current stack, it prepares the full unlock bundle here.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {(liveCapRequests.length > 0 ? liveCapRequests : SAMPLE_CAPABILITY_REQUESTS).map(
                (req) => (
                  <div
                    key={req.id}
                    className="p-4 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 space-y-1.5"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] font-mono font-bold uppercase text-slate-500">
                        {req.schemaTag || `LIVE REQUEST (${req.status})`}
                      </span>
                      <span className="text-[10px] font-mono text-slate-500">{req.channel}</span>
                    </div>
                    <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100">
                      {req.title}
                    </h3>
                    <p className="text-[11px] text-slate-600 dark:text-slate-400">
                      {req.rationale || req.payload?.rationale}
                    </p>
                    <p className="text-[11px] font-mono text-slate-500 pt-1">
                      Setup: {req.setupSteps || req.payload?.setupSteps}
                    </p>
                    <ReasoningTraceDetails
                      thoughtSummary={req.payload?.thoughtSummary}
                      searchQueries={req.payload?.searchQueries}
                      groundingSources={req.payload?.groundingSources}
                      triageReason={req.payload?.triageReason}
                    />
                  </div>
                )
              )}
            </div>
          </section>
        </div>
      )}

      {/* SUB-TAB 1: Architecture & Loop */}
      {activeSubTab === "architecture" && (
        <div className="space-y-5">
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

          <section className="bg-white dark:bg-zinc-900 border border-slate-300 dark:border-zinc-700 p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div>
                <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-slate-100">
                  3-Tier Gemini 4 Reasoning Router
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Uses fast Hydrogen for cheap signal triage, escalates to Neon for CMO planning, and invokes Carbon for deep GTM breakthroughs.
                </p>
              </div>
              <span className="text-[11px] font-mono text-slate-500">
                Search Grounding: {config.modelRouting?.enableGoogleSearchGrounding ? "ON" : "OFF"}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
              <div className="p-3.5 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 space-y-2">
                <div className="text-[10px] font-mono uppercase text-slate-500">
                  Tier 1 &middot; Routine Triage
                </div>
                <input
                  type="text"
                  value={config.modelRouting?.fastModel || "gemini-4-hydrogen"}
                  onChange={(e) => updateModelRouting("fastModel", e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-white dark:bg-zinc-900 border border-slate-300 dark:border-zinc-700 font-mono text-xs"
                  aria-label="Fast triage model"
                />
                <select
                  value={config.modelRouting?.fastThinkingLevel || "low"}
                  onChange={(e) => updateModelRouting("fastThinkingLevel", e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-white dark:bg-zinc-900 border border-slate-300 dark:border-zinc-700 font-mono text-xs"
                  aria-label="Fast thinking level"
                >
                  <option value="minimal">Thinking: minimal</option>
                  <option value="low">Thinking: low</option>
                  <option value="medium">Thinking: medium</option>
                </select>
              </div>

              <div className="p-3.5 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 space-y-2">
                <div className="text-[10px] font-mono uppercase text-slate-500">
                  Tier 2 &middot; Deep CMO Strategy
                </div>
                <input
                  type="text"
                  value={config.modelRouting?.deepModel || "gemini-4-neon"}
                  onChange={(e) => updateModelRouting("deepModel", e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-white dark:bg-zinc-900 border border-slate-300 dark:border-zinc-700 font-mono text-xs"
                  aria-label="Deep strategy model"
                />
                <select
                  value={config.modelRouting?.deepThinkingLevel || "high"}
                  onChange={(e) => updateModelRouting("deepThinkingLevel", e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-white dark:bg-zinc-900 border border-slate-300 dark:border-zinc-700 font-mono text-xs"
                  aria-label="Deep thinking level"
                >
                  <option value="medium">Thinking: medium</option>
                  <option value="high">Thinking: high</option>
                  <option value="xhigh">Thinking: xhigh</option>
                </select>
              </div>

              <div className="p-3.5 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 space-y-2">
                <div className="text-[10px] font-mono uppercase text-slate-500">
                  Tier 3 &middot; Frontier GTM Overhaul
                </div>
                <input
                  type="text"
                  value={config.modelRouting?.frontierModel || "gemini-4-carbon"}
                  onChange={(e) => updateModelRouting("frontierModel", e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-white dark:bg-zinc-900 border border-slate-300 dark:border-zinc-700 font-mono text-xs"
                  aria-label="Frontier model"
                />
                <select
                  value={config.modelRouting?.frontierThinkingLevel || "medium"}
                  onChange={(e) => updateModelRouting("frontierThinkingLevel", e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-white dark:bg-zinc-900 border border-slate-300 dark:border-zinc-700 font-mono text-xs"
                  aria-label="Frontier thinking level"
                >
                  <option value="medium">Thinking: medium</option>
                  <option value="high">Thinking: high</option>
                  <option value="xhigh">Thinking: xhigh</option>
                </select>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 text-xs pt-1">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={Boolean(config.modelRouting?.enableGoogleSearchGrounding)}
                  onChange={(e) =>
                    updateModelRouting("enableGoogleSearchGrounding", e.target.checked)
                  }
                  className="accent-rose-600 w-4 h-4"
                />
                <span>Enable native Google Search grounding on Neon/Carbon strategy runs</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={Boolean(config.modelRouting?.autoEscalateToFrontierOnZeroProgress)}
                  onChange={(e) =>
                    updateModelRouting("autoEscalateToFrontierOnZeroProgress", e.target.checked)
                  }
                  className="accent-rose-600 w-4 h-4"
                />
                <span>Auto-escalate to Carbon when weekly progress stays flat</span>
              </label>
            </div>
          </section>

          {liveRuns.length > 0 && (
            <section className="bg-white dark:bg-zinc-900 border border-slate-300 dark:border-zinc-700 p-5 space-y-2.5">
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-slate-100">
                Recent Backend Pulse Runs
              </h2>
              <div className="divide-y divide-slate-200 dark:divide-zinc-800 border border-slate-200 dark:border-zinc-800">
                {liveRuns.slice(0, 8).map((run) => (
                  <div
                    key={run.id}
                    className="p-3 bg-slate-50 dark:bg-zinc-950 flex flex-col gap-1.5 text-xs"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="font-mono text-[10px] uppercase px-1.5 py-0.5 bg-white dark:bg-zinc-900 border border-slate-300 dark:border-zinc-700">
                          {run.status}
                        </span>
                        {run.metrics?.modelUsed && (
                          <span className="font-mono text-[10px] px-1.5 py-0.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900">
                            {run.metrics.modelUsed}
                          </span>
                        )}
                        <span className="text-slate-800 dark:text-slate-200">{run.summary}</span>
                      </div>
                      <span className="text-[10px] font-mono text-slate-500 shrink-0">
                        {run.trigger_type} &middot; {new Date(run.created_at).toLocaleString()}
                      </span>
                    </div>
                    <ReasoningTraceDetails
                      thoughtSummary={run.metrics?.thoughtSummary}
                      searchQueries={run.metrics?.searchQueries}
                      groundingSources={run.metrics?.groundingSources}
                      triageReason={run.metrics?.triageReason}
                    />
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      )}

      {/* SUB-TAB 2: Channels & Connectors */}
      {activeSubTab === "channels" && (
        <section className="bg-white dark:bg-zinc-900 border border-slate-300 dark:border-zinc-700 p-5 space-y-4">
          <div>
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-slate-100">
              Channel Connectors &amp; Readiness Gap
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Maps existing VeloTime scripts/APIs to what is still required for scheduled agent autonomy.
            </p>
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
          {liveActionApprovals.length === 0 && (
            <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-800 p-3.5 flex items-start gap-2.5 text-xs text-amber-900 dark:text-amber-200">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
              <div>
                <strong>No live pending action approvals yet:</strong> Showing example decision card schemas below. Once an LLM key is added to Railway and a pulse runs, real cards populate directly from PostgreSQL and sync with <code className="font-mono">/api/webhooks/discord-interactions</code>.
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {liveActionApprovals.map((card) => (
              <div
                key={card.id}
                className="bg-white dark:bg-zinc-900 border-2 border-slate-900 dark:border-slate-200 p-4 flex flex-col justify-between gap-4"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-mono font-bold uppercase px-1.5 py-0.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900">
                      LIVE APPROVAL &middot; {card.status}
                    </span>
                    <span className="text-[10px] font-mono text-slate-500">{card.channel}</span>
                  </div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                    {card.title}
                  </h3>
                  <pre className="text-[11px] font-mono bg-slate-50 dark:bg-zinc-950 p-2.5 border border-slate-200 dark:border-zinc-800 overflow-x-auto whitespace-pre-wrap text-slate-700 dark:text-slate-300">
                    {JSON.stringify(card.payload, null, 2)}
                  </pre>
                </div>

                {card.status === "pending" && backendStatus === "connected" && (
                  <div className="grid grid-cols-3 gap-1.5 pt-2 border-t border-slate-200 dark:border-zinc-800">
                    <button
                      type="button"
                      onClick={() => handleDecideLiveApproval(card.id, "approved")}
                      className="px-2 py-1.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-[11px] font-bold flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <Check className="w-3 h-3" />
                      <span>Approve</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDecideLiveApproval(card.id, "clarify")}
                      className="px-2 py-1.5 bg-slate-100 dark:bg-zinc-800 border border-slate-300 dark:border-zinc-700 text-[11px] font-semibold flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <HelpCircle className="w-3 h-3" />
                      <span>Ask Q</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDecideLiveApproval(card.id, "rejected")}
                      className="px-2 py-1.5 bg-white dark:bg-zinc-900 text-rose-600 border border-slate-300 dark:border-zinc-700 text-[11px] font-semibold flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <X className="w-3 h-3" />
                      <span>Reject</span>
                    </button>
                  </div>
                )}
              </div>
            ))}

            {liveActionApprovals.length === 0 &&
              SAMPLE_APPROVAL_CARDS.map((card) => {
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

          <section className="bg-white dark:bg-zinc-900 border border-slate-300 dark:border-zinc-700 p-5 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div>
                <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-slate-100">
                  Discord Escalation Routing Matrix
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Interactions endpoint ready at <code className="font-mono">/api/webhooks/discord-interactions</code> (supports <code className="font-mono">/pause</code>, <code className="font-mono">/resume</code>, <code className="font-mono">/status</code>, <code className="font-mono">/pulse</code>, <code className="font-mono">/strategize</code>, and Approve/Reject buttons).
                </p>
              </div>
              <button
                type="button"
                onClick={handleRegisterDiscordCommands}
                disabled={
                  backendStatus !== "connected" ||
                  !capabilities?.discordBot ||
                  !capabilities?.discordApplicationId
                }
                className="px-3 py-1.5 text-xs font-bold bg-slate-900 dark:bg-white text-white dark:text-slate-900 cursor-pointer disabled:opacity-40 shrink-0"
                title="Register global slash commands in Discord once DISCORD_APPLICATION_ID & DISCORD_BOT_TOKEN are set"
              >
                Register Discord Slash Commands
              </button>
            </div>
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
            <div>
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-slate-100">
                Defined Win Condition &amp; Stop Rule
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Zero points for brainstorming. Points accrue only from verified funnel outcomes and cleanly falsified 7-day bets.
              </p>
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

          {liveScoreLedger.length > 0 && (
            <section className="bg-white dark:bg-zinc-900 border border-slate-300 dark:border-zinc-700 p-5 space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-slate-100">
                  Live PostgreSQL Score Ledger
                </h2>
                <span className="text-xs font-mono font-bold text-emerald-700 dark:text-emerald-400">
                  {weekKey}: {weeklyPoints} pts
                </span>
              </div>
              <div className="divide-y divide-slate-200 dark:divide-zinc-800 border border-slate-200 dark:border-zinc-800">
                {liveScoreLedger.slice(0, 12).map((row) => (
                  <div
                    key={row.id}
                    className="p-3 bg-slate-50 dark:bg-zinc-950 flex items-center justify-between text-xs"
                  >
                    <div>
                      <span className="font-semibold text-slate-900 dark:text-slate-100">
                        {row.label}
                      </span>
                      <span className="ml-2 text-[10px] font-mono text-slate-500">
                        ({row.week_key} &middot; {row.rule_id})
                      </span>
                    </div>
                    <span
                      className={`font-mono font-bold ${
                        row.points >= 0
                          ? "text-emerald-700 dark:text-emerald-400"
                          : "text-rose-600 dark:text-rose-400"
                      }`}
                    >
                      {row.points >= 0 ? `+${row.points}` : row.points} pts
                    </span>
                  </div>
                ))}
              </div>
            </section>
          )}

          <section className="bg-white dark:bg-zinc-900 border border-slate-300 dark:border-zinc-700 p-5 space-y-3">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-slate-100">
              Points Weights &amp; Anti-Gaming Constraints
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
                  {liveSignals.length > 0 ? `${liveSignals.length} Live` : "Seeded Baseline"}
                </span>
              </div>
              <div className="space-y-2.5 max-h-96 overflow-y-auto">
                {liveSignals.map((sig) => (
                  <div
                    key={sig.id}
                    className="p-3 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 space-y-1"
                  >
                    <div className="flex items-center justify-between gap-2 text-[10px] font-mono text-slate-500">
                      <span>{sig.source} &middot; {sig.category}</span>
                      <span>{new Date(sig.created_at).toLocaleString()}</span>
                    </div>
                    <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed flex items-start gap-1.5">
                      <ArrowRight className="w-3.5 h-3.5 shrink-0 mt-0.5 text-slate-400" />
                      <span>{sig.summary}</span>
                    </p>
                  </div>
                ))}
                {(config.baselineSignals || []).map((sig) => (
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
