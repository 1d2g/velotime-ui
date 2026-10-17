import React, { useState, useRef } from "react";
import { UploadCloud, FileSpreadsheet, Sparkles, Check, ArrowRight, RotateCcw, X, Layers } from "lucide-react";
import { useToast } from "../../contexts/ToastContext";
import { GUEST_USER_ID } from "./guestInitialData";

// RFC-4180 compliant CSV parser
function parseCSV(text) {
  const rows = [];
  let currentRow = [];
  let currentVal = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        currentVal += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      currentRow.push(currentVal.trim());
      currentVal = '';
    } else if ((char === '\r' || char === '\n') && !inQuotes) {
      if (char === '\r' && nextChar === '\n') i++;
      currentRow.push(currentVal.trim());
      if (currentRow.some(val => val !== '')) {
        rows.push(currentRow);
      }
      currentRow = [];
      currentVal = '';
    } else {
      currentVal += char;
    }
  }

  if (currentVal || currentRow.length > 0) {
    currentRow.push(currentVal.trim());
    if (currentRow.some(val => val !== '')) {
      rows.push(currentRow);
    }
  }

  if (rows.length === 0) return { headers: [], records: [] };

  const headers = rows[0].map(h => h.replace(/^["']|["']$/g, '').trim());
  const records = rows.slice(1).map(row => {
    const obj = {};
    headers.forEach((h, idx) => {
      obj[h] = row[idx] !== undefined ? row[idx].replace(/^["']|["']$/g, '').trim() : '';
    });
    return obj;
  });

  return { headers, records };
}

function normalizeEntity(str) {
  if (!str) return '';
  return str
    .trim()
    .toLowerCase()
    .replace(/["'’]/g, '')
    .replace(/[.,/#!$%^&*;:{}=\-_`~()]/g, ' ')
    .replace(/\b(inc|corp|corporation|llc|ltd|gmbh|co)\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function pickBestCanonicalName(names) {
  if (!names || names.length === 0) return '';
  const sorted = [...names].sort((a, b) => {
    const upperA = (a.match(/[A-Z]/g) || []).length;
    const upperB = (b.match(/[B-Z]/g) || []).length;
    if (upperA !== upperB) return upperB - upperA;
    return a.length - b.length;
  });
  return sorted[0].trim();
}

/**
 * GuestMigrationBar
 *
 * Slim, high-conversion ribbon pinned directly over the project matrix in Demo Mode.
 * Invites visitors to drop their Harvest, Toggl, or Clockify export to instantly
 * visualize their actual client/project/task matrix live in VeloTime.
 */
export default function GuestMigrationBar({
  dates = [],
  onApplyDemoImport,
  onResetDemoData,
  importedInfo = null,
  onClaimWorkspace,
  onOpenFullWizard,
}) {
  const { addToast } = useToast();
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const fileInputRef = useRef(null);

  if (isDismissed && !importedInfo) return null;

  // Process and map raw records into VeloTime guest workspace format
  const processCSVContent = (text, fileName, platform = 'csv') => {
    const { records } = parseCSV(text);
    if (!records || records.length === 0) {
      throw new Error("CSV file appears to be empty or unreadable.");
    }

    const rawClientsMap = new Map();
    const rawProjectsMap = new Map(); // normKey -> { rawNames: Set, clientName: str, rawTasks: Map(normTaskKey -> Set) }
    const parsedEntries = [];

    records.forEach((r) => {
      const rawClient = (r['Client'] || r['Client Name'] || r['client'] || '').trim();
      const rawProject = (r['Project'] || r['Project Name'] || r['project'] || '').trim();
      const rawTask = (r['Task'] || r['Task Name'] || r['task'] || 'General').trim();

      if (rawClient) {
        const normC = normalizeEntity(rawClient);
        if (!rawClientsMap.has(normC)) rawClientsMap.set(normC, new Set());
        rawClientsMap.get(normC).add(rawClient);
      }

      if (rawProject) {
        const normP = normalizeEntity(rawProject);
        if (!rawProjectsMap.has(normP)) {
          rawProjectsMap.set(normP, {
            rawNames: new Set(),
            clientName: rawClient || 'General',
            tasksMap: new Map(),
          });
        }
        const projData = rawProjectsMap.get(normP);
        projData.rawNames.add(rawProject);
        if (rawClient && projData.clientName === 'General') {
          projData.clientName = rawClient;
        }

        const normT = normalizeEntity(rawTask);
        if (!projData.tasksMap.has(normT)) {
          projData.tasksMap.set(normT, new Set());
        }
        projData.tasksMap.get(normT).add(rawTask);
      }

      // Parse hours
      let hours = 0;
      if (r['Hours'] || r['hours']) {
        hours = parseFloat(r['Hours'] || r['hours']) || 0;
      } else if (r['Duration (decimal)']) {
        hours = parseFloat(r['Duration (decimal)']) || 0;
      } else if (r['Duration']) {
        const durStr = String(r['Duration']).trim();
        if (durStr.includes(':')) {
          const parts = durStr.split(':').map(Number);
          if (parts.length === 3) hours = parts[0] + parts[1] / 60 + parts[2] / 3600;
          else if (parts.length === 2) hours = parts[0] + parts[1] / 60;
        } else {
          hours = parseFloat(durStr) || 0;
        }
      }

      const dateStr = (r['Date'] || r['Start date'] || r['Start Date'] || r['date'] || '').trim();
      const noteStr = (r['Notes'] || r['Description'] || r['notes'] || r['description'] || '').trim();

      if (rawProject && hours > 0) {
        parsedEntries.push({
          rawClient,
          rawProject,
          rawTask,
          dateStr,
          hours: Math.round(hours * 100) / 100,
          noteStr,
        });
      }
    });

    if (rawProjectsMap.size === 0) {
      throw new Error("No recognizable projects found in this CSV. Please check the column headers.");
    }

    // Build consolidated Clients
    const clientMap = new Map(); // clientName -> clientObj
    let cIdx = 1;
    rawClientsMap.forEach((rawSet) => {
      const canonicalName = pickBestCanonicalName(Array.from(rawSet));
      const clientObj = {
        id: `guest_c_import_${cIdx++}`,
        name: canonicalName,
        address: "Imported Workspace",
      };
      clientMap.set(canonicalName.toLowerCase(), clientObj);
    });

    // Fallback client if none specified
    if (clientMap.size === 0) {
      const defaultClient = {
        id: `guest_c_import_1`,
        name: "General",
        address: "Imported Workspace",
      };
      clientMap.set("general", defaultClient);
    }

    // Build consolidated Projects & Tasks
    const projectList = [];
    const taskKeyMap = new Map(); // `${normP}_${normT}` -> taskId
    let pIdx = 1;

    rawProjectsMap.forEach((pData, normP) => {
      const canonicalProjectName = pickBestCanonicalName(Array.from(pData.rawNames));
      const clientKey = (pData.clientName || 'General').toLowerCase();
      const matchedClient = clientMap.get(clientKey) || Array.from(clientMap.values())[0];

      const tasks = [];
      let tIdx = 1;
      pData.tasksMap.forEach((rawTaskSet, normT) => {
        const canonicalTaskName = pickBestCanonicalName(Array.from(rawTaskSet));
        const taskId = `guest_t_imp_${pIdx}_${tIdx++}`;
        tasks.push({
          id: taskId,
          name: canonicalTaskName,
          isBillable: true,
        });
        taskKeyMap.set(`${normP}_${normT}`, taskId);
      });

      // Ensure at least one task exists
      if (tasks.length === 0) {
        const defaultTaskId = `guest_t_imp_${pIdx}_1`;
        tasks.push({
          id: defaultTaskId,
          name: "General Work",
          isBillable: true,
        });
        taskKeyMap.set(`${normP}_general`, defaultTaskId);
      }

      projectList.push({
        id: `guest_p_import_${pIdx++}`,
        name: canonicalProjectName,
        clientId: matchedClient.id,
        client: matchedClient,
        clientName: matchedClient.name,
        hourlyRate: 150,
        budget: 15000,
        budgetHours: 100,
        isCollapsed: false,
        tasks,
      });
    });

    // Map entries onto the current week's dates
    const entriesMap = {};
    const notesMap = {};
    const activeDateIds = dates.map(d => d.id);
    const dateLookupByDay = {}; // 0..6 -> dateObj.id
    dates.forEach(d => {
      try {
        const jsDate = new Date(d.id + 'T00:00:00');
        dateLookupByDay[jsDate.getDay()] = d.id;
      } catch {}
    });

    parsedEntries.forEach((entry) => {
      const normP = normalizeEntity(entry.rawProject);
      const normT = normalizeEntity(entry.rawTask);
      const taskId = taskKeyMap.get(`${normP}_${normT}`) || taskKeyMap.get(`${normP}_general`);
      if (!taskId) return;

      // Determine date
      let targetDateId = null;
      if (activeDateIds.includes(entry.dateStr)) {
        targetDateId = entry.dateStr;
      } else {
        try {
          const entryDate = new Date(entry.dateStr + 'T00:00:00');
          if (!isNaN(entryDate.getTime())) {
            targetDateId = dateLookupByDay[entryDate.getDay()];
          }
        } catch {}
      }

      if (!targetDateId && dates.length > 0) {
        targetDateId = dates[0].id;
      }

      if (targetDateId) {
        const cellKey = `${GUEST_USER_ID}_${targetDateId}_${taskId}`;
        entriesMap[cellKey] = Math.round(((entriesMap[cellKey] || 0) + entry.hours) * 100) / 100;
        if (entry.noteStr && !notesMap[cellKey]) {
          notesMap[cellKey] = entry.noteStr;
        }
      }
    });

    const clientsList = Array.from(clientMap.values());
    const totalTasks = projectList.reduce((sum, p) => sum + p.tasks.length, 0);

    return {
      clients: clientsList,
      projects: projectList,
      entries: entriesMap,
      notes: notesMap,
      rawEntries: parsedEntries,
      sourceFileName: fileName,
      platform,
      projectCount: projectList.length,
      taskCount: totalTasks,
      recordCount: parsedEntries.length,
    };
  };

  const handleProcessFile = (file) => {
    if (!file) return;
    if (!file.name.toLowerCase().endsWith('.csv') && file.type && !file.type.includes('csv') && !file.type.includes('text')) {
      addToast("Please upload a .csv export file", "error");
      return;
    }

    setIsProcessing(true);
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const text = e.target.result;
        const result = processCSVContent(text, file.name);
        onApplyDemoImport(result);
        addToast(`Imported ${result.projectCount} projects & ${result.taskCount} tasks from ${file.name}!`, "success");
      } catch (err) {
        addToast(err.message || "Failed to parse CSV export", "error");
      } finally {
        setIsProcessing(false);
      }
    };

    reader.onerror = () => {
      setIsProcessing(false);
      addToast("Failed to read file from disk", "error");
    };

    reader.readAsText(file);
  };

  const handleLoadSample = async (platformType) => {
    setIsProcessing(true);
    try {
      const res = await fetch(`/demo_imports/${platformType}_demo_export.csv`);
      if (!res.ok) throw new Error(`Could not load ${platformType} sample file`);
      const text = await res.text();
      const result = processCSVContent(text, `${platformType.toUpperCase()} Demo Export.csv`, platformType);
      onApplyDemoImport(result);
      addToast(`Loaded ${result.projectCount} ${platformType.toUpperCase()} projects into the live demo!`, "success");
    } catch (err) {
      addToast(err.message || `Failed to load sample dataset`, "error");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy';
    if (!isDragging) setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.currentTarget.contains(e.relatedTarget)) return;
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer?.files || []);
    if (files.length > 0) {
      handleProcessFile(files[0]);
    }
  };

  return (
    <div
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`w-full transition-all duration-150 shrink-0 select-none border-b ${
        isDragging
          ? "bg-emerald-950 text-emerald-100 border-emerald-500 ring-2 ring-emerald-500/50"
          : importedInfo
          ? "bg-slate-900 text-slate-100 border-slate-800"
          : "bg-slate-950 text-white border-slate-800"
      }`}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept=".csv,text/csv,application/vnd.ms-excel"
        onChange={(e) => {
          if (e.target.files?.length > 0) {
            handleProcessFile(e.target.files[0]);
          }
          e.target.value = '';
        }}
        className="hidden"
      />

      <div className="max-w-7xl mx-auto px-4 py-2 flex flex-col md:flex-row items-center justify-between gap-2.5 text-xs">
        {/* Left Side: Pitch or Active State */}
        <div className="flex items-center gap-2.5 flex-wrap min-w-0">
          {importedInfo ? (
            <>
              <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 bg-emerald-950 text-emerald-300 border border-emerald-700/60 uppercase tracking-wider flex items-center gap-1">
                <Check className="w-3 h-3 text-emerald-400" />
                Live Preview
              </span>
              <span className="text-slate-200">
                Viewing <strong className="text-white">{importedInfo.projectCount} projects</strong> and{" "}
                <strong className="text-white">{importedInfo.taskCount} tasks</strong> from{" "}
                <span className="font-mono text-emerald-300 font-semibold">{importedInfo.fileName}</span>
              </span>
            </>
          ) : isDragging ? (
            <>
              <span className="font-mono text-[10px] font-black px-1.5 py-0.5 bg-emerald-500 text-slate-950 uppercase tracking-wider">
                Drop to Import
              </span>
              <span className="text-emerald-200 font-bold">
                Release your file to instantly populate VeloTime with your real timesheet structure!
              </span>
            </>
          ) : (
            <>
              <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 bg-rose-950 text-rose-300 border border-rose-700/60 uppercase tracking-wider flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-rose-400" />
                Instant Preview
              </span>
              <span className="text-slate-200 font-medium">
                Want to see your own timesheet in VeloTime?
              </span>
              <span className="text-slate-400">
                Drop your Harvest, Toggl, or Clockify CSV export here
              </span>
            </>
          )}
        </div>

        {/* Right Side: Actions & Demo Datasets */}
        <div className="flex items-center gap-2 shrink-0">
          {importedInfo ? (
            <>
              <button
                type="button"
                onClick={onClaimWorkspace}
                className="px-2.5 py-1 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm"
              >
                <span>Save Workspace</span>
                <ArrowRight className="w-3 h-3" />
              </button>

              {onOpenFullWizard && (
                <button
                  type="button"
                  onClick={onOpenFullWizard}
                  className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-medium text-xs border border-slate-700 transition-colors cursor-pointer"
                  title="Open full deduplication & consolidation wizard"
                >
                  <Layers className="w-3 h-3 inline mr-1 text-slate-400" />
                  <span>Consolidate</span>
                </button>
              )}

              <button
                type="button"
                onClick={onResetDemoData}
                className="text-slate-400 hover:text-white text-xs underline cursor-pointer ml-1"
                title="Restore default demo workspace"
              >
                Reset Demo
              </button>
            </>
          ) : (
            <>
              <div className="hidden lg:flex items-center gap-1 text-[11px] text-slate-400 mr-1">
                <span>Or test sample:</span>
                <button
                  type="button"
                  disabled={isProcessing}
                  onClick={() => handleLoadSample('harvest')}
                  className="px-1.5 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-mono text-[10px] border border-slate-700 transition-colors cursor-pointer disabled:opacity-50"
                  title="Load sample Harvest CSV"
                >
                  Harvest
                </button>
                <button
                  type="button"
                  disabled={isProcessing}
                  onClick={() => handleLoadSample('toggl')}
                  className="px-1.5 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-mono text-[10px] border border-slate-700 transition-colors cursor-pointer disabled:opacity-50"
                  title="Load sample Toggl CSV"
                >
                  Toggl
                </button>
                <button
                  type="button"
                  disabled={isProcessing}
                  onClick={() => handleLoadSample('clockify')}
                  className="px-1.5 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-mono text-[10px] border border-slate-700 transition-colors cursor-pointer disabled:opacity-50"
                  title="Load sample Clockify CSV"
                >
                  Clockify
                </button>
              </div>

              <button
                type="button"
                disabled={isProcessing}
                onClick={() => fileInputRef.current?.click()}
                className="px-2.5 py-1 bg-white hover:bg-slate-100 text-slate-900 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
              >
                <UploadCloud className="w-3.5 h-3.5 text-slate-700" />
                <span>{isProcessing ? "Parsing..." : "Browse CSV"}</span>
              </button>

              <button
                type="button"
                onClick={() => setIsDismissed(true)}
                className="p-1 text-slate-500 hover:text-slate-300 transition-colors cursor-pointer ml-0.5"
                title="Dismiss preview banner"
                aria-label="Dismiss banner"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
