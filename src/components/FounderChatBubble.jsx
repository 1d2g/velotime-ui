import React, { useState, useEffect } from "react";
import { Mail, Copy, Check, X, MessageSquare } from "lucide-react";
import { usePostHog } from "posthog-js/react";

export default function FounderChatBubble({
  founderName = "Dustin Gray",
  founderEmail = "dgray@dg.tools",
  initialOpen = true,
}) {
  const posthog = usePostHog();
  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  // Smooth entrance after page loads
  useEffect(() => {
    if (initialOpen) {
      const timer = setTimeout(() => {
        setIsOpen(true);
      }, 700);
      return () => clearTimeout(timer);
    }
  }, [initialOpen]);

  const handleCopyEmail = (e) => {
    e.stopPropagation();
    navigator.clipboard.writeText(founderEmail);
    setCopied(true);
    if (posthog) {
      posthog.capture("founder_bubble_interacted", { action: "copy_email" });
    }
    setTimeout(() => setCopied(false), 2000);
  };

  const handleMailtoClick = (e) => {
    e.stopPropagation();
    if (posthog) {
      posthog.capture("founder_bubble_interacted", { action: "mailto_click" });
    }
  };

  const toggleOpen = () => {
    const next = !isOpen;
    setIsOpen(next);
    if (posthog) {
      posthog.capture("founder_bubble_interacted", {
        action: next ? "opened" : "closed",
      });
    }
  };

  return (
    <div className="fixed bottom-4 right-4 z-40 font-sans max-w-sm sm:max-w-md w-full pointer-events-none flex flex-col items-end">
      {/* Expanded Speech Bubble Card */}
      {isOpen ? (
        <div className="pointer-events-auto w-full bg-white dark:bg-zinc-900 border-2 border-slate-300 dark:border-zinc-700 shadow-2xl p-4 sm:p-5 mb-3 transition-all animate-in fade-in slide-in-from-bottom-2 duration-200">
          {/* Card Header */}
          <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-zinc-800 mb-3">
            <div className="flex items-center gap-2.5">
              <div className="relative">
                <div className="w-8 h-8 bg-slate-900 text-white dark:bg-zinc-800 flex items-center justify-center font-black text-xs tracking-wider border border-slate-700 select-none">
                  DG
                </div>
                <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-white dark:border-zinc-900" />
              </div>
              <div>
                <div className="text-xs font-black text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                  <span>{founderName}</span>
                  <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider bg-slate-100 dark:bg-zinc-800 px-1.5 py-0.5 border border-slate-200 dark:border-zinc-700">
                    Founder
                  </span>
                </div>
                <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
                  Available for questions
                </div>
              </div>
            </div>

            <button
              onClick={() => setIsOpen(false)}
              className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
              title="Minimize chat bubble"
              aria-label="Minimize"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Speech Bubble Message */}
          <div className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed mb-4">
            <p className="mb-2">
              Hey, I'm Dustin, the founder of VeloTime.
            </p>
            <p className="text-slate-600 dark:text-slate-400">
              If you have any questions about setting up your workspace, team rates, or timesheet migrations from Harvest or Toggl, shoot me an email directly. I read and answer every message personally.
            </p>
          </div>

          {/* Interactive Actions */}
          <div className="flex flex-col sm:flex-row items-stretch gap-2 pt-1">
            <a
              href={`mailto:${founderEmail}?subject=Question%20about%20VeloTime%20workspace`}
              onClick={handleMailtoClick}
              className="flex-1 py-2 px-3 bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-slate-200 text-white dark:text-slate-900 font-bold text-xs tracking-wider transition-colors inline-flex items-center justify-center gap-1.5 shadow-sm text-center"
            >
              <Mail className="w-3.5 h-3.5" />
              <span>Email Dustin</span>
            </a>

            <button
              type="button"
              onClick={handleCopyEmail}
              className="py-2 px-3 border border-slate-300 dark:border-zinc-700 hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-700 dark:text-slate-300 font-bold text-xs transition-colors inline-flex items-center justify-center gap-1.5"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span className="text-emerald-600 dark:text-emerald-400">Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>{founderEmail}</span>
                </>
              )}
            </button>
          </div>
        </div>
      ) : null}

      {/* Collapsed Pill Button */}
      <button
        type="button"
        onClick={toggleOpen}
        className="pointer-events-auto bg-slate-900 hover:bg-slate-800 dark:bg-zinc-900 dark:hover:bg-zinc-800 text-white border-2 border-slate-700 dark:border-zinc-700 shadow-xl px-3.5 py-2 flex items-center gap-2.5 transition-all select-none group"
      >
        <div className="relative flex items-center justify-center">
          <div className="w-6 h-6 bg-slate-800 text-white dark:bg-zinc-800 flex items-center justify-center font-bold text-[10px] tracking-wider border border-slate-600">
            DG
          </div>
          <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-500 border border-slate-900" />
        </div>
        <div className="text-left hidden xs:block">
          <div className="text-[11px] font-bold tracking-tight group-hover:text-slate-200">
            Questions? Chat with Founder
          </div>
          <div className="text-[10px] text-slate-400 font-mono">
            {founderEmail}
          </div>
        </div>
        <div className="text-xs font-bold xs:hidden">
          Contact Founder
        </div>
        <MessageSquare className="w-3.5 h-3.5 text-slate-400 group-hover:text-white transition-colors ml-0.5" />
      </button>
    </div>
  );
}
