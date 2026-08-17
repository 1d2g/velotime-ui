import React, { useState, useEffect } from "react";
import { privacyPolicyHtml } from "../content/privacy.js";
import { tosHtml } from "../content/tos.js";
import { cookiesHtml } from "../content/cookies.js";

function PublicInvoiceView({ invoiceId }) {
  const [invoice, setInvoice] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isPaying, setIsPaying] = useState(false);

  useEffect(() => {
    const fetchInvoice = async () => {
      try {
        const apiUrl = import.meta.env.VITE_API_URL || "";
        const res = await fetch(`${apiUrl}/api/public/invoices/${invoiceId}`);
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || "Invoice not found or expired.");
        }
        const data = await res.json();
        setInvoice(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    if (invoiceId) {
      fetchInvoice();
    }
  }, [invoiceId]);

  const handlePay = async () => {
    setIsPaying(true);
    try {
      const apiUrl = import.meta.env.VITE_API_URL || "";
      const res = await fetch(`${apiUrl}/api/public/invoices/${invoiceId}/create-checkout`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Failed to initiate payment session.");
      }

      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (err) {
      alert("Payment Error: " + err.message);
      setIsPaying(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const formatMoney = (amount) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount || 0);
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "N/A";
    return new Date(dateStr).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const searchParams = new URLSearchParams(window.location.search);
  const paymentStatus = searchParams.get("payment");

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-zinc-950 flex flex-col items-center justify-center p-4">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-slate-900 dark:border-white mb-4"></div>
        <p className="text-slate-600 dark:text-slate-400 font-medium text-sm">Loading Invoice...</p>
      </div>
    );
  }

  if (error || !invoice) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-zinc-950 flex flex-col items-center justify-center p-4">
        <div className="max-w-md w-full bg-white dark:bg-zinc-900 border border-slate-300 dark:border-zinc-700 p-8 text-center shadow-sm">
          <div className="w-12 h-12 bg-red-100 dark:bg-red-900/30 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4 font-bold text-xl">
            !
          </div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-2">Invoice Not Found</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
            {error || "The invoice you are trying to view does not exist or has been removed."}
          </p>
          <a
            href="/"
            className="inline-block px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold transition-colors"
          >
            Go to VeloTime
          </a>
        </div>
      </div>
    );
  }

  const isPaid = invoice.status === "paid" || paymentStatus === "success";

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-zinc-950 text-slate-900 dark:text-slate-100 py-8 px-4 sm:px-6 lg:px-8 font-sans selection:bg-slate-900 selection:text-white">
      {/* Top Banner / Actions Bar */}
      <div className="max-w-4xl mx-auto mb-6 flex flex-col sm:flex-row items-center justify-between gap-4 print:hidden">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold uppercase tracking-widest text-slate-400 dark:text-slate-600">
            Powered by VeloTime
          </span>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handlePrint}
            className="px-4 py-2 bg-white dark:bg-zinc-900 border border-slate-300 dark:border-zinc-700 text-slate-700 dark:text-slate-300 text-sm font-bold hover:bg-slate-50 dark:hover:bg-zinc-800 transition-all flex items-center gap-2 shadow-sm"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            Print / Save PDF
          </button>

          {!isPaid && invoice.organization?.canAcceptPayments && (
            <button
              onClick={handlePay}
              disabled={isPaying}
              className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold transition-all flex items-center gap-2 shadow-sm disabled:opacity-50"
            >
              {isPaying ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Redirecting to Stripe...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                  </svg>
                  Pay {formatMoney(invoice.totalAmount)}
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Payment Success Alert */}
      {paymentStatus === "success" && (
        <div className="max-w-4xl mx-auto mb-6 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-700 p-4 flex items-center gap-3 text-emerald-800 dark:text-emerald-200">
          <svg className="w-5 h-5 text-emerald-600 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
          <div className="text-sm font-medium">
            Payment successful! Thank you for your payment. This invoice is now marked as paid in full.
          </div>
        </div>
      )}

      {/* Main Invoice Sheet */}
      <div className="max-w-4xl mx-auto bg-white dark:bg-zinc-900 border border-slate-300 dark:border-zinc-700 p-8 sm:p-12 shadow-sm">
        {/* Header Block */}
        <div className="flex flex-col sm:flex-row justify-between items-start gap-6 mb-12 border-b border-slate-200 dark:border-zinc-800 pb-8">
          <div>
            {invoice.organization?.logoBase64 && (
              <img
                src={invoice.organization.logoBase64}
                alt="Company Logo"
                className="h-14 w-auto object-contain mb-4"
              />
            )}
            <h1 className="text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
              {invoice.organization?.name || "Organization"}
            </h1>
          </div>

          <div className="text-left sm:text-right flex flex-col items-start sm:items-end">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-2xl font-black tracking-tight text-slate-900 dark:text-slate-100 uppercase">
                INVOICE
              </span>
              <span className={`px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider rounded ${
                isPaid 
                  ? "bg-emerald-100 text-emerald-800 border border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-700"
                  : "bg-amber-100 text-amber-800 border border-amber-300 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-700"
              }`}>
                {isPaid ? "PAID" : "UNPAID"}
              </span>
            </div>
            <div className="text-sm font-semibold text-slate-500 dark:text-slate-400">
              #{invoice.invoiceNumber || "Draft"}
            </div>
            {isPaid && invoice.paidAt && (
              <div className="text-xs font-medium text-emerald-600 dark:text-emerald-400 mt-1">
                Paid on {formatDate(invoice.paidAt)} {invoice.paymentMethod ? `via ${invoice.paymentMethod}` : ""}
              </div>
            )}
          </div>
        </div>

        {/* Metadata & Bill To Block */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 mb-12">
          <div>
            <span className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-2">
              Billed To
            </span>
            <div className="text-base font-bold text-slate-900 dark:text-slate-100">
              {invoice.clientName || "Unspecified Client"}
            </div>
            {invoice.clientAddress && (
              <div className="text-sm text-slate-500 dark:text-slate-400 whitespace-pre-line mt-1">
                {invoice.clientAddress}
              </div>
            )}
          </div>

          <div className="flex flex-col sm:items-end justify-start gap-2">
            <div className="flex justify-between sm:justify-end gap-6 text-sm">
              <span className="text-slate-400 dark:text-slate-500 font-medium">Date Issued:</span>
              <span className="font-semibold text-slate-900 dark:text-slate-100">{formatDate(invoice.dateIssued)}</span>
            </div>
            {invoice.dueDate && (
              <div className="flex justify-between sm:justify-end gap-6 text-sm">
                <span className="text-slate-400 dark:text-slate-500 font-medium">Due Date:</span>
                <span className="font-semibold text-slate-900 dark:text-slate-100">{formatDate(invoice.dueDate)}</span>
              </div>
            )}
            <div className="flex justify-between sm:justify-end gap-6 text-sm">
              <span className="text-slate-400 dark:text-slate-500 font-medium">Amount Due:</span>
              <span className="font-bold text-base text-slate-900 dark:text-slate-100">
                {isPaid ? "$0.00" : formatMoney(invoice.totalAmount)}
              </span>
            </div>
          </div>
        </div>

        {/* Line Items Table */}
        <div className="border border-slate-200 dark:border-zinc-800 mb-8 overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-zinc-950/60 border-b border-slate-200 dark:border-zinc-800 text-xs font-bold text-slate-500 uppercase tracking-wider">
                <th className="py-3.5 px-4">Description</th>
                <th className="py-3.5 px-4 text-center">Qty / Hours</th>
                <th className="py-3.5 px-4 text-right">Rate</th>
                <th className="py-3.5 px-4 text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-zinc-800 text-sm">
              {invoice.lineItems?.map((li) => (
                <tr key={li.id} className="hover:bg-slate-50/50 dark:hover:bg-zinc-950/20">
                  <td className="py-4 px-4 font-medium text-slate-900 dark:text-slate-100">
                    {li.description}
                  </td>
                  <td className="py-4 px-4 text-center text-slate-600 dark:text-slate-400 font-mono text-xs">
                    {li.isHourly ? `${parseFloat(li.hours).toFixed(2)} hrs` : "1 (Flat)"}
                  </td>
                  <td className="py-4 px-4 text-right text-slate-600 dark:text-slate-400 font-mono text-xs">
                    {li.isHourly && li.rate ? formatMoney(li.rate) : "—"}
                  </td>
                  <td className="py-4 px-4 text-right font-bold text-slate-900 dark:text-slate-100">
                    {formatMoney(li.amount)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Summary / Totals */}
        <div className="flex flex-col sm:flex-row justify-between items-start gap-8">
          <div className="flex-1 text-sm text-slate-500 dark:text-slate-400">
            {invoice.notes && (
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 block mb-1">
                  Notes
                </span>
                <p className="whitespace-pre-line">{invoice.notes}</p>
              </div>
            )}
          </div>

          <div className="w-full sm:w-72 bg-slate-50 dark:bg-zinc-950/60 p-4 border border-slate-200 dark:border-zinc-800 flex flex-col gap-2.5">
            <div className="flex justify-between items-center text-sm">
              <span className="text-slate-500 dark:text-slate-400 font-medium">Subtotal</span>
              <span className="font-semibold text-slate-900 dark:text-slate-100">{formatMoney(invoice.subtotal)}</span>
            </div>

            {invoice.taxRate > 0 && (
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-500 dark:text-slate-400 font-medium">
                  {invoice.taxName || "Tax"} ({invoice.taxRate}%)
                </span>
                <span className="font-semibold text-slate-900 dark:text-slate-100">{formatMoney(invoice.taxAmount)}</span>
              </div>
            )}

            <div className="border-t border-slate-200 dark:border-zinc-800 pt-2.5 flex justify-between items-center">
              <span className="text-base font-black text-slate-900 dark:text-slate-100">Total</span>
              <span className="text-xl font-black text-slate-900 dark:text-slate-100">{formatMoney(invoice.totalAmount)}</span>
            </div>
          </div>
        </div>

        {/* Payment CTA Footer */}
        {!isPaid && invoice.organization?.canAcceptPayments && (
          <div className="mt-12 border-t border-slate-200 dark:border-zinc-800 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 bg-emerald-50/50 dark:bg-emerald-950/20 p-6 border border-emerald-200 dark:border-emerald-800/40 rounded">
            <div>
              <h3 className="font-bold text-slate-900 dark:text-slate-100">Ready to settle this invoice?</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Pay securely via Credit Card, Apple Pay, Google Pay, or US Bank Transfer powered by Stripe.
              </p>
            </div>
            <button
              onClick={handlePay}
              disabled={isPaying}
              className="px-8 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-base transition-all shadow-md active:scale-95 disabled:opacity-50 whitespace-nowrap"
            >
              {isPaying ? "Processing..." : `Pay ${formatMoney(invoice.totalAmount)}`}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

const LegalPages = ({ path }) => {
  if (path.startsWith("/invoice/") || path.startsWith("/pay/")) {
    const invoiceId = path.split("/")[2];
    return <PublicInvoiceView invoiceId={invoiceId} />;
  }

  let title = "";
  let content = "";
  let isHtml = false;

  switch (path) {
    case "/privacy":
      title = "Privacy Policy";
      content = privacyPolicyHtml;
      isHtml = true;
      break;
    case "/contact":
      title = "Contact Us";
      content =
        "If you have any questions, please contact us at support@velotime.dg.tools.";
      break;
    case "/cookies":
      title = "Cookie Policy";
      content = cookiesHtml;
      isHtml = true;
      break;
    case "/tos":
      title = "Terms of Service";
      content = tosHtml;
      isHtml = true;
      break;
    case "/data-removal":
      title = "Data Removal Request";
      content =
        'To request the removal of your personal data, please contact us at support@velotime.dg.tools with the subject "Data Removal Request".';
      break;
    default:
      title = "Page Not Found";
      content = "The page you are looking for does not exist.";
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-zinc-950 flex flex-col items-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl w-full bg-white dark:bg-zinc-900 shadow p-8">
        <div className="mb-8 flex justify-between items-center border-b pb-4">
          <h1 className="text-3xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
            {title}
          </h1>
          <a
            href="/"
            className="text-primary-600 hover:text-blue-800 font-semibold text-sm transition-colors"
          >
            &larr; Back to VeloTime
          </a>
        </div>
        <div className="prose prose-blue max-w-none text-slate-700 dark:text-slate-300">
          {isHtml ? (
            <div dangerouslySetInnerHTML={{ __html: content }} />
          ) : (
            <p className="text-lg leading-relaxed">{content}</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default LegalPages;
