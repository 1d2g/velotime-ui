export const MARKETING_AGENT_LS_KEY = "velotime_marketing_agent_blueprint_v1";

export const AUTONOMY_MODES = [
  {
    id: "observe_only",
    label: "Observe Only",
    summary:
      "Polls market signals on schedule, scores outcomes, and logs hypotheses without proposing live edits or drafting outreach.",
    risk: "Zero execution risk",
  },
  {
    id: "human_in_loop",
    label: "Human-in-the-Loop",
    summary:
      "Continuously mines signals and prepares scored proposals; waits for explicit approval in Control Panel or Discord before acting.",
    risk: "Gated execution",
  },
  {
    id: "bounded_autonomous",
    label: "Bounded Autonomous",
    summary:
      "Auto-executes pre-approved low-risk hygiene (e.g., negative keyword pruning inside cap) and escalates budget, copy, or novel angles.",
    risk: "Guardrail-capped",
  },
];

export const COGNITIVE_LOOP_STAGES = [
  {
    step: "01",
    name: "Sense",
    role: "Market Signal Ingestion",
    description:
      "Pulls Google Ads search terms & CPC shifts, PostHog human recordings & drop-offs, Arctic Shift Reddit threads, GSC impressions, and cold email reply states.",
    cadenceNote: "Wakes on active poll interval; drops to deep sleep during quiet hours or zero-change streaks.",
    readiness: "Partial APIs exist (no unified daemon)",
  },
  {
    step: "02",
    name: "Hypothesize",
    role: "Concept & Angle Synthesis",
    description:
      "Clusters recurring pain points (e.g., Harvest usage fees, Toggl 3-user cap, Excel drift) to propose new landing variants, outreach angles, or ad negative rules.",
    cadenceNote: "Triggered when anomalous CPA, bounce leaks, or new competitor pricing patterns appear.",
    readiness: "Blueprint schema only",
  },
  {
    step: "03",
    name: "Score",
    role: "Anti-Gaming Utility Evaluation",
    description:
      "Ranks every candidate action against expected weekly win-condition points minus guardrail risk and spam/irrelevant-click penalties.",
    cadenceNote: "Enforces positive expected value before surfacing to queue.",
    readiness: "Editable weights in Console",
  },
  {
    step: "04",
    name: "Act or Escalate",
    role: "Channel Execution & Discord Gate",
    description:
      "Routes high-impact changes (spend caps, public Reddit replies, cold email sends, new experiments) to Discord/Control approval cards; logs or executes bounded tasks.",
    cadenceNote: "Respects hard daily caps and immediate kill-switch state.",
    readiness: "Schema preview + 1-way Discord webhook",
  },
  {
    step: "05",
    name: "Reflect & Remember",
    role: "Closed-Loop Attribution",
    description:
      "Audits 7-day post-action PostHog & Ads telemetry to promote winning hypotheses into memory and retire losing angles automatically.",
    cadenceNote: "Summarized in daily 20:00 ET digest; auto-pauses after consecutive zero-progress cycles.",
    readiness: "Seeded baseline signals",
  },
];

