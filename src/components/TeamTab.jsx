import React, { useState, useEffect } from "react";

export default function TeamTab({
  dbUser,
  orgUsers,
  projects,
  entries,
  taskRates,
  apiCall,
  forceSync,
}) {
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
    } catch (e) {
      alert("Failed to save default rate");
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

  if (!orgUsers || orgUsers.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center m-8 border-2 border-dashed border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 transition-colors">
        <h2 className="text-xl font-bold text-slate-400 dark:text-slate-600 ">
          No team members found.
        </h2>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-6xl mx-auto w-full h-full overflow-auto no-scrollbar flex flex-col">
      <div className="mb-8">
        <h1 className="text-3xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
          Team Management
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-500 mt-1">
          Manage team members, default rates, and view hours by project.
        </p>
      </div>

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
