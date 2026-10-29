import React from "react";

const POSTHOG_KEY =
  import.meta.env.VITE_POSTHOG_KEY ||
  "phc_xrWAkajTPLpTYFqgkS6L28qrLcgHnBjuRqz6YFN4UXCA";
const POSTHOG_HOST =
  import.meta.env.VITE_POSTHOG_HOST || "https://us.i.posthog.com";

const eventQueue = [];
let realPostHog = null;
let initStarted = false;

export const posthogProxy = {
  capture(eventName, properties, options) {
    if (realPostHog) {
      try {
        realPostHog.capture(eventName, properties, options);
      } catch {}
    } else {
      eventQueue.push({ type: "capture", args: [eventName, properties, options] });
    }
  },
  identify(distinctId, userPropertiesToSet, userPropertiesToSetOnce) {
    if (realPostHog) {
      try {
        realPostHog.identify(distinctId, userPropertiesToSet, userPropertiesToSetOnce);
      } catch {}
    } else {
      eventQueue.push({
        type: "identify",
        args: [distinctId, userPropertiesToSet, userPropertiesToSetOnce],
      });
    }
  },
  reset(...args) {
    if (realPostHog && typeof realPostHog.reset === "function") {
      try {
        realPostHog.reset(...args);
      } catch {}
    }
  },
};

export function initDeferredPostHog() {
  if (typeof window === "undefined" || !POSTHOG_KEY || initStarted) return;
  initStarted = true;

  if (!window.posthog) {
    window.posthog = posthogProxy;
  }

  const loadAndInit = async () => {
    try {
      const mod = await import("posthog-js");
      const posthog = mod.default || mod;
      const isEmbedded =
        window.self !== window.top ||
        new URLSearchParams(window.location.search).get("embed") === "true";

      posthog.init(POSTHOG_KEY, {
        api_host: POSTHOG_HOST,
        person_profiles: "identified_only",
        session_recording: !isEmbedded
          ? {
              minimum_duration_seconds: 3,
              strictMinimumDuration: true,
              maskAllInputs: false,
              maskInputOptions: {
                password: true,
              },
            }
          : false,
      });

      realPostHog = posthog;
      window.posthog = posthog;

      while (eventQueue.length > 0) {
        const item = eventQueue.shift();
        try {
          if (item.type === "identify") {
            posthog.identify(...item.args);
          } else if (item.type === "capture") {
            posthog.capture(...item.args);
          }
        } catch {}
      }
    } catch {
      // Non-fatal if blocked by adblockers or strict browser privacy policies
    }
  };

  if (typeof window.requestIdleCallback === "function") {
    window.requestIdleCallback(() => loadAndInit(), { timeout: 1200 });
  } else {
    setTimeout(loadAndInit, 150);
  }
}

export function PostHogProvider({ children }) {
  return React.createElement(React.Fragment, null, children);
}

export function usePostHog() {
  return posthogProxy;
}
