import React, { useState, useEffect } from "react";
import { useToast } from "../contexts/ToastContext";

export default function TeamTab({
  dbUser,
  orgUsers,
  projects,
  entries,
  taskRates,
  apiCall,
  forceSync,
}) {
  const { addToast } = useToast();
  const [rates, setRates] = useState({});
  const [savingUserId, setSavingUserId] = useState(null);

  useEffect(() => {
    const initial = {};
    orgUsers.forEach((u) => {
      initial[u.id] = {
        costRate: u.defaultCostRate ?? "",
        billingRate: u.defaultBillingRate ?? "",
      };
    });
    setRates(initial);
  }, [orgUsers]);

  const handleSave = async (userId) => {
    setSavingUserId(userId);
    try {
      await apiCall(`/api/users/${userId}/rates`, "PUT", {
        defaultCostRate: rates[userId].costRate,
        defaultBillingRate: rates[userId].billingRate,
      });
      forceSync();
      addToast("Default rate saved successfully", "success");
    } catch (e) {
      addToast("Failed to save default rate", "error");
    } finally {
      setSavingUserId(null);
    }
  };

  const getEmployeeProjectHours = (userId) => {
    const breakdown = [];
    projects.forEach((p) => {
      let sum = 0;
      p.tasks.forEach((t) => {
        Object.entries(entries).forEach(([key, hours]) => {
          if (key.startsWith(`${userId}_`) && key.endsWith(`_${t.id}`)) {
            sum += parseFloat(hours) || 0;
          }
        });
      });
      if (sum > 0) {
        breakdown.push({ projectName: p.name, hours: sum });
      }
    });
    return breakdown.sort((a, b) => b.hours - a.hours);
  };

  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("employee");
  const [isSendingInvite, setIsSendingInvite] = useState(false);

  const handleSendInvite = async (e) => {
    e.preventDefault();
    if (!inviteEmail || !inviteEmail.includes("@")) {
      addToast("Please provide a valid email address", "error");
      return;
    }

    setIsSendingInvite(true);
    try {
      if (apiCall) {
        await apiCall(
          "/api/invitations",
          "POST",
          { email: inviteEmail.trim(), role: inviteRole },
          `Invitation sent to ${inviteEmail.trim()}`
        );
      } else {
        addToast(`Invitation sent to ${inviteEmail.trim()}`, "success");
      }
      setIsInviteModalOpen(false);
      setInviteEmail("");
      setInviteRole("employee");
      if (forceSync) forceSync();
    } catch (err) {
      addToast(err.message || "Failed to send team invitation", "error");
    } finally {
      setIsSendingInvite(false);
    }
  };

  const isAdmin = dbUser?.role === "admin" || dbUser?.role === "owner";

  if (!orgUsers || orgUsers.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center m-8 border-2 border-dashed border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 transition-colors p-8">
        <h2 className="text-xl font-bold text-slate-700 dark:text-slate-300 mb-2">
          No team members found
        </h2>
        <p className="text-sm text-slate-500 mb-6 text-center max-w-sm">
          Invite your agency staff and contractors to start logging time and tracking project profitability.
        </p>
        {isAdmin && (
          <button
            onClick={() => setIsInviteModalOpen(true)}
            className="bg-slate-900 hover:bg-slate-800 text-white font-bold py-2.5 px-6 text-sm transition-colors cursor-pointer"
          >
            Invite First Member
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="p-8 max-w-6xl mx-auto w-full h-full overflow-auto no-scrollbar flex flex-col">
      <div className="mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
            Team Management
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-500 mt-1">
            Manage team members, default rates, and view hours by project.
          </p>
        </div>

        {isAdmin && (
          <button
            onClick={() => setIsInviteModalOpen(true)}
            className="self-start sm:self-auto bg-slate-900 hover:bg-slate-800 text-white font-bold py-2 px-4 text-xs transition-colors flex items-center gap-2 cursor-pointer shrink-0"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
            </svg>
            Invite Member
          </button>
        )}
      </div>

      {/* Invite Member Modal */}
      {isInviteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs px-4">
          <div className="bg-white dark:bg-zinc-900 w-full max-w-md border border-slate-300 dark:border-zinc-700 shadow-2xl">
            <div className="p-6 border-b border-slate-300 dark:border-zinc-700">
              <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                Invite Team Member
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Send an email invitation to join your VeloTime workspace.
              </p>
            </div>

            <form onSubmit={handleSendInvite} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                  Email Address
                </label>
                <input
                  type="email"
                  required
                  placeholder="colleague@agency.com"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  className="w-full bg-white dark:bg-zinc-900 border border-slate-300 dark:border-zinc-700 p-2.5 text-sm text-slate-900 dark:text-slate-100 outline-none focus:border-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                  Role
                </label>
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value)}
                  className="w-full bg-white dark:bg-zinc-900 border border-slate-300 dark:border-zinc-700 p-2.5 text-sm text-slate-900 dark:text-slate-100 outline-none focus:border-slate-900"
                >
                  <option value="employee">Employee (Logs time and views own timesheet)</option>
                  <option value="manager">Manager (Can approve timesheets & manage projects)</option>
                  <option value="admin">Admin (Full billing and workspace permissions)</option>
                </select>
              </div>

              <div className="pt-4 border-t border-slate-200 dark:border-zinc-800 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsInviteModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSendingInvite}
                  className="bg-slate-900 hover:bg-slate-800 text-white font-bold py-2 px-5 text-xs transition-colors cursor-pointer disabled:opacity-50"
                >
                  {isSendingInvite ? "Sending..." : "Send Invitation"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="grid gap-6">
        {orgUsers.map((u) => {
          const projectHours = getEmployeeProjectHours(u.id);
          const totalHours = projectHours.reduce((sum, p) => sum + p.hours, 0);

          return (
            <div
              key={u.id}
              className="bg-white dark:bg-zinc-900 border border-slate-300 dark:border-zinc-700 overflow-hidden flex flex-col md:flex-row transition-colors"
            >
              {/* Left Side: Member Info & Rates */}
              <div className="p-6 md:w-1/2 border-b md:border-b-0 md:border-r border-slate-300 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-950/50 flex flex-col justify-between transition-colors">
                <div>
                  <div className="flex items-center gap-3 mb-1">
                    <span className="font-bold text-xl text-slate-900 dark:text-slate-100 ">
                      {u.firstName} {u.lastName}
                    </span>
                    <span className="text-xs font-semibold text-slate-500 dark:text-slate-500 uppercase tracking-wider bg-gray-200 dark:bg-zinc-950 px-2 py-0.5 ">
                      {u.role}
                    </span>
                  </div>
                  <div className="text-sm text-slate-500 dark:text-slate-500 mb-6">{u.email}</div>
                </div>

                <div className="flex flex-col gap-3">
                  <div className="flex items-center justify-between gap-4 bg-white dark:bg-zinc-900 p-3 border border-slate-300 dark:border-zinc-700 transition-colors">
                    <label className="text-xs font-bold text-slate-500 dark:text-slate-500 uppercase">
                      Default Cost / hr
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-2 text-slate-400 dark:text-slate-600 text-sm font-semibold">
                        $
                      </span>
                      <input
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        className="w-28 pl-7 pr-2 py-1.5 text-sm border border-slate-300 dark:border-zinc-700 font-semibold focus:outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900 bg-white dark:bg-zinc-900 text-slate-900 dark:text-slate-100 transition-colors"
                        value={rates[u.id]?.costRate ?? ""}
                        onChange={(e) =>
                          setRates({
                            ...rates,
                            [u.id]: {
                              ...rates[u.id],
                              costRate: e.target.value,
                            },
                          })
                        }
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-4 bg-white dark:bg-zinc-900 p-3 border border-slate-300 dark:border-zinc-700 transition-colors">
                    <label className="text-xs font-bold text-slate-500 dark:text-slate-500 uppercase">
                      Default Bill / hr
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-2 text-slate-400 dark:text-slate-600 text-sm font-semibold">
                        $
                      </span>
                      <input
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        className="w-28 pl-7 pr-2 py-1.5 text-sm border border-slate-300 dark:border-zinc-700 font-semibold focus:outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900 bg-white dark:bg-zinc-900 text-slate-900 dark:text-slate-100 transition-colors"
                        value={rates[u.id]?.billingRate ?? ""}
                        onChange={(e) =>
                          setRates({
                            ...rates,
                            [u.id]: {
                              ...rates[u.id],
                              billingRate: e.target.value,
                            },
                          })
                        }
                      />
                    </div>
                  </div>

                  <button
                    onClick={() => handleSave(u.id)}
                    disabled={savingUserId === u.id}
                    className="mt-2 text-sm font-bold bg-slate-900 hover:bg-slate-900 disabled:bg-blue-400 text-white py-2 transition-colors w-full"
                  >
                    {savingUserId === u.id ? "Saving..." : "Save Default Rates"}
                  </button>
                </div>
              </div>

              {/* Right Side: Hours Breakdown */}
              <div className="p-6 md:w-1/2 bg-white dark:bg-zinc-900 flex flex-col transition-colors">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-bold text-slate-700 dark:text-slate-300 text-sm uppercase tracking-wider">
                    Project Hours
                  </h3>
                  <span className="font-black text-primary-600 bg-primary-50 px-3 py-1 text-sm border border-slate-900 ">
                    Total: {totalHours.toFixed(2)} hrs
                  </span>
                </div>

                {projectHours.length === 0 ? (
                  <div className="flex-1 flex items-center justify-center text-slate-400 dark:text-slate-600 text-sm italic bg-slate-50 dark:bg-zinc-950 border border-dashed border-slate-300 dark:border-zinc-700 ">
                    No hours logged yet.
                  </div>
                ) : (
                  <div className="flex-1 overflow-y-auto pr-2 flex flex-col gap-2 max-h-64">
                    {projectHours.map((ph) => (
                      <div
                        key={ph.projectName}
                        className="flex justify-between items-center p-3 hover:bg-slate-50 dark:bg-zinc-950 border border-slate-300 dark:border-zinc-700 transition-colors"
                      >
                        <span className="font-semibold text-slate-700 dark:text-slate-300 text-sm truncate pr-4">
                          {ph.projectName}
                        </span>
                        <span className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                          {ph.hours.toFixed(2)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
