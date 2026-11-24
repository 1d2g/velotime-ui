import React from "react";

const POSTHOG_KEY =
  import.meta.env.VITE_POSTHOG_KEY ||
  "phc_xrWAkajTPLpTYFqgkS6L28qrLcgHnBjuRqz6YFN4UXCA";
const POSTHOG_HOST =
  import.meta.env.VITE_POSTHOG_HOST || "https://us.i.posthog.com";

const eventQueue = [];
let realPostHog = null;
let initStarted = false;
let humanVerified = false;
let gestureListenerAttached = false;
const humanCallbacks = [];

export function isBotOrImpossibleViewport() {
  if (typeof window === "undefined") return true;
  const ua = navigator.userAgent || "";
  const isBotUa =
    navigator.webdriver ||
    /Google-AdWords-Express|AdsBot-Google|Googlebot|HeadlessChrome|PhantomJS|Puppeteer|Playwright|Selenium|Lighthouse|bingbot|AhrefsBot|SemrushBot|DotBot|MJ12bot|Bytespider|GPTBot|ClaudeBot|PerplexityBot|PetalBot|YandexBot|Baiduspider|facebookexternalhit|LinkedInBot|Slackbot|Twitterbot|UptimeRobot|Pingdom|Datadog|BetterStack|Checkly|StatusCake/i.test(
      ua
    );
  const isFramelessHeadlessVm =
    window.screen &&
    window.innerWidth >= 1280 &&
    window.innerWidth === window.screen.width &&
    window.innerHeight === window.screen.height &&
    !document.fullscreenElement;
  const isImpossibleViewport =
    window.screen?.width > 0 && window.innerWidth > window.screen.width + 20;
  return Boolean(isBotUa || isFramelessHeadlessVm || isImpossibleViewport);
}

export function isTrustedEntryOrReturning() {
  if (typeof window === "undefined") return false;
  try {
    if (window.localStorage?.getItem("velotime_has_signed_in") === "true") {
      return true;
    }
  } catch {}
  try {
    const ref = typeof document !== "undefined" ? document.referrer || "" : "";
    if (
      /dg\.tools|google\.|bing\.|reddit\.|duckduckgo\.|linkedin\.|t\.co|twitter\.|x\.com/i.test(
        ref
      )
    ) {
      return true;
    }
  } catch {}
  try {
    const params = new URLSearchParams(window.location.search || "");
    const trustedKeys = [
      "mode",
      "source",
      "utm_source",
      "gclid",
      "gad_source",
      "gbraid",
      "wbraid",
      "trial",
      "company",
      "mobile_auth",
      "ref",
    ];
    if (trustedKeys.some((k) => params.has(k))) {
      return true;
    }
  } catch {}
  return false;
}

export function onHumanVerified(cb) {
  if (typeof window === "undefined" || typeof cb !== "function") return () => {};
  if (isBotOrImpossibleViewport()) return () => {};

  if (humanVerified || isTrustedEntryOrReturning()) {
    humanVerified = true;
    cb();
    return () => {};
  }

  let active = true;
  const wrapped = () => {
    if (active) cb();
  };
  humanCallbacks.push(wrapped);

  if (!gestureListenerAttached) {
    gestureListenerAttached = true;
    const events = [
      "pointermove",
      "pointerdown",
      "click",
      "keydown",
      "touchstart",
      "scroll",
    ];
    const verify = (ev) => {
      if (ev && ev.isTrusted === false) return;
      if (
        ev &&
        ev.type === "pointermove" &&
        ev.clientX === 0 &&
        ev.clientY === 0 &&
        ev.movementX === 0 &&
        ev.movementY === 0
      ) {
        return;
      }
      humanVerified = true;
      events.forEach((name) => window.removeEventListener(name, verify, true));
      while (humanCallbacks.length > 0) {
        const fn = humanCallbacks.shift();
        try {
          fn();
        } catch {}
      }
    };
    events.forEach((name) =>
      window.addEventListener(name, verify, { capture: true, passive: true })
    );
  }

  return () => {
    active = false;
  };
}

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
  if (isBotOrImpossibleViewport()) return;
  initStarted = true;

  if (!window.posthog) {
    window.posthog = posthogProxy;
  }

  const loadAndInit = async () => {
    try {
      if (isBotOrImpossibleViewport()) {
        return;
      }

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

  onHumanVerified(() => {
    if (typeof window.requestIdleCallback === "function") {
      window.requestIdleCallback(() => loadAndInit(), { timeout: 1200 });
    } else {
      setTimeout(loadAndInit, 150);
    }
  });
}

export function PostHogProvider({ children }) {
  return React.createElement(React.Fragment, null, children);
}

export function usePostHog() {
  return posthogProxy;
}

