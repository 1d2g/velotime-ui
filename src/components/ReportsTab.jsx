import React, { useState, useMemo, useEffect } from "react";
import { useToast } from "../contexts/ToastContext";
import * as XLSX from "xlsx";

// ---------------------------------------------------------------------------
// 12 PREBUILT REPORT DEFINITIONS
// ---------------------------------------------------------------------------
const PREBUILT_REPORTS = [
  // Pillar 1: Profitability & Financials
  {
    id: "project-profitability",
    title: "Project Profitability & Margins",
    category: "Profitability",
    badge: "Financial Telemetry",
    desc: "Calculate gross revenue, internal employee labor costs, gross profit ($), and profit margin (%) for each client project.",
    icon: "M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
    defaultGroupBy: "project",
    defaultSubGroupBy: "none",
    columns: ["totalHours", "revenue", "cost", "profit", "margin", "ehr"]
  },
  {
    id: "client-revenue",
    title: "Client Revenue & Billing Summary",
    category: "Profitability",
    badge: "Account Management",
    desc: "Summarize total billable hours, effective blended rate, and total revenue grouped by client.",
    icon: "M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4",
    defaultGroupBy: "client",
    defaultSubGroupBy: "project",
    columns: ["totalHours", "billableHours", "revenue", "cost", "ehr"]
  },
  {
    id: "uninvoiced",
    title: "Uninvoiced Billable Ledger",
    category: "Profitability",
    badge: "Cash Flow",
    desc: "View unbilled time entries and accumulated billable amounts ready to push to client invoices.",
    icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4",
    defaultGroupBy: "project",
    defaultSubGroupBy: "user",
    invoicedFilter: "uninvoiced",
    columns: ["totalHours", "revenue", "cost", "margin"]
  },
  {
    id: "labor-cost",
    title: "Labor Cost & Overhead Breakdown",
    category: "Profitability",
    badge: "Payroll Analysis",
    desc: "Audit loaded employee labor costs and task allocations across all active client accounts.",
    icon: "M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z",
    defaultGroupBy: "user",
    defaultSubGroupBy: "project",
    columns: ["totalHours", "cost", "revenue", "profit"]
  },

  // Pillar 2: Capacity & Utilization
  {
    id: "utilization",
    title: "Billable Utilization & Realization",
    category: "Capacity",
    badge: "Efficiency Metric",
    desc: "Track billable vs. non-billable percentage per employee against their standard 40h work capacity.",
    icon: "M13 7h8m0 0v8m0-8l-8 8-4-4-6 6",
    defaultGroupBy: "user",
    defaultSubGroupBy: "none",
    columns: ["totalHours", "billableHours", "nonBillableHours", "utilizationRate", "revenue"]
  },
  {
    id: "team-capacity",
    title: "Team Workload & Overtime Audit",
    category: "Capacity",
    badge: "Burnout Protection",
    desc: "Identify overworked team members (>40h/wk) and underutilized capacity to balance agency staffing.",
    icon: "M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z",
    defaultGroupBy: "user",
    defaultSubGroupBy: "date",
    columns: ["totalHours", "billableHours", "utilizationRate"]
  },
  {
    id: "activity-dist",
    title: "Task & Activity Distribution",
    category: "Capacity",
    badge: "Workload Profile",
    desc: "Analyze where time is spent across task types (Engineering, Design, Meetings, Client Communication, Admin).",
    icon: "M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z",
    defaultGroupBy: "task",
    defaultSubGroupBy: "project",
    columns: ["totalHours", "billableHours", "revenue", "cost"]
  },
  {
    id: "project-team",
    title: "Project & Team Summary",
    category: "Capacity",
    badge: "Hierarchy View",
    desc: "Hierarchical roll-up of billable hours and revenue grouped by Project and sub-divided by Team Member.",
    icon: "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z",
    defaultGroupBy: "project",
    defaultSubGroupBy: "user",
    columns: ["totalHours", "revenue", "cost", "margin"]
  },

  // Pillar 3: Retainers & Governance
  {
    id: "retainer-burn",
    title: "Retainer Burn & Pacing Report",
    category: "Governance",
    badge: "Retainer Tracking",
    desc: "Track pacing of hours consumed against client retainer allowances to prevent unbilled over-servicing.",
    icon: "M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z",
    defaultGroupBy: "project",
    defaultSubGroupBy: "none",
    columns: ["totalHours", "revenue", "cost", "ehr"]
  },
  {
    id: "budget-risk",
    title: "Scope Creep & Budget Overruns",
    category: "Governance",
    badge: "Risk Governance",
    desc: "Identify fixed-fee projects that are exceeding or approaching their allocated milestone hours.",
    icon: "M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z",
    defaultGroupBy: "project",
    defaultSubGroupBy: "task",
    columns: ["totalHours", "revenue", "cost", "margin"]
  },

  // Pillar 4: Audit & Compliance
  {
    id: "detailed",
    title: "Detailed Time Entry Audit Log",
    category: "Compliance",
    badge: "Granular Ledger",
    desc: "Line-by-line spreadsheet of every time entry logged across all projects with notes, rates, and invoice status.",
    icon: "M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z",
    defaultGroupBy: "raw",
    defaultSubGroupBy: "none",
    columns: ["totalHours", "revenue", "cost", "notes"]
  },
  {
    id: "missing-timesheets",
    title: "Missing Timesheets & Late Submissions",
    category: "Compliance",
    badge: "Adoption & SLA",
    desc: "Identify employees with low or missing logged hours for the selected period to ensure Friday compliance.",
    icon: "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z",
    defaultGroupBy: "user",
    defaultSubGroupBy: "date",
    columns: ["totalHours", "utilizationRate"]
  }
];

const METRIC_COLUMNS = [
  { id: "totalHours", label: "Total Hrs", align: "right" },
  { id: "billableHours", label: "Billable Hrs", align: "right" },
  { id: "nonBillableHours", label: "Non-Billable Hrs", align: "right" },
  { id: "utilizationRate", label: "Utilization %", align: "right" },
  { id: "revenue", label: "Billable Value ($)", align: "right" },
  { id: "cost", label: "Labor Cost ($)", align: "right" },
  { id: "profit", label: "Gross Profit ($)", align: "right" },
  { id: "margin", label: "Profit Margin %", align: "right" },
  { id: "ehr", label: "Effective Rate ($/h)", align: "right" },
  { id: "notes", label: "Work Logs / Notes", align: "left" }
];

