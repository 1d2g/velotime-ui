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

export default function ScriptsConsole() {
  const [selectedScriptId, setSelectedScriptId] = useState(CONTROL_SCRIPTS[0].id);
  const [flags, setFlags] = useState({});
  const [copied, setCopied] = useState(false);
  const [ghToken, setGhToken] = useState(() => {
    return localStorage.getItem("velotime_admin_gh_token") || "";
  });
  const [isTokenSaved, setIsTokenSaved] = useState(() => {
    return !!localStorage.getItem("velotime_admin_gh_token");
  });
  const [triggerStatus, setTriggerStatus] = useState(null); // { type: 'loading'|'success'|'error', msg: string }
  const [workflowRuns, setWorkflowRuns] = useState([]);
  const [isLoadingRuns, setIsLoadingRuns] = useState(false);

  const activeScript = CONTROL_SCRIPTS.find(s => s.id === selectedScriptId) || CONTROL_SCRIPTS[0];

  // Initialize flags when changing script
  useEffect(() => {
    setFlags(activeScript.defaultFlags || {});
  }, [selectedScriptId]);

  // Fetch recent GitHub Actions runs if token is present
  const fetchWorkflowRuns = async () => {
    if (!ghToken) return;
    setIsLoadingRuns(true);
    try {
      const res = await fetch("https://api.github.com/repos/1d2g/velotime-landing/actions/runs?per_page=6", {
        headers: {
          Authorization: `token ${ghToken.trim()}`,
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
    if (ghToken) {
      fetchWorkflowRuns();
    }
  }, [ghToken]);

  const handleSaveToken = (val) => {
    setGhToken(val);
    if (val.trim()) {
      localStorage.setItem("velotime_admin_gh_token", val.trim());
      setIsTokenSaved(true);
    } else {
      localStorage.removeItem("velotime_admin_gh_token");
      setIsTokenSaved(false);
    }
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

    if (!ghToken) {
      setTriggerStatus({
        type: "error",
        msg: "Please provide a GitHub Personal Access Token in the configuration box below to trigger cloud execution."
      });
      return;
    }

    setTriggerStatus({ type: "loading", msg: `Dispatching ${activeScript.workflowFile} on GitHub Actions...` });

    try {
      const res = await fetch(`https://api.github.com/repos/1d2g/velotime-landing/actions/workflows/${activeScript.workflowFile}/dispatches`, {
        method: "POST",
        headers: {
          Authorization: `token ${ghToken.trim()}`,
          Accept: "application/vnd.github.v3+json",
          "Content-Type": "application/json",
          "User-Agent": "VeloTime-MissionControl"
        },
        body: JSON.stringify({
          ref: "main"
        })
      });

      if (res.status === 204) {
        setTriggerStatus({
          type: "success",
          msg: `Successfully triggered ${activeScript.workflowFile}! The job is now initializing in the cloud.`
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
      {/* Script Selector Header */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 shadow-lg">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4 pb-4 border-b border-zinc-800">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Terminal className="w-5 h-5 text-cyan-400" />
              <span>Outreach & Automation Script Console</span>
            </h2>
            <p className="text-xs text-zinc-400 mt-0.5">
              Configure parameters, generate production terminal commands, and trigger cloud workflow dispatches.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono text-zinc-400 bg-zinc-800/80 px-2.5 py-1 rounded border border-zinc-700">
              {CONTROL_SCRIPTS.length} Registered Scripts
            </span>
          </div>
        </div>

        {/* Script Selection Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {CONTROL_SCRIPTS.map(script => {
            const isSelected = script.id === selectedScriptId;
            return (
              <button
                key={script.id}
                type="button"
                onClick={() => setSelectedScriptId(script.id)}
                className={`text-left p-3 rounded-lg border transition cursor-pointer flex flex-col justify-between ${
                  isSelected 
                    ? "bg-zinc-800/90 border-cyan-500/50 text-white shadow-sm" 
                    : "bg-zinc-950/60 border-zinc-800/80 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40"
                }`}
              >
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <span className="text-xs font-semibold leading-tight line-clamp-1">
                    {script.name}
                  </span>
                  <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded border uppercase shrink-0 ${
                    script.category === "Email Outreach" 
                      ? "bg-cyan-500/10 text-cyan-400 border-cyan-500/20" 
                      : script.category === "Lead Generation"
                      ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                      : "bg-zinc-800 text-zinc-300 border-zinc-700"
                  }`}>
                    {script.category.split(" ")[0]}
                  </span>
                </div>
                <div className="text-[10px] font-mono text-zinc-500 truncate">
                  {script.file}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Active Script Configuration & Command Generator */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Script Options & Command Box */}
        <div className="lg:col-span-8 space-y-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 shadow-lg space-y-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 px-2 py-0.5 rounded">
                  {activeScript.category}
                </span>
                <h3 className="text-base font-bold text-white mt-2">
                  {activeScript.name}
                </h3>
                <p className="text-xs text-zinc-400 mt-1">
                  {activeScript.description}
                </p>
              </div>

              {activeScript.workflowFile ? (
                <div className="shrink-0 text-right">
                  <span className="inline-flex items-center gap-1.5 text-[11px] font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-1 rounded">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Cloud Dispatch Ready</span>
                  </span>
                  <div className="text-[10px] font-mono text-zinc-500 mt-1">
                    .github/workflows/{activeScript.workflowFile}
                  </div>
                </div>
              ) : (
                <div className="shrink-0 text-right">
                  <span className="inline-flex items-center gap-1.5 text-[11px] font-mono text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-1 rounded">
                    <Terminal className="w-3.5 h-3.5" />
                    <span>CLI Terminal Only</span>
                  </span>
                </div>
              )}
            </div>

            {/* Safety Lock Warning (For Architecture Reachout) */}
            {activeScript.safetyLock && (
              <div className="p-3.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-200 text-xs flex items-start gap-2.5">
                <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold text-rose-300">Mandatory Safety Guard: </span>
                  <span>{activeScript.safetyLock}</span>
                </div>
              </div>
            )}

            {/* Configurable Flags */}
            {activeScript.flagOptions.length > 0 && (
              <div className="space-y-3 pt-2 border-t border-zinc-800">
                <div className="text-xs font-semibold text-zinc-200 flex items-center gap-2">
                  <SlidersHorizontal className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Execution Parameters & Arguments</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {activeScript.flagOptions.map(opt => {
                    const currentVal = flags[opt.key] !== undefined ? flags[opt.key] : opt.default;

                    if (opt.type === "boolean") {
                      return (
                        <label 
                          key={opt.key}
                          className="flex items-start gap-2.5 p-3 rounded-lg bg-zinc-950/70 border border-zinc-800 hover:border-zinc-700 transition cursor-pointer select-none"
                        >
                          <input
                            type="checkbox"
                            checked={!!currentVal}
                            onChange={(e) => handleFlagChange(opt.key, e.target.checked)}
                            className="mt-0.5 rounded bg-zinc-900 border-zinc-700 text-cyan-500 focus:ring-cyan-500/20"
                          />
                          <div>
                            <div className="text-xs font-medium text-white">{opt.label}</div>
                            {opt.note && (
                              <div className="text-[10px] text-zinc-500 mt-0.5 leading-tight">{opt.note}</div>
                            )}
                          </div>
                        </label>
                      );
                    }

                    if (opt.type === "number") {
                      return (
                        <div key={opt.key} className="p-3 rounded-lg bg-zinc-950/70 border border-zinc-800">
                          <label className="text-xs font-medium text-zinc-300 block mb-1">
                            {opt.label}
                          </label>
                          <input
                            type="number"
                            value={currentVal || ""}
                            onChange={(e) => handleFlagChange(opt.key, parseInt(e.target.value, 10) || 0)}
                            className="w-full h-8 px-2.5 rounded bg-zinc-900 border border-zinc-700 text-white font-mono text-xs focus:outline-none focus:border-cyan-500"
                          />
                        </div>
                      );
                    }

                    if (opt.type === "select") {
                      return (
                        <div key={opt.key} className="p-3 rounded-lg bg-zinc-950/70 border border-zinc-800">
                          <label className="text-xs font-medium text-zinc-300 block mb-1">
                            {opt.label}
                          </label>
                          <select
                            value={currentVal}
                            onChange={(e) => handleFlagChange(opt.key, e.target.value)}
                            className="w-full h-8 px-2.5 rounded bg-zinc-900 border border-zinc-700 text-white font-mono text-xs focus:outline-none focus:border-cyan-500"
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

            {/* Generated Command Box */}
            <div className="space-y-2 pt-2 border-t border-zinc-800">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-zinc-300">
                  Ready-to-Run Terminal Command
                </span>
                <span className="text-[10px] font-mono text-zinc-500">
                  Execute from root: velotime-landing/
                </span>
              </div>

              <div className="relative group">
                <pre className="p-3.5 pr-24 rounded-lg bg-zinc-950 border border-zinc-800 text-cyan-300 font-mono text-xs overflow-x-auto whitespace-pre-wrap select-all">
                  {command}
                </pre>
                <button
                  type="button"
                  onClick={handleCopy}
                  className="absolute right-2 top-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-medium border border-zinc-700 transition cursor-pointer"
                >
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-emerald-400">Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 text-zinc-400" />
                      <span>Copy</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Cloud Trigger Bar */}
            <div className="pt-2 border-t border-zinc-800 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="text-xs text-zinc-400">
                {activeScript.workflowFile ? (
                  <span>Trigger live execution directly in GitHub Actions environment.</span>
                ) : (
                  <span>Copy and execute this script locally via PowerShell or Bash.</span>
                )}
              </div>

              {activeScript.workflowFile && (
                <button
                  type="button"
                  onClick={handleTriggerWorkflow}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold transition shadow-sm cursor-pointer"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Trigger Cloud Run</span>
                </button>
              )}
            </div>

            {/* Status Alert */}
            {triggerStatus && (
              <div className={`p-3 rounded-lg text-xs flex items-start gap-2.5 ${
                triggerStatus.type === "success" 
                  ? "bg-emerald-500/10 border border-emerald-500/30 text-emerald-200"
                  : triggerStatus.type === "error"
                  ? "bg-rose-500/10 border border-rose-500/30 text-rose-200"
                  : "bg-cyan-500/10 border border-cyan-500/30 text-cyan-200"
              }`}>
                {triggerStatus.type === "loading" && <RefreshCw className="w-4 h-4 animate-spin shrink-0 mt-0.5" />}
                {triggerStatus.type === "success" && <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />}
                {triggerStatus.type === "error" && <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />}
                <div>{triggerStatus.msg}</div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: GitHub Actions Runner Feed & Credentials */}
        <div className="lg:col-span-4 space-y-4">
          {/* GitHub Token Config Card */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 shadow-lg space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                <Key className="w-4 h-4 text-cyan-400" />
                <span>GitHub Cloud Dispatch Token</span>
              </h4>
              {isTokenSaved && (
                <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                  Configured
                </span>
              )}
            </div>
            <p className="text-[11px] text-zinc-400 leading-relaxed">
              Enables one-click workflow triggers and live execution tracking via GitHub REST API.
            </p>
            <div className="space-y-2">
              <input
                type="password"
                placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                value={ghToken}
                onChange={(e) => handleSaveToken(e.target.value)}
                className="w-full h-8 px-2.5 rounded bg-zinc-950 border border-zinc-800 text-white font-mono text-xs focus:outline-none focus:border-cyan-500"
              />
              <div className="text-[10px] text-zinc-500">
                Stored strictly in your local browser session storage.
              </div>
            </div>
          </div>

          {/* Recent Cloud Execution Runs */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 shadow-lg space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-zinc-400" />
                <span>Recent GitHub Runs</span>
              </h4>
              <button
                type="button"
                onClick={fetchWorkflowRuns}
                disabled={isLoadingRuns}
                className="text-zinc-400 hover:text-white transition p-1 cursor-pointer"
                title="Refresh runs"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoadingRuns ? "animate-spin" : ""}`} />
              </button>
            </div>

            {workflowRuns.length === 0 ? (
              <div className="p-4 rounded-lg bg-zinc-950/60 border border-zinc-800/80 text-center text-xs text-zinc-500">
                {ghToken ? "No recent workflow runs found." : "Add GitHub token above to view live runs."}
              </div>
            ) : (
              <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                {workflowRuns.map(run => {
                  const isSuccess = run.conclusion === "success";
                  const isFailure = run.conclusion === "failure";
                  const isInProgress = run.status === "in_progress" || run.status === "queued";

                  return (
                    <div 
                      key={run.id}
                      className="p-2.5 rounded-lg bg-zinc-950/80 border border-zinc-800 text-left text-xs space-y-1"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="font-semibold text-zinc-200 truncate leading-tight">
                          {run.name}
                        </span>
                        <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded border uppercase shrink-0 ${
                          isSuccess ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" :
                          isFailure ? "bg-rose-500/10 text-rose-400 border-rose-500/20" :
                          "bg-cyan-500/10 text-cyan-400 border-cyan-500/20"
                        }`}>
                          {isInProgress ? "Running" : (run.conclusion || run.status)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[10px] text-zinc-500 font-mono">
                        <span>{new Date(run.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        <a 
                          href={run.html_url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-cyan-400 hover:underline inline-flex items-center gap-1"
                        >
                          <span>Logs</span>
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
  );
}
