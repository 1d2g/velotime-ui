import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import "./index.css";
import "./i18n";
import { ClerkProvider, AuthenticateWithRedirectCallback } from "@clerk/clerk-react";
import { ToastProvider } from "./contexts/ToastContext.jsx";
import { PostHogProvider, posthogProxy, initDeferredPostHog } from "./services/posthogClient.js";

import ErrorBoundary from "./components/ErrorBoundary.jsx";

const LegalPages = React.lazy(() => import("./components/LegalPages.jsx"));
const ControlPortal = React.lazy(() => import("./control/ControlPortal.jsx"));

initDeferredPostHog();

// You will get this key from your Clerk Dashboard
const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

if (!PUBLISHABLE_KEY) {
  throw new Error("Missing Publishable Key");
}

const path = window.location.pathname;
const isSsoCallback = path === "/sso-callback" || path.startsWith("/sso-callback");
const isControlPage = path === "/control" || path.startsWith("/control");
const isPublicPage = [
  "/privacy",
  "/contact",
  "/cookies",
  "/tos",
  "/data-removal",
].includes(path) || path.startsWith("/invoice/") || path.startsWith("/pay/");

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <ErrorBoundary>
      <React.Suspense
        fallback={
          <div className="min-h-screen bg-slate-900 flex items-center justify-center text-xs font-mono text-slate-400">
            Loading...
          </div>
        }
      >
        {isPublicPage ? (
          <LegalPages path={path} />
        ) : (
          <ClerkProvider
            publishableKey={PUBLISHABLE_KEY}
            appearance={{
              elements: {
                logoImage: "/favicon.svg",
              },
              variables: {
                colorPrimary: "#2563eb",
              },
            }}
          >
            <PostHogProvider client={posthogProxy}>
              <ToastProvider>
                {isSsoCallback ? (
                  <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white p-4">
                    <div className="text-xs font-mono text-slate-400 mb-2">Connecting Google Account...</div>
                    <AuthenticateWithRedirectCallback
                      signInForceRedirectUrl="/"
                      signUpForceRedirectUrl="/"
                      signInFallbackRedirectUrl="/"
                      signUpFallbackRedirectUrl="/"
                    />
                  </div>
                ) : isControlPage ? (
                  <ControlPortal />
                ) : (
                  <App />
                )}
              </ToastProvider>
            </PostHogProvider>
          </ClerkProvider>
        )}
      </React.Suspense>
    </ErrorBoundary>
  </React.StrictMode>,
);
