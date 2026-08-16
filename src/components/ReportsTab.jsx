import React, { useState, useMemo, useEffect } from "react";
import { useToast } from "../contexts/ToastContext";
import * as XLSX from "xlsx";

export default function ReportsTab({
  dbUser,
  projects = [],
  entries = {},
  rawEntries = [],
  orgUsers = [],
  notes = {},
  taskRates = [],
}) {
  const isPremium = dbUser?.organization?.tier === "premium";
  const { addToast } = useToast();

  // State: 'menu', 'configuring', 'viewing'
  const [reportPhase, setReportPhase] = useState("menu");
  const [reportType, setReportType] = useState(null); // 'detailed', 'budgets', 'capacity', 'uninvoiced'

  // Filter States
  const [selectedProject, setSelectedProject] = useState("all");
  const [selectedUser, setSelectedUser] = useState("all");
  const [selectedPeriod, setSelectedPeriod] = useState("all"); // 'all', 'week', 'month', 'lastMonth', 'custom'
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");

  // Sort State
  const [sortConfig, setSortConfig] = useState({ key: null, direction: null });

  const handleSort = (key) => {
    let direction = "asc";
    if (sortConfig.key === key) {
      if (sortConfig.direction === "asc") direction = "desc";
      else if (sortConfig.direction === "desc") direction = null;
    }
    setSortConfig(
      direction ? { key, direction } : { key: null, direction: null },
    );
  };

  const SortIcon = ({ columnKey }) => {
    if (sortConfig.key !== columnKey || !sortConfig.direction) {
      return (
        <svg
          className="w-3 h-3 ml-1 inline text-slate-400 dark:text-slate-600 opacity-0 group-hover:opacity-100 transition-opacity"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4"
          />
        </svg>
      );
    }
    return (
      <svg
        className="w-3 h-3 ml-1 inline text-primary-600"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        {sortConfig.direction === "asc" ? (
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M5 15l7-7 7 7"
          />
        ) : (
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M19 9l-7 7-7-7"
          />
        )}
      </svg>
    );
  };

  const parsedEntries = useMemo(() => {
    // Build a map of rawEntries for quick invoice lookup
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

  // Enrich entries with user, project, and task information
  const enrichedEntries = useMemo(() => {
    // Build lookup maps for O(1) access
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
      const userObj = userMap[e.userId] || {
        firstName: "Unknown",
        lastName: "Member",
      };
      const mapObj = taskMap[e.taskId];
      const projectObj = mapObj ? mapObj.project : null;
      const taskObj = mapObj ? mapObj.task : null;

      const taskRateOverride = taskRates.find(
        (tr) => tr.taskId === e.taskId && tr.userId === e.userId,
      );
      const billingRate = taskRateOverride?.billingRate || userObj.defaultBillingRate || 150;
      const costRate = taskRateOverride?.costRate || userObj.defaultCostRate || 0;
      const isBillable = taskObj ? taskObj.isBillable !== false : true;

      const fName =
        userObj.firstName && userObj.firstName !== "null"
          ? userObj.firstName
          : "";
      const lName =
        userObj.lastName && userObj.lastName !== "null" ? userObj.lastName : "";
      let derivedName = `${fName} ${lName}`.trim();
      if (!derivedName) {
        derivedName =
          userObj.emailAddress || userObj.email || "Unnamed Employee";
      }

      return {
        ...e,
        userName: derivedName,
        projectName: projectObj ? projectObj.name : "Unknown Project",
        projectId: projectObj ? projectObj.id : null,
        taskName: taskObj ? taskObj.name : "Unknown Task",
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

  // Date Range Filtering helpers
  const isThisMonth = (dateStr) => {
    const d = new Date(dateStr + "T00:00:00");
    const now = new Date();
    return (
      d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
    );
  };

  const isLastMonth = (dateStr) => {
    const d = new Date(dateStr + "T00:00:00");
    const now = new Date();
    let targetMonth = now.getMonth() - 1;
    let targetYear = now.getFullYear();
    if (targetMonth < 0) {
      targetMonth = 11;
      targetYear -= 1;
    }
    return d.getMonth() === targetMonth && d.getFullYear() === targetYear;
  };

  const isThisWeek = (dateStr) => {
    const d = new Date(dateStr + "T00:00:00");
    const now = new Date();
    const day = now.getDay();
    const diff = now.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(now.setDate(diff));
    monday.setHours(0, 0, 0, 0);

    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    sunday.setHours(23, 59, 59, 999);

    return d >= monday && d <= sunday;
  };

  // Filter and Sort entries
  const filteredEntries = useMemo(() => {
    let filtered = enrichedEntries.filter((e) => {
      const matchProject =
        selectedProject === "all" ||
        String(e.projectId) === String(selectedProject);
      const matchUser =
        selectedUser === "all" || String(e.userId) === String(selectedUser);

      let matchPeriod = true;
      if (selectedPeriod === "week") {
        matchPeriod = isThisWeek(e.dateId);
      } else if (selectedPeriod === "month") {
        matchPeriod = isThisMonth(e.dateId);
      } else if (selectedPeriod === "lastMonth") {
        matchPeriod = isLastMonth(e.dateId);
      } else if (selectedPeriod === "custom") {
        const d = new Date(e.dateId + "T00:00:00");
        if (customStartDate && d < new Date(customStartDate + "T00:00:00"))
          matchPeriod = false;
        if (customEndDate && d > new Date(customEndDate + "T23:59:59"))
          matchPeriod = false;
      }

      return matchProject && matchUser && matchPeriod;
    });

    if (sortConfig.key && reportType === "detailed") {
      filtered.sort((a, b) => {
        let valA = a[sortConfig.key];
        let valB = b[sortConfig.key];
        if (typeof valA === "string") valA = valA.toLowerCase();
        if (typeof valB === "string") valB = valB.toLowerCase();

        if (valA < valB) return sortConfig.direction === "asc" ? -1 : 1;
        if (valA > valB) return sortConfig.direction === "asc" ? 1 : -1;
        return 0;
      });
    }

    return filtered;
  }, [
    enrichedEntries,
    selectedProject,
    selectedUser,
    selectedPeriod,
    customStartDate,
    customEndDate,
    sortConfig,
    reportType,
  ]);

  // Aggregate Stats
  const totals = useMemo(() => {
    let hours = 0;
    let amount = 0;
    filteredEntries.forEach((e) => {
      hours += e.hours;
      amount += e.amount;
    });
    return { hours, amount };
  }, [filteredEntries]);

  // Project Budgets Aggregation
  const projectBudgets = useMemo(() => {
    let data = projects.map((p) => {
      const projEntries = enrichedEntries.filter((e) => e.projectId === p.id);
      const projHours = projEntries.reduce((sum, e) => sum + e.hours, 0);
      const billableValue = projEntries.reduce((sum, e) => sum + e.amount, 0);
      const budgetLimit = p.name.toLowerCase().includes("design") ? 80 : 120;
      const remaining = Math.max(0, budgetLimit - projHours);
      const burnPercentage = (projHours / budgetLimit) * 100;

      const projRevenue = projEntries.reduce((sum, e) => sum + e.revenue, 0);
      const projCost = projEntries.reduce((sum, e) => sum + e.cost, 0);
      const projProfit = projRevenue - projCost;
      const profitMargin = projRevenue > 0 ? (projProfit / projRevenue) * 100 : 0;

      return {
        id: p.id,
        name: p.name,
        hours: projHours,
        budgetLimit,
        remaining,
        burnPercentage,
        billableValue,
        projRevenue,
        projCost,
        projProfit,
        profitMargin,
      };
    });

    if (sortConfig.key && reportType === "budgets") {
      data.sort((a, b) => {
        let valA = a[sortConfig.key];
        let valB = b[sortConfig.key];
        if (typeof valA === "string") valA = valA.toLowerCase();
        if (typeof valB === "string") valB = valB.toLowerCase();

        if (valA < valB) return sortConfig.direction === "asc" ? -1 : 1;
        if (valA > valB) return sortConfig.direction === "asc" ? 1 : -1;
        return 0;
      });
    }
    return data;
  }, [projects, enrichedEntries, sortConfig, reportType]);

  // Uninvoiced Aggregation
  const uninvoicedProjectData = useMemo(() => {
    let data = projects
      .map((p) => {
        const unbilledEntries = enrichedEntries.filter(
          (e) => e.projectId === p.id && !e.invoiceId,
        );
        const unbilledHours = unbilledEntries.reduce(
          (sum, e) => sum + e.hours,
          0,
        );
        const billableValue = unbilledEntries.reduce(
          (sum, e) => sum + e.amount,
          0,
        );

        return {
          id: p.id,
          name: p.name,
          hours: unbilledHours,
          billableValue,
        };
      })
      .filter((p) => p.hours > 0);

    if (sortConfig.key && reportType === "uninvoiced") {
      data.sort((a, b) => {
        let valA = a[sortConfig.key];
        let valB = b[sortConfig.key];
        if (typeof valA === "string") valA = valA.toLowerCase();
        if (typeof valB === "string") valB = valB.toLowerCase();

        if (valA < valB) return sortConfig.direction === "asc" ? -1 : 1;
        if (valA > valB) return sortConfig.direction === "asc" ? 1 : -1;
        return 0;
      });
    }
    return data;
  }, [projects, enrichedEntries, sortConfig, reportType]);

  // Project -> Team Aggregation
  const projectTeamData = useMemo(() => {
    let data = [];
    projects.forEach((p) => {
      const projEntries = enrichedEntries.filter((e) => e.projectId === p.id);
      if (projEntries.length === 0) return;

      const userMap = {};
      projEntries.forEach((e) => {
        if (!userMap[e.userId]) {
          userMap[e.userId] = {
            userName: e.userName,
            hours: 0,
            amount: 0,
          };
        }
        userMap[e.userId].hours += e.hours;
        userMap[e.userId].amount += e.amount;
      });

      const users = Object.values(userMap).sort((a, b) => b.hours - a.hours);
      const totalProjHours = users.reduce((s, u) => s + u.hours, 0);
      const totalProjAmount = users.reduce((s, u) => s + u.amount, 0);

      data.push({
        projectName: p.name,
        hours: totalProjHours,
        amount: totalProjAmount,
        users,
      });
    });

    if (sortConfig.key && reportType === "project-team") {
      data.sort((a, b) => {
        let valA = a[sortConfig.key];
        let valB = b[sortConfig.key];
        if (typeof valA === "string") valA = valA.toLowerCase();
        if (typeof valB === "string") valB = valB.toLowerCase();

        if (valA < valB) return sortConfig.direction === "asc" ? -1 : 1;
        if (valA > valB) return sortConfig.direction === "asc" ? 1 : -1;
        return 0;
      });
    }
    return data;
  }, [projects, enrichedEntries, sortConfig, reportType]);

  // Team Capacity Aggregation
  const teamCapacity = useMemo(() => {
    let data = orgUsers.map((u) => {
      const userHours = enrichedEntries
        .filter((e) => e.userId === u.id)
        .reduce((sum, e) => sum + e.hours, 0);
      const billableHours = enrichedEntries
        .filter((e) => e.userId === u.id && e.isBillable)
        .reduce((sum, e) => sum + e.hours, 0);
      const capacity = 40; // 40 hours per week
      const utilization = (userHours / capacity) * 100;
      const realization = userHours > 0 ? (billableHours / userHours) * 100 : 0;
      return {
        id: u.id,
        name: `${u.firstName} ${u.lastName}`,
        hours: userHours,
        billableHours,
        capacity,
        utilization,
        realization,
      };
    });

    if (sortConfig.key && reportType === "capacity") {
      data.sort((a, b) => {
        let valA = a[sortConfig.key];
        let valB = b[sortConfig.key];
        if (typeof valA === "string") valA = valA.toLowerCase();
        if (typeof valB === "string") valB = valB.toLowerCase();

        if (valA < valB) return sortConfig.direction === "asc" ? -1 : 1;
        if (valA > valB) return sortConfig.direction === "asc" ? 1 : -1;
        return 0;
      });
    }
    return data;
  }, [orgUsers, enrichedEntries, sortConfig, reportType]);

  // CSV Exporter
  const handleExportCSV = () => {
    const headers = [
      "Date",
      "Team Member",
      "Project",
      "Task",
      "Hours",
      "Rate ($/hr)",
      "Billable Amount",
      "Notes",
    ];
    const rows = filteredEntries.map((e) => [
      e.dateId,
      e.userName,
      e.projectName,
      e.taskName,
      e.hours,
      e.rate,
      e.amount,
      e.note.replace(/"/g, '""'),
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map((r) => r.map((val) => `"${val}"`).join(",")),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `velotime_detailed_report_${selectedPeriod}.csv`,
    );
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const [invoicedProjects, setInvoicedProjects] = useState([]);
  const handleMarkInvoiced = (projectId) => {
    setInvoicedProjects((prev) => [...prev, projectId]);
    addToast("Hours marked as invoiced. (Mock action updated in local state)", "success");
  };

  const handleBack = () => {
    if (reportPhase === "viewing") {
      setReportPhase("configuring");
      setSortConfig({ key: null, direction: null });
    } else if (reportPhase === "configuring") {
      setReportPhase("menu");
      setReportType(null);
    }
  };

  const selectReport = (id) => {
    setReportType(id);
    setReportPhase("configuring");
  };

  const runReport = () => {
    setReportPhase("viewing");
  };

  const handleExportExcel = () => {
    let data = [];
    if (reportType === "detailed") {
      data = filteredEntries.map((e) => ({
        Date: e.dateId,
        "Team Member": e.userName,
        Project: e.projectName,
        Task: e.taskName,
        Description: e.note,
        Hours: e.hours,
        Amount: e.amount,
      }));
    } else if (reportType === "budgets") {
      data = projectBudgets.map((p) => ({
        "Project Name": p.name,
        "Billable Value": p.billableValue,
        "Logged Hrs": p.hours,
        "Budget Hrs": p.budgetLimit,
        Remaining: p.remaining,
        "Burn %": Math.round(p.burnPercentage) + "%",
      }));
    } else if (reportType === "capacity") {
      data = teamCapacity.map((c) => ({
        "Team Member": c.name,
        "Logged Hrs": c.hours,
        "Expected (40h)": 40,
        Utilization: Math.round(c.utilization) + "%",
      }));
    } else if (reportType === "uninvoiced") {
      data = uninvoicedProjects.map((p) => ({
        "Project Name": p.name,
        "Uninvoiced Hrs": p.hours,
        "Uninvoiced Value": p.amount,
      }));
    }

    if (data.length === 0) return;
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Report");
    XLSX.writeFile(wb, `VeloTime_${reportType}_report.xlsx`);
  };

  return (
    <div className="flex-1 flex flex-col bg-slate-50 dark:bg-zinc-950 overflow-hidden transition-colors h-full w-full">
      {/* Top Bar with Title and Back Button */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 p-4 border-b border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 shrink-0">
        <div className="flex items-center gap-3">
          {reportPhase !== "menu" && (
            <button
              onClick={handleBack}
              className="p-1.5 hover:bg-slate-100 dark:bg-zinc-800 text-slate-500 dark:text-slate-500 transition-colors cursor-pointer"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2.5"
                  d="M10 19l-7-7m0 0l7-7m-7 7h18"
                />
              </svg>
            </button>
          )}
          <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
            {reportPhase === "menu"
              ? "Reports"
              : reportType === "project-team"
                ? "Project & Team Summary"
                : reportType === "detailed"
                  ? "Detailed Log"
                  : reportType === "budgets"
                    ? "Project Budgets"
                    : reportType === "capacity"
                      ? "Team Capacity"
                      : "Uninvoiced Time"}
          </h1>
        </div>

        {/* Excel Export Button for Viewing phase */}
        {reportPhase === "viewing" && (
          <button
            onClick={handleExportExcel}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-3 py-1.5 text-xs transition-colors cursor-pointer flex items-center gap-1.5"
          >
            <svg
              className="w-3.5 h-3.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2.5"
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
              />
            </svg>
            Export Excel
          </button>
        )}
      </div>

      {/* Spreadsheet Content Area */}
      <div className="flex-1 overflow-auto bg-slate-50 dark:bg-zinc-950 relative w-full h-full custom-scrollbar">
        {reportPhase === "menu" && (
          <div className="p-6 md:p-10 max-w-6xl mx-auto w-full">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-6 tracking-tight">
              Prebuilt Reports
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[
                {
                  id: "detailed",
                  title: "Detailed Time Log",
                  desc: "A comprehensive, line-by-line spreadsheet of every time entry logged across all projects and team members. Includes notes and billable amounts.",
                  icon: "M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z",
                },
                {
                  id: "project-team",
                  title: "Project & Team Summary",
                  desc: "A hierarchical view of hours and billable amounts grouped by project, and further broken down by each employee.",
                  icon: "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z",
                },
                {
                  id: "budgets",
                  title: "Project Budgets",
                  desc: "Monitor project health by comparing logged hours against strict budget constraints. Instantly identify projects at risk of over-burning.",
                  icon: "M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
                },
                {
                  id: "capacity",
                  title: "Team Capacity",
                  desc: "Ensure your workforce is balanced. Track employee logged hours against a standard 40-hour work week to identify overutilized team members.",
                  icon: "M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z",
                },
                {
                  id: "uninvoiced",
                  title: "Uninvoiced Time",
                  desc: "Keep track of your financial ledger. View billable project totals that have not yet been marked as invoiced, with outstanding amounts clearly highlighted.",
                  icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4",
                },
              ].map((report) => (
                <div
                  key={report.id}
                  onClick={() => selectReport(report.id)}
                  className="bg-white dark:bg-zinc-900 border border-slate-300 dark:border-zinc-700 p-6 cursor-pointer hover:border-slate-900 hover: transition-all group flex gap-4"
                >
                  <div className="bg-primary-50 p-3 h-fit group-hover:bg-slate-800 group-hover:text-white transition-colors text-primary-600 ">
                    <svg
                      className="w-6 h-6"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d={report.icon}
                      />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-1 group-hover:text-primary-600 transition-colors">
                      {report.title}
                    </h3>
                    <p className="text-sm text-slate-500 dark:text-slate-500 leading-relaxed">
                      {report.desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {reportPhase === "configuring" && (
          <div className="flex justify-center items-start pt-12 p-6 h-full w-full">
            <div className="bg-white dark:bg-zinc-900 border border-slate-300 dark:border-zinc-700 max-w-xl w-full overflow-hidden">
              <div className="p-6 border-b border-slate-300 dark:border-zinc-700 ">
                <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 ">
                  Configure Report
                </h2>
                <p className="text-sm text-slate-500 dark:text-slate-500 mt-1">
                  Select filters to narrow down the data.
                </p>
              </div>
              <div className="p-6 space-y-5">
                <div>
                  <label className="text-xs font-bold text-slate-600 dark:text-slate-400 dark:text-slate-600 uppercase tracking-wider block mb-2">
                    Project
                  </label>
                  <select
                    value={selectedProject}
                    onChange={(e) => setSelectedProject(e.target.value)}
                    className="w-full text-sm font-semibold text-slate-900 dark:text-slate-100 bg-slate-50 dark:bg-zinc-950 border border-slate-300 dark:border-zinc-700 px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-slate-900 cursor-pointer"
                  >
                    <option value="all">All Projects</option>
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-600 dark:text-slate-400 dark:text-slate-600 uppercase tracking-wider block mb-2">
                    Team Member
                  </label>
                  <select
                    value={selectedUser}
                    onChange={(e) => setSelectedUser(e.target.value)}
                    className="w-full text-sm font-semibold text-slate-900 dark:text-slate-100 bg-slate-50 dark:bg-zinc-950 border border-slate-300 dark:border-zinc-700 px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-slate-900 cursor-pointer"
                  >
                    <option value="all">All Members</option>
                    {orgUsers.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.firstName} {u.lastName}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-600 dark:text-slate-400 dark:text-slate-600 uppercase tracking-wider block mb-2">
                    Date Range
                  </label>
                  <select
                    value={selectedPeriod}
                    onChange={(e) => setSelectedPeriod(e.target.value)}
                    className="w-full text-sm font-semibold text-slate-900 dark:text-slate-100 bg-slate-50 dark:bg-zinc-950 border border-slate-300 dark:border-zinc-700 px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-slate-900 cursor-pointer mb-3"
                  >
                    <option value="all">All Time</option>
                    <option value="week">This Week</option>
                    <option value="month">This Month</option>
                    <option value="lastMonth">Last Month</option>
                    <option value="custom">Custom Date Range...</option>
                  </select>

                  {selectedPeriod === "custom" && (
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-[10px] font-bold text-slate-500 dark:text-slate-500 block mb-1">
                          Start Date
                        </label>
                        <input
                          type="date"
                          value={customStartDate}
                          onChange={(e) => setCustomStartDate(e.target.value)}
                          className="w-full text-sm text-slate-900 dark:text-slate-100 bg-slate-50 dark:bg-zinc-950 border border-slate-300 dark:border-zinc-700 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-slate-900"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-slate-500 dark:text-slate-500 block mb-1">
                          End Date
                        </label>
                        <input
                          type="date"
                          value={customEndDate}
                          onChange={(e) => setCustomEndDate(e.target.value)}
                          className="w-full text-sm text-slate-900 dark:text-slate-100 bg-slate-50 dark:bg-zinc-950 border border-slate-300 dark:border-zinc-700 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-slate-900"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <div className="p-4 bg-slate-50 dark:bg-zinc-950 border-t border-slate-300 dark:border-zinc-700 flex justify-end">
                <button
                  onClick={runReport}
                  className="bg-slate-900 hover:bg-slate-900 text-white font-bold py-2 px-6 transition-colors cursor-pointer text-sm"
                >
                  Run Report
                </button>
              </div>
            </div>
          </div>
        )}

        {reportPhase === "viewing" && reportType === "detailed" && (
          <table className="w-full border-collapse min-w-max text-left bg-white dark:bg-zinc-900 ">
            <thead className="bg-slate-100 dark:bg-zinc-800 sticky top-0 z-50">
              <tr>
                <th
                  onClick={() => handleSort("dateId")}
                  className="sticky top-0 bg-slate-100 dark:bg-zinc-800 z-50 border-b border-r border-slate-300 dark:border-zinc-700 p-2 text-xs font-bold text-slate-600 dark:text-slate-400 dark:text-slate-600 w-32 cursor-pointer hover:bg-slate-200 transition-colors group select-none"
                >
                  Date <SortIcon columnKey="dateId" />
                </th>
                <th
                  onClick={() => handleSort("userName")}
                  className="sticky top-0 bg-slate-100 dark:bg-zinc-800 z-50 border-b border-r border-slate-300 dark:border-zinc-700 p-2 text-xs font-bold text-slate-600 dark:text-slate-400 dark:text-slate-600 w-48 cursor-pointer hover:bg-slate-200 transition-colors group select-none"
                >
                  Team Member <SortIcon columnKey="userName" />
                </th>
                <th
                  onClick={() => handleSort("projectName")}
                  className="sticky top-0 bg-slate-100 dark:bg-zinc-800 z-50 border-b border-r border-slate-300 dark:border-zinc-700 p-2 text-xs font-bold text-slate-600 dark:text-slate-400 dark:text-slate-600 w-64 cursor-pointer hover:bg-slate-200 transition-colors group select-none"
                >
                  Project / Task <SortIcon columnKey="projectName" />
                </th>
                <th
                  onClick={() => handleSort("note")}
                  className="sticky top-0 bg-slate-100 dark:bg-zinc-800 z-50 border-b border-r border-slate-300 dark:border-zinc-700 p-2 text-xs font-bold text-slate-600 dark:text-slate-400 dark:text-slate-600 min-w-[200px] cursor-pointer hover:bg-slate-200 transition-colors group select-none"
                >
                  Description <SortIcon columnKey="note" />
                </th>
                <th
                  onClick={() => handleSort("hours")}
                  className="sticky top-0 bg-slate-100 dark:bg-zinc-800 z-50 border-b border-r border-slate-300 dark:border-zinc-700 p-2 text-xs font-bold text-slate-600 dark:text-slate-400 dark:text-slate-600 w-24 text-right cursor-pointer hover:bg-slate-200 transition-colors group select-none"
                >
                  Hours <SortIcon columnKey="hours" />
                </th>
                <th
                  onClick={() => handleSort("amount")}
                  className="sticky top-0 bg-slate-100 dark:bg-zinc-800 z-50 border-b border-slate-300 dark:border-zinc-700 p-2 text-xs font-bold text-slate-600 dark:text-slate-400 dark:text-slate-600 w-32 text-right cursor-pointer hover:bg-slate-200 transition-colors group select-none"
                >
                  Amount <SortIcon columnKey="amount" />
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredEntries.map((e, idx) => (
                <tr
                  key={`detailed_${idx}`}
                  className="hover:bg-primary-50/50 group"
                >
                  <td className="border-b border-r border-slate-300 dark:border-zinc-700 p-2 text-sm text-slate-900 dark:text-slate-100 whitespace-nowrap">
                    {e.dateId}
                  </td>
                  <td className="border-b border-r border-slate-300 dark:border-zinc-700 p-2 text-sm text-slate-900 dark:text-slate-100 truncate">
                    {e.userName}
                  </td>
                  <td className="border-b border-r border-slate-300 dark:border-zinc-700 p-2 text-sm text-slate-900 dark:text-slate-100 truncate">
                    <span className="font-semibold">{e.projectName}</span>
                    <span className="text-slate-500 dark:text-slate-500 text-xs ml-2">
                      ({e.taskName})
                    </span>
                  </td>
                  <td
                    className="border-b border-r border-slate-300 dark:border-zinc-700 p-2 text-sm text-slate-600 dark:text-slate-400 dark:text-slate-600 truncate max-w-sm"
                    title={e.note}
                  >
                    {e.note}
                  </td>
                  <td className="border-b border-r border-slate-300 dark:border-zinc-700 p-2 text-sm text-slate-900 dark:text-slate-100 font-bold text-right">
                    {e.hours.toFixed(2)}
                  </td>
                  <td className="border-b border-slate-300 dark:border-zinc-700 p-2 text-sm text-emerald-700 font-bold text-right">
                    $
                    {e.amount.toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </td>
                </tr>
              ))}
              {filteredEntries.length === 0 && (
                <tr>
                  <td
                    colSpan={6}
                    className="border-b border-slate-300 dark:border-zinc-700 p-4 text-center text-sm text-slate-500 dark:text-slate-500 italic"
                  >
                    No time entries found.
                  </td>
                </tr>
              )}
            </tbody>
            <tfoot className="bg-slate-100 dark:bg-zinc-800 sticky bottom-0 z-40 shadow-[0_-1px_0_0_rgba(209,213,219,1)] ">
              <tr>
                <td
                  colSpan={4}
                  className="p-2 text-sm font-bold text-slate-900 dark:text-slate-100 text-right border-r border-slate-300 dark:border-zinc-700 "
                >
                  Totals:
                </td>
                <td className="p-2 text-sm font-bold text-slate-900 dark:text-slate-100 text-right border-r border-slate-300 dark:border-zinc-700 ">
                  {totals.hours.toFixed(2)}
                </td>
                <td className="p-2 text-sm font-bold text-emerald-700 text-right">
                  $
                  {totals.amount.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </td>
              </tr>
            </tfoot>
          </table>
        )}

        {reportPhase === "viewing" && reportType === "budgets" && (
          <table className="w-full border-collapse min-w-max text-left bg-white dark:bg-zinc-900 ">
            <thead className="bg-slate-100 dark:bg-zinc-800 sticky top-0 z-50">
              <tr>
                <th
                  onClick={() => handleSort("name")}
                  className="sticky top-0 bg-slate-100 dark:bg-zinc-800 z-50 border-b border-r border-slate-300 dark:border-zinc-700 p-2 text-xs font-bold text-slate-600 dark:text-slate-400 dark:text-slate-600 cursor-pointer hover:bg-slate-200 transition-colors group select-none"
                >
                  Project Name <SortIcon columnKey="name" />
                </th>
                <th
                  onClick={() => handleSort("billableValue")}
                  className="sticky top-0 bg-slate-100 dark:bg-zinc-800 z-50 border-b border-r border-slate-300 dark:border-zinc-700 p-2 text-xs font-bold text-slate-600 dark:text-slate-400 dark:text-slate-600 w-32 text-right cursor-pointer hover:bg-slate-200 transition-colors group select-none"
                >
                  Billable Value <SortIcon columnKey="billableValue" />
                </th>
                <th
                  onClick={() => handleSort("hours")}
                  className="sticky top-0 bg-slate-100 dark:bg-zinc-800 z-50 border-b border-r border-slate-300 dark:border-zinc-700 p-2 text-xs font-bold text-slate-600 dark:text-slate-400 dark:text-slate-600 w-32 text-right cursor-pointer hover:bg-slate-200 transition-colors group select-none"
                >
                  Logged Hrs <SortIcon columnKey="hours" />
                </th>
                <th
                  onClick={() => handleSort("budgetLimit")}
                  className="sticky top-0 bg-slate-100 dark:bg-zinc-800 z-50 border-b border-r border-slate-300 dark:border-zinc-700 p-2 text-xs font-bold text-slate-600 dark:text-slate-400 dark:text-slate-600 w-32 text-right cursor-pointer hover:bg-slate-200 transition-colors group select-none"
                >
                  Budget Hrs <SortIcon columnKey="budgetLimit" />
                </th>
                <th
                  onClick={() => handleSort("remaining")}
                  className="sticky top-0 bg-slate-100 dark:bg-zinc-800 z-50 border-b border-r border-slate-300 dark:border-zinc-700 p-2 text-xs font-bold text-slate-600 dark:text-slate-400 dark:text-slate-600 w-32 text-right cursor-pointer hover:bg-slate-200 transition-colors group select-none"
                >
                  Remaining <SortIcon columnKey="remaining" />
                </th>
                <th
                  onClick={() => handleSort("burnPercentage")}
                  className="sticky top-0 bg-slate-100 dark:bg-zinc-800 z-50 border-b border-r border-slate-300 dark:border-zinc-700 p-2 text-xs font-bold text-slate-600 dark:text-slate-400 dark:text-slate-600 w-48 cursor-pointer hover:bg-slate-200 transition-colors group select-none"
                >
                  Burn Status <SortIcon columnKey="burnPercentage" />
                </th>
                <th
                  onClick={() => handleSort("profitMargin")}
                  className="sticky top-0 bg-slate-100 dark:bg-zinc-800 z-50 border-b border-slate-300 dark:border-zinc-700 p-2 text-xs font-bold text-slate-600 dark:text-slate-400 dark:text-slate-600 w-32 text-right cursor-pointer hover:bg-slate-200 transition-colors group select-none"
                >
                  Margin <SortIcon columnKey="profitMargin" />
                </th>
              </tr>
            </thead>
            <tbody>
              {projectBudgets.map((p) => {
                const isOver = p.burnPercentage >= 100;
                const isWarning =
                  p.burnPercentage >= 80 && p.burnPercentage < 100;
                let progressColor = "bg-blue-500 ";
                if (isOver) progressColor = "bg-red-500 ";
                else if (isWarning) progressColor = "bg-yellow-500 ";

                return (
                  <tr key={p.id} className="hover:bg-primary-50/50 group">
                    <td className="border-b border-r border-slate-300 dark:border-zinc-700 p-2 text-sm text-slate-900 dark:text-slate-100 font-semibold truncate">
                      {p.name}
                    </td>
                    <td className="border-b border-r border-slate-300 dark:border-zinc-700 p-2 text-sm text-emerald-700 font-bold text-right">
                      $
                      {p.billableValue.toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </td>
                    <td className="border-b border-r border-slate-300 dark:border-zinc-700 p-2 text-sm text-slate-900 dark:text-slate-100 text-right">
                      {p.hours.toFixed(2)}
                    </td>
                    <td className="border-b border-r border-slate-300 dark:border-zinc-700 p-2 text-sm text-slate-500 dark:text-slate-500 text-right">
                      {p.budgetLimit.toFixed(2)}
                    </td>
                    <td
                      className={`border-b border-r border-slate-300 dark:border-zinc-700 p-2 text-sm font-bold text-right ${isOver ? "text-red-600 " : "text-slate-900 dark:text-slate-100 "}`}
                    >
                      {p.remaining.toFixed(2)}
                    </td>
                    <td className="border-b border-slate-300 dark:border-zinc-700 p-2 align-middle">
                      <div className="flex items-center gap-2 w-full">
                        <div className="flex-1 bg-gray-200 dark:bg-zinc-950 h-2 overflow-hidden">
                          <div
                            className={`h-full ${progressColor}`}
                            style={{
                              width: `${Math.min(100, p.burnPercentage)}%`,
                            }}
                          />
                        </div>
                        <span className="text-xs font-semibold text-slate-600 dark:text-slate-400 dark:text-slate-600 w-10 text-right">
                          {Math.round(p.burnPercentage)}%
                        </span>
                      </div>
                    </td>
                    <td className={`border-b border-slate-300 dark:border-zinc-700 p-2 text-sm font-black text-right ${p.profitMargin < 0 ? 'text-red-600' : p.profitMargin > 30 ? 'text-emerald-600' : 'text-yellow-600'}`}>
                      {p.profitMargin.toFixed(1)}%
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot className="bg-slate-100 dark:bg-zinc-800 sticky bottom-0 z-40 shadow-[0_-1px_0_0_rgba(209,213,219,1)] ">
              <tr>
                <td className="p-2 text-sm font-bold text-slate-900 dark:text-slate-100 text-right border-r border-slate-300 dark:border-zinc-700 ">
                  Totals:
                </td>
                <td className="p-2 text-sm font-bold text-emerald-700 text-right border-r border-slate-300 dark:border-zinc-700 ">
                  $
                  {projectBudgets
                    .reduce((s, p) => s + p.billableValue, 0)
                    .toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                </td>
                <td className="p-2 text-sm font-bold text-slate-900 dark:text-slate-100 text-right border-r border-slate-300 dark:border-zinc-700 ">
                  {projectBudgets.reduce((s, p) => s + p.hours, 0).toFixed(2)}
                </td>
                <td className="p-2 text-sm font-bold text-slate-900 dark:text-slate-100 text-right border-r border-slate-300 dark:border-zinc-700 ">
                  {projectBudgets
                    .reduce((s, p) => s + p.budgetLimit, 0)
                    .toFixed(2)}
                </td>
                <td className="p-2 text-sm font-bold text-slate-900 dark:text-slate-100 text-right border-r border-slate-300 dark:border-zinc-700 ">
                  {projectBudgets
                    .reduce((s, p) => s + p.remaining, 0)
                    .toFixed(2)}
                </td>
                <td className="p-2"></td>
              </tr>
            </tfoot>
          </table>
        )}

        {reportPhase === "viewing" && reportType === "capacity" && (
          <table className="w-full border-collapse min-w-max text-left bg-white dark:bg-zinc-900 ">
            <thead className="bg-slate-100 dark:bg-zinc-800 sticky top-0 z-50">
              <tr>
                <th
                  onClick={() => handleSort("name")}
                  className="sticky top-0 bg-slate-100 dark:bg-zinc-800 z-50 border-b border-r border-slate-300 dark:border-zinc-700 p-2 text-xs font-bold text-slate-600 dark:text-slate-400 dark:text-slate-600 w-64 cursor-pointer hover:bg-slate-200 transition-colors group select-none"
                >
                  Team Member <SortIcon columnKey="name" />
                </th>
                <th
                  onClick={() => handleSort("hours")}
                  className="sticky top-0 bg-slate-100 dark:bg-zinc-800 z-50 border-b border-r border-slate-300 dark:border-zinc-700 p-2 text-xs font-bold text-slate-600 dark:text-slate-400 dark:text-slate-600 w-32 text-right cursor-pointer hover:bg-slate-200 transition-colors group select-none"
                >
                  Logged Hrs <SortIcon columnKey="hours" />
                </th>
                <th
                  onClick={() => handleSort("capacity")}
                  className="sticky top-0 bg-slate-100 dark:bg-zinc-800 z-50 border-b border-r border-slate-300 dark:border-zinc-700 p-2 text-xs font-bold text-slate-600 dark:text-slate-400 dark:text-slate-600 w-32 text-right cursor-pointer hover:bg-slate-200 transition-colors group select-none"
                >
                  Capacity Hrs <SortIcon columnKey="capacity" />
                </th>
                <th
                  onClick={() => handleSort("utilization")}
                  className="sticky top-0 bg-slate-100 dark:bg-zinc-800 z-50 border-b border-r border-slate-300 dark:border-zinc-700 p-2 text-xs font-bold text-slate-600 dark:text-slate-400 dark:text-slate-600 min-w-[200px] cursor-pointer hover:bg-slate-200 transition-colors group select-none"
                >
                  Utilization <SortIcon columnKey="utilization" />
                </th>
                <th
                  onClick={() => handleSort("realization")}
                  className="sticky top-0 bg-slate-100 dark:bg-zinc-800 z-50 border-b border-r border-slate-300 dark:border-zinc-700 p-2 text-xs font-bold text-slate-600 dark:text-slate-400 dark:text-slate-600 w-32 text-right cursor-pointer hover:bg-slate-200 transition-colors group select-none"
                >
                  Realization <SortIcon columnKey="realization" />
                </th>
                <th className="sticky top-0 bg-slate-100 dark:bg-zinc-800 z-50 border-b border-slate-300 dark:border-zinc-700 p-2 text-xs font-bold text-slate-600 dark:text-slate-400 dark:text-slate-600 w-48 text-center">
                  Status
                </th>
              </tr>
            </thead>
            <tbody>
              {teamCapacity.map((u) => {
                const isOverUtilized = u.utilization > 100;
                const isIdeal = u.utilization >= 75 && u.utilization <= 100;
                let capacityColor = "bg-blue-500 ";
                let statusText = "Normal";
                let statusColor = "text-primary-700 bg-primary-100 ";
                if (isOverUtilized) {
                  capacityColor = "bg-red-500 ";
                  statusText = "Over Capacity";
                  statusColor = "text-red-700 bg-red-100 ";
                } else if (isIdeal) {
                  capacityColor = "bg-emerald-500 ";
                  statusText = "Target Achieved";
                  statusColor = "text-emerald-700 bg-emerald-100 ";
                }

                return (
                  <tr key={u.id} className="hover:bg-primary-50/50 group">
                    <td className="border-b border-r border-slate-300 dark:border-zinc-700 p-2 text-sm text-slate-900 dark:text-slate-100 font-semibold">
                      {u.name}
                    </td>
                    <td className="border-b border-r border-slate-300 dark:border-zinc-700 p-2 text-sm text-slate-900 dark:text-slate-100 font-bold text-right">
                      {u.hours.toFixed(2)}
                    </td>
                    <td className="border-b border-r border-slate-300 dark:border-zinc-700 p-2 text-sm text-slate-500 dark:text-slate-500 text-right">
                      {u.capacity.toFixed(2)}
                    </td>
                    <td className="border-b border-r border-slate-300 dark:border-zinc-700 p-2 align-middle">
                      <div className="flex items-center gap-2 w-full">
                        <div className="flex-1 bg-gray-200 dark:bg-zinc-950 h-2 overflow-hidden">
                          <div
                            className={`h-full ${capacityColor}`}
                            style={{
                              width: `${Math.min(100, u.utilization)}%`,
                            }}
                          />
                        </div>
                        <span className="text-xs font-semibold text-slate-600 dark:text-slate-400 dark:text-slate-600 w-10 text-right">
                          {Math.round(u.utilization)}%
                        </span>
                      </div>
                    </td>
                    <td className={`border-b border-r border-slate-300 dark:border-zinc-700 p-2 text-sm font-black text-right ${u.realization < 50 ? 'text-red-600' : u.realization > 75 ? 'text-emerald-600' : 'text-yellow-600'}`}>
                      {u.realization.toFixed(1)}%
                    </td>
                    <td className="border-b border-slate-300 dark:border-zinc-700 p-2 text-center align-middle">
                      <span
                        className={`inline-block text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 ${statusColor}`}
                      >
                        {statusText}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot className="bg-slate-100 dark:bg-zinc-800 sticky bottom-0 z-40 shadow-[0_-1px_0_0_rgba(209,213,219,1)] ">
              <tr>
                <td className="p-2 text-sm font-bold text-slate-900 dark:text-slate-100 text-right border-r border-slate-300 dark:border-zinc-700 ">
                  Totals:
                </td>
                <td className="p-2 text-sm font-bold text-slate-900 dark:text-slate-100 text-right border-r border-slate-300 dark:border-zinc-700 ">
                  {teamCapacity.reduce((s, u) => s + u.hours, 0).toFixed(2)}
                </td>
                <td className="p-2 text-sm font-bold text-slate-900 dark:text-slate-100 text-right border-r border-slate-300 dark:border-zinc-700 ">
                  {teamCapacity.reduce((s, u) => s + u.capacity, 0).toFixed(2)}
                </td>
                <td colSpan={2} className="p-2"></td>
              </tr>
            </tfoot>
          </table>
        )}

        {reportPhase === "viewing" && reportType === "uninvoiced" && (
          <table className="w-full border-collapse min-w-max text-left bg-white dark:bg-zinc-900 ">
            <thead className="bg-slate-100 dark:bg-zinc-800 sticky top-0 z-50">
              <tr>
                <th
                  onClick={() => handleSort("name")}
                  className="sticky top-0 bg-slate-100 dark:bg-zinc-800 z-50 border-b border-r border-slate-300 dark:border-zinc-700 p-2 text-xs font-bold text-slate-600 dark:text-slate-400 dark:text-slate-600 cursor-pointer hover:bg-slate-200 transition-colors group select-none"
                >
                  Project Name <SortIcon columnKey="name" />
                </th>
                <th
                  onClick={() => handleSort("hours")}
                  className="sticky top-0 bg-slate-100 dark:bg-zinc-800 z-50 border-b border-r border-slate-300 dark:border-zinc-700 p-2 text-xs font-bold text-slate-600 dark:text-slate-400 dark:text-slate-600 w-40 text-right cursor-pointer hover:bg-slate-200 transition-colors group select-none"
                >
                  Uninvoiced Hours <SortIcon columnKey="hours" />
                </th>
                <th
                  onClick={() => handleSort("billableValue")}
                  className="sticky top-0 bg-slate-100 dark:bg-zinc-800 z-50 border-b border-r border-slate-300 dark:border-zinc-700 p-2 text-xs font-bold text-slate-600 dark:text-slate-400 dark:text-slate-600 w-40 text-right cursor-pointer hover:bg-slate-200 transition-colors group select-none"
                >
                  Outstanding Amount <SortIcon columnKey="billableValue" />
                </th>
                <th className="sticky top-0 bg-slate-100 dark:bg-zinc-800 z-50 border-b border-slate-300 dark:border-zinc-700 p-2 text-xs font-bold text-slate-600 dark:text-slate-400 dark:text-slate-600 w-48 text-center">
                  Action
                </th>
              </tr>
            </thead>
            <tbody>
              {uninvoicedProjectData.map((p) => (
                <tr
                  key={`uninvoiced_${p.id}`}
                  className="hover:bg-primary-50/50 group"
                >
                  <td className="border-b border-r border-slate-300 dark:border-zinc-700 p-2 text-sm text-slate-900 dark:text-slate-100 font-semibold">
                    {p.name}
                  </td>
                  <td className="border-b border-r border-slate-300 dark:border-zinc-700 p-2 text-sm text-slate-900 dark:text-slate-100 text-right">
                    {p.hours.toFixed(2)}
                  </td>
                  <td className="border-b border-r border-slate-300 dark:border-zinc-700 p-2 text-sm font-bold text-emerald-700 text-right">
                    $
                    {p.billableValue.toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </td>
                  <td className="border-b border-slate-300 dark:border-zinc-700 p-2 text-center align-middle">
                    <span className="inline-block text-[10px] font-bold uppercase tracking-wider bg-orange-100 text-orange-700 border border-orange-200 px-3 py-1 ">
                      Uninvoiced
                    </span>
                  </td>
                </tr>
              ))}
              {uninvoicedProjectData.length === 0 && (
                <tr>
                  <td
                    colSpan="4"
                    className="border-b border-slate-300 dark:border-zinc-700 p-8 text-center text-sm text-slate-500 dark:text-slate-500 italic"
                  >
                    No uninvoiced hours found.
                  </td>
                </tr>
              )}
            </tbody>
            <tfoot className="bg-slate-100 dark:bg-zinc-800 sticky bottom-0 z-40 shadow-[0_-1px_0_0_rgba(209,213,219,1)] ">
              <tr>
                <td className="p-2 text-sm font-bold text-slate-900 dark:text-slate-100 text-right border-r border-slate-300 dark:border-zinc-700 ">
                  Totals:
                </td>
                <td className="p-2 text-sm font-bold text-slate-900 dark:text-slate-100 text-right border-r border-slate-300 dark:border-zinc-700 ">
                  {uninvoicedProjectData
                    .reduce((s, p) => s + p.hours, 0)
                    .toFixed(2)}
                </td>
                <td className="p-2 text-sm font-bold text-emerald-700 text-right border-r border-slate-300 dark:border-zinc-700 ">
                  $
                  {uninvoicedProjectData
                    .reduce((s, p) => s + p.billableValue, 0)
                    .toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                </td>
                <td className="p-2"></td>
              </tr>
            </tfoot>
          </table>
        )}

        {reportPhase === "viewing" && reportType === "project-team" && (
          <div className="flex flex-col gap-6 p-6 max-w-6xl mx-auto pb-16">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 ">
                Project & Team Summary
              </h2>
              <div className="text-sm font-semibold text-slate-500 dark:text-slate-500 ">
                {projectTeamData.length}{" "}
                {projectTeamData.length === 1 ? "Project" : "Projects"} Found
              </div>
            </div>

            {projectTeamData.map((proj, idx) => (
              <div
                key={idx}
                className="bg-white dark:bg-zinc-900 border border-slate-300 dark:border-zinc-700 overflow-hidden "
              >
                <div className="bg-slate-50 dark:bg-zinc-950 p-4 border-b border-slate-300 dark:border-zinc-700 flex justify-between items-center">
                  <h3 className="font-bold text-lg text-slate-900 dark:text-slate-100 ">
                    {proj.projectName}
                  </h3>
                  <div className="flex gap-4">
                    <span className="text-sm font-semibold text-slate-600 dark:text-slate-400 dark:text-slate-600 ">
                      Total Hours: {proj.hours.toFixed(2)}
                    </span>
                    <span className="text-sm font-bold text-emerald-700 ">
                      $
                      {proj.amount.toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </span>
                  </div>
                </div>
                <table className="w-full text-left border-collapse">
                  <thead className="bg-white dark:bg-zinc-900 ">
                    <tr>
                      <th className="p-3 text-xs font-bold text-slate-500 dark:text-slate-500 uppercase tracking-wider border-b border-slate-300 dark:border-zinc-700 ">
                        Team Member
                      </th>
                      <th className="p-3 text-xs font-bold text-slate-500 dark:text-slate-500 uppercase tracking-wider text-right border-b border-slate-300 dark:border-zinc-700 w-32">
                        Hours Logged
                      </th>
                      <th className="p-3 text-xs font-bold text-slate-500 dark:text-slate-500 uppercase tracking-wider text-right border-b border-slate-300 dark:border-zinc-700 w-40">
                        Amount Billable
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {proj.users.map((u, i) => (
                      <tr key={i} className="hover:bg-slate-50 dark:bg-zinc-950 group">
                        <td className="p-3 border-b border-slate-300 dark:border-zinc-700 text-sm font-semibold text-slate-700 dark:text-slate-300 ">
                          {u.userName}
                        </td>
                        <td className="p-3 border-b border-slate-300 dark:border-zinc-700 text-sm text-slate-900 dark:text-slate-100 font-bold text-right">
                          {u.hours.toFixed(2)}
                        </td>
                        <td className="p-3 border-b border-slate-300 dark:border-zinc-700 text-sm text-emerald-600 font-medium text-right">
                          $
                          {u.amount.toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
            {projectTeamData.length === 0 && (
              <div className="p-12 text-center border-2 border-dashed border-slate-300 dark:border-zinc-700 text-slate-500 dark:text-slate-500 bg-white dark:bg-zinc-900 ">
                No matching data found for the selected criteria.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
