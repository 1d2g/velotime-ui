import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import "./index.css";
import { ClerkProvider } from "@clerk/clerk-react";
import { ToastProvider } from "./contexts/ToastContext.jsx";
import posthog from "posthog-js";
import { PostHogProvider } from "posthog-js/react";

import LegalPages from "./components/LegalPages.jsx";

if (typeof window !== "undefined" && import.meta.env.VITE_POSTHOG_KEY) {
  posthog.init(import.meta.env.VITE_POSTHOG_KEY, {
    api_host: import.meta.env.VITE_POSTHOG_HOST || "https://us.i.posthog.com",
    person_profiles: "identified_only",
  });
}

// You will get this key from your Clerk Dashboard
const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

if (!PUBLISHABLE_KEY) {
  throw new Error("Missing Publishable Key");
}

const path = window.location.pathname;
const isLegalPage = [
  "/privacy",
  "/contact",
  "/cookies",
  "/tos",
  "/data-removal",
].includes(path);

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    {isLegalPage ? (
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
            <App />
          </ToastProvider>
        </PostHogProvider>
      </ClerkProvider>
    )}
  </React.StrictMode>,
);
