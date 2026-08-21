'use client';
import React, { useState, useEffect, useMemo, useRef } from "react";
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

  // Live Sheet Fields State (WYSIWYG directly on invoice paper)
  const [sheetForm, setSheetForm] = useState({
    projectId: "",
    clientName: "",
    clientAddress: "",
    dateIssued: "",
    dueDate: "",
    notes: "",
    status: "draft",
    taxName: "Tax",
    taxRate: 0,
  });

  // Terms State: 'net' or 'pay_when_paid'
  const [termsType, setTermsType] = useState("net");
  const [netDays, setNetDays] = useState(30);

  // Add Line Item Drawer State (Inside the invoice sheet)
  const [isAddingLineItem, setIsAddingLineItem] = useState(false);
  const [liMode, setLiMode] = useState("progress"); // 'progress', 'hourly', 'expense', 'flat'
  const [liDescription, setLiDescription] = useState("");
  const [liAmount, setLiAmount] = useState("");

  // Hourly line item state
  const [liTaskId, setLiTaskId] = useState("");
  const [liUserId, setLiUserId] = useState("");

  // Expense line item state
  const [liExpenseId, setLiExpenseId] = useState("");

  // Progress Billing State
  const [pbPhaseName, setPbPhaseName] = useState("");
  const [pbContractValue, setPbContractValue] = useState("");
  const [pbCurrentPercent, setPbCurrentPercent] = useState("");
  const [pbPreviousPercent, setPbPreviousPercent] = useState("0");

  const autoSaveTimerRef = useRef(null);

  const fetchInvoices = async () => {
    try {
      const data = await apiCall("/api/invoices", "GET");
      setInvoices(data);
      if (activeInvoiceId) {
        const matched = data.find((i) => i.id === activeInvoiceId);
        if (matched) selectInvoice(matched);
      } else if (data.length > 0 && !activeInvoice) {
        selectInvoice(data[0]);
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

  const selectInvoice = (inv) => {
    setActiveInvoice(inv);
    setIsAddingLineItem(false);

    const isPwp = (inv.notes && inv.notes.toLowerCase().includes("pay when paid")) || !inv.dueDate;
    const tType = isPwp ? "pay_when_paid" : "net";
    setTermsType(tType);

    setSheetForm({
      projectId: inv.projectId || "",
      clientName: inv.clientName || "",
      clientAddress: inv.clientAddress || "",
      dateIssued: inv.dateIssued ? new Date(inv.dateIssued).toISOString().split("T")[0] : new Date().toISOString().split("T")[0],
      dueDate: inv.dueDate ? new Date(inv.dueDate).toISOString().split("T")[0] : "",
      notes: inv.notes || "",
      status: inv.status || "draft",
      taxName: inv.taxName || "Tax",
      taxRate: inv.taxRate || 0,
    });
  };

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

  const getProjectTemplate = (projectId) => {
    if (!projectId) return null;
    try {
      const raw = localStorage.getItem(`velotime_project_template_${projectId}`);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  };

  const calculateDueDate = (issuedDateStr, days) => {
    if (!issuedDateStr) return "";
    const date = new Date(issuedDateStr);
    if (isNaN(date.getTime())) return "";
    date.setDate(date.getDate() + parseInt(days || 0, 10));
    return date.toISOString().split("T")[0];
  };

  const saveSheetChanges = async (updatedFields) => {
    if (!activeInvoice) return;
    try {
      const updated = await apiCall(
        `/api/invoices/${activeInvoice.id}`,
        "PUT",
        updatedFields,
      );
      setActiveInvoice(updated);
      setInvoices((prev) => prev.map((i) => (i.id === updated.id ? updated : i)));
    } catch (e) {
      console.error("Auto-save failed", e);
    }
  };

  const handleFieldChange = (field, value) => {
    const updated = { ...sheetForm, [field]: value };
    setSheetForm(updated);

    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    autoSaveTimerRef.current = setTimeout(() => {
      saveSheetChanges(updated);
    }, 400);
  };

  const handleProjectSelect = (projectId) => {
    const proj = projects.find((p) => p.id === projectId);
    const assignedClient = getClientForProject(projectId);
    const template = getProjectTemplate(projectId);

    const clientName = assignedClient?.name || template?.clientName || proj?.clientName || proj?.name?.split(" - ")[0] || "";
    const clientAddress = assignedClient?.address || template?.clientAddress || "";
    const taxName = template?.taxName !== undefined ? template.taxName : sheetForm.taxName;
    const taxRate = template?.taxRate !== undefined ? template.taxRate : sheetForm.taxRate;
    const notes = template?.notes !== undefined ? template.notes : sheetForm.notes;

    const tType = template?.termsType || termsType;
    const nDays = template?.netDays || netDays;
    setTermsType(tType);
    setNetDays(nDays);

    const issueDate = sheetForm.dateIssued || new Date().toISOString().split("T")[0];
    const computedDueDate = tType === "net" ? calculateDueDate(issueDate, nDays) : null;

    const updated = {
      ...sheetForm,
      projectId: projectId || null,
      clientName,
      clientAddress,
      taxName,
      taxRate,
      notes,
      dueDate: computedDueDate,
    };

    setSheetForm(updated);
    saveSheetChanges(updated);
    addToast(`Linked to ${proj?.name || "project"} & client details auto-populated`, "success");
  };

  const handleTermsChange = (mode, customDays = netDays) => {
    setTermsType(mode);
    const issueDate = sheetForm.dateIssued || new Date().toISOString().split("T")[0];

    let newDueDate = null;
    let newNotes = sheetForm.notes;

    if (mode === "pay_when_paid") {
      newDueDate = null;
      if (!newNotes || newNotes.includes("Payment is due within")) {
        newNotes = "Payment terms: Pay When Paid.";
      }
    } else {
      const days = parseInt(customDays || 30, 10);
      setNetDays(days);
      newDueDate = calculateDueDate(issueDate, days);
      if (!newNotes || newNotes.includes("Pay When Paid")) {
        newNotes = `Payment is due within ${days} days of invoice date.`;
      }
    }

    const updated = {
      ...sheetForm,
      dueDate: newDueDate,
      notes: newNotes,
    };
    setSheetForm(updated);
    saveSheetChanges(updated);
  };

  const handleSaveProjectTemplate = () => {
    if (!sheetForm.projectId) {
      addToast("Please select an associated project before saving template", "error");
      return;
    }
    const template = {
      projectId: sheetForm.projectId,
      clientName: sheetForm.clientName || "",
      clientAddress: sheetForm.clientAddress || "",
      taxName: sheetForm.taxName || "",
      taxRate: sheetForm.taxRate || 0,
      notes: sheetForm.notes || "",
      termsType: termsType,
      netDays: netDays,
    };
    try {
      localStorage.setItem(`velotime_project_template_${sheetForm.projectId}`, JSON.stringify(template));
      addToast("Saved default template for this project", "success");
    } catch (e) {
      addToast("Failed to save template", "error");
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
          taxName: template?.taxName || "Tax",
          taxRate: template?.taxRate || 0,
          notes: template?.notes || (tType === "pay_when_paid" ? "Payment terms: Pay When Paid." : `Payment is due within ${nDays} days.`),
          dueDate: computedDueDate,
        };
      }

      const inv = await apiCall("/api/invoices", "POST", initialPayload);
      setInvoices([inv, ...invoices]);
      selectInvoice(inv);
      forceSync();
      addToast("New invoice created", "success");
    } catch (e) {
      addToast("Failed to create invoice", "error");
    }
  };

  const handleDeleteInvoice = async () => {
    if (!window.confirm("Are you sure you want to delete this entire invoice?")) return;
    try {
      await apiCall(`/api/invoices/${activeInvoice.id}`, "DELETE");
      const remaining = invoices.filter((i) => i.id !== activeInvoice.id);
      setInvoices(remaining);
      if (remaining.length > 0) {
        selectInvoice(remaining[0]);
      } else {
        setActiveInvoice(null);
      }
      forceSync();
      addToast("Invoice deleted", "success");
    } catch (e) {
      addToast("Failed to delete invoice", "error");
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
      setInvoices((prev) => prev.map((i) => (i.id === updated.id ? updated : i)));
      setIsAddingLineItem(false);

      // Reset form
      setLiDescription("");
      setLiAmount("");
      setLiMode("progress");
      setLiExpenseId("");
      setLiTaskId("");
      setLiUserId("");
      setPbPhaseName("");
      setPbContractValue("");
      setPbCurrentPercent("");
      setPbPreviousPercent("0");

      if (liMode === "hourly" || liMode === "expense") forceSync();
      addToast("Line item added", "success");
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
      setInvoices((prev) => prev.map((i) => (i.id === updated.id ? updated : i)));
      forceSync();
      addToast("Line item removed", "success");
    } catch (e) {
      addToast("Failed to delete line item", "error");
    }
  };

  const handlePrintPDF = () => {
    window.print();
  };

  const formatMoney = (amount) => {
    return "$" + (parseFloat(amount) || 0).toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return dateString;
    return d.toLocaleDateString("en-US", {
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
    const rate = parseFloat(sheetForm.taxRate) || 0;
    if (rate <= 0) return 0;
    return (subtotal * rate) / 100;
  }, [subtotal, sheetForm.taxRate]);

  const totalAmount = subtotal + taxAmount;

  return (
    <div className="flex-1 flex flex-col md:flex-row h-full bg-slate-100 dark:bg-zinc-950 overflow-hidden">
      
      {/* SIDEBAR: INVOICES LIST (Hidden on Print) */}
      <div className="w-full md:w-80 border-r border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex flex-col shrink-0 print:hidden">
        <div className="p-4 border-b border-slate-200 dark:border-zinc-800 flex justify-between items-center">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">Invoices</h2>
            <span className="text-xs text-slate-500">{invoices.length} invoices generated</span>
          </div>
          <button
            onClick={() => handleCreateInvoice()}
            className="bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-bold px-3 py-1.5 rounded-none-none hover:bg-slate-800 transition-colors shadow-sm cursor-pointer"
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
                  onClick={() => selectInvoice(inv)}
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
                      className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-none ${
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

      {/* MAIN CONTENT: WHAT-YOU-SEE-IS-WHAT-YOU-GET (WYSIWYG) INVOICE PAPER */}
      <div className="flex-1 flex flex-col h-full overflow-y-auto p-4 sm:p-8">
        {activeInvoice ? (
          <div className="max-w-4xl mx-auto w-full">
            
            {/* Top Toolbar (Action Controls - Hidden on Print) */}
            <div className="flex flex-wrap justify-between items-center gap-4 mb-6 print:hidden">
              <div className="flex items-center gap-3">
                <button
                  onClick={handlePrintPDF}
                  className="bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-slate-800 px-4 py-2 rounded-none-none text-xs font-bold transition-all shadow-md flex items-center gap-2 cursor-pointer active:scale-95"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                  </svg>
                  <span>Print / Save as PDF</span>
                </button>

                {sheetForm.projectId && (
                  <button
                    onClick={handleSaveProjectTemplate}
                    className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 hover:border-primary-500 text-slate-700 dark:text-slate-300 hover:text-primary-600 px-3.5 py-2 rounded-none-none text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 cursor-pointer"
                  >
                    <svg className="w-3.5 h-3.5 text-amber-500" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                    <span>Save as Project Default</span>
                  </button>
                )}
              </div>

              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-none-none px-3 py-1.5 shadow-sm">
                  <span className="text-[11px] font-bold uppercase text-slate-400">Status:</span>
                  <select
                    value={sheetForm.status}
                    onChange={(e) => handleFieldChange("status", e.target.value)}
                    className="bg-transparent text-xs font-bold uppercase text-slate-900 dark:text-white outline-none cursor-pointer"
                  >
                    <option value="draft">Draft</option>
                    <option value="pending">Pending</option>
                    <option value="paid">Paid</option>
                  </select>
                </div>

                <button
                  onClick={handleDeleteInvoice}
                  className="text-red-500 hover:text-red-700 text-xs font-bold px-3 py-1.5 rounded-none-none hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors cursor-pointer"
                >
                  Delete
                </button>
              </div>
            </div>

            {/* THE UNIFIED INVOICE PAPER SHEET (#invoice-preview-container) */}
            <div
              id="invoice-preview-container"
              className="bg-white dark:bg-zinc-900 rounded-none-none shadow-xl border border-slate-200 dark:border-zinc-800 p-8 sm:p-12 print:p-0 print:border-none print:shadow-none transition-all"
            >
              
              {/* Document Header */}
              <div className="flex flex-col sm:flex-row justify-between items-start gap-8 pb-8 border-b border-slate-200 dark:border-zinc-800">
                
                {/* Left Header: Title, Project, Billed To (Flush alignment) */}
                <div className="flex-1 w-full max-w-md">
                  <div className="flex items-baseline gap-3 mb-2">
                    <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight uppercase">
                      Invoice
                    </h1>
                    <span className="font-mono text-sm font-bold text-primary-600 dark:text-primary-400">
                      {activeInvoice.invoiceNumber}
                    </span>
                  </div>

                  {/* Associated Project */}
                  <div className="mb-4">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-bold uppercase text-slate-400">Project:</span>
                      <select
                        value={sheetForm.projectId || ""}
                        onChange={(e) => handleProjectSelect(e.target.value)}
                        className="bg-slate-50 dark:bg-zinc-800/80 border border-slate-200 dark:border-zinc-700 hover:border-primary-500 rounded-none-none px-2.5 py-1 text-xs font-bold text-slate-900 dark:text-white outline-none cursor-pointer"
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
                  </div>

                  {/* BILLED TO */}
                  <div className="mt-4">
                    <span className="block text-[11px] font-bold uppercase text-slate-400 tracking-wider mb-1">
                      Billed To
                    </span>
                    <input
                      type="text"
                      value={sheetForm.clientName}
                      onChange={(e) => handleFieldChange("clientName", e.target.value)}
                      placeholder="Click to enter Client Name..."
                      className="w-full text-base font-bold text-slate-900 dark:text-white bg-transparent border-b border-transparent hover:border-slate-200 dark:hover:border-zinc-700 focus:border-primary-500 rounded-none-none px-0 py-0.5 transition-all outline-none"
                    />
                    <textarea
                      rows="2"
                      value={sheetForm.clientAddress}
                      onChange={(e) => handleFieldChange("clientAddress", e.target.value)}
                      placeholder="Click to enter Billing Address..."
                      className="w-full text-xs text-slate-600 dark:text-slate-400 bg-transparent border-b border-transparent hover:border-slate-200 dark:hover:border-zinc-700 focus:border-primary-500 rounded-none-none px-0 py-0.5 mt-1 resize-none transition-all outline-none"
                    />
                  </div>
                </div>

                {/* Right Metadata Block (PERFECT RIGHT ALIGNMENT ON BOTH SCREEN & PRINT) */}
                <div className="w-full sm:w-auto flex justify-end">
                  <div className="text-xs space-y-2 w-72">
                    
                    {/* Date Issued */}
                    <div className="flex justify-between items-center text-right">
                      <span className="text-slate-500 dark:text-slate-400 font-medium">Date Issued:</span>
                      <span className="font-bold text-slate-900 dark:text-white text-right">
                        <span className="hidden print:inline font-mono">{formatDate(sheetForm.dateIssued)}</span>
                        <input
                          type="date"
                          value={sheetForm.dateIssued}
                          onChange={(e) => {
                            const newIssue = e.target.value;
                            const newDue = termsType === "net" ? calculateDueDate(newIssue, netDays) : null;
                            const updated = { ...sheetForm, dateIssued: newIssue, dueDate: newDue };
                            setSheetForm(updated);
                            saveSheetChanges(updated);
                          }}
                          className="print:hidden bg-transparent font-bold text-slate-900 dark:text-white border border-transparent hover:border-slate-200 dark:hover:border-zinc-700 rounded-none px-1 text-right outline-none cursor-pointer"
                        />
                      </span>
                    </div>

                    {/* Payment Terms */}
                    <div className="flex justify-between items-center text-right">
                      <span className="text-slate-500 dark:text-slate-400 font-medium">Payment Terms:</span>
                      <span className="font-bold text-slate-900 dark:text-white text-right">
                        <span className="hidden print:inline">{termsType === "net" ? `Net ${netDays} Days` : "Pay When Paid"}</span>
                        <div className="inline-flex items-center bg-slate-100 dark:bg-zinc-800 rounded-none-none p-0.5 border border-slate-200 dark:border-zinc-700 print:hidden">
                          <button
                            type="button"
                            onClick={() => handleTermsChange("net", 30)}
                            className={`px-2 py-0.5 rounded-none-none text-[11px] font-bold transition-all cursor-pointer ${
                              termsType === "net"
                                ? "bg-white dark:bg-zinc-900 text-slate-900 dark:text-white shadow-sm"
                                : "text-slate-500 hover:text-slate-900"
                            }`}
                          >
                            Net {netDays}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleTermsChange("pay_when_paid")}
                            className={`px-2 py-0.5 rounded-none-none text-[11px] font-bold transition-all cursor-pointer ${
                              termsType === "pay_when_paid"
                                ? "bg-white dark:bg-zinc-900 text-slate-900 dark:text-white shadow-sm"
                                : "text-slate-500 hover:text-slate-900"
                            }`}
                          >
                            Pay When Paid
                          </button>
                        </div>
                      </span>
                    </div>

                    {/* Due Date */}
                    {termsType === "net" ? (
                      <div className="flex justify-between items-center text-right">
                        <span className="text-slate-500 dark:text-slate-400 font-medium">Due Date:</span>
                        <span className="font-bold text-primary-600 dark:text-primary-400 text-right">
                          <span className="hidden print:inline text-slate-900 font-mono">{formatDate(sheetForm.dueDate)}</span>
                          <input
                            type="date"
                            value={sheetForm.dueDate || ""}
                            onChange={(e) => handleFieldChange("dueDate", e.target.value)}
                            className="print:hidden bg-transparent font-bold text-primary-600 dark:text-primary-400 border border-transparent hover:border-slate-200 dark:hover:border-zinc-700 rounded-none px-1 text-right outline-none cursor-pointer"
                          />
                        </span>
                      </div>
                    ) : (
                      <div className="flex justify-between items-center text-right">
                        <span className="text-slate-500 dark:text-slate-400 font-medium">Due Date:</span>
                        <span className="text-slate-500 dark:text-slate-400 italic text-[11px] text-right font-medium">
                          Upon Disbursement
                        </span>
                      </div>
                    )}

                    {/* Status */}
                    <div className="flex justify-between items-center text-right">
                      <span className="text-slate-500 dark:text-slate-400 font-medium">Status:</span>
                      <span className="font-bold uppercase tracking-wider text-slate-900 dark:text-white text-right">
                        {sheetForm.status}
                      </span>
                    </div>

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
                          No line items added yet. Use the button below to add milestone phases, hours, or expenses.
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

              {/* IN-BOX ADD LINE ITEM SECTION (Embedded seamlessly on sheet, hidden on print) */}
              <div className="my-2 border-t border-dashed border-slate-200 dark:border-zinc-800 pt-4 print:hidden">
                {!isAddingLineItem ? (
                  <button
                    onClick={() => setIsAddingLineItem(true)}
                    className="w-full py-2.5 border border-dashed border-slate-300 dark:border-zinc-700 hover:border-primary-500 hover:bg-primary-50/40 dark:hover:bg-primary-950/20 text-slate-600 dark:text-slate-400 hover:text-primary-600 rounded-none-none font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
                  >
                    <span>+ Add Line Item (Progress Billing %, Hours, Expense, Flat Fee)</span>
                  </button>
                ) : (
                  <form onSubmit={handleAddLineItem} className="bg-slate-50 dark:bg-zinc-800/60 border border-slate-200 dark:border-zinc-700 rounded-none-none p-5 space-y-4 shadow-sm">
                    
                    {/* Mode Selector */}
                    <div className="flex flex-wrap gap-2 pb-3 border-b border-slate-200 dark:border-zinc-700">
                      {[
                        { id: "progress", label: "Progress Billing (% Completion)" },
                        { id: "hourly", label: "Unbilled Hours (Matrix)" },
                        { id: "expense", label: "Unbilled Expense" },
                        { id: "flat", label: "Flat Fee / Custom" }
                      ].map((m) => (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => setLiMode(m.id)}
                          className={`px-3 py-1.5 rounded-none-none text-xs font-bold transition-all cursor-pointer ${
                            liMode === m.id
                              ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-sm"
                              : "bg-white dark:bg-zinc-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-zinc-700 hover:bg-slate-100"
                          }`}
                        >
                          {m.label}
                        </button>
                      ))}
                    </div>

                    {/* Progress Billing Form */}
                    {liMode === "progress" && (
                      <div className="space-y-3">
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
                              className="w-full bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-none-none p-2 text-xs text-slate-900 dark:text-white font-semibold outline-none focus:ring-2 focus:ring-primary-500"
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
                              className="w-full bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-none-none p-2 text-xs text-slate-900 dark:text-white font-mono font-bold outline-none focus:ring-2 focus:ring-primary-500"
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
                                className="w-full bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-none-none p-2 pr-8 text-xs text-slate-900 dark:text-white font-mono font-bold outline-none focus:ring-2 focus:ring-primary-500"
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
                                className="w-full bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-none-none p-2 pr-8 text-xs text-slate-900 dark:text-white font-mono font-bold outline-none focus:ring-2 focus:ring-primary-500"
                              />
                              <span className="absolute right-3 top-2 text-slate-400 font-bold text-xs">%</span>
                            </div>
                          </div>
                        </div>

                        {pbPhaseName && pbContractValue && pbCurrentPercent && (
                          <div className="bg-primary-50 dark:bg-primary-950/40 border border-primary-200 dark:border-primary-800 rounded-none-none p-3 text-xs">
                            <span className="block font-bold text-primary-900 dark:text-primary-300 mb-0.5">
                              Generated Line Item Preview:
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

                    {/* Hourly Form */}
                    {liMode === "hourly" && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Select Task</label>
                          <select
                            value={liTaskId}
                            onChange={(e) => setLiTaskId(e.target.value)}
                            className="w-full bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-none-none p-2 text-xs text-slate-900 dark:text-white"
                          >
                            <option value="">-- Choose Task --</option>
                            {projects.find((p) => p.id === sheetForm.projectId)?.tasks?.map((t) => (
                              <option key={t.id} value={t.id}>{t.name}</option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Select Team Member</label>
                          <select
                            value={liUserId}
                            onChange={(e) => setLiUserId(e.target.value)}
                            className="w-full bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-none-none p-2 text-xs text-slate-900 dark:text-white"
                          >
                            <option value="">-- Choose User --</option>
                            {orgUsers.map((u) => (
                              <option key={u.id} value={u.id}>{u.firstName} {u.lastName}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    )}

                    {/* Expense Form */}
                    {liMode === "expense" && (
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Select Unbilled Expense</label>
                        <select
                          value={liExpenseId}
                          onChange={(e) => setLiExpenseId(e.target.value)}
                          className="w-full bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-none-none p-2 text-xs text-slate-900 dark:text-white"
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

                    {/* Flat Fee Form */}
                    {liMode === "flat" && (
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div className="sm:col-span-2">
                          <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Description</label>
                          <input
                            type="text"
                            placeholder="e.g. Consulting Retainer or Fixed Fee"
                            value={liDescription}
                            onChange={(e) => setLiDescription(e.target.value)}
                            className="w-full bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-none-none p-2 text-xs text-slate-900 dark:text-white"
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
                            className="w-full bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-none-none p-2 text-xs text-slate-900 dark:text-white font-mono font-bold"
                          />
                        </div>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex justify-end gap-2 pt-2 border-t border-slate-200 dark:border-zinc-700">
                      <button
                        type="button"
                        onClick={() => setIsAddingLineItem(false)}
                        className="px-3 py-1.5 text-xs font-semibold text-slate-500 cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="bg-primary-600 hover:bg-primary-500 text-white font-bold px-5 py-2 rounded-none-none text-xs shadow-md transition-all cursor-pointer"
                      >
                        Add to Invoice
                      </button>
                    </div>

                  </form>
                )}
              </div>

              {/* Totals & Terms Footer Block */}
              <div className="pt-6 border-t border-slate-200 dark:border-zinc-800 grid grid-cols-1 sm:grid-cols-12 gap-8 items-start">
                
                {/* Notes & Terms (Live WYSIWYG Editable) */}
                <div className="sm:col-span-7">
                  <span className="block text-[11px] font-bold uppercase text-slate-400 mb-1">
                    Notes & Legal Terms
                  </span>
                  <textarea
                    rows="3"
                    value={sheetForm.notes}
                    onChange={(e) => handleFieldChange("notes", e.target.value)}
                    placeholder="Click to add payment instructions, wire details, or milestone notes..."
                    className="w-full text-xs text-slate-600 dark:text-slate-300 bg-slate-50/50 dark:bg-zinc-800/30 border border-transparent hover:border-slate-200 dark:hover:border-zinc-700 focus:border-primary-500 focus:bg-white dark:focus:bg-zinc-800 rounded-none-none p-3 resize-none transition-all outline-none leading-relaxed"
                  />
                </div>

                {/* Financial Summary */}
                <div className="sm:col-span-5 bg-slate-50 dark:bg-zinc-800/40 rounded-none-none p-4 border border-slate-200 dark:border-zinc-700/60 text-xs space-y-2">
                  <div className="flex justify-between py-0.5 text-slate-500">
                    <span>Subtotal:</span>
                    <span className="font-mono font-bold text-slate-900 dark:text-white">{formatMoney(subtotal)}</span>
                  </div>

                  {/* Tax Row (Live Editable) */}
                  <div className="flex justify-between items-center py-0.5 text-slate-500">
                    <div className="flex items-center gap-1">
                      <input
                        type="text"
                        value={sheetForm.taxName}
                        onChange={(e) => handleFieldChange("taxName", e.target.value)}
                        placeholder="Tax"
                        className="w-14 bg-transparent border-b border-dashed border-slate-300 text-xs font-semibold text-slate-600 dark:text-slate-400 outline-none"
                      />
                      <span>(</span>
                      <input
                        type="number"
                        step="0.1"
                        value={sheetForm.taxRate || ""}
                        onChange={(e) => handleFieldChange("taxRate", parseFloat(e.target.value) || 0)}
                        placeholder="0"
                        className="w-8 bg-transparent border-b border-dashed border-slate-300 text-xs font-semibold text-slate-600 dark:text-slate-400 outline-none text-right font-mono"
                      />
                      <span>%):</span>
                    </div>
                    <span className="font-mono font-bold text-slate-900 dark:text-white">{formatMoney(taxAmount)}</span>
                  </div>

                  <div className="flex justify-between pt-2 border-t border-slate-200 dark:border-zinc-700 text-sm font-black text-slate-900 dark:text-white">
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
