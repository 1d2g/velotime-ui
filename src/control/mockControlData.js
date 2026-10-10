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
    repeatRate: "24.6%",
    totalTrackedPersons: 184,
    repeatVisitorsCount: 45,
    avgDaysToReturn: "2.8d",
    repeatConversionRate: "14.2%",
    firstTimeConversionRate: "3.1%",
    conversionLift: "4.5x",
    avgDwellRepeat: "184s",
    avgDwellSingle: "38s"
  },
  cohortDistribution: [
    { visits: "1 Visit", pct: "75.4%", count: 139, label: "Initial Discovery Stage" },
    { visits: "2 Visits", pct: "14.8%", count: 27, label: "Comparison & Evaluation" },
    { visits: "3-5 Visits", pct: "6.9%", count: 13, label: "High-Intent Consideration" },
    { visits: "6+ Visits", pct: "2.9%", count: 5, label: "Power Users / Trial Prospects" }
  ],
  profiles: [
    {
      id: "01a0f48c-b621-751d-a2b5-971f5ccdb16a",
      alias: "Prospect #4812 (Florida Agency)",
      location: "Kissimmee, FL, United States",
      device: "Desktop (Mac Chrome)",
      primarySource: "Google Ads (Campaign 24309795540)",
      totalSessions: 3,
      pageviews: 9,
      clicks: 11,
      activeDays: 2,
      spanHours: "6.8h",
      firstSeen: "Sep 30, 2026 19:00 EDT",
      lastSeen: "Oct 1, 2026 01:47 EDT",
      status: "High-Intent Prospect",
      pathsVisited: ["/compare/harvest", "/demo", "/pricing", "/tools", "/", "/integrations"],
      evolutionSummary: "Transitioned from reading competitor comparison to deep testing of keyboard grid in demo, concluding with pricing review.",
      journey: [
        {
          sessionNumber: 1,
          date: "Sep 30, 2026 • 19:00 EDT",
          entryUrl: "/compare/harvest",
          dwell: "68s",
          clicks: 2,
          notes: "Discovered via Google Ads ('harvest alternative'). Read pricing breakdown table ($5/user vs $14/user). Left without opening demo."
        },
        {
          sessionNumber: 2,
          date: "Sep 30, 2026 • 21:15 EDT",
          entryUrl: "/demo",
          dwell: "185s",
          clicks: 6,
          notes: "Returned 2 hours later via direct URL to /demo. Tested arrow-key navigation across 4 timesheet cells, entered sample hours."
        },
        {
          sessionNumber: 3,
          date: "Oct 1, 2026 • 01:47 EDT",
          entryUrl: "/pricing",
          dwell: "154s",
          clicks: 3,
          notes: "Returned past midnight. Checked team seat tiers on /pricing and read integration docs. Clicked 'Start 14-Day Free Trial' CTA."
        }
      ]
    },
    {
      id: "user_3GxuhW1BSU6eytxkmIdLARZkc3x",
      alias: "Founder #2019 (NY Design Studio)",
      location: "New York, NY, United States",
      device: "Desktop (Windows Chrome)",
      primarySource: "Direct Web / Word of Mouth",
      totalSessions: 10,
      pageviews: 17,
      clicks: 9,
      activeDays: 5,
      spanHours: "82.6h (3.5 days)",
      firstSeen: "Sep 27, 2026 22:17 EDT",
      lastSeen: "Oct 1, 2026 08:54 EDT",
      status: "Converted / Active Account",
      pathsVisited: ["/", "/demo", "/pricing", "/compare/harvest"],
      evolutionSummary: "Evaluated product across 5 separate calendar days before creating organization and inviting team members.",
      journey: [
        {
          sessionNumber: 1,
          date: "Sep 27, 2026 • 22:17 EDT",
          entryUrl: "/",
          dwell: "42s",
          clicks: 1,
          notes: "Initial exploration of homepage hero grid. Viewed '15-second weekly timesheet' messaging."
        },
        {
          sessionNumber: 2,
          date: "Sep 28, 2026 • 11:30 EDT",
          entryUrl: "/demo",
          dwell: "240s",
          clicks: 5,
          notes: "Deep demo test during agency business hours. Validated keyboard speed and project/task switching."
        },
        {
          sessionNumber: 5,
          date: "Sep 29, 2026 • 16:40 EDT",
          entryUrl: "/pricing",
          dwell: "90s",
          clicks: 2,
          notes: "Checked pricing for a 12-person team ($60/mo vs Harvest $168/mo)."
        },
        {
          sessionNumber: 10,
          date: "Oct 1, 2026 • 08:54 EDT",
          entryUrl: "https://app.velotime.dg.tools",
          dwell: "420s",
          clicks: 8,
          notes: "Full account creation via Clerk. Initialized organization workspace and added first client project."
        }
      ]
    },
    {
      id: "01a0f7e5-21a3-765b-a383-ab425fdb5f7a",
      alias: "Agency Lead #7731 (Melbourne)",
      location: "Melbourne, Victoria, Australia",
      device: "Desktop (Mac Safari)",
      primarySource: "Email Outreach (Signature Link)",
      totalSessions: 3,
      pageviews: 3,
      clicks: 10,
      activeDays: 1,
      spanHours: "15 mins",
      firstSeen: "Oct 1, 2026 10:36 EDT",
      lastSeen: "Oct 1, 2026 10:37 EDT",
      status: "Evaluating Sandbox",
      pathsVisited: ["/demo", "/"],
      evolutionSummary: "Direct recipient of automated cold email; clicked signature link and thoroughly tested demo grid.",
      journey: [
        {
          sessionNumber: 1,
          date: "Oct 1, 2026 • 10:36 EDT",
          entryUrl: "/demo",
          dwell: "45s",
          clicks: 4,
          notes: "Arrived from outreach email campaign 'defbgvif_fghevbf'. Landed straight in interactive matrix sandbox."
        },
        {
          sessionNumber: 2,
          date: "Oct 1, 2026 • 10:37 EDT",
          entryUrl: "/",
          dwell: "55s",
          clicks: 6,
          notes: "Navigated to root homepage to read product features and invoice generation specs."
        }
      ]
    },
    {
      id: "user_3H0RLB9dfGhCRMdfQpFyikI9QUa",
      alias: "Visitor #1140 (Brooklyn Studio)",
      location: "Brooklyn, NY, United States",
      device: "Desktop (Mac Chrome)",
      primarySource: "Campaign 'anti_stopwatch' (Reddit / Direct)",
      totalSessions: 10,
      pageviews: 18,
      clicks: 0,
      activeDays: 5,
      spanHours: "84.1h",
      firstSeen: "Sep 27, 2026 12:02 EDT",
      lastSeen: "Oct 1, 2026 00:09 EDT",
      status: "Chronic Reader (0 Clicks)",
      pathsVisited: ["/", "/demo"],
      evolutionSummary: "Visited 10 times across 5 days, reads copy intently for 40-70 seconds per visit, but exhibits zero click events.",
      journey: [
        {
          sessionNumber: 1,
          date: "Sep 27, 2026 • 12:02 EDT",
          entryUrl: "/?source=anti_stopwatch",
          dwell: "65s",
          clicks: 0,
          notes: "Arrived from Reddit discussion on timesheet hate. Read full page copy, paused on pricing section."
        },
        {
          sessionNumber: 4,
          date: "Sep 29, 2026 • 18:20 EDT",
          entryUrl: "/demo",
          dwell: "72s",
          clicks: 0,
          notes: "Returned to demo URL. Read instructions but did not click or type in matrix."
        },
        {
          sessionNumber: 10,
          date: "Oct 1, 2026 • 00:09 EDT",
          entryUrl: "/",
          dwell: "58s",
          clicks: 0,
          notes: "Latest return visit. Dwell suggests reading or comparing side-by-side with another tool."
        }
      ]
    },
    {
      id: "01a0eb83-9708-7aee-afc4-c5080de5f278",
      alias: "Visitor #8821 (California)",
      location: "Hayward, CA, United States",
      device: "Desktop (Windows Chrome)",
      primarySource: "Direct Web",
      totalSessions: 3,
      pageviews: 3,
      clicks: 2,
      activeDays: 1,
      spanHours: "16.2h",
      firstSeen: "Sep 29, 2026 00:54 EDT",
      lastSeen: "Sep 29, 2026 17:07 EDT",
      status: "Demo Sandbox Evaluator",
      pathsVisited: ["/demo"],
      evolutionSummary: "Returned three times directly to /demo throughout the day to test timesheet spreadsheet interactions.",
      journey: [
        {
          sessionNumber: 1,
          date: "Sep 29, 2026 • 00:54 EDT",
          entryUrl: "/demo",
          dwell: "38s",
          clicks: 1,
          notes: "First entry to sandbox demo."
        },
        {
          sessionNumber: 2,
          date: "Sep 29, 2026 • 09:30 EDT",
          entryUrl: "/demo",
          dwell: "95s",
          clicks: 1,
          notes: "Returned morning of next day to test cell input."
        },
        {
          sessionNumber: 3,
          date: "Sep 29, 2026 • 17:07 EDT",
          entryUrl: "/demo",
          dwell: "44s",
          clicks: 0,
          notes: "Quick evening check before closing browser."
        }
      ]
    }
  ],
  dropoffBottlenecks: [
    {
      id: "demo_activation_gap",
      title: "Interactive Demo to Trial Sign-up Gap",
      severity: "High",
      affectedPercentage: "41% of 2+ Visit Users",
      description: "Returning users spend an average of 185s typing into the /demo matrix, but leave without starting a trial because they don't see how their entries persist or how to invite team members.",
      recommendedAction: "Add an in-grid prompt banner: 'Like the speed? Save this timesheet & invite your team in 15 seconds (14-Day Free Trial, No Credit Card)'."
    },
    {
      id: "comparison_pricing_hesitation",
      title: "Multi-Touch Harvest Comparison Hesitation",
      severity: "Medium",
      affectedPercentage: "28% of 2+ Visit Users",
      description: "Prospects landing on /compare/harvest return 2.8 days later to re-verify pricing. They hesitate because they want confirmation that VeloTime exports to CSV/Excel and QuickBooks.",
      recommendedAction: "Highlight '1-Click QuickBooks & CSV Export Included' directly in the sticky comparison bar above the fold."
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
