import React, { useEffect, useRef, useState } from "react";
import {
  useAuth,
  useClerk,
  useOrganization,
  useSignIn,
  useSignUp,
  useUser,
} from "@clerk/clerk-react";
import { GoogleIcon } from "./GoogleAuthButton";

const MOBILE_AUTH_KEYS = [
  "velotime_mobile_auth",
  "velotime_mobile_auth_ts",
  "velotime_mobile_redirect",
];

function safeGet(key) {
  try {
    const ls = window.localStorage?.getItem(key);
    if (ls) return ls;
  } catch {}
  try {
    return window.sessionStorage?.getItem(key);
  } catch {
    return null;
  }
}

export function clearMobileAuthFlags() {
  for (const key of MOBILE_AUTH_KEYS) {
    try {
      window.localStorage?.removeItem(key);
    } catch {}
    try {
      window.sessionStorage?.removeItem(key);
    } catch {}
  }
}

function getValidatedMobileRedirect() {
  const params = new URLSearchParams(window.location.search);
  const fromQuery = params.get("redirect_uri");
  const candidate =
    fromQuery || safeGet("velotime_mobile_redirect") || "velotime://auth";
  return candidate.startsWith("velotime://") ? candidate : "velotime://auth";
}

export default function MobileGoogleAuthBridge() {
  const { isLoaded: isUserLoaded, isSignedIn, user } = useUser();
  const { getToken } = useAuth();
  const { organization, membership, isLoaded: isOrgLoaded } = useOrganization();
  const { signIn, isLoaded: isSignInLoaded } = useSignIn();
  const { signUp, isLoaded: isSignUpLoaded } = useSignUp();
  const clerk = useClerk();

  const [status, setStatus] = useState("initializing");
  const [errorMsg, setErrorMsg] = useState("");
  const [deepLinkUrl, setDeepLinkUrl] = useState("");
  const [isActionLoading, setIsActionLoading] = useState(false);

  const autoOAuthTriggeredRef = useRef(false);
  const tokenExchangeTriggeredRef = useRef(false);

  const cancelUrl = (() => {
    const base = getValidatedMobileRedirect();
    const sep = base.includes("?") ? "&" : "?";
    return `${base}${sep}cancelled=1`;
  })();

  const startGoogleOAuth = async () => {
    if (isActionLoading) return;
    setIsActionLoading(true);
    setErrorMsg("");
    setStatus("connecting_google");

    try {
      window.localStorage?.setItem("velotime_mobile_auth", "1");
      window.localStorage?.setItem(
        "velotime_mobile_auth_ts",
        String(Date.now()),
      );
    } catch {}
    try {
      window.sessionStorage?.setItem("velotime_mobile_auth", "1");
      window.sessionStorage?.setItem(
        "velotime_mobile_auth_ts",
        String(Date.now()),
      );
    } catch {}

    const redirectUrl = `${window.location.origin}/sso-callback`;
    const redirectUrlComplete = `${window.location.origin}/?mobile_auth=1`;

    try {
      if (isSignInLoaded && signIn) {
        await signIn.authenticateWithRedirect({
          strategy: "oauth_google",
          redirectUrl,
          redirectUrlComplete,
        });
        return;
      }
      if (isSignUpLoaded && signUp) {
        await signUp.authenticateWithRedirect({
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
      throw new Error("Google sign-in service is still loading. Please tap Continue with Google.");
    } catch (err) {
      console.warn("Mobile Google OAuth primary attempt error:", err);
      try {
        if (isSignUpLoaded && signUp) {
          await signUp.authenticateWithRedirect({
            strategy: "oauth_google",
            redirectUrl,
            redirectUrlComplete,
          });
          return;
        }
      } catch (fallbackErr) {
        console.error("Mobile Google OAuth fallback error:", fallbackErr);
      }
      setIsActionLoading(false);
      setStatus("awaiting_tap");
      setErrorMsg(
        err?.errors?.[0]?.longMessage ||
          err?.message ||
          "Tap Continue with Google below to open Google Sign-In.",
      );
    }
  };

  const handleSwitchAccount = async () => {
    setIsActionLoading(true);
    setErrorMsg("");
    tokenExchangeTriggeredRef.current = false;
    autoOAuthTriggeredRef.current = true;
    try {
      await clerk.signOut();
    } catch {}
    setIsActionLoading(false);
    startGoogleOAuth();
  };

  useEffect(() => {
    if (!isUserLoaded || isSignedIn) return;
    if (!isSignInLoaded || !isSignUpLoaded) return;
    if (autoOAuthTriggeredRef.current) return;

    autoOAuthTriggeredRef.current = true;
    startGoogleOAuth();

    const timer = setTimeout(() => {
      setIsActionLoading(false);
      setStatus((prev) => (prev === "connecting_google" ? "awaiting_tap" : prev));
    }, 2200);

    return () => clearTimeout(timer);
  }, [isUserLoaded, isSignedIn, isSignInLoaded, isSignUpLoaded]);

  useEffect(() => {
    async function exchangeTokenAndReturn() {
      if (!isUserLoaded || !isSignedIn || !user || !isOrgLoaded) return;
      if (tokenExchangeTriggeredRef.current) return;
      tokenExchangeTriggeredRef.current = true;

      setStatus("minting_token");
      setErrorMsg("");

      try {
        const jwt = await getToken();
        if (!jwt) {
          throw new Error("Could not retrieve authentication session. Please sign in again.");
        }

        const apiUrl = import.meta.env.VITE_API_URL;
        const syncRes = await fetch(`${apiUrl}/api/sync-user`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${jwt}`,
          },
          body: JSON.stringify({
            email: user.primaryEmailAddress?.emailAddress,
            firstName: user.firstName,
            lastName: user.lastName,
            clerkOrgId: organization?.id || null,
            clerkOrgName: organization?.name || null,
            clerkOrgRole: membership?.role || null,
          }),
        });

        const syncData = await syncRes.json().catch(() => ({}));
        if (!syncRes.ok) {
          throw new Error(syncData?.error || "Failed to sync VeloTime account.");
        }

        const keyRes = await fetch(`${apiUrl}/api/v1/api-key`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${jwt}`,
          },
          body: JSON.stringify({}),
        });

        const keyData = await keyRes.json().catch(() => ({}));
        if (!keyRes.ok || !keyData?.apiKey) {
          throw new Error(keyData?.error || "Could not generate mobile session key.");
        }

        const redirectBase = getValidatedMobileRedirect();
        const sep = redirectBase.includes("?") ? "&" : "?";
        const dbUser = syncData?.user || {};

        const params = new URLSearchParams({
          token: keyData.apiKey,
          email: dbUser.email || user.primaryEmailAddress?.emailAddress || "",
          firstName: dbUser.firstName || user.firstName || "",
          lastName: dbUser.lastName || user.lastName || "",
          orgName:
            keyData.organizationName ||
            dbUser.organization?.name ||
            organization?.name ||
            "My Workspace",
          role: dbUser.role || "admin",
        });

        const finalUrl = `${redirectBase}${sep}${params.toString()}`;
        clearMobileAuthFlags();
        setDeepLinkUrl(finalUrl);
        setStatus("redirecting_app");
        window.location.href = finalUrl;
      } catch (err) {
        console.error("Mobile token exchange failed:", err);
        tokenExchangeTriggeredRef.current = false;
        setStatus("error");
        setErrorMsg(
          err?.message || "Could not connect your workspace to VeloTime Mobile.",
        );
      }
    }

    exchangeTokenAndReturn();
  }, [isUserLoaded, isSignedIn, user, isOrgLoaded, organization?.id, organization?.name, membership?.role]);

  const userEmail = user?.primaryEmailAddress?.emailAddress || "";

  return (
    <div className="min-h-screen bg-[#0A0D12] text-white flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-sm bg-[#12161F] border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-rose-600 flex items-center justify-center font-black text-white text-lg">
            V
          </div>
          <div>
            <h1 className="text-base font-extrabold tracking-tight text-white">
              VeloTime Mobile
            </h1>
            <p className="text-xs text-slate-400">
              {isSignedIn
                ? userEmail
                  ? `Signed in as ${userEmail}`
                  : "Finalizing workspace connection"
                : "Sign in with Google"}
            </p>
          </div>
        </div>

        {status === "error" && errorMsg ? (
          <div className="p-3 rounded-xl bg-red-950/60 border border-red-800/70 text-xs text-red-200 leading-relaxed">
            {errorMsg}
          </div>
        ) : errorMsg ? (
          <div className="p-3 rounded-xl bg-slate-900 border border-slate-700 text-xs text-slate-300 leading-relaxed">
            {errorMsg}
          </div>
        ) : null}

        {isSignedIn ? (
          status === "redirecting_app" && deepLinkUrl ? (
            <div className="space-y-3">
              <p className="text-xs text-slate-300 leading-relaxed">
                Google sign-in verified. Returning you to VeloTime Mobile...
              </p>
              <a
                href={deepLinkUrl}
                className="w-full py-3 px-4 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-sm flex items-center justify-center transition-colors"
              >
                Open VeloTime App
              </a>
              <button
                type="button"
                onClick={handleSwitchAccount}
                disabled={isActionLoading}
                className="w-full py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 font-semibold text-xs transition-colors cursor-pointer"
              >
                Use a Different Google Account
              </button>
            </div>
          ) : status === "error" ? (
            <div className="space-y-3">
              <button
                type="button"
                onClick={() => {
                  tokenExchangeTriggeredRef.current = false;
                  setStatus("minting_token");
                  setErrorMsg("");
                  window.location.reload();
                }}
                className="w-full py-3 px-4 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-sm transition-colors cursor-pointer"
              >
                Retry Connection
              </button>
              <button
                type="button"
                onClick={handleSwitchAccount}
                disabled={isActionLoading}
                className="w-full py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 font-semibold text-xs transition-colors cursor-pointer"
              >
                Switch Google Account
              </button>
            </div>
          ) : (
            <div className="py-4 flex flex-col items-center gap-3 text-center">
              <div className="w-6 h-6 border-2 border-rose-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-xs font-mono text-slate-300">
                Connecting workspace to VeloTime Mobile...
              </p>
            </div>
          )
        ) : (
          <div className="space-y-3">
            <div className="py-2 flex items-center gap-2.5 text-xs text-slate-300">
              {status === "connecting_google" && (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin shrink-0" />
              )}
              <span>
                {status === "connecting_google"
                  ? "Connecting to Google..."
                  : "Tap below to continue with your Google account."}
              </span>
            </div>

            <button
              type="button"
              onClick={startGoogleOAuth}
              disabled={isActionLoading}
              className="w-full py-3.5 px-4 rounded-xl bg-white hover:bg-slate-100 text-slate-950 font-bold text-sm flex items-center justify-center gap-2.5 shadow-sm transition-colors cursor-pointer disabled:opacity-60"
            >
              <GoogleIcon className="w-4 h-4 shrink-0" />
              <span>
                {isActionLoading ? "Opening Google..." : "Continue with Google"}
              </span>
            </button>
          </div>
        )}

        <div className="pt-2 border-t border-slate-800/80 flex justify-center">
          <a
            href={cancelUrl}
            onClick={() => clearMobileAuthFlags()}
            className="text-xs font-medium text-slate-400 hover:text-slate-200 transition-colors"
          >
            Cancel &amp; Return to VeloTime
          </a>
        </div>
      </div>
    </div>
  );
}
