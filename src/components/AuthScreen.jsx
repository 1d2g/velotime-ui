import React, { useState, useEffect } from "react";
import { SignIn, SignUp } from "@clerk/clerk-react";
import { Check, Lock } from "lucide-react";
import FounderChatBubble from "./FounderChatBubble";
import FounderAdBanner from "./FounderAdBanner";

function LogoPatternBackground() {
  return (
    <div
      className="absolute inset-0 pointer-events-none overflow-hidden select-none"
      aria-hidden="true"
    >
      {/* 1. Ambient Lighting Mesh (VeloTime brand rose & tech blue radial glow) */}
      <div
        className="absolute inset-0 z-0"
        style={{
          background: `
            radial-gradient(circle at 16% 14%, rgba(244, 63, 94, 0.15) 0%, transparent 45%),
            radial-gradient(circle at 84% 86%, rgba(56, 189, 248, 0.10) 0%, transparent 50%),
            radial-gradient(circle at 50% 50%, rgba(244, 63, 94, 0.03) 0%, transparent 65%)
          `,
        }}
      />

      {/* 2. Precision Micro Grid Lines */}
      <div
        className="absolute inset-0 z-0 opacity-80"
        style={{
          backgroundImage: `
            linear-gradient(rgba(255, 255, 255, 0.025) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255, 255, 255, 0.025) 1px, transparent 1px)
          `,
          backgroundSize: "60px 60px",
        }}
      />

      {/* 3. Sleek Repeating VeloTime Logo Pattern (Pure Chromium Vector SVG) */}
      <svg
        className="absolute inset-0 w-full h-full z-0 opacity-90"
        style={{
          maskImage:
            "radial-gradient(circle at center, rgba(0, 0, 0, 0.35) 0%, rgba(0, 0, 0, 0.9) 70%, #000 100%)",
          WebkitMaskImage:
            "radial-gradient(circle at center, rgba(0, 0, 0, 0.35) 0%, rgba(0, 0, 0, 0.9) 70%, #000 100%)",
        }}
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <pattern
            id="velotime-auth-logo-grid"
            width="120"
            height="100"
            patternUnits="userSpaceOnUse"
          >
            {/* Grid Crosshair & Intersection Accents */}
            <path
              d="M 0 50 H 120 M 60 0 V 100"
              stroke="rgba(255, 255, 255, 0.025)"
              strokeWidth="1"
            />
            <circle cx="60" cy="50" r="1.5" fill="rgba(244, 63, 94, 0.45)" />
            <circle cx="0" cy="0" r="1" fill="rgba(255, 255, 255, 0.15)" />
            <circle cx="120" cy="0" r="1" fill="rgba(255, 255, 255, 0.15)" />
            <circle cx="0" cy="100" r="1" fill="rgba(255, 255, 255, 0.15)" />
            <circle cx="120" cy="100" r="1" fill="rgba(255, 255, 255, 0.15)" />

            {/* Logo Mark 1: Center Position (x: 60, y: 50) */}
            <g transform="translate(60, 50) translate(-20, -20) scale(0.20)">
              <path
                d="M 60 48 L 140 48 L 155 63 L 155 72 H 45 V 63 Z"
                fill="rgba(244, 63, 94, 0.65)"
              />
              <path d="M 90 72 H 110 V 94 H 90 Z" fill="rgba(244, 63, 94, 0.65)" />
              <path
                d="M 45 94 H 68 L 100 132 L 132 94 H 155 L 110 148 C 105 153 95 153 90 148 Z"
                fill="rgba(255, 255, 255, 0.22)"
              />
            </g>

            {/* Logo Mark 2: Top-Left Corner (x: 0, y: 0) */}
            <g transform="translate(0, 0) translate(-20, -20) scale(0.20)">
              <path
                d="M 60 48 L 140 48 L 155 63 L 155 72 H 45 V 63 Z"
                fill="rgba(244, 63, 94, 0.45)"
              />
              <path d="M 90 72 H 110 V 94 H 90 Z" fill="rgba(244, 63, 94, 0.45)" />
              <path
                d="M 45 94 H 68 L 100 132 L 132 94 H 155 L 110 148 C 105 153 95 153 90 148 Z"
                fill="rgba(255, 255, 255, 0.15)"
              />
            </g>

            {/* Logo Mark 3: Top-Right Corner (x: 120, y: 0) */}
            <g transform="translate(120, 0) translate(-20, -20) scale(0.20)">
              <path
                d="M 60 48 L 140 48 L 155 63 L 155 72 H 45 V 63 Z"
                fill="rgba(244, 63, 94, 0.45)"
              />
              <path d="M 90 72 H 110 V 94 H 90 Z" fill="rgba(244, 63, 94, 0.45)" />
              <path
                d="M 45 94 H 68 L 100 132 L 132 94 H 155 L 110 148 C 105 153 95 153 90 148 Z"
                fill="rgba(255, 255, 255, 0.15)"
              />
            </g>

            {/* Logo Mark 4: Bottom-Left Corner (x: 0, y: 100) */}
            <g transform="translate(0, 100) translate(-20, -20) scale(0.20)">
              <path
                d="M 60 48 L 140 48 L 155 63 L 155 72 H 45 V 63 Z"
                fill="rgba(244, 63, 94, 0.45)"
              />
              <path d="M 90 72 H 110 V 94 H 90 Z" fill="rgba(244, 63, 94, 0.45)" />
              <path
                d="M 45 94 H 68 L 100 132 L 132 94 H 155 L 110 148 C 105 153 95 153 90 148 Z"
                fill="rgba(255, 255, 255, 0.15)"
              />
            </g>

            {/* Logo Mark 5: Bottom-Right Corner (x: 120, y: 100) */}
            <g transform="translate(120, 100) translate(-20, -20) scale(0.20)">
              <path
                d="M 60 48 L 140 48 L 155 63 L 155 72 H 45 V 63 Z"
                fill="rgba(244, 63, 94, 0.45)"
              />
              <path d="M 90 72 H 110 V 94 H 90 Z" fill="rgba(244, 63, 94, 0.45)" />
              <path
                d="M 45 94 H 68 L 100 132 L 132 94 H 155 L 110 148 C 105 153 95 153 90 148 Z"
                fill="rgba(255, 255, 255, 0.15)"
              />
            </g>
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#velotime-auth-logo-grid)" />
      </svg>
    </div>
  );
}

