import React, { useState } from 'react';
import { useToast } from '../contexts/ToastContext';
import { Check, X, Clock, AlertTriangle, MessageSquare } from 'lucide-react';

export default function ApprovalsTab({ dbUser, orgUsers, submissions, apiCall, forceSync }) {
  const { addToast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);
  const [rejectNote, setRejectNote] = useState({});

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
        return <span className="px-2 py-1 bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 rounded text-xs font-bold uppercase tracking-wider flex items-center gap-1"><Check size={12} /> Approved</span>;
      case 'rejected':
        return <span className="px-2 py-1 bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 rounded text-xs font-bold uppercase tracking-wider flex items-center gap-1"><X size={12} /> Rejected</span>;
      case 'submitted':
        return <span className="px-2 py-1 bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 rounded text-xs font-bold uppercase tracking-wider flex items-center gap-1"><Clock size={12} /> Pending</span>;
      default:
        return <span className="px-2 py-1 bg-slate-100 text-slate-700 dark:bg-zinc-800 dark:text-slate-400 rounded text-xs font-bold uppercase tracking-wider">Draft</span>;
    }
  };

  if (!dbUser || (dbUser.role !== 'admin' && dbUser.role !== 'manager')) {
    return <div className="p-8 text-center">Access Denied</div>;
  }

  const pendingSubmissions = submissions.filter(s => s.status === 'submitted');
  const pastSubmissions = submissions.filter(s => s.status !== 'submitted');

  return (
    <div className="flex-1 overflow-auto bg-slate-50 dark:bg-[#111111] p-4 sm:p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        
        <div className="flex justify-between items-end">
          <div>
            <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
              Timesheet Approvals
            </h1>
            <p className="text-slate-500 dark:text-zinc-400 mt-2">
              Review and approve submitted timesheets to lock them for invoicing.
            </p>
          </div>
        </div>

        {pendingSubmissions.length > 0 && (
          <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl overflow-hidden shadow-sm">
            <div className="px-6 py-4 border-b border-slate-200 dark:border-zinc-800 bg-amber-50/50 dark:bg-amber-900/10">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <AlertTriangle className="text-amber-500" size={20} />
                Needs Review ({pendingSubmissions.length})
              </h2>
            </div>
            <div className="divide-y divide-slate-100 dark:divide-zinc-800/50">
              {pendingSubmissions.map(sub => (
                <div key={sub.id} className="p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-3 mb-1">
                      <span className="font-bold text-slate-900 dark:text-slate-100 text-lg">
                        {sub.user?.firstName} {sub.user?.lastName}
                      </span>
                      {getStatusBadge(sub.status)}
                    </div>
                    <div className="text-sm text-slate-500 dark:text-zinc-400">
                      Week of: <span className="font-semibold text-slate-700 dark:text-slate-300">{sub.weekStartDate}</span>
                    </div>
                  </div>
                  <div className="flex flex-col gap-2 min-w-[250px]">
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleUpdateStatus(sub.id, 'approved')}
                        disabled={isProcessing}
                        className="flex-1 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-semibold transition-colors disabled:opacity-50"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => handleUpdateStatus(sub.id, 'rejected')}
                        disabled={isProcessing}
                        className="flex-1 bg-white hover:bg-red-50 text-red-600 border border-slate-200 dark:border-zinc-700 dark:bg-zinc-800 dark:hover:bg-red-900/30 px-4 py-2 rounded-lg font-semibold transition-colors disabled:opacity-50"
                      >
                        Reject
                      </button>
                    </div>
                    <input
                      type="text"
                      placeholder="Reason for rejection (optional)"
                      className="text-sm w-full bg-slate-50 dark:bg-[#111111] border border-slate-200 dark:border-zinc-800 rounded-md px-3 py-1.5 focus:outline-none focus:border-primary-500 dark:text-white"
                      value={rejectNote[sub.id] || ''}
                      onChange={(e) => setRejectNote({...rejectNote, [sub.id]: e.target.value})}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl overflow-hidden shadow-sm">
          <div className="px-6 py-4 border-b border-slate-200 dark:border-zinc-800">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">Past Submissions</h2>
          </div>
          {pastSubmissions.length === 0 ? (
            <div className="p-8 text-center text-slate-500 dark:text-zinc-500">
              No historical submissions found.
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-zinc-800/50">
              {pastSubmissions.map(sub => (
                <div key={sub.id} className="px-6 py-4 flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-slate-900 dark:text-slate-100">
                      {sub.user?.firstName} {sub.user?.lastName}
                    </div>
                    <div className="text-sm text-slate-500 dark:text-zinc-400">
                      Week of {sub.weekStartDate}
                    </div>
                    {sub.note && (
                      <div className="text-xs text-red-500 mt-1 flex items-center gap-1">
                        <MessageSquare size={10} /> {sub.note}
                      </div>
                    )}
                  </div>
                  <div>
                    {getStatusBadge(sub.status)}
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
