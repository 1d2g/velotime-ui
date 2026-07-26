import React, { useState, useEffect } from 'react';

export default function AssignTeamModal({ project, orgUsers, onClose, onSave }) {
  const [assignedIds, setAssignedIds] = useState(new Set());
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (project?.assignments) {
      setAssignedIds(new Set(project.assignments.map(a => a.userId)));
    }
  }, [project]);

  const handleToggle = (userId) => {
    const next = new Set(assignedIds);
    if (next.has(userId)) next.delete(userId);
    else next.add(userId);
    setAssignedIds(next);
  };

  const handleAssignAll = () => setAssignedIds(new Set(orgUsers.map(u => u.id)));
  const handleAssignNone = () => setAssignedIds(new Set());

  const handleSave = async () => {
    setIsSaving(true);
    await onSave(project.id, Array.from(assignedIds));
    setIsSaving(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
      <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-2xl w-full max-w-md flex flex-col border border-gray-200 dark:border-zinc-800 max-h-[90vh]">
        <div className="p-6 border-b border-gray-100 dark:border-zinc-800 shrink-0">
          <h2 className="text-xl font-bold text-gray-900 dark:text-zinc-100">Assign Team</h2>
          <p className="text-sm text-gray-500 dark:text-zinc-400 mt-1">Select who can view and log time for <strong>{project.name}</strong>.</p>
        </div>
        
        <div className="p-4 border-b border-gray-100 dark:border-zinc-800 flex items-center justify-between bg-gray-50 dark:bg-zinc-800/50 shrink-0">
          <span className="text-sm font-semibold text-gray-600 dark:text-zinc-300">Quick Select:</span>
          <div className="flex gap-2">
            <button onClick={handleAssignAll} className="text-xs px-3 py-1.5 rounded bg-blue-100 text-blue-700 hover:bg-blue-200 dark:bg-blue-900/40 dark:text-blue-300 font-bold transition-colors">Assign All</button>
            <button onClick={handleAssignNone} className="text-xs px-3 py-1.5 rounded bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-zinc-700 dark:text-zinc-300 font-bold transition-colors">Assign None</button>
          </div>
        </div>

        <div className="p-4 overflow-y-auto flex-1 flex flex-col gap-2">
          {orgUsers.map(u => (
            <label key={u.id} className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-zinc-800 border border-transparent hover:border-gray-200 dark:hover:border-zinc-700 cursor-pointer transition-all">
              <input 
                type="checkbox" 
                checked={assignedIds.has(u.id)}
                onChange={() => handleToggle(u.id)}
                className="w-5 h-5 text-blue-600 rounded border-gray-300 focus:ring-blue-500 bg-white"
              />
              <div className="flex flex-col">
                <span className="font-bold text-gray-800 dark:text-zinc-200 text-sm">{u.firstName} {u.lastName}</span>
                <span className="text-xs text-gray-500 dark:text-zinc-400">{u.email}</span>
              </div>
            </label>
          ))}
          {orgUsers.length === 0 && (
            <p className="text-center text-gray-500 text-sm py-4">No team members found in this organization.</p>
          )}
        </div>

        <div className="p-6 border-t border-gray-100 dark:border-zinc-800 flex justify-end gap-3 bg-gray-50 dark:bg-zinc-800/30 rounded-b-xl shrink-0">
          <button onClick={onClose} disabled={isSaving} className="px-4 py-2 font-semibold text-gray-600 hover:text-gray-800 dark:text-zinc-300 dark:hover:text-zinc-100 transition-colors">Cancel</button>
          <button onClick={handleSave} disabled={isSaving} className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold rounded-lg shadow-sm transition-all flex items-center gap-2">
            {isSaving && (
              <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            )}
            {isSaving ? 'Saving...' : 'Save Assignments'}
          </button>
        </div>
      </div>
    </div>
  );
}
