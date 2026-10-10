/**
 * guestInitialData.js
 * 
 * Default hybrid template for the VeloTime Guest Sandbox:
 * - 3 Clients: Client A, Client B, Client C
 * - 3 Tasks per client: Task A, Task B, Task C
 * - Exactly 1 pre-seeded row: Task A under Client A has 16.0h logged
 * - All other tasks are ready for typing with 0.0h
 */

export const GUEST_USER_ID = "guest_user";

export const GUEST_MOCK_USER = {
  id: GUEST_USER_ID,
  email: "guest@velotime.local",
  firstName: "Guest",
  lastName: "Sandbox",
  fullName: "Guest Evaluator",
  role: "admin",
  organization: {
    id: "org_guest_sandbox",
    name: "Guest Studio Workspace",
    tier: "trial",
    createdAt: new Date().toISOString(),
    invoicePrefix: "INV-",
    nextInvoiceNumber: 1001,
  },
};

export const INITIAL_GUEST_CLIENTS = [
  { id: "guest_c1", name: "Client A", address: "100 Creative Way, Studio Suite 4B" },
  { id: "guest_c2", name: "Client B", address: "250 Market St, Floor 12" },
  { id: "guest_c3", name: "Client C", address: "80 Innovation Park, Building 2" },
];

export const INITIAL_GUEST_PROJECTS = [
  {
    id: "guest_p1",
    name: "Client A Project",
    clientId: "guest_c1",
    client: { id: "guest_c1", name: "Client A" },
    hourlyRate: 165,
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
    hourlyRate: 175,
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
    hourlyRate: 150,
    isCollapsed: false,
    tasks: [
      { id: "guest_t3_a", name: "Task A", isBillable: true },
      { id: "guest_t3_b", name: "Task B", isBillable: true },
      { id: "guest_t3_c", name: "Task C", isBillable: true },
    ],
  },
];

/**
 * Pre-seeds exactly one day row (Monday) across Client A's tasks
 * (Task A: 4.0h, Task B: 2.5h, Task C: 1.5h = 8.0h total for Monday).
 * All other days (Tue through Sun) start completely blank ready for evaluator input.
 */
export function buildInitialGuestEntries(weekDates) {
  const entries = {};
  if (!Array.isArray(weekDates) || weekDates.length === 0) return entries;

  // Single pre-seeded day row: Monday across Client A's tasks
  const monday = weekDates[0];
  if (!monday) return entries;

  entries[`${GUEST_USER_ID}_${monday.id}_guest_t1_a`] = 4.0;
  entries[`${GUEST_USER_ID}_${monday.id}_guest_t1_b`] = 2.5;
  entries[`${GUEST_USER_ID}_${monday.id}_guest_t1_c`] = 1.5;

  return entries;
}

export function buildInitialGuestNotes(weekDates) {
  const notes = {};
  if (!Array.isArray(weekDates) || weekDates.length === 0) return notes;

  const monday = weekDates[0];
  if (!monday) return notes;

  // Pre-seeded audit notes for Monday's logged tasks
  notes[`${GUEST_USER_ID}_${monday.id}_guest_t1_a`] = "Sprint architecture and UX wireframing.";
  notes[`${GUEST_USER_ID}_${monday.id}_guest_t1_b`] = "Component library setup and token styling.";
  notes[`${GUEST_USER_ID}_${monday.id}_guest_t1_c`] = "Client sync and backlog refinement.";

  return notes;
}

export const INITIAL_GUEST_NOTES = {};
