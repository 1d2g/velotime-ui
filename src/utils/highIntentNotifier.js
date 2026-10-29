/**
 * Real-Time High-Intent Sandbox & Conversion Notifier
 *
 * Captures deduplicated high-intent evaluation and conversion milestones for real
 * visitors (excluding localhost, QA audit mode, and corporate email-scanner bots).
 * Triggers real-time PostHog destination alerts to Discord and notifies the API server.
 */

export function detectTrafficSource() {
  if (typeof window === "undefined") return "Direct Web";
  try {
    const params = new URLSearchParams(window.location.search);
    const source = params.get("utm_source");
    const campaign = params.get("utm_campaign");
    const medium = params.get("utm_medium");
    const gclid = params.get("gclid");
    const gadSource = params.get("gad_source");
    const gadCampaign = params.get("gad_campaignid");
    const rdtCid = params.get("rdt_cid");

    if (gclid || gadSource || gadCampaign) {
      if (gadCampaign === "24295180019") return "Google Ad (Search -> App Sandbox)";
      if (gadCampaign === "24309795540") return "Google Ad (Landing Page)";
      return `Google Ad (${gadCampaign || "Paid Search"})`;
    }
    if (rdtCid || source === "reddit") return `Reddit (${campaign || "social"})`;
    if (source === "outreach") return `Email Outreach (${campaign || "campaign"})`;
    if (source) return `${source} / ${medium || "web"}`;
    if (document.referrer && !document.referrer.includes(window.location.hostname)) {
      return `Referrer (${new URL(document.referrer).hostname})`;
    }
    return "Direct Web";
  } catch {
    return "Direct Web";
  }
}

export function isScannerOrBotSession() {
  if (typeof window === "undefined") return true;
  try {
    const hostname = window.location.hostname;
    if (hostname === "localhost" || hostname === "127.0.0.1") return true;

    const params = new URLSearchParams(window.location.search);
    if (params.get("audit_mode") === "true") return true;

    const rawUtmSource = (params.get("utm_source") || "").toLowerCase();
    const rawCompany = (params.get("company") || "").trim();

    if (
      rawUtmSource === "bhgefbdu" ||
      rawUtmSource === "dab_cbegafe_bhgefbdu" ||
      /\b(cebdgvdf|fghevbf|abyybjhc)\b/i.test(rawCompany) ||
      /'f\b/i.test(rawCompany)
    ) {
      return true;
    }

    const ua = (navigator.userAgent || "").toLowerCase();
    if (/headlesschrome|phantomjs|slurp|bingbot|googlebot|crawler|spider/i.test(ua)) {
      return true;
    }

    return false;
  } catch {
    return false;
  }
}

export function notifyHighIntentMilestone(posthog, milestone, options = {}) {
  if (typeof window === "undefined") return;
  if (isScannerOrBotSession()) return;

  const dedupeKey = `velotime_hi_milestone_${milestone}`;
  try {
    if (window.sessionStorage && window.sessionStorage.getItem(dedupeKey) === "true") {
      return;
    }
    if (window.sessionStorage) {
      window.sessionStorage.setItem(dedupeKey, "true");
    }
  } catch {}

  const params = new URLSearchParams(window.location.search);
  const company = options.company || params.get("company")?.trim() || "Direct Visitor";
  const trafficSource = options.trafficSource || detectTrafficSource();
  const headline = options.headline || `High-Intent Milestone: ${milestone}`;
  const details = options.details || "";

  const payload = {
    milestone,
    headline,
    company,
    trafficSource,
    details,
    pageUrl: window.location.href,
    timestamp: new Date().toISOString(),
    ...options.meta,
  };

  try {
    const ph = posthog || window.posthog;
    if (ph && typeof ph.capture === "function") {
      ph.capture("high_intent_milestone", payload);
    }
  } catch {}

  try {
    const apiUrl = import.meta.env.VITE_API_URL;
    if (apiUrl) {
      fetch(`${apiUrl}/api/telemetry/high-intent-alert`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        keepalive: true,
      }).catch(() => {});
    }
  } catch {}
}

