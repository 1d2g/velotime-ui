import React, { useRef, useMemo } from "react";
import { ShieldCheck, CheckCircle2, Printer, Download, X, FileText, Building2, Calendar, User, Clock, Check } from "lucide-react";

export default function ClientAuditProofModal({
  isOpen,
  onClose,
  companyName = "VeloTime Agency Services",
  clientName = "Acme Corp",
  projectName = "Website Redesign & Cloud Migration",
  dateRangeText = "May 01, 2026 - May 31, 2026",
  invoiceNumber = "INV-2026-084",
  approvedBy = "Sarah Chen, Operations Director",
  approvalDate = "2026-05-31",
  entries = [],
  orgUsers = [],
}) {
  const printRef = useRef(null);

  // Compute summary metrics
  const summary = useMemo(() => {
    let totalHours = 0;
    let billableHours = 0;
    let nonBillableHours = 0;
    let totalBilledValue = 0;

    const memberMap = {};

    entries.forEach((entry) => {
      const h = Number(entry.hours) || 0;
      const rate = Number(entry.rate) || 0;
      totalHours += h;

      if (entry.isBillable !== false) {
        billableHours += h;
        totalBilledValue += h * rate;
      } else {
        nonBillableHours += h;
      }

      const uName = entry.userName || "Team Member";
      if (!memberMap[uName]) {
        memberMap[uName] = {
          name: uName,
          role: entry.userRole || "Specialist",
          hours: 0,
          billableHours: 0,
          rate: rate,
          total: 0,
        };
      }
      memberMap[uName].hours += h;
      if (entry.isBillable !== false) {
        memberMap[uName].billableHours += h;
        memberMap[uName].total += h * rate;
      }
    });

    return {
      totalHours,
      billableHours,
      nonBillableHours,
      totalBilledValue,
      members: Object.values(memberMap),
    };
  }, [entries]);

  const verificationHash = useMemo(() => {
    const seed = `${clientName}-${projectName}-${dateRangeText}-${summary.totalHours}`;
    let hash = 0;
    for (let i = 0; i < seed.length; i++) {
      hash = (hash << 5) - hash + seed.charCodeAt(i);
      hash |= 0;
    }
    return `VT-${Math.abs(hash).toString(16).toUpperCase().padStart(8, "0")}`;
  }, [clientName, projectName, dateRangeText, summary.totalHours]);

  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-xs p-4 overflow-y-auto print:p-0 print:bg-white print:static print:inset-auto">
      {/* Top action toolbar (Hidden when printing) */}
      <div className="bg-white dark:bg-zinc-900 w-full max-w-4xl shadow-2xl border border-slate-300 dark:border-zinc-700 flex flex-col my-8 print:my-0 print:border-none print:shadow-none">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-950 print:hidden">
          <div className="flex items-center gap-2.5">
            <ShieldCheck className="w-5 h-5 text-emerald-600" />
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider">
                Client Audit Proof Report
              </h2>
              <p className="text-xs text-slate-500">
                1-page executive timesheet proof ready for client invoice attachment
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white transition-colors cursor-pointer shadow-xs"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print / Save PDF</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors cursor-pointer"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* The Printable Executive Timesheet Proof Sheet */}
        <div
          ref={printRef}
          className="p-8 sm:p-12 text-slate-900 dark:text-slate-100 bg-white dark:bg-zinc-900 print:p-0 print:text-black print:bg-white"
        >
          {/* Header & Verification Stamp */}
          <div className="flex flex-col sm:flex-row justify-between items-start gap-6 border-b-2 border-slate-900 pb-6 mb-8 print:border-black">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-black tracking-widest text-slate-400 dark:text-zinc-500 uppercase print:text-slate-600">
                  OFFICIAL TIMESHEET PROOF OF WORK
                </span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200 print:border-emerald-700">
                  <Check className="w-2.5 h-2.5" /> Verified & Approved
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-white print:text-black">
                {companyName}
              </h1>
              <p className="text-xs text-slate-500 mt-1 font-mono">
                Verification Reference: <span className="font-bold text-slate-800 dark:text-slate-200 print:text-black">{verificationHash}</span>
              </p>
            </div>

            <div className="text-right sm:self-start">
              <div className="inline-block border-2 border-emerald-700 p-2.5 bg-emerald-50/50 print:bg-transparent">
                <div className="text-[10px] font-mono font-bold tracking-wider text-emerald-800 uppercase flex items-center gap-1 justify-end">
                  <ShieldCheck className="w-3.5 h-3.5" /> Client Audit Proof
                </div>
                <div className="text-xs font-black text-slate-900 dark:text-white print:text-black mt-0.5">
                  Invoice Ref: {invoiceNumber}
                </div>
                <div className="text-[10px] text-slate-500 print:text-slate-600">
                  Billing Period: {dateRangeText}
                </div>
              </div>
            </div>
          </div>

          {/* Client & Project Metadata Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 bg-slate-50 dark:bg-zinc-800/40 p-4 border border-slate-200 dark:border-zinc-800 mb-8 print:bg-slate-50 print:border-slate-300">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Client Organization
              </span>
              <p className="text-sm font-bold text-slate-900 dark:text-white print:text-black mt-0.5">
                {clientName}
              </p>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mt-2 block">
                Approved Project Scope
              </span>
              <p className="text-sm font-medium text-slate-800 dark:text-slate-200 print:text-black">
                {projectName}
              </p>
            </div>

            <div className="sm:border-l sm:border-slate-200 sm:dark:border-zinc-700 sm:pl-6 print:border-slate-300">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Executive Manager Sign-off
              </span>
              <p className="text-sm font-bold text-slate-900 dark:text-white print:text-black mt-0.5">
                {approvedBy}
              </p>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mt-2 block">
                Approval Verification Date
              </span>
              <p className="text-sm font-mono text-slate-800 dark:text-slate-200 print:text-black">
                {approvalDate}
              </p>
            </div>
          </div>

          {/* Top Hours Telemetry Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
            <div className="p-3.5 border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 print:border-slate-300">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                Total Approved Hours
              </span>
              <span className="text-xl font-black text-slate-900 dark:text-white print:text-black mt-1 block">
                {summary.totalHours.toFixed(2)}h
              </span>
            </div>
            <div className="p-3.5 border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 print:border-slate-300">
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 block">
                Billable Client Hours
              </span>
              <span className="text-xl font-black text-emerald-700 dark:text-emerald-400 print:text-black mt-1 block">
                {summary.billableHours.toFixed(2)}h
              </span>
            </div>
            <div className="p-3.5 border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 print:border-slate-300">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                Non-Billable / Internal
              </span>
              <span className="text-xl font-black text-slate-600 dark:text-slate-400 print:text-black mt-1 block">
                {summary.nonBillableHours.toFixed(2)}h
              </span>
            </div>
            <div className="p-3.5 border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 print:border-slate-300">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                Verified Labor Value
              </span>
              <span className="text-xl font-black text-slate-900 dark:text-white print:text-black mt-1 block">
                ${summary.totalBilledValue.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
          </div>

          {/* Team Allocation Table */}
          <div className="mb-8">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-2">
              1. Team Resource Allocation
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse border border-slate-200 dark:border-zinc-800 text-xs min-w-[500px]">
                <thead>
                  <tr className="bg-slate-100 dark:bg-zinc-800/60 text-slate-600 dark:text-slate-300 font-bold uppercase text-[10px] border-b border-slate-200 dark:border-zinc-800">
                    <th className="p-2.5">Team Member</th>
                    <th className="p-2.5">Billing Role</th>
                    <th className="p-2.5 text-right">Approved Hours</th>
                    <th className="p-2.5 text-right">Hourly Rate</th>
                    <th className="p-2.5 text-right">Total Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-zinc-800">
                  {summary.members.map((m, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/50">
                      <td className="p-2.5 font-bold text-slate-900 dark:text-white print:text-black">
                        {m.name}
                      </td>
                      <td className="p-2.5 text-slate-500">{m.role}</td>
                      <td className="p-2.5 text-right font-mono font-semibold">
                        {m.hours.toFixed(2)}h
                      </td>
                      <td className="p-2.5 text-right font-mono text-slate-500">
                        ${m.rate.toFixed(2)}/h
                      </td>
                      <td className="p-2.5 text-right font-mono font-bold text-slate-900 dark:text-white print:text-black">
                        ${m.total.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Chronological Detailed Task Audit Log with Notes */}
          <div className="mb-8">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-2">
              2. Detailed Chronological Audit Log & Task Notes
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse border border-slate-200 dark:border-zinc-800 text-xs min-w-[560px]">
              <thead>
                <tr className="bg-slate-100 dark:bg-zinc-800/60 text-slate-600 dark:text-slate-300 font-bold uppercase text-[10px] border-b border-slate-200 dark:border-zinc-800">
                  <th className="p-2.5 w-24">Date</th>
                  <th className="p-2.5 w-32">Team Member</th>
                  <th className="p-2.5 w-36">Task</th>
                  <th className="p-2.5 text-right w-16">Hours</th>
                  <th className="p-2.5">Task Description / Audit Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-zinc-800">
                {entries.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-4 text-center text-slate-400">
                      No entry line items found for this period.
                    </td>
                  </tr>
                ) : (
                  entries.slice(0, 30).map((e, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/50">
                      <td className="p-2.5 font-mono text-slate-600 dark:text-zinc-400 print:text-black">
                        {e.dateId}
                      </td>
                      <td className="p-2.5 font-medium text-slate-900 dark:text-white print:text-black truncate">
                        {e.userName}
                      </td>
                      <td className="p-2.5 text-slate-700 dark:text-slate-300 font-semibold truncate">
                        {e.taskName}
                      </td>
                      <td className="p-2.5 text-right font-mono font-bold">
                        {Number(e.hours).toFixed(2)}h
                      </td>
                      <td className="p-2.5 text-slate-600 dark:text-slate-400 italic">
                        {e.note || "Standard task execution"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          {entries.length > 30 && (
              <p className="text-[10px] text-slate-400 mt-1 italic">
                Showing top 30 audited entries for executive overview. Full ledger archived in system database.
              </p>
            )}
          </div>

          {/* Management Verification & Legal Attestation */}
          <div className="border-t-2 border-slate-900 pt-6 mt-8 print:border-black flex flex-col sm:flex-row justify-between items-start gap-6">
            <div className="max-w-md">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
                Agency Attestation Statement
              </span>
              <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed print:text-slate-700">
                The hours documented above have been logged, verified by supervisory staff, and cross-referenced with project deliverables. This audit proof serves as binding proof of work delivered under the applicable master services agreement.
              </p>
            </div>

            <div className="text-right sm:min-w-[220px]">
              <div className="border border-slate-300 dark:border-zinc-700 p-3 bg-slate-50/50 dark:bg-zinc-800/30 print:bg-transparent">
                <span className="text-[10px] font-mono uppercase text-slate-400 block">
                  MANAGEMENT APPROVAL SEAL
                </span>
                <span className="text-xs font-black text-slate-900 dark:text-white print:text-black block mt-1">
                  {approvedBy}
                </span>
                <span className="text-[10px] font-mono text-emerald-700 dark:text-emerald-400 block mt-0.5">
                  STATUS: APPROVED & AUDITED
                </span>
                <span className="text-[9px] font-mono text-slate-400 block mt-1">
                  TIMESTAMP: {new Date().toISOString()}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
