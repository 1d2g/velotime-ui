import React, { useState, useEffect, useRef } from "react";

const MOCK_GLOBAL_PROJECTS = [
  "Acme Corp Website",
  "Stark Industries CRM",
  "Wayne Enterprises Portal",
  "Oscorp Mobile App",
  "Goliath National Bank Update",
  "Daily Bugle SEO",
  "Umbrella Corp Security",
];

export default function AddProjectPopover({
  isActive,
  onClose,
  onAddProject,
  projects,
  writeAllowed,
}) {
  const [newProjectName, setNewProjectName] = useState("");
  const [error, setError] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(-1); // Tracks keyboard navigation
  const inputRef = useRef(null);
  const listRef = useRef(null);

  useEffect(() => {
    if (isActive && writeAllowed) {
      setNewProjectName("");
      setError("");
      setSelectedIndex(-1);
      setTimeout(() => inputRef.current?.focus(), 10);
    }
  }, [isActive, writeAllowed]);

  const unaddedProjects = MOCK_GLOBAL_PROJECTS.filter(
    (globalProj) =>
      !projects.some((p) => p.name.toLowerCase() === globalProj.toLowerCase()),
  );

  const filteredProjects = unaddedProjects.filter((p) =>
    p.toLowerCase().includes(newProjectName.toLowerCase()),
  );

  const isExactMatch = filteredProjects.some(
    (p) => p.toLowerCase() === newProjectName.trim().toLowerCase(),
  );

  const showCreateNew = newProjectName.trim() && !isExactMatch;

  // Unified list of options for keyboard navigation
  const options = [...filteredProjects];
  if (showCreateNew) options.push("__CREATE_NEW__");

  // Reset selection when search text changes
  useEffect(() => {
    setSelectedIndex(-1);
  }, [newProjectName]);

  // Scroll the highlighted item into view automatically
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

    const exists = projects.some(
      (p) => p.name.toLowerCase() === trimmed.toLowerCase(),
    );
    if (exists) {
      setError(`"${trimmed}" is already on your timesheet.`);
      return;
    }

    onAddProject(trimmed);
    onClose();
  };

  const handleKeyDown = (e) => {
    if (e.key === "Escape") {
      e.preventDefault();
      onClose();
      return;
    }

    if (options.length === 0) {
      if (e.key === "Enter") handleSubmit(newProjectName);
      return;
    }

    if (e.key === "ArrowDown" || e.key === "Tab") {
      e.preventDefault(); // Prevents Tab from moving focus to the Add button
      setSelectedIndex((prev) => (prev + 1) % options.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev <= 0 ? options.length - 1 : prev - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (selectedIndex >= 0 && selectedIndex < options.length) {
        const selected = options[selectedIndex];
        handleSubmit(selected === "__CREATE_NEW__" ? newProjectName : selected);
      } else {
        handleSubmit(newProjectName);
      }
    }
  };

  if (!isActive) return null;

  return (
    <div
      className="absolute top-2 right-16 z-50 bg-white p-3.5 border border-slate-300 w-64 flex flex-col font-sans text-left"
      onClick={(e) => e.stopPropagation()}
    >
      {!writeAllowed ? (
        <div className="flex flex-col gap-2">
          <div className="flex justify-between items-center">
            <span className="text-xs font-bold text-red-500 uppercase tracking-wider">
              Access Restricted
            </span>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-red-500 text-lg leading-none cursor-pointer p-0.5"
              title="Close"
            >
              &times;
            </button>
          </div>
          <p className="text-xs text-slate-500 leading-relaxed font-normal">
            Please contact an administrator to add a project.
          </p>
        </div>
      ) : (
        <>
          <div className="flex justify-between items-center mb-3">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              New Project
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
              className={`flex-1 border px-3 py-2 text-sm outline-none focus:ring-2 font-normal text-slate-900 transition-colors ${
                error
                  ? "border-red-300 focus:ring-red-500 bg-red-50/30"
                  : "border-slate-300 focus:ring-slate-900"
              }`}
              value={newProjectName}
              onChange={(e) => {
                setNewProjectName(e.target.value);
                if (error) setError("");
              }}
              onKeyDown={handleKeyDown}
            />
            <button
              onClick={() => handleSubmit(newProjectName)}
              className="bg-slate-900 hover:bg-slate-900 text-white px-3 py-2 text-sm font-semibold transition-colors cursor-pointer"
            >
              Add
            </button>
          </div>

          <ul
            ref={listRef}
            className="mt-2 max-h-40 overflow-y-auto border border-slate-300 bg-slate-50 flex flex-col divide-y divide-gray-100 "
          >
            {options.map((opt, i) => {
              const isSelected = i === selectedIndex;

              if (opt === "__CREATE_NEW__") {
                return (
                  <li
                    key="create-new"
                    className={`px-3 py-2 text-sm text-rose-600 cursor-pointer italic font-medium transition-colors ${isSelected ? "bg-rose-100" : "hover:bg-rose-100/50"}`}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      handleSubmit(newProjectName);
                    }}
                  >
                    + Create new: "{newProjectName.trim()}"
                  </li>
                );
              }

              return (
                <li
                  key={opt}
                  className={`px-3 py-2 text-sm text-slate-700 cursor-pointer transition-colors ${isSelected ? "bg-rose-100 text-blue-800" : "hover:bg-rose-50"}`}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    handleSubmit(opt);
                  }}
                >
                  {opt}
                </li>
              );
            })}

            {options.length === 0 && !newProjectName.trim() && (
              <li className="px-3 py-2 text-xs text-slate-400 text-center italic">
                Start typing to search...
              </li>
            )}
          </ul>
        </>
      )}
    </div>
  );
}
