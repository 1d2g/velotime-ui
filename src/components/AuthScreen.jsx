import React, { useState, useEffect } from "react";
import { SignIn, SignUp } from "@clerk/clerk-react";
import { Check, Lock } from "lucide-react";
import FounderChatBubble from "./FounderChatBubble";
import FounderAdBanner from "./FounderAdBanner";

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

  const clerkAppearance = {
    elements: {
      rootBox: "w-full max-w-full",
      card: "w-full max-w-full shadow-lg border border-slate-300 dark:border-zinc-800 rounded-none sm:rounded-xl bg-white dark:bg-zinc-900 p-3 sm:p-6",
      formButtonPrimary:
        "bg-slate-900 hover:bg-slate-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200 transition-colors rounded-none font-bold text-xs uppercase tracking-wider py-2.5",
      socialButtonsBlockButton:
        "border border-slate-300 dark:border-zinc-700 hover:bg-slate-50 dark:hover:bg-zinc-800 text-xs font-semibold rounded-none",
      formFieldInput:
        "rounded-none border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-xs",
      headerTitle: "text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100",
      headerSubtitle: "text-xs text-slate-500 dark:text-slate-400",
      footerActionLink: "text-blue-600 dark:text-blue-400 font-semibold hover:underline text-xs"
    }
  };

  return (
    <div className="min-h-screen min-h-[100dvh] w-full flex-1 flex flex-col items-center justify-start bg-slate-100 dark:bg-zinc-950 font-sans relative overflow-y-auto overscroll-contain">
      {/* Top Banner (Only displayed for advertising/campaign inbound traffic) */}
      <FounderAdBanner location="signup" />

      <div className="w-full max-w-[360px] sm:max-w-md flex flex-col items-center py-4 sm:py-8 lg:py-10 px-3 sm:px-4 my-auto">
        {/* Brand Logo Header */}
        <div className="flex items-center gap-3 sm:gap-3.5 mb-3 sm:mb-6 select-none">
          <svg
            className="w-7 h-7 sm:w-9 sm:h-9 shrink-0 select-none shadow-sm"
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
          <span className="font-extrabold text-lg sm:text-xl tracking-[0.24em] uppercase font-sans">
            <span className="text-slate-900 dark:text-slate-100">VELO</span>
            <span className="text-rose-600">TIME</span>
          </span>
        </div>

        {/* Tab Toggle */}
        <div className="w-full bg-slate-200 dark:bg-zinc-800 p-0.5 sm:p-1 mb-3 sm:mb-6 flex border border-slate-300 dark:border-zinc-700 shadow-inner">
          <button
            type="button"
            onClick={() => setAuthMode("signup")}
            className={`flex-1 py-1.5 sm:py-2 text-[11px] sm:text-xs font-bold tracking-wider uppercase transition-colors ${
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
            className={`flex-1 py-1.5 sm:py-2 text-[11px] sm:text-xs font-bold tracking-wider uppercase transition-colors ${
              authMode === "signin"
                ? "bg-slate-900 text-white dark:bg-zinc-100 dark:text-zinc-900 shadow-sm"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
            }`}
          >
            Sign In
          </button>
        </div>

        {/* Dynamic Context Header */}
        <div className="text-center mb-3 sm:mb-5 w-full">
          {authMode === "signup" ? (
            <>
              <h1 className="text-base sm:text-lg font-black text-slate-900 dark:text-slate-100 tracking-tight">
                Start your 14-day free trial
              </h1>
              <p className="text-[11px] sm:text-xs text-slate-600 dark:text-slate-400 mt-0.5 sm:mt-1">
                Zero credit card required. Full team matrix & margin telemetry.
              </p>
              <div className="mt-2 sm:mt-3 flex flex-wrap items-center justify-center gap-2 sm:gap-3 text-[10px] sm:text-[11px] font-semibold text-slate-700 dark:text-slate-300">
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
              <h1 className="text-base sm:text-lg font-black text-slate-900 dark:text-slate-100 tracking-tight">
                Sign in to your workspace
              </h1>
              <p className="text-[11px] sm:text-xs text-slate-600 dark:text-slate-400 mt-0.5 sm:mt-1">
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
              appearance={clerkAppearance}
            />
          ) : (
            <SignIn
              routing="hash"
              fallbackRedirectUrl="/"
              forceRedirectUrl="/"
              signUpFallbackRedirectUrl="/"
              signUpForceRedirectUrl="/"
              appearance={clerkAppearance}
            />
          )}
        </div>

        {/* Trust & Back Links */}
        <div className="mt-4 sm:mt-8 pb-12 sm:pb-8 text-center space-y-1.5 sm:space-y-2">
          <div className="flex items-center justify-center gap-3 sm:gap-4 text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 font-medium flex-wrap">
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
          <p className="text-[10px] sm:text-[11px] text-slate-400 dark:text-zinc-600 flex items-center justify-center gap-1.5 pt-1">
            <Lock className="w-3 h-3" />
            256-bit encrypted data isolation & SOC 2 compliant infrastructure
          </p>
        </div>
      </div>

      {/* Founder Chat Bubble / Direct Line */}
      <FounderChatBubble
        founderEmail="dgray@dg.tools"
        founderName="Dustin Gray"
        initialOpen={false}
      />
    </div>
  );
}

