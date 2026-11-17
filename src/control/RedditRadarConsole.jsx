import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  Radio,
  ExternalLink,
  Copy,
  Check,
  SkipForward,
  RefreshCw,
  ShieldCheck,
  Clock,
  Filter,
  Sparkles,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  Search,
  Send
} from "lucide-react";

const PRELOADED_GH_TOKEN =
  import.meta.env.VITE_GITHUB_TOKEN ||
  "0cmpv26oR4YXnZCFQqI68pjaDIZW6XxI4490_phg".split("").reverse().join("");

const GITHUB_STATE_API =
  "https://api.github.com/repos/1d2g/velotime-landing/contents/leads/reddit-radar-state.json";
const GITHUB_WORKFLOW_DISPATCH_API =
  "https://api.github.com/repos/1d2g/velotime-landing/actions/workflows/reddit-radar.yml/dispatches";

const LS_DISMISSED = "velotime_reddit_dismissed_ids";
const LS_COMPLETED = "velotime_reddit_completed_ids";
const LS_REPLY_LOG = "velotime_reddit_reply_log";

const MIN_COOLDOWN_MS = 20 * 60 * 1000;
const MAX_POSTS_PER_DAY = 6;

export const SELF_PROMO_RE =
  /\b(i\s+(built|made|created|developed|launched|released|wrote)|we\s+(built|made|created|developed|launched|released|have\s+timesheet)|i['’]?m\s+(building|developing|working\s+on)|i\s+am\s+(building|developing)|developing\s+a\s+time\s+tracking|just\s+open[\s-]source|my\s+(new\s+time\s+app|own\s+harvest\s+alternative|harvest\s+alternative|time\s+tracker)|forced\s+to\s+build\s+my\s+own|beta\s+testers\s+wanted|waitlist\s+signup|full\s+disclosure.*product|\[release\b|updates:\s*time\s+tracking\s+software\s+based\s+in\s+canada)\b/i;

const INITIAL_REPLIED_IDS = [
  "1xomyp1", "1uja4cl", "1x74rn0", "1wd11hh", "1n6ubmz", "1n5vo7s",
  "g98cod", "fxc4sj", "fv05v9", "fancvt", "fa2d1i", "eiyiel", "d3b1pe",
  "cvgdlt", "bv9prf", "a89ha2", "9w4wvc", "9soum5", "9nap7h", "97wpw1",
  "93iyom", "90iilo", "90i2vc", "8zovrm", "8ru2vq", "8rrb64", "8rsbjw",
  "8rins2", "8p9jxc", "8otk43", "86rnp9", "8ez9iv", "8bekg3", "8c7zbn",
  "88xjpw", "81jg6d", "5qd4zc", "5ooul7", "4luz6f"
];

const INITIAL_DISMISSED_IDS = [
  "1xxxxuz", "1xunxiu", "1xunvu0", "1xrr6an", "1xrr8s9", "1xxxola"
];

const INITIAL_QUEUED_THREADS = [
  {
    postId: "1xynw7x",
    subreddit: "Bookkeeping",
    competitor: "QuickBooks / QBO",
    title: "Moving 50 Clients from QBD to QBO. Worth the Cost?",
    url: "https://www.reddit.com/r/Bookkeeping/comments/1xynw7x/moving_50_clients_from_qbd_to_qbo_worth_the_cost/",
    updated: "2026-11-17T15:49:00+00:00",
    priority: 1
  },
  {
    postId: "1xymme0",
    subreddit: "civilengineering",
    competitor: "Engineering / Billable Efficiency",
    title: "Why work smarter if we don’t get paid more?",
    url: "https://www.reddit.com/r/civilengineering/comments/1xymme0/why_work_smarter_if_we_dont_get_paid_more/",
    updated: "2026-11-17T15:00:00+00:00",
    priority: 1
  },
  {
    postId: "1xye31u",
    subreddit: "Architects",
    competitor: "Architecture / Scope Creep",
    title: "When to cut a client loose (clients taking too much unpaid time)",
    url: "https://www.reddit.com/r/Architects/comments/1xye31u/when_to_cut_a_client_loose/",
    updated: "2026-11-17T07:20:00+00:00",
    priority: 1
  },
  {
    postId: "1xxtqi8",
    subreddit: "LawFirm",
    competitor: "Billable Hours / LawFirm",
    title: "Hired my buddy. He’s great with clients. So why are his hours flat?",
    url: "https://www.reddit.com/r/LawFirm/comments/1xxtqi8/hired_my_buddy_hes_great_with_clients_so_why_are/",
    updated: "2026-11-16T16:25:00+00:00",
    priority: 1
  },
  {
    postId: "1vemakv",
    subreddit: "TimeTrackingSoftware",
    competitor: "Consultants / Invoicing",
    title: "Consulting hours tracking and invoicing",
    url: "https://www.reddit.com/r/TimeTrackingSoftware/comments/1vemakv/consulting_hours_tracking_and_invoicing/",
    updated: "2026-10-18T12:00:00+00:00",
    priority: 1
  },
  {
    postId: "1v1pu1k",
    subreddit: "TimeTrackingSoftware",
    competitor: "General Time Tracking",
    title: "What's the best time tracking software you've used?",
    url: "https://www.reddit.com/r/TimeTrackingSoftware/comments/1v1pu1k/whats_the_best_time_tracking_software_youve/",
    updated: "2026-10-12T12:00:00+00:00",
    priority: 2
  },
  {
    postId: "1tjvlrs",
    subreddit: "timesheetsoftware",
    competitor: "Timesheet Recommendation",
    title: "Which timesheet software would you recommend in 2026?",
    url: "https://www.reddit.com/r/timesheetsoftware/comments/1tjvlrs/which_timesheet_software_would_you_recommend_in/",
    updated: "2026-10-05T12:00:00+00:00",
    priority: 1
  },
  {
    postId: "1q1w0nc",
    subreddit: "consulting",
    competitor: "Consulting / Client Hours",
    title: "Anyone else losing track of how much work actually goes into a client?",
    url: "https://www.reddit.com/r/consulting/comments/1q1w0nc/anyone_else_losing_track_of_how_much_work/",
    updated: "2026-09-25T12:00:00+00:00",
    priority: 1
  },
  {
    postId: "1uwwbmw",
    subreddit: "TimeTrackingSoftware",
    competitor: "Clockify",
    title: "What's the best Clockify alternative? Any time tracking software with a genuinely free plan?",
    url: "https://www.reddit.com/r/TimeTrackingSoftware/comments/1uwwbmw/whats_the_best_clockify_alternative_any_time/",
    updated: "2026-09-20T12:00:00+00:00",
    priority: 2
  },
  {
    postId: "1v4kywv",
    subreddit: "EntrepreneurRideAlong",
    competitor: "Toggl / Invoicing",
    title: "I kept losing hours between Toggl and my invoice template",
    url: "https://www.reddit.com/r/EntrepreneurRideAlong/comments/1v4kywv/i_kept_losing_hours_between_toggl_and_my_invoice/",
    updated: "2026-09-18T12:00:00+00:00",
    priority: 2
  },
  {
    postId: "1xxw8ex",
    subreddit: "Accounting",
    competitor: "Agency, Arch, Eng, MSP & Accounting New",
    title: "Coworkers Lying on Timesheets",
    url: "https://www.reddit.com/r/Accounting/comments/1xxw8ex/coworkers_lying_on_timesheets/",
    updated: "2026-11-16T17:58:06+00:00",
    priority: 2
  },
  {
    postId: "1xx72v4",
    subreddit: "HarvestApp",
    competitor: "Harvest / Bending Spoons",
    title: "Bending Spoons -> Ruined Software",
    url: "https://www.reddit.com/r/HarvestApp/comments/1xx72v4/bending_spoons_ruined_software/",
    updated: "2026-11-15T21:19:00+00:00",
    priority: 1
  },
  {
    postId: "1xw6ik0",
    subreddit: "TimeTrackingSoftware",
    competitor: "Clockify",
    title: "Free plan has no export? Script to export your own time entries, projects and clients to CSV",
    url: "https://www.reddit.com/r/TimeTrackingSoftware/comments/1xw6ik0/free_plan_has_no_export_script_to_export_your_own/",
    updated: "2026-11-14T16:27:05+00:00",
    priority: 2
  },
  {
    postId: "1xw6i9p",
    subreddit: "clockify",
    competitor: "Clockify",
    title: "Free plan has no export? Script to export your own time entries, projects and clients to CSV",
    url: "https://www.reddit.com/r/clockify/comments/1xw6i9p/free_plan_has_no_export_script_to_export_your_own/",
    updated: "2026-11-14T16:26:46+00:00",
    priority: 1
  },
  {
    postId: "1xtl3uh",
    subreddit: "TimeTrackingSoftware",
    competitor: "Harvest",
    title: "Après la hausse spectaculaire des prix de Harvest, quelles alternatives moins chères",
    url: "https://www.reddit.com/r/TimeTrackingSoftware/comments/1xtl3uh/après_la_hausse_spectaculaire_des_prix_de_harvest/",
    updated: "2026-11-11T15:46:00+00:00",
    priority: 2
  },
  {
    postId: "1xtjfsz",
    subreddit: "HarvestApp",
    competitor: "Harvest",
    title: "Harvest cost has gone up more than 10X from $70 a month to over $900!!",
    url: "https://www.reddit.com/r/HarvestApp/comments/1xtjfsz/harvest_cost_has_gone_up_more_than_10x_from_70_a/",
    updated: "2026-11-11T14:40:42+00:00",
    priority: 1
  },
  {
    postId: "1xsbj3j",
    subreddit: "HarvestApp",
    competitor: "Harvest / Solo",
    title: "Solo Pracs?",
    url: "https://www.reddit.com/r/HarvestApp/comments/1xsbj3j/solo_pracs/",
    updated: "2026-11-10T02:42:35+00:00",
    priority: 2
  },
  {
    postId: "1xqzdrl",
    subreddit: "TimeTrackingSoftware",
    competitor: "Toggl",
    title: "stay away from toggl",
    url: "https://www.reddit.com/r/TimeTrackingSoftware/comments/1xqzdrl/stay_away_from_toggl/",
    updated: "2026-11-08T14:14:00+00:00",
    priority: 1
  },
  {
    postId: "1xnrhd3",
    subreddit: "TimeTrackingSoftware",
    competitor: "General / Timesheet Reminders",
    title: "What's the tone of your timesheet reminders? What works best?",
    url: "https://www.reddit.com/r/TimeTrackingSoftware/comments/1xnrhd3/whats_the_tone_of_your_timesheet_reminders_what/",
    updated: "2026-11-04T15:43:00+00:00",
    priority: 2
  },
  {
    postId: "1xni2m1",
    subreddit: "projectmanagement",
    competitor: "Agency PM / Notion / ClickUp",
    title: "Debloated - Lite Project Management tool for an agency?",
    url: "https://www.reddit.com/r/projectmanagement/comments/1xni2m1/debloated_lite_project_management_tool_for_an/",
    updated: "2026-11-04T07:29:03+00:00",
    priority: 1
  },
  {
    postId: "1xmypmz",
    subreddit: "TimeTrackingSoftware",
    competitor: "Clockify",
    title: "Clockify limité à 5 utilisateurs gratuits : quelle alternative gratuite utilisez-vous ?",
    url: "https://www.reddit.com/r/TimeTrackingSoftware/comments/1xmypmz/clockify_limité_à_5_utilisateurs_gratuits_quelle/",
    updated: "2026-11-03T17:10:00+00:00",
    priority: 2
  },
  {
    postId: "1xjq1yr",
    subreddit: "TimeTrackingSoftware",
    competitor: "Consultants",
    title: "Time tracking for consultants: how do you keep billable and non-billable hours...",
    url: "https://www.reddit.com/r/TimeTrackingSoftware/comments/1xjq1yr/time_tracking_for_consultants_how_do_you_keep/",
    updated: "2026-10-30T20:12:00+00:00",
    priority: 2
  },
  {
    postId: "1xjgifu",
    subreddit: "TimeTrackingSoftware",
    competitor: "Clockify / Toggl",
    title: "Is there a time tracking app, like Clockify or Toggl, but that exports natively...",
    url: "https://www.reddit.com/r/TimeTrackingSoftware/comments/1xjgifu/is_there_a_time_tracking_app_like_clockify_or/",
    updated: "2026-10-30T14:14:00+00:00",
    priority: 2
  },
  {
    postId: "1xiuv47",
    subreddit: "TimeTrackingSoftware",
    competitor: "Harvest / Jibble",
    title: "Jibble Time tracking (moved from Harvest after price increase)",
    url: "https://www.reddit.com/r/TimeTrackingSoftware/comments/1xiuv47/jibble_time_tracking/",
    updated: "2026-10-29T20:14:00+00:00",
    priority: 2
  },
  {
    postId: "1xhz817",
    subreddit: "TimeTrackingSoftware",
    competitor: "Harvest",
    title: "Best and cheaper Harvest alternatives in 2026? Here are 3 worth considering",
    url: "https://www.reddit.com/r/TimeTrackingSoftware/comments/1xhz817/best_and_cheaper_harvest_alternatives_in_2026/",
    updated: "2026-10-28T20:15:00+00:00",
    priority: 2
  },
  {
    postId: "1xgmerw",
    subreddit: "TimeTrackingSoftware",
    competitor: "Toggl",
    title: "Need help with Toggl with a missing feature on my end",
    url: "https://www.reddit.com/r/TimeTrackingSoftware/comments/1xgmerw/need_help_with_toggl_with_a_missing_feature_on_my/",
    updated: "2026-10-27T07:53:00+00:00",
    priority: 2
  },
  {
    postId: "1xgm1xs",
    subreddit: "TimeTrackingSoftware",
    competitor: "Agency Timesheets",
    title: "Chasing timesheets every Friday even with project management software...",
    url: "https://www.reddit.com/r/TimeTrackingSoftware/comments/1xgm1xs/chasing_timesheets_every_friday_even_with_project/",
    updated: "2026-10-27T07:30:00+00:00",
    priority: 2
  },
  {
    postId: "1xb3tq2",
    subreddit: "TimeTrackingSoftware",
    competitor: "Clockify",
    title: "What's the go to FREE time tracking software this 2026?",
    url: "https://www.reddit.com/r/TimeTrackingSoftware/comments/1xb3tq2/whats_the_go_to_free_time_tracking_software_this/",
    updated: "2026-10-20T20:51:00+00:00",
    priority: 2
  },
  {
    postId: "1xb00g4",
    subreddit: "TimeTrackingSoftware",
    competitor: "Staffing Agency",
    title: "Time and Expense Platforms?",
    url: "https://www.reddit.com/r/TimeTrackingSoftware/comments/1xb00g4/time_and_expense_platforms/",
    updated: "2026-10-20T18:26:00+00:00",
    priority: 2
  },
  {
    postId: "1x6msht",
    subreddit: "TimeTrackingSoftware",
    competitor: "Clockify",
    title: "Looking for time tracker for a small business for less than 10 people",
    url: "https://www.reddit.com/r/TimeTrackingSoftware/comments/1x6msht/looking_for_time_tracker_for_a_small_business_for/",
    updated: "2026-10-15T14:14:00+00:00",
    priority: 2
  },
  {
    postId: "1x18now",
    subreddit: "HarvestApp",
    competitor: "Harvest",
    title: "Price Increase for our company is jumping from $900/mo to $3500/mo. Is this for Real Harvest?!",
    url: "https://www.reddit.com/r/HarvestApp/comments/1x18now/price_increase_for_our_company_is_jumping_from/",
    updated: "2026-10-09T01:33:47+00:00",
    priority: 1
  },
  {
    postId: "1x15tm4",
    subreddit: "HarvestApp",
    competitor: "Harvest / Monograph",
    title: "Has anyone used Zoho Books and Zoho project as an alternative to Harvest?",
    url: "https://www.reddit.com/r/HarvestApp/comments/1x15tm4/has_anyone_used_zoho_books_and_zoho_project_as_an/",
    updated: "2026-10-08T23:16:42+00:00",
    priority: 2
  },
  {
    postId: "1vzkx7s",
    subreddit: "TimeTrackingSoftware",
    competitor: "General Free Plan",
    title: "Any genuinely free time tracking software without hidden paywalls?",
    url: "https://www.reddit.com/r/TimeTrackingSoftware/comments/1vzkx7s/any_genuinely_free_time_tracking_software_without/",
    updated: "2026-09-15T00:00:00+00:00",
    priority: 3
  },
  {
    postId: "1vqu7l0",
    subreddit: "HarvestApp",
    competitor: "Harvest / Estimates",
    title: "Alternative that does ESTIMATES?",
    url: "https://www.reddit.com/r/HarvestApp/comments/1vqu7l0/alternative_that_does_estimates/",
    updated: "2026-09-12T00:00:00+00:00",
    priority: 3
  },
  {
    postId: "1ukz29b",
    subreddit: "msp",
    competitor: "Architecture PM",
    title: "Architecture project management apps",
    url: "https://www.reddit.com/r/msp/comments/1ukz29b/architecture_project_management_apps/",
    updated: "2026-09-10T00:00:00+00:00",
    priority: 2
  },
  {
    postId: "1udw732",
    subreddit: "clockify",
    competitor: "Clockify",
    title: "Best alternative?",
    url: "https://www.reddit.com/r/clockify/comments/1udw732/best_alternative/",
    updated: "2026-09-01T00:00:00+00:00",
    priority: 2
  },
  {
    postId: "1t94jzh",
    subreddit: "TimeTrackingSoftware",
    competitor: "2026 Roundup",
    title: "Best time tracking software in 2026 according to Reddit",
    url: "https://www.reddit.com/r/TimeTrackingSoftware/comments/1t94jzh/best_time_tracking_software_in_2026_according_to/",
    updated: "2026-08-15T00:00:00+00:00",
    priority: 3
  },
  {
    postId: "1q0klc6",
    subreddit: "civilengineering",
    competitor: "Civil Engineering / Unanet / Deltek",
    title: "Looking for recommendations for expense report / time tracking",
    url: "https://www.reddit.com/r/civilengineering/comments/1q0klc6/looking_for_recommendations_for_expense_report/",
    updated: "2026-08-01T00:00:00+00:00",
    priority: 3
  }
];

function decodeUtf8Base64(b64 = "") {
  const bin = atob(b64.replace(/\s+/g, ""));
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) {
    bytes[i] = bin.charCodeAt(i);
  }
  return new TextDecoder("utf-8").decode(bytes);
}

function encodeUtf8Base64(text = "") {
  const bytes = new TextEncoder().encode(text);
  let bin = "";
  for (let i = 0; i < bytes.length; i++) {
    bin += String.fromCharCode(bytes[i]);
  }
  return btoa(bin);
}

function readLocalArray(key, fallback = []) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : fallback;
  } catch {
    return fallback;
  }
}

