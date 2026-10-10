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
    workflowFile: "posthog-audit.yml",
    acceptsInputs: true,
    description: "Pulls recent PostHog session replays, identifies friction and click drop-offs, and synthesizes UX findings.",
    defaultFlags: {
      hours: 6
    },
    flagOptions: [
      { key: "hours", label: "Lookback Hours", type: "number", default: 6 }
    ],
    buildCommand: (flags) => `node scripts/posthog-recording-auditor.mjs${flags?.hours ? ` --hours=${flags.hours}` : ""}`
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

export const REPEAT_VISITORS_DATA = {
  scorecard: {
    repeatRate: "21.4%",
    totalTrackedPersons: 136,
    repeatVisitorsCount: 29,
    avgDaysToReturn: "2.6d",
    completedSignups: 0,
    trialIntentRate: "3.7%",
    trialIntentClicks: 5,
    avgDwellRepeat: "142s",
    avgDwellSingle: "31s"
  },
  cohortDistribution: [
    { visits: "1 Visit", pct: "78.6%", count: 107, label: "Single-Touch Bounce / Discovery" },
    { visits: "2 Visits", pct: "13.8%", count: 19, label: "Re-evaluated Demo or Comparison" },
    { visits: "3-5 Visits", pct: "5.5%", count: 7, label: "Multi-Touch Evaluation (Unconverted)" },
    { visits: "6+ Visits", pct: "2.1%", count: 3, label: "Chronic Return / Internal Audit" }
  ],
  profiles: [
    {
      id: "01a122bb-fe46-7b31-aab2-856f9bb5d8b5",
      alias: "Agency Lead (Norwich, NY - 5m Dwell)",
      location: "Norwich, NY, United States",
      device: "Desktop (Edge / Windows)",
      primarySource: "Google Ads (Campaign 24295180019)",
      totalSessions: 2,
      pageviews: 3,
      clicks: 0,
      activeDays: 1,
      spanHours: "301s (5.0m)",
      firstSeen: "Oct 9, 2026 18:15 EDT",
      lastSeen: "Oct 9, 2026 18:20 EDT",
      status: "Hovered & Bounced (0 Clicks)",
      pathsVisited: ["/demo"],
      evolutionSummary: "Arrived from Google Ads targeting NY agencies. Dwelled for over 5 minutes hovering over the timesheet grid and feature sections, but left without clicking CTA or registering.",
      journey: [
        {
          sessionNumber: 1,
          date: "Oct 9, 2026 • 18:15 EDT",
          entryUrl: "/demo?gad_source=2&gad_campaignid=24295180019",
          dwell: "301s",
          clicks: 0,
          notes: "Deep 5-minute dwell on interactive demo page. Scrolled and hovered over grid rows. Zero clicks recorded; closed browser without creating account."
        }
      ]
    },
    {
      id: "01a0fde4-8d35-74e6-8f70-4e4e931e9267",
      alias: "High-Intent Evaluator (Zimmerman, MN)",
      location: "Zimmerman, MN, United States",
      device: "Desktop (Mac Safari)",
      primarySource: "YouTube / Direct Video Link",
      totalSessions: 2,
      pageviews: 2,
      clicks: 4,
      activeDays: 1,
      spanHours: "48s",
      firstSeen: "Oct 2, 2026 14:33 EDT",
      lastSeen: "Oct 2, 2026 14:34 EDT",
      status: "Trial Intent Drop-off (4 CTA Clicks)",
      pathsVisited: ["/", "/demo"],
      evolutionSummary: "Triggered 4 separate 'Start Free Trial' clicks across the homepage and benchmark bar. Reached the Clerk authentication signup gateway, hovered, but abandoned without creating account.",
      journey: [
        {
          sessionNumber: 1,
          date: "Oct 2, 2026 • 14:33 EDT",
          entryUrl: "/demo",
          dwell: "48s",
          clicks: 4,
          notes: "Tested demo benchmark bar. Clicked 'Start 14-Day Free Trial' CTA button 4 times. Redirected towards signup URL, hovered over input modal, but dropped off before submitting email."
        }
      ]
    },
    {
      id: "01a0f48c-b621-751d-a2b5-971f5ccdb16a",
      alias: "Prospect #4812 (Florida Agency)",
      location: "Kissimmee, FL, United States",
      device: "Desktop (Opera / Mac)",
      primarySource: "TradingView Referral / Direct",
      totalSessions: 3,
      pageviews: 10,
      clicks: 13,
      activeDays: 2,
      spanHours: "6.8h",
      firstSeen: "Sep 30, 2026 19:00 EDT",
      lastSeen: "Oct 3, 2026 15:31 EDT",
      status: "Multi-Page Evaluator (Unconverted)",
      pathsVisited: ["/compare/harvest", "/demo", "/pricing", "/tools", "/", "/integrations", "/blog"],
      evolutionSummary: "Navigated through 7 distinct product pages across multiple return sessions. Tested timesheet demo and pricing breakdown, but exited without signup.",
      journey: [
        {
          sessionNumber: 1,
          date: "Sep 30, 2026 • 19:00 EDT",
          entryUrl: "/compare/harvest",
          dwell: "68s",
          clicks: 2,
          notes: "Read Harvest pricing vs VeloTime comparison table. Navigated to demo."
        },
        {
          sessionNumber: 2,
          date: "Sep 30, 2026 • 21:15 EDT",
          entryUrl: "/demo",
          dwell: "185s",
          clicks: 6,
          notes: "Returned 2 hours later to /demo. Tested arrow-key navigation and entered sample task hours."
        },
        {
          sessionNumber: 3,
          date: "Oct 3, 2026 • 15:31 EDT",
          entryUrl: "/pricing",
          dwell: "154s",
          clicks: 5,
          notes: "Returned 3 days later to re-check pricing tiers and integrations. Left without opening Clerk signup modal."
        }
      ]
    },
    {
      id: "user_3H0RLB9dfGhCRMdfQpFyikI9QUa",
      alias: "Lurker #1140 (Brooklyn Studio Reader)",
      location: "Brooklyn, NY, United States",
      device: "Desktop (Mac Chrome)",
      primarySource: "Reddit 'anti_stopwatch' Thread",
      totalSessions: 10,
      pageviews: 35,
      clicks: 0,
      activeDays: 5,
      spanHours: "84.1h (3.5 days)",
      firstSeen: "Sep 24, 2026 10:22 EDT",
      lastSeen: "Oct 3, 2026 01:42 EDT",
      status: "Chronic Lurker (0 Clicks / 0 Signups)",
      pathsVisited: ["/", "/demo"],
      evolutionSummary: "Visited 10 times across 5 separate calendar days. Reads copy for 40-70 seconds per visit, hovering over comparison cards, but exhibits zero click events and never initiated registration.",
      journey: [
        {
          sessionNumber: 1,
          date: "Sep 24, 2026 • 10:22 EDT",
          entryUrl: "/?source=anti_stopwatch",
          dwell: "65s",
          clicks: 0,
          notes: "Arrived from Reddit discussion. Read full homepage copy, paused on pricing table."
        },
        {
          sessionNumber: 4,
          date: "Sep 27, 2026 • 18:20 EDT",
          entryUrl: "/demo",
          dwell: "72s",
          clicks: 0,
          notes: "Returned to demo URL. Read feature descriptions without typing into grid."
        },
        {
          sessionNumber: 10,
          date: "Oct 3, 2026 • 01:42 EDT",
          entryUrl: "/",
          dwell: "58s",
          clicks: 0,
          notes: "Latest return visit. Dwell suggests side-by-side reading with another timesheet tool."
        }
      ]
    },
    {
      id: "user_3GxuhW1BSU6eytxkmIdLARZkc3x",
      alias: "Internal Admin / Founder (Brooklyn, NY)",
      location: "Brooklyn, NY, United States",
      device: "Desktop (Windows Chrome)",
      primarySource: "Direct Admin / Clerk Authenticated",
      totalSessions: 14,
      pageviews: 72,
      clicks: 34,
      activeDays: 8,
      spanHours: "Active Session",
      firstSeen: "Jul 24, 2026 17:46 EDT",
      lastSeen: "Oct 10, 2026 14:38 EDT",
      status: "Internal Workspace Admin",
      pathsVisited: ["/control", "/?mode=signup&trial=true", "/", "/demo"],
      evolutionSummary: "Internal product owner account (4thgencorei7@gmail.com). Navigating Mission Control, testing diagnostic scripts, and inspecting live PostHog telemetry.",
      journey: [
        {
          sessionNumber: 1,
          date: "Jul 24, 2026 • 17:46 EDT",
          entryUrl: "https://app.velotime.dg.tools",
          dwell: "420s",
          clicks: 8,
          notes: "Initial Clerk organization workspace creation and admin onboarding."
        },
        {
          sessionNumber: 14,
          date: "Oct 10, 2026 • 14:38 EDT",
          entryUrl: "https://app.velotime.dg.tools/control",
          dwell: "180s",
          clicks: 12,
          notes: "Active founder session reviewing Mission Control telemetry and running outreach diagnostics."
        }
      ]
    }
  ],
  dropoffBottlenecks: [
    {
      id: "clerk_signup_friction",
      title: "Clerk Auth Gate Abandonment (High Friction)",
      severity: "Critical",
      affectedPercentage: "100% of Trial Clickers",
      description: "Visitors who click 'Start 14-Day Free Trial' arrive at the Clerk authentication popup. Because they expect an instant in-browser interactive workspace without creating passwords or entering email verification codes, they abandon immediately.",
      recommendedAction: "Allow zero-signup sandbox persistence (save in localStorage) and only request email when exporting invoices or inviting team members."
    },
    {
      id: "passive_hovering_gap",
      title: "High Dwell / Zero-Click Passive Lurking",
      severity: "High",
      affectedPercentage: "62% of Returning Visitors",
      description: "Multiple visitors (such as Norwich, NY: 301s dwell; Brooklyn, NY: 10 sessions) read and hover over the timesheet demo for minutes without interacting or clicking.",
      recommendedAction: "Implement an animated interactive micro-demo with pre-populated sample client data so lurkers immediately see the 15-second timesheet filled without having to type manually."
    }
  ],
  hogqlQuery: `SELECT
  distinct_id,
  count(distinct properties.$session_id) as session_count,
  countIf(event = '$pageview') as pageviews,
  countIf(event = '$autocapture') as clicks,
  min(timestamp) as first_seen,
  max(timestamp) as last_seen,
  dateDiff('minute', min(timestamp), max(timestamp)) as span_minutes,
  count(distinct toDate(timestamp)) as days_active,
  any(properties.$geoip_city_name) as city,
  any(properties.$geoip_country_name) as country,
  any(properties.$device_type) as device,
  any(coalesce(properties.utm_source, properties.$referring_domain, '$direct')) as source,
  any(properties.utm_campaign) as campaign,
  groupArray(distinct properties.$pathname) as paths
FROM events
WHERE timestamp >= now() - INTERVAL 14 DAY
  AND distinct_id NOT LIKE '%internal%'
GROUP BY distinct_id
HAVING session_count >= 2 OR days_active >= 2
ORDER BY session_count DESC, clicks DESC
LIMIT 50;`
};
