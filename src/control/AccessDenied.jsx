import React from "react";
import { useClerk, useUser } from "@clerk/clerk-react";
import { ShieldAlert, ArrowLeft, LogOut, KeyRound } from "lucide-react";

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
    <div className="min-h-screen w-full flex items-center justify-center bg-zinc-950 text-slate-100 font-sans p-4">
      {/* Background Matrix Pattern */}
      <div 
        className="absolute inset-0 pointer-events-none opacity-20"
        style={{
          backgroundImage: `
            linear-gradient(rgba(255, 255, 255, 0.05) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255, 255, 255, 0.05) 1px, transparent 1px)
          `,
          backgroundSize: "40px 40px"
        }}
      />

      <div className="w-full max-w-md relative z-10 bg-zinc-900 border border-zinc-800 rounded-xl p-8 shadow-2xl flex flex-col items-center text-center">
        {/* Shield Icon */}
        <div className="w-14 h-14 rounded-full bg-rose-500/10 border border-rose-500/30 flex items-center justify-center mb-5 text-rose-500">
          <ShieldAlert className="w-7 h-7" />
        </div>

        <span className="text-[11px] font-mono font-semibold tracking-wider uppercase text-rose-400 bg-rose-500/10 border border-rose-500/20 px-2.5 py-1 rounded mb-3">
          Security Restriction 403
        </span>

        <h1 className="text-xl font-bold text-white tracking-tight mb-2">
          Mission Control Restricted
        </h1>

        <p className="text-xs text-zinc-400 leading-relaxed mb-6">
          This administration terminal is strictly restricted to authorized administrative personnel. Your current signed-in account is not permitted access.
        </p>

        {/* Current Identity Details */}
        <div className="w-full bg-zinc-950/80 border border-zinc-800 rounded-lg p-3.5 mb-6 text-left">
          <div className="text-[10px] font-mono uppercase tracking-wider text-zinc-500 mb-1">
            Current Authenticated Identity
          </div>
          <div className="text-xs font-mono font-semibold text-zinc-200 truncate flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0" />
            <span>{userEmail || user?.primaryEmailAddress?.emailAddress || "Unknown Account"}</span>
          </div>
          <div className="text-[10px] text-zinc-500 mt-1">
            Required Account: <span className="font-mono text-zinc-300">4thgencorei7@gmail.com</span>
          </div>
        </div>

        {/* Action Controls */}
        <div className="w-full flex flex-col gap-2.5">
          <button
            type="button"
            onClick={handleSignOut}
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-semibold border border-zinc-700 transition cursor-pointer"
          >
            <LogOut className="w-4 h-4 text-zinc-400" />
            <span>Sign Out & Switch Account</span>
          </button>

          <a
            href="/"
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-transparent hover:bg-zinc-800/60 text-zinc-400 hover:text-zinc-200 text-xs font-medium transition cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Return to VeloTime Workspace</span>
          </a>
        </div>
      </div>
    </div>
  );
}
