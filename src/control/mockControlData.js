/**
 * VeloTime Mission Control Baseline Telemetry & Configuration
 * Provides rich historical PostHog audits, GSC queries, and automation scripts.
 */

export const AUTHORIZED_ADMIN_EMAIL = "4thgencorei7@gmail.com";

export const CONTROL_SCRIPTS = [
  {
    id: "agency_outreach",
    name: "Design & Creative Agency Outreach Dispatcher",
    category: "Email Outreach",
    file: "scripts/dispatch-resend.mjs",
    workflowFile: "daily-leads.yml",
    description: "Dispatches genetic cold outreach batches to queued design, branding, and UX studios.",
    defaultFlags: {
      send: true,
      limit: 12,
      force: false,
      verify: true,
      test: false
    },
    flagOptions: [
      { key: "limit", label: "Batch Size", type: "number", default: 12 },
      { key: "send", label: "Live Send (--send)", type: "boolean", default: true },
      { key: "force", label: "Force Weekend/Hours (--force)", type: "boolean", default: false, note: "Bypasses Mon-Fri 9-5 EDT business hours lock" },
      { key: "verify", label: "Verify Window Duplicate (--verify)", type: "boolean", default: true }
    ],
    buildCommand: (flags) => {
      const parts = ["node scripts/dispatch-resend.mjs"];
      if (flags.send) parts.push("--send");
      if (flags.limit) parts.push(`--limit ${flags.limit}`);
      if (flags.force) parts.push("--force");
      if (flags.verify) parts.push("--verify");
      if (flags.test) parts.push("--test");
      return parts.join(" ");
    }
  },
  {
    id: "automated_followups",
    name: "Automated Outreach Follow-Ups Dispatcher",
    category: "Email Outreach",
    file: "scripts/dispatch-followups.mjs",
    workflowFile: "daily-leads.yml",
    description: "Checks CRM pipeline and sends stage 1 or stage 2 follow-ups to contacts due for response.",
    defaultFlags: {
      send: true,
      force: false
    },
    flagOptions: [
      { key: "send", label: "Live Send (--send)", type: "boolean", default: true },
      { key: "force", label: "Force Weekend/Hours (--force)", type: "boolean", default: false, note: "Bypasses business hours lock" }
    ],
    buildCommand: (flags) => {
      const parts = ["npm run dispatch-followups"];
      if (flags.force) parts.push("-- --force");
      return parts.join(" ");
    }
  },
  {
    id: "channel_multipliers",
    name: "Channel Multipliers Genetic Dispatcher",
    category: "Email Outreach",
    file: "scripts/dispatch-channel-multipliers.mjs",
    workflowFile: null,
    description: "Dispatches genetic outreach to Fractional CFOs, Agency Coaches, Fractional COOs, CAS Bookkeepers, and M&A Advisors.",
    defaultFlags: {
      send: false,
      dryRun: true,
      limit: 10,
      force: false,
      category: "all"
    },
    flagOptions: [
      { key: "limit", label: "Batch Size", type: "number", default: 10 },
      { key: "send", label: "Live Send (--send)", type: "boolean", default: false },
      { key: "dryRun", label: "Dry Run (--dry-run)", type: "boolean", default: true },
      { key: "category", label: "Vertical Category", type: "select", options: ["all", "fractional_cfo", "agency_consultants", "fractional_coo", "agency_bookkeeping", "agency_ma_advisors"], default: "all" },
      { key: "force", label: "Bypass Business Hours (--force)", type: "boolean", default: false }
    ],
    buildCommand: (flags) => {
      const parts = ["node scripts/dispatch-channel-multipliers.mjs"];
      if (flags.send) parts.push("--send");
      else parts.push("--dry-run");
      if (flags.limit) parts.push(`--limit ${flags.limit}`);
      if (flags.category && flags.category !== "all") parts.push(`--category ${flags.category}`);
      if (flags.force) parts.push("--force");
      return parts.join(" ");
    }
  },
  {
    id: "architecture_outreach",
    name: "Architecture & Landscape Outreach (Strict NY Quarantine)",
    category: "Email Outreach",
    file: "scripts/architecture-reachout.mjs",
    workflowFile: null,
    description: "Isolated architecture reachout script. STRICT SAFETY: Excludes 100% of New York studios and blocks sending unless user approved.",
    safetyLock: "Requires manual --user-approved flag to send. Completely isolated from automated runs.",
    defaultFlags: {
      send: false,
      userApproved: false,
      limit: 5
    },
    flagOptions: [
      { key: "limit", label: "Batch Size", type: "number", default: 5 },
      { key: "send", label: "Attempt Send (--send)", type: "boolean", default: false },
      { key: "userApproved", label: "Manual Approval Lock (--user-approved)", type: "boolean", default: false, note: "Mandatory safety lock to dispatch" }
    ],
    buildCommand: (flags) => {
      const parts = ["node scripts/architecture-reachout.mjs"];
      if (flags.send) parts.push("--send");
      if (flags.userApproved) parts.push("--user-approved");
      if (flags.limit) parts.push(`--limit ${flags.limit}`);
      return parts.join(" ");
    }
  },
  {
    id: "daily_lead_finder",
    name: "Agency Lead Discovery & MX Verifier",
    category: "Lead Generation",
    file: "scripts/daily-lead-finder.mjs",
    workflowFile: "daily-leads.yml",
    description: "Discovers new independent design studios, verifies MX records, enriches via AI, and maintains queue buffer.",
    defaultFlags: {
      queueBuffer: 24,
      batchSize: 12
    },
    flagOptions: [
      { key: "queueBuffer", label: "Target Queue Buffer", type: "number", default: 24 },
      { key: "batchSize", label: "Leads Batch Size", type: "number", default: 12 }
    ],
    buildCommand: (flags) => {
      return `npm run fetch-leads`;
    }
  },
  {
    id: "channel_multiplier_finder",
    name: "Channel Multipliers Lead Finder",
    category: "Lead Generation",
    file: "scripts/channel-multiplier-lead-finder.mjs",
    workflowFile: null,
    description: "Discovers and verifies DNS MX records for Fractional CFOs, Agency Coaches, COOs, and M&A Advisors.",
    defaultFlags: {
      mode: "review",
      limit: 20
    },
    flagOptions: [
      { key: "mode", label: "Action Mode", type: "select", options: ["review", "queue"], default: "review" },
      { key: "limit", label: "Max Candidates", type: "number", default: 20 }
    ],
    buildCommand: (flags) => {
      return `node scripts/channel-multiplier-lead-finder.mjs --${flags.mode || 'review'} --limit ${flags.limit || 20}`;
    }
  },
  {
    id: "posthog_auditor",
    name: "PostHog Session Recording Auditor",
    category: "Analytics & UX",
    file: "scripts/posthog-recording-auditor.mjs",
    workflowFile: null,
    description: "Pulls recent PostHog session replays, identifies friction and click drop-offs, and synthesizes UX findings.",
    defaultFlags: {
      hours: 6
    },
    flagOptions: [
      { key: "hours", label: "Lookback Hours", type: "number", default: 6 }
    ],
    buildCommand: () => "node scripts/posthog-recording-auditor.mjs"
  },
  {
    id: "gsc_watchdog",
    name: "Google Search Console Weekly Watchdog",
    category: "SEO & Growth",
    file: "scripts/gsc-weekly-watchdog.mjs",
    workflowFile: "gsc-watchdog.yml",
    description: "Queries Search Console API, verifies trailing 7-day impressions and clicks, audits sitemaps and triggers indexing.",
    defaultFlags: {},
    flagOptions: [],
    buildCommand: () => "node scripts/gsc-weekly-watchdog.mjs"
  },
  {
    id: "auto_blog",
    name: "Autonomous SEO Article Generator",
    category: "SEO & Content",
    file: "scripts/auto-blog.js",
    workflowFile: "auto-blog.yml",
    description: "Generates high-intent evergreen comparison and agency operations guides for search ranking.",
    defaultFlags: {},
    flagOptions: [],
    buildCommand: () => "npm run auto-blog"
  },
  {
    id: "twitter_radar",
    name: "Twitter Timesheet Breakout Radar",
    category: "Social & Growth",
    file: "scripts/twitter-timesheet-radar.js",
    workflowFile: "twitter-radar.yml",
    description: "Monitors Twitter/X for viral conversations regarding timesheets, Harvest, and Toggl friction.",
    defaultFlags: {},
    flagOptions: [],
    buildCommand: () => "npm run twitter-radar"
  }
];

