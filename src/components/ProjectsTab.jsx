import React, { useState, useRef, useEffect } from "react";
import AssignTeamModal from "./AssignTeamModal";
import { useToast } from "../contexts/ToastContext";

// Permission check helper - structured to support easy permission/role restriction in the future.
const canPerformWriteActions = (dbUser) => {
  return dbUser?.role === "admin" || dbUser?.role === "manager";
};

const formatDate = (dateString) => {
  if (!dateString) return "Unknown";
  const d = new Date(dateString);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

const TaskRatesPanel = ({ task, orgUsers, taskRates, apiCall, forceSync }) => {
  const { addToast } = useToast();
  const [rates, setRates] = useState({});
  const [savingUserId, setSavingUserId] = useState(null);

  useEffect(() => {
    const initial = {};
    orgUsers.forEach((u) => {
      const override = taskRates.find(
        (tr) => tr.taskId === task.id && tr.userId === u.id,
      );
      initial[u.id] = {
        costRate: override?.costRate ?? "",
        billingRate: override?.billingRate ?? "",
      };
    });
    setRates(initial);
  }, [orgUsers, taskRates, task.id]);

  const handleSave = async (userId) => {
    setSavingUserId(userId);
    try {
      await apiCall(`/api/tasks/${task.id}/rates`, "POST", {
        targetUserId: userId,
        costRate: rates[userId].costRate,
        billingRate: rates[userId].billingRate,
      });
      forceSync();
      addToast("Rate override saved successfully", "success");
    } catch (e) {
      addToast("Failed to save rate override", "error");
    } finally {
      setSavingUserId(null);
    }
  };

  if (!orgUsers || orgUsers.length === 0) return null;

  return (
    <div className="bg-primary-50/50 p-6 border-b border-slate-300 dark:border-zinc-700 ">
      <h4 className="text-xs font-black text-slate-500 dark:text-slate-500 mb-4 uppercase tracking-wider">
        Employee Task Rates Override
      </h4>
      <div className="grid gap-3 max-w-4xl max-h-96 overflow-y-auto pr-2">
        {orgUsers.map((u) => {
          const hasOverride = taskRates.some(
            (tr) => tr.taskId === task.id && tr.userId === u.id,
          );
          return (
            <div
              key={u.id}
              className="flex flex-col sm:flex-row sm:items-center justify-between bg-white dark:bg-zinc-900 p-3 border border-slate-300 dark:border-zinc-700 gap-4"
            >
              <div className="flex flex-col">
                <span className="font-bold text-slate-900 dark:text-slate-100">
                  {u.firstName} {u.lastName}{" "}
                  <span className="text-slate-400 dark:text-slate-600 font-normal">
                    ({u.email})
                  </span>
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-2">
                  <label className="text-xs font-bold text-slate-500 dark:text-slate-500 uppercase">
                    Cost / hr
                  </label>
                  <div className="relative">
                    <span className="absolute left-2 top-1 text-slate-400 dark:text-slate-600 text-sm font-semibold">
                      $
                    </span>
                    <input
                      type="number"
                      step="0.01"
                      placeholder={u.defaultCostRate || "0.00"}
                      className="w-24 pl-6 pr-2 py-1 text-sm border border-slate-300 dark:border-zinc-700 rounded-none font-semibold focus:outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900"
                      value={rates[u.id]?.costRate || ""}
                      onChange={(e) =>
                        setRates({
                          ...rates,
                          [u.id]: { ...rates[u.id], costRate: e.target.value },
                        })
                      }
                    />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-xs font-bold text-slate-500 dark:text-slate-500 uppercase">
                    Bill / hr
                  </label>
                  <div className="relative">
                    <span className="absolute left-2 top-1 text-slate-400 dark:text-slate-600 text-sm font-semibold">
                      $
                    </span>
                    <input
                      type="number"
                      step="0.01"
                      placeholder={u.defaultBillingRate || "0.00"}
                      className="w-24 pl-6 pr-2 py-1 text-sm border border-slate-300 dark:border-zinc-700 rounded-none font-semibold focus:outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900"
                      value={rates[u.id]?.billingRate || ""}
                      onChange={(e) =>
                        setRates({
                          ...rates,
                          [u.id]: {
                            ...rates[u.id],
                            billingRate: e.target.value,
                          },
                        })
                      }
                    />
                  </div>
                </div>
                <button
                  onClick={() => handleSave(u.id)}
                  disabled={savingUserId === u.id}
                  className={`text-xs font-bold px-3 py-1.5 rounded-none transition-colors whitespace-nowrap min-w-[120px] ${hasOverride ? "bg-slate-900 text-white hover:bg-slate-900 " : "bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-slate-400 dark:text-slate-600 hover:bg-slate-200 border border-slate-300 dark:border-zinc-700"}`}
                >
                  {savingUserId === u.id
                    ? "Saving..."
                    : hasOverride
                      ? "Update Override"
                      : "Set Override"}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default function ProjectsTab({
  projects,
  entries,
  rawEntries = [],
  dbUser,
  orgUsers,
  taskRates = [],
  apiCall,
  forceSync,
  onRenameProject,
  onDeleteProject,
  onAddProject,
  onRemoveTask,
  onEditTask,
  clients,
  onAddClient,
  onUpdateClient,
  onUpdateProject,
}) {
  const [selectedProjectId, setSelectedProjectId] = useState(null);
  const [expandedTaskId, setExpandedTaskId] = useState(null);

  const [activeSubTab, setActiveSubTab] = useState("Projects");

  // Budget Editing State
  const [isEditingBudget, setIsEditingBudget] = useState(false);
  const [budgetType, setBudgetType] = useState('NONE');
  const [budgetLimit, setBudgetLimit] = useState(0);

  // Searching & Sorting State
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("name-asc");

  const [isCreatingProj, setIsCreatingProj] = useState(false);
  const [newProjName, setNewProjName] = useState("");
  const [newProjClientId, setNewProjClientId] = useState("");
  const [isCreatingInlineClient, setIsCreatingInlineClient] = useState(false);
  const [newInlineClientName, setNewInlineClientName] = useState("");

  const [newClientName, setNewClientName] = useState("");
  const [newClientAddress, setNewClientAddress] = useState("");

  const [editingClientId, setEditingClientId] = useState(null);
  const [editClientName, setEditClientName] = useState("");
  const [editClientAddress, setEditClientAddress] = useState("");

  // Inline project renaming on Master list
  const [editingProjectId, setEditingProjectId] = useState(null);
  const [editProjName, setEditProjName] = useState("");

  // Inline project renaming on Detail view
  const [detailProjEditing, setDetailProjEditing] = useState(false);
  const [detailProjName, setDetailProjName] = useState("");

  // Inline task renaming
  const [editingTaskId, setEditingTaskId] = useState(null);
  const [editName, setEditName] = useState("");
  const inputRef = useRef(null);

  // New Task State
  const [newTaskName, setNewTaskName] = useState("");
  const [newTaskBillable, setNewTaskBillable] = useState(true);

  // Delete project confirmation state
  const [confirmDeleteProjectId, setConfirmDeleteProjectId] = useState(null);

  // Assign Team modal state
  const [assignTeamProject, setAssignTeamProject] = useState(null);

  // Auto-focus the input when a user clicks a task name
  useEffect(() => {
    if (editingTaskId && inputRef.current) {
      inputRef.current.focus();
    }
  }, [editingTaskId]);

  const writeAllowed = canPerformWriteActions(dbUser);
  const isAdmin = dbUser?.role === "admin";

  const handleBulkOverride = async (taskId, billingRate) => {
    try {
      await apiCall(`/api/tasks/${taskId}/rates/bulk`, "POST", {
        costRate: "",
        billingRate,
      });
      forceSync();
      addToast("Successfully updated rate override for all users on this task.", "success");
    } catch (e) {
      addToast("Failed to bulk update rates", "error");
    }
  };

  const getProjectTotalHours = (project) => {
    if (!project?.tasks) return 0;
    if (rawEntries && rawEntries.length > 0) {
      const taskIds = new Set(project.tasks.map((t) => t.id));
      return rawEntries
        .filter((e) => taskIds.has(e.taskId))
        .reduce((sum, e) => sum + (parseFloat(e.hours) || 0), 0);
    }
    return project.tasks.reduce((total, task) => {
      const taskHours = Object.entries(entries)
        .filter(([key]) => key.endsWith(`_${task.id}`))
        .reduce((sum, [, hours]) => sum + (parseFloat(hours) || 0), 0);
      return total + taskHours;
    }, 0);
  };

  const getProjectSpend = (project) => {
    if (!project?.tasks) return 0;
    if (rawEntries && rawEntries.length > 0) {
      const taskIds = new Set(project.tasks.map((t) => t.id));
      return rawEntries
        .filter((e) => taskIds.has(e.taskId))
        .reduce((sum, e) => {
          const tRate = taskRates?.find((tr) => tr.taskId === e.taskId && tr.userId === e.userId);
          const user = orgUsers?.find((u) => u.id === e.userId);
          const rate = (tRate && tRate.billingRate) || (user && user.defaultBillingRate) || 0;
          return sum + ((parseFloat(e.hours) || 0) * rate);
        }, 0);
    }
    return 0;
  };

  const handleStartEdit = (task) => {
    if (!writeAllowed) return;
    setEditingTaskId(task.id);
    setEditName(task.name);
  };

  const handleSaveEdit = (projectId) => {
    if (editName.trim() && editName.trim() !== "" && onEditTask) {
      onEditTask(projectId, editingTaskId, { name: editName.trim() });
    }
    setEditingTaskId(null);
  };

  const handleKeyDown = (e, projectId) => {
    if (e.key === "Enter") handleSaveEdit(projectId);
    if (e.key === "Escape") setEditingTaskId(null);
  };

  // Filter and sort projects
  const filteredProjects = projects
    .filter((p) => p.name.toLowerCase().includes(searchQuery.toLowerCase()))
    .sort((a, b) => {
      if (sortBy === "name-asc") {
        return a.name.localeCompare(b.name);
      }
      if (sortBy === "name-desc") {
        return b.name.localeCompare(a.name);
      }
      if (sortBy === "hours-desc") {
        return getProjectTotalHours(b) - getProjectTotalHours(a);
      }
      if (sortBy === "date-newest") {
        return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
      }
      return 0;
    });

  // ==========================================
  // VIEW 2: DEDICATED PROJECT DETAIL PAGE
  // ==========================================
  if (selectedProjectId) {
    const project = projects.find((p) => p.id === selectedProjectId);
    if (!project) return null;

    return (
      <div className="p-8 max-w-5xl mx-auto w-full h-full overflow-auto no-scrollbar flex flex-col">
        <button
          onClick={() => {
            setSelectedProjectId(null);
            setDetailProjEditing(false);
            setNewTaskName("");
            setIsEditingBudget(false);
          }}
          className="text-primary-600 hover:text-blue-800 flex items-center gap-2 mb-6 font-semibold transition-colors w-fit"
        >
          <span>&larr;</span> Back to Projects
        </button>

        <div className="bg-white dark:bg-zinc-900 border border-slate-300 dark:border-zinc-700 overflow-hidden flex flex-col">
          <div className="p-6 border-b border-slate-300 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-950 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            {detailProjEditing ? (
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (
                      detailProjName.trim() &&
                      detailProjName.trim() !== project.name
                    ) {
                      onRenameProject(project.id, detailProjName.trim());
                    }
                    setDetailProjEditing(false);
                  }}
                  className="flex w-full"
                >
                  <input
                    type="text"
                    value={detailProjName}
                    onChange={(e) => setDetailProjName(e.target.value)}
                    onBlur={(e) => {
                      // Prevent onBlur if we are clicking a submit button inside the form (handled by onSubmit)
                      if (
                        detailProjName.trim() &&
                        detailProjName.trim() !== project.name
                      ) {
                        onRenameProject(project.id, detailProjName.trim());
                      }
                      setDetailProjEditing(false);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Escape") {
                        setDetailProjEditing(false);
                      }
                      // Enter is handled by the form onSubmit
                    }}
                    className="px-3 py-1 border border-slate-900 text-2xl font-black text-slate-900 dark:text-slate-100 bg-white dark:bg-zinc-900 focus:outline-none focus:ring-2 focus:ring-slate-900 w-full sm:w-64 "
                    autoFocus
                  />
                </form>
              </div>
            ) : (
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-3 group">
                  <h2 className="text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
                    {project.name}
                  </h2>
                  {writeAllowed && (
                    <button
                      onClick={() => {
                        setDetailProjEditing(true);
                        setDetailProjName(project.name);
                      }}
                      className="text-sm opacity-0 group-hover:opacity-100 transition-opacity text-slate-400 dark:text-slate-600 hover:text-primary-600 p-1"
                      title="Click to edit project name"
                    >
                      
                    </button>
                  )}
                </div>
                {writeAllowed ? (
                  <div className="mt-1">
                    <select
                      value={project.clientId || ""}
                      onChange={(e) => {
                        const val = e.target.value;
                        const selectedClient = clients?.find(c => c.id === val) || null;
                        onUpdateProject(project.id, { clientId: val || null, client: selectedClient });
                      }}
                      className="px-2 py-1 text-xs border border-slate-300 dark:border-zinc-700 focus:outline-none focus:ring-1 focus:ring-slate-900 bg-white dark:bg-zinc-900 text-slate-700 dark:text-slate-300 w-48"
                    >
                      <option value="">No Client Assigned</option>
                      {clients?.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                ) : (
                  project.client && (
                    <div className="text-xs text-slate-500 dark:text-slate-400 italic">
                      {project.client.name}
                    </div>
                  )
                )}
              </div>
            )}

            <div className="flex flex-wrap items-center gap-4 w-full sm:w-auto justify-between sm:justify-end">
              {isAdmin && (
                <button
                  onClick={() => {
                    setIsEditingBudget(!isEditingBudget);
                    setBudgetType(project.budgetType || 'NONE');
                    setBudgetLimit(project.budgetLimit || 0);
                  }}
                  className="bg-white hover:bg-slate-50 border border-slate-300 dark:border-zinc-700 text-slate-700 dark:text-slate-300 font-semibold py-1.5 px-4 text-sm transition-all active:scale-[0.98]"
                >
                  Budget Settings
                </button>
              )}
              {isAdmin && (
                <button
                  onClick={() => setAssignTeamProject(project)}
                  className="bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 font-semibold py-1.5 px-4 text-sm transition-all active:scale-[0.98] flex items-center gap-2"
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
                    />
                  </svg>
                  Assign Team
                </button>
              )}
              {writeAllowed && (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (newTaskName.trim()) {
                      onAddTask(project.id, { name: newTaskName.trim(), isBillable: newTaskBillable });
                      setNewTaskName("");
                      setNewTaskBillable(true);
                    }
                  }}
                  className="flex items-center gap-2"
                >
                  <input
                    type="text"
                    placeholder="New task name..."
                    value={newTaskName}
                    onChange={(e) => setNewTaskName(e.target.value)}
                    className="px-3 py-1.5 border border-slate-300 dark:border-zinc-700 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 bg-white dark:bg-zinc-900 text-slate-900 dark:text-slate-100 "
                  />
                  <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-400 cursor-pointer select-none">
                    <input 
                      type="checkbox" 
                      checked={newTaskBillable}
                      onChange={(e) => setNewTaskBillable(e.target.checked)}
                      className="w-3.5 h-3.5 text-primary-600 border-slate-300 dark:border-zinc-700 rounded-none focus:ring-primary-600"
                    />
                    Billable
                  </label>
                  <button
                    type="submit"
                    disabled={!newTaskName.trim()}
                    className="bg-slate-900 hover:bg-slate-900 disabled:bg-gray-150 disabled:text-slate-400 dark:text-slate-600 text-white font-semibold py-1.5 px-4 text-sm transition-all active:scale-[0.98]"
                  >
                    Add Task
                  </button>
                </form>
              )}
              <div className="text-sm font-bold text-slate-500 dark:text-slate-500 bg-white dark:bg-zinc-900 px-4 py-1.5 border border-slate-300 dark:border-zinc-700 flex items-center gap-2">
                <span>
                  Total Hours: {getProjectTotalHours(project).toFixed(2)}
                </span>
                {isAdmin && (
                  <span className="text-slate-400 dark:text-slate-600 font-normal">
                    (Your hours:{" "}
                    {Object.entries(entries)
                      .filter(
                        ([key]) =>
                          key.endsWith(`_${dbUser.id}`) &&
                          project.tasks.some((t) => key.includes(`${t.id}_`)),
                      )
                      .reduce(
                        (sum, [, hours]) => sum + (parseFloat(hours) || 0),
                        0,
                      )
                      .toFixed(2)}
                    )
                  </span>
                )}
              </div>
            </div>
          </div>

          {isEditingBudget && isAdmin && (
            <div className="p-6 border-b border-slate-300 dark:border-zinc-700 bg-slate-100 dark:bg-zinc-800">
              <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-4 uppercase tracking-wider">Project Budget Settings</h3>
              <div className="flex items-end gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Budget Type</label>
                  <select 
                    value={budgetType} 
                    onChange={e => setBudgetType(e.target.value)}
                    className="px-3 py-2 border border-slate-300 dark:border-zinc-700 focus:outline-none focus:ring-2 focus:ring-slate-900 bg-white dark:bg-zinc-900 text-slate-900 dark:text-slate-100 text-sm w-48"
                  >
                    <option value="NONE">No Budget</option>
                    <option value="HOURS">Total Hours</option>
                    <option value="CURRENCY">Total Currency (USD)</option>
                  </select>
                </div>
                {budgetType !== 'NONE' && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1">Budget Limit</label>
                    <input 
                      type="number"
                      min="0"
                      step="0.01"
                      value={budgetLimit || ""}
                      onChange={e => setBudgetLimit(e.target.value === "" ? 0 : Number(e.target.value))}
                      className="px-3 py-2 border border-slate-300 dark:border-zinc-700 focus:outline-none focus:ring-2 focus:ring-slate-900 bg-white dark:bg-zinc-900 text-slate-900 dark:text-slate-100 text-sm w-32"
                    />
                  </div>
                )}
                <button
                  onClick={async () => {
                    try {
                      await apiCall(`/api/projects/${project.id}`, 'PUT', { budgetType, budgetLimit });
                      forceSync();
                      setIsEditingBudget(false);
                      addToast("Budget settings saved successfully", "success");
                    } catch (e) {
                      addToast("Failed to save budget settings", "error");
                    }
                  }}
                  className="bg-slate-900 text-white px-4 py-2 font-semibold text-sm hover:bg-slate-800 transition-colors rounded-none"
                >
                  Save Budget
                </button>
              </div>
            </div>
          )}

          {project.budgetLimit > 0 && project.budgetType && project.budgetType !== 'NONE' && (
            <div className="p-6 border-b border-slate-300 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-950">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-3">
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Project Budget Status
                  </span>
                  <div className="text-lg font-black text-slate-900 dark:text-slate-100">
                    {(project.budgetType === 'HOURS' || project.budgetType === 'hours') ? (
                      <>
                        {getProjectTotalHours(project).toFixed(2)} / {project.budgetLimit} hrs
                        <span className="text-sm font-medium text-slate-500 ml-2">
                          ({project.budgetLimit - getProjectTotalHours(project) > 0 ? (project.budgetLimit - getProjectTotalHours(project)).toFixed(2) : '0.00'} hrs remaining)
                        </span>
                      </>
                    ) : (
                      <>
                        ${getProjectSpend(project).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} / ${project.budgetLimit.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        <span className="text-sm font-medium text-slate-500 ml-2">
                          (${Math.max(0, project.budgetLimit - getProjectSpend(project)).toLocaleString('en-US', { minimumFractionDigits: 2 })} remaining)
                        </span>
                      </>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  {(() => {
                    const ratio = (project.budgetType === 'HOURS' || project.budgetType === 'hours')
                      ? getProjectTotalHours(project) / project.budgetLimit
                      : getProjectSpend(project) / project.budgetLimit;
                    const percent = Math.round(ratio * 100);
                    const colorClass = percent >= 100 ? 'text-red-600 dark:text-red-400' : percent >= 80 ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400';
                    return (
                      <span className={`text-2xl font-black ${colorClass}`}>
                        {percent}%
                      </span>
                    );
                  })()}
                </div>
              </div>
              {(() => {
                const ratio = (project.budgetType === 'HOURS' || project.budgetType === 'hours')
                  ? getProjectTotalHours(project) / project.budgetLimit
                  : getProjectSpend(project) / project.budgetLimit;
                const percent = Math.min(100, Math.round(ratio * 100));
                const barColor = ratio >= 1 ? 'bg-red-500' : ratio >= 0.8 ? 'bg-amber-500' : 'bg-emerald-500';
                return (
                  <div className="w-full bg-slate-200 dark:bg-zinc-800 h-2.5 rounded-none-none overflow-hidden">
                    <div
                      className={`h-full rounded-none-none transition-all duration-500 ${barColor}`}
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                );
              })()}
            </div>
          )}

          <div className="p-0">
            {project.tasks.length === 0 ? (
              <div className="p-12 text-center text-gray-450 font-medium">
                No tasks added to this project yet. Use the form above to add
                your first task.
              </div>
            ) : (
              <table className="min-w-full w-full border-collapse">
                <thead>
                  <tr className="bg-white dark:bg-zinc-900 border-b border-slate-300 dark:border-zinc-700">
                    <th className="text-left py-4 px-6 text-xs font-bold text-slate-500 dark:text-slate-500 uppercase tracking-wider">
                      Task Name
                    </th>
                    {writeAllowed && (
                      <th className="text-right py-4 px-6 text-xs font-bold text-slate-500 dark:text-slate-500 uppercase tracking-wider w-48">
                        Override All (Bill)
                      </th>
                    )}
                    <th className="text-right py-4 px-6 text-xs font-bold text-slate-500 dark:text-slate-500 uppercase tracking-wider w-40">
                      Hours Logged
                    </th>
                    {writeAllowed && (
                      <th className="py-4 px-6 text-xs font-bold text-slate-500 dark:text-slate-500 uppercase tracking-wider w-24"></th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {project.tasks.map((task) => {
                    const taskHours = Object.entries(entries)
                      .filter(([key]) => key.endsWith(`_${task.id}`))
                      .reduce(
                        (sum, [, hours]) => sum + (parseFloat(hours) || 0),
                        0,
                      );

                    return (
                      <React.Fragment key={task.id}>
                        <tr className="border-b border-slate-300 dark:border-zinc-700 hover:bg-slate-50 dark:bg-zinc-950 transition-colors group">
                          {/* THE EDITABLE TASK CELL */}
                          <td
                            className="py-4 px-6 text-sm font-medium text-slate-900 dark:text-slate-100 cursor-pointer"
                            onClick={() => {
                              if (editingTaskId !== task.id)
                                handleStartEdit(task);
                            }}
                          >
                            {editingTaskId === task.id ? (
                              <input
                                ref={inputRef}
                                type="text"
                                value={editName}
                                onChange={(e) => setEditName(e.target.value)}
                                onBlur={() => handleSaveEdit(project.id)}
                                onKeyDown={(e) => handleKeyDown(e, project.id)}
                                className="w-full px-2 py-1 -ml-2 border border-slate-900 rounded-none focus:outline-none focus:ring-2 focus:ring-slate-900 bg-white dark:bg-zinc-900 text-slate-900 dark:text-slate-100"
                              />
                            ) : (
                              <div className="flex items-center gap-3">
                                <span className={`flex items-center gap-2 ${task.isBillable === false ? 'text-slate-500' : ''}`}>
                                  {task.name}
                                  {task.isBillable === false && (
                                    <span className="text-[10px] font-bold bg-slate-100 dark:bg-zinc-800 text-slate-500 px-1.5 py-0.5 rounded-none tracking-wide uppercase">Non-Billable</span>
                                  )}
                                </span>
                                {writeAllowed && (
                                  <>
                                    <span
                                      className="text-xs text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity"
                                      title="Click to edit name"
                                    >
                                      
                                    </span>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        if (onEditTask) {
                                          onEditTask(project.id, task.id, { isBillable: task.isBillable === false ? true : false });
                                        }
                                      }}
                                      className="text-xs text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity hover:text-primary-600 ml-2"
                                      title={task.isBillable === false ? "Mark as Billable" : "Mark as Non-Billable"}
                                    >
                                      {task.isBillable === false ? 'Billable' : 'Non-Billable'}
                                    </button>
                                  </>
                                )}
                              </div>
                            )}
                          </td>

                          {writeAllowed && (
                            <td className="py-4 px-6 text-right w-48">
                              <div
                                className="flex items-center justify-end gap-2"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <div className="relative">
                                  <span className="absolute left-2 top-1 text-slate-400 dark:text-slate-600 text-sm font-semibold">
                                    $
                                  </span>
                                  <input
                                    id={`bulk-override-${task.id}`}
                                    type="number"
                                    step="0.01"
                                    placeholder="Rate"
                                    className="w-20 pl-5 pr-1 py-1 text-sm border border-slate-300 dark:border-zinc-700 rounded-none focus:outline-none focus:border-slate-900 bg-white dark:bg-zinc-900 "
                                  />
                                </div>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    const val = document.getElementById(
                                      `bulk-override-${task.id}`,
                                    ).value;
                                    if (val) {
                                      handleBulkOverride(task.id, val);
                                      document.getElementById(
                                        `bulk-override-${task.id}`,
                                      ).value = "";
                                    }
                                  }}
                                  className="text-xs font-bold bg-slate-100 dark:bg-zinc-800 hover:bg-slate-900 hover:text-white text-slate-600 dark:text-slate-400 dark:text-slate-600 px-2 py-1.5 rounded-none transition-colors border border-slate-300 dark:border-zinc-700 hover:border-slate-900"
                                >
                                  Set All
                                </button>
                              </div>
                            </td>
                          )}

                          <td className="py-4 px-6 text-sm font-bold text-primary-600 text-right bg-primary-50/10">
                            {taskHours.toFixed(2)}
                          </td>

                          {writeAllowed && (
                            <td className="py-4 px-6 text-right w-24 whitespace-nowrap">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setExpandedTaskId(
                                    expandedTaskId === task.id ? null : task.id,
                                  );
                                }}
                                className="text-primary-600 hover:text-blue-800 text-xs font-bold mr-4 uppercase transition-colors p-1"
                              >
                                {expandedTaskId === task.id
                                  ? "Close Rates"
                                  : "Manage Rates"}
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (
                                    confirm(
                                      `Are you sure you want to delete the task "${task.name}"? This will delete all logged timesheet entries for this task.`,
                                    )
                                  ) {
                                    onRemoveTask(project.id, task.id);
                                  }
                                }}
                                className="text-slate-400 dark:text-slate-600 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100 p-1 rounded-none hover:bg-red-50"
                                title="Delete Task"
                              >
                                
                              </button>
                            </td>
                          )}
                        </tr>
                        {expandedTaskId === task.id && writeAllowed && (
                          <tr>
                            <td
                              colSpan={writeAllowed ? "4" : "3"}
                              className="p-0"
                            >
                              <TaskRatesPanel
                                task={task}
                                orgUsers={orgUsers}
                                taskRates={taskRates}
                                apiCall={apiCall}
                                forceSync={forceSync}
                              />
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // VIEW 1: MASTER PROJECTS LIST
  // ==========================================
  return (
    <div className="p-8 max-w-6xl mx-auto w-full h-full overflow-auto no-scrollbar flex flex-col">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 shrink-0">
        <div>
          <h1 className="text-3xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
            {activeSubTab === "Projects" ? "Active Projects" : "Client Directory"}
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-500 mt-1">
            {activeSubTab === "Projects"
              ? "Manage project configurations, tasks, and track logged hours."
              : "Manage your organization's clients to group and filter timesheets."}
          </p>
        </div>

        <div className="flex bg-slate-100 dark:bg-zinc-800 p-1 shrink-0 rounded-none-none border border-slate-300 dark:border-zinc-700">
          <button
            onClick={() => setActiveSubTab("Projects")}
            className={`px-4 py-1.5 text-xs font-bold rounded-none-none transition-all ${activeSubTab === "Projects" ? "bg-white dark:bg-zinc-900 text-slate-900 dark:text-slate-100 shadow-sm" : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"}`}
          >
            Projects
          </button>
          {writeAllowed && (
            <button
              onClick={() => setActiveSubTab("Clients")}
              className={`px-4 py-1.5 text-xs font-bold rounded-none-none transition-all ${activeSubTab === "Clients" ? "bg-white dark:bg-zinc-900 text-slate-900 dark:text-slate-100 shadow-sm" : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"}`}
            >
              Clients
            </button>
          )}
        </div>
      </div>

      {activeSubTab === "Clients" ? (
        <div className="max-w-2xl">
          <div className="bg-white dark:bg-zinc-900 border border-slate-300 dark:border-zinc-700 p-6 mb-8">
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider mb-4">Create New Client</h3>
            <div className="flex flex-col gap-3">
              <input
                type="text"
                placeholder="Client Name..."
                value={newClientName}
                onChange={(e) => setNewClientName(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 dark:border-zinc-700 focus:outline-none focus:ring-2 focus:ring-slate-900 bg-white dark:bg-zinc-900 text-slate-900 dark:text-slate-100 text-sm"
              />
              <textarea
                placeholder="Client Address (Optional)..."
                value={newClientAddress}
                onChange={(e) => setNewClientAddress(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-slate-300 dark:border-zinc-700 focus:outline-none focus:ring-2 focus:ring-slate-900 bg-white dark:bg-zinc-900 text-slate-900 dark:text-slate-100 text-sm resize-none"
              />
              <button
                onClick={() => {
                  if (newClientName.trim()) {
                    onAddClient(newClientName.trim(), newClientAddress.trim());
                    setNewClientName("");
                    setNewClientAddress("");
                  }
                }}
                disabled={!newClientName.trim()}
                className="px-6 py-2 bg-slate-900 text-white text-sm font-bold self-end disabled:opacity-50"
              >
                Add Client
              </button>
            </div>
          </div>

          <div className="bg-white dark:bg-zinc-900 border border-slate-300 dark:border-zinc-700">
            {clients?.length > 0 ? (
              <ul className="divide-y divide-slate-300 dark:divide-zinc-700">
                {clients.map(client => (
                  <li key={client.id} className="p-4 flex flex-col sm:flex-row sm:items-start justify-between gap-4 hover:bg-slate-50 dark:hover:bg-zinc-950/50">
                    {editingClientId === client.id ? (
                      <div className="flex-1 flex flex-col gap-2">
                        <input
                          type="text"
                          value={editClientName}
                          onChange={(e) => setEditClientName(e.target.value)}
                          className="w-full px-2 py-1 border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm"
                        />
                        <textarea
                          value={editClientAddress}
                          onChange={(e) => setEditClientAddress(e.target.value)}
                          rows={3}
                          className="w-full px-2 py-1 border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm resize-none"
                        />
                        <div className="flex gap-2 mt-1">
                          <button
                            onClick={() => {
                              if (editClientName.trim()) {
                                onUpdateClient(client.id, {
                                  name: editClientName.trim(),
                                  address: editClientAddress.trim()
                                });
                                setEditingClientId(null);
                              }
                            }}
                            className="px-3 py-1 bg-blue-600 text-white text-xs font-bold rounded-none"
                          >
                            Save
                          </button>
                          <button
                            onClick={() => setEditingClientId(null)}
                            className="px-3 py-1 bg-slate-200 dark:bg-zinc-800 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-none"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-1">
                            <span className="font-semibold text-slate-900 dark:text-slate-100">{client.name}</span>
                            <span className="text-xs text-slate-500 font-medium bg-slate-100 dark:bg-zinc-800 px-2 py-0.5 rounded-none">
                              {client.projects?.length || 0} Projects
                            </span>
                          </div>
                          {client.address && (
                            <div className="text-sm text-slate-500 dark:text-slate-400 whitespace-pre-wrap">
                              {client.address}
                            </div>
                          )}
                        </div>
                        {onUpdateClient && (
                          <button
                            onClick={() => {
                              setEditingClientId(client.id);
                              setEditClientName(client.name);
                              setEditClientAddress(client.address || "");
                            }}
                            className="text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 transition-colors"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                            </svg>
                          </button>
                        )}
                      </>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <div className="p-8 text-center text-slate-500 italic">No clients found.</div>
            )}
          </div>
        </div>
      ) : (
        <>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 shrink-0">

        <div className="flex flex-wrap items-center gap-3">
          {/* Search bar */}
          <div className="relative">
            <input
              type="text"
              placeholder="Search projects..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-4 py-2 border border-slate-300 dark:border-zinc-700 focus:outline-none focus:ring-2 focus:ring-slate-900 bg-white dark:bg-zinc-900 text-slate-900 dark:text-slate-100 text-sm w-64 transition-all focus:border-slate-900"
            />
            <span className="absolute left-3 top-2.5 text-slate-400 dark:text-slate-600">
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                ></path>
              </svg>
            </span>
          </div>

          {/* Sort selection */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="px-3 py-2 border border-slate-300 dark:border-zinc-700 focus:outline-none focus:ring-2 focus:ring-slate-900 bg-white dark:bg-zinc-900 text-slate-700 dark:text-slate-300 text-sm transition-all cursor-pointer"
          >
            <option value="name-asc">Name (A-Z)</option>
            <option value="name-desc">Name (Z-A)</option>
            <option value="hours-desc">Total Hours (High-Low)</option>
            <option value="date-newest">Date Created (Newest)</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-12">
        {/* INLINE CREATE PROJECT CARD */}
        {writeAllowed && (
          <div
            onClick={() => {
              if (!isCreatingProj) setIsCreatingProj(true);
            }}
            className={`bg-slate-50 dark:bg-zinc-950/50 border-2 border-dashed border-slate-300 dark:border-zinc-700 hover:border-slate-900 hover:bg-white dark:bg-zinc-900 p-6 hover: transition-all flex flex-col h-44 justify-center items-center group relative cursor-pointer ${isCreatingProj ? "cursor-default" : ""}`}
          >
            {isCreatingProj ? (
              <div
                className="w-full flex flex-col gap-3 h-full justify-between"
                onClick={(e) => e.stopPropagation()}
              >
                <div>
                  <label className="text-xs font-bold text-slate-500 dark:text-slate-500 block mb-1">
                    Create New Project
                  </label>
                  <input
                    type="text"
                    placeholder="Enter project name..."
                    value={newProjName}
                    onChange={(e) => setNewProjName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        if (newProjName.trim()) {
                          onAddProject(newProjName.trim(), newProjClientId || undefined);
                          setNewProjName("");
                          setNewProjClientId("");
                          setIsCreatingProj(false);
                        }
                      } else if (e.key === "Escape") {
                        setIsCreatingProj(false);
                      }
                    }}
                    className="w-full px-3 py-1.5 border border-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 bg-white dark:bg-zinc-900 text-slate-900 dark:text-slate-100 mb-2"
                    autoFocus
                  />
                  {!isCreatingInlineClient ? (
                    <div className="flex items-center gap-2">
                      <select
                        value={newProjClientId}
                        onChange={(e) => setNewProjClientId(e.target.value)}
                        className="w-full px-3 py-1.5 border border-slate-300 dark:border-zinc-700 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 bg-white dark:bg-zinc-900 text-slate-700 dark:text-slate-300"
                      >
                        <option value="">No Client</option>
                        {clients?.map(c => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                      </select>
                      <button
                        onClick={() => setIsCreatingInlineClient(true)}
                        className="text-xs text-primary-600 hover:text-blue-800 font-bold whitespace-nowrap"
                      >
                        + New
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 bg-slate-50 dark:bg-zinc-950 p-1.5 border border-slate-300 dark:border-zinc-700">
                      <input
                        type="text"
                        placeholder="Client Name"
                        value={newInlineClientName}
                        onChange={(e) => setNewInlineClientName(e.target.value)}
                        onKeyDown={async (e) => {
                          if (e.key === "Enter" && newInlineClientName.trim()) {
                            try {
                              const nc = await onAddClient(newInlineClientName.trim());
                              setNewProjClientId(nc.id);
                              setIsCreatingInlineClient(false);
                              setNewInlineClientName("");
                            } catch (err) { }
                          } else if (e.key === "Escape") {
                            setIsCreatingInlineClient(false);
                          }
                        }}
                        className="w-full px-2 py-1 text-xs border border-slate-300 dark:border-zinc-700 focus:outline-none bg-white dark:bg-zinc-900"
                        autoFocus
                      />
                      <button 
                        onClick={async () => {
                          if (newInlineClientName.trim()) {
                            try {
                              const nc = await onAddClient(newInlineClientName.trim());
                              setNewProjClientId(nc.id);
                              setIsCreatingInlineClient(false);
                              setNewInlineClientName("");
                            } catch (err) { }
                          }
                        }}
                        className="text-xs font-bold text-slate-900 dark:text-slate-100"
                      >
                        Save
                      </button>
                      <button onClick={() => setIsCreatingInlineClient(false)} className="text-xs text-slate-500">Cancel</button>
                    </div>
                  )}
                </div>
                <div className="flex gap-2 justify-end">
                  <button
                    onClick={() => {
                      setIsCreatingProj(false);
                      setNewProjName("");
                    }}
                    className="px-3 py-1 text-xs text-slate-500 dark:text-slate-500 hover:bg-slate-100 dark:bg-zinc-800 font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      if (newProjName.trim()) {
                        onAddProject(newProjName.trim(), newProjClientId || undefined);
                        setNewProjName("");
                        setNewProjClientId("");
                        setIsCreatingProj(false);
                      }
                    }}
                    className="px-3 py-1.5 text-xs bg-slate-900 hover:bg-slate-900 text-white font-bold "
                  >
                    Create
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center text-center">
                <span className="text-3xl text-slate-400 dark:text-slate-600 group-hover:text-primary-600 transition-all mb-2">
                  +
                </span>
                <span className="text-sm font-semibold text-slate-500 dark:text-slate-500 group-hover:text-primary-600 transition-all">
                  Create New Project
                </span>
              </div>
            )}
          </div>
        )}

        {filteredProjects.map((project) => {
          const totalHours = getProjectTotalHours(project);
          const isEditing = editingProjectId === project.id;
          const isConfirmingDelete = confirmDeleteProjectId === project.id;

          return (
            <div
              key={project.id}
              onClick={() => {
                if (!isEditing && !isConfirmingDelete) {
                  setSelectedProjectId(project.id);
                }
              }}
              className="bg-white dark:bg-zinc-900 border border-slate-300 dark:border-zinc-700 p-6 hover:border-slate-900 transition-all cursor-pointer group flex flex-col min-h-48 h-auto justify-between relative overflow-hidden"
            >
              {isConfirmingDelete ? (
                <div
                  className="flex flex-col h-full justify-between w-full"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div>
                    <h4 className="text-sm font-bold text-red-600 mb-1">
                      Delete Project
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-slate-500 leading-tight">
                      Permanently delete "{project.name}", all of its tasks, and
                      hours logged?
                    </p>
                  </div>
                  <div className="flex gap-2 justify-end">
                    <button
                      onClick={() => setConfirmDeleteProjectId(null)}
                      className="px-3 py-1 text-xs text-slate-500 dark:text-slate-500 hover:bg-slate-100 dark:bg-zinc-800 font-medium"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => {
                        onDeleteProject(project.id);
                        setConfirmDeleteProjectId(null);
                      }}
                      className="px-3 py-1 text-xs bg-red-650 hover:bg-red-700 text-white font-bold "
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ) : isEditing ? (
                <div
                  className="flex flex-col h-full justify-between w-full"
                  onClick={(e) => e.stopPropagation()}
                >
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (
                        editProjName.trim() &&
                        editProjName.trim() !== project.name
                      ) {
                        onRenameProject(project.id, editProjName.trim());
                      }
                      setEditingProjectId(null);
                    }}
                    className="flex flex-col h-full justify-between w-full"
                  >
                    <div>
                      <label className="text-xs font-bold text-slate-500 dark:text-slate-500 block mb-1">
                        Rename Project
                      </label>
                      <input
                        type="text"
                        value={editProjName}
                        onChange={(e) => setEditProjName(e.target.value)}
                        onBlur={(e) => {
                          // Only save on blur if they click outside. If they click a button, onMouseDown will handle it first.
                          if (
                            editProjName.trim() &&
                            editProjName.trim() !== project.name
                          ) {
                            onRenameProject(project.id, editProjName.trim());
                          }
                          setEditingProjectId(null);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Escape") {
                            setEditingProjectId(null);
                          }
                        }}
                        className="w-full px-2 py-1.5 border border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900 bg-white dark:bg-zinc-900 text-slate-900 dark:text-slate-100 text-sm "
                        autoFocus
                      />
                    </div>
                    <div className="flex gap-2 justify-end">
                      <button
                        type="button"
                        onMouseDown={(e) => {
                          e.preventDefault(); // Prevents input onBlur
                          setEditingProjectId(null);
                        }}
                        className="px-3 py-1 text-xs text-slate-500 dark:text-slate-500 hover:bg-slate-100 dark:bg-zinc-800 font-medium"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        onMouseDown={(e) => e.preventDefault()} // Prevents input onBlur so submit fires
                        className="px-3 py-1 text-xs bg-blue-650 hover:bg-slate-900 text-white font-bold "
                      >
                        Save
                      </button>
                    </div>
                  </form>
                </div>
              ) : (
                <>
                  <div className="flex justify-between items-start mb-1">
                    <h3
                      className="text-lg font-bold text-slate-900 dark:text-slate-100 group-hover:text-primary-600 transition-colors truncate pr-16"
                      title={project.name}
                    >
                      {project.name}
                    </h3>

                    <div
                      className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity absolute top-4 right-4"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {writeAllowed && (
                        <>
                          <button
                            onClick={() => {
                              setEditingProjectId(project.id);
                              setEditProjName(project.name);
                            }}
                            className="p-1 hover:bg-slate-100 dark:bg-zinc-800 rounded-none text-slate-400 dark:text-slate-600 hover:text-primary-600 transition-colors text-xs"
                            title="Rename Project"
                          >
                            
                          </button>
                          <button
                            onClick={() =>
                              setConfirmDeleteProjectId(project.id)
                            }
                            className="p-1 hover:bg-red-50 rounded-none text-slate-400 dark:text-slate-600 hover:text-red-600 transition-colors text-xs"
                            title="Delete Project"
                          >
                            
                          </button>
                        </>
                      )}
                      <div className="text-gray-300 group-hover:text-primary-600 transition-colors transform group-hover:translate-x-1 duration-200 ml-1">
                        <svg
                          className="w-5 h-5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2.5"
                            d="M9 5l7 7-7 7"
                          ></path>
                        </svg>
                      </div>
                    </div>
                  </div>

                  <p className="text-xs text-slate-400 dark:text-slate-600 mb-4 font-medium">
                    Created: {formatDate(project.createdAt)}
                  </p>

                  <div className="mt-auto pt-3 border-t border-slate-300 dark:border-zinc-700">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-500 dark:text-slate-500 uppercase tracking-wider">
                        {project.tasks.length} Tasks
                      </span>
                      <span className="text-sm font-black text-slate-700 dark:text-slate-300 bg-gray-150 px-3 py-1">
                        {totalHours.toFixed(2)} hrs
                      </span>
                    </div>
                    {project.budgetLimit > 0 && project.budgetType && project.budgetType !== 'NONE' && (
                      <div className="mt-2.5">
                        <div className="flex justify-between items-center text-xs mb-1">
                          <span className="text-slate-500 font-medium">
                            {(project.budgetType === 'HOURS' || project.budgetType === 'hours')
                              ? `${totalHours.toFixed(1)} / ${project.budgetLimit} hrs`
                              : `$${Math.round(getProjectSpend(project)).toLocaleString()} / $${Math.round(project.budgetLimit).toLocaleString()}`}
                          </span>
                          {(() => {
                            const ratio = (project.budgetType === 'HOURS' || project.budgetType === 'hours')
                              ? totalHours / project.budgetLimit
                              : getProjectSpend(project) / project.budgetLimit;
                            const percent = Math.round(ratio * 100);
                            const textColor = percent >= 100 ? 'text-red-600 dark:text-red-400' : percent >= 80 ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400';
                            return (
                              <span className={`font-bold ${textColor}`}>
                                {percent}%
                              </span>
                            );
                          })()}
                        </div>
                        {(() => {
                          const ratio = (project.budgetType === 'HOURS' || project.budgetType === 'hours')
                            ? totalHours / project.budgetLimit
                            : getProjectSpend(project) / project.budgetLimit;
                          const percent = Math.min(100, Math.round(ratio * 100));
                          const barColor = ratio >= 1 ? 'bg-red-500' : ratio >= 0.8 ? 'bg-amber-500' : 'bg-emerald-500';
                          return (
                            <div className="w-full bg-slate-200 dark:bg-zinc-800 h-1.5 rounded-none-none overflow-hidden">
                              <div
                                className={`h-full rounded-none-none transition-all duration-500 ${barColor}`}
                                style={{ width: `${percent}%` }}
                              />
                            </div>
                          );
                        })()}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          );
        })}

        {filteredProjects.length === 0 && (
          <div className="col-span-full p-16 text-center border-2 border-dashed border-slate-300 dark:border-zinc-700 text-slate-400 dark:text-slate-600 font-medium bg-slate-50 dark:bg-zinc-950/50">
            No projects found matching that filter.
          </div>
        )}
      </div>

      {/* Assign Team Modal */}
      {assignTeamProject && (
        <AssignTeamModal
          project={assignTeamProject}
          orgUsers={orgUsers}
          onClose={() => setAssignTeamProject(null)}
          onSave={async (projectId, userIds) => {
            try {
              await apiCall(`/api/projects/${projectId}/assignments`, "POST", {
                userIds,
              });
              forceSync();
              addToast("Assignments updated successfully", "success");
            } catch (e) {
              addToast("Failed to update assignments", "error");
            }
          }}
        />
      )}
      </>
      )}
    </div>
  );
}
