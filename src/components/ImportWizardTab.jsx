import React, { useState, useMemo } from 'react';
import { useToast } from '../contexts/ToastContext';

// Helper: RFC-4180 compliant CSV parser that handles quotes, escaped quotes, commas inside quotes, and newlines
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
        i++; // skip escaped quote
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

// Normalization helper for fuzzy artifact detection
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

// Helper to choose the cleanest name as canonical (prefer Title Cased over lowercased, and without trailing punctuation)
function pickBestCanonicalName(names) {
  if (!names || names.length === 0) return '';
  // Sort by length and presence of uppercase characters
  const sorted = [...names].sort((a, b) => {
    const upperA = (a.match(/[A-Z]/g) || []).length;
    const upperB = (b.match(/[B-Z]/g) || []).length;
    if (upperA !== upperB) return upperB - upperA;
    return a.length - b.length;
  });
  return sorted[0].trim();
}

export default function ImportWizardTab({ dbUser, clients = [], projects = [], apiCall, forceSync, onBack }) {
  const { addToast } = useToast();

  const [platform, setPlatform] = useState('harvest'); // 'harvest' | 'toggl' | 'clockify' | 'csv'
  const [method, setMethod] = useState('csv'); // 'csv' | 'api'
  const [step, setStep] = useState(1); // 1: Source, 2: Reconcile & Consolidate, 3: Confirmation / Finished

  // API credentials state
  const [harvestToken, setHarvestToken] = useState('');
  const [harvestAccountId, setHarvestAccountId] = useState('');
  const [togglApiKey, setTogglApiKey] = useState('');
  const [isTestingApi, setIsTestingApi] = useState(false);
  const [apiConnectionSuccess, setApiConnectionSuccess] = useState(false);

  // Parsing & Reconciled Data State
  const [isParsing, setIsParsing] = useState(false);
  const [sourceFileName, setSourceFileName] = useState('');
  const [rawRecordsCount, setRawRecordsCount] = useState(0);

  // Consolidated Entities State (Editable by user in Step 2)
  const [consolidatedClients, setConsolidatedClients] = useState([]); // { canonical, originalList: [], isArtifact: bool }
  const [consolidatedProjects, setConsolidatedProjects] = useState([]); // { canonical, clientName, originalList: [], matchesExisting: bool, existingProjectId: null }
  const [consolidatedTasks, setConsolidatedTasks] = useState([]); // { canonical, originalList: [], isBillable: bool }
  const [consolidatedEmployees, setConsolidatedEmployees] = useState([]); // { name, email }
  const [rawEntriesToImport, setRawEntriesToImport] = useState([]);
  const [includeHistoricalEntries, setIncludeHistoricalEntries] = useState(true);

  // Migration Execution State
  const [isMigrating, setIsMigrating] = useState(false);
  const [migrationResult, setMigrationResult] = useState(null);

  // Active sub-tab in Step 2 Reconciler
  const [reconcileTab, setReconcileTab] = useState('projects'); // 'clients' | 'projects' | 'tasks' | 'employees'

  // Extract entities & run the artifact consolidation algorithm
  const processRawRecords = (records, fileName, sourcePlatform) => {
    // 1. Group raw entity strings
    const rawClientsMap = new Map(); // normalizedKey -> Set of raw strings
    const rawProjectsMap = new Map(); // normalizedKey -> { rawNames: Set, clientName: str }
    const rawTasksMap = new Map(); // normalizedKey -> Set of raw strings
    const rawEmployeesMap = new Map(); // normalizedKey -> { names: Set, emails: Set }
    const parsedEntries = [];

    records.forEach(r => {
      // Find client
      const rawClient = (r['Client'] || r['Client Name'] || r['client'] || '').trim();
      if (rawClient) {
        const normC = normalizeEntity(rawClient);
        if (!rawClientsMap.has(normC)) rawClientsMap.set(normC, new Set());
        rawClientsMap.get(normC).add(rawClient);
      }

      // Find project
      const rawProject = (r['Project'] || r['Project Name'] || r['project'] || '').trim();
      if (rawProject) {
        const normP = normalizeEntity(rawProject);
        if (!rawProjectsMap.has(normP)) {
          rawProjectsMap.set(normP, { rawNames: new Set(), clientName: rawClient });
        }
        rawProjectsMap.get(normP).rawNames.add(rawProject);
        if (rawClient && !rawProjectsMap.get(normP).clientName) {
          rawProjectsMap.get(normP).clientName = rawClient;
        }
      }

      // Find task
      const rawTask = (r['Task'] || r['Task Name'] || r['task'] || '').trim();
      if (rawTask) {
        const normT = normalizeEntity(rawTask);
        if (!rawTasksMap.has(normT)) rawTasksMap.set(normT, new Set());
        rawTasksMap.get(normT).add(rawTask);
      }

      // Find employee
      const firstName = (r['First Name'] || r['first_name'] || '').trim();
      const lastName = (r['Last Name'] || r['last_name'] || '').trim();
      const fullName = (r['User'] || r['user'] || `${firstName} ${lastName}`).trim();
      const email = (r['Email'] || r['email'] || '').trim();

      if (fullName || email) {
        const normE = normalizeEntity(fullName || email);
        if (!rawEmployeesMap.has(normE)) {
          rawEmployeesMap.set(normE, { names: new Set(), emails: new Set() });
        }
        if (fullName) rawEmployeesMap.get(normE).names.add(fullName);
        if (email) rawEmployeesMap.get(normE).emails.add(email);
      }

      // Parse hours/duration
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

      if (rawProject && rawTask && hours > 0 && dateStr) {
        parsedEntries.push({
          clientName: rawClient,
          projectName: rawProject,
          taskName: rawTask,
          date: dateStr,
          hours: Math.round(hours * 100) / 100,
          note: noteStr,
          userName: fullName,
          userEmail: email
        });
      }
    });

    // 2. Build consolidated client list with artifact detection
    const consClients = [];
    rawClientsMap.forEach((rawSet, normKey) => {
      const originalList = Array.from(rawSet);
      consClients.push({
        id: normKey,
        canonical: pickBestCanonicalName(originalList),
        originalList,
        isArtifact: originalList.length > 1
      });
    });

    // 3. Build consolidated project list & match against existing workspace projects
    const consProjects = [];
    rawProjectsMap.forEach((entry, normKey) => {
      const originalList = Array.from(entry.rawNames);
      const canonical = pickBestCanonicalName(originalList);

      // Check if project already exists in the current workspace
      const matchedWorkspaceProject = projects.find(
        wp => normalizeEntity(wp.name) === normKey || wp.name.trim().toLowerCase() === canonical.toLowerCase()
      );

      consProjects.push({
        id: normKey,
        canonical,
        clientName: entry.clientName || 'General',
        originalList,
        isArtifact: originalList.length > 1,
        matchesExisting: !!matchedWorkspaceProject,
        existingProjectId: matchedWorkspaceProject?.id || null,
        existingTaskCount: matchedWorkspaceProject?.tasks?.length || 0
      });
    });

    // 4. Build consolidated task list
    const consTasks = [];
    rawTasksMap.forEach((rawSet, normKey) => {
      const originalList = Array.from(rawSet);
      consTasks.push({
        id: normKey,
        canonical: pickBestCanonicalName(originalList),
        originalList,
        isArtifact: originalList.length > 1,
        isBillable: true
      });
    });

    // 5. Build consolidated employee list
    const consEmployees = [];
    rawEmployeesMap.forEach((data, normKey) => {
      const nameList = Array.from(data.names);
      const emailList = Array.from(data.emails);
      consEmployees.push({
        id: normKey,
        name: nameList[0] || 'Team Member',
        email: emailList[0] || '',
        nameVariations: nameList
      });
    });

    setSourceFileName(fileName);
    setRawRecordsCount(records.length);
    setConsolidatedClients(consClients);
    setConsolidatedProjects(consProjects);
    setConsolidatedTasks(consTasks);
    setConsolidatedEmployees(consEmployees);
    setRawEntriesToImport(parsedEntries);
    setStep(2);
  };

  // Handle local CSV File Upload
  const handleFileUpload = (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    setIsParsing(true);
    const file = files[0];
    const reader = new FileReader();

    reader.onload = (event) => {
      try {
        const text = event.target.result;
        const { records } = parseCSV(text);
        if (!records || records.length === 0) {
          throw new Error('CSV file appears to be empty or unreadable.');
        }
        processRawRecords(records, file.name, platform);
        addToast(`Parsed ${file.name} successfully (${records.length} records)`, 'success');
      } catch (err) {
        addToast(err.message || 'Failed to parse CSV file', 'error');
      } finally {
        setIsParsing(false);
      }
    };

    reader.readAsText(file);
  };

  // Load Built-in Demo Datasets
  const handleLoadDemoCSV = async (platformType) => {
    setIsParsing(true);
    try {
      const res = await fetch(`/demo_imports/${platformType}_demo_export.csv`);
      if (!res.ok) throw new Error(`Could not load ${platformType} demo CSV`);
      const text = await res.text();
      const { records } = parseCSV(text);
      setPlatform(platformType);
      processRawRecords(records, `${platformType}_sample_export.csv`, platformType);
      addToast(`Loaded ${platformType.toUpperCase()} sample dataset with artifacts into consolidator`, 'success');
    } catch (err) {
      addToast(`Failed to load demo CSV: ${err.message}`, 'error');
    } finally {
      setIsParsing(false);
    }
  };

  // Step 3: Execute Batch Import
  const handleExecuteImport = async () => {
    setIsMigrating(true);
    try {
      // 1. Build client payload
      const clientPayload = consolidatedClients.map(c => ({
        name: c.canonical,
        email: null,
        address: null
      }));

      // 2. Build project payload with tasks
      const projectPayload = consolidatedProjects.map(p => ({
        name: p.canonical,
        clientName: p.clientName,
        tasks: consolidatedTasks.map(t => ({
          name: t.canonical,
          isBillable: t.isBillable
        }))
      }));

      // 3. Optional entries payload
      const entriesPayload = includeHistoricalEntries
        ? rawEntriesToImport.map(e => ({
            clientName: e.clientName,
            projectName: e.projectName,
            taskName: e.taskName,
            date: e.date,
            hours: e.hours,
            note: e.note,
            userName: e.userName,
            userEmail: e.userEmail
          }))
        : [];

      const payload = {
        clients: clientPayload,
        projects: projectPayload,
        entries: entriesPayload
      };

      const result = await apiCall('/api/workspace/import-batch', 'POST', payload);
      if (result?.error) throw new Error(result.error);

      setMigrationResult(result);
      setStep(3);
      if (forceSync) await forceSync();
      addToast('Migration completed successfully!', 'success');
    } catch (err) {
      addToast(err.message || 'Failed to execute migration', 'error');
    } finally {
      setIsMigrating(false);
    }
  };

  // Total count of artifacts resolved
  const totalArtifactCount = useMemo(() => {
    const clientArts = consolidatedClients.filter(c => c.isArtifact).length;
    const projectArts = consolidatedProjects.filter(p => p.isArtifact).length;
    const taskArts = consolidatedTasks.filter(t => t.isArtifact).length;
    return clientArts + projectArts + taskArts;
  }, [consolidatedClients, consolidatedProjects, consolidatedTasks]);

  const existingProjectMatchesCount = useMemo(() => {
    return consolidatedProjects.filter(p => p.matchesExisting).length;
  }, [consolidatedProjects]);

  return (
    <div className="flex-1 overflow-y-auto bg-slate-50 dark:bg-zinc-950 p-6 sm:p-10 font-sans">
      <div className="max-w-5xl mx-auto space-y-8">

        {/* Top Header */}
        <div className="bg-slate-900 dark:bg-zinc-900 border border-slate-800 text-white p-6 rounded-none shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <div className="inline-flex items-center gap-2 px-2.5 py-0.5 bg-emerald-950 border border-emerald-800 text-emerald-400 font-mono text-[10px] uppercase font-bold tracking-wider mb-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                Migration & Ingestion Engine
              </div>
              <h1 className="text-xl sm:text-2xl font-black tracking-tight">
                Switch to VeloTime: Zero-Friction Studio Importer
              </h1>
              <p className="text-xs text-slate-400 mt-1 max-w-2xl leading-relaxed">
                Migrate clients, projects, tasks, and historical hours from Harvest, Toggl, or Clockify in under 30 seconds.
                Our consolidation engine automatically catches typos, trailing spaces, and spelling artifacts.
              </p>
            </div>

            <div className="flex items-center gap-2">
              {onBack && (
                <button
                  type="button"
                  onClick={onBack}
                  className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold transition-colors cursor-pointer"
                >
                  &larr; Back to Workspace
                </button>
              )}
            </div>
          </div>

          {/* Stepper Bar */}
          <div className="mt-6 pt-4 border-t border-slate-800 flex items-center gap-4 text-xs font-semibold">
            <button
              onClick={() => setStep(1)}
              className={`flex items-center gap-2 cursor-pointer ${step >= 1 ? 'text-white' : 'text-slate-500'}`}
            >
              <span className={`w-5 h-5 flex items-center justify-center text-[10px] font-mono font-bold ${step === 1 ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-400'}`}>1</span>
              <span>1. Choose Legacy Source</span>
            </button>
            <div className="w-8 h-px bg-slate-800" />
            <button
              onClick={() => rawRecordsCount > 0 && setStep(2)}
              disabled={rawRecordsCount === 0}
              className={`flex items-center gap-2 cursor-pointer ${step >= 2 ? 'text-white' : 'text-slate-500 disabled:opacity-40'}`}
            >
              <span className={`w-5 h-5 flex items-center justify-center text-[10px] font-mono font-bold ${step === 2 ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-400'}`}>2</span>
              <span>2. Deduplicate & Reconcile</span>
            </button>
            <div className="w-8 h-px bg-slate-800" />
            <button
              onClick={() => step === 3 && setStep(3)}
              disabled={step < 3}
              className={`flex items-center gap-2 cursor-pointer ${step === 3 ? 'text-white' : 'text-slate-500 disabled:opacity-40'}`}
            >
              <span className={`w-5 h-5 flex items-center justify-center text-[10px] font-mono font-bold ${step === 3 ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-400'}`}>3</span>
              <span>3. Confirm & Launch</span>
            </button>
          </div>
        </div>

        {/* STEP 1: Select Source Platform & File */}
        {step === 1 && (
          <div className="bg-white dark:bg-zinc-900 border border-slate-300 dark:border-zinc-800 p-6 sm:p-8 space-y-6 shadow-sm">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                1. Select Your Current Timesheet Tool
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Choose the system your agency is migrating from to load tailored CSV parsing patterns.
              </p>
            </div>

            {/* Platform Selector Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { id: 'harvest', label: 'Harvest', desc: 'Detailed Time CSV / Code' },
                { id: 'toggl', label: 'Toggl Track', desc: 'Detailed Summary CSV' },
                { id: 'clockify', label: 'Clockify', desc: 'Detailed Time Report' },
                { id: 'csv', label: 'Custom CSV', desc: 'Any Standard Spreadsheet' },
              ].map((p) => (
                <button
                  key={p.id}
                  onClick={() => setPlatform(p.id)}
                  className={`p-4 border text-left transition-all cursor-pointer ${
                    platform === p.id
                      ? 'border-slate-900 dark:border-white bg-slate-50 dark:bg-zinc-800 shadow-sm'
                      : 'border-slate-200 dark:border-zinc-800 hover:border-slate-400 dark:hover:border-zinc-700 bg-white dark:bg-zinc-900'
                  }`}
                >
                  <div className="font-bold text-sm text-slate-900 dark:text-slate-100">
                    {p.label}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-1">
                    {p.desc}
                  </div>
                </button>
              ))}
            </div>

            {/* Demo Testing Bar */}
            <div className="bg-slate-50 dark:bg-zinc-800/50 border border-slate-200 dark:border-zinc-700/60 p-4 space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    Test With Real Agency Demo Datasets (Includes Artifacts):
                  </span>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Click to instantly load a sample export with intentional typos, trailing spaces, and duplicate variations to see the consolidator in action.
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => handleLoadDemoCSV('harvest')}
                  disabled={isParsing}
                  className="px-3 py-1.5 bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs transition-colors cursor-pointer"
                >
                  Load Harvest Demo CSV
                </button>
                <button
                  type="button"
                  onClick={() => handleLoadDemoCSV('toggl')}
                  disabled={isParsing}
                  className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs transition-colors cursor-pointer"
                >
                  Load Toggl Demo CSV
                </button>
                <button
                  type="button"
                  onClick={() => handleLoadDemoCSV('clockify')}
                  disabled={isParsing}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition-colors cursor-pointer"
                >
                  Load Clockify Demo CSV
                </button>

                <div className="ml-auto text-xs text-slate-500 flex items-center gap-2">
                  <span>Download file:</span>
                  <a
                    href={`/demo_imports/${platform === 'csv' ? 'harvest' : platform}_demo_export.csv`}
                    download
                    className="font-bold underline hover:text-slate-900 dark:hover:text-white"
                  >
                    Sample {platform.toUpperCase()} CSV
                  </a>
                </div>
              </div>
            </div>

            {/* Drag & Drop Upload Area */}
            <div className="pt-2">
              <div className="border-2 border-dashed border-slate-300 dark:border-zinc-700 p-8 text-center bg-slate-50/50 dark:bg-zinc-900/50 hover:bg-slate-50 dark:hover:bg-zinc-900 transition-colors">
                <input
                  type="file"
                  accept=".csv"
                  id="csvUploadInput"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <label htmlFor="csvUploadInput" className="cursor-pointer flex flex-col items-center">
                  <svg className="w-10 h-10 text-slate-400 dark:text-slate-600 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                  <span className="font-bold text-sm text-slate-800 dark:text-slate-200">
                    {isParsing ? 'Analyzing and parsing records...' : 'Drop your exported CSV here or click to browse'}
                  </span>
                  <span className="text-xs text-slate-500 mt-1">
                    Accepts standard .csv exports from {platform.toUpperCase()} with clients, projects, tasks, and hours
                  </span>
                </label>
              </div>
            </div>
          </div>
        )}

        {/* STEP 2: Deduplicate, Reconcile & Consolidate */}
        {step === 2 && (
          <div className="bg-white dark:bg-zinc-900 border border-slate-300 dark:border-zinc-800 p-6 sm:p-8 space-y-6 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-zinc-800 pb-5">
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                  2. Reconcile & Consolidate Data
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Source: <span className="font-mono font-semibold text-slate-700 dark:text-slate-300">{sourceFileName}</span> ({rawRecordsCount} time records parsed)
                </p>
              </div>

              <button
                onClick={() => setStep(1)}
                className="text-xs text-slate-500 hover:text-slate-900 dark:hover:text-white underline cursor-pointer"
              >
                &larr; Choose different file
              </button>
            </div>

            {/* Artifacts & Safe Addition Notice Banner */}
            <div className="space-y-3">
              {totalArtifactCount > 0 ? (
                <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800/80 p-4 text-xs text-amber-900 dark:text-amber-200 flex items-start gap-3">
                  <div className="w-5 h-5 bg-amber-200 dark:bg-amber-800 text-amber-900 dark:text-amber-100 flex items-center justify-center font-bold shrink-0 text-xs">
                    !
                  </div>
                  <div className="space-y-1">
                    <div className="font-bold text-amber-950 dark:text-amber-100">
                      {totalArtifactCount} Spelling & Formatting Artifacts Automatically Grouped
                    </div>
                    <div>
                      We identified minor capitalization, trailing space, or punctuation differences (e.g. &ldquo;Acme Studios &rdquo; vs &ldquo;Acme Studios&rdquo;).
                      They have been merged into canonical names below to prevent duplicate clutter.
                    </div>
                  </div>
                </div>
              ) : null}

              {existingProjectMatchesCount > 0 && (
                <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800/80 p-4 text-xs text-emerald-900 dark:text-emerald-200 flex items-start gap-3">
                  <div className="w-5 h-5 bg-emerald-200 dark:bg-emerald-800 text-emerald-900 dark:text-emerald-100 flex items-center justify-center font-bold shrink-0 text-xs">
                    ✓
                  </div>
                  <div className="space-y-1">
                    <div className="font-bold text-emerald-950 dark:text-emerald-100">
                      Safe Merge Guarantee: {existingProjectMatchesCount} Projects Match Your Current Workspace
                    </div>
                    <div>
                      Incoming projects that match existing workspace projects will <strong>never overwrite</strong> your existing hours or rates.
                      Any missing tasks from the import will simply be added into your existing project cleanly.
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Metric Overview Pills */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <button
                onClick={() => setReconcileTab('projects')}
                className={`p-3 border text-left transition-all cursor-pointer ${reconcileTab === 'projects' ? 'border-slate-900 bg-slate-50 dark:bg-zinc-800' : 'border-slate-200 dark:border-zinc-800'}`}
              >
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Projects Detected</div>
                <div className="text-xl font-black text-slate-900 dark:text-slate-100 mt-1">
                  {consolidatedProjects.length}
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5">
                  {existingProjectMatchesCount > 0 ? `${existingProjectMatchesCount} match existing` : 'All new'}
                </div>
              </button>

              <button
                onClick={() => setReconcileTab('clients')}
                className={`p-3 border text-left transition-all cursor-pointer ${reconcileTab === 'clients' ? 'border-slate-900 bg-slate-50 dark:bg-zinc-800' : 'border-slate-200 dark:border-zinc-800'}`}
              >
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Clients Identified</div>
                <div className="text-xl font-black text-slate-900 dark:text-slate-100 mt-1">
                  {consolidatedClients.length}
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5">
                  {consolidatedClients.filter(c => c.isArtifact).length > 0 ? 'Artifacts merged' : 'Clean names'}
                </div>
              </button>

              <button
                onClick={() => setReconcileTab('tasks')}
                className={`p-3 border text-left transition-all cursor-pointer ${reconcileTab === 'tasks' ? 'border-slate-900 bg-slate-50 dark:bg-zinc-800' : 'border-slate-200 dark:border-zinc-800'}`}
              >
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Tasks Grouped</div>
                <div className="text-xl font-black text-slate-900 dark:text-slate-100 mt-1">
                  {consolidatedTasks.length}
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5">
                  Billable presets
                </div>
              </button>

              <button
                onClick={() => setReconcileTab('employees')}
                className={`p-3 border text-left transition-all cursor-pointer ${reconcileTab === 'employees' ? 'border-slate-900 bg-slate-50 dark:bg-zinc-800' : 'border-slate-200 dark:border-zinc-800'}`}
              >
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Team / Staff</div>
                <div className="text-xl font-black text-slate-900 dark:text-slate-100 mt-1">
                  {consolidatedEmployees.length}
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5">
                  {rawEntriesToImport.length} time entries
                </div>
              </button>
            </div>

            {/* Reconciler Table by Tab */}
            <div className="space-y-3">
              {/* TAB: PROJECTS */}
              {reconcileTab === 'projects' && (
                <div className="border border-slate-200 dark:border-zinc-800 overflow-x-auto">
                  <div className="p-3 bg-slate-100 dark:bg-zinc-800 border-b border-slate-200 dark:border-zinc-700 flex justify-between items-center text-xs">
                    <span className="font-bold text-slate-800 dark:text-slate-200">
                      Projects to Ingest into VeloTime (Click to edit canonical name)
                    </span>
                    <span className="text-slate-500 text-[11px]">
                      Conflict Mode: Safe Append & Merge
                    </span>
                  </div>
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 dark:bg-zinc-900 border-b border-slate-200 dark:border-zinc-700 text-slate-600 dark:text-slate-400 font-semibold">
                      <tr>
                        <th className="p-3">Canonical Project Name</th>
                        <th className="p-3">Client</th>
                        <th className="p-3">Raw Variations Consolidated</th>
                        <th className="p-3">Workspace Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-zinc-800">
                      {consolidatedProjects.map((p, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-zinc-800/30">
                          <td className="p-3 font-semibold text-slate-900 dark:text-slate-100">
                            <input
                              type="text"
                              value={p.canonical}
                              onChange={(e) => {
                                const val = e.target.value;
                                setConsolidatedProjects(prev => prev.map((item, i) => i === idx ? { ...item, canonical: val } : item));
                              }}
                              className="px-2 py-1 bg-white dark:bg-zinc-900 border border-slate-300 dark:border-zinc-700 font-semibold text-xs text-slate-900 dark:text-white w-full max-w-sm outline-none focus:border-slate-900"
                            />
                          </td>
                          <td className="p-3 text-slate-600 dark:text-slate-400">
                            {p.clientName || 'General'}
                          </td>
                          <td className="p-3">
                            {p.originalList.length > 1 ? (
                              <div className="flex flex-wrap gap-1">
                                {p.originalList.map((raw, rIdx) => (
                                  <span key={rIdx} className="px-1.5 py-0.5 bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 font-mono text-[10px] border border-amber-200 dark:border-amber-900">
                                    &ldquo;{raw}&rdquo;
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <span className="text-slate-400 font-mono text-[11px]">1 exact match</span>
                            )}
                          </td>
                          <td className="p-3">
                            {p.matchesExisting ? (
                              <span className="px-2 py-0.5 bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 text-[10px] font-bold uppercase tracking-wider border border-emerald-300">
                                Matches Existing (Will Merge Tasks)
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-slate-300 text-[10px] font-bold uppercase tracking-wider border border-slate-300">
                                New Project (Will Create)
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* TAB: CLIENTS */}
              {reconcileTab === 'clients' && (
                <div className="border border-slate-200 dark:border-zinc-800 overflow-x-auto">
                  <div className="p-3 bg-slate-100 dark:bg-zinc-800 border-b border-slate-200 dark:border-zinc-700 text-xs font-bold text-slate-800 dark:text-slate-200">
                    Clients Identified & Consolidated
                  </div>
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 dark:bg-zinc-900 border-b border-slate-200 dark:border-zinc-700 text-slate-600 dark:text-slate-400 font-semibold">
                      <tr>
                        <th className="p-3">Canonical Client Name</th>
                        <th className="p-3">Raw Variations in Source File</th>
                        <th className="p-3">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-zinc-800">
                      {consolidatedClients.map((c, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-zinc-800/30">
                          <td className="p-3">
                            <input
                              type="text"
                              value={c.canonical}
                              onChange={(e) => {
                                const val = e.target.value;
                                setConsolidatedClients(prev => prev.map((item, i) => i === idx ? { ...item, canonical: val } : item));
                              }}
                              className="px-2 py-1 bg-white dark:bg-zinc-900 border border-slate-300 dark:border-zinc-700 font-semibold text-xs text-slate-900 dark:text-white w-full max-w-sm outline-none focus:border-slate-900"
                            />
                          </td>
                          <td className="p-3">
                            <div className="flex flex-wrap gap-1">
                              {c.originalList.map((raw, rIdx) => (
                                <span key={rIdx} className="px-1.5 py-0.5 bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-slate-300 font-mono text-[10px] border border-slate-300 dark:border-zinc-700">
                                  &ldquo;{raw}&rdquo;
                                </span>
                              ))}
                            </div>
                          </td>
                          <td className="p-3">
                            {c.isArtifact ? (
                              <span className="px-2 py-0.5 bg-amber-100 text-amber-800 text-[10px] font-bold uppercase tracking-wider border border-amber-300">
                                {c.originalList.length} Variations Consolidated
                              </span>
                            ) : (
                              <span className="text-slate-400 text-xs">Standard</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* TAB: TASKS */}
              {reconcileTab === 'tasks' && (
                <div className="border border-slate-200 dark:border-zinc-800 overflow-x-auto">
                  <div className="p-3 bg-slate-100 dark:bg-zinc-800 border-b border-slate-200 dark:border-zinc-700 text-xs font-bold text-slate-800 dark:text-slate-200">
                    Task Types (Will be attached to newly created projects)
                  </div>
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 dark:bg-zinc-900 border-b border-slate-200 dark:border-zinc-700 text-slate-600 dark:text-slate-400 font-semibold">
                      <tr>
                        <th className="p-3">Canonical Task Name</th>
                        <th className="p-3">Raw Variations</th>
                        <th className="p-3">Default Billing</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-zinc-800">
                      {consolidatedTasks.map((t, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-zinc-800/30">
                          <td className="p-3 font-semibold text-slate-900 dark:text-slate-100">
                            <input
                              type="text"
                              value={t.canonical}
                              onChange={(e) => {
                                const val = e.target.value;
                                setConsolidatedTasks(prev => prev.map((item, i) => i === idx ? { ...item, canonical: val } : item));
                              }}
                              className="px-2 py-1 bg-white dark:bg-zinc-900 border border-slate-300 dark:border-zinc-700 font-semibold text-xs text-slate-900 dark:text-white w-full max-w-sm outline-none focus:border-slate-900"
                            />
                          </td>
                          <td className="p-3">
                            <div className="flex flex-wrap gap-1">
                              {t.originalList.map((raw, rIdx) => (
                                <span key={rIdx} className="px-1.5 py-0.5 bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-slate-300 font-mono text-[10px] border border-slate-300 dark:border-zinc-700">
                                  &ldquo;{raw}&rdquo;
                                </span>
                              ))}
                            </div>
                          </td>
                          <td className="p-3">
                            <label className="flex items-center gap-1.5 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={t.isBillable}
                                onChange={(e) => {
                                  const checked = e.target.checked;
                                  setConsolidatedTasks(prev => prev.map((item, i) => i === idx ? { ...item, isBillable: checked } : item));
                                }}
                                className="rounded-none cursor-pointer"
                              />
                              <span className="text-slate-700 dark:text-slate-300 font-bold text-xs">Billable</span>
                            </label>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* TAB: EMPLOYEES */}
              {reconcileTab === 'employees' && (
                <div className="border border-slate-200 dark:border-zinc-800 overflow-x-auto">
                  <div className="p-3 bg-slate-100 dark:bg-zinc-800 border-b border-slate-200 dark:border-zinc-700 text-xs font-bold text-slate-800 dark:text-slate-200">
                    Team Members Identified ({consolidatedEmployees.length})
                  </div>
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 dark:bg-zinc-900 border-b border-slate-200 dark:border-zinc-700 text-slate-600 dark:text-slate-400 font-semibold">
                      <tr>
                        <th className="p-3">Member Name</th>
                        <th className="p-3">Email Address</th>
                        <th className="p-3">Detected Name Variations</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-zinc-800">
                      {consolidatedEmployees.map((emp, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-zinc-800/30">
                          <td className="p-3 font-semibold text-slate-900 dark:text-slate-100">{emp.name}</td>
                          <td className="p-3 font-mono text-[11px] text-slate-600 dark:text-slate-400">{emp.email || 'N/A'}</td>
                          <td className="p-3">
                            <div className="flex flex-wrap gap-1">
                              {emp.nameVariations.map((v, vIdx) => (
                                <span key={vIdx} className="px-1.5 py-0.5 bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-slate-400 font-mono text-[10px]">
                                  {v}
                                </span>
                              ))}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Historical Entries Option */}
            {rawEntriesToImport.length > 0 && (
              <div className="bg-slate-50 dark:bg-zinc-800/40 border border-slate-200 dark:border-zinc-700/60 p-4 flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-slate-900 dark:text-slate-100">
                    Historical Time Entries ({rawEntriesToImport.length} records detected)
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    Import historical logged hours into your VeloTime matrix dates.
                  </div>
                </div>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includeHistoricalEntries}
                    onChange={(e) => setIncludeHistoricalEntries(e.target.checked)}
                    className="rounded-none cursor-pointer"
                  />
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Import Historical Hours
                  </span>
                </label>
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-200 dark:border-zinc-800">
              <button
                onClick={() => setStep(1)}
                className="px-4 py-2 border border-slate-300 dark:border-zinc-700 text-slate-700 dark:text-slate-300 text-xs font-semibold hover:bg-slate-100 transition-colors cursor-pointer"
              >
                &larr; Back
              </button>
              <button
                onClick={handleExecuteImport}
                disabled={isMigrating}
                className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-colors cursor-pointer shadow-sm disabled:opacity-50 flex items-center gap-2"
              >
                {isMigrating ? 'Ingesting into Database...' : 'Execute Migration & Ingest into Workspace →'}
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: Completed Screen */}
        {step === 3 && migrationResult && (
          <div className="bg-white dark:bg-zinc-900 border border-slate-300 dark:border-zinc-800 p-8 space-y-6 shadow-sm text-center">
            <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 mx-auto flex items-center justify-center font-black text-xl border border-emerald-300">
              ✓
            </div>

            <div>
              <h2 className="text-xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
                Migration Successfully Completed!
              </h2>
              <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                Your legacy studio data has been reconciled, deduplicated, and ingested cleanly into your VeloTime workspace.
              </p>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-xl mx-auto">
              <div className="bg-slate-50 dark:bg-zinc-800 p-3 border border-slate-200 dark:border-zinc-700">
                <div className="text-[10px] font-bold uppercase text-slate-500">Clients Created</div>
                <div className="text-xl font-black text-slate-900 dark:text-slate-100 mt-1">
                  {migrationResult.createdClients || 0}
                </div>
              </div>
              <div className="bg-slate-50 dark:bg-zinc-800 p-3 border border-slate-200 dark:border-zinc-700">
                <div className="text-[10px] font-bold uppercase text-slate-500">New Projects</div>
                <div className="text-xl font-black text-slate-900 dark:text-slate-100 mt-1">
                  {migrationResult.createdProjects || 0}
                </div>
              </div>
              <div className="bg-slate-50 dark:bg-zinc-800 p-3 border border-slate-200 dark:border-zinc-700">
                <div className="text-[10px] font-bold uppercase text-slate-500">Projects Merged</div>
                <div className="text-xl font-black text-slate-900 dark:text-slate-100 mt-1">
                  {migrationResult.updatedProjects || 0}
                </div>
              </div>
              <div className="bg-slate-50 dark:bg-zinc-800 p-3 border border-slate-200 dark:border-zinc-700">
                <div className="text-[10px] font-bold uppercase text-slate-500">Tasks Ingested</div>
                <div className="text-xl font-black text-slate-900 dark:text-slate-100 mt-1">
                  {migrationResult.createdTasks || 0}
                </div>
              </div>
            </div>

            <div className="pt-4 flex items-center justify-center gap-3">
              {onBack && (
                <button
                  type="button"
                  onClick={onBack}
                  className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-colors cursor-pointer"
                >
                  Open Timesheets Matrix &rarr;
                </button>
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