export const LATEST_POSTHOG_AUDIT = {
  date: "Sat, 10 Oct 2026 14:52:08 GMT (10:52 AM EDT)",
  window: "Past 6 Hours",
  sessionsCount: 2,
  dwellAvgSeconds: 36,
  totalClicks: 2,
  sessionsWithClicks: 1,
  errorCount: 0,
  trafficSource: "Direct Web / Google Ads PMax Campaign",
  summary: "Two Google Ads sessions evaluated. One quick bounce (4s, 0 clicks) and one high-engagement session (67s, 2 clicks, 8s active dwell).",
  observedFriction: [
    "High initial bounce on session 01a12591... indicating hero value proposition needs immediate clarity within first 3 seconds.",
    "Session 01a1256e... dwelled 67 seconds with 2 clicks but did not navigate forward to app signup flow.",
    "Opportunity to introduce a direct, high-contrast primary CTA button driving straight to app.velotime.dg.tools."
  ],
  recommendations: [
    "Refine hero section headline to state 10-second weekly matrix benefit immediately against Harvest/Toggl.",
    "Streamline navigation so Google Ads traffic has a clear, singular conversion funnel.",
    "Add 3-step 'How It Works' visual proof directly under hero to resolve hesitation."
  ],
  sessions: [
    {
      id: "01a1256e-d06a-7bb6-9c9f-affa6b69273f",
      segment: "High Engagement",
      duration: "67s",
      activeDuration: "8s",
      clicks: 2,
      errors: 0,
      campaignId: "24309795540",
      entryUrl: "https://velotime.dg.tools/?gad_source=1&gad_campaignid=24309795540...",
      replayUrl: "https://us.posthog.com/project/527395/replay/01a1256e-d06a-7bb6-9c9f-affa6b69273f"
    },
    {
      id: "01a12591-5309-76fe-92b0-580cd6057f31",
      segment: "Quick Bounce",
      duration: "4s",
      activeDuration: "2s",
      clicks: 0,
      errors: 0,
      campaignId: "24309795540",
      entryUrl: "https://velotime.dg.tools/?gad_source=1&gad_campaignid=24309795540...",
      replayUrl: "https://us.posthog.com/project/527395/replay/01a12591-5309-76fe-92b0-580cd6057f31"
    }
  ]
};

