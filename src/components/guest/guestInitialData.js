/**
 * guestInitialData.js
 * 
 * Comprehensive realistic B2B SaaS demo data for the VeloTime Guest Sandbox:
 * - 3 Clients: Client A, Client B, Client C
 * - 3 Projects with budgets, budget hours, and tasks
 * - 4 Team Members: Guest Evaluator (Admin), Sarah Chen, Alex Rivera, Marcus Vance
 * - Cohesive timesheet entries, notes, and raw ledger entries
 * - 3 Realistic Expenses (Software, Infrastructure, Assets)
 * - 3 Realistic Invoices (Paid, Sent, Draft) with itemized line items
 * - 2 Timesheet Submissions (Needs Review, Approved) for Approvals demo
 * - Task rate overrides for financial telemetry and reports
 */

export const GUEST_USER_ID = "guest_user";

export const GUEST_MOCK_USER = {
  id: GUEST_USER_ID,
  email: "guest@velotime.local",
  firstName: "Guest",
  lastName: "Evaluator",
  fullName: "Guest Evaluator",
  role: "admin",
  organization: {
    id: "org_guest_sandbox",
    name: "Guest Studio Workspace",
    tier: "trial",
    createdAt: new Date().toISOString(),
    invoicePrefix: "INV-",
    nextInvoiceNumber: 1004,
  },
};

export const INITIAL_GUEST_CLIENTS = [
  { id: "guest_c1", name: "Client A", address: "100 Creative Way, Studio Suite 4B" },
  { id: "guest_c2", name: "Client B", address: "250 Market St, Floor 12" },
  { id: "guest_c3", name: "Client C", address: "80 Innovation Park, Building 2" },
  { id: "guest_c4", name: "Client D", address: "400 Enterprise Plaza, Suite 900" },
  { id: "guest_c5", name: "Studio Internal", address: "HQ Operations & R&D" },
];

export const INITIAL_GUEST_PROJECTS = [
  {
    id: "guest_p1",
    name: "Client A Project",
    clientId: "guest_c1",
    client: { id: "guest_c1", name: "Client A" },
    clientName: "Client A",
    hourlyRate: 165,
    budget: 25000,
    budgetHours: 150,
    isCollapsed: false,
    tasks: [
      { id: "guest_t1_a", name: "Task A", isBillable: true },
      { id: "guest_t1_b", name: "Task B", isBillable: true },
      { id: "guest_t1_c", name: "Task C", isBillable: true },
    ],
  },
  {
    id: "guest_p2",
    name: "Client B Project",
    clientId: "guest_c2",
    client: { id: "guest_c2", name: "Client B" },
    clientName: "Client B",
    hourlyRate: 175,
    budget: 35000,
    budgetHours: 200,
    isCollapsed: false,
    tasks: [
      { id: "guest_t2_a", name: "Task A", isBillable: true },
      { id: "guest_t2_b", name: "Task B", isBillable: true },
      { id: "guest_t2_c", name: "Task C", isBillable: true },
    ],
  },
  {
    id: "guest_p3",
    name: "Client C Project",
    clientId: "guest_c3",
    client: { id: "guest_c3", name: "Client C" },
    clientName: "Client C",
    hourlyRate: 150,
    budget: 18000,
    budgetHours: 120,
    isCollapsed: false,
    tasks: [
      { id: "guest_t3_a", name: "Task A", isBillable: true },
      { id: "guest_t3_b", name: "Task B", isBillable: true },
      { id: "guest_t3_c", name: "Task C", isBillable: true },
    ],
  },
  {
    id: "guest_p4",
    name: "Client D Retainer",
    clientId: "guest_c4",
    client: { id: "guest_c4", name: "Client D" },
    clientName: "Client D",
    hourlyRate: 180,
    budget: 36000,
    budgetHours: 200,
    isCollapsed: false,
    tasks: [
      { id: "guest_t4_a", name: "Architecture", isBillable: true },
      { id: "guest_t4_b", name: "Implementation", isBillable: true },
      { id: "guest_t4_c", name: "QA & Review", isBillable: true },
    ],
  },
  {
    id: "guest_p5",
    name: "Internal R&D & Ops",
    clientId: "guest_c5",
    client: { id: "guest_c5", name: "Studio Internal" },
    clientName: "Studio Internal",
    hourlyRate: 0,
    budget: 0,
    budgetHours: 80,
    isCollapsed: false,
    tasks: [
      { id: "guest_t5_a", name: "Tooling & CI", isBillable: false },
      { id: "guest_t5_b", name: "Team Sync", isBillable: false },
    ],
  },
];

