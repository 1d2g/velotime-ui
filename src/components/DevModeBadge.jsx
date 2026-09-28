import React, { useState } from 'react';

export default function DevModeBadge({
  isAuthorizedDev,
  isDevModeActive,
  onToggle,
  user,
  dbUser
}) {
  const [isOpen, setIsOpen] = useState(false);

  if (!isAuthorizedDev) return null;

  return (
    <div className="relative inline-block text-left select-none">
      {/* Dev Mode Pill Trigger */}
      <button
        onClick={() => setIsOpen(prev => !prev)}
        className={`flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-mono font-bold tracking-wider rounded border transition-colors cursor-pointer ${
          isDevModeActive
            ? 'bg-slate-900 text-slate-100 border-slate-700 hover:bg-slate-800 dark:bg-zinc-800 dark:border-zinc-600 dark:text-zinc-100'
            : 'bg-slate-100 text-slate-500 border-slate-300 hover:bg-slate-200 dark:bg-zinc-900 dark:border-zinc-800 dark:text-zinc-500'
        }`}
        title="Developer Mode Console (Devs Only)"
      >
        <span
          className={`w-2 h-2 rounded-full ${
            isDevModeActive ? 'bg-emerald-400 animate-pulse' : 'bg-slate-400'
          }`}
        />
        <span>DEV {isDevModeActive ? 'ON' : 'OFF'}</span>
      </button>

      {/* Popover Console */}
      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-zinc-900 border border-slate-300 dark:border-zinc-700 shadow-2xl rounded-lg p-4 z-50 text-xs font-sans text-slate-800 dark:text-slate-200">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-zinc-800 pb-3 mb-3">
              <div>
                <div className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                  Developer Mode Console
                </div>
                <div className="text-[10px] text-slate-500 dark:text-slate-400 font-mono mt-0.5">
                  Restricted: Clerk Cryptographic Identity
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 p-1"
                aria-label="Close"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Auth Authorization Context */}
            <div className="bg-slate-50 dark:bg-zinc-800/60 p-2.5 rounded border border-slate-200 dark:border-zinc-700 mb-3 text-[11px]">
              <div className="font-semibold text-slate-700 dark:text-slate-300 mb-1">Authenticated Account:</div>
              <div className="text-slate-600 dark:text-slate-400 font-mono text-[10px] break-words">
                {user?.primaryEmailAddress?.emailAddress || user?.id || 'Authenticated Developer'}
              </div>
            </div>

            {/* Master Toggle */}
            <div className="flex items-center justify-between py-2 border-b border-slate-200 dark:border-zinc-800 mb-3">
              <span className="font-semibold text-slate-800 dark:text-slate-200">
                Dev Features Active
              </span>
              <button
                onClick={onToggle}
                className={`px-3 py-1 text-[11px] font-bold rounded transition-colors ${
                  isDevModeActive
                    ? 'bg-emerald-600 text-white hover:bg-emerald-500'
                    : 'bg-slate-200 text-slate-700 hover:bg-slate-300 dark:bg-zinc-700 dark:text-zinc-200'
                }`}
              >
                {isDevModeActive ? 'Enabled' : 'Disabled'}
              </button>
            </div>

            {/* Feature Flags Section */}
            <div className="space-y-1.5 mb-3 text-[11px]">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1">
                Active Beta Modules
              </div>
              <div className="flex items-center justify-between py-0.5 text-slate-700 dark:text-slate-300">
                <span>Migration & Import Wizard</span>
                <span className="font-mono text-emerald-600 font-bold">ACTIVE</span>
              </div>
              <div className="flex items-center justify-between py-0.5 text-slate-700 dark:text-slate-300">
                <span>Harvest & Toggl Importers</span>
                <span className="font-mono text-emerald-600 font-bold">READY</span>
              </div>
            </div>

            {/* Diagnostic Identity Footprint */}
            <div className="border-t border-slate-200 dark:border-zinc-800 pt-2 text-[10px] text-slate-400 font-mono space-y-0.5">
              <div>Clerk ID: {user?.id?.slice(0, 18)}...</div>
              <div>Role: {dbUser?.role || 'employee'}</div>
              <div>Org: {dbUser?.organization?.name || 'Workspace'}</div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
