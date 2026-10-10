import React from "react";
import { SignIn } from "@clerk/clerk-react";
import { ShieldAlert, ArrowLeft } from "lucide-react";

export default function AdminLogin() {
  const clerkAppearance = {
    elements: {
      rootBox: "w-full max-w-sm",
      card: "bg-white dark:bg-zinc-900 border border-slate-300 dark:border-zinc-700 shadow-none p-5 text-slate-900 dark:text-slate-100",
      headerTitle: "text-slate-900 dark:text-white text-base font-bold",
      headerSubtitle: "text-slate-500 dark:text-zinc-400 text-xs",
      socialButtonsBlockButton:
        "bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 border border-slate-300 dark:border-zinc-700 text-slate-900 dark:text-white text-xs font-semibold h-10 transition-colors",
      socialButtonsBlockButtonText: "text-slate-800 dark:text-zinc-200 font-semibold text-xs",
      dividerLine: "bg-slate-200 dark:bg-zinc-800",
      dividerText: "text-slate-400 dark:text-zinc-500 text-[10px] uppercase tracking-wider",
      formFieldLabel: "text-slate-700 dark:text-zinc-300 text-xs font-medium",
      formFieldInput:
        "bg-white dark:bg-zinc-950 border border-slate-300 dark:border-zinc-700 text-slate-900 dark:text-white text-xs focus:border-slate-900 dark:focus:border-white focus:ring-1 focus:ring-slate-900 dark:focus:ring-white h-9 transition-colors",
      formButtonPrimary:
        "bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 text-xs font-semibold h-9 shadow-none transition-colors",
      footerActionLink: "text-rose-600 hover:text-rose-700 dark:text-rose-400 text-xs font-medium",
      identityPreviewText: "text-slate-700 dark:text-zinc-300 text-xs",
      identityPreviewEditButtonIcon: "text-slate-600 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-white",
    },
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gray-200 dark:bg-zinc-950 text-slate-900 dark:text-slate-100 font-sans p-4 relative">
      <div className="w-full max-w-md relative z-10 flex flex-col items-center">
        {/* Navigation back */}
        <div className="w-full flex items-center justify-between mb-4 px-1">
          <a
            href="/"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-zinc-900 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white border border-slate-300 dark:border-zinc-700 text-xs font-semibold transition"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to VeloTime</span>
          </a>
          <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
            Control Portal
          </span>
        </div>

        {/* Header Card */}
        <div className="w-full bg-white dark:bg-zinc-900 border border-slate-300 dark:border-zinc-700 p-6 mb-4 flex flex-col items-center text-center">
          <div className="font-black text-xl text-slate-900 dark:text-slate-100 tracking-tighter flex items-center gap-2 mb-3">
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

          <h1 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">
            Administrator Authentication
          </h1>
          <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1 max-w-xs leading-relaxed">
            Sign in with authorized administrator identity (<span className="text-slate-800 dark:text-zinc-200 font-mono font-semibold">4thgencorei7@gmail.com</span>) to proceed.
          </p>
        </div>

        {/* Clerk Sign In */}
        <div className="w-full flex justify-center">
          <SignIn
            routing="hash"
            fallbackRedirectUrl="/control"
            forceRedirectUrl="/control"
            appearance={clerkAppearance}
          />
        </div>
      </div>
    </div>
  );
}
