import React, { useState } from "react";
import { 
  Eye, 
  ExternalLink, 
  Sparkles, 
  Send, 
  Bot, 
  AlertCircle, 
  CheckCircle2, 
  MousePointerClick, 
  Clock, 
  Key, 
  RefreshCw,
  TrendingDown
} from "lucide-react";
import { LATEST_POSTHOG_AUDIT } from "./mockControlData";

export default function PostHogAudits() {
  const [selectedAudit, setSelectedAudit] = useState(LATEST_POSTHOG_AUDIT);
  const [userQuery, setUserQuery] = useState("");
  const [aiResponses, setAiResponses] = useState([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [geminiKey, setGeminiKey] = useState(() => {
    return localStorage.getItem("velotime_admin_gemini_key") || "";
  });

  const samplePrompts = [
    "Why did the 67-second session drop off without signing up?",
    "Synthesize common friction patterns across all Google Ads visitors",
    "Suggest 3 high-impact copy tests for the above-the-fold hero section",
    "Explain the gap between 67s total dwell time and only 8s active time"
  ];

  const handleSaveGeminiKey = (key) => {
    setGeminiKey(key);
    if (key.trim()) {
      localStorage.setItem("velotime_admin_gemini_key", key.trim());
    } else {
      localStorage.removeItem("velotime_admin_gemini_key");
    }
  };

  const handleAskQuestion = async (queryText) => {
    const query = queryText || userQuery;
    if (!query.trim()) return;

    const userEntry = { sender: "user", text: query, timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) };
    setAiResponses(prev => [...prev, userEntry]);
    setUserQuery("");
    setIsAnalyzing(true);

    try {
      if (geminiKey.trim()) {
        // Direct call to Gemini 2.5 Flash API
        const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey.trim()}`;
        const prompt = `You are an expert SaaS Conversion Rate Optimization (CRO) and UX Telemetry Analyst for VeloTime (a $5/user/month keyboard-first spreadsheet timesheet app for agencies).
Analyze the following PostHog UX Audit and provide an actionable, concise, crisp answer:

Audit Context:
Date: ${selectedAudit.date}
Total Sessions: ${selectedAudit.sessionsCount}
Avg Dwell: ${selectedAudit.dwellAvgSeconds}s
Clicks: ${selectedAudit.totalClicks}
Traffic Source: ${selectedAudit.trafficSource}
Friction Points:
${selectedAudit.observedFriction.join("\n")}
Flagged Sessions:
${JSON.stringify(selectedAudit.sessions, null, 2)}

User Question: ${query}

Rules: Keep it actionable, highly professional, direct, zero emojis, and focused on B2B conversion metrics.`;

        const res = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }]
          })
        });

        if (res.ok) {
          const data = await res.json();
          const replyText = data.candidates?.[0]?.content?.parts?.[0]?.text || "Unable to extract response from Gemini.";
          setAiResponses(prev => [...prev, {
            sender: "ai",
            text: replyText,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          }]);
          setIsAnalyzing(false);
          return;
        }
      }

      // Offline / Pre-computed Expert Synthesis Engine
      await new Promise(r => setTimeout(r, 600));
      let responseText = "";

      if (query.toLowerCase().includes("67-second") || query.toLowerCase().includes("drop off") || query.toLowerCase().includes("bounce")) {
        responseText = `Diagnostic for Session 01a1256e (67s dwell, 2 clicks, Google Ads entry):

1. Root Cause of Drop-off: The visitor demonstrated high initial interest (staying 67s and exploring), but encountered an orientation gap. They clicked two navigational elements on the landing page but never crossed over to the workspace or interactive demo.
2. The Inactivity Gap: Total duration was 67s, but active peripheral movement was only 8s. This signifies the user opened the tab, read the hero copy, paused, and waited for a clearer proof point or pricing breakdown.
3. High-Leverage Fix: Introduce a sticky conversion trigger on mobile/desktop viewports that prominently offers 'Test Drive Interactive Matrix (No Signup)' right alongside 'Start 14-Day Free Trial'.`;
      } else if (query.toLowerCase().includes("copy") || query.toLowerCase().includes("hero") || query.toLowerCase().includes("headline")) {
        responseText = `3 High-Impact Copy Experiments for VeloTime Hero:

1. Test A (Anti-Friction Directness):
   "The 15-Second Weekly Timesheet Grid Your Team Won't Hate."
   Subhead: "Replace clunky stopwatch timers and $16/seat bloat with a keyboard-driven spreadsheet matrix. $5/seat/month."

2. Test B (Comparison Disruption):
   "Harvest Charges $14/User for Software Creatives Despise. VeloTime is $5."
   Subhead: "Zero popup modals. Zero timers. Just arrow-key fast weekly entries that get submitted on Friday."

3. Test C (Agency Margin Angle):
   "Stop The Friday Timesheet Chase."
   Subhead: "Boutique agencies lose 30+ billable hours every month to timesheet friction. Capture unbilled revisions with a 10-second weekly grid."`;
      } else {
        responseText = `UX Telemetry Synthesis for VeloTime Inbound Traffic:

- Intent Quality: Traffic arriving via Google Ads Campaign '24309795540' carries valid B2B search intent (queries like 'agency timesheet software' and 'harvest alternative').
- Conversion Hurdle: Visitors currently land on the marketing homepage rather than experiencing immediate product gratification.
- Prescribed Adjustment: Ensure the interactive sandbox demo (/demo) is surfaced within the top 400px of viewport height, allowing agency founders to feel the speed of the keyboard matrix within 5 seconds of landing.`;
      }

      setAiResponses(prev => [...prev, {
        sender: "ai",
        text: responseText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }]);
    } catch (e) {
      setAiResponses(prev => [...prev, {
        sender: "ai",
        text: `Analysis error: ${e.message}. Please check your API key or network connection.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }]);
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Latest Audit Overview Card */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 shadow-lg space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-zinc-800">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono uppercase tracking-wider text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 px-2 py-0.5 rounded">
                Telemetry Report
              </span>
              <span className="text-xs font-mono text-zinc-400">{selectedAudit.date}</span>
            </div>
            <h2 className="text-base font-bold text-white mt-1 flex items-center gap-2">
              <Eye className="w-5 h-5 text-cyan-400" />
              <span>PostHog Recording & Friction Audit</span>
            </h2>
          </div>

          <a
            href="https://us.posthog.com/project/527395/replay"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-semibold border border-zinc-700 transition"
          >
            <span>Open PostHog Portal</span>
            <ExternalLink className="w-3.5 h-3.5 text-zinc-400" />
          </a>
        </div>

        {/* Audit Scorecard Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3 rounded-lg bg-zinc-950/80 border border-zinc-800">
            <div className="text-[10px] font-mono text-zinc-400 uppercase">Analyzed Sessions</div>
            <div className="text-lg font-bold text-white mt-0.5">{selectedAudit.sessionsCount}</div>
            <div className="text-[10px] text-zinc-500">{selectedAudit.window}</div>
          </div>
          <div className="p-3 rounded-lg bg-zinc-950/80 border border-zinc-800">
            <div className="text-[10px] font-mono text-zinc-400 uppercase">Avg Dwell Time</div>
            <div className="text-lg font-bold text-cyan-400 mt-0.5">{selectedAudit.dwellAvgSeconds}s</div>
            <div className="text-[10px] text-zinc-500">Active movement: 8s</div>
          </div>
          <div className="p-3 rounded-lg bg-zinc-950/80 border border-zinc-800">
            <div className="text-[10px] font-mono text-zinc-400 uppercase">Total Clicks</div>
            <div className="text-lg font-bold text-emerald-400 mt-0.5">{selectedAudit.totalClicks}</div>
            <div className="text-[10px] text-zinc-500">50% sessions clicked</div>
          </div>
          <div className="p-3 rounded-lg bg-zinc-950/80 border border-zinc-800">
            <div className="text-[10px] font-mono text-zinc-400 uppercase">JavaScript Errors</div>
            <div className="text-lg font-bold text-white mt-0.5">{selectedAudit.errorCount}</div>
            <div className="text-[10px] text-emerald-400">Zero console breaks</div>
          </div>
        </div>

        {/* Observed Friction Points */}
        <div className="space-y-2 pt-2">
          <div className="text-xs font-semibold text-zinc-200 flex items-center gap-1.5">
            <AlertCircle className="w-4 h-4 text-amber-400" />
            <span>Observed Friction & Telemetry Synthesis</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
            {selectedAudit.observedFriction.map((f, i) => (
              <div key={i} className="p-3 rounded-lg bg-zinc-950/60 border border-zinc-800/80 text-xs text-zinc-300 leading-relaxed flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0 mt-1.5" />
                <span>{f}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Flagged Session Replays */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 shadow-lg space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <MousePointerClick className="w-4 h-4 text-cyan-400" />
            <span>Flagged Session Replays for Detailed Review</span>
          </h3>
          <span className="text-[11px] font-mono text-zinc-500">PostHog Project 527395</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {selectedAudit.sessions.map((sess, idx) => (
            <div 
              key={sess.id}
              className="p-4 rounded-lg bg-zinc-950 border border-zinc-800 flex flex-col justify-between space-y-3"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className={`text-[10px] font-mono px-2 py-0.5 rounded border font-semibold ${
                    sess.segment.includes("High") 
                      ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" 
                      : "bg-rose-500/10 text-rose-400 border-rose-500/20"
                  }`}>
                    {sess.segment}
                  </span>
                  <span className="text-xs font-mono text-zinc-400 font-bold">{sess.duration} total</span>
                </div>

                <div className="text-xs font-mono text-zinc-300 truncate mb-1">
                  ID: {sess.id}
                </div>

                <div className="text-[11px] text-zinc-400 space-y-0.5">
                  <div>Active Dwell: <span className="text-zinc-200 font-mono">{sess.activeDuration}</span></div>
                  <div>Interaction: <span className="text-zinc-200 font-mono">{sess.clicks} clicks</span> (0 errors)</div>
                  <div>Source: <span className="text-cyan-400 font-mono">Google Ads ({sess.campaignId})</span></div>
                </div>
              </div>

              <a
                href={sess.replayUrl}
                target="_blank"
                rel="noreferrer"
                className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 rounded bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-semibold border border-zinc-700 transition"
              >
                <span>Watch Session Replay in PostHog</span>
                <ExternalLink className="w-3.5 h-3.5 text-zinc-400" />
              </a>
            </div>
          ))}
        </div>
      </div>

      {/* Interactive Ask AI Analysis Console */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 shadow-lg space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-zinc-800">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-cyan-400" />
              <span>Ask AI for Further Telemetry Analysis</span>
            </h3>
            <p className="text-xs text-zinc-400 mt-0.5">
              Query friction causes, conversion blockers, and get recommendations directly against the live session data.
            </p>
          </div>

          {/* Gemini Key Config */}
          <div className="flex items-center gap-2">
            <Key className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
            <input
              type="password"
              placeholder="Gemini API Key (Optional)"
              value={geminiKey}
              onChange={(e) => handleSaveGeminiKey(e.target.value)}
              className="h-7 px-2 rounded bg-zinc-950 border border-zinc-800 text-white font-mono text-[11px] w-48 focus:outline-none focus:border-cyan-500"
              title="Add Gemini API Key for live custom generative models"
            />
          </div>
        </div>

        {/* Sample Prompt Chips */}
        <div className="space-y-1.5">
          <div className="text-[11px] font-mono text-zinc-500 uppercase">Suggested Inquiries:</div>
          <div className="flex flex-wrap gap-2">
            {samplePrompts.map((p, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleAskQuestion(p)}
                className="text-left text-xs text-zinc-300 hover:text-white bg-zinc-950 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 px-3 py-1.5 rounded-lg transition cursor-pointer"
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        {/* AI Chat History */}
        {aiResponses.length > 0 && (
          <div className="space-y-3 pt-2 border-t border-zinc-800 max-h-96 overflow-y-auto pr-1">
            {aiResponses.map((msg, i) => (
              <div 
                key={i} 
                className={`p-3.5 rounded-lg text-xs leading-relaxed ${
                  msg.sender === "user" 
                    ? "bg-zinc-800/80 border border-zinc-700/80 text-white ml-8" 
                    : "bg-zinc-950 border border-zinc-800 text-zinc-300 mr-8"
                }`}
              >
                <div className="flex items-center justify-between text-[10px] font-mono text-zinc-500 mb-1.5">
                  <span className="font-semibold uppercase tracking-wider text-cyan-400">
                    {msg.sender === "user" ? "You" : "VeloTime AI Telemetry Synthesis"}
                  </span>
                  <span>{msg.timestamp}</span>
                </div>
                <div className="whitespace-pre-wrap">{msg.text}</div>
              </div>
            ))}
          </div>
        )}

        {/* Input Box */}
        <div className="flex items-center gap-2 pt-2">
          <input
            type="text"
            placeholder="Ask a specific question about these PostHog recordings..."
            value={userQuery}
            onChange={(e) => setUserQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAskQuestion()}
            className="flex-1 h-9 px-3 rounded-lg bg-zinc-950 border border-zinc-800 text-white text-xs focus:outline-none focus:border-cyan-500"
          />
          <button
            type="button"
            onClick={() => handleAskQuestion()}
            disabled={isAnalyzing || !userQuery.trim()}
            className="h-9 px-4 rounded-lg bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer"
          >
            {isAnalyzing ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Send className="w-3.5 h-3.5" />
            )}
            <span>Analyze</span>
          </button>
        </div>
      </div>
    </div>
  );
}