export const INITIAL_GUEST_ORG_USERS = [
  {
    id: GUEST_USER_ID,
    email: "guest@velotime.local",
    firstName: "Guest",
    lastName: "Evaluator",
    fullName: "Guest Evaluator",
    role: "admin",
    defaultCostRate: 75,
    defaultBillingRate: 165,
  },
  {
    id: "guest_u_sarah",
    email: "sarah.chen@studio.design",
    firstName: "Sarah",
    lastName: "Chen",
    fullName: "Sarah Chen",
    role: "employee",
    defaultCostRate: 65,
    defaultBillingRate: 150,
  },
  {
    id: "guest_u_alex",
    email: "alex.rivera@studio.design",
    firstName: "Alex",
    lastName: "Rivera",
    fullName: "Alex Rivera",
    role: "employee",
    defaultCostRate: 85,
    defaultBillingRate: 175,
  },
  {
    id: "guest_u_marcus",
    email: "marcus.vance@studio.design",
    firstName: "Marcus",
    lastName: "Vance",
    fullName: "Marcus Vance",
    role: "manager",
    defaultCostRate: 90,
    defaultBillingRate: 185,
  },
];

export const INITIAL_GUEST_EXPENSES = [
  {
    id: "guest_exp_1",
    amount: 450.00,
    description: "Figma Organization License (Q4)",
    date: new Date(Date.now() - 6 * 86400000).toISOString().split("T")[0],
    isBillable: true,
    projectId: "guest_p1",
  },
  {
    id: "guest_exp_2",
    amount: 185.50,
    description: "AWS Cloud Staging Infrastructure",
    date: new Date(Date.now() - 4 * 86400000).toISOString().split("T")[0],
    isBillable: true,
    projectId: "guest_p2",
  },
  {
    id: "guest_exp_3",
    amount: 84.00,
    description: "Web Typography & Licensing Assets",
    date: new Date(Date.now() - 2 * 86400000).toISOString().split("T")[0],
    isBillable: false,
    projectId: "guest_p3",
  },
];

export const INITIAL_GUEST_INVOICES = [
  {
    id: "guest_inv_1001",
    invoiceNumber: "INV-1001",
    projectId: "guest_p1",
    clientName: "Client A",
    clientAddress: "100 Creative Way, Studio Suite 4B",
    dateIssued: new Date(Date.now() - 14 * 86400000).toISOString().split("T")[0],
    dueDate: new Date(Date.now() + 16 * 86400000).toISOString().split("T")[0],
    status: "paid",
    taxName: "Sales Tax",
    taxRate: 0,
    notes: "Payment received via Stripe ACH. Thank you for your partnership!",
    lineItems: [
      { id: "li_1", description: "Sprint 11: UX Research & Architecture (24 hrs @ $165/hr)", amount: 3960, mode: "hourly" },
      { id: "li_2", description: "Design System Tokens & Figma Token Export", amount: 800, mode: "flat" },
    ],
    organization: {
      name: "Guest Studio Workspace",
      invoicePrefix: "INV-",
      nextInvoiceNumber: 1004,
    },
  },
  {
    id: "guest_inv_1002",
    invoiceNumber: "INV-1002",
    projectId: "guest_p2",
    clientName: "Client B",
    clientAddress: "250 Market St, Floor 12",
    dateIssued: new Date(Date.now() - 5 * 86400000).toISOString().split("T")[0],
    dueDate: new Date(Date.now() + 25 * 86400000).toISOString().split("T")[0],
    status: "sent",
    taxName: "Tax",
    taxRate: 0,
    notes: "Net 30 terms. Please remit payment via bank transfer or online invoice link.",
    lineItems: [
      { id: "li_3", description: "Full-Stack API Integration & Schema Refinement (20 hrs @ $175/hr)", amount: 3500, mode: "hourly" },
      { id: "li_4", description: "Cloud Infrastructure Setup & VPC Provisioning", amount: 1200, mode: "flat" },
    ],
    organization: {
      name: "Guest Studio Workspace",
      invoicePrefix: "INV-",
      nextInvoiceNumber: 1004,
    },
  },
  {
    id: "guest_inv_1003",
    invoiceNumber: "INV-1003",
    projectId: "guest_p3",
    clientName: "Client C",
    clientAddress: "80 Innovation Park, Building 2",
    dateIssued: new Date().toISOString().split("T")[0],
    dueDate: new Date(Date.now() + 14 * 86400000).toISOString().split("T")[0],
    status: "draft",
    taxName: "Tax",
    taxRate: 0,
    notes: "Draft milestone invoice for Phase 1 delivery.",
    lineItems: [
      { id: "li_5", description: "Phase 1: Architecture Blueprint & Technical Scope", amount: 2250, mode: "progress" },
    ],
    organization: {
      name: "Guest Studio Workspace",
      invoicePrefix: "INV-",
      nextInvoiceNumber: 1004,
    },
  },
];

