import React from "react";
import { SignIn } from "@clerk/clerk-react";
import { ShieldCheck, ArrowLeft } from "lucide-react";

export default function AdminLogin() {
  const clerkAppearance = {
    elements: {
      rootBox: "w-full max-w-sm",
      card: "bg-zinc-900 border border-zinc-800 shadow-2xl rounded-xl p-5 text-zinc-100",
      headerTitle: "text-white text-base font-bold",
      headerSubtitle: "text-zinc-400 text-xs",
      socialButtonsBlockButton:
        "bg-zinc-800 hover:bg-zinc-750 border border-zinc-700 text-white text-xs font-semibold h-10 transition-colors",
      socialButtonsBlockButtonText: "text-zinc-200 font-semibold text-xs",
      dividerLine: "bg-zinc-800",
      dividerText: "text-zinc-500 text-[10px] uppercase tracking-wider",
      formFieldLabel: "text-zinc-300 text-xs font-medium",
      formFieldInput:
        "bg-zinc-950 border border-zinc-800 text-white text-xs rounded-lg focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 h-9 transition-colors",
      formButtonPrimary:
        "bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold h-9 rounded-lg shadow-sm transition-colors",
      footerActionLink: "text-cyan-400 hover:text-cyan-300 text-xs font-medium",
      identityPreviewText: "text-zinc-300 text-xs",
      identityPreviewEditButtonIcon: "text-zinc-400 hover:text-white",
    },
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-zinc-950 text-slate-100 font-sans p-4 relative">
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

      <div className="w-full max-w-md relative z-10 flex flex-col items-center">
        {/* Navigation back */}
        <div className="w-full flex items-center justify-between mb-4 px-1">
          <a
            href="/"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-800 text-xs font-medium transition cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5 text-zinc-400" />
            <span>Back to VeloTime App</span>
          </a>
          <span className="text-[11px] font-mono text-zinc-500">
            Secure Admin Gateway
          </span>
        </div>

        {/* Header Card */}
        <div className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-5 mb-4 shadow-xl flex flex-col items-center text-center">
          <div className="w-11 h-11 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center mb-3 text-cyan-400">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <h1 className="text-lg font-bold text-white tracking-tight">
            VeloTime Mission Control
          </h1>
          <p className="text-xs text-zinc-400 mt-1 max-w-xs leading-relaxed">
            Please sign in with your authorized administrator email (<span className="text-zinc-200 font-mono">4thgencorei7@gmail.com</span>) to proceed.
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
