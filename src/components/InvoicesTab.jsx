'use client';
import React, { useState, useEffect, useMemo } from "react";
import { useToast } from "../contexts/ToastContext";

export default function InvoicesTab({
  dbUser,
  projects = [],
  rawEntries = [],
  orgUsers = [],
  apiCall,
  taskRates = [],
  forceSync,
  expenses = [],
  clients = [],
  activeInvoiceId = null,
  setActiveInvoiceId = null,
}) {
  const { addToast } = useToast();
  const [invoices, setInvoices] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeInvoice, setActiveInvoice] = useState(null);

  // Editor state
  const [isEditingHeader, setIsEditingHeader] = useState(false);
  const [headerForm, setHeaderForm] = useState({});
  const [isAddingLineItem, setIsAddingLineItem] = useState(false);

  // Terms State: 'net' or 'pay_when_paid'
  const [termsType, setTermsType] = useState("net");
  const [netDays, setNetDays] = useState(30);

  // Add Line Item state
  // Modes: 'progress', 'hourly', 'expense', 'flat'
  const [liMode, setLiMode] = useState("progress");
  const [liDescription, setLiDescription] = useState("");
  const [liAmount, setLiAmount] = useState("");

  // Hourly line item state
  const [liProjectId, setLiProjectId] = useState("");
  const [liTaskId, setLiTaskId] = useState("");
  const [liUserId, setLiUserId] = useState("");

  // Expense line item state
  const [liExpenseId, setLiExpenseId] = useState("");

  // Progress Billing (Percentage-Based Completion) State
  const [pbPhaseName, setPbPhaseName] = useState("");
  const [pbContractValue, setPbContractValue] = useState("");
  const [pbCurrentPercent, setPbCurrentPercent] = useState("");
  const [pbPreviousPercent, setPbPreviousPercent] = useState("0");

  const fetchInvoices = async () => {
    try {
      const data = await apiCall("/api/invoices", "GET");
      setInvoices(data);
      if (activeInvoiceId) {
        const matched = data.find((i) => i.id === activeInvoiceId);
        if (matched) setActiveInvoice(matched);
      } else if (data.length > 0 && !activeInvoice) {
        setActiveInvoice(data[0]);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoices();
  }, [activeInvoiceId]);

  // Helper to find client from project
  const getClientForProject = (projectId) => {
    if (!projectId) return null;
    const proj = projects.find((p) => p.id === projectId);
    if (!proj) return null;
    if (proj.client) return proj.client;
    if (proj.clientId) {
      const c = clients.find((cl) => cl.id === proj.clientId);
      if (c) return c;
    }
    return null;
  };

  // Helper to get saved project template
  const getProjectTemplate = (projectId) => {
    if (!projectId) return null;
    try {
      const raw = localStorage.getItem(`velotime_project_template_${projectId}`);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  };

  const handleSaveProjectTemplate = () => {
    if (!headerForm.projectId) {
      addToast("Please select a project before saving template", "error");
      return;
    }
    const template = {
      projectId: headerForm.projectId,
      clientName: headerForm.clientName || "",
      clientAddress: headerForm.clientAddress || "",
      taxName: headerForm.taxName || "",
      taxRate: headerForm.taxRate || 0,
      notes: headerForm.notes || "",
      termsType: termsType,
      netDays: netDays,
    };
    try {
      localStorage.setItem(`velotime_project_template_${headerForm.projectId}`, JSON.stringify(template));
      addToast("Saved default invoice template for this project!", "success");
    } catch (e) {
      addToast("Failed to save project template", "error");
    }
  };

  // Calculate Due Date based on dateIssued and netDays
  const calculateDueDate = (issuedDateStr, days) => {
    if (!issuedDateStr) return "";
    const date = new Date(issuedDateStr);
    if (isNaN(date.getTime())) return "";
    date.setDate(date.getDate() + parseInt(days || 0, 10));
    return date.toISOString().split("T")[0];
  };

  // Handle Project Selection in Header Editor
  const handleSelectProject = (projectId) => {
    const proj = projects.find((p) => p.id === projectId);
    const assignedClient = getClientForProject(projectId);
    const template = getProjectTemplate(projectId);

    const clientName = assignedClient?.name || template?.clientName || proj?.clientName || proj?.name?.split(" - ")[0] || "";
    const clientAddress = assignedClient?.address || template?.clientAddress || "";
    const taxName = template?.taxName !== undefined ? template.taxName : headerForm.taxName || "";
    const taxRate = template?.taxRate !== undefined ? template.taxRate : headerForm.taxRate || 0;
    const notes = template?.notes !== undefined ? template.notes : headerForm.notes || "";

    const tType = template?.termsType || termsType;
    const nDays = template?.netDays || netDays;
    setTermsType(tType);
    setNetDays(nDays);

    const issueDate = headerForm.dateIssued ? new Date(headerForm.dateIssued).toISOString().split("T")[0] : new Date().toISOString().split("T")[0];
    const computedDueDate = tType === "net" ? calculateDueDate(issueDate, nDays) : null;

    setHeaderForm((prev) => ({
      ...prev,
      projectId: projectId || null,
      clientName,
      clientAddress,
      taxName,
      taxRate,
      notes,
      dueDate: computedDueDate,
    }));
  };

  // Handle Terms Mode Switch
  const handleTermsChange = (mode, customDays = netDays) => {
    setTermsType(mode);
    const issueDate = headerForm.dateIssued ? new Date(headerForm.dateIssued).toISOString().split("T")[0] : new Date().toISOString().split("T")[0];

    if (mode === "pay_when_paid") {
      setHeaderForm((prev) => ({
        ...prev,
        dueDate: null,
        notes: prev.notes && !prev.notes.includes("Pay When Paid") ? prev.notes : "Payment terms: Pay When Paid.",
      }));
    } else {
      const days = parseInt(customDays || 30, 10);
      setNetDays(days);
      const newDue = calculateDueDate(issueDate, days);
      setHeaderForm((prev) => ({
        ...prev,
        dueDate: newDue,
        notes: prev.notes && prev.notes.startsWith("Payment terms: Pay When Paid") ? `Payment is due within ${days} days of invoice date.` : prev.notes,
      }));
    }
  };

  const handleCreateInvoice = async (targetProjectId = null) => {
    try {
      let initialPayload = {};
      if (targetProjectId) {
        const p = projects.find((proj) => proj.id === targetProjectId);
        const assignedClient = getClientForProject(targetProjectId);
        const template = getProjectTemplate(targetProjectId);

        const issueDate = new Date().toISOString().split("T")[0];
        const tType = template?.termsType || "net";
        const nDays = template?.netDays || 30;
        const computedDueDate = tType === "net" ? calculateDueDate(issueDate, nDays) : null;

        initialPayload = {
          projectId: targetProjectId,
          clientName: assignedClient?.name || template?.clientName || p?.clientName || p?.name?.split(" - ")[0] || "",
          clientAddress: assignedClient?.address || template?.clientAddress || "",
          taxName: template?.taxName || "",
          taxRate: template?.taxRate || 0,
          notes: template?.notes || (tType === "pay_when_paid" ? "Payment terms: Pay When Paid." : `Payment is due within ${nDays} days.`),
          dueDate: computedDueDate,
        };
      }

      const inv = await apiCall("/api/invoices", "POST", initialPayload);
      setInvoices([inv, ...invoices]);
      setActiveInvoice(inv);
      setHeaderForm(inv);
      setIsEditingHeader(true);
      forceSync();
      addToast("Invoice created successfully", "success");
    } catch (e) {
      addToast("Failed to create invoice", "error");
    }
  };

  const handleSaveHeader = async (e) => {
    e.preventDefault();
    try {
      const updated = await apiCall(
        `/api/invoices/${activeInvoice.id}`,
        "PUT",
        headerForm,
      );
      setActiveInvoice(updated);
      setIsEditingHeader(false);
      setInvoices(invoices.map((i) => (i.id === updated.id ? updated : i)));
      addToast("Invoice details updated successfully", "success");
    } catch (e) {
      addToast("Failed to save invoice details", "error");
    }
  };

  const calculateHourlyData = () => {
    if (!liTaskId || !liUserId) return { hours: 0, rate: 0, amount: 0 };
    const unbilled =
      rawEntries?.filter(
        (e) => e.taskId === liTaskId && e.userId === liUserId && !e.invoiceId,
      ) || [];
    const totalHours = unbilled.reduce((sum, e) => sum + e.hours, 0);

    let rate = 0;
    const tRate = taskRates.find(
      (tr) => tr.taskId === liTaskId && tr.userId === liUserId,
    );
    if (tRate && tRate.billingRate) {
      rate = tRate.billingRate;
    } else {
      const user = orgUsers.find((u) => u.id === liUserId);
      rate = user?.defaultBillingRate || 0;
    }
    return { hours: totalHours, rate, amount: totalHours * rate };
  };

  // Auto-detect previous billed percentage for progress billing
  const detectPreviousBilledPercent = (phase) => {
    if (!phase || !activeInvoice?.projectId) return 0;
    const projInvoices = invoices.filter(
      (i) => i.projectId === activeInvoice.projectId && i.id !== activeInvoice.id,
    );

    let highestBilled = 0;
    const cleanPhase = phase.trim().toLowerCase();

    projInvoices.forEach((inv) => {
      inv.lineItems?.forEach((item) => {
        const desc = item.description || "";
        const regexWithLast = new RegExp(`(\\d+(?:\\.\\d+)?)%\\s+${cleanPhase}\\s*\\|\\s*Last Billed:\\s*(\\d+(?:\\.\\d+)?)%`, "i");
        const regexSimple = new RegExp(`(\\d+(?:\\.\\d+)?)%\\s+${cleanPhase}`, "i");

        const matchLast = desc.match(regexWithLast);
        if (matchLast) {
          const billed = parseFloat(matchLast[1]);
          if (!isNaN(billed) && billed > highestBilled) highestBilled = billed;
        } else {
          const matchSimple = desc.match(regexSimple);
          if (matchSimple) {
            const billed = parseFloat(matchSimple[1]);
            if (!isNaN(billed) && billed > highestBilled) highestBilled = billed;
          }
        }
      });
    });

    return highestBilled;
  };

  const handlePhaseChange = (phase) => {
    setPbPhaseName(phase);
    const lastBilled = detectPreviousBilledPercent(phase);
    setPbPreviousPercent(lastBilled > 0 ? String(lastBilled) : "0");
  };

  const calculatedProgressAmount = useMemo(() => {
    const val = parseFloat(pbContractValue) || 0;
    const curr = parseFloat(pbCurrentPercent) || 0;
    const prev = parseFloat(pbPreviousPercent) || 0;
    const delta = Math.max(0, curr - prev);
    return (delta / 100) * val;
  }, [pbContractValue, pbCurrentPercent, pbPreviousPercent]);

  const handleAddLineItem = async (e) => {
    e.preventDefault();
    try {
      let payload = {};

      if (liMode === "hourly") {
        const { hours, rate, amount } = calculateHourlyData();
        if (hours === 0) {
          addToast("No unbilled hours found for this user and task.", "error");
          return;
        }
        payload = {
          description: liDescription || "Hourly Services",
          amount,
          isHourly: true,
          hours,
          rate,
          taskId: liTaskId,
          userId: liUserId,
        };
      } else if (liMode === "expense") {
        const expense = expenses.find((e) => e.id === liExpenseId);
        if (!expense) {
          addToast("Please select an expense", "error");
          return;
        }
        payload = {
          description: liDescription || expense.description,
          amount: expense.amount,
          isHourly: false,
          expenseId: expense.id,
        };
        await apiCall(`/api/expenses/${expense.id}`, "PUT", { invoiceId: activeInvoice.id });
      } else if (liMode === "progress") {
        if (!pbPhaseName || !pbContractValue || !pbCurrentPercent) {
          addToast("Please provide Phase Name, Contract Value, and Current % Complete", "error");
          return;
        }
        const curr = parseFloat(pbCurrentPercent) || 0;
        const prev = parseFloat(pbPreviousPercent) || 0;
        if (curr < prev) {
          addToast("Current % Complete cannot be less than Last Billed %", "error");
          return;
        }
        const desc = `${curr}% ${pbPhaseName} | Last Billed: ${prev}%`;
        payload = {
          description: desc,
          amount: calculatedProgressAmount,
          isHourly: false,
        };
      } else {
        if (!liDescription || !liAmount) {
          addToast("Please provide description and amount", "error");
          return;
        }
        payload = {
          description: liDescription,
          amount: parseFloat(liAmount) || 0,
          isHourly: false,
        };
      }

      const updated = await apiCall(
        `/api/invoices/${activeInvoice.id}/line-items`,
        "POST",
        payload,
      );
      setActiveInvoice(updated);
      setInvoices(invoices.map((i) => (i.id === updated.id ? updated : i)));
      setIsAddingLineItem(false);

      // Reset form
      setLiDescription("");
      setLiAmount("");
      setLiMode("progress");
      setLiExpenseId("");
      setLiProjectId("");
      setLiTaskId("");
      setLiUserId("");
      setPbPhaseName("");
      setPbContractValue("");
      setPbCurrentPercent("");
      setPbPreviousPercent("0");

      if (liMode === "hourly" || liMode === "expense") forceSync();
      addToast("Line item added successfully", "success");
    } catch (e) {
      addToast("Failed to add line item", "error");
    }
  };

  const handleDeleteLineItem = async (itemId) => {
    if (!window.confirm("Are you sure you want to delete this line item?")) return;
    try {
      const updated = await apiCall(
        `/api/invoices/${activeInvoice.id}/line-items/${itemId}`,
        "DELETE",
      );
      setActiveInvoice(updated);
      setInvoices(invoices.map((i) => (i.id === updated.id ? updated : i)));
      forceSync();
      addToast("Line item deleted", "success");
    } catch (e) {
      addToast("Failed to delete line item", "error");
    }
  };

  const handleDeleteInvoice = async () => {
    if (!window.confirm("Are you sure you want to delete this entire invoice?")) return;
    try {
      await apiCall(`/api/invoices/${activeInvoice.id}`, "DELETE");
      const remaining = invoices.filter((i) => i.id !== activeInvoice.id);
      setInvoices(remaining);
      setActiveInvoice(remaining[0] || null);
      forceSync();
      addToast("Invoice deleted", "success");
    } catch (e) {
      addToast("Failed to delete invoice", "error");
    }
  };

  // Instant Native Print-to-PDF (Zero-freeze, 100% reliable)
  const handleDownloadPDF = () => {
    addToast("Opening print / Save as PDF dialog...", "info");
    setTimeout(() => {
      window.print();
    }, 150);
  };

  const formatMoney = (amount) => {
    return "$" + (parseFloat(amount) || 0).toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const subtotal = useMemo(() => {
    if (!activeInvoice?.lineItems) return 0;
    return activeInvoice.lineItems.reduce((acc, item) => acc + (item.amount || 0), 0);
  }, [activeInvoice]);

  const taxAmount = useMemo(() => {
    if (!activeInvoice?.taxRate) return 0;
    return (subtotal * activeInvoice.taxRate) / 100;
  }, [subtotal, activeInvoice]);

  const totalAmount = subtotal + taxAmount;

  return (
    <div className="flex-1 flex flex-col md:flex-row h-full bg-slate-50 dark:bg-zinc-950 overflow-hidden">
      
      {/* SIDEBAR: INVOICES LIST */}
      <div className="w-full md:w-80 border-r border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex flex-col shrink-0">
        <div className="p-4 border-b border-slate-200 dark:border-zinc-800 flex justify-between items-center">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">Invoices</h2>
            <span className="text-xs text-slate-500">{invoices.length} invoices generated</span>
          </div>
          <button
            onClick={() => handleCreateInvoice()}
            className="bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-bold px-3 py-1.5 rounded-lg hover:bg-slate-800 transition-colors shadow-sm cursor-pointer"
          >
            + New Invoice
          </button>
        </div>

        <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-zinc-800">
          {isLoading ? (
            <div className="p-8 text-center text-slate-400 text-xs">Loading invoices...</div>
          ) : invoices.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-xs">
              No invoices created yet. Click "+ New Invoice" to get started.
            </div>
          ) : (
            invoices.map((inv) => {
              const isActive = activeInvoice?.id === inv.id;
              const invTotal = (inv.lineItems || []).reduce((sum, li) => sum + (li.amount || 0), 0);
              const invTax = inv.taxRate ? (invTotal * inv.taxRate) / 100 : 0;
              return (
                <div
                  key={inv.id}
                  onClick={() => {
                    setActiveInvoice(inv);
                    setIsEditingHeader(false);
                    setIsAddingLineItem(false);
                  }}
                  className={`p-4 cursor-pointer transition-colors ${
                    isActive
                      ? "bg-primary-50/70 dark:bg-primary-950/40 border-l-4 border-primary-600"
                      : "hover:bg-slate-50 dark:hover:bg-zinc-800/50"
                  }`}
                >
                  <div className="flex justify-between items-start mb-1">
                    <span className="font-mono font-bold text-xs text-slate-900 dark:text-white">
                      {inv.invoiceNumber}
                    </span>
                    <span
                      className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
                        inv.status === "paid"
                          ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400"
                          : inv.status === "pending"
                          ? "bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400"
                          : "bg-slate-100 text-slate-600 dark:bg-zinc-800 dark:text-slate-400"
                      }`}
                    >
                      {inv.status}
                    </span>
                  </div>

                  <div className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate mb-1">
                    {inv.clientName || "Unassigned Client"}
                  </div>

                  <div className="flex justify-between items-center text-[11px] text-slate-400">
                    <span>{formatDate(inv.dateIssued)}</span>
                    <span className="font-mono font-bold text-slate-900 dark:text-slate-100">
                      {formatMoney(invTotal + invTax)}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* MAIN CONTENT: ACTIVE INVOICE PREVIEW & ACTIONS */}
      <div className="flex-1 flex flex-col h-full overflow-y-auto">
        {activeInvoice ? (
          <div className="p-6 md:p-8 max-w-4xl mx-auto w-full">
            
            {/* Top Bar Actions */}
            <div className="flex flex-wrap justify-between items-center gap-4 mb-6 print:hidden">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setHeaderForm(activeInvoice);
                    setIsEditingHeader(!isEditingHeader);
                  }}
                  className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 hover:border-slate-400 text-slate-700 dark:text-slate-300 px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 cursor-pointer"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                  <span>{isEditingHeader ? "Close Editor" : "Edit Invoice Details"}</span>
                </button>

                <button
                  onClick={handleDownloadPDF}
                  className="bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-slate-800 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 cursor-pointer"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  <span>Download / Print PDF</span>
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleDeleteInvoice}
                  className="text-red-600 hover:text-red-700 text-xs font-bold px-3 py-1.5 rounded hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors cursor-pointer"
                >
                  Delete Invoice
                </button>
              </div>
            </div>

            {/* EDIT HEADER ACCORDION */}
            {isEditingHeader && (
              <form onSubmit={handleSaveHeader} className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-2xl p-6 mb-8 shadow-sm print:hidden">
                <div className="flex justify-between items-center mb-6 pb-4 border-b border-slate-100 dark:border-zinc-800">
                  <div>
                    <h3 className="font-bold text-slate-900 dark:text-white text-sm">Edit Invoice Details</h3>
                    <span className="text-[11px] text-slate-400">Client details auto-populate from the selected project.</span>
                  </div>
                  
                  {/* Save as Project Template Button */}
                  {headerForm.projectId && (
                    <button
                      type="button"
                      onClick={handleSaveProjectTemplate}
                      className="text-xs font-bold text-primary-600 dark:text-primary-400 hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <span>⭐ Save as Project Default Template</span>
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                  
                  {/* Project Selector */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Associated Project</label>
                    <select
                      value={headerForm.projectId || ""}
                      onChange={(e) => handleSelectProject(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-lg p-2 text-xs text-slate-900 dark:text-white font-semibold"
                    >
                      <option value="">-- No Project Linked --</option>
                      {projects.map((p) => {
                        const cl = getClientForProject(p.id);
                        return (
                          <option key={p.id} value={p.id}>
                            {p.name} {cl ? `(${cl.name})` : ""}
                          </option>
                        );
                      })}
                    </select>
                  </div>

                  {/* Client Name (Auto-Populated) */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">
                      Client Name (Auto-Filled)
                    </label>
                    <input
                      type="text"
                      value={headerForm.clientName || ""}
                      onChange={(e) => setHeaderForm({ ...headerForm, clientName: e.target.value })}
                      placeholder="e.g. Acme Corporation"
                      className="w-full bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-lg p-2 text-xs text-slate-900 dark:text-white font-medium"
                    />
                  </div>

                  {/* Billing Address (Auto-Populated) */}
                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">
                      Billing Address (Auto-Filled from Client)
                    </label>
                    <textarea
                      rows="2"
                      value={headerForm.clientAddress || ""}
                      onChange={(e) => setHeaderForm({ ...headerForm, clientAddress: e.target.value })}
                      placeholder="123 Client Way&#10;City, State 12345"
                      className="w-full bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-lg p-2 text-xs text-slate-900 dark:text-white resize-none"
                    />
                  </div>

                  {/* PAYMENT TERMS TOGGLE & DUE DATE AUTO-CALCULATION */}
                  <div className="sm:col-span-2 bg-slate-50 dark:bg-zinc-800/60 p-4 rounded-xl border border-slate-200 dark:border-zinc-700">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
                      <label className="text-[11px] font-bold text-slate-500 uppercase">
                        Payment Terms & Due Date Pacing
                      </label>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleTermsChange("net", 30)}
                          className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                            termsType === "net"
                              ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-sm"
                              : "bg-white dark:bg-zinc-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-zinc-700"
                          }`}
                        >
                          Net Terms
                        </button>
                        <button
                          type="button"
                          onClick={() => handleTermsChange("pay_when_paid")}
                          className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                            termsType === "pay_when_paid"
                              ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-sm"
                              : "bg-white dark:bg-zinc-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-zinc-700"
                          }`}
                        >
                          Pay When Paid
                        </button>
                      </div>
                    </div>

                    {termsType === "net" ? (
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
                        <div>
                          <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
                            Net Days (Customizable)
                          </label>
                          <div className="flex items-center gap-1.5">
                            <input
                              type="number"
                              min="0"
                              max="365"
                              value={netDays}
                              onChange={(e) => {
                                const val = parseInt(e.target.value || 0, 10);
                                handleTermsChange("net", val);
                              }}
                              className="w-20 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-lg p-2 text-xs font-mono font-bold text-slate-900 dark:text-white"
                            />
                            <span className="text-xs text-slate-500 font-semibold">Days</span>
                          </div>
                        </div>

                        <div className="flex gap-1">
                          {[15, 30, 45, 60].map((d) => (
                            <button
                              key={d}
                              type="button"
                              onClick={() => handleTermsChange("net", d)}
                              className={`px-2 py-1.5 rounded text-[11px] font-bold cursor-pointer ${
                                netDays === d
                                  ? "bg-primary-600 text-white"
                                  : "bg-white dark:bg-zinc-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-zinc-700 hover:bg-slate-100"
                              }`}
                            >
                              Net {d}
                            </button>
                          ))}
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
                            Auto-Calculated Due Date
                          </label>
                          <input
                            type="date"
                            value={headerForm.dueDate ? new Date(headerForm.dueDate).toISOString().split("T")[0] : ""}
                            onChange={(e) => setHeaderForm({ ...headerForm, dueDate: e.target.value })}
                            className="w-full bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-lg p-2 text-xs font-bold text-primary-600 dark:text-primary-400"
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="text-xs text-slate-600 dark:text-slate-300 font-medium">
                        ✦ <span className="font-bold">Pay When Paid Active:</span> Due date is non-fixed. Invoices will show <em>"Terms: Pay When Paid"</em> upon disbursement from client funds.
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Date Issued</label>
                    <input
                      type="date"
                      value={headerForm.dateIssued ? new Date(headerForm.dateIssued).toISOString().split("T")[0] : ""}
                      onChange={(e) => {
                        const newIssue = e.target.value;
                        const newDue = termsType === "net" ? calculateDueDate(newIssue, netDays) : null;
                        setHeaderForm({ ...headerForm, dateIssued: newIssue, dueDate: newDue });
                      }}
                      className="w-full bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-lg p-2 text-xs text-slate-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Status</label>
                    <select
                      value={headerForm.status || "draft"}
                      onChange={(e) => setHeaderForm({ ...headerForm, status: e.target.value })}
                      className="w-full bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-lg p-2 text-xs text-slate-900 dark:text-white font-bold"
                    >
                      <option value="draft">Draft</option>
                      <option value="pending">Pending / Sent</option>
                      <option value="paid">Paid</option>
                    </select>
                  </div>

                  <div className="flex gap-2">
                    <div className="flex-1">
                      <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Tax Name</label>
                      <input
                        type="text"
                        placeholder="VAT / Sales Tax"
                        value={headerForm.taxName || ""}
                        onChange={(e) => setHeaderForm({ ...headerForm, taxName: e.target.value })}
                        className="w-full bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-lg p-2 text-xs text-slate-900 dark:text-white"
                      />
                    </div>
                    <div className="w-24">
                      <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Rate (%)</label>
                      <input
                        type="number"
                        step="0.1"
                        placeholder="0.0"
                        value={headerForm.taxRate || ""}
                        onChange={(e) => setHeaderForm({ ...headerForm, taxRate: parseFloat(e.target.value) || 0 })}
                        className="w-full bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-lg p-2 text-xs text-slate-900 dark:text-white"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Notes & Terms</label>
                    <textarea
                      rows="2"
                      value={headerForm.notes || ""}
                      onChange={(e) => setHeaderForm({ ...headerForm, notes: e.target.value })}
                      placeholder="Payment terms, wire instructions, or milestone notes..."
                      className="w-full bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-lg p-2 text-xs text-slate-900 dark:text-white resize-none"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsEditingHeader(false)}
                    className="px-4 py-2 text-xs font-semibold text-slate-500 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-5 py-2 rounded-xl text-xs font-bold cursor-pointer"
                  >
                    Save Changes
                  </button>
                </div>
              </form>
            )}

            {/* INVOICE PAPER CONTAINER */}
            <div
              id="invoice-preview-container"
              className="bg-white dark:bg-zinc-900 rounded-3xl shadow-xl border border-slate-200 dark:border-zinc-800 p-8 sm:p-12 print:p-0 print:border-none print:shadow-none"
            >
              
              {/* Document Header */}
              <div className="flex flex-col sm:flex-row justify-between items-start gap-8 pb-8 border-b border-slate-200 dark:border-zinc-800">
                <div>
                  <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight uppercase mb-1">
                    Invoice
                  </h1>
                  <span className="font-mono text-sm font-bold text-primary-600 dark:text-primary-400">
                    {activeInvoice.invoiceNumber}
                  </span>

                  <div className="mt-6">
                    <span className="block text-[11px] font-bold uppercase text-slate-400 mb-1">Billed To</span>
                    <div className="font-bold text-base text-slate-900 dark:text-white">
                      {activeInvoice.clientName || "Unassigned Client"}
                    </div>
                    {activeInvoice.clientAddress && (
                      <div className="text-xs text-slate-500 whitespace-pre-wrap mt-0.5">
                        {activeInvoice.clientAddress}
                      </div>
                    )}
                  </div>
                </div>

                <div className="text-left sm:text-right space-y-1.5 text-xs">
                  <div>
                    <span className="text-slate-400 font-medium mr-2">Date Issued:</span>
                    <span className="font-bold text-slate-900 dark:text-white">{formatDate(activeInvoice.dateIssued)}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-medium mr-2">Terms / Due:</span>
                    <span className="font-bold text-slate-900 dark:text-white">
                      {activeInvoice.dueDate ? formatDate(activeInvoice.dueDate) : "Pay When Paid"}
                    </span>
                  </div>
                  {activeInvoice.project && (
                    <div>
                      <span className="text-slate-400 font-medium mr-2">Project:</span>
                      <span className="font-bold text-slate-900 dark:text-white">{activeInvoice.project.name}</span>
                    </div>
                  )}
                  <div>
                    <span className="text-slate-400 font-medium mr-2">Status:</span>
                    <span className="font-bold uppercase tracking-wider text-slate-900 dark:text-white">{activeInvoice.status}</span>
                  </div>
                </div>
              </div>

              {/* Line Items Table */}
              <div className="py-6">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b-2 border-slate-200 dark:border-zinc-800 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                      <th className="py-3 px-2 w-full">Description / Phase</th>
                      <th className="py-3 px-2 text-center w-24">Qty / Type</th>
                      <th className="py-3 px-2 text-right w-28">Rate</th>
                      <th className="py-3 px-2 text-right w-28">Amount</th>
                      <th className="py-3 px-1 w-8 print:hidden"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-zinc-800 font-medium text-slate-800 dark:text-slate-200">
                    {(!activeInvoice.lineItems || activeInvoice.lineItems.length === 0) ? (
                      <tr>
                        <td colSpan="5" className="py-8 text-center text-slate-400 italic">
                          No line items added to this invoice yet.
                        </td>
                      </tr>
                    ) : (
                      activeInvoice.lineItems.map((li) => (
                        <tr key={li.id} className="group hover:bg-slate-50 dark:hover:bg-zinc-800/30">
                          <td className="py-3.5 px-2 font-semibold text-slate-900 dark:text-white">
                            {li.description}
                          </td>
                          <td className="py-3.5 px-2 text-center text-slate-500">
                            {li.isHourly ? `${li.hours} hrs` : "Phase / Flat"}
                          </td>
                          <td className="py-3.5 px-2 text-right text-slate-500 font-mono">
                            {li.isHourly && li.rate ? formatMoney(li.rate) : "-"}
                          </td>
                          <td className="py-3.5 px-2 text-right font-mono font-bold text-slate-900 dark:text-white">
                            {formatMoney(li.amount)}
                          </td>
                          <td className="py-3.5 px-1 text-center print:hidden">
                            <button
                              onClick={() => handleDeleteLineItem(li.id)}
                              className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity p-1 cursor-pointer"
                              title="Delete line item"
                            >
                              ✕
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* IN-BOX ADD LINE ITEM SECTION (Inside Invoice Paper, Hidden on Print) */}
              <div className="my-4 border-t border-dashed border-slate-200 dark:border-zinc-800 pt-4 print:hidden">
                {!isAddingLineItem ? (
                  <button
                    onClick={() => setIsAddingLineItem(true)}
                    className="w-full py-2.5 border border-dashed border-slate-300 dark:border-zinc-700 hover:border-primary-500 hover:bg-primary-50/50 dark:hover:bg-primary-950/20 text-slate-600 dark:text-slate-400 hover:text-primary-600 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
                  >
                    <span>+ Add Line Item (Progress Billing %, Hourly, Expense, Flat Fee)</span>
                  </button>
                ) : (
                  <form onSubmit={handleAddLineItem} className="bg-slate-50 dark:bg-zinc-800/50 border border-slate-200 dark:border-zinc-700 rounded-2xl p-5 space-y-4">
                    
                    {/* Mode Selector Tabs */}
                    <div className="flex flex-wrap gap-2 pb-3 border-b border-slate-200 dark:border-zinc-700">
                      {[
                        { id: "progress", label: "📊 Progress Billing (% Completion)" },
                        { id: "hourly", label: "⏱️ Unbilled Hours (Matrix)" },
                        { id: "expense", label: "🧾 Unbilled Expense" },
                        { id: "flat", label: "💵 Flat Fee / Custom" }
                      ].map((m) => (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => setLiMode(m.id)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                            liMode === m.id
                              ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-sm"
                              : "bg-white dark:bg-zinc-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-zinc-700 hover:bg-slate-100"
                          }`}
                        >
                          {m.label}
                        </button>
                      ))}
                    </div>

                    {/* 1. PROGRESS BILLING FORM */}
                    {liMode === "progress" && (
                      <div className="space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                              Phase / Milestone Name
                            </label>
                            <input
                              type="text"
                              list="progress-phase-suggestions"
                              placeholder="e.g. Construction Documents"
                              value={pbPhaseName}
                              onChange={(e) => handlePhaseChange(e.target.value)}
                              className="w-full bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-lg p-2 text-xs text-slate-900 dark:text-white font-semibold outline-none focus:ring-2 focus:ring-primary-500"
                            />
                            <datalist id="progress-phase-suggestions">
                              <option value="Schematic Design" />
                              <option value="Design Development" />
                              <option value="Construction Documents" />
                              <option value="Bidding & Negotiation" />
                              <option value="Construction Administration" />
                              <option value="Milestone 1 - Initial Deliverable" />
                              <option value="Milestone 2 - Core Beta" />
                              <option value="Milestone 3 - Final Launch" />
                            </datalist>
                          </div>

                          <div>
                            <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                              Contract / Phase Value ($)
                            </label>
                            <input
                              type="number"
                              step="0.01"
                              placeholder="10000.00"
                              value={pbContractValue}
                              onChange={(e) => setPbContractValue(e.target.value)}
                              className="w-full bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-lg p-2 text-xs text-slate-900 dark:text-white font-mono font-bold outline-none focus:ring-2 focus:ring-primary-500"
                            />
                          </div>

                          <div>
                            <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                              Last Billed % (Auto-Detected / Editable)
                            </label>
                            <div className="relative">
                              <input
                                type="number"
                                step="0.1"
                                min="0"
                                max="100"
                                placeholder="0"
                                value={pbPreviousPercent}
                                onChange={(e) => setPbPreviousPercent(e.target.value)}
                                className="w-full bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-lg p-2 pr-8 text-xs text-slate-900 dark:text-white font-mono font-bold outline-none focus:ring-2 focus:ring-primary-500"
                              />
                              <span className="absolute right-3 top-2 text-slate-400 font-bold text-xs">%</span>
                            </div>
                          </div>

                          <div>
                            <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                              Current % Complete (This Invoice)
                            </label>
                            <div className="relative">
                              <input
                                type="number"
                                step="0.1"
                                min="0"
                                max="100"
                                placeholder="e.g. 30"
                                value={pbCurrentPercent}
                                onChange={(e) => setPbCurrentPercent(e.target.value)}
                                className="w-full bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-lg p-2 pr-8 text-xs text-slate-900 dark:text-white font-mono font-bold outline-none focus:ring-2 focus:ring-primary-500"
                              />
                              <span className="absolute right-3 top-2 text-slate-400 font-bold text-xs">%</span>
                            </div>
                          </div>
                        </div>

                        {/* Progress Preview */}
                        {pbPhaseName && pbContractValue && pbCurrentPercent && (
                          <div className="bg-primary-50 dark:bg-primary-950/40 border border-primary-200 dark:border-primary-800 rounded-xl p-3 text-xs">
                            <span className="block font-bold text-primary-900 dark:text-primary-300 mb-0.5">
                              Generated Line Item:
                            </span>
                            <div className="font-mono font-semibold text-slate-800 dark:text-slate-200 mb-1">
                              "{pbCurrentPercent}% {pbPhaseName} | Last Billed: {pbPreviousPercent || 0}%"
                            </div>
                            <div className="text-[11px] text-primary-700 dark:text-primary-400">
                              Amount: ({pbCurrentPercent}% − {pbPreviousPercent || 0}%) = {(parseFloat(pbCurrentPercent) || 0) - (parseFloat(pbPreviousPercent) || 0)}% of ${parseFloat(pbContractValue).toLocaleString()} = <span className="font-bold font-mono text-xs">${calculatedProgressAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* 2. HOURLY FORM */}
                    {liMode === "hourly" && (
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Project</label>
                          <select
                            value={liProjectId}
                            onChange={(e) => {
                              setLiProjectId(e.target.value);
                              setLiTaskId("");
                            }}
                            className="w-full bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-lg p-2 text-xs text-slate-900 dark:text-white"
                          >
                            <option value="">-- Choose Project --</option>
                            {projects.map((p) => (
                              <option key={p.id} value={p.id}>{p.name}</option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Task</label>
                          <select
                            value={liTaskId}
                            onChange={(e) => setLiTaskId(e.target.value)}
                            disabled={!liProjectId}
                            className="w-full bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-lg p-2 text-xs text-slate-900 dark:text-white disabled:opacity-50"
                          >
                            <option value="">-- Choose Task --</option>
                            {projects.find((p) => p.id === liProjectId)?.tasks?.map((t) => (
                              <option key={t.id} value={t.id}>{t.name}</option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Team Member</label>
                          <select
                            value={liUserId}
                            onChange={(e) => setLiUserId(e.target.value)}
                            className="w-full bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-lg p-2 text-xs text-slate-900 dark:text-white"
                          >
                            <option value="">-- Choose User --</option>
                            {orgUsers.map((u) => (
                              <option key={u.id} value={u.id}>{u.firstName} {u.lastName}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    )}

                    {/* 3. EXPENSE FORM */}
                    {liMode === "expense" && (
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Select Unbilled Expense</label>
                        <select
                          value={liExpenseId}
                          onChange={(e) => setLiExpenseId(e.target.value)}
                          className="w-full bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-lg p-2 text-xs text-slate-900 dark:text-white"
                        >
                          <option value="">-- Choose Unbilled Expense --</option>
                          {expenses.filter((exp) => !exp.invoiceId).map((exp) => (
                            <option key={exp.id} value={exp.id}>
                              {exp.description} - ${exp.amount} ({exp.project?.name || "General"})
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    {/* 4. FLAT FEE FORM */}
                    {liMode === "flat" && (
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div className="sm:col-span-2">
                          <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Description</label>
                          <input
                            type="text"
                            placeholder="e.g. Consulting Retainer or Fixed Fee Phase"
                            value={liDescription}
                            onChange={(e) => setLiDescription(e.target.value)}
                            className="w-full bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-lg p-2 text-xs text-slate-900 dark:text-white"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Amount ($)</label>
                          <input
                            type="number"
                            step="0.01"
                            placeholder="1500.00"
                            value={liAmount}
                            onChange={(e) => setLiAmount(e.target.value)}
                            className="w-full bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-lg p-2 text-xs text-slate-900 dark:text-white font-mono font-bold"
                          />
                        </div>
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-zinc-700">
                      <button
                        type="button"
                        onClick={() => setIsAddingLineItem(false)}
                        className="px-3 py-1.5 text-xs font-semibold text-slate-500 cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="bg-primary-600 hover:bg-primary-500 text-white font-bold px-5 py-2 rounded-xl text-xs shadow-md transition-all cursor-pointer"
                      >
                        Add to Invoice
                      </button>
                    </div>

                  </form>
                )}
              </div>

              {/* Totals & Terms */}
              <div className="pt-6 border-t border-slate-200 dark:border-zinc-800 grid grid-cols-1 sm:grid-cols-12 gap-8 items-start">
                <div className="sm:col-span-7">
                  {activeInvoice.notes && (
                    <div>
                      <span className="block text-[11px] font-bold uppercase text-slate-400 mb-1">Notes & Terms</span>
                      <p className="text-xs text-slate-600 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">
                        {activeInvoice.notes}
                      </p>
                    </div>
                  )}
                </div>

                <div className="sm:col-span-5 bg-slate-50 dark:bg-zinc-800/40 rounded-2xl p-4 border border-slate-200 dark:border-zinc-700/60 text-xs">
                  <div className="flex justify-between py-1 text-slate-500">
                    <span>Subtotal:</span>
                    <span className="font-mono font-bold text-slate-900 dark:text-white">{formatMoney(subtotal)}</span>
                  </div>
                  {activeInvoice.taxRate > 0 && (
                    <div className="flex justify-between py-1 text-slate-500">
                      <span>{activeInvoice.taxName || "Tax"} ({activeInvoice.taxRate}%):</span>
                      <span className="font-mono font-bold text-slate-900 dark:text-white">{formatMoney(taxAmount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between pt-2 mt-2 border-t border-slate-200 dark:border-zinc-700 text-sm font-black text-slate-900 dark:text-white">
                    <span>Total Due:</span>
                    <span className="font-mono text-base text-primary-600 dark:text-primary-400">{formatMoney(totalAmount)}</span>
                  </div>
                </div>
              </div>

            </div>

          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center p-12 text-center text-slate-400">
            Select an invoice from the sidebar or click "+ New Invoice" to get started.
          </div>
        )}
      </div>

    </div>
  );
}
