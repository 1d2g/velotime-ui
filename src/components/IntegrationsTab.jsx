'use client';
import React, { useState, useEffect } from "react";
import { IntegrationManager } from "../services/integrations/IntegrationManager";
import { useToast } from "../contexts/ToastContext";

export default function IntegrationsTab({ dbUser, projects = [] }) {
  const { addToast } = useToast();
  const [config, setConfig] = useState(IntegrationManager.getConfig());
  const [logs, setLogs] = useState(IntegrationManager.getLogs());
  const [activeModal, setActiveModal] = useState(null); // 'toggl' | 'harvest' | 'jira' | 'linear'
  const [isTesting, setIsTesting] = useState(false);

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
    setLogs(IntegrationManager.getLogs());
  };

  useEffect(() => {
    refreshData();
  }, []);

  const handleToggleProvider = (providerKey) => {
    const current = config[providerKey]?.enabled;
    const updated = IntegrationManager.updateProviderConfig(providerKey, { enabled: !current });
    refreshData();
    addToast(`${providerKey.toUpperCase()} integration ${!current ? "enabled" : "disabled"}`, "info");
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
    } catch (err) {
      addToast(`Jira connection failed: ${err.message}`, "error");
    } finally {
      setIsTesting(false);
    }
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
                Connected Systems & Sync
              </h1>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-2xl leading-relaxed">
                Log your hours in VeloTime's lightning-fast matrix and automatically push timesheet entries into whatever platform your company mandates.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={refreshData}
                className="px-4 py-2 bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                Refresh Status
              </button>
            </div>
          </div>
        </div>

        {/* Integration Cards Grid */}
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

              <div className="pt-4 border-t border-slate-100 dark:border-zinc-800 flex justify-between items-center text-xs">
                <span className="text-slate-400 text-[11px]">
                  {p.lastSynced ? `Last synced: ${new Date(p.lastSynced).toLocaleTimeString()}` : "No sync recorded"}
                </span>

                <button
                  onClick={p.onConnect}
                  className="bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-slate-800 px-4 py-2 rounded-xl font-bold transition-all shadow-sm cursor-pointer"
                >
                  {p.connected ? "Configure & Key" : p.comingSoon ? "Preview" : "Connect"}
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Live Sync Activity Log */}
        <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-3xl p-6 shadow-sm">
          <h2 className="text-base font-bold text-slate-900 dark:text-white mb-4">
            Recent Sync Activity Log
          </h2>

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
