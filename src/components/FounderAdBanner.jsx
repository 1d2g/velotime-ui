import React, { useState, useEffect } from "react";
import { Mail, Copy, Check, X } from "lucide-react";
import { usePostHog } from "posthog-js/react";

/**
 * FounderAdBanner - Displayed at the top of the signup screen when a visitor
 * arrives from an advertising funnel (Google Ads, Reddit Ads, UTM campaigns, or via the ad-attributed demo).
 * 
 * Provides an authentic, direct connection with the founder to reduce hesitation.
 */
export default function FounderAdBanner({
  founderName = "Dustin Gray",
  founderEmail = "dgray@dg.tools",
  location = "signup",
}) {
  const posthog = usePostHog();
  const [isAdVisitor, setIsAdVisitor] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    try {
      // 1. Check if already dismissed in this session
      if (sessionStorage.getItem("velotime_founder_banner_dismissed") === "true") {
        setIsDismissed(true);
        return;
      }

      // 2. Check if previously identified as an ad lead
      const cachedAdLead = sessionStorage.getItem("velotime_ad_lead") === "true";

      const params = new URLSearchParams(window.location.search);
      const utmSource = (params.get("utm_source") || "").toLowerCase();
      const utmMedium = (params.get("utm_medium") || "").toLowerCase();
      const source = (params.get("source") || "").toLowerCase();

      const hasAdParam =
        params.has("gclid") ||
        params.has("gad_source") ||
        params.has("gad_campaignid") ||
        params.has("gbraid") ||
        params.has("wbraid") ||
        params.get("ad") === "true" ||
        source === "demo" || // Transferred from demo
        ["cpc", "ppc", "ad", "paidad", "paid_search", "paid_social", "display"].includes(utmMedium) ||
        ["reddit", "google", "adwords", "bing", "meta", "facebook", "twitter", "ads"].includes(utmSource) ||
        Boolean(params.get("utm_campaign"));

      const ref = (document.referrer || "").toLowerCase();
      const hasAdReferrer =
        ref.includes("googleads") ||
        ref.includes("doubleclick.net") ||
        ref.includes("reddit.com/ads") ||
        ref.includes("velotime.dg.tools/demo");

      if (cachedAdLead || hasAdParam || hasAdReferrer) {
        sessionStorage.setItem("velotime_ad_lead", "true");
        setIsAdVisitor(true);
      }
    } catch {
      // Fail safely if storage access is restricted
    }
  }, []);

  if (!isAdVisitor || isDismissed) {
    return null;
  }

  const handleCopy = (e) => {
    e.stopPropagation();
    navigator.clipboard.writeText(founderEmail);
    setCopied(true);
    if (posthog) {
      posthog.capture("founder_ad_banner_interacted", {
        action: "copy_email",
        location,
      });
    }
    setTimeout(() => setCopied(false), 2000);
  };

  const handleMailto = () => {
    if (posthog) {
      posthog.capture("founder_ad_banner_interacted", {
        action: "mailto_click",
        location,
      });
    }
  };

  const handleDismiss = () => {
    setIsDismissed(true);
    try {
      sessionStorage.setItem("velotime_founder_banner_dismissed", "true");
    } catch {
      // ignore
    }
    if (posthog) {
      posthog.capture("founder_ad_banner_interacted", {
        action: "dismissed",
        location,
      });
    }
  };

  return (
    <div className="w-full bg-slate-900 border-b-2 border-slate-700 text-white px-3 sm:px-4 py-2.5 text-xs font-sans z-30 transition-all">
      <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2.5">
        {/* Left: Founder Identity & Message */}
        <div className="flex items-center gap-2.5 flex-1 min-w-0">
          <div className="relative shrink-0 flex items-center justify-center">
            <div className="w-6 h-6 bg-slate-800 text-white flex items-center justify-center font-bold text-[10px] tracking-wider border border-slate-600 select-none">
              DG
            </div>
            <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-500 border border-slate-900" />
          </div>

          <div className="text-[11px] leading-tight text-slate-200">
            <span className="font-bold text-white mr-1.5">{founderName} (Founder):</span>
            <span className="text-slate-300">
              Questions before setting up your workspace? Direct line:{' '}
              <a
                href={`mailto:${founderEmail}?subject=Question%20about%20VeloTime%20workspace`}
                onClick={handleMailto}
                className="text-white underline font-semibold hover:text-slate-200"
              >
                {founderEmail}
              </a>
              {' '}— I read and respond to all emails personally.
            </span>
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
          <a
            href={`mailto:${founderEmail}?subject=Question%20about%20VeloTime%20workspace`}
            onClick={handleMailto}
            className="px-2.5 py-1 bg-white hover:bg-slate-100 text-slate-900 font-bold text-[11px] tracking-wider transition-colors inline-flex items-center gap-1 shadow-sm"
          >
            <Mail className="w-3 h-3" />
            <span>Email Dustin</span>
          </a>

          <button
            type="button"
            onClick={handleCopy}
            className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-600 font-bold text-[11px] transition-colors inline-flex items-center gap-1"
          >
            {copied ? (
              <>
                <Check className="w-3 h-3 text-emerald-400" />
                <span className="text-emerald-400">Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-3 h-3 text-slate-400" />
                <span>Copy</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={handleDismiss}
            className="p-1 text-slate-400 hover:text-white transition-colors ml-0.5"
            title="Dismiss banner"
            aria-label="Dismiss banner"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