export default function ReportsTab({
  dbUser,
  projects = [],
  entries = {},
  rawEntries = [],
  orgUsers = [],
  notes = {},
  taskRates = [],
}) {
  const { addToast } = useToast();
  const orgId = dbUser?.organizationId || "default";

  // Phases: 'menu' (all prebuilt & saved), 'builder' (custom configuration), 'viewing' (data grid)
  const [reportPhase, setReportPhase] = useState("menu");
  const [activeTab, setActiveTab] = useState("prebuilt"); // 'prebuilt', 'custom', 'saved'
  const [reportType, setReportType] = useState("project-profitability");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Custom Builder State
  const [customReportName, setCustomReportName] = useState("");
  const [groupBy, setGroupBy] = useState("project"); // 'project', 'user', 'client', 'task', 'date', 'raw'
  const [subGroupBy, setSubGroupBy] = useState("none"); // 'none', 'user', 'project', 'task', 'date'
  const [selectedMetrics, setSelectedMetrics] = useState(["totalHours", "revenue", "cost", "margin", "ehr"]);

  // Filter States
  const [selectedProject, setSelectedProject] = useState("all");
  const [selectedUser, setSelectedUser] = useState("all");
  const [selectedPeriod, setSelectedPeriod] = useState("month"); // 'week', 'lastWeek', 'month', 'lastMonth', 'quarter', 'ytd', 'all', 'custom'
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");
  const [billableFilter, setBillableFilter] = useState("all"); // 'all', 'billable', 'nonBillable'
  const [invoicedFilter, setInvoicedFilter] = useState("all"); // 'all', 'uninvoiced', 'invoiced'

  // Sort State
  const [sortConfig, setSortConfig] = useState({ key: null, direction: null });
  const [expandedRows, setExpandedRows] = useState({});

  // Saved Custom Reports (Up to 20 per organization)
  const storageKey = `velotime_custom_reports_${orgId}`;
  const [savedReports, setSavedReports] = useState([]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        setSavedReports(JSON.parse(stored));
      }
    } catch (e) {
      console.error("Failed to load saved reports:", e);
    }
  }, [storageKey]);

  const saveCurrentAsCustomReport = () => {
    const reportName = customReportName.trim() || `Custom ${groupBy.toUpperCase()} Report`;
    if (savedReports.length >= 20) {
      addToast("Maximum limit of 20 custom reports reached. Please delete an older report first.", "error");
      return;
    }

    const newReport = {
      id: "custom_" + Date.now(),
      title: reportName,
      createdAt: new Date().toISOString(),
      groupBy,
      subGroupBy,
      selectedMetrics,
      selectedProject,
      selectedUser,
      selectedPeriod,
      customStartDate,
      customEndDate,
      billableFilter,
      invoicedFilter
    };

    const updated = [newReport, ...savedReports.slice(0, 19)];
    setSavedReports(updated);
    try {
      localStorage.setItem(storageKey, JSON.stringify(updated));
      addToast(`Saved "${reportName}" to custom reports!`, "success");
      setCustomReportName("");
    } catch (e) {
      addToast("Failed to save report to local storage.", "error");
    }
  };

  const deleteSavedReport = (id, e) => {
    e.stopPropagation();
    const updated = savedReports.filter(r => r.id !== id);
    setSavedReports(updated);
    try {
      localStorage.setItem(storageKey, JSON.stringify(updated));
      addToast("Custom report deleted.", "success");
    } catch (err) {}
  };

  const loadSavedReport = (report) => {
    setReportType(report.id);
    setGroupBy(report.groupBy || "project");
    setSubGroupBy(report.subGroupBy || "none");
    setSelectedMetrics(report.selectedMetrics || ["totalHours", "revenue", "cost", "margin"]);
    setSelectedProject(report.selectedProject || "all");
    setSelectedUser(report.selectedUser || "all");
    setSelectedPeriod(report.selectedPeriod || "month");
    setCustomStartDate(report.customStartDate || "");
    setCustomEndDate(report.customEndDate || "");
    setBillableFilter(report.billableFilter || "all");
    setInvoicedFilter(report.invoicedFilter || "all");
    setReportPhase("viewing");
  };

  // ---------------------------------------------------------------------------
  // DATA PARSING & ENRICHMENT
  // ---------------------------------------------------------------------------
  const parsedEntries = useMemo(() => {
    const rawMap = {};
    (rawEntries || []).forEach((re) => {
      rawMap[`${re.userId}_${re.dateId}_${re.taskId}`] = re;
    });

    return Object.entries(entries)
      .map(([key, hours]) => {
        const [userId, dateId, taskId] = key.split("_");
        const raw = rawMap[key];
        return {
          userId,
          dateId,
          taskId,
          hours: parseFloat(hours) || 0,
          note: notes[key] || "",
          invoiceId: raw ? raw.invoiceId : null,
        };
      })
      .filter((e) => e.hours > 0);
  }, [entries, rawEntries, notes]);

  const enrichedEntries = useMemo(() => {
    const taskMap = {};
    projects.forEach((p) => {
      p.tasks.forEach((t) => {
        taskMap[t.id] = { project: p, task: t };
      });
    });

    const userMap = {};
    orgUsers.forEach((u) => {
      userMap[u.id] = u;
    });

    return parsedEntries.map((e) => {
      const userObj = userMap[e.userId] || { firstName: "Unknown", lastName: "Member" };
      const mapObj = taskMap[e.taskId];
      const projectObj = mapObj ? mapObj.project : null;
      const taskObj = mapObj ? mapObj.task : null;

      const taskRateOverride = taskRates.find(
        (tr) => tr.taskId === e.taskId && tr.userId === e.userId,
      );
      const billingRate = taskRateOverride?.billingRate || userObj.defaultBillingRate || 150;
      const costRate = taskRateOverride?.costRate || userObj.defaultCostRate || 0;
      const isBillable = taskObj ? taskObj.isBillable !== false : true;

      const fName = userObj.firstName && userObj.firstName !== "null" ? userObj.firstName : "";
      const lName = userObj.lastName && userObj.lastName !== "null" ? userObj.lastName : "";
      let derivedName = `${fName} ${lName}`.trim();
      if (!derivedName) {
        derivedName = userObj.emailAddress || userObj.email || "Unnamed Member";
      }

      const clientName = projectObj?.clientName || projectObj?.name?.split(" - ")[0] || "General Clients";

      return {
        ...e,
        userName: derivedName,
        projectName: projectObj ? projectObj.name : "Unknown Project",
        projectId: projectObj ? projectObj.id : null,
        clientName,
        taskName: taskObj ? taskObj.name : "General Work",
        isBillable,
        billingRate,
        costRate,
        rate: billingRate,
        amount: isBillable ? e.hours * billingRate : 0,
        cost: e.hours * costRate,
        revenue: isBillable ? e.hours * billingRate : 0,
      };
    });
  }, [parsedEntries, orgUsers, projects, taskRates]);

  // Date Filtering Engine
  const dateFilterMatch = (dateStr) => {
    if (selectedPeriod === "all") return true;
    const d = new Date(dateStr + "T00:00:00");
    const now = new Date();

    if (selectedPeriod === "week") {
      const day = now.getDay();
      const diff = now.getDate() - day + (day === 0 ? -6 : 1);
      const monday = new Date(now.setDate(diff));
      monday.setHours(0, 0, 0, 0);
      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);
      sunday.setHours(23, 59, 59, 999);
      return d >= monday && d <= sunday;
    }

    if (selectedPeriod === "lastWeek") {
      const day = now.getDay();
      const diff = now.getDate() - day + (day === 0 ? -6 : 1) - 7;
      const monday = new Date(now.setDate(diff));
      monday.setHours(0, 0, 0, 0);
      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);
      sunday.setHours(23, 59, 59, 999);
      return d >= monday && d <= sunday;
    }

    if (selectedPeriod === "month") {
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    }

    if (selectedPeriod === "lastMonth") {
      let targetMonth = now.getMonth() - 1;
      let targetYear = now.getFullYear();
      if (targetMonth < 0) {
        targetMonth = 11;
        targetYear -= 1;
      }
      return d.getMonth() === targetMonth && d.getFullYear() === targetYear;
    }

    if (selectedPeriod === "quarter") {
      const currentQuarter = Math.floor(now.getMonth() / 3);
      const entryQuarter = Math.floor(d.getMonth() / 3);
      return currentQuarter === entryQuarter && d.getFullYear() === now.getFullYear();
    }

    if (selectedPeriod === "ytd") {
      return d.getFullYear() === now.getFullYear() && d <= now;
    }

    if (selectedPeriod === "custom") {
      if (customStartDate && d < new Date(customStartDate + "T00:00:00")) return false;
      if (customEndDate && d > new Date(customEndDate + "T23:59:59")) return false;
      return true;
    }

    return true;
  };

  // Base Filtered Dataset
  const filteredEntries = useMemo(() => {
    return enrichedEntries.filter((e) => {
      if (selectedProject !== "all" && String(e.projectId) !== String(selectedProject)) return false;
      if (selectedUser !== "all" && String(e.userId) !== String(selectedUser)) return false;
      if (billableFilter === "billable" && !e.isBillable) return false;
      if (billableFilter === "nonBillable" && e.isBillable) return false;
      if (invoicedFilter === "uninvoiced" && e.invoiceId) return false;
      if (invoicedFilter === "invoiced" && !e.invoiceId) return false;
      return dateFilterMatch(e.dateId);
    });
  }, [enrichedEntries, selectedProject, selectedUser, selectedPeriod, customStartDate, customEndDate, billableFilter, invoicedFilter]);

  // Global KPI Summary Stats
  const kpiStats = useMemo(() => {
    let totalHrs = 0;
    let billableHrs = 0;
    let revenue = 0;
    let cost = 0;

    filteredEntries.forEach((e) => {
      totalHrs += e.hours;
      if (e.isBillable) billableHrs += e.hours;
      revenue += e.revenue;
      cost += e.cost;
    });

    const profit = revenue - cost;
    const margin = revenue > 0 ? (profit / revenue) * 100 : 0;
    const utilization = totalHrs > 0 ? (billableHrs / totalHrs) * 100 : 0;
    const ehr = totalHrs > 0 ? revenue / totalHrs : 0;

    return { totalHrs, billableHrs, revenue, cost, profit, margin, utilization, ehr };
  }, [filteredEntries]);

  // ---------------------------------------------------------------------------
  // DYNAMIC AGGREGATOR FOR ALL REPORTS (PREBUILT & CUSTOM)
  // ---------------------------------------------------------------------------
  const aggregatedReportData = useMemo(() => {
    if (groupBy === "raw") {
      let data = [...filteredEntries];
      if (sortConfig.key) {
        data.sort((a, b) => {
          let vA = a[sortConfig.key] ?? "";
          let vB = b[sortConfig.key] ?? "";
          if (typeof vA === "string") vA = vA.toLowerCase();
          if (typeof vB === "string") vB = vB.toLowerCase();
          if (vA < vB) return sortConfig.direction === "asc" ? -1 : 1;
          if (vA > vB) return sortConfig.direction === "asc" ? 1 : -1;
          return 0;
        });
      }
      return data;
    }

    const groupKeyMap = {
      project: "projectName",
      user: "userName",
      client: "clientName",
      task: "taskName",
      date: "dateId",
      isBillable: "isBillable"
    };

    const primaryKey = groupKeyMap[groupBy] || "projectName";
    const secondaryKey = subGroupBy !== "none" ? (groupKeyMap[subGroupBy] || null) : null;

    const groups = {};

    filteredEntries.forEach((e) => {
      const gVal = e[primaryKey] || "Unassigned";
      if (!groups[gVal]) {
        groups[gVal] = {
          key: gVal,
          name: typeof gVal === "boolean" ? (gVal ? "Billable" : "Non-Billable") : String(gVal),
          totalHours: 0,
          billableHours: 0,
          nonBillableHours: 0,
          revenue: 0,
          cost: 0,
          notesList: [],
          subGroups: {}
        };
      }

      groups[gVal].totalHours += e.hours;
      if (e.isBillable) groups[gVal].billableHours += e.hours;
      else groups[gVal].nonBillableHours += e.hours;
      groups[gVal].revenue += e.revenue;
      groups[gVal].cost += e.cost;
      if (e.note) groups[gVal].notesList.push(e.note);

      // Subgrouping
      if (secondaryKey) {
        const subVal = e[secondaryKey] || "Other";
        if (!groups[gVal].subGroups[subVal]) {
          groups[gVal].subGroups[subVal] = {
            key: subVal,
            name: typeof subVal === "boolean" ? (subVal ? "Billable" : "Non-Billable") : String(subVal),
            totalHours: 0,
            billableHours: 0,
            nonBillableHours: 0,
            revenue: 0,
            cost: 0,
            notesList: []
          };
        }
        groups[gVal].subGroups[subVal].totalHours += e.hours;
        if (e.isBillable) groups[gVal].subGroups[subVal].billableHours += e.hours;
        else groups[gVal].subGroups[subVal].nonBillableHours += e.hours;
        groups[gVal].subGroups[subVal].revenue += e.revenue;
        groups[gVal].subGroups[subVal].cost += e.cost;
        if (e.note) groups[gVal].subGroups[subVal].notesList.push(e.note);
      }
    });

    let result = Object.values(groups).map((g) => {
      const profit = g.revenue - g.cost;
      const margin = g.revenue > 0 ? (profit / g.revenue) * 100 : 0;
      const utilizationRate = g.totalHours > 0 ? (g.billableHours / g.totalHours) * 100 : 0;
      const ehr = g.totalHours > 0 ? g.revenue / g.totalHours : 0;
      const notes = g.notesList.slice(0, 3).join("; ");

      let subRows = [];
      if (secondaryKey) {
        subRows = Object.values(g.subGroups).map((sub) => {
          const sProfit = sub.revenue - sub.cost;
          const sMargin = sub.revenue > 0 ? (sProfit / sub.revenue) * 100 : 0;
          const sUtil = sub.totalHours > 0 ? (sub.billableHours / sub.totalHours) * 100 : 0;
          const sEhr = sub.totalHours > 0 ? sub.revenue / sub.totalHours : 0;
          return {
            ...sub,
            profit: sProfit,
            margin: sMargin,
            utilizationRate: sUtil,
            ehr: sEhr,
            notes: sub.notesList.slice(0, 2).join("; ")
          };
        });
      }

      return {
        ...g,
        profit,
        margin,
        utilizationRate,
        ehr,
        notes,
        subRows
      };
    });

    // Sorting
    if (sortConfig.key) {
      result.sort((a, b) => {
        let valA = a[sortConfig.key] ?? 0;
        let valB = b[sortConfig.key] ?? 0;
        if (typeof valA === "string") valA = valA.toLowerCase();
        if (typeof valB === "string") valB = valB.toLowerCase();
        if (valA < valB) return sortConfig.direction === "asc" ? -1 : 1;
        if (valA > valB) return sortConfig.direction === "asc" ? 1 : -1;
        return 0;
      });
    }

    return result;
  }, [filteredEntries, groupBy, subGroupBy, sortConfig]);

  // ---------------------------------------------------------------------------
  // EXCEL & CSV EXPORTERS
  // ---------------------------------------------------------------------------
  const handleExportExcel = () => {
    let rows = [];
    if (groupBy === "raw") {
      rows = filteredEntries.map((e) => ({
        Date: e.dateId,
        "Team Member": e.userName,
        Client: e.clientName,
        Project: e.projectName,
        Task: e.taskName,
        "Billable Status": e.isBillable ? "Billable" : "Non-Billable",
        "Hours Logged": e.hours,
        "Billing Rate ($/h)": e.rate,
        "Cost Rate ($/h)": e.costRate,
        "Revenue ($)": e.revenue,
        "Cost ($)": e.cost,
        "Gross Profit ($)": e.revenue - e.cost,
        "Invoiced Status": e.invoiceId ? "Invoiced" : "Uninvoiced",
        Notes: e.note
      }));
    } else {
      aggregatedReportData.forEach((r) => {
        const baseRow = {
          Group: r.name,
          "Total Hours": r.totalHours,
          "Billable Hours": r.billableHours,
          "Non-Billable Hours": r.nonBillableHours,
          "Utilization %": Math.round(r.utilizationRate) + "%",
          "Revenue ($)": r.revenue,
          "Cost ($)": r.cost,
          "Gross Profit ($)": r.profit,
          "Profit Margin %": Math.round(r.margin) + "%",
          "Effective Rate ($/h)": Math.round(r.ehr)
        };
        rows.push(baseRow);

        if (r.subRows && r.subRows.length > 0) {
          r.subRows.forEach((s) => {
            rows.push({
              Group: `  └ ${s.name}`,
              "Total Hours": s.totalHours,
              "Billable Hours": s.billableHours,
              "Non-Billable Hours": s.nonBillableHours,
              "Utilization %": Math.round(s.utilizationRate) + "%",
              "Revenue ($)": s.revenue,
              "Cost ($)": s.cost,
              "Gross Profit ($)": s.profit,
              "Profit Margin %": Math.round(s.margin) + "%",
              "Effective Rate ($/h)": Math.round(s.ehr)
            });
          });
        }
      });
    }

    if (rows.length === 0) {
      addToast("No data available to export.", "error");
      return;
    }

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Report Data");
    XLSX.writeFile(wb, `VeloTime_Report_${reportType}_${new Date().toISOString().split("T")[0]}.xlsx`);
    addToast("Exported report to Excel spreadsheet (.xlsx)", "success");
  };

  const handleExportCSV = () => {
    if (aggregatedReportData.length === 0) return;
    const headers = ["Group", ...selectedMetrics.map(m => METRIC_COLUMNS.find(c => c.id === m)?.label || m)];
    const csvRows = [headers.join(",")];

    aggregatedReportData.forEach((r) => {
      const row = [
        `"${r.name.replace(/"/g, '""')}"`,
        ...selectedMetrics.map((m) => {
          let val = r[m];
          if (m === "revenue" || m === "cost" || m === "profit") return (val || 0).toFixed(2);
          if (m === "margin" || m === "utilizationRate") return Math.round(val || 0) + "%";
          if (m === "ehr") return (val || 0).toFixed(2);
          if (m === "notes") return `"${(val || "").replace(/"/g, '""')}"`;
          return val || 0;
        })
      ];
      csvRows.push(row.join(","));
    });

    const blob = new Blob([csvRows.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `velotime_report_${reportType}.csv`;
    link.click();
    addToast("Exported report to CSV", "success");
  };

  // Prebuilt Report Selection
  const selectPrebuiltReport = (report) => {
    setReportType(report.id);
    setGroupBy(report.defaultGroupBy);
    setSubGroupBy(report.defaultSubGroupBy);
    setSelectedMetrics(report.columns);
    if (report.invoicedFilter) setInvoicedFilter(report.invoicedFilter);
    else setInvoicedFilter("all");
    setReportPhase("viewing");
  };

  const toggleExpandRow = (key) => {
    setExpandedRows(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSort = (key) => {
    let direction = "asc";
    if (sortConfig.key === key) {
      if (sortConfig.direction === "asc") direction = "desc";
      else if (sortConfig.direction === "desc") direction = null;
    }
    setSortConfig(direction ? { key, direction } : { key: null, direction: null });
  };

  // Filter Prebuilt List
  const visiblePrebuilt = PREBUILT_REPORTS.filter(r => {
    const matchCategory = categoryFilter === "all" || r.category.toLowerCase() === categoryFilter.toLowerCase();
    const matchSearch = r.title.toLowerCase().includes(searchQuery.toLowerCase()) || r.desc.toLowerCase().includes(searchQuery.toLowerCase());
    return matchCategory && matchSearch;
  });

  return (
    <div className="flex-1 flex flex-col bg-slate-50 dark:bg-zinc-950 overflow-hidden transition-colors h-full w-full">
      
      {/* ========================================================================= */}
      {/* TOP HEADER BAR */}
      {/* ========================================================================= */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 p-4 border-b border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 shrink-0">
        <div className="flex items-center gap-3">
          {reportPhase !== "menu" && (
            <button
              onClick={() => {
                setReportPhase("menu");
                setSortConfig({ key: null, direction: null });
              }}
              className="p-1.5 hover:bg-slate-100 dark:bg-zinc-800 text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer rounded-lg"
              title="Back to Reports Directory"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </button>
          )}

          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
              {reportPhase === "menu" ? "Reports & Analytics Hub" : (
                PREBUILT_REPORTS.find(r => r.id === reportType)?.title || 
                savedReports.find(r => r.id === reportType)?.title || 
                "Custom Dynamic Report"
              )}
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {reportPhase === "menu" 
                ? "Executive telemetry, project margins, capacity planning, and custom query builder."
                : `Filtered by: ${selectedPeriod.toUpperCase()} ${selectedProject !== 'all' ? '• Project Filtered' : ''} ${selectedUser !== 'all' ? '• Member Filtered' : ''}`
              }
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {reportPhase === "menu" ? (
            <div className="flex items-center bg-slate-100 dark:bg-zinc-800 p-1 rounded-xl border border-slate-300 dark:border-zinc-700 text-xs font-semibold">
              <button
                onClick={() => setActiveTab("prebuilt")}
                className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${activeTab === "prebuilt" ? "bg-white dark:bg-zinc-900 text-slate-900 dark:text-white shadow-sm font-bold" : "text-slate-600 dark:text-slate-400"}`}
              >
                Prebuilt Library ({PREBUILT_REPORTS.length})
              </button>
              <button
                onClick={() => setActiveTab("builder")}
                className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${activeTab === "builder" ? "bg-white dark:bg-zinc-900 text-slate-900 dark:text-white shadow-sm font-bold" : "text-slate-600 dark:text-slate-400"}`}
              >
                Custom Builder
              </button>
              <button
                onClick={() => setActiveTab("saved")}
                className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${activeTab === "saved" ? "bg-white dark:bg-zinc-900 text-slate-900 dark:text-white shadow-sm font-bold" : "text-slate-600 dark:text-slate-400"}`}
              >
                Saved Presets ({savedReports.length}/20)
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setReportPhase("builder")}
                className="bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-700 dark:text-slate-300 font-semibold px-3 py-1.5 text-xs rounded-lg transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                </svg>
                Edit Config
              </button>

              <button
                onClick={handleExportCSV}
                className="bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-700 dark:text-slate-300 font-semibold px-3 py-1.5 text-xs rounded-lg transition-colors cursor-pointer flex items-center gap-1.5"
              >
                CSV
              </button>

              <button
                onClick={handleExportExcel}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-3 py-1.5 text-xs rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 shadow-sm"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Export Excel (.xlsx)
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MAIN CONTAINER */}
      {/* ========================================================================= */}
      <div className="flex-1 overflow-auto bg-slate-50 dark:bg-zinc-950 relative w-full h-full custom-scrollbar">

        {/* ----------------------------------------------------------------- */}
        {/* PHASE 1: PREBUILT LIBRARY */}
        {/* ----------------------------------------------------------------- */}
        {reportPhase === "menu" && activeTab === "prebuilt" && (
          <div className="p-6 md:p-8 max-w-6xl mx-auto w-full">
            
            {/* Search & Category Filter Pills */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
              <div className="flex items-center gap-2 flex-wrap">
                {["all", "profitability", "capacity", "governance", "compliance"].map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setCategoryFilter(cat)}
                    className={`px-3.5 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                      categoryFilter === cat
                        ? "bg-primary-600 text-white shadow-sm"
                        : "bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-slate-600 dark:text-slate-400 hover:border-slate-400"
                    }`}
                  >
                    {cat === "all" ? "All Reports" : cat}
                  </button>
                ))}
              </div>

              <div className="w-full sm:w-64">
                <input
                  type="text"
                  placeholder="Search 12 reports..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl px-3.5 py-1.5 text-xs text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-primary-500 shadow-sm"
                />
              </div>
            </div>

            {/* Reports Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {visiblePrebuilt.map((report) => (
                <div
                  key={report.id}
                  onClick={() => selectPrebuiltReport(report)}
                  className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 hover:border-primary-500 dark:hover:border-primary-500 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-zinc-800 flex items-center justify-center text-primary-600 dark:text-primary-400 group-hover:scale-110 transition-transform">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={report.icon} />
                        </svg>
                      </div>
                      <span className="text-[10px] font-bold uppercase tracking-wider bg-slate-100 dark:bg-zinc-800 text-slate-500 px-2 py-0.5 rounded">
                        {report.badge}
                      </span>
                    </div>

                    <h3 className="text-base font-bold text-slate-900 dark:text-white group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors mb-2">
                      {report.title}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mb-4">
                      {report.desc}
                    </p>
                  </div>

                  <div className="pt-3 border-t border-slate-100 dark:border-zinc-800 flex items-center justify-between text-xs font-bold text-primary-600 dark:text-primary-400 group-hover:translate-x-1 transition-transform">
                    <span>Run Report &rarr;</span>
                    <span className="text-[10px] text-slate-400 font-normal">Grouped by {report.defaultGroupBy}</span>
                  </div>
                </div>
              ))}
            </div>

          </div>
        )}

        {/* ----------------------------------------------------------------- */}
        {/* PHASE 2: CUSTOM REPORT BUILDER */}
        {/* ----------------------------------------------------------------- */}
        {((reportPhase === "menu" && activeTab === "builder") || reportPhase === "builder") && (
          <div className="p-6 md:p-8 max-w-4xl mx-auto w-full">
            <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-3xl p-8 shadow-sm">
              
              <div className="mb-8">
                <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight mb-2">
                  Custom Report Builder
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Select your dimensions, customize metric columns, and apply multi-period filters to build tailored reports.
                </p>
              </div>

              {/* Grouping Selectors */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-8 pb-8 border-b border-slate-200 dark:border-zinc-800">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
                    Primary Grouping
                  </label>
                  <select
                    value={groupBy}
                    onChange={(e) => setGroupBy(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-xl p-3 text-xs font-semibold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="project">Group by Project</option>
                    <option value="user">Group by Team Member</option>
                    <option value="client">Group by Client</option>
                    <option value="task">Group by Task / Activity</option>
                    <option value="date">Group by Date</option>
                    <option value="raw">No Grouping (Granular Line-by-Line Log)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
                    Secondary Sub-Group (Optional)
                  </label>
                  <select
                    value={subGroupBy}
                    onChange={(e) => setSubGroupBy(e.target.value)}
                    disabled={groupBy === "raw"}
                    className="w-full bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-xl p-3 text-xs font-semibold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-50"
                  >
                    <option value="none">None (Single Level)</option>
                    <option value="user" disabled={groupBy === "user"}>Sub-group by Team Member</option>
                    <option value="project" disabled={groupBy === "project"}>Sub-group by Project</option>
                    <option value="task" disabled={groupBy === "task"}>Sub-group by Task</option>
                    <option value="date" disabled={groupBy === "date"}>Sub-group by Date</option>
                  </select>
                </div>
              </div>

              {/* Metric Column Selector */}
              <div className="mb-8 pb-8 border-b border-slate-200 dark:border-zinc-800">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3">
                  Include Metrics & Columns
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {METRIC_COLUMNS.map((col) => {
                    const isSelected = selectedMetrics.includes(col.id);
                    return (
                      <label
                        key={col.id}
                        className={`flex items-center gap-2.5 p-3 rounded-xl border text-xs font-semibold cursor-pointer transition-all ${
                          isSelected
                            ? "bg-primary-50 dark:bg-primary-950/40 border-primary-300 dark:border-primary-800 text-primary-900 dark:text-primary-300"
                            : "bg-slate-50 dark:bg-zinc-800/40 border-slate-200 dark:border-zinc-800 text-slate-600 dark:text-slate-400"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => {
                            if (isSelected) {
                              if (selectedMetrics.length > 1) {
                                setSelectedMetrics(selectedMetrics.filter((m) => m !== col.id));
                              }
                            } else {
                              setSelectedMetrics([...selectedMetrics, col.id]);
                            }
                          }}
                          className="rounded text-primary-600 focus:ring-primary-500"
                        />
                        <span>{col.label}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Filter Controls */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-400 mb-1.5">Date Period</label>
                  <select
                    value={selectedPeriod}
                    onChange={(e) => setSelectedPeriod(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-lg p-2 text-xs text-slate-900 dark:text-white"
                  >
                    <option value="week">This Week</option>
                    <option value="lastWeek">Last Week</option>
                    <option value="month">This Month</option>
                    <option value="lastMonth">Last Month</option>
                    <option value="quarter">This Quarter</option>
                    <option value="ytd">Year to Date (YTD)</option>
                    <option value="all">All Time</option>
                    <option value="custom">Custom Date Range</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-400 mb-1.5">Project</label>
                  <select
                    value={selectedProject}
                    onChange={(e) => setSelectedProject(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-lg p-2 text-xs text-slate-900 dark:text-white"
                  >
                    <option value="all">All Projects ({projects.length})</option>
                    {projects.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-400 mb-1.5">Team Member</label>
                  <select
                    value={selectedUser}
                    onChange={(e) => setSelectedUser(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-lg p-2 text-xs text-slate-900 dark:text-white"
                  >
                    <option value="all">All Team Members ({orgUsers.length})</option>
                    {orgUsers.map(u => (
                      <option key={u.id} value={u.id}>{u.firstName} {u.lastName}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-400 mb-1.5">Invoiced Status</label>
                  <select
                    value={invoicedFilter}
                    onChange={(e) => setInvoicedFilter(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-lg p-2 text-xs text-slate-900 dark:text-white"
                  >
                    <option value="all">All Entries</option>
                    <option value="uninvoiced">Uninvoiced Only</option>
                    <option value="invoiced">Invoiced Only</option>
                  </select>
                </div>
              </div>

              {selectedPeriod === "custom" && (
                <div className="flex gap-4 p-4 bg-slate-50 dark:bg-zinc-800/50 rounded-xl mb-8 border border-slate-200 dark:border-zinc-700">
                  <div className="flex-1">
                    <label className="block text-[11px] font-bold text-slate-400 mb-1">Start Date</label>
                    <input
                      type="date"
                      value={customStartDate}
                      onChange={(e) => setCustomStartDate(e.target.value)}
                      className="w-full bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded p-2 text-xs text-slate-900 dark:text-white"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="block text-[11px] font-bold text-slate-400 mb-1">End Date</label>
                    <input
                      type="date"
                      value={customEndDate}
                      onChange={(e) => setCustomEndDate(e.target.value)}
                      className="w-full bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded p-2 text-xs text-slate-900 dark:text-white"
                    />
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row justify-between items-center gap-4 pt-6 border-t border-slate-200 dark:border-zinc-800">
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <input
                    type="text"
                    placeholder="Save preset name (e.g. Monthly Retainers)..."
                    value={customReportName}
                    onChange={(e) => setCustomReportName(e.target.value)}
                    className="bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white outline-none w-full sm:w-64"
                  />
                  <button
                    onClick={saveCurrentAsCustomReport}
                    className="bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-700 dark:text-slate-300 font-bold px-3 py-2 rounded-xl text-xs whitespace-nowrap cursor-pointer"
                  >
                    Save Preset
                  </button>
                </div>

                <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
                  <button
                    onClick={() => setReportPhase("menu")}
                    className="px-4 py-2 text-xs font-semibold text-slate-500 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      setReportType("custom");
                      setReportPhase("viewing");
                    }}
                    className="bg-primary-600 hover:bg-primary-500 text-white font-bold px-6 py-2.5 rounded-xl text-xs shadow-md transition-all cursor-pointer"
                  >
                    Run Custom Report &rarr;
                  </button>
                </div>
              </div>

            </div>
          </div>
        )}

        {/* ----------------------------------------------------------------- */}
        {/* PHASE 3: SAVED CUSTOM PRESETS */}
        {/* ----------------------------------------------------------------- */}
        {reportPhase === "menu" && activeTab === "saved" && (
          <div className="p-6 md:p-8 max-w-5xl mx-auto w-full">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
                  Saved Custom Report Presets ({savedReports.length}/20)
                </h2>
                <p className="text-xs text-slate-500">Launch your saved query templates with a single click.</p>
              </div>
              <button
                onClick={() => setActiveTab("builder")}
                className="bg-primary-600 hover:bg-primary-500 text-white font-bold px-4 py-2 rounded-xl text-xs transition-colors cursor-pointer"
              >
                + Build New Preset
              </button>
            </div>

            {savedReports.length === 0 ? (
              <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-3xl p-12 text-center">
                <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-zinc-800 text-slate-400 flex items-center justify-center mx-auto mb-4">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                  </svg>
                </div>
                <h3 className="font-bold text-slate-900 dark:text-white text-base mb-1">No custom presets saved yet</h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto mb-6">
                  Use the Custom Builder to customize dimensions, metrics, and filters, then save them here for instant 1-click access.
                </p>
                <button
                  onClick={() => setActiveTab("builder")}
                  className="bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold px-5 py-2 rounded-xl text-xs"
                >
                  Open Custom Builder
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {savedReports.map((saved) => (
                  <div
                    key={saved.id}
                    onClick={() => loadSavedReport(saved)}
                    className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 hover:border-primary-500 rounded-2xl p-5 shadow-sm transition-all cursor-pointer group flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex justify-between items-start mb-2">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-950/60 px-2 py-0.5 rounded">
                          Grouped by {saved.groupBy}
                        </span>
                        <button
                          onClick={(e) => deleteSavedReport(saved.id, e)}
                          className="text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity p-1"
                          title="Delete saved report"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>

                      <h3 className="font-bold text-slate-900 dark:text-white text-sm mb-1 group-hover:text-primary-600 transition-colors">
                        {saved.title}
                      </h3>
                      <p className="text-[11px] text-slate-400">
                        Period: {saved.selectedPeriod} &bull; {saved.selectedMetrics?.length || 4} metrics
                      </p>
                    </div>

                    <div className="pt-3 mt-4 border-t border-slate-100 dark:border-zinc-800 flex justify-between items-center text-xs font-bold text-primary-600 dark:text-primary-400">
                      <span>Launch Preset &rarr;</span>
                      <span className="text-[10px] text-slate-400 font-normal">{new Date(saved.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}

          </div>
        )}

        {/* ----------------------------------------------------------------- */}
        {/* PHASE 4: VIEWING LIVE REPORT SPREADSHEET */}
        {/* ----------------------------------------------------------------- */}
        {reportPhase === "viewing" && (
          <div className="p-4 sm:p-6 w-full max-w-7xl mx-auto">
            
            {/* KPI Summary Banner */}
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-3 mb-6">
              <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 p-4 rounded-2xl shadow-sm">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Total Hours</span>
                <div className="text-2xl font-black text-slate-900 dark:text-white font-mono">{kpiStats.totalHrs.toFixed(1)}h</div>
                <span className="text-[10px] text-slate-500 font-medium">({kpiStats.billableHrs.toFixed(1)}h billable)</span>
              </div>

              <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 p-4 rounded-2xl shadow-sm">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Billable Value</span>
                <div className="text-2xl font-black text-primary-600 dark:text-primary-400 font-mono">${kpiStats.revenue.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</div>
                <span className="text-[10px] text-slate-500 font-medium">Gross revenue</span>
              </div>

              <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 p-4 rounded-2xl shadow-sm">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Labor Cost</span>
                <div className="text-2xl font-black text-slate-700 dark:text-slate-300 font-mono">${kpiStats.cost.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</div>
                <span className="text-[10px] text-slate-500 font-medium">Loaded payroll</span>
              </div>

              <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 p-4 rounded-2xl shadow-sm">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Gross Margin %</span>
                <div className={`text-2xl font-black font-mono ${kpiStats.margin >= 40 ? 'text-emerald-600 dark:text-emerald-400' : kpiStats.margin >= 20 ? 'text-amber-500' : 'text-red-500'}`}>
                  {Math.round(kpiStats.margin)}%
                </div>
                <span className="text-[10px] text-slate-500 font-medium">${Math.round(kpiStats.profit).toLocaleString()} profit</span>
              </div>

              <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 p-4 rounded-2xl shadow-sm col-span-2 sm:col-span-1">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Effective Rate (EHR)</span>
                <div className="text-2xl font-black text-slate-900 dark:text-white font-mono">${Math.round(kpiStats.ehr)}<span className="text-xs text-slate-400">/hr</span></div>
                <span className="text-[10px] text-slate-500 font-medium">{Math.round(kpiStats.utilization)}% utilization</span>
              </div>
            </div>

            {/* Main Interactive Spreadsheet Grid */}
            <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse min-w-[700px]">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-zinc-800 bg-slate-100 dark:bg-zinc-800/80 text-slate-700 dark:text-slate-300 font-bold uppercase tracking-wider text-[11px]">
                      <th 
                        className="py-3 px-4 cursor-pointer hover:bg-slate-200 dark:hover:bg-zinc-700 transition-colors"
                        onClick={() => handleSort("name")}
                      >
                        <span>{groupBy === "raw" ? "Date / Item" : (groupBy.charAt(0).toUpperCase() + groupBy.slice(1))}</span>
                        {sortConfig.key === "name" && (
                          <span className="ml-1 text-primary-600">{sortConfig.direction === "asc" ? "↑" : "↓"}</span>
                        )}
                      </th>

                      {groupBy === "raw" ? (
                        <>
                          <th className="py-3 px-3">Team Member</th>
                          <th className="py-3 px-3">Project</th>
                          <th className="py-3 px-3">Task</th>
                          <th className="py-3 px-3 text-right">Hours</th>
                          <th className="py-3 px-3 text-right">Rate</th>
                          <th className="py-3 px-3 text-right">Revenue</th>
                          <th className="py-3 px-3 text-right">Cost</th>
                          <th className="py-3 px-4">Notes</th>
                        </>
                      ) : (
                        selectedMetrics.map((mId) => {
                          const col = METRIC_COLUMNS.find(c => c.id === mId);
                          return (
                            <th
                              key={mId}
                              onClick={() => handleSort(mId)}
                              className={`py-3 px-3 cursor-pointer hover:bg-slate-200 dark:hover:bg-zinc-700 transition-colors ${col?.align === 'right' ? 'text-right' : 'text-left'}`}
                            >
                              <span>{col?.label || mId}</span>
                              {sortConfig.key === mId && (
                                <span className="ml-1 text-primary-600">{sortConfig.direction === "asc" ? "↑" : "↓"}</span>
                              )}
                            </th>
                          );
                        })
                      )}
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100 dark:divide-zinc-800 text-slate-800 dark:text-slate-200 font-medium">
                    {aggregatedReportData.length === 0 ? (
                      <tr>
                        <td colSpan={10} className="p-12 text-center text-slate-400">
                          No time entries matched your active filters for this period.
                        </td>
                      </tr>
                    ) : groupBy === "raw" ? (
                      aggregatedReportData.map((e, idx) => (
                        <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-zinc-800/40 transition-colors">
                          <td className="py-3 px-4 font-mono text-slate-500">{e.dateId}</td>
                          <td className="py-3 px-3 font-semibold text-slate-900 dark:text-white">{e.userName}</td>
                          <td className="py-3 px-3 text-slate-600 dark:text-slate-300">{e.projectName}</td>
                          <td className="py-3 px-3 text-slate-500">{e.taskName}</td>
                          <td className="py-3 px-3 text-right font-mono font-bold">{e.hours.toFixed(2)}</td>
                          <td className="py-3 px-3 text-right font-mono text-slate-500">${e.rate}</td>
                          <td className="py-3 px-3 text-right font-mono text-primary-600 dark:text-primary-400 font-bold">${e.revenue.toFixed(2)}</td>
                          <td className="py-3 px-3 text-right font-mono text-slate-500">${e.cost.toFixed(2)}</td>
                          <td className="py-3 px-4 text-xs text-slate-400 italic max-w-xs truncate">{e.note || "-"}</td>
                        </tr>
                      ))
                    ) : (
                      aggregatedReportData.map((row) => {
                        const hasSub = row.subRows && row.subRows.length > 0;
                        const isExpanded = expandedRows[row.key];

                        return (
                          <React.Fragment key={row.key}>
                            <tr 
                              onClick={() => hasSub && toggleExpandRow(row.key)}
                              className={`transition-colors ${hasSub ? 'cursor-pointer hover:bg-slate-50 dark:hover:bg-zinc-800/50' : ''}`}
                            >
                              <td className="py-3 px-4 font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                {hasSub && (
                                  <span className="w-4 h-4 rounded bg-slate-100 dark:bg-zinc-800 flex items-center justify-center text-[10px] text-slate-500">
                                    {isExpanded ? "−" : "+"}
                                  </span>
                                )}
                                <span>{row.name}</span>
                              </td>

                              {selectedMetrics.map((mId) => {
                                const val = row[mId];
                                const col = METRIC_COLUMNS.find(c => c.id === mId);
                                const isRight = col?.align === "right";

                                return (
                                  <td key={mId} className={`py-3 px-3 font-mono ${isRight ? 'text-right' : 'text-left'}`}>
                                    {mId === "totalHours" || mId === "billableHours" || mId === "nonBillableHours" ? (
                                      <span className="font-bold">{val.toFixed(1)}h</span>
                                    ) : mId === "revenue" ? (
                                      <span className="font-bold text-primary-600 dark:text-primary-400">${Math.round(val).toLocaleString()}</span>
                                    ) : mId === "cost" ? (
                                      <span className="text-slate-600 dark:text-slate-400">${Math.round(val).toLocaleString()}</span>
                                    ) : mId === "profit" ? (
                                      <span className={`font-bold ${val >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500'}`}>${Math.round(val).toLocaleString()}</span>
                                    ) : mId === "margin" ? (
                                      <span className={`font-bold ${val >= 40 ? 'text-emerald-600' : val >= 20 ? 'text-amber-500' : 'text-red-500'}`}>{Math.round(val)}%</span>
                                    ) : mId === "utilizationRate" ? (
                                      <span className="font-bold text-blue-600 dark:text-blue-400">{Math.round(val)}%</span>
                                    ) : mId === "ehr" ? (
                                      <span className="font-bold">${Math.round(val)}/h</span>
                                    ) : (
                                      <span className="text-xs text-slate-500 font-sans">{val || "-"}</span>
                                    )}
                                  </td>
                                );
                              })}
                            </tr>

                            {/* Nested Sub-Group Rows */}
                            {hasSub && isExpanded && row.subRows.map((sub) => (
                              <tr key={sub.key} className="bg-slate-50/70 dark:bg-zinc-950/40 text-slate-600 dark:text-slate-400">
                                <td className="py-2.5 px-4 pl-10 text-xs font-semibold text-slate-700 dark:text-slate-300">
                                  <span className="text-slate-400 mr-1.5">└</span> {sub.name}
                                </td>
                                {selectedMetrics.map((mId) => {
                                  const val = sub[mId];
                                  const col = METRIC_COLUMNS.find(c => c.id === mId);
                                  const isRight = col?.align === "right";

                                  return (
                                    <td key={mId} className={`py-2.5 px-3 font-mono text-xs ${isRight ? 'text-right' : 'text-left'}`}>
                                      {mId === "totalHours" || mId === "billableHours" || mId === "nonBillableHours" ? (
                                        <span>{val.toFixed(1)}h</span>
                                      ) : mId === "revenue" ? (
                                        <span>${Math.round(val).toLocaleString()}</span>
                                      ) : mId === "cost" ? (
                                        <span>${Math.round(val).toLocaleString()}</span>
                                      ) : mId === "profit" ? (
                                        <span>${Math.round(val).toLocaleString()}</span>
                                      ) : mId === "margin" || mId === "utilizationRate" ? (
                                        <span>{Math.round(val)}%</span>
                                      ) : mId === "ehr" ? (
                                        <span>${Math.round(val)}/h</span>
                                      ) : (
                                        <span className="text-xs text-slate-400 font-sans">{val || "-"}</span>
                                      )}
                                    </td>
                                  );
                                })}
                              </tr>
                            ))}
                          </React.Fragment>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        )}

      </div>

    </div>
  );
}