export const INITIAL_GUEST_SUBMISSIONS = [
  {
    id: "sub_1",
    userId: "guest_u_sarah",
    user: { firstName: "Sarah", lastName: "Chen", email: "sarah.chen@studio.design" },
    weekStartDate: new Date(Date.now() - 6 * 86400000).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
    totalHours: 40.0,
    billableHours: 37.5,
    status: "submitted",
    submittedAt: new Date(Date.now() - 1 * 86400000).toISOString(),
    note: "Sprint 12 design system tokens and component library finalized.",
  },
  {
    id: "sub_2",
    userId: "guest_u_alex",
    user: { firstName: "Alex", lastName: "Rivera", email: "alex.rivera@studio.design" },
    weekStartDate: new Date(Date.now() - 13 * 86400000).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
    totalHours: 38.5,
    billableHours: 38.5,
    status: "approved",
    submittedAt: new Date(Date.now() - 8 * 86400000).toISOString(),
    approvedAt: new Date(Date.now() - 7 * 86400000).toISOString(),
    approvedBy: "Guest Evaluator",
  },
];

export const INITIAL_GUEST_TASK_RATES = [
  { taskId: "guest_t1_a", userId: GUEST_USER_ID, billingRate: 165, costRate: 75 },
  { taskId: "guest_t2_a", userId: "guest_u_sarah", billingRate: 150, costRate: 65 },
  { taskId: "guest_t2_b", userId: "guest_u_alex", billingRate: 175, costRate: 85 },
];

/**
 * Pre-seeds day rows across tasks for Guest Evaluator, Sarah Chen, and Alex Rivera
 */
export function buildInitialGuestEntries(weekDates) {
  const entries = {};
  if (!Array.isArray(weekDates) || weekDates.length === 0) return entries;

  const [mon, tue, wed, thu, fri] = weekDates;

  // Guest Evaluator's Monday logged tasks (8.0h)
  if (mon) {
    entries[`${GUEST_USER_ID}_${mon.id}_guest_t1_a`] = 4.0;
    entries[`${GUEST_USER_ID}_${mon.id}_guest_t1_b`] = 2.5;
    entries[`${GUEST_USER_ID}_${mon.id}_guest_t1_c`] = 1.5;
  }

  // Sarah Chen's full submitted week (40.0h total: 37.5h billable, 2.5h non-billable)
  if (mon) {
    entries[`guest_u_sarah_${mon.id}_guest_t2_a`] = 6.0;
    entries[`guest_u_sarah_${mon.id}_guest_t1_b`] = 2.0;
  }
  if (tue) {
    entries[`guest_u_sarah_${tue.id}_guest_t2_a`] = 5.0;
    entries[`guest_u_sarah_${tue.id}_guest_t2_b`] = 3.0;
  }
  if (wed) {
    entries[`guest_u_sarah_${wed.id}_guest_t2_a`] = 6.5;
    entries[`guest_u_sarah_${wed.id}_guest_t1_c`] = 1.5;
  }
  if (thu) {
    entries[`guest_u_sarah_${thu.id}_guest_t2_a`] = 7.0;
    entries[`guest_u_sarah_${thu.id}_guest_t1_a`] = 1.0;
  }
  if (fri) {
    entries[`guest_u_sarah_${fri.id}_guest_t2_a`] = 5.5;
    entries[`guest_u_sarah_${fri.id}_guest_t1_b`] = 2.5;
  }

  // Alex Rivera's Monday logged tasks (7.0h)
  if (mon) {
    entries[`guest_u_alex_${mon.id}_guest_t2_b`] = 7.0;
  }

  return entries;
}

export function buildInitialGuestNotes(weekDates) {
  const notes = {};
  if (!Array.isArray(weekDates) || weekDates.length === 0) return notes;

  const [mon, tue, wed, thu, fri] = weekDates;

  // Guest Evaluator
  if (mon) {
    notes[`${GUEST_USER_ID}_${mon.id}_guest_t1_a`] = "Sprint architecture and UX wireframing.";
    notes[`${GUEST_USER_ID}_${mon.id}_guest_t1_b`] = "Component library setup and token styling.";
    notes[`${GUEST_USER_ID}_${mon.id}_guest_t1_c`] = "Client sync and backlog refinement.";
  }

  // Sarah Chen
  if (mon) {
    notes[`guest_u_sarah_${mon.id}_guest_t2_a`] = "Client B API endpoint integration.";
    notes[`guest_u_sarah_${mon.id}_guest_t1_b`] = "Design system token schema alignment.";
  }
  if (tue) {
    notes[`guest_u_sarah_${tue.id}_guest_t2_a`] = "Responsive layouts and spacing ramp audit.";
    notes[`guest_u_sarah_${tue.id}_guest_t2_b`] = "Mobile gesture prototypes and touch targets.";
  }
  if (wed) {
    notes[`guest_u_sarah_${wed.id}_guest_t2_a`] = "Engineering handoff and token export script.";
    notes[`guest_u_sarah_${wed.id}_guest_t1_c`] = "Design critique and UX feedback synthesis.";
  }
  if (thu) {
    notes[`guest_u_sarah_${thu.id}_guest_t2_a`] = "Dark mode color ramp definitions and contrast audit.";
    notes[`guest_u_sarah_${thu.id}_guest_t1_a`] = "Figma library release testing.";
  }
  if (fri) {
    notes[`guest_u_sarah_${fri.id}_guest_t2_a`] = "Sprint 12 design system tokens and component library finalized.";
    notes[`guest_u_sarah_${fri.id}_guest_t1_b`] = "Internal team retrospective and asset documentation.";
  }

  // Alex Rivera
  if (mon) {
    notes[`guest_u_alex_${mon.id}_guest_t2_b`] = "Data models and migration testing.";
  }

  return notes;
}

