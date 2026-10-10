import React from "react";
import { useClerk, useUser } from "@clerk/clerk-react";
import { ShieldAlert, ArrowLeft, LogOut } from "lucide-react";

export default function AccessDenied({ userEmail }) {
  const { signOut } = useClerk();
  const { user } = useUser();

  const handleSignOut = async () => {
    try {
      await signOut();
      window.location.reload();
    } catch (e) {
      console.error("Sign out error:", e);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gray-200 dark:bg-zinc-950 text-slate-900 dark:text-slate-100 font-sans p-4">
      <div className="w-full max-w-md bg-white dark:bg-zinc-900 border border-slate-300 dark:border-zinc-700 p-8 shadow-sm flex flex-col items-center text-center">
        {/* Brand */}
        <div className="font-black text-xl text-slate-900 dark:text-slate-100 tracking-tighter flex items-center gap-2 mb-4">
          <svg className="w-6 h-6 shrink-0" viewBox="0 0 200 200" fill="none">
            <rect width="200" height="200" fill="#0F172A" />
            <path d="M 60 48 L 140 48 L 155 63 L 155 72 H 45 V 63 Z" fill="#F43F5E" />
            <path d="M 90 72 H 110 V 94 H 90 Z" fill="#F43F5E" />
            <path d="M 45 94 H 68 L 100 132 L 132 94 H 155 L 110 148 C 105 153 95 153 90 148 Z" fill="#FFFFFF" />
          </svg>
          <span>
            VELO<span className="text-rose-600">TIME</span>
          </span>
          <span className="ml-1 px-2 py-0.5 text-[10px] font-mono font-bold tracking-widest uppercase bg-slate-100 dark:bg-zinc-800 border border-slate-300 dark:border-zinc-700 text-slate-600 dark:text-slate-300">
            CONTROL
          </span>
        </div>

        {/* Shield Icon */}
        <div className="w-12 h-12 bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-800 flex items-center justify-center mb-4 text-rose-600 dark:text-rose-400">
          <ShieldAlert className="w-6 h-6" />
        </div>

        <span className="text-[10px] font-mono font-bold tracking-wider uppercase text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 px-2 py-0.5 mb-3">
          Security Restriction 403
        </span>

        <h1 className="text-base font-bold text-slate-900 dark:text-white tracking-tight mb-2">
          Mission Control Restricted
        </h1>

        <p className="text-xs text-slate-600 dark:text-zinc-400 leading-relaxed mb-6">
          This dashboard is strictly restricted to founder clearance. Your active signed-in identity does not have administrative access.
        </p>

        {/* Current Identity Details */}
        <div className="w-full bg-slate-50 dark:bg-zinc-950 border border-slate-300 dark:border-zinc-800 p-3.5 mb-6 text-left">
          <div className="text-[10px] font-mono uppercase tracking-wider text-slate-500 dark:text-zinc-500 mb-1">
            Current Authenticated Account
          </div>
          <div className="text-xs font-mono font-semibold text-slate-900 dark:text-zinc-200 truncate flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-rose-600 shrink-0" />
            <span>{userEmail || user?.primaryEmailAddress?.emailAddress || "Unknown Account"}</span>
          </div>
          <div className="text-[10px] text-slate-500 dark:text-zinc-500 mt-1">
            Required Clearance: <span className="font-mono text-slate-800 dark:text-zinc-300 font-semibold">4thgencorei7@gmail.com</span>
          </div>
        </div>

        {/* Action Controls */}
        <div className="w-full flex flex-col gap-2">
          <button
            type="button"
            onClick={handleSignOut}
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-900 dark:bg-white hover:bg-slate-800 dark:hover:bg-slate-100 text-white dark:text-slate-900 text-xs font-semibold border border-slate-900 dark:border-white transition cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out & Switch Account</span>
          </button>

          <a
            href="/"
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-white dark:bg-zinc-800 hover:bg-slate-50 dark:hover:bg-zinc-700 text-slate-700 dark:text-slate-200 text-xs font-semibold border border-slate-300 dark:border-zinc-700 transition cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Return to VeloTime App</span>
          </a>
        </div>
      </div>
    </div>
  );
}
