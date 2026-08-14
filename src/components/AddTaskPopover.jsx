import React, { useState, useEffect, useRef } from "react";

const MOCK_GLOBAL_TASKS = [
  "UI/UX Design",
  "Frontend Development",
  "Backend Integration",
  "Database Architecture",
  "QA & Testing",
  "Client Meeting",
  "Code Review",
  "Documentation",
  "Project Management",
];

export default function AddTaskPopover({
  project,
  isActive,
  isFirstInProject,
  onToggle,
  onAddTask,
  writeAllowed,
}) {
  const [taskName, setTaskName] = useState("");
  const [error, setError] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef(null);
  const listRef = useRef(null);

  useEffect(() => {
    if (isActive && writeAllowed) {
      setTaskName("");
      setError("");
      setSelectedIndex(-1);
      setTimeout(() => inputRef.current?.focus(), 10);
    }
  }, [isActive, writeAllowed]);

  const unaddedTasks = MOCK_GLOBAL_TASKS.filter(
    (globalTask) =>
      !project.tasks.some(
        (t) => t.name.toLowerCase() === globalTask.toLowerCase(),
      ),
  );

  const filteredTasks = unaddedTasks.filter((t) =>
    t.toLowerCase().includes(taskName.toLowerCase()),
  );

  const isExactMatch = filteredTasks.some(
    (t) => t.toLowerCase() === taskName.trim().toLowerCase(),
  );

  const showCreateNew = taskName.trim() && !isExactMatch;
  const options = [...filteredTasks];
  if (showCreateNew) options.push("__CREATE_NEW__");

  useEffect(() => setSelectedIndex(-1), [taskName]);

  useEffect(() => {
    if (selectedIndex >= 0 && listRef.current) {
      const li = listRef.current.children[selectedIndex];
      if (li) li.scrollIntoView({ block: "nearest" });
    }
  }, [selectedIndex]);

  const handleSubmit = (nameToAdd) => {
    const trimmed = nameToAdd.trim();
    if (!trimmed) {
      setError("Name cannot be empty.");
      return;
    }
    if (
      project.tasks.some((t) => t.name.toLowerCase() === trimmed.toLowerCase())
    ) {
      setError("Task already exists.");
      return;
    }

    onAddTask(project.id, { id: `task_${Date.now()}`, name: trimmed });
    onToggle(project.id);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Escape") {
      e.preventDefault();
      onToggle(project.id);
      return;
    }
    if (options.length === 0) {
      if (e.key === "Enter") handleSubmit(taskName);
      return;
    }
    if (e.key === "ArrowDown" || e.key === "Tab") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % options.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev <= 0 ? options.length - 1 : prev - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (selectedIndex >= 0 && selectedIndex < options.length) {
        const selected = options[selectedIndex];
        handleSubmit(selected === "__CREATE_NEW__" ? taskName : selected);
      } else {
        handleSubmit(taskName);
      }
    }
  };

  return (
    // THE Z-INDEX FIX: Elevates to z-[60] when active so it naturally floats above sticky right columns
    <th
      className={`sticky top-16 bg-white dark:bg-zinc-900 w-20 h-16 border-b border-r border-slate-300 dark:border-zinc-700 animate-task-btn overflow-visible relative transition-colors ${isActive ? "z-[60]" : "z-30"}`}
    >
      <div className="absolute inset-0 w-full h-full p-1 flex items-center justify-center border-l border-slate-300 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-950 transition-colors">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggle(project.id);
          }}
          className="w-full h-full flex flex-col items-center justify-center text-slate-400 dark:text-slate-600 hover:text-primary-600 hover:bg-white dark:bg-zinc-900 transition-colors rounded border border-transparent hover:border-slate-300 dark:border-zinc-700 cursor-pointer"
          title={
            writeAllowed
              ? "Add Task"
              : "Please contact an administrator to add a task"
          }
        >
          <span className="text-[10px] uppercase font-bold tracking-tighter leading-tight mt-1">
            Add
            <br />
            Task
          </span>
        </button>
      </div>

      {isActive && (
        <div
          className="absolute top-14 right-0 bg-white dark:bg-zinc-900 p-3.5 border border-slate-300 dark:border-zinc-700 w-64 flex flex-col font-sans font-normal text-left z-[70]"
          onClick={(e) => e.stopPropagation()}
        >
          {!writeAllowed ? (
            <div className="flex flex-col gap-2">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-red-500 uppercase tracking-wider">
                  Access Restricted
                </span>
                <button
                  onClick={() => onToggle(project.id)}
                  className="text-slate-400 dark:text-slate-600 hover:text-red-500 text-lg leading-none cursor-pointer p-0.5"
                  title="Close"
                >
                  &times;
                </button>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-500 leading-relaxed font-normal">
                Please contact an administrator to add a task.
              </p>
            </div>
          ) : (
            <>
              <div className="flex justify-between items-center mb-3">
                <span className="text-xs font-bold text-slate-500 dark:text-slate-500 uppercase tracking-wider">
                  New Task
                </span>
                {error && (
                  <span className="text-[10px] font-bold text-red-500 truncate ml-2 uppercase bg-red-50 px-2 py-0.5 rounded">
                    {error}
                  </span>
                )}
              </div>

              <div className="flex gap-2">
                <input
                  ref={inputRef}
                  type="text"
                  placeholder="Search or create..."
                  className={`flex-1 border px-3 py-2 text-sm outline-none focus:ring-2 text-slate-900 dark:text-slate-100 transition-colors ${error ? "border-red-300 focus:ring-red-500 bg-red-50/30" : "border-slate-300 dark:border-zinc-700 focus:ring-slate-900"}`}
                  value={taskName}
                  onChange={(e) => {
                    setTaskName(e.target.value);
                    setError("");
                  }}
                  onKeyDown={handleKeyDown}
                />
                <button
                  onClick={() => handleSubmit(taskName)}
                  className="bg-slate-900 hover:bg-slate-900 text-white px-3 py-2 text-sm font-semibold transition-colors cursor-pointer"
                >
                  Add
                </button>
              </div>

              <ul
                ref={listRef}
                className="mt-2 max-h-40 overflow-y-auto border border-slate-300 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-950 flex flex-col divide-y divide-gray-100 "
              >
                {options.map((opt, i) => {
                  const isSelected = i === selectedIndex;
                  if (opt === "__CREATE_NEW__") {
                    return (
                      <li
                        key="create-new"
                        className={`px-3 py-2 text-sm text-primary-600 cursor-pointer italic font-medium transition-colors ${isSelected ? "bg-primary-100" : "hover:bg-primary-100/50"}`}
                        onMouseDown={(e) => {
                          e.preventDefault();
                          handleSubmit(taskName);
                        }}
                      >
                        + Create new: "{taskName.trim()}"
                      </li>
                    );
                  }
                  return (
                    <li
                      key={opt}
                      className={`px-3 py-2 text-sm text-slate-700 dark:text-slate-300 cursor-pointer transition-colors ${isSelected ? "bg-primary-100 text-blue-800" : "hover:bg-primary-50"}`}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        handleSubmit(opt);
                      }}
                    >
                      {opt}
                    </li>
                  );
                })}
              </ul>
            </>
          )}
        </div>
      )}
    </th>
  );
}
