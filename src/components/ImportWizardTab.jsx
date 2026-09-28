import React, { useState } from 'react';
import { useToast } from '../contexts/ToastContext';

export default function ImportWizardTab({ dbUser, clients, projects, apiCall, forceSync }) {
  const { addToast } = useToast();

  const [platform, setPlatform] = useState('harvest'); // 'harvest', 'toggl', 'clockify', 'csv'
  const [method, setMethod] = useState('csv'); // 'csv', 'api'
  const [step, setStep] = useState(1); // 1: Source, 2: Preview & Map, 3: Confirmation

  // API credentials state
  const [harvestToken, setHarvestToken] = useState('');
  const [harvestAccountId, setHarvestAccountId] = useState('');
  const [togglApiKey, setTogglApiKey] = useState('');
  const [isTestingApi, setIsTestingApi] = useState(false);
  const [apiConnectionSuccess, setApiConnectionSuccess] = useState(false);

  // CSV upload state
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [isParsing, setIsParsing] = useState(false);
  const [parsedData, setParsedData] = useState(null);

  // Step 1: Handle CSV File Selection
  const handleFileUpload = (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    setIsParsing(true);
    setUploadedFiles(files);

    // Simple client-side CSV reader for preview
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target.result;
      const lines = text.split('\n').filter(Boolean);
      const headers = lines[0]?.split(',').map(h => h.trim().replace(/^"|"$/g, '')) || [];
      
      const rows = lines.slice(1, 20).map(line => {
        const values = line.split(',').map(v => v.trim().replace(/^"|"$/g, ''));
        const obj = {};
        headers.forEach((h, i) => { obj[h] = values[i]; });
        return obj;
      });

      // Detect entities based on typical Harvest / Toggl headers
      const detectedClients = new Set();
      const detectedProjects = new Set();
      const detectedTasks = new Set();

      rows.forEach(r => {
        if (r['Client'] || r['Client Name'] || r['client']) {
          detectedClients.add(r['Client'] || r['Client Name'] || r['client']);
        }
        if (r['Project'] || r['Project Name'] || r['project']) {
          detectedProjects.add(r['Project'] || r['Project Name'] || r['project']);
        }
        if (r['Task'] || r['Task Name'] || r['task']) {
          detectedTasks.add(r['Task'] || r['Task Name'] || r['task']);
        }
      });

      setParsedData({
        fileName: files[0].name,
        totalRows: lines.length - 1,
        headers,
        sampleRows: rows.slice(0, 5),
        clientsFound: Array.from(detectedClients),
        projectsFound: Array.from(detectedProjects),
        tasksFound: Array.from(detectedTasks),
      });

      setIsParsing(false);
      setStep(2);
      addToast(`Parsed ${files[0].name} successfully`, 'success');
    };

    reader.readAsText(files[0]);
  };

  // Test API Connection
  const handleTestConnection = async () => {
    setIsTestingApi(true);
    setApiConnectionSuccess(false);

    try {
      if (platform === 'harvest') {
        if (!harvestToken || !harvestAccountId) {
          throw new Error('Please enter both Personal Access Token and Account ID');
        }
        // Test via backend proxy
        const res = await apiCall('/api/integrations/harvest/test', {
          method: 'POST',
          body: JSON.stringify({ token: harvestToken, accountId: harvestAccountId })
        });
        if (res?.error) throw new Error(res.error);
        setApiConnectionSuccess(true);
        addToast(`Connected to Harvest (${res.companyName || 'Success'})`, 'success');
      } else if (platform === 'toggl') {
        if (!togglApiKey) throw new Error('Please enter your Toggl API Key');
        const res = await apiCall('/api/integrations/toggl/test', {
          method: 'POST',
          body: JSON.stringify({ apiKey: togglApiKey })
        });
        if (res?.error) throw new Error(res.error);
        setApiConnectionSuccess(true);
        addToast(`Connected to Toggl (${res.fullname || res.email || 'Success'})`, 'success');
      }
    } catch (err) {
      addToast(err.message || 'Connection failed', 'error');
    } finally {
      setIsTestingApi(false);
    }
  };

  // Load sample demo data for instant developer testing
  const handleLoadSampleData = () => {
    setParsedData({
      fileName: 'harvest_sample_export_2026.csv',
      totalRows: 48,
      headers: ['Date', 'Client', 'Project', 'Task', 'Notes', 'Hours', 'Billable?'],
      sampleRows: [
        { Date: '2026-09-21', Client: 'Stripe Inc', Project: 'Billing API Migration', Task: 'Backend Integration', Notes: 'Webhook handlers', Hours: '4.5', 'Billable?': 'Yes' },
        { Date: '2026-09-22', Client: 'Stripe Inc', Project: 'Billing API Migration', Task: 'API QA', Notes: 'Idempotency checks', Hours: '3.0', 'Billable?': 'Yes' },
        { Date: '2026-09-23', Client: 'Acme Corp', Project: 'Design System V2', Task: 'Figma Tokens', Notes: 'Color and typography hierarchy', Hours: '5.0', 'Billable?': 'Yes' },
        { Date: '2026-09-24', Client: 'Acme Corp', Project: 'Design System V2', Task: 'Component Audit', Notes: 'Button and modal variants', Hours: '4.0', 'Billable?': 'Yes' },
        { Date: '2026-09-25', Client: 'Linear Orbit', Project: 'Mobile App Wireframes', Task: 'UX Architecture', Notes: 'Offline mode user journey', Hours: '6.5', 'Billable?': 'Yes' },
      ],
      clientsFound: ['Stripe Inc', 'Acme Corp', 'Linear Orbit'],
      projectsFound: ['Billing API Migration', 'Design System V2', 'Mobile App Wireframes'],
      tasksFound: ['Backend Integration', 'API QA', 'Figma Tokens', 'Component Audit', 'UX Architecture'],
    });
    setStep(2);
    addToast('Sample Harvest dataset loaded into preview', 'info');
  };

  return (
    <div className="flex-1 overflow-y-auto bg-slate-50 dark:bg-zinc-950 p-6 sm:p-10 font-sans">
      <div className="max-w-4xl mx-auto space-y-8">
        
        {/* Developer Beta Header */}
        <div className="bg-slate-900 dark:bg-zinc-900 border border-slate-800 text-white p-6 rounded-xl shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded bg-emerald-950 border border-emerald-800 text-emerald-400 font-mono text-[10px] uppercase font-bold tracking-wider mb-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                Developer Environment
              </div>
              <h1 className="text-xl sm:text-2xl font-black tracking-tight">
                Migration & Import Wizard (Beta)
              </h1>
              <p className="text-xs text-slate-400 mt-1 max-w-xl">
                Clone clients, projects, tasks, and historical entries from legacy tools into VeloTime in under 60 seconds.
              </p>
            </div>
            
            <div className="flex items-center gap-2">
              <button
                onClick={handleLoadSampleData}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded text-xs font-semibold transition-colors"
                title="Populate wizard with sample Harvest test data"
              >
                Load Sample Data
              </button>
            </div>
          </div>

          {/* Stepper Bar */}
          <div className="mt-6 pt-4 border-t border-slate-800 flex items-center gap-4 text-xs font-semibold">
            <button
              onClick={() => setStep(1)}
              className={`flex items-center gap-2 ${step >= 1 ? 'text-white' : 'text-slate-500'}`}
            >
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-mono ${step === 1 ? 'bg-primary-600 text-white' : 'bg-slate-800 text-slate-400'}`}>1</span>
              <span>Select Source</span>
            </button>
            <div className="w-8 h-px bg-slate-800" />
            <button
              onClick={() => parsedData && setStep(2)}
              disabled={!parsedData}
              className={`flex items-center gap-2 ${step >= 2 ? 'text-white' : 'text-slate-500 disabled:opacity-50'}`}
            >
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-mono ${step === 2 ? 'bg-primary-600 text-white' : 'bg-slate-800 text-slate-400'}`}>2</span>
              <span>Reconcile & Preview</span>
            </button>
            <div className="w-8 h-px bg-slate-800" />
            <button
              onClick={() => setStep(3)}
              disabled={step < 2}
              className={`flex items-center gap-2 ${step === 3 ? 'text-white' : 'text-slate-500 disabled:opacity-50'}`}
            >
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-mono ${step === 3 ? 'bg-primary-600 text-white' : 'bg-slate-800 text-slate-400'}`}>3</span>
              <span>Execute Migration</span>
            </button>
          </div>
        </div>

        {/* Step 1: Select Source Platform & Method */}
        {step === 1 && (
          <div className="bg-white dark:bg-zinc-900 border border-slate-300 dark:border-zinc-800 rounded-xl p-6 sm:p-8 shadow-sm space-y-6">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                1. Select Legacy Platform
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Choose the system you are currently migrating your agency data from.
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { id: 'harvest', label: 'Harvest', desc: 'Projects & Timesheets' },
                { id: 'toggl', label: 'Toggl Track', desc: 'Workspaces & Entries' },
                { id: 'clockify', label: 'Clockify', desc: 'Workspaces & Rates' },
                { id: 'csv', label: 'Custom CSV', desc: 'Any Spreadsheet' },
              ].map((p) => (
                <button
                  key={p.id}
                  onClick={() => setPlatform(p.id)}
                  className={`p-4 rounded-lg border text-left transition-all cursor-pointer ${
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

            {/* Method Segmented Selector */}
            <div className="pt-4 border-t border-slate-200 dark:border-zinc-800">
              <div className="flex items-center gap-2 mb-4">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Import Method:
                </span>
                <div className="bg-slate-100 dark:bg-zinc-800 p-0.5 rounded flex text-xs font-semibold">
                  <button
                    onClick={() => setMethod('csv')}
                    className={`px-3 py-1 rounded transition-colors ${method === 'csv' ? 'bg-white dark:bg-zinc-900 text-slate-900 dark:text-slate-100 shadow-xs' : 'text-slate-600 dark:text-slate-400'}`}
                  >
                    CSV File Upload
                  </button>
                  <button
                    onClick={() => setMethod('api')}
                    className={`px-3 py-1 rounded transition-colors ${method === 'api' ? 'bg-white dark:bg-zinc-900 text-slate-900 dark:text-slate-100 shadow-xs' : 'text-slate-600 dark:text-slate-400'}`}
                  >
                    Direct API Sync
                  </button>
                </div>
              </div>

              {method === 'csv' ? (
                <div className="border-2 border-dashed border-slate-300 dark:border-zinc-700 rounded-xl p-8 text-center bg-slate-50/50 dark:bg-zinc-900/50 hover:bg-slate-50 dark:hover:bg-zinc-900 transition-colors">
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
                      {isParsing ? 'Parsing CSV structure...' : 'Click to upload your exported CSV'}
                    </span>
                    <span className="text-xs text-slate-500 mt-1">
                      Drag & drop your {platform.toUpperCase()} exported projects or timesheets file
                    </span>
                  </label>
                </div>
              ) : (
                <div className="space-y-4 max-w-lg">
                  {platform === 'harvest' ? (
                    <>
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                          Harvest Personal Access Token
                        </label>
                        <input
                          type="password"
                          value={harvestToken}
                          onChange={e => setHarvestToken(e.target.value)}
                          placeholder="e.g. 2948102.pt.k9..."
                          className="w-full px-3 py-2 bg-white dark:bg-zinc-900 border border-slate-300 dark:border-zinc-700 rounded text-xs outline-none focus:border-slate-900"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                          Harvest Account ID
                        </label>
                        <input
                          type="text"
                          value={harvestAccountId}
                          onChange={e => setHarvestAccountId(e.target.value)}
                          placeholder="e.g. 1928471"
                          className="w-full px-3 py-2 bg-white dark:bg-zinc-900 border border-slate-300 dark:border-zinc-700 rounded text-xs outline-none focus:border-slate-900"
                        />
                      </div>
                    </>
                  ) : (
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Toggl API Token
                      </label>
                      <input
                        type="password"
                        value={togglApiKey}
                        onChange={e => setTogglApiKey(e.target.value)}
                        placeholder="e.g. a8b9c0d1e2..."
                        className="w-full px-3 py-2 bg-white dark:bg-zinc-900 border border-slate-300 dark:border-zinc-700 rounded text-xs outline-none focus:border-slate-900"
                      />
                    </div>
                  )}

                  <div className="flex items-center gap-3 pt-2">
                    <button
                      onClick={handleTestConnection}
                      disabled={isTestingApi}
                      className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded text-xs font-bold transition-colors disabled:opacity-50"
                    >
                      {isTestingApi ? 'Connecting...' : 'Test Connection'}
                    </button>
                    {apiConnectionSuccess && (
                      <span className="text-xs font-bold text-emerald-600 flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                        Verified Active
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Step 2: Reconcile & Preview */}
        {step === 2 && parsedData && (
          <div className="bg-white dark:bg-zinc-900 border border-slate-300 dark:border-zinc-800 rounded-xl p-6 sm:p-8 shadow-sm space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                  2. Review & Reconcile Data
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Source: <span className="font-mono font-semibold">{parsedData.fileName}</span> ({parsedData.totalRows} records)
                </p>
              </div>

              <button
                onClick={() => setStep(1)}
                className="text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 underline"
              >
                Change Source
              </button>
            </div>

            {/* Entity Summary Pills */}
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-slate-50 dark:bg-zinc-800/60 p-4 rounded-lg border border-slate-200 dark:border-zinc-700">
                <div className="text-[11px] font-bold uppercase text-slate-500">Clients Identified</div>
                <div className="text-2xl font-black text-slate-900 dark:text-slate-100 mt-1">
                  {parsedData.clientsFound.length}
                </div>
                <div className="text-[11px] text-slate-500 truncate mt-1">
                  {parsedData.clientsFound.join(', ')}
                </div>
              </div>

              <div className="bg-slate-50 dark:bg-zinc-800/60 p-4 rounded-lg border border-slate-200 dark:border-zinc-700">
                <div className="text-[11px] font-bold uppercase text-slate-500">Projects Detected</div>
                <div className="text-2xl font-black text-slate-900 dark:text-slate-100 mt-1">
                  {parsedData.projectsFound.length}
                </div>
                <div className="text-[11px] text-slate-500 truncate mt-1">
                  {parsedData.projectsFound.join(', ')}
                </div>
              </div>

              <div className="bg-slate-50 dark:bg-zinc-800/60 p-4 rounded-lg border border-slate-200 dark:border-zinc-700">
                <div className="text-[11px] font-bold uppercase text-slate-500">Task Types</div>
                <div className="text-2xl font-black text-slate-900 dark:text-slate-100 mt-1">
                  {parsedData.tasksFound.length}
                </div>
                <div className="text-[11px] text-slate-500 truncate mt-1">
                  {parsedData.tasksFound.join(', ')}
                </div>
              </div>
            </div>

            {/* Sample Table Preview */}
            <div className="space-y-2">
              <div className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Sample Record Mapping (First 5 Entries):
              </div>
              <div className="overflow-x-auto border border-slate-200 dark:border-zinc-800 rounded-lg">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-slate-300 font-semibold border-b border-slate-200 dark:border-zinc-700">
                    <tr>
                      {parsedData.headers.slice(0, 6).map(h => (
                        <th key={h} className="p-2.5">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-zinc-800">
                    {parsedData.sampleRows.map((row, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-zinc-800/30">
                        {parsedData.headers.slice(0, 6).map(h => (
                          <td key={h} className="p-2.5 font-mono text-[11px] text-slate-700 dark:text-slate-300">
                            {row[h] || '-'}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-200 dark:border-zinc-800">
              <button
                onClick={() => setStep(1)}
                className="px-4 py-2 border border-slate-300 dark:border-zinc-700 text-slate-700 dark:text-slate-300 rounded text-xs font-semibold hover:bg-slate-100 transition-colors"
              >
                Back
              </button>
              <button
                onClick={() => setStep(3)}
                className="px-6 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded text-xs font-bold transition-colors"
              >
                Continue to Final Import &rarr;
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Execute Migration */}
        {step === 3 && (
          <div className="bg-white dark:bg-zinc-900 border border-slate-300 dark:border-zinc-800 rounded-xl p-6 sm:p-8 shadow-sm space-y-6">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                3. Ready to Ingest into Workspace
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                VeloTime will create the detected clients, projects, and task structures in your database.
              </p>
            </div>

            <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 p-4 rounded-lg text-xs text-amber-800 dark:text-amber-300 space-y-1">
              <div className="font-bold">Safe Migration Guarantee:</div>
              <div>Existing projects and timesheet records will not be overwritten. New items will be appended cleanly.</div>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-slate-200 dark:border-zinc-800">
              <button
                onClick={() => setStep(2)}
                className="px-4 py-2 border border-slate-300 dark:border-zinc-700 text-slate-700 dark:text-slate-300 rounded text-xs font-semibold hover:bg-slate-100 transition-colors"
              >
                Back
              </button>
              <button
                onClick={() => {
                  addToast('Developer Preview: Batch migration endpoint execution simulated', 'success');
                }}
                className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-xs font-bold transition-colors shadow-sm"
              >
                Execute Import & Launch Matrix
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
