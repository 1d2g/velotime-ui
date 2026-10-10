import React, { useState } from "react";
import { Mail, Copy, Check, X } from "lucide-react";

/**
 * FounderTrustBanner
 *
 * Dedicated top banner displayed when a visitor is in the Guest Sandbox.
 * Gives an authentic, personal point of contact directly to the founder.
 */
export default function FounderTrustBanner({
  founderName = "Dustin Gray",
  founderEmail = "dgray@dg.tools",
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
    <div className="w-full bg-slate-950 text-white border-b border-slate-800 px-4 py-2 text-xs font-sans z-50 shrink-0 select-none">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2.5">
        {/* Left: Founder Identity & Transparent Personal Message */}
        <div className="flex items-center gap-2.5 flex-1 min-w-0">
          <div className="relative shrink-0 flex items-center justify-center">
            <div className="w-6 h-6 bg-slate-800 text-white flex items-center justify-center font-bold text-[10px] tracking-wider border border-slate-600 select-none">
              DG
            </div>
            <span
              className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-rose-500 border border-slate-950"
              title="Founder Online"
            />
          </div>

          <div className="text-[11px] leading-tight text-slate-200">
            <span className="font-bold text-white mr-1.5">{founderName} (Founder):</span>
            <span className="text-slate-300">
              Building VeloTime for independent studios and agencies. Evaluating for your team or have questions on custom rates and migration? Direct line:{" "}
              <a
                href={`mailto:${founderEmail}?subject=Question%20about%20VeloTime%20workspace`}
                className="text-white underline font-semibold hover:text-slate-200"
              >
                {founderEmail}
              </a>
              {" "}— I read and answer every email personally.
            </span>
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
          <a
            href={`mailto:${founderEmail}?subject=Question%20about%20VeloTime%20workspace`}
            className="px-2.5 py-1 bg-white hover:bg-slate-100 text-slate-900 font-bold text-[11px] tracking-wider transition-colors inline-flex items-center gap-1 shadow-sm cursor-pointer"
          >
            <Mail className="w-3 h-3 text-slate-900" />
            <span>Email Dustin</span>
          </a>

          <button
            type="button"
            onClick={handleCopy}
            className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 font-bold text-[11px] transition-colors inline-flex items-center gap-1 cursor-pointer"
          >
            {copied ? (
              <>
                <Check className="w-3 h-3 text-rose-400" />
                <span className="text-rose-400">Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-3 h-3 text-slate-400" />
                <span>Copy Email</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={handleDismiss}
            className="p-1 text-slate-400 hover:text-white transition-colors ml-0.5 cursor-pointer"
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