export function buildInitialGuestRawEntries(weekDates) {
  if (!Array.isArray(weekDates) || weekDates.length === 0) return [];
  const [mon, tue, wed, thu, fri] = weekDates;
  const raw = [];

  if (mon) {
    raw.push(
      { id: "raw_1", userId: GUEST_USER_ID, dateId: mon.id, taskId: "guest_t1_a", hours: 4.0, note: "Sprint architecture and UX wireframing.", isBillable: true, invoiceId: null },
      { id: "raw_2", userId: GUEST_USER_ID, dateId: mon.id, taskId: "guest_t1_b", hours: 2.5, note: "Component library setup and token styling.", isBillable: true, invoiceId: null },
      { id: "raw_3", userId: GUEST_USER_ID, dateId: mon.id, taskId: "guest_t1_c", hours: 1.5, note: "Client sync and backlog refinement.", isBillable: true, invoiceId: null },
      { id: "raw_s1", userId: "guest_u_sarah", dateId: mon.id, taskId: "guest_t2_a", hours: 6.0, note: "Client B API endpoint integration.", isBillable: true, invoiceId: null },
      { id: "raw_s2", userId: "guest_u_sarah", dateId: mon.id, taskId: "guest_t1_b", hours: 2.0, note: "Design system token schema alignment.", isBillable: true, invoiceId: null },
      { id: "raw_a1", userId: "guest_u_alex", dateId: mon.id, taskId: "guest_t2_b", hours: 7.0, note: "Data models and migration testing.", isBillable: true, invoiceId: null }
    );
  }
  if (tue) {
    raw.push(
      { id: "raw_s3", userId: "guest_u_sarah", dateId: tue.id, taskId: "guest_t2_a", hours: 5.0, note: "Responsive layouts and spacing ramp audit.", isBillable: true, invoiceId: null },
      { id: "raw_s4", userId: "guest_u_sarah", dateId: tue.id, taskId: "guest_t2_b", hours: 3.0, note: "Mobile gesture prototypes and touch targets.", isBillable: true, invoiceId: null }
    );
  }
  if (wed) {
    raw.push(
      { id: "raw_s5", userId: "guest_u_sarah", dateId: wed.id, taskId: "guest_t2_a", hours: 6.5, note: "Engineering handoff and token export script.", isBillable: true, invoiceId: null },
      { id: "raw_s6", userId: "guest_u_sarah", dateId: wed.id, taskId: "guest_t1_c", hours: 1.5, note: "Design critique and UX feedback synthesis.", isBillable: true, invoiceId: null }
    );
  }
  if (thu) {
    raw.push(
      { id: "raw_s7", userId: "guest_u_sarah", dateId: thu.id, taskId: "guest_t2_a", hours: 7.0, note: "Dark mode color ramp definitions and contrast audit.", isBillable: true, invoiceId: null },
      { id: "raw_s8", userId: "guest_u_sarah", dateId: thu.id, taskId: "guest_t1_a", hours: 1.0, note: "Figma library release testing.", isBillable: true, invoiceId: null }
    );
  }
  if (fri) {
    raw.push(
      { id: "raw_s9", userId: "guest_u_sarah", dateId: fri.id, taskId: "guest_t2_a", hours: 5.5, note: "Sprint 12 design system tokens and component library finalized.", isBillable: true, invoiceId: null },
      { id: "raw_s10", userId: "guest_u_sarah", dateId: fri.id, taskId: "guest_t1_b", hours: 2.5, note: "Internal team retrospective and asset documentation.", isBillable: false, invoiceId: null }
    );
  }

  return raw;
}

export const INITIAL_GUEST_NOTES = {};
