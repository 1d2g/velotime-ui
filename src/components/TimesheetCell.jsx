import React, { useState, useEffect, useRef } from "react";

export default function TimesheetCell({
  rowId,
  dateId,
  taskId,
  value,
  note,
  isFuture,
  isSelected,
  isEditing,
  isFirstInProject,
  onCellChange,
  onNoteChange,
  onSelect,
  onEditStart,
  onEditEnd,
  showMissingNotes,
  timeframe = "month",
  isToday,
  isCurrentWeek,
  className = "",
}) {
  const [isNoteOpen, setIsNoteOpen] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [localNote, setLocalNote] = useState(note || "");
  const inputRef = useRef(null);
  const initialEditValue = useRef(value);

  useEffect(() => {
    if (isSelected && inputRef.current && !isNoteOpen) {
      inputRef.current.focus();
    }
  }, [isSelected, isNoteOpen]);

  useEffect(() => {
    if (!isSelected) {
      setIsNoteOpen(false);
    }
  }, [isSelected]);

  useEffect(() => {
    const handleSpaceKeyDown = (e) => {
      if (
        (isHovered || isSelected) &&
        (e.key === " " || e.key === "Spacebar") &&
        !isNoteOpen
      ) {
        // Ignore if typing inside any textarea
        if (
          document.activeElement &&
          document.activeElement.tagName === "TEXTAREA"
        ) {
          return;
        }
        // Ignore Ctrl+Space or Cmd+Space so they still collapse/expand projects
        if (e.ctrlKey || e.metaKey) {
          return;
        }
        e.preventDefault();
        e.stopPropagation();
        if (!isSelected && onSelect) {
          onSelect();
        }
        if (!["day", "week"].includes(timeframe)) {
          setIsNoteOpen(true);
        } else {
          document.getElementById("bottom-note-textarea")?.focus();
        }
      }
    };

    window.addEventListener("keydown", handleSpaceKeyDown, true);
    return () =>
      window.removeEventListener("keydown", handleSpaceKeyDown, true);
  }, [isHovered, isSelected, isNoteOpen, onSelect, timeframe]);

  useEffect(() => {
    setLocalNote(note || "");
  }, [note]);

  const hasHours = parseFloat(value) > 0;
  const isMissingNote = hasHours && (!note || note.trim() === "");
  const displayAuditRed = showMissingNotes && isMissingNote;

  const handleInputKeyDown = (e) => {
    if (e.key === "Enter") {
      const currentVal = parseFloat(value) || 0;
      const initialVal = parseFloat(initialEditValue.current) || 0;

      if (currentVal > 0 && currentVal !== initialVal && !note) {
        e.preventDefault();
        e.stopPropagation();
        e.nativeEvent.stopImmediatePropagation();

        if (!["day", "week"].includes(timeframe)) {
          setIsNoteOpen(true);
        } else {
          document
            .getElementById(`cell_textarea_${dateId}_notes_${taskId}`)
            ?.focus();
        }
        initialEditValue.current = value;
        return;
      }
      initialEditValue.current = value;
    }
  };

  const handleSaveNote = () => {
    if (onNoteChange) onNoteChange(dateId, taskId, localNote);
    setIsNoteOpen(false);
    if (inputRef.current) inputRef.current.focus();
  };

  return (
    <td
      id={`cell_${rowId}_${taskId}`}
      tabIndex={-1}
      onClick={onSelect}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`border-b border-r border-slate-300 dark:border-zinc-700 p-0 relative h-12 transition-colors cursor-cell scroll-mt-[8rem] scroll-ml-[19rem] align-middle group-hover:bg-primary-50/40 
 ${isFirstInProject ? "border-l " : ""}
 ${isSelected && !isNoteOpen ? "ring-2 ring-inset ring-slate-900 bg-primary-50/50 z-10" : isToday ? "bg-primary-50/15" : isCurrentWeek ? "bg-primary-50/5" : "bg-transparent"}
 ${displayAuditRed && !isSelected ? "ring-2 ring-inset ring-red-400 bg-red-50/80 " : ""}
 ${className}
 `}
    >
      <input
        id={`cell_input_${rowId}_${taskId}`}
        ref={inputRef}
        type="number"
        min="0"
        max="24"
        step="0.5"
        value={value || ""}
        onChange={(e) => onCellChange(dateId, taskId, e.target.value)}
        onKeyDown={handleInputKeyDown}
        onFocus={() => {
          initialEditValue.current = value;
        }}
        onBlur={onEditEnd}
        className={`w-full h-full min-h-[40px] block text-center outline-none transition-all cursor-cell bg-transparent
 ${isEditing && isSelected ? "caret-auto" : "caret-transparent"} 
 ${isFuture ? "text-slate-400 dark:text-slate-600 " : "text-slate-900 dark:text-slate-100 "}
 ${displayAuditRed ? "text-red-700 font-semibold" : ""}
 ${isSelected ? "font-bold" : ""}
 `}
      />

      {/* THE BLUE TRIANGLE: Shows if a note exists */}
      {note && (
        <div
          className="absolute top-0 right-0 w-0 h-0 border-t-[8px] border-l-[8px] border-t-blue-500 border-l-transparent cursor-pointer opacity-80 hover:opacity-100 z-20"
          onClick={(e) => {
            e.stopPropagation();
            if (onSelect) onSelect();

            // Wait for render, then focus the appropriate active textarea
            setTimeout(() => {
              const el = document.getElementById(
                `cell_textarea_${dateId}_notes_${taskId}`,
              );
              if (el) {
                el.focus();
                // If it's a textarea, set selection to the end of the text
                if (el.tagName === "TEXTAREA") {
                  const val = el.value;
                  el.value = "";
                  el.value = val;
                }
              } else {
                setIsNoteOpen(true);
              }
            }, 80);
          }}
          title={note}
        />
      )}

      {/* THE RED PLUS: Shows if hours exist but NO note exists */}
      {!note && hasHours && !isNoteOpen && (
        <div
          className="absolute top-0.5 right-1 text-red-650 cursor-pointer opacity-80 hover:opacity-100 font-black z-20 text-[10px] leading-none"
          onClick={(e) => {
            e.stopPropagation();
            if (onSelect) onSelect();

            // Wait for render, then focus the appropriate active textarea
            setTimeout(() => {
              const el = document.getElementById(
                `cell_textarea_${dateId}_notes_${taskId}`,
              );
              if (el) {
                el.focus();
              } else {
                setIsNoteOpen(true);
              }
            }, 80);
          }}
          title="Add required note"
        >
          +
        </div>
      )}

      {/* The Note Popover */}
      {isNoteOpen && (
        <div
          className="absolute top-full left-1/2 -translate-x-1/2 mt-1 z-50 w-56 bg-white dark:bg-zinc-900 border border-slate-300 dark:border-zinc-700 p-3"
          onClick={(e) => e.stopPropagation()}
          onKeyDown={(e) => {
            // Protect textarea typing from global Matrix hotkeys
            e.stopPropagation();
            e.nativeEvent.stopImmediatePropagation();
          }}
        >
          <div className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-2 flex justify-between items-center">
            <span>Task Note</span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsNoteOpen(false);
                inputRef.current?.focus();
              }}
              className="text-slate-400 dark:text-slate-600 hover:text-red-500 text-base leading-none"
            >
              &times;
            </button>
          </div>
          <textarea
            autoFocus
            value={localNote}
            onChange={(e) => setLocalNote(e.target.value)}
            onKeyDown={(e) => {
              e.stopPropagation();
              e.nativeEvent.stopImmediatePropagation();
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSaveNote();
              }
              if (e.key === "Escape") {
                e.preventDefault();
                setIsNoteOpen(false);
                inputRef.current?.focus();
              }
            }}
            placeholder="What did you work on?"
            className="w-full text-sm p-2 border border-slate-300 dark:border-zinc-700 rounded focus:outline-none focus:ring-2 focus:ring-slate-900 resize-none h-20 bg-slate-50 dark:bg-zinc-950 text-slate-900 dark:text-slate-100 "
          />
          <div className="flex justify-end mt-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleSaveNote();
              }}
              className="bg-slate-900 text-white text-xs px-3 py-1.5 rounded font-semibold hover:bg-slate-900 transition-colors "
            >
              Save Note
            </button>
          </div>
        </div>
      )}
    </td>
  );
}
