export const MARKETING_AGENT_LS_KEY = "velotime_marketing_agent_blueprint_v2";

export const ORG_ROLES = [
  {
    id: "scout",
    title: "The Scout",
    subtitle: "Divergent Explorer",
    focus: "Hunts 1-star competitor reviews, pricing hikes, niche ICP communities, and uncharted distribution surfaces.",
    allocationLabel: "Drives Explore Cycles",
  },
  {
    id: "cmo",
    title: "CMO Strategist",
    subtitle: "Filter & Bet Designer",
    focus: "Synthesizes Scout research with PostHog/Ads telemetry, kills fluff, and drafts falsifiable Bet Memos with Kill Criteria.",
    allocationLabel: "Owns Weekly Win Score",
  },
  {
    id: "operator",
    title: "The Operator",
    subtitle: "Guardrailed Executor",
    focus: "Runs daily Ads hygiene, cold email vetting, PostHog diagnostics, and approved experiments under hard budget caps.",
    allocationLabel: "Drives Exploit Cycles",
  },
];

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
      "Continuously mines signals and prepares scored proposals & CMO Bet Memos; waits for explicit approval in Control Panel or Discord before acting.",
    risk: "Gated execution",
  },
  {
    id: "bounded_autonomous",
    label: "Bounded Autonomous",
    summary:
      "Auto-executes pre-approved low-risk hygiene (e.g., negative keyword pruning inside cap) and escalates budget, copy, or novel channels.",
    risk: "Guardrail-capped",
  },
];

export const COGNITIVE_LOOP_STAGES = [
  {
    step: "01",
    name: "Sense",
    role: "Market Signal Ingestion",
    description:
      "Pulls Clerk verified signups, PostHog human recordings & drop-offs, Arctic Shift Reddit pain threads, Google Ads search terms, and Scout web research.",
    cadenceNote: "Wakes on active poll interval; drops to deep sleep during quiet hours or zero-change streaks.",
    readiness: "Backend Pollers Ready",
  },
  {
    step: "02",
    name: "Hypothesize",
    role: "Scout & CMO Synthesis",
    description:
      "Splits 70% Exploit (optimize Ads/Email/CRO) and 30% Explore (hunt new verticals, competitor dislocations, and uncharted channels).",
    cadenceNote: "Generates structured Bet Memos with mandatory 7-day Kill Criteria.",
    readiness: "Ready once LLM key is added",
  },
  {
    step: "03",
    name: "Score",
    role: "Anti-Gaming Utility Evaluation",
    description:
      "Ranks every candidate bet against expected weekly win-condition points minus guardrail risk and spam/irrelevant-click penalties.",
    cadenceNote: "Zero points for brainstorming; points awarded only for verified outcomes & clean falsification.",
    readiness: "PostgreSQL Ledger Live",
  },
  {
    step: "04",
    name: "Act or Escalate",
    role: "Channel Execution & Discord Gate",
    description:
      "Routes high-impact bets, spend changes, and new channel requests to Discord/Control approval cards with hard code-enforced brand lint.",
    cadenceNote: "Respects global kill switch, hard daily caps, and brand-ethics validator.",
    readiness: "API + Discord Interactions Route Ready",
  },
  {
    step: "05",
    name: "Reflect & Remember",
    role: "Closed-Loop Attribution",
    description:
      "Audits 7-day post-action PostHog & DB telemetry to promote winning angles into memory and retire losing bets automatically.",
    cadenceNote: "Summarized in daily 20:00 ET digest; auto-sleeps after consecutive zero-progress cycles.",
    readiness: "PostgreSQL Signals & Runs Live",
  },
];

export const SAMPLE_BET_MEMOS = [
  {
    id: "sample-bet-cas-partners",
    schemaTag: "EXAMPLE BET MEMO",
    channel: "Partner Channel / CAS Bookkeepers",
    title: "Fractional CFO & CAS Bookkeeping Partner Referral Wedge",
    marketEvidence:
      "Accounting forums show widespread frustration with QuickBooks Time ($20-$40/mo base + $8-$10/user) and Harvest usage fees across client agencies.",
    targetIcp: "CAS bookkeeping firms & fractional CFOs advising 5-30 retainer agencies",
    mvpTest:
      "Publish a clean /partners brief + send 25 curated plain-text founder notes offering free 15-min migration for their agency clients at flat $5/seat.",
    estimatedCostUsd: 0,
    expectedPoints: 75,
    killCriteria: "Kill angle after 7 days if < 2 positive partner replies out of 25 vetted emails.",
  },
  {
    id: "sample-bet-agency-newsletters",
    schemaTag: "EXAMPLE BET MEMO",
    channel: "B2B Newsletter Sponsorships",
    title: "Micro-Newsletter Test Targeting Boutique Dev & Design Agency Owners",
    marketEvidence:
      "Search CPC on 'timesheet software for agency' averages ~$9.80/click; niche agency-owner newsletters (5k-15k subs) reach verified founders at lower effective CPC.",
    targetIcp: "Founders/COOs of 5-25 person web dev, branding, and CRO agencies",
    mvpTest:
      "Identify 10 US agency-ops newsletters, request media kits under $100 test budget or founder interview swaps, and track dedicated UTM signup lift.",
    estimatedCostUsd: 100,
    expectedPoints: 60,
    killCriteria: "Kill channel if effective cost per engaged evaluation exceeds $20 over 7 days.",
  },
];

