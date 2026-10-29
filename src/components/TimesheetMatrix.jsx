import React, { useState, useEffect, useMemo, useRef } from "react";
import { useTranslation } from "react-i18next";
import TimesheetCell from "./TimesheetCell";
import AddTaskPopover from "./AddTaskPopover";
import AddProjectPopover from "./AddProjectPopover";
import LiveTimerDisplay from "./LiveTimerDisplay";
import { useToast } from "../contexts/ToastContext";
import { Pencil, ChevronUp, ChevronDown, Lock, Unlock, Clock, Check } from "lucide-react";

export default function TimesheetMatrix({
  dates: propDates,
  projects,
  entries,
  notes = {},
  dbUser,
  orgUsers,
  clients,
  onAddClient,
  submissions = [],
  apiCall,
  forceSync,
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
  onRenameProject,
  onUpdateClient,
  onEditTask,
  walkthroughActive = false,
  walkthroughStep = 0,
  onAdvanceWalkthrough,
  onCancelWalkthrough,
}) {
  const [selectedCell, setSelectedCell] = useState(null);
  const [isEditing, setIsEditing] = useState(false);

  const [activeTaskPopover, setActiveTaskPopover] = useState(null);
  const [isAddingProject, setIsAddingProject] = useState(false);

  const [showMissingNotes, setShowMissingNotes] = useState(false);
  const [showWeekends, setShowWeekends] = useState(false);

  // Client / Project & Task Inline Edit States
  const [editingProjectId, setEditingProjectId] = useState(null);
  const [editNameInput, setEditNameInput] = useState("");
  const [editingTaskId, setEditingTaskId] = useState(null);
  const [editTaskNameInput, setEditTaskNameInput] = useState("");

  // Sorting State
  const [sortMode, setSortMode] = useState("manual"); // 'manual', 'client', 'hours', 'az'

  const { t } = useTranslation();

  const dates = useMemo(() => {
    return (Array.isArray(propDates) ? propDates : []).filter(d => {
      if (timeframe !== 'week') return true;
      if (showWeekends) return true;
      const dateObj = new Date(d.id + 'T12:00:00');
      const dayOfWeek = dateObj.getDay();
      return dayOfWeek !== 0 && dayOfWeek !== 6;
    });
  }, [propDates, timeframe, showWeekends]);

  // Manager or Admin role determination (including assigned Project Managers)
  const isManagerOrAdmin = useMemo(() => {
    const isPM = (projects || []).some((p) => p.managerId === dbUser?.id);
    return dbUser?.role === "admin" || dbUser?.role === "manager" || isPM;
  }, [dbUser?.role, dbUser?.id, projects]);

  // Compute current submission for this week & user
  const currentSubmission = useMemo(() => {
    if (timeframe !== 'week' || !propDates?.length) return null;
    const weekStart = propDates[0]?.id; 
    return (Array.isArray(submissions) ? submissions : []).find(s => s.weekStartDate === weekStart && s.userId === viewUserId);
  }, [timeframe, propDates, submissions, viewUserId]);

  const isApprovedWeek = currentSubmission?.status === 'approved';
  const isSubmittedWeek = currentSubmission?.status === 'submitted';

  // Strict approval lockout: regular employees are blocked from editing when approved
  const isLockedForEmployee = isApprovedWeek && !isManagerOrAdmin;
  const isLocked = isApprovedWeek;

  const [isSubmitting, setIsSubmitting] = useState(false);
  const { addToast } = useToast();

  const handleSubmitWeek = async () => {
    if (!apiCall) return;
    setIsSubmitting(true);
    try {
      const weekStart = propDates?.[0]?.id;
      if (!weekStart) return;
      await apiCall(
        '/api/timesheet-submissions', 
        'POST', 
        { weekStartDate: weekStart },
        'Timesheet submitted successfully!'
      );
      if (forceSync) forceSync();
    } catch (e) {
      console.error(e);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUnlockWeek = async () => {
    if (!currentSubmission || !apiCall) return;
    try {
      await apiCall(`/api/timesheet-submissions/${currentSubmission.id}/status`, 'PUT', {
        status: 'draft',
        note: 'Unlocked by manager for employee revisions'
      });
      addToast('Timesheet unlocked. Reopened for employee revisions.', 'success');
      if (forceSync) forceSync();
    } catch (e) {
      console.error(e);
      addToast('Failed to unlock timesheet', 'error');
    }
  };

  // Dynamic Height Measuring
  const containerRef = useRef(null);
  const theadRef = useRef(null);
  const gridScrollRef = useRef(null);
  const [heights, setHeights] = useState({ container: 0, thead: 0 });
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window !== "undefined") {
      return window.innerWidth < 768;
    }
    return false;
  });
  const [isCompact, setIsCompact] = useState(() => {
    if (typeof window !== "undefined") {
      return window.innerHeight < 860;
    }
    return false;
  });
  const [expandInsightsInCompact, setExpandInsightsInCompact] = useState(false);

  useEffect(() => {
    const updateHeights = () => {
      setHeights({
        container: containerRef.current ? containerRef.current.offsetHeight : 0,
        thead: theadRef.current ? theadRef.current.offsetHeight : 0,
      });
      setIsMobile(window.innerWidth < 768);
      setIsCompact(window.innerHeight < 860);
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

  const tier1HeightClass = isCompact ? "h-11" : "h-16";
  const tier2TopClass = isCompact ? "top-11" : "top-16";
  const tier2TaskPadClass = isCompact ? "py-1.5 px-1.5 text-xs" : "py-4 px-2 text-xs";
  const rowHeightClass = isCompact ? "h-9" : "h-12";
  const cellPadClass = isCompact ? "py-1 px-1.5 text-xs" : "p-2 text-xs";

  const calculatedNoteRowHeight = useMemo(() => {
    if (!["day", "week"].includes(timeframe) || heights.container === 0) {
      return isCompact ? 48 : 56;
    }
    return isCompact ? 56 : 72;
  }, [timeframe, heights, isCompact]);

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
  }, [dates, projects, entries, notes, viewUserId]);

  const writeAllowed = isManagerOrAdmin ? true : !isLockedForEmployee;



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

  const rowKeys = useMemo(() => gridRows.map((r) => r.id), [gridRows]);
  const lastScrolledCellRef = useRef(null);

  const filteredProjects = useMemo(() => {
    let p = [...projects];
    if (searchQuery) {
      const lowerQ = searchQuery.toLowerCase();
      p = p.filter((proj) => proj.name.toLowerCase().includes(lowerQ));
    }
    if (sortMode === 'client') {
      p.sort((a, b) => {
        const clientA = a.client?.name?.toLowerCase() || 'zzz';
        const clientB = b.client?.name?.toLowerCase() || 'zzz';
        if (clientA < clientB) return -1;
        if (clientA > clientB) return 1;
        return a.name.localeCompare(b.name);
      });
    } else if (sortMode === 'az') {
      p.sort((a, b) => a.name.localeCompare(b.name));
    } else if (sortMode === 'hours') {
      p.sort((a, b) => {
        const aHours = (a.tasks || []).reduce((sum, t) => {
          return sum + (dates || []).reduce((dSum, d) => dSum + (parseFloat(entries[`${viewUserId}_${d.id}_${t.id}`]) || 0), 0);
        }, 0);
        const bHours = (b.tasks || []).reduce((sum, t) => {
          return sum + (dates || []).reduce((dSum, d) => dSum + (parseFloat(entries[`${viewUserId}_${d.id}_${t.id}`]) || 0), 0);
        }, 0);
        return bHours - aHours;
      });
    } else {
      p.sort((a, b) => a.sortOrder - b.sortOrder);
    }
    return p;
  }, [projects, searchQuery, sortMode, dates, entries, viewUserId]);

  const visibleColKeys = useMemo(() => {
    return [
      ...filteredProjects.flatMap((p) =>
        p.isCollapsed
          ? [`proj_${p.id}`]
          : [...p.tasks.map((t) => t.id), `add_task_${p.id}`],
      ),
      "add_project",
    ];
  }, [filteredProjects]);

  // Helper to determine if a specific date row is the active one
  const activeDateId = useMemo(() => {
    if (!selectedCell) return null;
    const rowId = rowKeys[selectedCell.r];
    if (!rowId) return null;
    // Extract date from either "YYYY-MM-DD_hours" or "YYYY-MM-DD_notes"
    return rowId.split("_")[0];
  }, [selectedCell, rowKeys]);

  const walkthroughDateId = useMemo(() => {
    return dates[1]?.id || dates[0]?.id;
  }, [dates]);

  // When walkthrough starts, auto-select and focus Tuesday Task A
  useEffect(() => {
    if (walkthroughActive && walkthroughStep === 0) {
      const hRowIndex = gridRows.findIndex((r) => r.id === `${walkthroughDateId}_hours`);
      const tColIndex = visibleColKeys.indexOf("guest_t1_a");
      if (hRowIndex >= 0 && tColIndex >= 0) {
        setSelectedCell({ r: hRowIndex, c: tColIndex });
        setTimeout(() => {
          const input = document.getElementById(`cell_input_${walkthroughDateId}_hours_guest_t1_a`);
          if (input) {
            input.focus({ preventScroll: true });
            input.select();
          }
        }, 80);
      }
    }
  }, [walkthroughActive, walkthroughStep, walkthroughDateId, gridRows, visibleColKeys]);

  // Enable smooth two-finger horizontal trackpad scrolling across projects
  // (intercepting wheel events before <input>/<textarea> cells swallow deltaX,
  // with sub-pixel remainder accumulation so fractional trackpad deltas never truncate to 0)
  useEffect(() => {
    const rootEl = containerRef.current || gridScrollRef.current;
    if (!rootEl) return;
    let remX = 0;
    let remY = 0;

    const handleWheel = (e) => {
      const container = gridScrollRef.current;
      if (!container) return;
      if (e.ctrlKey || e.metaKey) return;
      if (e.target && e.target.closest && e.target.closest(".popover, [role='dialog']")) {
        return;
      }

      const maxScrollLeft = container.scrollWidth - container.clientWidth;
      const maxScrollTop = container.scrollHeight - container.clientHeight;
      if (maxScrollLeft <= 0 && maxScrollTop <= 0) return;

      const multiplier = e.deltaMode === 1 ? 24 : e.deltaMode === 2 ? 300 : 1;
      let dx = e.deltaX * multiplier;
      let dy = e.deltaY * multiplier;

      if (e.shiftKey && Math.abs(dx) < 0.5 && Math.abs(dy) > 0) {
        dx = dy;
        dy = 0;
      } else if (maxScrollLeft > 0 && Math.abs(dx) < 0.5 && Math.abs(dy) > 0) {
        const canScrollVertically =
          (dy > 0 && container.scrollTop < maxScrollTop - 2) ||
          (dy < 0 && container.scrollTop > 2);
        if (!canScrollVertically) {
          dx = dy;
          dy = 0;
        }
      }

      let shouldPrevent = false;
      if (dx !== 0 && maxScrollLeft > 0) {
        remX += dx;
        const stepX = Math.trunc(remX);
        if (stepX !== 0) {
          container.scrollLeft = Math.max(0, Math.min(maxScrollLeft, container.scrollLeft + stepX));
          remX -= stepX;
        }
        shouldPrevent = true;
      }

      if (dy !== 0 && maxScrollTop > 0) {
        remY += dy;
        const stepY = Math.trunc(remY);
        if (stepY !== 0) {
          const prevTop = container.scrollTop;
          const nextTop = Math.max(0, Math.min(maxScrollTop, prevTop + stepY));
          if (nextTop !== prevTop) {
            container.scrollTop = nextTop;
            shouldPrevent = true;
          }
          remY -= stepY;
        }
      }

      if (shouldPrevent) {
        e.preventDefault();
      }
    };

    rootEl.addEventListener("wheel", handleWheel, { capture: true, passive: false });
    return () => {
      rootEl.removeEventListener("wheel", handleWheel, { capture: true });
    };
  }, [isMobile]);

  // Synchronize horizontal and vertical scroll to ensure focused cell and project header
  // are never hidden behind sticky columns (Day/Date/Total) or sticky headers
  useEffect(() => {
    if (!selectedCell || !gridScrollRef.current) {
      lastScrolledCellRef.current = null;
      return;
    }
    const { r, c } = selectedCell;
    const cellIdentity = `${r}_${c}`;
    if (lastScrolledCellRef.current === cellIdentity) return;
    lastScrolledCellRef.current = cellIdentity;
    const rowId = rowKeys[r];
    const colKey = visibleColKeys[c];
    if (!rowId || !colKey) return;

    const container = gridScrollRef.current;
    const cell = document.getElementById(`cell_${rowId}_${colKey}`);
    if (!cell) return;

    // First column of the entire grid: instantly reset scrollLeft to 0
    if (c === 0) {
      container.scrollLeft = 0;
    } else {
      const containerRect = container.getBoundingClientRect();
      const cellRect = cell.getBoundingClientRect();

      // Measure actual sticky left boundary: right edge of the sticky Total column (3rd th in row 2) + spacer
      const stickyTotalTh = container.querySelector('thead tr:nth-child(2) th:nth-child(3)');
      const stickyLeftEdge = stickyTotalTh
        ? stickyTotalTh.getBoundingClientRect().right + 16
        : containerRect.left + 288;

      // Sticky right boundary: left edge of the Add Project column (last th in row 1)
      const addProjectTh = container.querySelector('thead tr:first-child th:last-child');
      const stickyRightEdge = addProjectTh
        ? addProjectTh.getBoundingClientRect().left
        : containerRect.right - 56;

      const visibleLeft = stickyLeftEdge;
      const visibleRight = stickyRightEdge;

      // Identify the project this column belongs to
      const targetProject = filteredProjects.find(
        (p) =>
          p.tasks.some((t) => t.id === colKey) ||
          colKey === `add_task_${p.id}` ||
          colKey === `proj_${p.id}`
      );

      // If this column belongs to the first project and its header or left columns would be hidden,
      // scroll all the way back to 0 so the first project is completely revealed.
      if (targetProject && filteredProjects[0]?.id === targetProject.id) {
        const firstProjHeader = document.getElementById(`project_header_${targetProject.id}`);
        if (firstProjHeader) {
          const headerRect = firstProjHeader.getBoundingClientRect();
          if (headerRect.left < visibleLeft && cellRect.right <= visibleRight) {
            container.scrollLeft = 0;
          }
        }
      }

      // Check if project header for the current project is clipped on the left
      if (targetProject) {
        const projHeader = document.getElementById(`project_header_${targetProject.id}`);
        if (projHeader) {
          const headerRect = projHeader.getBoundingClientRect();
          if (headerRect.left < visibleLeft && cellRect.right <= visibleRight) {
            const headerDelta = visibleLeft - headerRect.left + 16;
            container.scrollLeft = Math.max(0, container.scrollLeft - headerDelta);
          }
        }
      }

      // Horizontal cell visibility checks
      const updatedCellRect = cell.getBoundingClientRect();
      if (updatedCellRect.left < visibleLeft) {
        const delta = visibleLeft - updatedCellRect.left + 16;
        container.scrollLeft = Math.max(0, container.scrollLeft - delta);
      } else if (updatedCellRect.right > visibleRight) {
        const delta = updatedCellRect.right - visibleRight + 16;
        container.scrollLeft += delta;
      }
    }

    // Vertical cell visibility checks against sticky headers
    const theadHeight = theadRef.current ? theadRef.current.offsetHeight : 100;
    const containerRect = container.getBoundingClientRect();
    const cellRect = cell.getBoundingClientRect();
    const visibleTop = containerRect.top + theadHeight;
    const visibleBottom = containerRect.bottom - 12;

    if (cellRect.top < visibleTop) {
      const delta = visibleTop - cellRect.top + 8;
      container.scrollTop = Math.max(0, container.scrollTop - delta);
    } else if (cellRect.bottom > visibleBottom) {
      const delta = cellRect.bottom - visibleBottom + 8;
      container.scrollTop += delta;
    }
  }, [selectedCell, rowKeys, visibleColKeys, filteredProjects]);

  // Flicking mouse out of the grid collapses the expanded notes
  const handleGridMouseLeave = () => {
    if (
      document.activeElement &&
      (document.activeElement.tagName === "INPUT" ||
        document.activeElement.tagName === "TEXTAREA")
    ) {
      return;
    }
    setSelectedCell(null);
    setIsEditing(false);
  };

  // Clicking outside the grid cells collapses the notes
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (
        e.target.closest("button") ||
        e.target.closest("input") ||
        e.target.closest("textarea") ||
        e.target.closest("[role='dialog']") ||
        e.target.closest(".popover")
      ) {
        return;
      }
      if (!e.target.closest("tbody") && !e.target.closest("td")) {
        setSelectedCell(null);
        setIsEditing(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

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

      if (walkthroughActive) {
        if (e.key === "Escape") {
          e.preventDefault();
          if (onCancelWalkthrough) onCancelWalkthrough();
          return;
        }

        // Walkthrough Step 0: User types hours on Tuesday Task A and hits Tab or Enter
        if (walkthroughStep === 0 && (e.key === "Tab" || e.key === "Enter")) {
          e.preventDefault();
          setIsEditing(false);
          const targetKey = `${viewUserId}_${walkthroughDateId}_guest_t1_a`;
          if (!entries[targetKey]) {
            onCellChange(walkthroughDateId, "guest_t1_a", 4.0);
          }
          if (onAdvanceWalkthrough) onAdvanceWalkthrough();

          const tRowIndex = gridRows.findIndex((r) => r.id === `${walkthroughDateId}_notes`);
          const tColIndex = visibleColKeys.indexOf("guest_t1_a");
          if (tRowIndex >= 0 && tColIndex >= 0) {
            setSelectedCell({ r: tRowIndex, c: tColIndex });
            setTimeout(() => {
              const el = document.getElementById(`cell_textarea_${walkthroughDateId}_notes_guest_t1_a`);
              el?.focus({ preventScroll: true });
            }, 60);
          }
          return;
        }

        // Walkthrough Step 2: Glided to Tuesday Task B, hitting Enter or Tab completes walkthrough
        if (walkthroughStep === 2 && (e.key === "Enter" || e.key === "Tab")) {
          e.preventDefault();
          setIsEditing(false);
          const targetKey = `${viewUserId}_${walkthroughDateId}_guest_t1_b`;
          if (!entries[targetKey]) {
            onCellChange(walkthroughDateId, "guest_t1_b", 3.5);
          }
          if (onAdvanceWalkthrough) onAdvanceWalkthrough();
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
              ?.focus({ preventScroll: true });
          } else {
            document
              .getElementById(
                `cell_${rowKeys[selectedCell.r]}_${visibleColKeys[selectedCell.c]}`,
              )
              ?.focus({ preventScroll: true });
          }
        } else if (e.key === "Escape") {
          e.preventDefault();
          setIsEditing(false);
          setSelectedCell(null);
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
              ?.focus({ preventScroll: true });
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
              ?.focus({ preventScroll: true });
          }
        }
        return;
      }

      if (e.key === "Escape") {
        e.preventDefault();
        setSelectedCell(null);
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
            ?.focus({ preventScroll: true });
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
              ?.focus({ preventScroll: true });
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
            ?.focus({ preventScroll: true });
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
              ?.focus({ preventScroll: true });
          } else {
            const nextR = selectedCell.r + 1;
            if (nextR < rowKeys.length && rowKeys[nextR].endsWith("_notes")) {
              setSelectedCell({ r: nextR, c: selectedCell.c });
              setTimeout(() => {
                document
                  .getElementById(
                    `cell_textarea_${rowKeys[nextR]}_${currentColKey}`,
                  )
                  ?.focus({ preventScroll: true });
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
              ?.focus({ preventScroll: true });
          } else {
            setIsEditing(true);
            const inputEl = document.getElementById(
              `cell_input_${rowId}_${currentColKey}`,
            );
            if (inputEl) {
              inputEl.focus({ preventScroll: true });
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
    onToggleCollapse,
    onCellChange,
    viewUserId,
    timeframe,
    gridRows,
  ]);

  const getRowTotal = (dateId) => {
    let total = 0;
    (projects || []).forEach((p) =>
      (p.tasks || []).forEach((t) => {
        const val = parseFloat(entries[`${viewUserId}_${dateId}_${t.id}`]);
        if (!isNaN(val)) total += val;
      }),
    );
    return Math.round(total * 100) / 100;
  };

  const getProjectTotal = (dateId, project) => {
    const raw = (project?.tasks || []).reduce(
      (sum, t) => {
        const val = parseFloat(entries[`${viewUserId}_${dateId}_${t.id}`]);
        return sum + (!isNaN(val) ? val : 0);
      },
      0,
    );
    return Math.round(raw * 100) / 100;
  };

  const stickyLeft1 =
    "sticky left-0 z-30 bg-white dark:bg-zinc-900 border-r border-b border-slate-300 dark:border-zinc-700 ";
  const stickyLeft2 =
    "sticky left-24 z-30 bg-white dark:bg-zinc-900 border-r border-b border-slate-300 dark:border-zinc-700 ";
  const stickyLeft3 =
    "sticky left-48 z-30 bg-white dark:bg-zinc-900 border-r border-b border-slate-300 dark:border-zinc-700 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] ";
  const stickyRight =
    "sticky right-0 z-30 bg-white dark:bg-zinc-900 border-l border-b border-slate-300 dark:border-zinc-700 shadow-[-2px_0_5px_-2px_rgba(0,0,0,0.1)] ";

  if (isMobile) {
    return (
      <div
        ref={containerRef}
        className="flex-1 flex flex-col p-4 gap-4 overflow-y-auto bg-slate-50 dark:bg-zinc-950 text-xs"
      >
        {/* Mobile Capacity Progress Indicator */}
        <div className={`border border-slate-300 dark:border-zinc-700 p-4 flex items-center justify-between shrink-0 transition-colors ${totalHours > capacityGoal ? "bg-amber-50 dark:bg-amber-900/20 border-amber-300 dark:border-amber-700/50" : "bg-white dark:bg-zinc-900"}`}>
          <div>
            <span className={`text-[10px] font-bold uppercase tracking-wider block ${totalHours > capacityGoal ? "text-amber-700 dark:text-amber-500" : "text-slate-400 dark:text-slate-600"}`}>
              {totalHours > capacityGoal ? "Overtime Alert" : "Weekly Progress"}
            </span>
            <span className={`text-lg font-black ${totalHours > capacityGoal ? "text-amber-900 dark:text-amber-400" : "text-slate-900 dark:text-slate-100"}`}>
              {totalHours.toFixed(1)} / {capacityGoal.toFixed(1)} hrs
            </span>
          </div>
          <div className="text-right">
            <span
              className={`px-2.5 py-1 text-[10px] font-bold ${totalHours > capacityGoal ? "bg-amber-200 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300 animate-pulse" : totalHours === capacityGoal ? "bg-emerald-100 text-emerald-700 " : "bg-primary-100 text-primary-700 "}`}
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

      {/* Sort Control Panel */}
      <div className={`flex items-center gap-2 ${isCompact ? "py-1 px-3" : "p-3"} bg-slate-50 dark:bg-zinc-950 border-b border-slate-300 dark:border-zinc-700 shrink-0 select-none`}>
        <span className={`${isCompact ? "text-[11px]" : "text-xs"} font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mr-1`}>Sort Projects:</span>
        {[
          { id: 'manual', label: 'Manual (Drag)', icon: 'M8 9h8M8 15h8' },
          { id: 'client', label: 'Client', icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z' },
          { id: 'hours', label: 'Hours', icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z' },
          { id: 'az', label: 'A-Z', icon: 'M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12' }
        ].map(mode => (
          <button
            key={mode.id}
            onClick={() => setSortMode(mode.id)}
            className={`flex items-center gap-1.5 ${isCompact ? "px-2.5 py-0.5 text-[11px]" : "px-3 py-1.5 text-xs"} rounded-full font-bold transition-all ${sortMode === mode.id ? "bg-primary-600 text-white shadow-sm" : "bg-white dark:bg-zinc-900 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-zinc-800 border border-slate-300 dark:border-zinc-700"}`}
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={mode.icon} />
            </svg>
            {mode.label}
          </button>
        ))}
      </div>

      {/* Interactive Walkthrough Active Banner */}
      {walkthroughActive && (
        <div className="bg-slate-950 text-white px-6 py-2.5 flex items-center justify-between text-xs border-b border-slate-800 shrink-0 z-30 animate-in fade-in select-none">
          <div className="flex items-center gap-3">
            <span className="font-mono text-[10px] font-black px-2 py-0.5 bg-rose-500 text-white uppercase tracking-wider">
              Walkthrough Step {walkthroughStep + 1} of 3
            </span>
            <span className="text-slate-200 font-medium">
              {walkthroughStep === 0 && "Step 1: Type 4.0 into Tuesday Task A, then press Tab."}
              {walkthroughStep === 1 && "Step 2: Note drawer opened! Type an audit note, then press Tab."}
              {walkthroughStep === 2 && "Step 3: Notice focus glided into Task B without using your mouse! Press Enter to finish."}
            </span>
          </div>
          <button
            type="button"
            onClick={onCancelWalkthrough}
            className="text-slate-400 hover:text-white text-xs font-bold underline cursor-pointer"
          >
            Skip Walkthrough
          </button>
        </div>
      )}

      <div 
        ref={gridScrollRef}
        className="flex-1 min-w-0 w-full overflow-auto matrix-scrollbar overscroll-x-contain bg-white dark:bg-zinc-900 transition-colors"
        onMouseLeave={handleGridMouseLeave}
      >
        <table className="min-w-full w-max border-separate border-spacing-0 bg-white dark:bg-zinc-900 ">
          <thead ref={theadRef}>
            <tr className="bg-slate-100 dark:bg-zinc-800 ">
              <th
                className={`sticky top-0 left-0 z-50 bg-white dark:bg-zinc-900 ${tier1HeightClass} border-b border-r border-slate-300 dark:border-zinc-700 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] `}
                colSpan={3}
              >
                <div className={`flex flex-col items-center justify-center h-full w-full ${isCompact ? "gap-1 py-0.5" : "gap-1.5 py-1"}`}>
                  <div className="flex items-center justify-center gap-3">
                    <label className="flex items-center gap-1.5 cursor-pointer text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 select-none transition-colors">
                      <input
                        type="checkbox"
                        className="w-3.5 h-3.5 text-blue-500 focus:ring-blue-500 border-slate-300 dark:border-zinc-700 rounded cursor-pointer bg-transparent"
                        checked={showWeekends}
                        onChange={(e) => setShowWeekends(e.target.checked)}
                      />
                      <span>Weekends</span>
                    </label>
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
                  {timeframe === "week" && (
                    <div className="flex items-center gap-1.5">
                      {isApprovedWeek ? (
                        <div className="flex items-center gap-1.5">
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 px-2 py-0.5">
                            <Lock size={10} className="text-emerald-600" /> Approved & Locked
                          </span>
                          {isManagerOrAdmin && (
                            <button
                              type="button"
                              onClick={handleUnlockWeek}
                              className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-300 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800 px-2 py-0.5 transition-colors cursor-pointer shadow-xs"
                              title="Unlock this timesheet to allow employee revisions"
                            >
                              <Unlock size={10} />
                              <span>Unlock Timesheet</span>
                            </button>
                          )}
                        </div>
                      ) : isSubmittedWeek ? (
                        <div className="flex items-center gap-1.5">
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 px-2 py-0.5">
                            <Clock size={10} className="text-amber-600" /> Submitted (Reviewing)
                          </span>
                          {isManagerOrAdmin && (
                            <button
                              type="button"
                              onClick={handleUnlockWeek}
                              className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300 dark:bg-zinc-800 dark:text-slate-300 px-2 py-0.5 transition-colors cursor-pointer"
                              title="Reopen as draft"
                            >
                              <Unlock size={10} />
                              <span>Reopen Draft</span>
                            </button>
                          )}
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={handleSubmitWeek}
                          disabled={isSubmitting || totalHours === 0}
                          className="text-[10px] font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 px-2.5 py-1 transition-colors shadow-xs cursor-pointer"
                        >
                          {isSubmitting ? "Submitting..." : "Submit for Approval"}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </th>
              <th className={`sticky top-0 bg-white dark:bg-zinc-900 w-4 min-w-[1rem] max-w-[1rem] ${tier1HeightClass} border-none`}></th>

              {filteredProjects.map((p, pIndex) => (
                <React.Fragment key={`tier1_${p.id}`}>
                  <th
                    id={`project_header_${p.id}`}
                    draggable={sortMode === 'manual'}
                    onDragStart={(e) => { 
                      e.dataTransfer.setData('projectId', p.id); 
                      e.dataTransfer.effectAllowed = 'move';
                    }}
                    onDragOver={(e) => { 
                      e.preventDefault(); 
                      e.dataTransfer.dropEffect = 'move';
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      const draggedId = e.dataTransfer.getData('projectId');
                      if (draggedId && draggedId !== p.id && onReorderProject) {
                        onReorderProject(draggedId, p.id);
                      }
                    }}
                    className={`group sticky top-0 bg-white dark:bg-zinc-900 border-b border-r border-l border-slate-300 dark:border-zinc-700 z-30 transition-colors ${
                      p.isCollapsed
                        ? `w-24 min-w-[6rem] max-w-[6rem] p-1.5 overflow-hidden ${tier1HeightClass}`
                        : `px-3 py-2 ${tier1HeightClass}`
                    } ${sortMode === 'manual' ? 'cursor-grab active:cursor-grabbing' : ''} ${pIndex === 0 ? 'tour-project-header' : ''}`}
                    colSpan={p.isCollapsed ? 1 : (p.tasks.length === 0 ? 1 : p.tasks.length)}
                  >
                    {p.isCollapsed ? (
                      <div className="flex flex-col justify-between h-full w-full min-w-0 overflow-hidden">
                        {/* Top micro-row: collapse chevron & edit pencil */}
                        <div className="flex items-center justify-between w-full shrink-0">
                          <button
                            type="button"
                            onClick={() => onToggleCollapse(p.id)}
                            className="text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 focus:outline-none p-0.5 rounded transition-colors"
                            title="Expand Project"
                          >
                            <svg
                              className="w-3.5 h-3.5 transform transition-transform duration-200 -rotate-90"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth="2.5"
                                d="M9 5l7 7-7 7"
                              />
                            </svg>
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingProjectId(p.id);
                              setEditNameInput(p.client ? p.client.name : p.name);
                            }}
                            className="p-0.5 text-slate-400 hover:text-primary-600 dark:hover:text-primary-400 opacity-60 hover:opacity-100 transition-opacity cursor-pointer"
                            title="Edit Client / Project Name"
                          >
                            <Pencil className="w-3 h-3" />
                          </button>
                        </div>

                        {/* Wrapped Client & Project Title */}
                        {editingProjectId === p.id ? (
                          <form
                            onSubmit={(e) => {
                              e.preventDefault();
                              if (editNameInput.trim()) {
                                if (p.client && onUpdateClient) {
                                  onUpdateClient(p.clientId, { name: editNameInput.trim() });
                                } else if (onRenameProject) {
                                  onRenameProject(p.id, editNameInput.trim());
                                }
                              }
                              setEditingProjectId(null);
                            }}
                            className="w-full mt-0.5"
                          >
                            <input
                              type="text"
                              autoFocus
                              value={editNameInput}
                              onChange={(e) => setEditNameInput(e.target.value)}
                              onBlur={() => {
                                if (editNameInput.trim()) {
                                  if (p.client && onUpdateClient) {
                                    onUpdateClient(p.clientId, { name: editNameInput.trim() });
                                  } else if (onRenameProject) {
                                    onRenameProject(p.id, editNameInput.trim());
                                  }
                                }
                                setEditingProjectId(null);
                              }}
                              className="bg-white dark:bg-zinc-800 text-[11px] px-1 py-0.5 border-2 border-primary-500 text-slate-900 dark:text-white outline-none w-full font-bold shadow-sm text-center"
                            />
                          </form>
                        ) : (
                          <div
                            className="flex flex-col items-center justify-center text-center flex-1 min-w-0 w-full overflow-hidden select-none cursor-pointer py-0.5"
                            onClick={() => onToggleCollapse(p.id)}
                            title={p.client ? `${p.client.name} | ${p.name} (Click to expand)` : `${p.name} (Click to expand)`}
                          >
                            {p.client ? (
                              <>
                                <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-tight truncate w-full leading-none mb-0.5 block">
                                  {p.client.name}
                                </span>
                                <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 leading-tight whitespace-normal break-words [overflow-wrap:anywhere] line-clamp-2 w-full block">
                                  {p.name}
                                </span>
                              </>
                            ) : (
                              <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 leading-tight whitespace-normal break-words [overflow-wrap:anywhere] line-clamp-2 w-full block">
                                {p.name}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="flex items-center justify-between">
                        <button
                          onClick={() => onToggleCollapse(p.id)}
                          className="text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 focus:outline-none p-1 rounded-sm transition-colors mr-1 shrink-0"
                          title="Collapse Project"
                        >
                          <svg
                            className="w-3.5 h-3.5 transform transition-transform duration-200 rotate-0"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth="2.5"
                              d="M9 5l7 7-7 7"
                            />
                          </svg>
                        </button>
                        {editingProjectId === p.id ? (
                          <form
                            onSubmit={(e) => {
                              e.preventDefault();
                              if (editNameInput.trim()) {
                                if (p.client && onUpdateClient) {
                                  onUpdateClient(p.clientId, { name: editNameInput.trim() });
                                } else if (onRenameProject) {
                                  onRenameProject(p.id, editNameInput.trim());
                                }
                              }
                              setEditingProjectId(null);
                            }}
                            className="flex items-center gap-1 flex-1 min-w-0"
                          >
                            <input
                              type="text"
                              autoFocus
                              value={editNameInput}
                              onChange={(e) => setEditNameInput(e.target.value)}
                              onBlur={() => {
                                if (editNameInput.trim()) {
                                  if (p.client && onUpdateClient) {
                                    onUpdateClient(p.clientId, { name: editNameInput.trim() });
                                  } else if (onRenameProject) {
                                    onRenameProject(p.id, editNameInput.trim());
                                  }
                                }
                                setEditingProjectId(null);
                              }}
                              className="bg-white dark:bg-zinc-800 text-xs px-2 py-0.5 border-2 border-primary-500 text-slate-900 dark:text-white outline-none w-full font-bold shadow-sm"
                            />
                          </form>
                        ) : (
                          <div className="flex items-center gap-1.5 flex-1 min-w-0">
                            <span
                              className="truncate text-left text-sm select-none"
                              title={p.client ? `${p.client.name} | ${p.name}` : p.name}
                            >
                              {p.client ? (
                                <>
                                  <span className="text-slate-500 dark:text-slate-400 font-bold mr-1">{p.client.name}</span>
                                  <span className="text-slate-300 dark:text-zinc-600 mr-1">|</span>
                                  <span className="font-semibold">{p.name}</span>
                                </>
                              ) : (
                                p.name
                              )}
                            </span>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingProjectId(p.id);
                                setEditNameInput(p.client ? p.client.name : p.name);
                              }}
                              className="p-1 text-slate-400 hover:text-primary-600 dark:hover:text-primary-400 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors shrink-0 cursor-pointer"
                              title="Edit Client / Project Name"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                        {sortMode === 'manual' && (
                          <div className="opacity-0 group-hover:opacity-100 transition-opacity cursor-grab text-slate-300 mx-1">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" /></svg>
                          </div>
                        )}
                      </div>
                    )}
                  </th>
                  {!p.isCollapsed && p.tasks.length > 0 && (
                    <th className={`sticky top-0 bg-white dark:bg-zinc-900 w-20 ${tier1HeightClass} z-30 border-0 border-b border-slate-300 dark:border-zinc-700 animate-task-btn overflow-hidden`}></th>
                  )}
                  <th className={`sticky top-0 bg-white dark:bg-zinc-900 w-4 min-w-[1rem] max-w-[1rem] ${tier1HeightClass} border-none z-30`}></th>
                </React.Fragment>
              ))}

              <th aria-hidden="true" className={`sticky top-0 bg-white dark:bg-zinc-900 ${tier1HeightClass} border-none z-20 pointer-events-none p-0`}><div style={{ width: "calc(100vw - 420px)", minWidth: "640px", height: "1px" }} /></th>

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
                  clients={clients}
                  onAddClient={onAddClient}
                />
              </th>
            </tr>

            <tr className="bg-slate-100 dark:bg-zinc-800 ">
              <th
                className={`${stickyLeft1} sticky ${tier2TopClass} z-50 ${cellPadClass} w-24 min-w-[6rem] max-w-[6rem] text-center align-middle text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-zinc-800 border-b border-slate-300 dark:border-zinc-700`}
              >
                Day
              </th>
              <th
                className={`${stickyLeft2} sticky ${tier2TopClass} z-50 ${cellPadClass} w-24 min-w-[6rem] max-w-[6rem] text-center align-middle text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-zinc-800 border-b border-slate-300 dark:border-zinc-700`}
              >
                Date
              </th>
              <th
                className={`${stickyLeft3} bg-primary-50 sticky ${tier2TopClass} z-50 ${cellPadClass} w-20 min-w-[5rem] max-w-[5rem] text-center align-middle text-primary-800 border-b border-slate-300 dark:border-zinc-700`}
              >
                Total
              </th>
              <th className={`sticky ${tier2TopClass} bg-white dark:bg-zinc-900 w-4 min-w-[1rem] max-w-[1rem] border-none z-30`}></th>

              {filteredProjects.map((p) => (
                <React.Fragment key={`tier2_${p.id}`}>
                  {p.isCollapsed ? (
                    <th className={`sticky ${tier2TopClass} border-b border-x border-slate-300 dark:border-zinc-700 ${isCompact ? "px-1 py-1.5" : "px-1 py-4"} bg-slate-50 dark:bg-zinc-950 text-xs font-bold text-slate-500 dark:text-slate-500 uppercase tracking-wider z-30 w-24 min-w-[6rem] max-w-[6rem] animate-collapse overflow-hidden`}>
                      Total
                    </th>
                  ) : (
                    <>
                      {p.tasks.map((t, index) => (
                        <th
                          key={t.id}
                          className={`group sticky ${tier2TopClass} border-b border-r border-slate-300 dark:border-zinc-700 ${tier2TaskPadClass} font-normal text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-zinc-950 w-24 min-w-[6rem] max-w-[6rem] text-center align-middle leading-tight z-30 animate-column overflow-hidden relative ${index === 0 ? "border-l" : ""}`}
                        >
                          {editingTaskId === t.id ? (
                            <form
                              onSubmit={(e) => {
                                e.preventDefault();
                                if (editTaskNameInput.trim() && onEditTask) {
                                  onEditTask(p.id, t.id, { name: editTaskNameInput.trim() });
                                }
                                setEditingTaskId(null);
                              }}
                              className="w-full px-1"
                            >
                              <input
                                type="text"
                                autoFocus
                                value={editTaskNameInput}
                                onChange={(e) => setEditTaskNameInput(e.target.value)}
                                onBlur={() => {
                                  if (editTaskNameInput.trim() && onEditTask) {
                                    onEditTask(p.id, t.id, { name: editTaskNameInput.trim() });
                                  }
                                  setEditingTaskId(null);
                                }}
                                className="bg-white dark:bg-zinc-800 text-[11px] px-1 py-0.5 border-2 border-primary-500 text-slate-900 dark:text-white outline-none w-full text-center font-bold shadow-sm"
                              />
                            </form>
                          ) : (
                            <div className="flex items-center justify-center gap-1 w-full px-1">
                              <span className="truncate block font-medium" title={t.name}>
                                {t.name}
                              </span>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEditingTaskId(t.id);
                                  setEditTaskNameInput(t.name);
                                }}
                                className="p-0.5 text-slate-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors shrink-0 cursor-pointer"
                                title="Edit Task Name"
                              >
                                <Pencil className="w-3 h-3" />
                              </button>
                            </div>
                          )}
                          {t.isBillable === false && (
                            <span 
                              className="inline-block text-[9px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 bg-slate-200/60 dark:bg-zinc-800 px-1 py-0.5 mt-0.5 rounded-none select-none"
                              title="Non-Billable task: Hours logged here are excluded from client invoices & billing reports"
                            >
                              Non-Billable
                            </span>
                          )}

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
                  <th className={`sticky ${tier2TopClass} bg-white dark:bg-zinc-900 w-4 min-w-[1rem] max-w-[1rem] border-none z-30 transition-colors`}></th>
                </React.Fragment>
              ))}
              <th aria-hidden="true" className={`sticky ${tier2TopClass} bg-white dark:bg-zinc-900 w-[28vw] min-w-[12rem] border-none z-20 pointer-events-none`}></th>
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
                            {p.tasks.map((t, index) => {
                              const cellKey = `${viewUserId}_${dateObj.id}_${t.id}`;
                              const cIndex = visibleColKeys.indexOf(t.id);
                              const isSelected =
                                selectedCell?.r === rIndex &&
                                selectedCell?.c === cIndex;

                              const isWalkthroughNoteTarget =
                                walkthroughActive &&
                                walkthroughStep === 1 &&
                                dateObj.id === walkthroughDateId &&
                                t.id === "guest_t1_a";

                              return (
                                <TimesheetNoteCell
                                  key={`note_cell_${cellKey}`}
                                  isFirstInProject={index === 0}
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
                                  walkthroughActive={walkthroughActive}
                                  walkthroughStep={walkthroughStep}
                                  walkthroughDateId={walkthroughDateId}
                                  isWalkthroughNoteTarget={isWalkthroughNoteTarget}
                                  gridRows={gridRows}
                                  visibleColKeys={visibleColKeys}
                                  setSelectedCell={setSelectedCell}
                                  onAdvanceWalkthrough={onAdvanceWalkthrough}
                                  onCollapse={() => {
                                    setSelectedCell(null);
                                    setIsEditing(false);
                                  }}
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

                    <td aria-hidden="true" className="w-[28vw] min-w-[12rem] bg-transparent border-none pointer-events-none" />

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
                  className={`group ${rowHeightClass} transition-colors ${rowBg}`}
                >
                  <td
                    className={`${stickyLeft1} ${labelGlow} ${cellPadClass} text-center ${rowHeightClass} align-middle w-24 min-w-[6rem] max-w-[6rem] truncate`}
                  >
                    {dateObj.label}
                  </td>
                  <td
                    className={`${stickyLeft2} ${dateGlow} ${cellPadClass} text-center ${rowHeightClass} align-middle w-24 min-w-[6rem] max-w-[6rem] truncate`}
                  >
                    {dateObj.dateStr}
                  </td>
                  <td
                    className={`${stickyLeft3} ${cellPadClass} text-center font-bold ${rowHeightClass} align-middle w-20 min-w-[5rem] max-w-[5rem] ${totalColor}`}
                  >
                    {rowTotal.toFixed(2)}
                  </td>

                  <td className={`w-4 bg-transparent border-none ${rowHeightClass}`}></td>

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
                              className={`border-b border-x border-slate-300 dark:border-zinc-700 p-0 ${rowHeightClass} align-middle text-center font-bold text-slate-600 dark:text-slate-400 dark:text-slate-600 w-24 min-w-[6rem] max-w-[6rem] outline-none transition-colors cursor-cell scroll-mt-[8rem] scroll-ml-[19rem] animate-collapse overflow-hidden group-hover:bg-primary-50/40 ${isSelected ? "ring-2 ring-inset ring-slate-900 bg-primary-50/50 relative z-10" : dateObj.isToday ? "bg-primary-50/20" : dateObj.isCurrentWeek ? "bg-primary-50/10" : "bg-slate-50 dark:bg-zinc-950/30"}`}
                            >
                              <div className="w-full h-full flex items-center justify-center p-1 text-xs">
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
                            const isWalkthroughHourTarget =
                              walkthroughActive &&
                              walkthroughStep === 0 &&
                              dateObj.id === walkthroughDateId &&
                              t.id === "guest_t1_a";
                            const isWalkthroughNextTarget =
                              walkthroughActive &&
                              walkthroughStep === 2 &&
                              dateObj.id === walkthroughDateId &&
                              t.id === "guest_t1_b";
                            const cellWalkthroughBadge = isWalkthroughHourTarget
                              ? "Step 1: Type 4.0 & Tab"
                              : isWalkthroughNextTarget
                              ? "Step 3: Press Enter"
                              : null;

                            return (
                              <TimesheetCell
                                key={cellKey}
                                rowId={gridRow.id}
                                dateId={dateObj.id}
                                taskId={t.id}
                                isCompact={isCompact}
                                isLocked={isLockedForEmployee}
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
                                walkthroughBadgeText={cellWalkthroughBadge}
                                isWalkthroughTarget={
                                  isWalkthroughHourTarget || isWalkthroughNextTarget
                                }
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
                                  if (isLockedForEmployee) {
                                    addToast("This week's timesheet is approved and locked. Contact your manager to request revisions.", "info");
                                    return;
                                  }
                                  setSelectedCell({ r: rIndex, c: cIndex });
                                  setIsEditing(false);
                                  setActiveTaskPopover(p.id);
                                  setIsAddingProject(false);
                                }}
                                className={`border-b border-r border-slate-300 dark:border-zinc-700 hover:bg-primary-50/30 group-hover:bg-primary-50/20 ${rowHeightClass} animate-task-btn overflow-hidden cursor-pointer transition-colors relative ${p.tasks.length === 0 ? "border-l" : ""} ${isSelected ? "ring-2 ring-inset ring-slate-900 bg-primary-100/50 z-10" : dateObj.isToday ? "bg-primary-50/15 " : dateObj.isCurrentWeek ? "bg-primary-50/5 " : "bg-slate-50 dark:bg-zinc-950 "} ${pIndex === 0 && rIndex === 0 ? "tour-add-task" : ""}`}
                              >
                                <div
                                  className={`absolute inset-0 flex items-center justify-center font-bold transition-opacity ${isSelected ? "text-primary-600 opacity-100" : "text-gray-300 opacity-0 hover:opacity-100"}`}
                                >
                                  <span className={isCompact ? "text-base" : "text-xl"}>+</span>
                                </div>
                              </td>
                            );
                          })()}
                        </>
                      )}
                      <td className={`w-4 bg-transparent border-none ${rowHeightClass}`}></td>
                    </React.Fragment>
                  ))}

                  <td aria-hidden="true" className={`w-[28vw] min-w-[12rem] bg-transparent border-none pointer-events-none ${rowHeightClass}`}></td>

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
                          if (isLockedForEmployee) {
                            addToast("This week's timesheet is approved and locked. Contact your manager to request revisions.", "info");
                            return;
                          }
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
                          <span className={isCompact ? "text-lg" : "text-2xl"}>+</span>
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
        isCompact && !expandInsightsInCompact ? (
          <div className="bg-slate-50 dark:bg-zinc-950 border-t border-slate-300 dark:border-zinc-700 px-4 py-2 flex items-center justify-between shrink-0 h-10 select-none overflow-hidden text-xs transition-colors">
            <div className="flex items-center gap-3 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Capacity:
                </span>
                <span className="font-bold text-slate-900 dark:text-slate-100">
                  {totalHours.toFixed(1)} / {capacityGoal.toFixed(1)}h
                </span>
                <span className={`text-[10px] font-black px-1.5 py-0.5 rounded ${totalHours > capacityGoal ? "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400" : "bg-primary-50 text-primary-700 dark:bg-primary-950/40 dark:text-primary-300"}`}>
                  {Math.round((capacityGoal > 0 ? totalHours / capacityGoal : 0) * 100)}%
                </span>
              </div>

              {/* Mini progress bar */}
              <div className="w-20 sm:w-28 bg-slate-200 dark:bg-zinc-800 h-1.5 rounded-full overflow-hidden shrink-0">
                <div
                  className={`h-full ${totalHours > capacityGoal ? "bg-amber-500" : "bg-primary-600"} transition-all duration-300`}
                  style={{ width: `${Math.min(100, (capacityGoal > 0 ? totalHours / capacityGoal : 0) * 100)}%` }}
                />
              </div>

              {/* Top Project breakdown pill if exists */}
              {projectBreakdown.length > 0 && (
                <div className="hidden md:flex items-center gap-1.5 pl-3 border-l border-slate-300 dark:border-zinc-700 text-[11px] text-slate-600 dark:text-slate-400">
                  <span className="text-[10px] uppercase font-bold text-slate-400">Top:</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200 truncate max-w-[130px]">{projectBreakdown[0].name}</span>
                  <span className="font-bold text-primary-600">({projectBreakdown[0].hours.toFixed(1)}h)</span>
                </div>
              )}

              {/* Audit notes pill */}
              <div className="hidden sm:flex items-center gap-1 pl-3 border-l border-slate-300 dark:border-zinc-700 text-[11px]">
                {missingNotesCount > 0 ? (
                  <span className="text-red-600 dark:text-red-400 font-bold flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-500 inline-block"></span>
                    {missingNotesCount} missing notes
                  </span>
                ) : (
                  <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block"></span>
                    Audited
                  </span>
                )}
              </div>
            </div>

            <button
              type="button"
              onClick={() => setExpandInsightsInCompact(true)}
              className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white px-2.5 py-1 bg-white dark:bg-zinc-900 border border-slate-300 dark:border-zinc-700 rounded shadow-sm hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer shrink-0"
              title="Expand full analytics dashboard"
            >
              <span>Analytics</span>
              <ChevronUp className="w-3.5 h-3.5 text-slate-500" />
            </button>
          </div>
        ) : (
          <div className="relative bg-slate-50 dark:bg-zinc-950 border-t border-slate-300 dark:border-zinc-700 p-5 flex gap-5 shrink-0 h-44 select-none overflow-hidden text-xs transition-colors">
            {isCompact && (
              <button
                type="button"
                onClick={() => setExpandInsightsInCompact(false)}
                className="absolute top-2 right-2 inline-flex items-center gap-1 text-[10px] font-bold text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white px-2 py-0.5 bg-white dark:bg-zinc-900 border border-slate-300 dark:border-zinc-700 rounded shadow-sm hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer z-10"
                title="Collapse analytics bar"
              >
                <span>Collapse</span>
                <ChevronDown className="w-3 h-3 text-slate-500" />
              </button>
            )}
            {/* Card 1: Capacity Goal Progress */}
            <div className={`w-72 border border-slate-300 dark:border-zinc-700 p-4 flex items-center gap-4 transition-colors ${totalHours > capacityGoal ? "bg-amber-50 dark:bg-amber-900/20 border-amber-300 dark:border-amber-700/50" : "bg-white dark:bg-zinc-900"}`}>
              <div className="relative flex items-center justify-center shrink-0">
                <svg width="60" height="60" className="transform -rotate-90">
                  <circle
                    cx="30"
                    cy="30"
                    r="26"
                    stroke={totalHours > capacityGoal ? "rgba(245, 158, 11, 0.2)" : "#F3F4F6"}
                    strokeWidth="5"
                    fill="transparent"
                  />
                  <circle
                    cx="30"
                    cy="30"
                    r="26"
                    stroke={totalHours > capacityGoal ? "#D97706" : "#3B82F6"}
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
                <span className={`absolute text-[11px] font-black ${totalHours > capacityGoal ? "text-amber-700 dark:text-amber-500" : "text-slate-700 dark:text-slate-300"}`}>
                  {Math.round(
                    (capacityGoal > 0 ? totalHours / capacityGoal : 0) * 100,
                  )}
                  %
                </span>
              </div>

              <div className="space-y-0.5">
                <span className={`text-[9px] font-bold uppercase tracking-wider block ${totalHours > capacityGoal ? "text-amber-700 dark:text-amber-500" : "text-slate-400 dark:text-slate-600"}`}>
                  {totalHours > capacityGoal ? "OVERTIME ALERT" : "Capacity Goal"}
                </span>
                <span className={`text-sm font-black block ${totalHours > capacityGoal ? "text-amber-900 dark:text-amber-400" : "text-slate-900 dark:text-slate-100"}`}>
                  {totalHours.toFixed(1)} / {capacityGoal.toFixed(1)} hrs
                </span>
                {totalHours > capacityGoal ? (
                  <span className="text-[10px] font-bold text-amber-600 block flex items-center gap-1 animate-pulse">
                    <span>Capacity Exceeded</span>
                  </span>
                ) : totalHours === capacityGoal ? (
                  <span className="text-[10px] font-bold text-emerald-600 block flex items-center gap-1">
                    <span>Goal achieved</span>
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
        )
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
  onCollapse,
  onSelect,
  isFirstInProject,
  walkthroughActive,
  walkthroughStep,
  walkthroughDateId,
  isWalkthroughNoteTarget,
  gridRows,
  visibleColKeys,
  setSelectedCell,
  onAdvanceWalkthrough,
}) {
  const [localValue, setLocalValue] = useState(value || "");
  const textareaRef = useRef(null);

  const [prevValue, setPrevValue] = useState(value || "");

  if (value !== prevValue) {
    setLocalValue(value || "");
    setPrevValue(value);
  }

  const handleBlur = () => {
    if (localValue !== value) {
      onNoteChange(dateId, taskId, localValue);
    }
  };

  const handleKeyDown = (e) => {
    e.stopPropagation();

    // Walkthrough Step 1 Key Interceptor
    if (
      walkthroughActive &&
      walkthroughStep === 1 &&
      (e.key === "Tab" || (e.key === "Enter" && !e.shiftKey))
    ) {
      e.preventDefault();
      if (!localValue) {
        onNoteChange(dateId, taskId, "Sprint kickoff and architecture planning.");
      } else {
        handleBlur();
      }
      textareaRef.current.blur();
      if (onAdvanceWalkthrough) onAdvanceWalkthrough();

      const hRowIndex = gridRows.findIndex((r) => r.id === `${walkthroughDateId}_hours`);
      const tColIndex = visibleColKeys.indexOf("guest_t1_b");
      if (hRowIndex >= 0 && tColIndex >= 0) {
        if (setSelectedCell) setSelectedCell({ r: hRowIndex, c: tColIndex });
        setTimeout(() => {
          const nextInput = document.getElementById(
            `cell_input_${walkthroughDateId}_hours_guest_t1_b`
          );
          if (nextInput) {
            nextInput.focus({ preventScroll: true });
            nextInput.select();
          }
        }, 60);
      }
      return;
    }

    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      textareaRef.current.blur();
      document.getElementById(`cell_${rowId}_${taskId}`)?.focus({ preventScroll: true });
    }
    if (e.key === "Escape") {
      e.preventDefault();
      textareaRef.current.blur();
      if (onCollapse) {
        onCollapse();
      } else {
        document.getElementById(`cell_${rowId}_${taskId}`)?.focus({ preventScroll: true });
      }
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
            textareaRef.current?.focus({ preventScroll: true });
          }, 30);
        }
      }}
      className={`p-0 relative w-24 min-w-[6rem] max-w-[6rem] transition-all duration-200 cursor-cell scroll-mt-[8rem] scroll-ml-[19rem] align-middle
 ${isActive ? "border-b border-r border-slate-300 dark:border-zinc-700" : "border-b border-r border-transparent"}
 ${isFirstInProject ? (isActive ? "border-l border-slate-300 dark:border-zinc-700" : "border-l border-transparent") : ""}
 ${isWalkthroughNoteTarget ? "ring-2 ring-rose-500 bg-rose-50/20 z-20" : isSelected ? "ring-2 ring-inset ring-slate-900 bg-primary-50/30 z-10" : isToday ? "bg-primary-50/15" : isCurrentWeek ? "bg-primary-50/5" : "bg-slate-50 dark:bg-zinc-950/10"}
 `}
    >
      {isWalkthroughNoteTarget && (
        <div className="absolute top-1 right-2 z-30 pointer-events-none bg-rose-500 text-white font-mono font-bold text-[10px] px-2 py-0.5 shadow-lg animate-bounce">
          Step 2: Type note & press Tab
        </div>
      )}
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
