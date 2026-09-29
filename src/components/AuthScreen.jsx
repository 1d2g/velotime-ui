import React, { useState, useEffect } from "react";
import { SignIn, SignUp } from "@clerk/clerk-react";
import { Check, Lock } from "lucide-react";
import FounderChatBubble from "./FounderChatBubble";

export default function AuthScreen() {
  const [authMode, setAuthMode] = useState(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const mode = params.get("mode");
      const isTrial = params.get("trial") === "true";
      const isSignUp = params.get("sign_up") === "true";
      const path = window.location.pathname;
      const hash = window.location.hash;
      if (
        mode === "signin" ||
        path.startsWith("/sign-in") ||
        path.startsWith("/login") ||
        hash.includes("sign-in")
      ) {
        return "signin";
      }
      if (
        mode === "signup" ||
        isTrial ||
        isSignUp ||
        path.startsWith("/sign-up") ||
        path.startsWith("/signup") ||
        path.startsWith("/register") ||
        hash.includes("sign-up")
      ) {
        return "signup";
      }
    }
    // Default to signup for all new inbound traffic
    return "signup";
  });

  // Keep state synced if URL hash or search params change
  useEffect(() => {
    const handleUrlChange = () => {
      const params = new URLSearchParams(window.location.search);
      const mode = params.get("mode");
      const hash = window.location.hash;
      if (mode === "signin" || hash.includes("sign-in")) {
        setAuthMode("signin");
      } else if (mode === "signup" || hash.includes("sign-up")) {
        setAuthMode("signup");
      }
    };
    window.addEventListener("hashchange", handleUrlChange);
    window.addEventListener("popstate", handleUrlChange);
    return () => {
      window.removeEventListener("hashchange", handleUrlChange);
      window.removeEventListener("popstate", handleUrlChange);
    };
  }, []);

  return (
    <div className="min-h-screen flex flex-col justify-center items-center py-10 px-4 bg-slate-100 dark:bg-zinc-950 font-sans">
      <div className="w-full max-w-md flex flex-col items-center">
        {/* Brand Logo Header */}
        <div className="flex items-center gap-3.5 mb-6 select-none">
          <svg
            className="w-9 h-9 shrink-0 select-none shadow-sm"
            viewBox="0 0 200 200"
            fill="none"
          >
            <rect width="200" height="200" fill="#0F172A" />
            <path
              d="M 60 48 L 140 48 L 155 63 L 155 72 H 45 V 63 Z"
              fill="#F43F5E"
            />
            <path d="M 90 72 H 110 V 94 H 90 Z" fill="#F43F5E" />
            <path
              d="M 45 94 H 68 L 100 132 L 132 94 H 155 L 110 148 C 105 153 95 153 90 148 Z"
              fill="#FFFFFF"
            />
          </svg>
          <span className="font-extrabold text-xl tracking-[0.24em] uppercase font-sans">
            <span className="text-slate-900 dark:text-slate-100">VELO</span>
            <span className="text-rose-600">TIME</span>
          </span>
        </div>

        {/* Tab Toggle */}
        <div className="w-full bg-slate-200 dark:bg-zinc-800 p-1 mb-6 flex border border-slate-300 dark:border-zinc-700 shadow-inner">
          <button
            type="button"
            onClick={() => setAuthMode("signup")}
            className={`flex-1 py-2 text-xs font-bold tracking-wider uppercase transition-colors ${
              authMode === "signup"
                ? "bg-slate-900 text-white dark:bg-zinc-100 dark:text-zinc-900 shadow-sm"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
            }`}
          >
            Start Free Trial
          </button>
          <button
            type="button"
            onClick={() => setAuthMode("signin")}
            className={`flex-1 py-2 text-xs font-bold tracking-wider uppercase transition-colors ${
              authMode === "signin"
                ? "bg-slate-900 text-white dark:bg-zinc-100 dark:text-zinc-900 shadow-sm"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
            }`}
          >
            Sign In
          </button>
        </div>

        {/* Dynamic Context Header */}
        <div className="text-center mb-5 w-full">
          {authMode === "signup" ? (
            <>
              <h1 className="text-lg font-black text-slate-900 dark:text-slate-100 tracking-tight">
                Start your 14-day free trial
              </h1>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                Zero credit card required. Full team matrix & margin telemetry.
              </p>
              <div className="mt-3 flex flex-wrap items-center justify-center gap-3 text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                <span className="inline-flex items-center gap-1">
                  <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  No credit card
                </span>
                <span className="inline-flex items-center gap-1">
                  <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  Instant Google SSO
                </span>
                <span className="inline-flex items-center gap-1">
                  <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  Full team features
                </span>
              </div>
            </>
          ) : (
            <>
              <h1 className="text-lg font-black text-slate-900 dark:text-slate-100 tracking-tight">
                Sign in to your workspace
              </h1>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                Access your organization timesheets, projects, and invoices.
              </p>
            </>
          )}
        </div>

        {/* Clerk Auth Component */}
        <div className="w-full flex justify-center">
          {authMode === "signup" ? (
            <SignUp
              routing="hash"
              fallbackRedirectUrl="/"
              forceRedirectUrl="/"
              signInFallbackRedirectUrl="/"
              signInForceRedirectUrl="/"
            />
          ) : (
            <SignIn
              routing="hash"
              fallbackRedirectUrl="/"
              forceRedirectUrl="/"
              signUpFallbackRedirectUrl="/"
              signUpForceRedirectUrl="/"
            />
          )}
        </div>

        {/* Trust & Back Links */}
        <div className="mt-8 text-center space-y-2">
          <div className="flex items-center justify-center gap-4 text-xs text-slate-500 dark:text-slate-400 font-medium">
            <a
              href="https://velotime.dg.tools/demo"
              className="hover:text-slate-900 dark:hover:text-slate-200 transition-colors underline"
            >
              Back to Interactive Sandbox Demo
            </a>
            <span>•</span>
            <a
              href="/privacy"
              className="hover:text-slate-900 dark:hover:text-slate-200 transition-colors"
            >
              Privacy
            </a>
            <span>•</span>
            <a
              href="/tos"
              className="hover:text-slate-900 dark:hover:text-slate-200 transition-colors"
            >
              Terms
            </a>
          </div>
          <p className="text-[11px] text-slate-400 dark:text-zinc-600 flex items-center justify-center gap-1.5 pt-1">
            <Lock className="w-3 h-3" />
            256-bit encrypted data isolation & SOC 2 compliant infrastructure
          </p>
        </div>
      </div>

      {/* Founder Chat Bubble / Direct Line */}
      <FounderChatBubble
        founderEmail="dgray@dg.tools"
        founderName="Dustin Gray"
        initialOpen={true}
      />
    </div>
  );
}