export const SAMPLE_APPROVAL_CARDS = [
  {
    id: "sample-ads-negatives",
    schemaTag: "EXAMPLE SCHEMA (NOT LIVE)",
    channel: "Google Ads (101-947-0280)",
    title: "Prune 8 Brand-Login Close Variants from 'Agency Timesheets'",
    signal:
      "Nov 24 Search Terms showed 'timesheet software for agency' (Phrase) matching 'trackmytime com' ($9.69 bounce in 13s) plus 'tcplusondemand', 'payworks timesheet', and 'uattend'.",
    reasoning:
      "Third-party login portals generate near-100% immediate bounces and inflate CPA without product evaluation.",
    proposedAction:
      "Append exact-match negative keywords to public/ads/negative-patterns.json and sync into campaign 'Velotime'.",
    expectedPoints: "+25 pts (CPA & leak reduction)",
    riskLevel: "Low",
  },
  {
    id: "sample-outreach-angle",
    schemaTag: "EXAMPLE SCHEMA (NOT LIVE)",
    channel: "Cold Email Outreach",
    title: "Test Harvest Renewal Usage-Fee Follow-Up Angle for Mid-Size Agencies",
    signal:
      "Paid Harvest switcher clicks and Reddit r/HarvestApp threads continue spiking around Bending Spoons Enterprise gating ($14-$17.50/seat) and usage fees.",
    reasoning:
      "Framing flat $5/seat pricing alongside 1-click Harvest CSV migration addresses the exact billing trigger before annual renewal.",
    proposedAction:
      "Run a 25-lead A/B slice with plain-text founder note offering free 15-minute workspace pre-population, capped inside the 100/day ceiling.",
    expectedPoints: "+40 pts (Projected positive replies)",
    riskLevel: "Medium",
  },
  {
    id: "sample-cro-hypothesis",
    schemaTag: "EXAMPLE SCHEMA (NOT LIVE)",
    channel: "PostHog CRO & /compare",
    title: "Launch Agency Segment Proof Strip Above Fold for Paid Search Arrivals",
    signal:
      "Human session replays confirm sub-600ms FCP/LCP and heavy homepage scroll depth (84%), while paid visitors want instant side-by-side pricing proof.",
    reasoning:
      "Surfacing 10-second matrix + optional live timers + flat $5/seat economics immediately reduces pogo-sticking on paid terms.",
    proposedAction:
      "Draft an experiment PR adding a compact agency segment proof block and measure Engaged Product Evaluation conversion lift over 7 days.",
    expectedPoints: "+35 pts (Eval-to-Signup lift)",
    riskLevel: "Low",
  },
];

