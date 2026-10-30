import React, { useState } from "react";
import { useSignUp, useSignIn, useClerk } from "@clerk/clerk-react";
import { useToast } from "../../contexts/ToastContext";

export function GoogleIcon({ className = "w-4 h-4" }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
        fill="#EA4335"
      />
    </svg>
  );
}

export default function GoogleAuthButton({
  mode = "signup", // "signup" or "signin"
  label,
  shortLabel,
  className = "",
  onBeforeRedirect,
  source = "unknown",
}) {
  const { signUp, isLoaded: isSignUpLoaded } = useSignUp();
  const { signIn, isLoaded: isSignInLoaded } = useSignIn();
  const clerk = useClerk();
  const toast = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const defaultLabel = mode === "signup" ? "Sign up with Google" : "Continue with Google";

  const handleGoogleAuth = async (e) => {
    e?.preventDefault();
    if (isLoading) return;
    setIsLoading(true);

    try {
      if (typeof window !== "undefined" && window.posthog) {
        window.posthog.capture("google_auth_clicked", {
          mode,
          source,
        });
      }
    } catch {}

    if (onBeforeRedirect) {
      try {
        onBeforeRedirect();
      } catch (err) {
        console.warn("onBeforeRedirect error:", err);
      }
    }

    const redirectUrl = `${window.location.origin}/sso-callback`;
    const redirectUrlComplete = `${window.location.origin}/`;

    try {
      if (mode === "signup" && isSignUpLoaded && signUp) {
        await signUp.authenticateWithRedirect({
          strategy: "oauth_google",
          redirectUrl,
          redirectUrlComplete,
        });
        return;
      }

      if (isSignInLoaded && signIn) {
        await signIn.authenticateWithRedirect({
          strategy: "oauth_google",
          redirectUrl,
          redirectUrlComplete,
        });
        return;
      }

      if (clerk?.authenticateWithRedirect) {
        await clerk.authenticateWithRedirect({
          strategy: "oauth_google",
          redirectUrl,
          redirectUrlComplete,
        });
        return;
      }

      // If Clerk failed to load or is being blocked by browser extensions/firewall
      setIsLoading(false);
      if (toast?.addToast) {
        toast.addToast("Authentication service is loading or blocked by your browser extensions. Please reload the page or check your ad blocker.", "error");
      }
    } catch (err) {
      console.warn("Direct Google sign up attempt error:", err);
      // Fallback: if user already has an account, authenticate via signIn
      try {
        if (isSignInLoaded && signIn) {
          await signIn.authenticateWithRedirect({
            strategy: "oauth_google",
            redirectUrl,
            redirectUrlComplete,
          });
          return;
        }
      } catch (fallbackErr) {
        console.error("Google sign in fallback error:", fallbackErr);
      }
      setIsLoading(false);
      if (toast?.addToast) {
        toast.addToast("Unable to complete Google sign in. Please reload the page or try email login.", "error");
      }
    }
  };

  const hasExplicitWidth = /\bw-\S+/.test(className);
  const widthClass = hasExplicitWidth ? "" : "w-full";

  return (
    <button
      type="button"
      onClick={handleGoogleAuth}
      disabled={isLoading}
      className={`${widthClass} py-2.5 px-4 bg-white hover:bg-slate-50 text-slate-900 border border-slate-300 dark:border-zinc-700 font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-sm hover:shadow cursor-pointer select-none disabled:opacity-60 disabled:cursor-not-allowed ${className}`}
      title={label || defaultLabel}
    >
      <GoogleIcon className="w-4 h-4 shrink-0" />
      {isLoading ? (
        <span>Connecting...</span>
      ) : shortLabel ? (
        <>
          <span className="hidden md:inline">{label || defaultLabel}</span>
          <span className="md:hidden">{shortLabel}</span>
        </>
      ) : (
        <span>{label || defaultLabel}</span>
      )}
    </button>
  );
}
