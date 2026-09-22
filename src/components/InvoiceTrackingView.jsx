import React, { useState, useMemo, useEffect } from "react";
import {
  DollarSign,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Filter,
  Search,
  ArrowUpDown,
  Building2,
  FolderKanban,
  FileText,
  Mail,
  ExternalLink,
  ChevronRight,
  Plus
} from "lucide-react";
import { useToast } from "../contexts/ToastContext";
import PaymentReminderModal from "./PaymentReminderModal";

const formatMoney = (amount) => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount || 0);
};

const formatDate = (dateString) => {
  if (!dateString) return "N/A";
  const d = new Date(dateString);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

export default function InvoiceTrackingView({
  invoices = [],
  projects = [],
  clients = [],
  apiCall,
  onSelectInvoice,
  onUpdateInvoice,
  onCreateInvoice,
  onSwitchToEditor,
}) {
  const { addToast } = useToast();

  // Active view segment: 'invoices' | 'clients' | 'projects'
  const [activeSegment, setActiveSegment] = useState("invoices");

  // Filters state
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedProject, setSelectedProject] = useState("all");
  const [selectedClient, setSelectedClient] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("unpaid"); // default to unpaid
  const [selectedAmountFilter, setSelectedAmountFilter] = useState("all");
  const [sortBy, setSortBy] = useState("balance_desc"); // default largest balance open

  // Reminders state
  const [activeReminderInvoice, setActiveReminderInvoice] = useState(null);
  const [remindersHistory, setRemindersHistory] = useState({});
  const [updatingStatusId, setUpdatingStatusId] = useState(null);

  // Load reminders history from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem("velotime_invoice_reminders");
      if (stored) {
        setRemindersHistory(JSON.parse(stored));
      }
    } catch (e) {
      console.error("Failed to load reminders history", e);
    }
  }, []);

  const handleRecordReminder = (invoiceId, tone) => {
    try {
      const updated = {
        ...remindersHistory,
        [invoiceId]: {
          lastSentAt: new Date().toISOString(),
          count: (remindersHistory[invoiceId]?.count || 0) + 1,
          lastTone: tone,
        },
      };
      setRemindersHistory(updated);
      localStorage.setItem("velotime_invoice_reminders", JSON.stringify(updated));
    } catch (e) {
      console.error("Failed to save reminder", e);
    }
  };

  // Enrich invoices with totals, overdue calculation, client/project resolution
  const enrichedInvoices = useMemo(() => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    return invoices.map((inv) => {
      const subtotal = (inv.lineItems || []).reduce((sum, li) => sum + (li.amount || 0), 0);
      const tax = inv.taxRate ? (subtotal * inv.taxRate) / 100 : 0;
      const total = subtotal + tax;
      const isPaid = inv.status === "paid";
      const amountOutstanding = isPaid ? 0 : total;

      let dueDays = null;
      let isOverdue = false;
      let isDueSoon = false;

      if (inv.dueDate) {
        const due = new Date(inv.dueDate);
        due.setHours(0, 0, 0, 0);
        dueDays = Math.round((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        if (!isPaid && dueDays < 0) {
          isOverdue = true;
        } else if (!isPaid && dueDays >= 0 && dueDays <= 7) {
          isDueSoon = true;
        }
      }

      const proj = projects.find((p) => p.id === inv.projectId);
      const clientAssigned = proj?.client || (proj?.clientId ? clients.find((c) => c.id === proj.clientId) : null);
      const resolvedClientName = inv.clientName || clientAssigned?.name || proj?.clientName || "Unassigned Client";
      const resolvedProjectName = proj?.name || "No Project Linked";

      const reminderInfo = remindersHistory[inv.id] || null;

      return {
        ...inv,
        subtotal,
        tax,
        total,
        amountOutstanding,
        dueDays,
        isOverdue,
        isDueSoon,
        resolvedClientName,
        resolvedProjectName,
        reminderInfo,
      };
    });
  }, [invoices, projects, clients, remindersHistory]);

  // Executive KPI summary calculations
  const metrics = useMemo(() => {
    let totalOutstanding = 0;
    let overdueOutstanding = 0;
    let totalPaid = 0;
    let totalBilled = 0;
    let openCount = 0;
    let overdueCount = 0;
    let paidCount = 0;

    for (const inv of enrichedInvoices) {
      totalBilled += inv.total;
      if (inv.status === "paid") {
        totalPaid += inv.total;
        paidCount++;
      } else {
        totalOutstanding += inv.amountOutstanding;
        openCount++;
        if (inv.isOverdue) {
          overdueOutstanding += inv.amountOutstanding;
          overdueCount++;
        }
      }
    }

    return {
      totalOutstanding,
      overdueOutstanding,
      totalPaid,
      totalBilled,
      totalInvoices: enrichedInvoices.length,
      openCount,
      overdueCount,
      paidCount,
    };
  }, [enrichedInvoices]);

  // Client-level aggregation (sorted by greatest total outstanding balance)
  const clientAggregations = useMemo(() => {
    const map = {};
    for (const inv of enrichedInvoices) {
      const cName = inv.resolvedClientName;
      if (!map[cName]) {
        map[cName] = {
          clientName: cName,
          totalOutstanding: 0,
          totalPaid: 0,
          totalBilled: 0,
          invoiceCount: 0,
          openInvoiceCount: 0,
          overdueInvoiceCount: 0,
          maxDaysOverdue: 0,
          invoices: [],
        };
      }
      const c = map[cName];
      c.invoiceCount++;
      c.totalBilled += inv.total;
      c.invoices.push(inv);
      if (inv.status === "paid") {
        c.totalPaid += inv.total;
      } else {
        c.totalOutstanding += inv.amountOutstanding;
        c.openInvoiceCount++;
        if (inv.isOverdue) {
          c.overdueInvoiceCount++;
          const days = Math.abs(inv.dueDays || 0);
          if (days > c.maxDaysOverdue) c.maxDaysOverdue = days;
        }
      }
    }

    return Object.values(map).sort((a, b) => b.totalOutstanding - a.totalOutstanding);
  }, [enrichedInvoices]);

  // Project-level aggregation (sorted by greatest total outstanding balance)
  const projectAggregations = useMemo(() => {
    const map = {};
    for (const inv of enrichedInvoices) {
      const pKey = inv.projectId || "unlinked";
      const pName = inv.resolvedProjectName;
      if (!map[pKey]) {
        map[pKey] = {
          projectId: inv.projectId,
          projectName: pName,
          clientName: inv.resolvedClientName,
          totalOutstanding: 0,
          totalPaid: 0,
          totalBilled: 0,
          invoiceCount: 0,
          openInvoiceCount: 0,
          overdueInvoiceCount: 0,
          maxDaysOverdue: 0,
          invoices: [],
        };
      }
      const p = map[pKey];
      p.invoiceCount++;
      p.totalBilled += inv.total;
      p.invoices.push(inv);
      if (inv.status === "paid") {
        p.totalPaid += inv.total;
      } else {
        p.totalOutstanding += inv.amountOutstanding;
        p.openInvoiceCount++;
        if (inv.isOverdue) {
          p.overdueInvoiceCount++;
          const days = Math.abs(inv.dueDays || 0);
          if (days > p.maxDaysOverdue) p.maxDaysOverdue = days;
        }
      }
    }

    return Object.values(map).sort((a, b) => b.totalOutstanding - a.totalOutstanding);
  }, [enrichedInvoices]);

  // Filter and sort individual invoices
  const filteredInvoices = useMemo(() => {
    return enrichedInvoices
      .filter((inv) => {
        // Search query
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchNumber = inv.invoiceNumber?.toLowerCase().includes(q);
          const matchClient = inv.resolvedClientName?.toLowerCase().includes(q);
          const matchProj = inv.resolvedProjectName?.toLowerCase().includes(q);
          const matchNotes = inv.notes?.toLowerCase().includes(q);
          if (!matchNumber && !matchClient && !matchProj && !matchNotes) return false;
        }

        // Project filter
        if (selectedProject !== "all") {
          if (selectedProject === "none") {
            if (inv.projectId) return false;
          } else if (inv.projectId !== selectedProject) {
            return false;
          }
        }

        // Client filter
        if (selectedClient !== "all" && inv.resolvedClientName !== selectedClient) {
          return false;
        }

        // Status filter
        if (selectedStatus === "unpaid") {
          if (inv.status === "paid") return false;
        } else if (selectedStatus === "overdue") {
          if (!inv.isOverdue) return false;
        } else if (selectedStatus !== "all") {
          if (inv.status !== selectedStatus) return false;
        }

        // Amount filter
        if (selectedAmountFilter !== "all") {
          const minAmount = parseFloat(selectedAmountFilter);
          if (inv.total < minAmount) return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === "balance_desc") {
          if (a.status === "paid" && b.status !== "paid") return 1;
          if (a.status !== "paid" && b.status === "paid") return -1;
          return b.amountOutstanding - a.amountOutstanding;
        }
        if (sortBy === "overdue_desc") {
          const aDays = a.isOverdue ? Math.abs(a.dueDays || 0) : -9999;
          const bDays = b.isOverdue ? Math.abs(b.dueDays || 0) : -9999;
          return bDays - aDays;
        }
        if (sortBy === "due_asc") {
          if (!a.dueDate && !b.dueDate) return 0;
          if (!a.dueDate) return 1;
          if (!b.dueDate) return -1;
          return new Date(a.dueDate) - new Date(b.dueDate);
        }
        if (sortBy === "issued_desc") {
          return new Date(b.dateIssued || 0) - new Date(a.dateIssued || 0);
        }
        if (sortBy === "number") {
          return (b.invoiceNumber || "").localeCompare(a.invoiceNumber || "");
        }
        return 0;
      });
  }, [
    enrichedInvoices,
    searchQuery,
    selectedProject,
    selectedClient,
    selectedStatus,
    selectedAmountFilter,
    sortBy,
  ]);

  // Handle manual status update from table row
  const handleUpdateStatus = async (invoiceId, newStatus) => {
    setUpdatingStatusId(invoiceId);
    try {
      const updated = await apiCall(`/api/invoices/${invoiceId}`, "PUT", {
        status: newStatus,
      });
      if (onUpdateInvoice) {
        onUpdateInvoice(updated);
      }
      if (activeReminderInvoice && activeReminderInvoice.id === invoiceId) {
        setActiveReminderInvoice((prev) => (prev ? { ...prev, status: newStatus } : null));
      }
      addToast(`Status updated to ${newStatus === "draft" ? "NOT SENT" : newStatus.toUpperCase()}`, "success");
    } catch (err) {
      addToast("Failed to update status", "error");
    } finally {
      setUpdatingStatusId(null);
    }
  };

  // Quick filter shortcuts from client/project cards
  const filterByClient = (clientName) => {
    setSelectedClient(clientName);
    setActiveSegment("invoices");
  };

  const filterByProject = (projectId) => {
    setSelectedProject(projectId || "none");
    setActiveSegment("invoices");
  };

  const clearAllFilters = () => {
    setSearchQuery("");
    setSelectedProject("all");
    setSelectedClient("all");
    setSelectedStatus("all");
    setSelectedAmountFilter("all");
  };

  // Top 3 Client and Project Exposure widgets
  const topClients = clientAggregations.filter((c) => c.totalOutstanding > 0).slice(0, 3);
  const topProjects = projectAggregations.filter((p) => p.totalOutstanding > 0).slice(0, 3);

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-100 dark:bg-zinc-950 overflow-y-auto p-4 sm:p-8">
      <div className="max-w-7xl mx-auto w-full space-y-6">

        {/* Top Header & Overview */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-200 dark:border-zinc-800 pb-5">
          <div>
            <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight uppercase">
              Invoice Tracking & Receivables
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Monitor unpaid balances, track client and project exposure, and dispatch payment reminders.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => onSwitchToEditor && onSwitchToEditor()}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 hover:border-slate-400 text-slate-700 dark:text-slate-200 text-xs font-bold transition-all shadow-xs cursor-pointer"
            >
              <FileText className="w-4 h-4 text-slate-500" />
              <span>Go to Invoice Editor</span>
            </button>

            <button
              onClick={() => onCreateInvoice && onCreateInvoice()}
              className="inline-flex items-center gap-1.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-slate-800 px-4 py-2 text-xs font-bold transition-all shadow-sm cursor-pointer active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>New Invoice</span>
            </button>
          </div>
        </div>

        {/* KPI Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          
          {/* Card 1: Total Outstanding */}
          <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 p-5 shadow-xs">
            <div className="flex justify-between items-start mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Total Outstanding
              </span>
              <DollarSign className="w-4 h-4 text-slate-400" />
            </div>
            <div className="tabular-nums text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              {formatMoney(metrics.totalOutstanding)}
            </div>
            <div className="flex items-center gap-1.5 mt-2 text-xs text-slate-500">
              <span className="font-bold text-slate-700 dark:text-slate-300 tabular-nums">
                {metrics.openCount}
              </span>
              <span>unpaid of {metrics.totalInvoices} total invoices</span>
            </div>
          </div>

          {/* Card 2: Overdue Receivables */}
          <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 p-5 shadow-xs">
            <div className="flex justify-between items-start mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Overdue Receivables
              </span>
              <AlertTriangle className="w-4 h-4 text-slate-400" />
            </div>
            <div className="tabular-nums text-2xl font-bold tracking-tight text-red-600 dark:text-red-400">
              {formatMoney(metrics.overdueOutstanding)}
            </div>
            <div className="flex items-center gap-1.5 mt-2 text-xs text-slate-500">
              <span className="font-bold text-red-600 dark:text-red-400 tabular-nums">{metrics.overdueCount} invoices</span>
              <span>requiring immediate follow-up</span>
            </div>
          </div>

          {/* Card 3: Total Collected / Paid */}
          <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 p-5 shadow-xs">
            <div className="flex justify-between items-start mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Total Collected
              </span>
              <CheckCircle2 className="w-4 h-4 text-slate-400" />
            </div>
            <div className="tabular-nums text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              {formatMoney(metrics.totalPaid)}
            </div>
            <div className="flex items-center gap-1.5 mt-2 text-xs text-slate-500">
              <span className="font-bold text-slate-700 dark:text-slate-300 tabular-nums">
                {metrics.paidCount}
              </span>
              <span>settled invoices</span>
            </div>
          </div>

          {/* Card 4: Collection Rate */}
          <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 p-5 shadow-xs">
            <div className="flex justify-between items-start mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Collection Ratio
              </span>
              <Clock className="w-4 h-4 text-slate-400" />
            </div>
            <div className="tabular-nums text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              {metrics.totalBilled > 0
                ? `${Math.round((metrics.totalPaid / metrics.totalBilled) * 100)}%`
                : "100%"}
            </div>
            <div className="mt-2 text-xs text-slate-500 truncate">
              {formatMoney(metrics.totalBilled)} total billed all-time
            </div>
          </div>

        </div>

        {/* Top Exposure Analysis (Greatest Client & Project Balances) */}
        {(topClients.length > 0 || topProjects.length > 0) && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Top Clients Exposure */}
            <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 p-5">
              <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-slate-700 dark:text-slate-300" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                    Clients with Greatest Open Balances
                  </h3>
                </div>
                <button
                  onClick={() => setActiveSegment("clients")}
                  className="text-xs font-bold text-primary-600 dark:text-primary-400 hover:underline inline-flex items-center gap-1 cursor-pointer"
                >
                  <span>View All Clients</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="space-y-3">
                {topClients.map((c, idx) => {
                  const pct = metrics.totalOutstanding > 0
                    ? Math.round((c.totalOutstanding / metrics.totalOutstanding) * 100)
                    : 0;
                  return (
                    <div
                      key={c.clientName}
                      className="p-3 bg-slate-50 dark:bg-zinc-800/60 border border-slate-200 dark:border-zinc-700/60 flex items-center justify-between gap-3"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold tabular-nums text-slate-400">
                            #{idx + 1}
                          </span>
                          <span className="text-xs font-bold text-slate-900 dark:text-white truncate">
                            {c.clientName}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-1">
                          <span className="tabular-nums">{c.openInvoiceCount} open invoices</span>
                          {c.overdueInvoiceCount > 0 && (
                            <span className="text-slate-600 dark:text-slate-400 font-medium">
                              • <span className="text-red-600 dark:text-red-400 font-bold tabular-nums">{c.overdueInvoiceCount}</span> overdue (up to <span className="tabular-nums font-semibold">{c.maxDaysOverdue}d</span>)
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <div className="tabular-nums text-sm font-bold text-red-600 dark:text-red-400">
                          {formatMoney(c.totalOutstanding)}
                        </div>
                        <button
                          onClick={() => filterByClient(c.clientName)}
                          className="text-[10px] font-bold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:underline mt-0.5 inline-block cursor-pointer tabular-nums"
                        >
                          Filter Invoices ({pct}% of total)
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Top Projects Exposure */}
            <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 p-5">
              <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-2">
                  <FolderKanban className="w-4 h-4 text-slate-700 dark:text-slate-300" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                    Projects with Greatest Open Balances
                  </h3>
                </div>
                <button
                  onClick={() => setActiveSegment("projects")}
                  className="text-xs font-bold text-slate-700 dark:text-slate-300 hover:underline inline-flex items-center gap-1 cursor-pointer"
                >
                  <span>View All Projects</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="space-y-3">
                {topProjects.map((p, idx) => {
                  const pct = metrics.totalOutstanding > 0
                    ? Math.round((p.totalOutstanding / metrics.totalOutstanding) * 100)
                    : 0;
                  return (
                    <div
                      key={p.projectName + idx}
                      className="p-3 bg-slate-50 dark:bg-zinc-800/60 border border-slate-200 dark:border-zinc-700/60 flex items-center justify-between gap-3"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold tabular-nums text-slate-400">
                            #{idx + 1}
                          </span>
                          <span className="text-xs font-bold text-slate-900 dark:text-white truncate">
                            {p.projectName}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-1">
                          <span>{p.clientName}</span>
                          <span>• <span className="tabular-nums">{p.openInvoiceCount}</span> open</span>
                          {p.overdueInvoiceCount > 0 && (
                            <span className="text-slate-600 dark:text-slate-400 font-medium">
                              • <span className="text-red-600 dark:text-red-400 font-bold tabular-nums">{p.overdueInvoiceCount}</span> overdue
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <div className="tabular-nums text-sm font-bold text-red-600 dark:text-red-400">
                          {formatMoney(p.totalOutstanding)}
                        </div>
                        <button
                          onClick={() => filterByProject(p.projectId)}
                          className="text-[10px] font-bold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:underline mt-0.5 inline-block cursor-pointer tabular-nums"
                        >
                          Filter Invoices ({pct}% of total)
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

          </div>
        )}

        {/* View Segment Switcher */}
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-zinc-800 pb-2">
          <div className="inline-flex border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-0.5">
            <button
              onClick={() => setActiveSegment("invoices")}
              className={`px-4 py-1.5 text-xs font-bold transition-all cursor-pointer ${
                activeSegment === "invoices"
                  ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-xs"
                  : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              All Invoices ({filteredInvoices.length})
            </button>
            <button
              onClick={() => setActiveSegment("clients")}
              className={`px-4 py-1.5 text-xs font-bold transition-all cursor-pointer ${
                activeSegment === "clients"
                  ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-xs"
                  : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              By Clients ({clientAggregations.length})
            </button>
            <button
              onClick={() => setActiveSegment("projects")}
              className={`px-4 py-1.5 text-xs font-bold transition-all cursor-pointer ${
                activeSegment === "projects"
                  ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-xs"
                  : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              By Projects ({projectAggregations.length})
            </button>
          </div>

          {(selectedProject !== "all" ||
            selectedClient !== "all" ||
            selectedStatus !== "all" ||
            selectedAmountFilter !== "all" ||
            searchQuery) && (
            <button
              onClick={clearAllFilters}
              className="text-xs text-rose-600 dark:text-rose-400 hover:underline font-bold cursor-pointer"
            >
              Clear Active Filters
            </button>
          )}
        </div>

        {/* SEGMENT 1: INDIVIDUAL INVOICES TABLE & CONTROLS */}
        {activeSegment === "invoices" && (
          <div className="space-y-4">
            
            {/* Filter Bar */}
            <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              
              {/* Search */}
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search invoice #, client, project..."
                  className="w-full text-xs pl-9 pr-3 py-2 bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 outline-none text-slate-900 dark:text-white focus:border-slate-900 dark:focus:border-white transition-colors"
                />
              </div>

              {/* Status Filter */}
              <div>
                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className="w-full text-xs font-semibold px-3 py-2 bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 outline-none text-slate-900 dark:text-white cursor-pointer"
                >
                  <option value="unpaid">Status: All Unpaid (Sent / Not Sent / Overdue)</option>
                  <option value="all">Status: All Statuses</option>
                  <option value="sent">Status: Sent</option>
                  <option value="draft">Status: Not Sent (Draft)</option>
                  <option value="overdue">Status: Overdue Only</option>
                  <option value="pending">Status: Pending</option>
                  <option value="paid">Status: Paid (Settled)</option>
                </select>
              </div>

              {/* Project Filter */}
              <div>
                <select
                  value={selectedProject}
                  onChange={(e) => setSelectedProject(e.target.value)}
                  className="w-full text-xs font-semibold px-3 py-2 bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 outline-none text-slate-900 dark:text-white cursor-pointer"
                >
                  <option value="all">Project: All Projects</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                  <option value="none">-- No Project Linked --</option>
                </select>
              </div>

              {/* Client Filter */}
              <div>
                <select
                  value={selectedClient}
                  onChange={(e) => setSelectedClient(e.target.value)}
                  className="w-full text-xs font-semibold px-3 py-2 bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 outline-none text-slate-900 dark:text-white cursor-pointer"
                >
                  <option value="all">Client: All Clients</option>
                  {clientAggregations.map((c) => (
                    <option key={c.clientName} value={c.clientName}>
                      {c.clientName} ({formatMoney(c.totalOutstanding)} open)
                    </option>
                  ))}
                </select>
              </div>

              {/* Sort By */}
              <div>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="w-full text-xs font-semibold px-3 py-2 bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 outline-none text-slate-900 dark:text-white cursor-pointer font-medium"
                >
                  <option value="balance_desc">Sort: Largest Open Balance</option>
                  <option value="overdue_desc">Sort: Most Days Overdue</option>
                  <option value="due_asc">Sort: Oldest Due Date First</option>
                  <option value="issued_desc">Sort: Newest Issued Date</option>
                  <option value="number">Sort: Invoice Number</option>
                </select>
              </div>

            </div>

            {/* Invoices Table */}
            <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 shadow-xs overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-800/50 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    <th className="p-3.5">Invoice #</th>
                    <th className="p-3.5">Client</th>
                    <th className="p-3.5">Project</th>
                    <th className="p-3.5">Dates & Aging</th>
                    <th className="p-3.5 text-right">Balance Due</th>
                    <th className="p-3.5">Payment Status</th>
                    <th className="p-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-zinc-800">
                  {filteredInvoices.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-12 text-center text-slate-400 text-xs">
                        No invoices match the selected filters.
                      </td>
                    </tr>
                  ) : (
                    filteredInvoices.map((inv) => {
                      const isPaid = inv.status === "paid";
                      return (
                        <tr
                          key={inv.id}
                          className="hover:bg-slate-50/80 dark:hover:bg-zinc-800/40 transition-colors"
                        >
                          {/* Invoice # */}
                          <td className="p-3.5 font-bold tabular-nums text-slate-900 dark:text-white whitespace-nowrap">
                            <button
                              onClick={() => onSelectInvoice && onSelectInvoice(inv)}
                              className="text-slate-900 dark:text-white hover:text-primary-600 dark:hover:text-primary-400 underline font-bold cursor-pointer"
                            >
                              {inv.invoiceNumber}
                            </button>
                          </td>

                          {/* Client */}
                          <td className="p-3.5 font-semibold text-slate-800 dark:text-slate-200">
                            {inv.resolvedClientName}
                          </td>

                          {/* Project */}
                          <td className="p-3.5 text-slate-600 dark:text-slate-400">
                            {inv.resolvedProjectName}
                          </td>

                          {/* Dates & Aging */}
                          <td className="p-3.5 whitespace-nowrap">
                            <div className="space-y-0.5">
                              <div className="text-[11px] text-slate-400">
                                Issued {formatDate(inv.dateIssued)}
                              </div>
                              {isPaid ? (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-1.5 py-0.5">
                                  <CheckCircle2 className="w-3 h-3" />
                                  Settled
                                </span>
                              ) : inv.isOverdue ? (
                                <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 px-1.5 py-0.5">
                                  <AlertTriangle className="w-3 h-3 text-red-600 dark:text-red-400" />
                                  <span className="text-red-600 dark:text-red-400 font-bold tabular-nums">{Math.abs(inv.dueDays)}d</span> overdue
                                </span>
                              ) : inv.isDueSoon ? (
                                <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 px-1.5 py-0.5">
                                  <Clock className="w-3 h-3 text-slate-400" />
                                  Due in <span className="font-bold tabular-nums">{inv.dueDays}d</span>
                                </span>
                              ) : (
                                <span className="text-[11px] text-slate-600 dark:text-slate-400 font-medium">
                                  Due {formatDate(inv.dueDate)}
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Amount */}
                          <td className="p-3.5 text-right tabular-nums whitespace-nowrap">
                            <div
                              className={`text-sm font-bold ${
                                isPaid
                                  ? "text-slate-400 line-through"
                                  : inv.isOverdue
                                  ? "text-red-600 dark:text-red-400"
                                  : "text-slate-900 dark:text-white"
                              }`}
                            >
                              {formatMoney(inv.total)}
                            </div>
                            {isPaid && (
                              <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">
                                Paid in Full
                              </div>
                            )}
                          </td>

                          {/* Payment Status Dropdown (Manual Updater!) */}
                          <td className="p-3.5 whitespace-nowrap">
                            <div className="inline-flex items-center">
                              <select
                                value={inv.status}
                                disabled={updatingStatusId === inv.id}
                                onChange={(e) => handleUpdateStatus(inv.id, e.target.value)}
                                className={`text-[11px] font-bold uppercase px-2 py-1 outline-none border cursor-pointer transition-colors ${
                                  inv.status === "paid"
                                    ? "bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-400 dark:border-emerald-800"
                                    : inv.status === "sent"
                                    ? "bg-slate-900 text-white border-slate-900 dark:bg-white dark:text-slate-900 dark:border-white"
                                    : inv.status === "pending"
                                    ? "bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-950/60 dark:text-amber-400 dark:border-amber-800"
                                    : "bg-slate-100 text-slate-700 border-slate-300 dark:bg-zinc-800 dark:text-slate-300 dark:border-zinc-700"
                                }`}
                              >
                                <option value="draft">Not Sent (Draft)</option>
                                <option value="sent">Sent</option>
                                <option value="pending">Pending</option>
                                <option value="overdue">Overdue</option>
                                <option value="paid">Paid</option>
                              </select>
                            </div>
                          </td>

                          {/* Actions */}
                          <td className="p-3.5 text-right whitespace-nowrap">
                            <div className="inline-flex items-center gap-1.5">
                              {!isPaid && (
                                inv.status === "sent" ? (
                                  <button
                                    type="button"
                                    onClick={() => handleUpdateStatus(inv.id, "draft")}
                                    className="px-2 py-1 text-[11px] font-bold text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white border border-slate-200 dark:border-zinc-700 hover:border-slate-300 transition-colors cursor-pointer"
                                    title="Mark as Not Sent"
                                  >
                                    Mark Not Sent
                                  </button>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => handleUpdateStatus(inv.id, "sent")}
                                    className="px-2 py-1 text-[11px] font-bold bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:opacity-90 transition-opacity cursor-pointer"
                                    title="Mark as Sent"
                                  >
                                    Mark Sent
                                  </button>
                                )
                              )}

                              {!isPaid && (
                                <button
                                  type="button"
                                  onClick={() => setActiveReminderInvoice(inv)}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 hover:border-slate-400 text-slate-700 dark:text-slate-200 transition-colors cursor-pointer"
                                  title="Send Payment Reminder"
                                >
                                  <Mail className="w-3 h-3" />
                                  <span>Remind</span>
                                </button>
                              )}

                              {!isPaid && (
                                <button
                                  type="button"
                                  onClick={() => handleUpdateStatus(inv.id, "paid")}
                                  className="px-2 py-1 text-[11px] font-bold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 transition-colors cursor-pointer"
                                  title="Mark as Paid"
                                >
                                  Mark Paid
                                </button>
                              )}

                              <button
                                type="button"
                                onClick={() => onSelectInvoice && onSelectInvoice(inv)}
                                className="px-2 py-1 text-[11px] font-bold text-slate-500 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-zinc-700 hover:border-slate-300 transition-colors cursor-pointer"
                                title="Open in Invoice Editor"
                              >
                                Edit
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

          </div>
        )}

        {/* SEGMENT 2: BY CLIENTS BREAKDOWN */}
        {activeSegment === "clients" && (
          <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 shadow-xs overflow-x-auto">
            <div className="p-4 border-b border-slate-200 dark:border-zinc-800 flex justify-between items-center">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                  Receivables Ranked by Client (Largest Exposure First)
                </h3>
                <span className="text-xs text-slate-500">
                  {clientAggregations.length} total client accounts
                </span>
              </div>
            </div>

            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-800/50 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  <th className="p-3.5">Client Name</th>
                  <th className="p-3.5 text-right">Total Outstanding</th>
                  <th className="p-3.5 text-right">% of Receivables</th>
                  <th className="p-3.5">Open Invoices</th>
                  <th className="p-3.5">Overdue Status</th>
                  <th className="p-3.5 text-right">Total Settled</th>
                  <th className="p-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-zinc-800">
                {clientAggregations.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-12 text-center text-slate-400 text-xs">
                      No client accounts found.
                    </td>
                  </tr>
                ) : (
                  clientAggregations.map((c) => {
                    const pct = metrics.totalOutstanding > 0
                      ? Math.round((c.totalOutstanding / metrics.totalOutstanding) * 100)
                      : 0;
                    return (
                      <tr
                        key={c.clientName}
                        className="hover:bg-slate-50/80 dark:hover:bg-zinc-800/40 transition-colors"
                      >
                        <td className="p-3.5 font-bold text-slate-900 dark:text-white">
                          <div className="flex items-center gap-2">
                            <Building2 className="w-4 h-4 text-slate-400" />
                            <span>{c.clientName}</span>
                          </div>
                        </td>

                        <td className="p-3.5 text-right tabular-nums font-bold text-sm text-red-600 dark:text-red-400">
                          {formatMoney(c.totalOutstanding)}
                        </td>

                        <td className="p-3.5 text-right tabular-nums font-semibold text-slate-600 dark:text-slate-400">
                          {pct}%
                        </td>

                        <td className="p-3.5 font-medium text-slate-700 dark:text-slate-300">
                          <span className="tabular-nums">{c.openInvoiceCount}</span> open (<span className="tabular-nums">{c.invoiceCount}</span> total)
                        </td>

                        <td className="p-3.5">
                          {c.overdueInvoiceCount > 0 ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-zinc-800 px-2 py-0.5">
                              <AlertTriangle className="w-3 h-3 text-red-600 dark:text-red-400" />
                              <span className="text-red-600 dark:text-red-400 font-bold tabular-nums">{c.overdueInvoiceCount}</span> overdue (up to <span className="tabular-nums font-semibold">{c.maxDaysOverdue}d</span>)
                            </span>
                          ) : (
                            <span className="text-[11px] text-slate-400">None overdue</span>
                          )}
                        </td>

                        <td className="p-3.5 text-right tabular-nums font-semibold text-slate-700 dark:text-slate-300">
                          {formatMoney(c.totalPaid)}
                        </td>

                        <td className="p-3.5 text-right">
                          <button
                            onClick={() => filterByClient(c.clientName)}
                            className="inline-flex items-center gap-1 px-3 py-1 bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-900 dark:text-white text-xs font-bold transition-colors cursor-pointer"
                          >
                            <span>Filter Invoices</span>
                            <ChevronRight className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* SEGMENT 3: BY PROJECTS BREAKDOWN */}
        {activeSegment === "projects" && (
          <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 shadow-xs overflow-x-auto">
            <div className="p-4 border-b border-slate-200 dark:border-zinc-800 flex justify-between items-center">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                  Receivables Ranked by Project (Largest Exposure First)
                </h3>
                <span className="text-xs text-slate-500">
                  {projectAggregations.length} total projects
                </span>
              </div>
            </div>

            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-800/50 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  <th className="p-3.5">Project Name</th>
                  <th className="p-3.5">Client</th>
                  <th className="p-3.5 text-right">Total Outstanding</th>
                  <th className="p-3.5 text-right">% of Receivables</th>
                  <th className="p-3.5">Open Invoices</th>
                  <th className="p-3.5">Overdue Status</th>
                  <th className="p-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-zinc-800">
                {projectAggregations.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-12 text-center text-slate-400 text-xs">
                      No projects found.
                    </td>
                  </tr>
                ) : (
                  projectAggregations.map((p) => {
                    const pct = metrics.totalOutstanding > 0
                      ? Math.round((p.totalOutstanding / metrics.totalOutstanding) * 100)
                      : 0;
                    return (
                      <tr
                        key={p.projectName + p.projectId}
                        className="hover:bg-slate-50/80 dark:hover:bg-zinc-800/40 transition-colors"
                      >
                        <td className="p-3.5 font-bold text-slate-900 dark:text-white">
                          <div className="flex items-center gap-2">
                            <FolderKanban className="w-4 h-4 text-slate-400" />
                            <span>{p.projectName}</span>
                          </div>
                        </td>

                        <td className="p-3.5 font-semibold text-slate-700 dark:text-slate-300">
                          {p.clientName}
                        </td>

                        <td className="p-3.5 text-right tabular-nums font-bold text-sm text-red-600 dark:text-red-400">
                          {formatMoney(p.totalOutstanding)}
                        </td>

                        <td className="p-3.5 text-right tabular-nums font-semibold text-slate-600 dark:text-slate-400">
                          {pct}%
                        </td>

                        <td className="p-3.5 font-medium text-slate-700 dark:text-slate-300">
                          <span className="tabular-nums">{p.openInvoiceCount}</span> open (<span className="tabular-nums">{p.invoiceCount}</span> total)
                        </td>

                        <td className="p-3.5">
                          {p.overdueInvoiceCount > 0 ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-zinc-800 px-2 py-0.5">
                              <AlertTriangle className="w-3 h-3 text-red-600 dark:text-red-400" />
                              <span className="text-red-600 dark:text-red-400 font-bold tabular-nums">{p.overdueInvoiceCount}</span> overdue (up to <span className="tabular-nums font-semibold">{p.maxDaysOverdue}d</span>)
                            </span>
                          ) : (
                            <span className="text-[11px] text-slate-400">None overdue</span>
                          )}
                        </td>

                        <td className="p-3.5 text-right">
                          <button
                            onClick={() => filterByProject(p.projectId)}
                            className="inline-flex items-center gap-1 px-3 py-1 bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-900 dark:text-white text-xs font-bold transition-colors cursor-pointer"
                          >
                            <span>Filter Invoices</span>
                            <ChevronRight className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}

      </div>

      {/* Payment Reminder Modal */}
      {activeReminderInvoice && (
        <PaymentReminderModal
          invoice={activeReminderInvoice}
          clientEmail={
            clients.find((c) => c.name === activeReminderInvoice.resolvedClientName)?.email || ""
          }
          onClose={() => setActiveReminderInvoice(null)}
          onRecordReminder={handleRecordReminder}
          onUpdateStatus={handleUpdateStatus}
        />
      )}
    </div>
  );
}
