'use client';
import React, { useState, useEffect } from "react";
import { IntegrationManager } from "../services/integrations/IntegrationManager";
import { useToast } from "../contexts/ToastContext";

export default function IntegrationsTab({ dbUser, projects = [] }) {
  const { addToast } = useToast();
  const [activeSubTab, setActiveSubTab] = useState("connectors"); // 'connectors' | 'mapping' | 'import_export'
  const [config, setConfig] = useState(IntegrationManager.getConfig());
  const [mappings, setMappings] = useState(IntegrationManager.getMappings());
  const [logs, setLogs] = useState(IntegrationManager.getLogs());
  const [activeModal, setActiveModal] = useState(null); // 'toggl' | 'harvest' | 'jira'
  const [isTesting, setIsTesting] = useState(false);
  const [dryRunRunning, setDryRunRunning] = useState(null);
  const [isFetchingRemote, setIsFetchingRemote] = useState(false);

  // Form states
  const [togglForm, setTogglForm] = useState({
    apiKey: config.toggl?.apiKey || "",
    workspaceId: config.toggl?.workspaceId || "",
    autoSync: config.toggl?.autoSync !== false,
  });

  const [harvestForm, setHarvestForm] = useState({
    token: config.harvest?.token || "",
    accountId: config.harvest?.accountId || "",
    autoSync: config.harvest?.autoSync !== false,
  });

  const [jiraForm, setJiraForm] = useState({
    domain: config.jira?.domain || "",
    email: config.jira?.email || "",
    apiToken: config.jira?.apiToken || "",
    autoSync: config.jira?.autoSync !== false,
  });

  const refreshData = () => {
    setConfig(IntegrationManager.getConfig());
    setMappings(IntegrationManager.getMappings());
    setLogs(IntegrationManager.getLogs());
  };

  useEffect(() => {
    refreshData();
  }, []);

  const handleToggleProvider = (providerKey) => {
    const current = config[providerKey]?.enabled;
    IntegrationManager.updateProviderConfig(providerKey, { enabled: !current });
    refreshData();
    addToast(`${providerKey.toUpperCase()} integration ${!current ? "enabled" : "disabled"}`, "info");
  };

  const handleFetchRemote = async (providerKey) => {
    setIsFetchingRemote(true);
    try {
      const data = await IntegrationManager.fetchRemoteStructure(providerKey);
      refreshData();
      const count = data.projects ? data.projects.length : 0;
      addToast(`Successfully fetched ${count} remote projects from ${providerKey.toUpperCase()}!`, "success");
    } catch (err) {
      addToast(`Failed to fetch remote structure: ${err.message}`, "error");
    } finally {
      setIsFetchingRemote(false);
    }
  };

  const handleDryRunTest = async (providerKey) => {
    setDryRunRunning(providerKey);
    try {
      const res = await IntegrationManager.sendDryRunTestEntry(providerKey);
      refreshData();
      addToast(res.message, "success");
    } catch (err) {
      addToast(`Verification test failed: ${err.message}`, "error");
    } finally {
      setDryRunRunning(null);
    }
  };

  const handleSaveToggl = async (e) => {
    e.preventDefault();
    setIsTesting(true);
    try {
      const auth = await IntegrationManager.testProvider("toggl", { apiKey: togglForm.apiKey });
      IntegrationManager.updateProviderConfig("toggl", {
        enabled: true,
        apiKey: togglForm.apiKey,
        workspaceId: togglForm.workspaceId || auth.defaultWorkspaceId,
        autoSync: togglForm.autoSync,
        accountName: auth.fullname || auth.email,
        lastSynced: new Date().toISOString(),
      });
      refreshData();
      setActiveModal(null);
      addToast(`Connected to Toggl Track (${auth.email})`, "success");
      handleFetchRemote("toggl");
    } catch (err) {
      addToast(`Toggl connection failed: ${err.message}`, "error");
    } finally {
      setIsTesting(false);
    }
  };

  const handleSaveHarvest = async (e) => {
    e.preventDefault();
    setIsTesting(true);
    try {
      const auth = await IntegrationManager.testProvider("harvest", {
        token: harvestForm.token,
        accountId: harvestForm.accountId,
      });
      IntegrationManager.updateProviderConfig("harvest", {
        enabled: true,
        token: harvestForm.token,
        accountId: harvestForm.accountId,
        autoSync: harvestForm.autoSync,
        accountName: auth.name || auth.email,
        lastSynced: new Date().toISOString(),
      });
      refreshData();
      setActiveModal(null);
      addToast(`Connected to Harvest (${auth.name})`, "success");
      handleFetchRemote("harvest");
    } catch (err) {
      addToast(`Harvest connection failed: ${err.message}`, "error");
    } finally {
      setIsTesting(false);
    }
  };

  const handleSaveJira = async (e) => {
    e.preventDefault();
    setIsTesting(true);
    try {
      const auth = await IntegrationManager.testProvider("jira", {
        domain: jiraForm.domain,
        email: jiraForm.email,
        apiToken: jiraForm.apiToken,
      });
      IntegrationManager.updateProviderConfig("jira", {
        enabled: true,
        domain: jiraForm.domain,
        email: jiraForm.email,
        apiToken: jiraForm.apiToken,
        autoSync: jiraForm.autoSync,
        accountName: auth.displayName || auth.emailAddress,
        lastSynced: new Date().toISOString(),
      });
      refreshData();
      setActiveModal(null);
      addToast(`Connected to Jira Cloud (${auth.displayName})`, "success");
      handleFetchRemote("jira");
    } catch (err) {
      addToast(`Jira connection failed: ${err.message}`, "error");
    } finally {
      setIsTesting(false);
    }
  };

  const handleMappingChange = (localProjectId, provider, field, value) => {
    IntegrationManager.setProjectMapping(localProjectId, provider, { [field]: value });
    refreshData();
    addToast("Project destination mapped!", "success");
  };

  // CSV Export Presets
  const handleExportPreset = (presetName) => {
    let rows = [];
    const dateStr = new Date().toISOString().split("T")[0];

    if (presetName === "quickbooks") {
      rows.push(["!TIMEACT", "DATE", "JOB", "EMP", "ITEM", "DURATION", "NOTE", "BILLABLE"]);
      projects.forEach((p) => {
        (p.tasks || []).forEach((t) => {
          rows.push(["TIMEACT", dateStr, p.name, dbUser?.email || "Employee", t.name, "8.00", "Logged via VeloTime", "Y"]);
        });
      });
    } else if (presetName === "adp") {
      rows.push(["Company Code", "Employee ID", "Pay Code", "Date", "Hours", "Department", "Job Name"]);
      projects.forEach((p) => {
        rows.push(["ADP01", dbUser?.id || "EMP01", "REG", dateStr, "8.00", "Design/Dev", p.name]);
      });
    } else if (presetName === "bamboohr") {
      rows.push(["Employee Email", "Date", "Project", "Task", "Hours", "Note"]);
      projects.forEach((p) => {
        (p.tasks || []).forEach((t) => {
          rows.push([dbUser?.email || "user@company.com", dateStr, p.name, t.name, "8.00", "Standard Week"]);
        });
      });
    } else {
      rows.push(["Date", "Client", "Project", "Task", "Hours", "Notes", "Billable"]);
      projects.forEach((p) => {
        (p.tasks || []).forEach((t) => {
          rows.push([dateStr, p.clientName || "General", p.name, t.name, "8.00", "Logged via VeloTime", "Yes"]);
        });
      });
    }

    const csvContent = "data:text/csv;charset=utf-8," + rows.map((e) => e.join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `velotime_export_${presetName}_${dateStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    addToast(`Exported ${presetName.toUpperCase()} format successfully!`, "success");
  };

  const providers = [
    {
      id: "toggl",
      name: "Toggl Track",
      description: "Auto-push timesheet matrix entries directly to your Toggl Track workspace in under 200ms.",
      connected: config.toggl?.enabled && Boolean(config.toggl?.apiKey),
      account: config.toggl?.accountName,
      lastSynced: config.toggl?.lastSynced,
      color: "bg-rose-500",
      onConnect: () => setActiveModal("toggl"),
    },
    {
      id: "harvest",
      name: "Harvest",
      description: "Keep your company's Harvest subscription while logging full weekly timesheets in 20 seconds via VeloTime.",
      connected: config.harvest?.enabled && Boolean(config.harvest?.token),
      account: config.harvest?.accountName,
      lastSynced: config.harvest?.lastSynced,
      color: "bg-orange-500",
      onConnect: () => setActiveModal("harvest"),
    },
    {
      id: "jira",
      name: "Jira Cloud",
      description: "Automatically log Jira worklogs (timeSpent) to sprint issues and epics without opening slow Jira forms.",
      connected: config.jira?.enabled && Boolean(config.jira?.apiToken),
      account: config.jira?.accountName,
      lastSynced: config.jira?.lastSynced,
      color: "bg-blue-600",
      onConnect: () => setActiveModal("jira"),
    },
    {
      id: "linear",
      name: "Linear",
      description: "Sync project tasks and sprint milestones directly from Linear issues into your weekly matrix.",
      connected: false,
      comingSoon: true,
      color: "bg-indigo-600",
      onConnect: () => addToast("Linear sync adapter is in active beta. Coming in next update!", "info"),
    },
    {
      id: "qbo",
      name: "QuickBooks Time",
      description: "Export approved timesheet batches and payroll hours directly into QuickBooks Accounts Receivable.",
      connected: false,
      comingSoon: true,
      color: "bg-emerald-600",
      onConnect: () => addToast("QuickBooks connector is in active beta. Coming in next update!", "info"),
    }
  ];

  return (
    <div className="flex-1 bg-slate-100 dark:bg-zinc-950 p-6 sm:p-10 overflow-y-auto">
      <div className="max-w-5xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-3xl p-8 shadow-sm">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-primary-50 dark:bg-primary-950/40 text-primary-600 dark:text-primary-400 font-bold text-xs rounded-full mb-3">
                <span>Front-End Speed Layer</span>
              </div>
              <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                Connected Integrations & Field Mapping
              </h1>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-2xl leading-relaxed">
                Log your hours in VeloTime's matrix and customize exactly where each project and task routes into your company's target software.
              </p>
            </div>

            {/* Sub-Tab Navigation */}
            <div className="flex bg-slate-100 dark:bg-zinc-800 p-1 rounded-2xl border border-slate-200 dark:border-zinc-700 text-xs font-bold">
              <button
                onClick={() => setActiveSubTab("connectors")}
                className={`px-3.5 py-1.5 rounded-xl transition-all cursor-pointer ${
                  activeSubTab === "connectors"
                    ? "bg-white dark:bg-zinc-900 text-slate-900 dark:text-white shadow-xs"
                    : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                }`}
              >
                Connectors
              </button>
              <button
                onClick={() => setActiveSubTab("mapping")}
                className={`px-3.5 py-1.5 rounded-xl transition-all cursor-pointer ${
                  activeSubTab === "mapping"
                    ? "bg-white dark:bg-zinc-900 text-slate-900 dark:text-white shadow-xs"
                    : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                }`}
              >
                Project Destination Mapping
              </button>
              <button
                onClick={() => setActiveSubTab("import_export")}
                className={`px-3.5 py-1.5 rounded-xl transition-all cursor-pointer ${
                  activeSubTab === "import_export"
                    ? "bg-white dark:bg-zinc-900 text-slate-900 dark:text-white shadow-xs"
                    : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                }`}
              >
                Import / Export Presets
              </button>
            </div>
          </div>
        </div>

        {/* TAB 1: CONNECTORS & DRY-RUN VERIFICATION */}
        {activeSubTab === "connectors" && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {providers.map((p) => (
                <div
                  key={p.id}
                  className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-3xl p-6 shadow-sm flex flex-col justify-between hover:border-slate-300 dark:hover:border-zinc-700 transition-all"
                >
                  <div>
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-2xl ${p.color} text-white flex items-center justify-center font-black text-sm shadow-md`}>
                          {p.name.charAt(0)}
                        </div>
                        <div>
                          <h3 className="text-base font-bold text-slate-900 dark:text-white">{p.name}</h3>
                          {p.connected ? (
                            <div className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-semibold">
                              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                              <span>Connected ({p.account || "Active"})</span>
                            </div>
                          ) : p.comingSoon ? (
                            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Coming Soon</span>
                          ) : (
                            <span className="text-xs text-slate-400 font-medium">Not configured</span>
                          )}
                        </div>
                      </div>

                      {p.connected && (
                        <button
                          onClick={() => handleToggleProvider(p.id)}
                          className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                            config[p.id]?.enabled
                              ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"
                              : "bg-slate-100 text-slate-600 dark:bg-zinc-800 dark:text-slate-400"
                          }`}
                        >
                          {config[p.id]?.enabled ? "Sync Active" : "Paused"}
                        </button>
                      )}
                    </div>

                    <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed mb-6">
                      {p.description}
                    </p>
                  </div>

                  <div className="pt-4 border-t border-slate-100 dark:border-zinc-800 flex flex-col gap-3">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-400 text-[11px]">
                        {p.lastSynced ? `Last synced: ${new Date(p.lastSynced).toLocaleTimeString()}` : "No sync recorded"}
                      </span>

                      <div className="flex items-center gap-2">
                        {p.connected && (
                          <button
                            onClick={() => handleDryRunTest(p.id)}
                            disabled={dryRunRunning === p.id}
                            className="bg-primary-50 dark:bg-primary-950/40 text-primary-600 dark:text-primary-400 hover:bg-primary-100 px-3 py-1.5 rounded-xl font-bold text-xs transition-all cursor-pointer disabled:opacity-50"
                            title="Sends a 0.1h sample entry to verify full end-to-end receipt in your external account"
                          >
                            {dryRunRunning === p.id ? "Pinging..." : "Verify Ping (0.1h)"}
                          </button>
                        )}

                        <button
                          onClick={p.onConnect}
                          className="bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-slate-800 px-4 py-2 rounded-xl font-bold transition-all shadow-sm cursor-pointer text-xs"
                        >
                          {p.connected ? "Configure" : p.comingSoon ? "Preview" : "Connect"}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Live Sync Activity Log */}
            <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-3xl p-6 shadow-sm">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-base font-bold text-slate-900 dark:text-white">
                  Live Verification & Sync Activity
                </h2>
                <span className="text-xs text-slate-400 font-mono">Real-Time Dispatch Queue</span>
              </div>

              {logs.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400 italic">
                  No entries synced yet. Once you connect Toggl, Harvest, or Jira, live sync logs will stream here.
                </div>
              ) : (
                <div className="divide-y divide-slate-100 dark:divide-zinc-800 text-xs font-mono">
                  {logs.map((log) => (
                    <div key={log.id} className="py-2.5 flex justify-between items-center gap-4">
                      <div className="flex items-center gap-3">
                        <span className={`w-2 h-2 rounded-full ${log.status === 'success' ? 'bg-emerald-500' : 'bg-red-500'}`}></span>
                        <span className="font-bold text-slate-800 dark:text-slate-200">{log.provider}</span>
                        <span className="text-slate-500 truncate max-w-md">{log.message}</span>
                      </div>
                      <span className="text-slate-400 text-[11px] shrink-0">{new Date(log.timestamp).toLocaleTimeString()}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        {/* TAB 2: PROJECT & TASK DESTINATION MAPPING */}
        {activeSubTab === "mapping" && (
          <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-6 border-b border-slate-100 dark:border-zinc-800">
              <div>
                <h2 className="text-lg font-black text-slate-900 dark:text-white">
                  Where Do Your Hours Go?
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-xl">
                  Map each VeloTime project to its corresponding destination project/task in Harvest, Toggl, or Jira.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleFetchRemote("harvest")}
                  disabled={isFetchingRemote || !config.harvest?.enabled}
                  className="px-3 py-2 bg-orange-50 dark:bg-orange-950/40 text-orange-600 dark:text-orange-400 rounded-xl font-bold text-xs hover:bg-orange-100 transition-all disabled:opacity-40 cursor-pointer"
                >
                  Fetch Harvest Projects
                </button>
                <button
                  onClick={() => handleFetchRemote("toggl")}
                  disabled={isFetchingRemote || !config.toggl?.enabled}
                  className="px-3 py-2 bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 rounded-xl font-bold text-xs hover:bg-rose-100 transition-all disabled:opacity-40 cursor-pointer"
                >
                  Fetch Toggl Projects
                </button>
              </div>
            </div>

            {projects.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-400 italic">
                No active projects found in VeloTime. Create a project in the Projects tab to configure destination routing.
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-zinc-800">
                {projects.map((proj) => {
                  const projMap = mappings[proj.id] || {};
                  return (
                    <div key={proj.id} className="py-5 space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="w-3 h-3 rounded-full bg-primary-500"></span>
                          <h3 className="font-bold text-slate-900 dark:text-white text-sm">
                            {proj.name}
                          </h3>
                          <span className="text-xs text-slate-400">({proj.tasks?.length || 0} tasks)</span>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-50 dark:bg-zinc-800/50 p-4 rounded-2xl text-xs">
                        
                        {/* TOGGL MAPPING */}
                        <div className="space-y-2">
                          <div className="font-bold text-rose-600 dark:text-rose-400 flex items-center gap-1.5">
                            <span>Toggl Track Destination</span>
                          </div>
                          <select
                            value={projMap.toggl?.remoteProjectId || "none"}
                            onChange={(e) => handleMappingChange(proj.id, "toggl", "remoteProjectId", e.target.value)}
                            className="w-full bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-xl p-2 font-medium text-slate-800 dark:text-slate-200 outline-none"
                          >
                            <option value="none">Auto-Match by Name</option>
                            {(config.toggl?.remoteProjects || []).map((tp) => (
                              <option key={tp.id} value={tp.id}>
                                {tp.name} (Toggl #{tp.id})
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* HARVEST MAPPING */}
                        <div className="space-y-2">
                          <div className="font-bold text-orange-600 dark:text-orange-400 flex items-center gap-1.5">
                            <span>Harvest Project & Task</span>
                          </div>
                          <div className="space-y-1.5">
                            <select
                              value={projMap.harvest?.remoteProjectId || "none"}
                              onChange={(e) => {
                                const pId = e.target.value;
                                const selectedHarvestProj = (config.harvest?.remoteProjects || []).find(p => String(p.id) === String(pId));
                                const defaultTaskId = selectedHarvestProj?.tasks?.[0]?.id || "";
                                handleMappingChange(proj.id, "harvest", "remoteProjectId", pId);
                                if (defaultTaskId) handleMappingChange(proj.id, "harvest", "remoteTaskId", defaultTaskId);
                              }}
                              className="w-full bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-xl p-2 font-medium text-slate-800 dark:text-slate-200 outline-none"
                            >
                              <option value="none">Select Harvest Project...</option>
                              {(config.harvest?.remoteProjects || []).map((hp) => (
                                <option key={hp.id} value={hp.id}>
                                  {hp.clientName ? `${hp.clientName} - ` : ""}{hp.name}
                                </option>
                              ))}
                            </select>

                            {projMap.harvest?.remoteProjectId && projMap.harvest.remoteProjectId !== "none" && (
                              <select
                                value={projMap.harvest?.remoteTaskId || ""}
                                onChange={(e) => handleMappingChange(proj.id, "harvest", "remoteTaskId", e.target.value)}
                                className="w-full bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-xl p-2 font-medium text-slate-800 dark:text-slate-200 outline-none"
                              >
                                <option value="">Select Harvest Task...</option>
                                {((config.harvest?.remoteProjects || []).find(p => String(p.id) === String(projMap.harvest.remoteProjectId))?.tasks || []).map((ht) => (
                                  <option key={ht.id} value={ht.id}>
                                    Task: {ht.name}
                                  </option>
                                ))}
                              </select>
                            )}
                          </div>
                        </div>

                        {/* JIRA MAPPING */}
                        <div className="space-y-2">
                          <div className="font-bold text-blue-600 dark:text-blue-400 flex items-center gap-1.5">
                            <span>Jira Issue Key Mapping</span>
                          </div>
                          <input
                            type="text"
                            placeholder="e.g. PROJ-101 or Sprint Key"
                            value={projMap.jira?.issueKey || ""}
                            onChange={(e) => handleMappingChange(proj.id, "jira", "issueKey", e.target.value)}
                            className="w-full bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-xl p-2 font-mono uppercase text-slate-800 dark:text-slate-200 outline-none"
                          />
                        </div>

                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: IMPORT / EXPORT PRESETS */}
        {activeSubTab === "import_export" && (
          <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
            <div>
              <h2 className="text-lg font-black text-slate-900 dark:text-white">
                Universal Payroll & Accounting Export Presets
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-xl">
                Export clean timesheet batches formatted precisely for your company's payroll or accounting system in 1 click.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="border border-slate-200 dark:border-zinc-800 p-5 rounded-2xl flex flex-col justify-between hover:border-primary-500 transition-all">
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white text-sm mb-1">QuickBooks Desktop / Online</h3>
                  <p className="text-xs text-slate-500 mb-4">Standard QuickBooks IIF / CSV format for Accounts Receivable & Job Costing.</p>
                </div>
                <button
                  onClick={() => handleExportPreset("quickbooks")}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2 rounded-xl text-xs transition-all cursor-pointer"
                >
                  Export QuickBooks CSV
                </button>
              </div>

              <div className="border border-slate-200 dark:border-zinc-800 p-5 rounded-2xl flex flex-col justify-between hover:border-primary-500 transition-all">
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white text-sm mb-1">ADP Run & Workforce</h3>
                  <p className="text-xs text-slate-500 mb-4">Pre-formatted ADP company/employee hourly batch upload file.</p>
                </div>
                <button
                  onClick={() => handleExportPreset("adp")}
                  className="bg-rose-600 hover:bg-rose-500 text-white font-bold py-2 rounded-xl text-xs transition-all cursor-pointer"
                >
                  Export ADP Batch CSV
                </button>
              </div>

              <div className="border border-slate-200 dark:border-zinc-800 p-5 rounded-2xl flex flex-col justify-between hover:border-primary-500 transition-all">
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white text-sm mb-1">BambooHR Timesheets</h3>
                  <p className="text-xs text-slate-500 mb-4">BambooHR project timesheet import with email & project columns.</p>
                </div>
                <button
                  onClick={() => handleExportPreset("bamboohr")}
                  className="bg-green-600 hover:bg-green-500 text-white font-bold py-2 rounded-xl text-xs transition-all cursor-pointer"
                >
                  Export BambooHR CSV
                </button>
              </div>

              <div className="border border-slate-200 dark:border-zinc-800 p-5 rounded-2xl flex flex-col justify-between hover:border-primary-500 transition-all">
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white text-sm mb-1">Universal Excel / CSV</h3>
                  <p className="text-xs text-slate-500 mb-4">Generic standard columns (Date, Client, Project, Task, Hours, Notes).</p>
                </div>
                <button
                  onClick={() => handleExportPreset("standard")}
                  className="bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-slate-800 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer"
                >
                  Export Standard CSV
                </button>
              </div>
            </div>
          </div>
        )}

      </div>

      {/* TOGGL MODAL */}
      {activeModal === "toggl" && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl">
            <h3 className="text-lg font-black text-slate-900 dark:text-white mb-2">Connect Toggl Track</h3>
            <p className="text-xs text-slate-500 mb-6">
              Enter your Toggl API Token (found in Toggl Track Profile Settings &rarr; API Token).
            </p>

            <form onSubmit={handleSaveToggl} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 uppercase text-[10px] mb-1">
                  Toggl API Token
                </label>
                <input
                  type="password"
                  required
                  placeholder="Paste your 32-character API token..."
                  value={togglForm.apiKey}
                  onChange={(e) => setTogglForm({ ...togglForm, apiKey: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-xl p-3 text-slate-900 dark:text-white font-mono outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 uppercase text-[10px] mb-1">
                  Workspace ID (Optional - Auto-Detected)
                </label>
                <input
                  type="text"
                  placeholder="Leave blank to use default workspace"
                  value={togglForm.workspaceId}
                  onChange={(e) => setTogglForm({ ...togglForm, workspaceId: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-xl p-3 text-slate-900 dark:text-white font-mono outline-none"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="toggl-auto"
                  checked={togglForm.autoSync}
                  onChange={(e) => setTogglForm({ ...togglForm, autoSync: e.target.checked })}
                  className="rounded text-primary-600 cursor-pointer"
                />
                <label htmlFor="toggl-auto" className="font-semibold text-slate-700 dark:text-slate-300 cursor-pointer">
                  Auto-sync entries in real-time when matrix cell is updated
                </label>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={() => setActiveModal(null)}
                  className="px-4 py-2 font-bold text-slate-500 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isTesting}
                  className="bg-primary-600 hover:bg-primary-500 text-white font-bold px-5 py-2.5 rounded-xl shadow-md transition-all cursor-pointer disabled:opacity-50"
                >
                  {isTesting ? "Testing Connection..." : "Save & Connect"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* HARVEST MODAL */}
      {activeModal === "harvest" && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl">
            <h3 className="text-lg font-black text-slate-900 dark:text-white mb-2">Connect Harvest</h3>
            <p className="text-xs text-slate-500 mb-6">
              Create a Personal Access Token in Harvest Developers (id.getharvest.com/developers).
            </p>

            <form onSubmit={handleSaveHarvest} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 uppercase text-[10px] mb-1">
                  Harvest Account ID
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 1234567"
                  value={harvestForm.accountId}
                  onChange={(e) => setHarvestForm({ ...harvestForm, accountId: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-xl p-3 text-slate-900 dark:text-white font-mono outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 uppercase text-[10px] mb-1">
                  Personal Access Token (Bearer Token)
                </label>
                <input
                  type="password"
                  required
                  placeholder="Paste Harvest Token..."
                  value={harvestForm.token}
                  onChange={(e) => setHarvestForm({ ...harvestForm, token: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-xl p-3 text-slate-900 dark:text-white font-mono outline-none"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="harvest-auto"
                  checked={harvestForm.autoSync}
                  onChange={(e) => setHarvestForm({ ...harvestForm, autoSync: e.target.checked })}
                  className="rounded text-primary-600 cursor-pointer"
                />
                <label htmlFor="harvest-auto" className="font-semibold text-slate-700 dark:text-slate-300 cursor-pointer">
                  Auto-sync entries in real-time when matrix cell is updated
                </label>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={() => setActiveModal(null)}
                  className="px-4 py-2 font-bold text-slate-500 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isTesting}
                  className="bg-primary-600 hover:bg-primary-500 text-white font-bold px-5 py-2.5 rounded-xl shadow-md transition-all cursor-pointer disabled:opacity-50"
                >
                  {isTesting ? "Testing Connection..." : "Save & Connect"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* JIRA MODAL */}
      {activeModal === "jira" && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl">
            <h3 className="text-lg font-black text-slate-900 dark:text-white mb-2">Connect Jira Cloud</h3>
            <p className="text-xs text-slate-500 mb-6">
              Connect your Atlassian Cloud account to automatically log worklogs.
            </p>

            <form onSubmit={handleSaveJira} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 uppercase text-[10px] mb-1">
                  Jira Domain
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. yourcompany.atlassian.net"
                  value={jiraForm.domain}
                  onChange={(e) => setJiraForm({ ...jiraForm, domain: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-xl p-3 text-slate-900 dark:text-white font-mono outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 uppercase text-[10px] mb-1">
                  Atlassian Account Email
                </label>
                <input
                  type="email"
                  required
                  placeholder="alex@company.com"
                  value={jiraForm.email}
                  onChange={(e) => setJiraForm({ ...jiraForm, email: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-xl p-3 text-slate-900 dark:text-white font-mono outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 uppercase text-[10px] mb-1">
                  Atlassian API Token
                </label>
                <input
                  type="password"
                  required
                  placeholder="Create token in id.atlassian.com/manage-profile/security/api-tokens"
                  value={jiraForm.apiToken}
                  onChange={(e) => setJiraForm({ ...jiraForm, apiToken: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-xl p-3 text-slate-900 dark:text-white font-mono outline-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={() => setActiveModal(null)}
                  className="px-4 py-2 font-bold text-slate-500 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isTesting}
                  className="bg-primary-600 hover:bg-primary-500 text-white font-bold px-5 py-2.5 rounded-xl shadow-md transition-all cursor-pointer disabled:opacity-50"
                >
                  {isTesting ? "Testing Connection..." : "Save & Connect"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
