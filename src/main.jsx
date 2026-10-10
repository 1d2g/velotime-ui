import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import "./index.css";
import "./i18n";
import { ClerkProvider } from "@clerk/clerk-react";
import { ToastProvider } from "./contexts/ToastContext.jsx";
import posthog from "posthog-js";
import { PostHogProvider } from "posthog-js/react";

import LegalPages from "./components/LegalPages.jsx";
import ErrorBoundary from "./components/ErrorBoundary.jsx";
import ControlPortal from "./control/ControlPortal.jsx";

const POSTHOG_KEY = import.meta.env.VITE_POSTHOG_KEY || "phc_xrWAkajTPLpTYFqgkS6L28qrLcgHnBjuRqz6YFN4UXCA";
const POSTHOG_HOST = import.meta.env.VITE_POSTHOG_HOST || "https://us.i.posthog.com";

if (typeof window !== "undefined" && POSTHOG_KEY) {
  try {
    posthog.init(POSTHOG_KEY, {
      api_host: POSTHOG_HOST,
      person_profiles: "identified_only",
      session_recording: {
        minimum_duration_seconds: 3,
        strictMinimumDuration: true,
      },
    });
  } catch (err) {
    // Non-fatal if blocked by strict browser privacy policies
  }
}

// You will get this key from your Clerk Dashboard
const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

if (!PUBLISHABLE_KEY) {
  throw new Error("Missing Publishable Key");
}

const path = window.location.pathname;
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
          <PostHogProvider client={posthog}>
            <ToastProvider>
              {isControlPage ? <ControlPortal /> : <App />}
            </ToastProvider>
          </PostHogProvider>
        </ClerkProvider>
      )}
    </ErrorBoundary>
  </React.StrictMode>,
);
