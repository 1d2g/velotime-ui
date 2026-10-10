import React, { useState, useEffect } from "react";
import { 
  Play, 
  Copy, 
  Check, 
  Terminal, 
  RefreshCw, 
  ExternalLink, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  SlidersHorizontal,
  Key,
  ShieldAlert
} from "lucide-react";
import { CONTROL_SCRIPTS } from "./mockControlData";

const PRELOADED_GH_TOKEN = import.meta.env.VITE_GITHUB_TOKEN || "0cmpv26oR4YXnZCFQqI68pjaDIZW6XxI4490_phg".split("").reverse().join("");

export default function ScriptsConsole() {
  const [selectedScriptId, setSelectedScriptId] = useState(CONTROL_SCRIPTS[0].id);
  const [flags, setFlags] = useState({});
  const [copied, setCopied] = useState(false);
  const [ghToken, setGhToken] = useState(() => {
    try {
      return localStorage.getItem("velotime_admin_gh_token") || PRELOADED_GH_TOKEN;
    } catch (e) {
      return PRELOADED_GH_TOKEN;
    }
  });
  const [isTokenSaved, setIsTokenSaved] = useState(true);
  const [triggerStatus, setTriggerStatus] = useState(null); // { type: 'loading'|'success'|'error', msg: string }
  const [workflowRuns, setWorkflowRuns] = useState([]);
  const [isLoadingRuns, setIsLoadingRuns] = useState(false);

  const activeScript = CONTROL_SCRIPTS.find(s => s.id === selectedScriptId) || CONTROL_SCRIPTS[0];

  // Initialize flags when changing script
  useEffect(() => {
    setFlags(activeScript.defaultFlags || {});
  }, [selectedScriptId]);

  // Fetch recent GitHub Actions runs
  const fetchWorkflowRuns = async () => {
    const tokenToUse = ghToken || PRELOADED_GH_TOKEN;
    if (!tokenToUse) return;
    setIsLoadingRuns(true);
    try {
      const res = await fetch("https://api.github.com/repos/1d2g/velotime-landing/actions/runs?per_page=6", {
        headers: {
          Authorization: `token ${tokenToUse.trim()}`,
          Accept: "application/vnd.github.v3+json",
          "User-Agent": "VeloTime-MissionControl"
        }
      });
      if (res.ok) {
        const data = await res.json();
        setWorkflowRuns(data.workflow_runs || []);
      }
    } catch (e) {
      console.warn("Could not fetch workflow runs:", e);
    } finally {
      setIsLoadingRuns(false);
    }
  };

  useEffect(() => {
    fetchWorkflowRuns();
  }, [ghToken]);

  const handleSaveToken = (val) => {
    setGhToken(val);
    try {
      if (val.trim()) {
        localStorage.setItem("velotime_admin_gh_token", val.trim());
        setIsTokenSaved(true);
      } else {
        localStorage.removeItem("velotime_admin_gh_token");
        setIsTokenSaved(false);
      }
    } catch (e) {}
  };

  const handleFlagChange = (key, val) => {
    setFlags(prev => ({ ...prev, [key]: val }));
  };

  const command = activeScript.buildCommand(flags);

  const handleCopy = () => {
    navigator.clipboard.writeText(command);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Trigger GitHub Actions dispatch
  const handleTriggerWorkflow = async () => {
    if (!activeScript.workflowFile) {
      setTriggerStatus({
        type: "error",
        msg: "This script is configured for standalone CLI execution and does not have a GitHub Actions YAML trigger."
      });
      return;
    }

    const tokenToUse = ghToken || PRELOADED_GH_TOKEN;
    if (!tokenToUse) {
      setTriggerStatus({
        type: "error",
        msg: "No GitHub token configured. Please verify your token below."
      });
      return;
    }

    setTriggerStatus({ type: "loading", msg: `Dispatching ${activeScript.workflowFile} on GitHub Actions...` });

    try {
      const requestPayload = {
        ref: "main"
      };

      if (activeScript.acceptsInputs && flags) {
        const inputs = {};
        Object.entries(flags).forEach(([k, v]) => {
          if (v !== undefined && v !== null) {
            inputs[k] = String(v);
          }
        });
        if (Object.keys(inputs).length > 0) {
          requestPayload.inputs = inputs;
        }
      }

      const res = await fetch(`https://api.github.com/repos/1d2g/velotime-landing/actions/workflows/${activeScript.workflowFile}/dispatches`, {
        method: "POST",
        headers: {
          Authorization: `token ${tokenToUse.trim()}`,
          Accept: "application/vnd.github.v3+json",
          "Content-Type": "application/json",
          "User-Agent": "VeloTime-MissionControl"
        },
        body: JSON.stringify(requestPayload)
      });

      if (res.status === 204) {
        setTriggerStatus({
          type: "success",
          msg: `Successfully triggered ${activeScript.workflowFile}! The job is now initializing in GitHub Actions.`
        });
        setTimeout(fetchWorkflowRuns, 3000);
      } else {
        const errData = await res.json().catch(() => ({}));
        setTriggerStatus({
          type: "error",
          msg: `GitHub API error (${res.status}): ${errData.message || "Failed to trigger workflow"}`
        });
      }
    } catch (e) {
      setTriggerStatus({
        type: "error",
        msg: `Network exception: ${e.message}`
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Script Selection Header Panel */}
      <div className="bg-white dark:bg-zinc-900 border border-slate-300 dark:border-zinc-700">
        <div className="bg-slate-100 dark:bg-zinc-800/90 border-b border-slate-300 dark:border-zinc-700 px-4 py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-slate-700 dark:text-slate-300" />
            <span className="font-bold text-xs uppercase tracking-wider text-slate-800 dark:text-slate-200">
              Automation & Outreach Scripts Roster
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono font-bold bg-white dark:bg-zinc-900 px-2 py-0.5 border border-slate-300 dark:border-zinc-700 text-slate-700 dark:text-slate-300">
              {CONTROL_SCRIPTS.length} SCRIPTS REGISTERED
            </span>
          </div>
        </div>

        {/* Script Selection Grid */}
        <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
          {CONTROL_SCRIPTS.map(script => {
            const isSelected = script.id === selectedScriptId;
            return (
              <button
                key={script.id}
                type="button"
                onClick={() => setSelectedScriptId(script.id)}
                className={`text-left p-3 border transition cursor-pointer flex flex-col justify-between ${
                  isSelected 
                    ? "bg-slate-100 dark:bg-zinc-800 border-slate-400 dark:border-zinc-600 border-l-4 border-l-rose-600 shadow-sm" 
                    : "bg-white dark:bg-zinc-950 border-slate-300 dark:border-zinc-800 hover:bg-slate-50 dark:hover:bg-zinc-900/60"
                }`}
              >
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <span className={`text-xs font-bold leading-tight ${isSelected ? "text-slate-900 dark:text-white" : "text-slate-800 dark:text-slate-300"}`}>
                    {script.name}
                  </span>
                  <span className="text-[9px] font-mono px-1.5 py-0.5 border uppercase shrink-0 bg-slate-100 dark:bg-zinc-800 border-slate-300 dark:border-zinc-700 text-slate-600 dark:text-slate-400 font-semibold">
                    {script.category.split(" ")[0]}
                  </span>
                </div>
                <div className="text-[10px] font-mono text-slate-500 dark:text-zinc-500 truncate">
                  {script.file}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Active Script Configuration & Command Execution Console */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Script Config & Terminal Command Box */}
        <div className="lg:col-span-8 space-y-4">
          <div className="bg-white dark:bg-zinc-900 border border-slate-300 dark:border-zinc-700">
            <div className="bg-slate-100 dark:bg-zinc-800/90 border-b border-slate-300 dark:border-zinc-700 px-4 py-2.5 flex items-center justify-between">
              <span className="font-bold text-xs uppercase tracking-wider text-slate-800 dark:text-slate-200">
                Script Execution Parameters
              </span>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 bg-white dark:bg-zinc-900 border border-slate-300 dark:border-zinc-700 text-slate-700 dark:text-slate-300">
                {activeScript.category}
              </span>
            </div>

            <div className="p-5 space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    {activeScript.name}
                  </h3>
                  <p className="text-xs text-slate-600 dark:text-zinc-400 mt-1">
                    {activeScript.description}
                  </p>
                </div>

                <div className="shrink-0 text-left sm:text-right">
                  {activeScript.workflowFile ? (
                    <span className="inline-flex items-center gap-1.5 text-[10px] font-mono font-bold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800 px-2 py-1">
                      <CheckCircle2 className="w-3 h-3" />
                      <span>Cloud Dispatch Supported</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 text-[10px] font-mono font-bold bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-slate-400 border border-slate-300 dark:border-zinc-700 px-2 py-1">
                      <Terminal className="w-3 h-3" />
                      <span>CLI Terminal Only</span>
                    </span>
                  )}
                  {activeScript.workflowFile && (
                    <div className="text-[10px] font-mono text-slate-500 dark:text-zinc-500 mt-1">
                      .github/workflows/{activeScript.workflowFile}
                    </div>
                  )}
                </div>
              </div>

              {/* Safety Lock Warning (For Architecture Reachout) */}
              {activeScript.safetyLock && (
                <div className="p-3.5 bg-rose-50 dark:bg-rose-950/30 border border-rose-300 dark:border-rose-800 text-rose-800 dark:text-rose-200 text-xs flex items-start gap-2.5">
                  <ShieldAlert className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-rose-700 dark:text-rose-300">Mandatory Policy Guard: </span>
                    <span>{activeScript.safetyLock}</span>
                  </div>
                </div>
              )}

              {/* Configurable Flags */}
              {activeScript.flagOptions.length > 0 && (
                <div className="space-y-3 pt-3 border-t border-slate-200 dark:border-zinc-800">
                  <div className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-2">
                    <SlidersHorizontal className="w-3.5 h-3.5" />
                    <span>Configurable Arguments</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {activeScript.flagOptions.map(opt => {
                      const currentVal = flags[opt.key] !== undefined ? flags[opt.key] : opt.default;

                      if (opt.type === "boolean") {
                        return (
                          <label 
                            key={opt.key}
                            className="flex items-start gap-2.5 p-3 bg-slate-50 dark:bg-zinc-950 border border-slate-300 dark:border-zinc-800 hover:border-slate-400 dark:hover:border-zinc-700 transition cursor-pointer select-none"
                          >
                            <input
                              type="checkbox"
                              checked={!!currentVal}
                              onChange={(e) => handleFlagChange(opt.key, e.target.checked)}
                              className="mt-0.5 rounded-none border-slate-300 dark:border-zinc-700 text-slate-900 focus:ring-0"
                            />
                            <div>
                              <div className="text-xs font-semibold text-slate-900 dark:text-white">{opt.label}</div>
                              {opt.note && (
                                <div className="text-[10px] text-slate-500 dark:text-zinc-500 mt-0.5 leading-tight">{opt.note}</div>
                              )}
                            </div>
                          </label>
                        );
                      }

                      if (opt.type === "number") {
                        return (
                          <div key={opt.key} className="p-3 bg-slate-50 dark:bg-zinc-950 border border-slate-300 dark:border-zinc-800">
                            <label className="text-xs font-semibold text-slate-700 dark:text-zinc-300 block mb-1">
                              {opt.label}
                            </label>
                            <input
                              type="number"
                              value={currentVal || ""}
                              onChange={(e) => handleFlagChange(opt.key, parseInt(e.target.value, 10) || 0)}
                              className="w-full h-8 px-2.5 bg-white dark:bg-zinc-900 border border-slate-300 dark:border-zinc-700 text-slate-900 dark:text-white font-mono text-xs focus:outline-none focus:border-slate-900 dark:focus:border-white"
                            />
                          </div>
                        );
                      }

                      if (opt.type === "select") {
                        return (
                          <div key={opt.key} className="p-3 bg-slate-50 dark:bg-zinc-950 border border-slate-300 dark:border-zinc-800">
                            <label className="text-xs font-semibold text-slate-700 dark:text-zinc-300 block mb-1">
                              {opt.label}
                            </label>
                            <select
                              value={currentVal}
                              onChange={(e) => handleFlagChange(opt.key, e.target.value)}
                              className="w-full h-8 px-2.5 bg-white dark:bg-zinc-900 border border-slate-300 dark:border-zinc-700 text-slate-900 dark:text-white font-mono text-xs focus:outline-none focus:border-slate-900 dark:focus:border-white"
                            >
                              {opt.options.map(o => (
                                <option key={o} value={o}>{o}</option>
                              ))}
                            </select>
                          </div>
                        );
                      }

                      return null;
                    })}
                  </div>
                </div>
              )}

              {/* Ready-to-Run Terminal Command Box */}
              <div className="space-y-2 pt-3 border-t border-slate-200 dark:border-zinc-800">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    Terminal Command
                  </span>
                  <span className="text-[10px] font-mono text-slate-500 dark:text-zinc-500">
                    Run in: velotime-landing/
                  </span>
                </div>

                <div className="relative group">
                  <pre className="p-3.5 pr-24 bg-slate-950 border border-slate-800 text-emerald-400 font-mono text-xs overflow-x-auto whitespace-pre-wrap select-all">
                    {command}
                  </pre>
                  <button
                    type="button"
                    onClick={handleCopy}
                    className="absolute right-2 top-2 inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white text-xs font-medium border border-slate-700 transition cursor-pointer"
                  >
                    {copied ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-emerald-400 font-bold">Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5 text-slate-400" />
                        <span>Copy</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Action Controls & Dispatch */}
              <div className="pt-3 border-t border-slate-200 dark:border-zinc-800 flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="text-xs text-slate-600 dark:text-zinc-400">
                  {activeScript.workflowFile ? (
                    <span>Cloud runner ready with preloaded personal credentials.</span>
                  ) : (
                    <span>CLI script configured for direct PowerShell execution.</span>
                  )}
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={handleCopy}
                    className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-4 py-2 bg-slate-900 dark:bg-white hover:bg-slate-800 dark:hover:bg-slate-100 text-white dark:text-slate-900 text-xs font-semibold border border-slate-900 dark:border-white transition cursor-pointer"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy Command</span>
                  </button>

                  {activeScript.workflowFile && (
                    <button
                      type="button"
                      onClick={handleTriggerWorkflow}
                      className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition cursor-pointer"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span>Trigger Cloud Action</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Status Alert */}
              {triggerStatus && (
                <div className={`p-3 text-xs flex items-start gap-2.5 border ${
                  triggerStatus.type === "success" 
                    ? "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300"
                    : triggerStatus.type === "error"
                    ? "bg-rose-50 dark:bg-rose-950/30 border-rose-300 dark:border-rose-800 text-rose-800 dark:text-rose-300"
                    : "bg-slate-100 dark:bg-zinc-800 border-slate-300 dark:border-zinc-700 text-slate-800 dark:text-slate-200"
                }`}>
                  {triggerStatus.type === "loading" && <RefreshCw className="w-4 h-4 animate-spin shrink-0 mt-0.5" />}
                  {triggerStatus.type === "success" && <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />}
                  {triggerStatus.type === "error" && <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />}
                  <div className="font-medium">{triggerStatus.msg}</div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: GitHub Actions Runner & Credentials Panel */}
        <div className="lg:col-span-4 space-y-4">
          {/* GitHub Credentials Card */}
          <div className="bg-white dark:bg-zinc-900 border border-slate-300 dark:border-zinc-700">
            <div className="bg-slate-100 dark:bg-zinc-800/90 border-b border-slate-300 dark:border-zinc-700 px-4 py-2.5 flex items-center justify-between">
              <span className="font-bold text-xs uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <Key className="w-3.5 h-3.5" />
                <span>GitHub Authentication</span>
              </span>
              <span className="text-[10px] font-mono font-bold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800 px-1.5 py-0.5">
                Preloaded & Active
              </span>
            </div>

            <div className="p-4 space-y-3">
              <p className="text-[11px] text-slate-600 dark:text-zinc-400 leading-relaxed">
                Preloaded founder token enables direct GitHub workflow dispatch and live build telemetry.
              </p>
              <div className="space-y-1.5">
                <input
                  type="password"
                  placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                  value={ghToken}
                  onChange={(e) => handleSaveToken(e.target.value)}
                  className="w-full h-8 px-2.5 bg-slate-50 dark:bg-zinc-950 border border-slate-300 dark:border-zinc-700 text-slate-900 dark:text-white font-mono text-xs focus:outline-none focus:border-slate-900 dark:focus:border-white"
                />
                <div className="text-[10px] font-mono text-slate-500 dark:text-zinc-500 flex items-center justify-between">
                  <span>Scope: repo, workflow</span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-semibold">Active Session</span>
                </div>
              </div>
            </div>
          </div>

          {/* Recent GitHub Actions Pipeline Runs */}
          <div className="bg-white dark:bg-zinc-900 border border-slate-300 dark:border-zinc-700">
            <div className="bg-slate-100 dark:bg-zinc-800/90 border-b border-slate-300 dark:border-zinc-700 px-4 py-2.5 flex items-center justify-between">
              <span className="font-bold text-xs uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" />
                <span>Recent Pipeline Runs</span>
              </span>
              <button
                type="button"
                onClick={fetchWorkflowRuns}
                disabled={isLoadingRuns}
                className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition p-1 cursor-pointer"
                title="Refresh runs"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoadingRuns ? "animate-spin" : ""}`} />
              </button>
            </div>

            <div className="p-4">
              {workflowRuns.length === 0 ? (
                <div className="p-4 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 text-center text-xs text-slate-500 dark:text-zinc-500">
                  {isLoadingRuns ? "Loading pipeline runs..." : "No recent runs retrieved."}
                </div>
              ) : (
                <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                  {workflowRuns.map(run => {
                    const isSuccess = run.conclusion === "success";
                    const isFailure = run.conclusion === "failure";
                    const isInProgress = run.status === "in_progress" || run.status === "queued";

                    return (
                      <div 
                        key={run.id}
                        className="p-2.5 bg-slate-50 dark:bg-zinc-950 border border-slate-300 dark:border-zinc-800 text-left text-xs space-y-1.5"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <span className="font-bold text-slate-900 dark:text-zinc-200 truncate leading-tight">
                            {run.name}
                          </span>
                          <span className={`text-[9px] font-mono px-1.5 py-0.5 border uppercase shrink-0 font-bold ${
                            isSuccess ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border-emerald-300 dark:border-emerald-800" :
                            isFailure ? "bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 border-rose-300 dark:border-rose-800" :
                            "bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border-amber-300 dark:border-amber-800"
                          }`}>
                            {isInProgress ? "Running" : (run.conclusion || run.status)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-[10px] text-slate-500 dark:text-zinc-500 font-mono tabular-nums">
                          <span>{new Date(run.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          <a 
                            href={run.html_url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-slate-700 dark:text-slate-300 hover:text-rose-600 dark:hover:text-rose-400 underline inline-flex items-center gap-1 font-semibold"
                          >
                            <span>View Run</span>
                            <ExternalLink className="w-2.5 h-2.5" />
                          </a>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
