import React, { useState, useMemo } from 'react';
import { useToast } from '../contexts/ToastContext';
import { Check, X, Clock, AlertTriangle, MessageSquare, Eye, ChevronDown, ChevronUp, ArrowRight, FileText, Unlock } from 'lucide-react';

export default function ApprovalsTab({
  dbUser,
  orgUsers,
  submissions,
  apiCall,
  forceSync,
  onViewTimesheet,
  projects = [],
  entries = {},
  notes = {},
  dates = [],
  rawEntries = []
}) {
  const { addToast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);
  const [rejectNote, setRejectNote] = useState({});
  const [expandedSubId, setExpandedSubId] = useState(null);

  const toggleExpand = (id) => {
    setExpandedSubId((prev) => (prev === id ? null : id));
  };

  const handleUpdateStatus = async (id, status) => {
    setIsProcessing(true);
    try {
      const note = status === 'rejected' ? rejectNote[id] : null;
      await apiCall(`/api/timesheet-submissions/${id}/status`, 'PUT', { status, note });
      addToast(`Timesheet ${status} successfully!`, 'success');
      forceSync();
    } catch (e) {
      // apiCall handles error toasts internally
    } finally {
      setIsProcessing(false);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'approved':
        return (
          <span className="px-2 py-0.5 bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 text-xs font-bold uppercase tracking-wider flex items-center gap-1">
            <Check size={12} /> Approved
          </span>
        );
      case 'rejected':
        return (
          <span className="px-2 py-0.5 bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 text-xs font-bold uppercase tracking-wider flex items-center gap-1">
            <X size={12} /> Rejected
          </span>
        );
      case 'submitted':
        return (
          <span className="px-2 py-0.5 bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 text-xs font-bold uppercase tracking-wider flex items-center gap-1">
            <Clock size={12} /> Pending
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 bg-slate-100 text-slate-700 dark:bg-zinc-800 dark:text-slate-400 text-xs font-bold uppercase tracking-wider">
            Draft
          </span>
        );
    }
  };

  // Helper to extract breakdown rows for an expanded submission
  const getSubmissionBreakdown = (userId) => {
    if (!userId) return [];
    
    // Check rawEntries first
    const userRaw = (rawEntries || []).filter((r) => r.userId === userId && Number(r.hours) > 0);
    if (userRaw.length > 0) {
      return userRaw.map((r) => {
        let projName = "Project";
        let taskName = "Task";
        for (const p of projects || []) {
          const t = (p.tasks || []).find((t) => t.id === r.taskId);
          if (t) {
            projName = p.name;
            taskName = t.name;
            break;
          }
        }
        return {
          id: r.id || `${r.taskId}_${r.dateId}`,
          projectName: projName,
          taskName: taskName,
          hours: Number(r.hours),
          isBillable: r.isBillable !== false,
          note: r.note || "",
        };
      });
    }

    // Fallback: parse from entries dictionary with prefix `${userId}_`
    const breakdown = [];
    const prefix = `${userId}_`;
    for (const [key, hoursVal] of Object.entries(entries || {})) {
      if (key.startsWith(prefix) && Number(hoursVal) > 0) {
        const parts = key.substring(prefix.length).split("_");
        // format is dateId_taskId (e.g. 2026-10-05_guest_t2_a)
        const dateId = parts[0];
        const taskId = parts.slice(1).join("_");
        let projName = "Project";
        let taskName = "Task";
        let isBillable = true;
        for (const p of projects || []) {
          const t = (p.tasks || []).find((tk) => tk.id === taskId);
          if (t) {
            projName = p.name;
            taskName = t.name;
            isBillable = t.isBillable !== false;
            break;
          }
        }
        breakdown.push({
          id: key,
          projectName: projName,
          taskName: taskName,
          hours: Number(hoursVal),
          isBillable: isBillable,
          note: (notes && notes[key]) || "",
        });
      }
    }
    return breakdown;
  };

  if (!dbUser || (dbUser.role !== 'admin' && dbUser.role !== 'manager')) {
    return <div className="p-8 text-center text-slate-500">Access Denied</div>;
  }

  const safeSubmissions = Array.isArray(submissions) ? submissions : [];
  const pendingSubmissions = safeSubmissions.filter((s) => s.status === 'submitted');
  const pastSubmissions = safeSubmissions.filter((s) => s.status !== 'submitted');

  return (
    <div className="flex-1 overflow-auto bg-slate-50 dark:bg-[#111111] p-4 sm:p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        
        <div className="flex justify-between items-end">
          <div>
            <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
              Timesheet Approvals
            </h1>
            <p className="text-slate-500 dark:text-zinc-400 mt-2 text-sm">
              Review, inspect, and approve submitted timesheets to lock them for invoicing.
            </p>
          </div>
        </div>

        {pendingSubmissions.length > 0 && (
          <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 overflow-hidden shadow-sm">
            <div className="px-6 py-4 border-b border-slate-200 dark:border-zinc-800 bg-amber-50/50 dark:bg-amber-900/10">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <AlertTriangle className="text-amber-500" size={20} />
                Needs Review ({pendingSubmissions.length})
              </h2>
            </div>
            <div className="divide-y divide-slate-100 dark:divide-zinc-800/50">
              {pendingSubmissions.map((sub) => {
                const isExpanded = expandedSubId === sub.id;
                const breakdownRows = isExpanded ? getSubmissionBreakdown(sub.userId) : [];

                return (
                  <div key={sub.id} className="p-6 transition-colors hover:bg-slate-50/60 dark:hover:bg-zinc-800/30">
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center flex-wrap gap-2.5 mb-1.5">
                          <span className="font-bold text-slate-900 dark:text-slate-100 text-lg">
                            {sub.user?.firstName} {sub.user?.lastName}
                          </span>
                          {getStatusBadge(sub.status)}
                          
                          {/* Direct View Timesheet Action */}
                          <button
                            type="button"
                            onClick={() => onViewTimesheet?.(sub.userId, sub.weekStartDate)}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/60 border border-rose-200 dark:border-rose-800/60 transition-colors cursor-pointer group shadow-2xs"
                            title={`Inspect ${sub.user?.firstName}'s full timesheet in the matrix`}
                          >
                            <Eye size={13} className="text-rose-500 group-hover:scale-110 transition-transform" />
                            <span>View Timesheet</span>
                          </button>
                        </div>

                        <div className="text-xs sm:text-sm text-slate-500 dark:text-zinc-400 flex flex-wrap items-center gap-x-3 gap-y-1">
                          <span>
                            Week of: <strong className="text-slate-800 dark:text-slate-200">{sub.weekStartDate}</strong>
                          </span>
                          <span>•</span>
                          <span>
                            Total: <strong className="text-slate-800 dark:text-slate-200">{sub.totalHours || "40.0"} hrs</strong>
                          </span>
                          <span>•</span>
                          <span>
                            Billable: <strong className="text-slate-800 dark:text-slate-200">{sub.billableHours || sub.totalHours || "37.5"} hrs</strong>
                          </span>
                        </div>

                        {sub.note && (
                          <div className="text-xs text-slate-600 dark:text-zinc-400 mt-2 bg-slate-100 dark:bg-zinc-800/80 px-3 py-1.5 border-l-2 border-rose-500 font-mono">
                            {sub.note}
                          </div>
                        )}

                        {/* Inline quick breakdown toggle */}
                        <div className="mt-3">
                          <button
                            type="button"
                            onClick={() => toggleExpand(sub.id)}
                            className="text-xs font-semibold text-slate-600 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-zinc-100 inline-flex items-center gap-1.5 cursor-pointer transition-colors"
                          >
                            {isExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                            <span>{isExpanded ? "Hide Hours Breakdown" : "Quick Hours Breakdown"}</span>
                          </button>
                        </div>
                      </div>

                      {/* Approval Actions */}
                      <div className="flex flex-col gap-2 min-w-[260px] sm:w-72">
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => handleUpdateStatus(sub.id, 'approved')}
                            disabled={isProcessing}
                            className="flex-1 bg-green-600 hover:bg-green-700 text-white px-4 py-2 font-bold text-xs uppercase tracking-wider transition-colors disabled:opacity-50 cursor-pointer shadow-sm flex items-center justify-center gap-1"
                          >
                            <Check size={14} />
                            <span>Approve</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleUpdateStatus(sub.id, 'rejected')}
                            disabled={isProcessing}
                            className="flex-1 bg-white hover:bg-red-50 text-red-600 border border-slate-300 dark:border-zinc-700 dark:bg-zinc-800 dark:hover:bg-red-900/30 px-4 py-2 font-bold text-xs uppercase tracking-wider transition-colors disabled:opacity-50 cursor-pointer flex items-center justify-center gap-1"
                          >
                            <X size={14} />
                            <span>Reject</span>
                          </button>
                        </div>
                        <input
                          type="text"
                          placeholder="Reason for rejection (optional)"
                          className="text-xs w-full bg-slate-50 dark:bg-[#111111] border border-slate-200 dark:border-zinc-800 px-3 py-1.5 focus:outline-none focus:border-rose-500 dark:text-white"
                          value={rejectNote[sub.id] || ''}
                          onChange={(e) => setRejectNote({ ...rejectNote, [sub.id]: e.target.value })}
                        />
                      </div>
                    </div>

                    {/* Expandable Breakdown Drawer */}
                    {isExpanded && (
                      <div className="mt-4 pt-4 border-t border-slate-200 dark:border-zinc-800 bg-slate-50/70 dark:bg-zinc-950/40 p-4 rounded-none">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-bold text-slate-700 dark:text-zinc-300 uppercase tracking-wider flex items-center gap-1.5">
                            <FileText size={13} className="text-rose-500" />
                            Logged Tasks Breakdown ({sub.user?.firstName} {sub.user?.lastName})
                          </span>
                          <button
                            type="button"
                            onClick={() => onViewTimesheet?.(sub.userId, sub.weekStartDate)}
                            className="text-xs font-bold text-rose-600 dark:text-rose-400 hover:underline flex items-center gap-1 cursor-pointer"
                          >
                            <span>Open in Full Timesheet Matrix</span>
                            <ArrowRight size={12} />
                          </button>
                        </div>

                        {breakdownRows.length === 0 ? (
                          <div className="text-xs text-slate-400 py-3 text-center">
                            No granular task rows logged for this week.
                          </div>
                        ) : (
                          <div className="overflow-x-auto border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
                            <table className="w-full text-left text-xs">
                              <thead>
                                <tr className="border-b border-slate-200 dark:border-zinc-800 bg-slate-100/70 dark:bg-zinc-800/60 font-semibold text-slate-600 dark:text-zinc-400">
                                  <th className="py-2 px-3">Project</th>
                                  <th className="py-2 px-3">Task</th>
                                  <th className="py-2 px-3">Note / Memo</th>
                                  <th className="py-2 px-3 text-center">Billable</th>
                                  <th className="py-2 px-3 text-right">Hours</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100 dark:divide-zinc-800/50">
                                {breakdownRows.map((row) => (
                                  <tr key={row.id} className="hover:bg-slate-50/50 dark:hover:bg-zinc-800/40">
                                    <td className="py-2 px-3 font-semibold text-slate-800 dark:text-zinc-200">
                                      {row.projectName}
                                    </td>
                                    <td className="py-2 px-3 text-slate-700 dark:text-zinc-300">
                                      {row.taskName}
                                    </td>
                                    <td className="py-2 px-3 text-slate-500 dark:text-zinc-400 italic max-w-xs truncate">
                                      {row.note || "—"}
                                    </td>
                                    <td className="py-2 px-3 text-center">
                                      {row.isBillable ? (
                                        <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase">
                                          Billable
                                        </span>
                                      ) : (
                                        <span className="text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase">
                                          Non-billable
                                        </span>
                                      )}
                                    </td>
                                    <td className="py-2 px-3 text-right font-mono font-bold text-slate-900 dark:text-white">
                                      {row.hours.toFixed(1)}h
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 overflow-hidden shadow-sm">
          <div className="px-6 py-4 border-b border-slate-200 dark:border-zinc-800">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">Past Submissions</h2>
          </div>
          {pastSubmissions.length === 0 ? (
            <div className="p-8 text-center text-slate-500 dark:text-zinc-500">
              No historical submissions found.
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-zinc-800/50">
              {pastSubmissions.map((sub) => (
                <div key={sub.id} className="px-6 py-4 flex items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-slate-900 dark:text-slate-100">
                        {sub.user?.firstName} {sub.user?.lastName}
                      </span>
                      <button
                        type="button"
                        onClick={() => onViewTimesheet?.(sub.userId, sub.weekStartDate)}
                        className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-bold text-slate-600 dark:text-zinc-400 hover:text-rose-500 dark:hover:text-rose-400 bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 transition-colors cursor-pointer"
                        title={`View historical timesheet for ${sub.user?.firstName}`}
                      >
                        <Eye size={12} />
                        <span>View Timesheet</span>
                      </button>
                    </div>
                    <div className="text-sm text-slate-500 dark:text-zinc-400">
                      Week of {sub.weekStartDate}
                      {sub.totalHours && ` • ${sub.totalHours} hrs`}
                    </div>
                    {sub.note && (
                      <div className="text-xs text-red-500 mt-1 flex items-center gap-1">
                        <MessageSquare size={10} /> {sub.note}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {getStatusBadge(sub.status)}
                    {sub.status === 'approved' && (
                      <button
                        type="button"
                        onClick={() => handleUpdateStatus(sub.id, 'draft')}
                        disabled={isProcessing}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-amber-700 bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/40 dark:text-amber-400 border border-amber-300 dark:border-amber-800 transition-colors cursor-pointer"
                        title="Unlock timesheet and reopen for employee revisions"
                      >
                        <Unlock size={12} />
                        <span>Unlock Timesheet</span>
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