export const SAMPLE_CAPABILITY_REQUESTS = [
  {
    id: "sample-cap-xero-dir",
    schemaTag: "EXAMPLE CHANNEL REQUEST",
    channel: "Accounting App Marketplaces",
    title: "Unlock Xero & QuickBooks App Store Listings",
    rationale:
      "High-intent agencies searching inside accounting ecosystems convert at significantly higher rates than cold search clicks. VeloTime already supports Xero & QBO exports.",
    setupSteps:
      "Submit developer partner listing with verified screenshots, flat $5/seat pricing sheet, and 1-click export walkthrough.",
  },
  {
    id: "sample-cap-g2-capterra",
    schemaTag: "EXAMPLE CHANNEL REQUEST",
    channel: "Software Review Directories",
    title: "Establish Verified G2 & Capterra Comparison Presence",
    rationale:
      "Prospects evaluating Harvest/Toggl/Clockify alternatives consistently check third-party review directories before starting a trial.",
    setupSteps:
      "Claim official VeloTime LLC vendor profile on G2 and Capterra; link directly from post-onboarding feedback prompts.",
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
];

export const DEFAULT_AGENT_CONFIG = {
  runtimeStatus: "phase1_backbone",
  autonomyMode: "human_in_loop",
  modelRouting: {
    fastModel: "gemini-4-hydrogen",
    fastThinkingLevel: "low",
    deepModel: "gemini-4-neon",
    deepThinkingLevel: "high",
    frontierModel: "gemini-4-carbon",
    frontierThinkingLevel: "medium",
    enableGoogleSearchGrounding: true,
    autoEscalateToFrontierOnZeroProgress: true,
  },
  exploreExploitSplit: {
    exploitPct: 70,
    explorePct: 30,
    maxConcurrentBets: 3,
    monthlyExplorationBudgetUsd: 100,
  },
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
      label: "Clean 7-Day Bet Falsification / Validated Angle",
      category: "learning",
      points: 15,
      antiGamingRule: "Zero points for brainstorming; awarded only after an instrumented test finishes cleanly.",
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
  scoutMissions: [
    {
      id: "competitor_1star_reviews",
      name: "Competitor 1-Star Review Mining",
      queryHint: "Harvest Toggl Clockify Everhour Tempo G2 Capterra pricing complaints 2026",
      targetSurface: "G2, Capterra, Trustpilot, Reddit",
      enabled: true,
    },
    {
      id: "pricing_dislocations",
      name: "Pricing & Paywall Dislocations",
      queryHint: "Harvest Flex usage fees Toggl 3-user limit Clockify 2026 price hike",
      targetSurface: "Pricing changelogs, forums, community threads",
      enabled: true,
    },
    {
      id: "alt_distribution",
      name: "Alternative Distribution Channels",
      queryHint: "Xero QuickBooks Linear app directory agency newsletters Chrome Web Store timesheet",
      targetSurface: "Partner directories, B2B newsletters, integrations",
      enabled: true,
    },
    {
      id: "niche_partner_wedges",
      name: "Niche Vertical & Partner Wedges",
      queryHint: "CAS bookkeeping firms fractional CFO architecture studio timesheet workflow",
      targetSurface: "CPA, CAS, Fractional CFO, MSP communities",
      enabled: true,
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
      currentInfra: "Backend poller + Dashboard 2408846",
      missingForAutonomy: "POSTHOG_PERSONAL_API_KEY in Railway",
      mode: "enabled",
      requireApproval: false,
      triggerCadence: "Every 4h + 20:00 ET digest",
    },
    {
      id: "reddit",
      name: "Reddit & Community Radar (Arctic Shift)",
      surface: "High-intent pain monitoring, draft response generation",
      currentInfra: "Live Arctic Shift poller + Control Queue",
      missingForAutonomy: "Discord approve-to-copy bridge",
      mode: "enabled",
      requireApproval: true,
      triggerCadence: "Hourly active / 6h idle",
    },
    {
      id: "seo_research",
      name: "SEO & New Angle Discovery (Scout + GSC)",
      surface: "Competitor pricing shifts, keyword gaps, new positioning experiments",
      currentInfra: "Tavily/Brave scout hook + GSC Telemetry",
      missingForAutonomy: "TAVILY_API_KEY or BRAVE_SEARCH_API_KEY + LLM key",
      mode: "shadow",
      requireApproval: true,
      triggerCadence: "Weekly + ad-hoc signal spikes",
    },
    {
      id: "discord_bridge",
      name: "Discord Human-in-the-Loop Escalation",
      surface: "2-way Q&A, Approve/Reject actions, daily digest, kill-switch",
      currentInfra: "1-way webhook + /api/webhooks/discord-interactions",
      missingForAutonomy: "DISCORD_PUBLIC_KEY + DISCORD_BOT_TOKEN in Railway",
      mode: "shadow",
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
      trigger: "New Marketing Concept or CMO Bet Memo Proposal",
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
        "Boutique agencies (4-15 seats) hit Toggl 3-user free wall and $16-$24/seat profitability gate; leading with flat $5/seat + inline approvals lifts positive reply rate.",
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