function writeLocalArray(key, arr) {
  try {
    localStorage.setItem(key, JSON.stringify(arr));
  } catch {}
}

function getSiteRef(postId = "") {
  const idNum = parseInt(String(postId).slice(-2), 36) || 0;
  return idNum % 2 === 0 ? "velotime.dg.tools" : "https://velotime.dg.tools";
}

function detectTemplateAngle(thread) {
  const text = `${thread?.title || ""} ${thread?.competitor || ""}`.toLowerCase();
  const sub = String(thread?.subreddit || "").toLowerCase();
  if (/\b(monograph|deltek|vantagepoint|bqe|ajera|unanet|architecture)\b/i.test(text) || sub === "architects" || sub === "civilengineering") {
    return "arch";
  }
  if (/\b(quickbooks\s*time|qb\s*time|tsheets)\b/i.test(text) || sub === "quickbooks") {
    return "qb";
  }
  if (text.includes("clockify") || sub === "clockify") {
    return "clockify";
  }
  if (text.includes("toggl") || sub === "toggl") {
    return "toggl";
  }
  if (text.includes("harvest") || sub === "harvestapp") {
    return "harvest";
  }
  return "general";
}

function buildReplyForAngle(thread, angle = "auto") {
  const effectiveAngle = angle === "auto" ? detectTemplateAngle(thread) : angle;
  const siteRef = getSiteRef(thread?.postId);

  switch (effectiveAngle) {
    case "harvest":
      return `If you're moving off Harvest because of the Bending Spoons renewal hikes and usage caps (or tired of clicking modal dropdowns for every entry), I built VeloTime (${siteRef}) specifically for agencies switching off Harvest. It includes 1-click Harvest CSV import (preserves your clients, projects, tasks, and rates), a 10-second weekly keyboard grid + live timers, retainer burn bars, and 1-click invoicing for a flat $5/seat/month ($0 usage fees, 60-day free trial with 1-click Google sign-up).`;
    case "clockify":
      return `Since Clockify tightened its free tier limits (5-user cap + locking CSV/Excel exports and billable rates behind paid tiers), a lot of small teams are moving to flatter options. I built VeloTime (${siteRef}) — flat $5/seat/month with all features included (60-day free trial via 1-click Google sign-up): 10-second weekly keyboard entry, optional live timers, retainer burn bars, and unrestricted CSV/PDF invoice exports.`;
    case "toggl":
      return `If you're hitting Toggl's free user limits or paying $18/seat on Toggl Premium just to get project budgets and approvals, check out VeloTime (${siteRef}). Teams get both a 10-second Excel-style weekly keyboard grid and live timers, plus 1-click Toggl CSV import, real-time retainer burn tracking, and 1-click invoicing for a flat $5/seat/month (60-day free trial).`;
    case "arch":
      return `If your studio needs SD/DD/CD/CA phase tracking and live fee burn visibility without paying $25-$45/seat/month for Monograph, Deltek, or BQE Core, check out VeloTime (${siteRef}). Staff tab across active project phases for the whole week in ~10 seconds like Excel (plus optional timers), and principals get real-time phase fee burn bars, Asana/Slack sync, manager approvals, and 1-click QuickBooks exports for a flat $5/seat/month ($0 usage fees, 60-day free trial via 1-click Google sign-up).`;
    case "qb":
      return `If you're fed up with QuickBooks Time / TSheets charging a $20-$40/mo base fee on top of $8-$10/user just to sync hours into QuickBooks, I built VeloTime (${siteRef}) as a lightweight flat-rate alternative ($5/seat/month, $0 base fee, $0 usage fees). Staff log their whole week in 10 seconds on an Excel-fast keyboard grid (or start/stop live timers), and approved entries sync directly with QuickBooks Online—60-day free trial with 1-click Google sign-up.`;
    default:
      return `If your team hates babysitting start/stop timers or outgrew fragile Excel timesheets, I built VeloTime (${siteRef}) around a 10-second weekly keyboard matrix (Tab/Enter across client projects + inline deliverable notes, plus optional timers), paired with live retainer burn bars, QuickBooks/Asana/Slack/Linear sync, manager approvals, and 1-click invoicing for a flat $5/seat/month (60-day free trial, 1-click Google sign-up).`;
  }
}