const safeGetItem = (storage, key, fallback = null) => {
  try {
    if (typeof window !== "undefined" && window[storage]) {
      const val = window[storage].getItem(key);
      return val !== null ? val : fallback;
    }
  } catch (e) {}
  return fallback;
};

export default function AuthScreen() {
  const [authMode, setAuthMode] = useState(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const mode = params.get("mode");
      const path = window.location.pathname;
      const hash = window.location.hash;
      const hasSignedInBefore = safeGetItem("localStorage", "velotime_has_signed_in");
      const isPaidCampaign =
        params.has("gclid") ||
        params.has("utm_source") ||
        params.has("utm_campaign") ||
        params.has("trial");

      // Paid campaigns and explicit signup requests ALWAYS default to signup
      if (mode === "signup" || hash.includes("sign-up") || isPaidCampaign) {
        return "signup";
      }

      // Explicit signin request
      if (
        mode === "signin" ||
        mode === "login" ||
        path.startsWith("/sign-in") ||
        path.startsWith("/login") ||
        hash.includes("sign-in") ||
        hash.includes("login")
      ) {
        return "signin";
      }

      // Returning users who have previously authenticated on this browser
      if (hasSignedInBefore) {
        return "signin";
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

  // Track Sign Up Page Visit conversion in Google Ads (guarded to once per session)
  useEffect(() => {
    if (authMode === "signup") {
      try {
        const trackedKey = "velotime_gtag_signup_visit_tracked";
        if (typeof window !== "undefined" && !sessionStorage.getItem(trackedKey)) {
          if (typeof window.gtag === "function") {
            window.gtag("event", "conversion", {
              send_to: "AW-18479452942/dGBxCO2knI0dEI6m2OtE",
            });
            sessionStorage.setItem(trackedKey, "true");
          }
        }
      } catch (e) {}
    }
  }, [authMode]);

  const clerkAppearance = {
    variables: {
      colorBackground: "#121722",
      colorInputBackground: "#1a2232",
      colorInputText: "#f8fafc",
      colorText: "#f8fafc",
      colorTextSecondary: "#94a3b8",
      colorPrimary: "#f43f5e",
      colorTextOnPrimaryBackground: "#ffffff",
      colorBorder: "#2e3a4e",
      borderRadius: "0.5rem",
    },
    elements: {
      rootBox: "w-full max-w-full",
      card: "w-full max-w-full shadow-2xl border border-zinc-800/80 rounded-xl bg-zinc-900/90 backdrop-blur-md p-3 sm:p-6 text-zinc-100",
      formButtonPrimary:
        "bg-white hover:bg-zinc-200 text-zinc-950 transition-all rounded-lg font-bold text-xs uppercase tracking-wider py-2.5 shadow-md shadow-white/10 active:scale-[0.99]",
      socialButtonsBlockButton:
        "border border-zinc-700/80 hover:bg-zinc-800/80 text-zinc-200 text-xs font-semibold rounded-lg transition-colors",
      formFieldInput:
        "rounded-lg border-zinc-700 bg-zinc-800/70 text-zinc-100 placeholder:text-zinc-500 text-xs focus:border-rose-500 focus:ring-1 focus:ring-rose-500",
      formFieldLabel: "text-zinc-300 text-xs font-medium",
      identityPreviewText: "text-zinc-200 text-xs",
      headerTitle: "text-base sm:text-lg font-bold text-white",
      headerSubtitle: "text-xs text-zinc-400",
      footerActionLink: "text-rose-400 hover:text-rose-300 font-semibold hover:underline text-xs",
      dividerLine: "bg-zinc-800",
      dividerText: "text-zinc-500 text-xs",
    }
  };

  return (
    <div className="min-h-screen min-h-[100dvh] w-full flex-1 flex flex-col items-center justify-start bg-[#080B11] text-slate-100 font-sans relative overflow-y-auto overscroll-contain">
      {/* Sleek Repeating Logo Pattern & Ambient Lighting Atmosphere */}
      <LogoPatternBackground />

      {/* Top Banner (Only displayed for advertising/campaign inbound traffic) */}
      <FounderAdBanner location="signup" />

      <div className="w-full max-w-[360px] sm:max-w-md flex flex-col items-center pt-6 sm:pt-10 pb-24 sm:pb-36 px-3 sm:px-4 m-auto relative z-10">
        {/* Glossy Semi-Transparent Brand & Context Header Card */}
        <div className="w-full relative overflow-hidden rounded-2xl border border-white/10 bg-zinc-900/60 backdrop-blur-xl shadow-2xl shadow-black/50 p-4 sm:p-6 mb-3 sm:mb-4 flex flex-col items-center select-none">
          {/* Top Bevel Specular Gloss Highlight */}
          <div
            className="absolute inset-0 pointer-events-none rounded-2xl bg-gradient-to-b from-white/[0.08] via-white/[0.015] to-transparent"
            aria-hidden="true"
          />

          {/* Subtle Ambient Rose Corner Glow */}
          <div
            className="absolute -top-10 -left-10 w-28 h-28 bg-rose-500/15 rounded-full blur-2xl pointer-events-none"
            aria-hidden="true"
          />

          {/* Brand Logo Header */}
          <div className="flex items-center gap-3 sm:gap-3.5 mb-3 sm:mb-4 select-none relative z-10">
            <svg
              className="w-7 h-7 sm:w-8 sm:h-8 shrink-0 select-none shadow-md rounded-lg"
              viewBox="0 0 200 200"
              fill="none"
            >
              <rect width="200" height="200" rx="36" fill="#0F172A" />
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
              <span className="text-white">VELO</span>
              <span className="text-rose-500">TIME</span>
            </span>
          </div>

          {/* Tab Toggle */}
          <div className="w-full bg-zinc-950/60 p-0.5 sm:p-1 mb-3 sm:mb-4 flex border border-white/[0.08] shadow-inner rounded-xl backdrop-blur-sm relative z-10">
            <button
              type="button"
              onClick={() => setAuthMode("signup")}
              className={`flex-1 py-1.5 sm:py-2 text-[11px] sm:text-xs font-bold tracking-wider uppercase transition-all rounded-lg ${
                authMode === "signup"
                  ? "bg-zinc-100 text-zinc-950 shadow-md"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              Start Free Trial
            </button>
            <button
              type="button"
              onClick={() => setAuthMode("signin")}
              className={`flex-1 py-1.5 sm:py-2 text-[11px] sm:text-xs font-bold tracking-wider uppercase transition-all rounded-lg ${
                authMode === "signin"
                  ? "bg-zinc-100 text-zinc-950 shadow-md"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              Sign In
            </button>
          </div>

          {/* Dynamic Context Header */}
          <div className="text-center w-full relative z-10">
            {authMode === "signup" ? (
              <>
                <h1 className="text-base sm:text-lg font-black text-white tracking-tight">
                  Start your 14-day free trial
                </h1>
                <p className="text-[11px] sm:text-xs text-zinc-400 mt-1">
                  Zero credit card required. Full team matrix & margin telemetry.
                </p>
                <div className="mt-2.5 sm:mt-3 flex flex-wrap items-center justify-center gap-1.5 sm:gap-2 text-[10px] sm:text-[11px] font-semibold text-zinc-300">
                  <span className="inline-flex items-center gap-1 bg-white/[0.04] px-2 py-0.5 rounded-full border border-white/[0.06]">
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    No credit card
                  </span>
                  <span className="inline-flex items-center gap-1 bg-white/[0.04] px-2 py-0.5 rounded-full border border-white/[0.06]">
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    Instant Google SSO
                  </span>
                  <span className="inline-flex items-center gap-1 bg-white/[0.04] px-2 py-0.5 rounded-full border border-white/[0.06]">
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    Full team features
                  </span>
                </div>
              </>
            ) : (
              <>
                <h1 className="text-base sm:text-lg font-black text-white tracking-tight">
                  Sign in to your workspace
                </h1>
                <p className="text-[11px] sm:text-xs text-zinc-400 mt-1">
                  Access your organization timesheets, projects, and invoices.
                </p>
                <div className="mt-3 p-2 bg-rose-500/10 border border-rose-500/25 rounded-lg flex items-center justify-center gap-1.5 text-xs text-rose-200">
                  <span>New to VeloTime?</span>
                  <button
                    type="button"
                    onClick={() => setAuthMode("signup")}
                    className="font-bold text-white underline hover:text-rose-300 transition-colors cursor-pointer"
                  >
                    Start 14-day free trial &rarr;
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Clerk Auth Component */}
        <div className="w-full flex justify-center">
          {authMode === "signup" ? (
            <SignUp
              routing="hash"
              signInUrl="#sign-in"
              fallbackRedirectUrl="/"
              forceRedirectUrl="/"
              signInFallbackRedirectUrl="/"
              signInForceRedirectUrl="/"
              appearance={clerkAppearance}
            />
          ) : (
            <SignIn
              routing="hash"
              signUpUrl="#sign-up"
              fallbackRedirectUrl="/"
              forceRedirectUrl="/"
              signUpFallbackRedirectUrl="/"
              signUpForceRedirectUrl="/"
              appearance={clerkAppearance}
            />
          )}
        </div>

        {/* Trust & Back Links */}
        <div className="mt-4 sm:mt-6 pb-4 text-center space-y-2">
          <div className="flex items-center justify-center gap-3 sm:gap-4 text-[11px] sm:text-xs text-zinc-400 font-medium flex-wrap">
            <a
              href="https://velotime.dg.tools/demo"
              className="hover:text-rose-400 transition-colors underline"
            >
              Back to Interactive Sandbox Demo
            </a>
            <span>•</span>
            <a
              href="/privacy"
              className="hover:text-zinc-200 transition-colors"
            >
              Privacy
            </a>
            <span>•</span>
            <a
              href="/tos"
              className="hover:text-zinc-200 transition-colors"
            >
              Terms
            </a>
          </div>
          <p className="text-[10px] sm:text-[11px] text-zinc-500 flex items-center justify-center gap-1.5 pt-1">
            <Lock className="w-3 h-3 text-zinc-500" />
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