export const DEFAULT_AGENT_CONFIG = {
  runtimeStatus: "dormant_skeleton",
  autonomyMode: "human_in_loop",
  cadence: {
    activePollMinutes: 60,
    idleSleepHours: 6,
    quietHoursStartET: "22:00",
    quietHoursEndET: "08:00",
    dailyDigestTimeET: "20:00",
  },
  guardrails: {
    dailyAdSpendCapUsd: 25,
    maxEmailsPerDay: 100,
    maxRedditDraftsPerDay: 6,
    maxCpcCeilingUsd: 10,
    requireApprovalForSpendChange: true,
    requireApprovalForPublicPost: true,
    requireApprovalForNewExperiment: true,
  },
  winCondition: {
    weeklyPointTarget: 250,
    reviewWindowDays: 7,
    stopOnZeroProgressCycles: 3,
  },
  scoringRules: [
    {
      id: "trial_signup",
      label: "Verified Trial Signup",
      category: "conversion",
      points: 100,
      antiGamingRule: "Must pass Clerk auth + human verification; guest sandbox sessions excluded.",
    },
    {
      id: "engaged_eval",
      label: "Engaged Product Evaluation / Sandbox Interaction",
      category: "activation",
      points: 25,
      antiGamingRule: "Requires multi-tab dwell or real matrix edit; synthetic hero animations excluded.",
    },
    {
      id: "positive_reply",
      label: "Positive Cold Outreach Reply",
      category: "outreach",
      points: 20,
      antiGamingRule: "Excludes OOO autoresponders, bounces, and polite unsubscribe requests.",
    },
    {
      id: "high_intent_click",
      label: "High-Intent Paid Click Under CPC Cap",
      category: "acquisition",
      points: 10,
      antiGamingRule: "Requires dwell >= 15s and valid non-brand-login search term.",
    },
    {
      id: "validated_experiment",
      label: "Validated New Experiment / Angle Shipped",
      category: "learning",
      points: 15,
      antiGamingRule: "Awarded only after instrumentation check passes in PostHog/Ads.",
    },
    {
      id: "irrelevant_click",
      label: "Irrelevant Paid Click / Brand-Login Leak",
      category: "penalty",
      points: -25,
      antiGamingRule: "Triggered when search term matches third-party login portal or < 15s bounce.",
    },
    {
      id: "outreach_bounce_spike",
      label: "Outreach Bounce / Unsubscribe Spike",
      category: "penalty",
      points: -30,
      antiGamingRule: "Triggered if batch bounce rate > 3% or complaint threshold breached.",
    },
    {
      id: "policy_violation",
      label: "Policy / Brand Guardrail Violation",
      category: "penalty",
      points: -100,
      antiGamingRule: "Hard penalty for emojis in UI copy, unverified product claims, or anti-stopwatch dogma.",
    },
  ],
  channels: [
    {
      id: "google_ads",
      name: "Google Ads (101-947-0280)",
      surface: "Search term mining, negative pruning, CPC & landing page audits",
      currentInfra: "Hygiene script + UI",
      missingForAutonomy: "Google Ads API credentials + scheduled runner",
      mode: "shadow",
      requireApproval: true,
      triggerCadence: "Every 6h during business hours",
    },
    {
      id: "outreach",
      name: "Cold Email Outreach (genetic-engine.mjs)",
      surface: "Lead sourcing, MX/role-box vetting, batch dispatch, reply triage",
      currentInfra: "CLI engine + Resend",
      missingForAutonomy: "Inbound reply webhook + scheduler",
      mode: "shadow",
      requireApproval: true,
      triggerCadence: "Daily pre-flight at 08:30 ET",
    },
    {
      id: "posthog",
      name: "PostHog Behavior & CRO (Project 527395)",
      surface: "Human recording digests, drop-off detection, landing-page hypotheses",
      currentInfra: "API + Dashboard 2408846",
      missingForAutonomy: "Nightly LLM session analyzer",
      mode: "enabled",
      requireApproval: false,
      triggerCadence: "Every 4h + 20:00 ET digest",
    },
    {
      id: "reddit",
      name: "Reddit & Community Radar (Arctic Shift)",
      surface: "High-intent pain monitoring, draft response generation",
      currentInfra: "Arctic Shift scanner + Control Queue",
      missingForAutonomy: "Discord approve-to-copy bridge",
      mode: "shadow",
      requireApproval: true,
      triggerCadence: "Every 60m active / 6h idle",
    },
    {
      id: "seo_research",
      name: "SEO & New Angle Discovery (GSC + Competitor Watch)",
      surface: "Competitor pricing shifts, keyword gaps, new positioning experiments",
      currentInfra: "GSC Telemetry tab",
      missingForAutonomy: "Web research worker + content drafter",
      mode: "shadow",
      requireApproval: true,
      triggerCadence: "Weekly + ad-hoc signal spikes",
    },
    {
      id: "discord_bridge",
      name: "Discord Human-in-the-Loop Escalation",
      surface: "2-way Q&A, Approve/Reject actions, daily digest, kill-switch",
      currentInfra: "1-way reminder webhook",
      missingForAutonomy: "Discord Bot Gateway / Interactions endpoint",
      mode: "disabled",
      requireApproval: false,
      triggerCadence: "Event-driven + 20:00 ET summary",
    },
  ],
  discordEscalationRules: [
    {
      id: "budget_cpc_spike",
      trigger: "Daily Ad Spend > 80% Cap or CPC Spike > Ceiling",
      route: "immediate_ping",
    },
    {
      id: "new_experiment",
      trigger: "New Marketing Concept or Landing Variant Proposal",
      route: "immediate_ping",
    },
    {
      id: "ambiguous_reply",
      trigger: "Ambiguous or High-Value Prospect Reply in Cold Outreach",
      route: "immediate_ping",
    },
    {
      id: "negative_batch",
      trigger: "Search Term Negative Keyword Pruning Batch",
      route: "daily_digest",
    },
    {
      id: "daily_score",
      trigger: "Weekly Win-Condition Score & Recording Digest",
      route: "daily_digest",
    },
  ],
  experiments: [
    {
      id: "exp-harvest-migration",
      title: "Harvest 2026 Renewal Concierge Offer",
      channel: "Google Ads + /compare/harvest",
      hypothesis:
        "Highlighting 1-click Harvest CSV migration + 15-min founder setup and $0 usage fees above the fold converts Harvest Flex switchers faster than generic grid messaging.",
      successMetric: "Sign Up Page Visit & Signup conversion rate on harvest_switch ad group",
      status: "testing",
      expectedPoints: 100,
    },
    {
      id: "exp-brand-login-pruning",
      triggerNote: "",
      title: "Exact-Match Login Leak Pruning on Agency Timesheets",
      channel: "Google Ads",
      hypothesis:
        "Excluding brand-login queries (trackmytime, tcplusondemand, payworks, uattend) eliminates $9-$10 wasted bounce clicks while preserving agency buyer budget.",
      successMetric: "Bounce rate < 45% and avg dwell > 45s on agency_timesheets traffic",
      status: "queued",
      expectedPoints: 50,
    },
    {
      id: "exp-toggl-free-cap",
      title: "Toggl 3-User Cap Outbound Micro-Cohort",
      channel: "Cold Email Outreach",
      hypothesis:
        "Boutique agencies (4-15 seats) hit Toggl's 3-user free wall and $16-$24/seat profitability gate; leading with flat $5/seat + inline approvals lifts positive reply rate.",
      successMetric: "Positive reply rate >= 2.5% with bounce rate < 2%",
      status: "proposed",
      expectedPoints: 60,
    },
    {
      id: "exp-interactive-timer-proof",
      title: "Hybrid Workflow Clarity: 10s Keyboard Grid + Optional Live Timers",
      channel: "Landing & Reddit Radar",
      hypothesis:
        "Showcasing both batch Friday entry and built-in live stopwatch / Chrome extension removes objections from stopwatch-habit teams evaluating VeloTime.",
      successMetric: "Engaged Product Evaluation events per 100 human sessions",
      status: "proposed",
      expectedPoints: 40,
    },
  ],
  brandGuardrails: [
    {
      id: "zero_emojis",
      title: "Zero Emojis Anywhere",
      detail: "Never emit emojis in landing copy, ad extensions, cold emails, or Control UI. Use typography and Lucide vector icons only.",
      locked: true,
    },
    {
      id: "strict_truth",
      title: "Strict Product Truth",
      detail: "Only claim currently shipped features (10s keyboard matrix, optional live timers, Chrome extension, retainer budgets, approvals, 1-click CSV/invoicing, Xero/QBO export).",
      locked: true,
    },
    {
      id: "no_anti_stopwatch",
      title: "No Anti-Stopwatch Dogma",
      detail: "Never claim VeloTime replaces or lacks timers. Lead with positive batch velocity + optional live timers at a flat $5/seat/month.",
      locked: true,
    },
    {
      id: "b2b_tone",
      title: "High-Contrast Monochromatic B2B Aesthetic",
      detail: "Keep UI and copy concise, direct, analytical, and free of hype or novelty gimmicks.",
      locked: true,
    },
  ],
  baselineSignals: [
    {
      id: "sig-2026-11-24-harvest",
      tag: "Seeded Baseline",
      date: "2026-11-24",
      source: "Google Ads + PostHog",
      summary:
        "High-intent Harvest comparison queries ('harvest vs toggl', 'harvest time tracking pricing', 'harvest price increases') drove $9.94 CPC engagement; cleared 66 keyword URL overrides.",
    },
    {
      id: "sig-2026-11-24-leak",
      tag: "Seeded Baseline",
      date: "2026-11-24",
      source: "Google Ads Search Terms",
      summary:
        "Phrase match 'timesheet software for agency' leaked 38 impressions onto third-party login queries ('trackmytime com' $9.69 13s bounce) -> prime negative pruning candidate.",
    },
    {
      id: "sig-2026-11-24-cro",
      tag: "Seeded Baseline",
      date: "2026-11-24",
      source: "PostHog Session Replays",
      summary:
        "Fixed /compare above-the-fold CTA gap, tightened /compare/[competitor] proof fold, and eliminated synthetic hero showcase keypress inflation.",
    },
  ],
};
