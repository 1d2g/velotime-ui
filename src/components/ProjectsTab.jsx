import React, { useState, useRef, useEffect } from 'react';
import AssignTeamModal from './AssignTeamModal';

// Permission check helper - structured to support easy permission/role restriction in the future.
const canPerformWriteActions = (dbUser) => {
  return dbUser?.role === 'admin' || dbUser?.role === 'manager';
};

const formatDate = (dateString) => {
  if (!dateString) return 'Unknown';
  const d = new Date(dateString);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

const TaskRatesPanel = ({ task, orgUsers, taskRates, apiCall, forceSync }) => {
  const [rates, setRates] = useState({});
  const [savingUserId, setSavingUserId] = useState(null);

  useEffect(() => {
    const initial = {};
    orgUsers.forEach(u => {
      const override = taskRates.find(tr => tr.taskId === task.id && tr.userId === u.id);
      initial[u.id] = {
        costRate: override?.costRate ?? '',
        billingRate: override?.billingRate ?? ''
      };
    });
    setRates(initial);
  }, [orgUsers, taskRates, task.id]);

  const handleSave = async (userId) => {
    setSavingUserId(userId);
    try {
      await apiCall(`/api/tasks/${task.id}/rates`, 'POST', {
        targetUserId: userId,
        costRate: rates[userId].costRate,
        billingRate: rates[userId].billingRate
      });
      forceSync();
    } catch (e) {
      alert("Failed to save rate override");
    } finally {
      setSavingUserId(null);
    }
  };

  if (!orgUsers || orgUsers.length === 0) return null;

  return (
    <div className="bg-blue-50/50 p-6 border-b border-gray-100 shadow-inner">
      <h4 className="text-xs font-black text-gray-500 mb-4 uppercase tracking-wider">Employee Task Rates Override</h4>
      <div className="grid gap-3 max-w-4xl max-h-96 overflow-y-auto pr-2">
        {orgUsers.map(u => {
          const hasOverride = taskRates.some(tr => tr.taskId === task.id && tr.userId === u.id);
          return (
            <div key={u.id} className="flex flex-col sm:flex-row sm:items-center justify-between bg-white p-3 rounded-lg border border-gray-200 shadow-sm gap-4">
              <div className="flex flex-col">
                <span className="font-bold text-gray-800">{u.firstName} {u.lastName} <span className="text-gray-400 font-normal">({u.email})</span></span>
              </div>
              <div className="flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-2">
                  <label className="text-xs font-bold text-gray-500 uppercase">Cost / hr</label>
                  <div className="relative">
                    <span className="absolute left-2 top-1 text-gray-400 text-sm font-semibold">$</span>
                    <input 
                      type="number"
                      step="0.01"
                      placeholder={u.defaultCostRate || "0.00"}
                      className="w-24 pl-6 pr-2 py-1 text-sm border border-gray-300 rounded font-semibold focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                      value={rates[u.id]?.costRate || ''}
                      onChange={e => setRates({ ...rates, [u.id]: { ...rates[u.id], costRate: e.target.value }})}
                    />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-xs font-bold text-gray-500 uppercase">Bill / hr</label>
                  <div className="relative">
                    <span className="absolute left-2 top-1 text-gray-400 text-sm font-semibold">$</span>
                    <input 
                      type="number"
                      step="0.01"
                      placeholder={u.defaultBillingRate || "0.00"}
                      className="w-24 pl-6 pr-2 py-1 text-sm border border-gray-300 rounded font-semibold focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                      value={rates[u.id]?.billingRate || ''}
                      onChange={e => setRates({ ...rates, [u.id]: { ...rates[u.id], billingRate: e.target.value }})}
                    />
                  </div>
                </div>
                <button
                  onClick={() => handleSave(u.id)}
                  disabled={savingUserId === u.id}
                  className={`text-xs font-bold px-3 py-1.5 rounded transition-colors whitespace-nowrap min-w-[120px] ${hasOverride ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm' : 'bg-gray-100 text-gray-600 hover:bg-gray-200 border border-gray-200'}`}
                >
                  {savingUserId === u.id ? 'Saving...' : hasOverride ? 'Update Override' : 'Set Override'}
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
  dbUser,
  orgUsers,
  taskRates,
  apiCall,
  forceSync,
  onRenameProject, 
  onDeleteProject,
  onAddProject,
  onAddTask,
  onRemoveTask,
  onEditTaskName 
}) {
  const [selectedProjectId, setSelectedProjectId] = useState(null);
  const [expandedTaskId, setExpandedTaskId] = useState(null);
  
  // Searching & Sorting State
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('name-asc');

  // New Project State
  const [isCreatingProj, setIsCreatingProj] = useState(false);
  const [newProjName, setNewProjName] = useState('');

  // Inline project renaming on Master list
  const [editingProjectId, setEditingProjectId] = useState(null);
  const [editProjName, setEditProjName] = useState('');

  // Inline project renaming on Detail view
  const [detailProjEditing, setDetailProjEditing] = useState(false);
  const [detailProjName, setDetailProjName] = useState('');

  // Inline task renaming
  const [editingTaskId, setEditingTaskId] = useState(null);
  const [editName, setEditName] = useState('');
  const inputRef = useRef(null);

  // New Task State
  const [newTaskName, setNewTaskName] = useState('');

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
  const isAdmin = dbUser?.role === 'admin';

  const handleBulkOverride = async (taskId, billingRate) => {
    try {
      await apiCall(`/api/tasks/${taskId}/rates/bulk`, 'POST', { costRate: '', billingRate });
      forceSync();
      alert("Successfully updated rate override for all users on this task.");
    } catch (e) {
      alert("Failed to bulk update rates");
    }
  };

  const getProjectTotalHours = (project) => {
    return project.tasks.reduce((total, task) => {
      const taskHours = Object.entries(entries)
        .filter(([key]) => key.endsWith(`_${task.id}`))
        .reduce((sum, [, hours]) => sum + (parseFloat(hours) || 0), 0);
      return total + taskHours;
    }, 0);
  };

  const handleStartEdit = (task) => {
    if (!writeAllowed) return;
    setEditingTaskId(task.id);
    setEditName(task.name);
  };

  const handleSaveEdit = (projectId) => {
    if (editName.trim() && editName.trim() !== '' && onEditTaskName) {
      onEditTaskName(projectId, editingTaskId, editName.trim());
    }
    setEditingTaskId(null);
  };

  const handleKeyDown = (e, projectId) => {
    if (e.key === 'Enter') handleSaveEdit(projectId);
    if (e.key === 'Escape') setEditingTaskId(null);
  };

  // Filter and sort projects
  const filteredProjects = projects
    .filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()))
    .sort((a, b) => {
      if (sortBy === 'name-asc') {
        return a.name.localeCompare(b.name);
      }
      if (sortBy === 'name-desc') {
        return b.name.localeCompare(a.name);
      }
      if (sortBy === 'hours-desc') {
        return getProjectTotalHours(b) - getProjectTotalHours(a);
      }
      if (sortBy === 'date-newest') {
        return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
      }
      return 0;
    });

  // ==========================================
  // VIEW 2: DEDICATED PROJECT DETAIL PAGE
  // ==========================================
  if (selectedProjectId) {
    const project = projects.find(p => p.id === selectedProjectId);
    if (!project) return null;

    return (
      <div className="p-8 max-w-5xl mx-auto w-full h-full overflow-auto no-scrollbar flex flex-col">
        <button
          onClick={() => {
            setSelectedProjectId(null);
            setDetailProjEditing(false);
            setNewTaskName('');
          }}
          className="text-blue-600 hover:text-blue-800 flex items-center gap-2 mb-6 font-semibold transition-colors w-fit"
        >
          <span>&larr;</span> Back to Projects
        </button>
        
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden flex flex-col">
          <div className="p-6 border-b border-gray-200 bg-gray-50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            {detailProjEditing ? (
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <form 
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (detailProjName.trim() && detailProjName.trim() !== project.name) {
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
                      if (detailProjName.trim() && detailProjName.trim() !== project.name) {
                        onRenameProject(project.id, detailProjName.trim());
                      }
                      setDetailProjEditing(false);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Escape') {
                        setDetailProjEditing(false);
                      }
                      // Enter is handled by the form onSubmit
                    }}
                    className="px-3 py-1 border border-blue-400 rounded-lg text-2xl font-black text-gray-900 dark:text-zinc-100 bg-white dark:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-blue-500 w-full sm:w-64 shadow-inner"
                    autoFocus
                  />
                </form>
              </div>
            ) : (
              <div className="flex items-center gap-3 group">
                <h2 className="text-2xl font-black text-gray-800 tracking-tight">{project.name}</h2>
                {writeAllowed && (
                  <button
                    onClick={() => {
                      setDetailProjEditing(true);
                      setDetailProjName(project.name);
                    }}
                    className="text-sm opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 hover:text-blue-600 p-1"
                    title="Click to edit project name"
                  >
                    ✏️
                  </button>
                )}
              </div>
            )}

            <div className="flex flex-wrap items-center gap-4 w-full sm:w-auto justify-between sm:justify-end">
              {isAdmin && (
                <button
                  onClick={() => setAssignTeamProject(project)}
                  className="bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 font-semibold py-1.5 px-4 rounded-lg text-sm transition-all shadow-sm active:scale-[0.98] flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
                  Assign Team
                </button>
              )}
              {writeAllowed && (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (newTaskName.trim()) {
                      onAddTask(project.id, { name: newTaskName.trim() });
                      setNewTaskName('');
                    }
                  }}
                  className="flex items-center gap-2"
                >
                  <input
                    type="text"
                    placeholder="New task name..."
                    value={newTaskName}
                    onChange={(e) => setNewTaskName(e.target.value)}
                    className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-zinc-800 text-gray-900 dark:text-zinc-100 shadow-sm"
                  />
                  <button
                    type="submit"
                    disabled={!newTaskName.trim()}
                    className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-150 disabled:text-gray-400 text-white font-semibold py-1.5 px-4 rounded-lg text-sm transition-all shadow-sm active:scale-[0.98]"
                  >
                    Add Task
                  </button>
                </form>
              )}
              <div className="text-sm font-bold text-gray-500 bg-white px-4 py-1.5 rounded-full border border-gray-200 shadow-sm flex items-center gap-2">
                <span>Total Hours: {getProjectTotalHours(project).toFixed(2)}</span>
                {isAdmin && (
                  <span className="text-gray-400 font-normal">
                    (Your hours: {Object.entries(entries).filter(([key]) => key.endsWith(`_${dbUser.id}`) && project.tasks.some(t => key.includes(`${t.id}_`))).reduce((sum, [, hours]) => sum + (parseFloat(hours) || 0), 0).toFixed(2)})
                  </span>
                )}
              </div>
            </div>
          </div>
          
          <div className="p-0">
            {project.tasks.length === 0 ? (
              <div className="p-12 text-center text-gray-450 font-medium">
                No tasks added to this project yet. Use the form above to add your first task.
              </div>
            ) : (
              <table className="min-w-full w-full border-collapse">
                <thead>
                  <tr className="bg-white border-b border-gray-200">
                    <th className="text-left py-4 px-6 text-xs font-bold text-gray-500 uppercase tracking-wider">Task Name</th>
                    {writeAllowed && <th className="text-right py-4 px-6 text-xs font-bold text-gray-500 uppercase tracking-wider w-48">Override All (Bill)</th>}
                    <th className="text-right py-4 px-6 text-xs font-bold text-gray-500 uppercase tracking-wider w-40">Hours Logged</th>
                    {writeAllowed && <th className="py-4 px-6 text-xs font-bold text-gray-500 uppercase tracking-wider w-24"></th>}
                  </tr>
                </thead>
                <tbody>
                  {project.tasks.map(task => {
                    const taskHours = Object.entries(entries)
                      .filter(([key]) => key.endsWith(`_${task.id}`))
                      .reduce((sum, [, hours]) => sum + (parseFloat(hours) || 0), 0);

                    return (
                      <React.Fragment key={task.id}>
                      <tr className="border-b border-gray-100 hover:bg-gray-50 transition-colors group">
                        
                        {/* THE EDITABLE TASK CELL */}
                        <td 
                          className="py-4 px-6 text-sm font-medium text-gray-800 cursor-pointer"
                          onClick={() => { if (editingTaskId !== task.id) handleStartEdit(task); }}
                        >
                          {editingTaskId === task.id ? (
                            <input
                              ref={inputRef}
                              type="text"
                              value={editName}
                              onChange={(e) => setEditName(e.target.value)}
                              onBlur={() => handleSaveEdit(project.id)}
                              onKeyDown={(e) => handleKeyDown(e, project.id)}
                              className="w-full px-2 py-1 -ml-2 border border-blue-400 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900"
                            />
                          ) : (
                            <div className="flex items-center gap-3">
                              <span>{task.name}</span>
                              {writeAllowed && (
                                <span className="text-xs text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity" title="Click to edit">✏️</span>
                              )}
                            </div>
                          )}
                        </td>

                        {writeAllowed && (
                          <td className="py-4 px-6 text-right w-48">
                            <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                              <div className="relative">
                                <span className="absolute left-2 top-1 text-gray-400 text-sm font-semibold">$</span>
                                <input 
                                  id={`bulk-override-${task.id}`}
                                  type="number" 
                                  step="0.01" 
                                  placeholder="Rate" 
                                  className="w-20 pl-5 pr-1 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:border-blue-500 bg-white shadow-inner" 
                                />
                              </div>
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const val = document.getElementById(`bulk-override-${task.id}`).value;
                                  if (val) {
                                    handleBulkOverride(task.id, val);
                                    document.getElementById(`bulk-override-${task.id}`).value = '';
                                  }
                                }}
                                className="text-xs font-bold bg-gray-100 hover:bg-blue-600 hover:text-white text-gray-600 px-2 py-1.5 rounded transition-colors border border-gray-200 hover:border-blue-600"
                              >
                                Set All
                              </button>
                            </div>
                          </td>
                        )}

                        <td className="py-4 px-6 text-sm font-bold text-blue-600 text-right bg-blue-50/10">
                          {taskHours.toFixed(2)}
                        </td>

                        {writeAllowed && (
                          <td className="py-4 px-6 text-right w-24 whitespace-nowrap">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setExpandedTaskId(expandedTaskId === task.id ? null : task.id);
                              }}
                              className="text-blue-600 hover:text-blue-800 text-xs font-bold mr-4 uppercase transition-colors p-1"
                            >
                              {expandedTaskId === task.id ? 'Close Rates' : 'Manage Rates'}
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                if (confirm(`Are you sure you want to delete the task "${task.name}"? This will delete all logged timesheet entries for this task.`)) {
                                  onRemoveTask(project.id, task.id);
                                }
                              }}
                              className="text-gray-400 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-50"
                              title="Delete Task"
                            >
                              🗑️
                            </button>
                          </td>
                        )}
                      </tr>
                      {expandedTaskId === task.id && writeAllowed && (
                        <tr>
                          <td colSpan={writeAllowed ? "4" : "3"} className="p-0">
                            <TaskRatesPanel task={task} orgUsers={orgUsers} taskRates={taskRates} apiCall={apiCall} forceSync={forceSync} />
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
          <h1 className="text-3xl font-black text-gray-800 dark:text-zinc-100 tracking-tight">Active Projects</h1>
          <p className="text-sm text-gray-500 dark:text-zinc-400 mt-1">Manage project configurations, tasks, and track logged hours.</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          {/* Search bar */}
          <div className="relative">
            <input
              type="text"
              placeholder="Search projects..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-4 py-2 border border-gray-200 dark:border-zinc-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-zinc-900 text-gray-800 dark:text-zinc-100 text-sm shadow-sm w-64 transition-all focus:border-blue-500"
            />
            <span className="absolute left-3 top-2.5 text-gray-400">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
            </span>
          </div>

          {/* Sort selection */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="px-3 py-2 border border-gray-200 dark:border-zinc-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-zinc-900 text-gray-700 dark:text-zinc-100 text-sm shadow-sm transition-all cursor-pointer"
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
            onClick={() => { if (!isCreatingProj) setIsCreatingProj(true); }}
            className={`bg-gray-50/50 dark:bg-zinc-900/50 border-2 border-dashed border-gray-200 dark:border-zinc-800 hover:border-blue-400 dark:hover:border-blue-500 hover:bg-white dark:hover:bg-zinc-800 rounded-xl p-6 shadow-sm hover:shadow-md transition-all flex flex-col h-44 justify-center items-center group relative cursor-pointer ${isCreatingProj ? 'cursor-default' : ''}`}
          >
            {isCreatingProj ? (
              <div className="w-full flex flex-col gap-3 h-full justify-between" onClick={(e) => e.stopPropagation()}>
                <div>
                  <label className="text-xs font-bold text-gray-500 block mb-1">Create New Project</label>
                  <input
                    type="text"
                    placeholder="Enter project name..."
                    value={newProjName}
                    onChange={(e) => setNewProjName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        if (newProjName.trim()) {
                          onAddProject(newProjName.trim());
                          setNewProjName('');
                          setIsCreatingProj(false);
                        }
                      } else if (e.key === 'Escape') {
                        setIsCreatingProj(false);
                      }
                    }}
                    className="w-full px-3 py-1.5 border border-blue-400 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-zinc-800 text-gray-900 dark:text-zinc-100"
                    autoFocus
                  />
                </div>
                <div className="flex gap-2 justify-end">
                  <button
                    onClick={() => {
                      setIsCreatingProj(false);
                      setNewProjName('');
                    }}
                    className="px-3 py-1 text-xs text-gray-500 hover:bg-gray-100 rounded-md font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      if (newProjName.trim()) {
                        onAddProject(newProjName.trim());
                        setNewProjName('');
                        setIsCreatingProj(false);
                      }
                    }}
                    className="px-3 py-1.5 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded-md font-bold shadow-sm"
                  >
                    Create
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center text-center">
                <span className="text-3xl text-gray-400 group-hover:text-blue-500 transition-all mb-2">+</span>
                <span className="text-sm font-semibold text-gray-500 group-hover:text-blue-600 transition-all">Create New Project</span>
              </div>
            )}
          </div>
        )}

        {filteredProjects.map(project => {
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
              className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl p-6 shadow-sm hover:shadow-md hover:border-blue-400 dark:hover:border-blue-500 transition-all cursor-pointer group flex flex-col h-44 relative overflow-hidden"
            >
              {isConfirmingDelete ? (
                <div className="flex flex-col h-full justify-between w-full" onClick={(e) => e.stopPropagation()}>
                  <div>
                    <h4 className="text-sm font-bold text-red-600 mb-1">Delete Project</h4>
                    <p className="text-xs text-gray-500 leading-tight">Permanently delete "{project.name}", all of its tasks, and hours logged?</p>
                  </div>
                  <div className="flex gap-2 justify-end">
                    <button
                      onClick={() => setConfirmDeleteProjectId(null)}
                      className="px-3 py-1 text-xs text-gray-500 hover:bg-gray-100 rounded-md font-medium"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => {
                        onDeleteProject(project.id);
                        setConfirmDeleteProjectId(null);
                      }}
                      className="px-3 py-1 text-xs bg-red-650 hover:bg-red-700 text-white rounded-md font-bold shadow-sm"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ) : isEditing ? (
                <div className="flex flex-col h-full justify-between w-full" onClick={(e) => e.stopPropagation()}>
                  <form 
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (editProjName.trim() && editProjName.trim() !== project.name) {
                        onRenameProject(project.id, editProjName.trim());
                      }
                      setEditingProjectId(null);
                    }}
                    className="flex flex-col h-full justify-between w-full"
                  >
                    <div>
                      <label className="text-xs font-bold text-gray-500 block mb-1">Rename Project</label>
                      <input
                        type="text"
                        value={editProjName}
                        onChange={(e) => setEditProjName(e.target.value)}
                        onBlur={(e) => {
                          // Only save on blur if they click outside. If they click a button, onMouseDown will handle it first.
                          if (editProjName.trim() && editProjName.trim() !== project.name) {
                            onRenameProject(project.id, editProjName.trim());
                          }
                          setEditingProjectId(null);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Escape') {
                            setEditingProjectId(null);
                          }
                        }}
                        className="w-full px-2 py-1.5 border border-blue-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-zinc-800 text-gray-900 dark:text-zinc-100 text-sm shadow-sm"
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
                        className="px-3 py-1 text-xs text-gray-500 hover:bg-gray-100 rounded-md font-medium"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        onMouseDown={(e) => e.preventDefault()} // Prevents input onBlur so submit fires
                        className="px-3 py-1 text-xs bg-blue-650 hover:bg-blue-700 text-white rounded-md font-bold shadow-sm"
                      >
                        Save
                      </button>
                    </div>
                  </form>
                </div>
              ) : (
                <>
                  <div className="flex justify-between items-start mb-1">
                    <h3 className="text-lg font-bold text-gray-800 dark:text-zinc-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors truncate pr-16" title={project.name}>
                      {project.name}
                    </h3>
                    
                    <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity absolute top-4 right-4" onClick={(e) => e.stopPropagation()}>
                      {writeAllowed && (
                        <>
                          <button
                            onClick={() => {
                              setEditingProjectId(project.id);
                              setEditProjName(project.name);
                            }}
                            className="p-1 hover:bg-gray-100 rounded text-gray-400 hover:text-blue-600 transition-colors text-xs"
                            title="Rename Project"
                          >
                            ✏️
                          </button>
                          <button
                            onClick={() => setConfirmDeleteProjectId(project.id)}
                            className="p-1 hover:bg-red-50 rounded text-gray-400 hover:text-red-600 transition-colors text-xs"
                            title="Delete Project"
                          >
                            🗑️
                          </button>
                        </>
                      )}
                      <div className="text-gray-300 group-hover:text-blue-500 transition-colors transform group-hover:translate-x-1 duration-200 ml-1">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7"></path></svg>
                      </div>
                    </div>
                  </div>

                  <p className="text-xs text-gray-400 dark:text-zinc-500 mb-4 font-medium">
                    Created: {formatDate(project.createdAt)}
                  </p>

                  <div className="flex items-center justify-between mt-auto pt-3 border-t border-gray-100 dark:border-zinc-800">
                    <span className="text-xs font-semibold text-gray-500 dark:text-zinc-400 uppercase tracking-wider">{project.tasks.length} Tasks</span>
                    <span className="text-sm font-black text-gray-700 dark:text-zinc-300 bg-gray-150 dark:bg-zinc-800 px-3 py-1 rounded-md shadow-sm">
                      {totalHours.toFixed(2)} hrs
                    </span>
                  </div>
                </>
              )}
            </div>
          );
        })}

        {filteredProjects.length === 0 && (
          <div className="col-span-full p-16 text-center border-2 border-dashed border-gray-200 rounded-xl text-gray-400 font-medium bg-gray-50/50">
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
              await apiCall(`/api/projects/${projectId}/assignments`, 'POST', { userIds });
              forceSync();
              setAssignTeamProject(null);
            } catch (err) {
              alert("Failed to update assignments");
            }
          }}
        />
      )}
    </div>
  );
}