export const GSC_TELEMETRY = {
  scorecard: {
    totalClicks7d: 3,
    targetClicks: 2,
    avgDailyImpressions: 142,
    targetImpressions: 100,
    avgPosition: 28.4,
    indexedPagesCount: 142,
    totalSitemapPages: 142
  },
  topQueries: [
    { query: "agency timesheet software", impressions: 380, clicks: 1, ctr: "0.26%", pos: "24.2" },
    { query: "harvest alternative", impressions: 215, clicks: 1, ctr: "0.47%", pos: "18.6" },
    { query: "toggl alternative", impressions: 190, clicks: 0, ctr: "0.00%", pos: "22.1" },
    { query: "timesheet software for design studios", impressions: 165, clicks: 1, ctr: "0.61%", pos: "14.8" },
    { query: "weekly timesheet matrix", impressions: 110, clicks: 0, ctr: "0.00%", pos: "12.4" },
    { query: "clockify alternative for agencies", impressions: 95, clicks: 0, ctr: "0.00%", pos: "31.2" },
    { query: "harvest pricing vs velotime", impressions: 78, clicks: 0, ctr: "0.00%", pos: "19.5" },
    { query: "effective hourly rate calculator", impressions: 64, clicks: 0, ctr: "0.00%", pos: "11.2" }
  ],
  landingPages: [
    { url: "https://velotime.dg.tools/", impressions: 420, clicks: 2, status: "Indexed & Live" },
    { url: "https://velotime.dg.tools/compare/harvest", impressions: 210, clicks: 1, status: "Indexed & Live" },
    { url: "https://velotime.dg.tools/for/graphic-designers", impressions: 180, clicks: 0, status: "Indexed & Live" },
    { url: "https://velotime.dg.tools/for/software-agencies", impressions: 145, clicks: 0, status: "Indexed & Live" },
    { url: "https://velotime.dg.tools/tools/bench-cost", impressions: 92, clicks: 0, status: "Indexed & Live" },
    { url: "https://velotime.dg.tools/compare/toggl", impressions: 88, clicks: 0, status: "Indexed & Live" }
  ]
};

export const MINI_POSTHOG_METRICS = {
  activeVisitorsNow: 1,
  sessionsToday: 18,
  avgSessionSeconds: 42,
  bounceRate: "44.4%",
  errorRate: "0.0%",
  topReferrers: [
    { source: "Google Ads (PMax & Search)", count: 12, pct: "66.7%" },
    { source: "Direct Web", count: 4, pct: "22.2%" },
    { source: "Email Outreach (VeloTime Links)", count: 2, pct: "11.1%" }
  ],
  deviceSplit: {
    desktop: "78%",
    mobile: "22%"
  },
  topEvents: [
    { event: "$pageview", count: 46 },
    { event: "cta_click", count: 8 },
    { event: "demo_interaction", count: 6 },
    { event: "pricing_toggle", count: 4 },
    { event: "true_signup_conversion", count: 1 }
  ]
};
