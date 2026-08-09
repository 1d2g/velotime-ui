import React, { useState, useEffect, useMemo, useRef } from "react";
import TimesheetCell from "./TimesheetCell";
import AddTaskPopover from "./AddTaskPopover";
import AddProjectPopover from "./AddProjectPopover";
import LiveTimerDisplay from "./LiveTimerDisplay";

export default function TimesheetMatrix({
  dates: propDates,
  projects,
  entries,
  notes = {},
  dbUser,
  orgUsers,
  viewUserId,
  timeframe = "month",
  onCellChange,
  onNoteChange,
  onAddTask,
  onRemoveTask,
  onAddProject,
  onToggleCollapse,
  searchQuery = "",
  onReorderProject,
  onToggleTimer,
}) {
  const [selectedCell, setSelectedCell] = useState(null);
  const [isEditing, setIsEditing] = useState(false);

  const [activeTaskPopover, setActiveTaskPopover] = useState(null);
  const [isAddingProject, setIsAddingProject] = useState(false);

  const [showMissingNotes, setShowMissingNotes] = useState(false);
  const [showWeekends, setShowWeekends] = useState(false);

  const dates = useMemo(() => {
    return propDates.filter(d => {
      if (timeframe !== 'week') return true;
      if (showWeekends) return true;
      const day = new Date(d.id).getDay();
      return day !== 0 && day !== 6;
    });
  }, [propDates, timeframe, showWeekends]);

  // Dynamic Height Measuring
  const containerRef = useRef(null);
  const theadRef = useRef(null);
  const [heights, setHeights] = useState({ container: 0, thead: 0 });
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const updateHeights = () => {
      setHeights({
        container: containerRef.current ? containerRef.current.offsetHeight : 0,
        thead: theadRef.current ? theadRef.current.offsetHeight : 0,
      });
      setIsMobile(window.innerWidth < 768);
    };

    updateHeights();
    window.addEventListener("resize", updateHeights);

    const ro = new ResizeObserver(updateHeights);
    if (containerRef.current) ro.observe(containerRef.current);
    if (theadRef.current) ro.observe(theadRef.current);

    return () => {
      window.removeEventListener("resize", updateHeights);
      ro.disconnect();
    };
  }, []);

  const calculatedNoteRowHeight = useMemo(() => {
    if (!["day", "week"].includes(timeframe) || heights.container === 0) {
      return 56; // Default fallback
    }
    // With accordion, only one note row is expanded at a time!
    // So we can make the active note row take a comfortable height, or scale it to fit.
    // Let's make it a nice comfortable height, e.g. 72px, so it's spacious but doesn't push the table off screen.
    return 72;
  }, [timeframe, heights]);

  const capacityGoal = useMemo(() => {
    return timeframe === "day" ? 8.0 : 40.0;
  }, [timeframe]);

  const totalHours = useMemo(() => {
    let sum = 0;
    dates.forEach((d) => {
      projects.forEach((p) => {
        p.tasks.forEach((t) => {
          sum += entries[`${viewUserId}_${d.id}_${t.id}`] || 0;
        });
      });
    });
    return sum;
  }, [dates, projects, entries]);

  const projectBreakdown = useMemo(() => {
    const breakdown = {};
    let totalSum = 0;
    projects.forEach((p) => {
      let projSum = 0;
      p.tasks.forEach((t) => {
        dates.forEach((d) => {
          projSum += entries[`${viewUserId}_${d.id}_${t.id}`] || 0;
        });
      });
      if (projSum > 0) {
        breakdown[p.name] = projSum;
        totalSum += projSum;
      }
    });

    return Object.entries(breakdown)
      .map(([name, hours]) => ({
        name,
        hours,
        percentage: totalSum > 0 ? (hours / totalSum) * 100 : 0,
      }))
      .sort((a, b) => b.hours - a.hours);
  }, [dates, projects, entries]);

  const missingNotesCount = useMemo(() => {
    let count = 0;
    dates.forEach((d) => {
      projects.forEach((p) => {
        p.tasks.forEach((t) => {
          const hours = entries[`${viewUserId}_${d.id}_${t.id}`] || 0;
          const note = notes[`${viewUserId}_${d.id}_${t.id}`] || "";
          if (hours > 0 && note.trim() === "") {
            count++;
          }
        });
      });
    });
    return count;
  }, [dates, projects, entries, notes]);

  const writeAllowed = dbUser
    ? dbUser.role === "admin" || dbUser.role === "manager"
    : true;

  const gridRows = useMemo(() => {
    const rows = [];
    dates.forEach((d) => {
      rows.push({ type: "hours", date: d, id: `${d.id}_hours` });
      if (["day", "week"].includes(timeframe)) {
        rows.push({ type: "notes", date: d, id: `${d.id}_notes` });
      }
    });
    return rows;
  }, [dates, timeframe]);

  const rowKeys = gridRows.map((r) => r.id);

  const filteredProjects = useMemo(() => {
    if (!searchQuery) return projects;
    const lowerQ = searchQuery.toLowerCase();
    return projects.filter((p) => p.name.toLowerCase().includes(lowerQ));
  }, [projects, searchQuery]);

  const visibleColKeys = [
    ...filteredProjects.flatMap((p) =>
      p.isCollapsed
        ? [`proj_${p.id}`]
        : [...p.tasks.map((t) => t.id), `add_task_${p.id}`],
    ),
    "add_project",
  ];

  // Helper to determine if a specific date row is the active one
  const activeDateId = useMemo(() => {
    if (!selectedCell) return null;
    const rowId = rowKeys[selectedCell.r];
    if (!rowId) return null;
    // Extract date from either "YYYY-MM-DD_hours" or "YYYY-MM-DD_notes"
    return rowId.split("_")[0];
  }, [selectedCell, rowKeys]);

  useEffect(() => {
    const handleGlobalKeyDown = (e) => {
      if (activeTaskPopover || isAddingProject) return;
      if (
        document.activeElement &&
        document.activeElement.tagName === "INPUT" &&
        !document.activeElement.id.startsWith("cell_")
      )
        return;
      if (
        document.activeElement &&
        document.activeElement.tagName === "TEXTAREA"
      )
        return;

      if (selectedCell) {
        if (e.key === "Backspace" && (e.ctrlKey || e.metaKey)) {
          e.preventDefault();
          const colKey = visibleColKeys[selectedCell.c];
          if (!colKey.startsWith("add_") && !colKey.startsWith("proj_")) {
            projects.forEach((p) => {
              if (p.tasks.find((t) => t.id === colKey))
                onRemoveTask(p.id, colKey);
            });
          }
          return;
        }

        if (e.key === " " && (e.ctrlKey || e.metaKey)) {
          e.preventDefault();
          const colKey = visibleColKeys[selectedCell.c];
          let targetProjId = null;

          if (colKey.startsWith("proj_"))
            targetProjId = colKey.replace("proj_", "");
          else if (colKey.startsWith("add_task_"))
            targetProjId = colKey.replace("add_task_", "");
          else if (colKey === "add_project") return;
          else {
            const proj = projects.find((p) =>
              p.tasks.some((t) => t.id === colKey),
            );
            if (proj) targetProjId = proj.id;
          }
          if (targetProjId) onToggleCollapse(targetProjId);
          return;
        }
      }

      if (isEditing) {
        if (e.key === "Enter") {
          e.preventDefault();
          setIsEditing(false);
          let nextR = selectedCell.r + (e.shiftKey ? -1 : 1);
          if (nextR >= 0 && nextR < rowKeys.length) {
            setSelectedCell({ r: nextR, c: selectedCell.c });
            document
              .getElementById(
                `cell_${rowKeys[nextR]}_${visibleColKeys[selectedCell.c]}`,
              )
              ?.focus();
          } else {
            document
              .getElementById(
                `cell_${rowKeys[selectedCell.r]}_${visibleColKeys[selectedCell.c]}`,
              )
              ?.focus();
          }
        } else if (e.key === "Escape") {
          e.preventDefault();
          setIsEditing(false);
          document
            .getElementById(
              `cell_${rowKeys[selectedCell.r]}_${visibleColKeys[selectedCell.c]}`,
            )
            ?.focus();
        } else if (e.key === "Tab") {
          e.preventDefault();
          setIsEditing(false);
          let nextC = selectedCell.c + (e.shiftKey ? -1 : 1);
          let nextR = selectedCell.r;
          if (nextC >= visibleColKeys.length) {
            nextC = 0;
            nextR++;
          }
          if (nextC < 0) {
            nextC = visibleColKeys.length - 1;
            nextR--;
          }
          if (nextR >= 0 && nextR < rowKeys.length) {
            setSelectedCell({ r: nextR, c: nextC });
            document
              .getElementById(`cell_${rowKeys[nextR]}_${visibleColKeys[nextC]}`)
              ?.focus();
          }
        }
        return;
      }

      if (!selectedCell) {
        if (e.key.startsWith("Arrow")) {
          e.preventDefault();
          if (rowKeys.length > 0 && visibleColKeys.length > 0) {
            setSelectedCell({ r: 0, c: 0 });
            document
              .getElementById(`cell_${rowKeys[0]}_${visibleColKeys[0]}`)
              ?.focus();
          }
        }
        return;
      }

      if (e.key.startsWith("Arrow")) {
        e.preventDefault();
        let nextR = selectedCell.r;
        let nextC = selectedCell.c;
        if (e.key === "ArrowUp") nextR -= 1;
        if (e.key === "ArrowDown") nextR += 1;
        if (e.key === "ArrowLeft") nextC -= 1;
        if (e.key === "ArrowRight") nextC += 1;

        if (
          nextR >= 0 &&
          nextR < rowKeys.length &&
          nextC >= 0 &&
          nextC < visibleColKeys.length
        ) {
          setSelectedCell({ r: nextR, c: nextC });
          document
            .getElementById(`cell_${rowKeys[nextR]}_${visibleColKeys[nextC]}`)
            ?.focus();
        }
      } else if (e.key === "Enter" || e.key === "F2") {
        e.preventDefault();
        const currentColKey = visibleColKeys[selectedCell.c];

        if (currentColKey === "add_project") {
          setIsAddingProject(true);
          setActiveTaskPopover(null);
        } else if (currentColKey.startsWith("add_task_")) {
          const projectId = currentColKey.replace("add_task_", "");
          setActiveTaskPopover(projectId);
          setIsAddingProject(false);
        } else {
          const rowId = rowKeys[selectedCell.r];
          if (rowId.endsWith("_notes")) {
            document
              .getElementById(`cell_textarea_${rowId}_${currentColKey}`)
              ?.focus();
          } else {
            setIsEditing(true);
          }
        }
      } else if (e.key === "Tab") {
        e.preventDefault();
        let nextC = selectedCell.c + (e.shiftKey ? -1 : 1);
        let nextR = selectedCell.r;
        if (nextC >= visibleColKeys.length) {
          nextC = 0;
          nextR++;
        }
        if (nextC < 0) {
          nextC = visibleColKeys.length - 1;
          nextR--;
        }
        if (nextR >= 0 && nextR < rowKeys.length) {
          setSelectedCell({ r: nextR, c: nextC });
          document
            .getElementById(`cell_${rowKeys[nextR]}_${visibleColKeys[nextC]}`)
            ?.focus();
        }
      } else if (
        e.key === " " &&
        !e.ctrlKey &&
        !e.metaKey &&
        ["day", "week"].includes(timeframe)
      ) {
        e.preventDefault();
        const currentColKey = visibleColKeys[selectedCell.c];
        const isTaskCell =
          !currentColKey.startsWith("add_") &&
          !currentColKey.startsWith("proj_");
        if (isTaskCell) {
          const rowId = rowKeys[selectedCell.r];
          if (rowId.endsWith("_notes")) {
            document
              .getElementById(`cell_textarea_${rowId}_${currentColKey}`)
              ?.focus();
          } else {
            const nextR = selectedCell.r + 1;
            if (nextR < rowKeys.length && rowKeys[nextR].endsWith("_notes")) {
              setSelectedCell({ r: nextR, c: selectedCell.c });
              setTimeout(() => {
                document
                  .getElementById(
                    `cell_textarea_${rowKeys[nextR]}_${currentColKey}`,
                  )
                  ?.focus();
              }, 10);
            }
          }
        }
      } else if (
        /^[a-zA-Z0-9-.,]$/.test(e.key) ||
        e.key === "Backspace" ||
        e.key === "Delete"
      ) {
        const currentColKey = visibleColKeys[selectedCell.c];

        if (currentColKey === "add_project") {
          e.preventDefault();
          setIsAddingProject(true);
          setActiveTaskPopover(null);
        } else if (currentColKey.startsWith("add_task_")) {
          e.preventDefault();
          const projectId = currentColKey.replace("add_task_", "");
          setActiveTaskPopover(projectId);
          setIsAddingProject(false);
        } else {
          const rowId = rowKeys[selectedCell.r];
          if (rowId.endsWith("_notes")) {
            e.preventDefault();
            document
              .getElementById(`cell_textarea_${rowId}_${currentColKey}`)
              ?.focus();
          } else {
            setIsEditing(true);
            const inputEl = document.getElementById(
              `cell_input_${rowId}_${currentColKey}`,
            );
            if (inputEl) {
              inputEl.focus();
              if (/^[0-9.]$/.test(e.key)) {
                e.preventDefault();
                const dateId = gridRows[selectedCell.r].date.id;
                onCellChange(dateId, currentColKey, e.key, viewUserId);
              } else if (e.key === "Backspace" || e.key === "Delete") {
                e.preventDefault();
                const dateId = gridRows[selectedCell.r].date.id;
                onCellChange(dateId, currentColKey, "", viewUserId);
              }
            }
          }
        }
      }
    };

    window.addEventListener("keydown", handleGlobalKeyDown);
    return () => window.removeEventListener("keydown", handleGlobalKeyDown);
  }, [
    isEditing,
    selectedCell,
    rowKeys,
    visibleColKeys,
    activeTaskPopover,
    isAddingProject,
    projects,
    onRemoveTask,
    onToggleCollapse,
    timeframe,
    gridRows,
  ]);

  const getRowTotal = (dateId) => {
    let total = 0;
    projects.forEach((p) =>
      p.tasks.forEach((t) => {
        total += entries[`${viewUserId}_${dateId}_${t.id}`] || 0;
      }),
    );
    return total;
  };

  const getProjectTotal = (dateId, project) => {
    return project.tasks.reduce(
      (sum, t) => sum + (entries[`${viewUserId}_${dateId}_${t.id}`] || 0),
      0,
    );
  };

  const stickyLeft1 =
    "sticky left-0 z-20 bg-white dark:bg-zinc-900 border-r border-b border-slate-300 dark:border-zinc-700 ";
  const stickyLeft2 =
    "sticky left-24 z-20 bg-white dark:bg-zinc-900 border-r border-b border-slate-300 dark:border-zinc-700 ";
  const stickyLeft3 =
    "sticky left-48 z-20 border-r border-b border-slate-300 dark:border-zinc-700 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] ";
  const stickyRight =
    "sticky right-0 z-30 bg-white dark:bg-zinc-900 border-l border-b border-slate-300 dark:border-zinc-700 shadow-[-2px_0_5px_-2px_rgba(0,0,0,0.1)] ";

  if (isMobile) {
    return (
      <div
        ref={containerRef}
        className="flex-1 flex flex-col p-4 gap-4 overflow-y-auto bg-slate-50 dark:bg-zinc-950 text-xs"
      >
        {/* Mobile Capacity Progress Indicator */}
        <div className="bg-white dark:bg-zinc-900 border border-slate-300 dark:border-zinc-700 p-4 flex items-center justify-between shrink-0">
          <div>
            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-600 uppercase tracking-wider block">
              Weekly Progress
            </span>
            <span className="text-lg font-black text-slate-900 dark:text-slate-100 ">
              {totalHours.toFixed(1)} / {capacityGoal.toFixed(1)} hrs
            </span>
          </div>
          <div className="text-right">
            <span
              className={`px-2.5 py-1 text-[10px] font-bold ${totalHours >= capacityGoal ? "bg-emerald-100 text-emerald-700 " : "bg-primary-100 text-primary-700 "}`}
            >
              {totalHours >= capacityGoal
                ? "100% Achieved"
                : `${Math.round((totalHours / capacityGoal) * 100)}%`}
            </span>
          </div>
        </div>

        {/* Daily Stack */}
        <div className="flex flex-col gap-4">
          {dates.map((dateObj) => {
            const dayTotal = getRowTotal(dateObj.id);
            return (
              <div
                key={dateObj.id}
                className={`bg-white dark:bg-zinc-900 border ${dateObj.isToday ? "border-slate-900 ring-1 ring-slate-900 " : "border-slate-300 dark:border-zinc-700 "} overflow-hidden`}
              >
                {/* Day Header */}
                <div className="bg-slate-50 dark:bg-zinc-950 px-4 py-3 border-b border-slate-300 dark:border-zinc-700 flex justify-between items-center">
                  <div>
                    <span className="font-bold text-gray-850 text-sm mr-2">
                      {dateObj.label}
                    </span>
                    <span className="text-slate-400 dark:text-slate-600 ">{dateObj.dateStr}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-black text-slate-700 dark:text-slate-300 bg-gray-200 dark:bg-zinc-950 px-2 py-0.5 rounded">
                      {dayTotal.toFixed(1)} hrs
                    </span>
                  </div>
                </div>

                {/* Tasks List inside Day */}
                <div className="divide-y divide-gray-150 ">
                  {projects.map((p) => (
                    <React.Fragment key={`${dateObj.id}_proj_${p.id}`}>
                      {p.tasks.map((t) => {
                        const cellKey = `${viewUserId}_${dateObj.id}_t_${t.id}`; // wait, is the key prefix user_date_task in main App? Yes, wait! Let's check how the key was formatted:
                        // `${viewUserId}_${dateObj.id}_${t.id}`!
                        // Let's use `${viewUserId}_${dateObj.id}_${t.id}` to be safe!
                        const cellKeySafe = `${viewUserId}_${dateObj.id}_${t.id}`;
                        const val = entries[cellKeySafe] || 0;
                        const note = notes[cellKeySafe] || "";
                        return (
                          <div
                            key={`${dateObj.id}_task_${t.id}`}
                            className="p-4 flex flex-col gap-3"
                          >
                            {/* Task Title & Hours Input */}
                            <div className="flex justify-between items-center gap-4">
                              <div className="min-w-0">
                                <span className="text-[10px] font-bold text-primary-600 block truncate">
                                  {p.name}
                                </span>
                                <span className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate flex items-center gap-2">
                                  {t.name}
                                  {dbUser?.activeTimerTaskId === t.id && dbUser?.activeTimerDateId === dateObj.id && (
                                    <span className="text-xs text-rose-500 font-bold bg-rose-50 dark:bg-rose-950/30 px-1.5 py-0.5 rounded animate-pulse inline-flex items-center gap-1">
                                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                      <LiveTimerDisplay startTime={dbUser.activeTimerStart} />
                                    </span>
                                  )}
                                </span>
                              </div>
                              <div className="flex items-center gap-1.5 shrink-0">
                                {dbUser?.activeTimerTaskId === t.id && dbUser?.activeTimerDateId === dateObj.id ? (
                                  <button
                                    onClick={() => onToggleTimer(t.id, dateObj.id, "stop")}
                                    className="p-1.5 bg-rose-100 dark:bg-rose-900/50 text-rose-600 hover:bg-rose-200 rounded animate-pulse"
                                    title="Stop Timer"
                                  >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v1" /></svg>
                                  </button>
                                ) : (
                                  <button
                                    onClick={() => onToggleTimer(t.id, dateObj.id, "start")}
                                    className="p-1.5 bg-slate-100 dark:bg-zinc-800 text-slate-400 hover:text-emerald-500 rounded"
                                    title="Start Timer"
                                  >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v1" /></svg>
                                  </button>
                                )}
                                <input
                                  type="number"
                                  min="0"
                                  max="24"
                                  step="0.5"
                                  value={val || ""}
                                  onChange={(e) =>
                                    onCellChange(
                                      dateObj.id,
                                      t.id,
                                      e.target.value,
                                      viewUserId,
                                    )
                                  }
                                  placeholder="0"
                                  className="w-16 text-center border border-slate-300 dark:border-zinc-700 p-1.5 font-bold text-sm bg-transparent text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-slate-900 outline-none"
                                />
                                <span className="text-[10px] font-bold text-slate-400 dark:text-slate-600 ">
                                  hrs
                                </span>
                              </div>
                            </div>

                            {/* Task Notes Input */}
                            <div className="flex gap-2 items-start">
                              <span className="text-slate-400 dark:text-slate-600 font-bold text-xs select-none mt-1.5">
                                ↳
                              </span>
                              <textarea
                                value={note}
                                onChange={(e) =>
                                  onNoteChange(
                                    dateObj.id,
                                    t.id,
                                    e.target.value,
                                    viewUserId,
                                  )
                                }
                                placeholder="Add notes..."
                                rows={2}
                                className="flex-1 text-xs border border-slate-300 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-950/50 px-2.5 py-1.5 text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-1 focus:ring-slate-900 resize-none leading-snug animate-none"
                              />
                            </div>
                          </div>
                        );
                      })}
                    </React.Fragment>
                  ))}
                  {projects.length === 0 ||
                  projects.every((p) => p.tasks.length === 0) ? (
                    <div className="p-8 text-center text-slate-400 dark:text-slate-600 italic">
                      No projects or tasks found. Tap the "Projects" tab to add
                      one.
                    </div>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="h-full flex flex-col overflow-hidden relative flex-1 bg-white dark:bg-zinc-900 "
    >
      <style>{`
 @keyframes expandColumn { 0% { width: 0; min-width: 0; max-width: 0; opacity: 0; padding-left: 0; padding-right: 0; } 100% { width: 6rem; min-width: 6rem; max-width: 6rem; opacity: 1; padding-left: 0.5rem; padding-right: 0.5rem; } }
 .animate-column { animation: expandColumn 0.25s cubic-bezier(0.2, 0.8, 0.2, 1) forwards; white-space: nowrap; }
 @keyframes collapseColumn { 0% { width: 12rem; min-width: 12rem; max-width: 12rem; opacity: 0.5; } 100% { width: 6rem; min-width: 6rem; max-width: 6rem; opacity: 1; } }
 .animate-collapse { animation: collapseColumn 0.25s cubic-bezier(0.2, 0.8, 0.2, 1) forwards; white-space: nowrap; }
 @keyframes expandTaskBtn { 0% { width: 0; min-width: 0; max-width: 0; opacity: 0; padding: 0; } 100% { width: 5rem; min-width: 5rem; max-width: 5rem; opacity: 1; padding: 0; } }
 .animate-task-btn { animation: expandTaskBtn 0.25s cubic-bezier(0.2, 0.8, 0.2, 1) forwards; white-space: nowrap; }
 
 /* FIX: Nuke the number input spinners */
 input[type="number"]::-webkit-outer-spin-button,
 input[type="number"]::-webkit-inner-spin-button {
 -webkit-appearance: none;
 margin: 0;
 }
 input[type="number"] {
 -moz-appearance: textfield;
 }
 `}</style>

      {(activeTaskPopover || isAddingProject) && (
        <div
          className="fixed inset-0 z-40 cursor-default"
          onClick={(e) => {
            e.stopPropagation();
            setActiveTaskPopover(null);
            setIsAddingProject(false);
          }}
        ></div>
      )}

      <div className="flex-1 overflow-auto no-scrollbar bg-white dark:bg-zinc-900 transition-colors">
        <table className="min-w-full w-max border-separate border-spacing-0 bg-white dark:bg-zinc-900 ">
          <thead ref={theadRef}>
            <tr className="bg-slate-100 dark:bg-zinc-800 ">
              <th
                className="sticky top-0 left-0 z-50 bg-white dark:bg-zinc-900 h-16 border-b border-r border-slate-300 dark:border-zinc-700 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] "
                colSpan={3}
              >
                <div className="flex items-center gap-4">
                  {timeframe === "week" && (
                    <label className="flex items-center gap-1.5 cursor-pointer text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 select-none transition-colors">
                      <input
                        type="checkbox"
                        className="w-3.5 h-3.5 text-blue-500 focus:ring-blue-500 border-slate-300 dark:border-zinc-700 rounded cursor-pointer bg-transparent"
                        checked={showWeekends}
                        onChange={(e) => setShowWeekends(e.target.checked)}
                      />
                      <span>Weekends</span>
                    </label>
                  )}
                  <label className="flex items-center gap-1.5 cursor-pointer text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 select-none transition-colors">
                    <input
                      type="checkbox"
                      className="w-3.5 h-3.5 text-red-500 focus:ring-red-500 border-slate-300 dark:border-zinc-700 rounded cursor-pointer bg-transparent"
                      checked={showMissingNotes}
                      onChange={(e) => setShowMissingNotes(e.target.checked)}
                    />
                    <span className={showMissingNotes ? "text-red-600 " : ""}>
                      Audit Notes
                    </span>
                  </label>
                </div>
              </th>
              <th className="sticky top-0 bg-white dark:bg-zinc-900 w-4 min-w-[1rem] max-w-[1rem] h-16 border-none"></th>

              {filteredProjects.map((p, pIndex) => (
                <React.Fragment key={`tier1_${p.id}`}>
                  <th
                    className={`sticky top-0 border-b border-slate-300 dark:border-zinc-700 px-2 h-16 bg-primary-100 text-slate-900 dark:text-slate-100 font-semibold z-30 transition-all duration-200 ${p.isCollapsed ? "w-24 min-w-[6rem] max-w-[6rem]" : ""} ${pIndex === 0 ? "tour-project-header" : ""}`}
                    colSpan={p.isCollapsed ? 1 : p.tasks.length}
                  >
                    <div className="sticky left-[18rem] flex items-center justify-start px-2 h-full w-max max-w-full gap-2">
                      <button
                        onClick={() => onToggleCollapse(p.id)}
                        className="text-primary-600 hover:text-blue-800 bg-white dark:bg-zinc-900/40 hover:bg-white dark:bg-zinc-900 rounded p-1 transition-all duration-200 flex-shrink-0 "
                        title="Collapse Project (Ctrl+Space)"
                      >
                        <svg
                          className={`w-3.5 h-3.5 transition-transform duration-200 ${p.isCollapsed ? "rotate-0" : "rotate-180"}`}
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="3"
                            d="M9 5l7 7-7 7"
                          />
                        </svg>
                      </button>
                      <span
                        className="truncate flex-1 text-left text-sm"
                        title={p.name}
                      >
                        {p.name}
                      </span>
                    </div>
                  </th>
                  {!p.isCollapsed && (
                    <th className="sticky top-0 bg-white dark:bg-zinc-900 w-20 h-16 z-30 border-0 border-b border-slate-300 dark:border-zinc-700 animate-task-btn overflow-hidden"></th>
                  )}
                  <th className="sticky top-0 bg-white dark:bg-zinc-900 w-4 min-w-[1rem] max-w-[1rem] h-16 border-none z-30"></th>
                </React.Fragment>
              ))}

              <th
                className={`${stickyRight} sticky top-0 z-50 bg-white dark:bg-zinc-900 w-14 min-w-[3.5rem] max-w-[3.5rem] border-b border-l border-slate-300 dark:border-zinc-700 p-1 relative`}
                rowSpan={2}
              >
                <button
                  onClick={() => {
                    setIsAddingProject(true);
                    setActiveTaskPopover(null);
                  }}
                  className="w-full h-full min-h-[5rem] flex flex-col items-center justify-center text-slate-400 dark:text-slate-600 hover:text-primary-600 transition-colors cursor-pointer"
                  title={
                    writeAllowed
                      ? "Add Project"
                      : "Please contact an administrator to add a project"
                  }
                >
                  <span className="text-[10px] uppercase font-bold tracking-tighter leading-tight mt-1">
                    Add
                    <br />
                    Proj
                  </span>
                  <span className="text-2xl leading-none font-light">+</span>
                </button>
                <AddProjectPopover
                  isActive={isAddingProject}
                  onClose={() => setIsAddingProject(false)}
                  onAddProject={onAddProject}
                  projects={projects}
                  writeAllowed={writeAllowed}
                />
              </th>
            </tr>

            <tr className="bg-slate-100 dark:bg-zinc-800 ">
              <th
                className={`${stickyLeft1} sticky top-16 z-50 p-2 w-24 min-w-[6rem] max-w-[6rem] text-center align-middle text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-zinc-800 border-b border-slate-300 dark:border-zinc-700`}
              >
                Client
              </th>
              <th
                className={`${stickyLeft2} sticky top-16 z-50 p-2 w-24 min-w-[6rem] max-w-[6rem] text-center align-middle text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-zinc-800 border-b border-slate-300 dark:border-zinc-700`}
              >
                Project
              </th>
              <th
                className={`${stickyLeft3} bg-primary-50 sticky top-16 z-50 p-2 w-20 min-w-[5rem] max-w-[5rem] text-center align-middle text-primary-800 border-b border-slate-300 dark:border-zinc-700`}
              >
                Total
              </th>
              <th className="sticky top-16 bg-white dark:bg-zinc-900 w-4 min-w-[1rem] max-w-[1rem] border-none z-30"></th>

              {filteredProjects.map((p) => (
                <React.Fragment key={`tier2_${p.id}`}>
                  {p.isCollapsed ? (
                    <th className="sticky top-16 border-b border-x border-slate-300 dark:border-zinc-700 px-1 py-4 bg-slate-50 dark:bg-zinc-950 text-xs font-bold text-slate-500 dark:text-slate-500 uppercase tracking-wider z-30 w-24 min-w-[6rem] max-w-[6rem] animate-collapse overflow-hidden">
                      Total
                    </th>
                  ) : (
                    <>
                      {p.tasks.map((t) => (
                        <th
                          key={t.id}
                          className="group sticky top-16 border-b border-r border-slate-300 dark:border-zinc-700 px-2 py-4 font-normal text-slate-600 dark:text-slate-400 dark:text-slate-600 bg-slate-50 dark:bg-zinc-950 w-24 min-w-[6rem] max-w-[6rem] text-center align-middle leading-tight z-30 animate-column overflow-hidden relative"
                        >
                          <span className="truncate block w-full px-2">
                            {t.name}
                          </span>

                          <div className="absolute top-1 left-1 flex items-center gap-1">
                            {/* Timer UI */}
                            {(() => {
                              const todayObj = dates.find(d => d.isToday) || dates[0];
                              const isRunning = dbUser?.activeTimerTaskId === t.id && dbUser?.activeTimerDateId === todayObj?.id;
                              
                              if (isRunning) {
                                return (
                                  <button
                                    onClick={() => onToggleTimer(t.id, todayObj?.id, "stop")}
                                    className="text-rose-500 hover:text-rose-600 dark:text-rose-400 font-black text-[10px] animate-pulse p-0.5"
                                    title="Stop Timer"
                                  >
                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v1" /></svg>
                                  </button>
                                );
                              }
                              return (
                                <button
                                  onClick={() => onToggleTimer(t.id, todayObj?.id, "start")}
                                  className="text-slate-400 hover:text-emerald-500 dark:text-slate-500 transition-all font-black text-[10px] p-0.5"
                                  title="Start Timer"
                                >
                                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v1" /></svg>
                                </button>
                              );
                            })()}
                          </div>

                          {/* Delete Button */}
                          {writeAllowed && (
                            <button
                              onClick={() => onRemoveTask(p.id, t.id)}
                              title="Delete Task (Ctrl+Backspace)"
                              className="absolute top-1 right-1 text-slate-400 dark:text-slate-600 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity p-0.5 bg-slate-50 dark:bg-zinc-950 rounded"
                            >
                              <svg
                                className="w-3 h-3"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth="2"
                                  d="M6 18L18 6M6 6l12 12"
                                ></path>
                              </svg>
                            </button>
                          )}
                        </th>
                      ))}
                      <AddTaskPopover
                        project={p}
                        isActive={activeTaskPopover === p.id}
                        isFirstInProject={p.tasks.length === 0}
                        onToggle={(id) => {
                          setActiveTaskPopover(
                            activeTaskPopover === id ? null : id,
                          );
                          setIsAddingProject(false);
                        }}
                        onAddTask={onAddTask}
                        writeAllowed={writeAllowed}
                      />
                    </>
                  )}
                  <th className="sticky top-16 bg-white dark:bg-zinc-900 w-4 min-w-[1rem] max-w-[1rem] border-none z-30 transition-colors"></th>
                </React.Fragment>
              ))}
            </tr>
          </thead>

          <tbody>
            {gridRows.map((gridRow, rIndex) => {
              const dateObj = gridRow.date;
              const isNotesRow = gridRow.type === "notes";

              if (isNotesRow) {
                const isActive = activeDateId === dateObj.id;
                let notesRowBg = "text-slate-700 dark:text-slate-300";
                let notesLeftGlow = "bg-white dark:bg-zinc-900 ";
                let notesLabelGlow = "bg-white dark:bg-zinc-900 text-slate-400 dark:text-slate-600";
                let notesTotalGlow = "bg-white dark:bg-zinc-900 ";

                if (dateObj.isToday) {
                  notesLeftGlow = "bg-primary-50 border-l-4 border-l-blue-500";
                  notesLabelGlow = "bg-primary-50 text-primary-700 font-semibold";
                  notesTotalGlow = "bg-primary-50 ";
                } else if (dateObj.isCurrentWeek) {
                  notesLeftGlow = "bg-primary-50 border-l-4 border-l-blue-400";
                  notesLabelGlow = "bg-primary-50 text-blue-900 font-semibold";
                  notesTotalGlow = "bg-primary-50 ";
                }

                // To make height transition smooth on table rows, we transition the inner container's max-height and padding.
                // When collapsed (not active), the height is 0, opacity is 0, and borders are invisible.
                return (
                  <tr
                    key={gridRow.id}
                    style={{
                      height: isActive ? `${calculatedNoteRowHeight}px` : "0px",
                      opacity: isActive ? 1 : 0,
                      visibility: isActive ? "visible" : "collapse",
                      transition:
                        "height 0.25s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.25s, visibility 0.25s",
                    }}
                    className={`${notesRowBg} overflow-hidden`}
                  >
                    <td
                      className={`${stickyLeft1} ${notesLeftGlow} transition-all duration-200 ${isActive ? "border-b border-r border-slate-300 dark:border-zinc-700" : "border-b border-r border-transparent"}`}
                    />
                    <td
                      className={`${stickyLeft2} ${notesLabelGlow} text-[10px] font-bold text-center align-middle transition-all duration-200 ${isActive ? "border-b border-r border-slate-300 dark:border-zinc-700" : "border-b border-r border-transparent"} uppercase tracking-wider select-none`}
                    >
                      <div
                        style={{
                          height: isActive ? "auto" : "0px",
                          opacity: isActive ? 1 : 0,
                          overflow: "hidden",
                          transition: "all 0.2s",
                        }}
                        className="flex items-center justify-center gap-1"
                      >
                        <span className="text-slate-400 dark:text-slate-600 font-bold text-xs select-none">
                          ↳
                        </span>{" "}
                        Notes
                      </div>
                    </td>
                    <td
                      className={`${stickyLeft3} ${notesTotalGlow} transition-all duration-200 ${isActive ? "border-b border-r border-slate-300 dark:border-zinc-700" : "border-b border-r border-transparent"}`}
                    />
                    <td className="w-4 bg-transparent border-none" />

                    {filteredProjects.map((p) => (
                      <React.Fragment key={`row_notes_${p.id}_${dateObj.id}`}>
                        {p.isCollapsed ? (
                          <td
                            className={`p-0 w-24 min-w-[6rem] max-w-[6rem] transition-all duration-200 ${isActive ? "border-b border-x border-slate-300 dark:border-zinc-700 " : "border-b border-x border-transparent"} ${dateObj.isToday ? "bg-primary-50/20 " : dateObj.isCurrentWeek ? "bg-primary-50/10 " : "bg-slate-50 dark:bg-zinc-950/50 "}`}
                          />
                        ) : (
                          <>
                            {p.tasks.map((t) => {
                              const cellKey = `${viewUserId}_${dateObj.id}_${t.id}`;
                              const cIndex = visibleColKeys.indexOf(t.id);
                              const isSelected =
                                selectedCell?.r === rIndex &&
                                selectedCell?.c === cIndex;
                              return (
                                <TimesheetNoteCell
                                  key={`note_cell_${cellKey}`}
                                  rowId={gridRow.id}
                                  dateId={dateObj.id}
                                  taskId={t.id}
                                  value={notes[cellKey] || ""}
                                  isSelected={isSelected}
                                  isToday={dateObj.isToday}
                                  isCurrentWeek={dateObj.isCurrentWeek}
                                  isActive={isActive}
                                  calculatedHeight={calculatedNoteRowHeight}
                                  onNoteChange={onNoteChange}
                                  onSelect={() => {
                                    setSelectedCell({ r: rIndex, c: cIndex });
                                    setIsEditing(false);
                                  }}
                                />
                              );
                            })}
                            <td
                              className={`w-20 min-w-[5rem] max-w-[5rem] transition-all duration-200 ${isActive ? "border-b border-r border-slate-300 dark:border-zinc-700 " : "border-b border-r border-transparent"} ${dateObj.isToday ? "bg-primary-50/15 " : dateObj.isCurrentWeek ? "bg-primary-50/5 " : "bg-slate-50 dark:bg-zinc-950 "}`}
                            />
                          </>
                        )}
                        <td className="w-4 bg-transparent border-none" />
                      </React.Fragment>
                    ))}

                    {(() => {
                      const cIndex = visibleColKeys.indexOf("add_project");
                      const isSelected =
                        selectedCell?.r === rIndex &&
                        selectedCell?.c === cIndex;
                      return (
                        <td
                          key="add_project_notes"
                          id={`cell_${gridRow.id}_add_project`}
                          tabIndex={-1}
                          onClick={() => {
                            setSelectedCell({ r: rIndex, c: cIndex });
                            setIsEditing(false);
                          }}
                          className={`${stickyRight} w-14 min-w-[3.5rem] max-w-[3.5rem] cursor-pointer transition-all duration-200 ${isActive ? "border-b border-l border-slate-300 dark:border-zinc-700 " : "border-b border-l border-transparent"} ${isSelected ? "ring-2 ring-inset ring-slate-900 bg-primary-100/50 z-10" : dateObj.isToday ? "bg-primary-50/15 " : dateObj.isCurrentWeek ? "bg-primary-50/5 " : "bg-slate-50 dark:bg-zinc-950 "}`}
                        />
                      );
                    })()}
                  </tr>
                );
              }

              const rowTotal = getRowTotal(dateObj.id);
              let totalColor =
                rowTotal === 0
                  ? "bg-amber-50 dark:bg-amber-900/30 text-amber-900 dark:text-amber-200"
                  : rowTotal < 8
                    ? "bg-blue-50 dark:bg-blue-900/30 text-blue-900 dark:text-blue-200"
                    : "bg-indigo-100 dark:bg-indigo-900/40 text-indigo-900 dark:text-indigo-200";
              if (dateObj.isFuture) totalColor = "bg-gray-200 dark:bg-zinc-950 text-slate-400 dark:text-slate-600";

              let rowBg = "hover:bg-slate-50 dark:bg-zinc-950 text-slate-700 dark:text-slate-300";
              let labelGlow = "bg-white dark:bg-zinc-900 ";
              let dateGlow = "bg-white dark:bg-zinc-900 ";

              if (dateObj.isToday) {
                rowBg = "text-slate-700 dark:text-slate-300 font-bold";
                labelGlow =
                  "border-l-4 border-l-blue-500 bg-primary-50 text-primary-700 font-bold";
                dateGlow = "bg-primary-50 text-primary-700 font-bold";
              } else if (dateObj.isCurrentWeek) {
                rowBg = "text-slate-700 dark:text-slate-300 font-medium";
                labelGlow =
                  "border-l-4 border-l-blue-400 bg-primary-50 text-blue-900 font-bold";
                dateGlow = "bg-primary-50 text-blue-900 font-bold";
              } else if (dateObj.isFuture) {
                rowBg = "bg-slate-50 dark:bg-zinc-950/80 text-slate-400 dark:text-slate-600";
                labelGlow = "bg-slate-50 dark:bg-zinc-950 text-slate-400 dark:text-slate-600";
                dateGlow = "bg-slate-50 dark:bg-zinc-950 text-slate-400 dark:text-slate-600";
              }

              return (
                <tr
                  key={gridRow.id}
                  className={`group h-12 transition-colors ${rowBg}`}
                >
                  <td
                    className={`${stickyLeft1} ${labelGlow} p-2 text-center h-12 align-middle w-24 min-w-[6rem] max-w-[6rem] truncate`}
                  >
                    {dateObj.label}
                  </td>
                  <td
                    className={`${stickyLeft2} ${dateGlow} p-2 text-center h-12 align-middle w-24 min-w-[6rem] max-w-[6rem] truncate`}
                  >
                    {dateObj.dateStr}
                  </td>
                  <td
                    className={`${stickyLeft3} p-2 text-center font-bold h-12 align-middle w-20 min-w-[5rem] max-w-[5rem] ${totalColor}`}
                  >
                    {rowTotal.toFixed(2)}
                  </td>

                  <td className="w-4 bg-transparent border-none h-12"></td>

                  {filteredProjects.map((p, pIndex) => (
                    <React.Fragment key={`row_hours_${p.id}_${dateObj.id}`}>
                      {p.isCollapsed ? (
                        (() => {
                          const cellKey = `proj_${p.id}`;
                          const cIndex = visibleColKeys.indexOf(cellKey);
                          const isSelected =
                            selectedCell?.r === rIndex &&
                            selectedCell?.c === cIndex;

                          return (
                            <td
                              key={cellKey}
                              id={`cell_${gridRow.id}_${cellKey}`}
                              tabIndex={-1}
                              onClick={() => {
                                setSelectedCell({ r: rIndex, c: cIndex });
                                setIsEditing(false);
                              }}
                              className={`border-b border-x border-slate-300 dark:border-zinc-700 p-0 h-12 align-middle text-center font-bold text-slate-600 dark:text-slate-400 dark:text-slate-600 w-24 min-w-[6rem] max-w-[6rem] outline-none transition-colors cursor-cell scroll-mt-[8rem] scroll-ml-[19rem] animate-collapse overflow-hidden group-hover:bg-primary-50/40 ${isSelected ? "ring-2 ring-inset ring-slate-900 bg-primary-50/50 relative z-10" : dateObj.isToday ? "bg-primary-50/20" : dateObj.isCurrentWeek ? "bg-primary-50/10" : "bg-slate-50 dark:bg-zinc-950/30"}`}
                            >
                              <div className="w-full h-full flex items-center justify-center p-2">
                                {getProjectTotal(dateObj.id, p).toFixed(2)}
                              </div>
                            </td>
                          );
                        })()
                      ) : (
                        <>
                          {p.tasks.map((t, i) => {
                            const cellKey = `${viewUserId}_${dateObj.id}_${t.id}`;
                            const cIndex = visibleColKeys.indexOf(t.id);
                            return (
                              <TimesheetCell
                                key={cellKey}
                                rowId={gridRow.id}
                                dateId={dateObj.id}
                                taskId={t.id}
                                className={
                                  pIndex === 0 && i === 0 && rIndex === 0
                                    ? "tour-time-cell"
                                    : ""
                                }
                                value={entries[cellKey] || ""}
                                note={notes[cellKey] || ""}
                                showMissingNotes={showMissingNotes}
                                isFuture={dateObj.isFuture}
                                isToday={dateObj.isToday}
                                isCurrentWeek={dateObj.isCurrentWeek}
                                onToggleTimer={onToggleTimer}
                                dbUser={dbUser}
                                isSelected={
                                  selectedCell?.r === rIndex &&
                                  selectedCell?.c === cIndex
                                }
                                isEditing={
                                  isEditing &&
                                  selectedCell?.r === rIndex &&
                                  selectedCell?.c === cIndex
                                }
                                isFirstInProject={i === 0}
                                timeframe={timeframe}
                                onCellChange={onCellChange}
                                onNoteChange={onNoteChange}
                                onSelect={() => {
                                  setSelectedCell({ r: rIndex, c: cIndex });
                                  setIsEditing(false);
                                }}
                                onEditStart={() => setIsEditing(true)}
                                onEditEnd={() => setIsEditing(false)}
                              />
                            );
                          })}

                          {(() => {
                            const addTaskKey = `add_task_${p.id}`;
                            const cIndex = visibleColKeys.indexOf(addTaskKey);
                            const isSelected =
                              selectedCell?.r === rIndex &&
                              selectedCell?.c === cIndex;

                            return (
                              <td
                                key={addTaskKey}
                                id={`cell_${gridRow.id}_${addTaskKey}`}
                                tabIndex={-1}
                                onClick={() => {
                                  setSelectedCell({ r: rIndex, c: cIndex });
                                  setIsEditing(false);
                                  setActiveTaskPopover(p.id);
                                  setIsAddingProject(false);
                                }}
                                className={`border-b border-r border-slate-300 dark:border-zinc-700 hover:bg-primary-50/30 group-hover:bg-primary-50/20 h-12 animate-task-btn overflow-hidden cursor-pointer transition-colors relative ${p.tasks.length === 0 ? "border-l" : ""} ${isSelected ? "ring-2 ring-inset ring-slate-900 bg-primary-100/50 z-10" : dateObj.isToday ? "bg-primary-50/15 " : dateObj.isCurrentWeek ? "bg-primary-50/5 " : "bg-slate-50 dark:bg-zinc-950 "} ${pIndex === 0 && rIndex === 0 ? "tour-add-task" : ""}`}
                              >
                                <div
                                  className={`absolute inset-0 flex items-center justify-center font-bold transition-opacity ${isSelected ? "text-primary-600 opacity-100" : "text-gray-300 opacity-0 hover:opacity-100"}`}
                                >
                                  <span className="text-xl">+</span>
                                </div>
                              </td>
                            );
                          })()}
                        </>
                      )}
                      <td className="w-4 bg-transparent border-none h-12"></td>
                    </React.Fragment>
                  ))}

                  {(() => {
                    const cIndex = visibleColKeys.indexOf("add_project");
                    const isSelected =
                      selectedCell?.r === rIndex && selectedCell?.c === cIndex;

                    return (
                      <td
                        key="add_project"
                        id={`cell_${gridRow.id}_add_project`}
                        tabIndex={-1}
                        onClick={() => {
                          setSelectedCell({ r: rIndex, c: cIndex });
                          setIsEditing(false);
                          setIsAddingProject(true);
                          setActiveTaskPopover(null);
                        }}
                        className={`${stickyRight} group-hover:bg-primary-50/20 hover:bg-primary-50/30 border-b border-l border-slate-300 dark:border-zinc-700 w-14 min-w-[3.5rem] max-w-[3.5rem] z-20 cursor-pointer transition-colors relative ${isSelected ? "ring-2 ring-inset ring-slate-900 bg-primary-100/50 " : dateObj.isToday ? "bg-primary-50/15 " : dateObj.isCurrentWeek ? "bg-primary-50/5 " : "bg-white dark:bg-zinc-900 "}`}
                      >
                        <div
                          className={`absolute inset-0 flex items-center justify-center font-light transition-opacity ${isSelected ? "text-primary-600 opacity-100" : "text-gray-300 opacity-0 hover:opacity-100"}`}
                        >
                          <span className="text-2xl">+</span>
                        </div>
                      </td>
                    );
                  })()}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Insights & Time Allocation Dashboard */}
      {["day", "week"].includes(timeframe) && (
        <div className="bg-slate-50 dark:bg-zinc-950 border-t border-slate-300 dark:border-zinc-700 p-5 flex gap-5 shrink-0 h-44 select-none overflow-hidden text-xs transition-colors">
          {/* Card 1: Capacity Goal Progress */}
          <div className="w-72 bg-white dark:bg-zinc-900 border border-slate-300 dark:border-zinc-700 p-4 flex items-center gap-4 transition-colors">
            <div className="relative flex items-center justify-center shrink-0">
              <svg width="60" height="60" className="transform -rotate-90">
                <circle
                  cx="30"
                  cy="30"
                  r="26"
                  stroke="#F3F4F6"
                  strokeWidth="5"
                  fill="transparent"
                />
                <circle
                  cx="30"
                  cy="30"
                  r="26"
                  stroke="#3B82F6"
                  strokeWidth="5"
                  fill="transparent"
                  strokeDasharray="163.36"
                  strokeDashoffset={
                    163.36 -
                    Math.min(
                      1,
                      capacityGoal > 0 ? totalHours / capacityGoal : 0,
                    ) *
                      163.36
                  }
                  strokeLinecap="round"
                  className="transition-all duration-500 ease-out"
                />
              </svg>
              <span className="absolute text-[11px] font-black text-slate-700 dark:text-slate-300">
                {Math.round(
                  (capacityGoal > 0 ? totalHours / capacityGoal : 0) * 100,
                )}
                %
              </span>
            </div>

            <div className="space-y-0.5">
              <span className="text-[9px] font-bold text-slate-400 dark:text-slate-600 uppercase tracking-wider block">
                Capacity Goal
              </span>
              <span className="text-sm font-black text-slate-900 dark:text-slate-100 block">
                {totalHours.toFixed(1)} / {capacityGoal.toFixed(1)} hrs
              </span>
              {totalHours >= capacityGoal ? (
                <span className="text-[10px] font-bold text-emerald-600 block flex items-center gap-1">
                  <span>Goal achieved! 🎉</span>
                </span>
              ) : (
                <span className="text-[10px] font-semibold text-primary-600 block">
                  {(capacityGoal - totalHours).toFixed(1)} hrs remaining
                </span>
              )}
            </div>
          </div>

          {/* Card 2: Time Allocation by Project */}
          <div className="flex-1 bg-white dark:bg-zinc-900 border border-slate-300 dark:border-zinc-700 p-4 flex flex-col gap-2 overflow-hidden justify-center">
            <span className="text-[9px] font-bold text-slate-400 dark:text-slate-600 uppercase tracking-wider block">
              Time Allocation
            </span>

            {projectBreakdown.length === 0 ? (
              <div className="flex-1 flex items-center justify-center text-slate-400 dark:text-slate-600 font-medium italic">
                No hours logged in this timeframe.
              </div>
            ) : (
              <div className="flex-1 flex flex-col justify-center gap-2.5 overflow-y-auto no-scrollbar">
                {projectBreakdown.slice(0, 2).map((proj, idx) => {
                  const barColors = [
                    "bg-blue-500",
                    "bg-indigo-400",
                    "bg-violet-400",
                  ];
                  const textColors = [
                    "text-primary-600",
                    "text-indigo-650",
                    "text-violet-650",
                  ];
                  return (
                    <div key={proj.name} className="space-y-1">
                      <div className="flex justify-between items-center text-[11px]">
                        <span className="font-bold text-gray-750 truncate max-w-[180px]">
                          {proj.name}
                        </span>
                        <span className="text-slate-400 dark:text-slate-600 font-medium">
                          <span className={`font-black ${textColors[idx % 3]}`}>
                            {proj.hours.toFixed(1)}h
                          </span>
                          <span className="mx-1">&middot;</span>
                          <span className="font-bold">
                            {Math.round(proj.percentage)}%
                          </span>
                        </span>
                      </div>
                      <div className="w-full bg-slate-100 dark:bg-zinc-800 h-1.5 overflow-hidden">
                        <div
                          className={`h-full ${barColors[idx % 3]} transition-all duration-500`}
                          style={{ width: `${proj.percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
                {projectBreakdown.length > 2 && (
                  <div className="text-[9px] font-bold text-slate-400 dark:text-slate-600 uppercase tracking-wider text-right">
                    + {projectBreakdown.length - 2} more project(s)
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Card 3: Timesheet Audit Status */}
          <div className="w-72 bg-white dark:bg-zinc-900 border border-slate-300 dark:border-zinc-700 p-4 flex flex-col justify-between">
            <div className="space-y-2">
              <span className="text-[9px] font-bold text-slate-400 dark:text-slate-600 uppercase tracking-wider block">
                Audit Status
              </span>

              {missingNotesCount > 0 ? (
                <div className="bg-red-50 text-red-750 border border-red-200 text-[10px] font-bold px-2.5 py-1.5 flex items-start gap-2 leading-tight">
                  <svg
                    className="w-4 h-4 text-red-500 shrink-0 mt-0.5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2.5"
                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                    />
                  </svg>
                  <div>
                    <span className="block font-black text-red-800">
                      {missingNotesCount} cell(s) need notes
                    </span>
                    <span className="text-[9px] font-normal text-red-600 block mt-0.5">
                      Required for all hours entries.
                    </span>
                  </div>
                </div>
              ) : (
                <div className="bg-emerald-50 text-emerald-750 border border-emerald-200 text-[10px] font-bold px-2.5 py-1.5 flex items-start gap-2 leading-tight">
                  <svg
                    className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2.5"
                      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  <div>
                    <span className="block font-black text-emerald-850">
                      Timesheet Fully Audited
                    </span>
                    <span className="text-[9px] font-normal text-emerald-650 block mt-0.5">
                      All logged hours have descriptions.
                    </span>
                  </div>
                </div>
              )}
            </div>

            <div className="text-[9px] font-bold text-slate-400 dark:text-slate-600 uppercase tracking-wider text-center select-none border-t border-slate-300 dark:border-zinc-700 pt-1.5">
              Space focuses note editor &middot; Enter saves
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ======================================================
// Helper Component: TimesheetNoteCell (Collapsible Note Textarea)
// ======================================================
function TimesheetNoteCell({
  rowId,
  dateId,
  taskId,
  value,
  isSelected,
  isToday,
  isCurrentWeek,
  isActive,
  calculatedHeight,
  onNoteChange,
  onSelect,
}) {
  const [localValue, setLocalValue] = useState(value || "");
  const textareaRef = useRef(null);

  useEffect(() => {
    setLocalValue(value || "");
  }, [value]);

  const handleBlur = () => {
    if (localValue !== value) {
      onNoteChange(dateId, taskId, localValue);
    }
  };

  const handleKeyDown = (e) => {
    e.stopPropagation();
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      textareaRef.current.blur();
      document.getElementById(`cell_${rowId}_${taskId}`)?.focus();
    }
    if (e.key === "Escape") {
      e.preventDefault();
      textareaRef.current.blur();
      document.getElementById(`cell_${rowId}_${taskId}`)?.focus();
    }
  };

  return (
    <td
      id={`cell_${rowId}_${taskId}`}
      tabIndex={-1}
      onClick={() => {
        onSelect();
        if (isActive) {
          setTimeout(() => {
            textareaRef.current?.focus();
          }, 30);
        }
      }}
      className={`p-0 relative transition-all duration-200 cursor-cell scroll-mt-[8rem] scroll-ml-[19rem] align-middle
 ${isActive ? "border-b border-r border-slate-300 dark:border-zinc-700" : "border-b border-r border-transparent"}
 ${isSelected ? "ring-2 ring-inset ring-slate-900 bg-primary-50/30 z-10" : isToday ? "bg-primary-50/15" : isCurrentWeek ? "bg-primary-50/5" : "bg-slate-50 dark:bg-zinc-950/10"}
 `}
    >
      <div
        style={{
          height: isActive ? `${calculatedHeight - 8}px` : "0px",
          opacity: isActive ? 1 : 0,
          overflow: "hidden",
          transition: "all 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
        }}
        className="w-full h-full flex items-center justify-center p-1"
      >
        <textarea
          ref={textareaRef}
          id={`cell_textarea_${rowId}_${taskId}`}
          value={localValue}
          onChange={(e) => setLocalValue(e.target.value)}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          placeholder="Add note..."
          className={`w-full h-full block text-left outline-none transition-all cursor-cell bg-transparent text-xs text-gray-750 resize-none font-normal leading-snug p-1.5 border border-transparent no-scrollbar
 ${isSelected ? "bg-white dark:bg-zinc-900 border-slate-300 dark:border-zinc-700 focus:border-slate-900 focus:ring-1 focus:ring-slate-900" : "hover:bg-gray-150/40"}
 `}
          style={{ scrollbarWidth: "none" }}
          disabled={!isActive}
        />
      </div>
    </td>
  );
}
