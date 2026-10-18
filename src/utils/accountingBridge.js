/**
 * Fractional CFO & Bookkeeper Accounting Bridge
 * 
 * Generates formatted, ready-to-ingest batch files for:
 * 1. QuickBooks Online (QBO) Time Activity Import
 * 2. Xero Timesheet / Payroll Import
 */

/**
 * Clean and format CSV field with proper quote escaping
 */
function escapeCsv(val) {
  if (val === null || val === undefined) return '""';
  const str = String(val).replace(/"/g, '""');
  return `"${str}"`;
}

/**
 * Export entries as QuickBooks Online (QBO) Time Activity CSV
 * Standard QBO Spec: Date,Name,Customer,Service Item,Duration,Billable,Hourly Rate,Description
 */
export function exportQBOTimeActivities(entries = [], filename = null) {
  if (!entries || entries.length === 0) {
    throw new Error("No time entries available to export.");
  }

  const headers = [
    "Date",
    "Name",
    "Customer",
    "Service Item",
    "Duration",
    "Billable",
    "Hourly Rate",
    "Description"
  ];

  const rows = entries.map((entry) => {
    // Customer mapping: Client:Project hierarchy standard in QBO
    const customer = entry.clientName
      ? (entry.projectName ? `${entry.clientName}:${entry.projectName}` : entry.clientName)
      : (entry.projectName || "General Client");

    const serviceItem = entry.taskName || "General Time Activity";
    const duration = Number(entry.hours || 0).toFixed(2);
    const billable = entry.isBillable !== false ? "Yes" : "No";
    const hourlyRate = Number(entry.rate || 0).toFixed(2);
    const description = entry.note || "Standard billable activity";

    return [
      escapeCsv(entry.dateId || new Date().toISOString().split("T")[0]),
      escapeCsv(entry.userName || "Team Member"),
      escapeCsv(customer),
      escapeCsv(serviceItem),
      duration,
      escapeCsv(billable),
      hourlyRate,
      escapeCsv(description)
    ].join(",");
  });

  const csvContent = [headers.join(","), ...rows].join("\r\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  const defaultName = filename || `VeloTime_QBO_Time_Activities_${new Date().toISOString().split("T")[0]}.csv`;
  link.href = url;
  link.download = defaultName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);

  return { count: entries.length, filename: defaultName };
}

/**
 * Export entries as Xero Timesheets / Payroll Import CSV
 * Standard Xero Spec: Employee Name,Earnings Rate,Date,Hours,Description,Client,Tracking Category
 */
export function exportXeroTimesheets(entries = [], filename = null) {
  if (!entries || entries.length === 0) {
    throw new Error("No time entries available to export.");
  }

  const headers = [
    "Employee Name",
    "Earnings Rate",
    "Date",
    "Hours",
    "Description",
    "Client",
    "Tracking Category"
  ];

  const rows = entries.map((entry) => {
    const employeeName = entry.userName || "Team Member";
    const earningsRate = entry.taskName || "Ordinary Hours";
    const date = entry.dateId || new Date().toISOString().split("T")[0];
    const hours = Number(entry.hours || 0).toFixed(2);
    const description = entry.note || "Delivered project services";
    const client = entry.clientName || "General";
    const trackingCategory = entry.projectName || "Standard Project";

    return [
      escapeCsv(employeeName),
      escapeCsv(earningsRate),
      escapeCsv(date),
      hours,
      escapeCsv(description),
      escapeCsv(client),
      escapeCsv(trackingCategory)
    ].join(",");
  });

  const csvContent = [headers.join(","), ...rows].join("\r\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  const defaultName = filename || `VeloTime_Xero_Timesheets_${new Date().toISOString().split("T")[0]}.csv`;
  link.href = url;
  link.download = defaultName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);

  return { count: entries.length, filename: defaultName };
}