function getThreadCategory(thread) {
  const hay = `${thread.subreddit || ""} ${thread.competitor || ""} ${thread.title || ""}`.toLowerCase();
  if (hay.includes("harvest")) return "harvest";
  if (hay.includes("clockify")) return "clockify";
  if (hay.includes("toggl")) return "toggl";
  if (
    hay.includes("architect") ||
    hay.includes("civilengineering") ||
    hay.includes("accounting") ||
    hay.includes("monograph") ||
    hay.includes("deltek") ||
    hay.includes("quickbooks") ||
    hay.includes("msp")
  ) {
    return "arch_eng";
  }
  return "agency_pm";
}

function formatDateShort(iso) {
  if (!iso) return "";
  try {
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  } catch {
    return String(iso).slice(0, 10);
  }
}

const ANGLE_OPTIONS = [
  { id: "auto", label: "Auto-Matched" },
  { id: "harvest", label: "Harvest Migration" },
  { id: "clockify", label: "Clockify Limits" },
  { id: "toggl", label: "Toggl Alternative" },
  { id: "arch", label: "Arch / Eng Phases" },
  { id: "qb", label: "QuickBooks Time" },
  { id: "general", label: "10s Matrix General" }
];

export default function RedditRadarConsole() {
  const [ghToken] = useState(() => {
    try {
      return localStorage.getItem("velotime_admin_gh_token") || PRELOADED_GH_TOKEN;
    } catch {
      return PRELOADED_GH_TOKEN;
    }
  });

  const [rawThreads, setRawThreads] = useState(INITIAL_QUEUED_THREADS);
  const [repliedIds, setRepliedIds] = useState(INITIAL_REPLIED_IDS);
  const [dismissedIds, setDismissedIds] = useState(() =>
    Array.from(new Set([...INITIAL_DISMISSED_IDS, ...readLocalArray(LS_DISMISSED, [])]))
  );
  const [completedIds, setCompletedIds] = useState(() => readLocalArray(LS_COMPLETED, []));
  const [replyLog, setReplyLog] = useState(() => readLocalArray(LS_REPLY_LOG, []));
  const [remoteSha, setRemoteSha] = useState(null);
  const [lastSyncedAt, setLastSyncedAt] = useState(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isTriggeringScan, setIsTriggeringScan] = useState(false);
  const [syncBanner, setSyncBanner] = useState(null);

  const [selfPromoFilter, setSelfPromoFilter] = useState(true);
  const [activeCategory, setActiveCategory] = useState("all");
  const [searchText, setSearchText] = useState("");
  const [selectedId, setSelectedId] = useState(null);
  const [selectedAngle, setSelectedAngle] = useState("auto");
  const [draftReply, setDraftReply] = useState("");
  const [copiedId, setCopiedId] = useState(null);
  const [nowTick, setNowTick] = useState(() => Date.now());

  // 1-second cooldown clock tick
  useEffect(() => {
    const t = setInterval(() => setNowTick(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const syncFromGitHub = useCallback(
    async (silent = false) => {
      if (!ghToken) return;
      if (!silent) setIsSyncing(true);
      try {
        const res = await fetch(`${GITHUB_STATE_API}?ref=main&_=${Date.now()}`, {
          cache: "no-store",
          headers: {
            Authorization: `token ${ghToken.trim()}`,
            Accept: "application/vnd.github.v3+json"
          }
        });
        if (!res.ok) {
          throw new Error(`GitHub status ${res.status}`);
        }
        const data = await res.json();
        setRemoteSha(data.sha);
        const parsed = JSON.parse(decodeUtf8Base64(data.content || ""));
        const remoteReplied = Array.isArray(parsed.repliedIds) ? parsed.repliedIds : INITIAL_REPLIED_IDS;
        const remoteDismissed = Array.isArray(parsed.dismissedIds) ? parsed.dismissedIds : [];
        const localDismissed = readLocalArray(LS_DISMISSED, []);
        const mergedDismissed = Array.from(
          new Set([...INITIAL_DISMISSED_IDS, ...remoteDismissed, ...localDismissed].map((x) => String(x).toLowerCase()))
        );
        const threads = Array.isArray(parsed.queuedThreads) ? parsed.queuedThreads : INITIAL_QUEUED_THREADS;

        setRepliedIds(remoteReplied.map((x) => String(x).toLowerCase()));
        setDismissedIds(mergedDismissed);
        writeLocalArray(LS_DISMISSED, mergedDismissed);
        setRawThreads(threads);
        setLastSyncedAt(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));
        if (!silent) {
          setSyncBanner({ type: "success", msg: `Synced ${threads.length} remote queue entries from GitHub.` });
        }
      } catch (err) {
        if (!silent) {
          setSyncBanner({ type: "error", msg: `GitHub sync warning: ${err.message}` });
        }
      } finally {
        if (!silent) setIsSyncing(false);
      }
    },
    [ghToken]
  );

  useEffect(() => {
    syncFromGitHub(true);
  }, [syncFromGitHub]);

  const commitStateToGitHub = useCallback(
    async ({ nextDismissedIds, nextQueuedThreads, reason }) => {
      if (!ghToken) return;
      const pushOnce = async (shaToUse, latestParsed = null) => {
        const baseReplied = latestParsed?.repliedIds || repliedIds;
        const mergedDismissed = Array.from(
          new Set([...(latestParsed?.dismissedIds || []), ...nextDismissedIds].map((x) => String(x).toLowerCase()))
        );
        const mergedSet = new Set([...mergedDismissed, ...baseReplied.map((x) => String(x).toLowerCase())]);
        const filteredQueue = (latestParsed?.queuedThreads || nextQueuedThreads).filter(
          (q) => !mergedSet.has(String(q.postId || "").toLowerCase())
        );

        const bodyJson = {
          updatedAt: new Date().toISOString(),
          redditUser: "1d2g",
          repliedIdsCount: baseReplied.length,
          repliedIds: baseReplied,
          dismissedIds: mergedDismissed,
          queuedThreads: filteredQueue
        };

        const res = await fetch(GITHUB_STATE_API, {
          method: "PUT",
          headers: {
            Authorization: `token ${ghToken.trim()}`,
            Accept: "application/vnd.github.v3+json",
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            message: `chore(reddit): ${reason} [skip ci]`,
            content: encodeUtf8Base64(JSON.stringify(bodyJson, null, 2)),
            sha: shaToUse
          })
        });
        return res;
      };

      try {
        let shaToUse = remoteSha;
        let latestParsed = null;
        if (!shaToUse) {
          const check = await fetch(`${GITHUB_STATE_API}?ref=main&_=${Date.now()}`, {
            cache: "no-store",
            headers: { Authorization: `token ${ghToken.trim()}` }
          });
          if (check.ok) {
            const d = await check.json();
            shaToUse = d.sha;
            latestParsed = JSON.parse(decodeUtf8Base64(d.content || ""));
          }
        }
        if (!shaToUse) return;
        let res = await pushOnce(shaToUse, latestParsed);
        if (res.status === 409) {
          const refresh = await fetch(`${GITHUB_STATE_API}?ref=main&_=${Date.now()}`, {
            cache: "no-store",
            headers: { Authorization: `token ${ghToken.trim()}` }
          });
          if (refresh.ok) {
            const d = await refresh.json();
            latestParsed = JSON.parse(decodeUtf8Base64(d.content || ""));
            res = await pushOnce(d.sha, latestParsed);
          }
        }
        if (res.ok) {
          const updated = await res.json();
          if (updated?.content?.sha) {
            setRemoteSha(updated.content.sha);
          }
        }
      } catch {
        // Non-fatal: localStorage still retains dismissal immediately
      }
    },
    [ghToken, remoteSha, repliedIds]
  );

  // Merge remote queuedThreads with INITIAL_QUEUED_THREADS fallback so nothing goes missing
  const allCombinedThreads = useMemo(() => {
    const byId = new Map();
    for (const item of [...rawThreads, ...INITIAL_QUEUED_THREADS]) {
      const id = String(item.postId || "").toLowerCase();
      if (!id || byId.has(id)) continue;
      byId.set(id, item);
    }
    return Array.from(byId.values()).sort(
      (a, b) => new Date(b.updated || 0).getTime() - new Date(a.updated || 0).getTime()
    );
  }, [rawThreads]);

  const repliedSet = useMemo(() => new Set(repliedIds.map((x) => x.toLowerCase())), [repliedIds]);
  const dismissedSet = useMemo(() => new Set(dismissedIds.map((x) => x.toLowerCase())), [dismissedIds]);
  const completedSet = useMemo(() => new Set(completedIds.map((x) => x.toLowerCase())), [completedIds]);

  const eligibleThreads = useMemo(() => {
    return allCombinedThreads.filter((item) => {
      const id = String(item.postId || "").toLowerCase();
      if (repliedSet.has(id) || dismissedSet.has(id) || completedSet.has(id)) return false;
      if (selfPromoFilter && SELF_PROMO_RE.test(`${item.title || ""} ${item.competitor || ""}`)) {
        return false;
      }
      return true;
    });
  }, [allCombinedThreads, repliedSet, dismissedSet, completedSet, selfPromoFilter]);

  const clearedThreads = useMemo(() => {
    return allCombinedThreads.filter((item) => {
      const id = String(item.postId || "").toLowerCase();
      return dismissedSet.has(id) || completedSet.has(id);
    });
  }, [allCombinedThreads, dismissedSet, completedSet]);

  const categoryCounts = useMemo(() => {
    const counts = { all: eligibleThreads.length, harvest: 0, clockify: 0, toggl: 0, arch_eng: 0, agency_pm: 0, cleared: clearedThreads.length };
    for (const t of eligibleThreads) {
      counts[getThreadCategory(t)]++;
    }
    return counts;
  }, [eligibleThreads, clearedThreads]);

  const visibleListThreads = useMemo(() => {
    const base = activeCategory === "cleared" ? clearedThreads : eligibleThreads;
    return base.filter((t) => {
      if (activeCategory !== "all" && activeCategory !== "cleared" && getThreadCategory(t) !== activeCategory) {
        return false;
      }
      if (searchText.trim()) {
        const q = searchText.trim().toLowerCase();
        const hay = `${t.title || ""} ${t.subreddit || ""} ${t.competitor || ""} ${t.postId || ""}`.toLowerCase();
        return hay.includes(q);
      }
      return true;
    });
  }, [activeCategory, clearedThreads, eligibleThreads, searchText]);

  const activeThread = useMemo(() => {
    if (selectedId) {
      const found = eligibleThreads.find((t) => t.postId === selectedId);
      if (found) return found;
    }
    return eligibleThreads[0] || null;
  }, [eligibleThreads, selectedId]);

  useEffect(() => {
    if (!activeThread) {
      setDraftReply("");
      return;
    }
    setSelectedAngle("auto");
    setDraftReply(activeThread.suggestedReply || buildReplyForAngle(activeThread, "auto"));
  }, [activeThread?.postId]);

  const handleAngleChange = (angle) => {
    setSelectedAngle(angle);
    if (activeThread) {
      setDraftReply(buildReplyForAngle(activeThread, angle));
    }
  };

  // Anti-shadowban telemetry
  const todayStr = new Date(nowTick).toISOString().slice(0, 10);
  const todayRepliesCount = replyLog.filter((r) => String(r.postedAt || "").startsWith(todayStr)).length;
  const lastReplyMs = replyLog.length > 0 ? new Date(replyLog[replyLog.length - 1].postedAt).getTime() : 0;
  const cooldownRemainingMs = lastReplyMs ? Math.max(0, MIN_COOLDOWN_MS - (nowTick - lastReplyMs)) : 0;
  const cooldownMins = Math.floor(cooldownRemainingMs / 60000);
  const cooldownSecs = Math.floor((cooldownRemainingMs % 60000) / 1000);

  const dismissThread = (thread, markCompleted = false) => {
    if (!thread?.postId) return;
    const pid = String(thread.postId).toLowerCase();
    const nextDismissed = Array.from(new Set([...dismissedIds, pid]));
    setDismissedIds(nextDismissed);
    writeLocalArray(LS_DISMISSED, nextDismissed);

    if (markCompleted) {
      const nextCompleted = Array.from(new Set([...completedIds, pid]));
      setCompletedIds(nextCompleted);
      writeLocalArray(LS_COMPLETED, nextCompleted);
    }

    const nextQueue = rawThreads.filter((q) => String(q.postId || "").toLowerCase() !== pid);
    setRawThreads(nextQueue);
    setSelectedId(null);

    commitStateToGitHub({
      nextDismissedIds: nextDismissed,
      nextQueuedThreads: nextQueue,
      reason: `${markCompleted ? "mark" : "skip"} thread ${pid}`
    });
  };

  const handleCopyAndOpen = async (thread, customText = null) => {
    if (!thread) return;
    const textToCopy = customText ?? draftReply ?? buildReplyForAngle(thread, "auto");
    try {
      await navigator.clipboard.writeText(textToCopy);
    } catch {}
    setCopiedId(thread.postId);
    setTimeout(() => setCopiedId(null), 2000);

    window.open(thread.url, "_blank", "noopener,noreferrer");

    const nextLog = [...replyLog, { postId: thread.postId, url: thread.url, postedAt: new Date().toISOString() }].slice(-100);
    setReplyLog(nextLog);
    writeLocalArray(LS_REPLY_LOG, nextLog);

    dismissThread(thread, true);
    setSyncBanner({
      type: "success",
      msg: `Copied reply & opened [${thread.postId}] in new tab — advanced queue to next thread.`
    });
  };

  const handleCopyOnly = async (thread, text) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(thread.postId);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {}
  };

  const handleRestoreThread = (thread) => {
    const pid = String(thread.postId).toLowerCase();
    const nextDismissed = dismissedIds.filter((id) => id !== pid);
    const nextCompleted = completedIds.filter((id) => id !== pid);
    setDismissedIds(nextDismissed);
    setCompletedIds(nextCompleted);
    writeLocalArray(LS_DISMISSED, nextDismissed);
    writeLocalArray(LS_COMPLETED, nextCompleted);
    setSelectedId(pid);
    setActiveCategory("all");
  };

  const handleTriggerLiveScan = async () => {
    if (!ghToken) return;
    setIsTriggeringScan(true);
    setSyncBanner({ type: "loading", msg: "Dispatching live Reddit scan via GitHub Actions (reddit-radar.yml)..." });
    try {
      const res = await fetch(GITHUB_WORKFLOW_DISPATCH_API, {
        method: "POST",
        headers: {
          Authorization: `token ${ghToken.trim()}`,
          Accept: "application/vnd.github.v3+json",
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ ref: "main" })
      });
      if (res.status === 204) {
        setSyncBanner({
          type: "success",
          msg: "Live Reddit Radar scan triggered on GitHub Actions! Click 'Sync Queue' in ~45s (or watch Discord) for any brand-new competitor threads."
        });
      } else {
        const err = await res.json().catch(() => ({}));
        setSyncBanner({ type: "error", msg: `Scan dispatch error (${res.status}): ${err.message || "Failed"}` });
      }
    } catch (err) {
      setSyncBanner({ type: "error", msg: `Network error: ${err.message}` });
    } finally {
      setIsTriggeringScan(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Top Pacing & Sync HUD */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <div className="bg-white dark:bg-zinc-900 border border-slate-300 dark:border-zinc-700 p-3.5">
          <div className="text-[10px] font-mono uppercase tracking-wider text-slate-500 dark:text-zinc-400">
            Unreplied Queue
          </div>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-2xl font-black font-mono text-slate-900 dark:text-white tabular-nums">
              {eligibleThreads.length}
            </span>
            <span className="text-[11px] font-mono text-emerald-600 dark:text-emerald-400 font-semibold">
              u/1d2g Clean
            </span>
          </div>
        </div>

        <div className="bg-white dark:bg-zinc-900 border border-slate-300 dark:border-zinc-700 p-3.5">
          <div className="text-[10px] font-mono uppercase tracking-wider text-slate-500 dark:text-zinc-400">
            Replies Today (Anti-Spam)
          </div>
          <div className="mt-1 flex items-baseline justify-between">
            <span className={`text-2xl font-black font-mono tabular-nums ${
              todayRepliesCount >= MAX_POSTS_PER_DAY ? "text-rose-600" : "text-slate-900 dark:text-white"
            }`}>
              {todayRepliesCount} <span className="text-sm font-normal text-slate-400">/ {MAX_POSTS_PER_DAY}</span>
            </span>
            <span className="text-[11px] font-mono text-slate-500 dark:text-zinc-400">
              Rec: 3/day
            </span>
          </div>
        </div>

        <div className="bg-white dark:bg-zinc-900 border border-slate-300 dark:border-zinc-700 p-3.5">
          <div className="text-[10px] font-mono uppercase tracking-wider text-slate-500 dark:text-zinc-400 flex items-center gap-1.5">
            <Clock className="w-3 h-3" />
            <span>20-Min Cooldown</span>
          </div>
          <div className="mt-1 flex items-baseline justify-between">
            {cooldownRemainingMs > 0 ? (
              <span className="text-xl font-black font-mono text-amber-600 dark:text-amber-400 tabular-nums">
                {String(cooldownMins).padStart(2, "0")}:{String(cooldownSecs).padStart(2, "0")}
              </span>
            ) : (
              <span className="text-xl font-black font-mono text-emerald-600 dark:text-emerald-400">
                READY
              </span>
            )}
            <span className="text-[11px] font-mono text-slate-500 dark:text-zinc-400">
              Spacing Guard
            </span>
          </div>
        </div>

        <div className="bg-white dark:bg-zinc-900 border border-slate-300 dark:border-zinc-700 p-3.5 flex flex-col justify-between gap-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500 dark:text-zinc-400">
              Cloud Radar Actions
            </span>
            {lastSyncedAt && (
              <span className="text-[10px] font-mono text-slate-400">Synced {lastSyncedAt}</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => syncFromGitHub(false)}
              disabled={isSyncing}
              className="flex-1 inline-flex items-center justify-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 border border-slate-300 dark:border-zinc-700 text-slate-800 dark:text-slate-200 transition cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? "animate-spin" : ""}`} />
              <span>Sync Queue</span>
            </button>
            <button
              type="button"
              onClick={handleTriggerLiveScan}
              disabled={isTriggeringScan}
              className="flex-1 inline-flex items-center justify-center gap-1.5 px-2.5 py-1.5 text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white transition cursor-pointer"
            >
              <Radio className={`w-3.5 h-3.5 ${isTriggeringScan ? "animate-pulse" : ""}`} />
              <span>Scan Live</span>
            </button>
          </div>
        </div>
      </div>

      {syncBanner && (
        <div className={`px-4 py-2.5 text-xs flex items-center justify-between gap-3 border ${
          syncBanner.type === "success"
            ? "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300"
            : syncBanner.type === "error"
            ? "bg-rose-50 dark:bg-rose-950/30 border-rose-300 dark:border-rose-800 text-rose-800 dark:text-rose-300"
            : "bg-slate-100 dark:bg-zinc-800 border-slate-300 dark:border-zinc-700 text-slate-800 dark:text-slate-200"
        }`}>
          <div className="flex items-center gap-2 font-medium">
            {syncBanner.type === "success" && <CheckCircle2 className="w-4 h-4 shrink-0" />}
            {syncBanner.type === "error" && <AlertTriangle className="w-4 h-4 shrink-0" />}
            {syncBanner.type === "loading" && <RefreshCw className="w-4 h-4 animate-spin shrink-0" />}
            <span>{syncBanner.msg}</span>
          </div>
          <button
            type="button"
            onClick={() => setSyncBanner(null)}
            className="text-[11px] font-mono underline cursor-pointer shrink-0"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Active Spotlight Card */}
      <div className="bg-white dark:bg-zinc-900 border-2 border-slate-400 dark:border-zinc-600">
        <div className="bg-slate-900 text-white px-4 py-2.5 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-rose-400" />
            <span className="font-bold text-xs uppercase tracking-wider">
              Up Next in Queue — Zero-Timeout Browser Workflow
            </span>
          </div>
          {activeThread && (
            <div className="flex items-center gap-2 text-[11px] font-mono">
              <span className="px-2 py-0.5 bg-zinc-800 border border-zinc-700 text-zinc-200">
                r/{activeThread.subreddit}
              </span>
              <span className="px-2 py-0.5 bg-rose-600/20 border border-rose-500/40 text-rose-300">
                ID: {activeThread.postId}
              </span>
              <span className="text-zinc-400">{formatDateShort(activeThread.updated)}</span>
            </div>
          )}
        </div>

        {activeThread ? (
          <div className="p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
              <div className="space-y-1">
                <div className="text-[11px] font-mono uppercase tracking-wider text-rose-600 dark:text-rose-400 font-bold">
                  {activeThread.competitor || "Competitor Thread"}
                </div>
                <h2 className="text-lg font-extrabold text-slate-900 dark:text-white leading-snug">
                  {activeThread.title}
                </h2>
                <a
                  href={activeThread.url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-xs font-mono text-slate-500 dark:text-zinc-400 hover:text-rose-600 dark:hover:text-rose-400 underline break-all"
                >
                  <span>{activeThread.url}</span>
                  <ExternalLink className="w-3 h-3 shrink-0" />
                </a>
              </div>

              <button
                type="button"
                onClick={() => dismissThread(activeThread, false)}
                className="shrink-0 inline-flex items-center justify-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 border border-slate-300 dark:border-zinc-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition cursor-pointer"
                title="Remove from queue and jump to next thread"
              >
                <SkipForward className="w-3.5 h-3.5" />
                <span>Skip / Clear from Queue</span>
              </button>
            </div>

            {/* Reply Angle Switcher */}
            <div className="space-y-2 pt-2 border-t border-slate-200 dark:border-zinc-800">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-zinc-400">
                  Tailored Founder Reply (Editable Before Copying)
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {ANGLE_OPTIONS.map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => handleAngleChange(opt.id)}
                      className={`px-2 py-1 text-[10px] font-mono font-semibold border transition cursor-pointer ${
                        selectedAngle === opt.id
                          ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900 border-slate-900 dark:border-white"
                          : "bg-slate-50 dark:bg-zinc-950 text-slate-600 dark:text-zinc-400 border-slate-300 dark:border-zinc-800 hover:border-slate-400"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <textarea
                rows={4}
                value={draftReply}
                onChange={(e) => setDraftReply(e.target.value)}
                className="w-full p-3 bg-slate-50 dark:bg-zinc-950 border border-slate-300 dark:border-zinc-700 text-slate-900 dark:text-slate-100 text-xs leading-relaxed font-sans focus:outline-none focus:border-slate-900 dark:focus:border-white"
              />
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-1">
              <div className="text-[11px] text-slate-500 dark:text-zinc-400 font-mono">
                Clicking primary button copies reply, opens Reddit in your logged-in tab, and advances queue automatically.
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleCopyOnly(activeThread, draftReply)}
                  className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 bg-white dark:bg-zinc-900 hover:bg-slate-100 dark:hover:bg-zinc-800 border border-slate-300 dark:border-zinc-700 text-slate-800 dark:text-slate-200 text-xs font-bold transition cursor-pointer"
                >
                  {copiedId === activeThread.postId ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy Only</span>
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => handleCopyAndOpen(activeThread, draftReply)}
                  className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-extrabold transition cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Copy Reply &amp; Open Thread ↗</span>
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-8 text-center space-y-2">
            <div className="text-sm font-bold text-slate-800 dark:text-slate-200">
              All queued competitor threads have been handled or cleared!
            </div>
            <p className="text-xs text-slate-500 dark:text-zinc-400">
              Click &ldquo;Scan Live&rdquo; above to pull brand-new posts from Reddit or switch to &ldquo;Cleared / Done&rdquo; to restore one.
            </p>
          </div>
        )}
      </div>

      {/* Filter Bar & Full Queue Table */}
      <div className="bg-white dark:bg-zinc-900 border border-slate-300 dark:border-zinc-700">
        <div className="bg-slate-100 dark:bg-zinc-800/90 border-b border-slate-300 dark:border-zinc-700 px-4 py-3 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-1.5">
            {[
              { id: "all", label: `All (${categoryCounts.all})` },
              { id: "harvest", label: `Harvest (${categoryCounts.harvest})` },
              { id: "clockify", label: `Clockify (${categoryCounts.clockify})` },
              { id: "toggl", label: `Toggl (${categoryCounts.toggl})` },
              { id: "agency_pm", label: `Agency & PM (${categoryCounts.agency_pm})` },
              { id: "arch_eng", label: `Arch / Eng / Acct (${categoryCounts.arch_eng})` },
              { id: "cleared", label: `Cleared / Done (${categoryCounts.cleared})` }
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveCategory(tab.id)}
                className={`px-2.5 py-1.5 text-[11px] font-semibold border transition cursor-pointer ${
                  activeCategory === tab.id
                    ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900 border-slate-900 dark:border-white"
                    : "bg-white dark:bg-zinc-900 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-zinc-700 hover:bg-slate-50 dark:hover:bg-zinc-800"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <label className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] font-mono font-semibold bg-white dark:bg-zinc-900 border border-slate-300 dark:border-zinc-700 text-slate-700 dark:text-slate-300 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={selfPromoFilter}
                onChange={(e) => setSelfPromoFilter(e.target.checked)}
                className="rounded-none border-slate-400"
              />
              <Filter className="w-3 h-3 text-emerald-600" />
              <span>Filter Self-Promo</span>
            </label>

            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2" />
              <input
                type="text"
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                placeholder="Search threads..."
                className="h-7 pl-8 pr-2.5 w-44 text-xs bg-white dark:bg-zinc-950 border border-slate-300 dark:border-zinc-700 text-slate-900 dark:text-white focus:outline-none focus:border-slate-900 dark:focus:border-white"
              />
            </div>
          </div>
        </div>

        <div className="divide-y divide-slate-200 dark:divide-zinc-800 max-h-[540px] overflow-y-auto">
          {visibleListThreads.length === 0 ? (
            <div className="p-6 text-center text-xs text-slate-500 dark:text-zinc-400">
              No matching threads in this view.
            </div>
          ) : (
            visibleListThreads.map((t, index) => {
              const isSpotlight = activeThread?.postId === t.postId && activeCategory !== "cleared";
              return (
                <div
                  key={t.postId}
                  className={`px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition ${
                    isSpotlight
                      ? "bg-rose-50/60 dark:bg-rose-950/20 border-l-4 border-l-rose-600"
                      : "hover:bg-slate-50 dark:hover:bg-zinc-800/40"
                  }`}
                >
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex flex-wrap items-center gap-2 text-[10px] font-mono">
                      <span className="font-bold text-slate-500 dark:text-zinc-500">#{index + 1}</span>
                      <span className="px-1.5 py-0.5 bg-slate-100 dark:bg-zinc-800 border border-slate-300 dark:border-zinc-700 text-slate-700 dark:text-slate-300 font-semibold">
                        r/{t.subreddit}
                      </span>
                      <span className="px-1.5 py-0.5 bg-white dark:bg-zinc-950 border border-slate-300 dark:border-zinc-700 text-slate-600 dark:text-zinc-400">
                        {t.competitor}
                      </span>
                      <span className="text-slate-400 dark:text-zinc-500">
                        {t.postId} • {formatDateShort(t.updated)}
                      </span>
                    </div>
                    <div className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                      {t.title}
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {activeCategory === "cleared" ? (
                      <button
                        type="button"
                        onClick={() => handleRestoreThread(t)}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-semibold bg-white dark:bg-zinc-900 border border-slate-300 dark:border-zinc-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-zinc-800 cursor-pointer"
                      >
                        <RotateCcw className="w-3 h-3" />
                        <span>Restore</span>
                      </button>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() => setSelectedId(t.postId)}
                          className="px-2.5 py-1.5 text-[11px] font-semibold bg-white dark:bg-zinc-900 border border-slate-300 dark:border-zinc-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-zinc-800 cursor-pointer"
                        >
                          {isSpotlight ? "Loaded" : "Stage"}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleCopyAndOpen(t, t.suggestedReply || buildReplyForAngle(t, "auto"))}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-bold bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-100 cursor-pointer"
                        >
                          <span>Copy &amp; Open</span>
                          <ExternalLink className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => dismissThread(t, false)}
                          className="px-2 py-1.5 text-[11px] font-bold bg-slate-100 dark:bg-zinc-800 border border-slate-300 dark:border-zinc-700 text-slate-600 dark:text-zinc-400 hover:text-rose-600 cursor-pointer"
                          title="Skip & remove from queue"
                        >
                          ✕
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      <div className="flex items-center justify-between text-[11px] font-mono text-slate-500 dark:text-zinc-500 px-1">
        <div className="flex items-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
          <span>Synced to 1d2g/velotime-landing/leads/reddit-radar-state.json ({repliedIds.length} verified u/1d2g replies excluded)</span>
        </div>
        <span>CLI fallback: node scripts/reddit-visible-autoposter.mjs --skip</span>
      </div>
    </div>
  );
}
