import React, { useState } from "react";
import { Mail, Copy, Check, X, ArrowLeft, Sparkles } from "lucide-react";

/**
 * FounderTrustBanner
 *
 * Dedicated top banner displayed when a visitor is in the Guest Sandbox.
 * Gives an authentic, personal point of contact directly to the founder.
 */
export default function FounderTrustBanner({
  founderName = "Dustin Gray",
  founderEmail = "dgray@dg.tools",
  companyName = "",
  isTrial = false,
  trialSeats = null,
  competitor = "",
  onClaimWorkspace,
  onDismiss,
}) {
  const [copied, setCopied] = useState(false);
  const [isDismissed, setIsDismissed] = useState(() => {
    try {
      return sessionStorage.getItem("velotime_founder_trust_dismissed") === "true";
    } catch {
      return false;
    }
  });

  if (isDismissed) return null;

  const handleCopy = () => {
    try {
      navigator.clipboard.writeText(founderEmail);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
    }
  };

  const handleDismiss = () => {
    setIsDismissed(true);
    try {
      sessionStorage.setItem("velotime_founder_trust_dismissed", "true");
    } catch {}
    if (onDismiss) onDismiss();
  };

  return (
    <div className="w-full bg-slate-950 text-white border-b border-slate-800 px-4 py-1.5 text-xs font-sans z-50 shrink-0 select-none">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
        {/* Left: Founder Identity & Concise Personal Message */}
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <div className="relative shrink-0 flex items-center justify-center">
            <div className="w-5 h-5 bg-slate-800 text-white flex items-center justify-center font-bold text-[9px] tracking-wider border border-slate-600 select-none">
              DG
            </div>
            <span
              className="absolute -bottom-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-emerald-500 border border-slate-950"
              title="Founder Online"
            />
          </div>

          <div className="text-[11px] leading-tight text-slate-300 truncate">
            <span className="font-bold text-white mr-1.5">{founderName} (Founder):</span>
            {competitor?.toLowerCase() === "harvest" ? (
              <span>
                Comparing against Harvest? VeloTime is a flat <strong className="text-white">$5/seat</strong> (vs Harvest&apos;s $14/seat) with 10-second keyboard entry, live timers, and invoicing. Questions?{" "}
              </span>
            ) : competitor ? (
              <span>
                Comparing against {competitor}? VeloTime is a flat <strong className="text-white">$5/seat</strong> with 10-second keyboard entry, live timers, and invoicing. Questions?{" "}
              </span>
            ) : companyName ? (
              <span>
                Welcome to the <strong className="text-white">{companyName}</strong> sandbox{trialSeats ? ` (${trialSeats} seats · $${trialSeats * 5}/mo)` : ""}. Test the grid below — zero credit card required. Questions?{" "}
              </span>
            ) : (
              <span>
                Interactive Guest Sandbox — test arrow-key navigation &amp; live timers below ($5/seat flat, zero credit card required). Direct founder line:{" "}
              </span>
            )}
            <a
              href={`mailto:${founderEmail}?subject=Question%20about%20${encodeURIComponent(companyName || "VeloTime")}%20workspace`}
              className="text-white underline font-semibold hover:text-rose-300 transition-colors"
            >
              {founderEmail}
            </a>
          </div>
        </div>

        {/* Right: Minimal Actions (No duplicate Main Site / Save buttons that already exist in Header below) */}
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={handleCopy}
            className="px-2 py-0.5 bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 font-semibold text-[10px] transition-colors inline-flex items-center gap-1 cursor-pointer"
            title="Copy founder email address"
          >
            {copied ? (
              <>
                <Check className="w-2.5 h-2.5 text-emerald-400" />
                <span className="text-emerald-400">Copied</span>
              </>
            ) : (
              <>
                <Copy className="w-2.5 h-2.5 text-slate-400" />
                <span className="hidden sm:inline">Copy Email</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={handleDismiss}
            className="p-0.5 text-slate-400 hover:text-white transition-colors cursor-pointer"
            title="Dismiss founder banner"
            aria-label="Dismiss banner"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
