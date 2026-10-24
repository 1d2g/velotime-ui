import {
  GUEST_USER_ID,
  GUEST_MOCK_USER,
  INITIAL_GUEST_INVOICES,
  INITIAL_GUEST_EXPENSES,
} from "../components/guest/guestInitialData";

export const safeGetItem = (storage, key, fallback = null) => {
  try {
    if (typeof window !== "undefined" && window[storage]) {
      const val = window[storage].getItem(key);
      return val !== null ? val : fallback;
    }
  } catch {}
  return fallback;
};

export const safeSetItem = (storage, key, value) => {
  try {
    if (typeof window !== "undefined" && window[storage]) {
      window[storage].setItem(key, String(value));
    }
  } catch {}
};

/**
 * Dispatches simulated REST endpoints for the instant 14-day guest sandbox.
 * Keeps API contracts identical to backend production routes.
 */
export function executeGuestApiCall(endpoint, method = "GET", body, _options = {}, context = {}) {
  const upperMethod = (method || "GET").toUpperCase();
  const {
    dbUser,
    setDbUser,
    expenses,
    setExpenses,
    submissions,
    setSubmissions,
    orgUsers,
    setOrgUsers,
    setTaskRates,
    setProjects,
    setEntries,
    totalGuestHours,
  } = context;

  // 1. Invoices Endpoints
  if (endpoint === "/api/invoices") {
    let invList;
    try {
      const raw = safeGetItem("localStorage", "velotime_guest_invoices");
      invList = raw ? JSON.parse(raw) : INITIAL_GUEST_INVOICES;
    } catch {
      invList = INITIAL_GUEST_INVOICES;
    }
    if (!Array.isArray(invList) || invList.length === 0) {
      invList = INITIAL_GUEST_INVOICES;
      safeSetItem("localStorage", "velotime_guest_invoices", JSON.stringify(invList));
    }

    if (upperMethod === "GET") {
      return invList;
    }

    if (upperMethod === "POST") {
      const newInvoice = {
        ...body,
        id: `guest_inv_${Date.now()}`,
        invoiceNumber: body?.invoiceNumber || `INV-${1000 + invList.length + 1}`,
        status: body?.status || "draft",
        dateIssued: body?.dateIssued || new Date().toISOString().split("T")[0],
        dueDate: body?.dueDate || "",
        lineItems: body?.lineItems || [],
        organization: GUEST_MOCK_USER.organization,
      };
      const updated = [newInvoice, ...invList];
      safeSetItem("localStorage", "velotime_guest_invoices", JSON.stringify(updated));
      return newInvoice;
    }
  }

  if (endpoint.startsWith("/api/invoices/")) {
    const parts = endpoint.split("/");
    const invId = parts[3];
    const isPdf = parts[4] === "pdf";

    if (isPdf) {
      return new Blob(["Mock PDF simulated preview in Guest Sandbox"], { type: "application/pdf" });
    }

    let invList;
    try {
      const raw = safeGetItem("localStorage", "velotime_guest_invoices");
      invList = raw ? JSON.parse(raw) : INITIAL_GUEST_INVOICES;
    } catch {
      invList = INITIAL_GUEST_INVOICES;
    }

    if (upperMethod === "PUT") {
      const updated = invList.map((inv) => (inv.id === invId ? { ...inv, ...body } : inv));
      safeSetItem("localStorage", "velotime_guest_invoices", JSON.stringify(updated));
      const matched = updated.find((i) => i.id === invId) || { id: invId, ...body };
      return matched;
    }

    if (upperMethod === "DELETE") {
      const updated = invList.filter((inv) => inv.id !== invId);
      safeSetItem("localStorage", "velotime_guest_invoices", JSON.stringify(updated));
      return { success: true };
    }
  }

  // 2. Expenses Endpoints
  if (endpoint === "/api/expenses") {
    let expList = expenses;
    if (!Array.isArray(expList) || expList.length === 0) {
      try {
        const raw = safeGetItem("localStorage", "velotime_guest_expenses");
        expList = raw ? JSON.parse(raw) : INITIAL_GUEST_EXPENSES;
      } catch {
        expList = INITIAL_GUEST_EXPENSES;
      }
    }

    if (upperMethod === "GET") {
      return expList;
    }

    if (upperMethod === "POST") {
      const newExpense = {
        ...body,
        id: `guest_exp_${Date.now()}`,
        date: body?.date || new Date().toISOString().split("T")[0],
      };
      const updated = [newExpense, ...expList];
      if (setExpenses) setExpenses(updated);
      safeSetItem("localStorage", "velotime_guest_expenses", JSON.stringify(updated));
      return newExpense;
    }
  }

  if (endpoint.startsWith("/api/expenses/")) {
    const expId = endpoint.split("/")[3];
    if (upperMethod === "PUT") {
      const updated = (expenses || []).map((exp) => (exp.id === expId ? { ...exp, ...body } : exp));
      if (setExpenses) setExpenses(updated);
      safeSetItem("localStorage", "velotime_guest_expenses", JSON.stringify(updated));
      return { id: expId, ...body };
    }
    if (upperMethod === "DELETE") {
      const updated = (expenses || []).filter((exp) => exp.id !== expId);
      if (setExpenses) setExpenses(updated);
      safeSetItem("localStorage", "velotime_guest_expenses", JSON.stringify(updated));
      return { success: true };
    }
  }

  // 3. Timesheet Submissions Endpoints
  if (endpoint === "/api/timesheet-submissions") {
    if (upperMethod === "GET") {
      return submissions || [];
    }
    if (upperMethod === "POST") {
      const newSub = {
        id: `sub_${Date.now()}`,
        userId: GUEST_USER_ID,
        user: { firstName: "Guest", lastName: "Evaluator", email: "guest@velotime.local" },
        weekStartDate: body?.weekStartDate || new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
        totalHours: totalGuestHours,
        billableHours: totalGuestHours,
        status: "submitted",
        submittedAt: new Date().toISOString(),
        note: body?.note || null,
      };
      const updated = [newSub, ...(submissions || [])];
      if (setSubmissions) setSubmissions(updated);
      return newSub;
    }
  }

  if (endpoint.startsWith("/api/timesheet-submissions/") && endpoint.endsWith("/status")) {
    const subId = endpoint.split("/")[3];
    const updated = (submissions || []).map((s) => (s.id === subId ? { ...s, status: body.status, note: body.note || s.note } : s));
    if (setSubmissions) setSubmissions(updated);
    return { success: true };
  }

  if (endpoint === "/api/timesheet/unlock") {
    const { weekStartDate } = body || {};
    const updated = (submissions || []).map((s) => (s.weekStartDate === weekStartDate ? { ...s, status: "draft" } : s));
    if (setSubmissions) setSubmissions(updated);
    return { success: true };
  }

  // 4. Users / Team Endpoints
  if (endpoint === "/api/users") {
    return orgUsers || [];
  }

  if (endpoint.startsWith("/api/users/") && endpoint.endsWith("/rates")) {
    const uId = endpoint.split("/")[3];
    const updated = (orgUsers || []).map((u) => (u.id === uId ? { ...u, defaultCostRate: body.defaultCostRate, defaultBillingRate: body.defaultBillingRate } : u));
    if (setOrgUsers) setOrgUsers(updated);
    return { success: true };
  }

  if (endpoint.startsWith("/api/users/") && endpoint.endsWith("/role")) {
    const uId = endpoint.split("/")[3];
    const updated = (orgUsers || []).map((u) => (u.id === uId ? { ...u, role: body.role } : u));
    if (setOrgUsers) setOrgUsers(updated);
    return { success: true };
  }

  // 5. Tasks / Rates Endpoints
  if (endpoint.startsWith("/api/tasks/") && endpoint.includes("/rates")) {
    const taskId = endpoint.split("/")[3];
    if (setTaskRates) {
      setTaskRates((prev) => {
        const filtered = prev.filter((tr) => !(tr.taskId === taskId && tr.userId === (body.targetUserId || GUEST_USER_ID)));
        return [...filtered, { taskId, userId: body.targetUserId || GUEST_USER_ID, billingRate: body.billingRate, costRate: body.costRate }];
      });
    }
    return { success: true };
  }

  // 6. Organization Settings
  if (endpoint === "/api/organization") {
    if (body?.name && setDbUser) {
      setDbUser((prev) => prev ? { ...prev, organization: { ...prev.organization, name: body.name } } : prev);
    }
    return { success: true };
  }

  if (endpoint === "/api/organization/invoice-settings") {
    if ((body?.invoicePrefix || body?.nextInvoiceNumber) && setDbUser) {
      setDbUser((prev) => prev ? { ...prev, organization: { ...prev.organization, invoicePrefix: body.invoicePrefix || prev.organization.invoicePrefix, nextInvoiceNumber: body.nextInvoiceNumber || prev.organization.nextInvoiceNumber } } : prev);
    }
    return { success: true };
  }

  // 7. Active Stopwatch & Timer Simulation in Guest Sandbox
  if (endpoint === "/api/timer/toggle") {
    const { action, taskId, dateId } = body || {};
    let updatedUser = { ...dbUser };
    if (action === "start") {
      updatedUser.activeTimerTaskId = taskId;
      updatedUser.activeTimerDateId = dateId;
      updatedUser.activeTimerStart = new Date().toISOString();
    } else {
      if (updatedUser.activeTimerStart && updatedUser.activeTimerTaskId && updatedUser.activeTimerDateId) {
        const elapsedHours = (Date.now() - new Date(updatedUser.activeTimerStart).getTime()) / (1000 * 60 * 60);
        const roundedHours = Math.max(0.1, Math.round(elapsedHours * 10) / 10);
        const key = `${GUEST_USER_ID}_${updatedUser.activeTimerDateId}_${updatedUser.activeTimerTaskId}`;
        if (setEntries) {
          setEntries((prev) => ({
            ...prev,
            [key]: (parseFloat(prev[key]) || 0) + roundedHours,
          }));
        }
      }
      updatedUser.activeTimerTaskId = null;
      updatedUser.activeTimerDateId = null;
      updatedUser.activeTimerStart = null;
    }
    if (setDbUser) setDbUser(updatedUser);
    return { success: true, user: updatedUser };
  }

  if (endpoint === "/api/timer/active") {
    return {
      activeTimerTaskId: dbUser?.activeTimerTaskId || null,
      activeTimerDateId: dbUser?.activeTimerDateId || null,
      activeTimerStart: dbUser?.activeTimerStart || null,
    };
  }

  if (endpoint.startsWith("/api/projects/") && upperMethod === "PUT") {
    const projId = endpoint.split("/")[3];
    if (setProjects) {
      setProjects((prev) => prev.map((p) => (p.id === projId ? { ...p, ...body } : p)));
    }
    return { success: true, project: { id: projId, ...body } };
  }

  // 8. Stripe / Billing Simulation
  if (endpoint.includes("/stripe")) {
    return { url: "#" };
  }

  // Fallbacks
  if (upperMethod === "GET") {
    return [];
  }
  return { success: true };
}
