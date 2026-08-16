import React, { useState, useEffect } from "react";
import * as XLSX from "xlsx";
import html2pdf from "html2pdf.js";
import { useToast } from "../contexts/ToastContext";

export default function InvoicesTab({
  dbUser,
  projects,
  rawEntries,
  orgUsers,
  apiCall,
  taskRates,
  forceSync,
  expenses = [],
}) {
  const { addToast } = useToast();
  const [invoices, setInvoices] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeInvoice, setActiveInvoice] = useState(null);

  // Editor state
  const [isEditingHeader, setIsEditingHeader] = useState(false);
  const [headerForm, setHeaderForm] = useState({});
  const [isAddingLineItem, setIsAddingLineItem] = useState(false);

  // Add Line Item state
  const [liIsHourly, setLiIsHourly] = useState(false);
  const [liIsExpense, setLiIsExpense] = useState(false);
  const [liExpenseId, setLiExpenseId] = useState("");
  const [liDescription, setLiDescription] = useState("");
  const [liAmount, setLiAmount] = useState("");
  const [liProjectId, setLiProjectId] = useState("");
  const [liTaskId, setLiTaskId] = useState("");
  const [liUserId, setLiUserId] = useState("");

  const fetchInvoices = async () => {
    try {
      const data = await apiCall("/api/invoices", "GET");
      setInvoices(data);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoices();
  }, []);

  const handleCreateInvoice = async () => {
    try {
      const inv = await apiCall("/api/invoices", "POST");
      setInvoices([inv, ...invoices]);
      setActiveInvoice(inv);
      setHeaderForm(inv);
      setIsEditingHeader(true);
      forceSync(); // updates nextInvoiceNumber in App.jsx
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
      addToast("Header saved successfully", "success");
    } catch (e) {
      addToast("Failed to save header", "error");
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

  const handleAddLineItem = async (e) => {
    e.preventDefault();
    try {
      let payload = {
        description: liDescription,
        amount: parseFloat(liAmount) || 0,
        isHourly: false,
      };

      if (liIsHourly) {
        const { hours, rate, amount } = calculateHourlyData();
        payload = {
          description: liDescription || "Hourly Services",
          amount,
          isHourly: true,
          hours,
          rate,
          taskId: liTaskId,
          userId: liUserId,
        };
        if (hours === 0) {
          addToast("No unbilled hours found for this user and task.", "error");
          return;
        }
      } else {
        if (!liDescription || !liAmount) {
          addToast("Please provide description and amount", "error");
          return;
        }
      }

      if (liIsExpense) {
        const expense = expenses.find(e => e.id === liExpenseId);
        if (!expense) {
          addToast("Please select an expense", "error");
          return;
        }
        payload = {
          description: liDescription || expense.description,
          amount: expense.amount,
          isHourly: false,
        };
        // Also update the expense to link it to the invoice
        await apiCall(`/api/expenses/${expense.id}`, "PUT", { invoiceId: activeInvoice.id });
      }

      const updated = await apiCall(
        `/api/invoices/${activeInvoice.id}/line-items`,
        "POST",
        payload,
      );
      setActiveInvoice(updated);
      setInvoices(invoices.map((i) => (i.id === updated.id ? updated : i)));
      setIsAddingLineItem(false);

      setLiDescription("");
      setLiAmount("");
      setLiIsHourly(false);
      setLiIsExpense(false);
      setLiExpenseId("");
      setLiProjectId("");
      setLiTaskId("");
      setLiUserId("");

      if (liIsHourly || liIsExpense) forceSync();
      addToast("Line item added successfully", "success");
    } catch (e) {
      addToast("Failed to add line item", "error");
    }
  };

  const handleDeleteLineItem = async (itemId) => {
    if (!window.confirm("Are you sure you want to delete this line item?"))
      return;
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
    if (!window.confirm("Are you sure you want to delete this entire invoice?"))
      return;
    try {
      await apiCall(`/api/invoices/${activeInvoice.id}`, "DELETE");
      setInvoices(invoices.filter((i) => i.id !== activeInvoice.id));
      setActiveInvoice(null);
      forceSync();
      addToast("Invoice deleted", "success");
    } catch (e) {
      addToast("Failed to delete invoice", "error");
    }
  };

  const formatDate = (d) => (d ? new Date(d).toLocaleDateString() : "N/A");
  const formatMoney = (m) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(m || 0);

  const handleExportPDF = () => {
    window.print();
  };

  const handleExportExcel = () => {
    if (!activeInvoice) return;
    const totalAmount =
      activeInvoice.lineItems?.reduce((sum, li) => sum + li.amount, 0) || 0;

    const aoa = [
      ["INVOICE"],
      [],
      ["Invoice Number:", activeInvoice.invoiceNumber || "Draft"],
      ["Client Name:", activeInvoice.clientName || "Unspecified"],
      ["Client Address:", activeInvoice.clientAddress || ""],
      ["Date Issued:", formatDate(activeInvoice.dateIssued)],
      ["Due Date:", formatDate(activeInvoice.dueDate)],
      ["Status:", (activeInvoice.status || "draft").toUpperCase()],
      [],
      ["LINE ITEMS"],
      ["Description", "Type", "Rate/Hr", "Amount"],
    ];

    (activeInvoice.lineItems || []).forEach((li) => {
      aoa.push([
        li.description,
        li.isHourly ? `${li.hours} hrs` : "Flat",
        li.isHourly ? li.rate : "",
        li.amount,
      ]);
    });

    aoa.push([]);
    aoa.push(["", "", "TOTAL:", totalAmount]);

    const ws = XLSX.utils.aoa_to_sheet(aoa);
    ws["!cols"] = [{ wch: 40 }, { wch: 15 }, { wch: 15 }, { wch: 15 }];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Invoice");
    XLSX.writeFile(
      wb,
      `Invoice_${activeInvoice.invoiceNumber || "Draft"}.xlsx`,
    );
  };

  if (activeInvoice) {
    const subtotal =
      activeInvoice.lineItems?.reduce((sum, li) => sum + li.amount, 0) || 0;
    const taxAmount = activeInvoice.taxRate
      ? subtotal * (activeInvoice.taxRate / 100)
      : 0;
    const totalAmount = subtotal + taxAmount;
    const hourlyData = liIsHourly ? calculateHourlyData() : null;

    return (
      <div className="flex-1 flex flex-col p-8 bg-slate-50 dark:bg-zinc-950 overflow-y-auto transition-colors">
        <div className="max-w-4xl mx-auto w-full">
          <div className="flex justify-between items-center mb-6">
            <button
              onClick={() => {
                setActiveInvoice(null);
                setIsEditingHeader(false);
              }}
              className="text-slate-500 dark:text-slate-500 hover:text-slate-900 dark:text-slate-100 flex items-center gap-1 font-semibold transition-colors"
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
                  strokeWidth="2"
                  d="M15 19l-7-7 7-7"
                />
              </svg>
              Back to Invoices
            </button>
            <div className="flex gap-4">
              <div className="flex items-center">
                <button
                  onClick={async () => {
                    try {
                      const res = await apiCall(`/api/invoices/${activeInvoice.id}/export-qbo`, "POST");
                      if (res.success) addToast("Invoice successfully exported to QuickBooks!", "success");
                    } catch (e) {
                      addToast("Failed to export to QuickBooks. Please make sure you are connected in Settings.", "error");
                    }
                  }}
                  className="text-slate-600 dark:text-slate-400 dark:text-slate-600 hover:text-green-600 font-semibold text-sm mr-2 pr-4 border-r border-slate-300 dark:border-zinc-700"
                >
                  Export to QBO
                </button>
                <a
                  href={`http://localhost:8080/api/invoices/${activeInvoice.id}/pdf`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-slate-600 dark:text-slate-400 dark:text-slate-600 hover:text-slate-900 dark:text-slate-100 font-semibold text-sm mr-2 pr-4 border-r border-slate-300 dark:border-zinc-700"
                >
                  Download PDF
                </a>
                <button
                  onClick={handleExportExcel}
                  className="text-slate-600 dark:text-slate-400 dark:text-slate-600 hover:text-slate-900 dark:text-slate-100 font-semibold text-sm"
                >
                  Export Excel
                </button>
                <button
                  onClick={handleDeleteInvoice}
                  className="text-red-500 hover:text-red-600 font-semibold text-sm ml-2 border-l border-slate-300 dark:border-zinc-700 pl-4"
                >
                  Delete Invoice
                </button>
              </div>
            </div>
          </div>

          <div
            id="invoice-print-area"
            className="bg-white dark:bg-zinc-900 border-0 sm:border sm:border-slate-300 dark:border-zinc-700 p-8 md:p-12 mb-6 max-w-4xl mx-auto text-slate-900 dark:text-slate-100 font-sans sm:"
          >
            {/* Header: Logo and Invoice Info */}
            <div className="flex justify-between items-start mb-12">
              <div>
                {dbUser?.organization?.logoBase64 && (
                  <img
                    src={dbUser.organization.logoBase64}
                    alt="Company Logo"
                    className="h-16 w-auto object-contain mb-4"
                  />
                )}
                <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                  {dbUser?.organization?.name || "Company Name"}
                </h2>
              </div>
              <div className="text-right">
                <h1 className="text-4xl font-light text-slate-400 dark:text-slate-600 mb-4 tracking-wider uppercase">
                  Invoice
                </h1>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm justify-items-end text-right">
                  <span className="font-semibold text-slate-500 dark:text-slate-500">
                    Invoice Number:
                  </span>
                  <span className="text-slate-900 dark:text-slate-100">
                    {activeInvoice.invoiceNumber}
                  </span>

                  <span className="font-semibold text-slate-500 dark:text-slate-500">
                    Date Issued:
                  </span>
                  <span className="text-slate-900 dark:text-slate-100">
                    {formatDate(activeInvoice.dateIssued)}
                  </span>

                  <span className="font-semibold text-slate-500 dark:text-slate-500">
                    Due Date:
                  </span>
                  <span className="text-slate-900 dark:text-slate-100">
                    {formatDate(activeInvoice.dueDate)}
                  </span>
                </div>
              </div>
            </div>

            {/* Edit Mode Toggle for Header */}
            <div className="print:hidden mb-8 border-b border-slate-300 dark:border-zinc-700 pb-4">
              {!isEditingHeader ? (
                <button
                  onClick={() => {
                    setHeaderForm(activeInvoice);
                    setIsEditingHeader(true);
                  }}
                  className="bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 px-4 py-2 rounded text-sm font-semibold transition-colors"
                >
                  Edit Invoice Details
                </button>
              ) : (
                <form
                  onSubmit={handleSaveHeader}
                  className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 dark:bg-zinc-950 p-4 border border-slate-300 dark:border-zinc-700"
                >
                  <div>
                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-500 uppercase mb-1">
                      Client Name
                    </label>
                    <input
                      type="text"
                      value={headerForm.clientName || ""}
                      onChange={(e) =>
                        setHeaderForm({
                          ...headerForm,
                          clientName: e.target.value,
                        })
                      }
                      className="w-full border border-slate-300 dark:border-zinc-700 p-2 bg-white dark:bg-zinc-900 text-slate-900 dark:text-slate-100"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-500 uppercase mb-1">
                      Client Address
                    </label>
                    <input
                      type="text"
                      value={headerForm.clientAddress || ""}
                      onChange={(e) =>
                        setHeaderForm({
                          ...headerForm,
                          clientAddress: e.target.value,
                        })
                      }
                      className="w-full border border-slate-300 dark:border-zinc-700 p-2 bg-white dark:bg-zinc-900 text-slate-900 dark:text-slate-100"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-500 uppercase mb-1">
                      Date Issued
                    </label>
                    <input
                      type="date"
                      value={
                        headerForm.dateIssued
                          ? new Date(headerForm.dateIssued)
                              .toISOString()
                              .split("T")[0]
                          : ""
                      }
                      onChange={(e) =>
                        setHeaderForm({
                          ...headerForm,
                          dateIssued: e.target.value
                            ? new Date(e.target.value).toISOString()
                            : null,
                        })
                      }
                      className="w-full border border-slate-300 dark:border-zinc-700 p-2 bg-white dark:bg-zinc-900 text-slate-900 dark:text-slate-100"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-500 uppercase mb-1">
                      Due Date
                    </label>
                    <input
                      type="date"
                      value={
                        headerForm.dueDate
                          ? new Date(headerForm.dueDate)
                              .toISOString()
                              .split("T")[0]
                          : ""
                      }
                      onChange={(e) =>
                        setHeaderForm({
                          ...headerForm,
                          dueDate: e.target.value
                            ? new Date(e.target.value).toISOString()
                            : null,
                        })
                      }
                      className="w-full border border-slate-300 dark:border-zinc-700 p-2 bg-white dark:bg-zinc-900 text-slate-900 dark:text-slate-100"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-500 uppercase mb-1">
                      Status
                    </label>
                    <select
                      value={headerForm.status || "draft"}
                      onChange={(e) =>
                        setHeaderForm({ ...headerForm, status: e.target.value })
                      }
                      className="w-full border border-slate-300 dark:border-zinc-700 p-2 bg-white dark:bg-zinc-900 text-slate-900 dark:text-slate-100"
                    >
                      <option value="draft">Draft</option>
                      <option value="pending">Pending</option>
                      <option value="paid">Paid</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-500 uppercase mb-1">
                      Tax Name
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. VAT"
                      value={headerForm.taxName || ""}
                      onChange={(e) =>
                        setHeaderForm({ ...headerForm, taxName: e.target.value })
                      }
                      className="w-full border border-slate-300 dark:border-zinc-700 p-2 bg-white dark:bg-zinc-900 text-slate-900 dark:text-slate-100"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-500 uppercase mb-1">
                      Tax Rate (%)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={headerForm.taxRate || ""}
                      onChange={(e) =>
                        setHeaderForm({ ...headerForm, taxRate: parseFloat(e.target.value) || 0 })
                      }
                      className="w-full border border-slate-300 dark:border-zinc-700 p-2 bg-white dark:bg-zinc-900 text-slate-900 dark:text-slate-100"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-500 uppercase mb-1">
                      Notes & Terms (Legal / Disclaimer)
                    </label>
                    <textarea
                      value={headerForm.notes || ""}
                      onChange={(e) =>
                        setHeaderForm({ ...headerForm, notes: e.target.value })
                      }
                      className="w-full border border-slate-300 dark:border-zinc-700 p-2 bg-white dark:bg-zinc-900 text-slate-900 dark:text-slate-100"
                      rows="3"
                      placeholder="Thank you for your business! Payment is due within 15 days..."
                    ></textarea>
                  </div>
                  <div className="md:col-span-2 flex justify-end gap-2 mt-2">
                    <button
                      type="button"
                      onClick={() => setIsEditingHeader(false)}
                      className="px-4 py-2 font-medium text-slate-500 dark:text-slate-500"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="bg-gray-900 text-white px-4 py-2 font-bold"
                    >
                      Save Details
                    </button>
                  </div>
                </form>
              )}
            </div>

            {/* Bill To */}
            {!isEditingHeader && (
              <div className="mb-10 flex justify-between items-end">
                <div>
                  <h3 className="text-sm font-bold text-slate-400 dark:text-slate-600 uppercase mb-2">
                    Bill To
                  </h3>
                  <div className="text-slate-900 dark:text-slate-100">
                    <div className="font-bold text-lg">
                      {activeInvoice.clientName || "Unspecified Client"}
                    </div>
                    <div className="whitespace-pre-wrap mt-1 text-sm">
                      {activeInvoice.clientAddress}
                    </div>
                  </div>
                </div>
                <div className="text-right print:hidden">
                  <h3 className="text-sm font-bold text-slate-400 dark:text-slate-600 uppercase mb-1">
                    Status
                  </h3>
                  <span
                    className={`px-3 py-1 border text-sm font-bold uppercase tracking-wider ${activeInvoice.status === "paid" ? "border-green-500 text-green-600" : activeInvoice.status === "pending" ? "border-yellow-500 text-yellow-600" : "border-slate-300 dark:border-zinc-700 text-slate-500 dark:text-slate-500"}`}
                  >
                    {activeInvoice.status}
                  </span>
                </div>
              </div>
            )}

            {/* Line Items Table */}
            <table className="w-full text-left text-sm mb-8 border-collapse">
              <thead>
                <tr className="border-y-2 border-slate-300 dark:border-zinc-700 text-slate-900 dark:text-slate-100 font-bold uppercase tracking-wider text-xs">
                  <th className="py-3 px-2">Description</th>
                  <th className="py-3 px-2 text-center">Qty / Type</th>
                  <th className="py-3 px-2 text-right">Rate</th>
                  <th className="py-3 px-2 text-right">Amount</th>
                  <th className="py-3 px-2 w-12 print:hidden"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {activeInvoice.lineItems?.map((li) => (
                  <tr key={li.id} className="hover:bg-slate-50 dark:bg-zinc-950">
                    <td className="py-4 px-2 font-medium text-slate-900 dark:text-slate-100">
                      {li.description}
                    </td>
                    <td className="py-4 px-2 text-center text-slate-600 dark:text-slate-400 dark:text-slate-600">
                      {li.isHourly ? `${li.hours} hrs` : "Custom"}
                    </td>
                    <td className="py-4 px-2 text-right text-slate-600 dark:text-slate-400 dark:text-slate-600">
                      {li.isHourly ? formatMoney(li.rate) : "-"}
                    </td>
                    <td className="py-4 px-2 text-right font-bold text-slate-900 dark:text-slate-100">
                      {formatMoney(li.amount)}
                    </td>
                    <td className="py-4 px-2 text-right print:hidden">
                      <button
                        onClick={() => handleDeleteLineItem(li.id)}
                        className="text-slate-400 dark:text-slate-600 hover:text-red-500"
                      >
                        <svg
                          className="w-4 h-4 inline-block"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                          />
                        </svg>
                      </button>
                    </td>
                  </tr>
                ))}
                {!activeInvoice.lineItems?.length && (
                  <tr>
                    <td colSpan="5" className="py-8 text-center text-slate-400 dark:text-slate-600">
                      No line items added yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>

            {/* Totals & Notes */}
            <div className="flex flex-col md:flex-row justify-between items-start mb-8 gap-8">
              <div className="flex-1 max-w-lg mt-8 md:mt-0">
                {activeInvoice.notes ? (
                  <div className="bg-slate-50 dark:bg-zinc-950 p-4 border border-slate-300 dark:border-zinc-700">
                    <span className="block text-xs font-bold text-slate-500 dark:text-slate-500 uppercase mb-2 tracking-wider">
                      Notes & Terms
                    </span>
                    <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">
                      {activeInvoice.notes}
                    </p>
                  </div>
                ) : (
                  <div className="text-sm text-slate-400 dark:text-slate-600 italic">
                    No notes or legal terms added.
                  </div>
                )}
              </div>
              <div className="w-full md:w-64 border-t-2 border-slate-300 dark:border-zinc-700 pt-4 text-right">
                <div className="flex justify-between items-center text-sm font-semibold text-slate-500 dark:text-slate-500 mb-2">
                  <span>Subtotal</span>
                  <span>{formatMoney(subtotal)}</span>
                </div>
                {activeInvoice.taxRate > 0 && (
                  <div className="flex justify-between items-center text-sm font-semibold text-slate-500 dark:text-slate-500 mb-2">
                    <span>{activeInvoice.taxName || 'Tax'} ({activeInvoice.taxRate}%)</span>
                    <span>{formatMoney(taxAmount)}</span>
                  </div>
                )}
                <div className="flex justify-between items-center text-lg font-bold text-slate-900 dark:text-slate-100 mt-2 border-t border-slate-200 dark:border-zinc-700 pt-2">
                  <span>Total</span>
                  <span>{formatMoney(totalAmount)}</span>
                </div>
              </div>
            </div>

            {/* Add Line Item Form (Hidden on Print) */}
            <div className="print:hidden border-t border-slate-300 dark:border-zinc-700 pt-8 mt-8">
              {!isAddingLineItem ? (
                <button
                  onClick={() => setIsAddingLineItem(true)}
                  className="text-slate-600 dark:text-slate-400 dark:text-slate-600 hover:text-slate-900 dark:text-slate-100 font-bold text-sm flex items-center gap-2"
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M12 4v16m8-8H4"
                    />
                  </svg>
                  Add Custom Line Item (Tax, Discount, Fee...)
                </button>
              ) : (
                <form
                  onSubmit={handleAddLineItem}
                  className="bg-slate-50 dark:bg-zinc-950 p-6 rounded border border-slate-300 dark:border-zinc-700"
                >
                  <div className="flex flex-wrap items-center gap-6 mb-6 pb-4 border-b border-slate-300 dark:border-zinc-700">
                    <label className="flex items-center gap-2 font-bold text-slate-700 dark:text-slate-300 cursor-pointer select-none">
                      <input
                        type="radio"
                        checked={!liIsHourly && !liIsExpense}
                        onChange={() => { setLiIsHourly(false); setLiIsExpense(false); }}
                        className="w-4 h-4 text-slate-900 dark:text-slate-100 focus:ring-gray-900 border-slate-300 dark:border-zinc-700"
                      />
                      Flat Fee
                    </label>
                    <label className="flex items-center gap-2 font-bold text-slate-700 dark:text-slate-300 cursor-pointer select-none">
                      <input
                        type="radio"
                        checked={liIsHourly}
                        onChange={() => { setLiIsHourly(true); setLiIsExpense(false); }}
                        className="w-4 h-4 text-slate-900 dark:text-slate-100 focus:ring-gray-900 border-slate-300 dark:border-zinc-700"
                      />
                      Hourly Task
                    </label>
                    <label className="flex items-center gap-2 font-bold text-slate-700 dark:text-slate-300 cursor-pointer select-none">
                      <input
                        type="radio"
                        checked={liIsExpense}
                        onChange={() => { setLiIsExpense(true); setLiIsHourly(false); }}
                        className="w-4 h-4 text-slate-900 dark:text-slate-100 focus:ring-gray-900 border-slate-300 dark:border-zinc-700"
                      />
                      Unbilled Expense
                    </label>
                  </div>

                  {liIsHourly ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-500 dark:text-slate-500 uppercase mb-1">
                          Select Project
                        </label>
                        <select
                          value={liProjectId}
                          onChange={(e) => {
                            setLiProjectId(e.target.value);
                            setLiTaskId("");
                          }}
                          className="w-full border border-slate-300 dark:border-zinc-700 p-2 bg-white dark:bg-zinc-900 text-slate-900 dark:text-slate-100"
                        >
                          <option value="">-- Choose Project --</option>
                          {projects.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.name}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-500 dark:text-slate-500 uppercase mb-1">
                          Select Phase / Task
                        </label>
                        <select
                          value={liTaskId}
                          onChange={(e) => setLiTaskId(e.target.value)}
                          disabled={!liProjectId}
                          className="w-full border border-slate-300 dark:border-zinc-700 p-2 bg-white dark:bg-zinc-900 text-slate-900 dark:text-slate-100 disabled:opacity-50"
                        >
                          <option value="">-- Choose Task --</option>
                          {projects
                            .find((p) => p.id === liProjectId)
                            ?.tasks.map((t) => (
                              <option key={t.id} value={t.id}>
                                {t.name}
                              </option>
                            ))}
                        </select>
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-xs font-bold text-slate-500 dark:text-slate-500 uppercase mb-1">
                          Select Team Member
                        </label>
                        <select
                          value={liUserId}
                          onChange={(e) => setLiUserId(e.target.value)}
                          className="w-full border border-slate-300 dark:border-zinc-700 p-2 bg-white dark:bg-zinc-900 text-slate-900 dark:text-slate-100"
                        >
                          <option value="">-- Choose User --</option>
                          {orgUsers.map((u) => (
                            <option key={u.id} value={u.id}>
                              {u.firstName} {u.lastName}
                            </option>
                          ))}
                        </select>
                      </div>

                      {liTaskId && liUserId && hourlyData && (
                        <div className="md:col-span-2 mt-2 bg-white dark:bg-zinc-900 p-4 flex items-center justify-between border border-slate-300 dark:border-zinc-700">
                          <div>
                            <div className="text-sm text-slate-900 dark:text-slate-100 font-medium">
                              Unbilled Hours Found:{" "}
                              <span className="font-bold">
                                {hourlyData.hours}
                              </span>
                            </div>
                            <div className="text-xs text-slate-500 dark:text-slate-500 mt-1">
                              Billing Rate: {formatMoney(hourlyData.rate)} / hr
                            </div>
                          </div>
                          <div className="text-xl font-bold text-slate-900 dark:text-slate-100">
                            {formatMoney(hourlyData.amount)}
                          </div>
                        </div>
                      )}

                      <div className="md:col-span-2 mt-2">
                        <label className="block text-xs font-bold text-slate-500 dark:text-slate-500 uppercase mb-1">
                          Optional Description Override
                        </label>
                        <input
                          type="text"
                          value={liDescription}
                          onChange={(e) => setLiDescription(e.target.value)}
                          placeholder="Leave blank to use default"
                          className="w-full border border-slate-300 dark:border-zinc-700 p-2 bg-white dark:bg-zinc-900 text-slate-900 dark:text-slate-100"
                        />
                      </div>
                    </div>
                  ) : liIsExpense ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="md:col-span-2">
                        <label className="block text-xs font-bold text-slate-500 dark:text-slate-500 uppercase mb-1">
                          Select Unbilled Expense
                        </label>
                        <select
                          value={liExpenseId}
                          onChange={(e) => setLiExpenseId(e.target.value)}
                          className="w-full border border-slate-300 dark:border-zinc-700 p-2 bg-white dark:bg-zinc-900 text-slate-900 dark:text-slate-100"
                        >
                          <option value="">-- Choose Expense --</option>
                          {expenses
                            .filter(e => e.isBillable && !e.invoiceId)
                            .map((e) => (
                              <option key={e.id} value={e.id}>
                                {new Date(e.date).toLocaleDateString()} - {e.description} (${e.amount})
                              </option>
                            ))}
                        </select>
                        {expenses.filter(e => e.isBillable && !e.invoiceId).length === 0 && (
                          <div className="text-xs text-amber-600 mt-2">No unbilled expenses found. Log some in the Expenses tab.</div>
                        )}
                      </div>
                      {liExpenseId && (
                        <div className="md:col-span-2 mt-2">
                          <label className="block text-xs font-bold text-slate-500 dark:text-slate-500 uppercase mb-1">
                            Optional Description Override
                          </label>
                          <input
                            type="text"
                            value={liDescription}
                            onChange={(e) => setLiDescription(e.target.value)}
                            placeholder="Leave blank to use default"
                            className="w-full border border-slate-300 dark:border-zinc-700 p-2 bg-white dark:bg-zinc-900 text-slate-900 dark:text-slate-100"
                          />
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="md:col-span-2">
                        <label className="block text-xs font-bold text-slate-500 dark:text-slate-500 uppercase mb-1">
                          Description
                        </label>
                        <input
                          type="text"
                          required
                          value={liDescription}
                          onChange={(e) => setLiDescription(e.target.value)}
                          className="w-full border border-slate-300 dark:border-zinc-700 p-2 bg-white dark:bg-zinc-900 text-slate-900 dark:text-slate-100"
                        />
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-xs font-bold text-slate-500 dark:text-slate-500 uppercase mb-1">
                          Flat Amount ($)
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          required
                          value={liAmount}
                          onChange={(e) => setLiAmount(e.target.value)}
                          className="w-full border border-slate-300 dark:border-zinc-700 p-2 bg-white dark:bg-zinc-900 text-slate-900 dark:text-slate-100"
                        />
                      </div>
                    </div>
                  )}

                  <div className="flex justify-end gap-2 mt-6">
                    <button
                      type="button"
                      onClick={() => setIsAddingLineItem(false)}
                      className="px-4 py-2 font-medium text-slate-500 dark:text-slate-500"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="bg-gray-900 text-white px-6 py-2 rounded font-bold "
                    >
                      {liIsHourly ? "Generate Line Item" : "Add Line Item"}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // --- List View ---
  return (
    <div className="flex-1 flex flex-col p-8 bg-slate-50 dark:bg-zinc-950 overflow-y-auto transition-colors">
      <div className="max-w-4xl mx-auto w-full">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-6">Invoices</h1>

        <div className="flex justify-end mb-6">
          <button
            onClick={handleCreateInvoice}
            className="bg-gray-900 text-white px-4 py-2 font-medium flex items-center gap-2 hover:bg-gray-800 transition-colors"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M12 4v16m8-8H4"
              />
            </svg>
            Create Draft Invoice
          </button>
        </div>

        {isLoading ? (
          <div className="text-center text-slate-400 dark:text-slate-600 py-12">
            Loading invoices...
          </div>
        ) : invoices.length === 0 ? (
          <div className="flex flex-col items-center justify-center bg-white dark:bg-zinc-900 border border-slate-300 dark:border-zinc-700 py-20 px-6 text-center">
            <div className="bg-primary-50 text-primary-600 w-16 h-16 flex items-center justify-center mb-4">
              <svg
                className="w-8 h-8"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-2">
              No Invoices Yet
            </h3>
            <p className="text-slate-500 dark:text-slate-500 max-w-sm mb-6">
              Create your first draft invoice to start billing your clients for
              tracked time.
            </p>
            <button
              onClick={handleCreateInvoice}
              className="bg-gray-900 text-white font-bold py-2 px-6 "
            >
              Create First Invoice
            </button>
          </div>
        ) : (
          <div className="bg-white dark:bg-zinc-900 border border-slate-300 dark:border-zinc-700 overflow-hidden transition-colors">
            <table className="w-full text-left text-sm text-slate-600 dark:text-slate-400 dark:text-slate-600 ">
              <thead className="bg-slate-50 dark:bg-zinc-950 border-b border-slate-300 dark:border-zinc-700 text-slate-900 dark:text-slate-100 font-semibold transition-colors">
                <tr>
                  <th className="px-6 py-4">Invoice ID</th>
                  <th className="px-6 py-4">Client</th>
                  <th className="px-6 py-4">Date Issued</th>
                  <th className="px-6 py-4">Amount</th>
                  <th className="px-6 py-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 ">
                {invoices.map((inv) => (
                  <tr
                    key={inv.id}
                    onClick={() => setActiveInvoice(inv)}
                    className="cursor-pointer hover:bg-slate-50 dark:bg-zinc-950 transition-colors"
                  >
                    <td className="px-6 py-4 font-bold text-slate-900 dark:text-slate-100 ">
                      {inv.invoiceNumber}
                    </td>
                    <td className="px-6 py-4">
                      {inv.clientName || (
                        <span className="text-slate-400 dark:text-slate-600 italic">
                          Unspecified
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4">{formatDate(inv.dateIssued)}</td>
                    <td className="px-6 py-4 font-semibold text-slate-900 dark:text-slate-100 ">
                      {formatMoney(
                        inv.lineItems?.reduce(
                          (sum, li) => sum + li.amount,
                          0,
                        ) || 0,
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`px-2.5 py-0.5 text-xs font-bold uppercase ${inv.status === "paid" ? "bg-green-100 text-green-700" : inv.status === "pending" ? "bg-yellow-100 text-yellow-700" : "bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-slate-400 dark:text-slate-600"}`}
                      >
                        {inv.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
