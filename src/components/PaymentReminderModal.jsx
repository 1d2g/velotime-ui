import React, { useState } from "react";
import { Mail, Copy, Check, X, Calendar, AlertTriangle, FileText, Send } from "lucide-react";
import { useToast } from "../contexts/ToastContext";

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

export default function PaymentReminderModal({
  invoice,
  clientEmail = "",
  onClose,
  onRecordReminder,
  onUpdateStatus,
}) {
  const { addToast } = useToast();
  const [copied, setCopied] = useState(false);

  const daysOverdue = invoice.isOverdue ? Math.abs(invoice.dueDays || 0) : 0;
  
  // Choose default tone based on overdue age
  const defaultTone = daysOverdue > 21 ? "urgent" : daysOverdue > 7 ? "second_notice" : "friendly";
  const [tone, setTone] = useState(defaultTone);
  const [recipient, setRecipient] = useState(clientEmail || invoice.clientAddress || "");

  const clientName = invoice.resolvedClientName || "Client";
  const projName = invoice.resolvedProjectName || "Project";
  const invNumber = invoice.invoiceNumber || "INV";
  const totalStr = formatMoney(invoice.total);
  const dueDateStr = formatDate(invoice.dueDate);
  const issuedDateStr = formatDate(invoice.dateIssued);

  const getTemplate = (selectedTone) => {
    if (selectedTone === "urgent") {
      return {
        subject: `URGENT: Overdue Balance for Invoice ${invNumber} (${totalStr})`,
        body: `Dear ${clientName},

Invoice ${invNumber} for ${projName} (${totalStr}) is now ${daysOverdue} days past due (original due date: ${dueDateStr}).

We kindly request immediate settlement of this open balance. Please process payment via your standard electronic transfer or check at your earliest convenience.

If there is any administrative or invoicing detail holding up disbursement, please contact us immediately so we can address it right away.

Sincerely,
Accounts Receivable`,
      };
    }

    if (selectedTone === "second_notice") {
      return {
        subject: `Follow-up: Past Due Invoice ${invNumber} (${daysOverdue} days overdue)`,
        body: `Hi ${clientName},

We are following up regarding Invoice ${invNumber} for ${projName} in the amount of ${totalStr}.

According to our records, this invoice was due on ${dueDateStr} and is currently ${daysOverdue} days past due.

Could you please confirm if this invoice has been queued for payment processing, or provide an estimated disbursement date?

If payment was already dispatched, please disregard this note.

Best regards,
Accounts Receivable`,
      };
    }

    // Friendly default
    return {
      subject: `Friendly Reminder: Invoice ${invNumber} (${totalStr}) due ${dueDateStr}`,
      body: `Hi ${clientName},

I hope your week is going well.

This is a quick friendly reminder regarding Invoice ${invNumber} for ${projName} in the amount of ${totalStr}, issued on ${issuedDateStr} with payment terms due on ${dueDateStr}.

Please let us know if you need another copy of the invoice or have any questions about the billing breakdown.

Thank you for your partnership!

Best regards,
Accounts Receivable`,
    };
  };

  const currentTemplate = getTemplate(tone);
  const [subject, setSubject] = useState(currentTemplate.subject);
  const [body, setBody] = useState(currentTemplate.body);

  const handleToneChange = (newTone) => {
    setTone(newTone);
    const tmpl = getTemplate(newTone);
    setSubject(tmpl.subject);
    setBody(tmpl.body);
  };

  const handleCopy = () => {
    const fullText = `Subject: ${subject}\n\n${body}`;
    navigator.clipboard.writeText(fullText);
    setCopied(true);
    addToast("Reminder email copied to clipboard", "success");
    setTimeout(() => setCopied(false), 2000);
    if (onRecordReminder) onRecordReminder(invoice.id, tone);
    if (invoice.status === "draft" && onUpdateStatus) {
      onUpdateStatus(invoice.id, "sent");
    }
  };

  const handleMailto = () => {
    const mailtoUrl = `mailto:${encodeURIComponent(recipient)}?subject=${encodeURIComponent(
      subject
    )}&body=${encodeURIComponent(body)}`;
    window.open(mailtoUrl, "_blank");
    if (onRecordReminder) onRecordReminder(invoice.id, tone);
    if (invoice.status === "draft" && onUpdateStatus) {
      onUpdateStatus(invoice.id, "sent");
    }
    addToast("Opened in default email client", "success");
  };

  const handleToggleSent = () => {
    const nextStatus = invoice.status === "sent" ? "draft" : "sent";
    if (onUpdateStatus) {
      onUpdateStatus(invoice.id, nextStatus);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 w-full max-w-2xl rounded-none shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="p-5 border-b border-slate-200 dark:border-zinc-800 flex justify-between items-start bg-slate-50/70 dark:bg-zinc-800/40">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-sm font-bold tabular-nums text-slate-900 dark:text-white">
                {invNumber}
              </span>
              {invoice.isOverdue ? (
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 px-2 py-0.5">
                  <AlertTriangle className="w-3 h-3 text-red-600 dark:text-red-400" />
                  <span className="text-red-600 dark:text-red-400 font-bold tabular-nums">{daysOverdue}</span> Days Overdue
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 px-2 py-0.5">
                  <Calendar className="w-3 h-3 text-slate-400" />
                  Due {dueDateStr}
                </span>
              )}
              <span className="text-[10px] font-bold uppercase px-2 py-0.5 border border-slate-200 dark:border-zinc-700 bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-slate-300">
                {invoice.status === "sent" ? "Status: Sent" : invoice.status === "draft" ? "Status: Not Sent" : `Status: ${invoice.status}`}
              </span>
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Payment Reminder Generator
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Generate and send a calibrated follow-up message to collect outstanding balance.
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1.5 transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Invoice Key Summary */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 bg-slate-100/60 dark:bg-zinc-950/50 border-b border-slate-200 dark:border-zinc-800 text-xs">
          <div>
            <span className="block text-[10px] font-bold uppercase text-slate-400">Client</span>
            <span className="font-semibold text-slate-900 dark:text-white truncate block">
              {clientName}
            </span>
          </div>
          <div>
            <span className="block text-[10px] font-bold uppercase text-slate-400">Project</span>
            <span className="font-semibold text-slate-900 dark:text-white truncate block">
              {projName}
            </span>
          </div>
          <div>
            <span className="block text-[10px] font-bold uppercase text-slate-400">Outstanding Balance</span>
            <span className="tabular-nums font-bold text-red-600 dark:text-red-400 block">
              {totalStr}
            </span>
          </div>
          <div>
            <span className="block text-[10px] font-bold uppercase text-slate-400">Due Date</span>
            <span className="font-semibold text-slate-700 dark:text-slate-300 block">
              {dueDateStr}
            </span>
          </div>
        </div>

        {/* Tone Selector */}
        <div className="p-4 border-b border-slate-200 dark:border-zinc-800 flex items-center justify-between gap-2 flex-wrap">
          <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
            Reminder Tone:
          </span>
          <div className="inline-flex border border-slate-200 dark:border-zinc-700 p-0.5 bg-slate-100 dark:bg-zinc-800">
            <button
              type="button"
              onClick={() => handleToneChange("friendly")}
              className={`px-3 py-1 text-xs font-bold transition-all cursor-pointer ${
                tone === "friendly"
                  ? "bg-white dark:bg-zinc-900 text-slate-900 dark:text-white shadow-xs"
                  : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              Friendly (Due Soon)
            </button>
            <button
              type="button"
              onClick={() => handleToneChange("second_notice")}
              className={`px-3 py-1 text-xs font-bold transition-all cursor-pointer ${
                tone === "second_notice"
                  ? "bg-white dark:bg-zinc-900 text-slate-900 dark:text-white shadow-xs"
                  : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              Second Notice (Past Due)
            </button>
            <button
              type="button"
              onClick={() => handleToneChange("urgent")}
              className={`px-3 py-1 text-xs font-bold transition-all cursor-pointer ${
                tone === "urgent"
                  ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs"
                  : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              Urgent (21+ Days)
            </button>
          </div>
        </div>

        {/* Form Body */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
              Recipient Email
            </label>
            <input
              type="email"
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
              placeholder="e.g. accounting@client.com"
              className="w-full text-xs font-medium bg-slate-50 dark:bg-zinc-800/80 border border-slate-200 dark:border-zinc-700 p-2.5 outline-none focus:border-slate-900 dark:focus:border-white text-slate-900 dark:text-white transition-colors"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
              Email Subject
            </label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full text-xs font-bold bg-slate-50 dark:bg-zinc-800/80 border border-slate-200 dark:border-zinc-700 p-2.5 outline-none focus:border-slate-900 dark:focus:border-white text-slate-900 dark:text-white transition-colors"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
              Message Body
            </label>
            <textarea
              rows={9}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              className="w-full text-xs font-sans bg-slate-50 dark:bg-zinc-800/80 border border-slate-200 dark:border-zinc-700 p-3 outline-none focus:border-slate-900 dark:focus:border-white text-slate-900 dark:text-white resize-none transition-colors leading-relaxed"
            />
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-slate-200 dark:border-zinc-800 bg-slate-50/70 dark:bg-zinc-800/40 flex flex-wrap justify-between items-center gap-3">
          <div className="flex items-center gap-3">
            <span className="text-[11px] text-slate-500">
              {invoice.reminderInfo?.lastSentAt
                ? `Last sent: ${formatDate(invoice.reminderInfo.lastSentAt)} (${invoice.reminderInfo.count || 1} reminders sent)`
                : "No previous reminder recorded"}
            </span>

            {onUpdateStatus && (
              <button
                type="button"
                onClick={handleToggleSent}
                className="text-[11px] font-bold underline text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white cursor-pointer"
              >
                {invoice.status === "sent" ? "Mark as Not Sent (Draft)" : "Mark as Sent"}
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopy}
              className="inline-flex items-center gap-1.5 px-4 py-2 border border-slate-300 dark:border-zinc-700 hover:border-slate-400 bg-white dark:bg-zinc-900 text-slate-700 dark:text-slate-200 text-xs font-bold transition-all shadow-xs cursor-pointer active:scale-95"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
              <span>{copied ? "Copied" : "Copy to Clipboard"}</span>
            </button>

            <button
              type="button"
              onClick={handleMailto}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-slate-800 text-xs font-bold transition-all shadow-sm cursor-pointer active:scale-95"
            >
              <Send className="w-4 h-4" />
              <span>Open in Email App</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
