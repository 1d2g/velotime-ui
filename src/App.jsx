import React, { useState, useEffect, useMemo } from 'react';
import { SignedIn, SignedOut, SignIn, UserButton, useUser, useAuth, useOrganization } from "@clerk/clerk-react";
import { usePostHog } from 'posthog-js/react';
import TimesheetMatrix from './components/TimesheetMatrix';
import ProjectsTab from './components/ProjectsTab';
import ReportsTab from './components/ReportsTab';
import InvoicesTab from './components/InvoicesTab';
import TeamTab from './components/TeamTab';
import OrganizationSettingsTab from './components/OrganizationSettingsTab';
import TrialLockoutOverlay from './components/TrialLockoutOverlay';
import OnboardingTour from './components/OnboardingTour';
import { useToast } from './contexts/ToastContext';

export default function App() {
  const { user, isLoaded: isUserLoaded } = useUser();
  const { getToken, isSignedIn } = useAuth();
  const { organization, membership, isLoaded: isOrgLoaded } = useOrganization();
  const posthog = usePostHog();

  useEffect(() => {
    if (user && posthog) {
      posthog.identify(user.id, {
        email: user.primaryEmailAddress?.emailAddress,
        name: user.fullName
      });
    }
  }, [user, posthog]);

  const [activeTab, setActiveTab] = useState(() => {
    return localStorage.getItem('velotime_activeTab') || 'Timesheets';
  });
  
  useEffect(() => {
    localStorage.setItem('velotime_activeTab', activeTab);
  }, [activeTab]);

  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('velotime_theme') || 'light';
  });

  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [lockout, setLockout] = useState(null);

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('velotime_theme', theme);
  }, [theme]);



  const [dbUser, setDbUser] = useState(null);
  const [projects, setProjects] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [entries, setEntries] = useState({});
  const [rawEntries, setRawEntries] = useState([]);
  const [notes, setNotes] = useState({});
  const [orgUsers, setOrgUsers] = useState([]);
  const [taskRates, setTaskRates] = useState([]);
  
  const { addToast } = useToast();
  const [isSyncing, setIsSyncing] = useState(true);

  const navTabs = [
    'Timesheets', 
    'Projects', 
    ...((dbUser?.role === 'admin' || dbUser?.role === 'manager') ? ['Team', 'Reports', 'Invoices'] : []), 
    'Settings'
  ];

  const [timeframe, setTimeframe] = useState('week'); // 'day', 'week', 'month'
  const [zoomLevel, setZoomLevel] = useState(100);
  const [currentDate, setCurrentDate] = useState(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return today;
  });
  const [activeSaves, setActiveSaves] = useState(0);
  const isSaving = activeSaves > 0;
  const [triggerSync, setTriggerSync] = useState(0);
  const [viewUserId, setViewUserId] = useState(null);

  const forceSync = () => {
    setTriggerSync(prev => prev + 1);
  };

  const handlePrev = () => {
    setCurrentDate(prev => {
      const nextDate = new Date(prev);
      if (timeframe === 'day') {
        nextDate.setDate(prev.getDate() - 1);
        while (nextDate.getDay() === 0 || nextDate.getDay() === 6) {
          nextDate.setDate(nextDate.getDate() - 1);
        }
      } else if (timeframe === 'week') {
        nextDate.setDate(prev.getDate() - 7);
      } else {
        nextDate.setMonth(prev.getMonth() - 1);
      }
      return nextDate;
    });
  };

  const handleNext = () => {
    setCurrentDate(prev => {
      const nextDate = new Date(prev);
      if (timeframe === 'day') {
        nextDate.setDate(prev.getDate() + 1);
        while (nextDate.getDay() === 0 || nextDate.getDay() === 6) {
          nextDate.setDate(nextDate.getDate() + 1);
        }
      } else if (timeframe === 'week') {
        nextDate.setDate(prev.getDate() + 7);
      } else {
        nextDate.setMonth(prev.getMonth() + 1);
      }
      return nextDate;
    });
  };

  const dates = useMemo(() => {
    const resultDates = [];
    const actualToday = new Date();
    actualToday.setHours(0, 0, 0, 0);

    const todayDayOfWeek = actualToday.getDay();
    const offsetToMonday = todayDayOfWeek === 0 ? -6 : 1 - todayDayOfWeek;
    const currentWeekStart = new Date(actualToday);
    currentWeekStart.setDate(actualToday.getDate() + offsetToMonday);
    const currentWeekEnd = new Date(currentWeekStart);
    currentWeekEnd.setDate(currentWeekStart.getDate() + 4);

    const buildDateObject = (d) => {
      const year = d.getFullYear();
      const monthStr = (d.getMonth() + 1).toString().padStart(2, '0');
      const dayStr = d.getDate().toString().padStart(2, '0');
      return {
        id: `${year}-${monthStr}-${dayStr}`,
        label: d.toLocaleDateString('en-US', { weekday: 'short' }),
        dateStr: `${d.getMonth() + 1}/${d.getDate()}`,
        isFuture: d > actualToday,
        isToday: d.getFullYear() === actualToday.getFullYear() && d.getMonth() === actualToday.getMonth() && d.getDate() === actualToday.getDate(),
        isCurrentWeek: d >= currentWeekStart && d <= currentWeekEnd
      };
    };

    if (timeframe === 'day') {
      resultDates.push(buildDateObject(currentDate));
    } else if (timeframe === 'week') {
      const currentDayOfWeek = currentDate.getDay();
      const offset = currentDayOfWeek === 0 ? -6 : 1 - currentDayOfWeek;
      const monday = new Date(currentDate);
      monday.setDate(currentDate.getDate() + offset);

      for (let i = 0; i < 5; i++) {
        const d = new Date(monday);
        d.setDate(monday.getDate() + i);
        resultDates.push(buildDateObject(d));
      }
    } else {
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth();
      const daysInMonth = new Date(year, month + 1, 0).getDate();

      for (let i = 1; i <= daysInMonth; i++) {
        const d = new Date(year, month, i);
        const dayOfWeek = d.getDay();
        if (dayOfWeek !== 0 && dayOfWeek !== 6) {
          resultDates.push(buildDateObject(d));
        }
      }
    }
    return resultDates;
  }, [currentDate, timeframe]);

  const timesheetTitle = useMemo(() => {
    if (timeframe === 'day') {
      return currentDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
    } else if (timeframe === 'week') {
      const currentDayOfWeek = currentDate.getDay();
      const offset = currentDayOfWeek === 0 ? -6 : 1 - currentDayOfWeek;
      const monday = new Date(currentDate);
      monday.setDate(currentDate.getDate() + offset);
      const friday = new Date(monday);
      friday.setDate(monday.getDate() + 4);

      const startLabel = monday.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      const endLabel = friday.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      return `Week of ${startLabel} – ${endLabel}`;
    } else {
      return currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    }
  }, [currentDate, timeframe]);

  useEffect(() => {
    async function syncDatabase() {
      if (!isSignedIn || !user || !isOrgLoaded) return;
      try {
        const token = await getToken();
        const apiUrl = import.meta.env.VITE_API_URL;

        const payload = {
          email: user.primaryEmailAddress.emailAddress,
          firstName: user.firstName,
          lastName: user.lastName,
          clerkOrgId: organization?.id || null,
          clerkOrgName: organization?.name || null,
          clerkOrgRole: membership?.role || null
        };

        const response = await fetch(`${apiUrl}/api/sync-user`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify(payload)
        });

        if (!response.ok) throw new Error("Failed to fetch data");
        const data = await response.json();

        if (data.lockedOut) {
          setLockout(data.lockoutReason);
          setIsSyncing(false);
          return;
        }

        setDbUser(data.user);
        
        // STRESS TEST SEEDING:
        const fakeProjects = [];
        const fakeEntries = {};
        for (let i = 0; i < 20; i++) {
          const proj = {
            id: `fake_proj_${i}`,
            name: `Stress Test Project ${i}`,
            isCollapsed: false,
            tasks: []
          };
          for (let j = 0; j < 5; j++) {
            const taskId = `fake_task_${i}_${j}`;
            proj.tasks.push({
              id: taskId,
              name: `Stress Test Task ${j}`
            });
            // 5 random entries per task for the current month
            for (let k = 1; k <= 5; k++) {
              const day = String(k * 5).padStart(2, '0');
              fakeEntries[`${data.user.id}_2026-07-${day}_${taskId}`] = Math.random() * 8;
            }
          }
          fakeProjects.push(proj);
        }
        setProjects([...data.projects, ...fakeProjects]);

        setOrgUsers(data.orgUsers || []);
        setTaskRates(data.taskRates || []);

        const dbEntries = {};
        const dbNotes = {};
        data.entries.forEach(entry => {
          dbEntries[`${entry.userId}_${entry.dateId}_${entry.taskId}`] = entry.hours;
          if (entry.note) dbNotes[`${entry.userId}_${entry.dateId}_${entry.taskId}`] = entry.note;
        });
        setEntries({...dbEntries, ...fakeEntries});
        setNotes(dbNotes);
        setRawEntries(data.entries);
      } catch (error) {
        console.error("Database Sync Error:", error);
      } finally {
        setIsSyncing(false);
      }
    }
    syncDatabase();
  }, [isSignedIn, user, getToken, organization?.id, organization?.name, isOrgLoaded, triggerSync]);

  const apiCall = async (endpoint, method, body, successMessage = '') => {
    const isWrite = ['POST', 'PUT', 'DELETE'].includes(method.toUpperCase());
    if (isWrite) {
      setActiveSaves(prev => prev + 1);
    }
    try {
      const token = await getToken();
      const apiUrl = import.meta.env.VITE_API_URL;
      const res = await fetch(`${apiUrl}${endpoint}`, {
        method,
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: body ? JSON.stringify(body) : undefined
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || `API call failed: ${res.statusText}`);
      }
      if (successMessage) {
        addToast(successMessage, 'success');
      }
      return await res.json();
    } catch (error) {
      addToast(error.message || 'An error occurred', 'error');
      throw error;
    } finally {
      if (isWrite) {
        setActiveSaves(prev => Math.max(0, prev - 1));
      }
    }
  };

  const handleAddProject = async (projectName) => {
    if (!projectName?.trim()) {
      addToast('Project name cannot be empty', 'error');
      return;
    }
    const tempId = `temp_${Date.now()}`;
    const tempProject = { id: tempId, name: projectName, isCollapsed: false, tasks: [], createdAt: new Date().toISOString() };
    setProjects(prev => [...prev, tempProject]);
    try {
      const savedProject = await apiCall('/api/projects', 'POST', { name: projectName }, 'Project created');
      setProjects(prev => prev.map(p => p.id === tempId ? savedProject : p));
    } catch (e) {
      setProjects(prev => prev.filter(p => p.id !== tempId));
    }
  };

  const handleRenameProject = async (projectId, newName) => {
    setProjects(prev => prev.map(p => p.id === projectId ? { ...p, name: newName } : p));
    if (projectId.startsWith('temp_')) return;
    try {
      const savedProject = await apiCall(`/api/projects/${projectId}`, 'PUT', { name: newName });
      setProjects(prev => prev.map(p => p.id === projectId ? savedProject : p));
    } catch (e) { console.error("Failed to rename project", e); }
  };

  const handleDeleteProject = async (projectId) => {
    setProjects(prev => prev.filter(p => p.id !== projectId));
    if (projectId.startsWith('temp_')) return;
    try {
      await apiCall(`/api/projects/${projectId}`, 'DELETE');
    } catch (e) { console.error("Failed to delete project", e); }
  };

  const handleAddTask = async (projectId, taskToAdd) => {
    if (!taskToAdd?.name?.trim()) {
      addToast('Task name cannot be empty', 'error');
      return;
    }
    const tempId = `temp_${Date.now()}`;
    const tempTask = { id: tempId, name: taskToAdd.name };
    setProjects(prev => prev.map(p => {
      if (p.id === projectId) return { ...p, tasks: [...p.tasks, tempTask] };
      return p;
    }));
    try {
      const savedTask = await apiCall('/api/tasks', 'POST', { name: taskToAdd.name, projectId }, 'Task created');
      setProjects(prev => prev.map(p => {
        if (p.id === projectId) return { ...p, tasks: p.tasks.map(t => t.id === tempId ? savedTask : t) };
        return p;
      }));
    } catch (e) {
      setProjects(prev => prev.map(p => {
        if (p.id === projectId) return { ...p, tasks: p.tasks.filter(t => t.id !== tempId) };
        return p;
      }));
    }
  };

  const handleRemoveTask = async (projectId, taskId) => {
    setProjects(prev => prev.map(p => {
      if (p.id === projectId) return { ...p, tasks: p.tasks.filter(t => t.id !== taskId) };
      return p;
    }));
    try { await apiCall(`/api/tasks/${taskId}`, 'DELETE'); } catch (e) { console.error("Failed to delete task"); }
  };

  const handleReorderProject = async (projectId, direction) => {
    setProjects(prev => {
      const idx = prev.findIndex(p => p.id === projectId);
      if (idx < 0) return prev;
      if (direction === 'left' && idx === 0) return prev;
      if (direction === 'right' && idx === prev.length - 1) return prev;

      const newProjects = [...prev];
      const swapIdx = direction === 'left' ? idx - 1 : idx + 1;
      
      const temp = newProjects[idx];
      newProjects[idx] = newProjects[swapIdx];
      newProjects[swapIdx] = temp;

      const projectIds = newProjects.map(p => p.id);
      apiCall('/api/projects/reorder', 'PUT', { projectIds }).catch(e => console.error("Failed to reorder projects", e));
      
      return newProjects;
    });
  };

  const handleEditTaskName = async (projectId, taskId, newName) => {
    // 1. Instantly update React state (Optimistic UI)
    setProjects(prev => prev.map(p => {
      if (p.id === projectId) {
        return {
          ...p,
          tasks: p.tasks.map(t => t.id === taskId ? { ...t, name: newName } : t)
        };
      }
      return p;
    }));

    if (taskId.startsWith('temp_')) return;

    // 2. Fire the database update in the background
    try {
      await apiCall(`/api/tasks/${taskId}`, 'PUT', { name: newName });
    } catch (e) {
      console.error("Failed to edit task name");
    }
  };

  const handleCellChange = async (dateId, taskId, value, targetUserId) => {
    const numValue = parseFloat(value) || 0;
    const uid = targetUserId || viewUserId || dbUser.id;
    setEntries(prev => ({ ...prev, [`${uid}_${dateId}_${taskId}`]: numValue }));
    if (taskId.startsWith('temp_')) return;
    try { await apiCall('/api/entries', 'POST', { dateId, taskId, hours: numValue, targetUserId: uid }); } catch (e) { console.error("Failed to save entry"); }
  };

  // PUSH NOTES TO DATABASE
  const handleNoteChange = async (dateId, taskId, newNote, targetUserId) => {
    const uid = targetUserId || viewUserId || dbUser.id;
    setNotes(prev => ({ ...prev, [`${uid}_${dateId}_${taskId}`]: newNote }));
    if (taskId.startsWith('temp_')) return;
    try { await apiCall('/api/notes', 'POST', { dateId, taskId, note: newNote, targetUserId: uid }); } catch (e) { console.error("Failed to save note"); }
  };

  const handleToggleCollapse = async (projectId) => {
    const projectToToggle = projects.find(p => p.id === projectId);
    const newCollapsedState = !projectToToggle.isCollapsed;
    setProjects(prev => prev.map(p => p.id === projectId ? { ...p, isCollapsed: newCollapsedState } : p));
    if (projectId.startsWith('temp_')) return;
    try { await apiCall(`/api/projects/${projectId}/collapse`, 'PUT', { isCollapsed: newCollapsedState }); } catch (e) { console.error("Failed to save collapse state"); }
  };

  return (
    <div className="font-sans text-sm h-screen flex flex-col bg-gray-50 dark:bg-zinc-950 text-gray-900 dark:text-zinc-100 overflow-hidden">
      <style>{`
        .force-black-cursor { cursor: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='20' viewBox='0 0 16 20'%3E%3Crect x='7.5' y='2' width='1' height='16' fill='black'/%3E%3Crect x='5' y='1' width='6' height='1' fill='black'/%3E%3Crect x='5' y='18' width='6' height='1' fill='black'/%3E%3C/svg%3E") 8 10, text !important; }
        .hide-caret { caret-color: transparent !important; }
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>

      <SignedOut>
        <div className="min-h-screen flex items-center justify-center py-12 px-4 bg-gray-50 dark:bg-zinc-950">
          <SignIn routing="hash" fallbackRedirectUrl="/" forceRedirectUrl="/" signUpFallbackRedirectUrl="/" signUpForceRedirectUrl="/" />
        </div>
      </SignedOut>

      <SignedIn>
        {lockout === 'seat_limit_reached' ? (
          <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50 dark:bg-zinc-950 text-center">
            <div className="max-w-md w-full bg-white dark:bg-zinc-900 rounded-2xl shadow-xl p-8 border border-red-200 dark:border-red-900/50">
              <div className="w-16 h-16 mx-auto mb-6 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
                <svg className="w-8 h-8 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8V7z" />
                </svg>
              </div>
              <h2 className="text-2xl font-black text-gray-900 dark:text-zinc-100 mb-2">Seat Limit Reached</h2>
              <p className="text-gray-600 dark:text-zinc-400 mb-8 leading-relaxed text-sm">
                The organization you are trying to join has reached its maximum seat limit for the demo tier. 
                An administrator must upgrade the workspace to Pro to allow more members.
              </p>
              <div className="space-y-3">
                <UserButton afterSignOutUrl="/" />
                <p className="text-xs text-gray-500 dark:text-zinc-500">Sign out or switch accounts</p>
              </div>
            </div>
          </div>
        ) : (
          <>
            <header className="bg-white dark:bg-zinc-900 border-b border-gray-200 dark:border-zinc-800 px-6 py-3 flex items-center justify-between shrink-0 z-50 shadow-sm transition-colors">
          <div className="flex items-center gap-8">
            <div className="font-black text-xl text-blue-600 dark:text-blue-500 tracking-tighter cursor-pointer">
              VELO<span className="text-gray-800 dark:text-zinc-200">TIME</span>
            </div>
            <nav className="hidden md:flex space-x-1">
              {navTabs.map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${activeTab === tab ? 'bg-blue-50 dark:bg-zinc-800 text-blue-700 dark:text-blue-400' : 'text-gray-600 dark:text-zinc-400 hover:bg-gray-100 dark:hover:bg-zinc-800 hover:text-gray-900 dark:hover:text-zinc-100'}`}
                >
                  {tab}
                </button>
              ))}
            </nav>
          </div>
          <div className="flex items-center gap-3 sm:gap-4">
            <button
              onClick={() => setTheme(prev => prev === 'light' ? 'dark' : 'light')}
              className="p-2 rounded-lg text-gray-600 dark:text-zinc-400 hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors"
              aria-label="Toggle Theme"
              title="Toggle Light/Dark Theme"
            >
              {theme === 'light' ? (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                </svg>
              ) : (
                <svg className="w-5 h-5 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707m0-12.728l.707.707m12.728 12.728l.707.707M12 8a4 4 0 100 8 4 4 0 000-8z" />
                </svg>
              )}
            </button>
            <div className="text-right hidden sm:block">
              <div className="text-sm font-semibold text-gray-800 dark:text-zinc-200">{user?.fullName || 'Welcome'}</div>
              <div className="text-xs text-gray-500 dark:text-zinc-400">
                {dbUser?.role ? dbUser.role.charAt(0).toUpperCase() + dbUser.role.slice(1) : 'Employee'}
              </div>
            </div>
            <UserButton afterSignOutUrl="/" />
            
            {/* Hamburger Button for Mobile */}
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="md:hidden p-2 rounded-lg text-gray-600 dark:text-zinc-400 hover:bg-gray-100 dark:hover:bg-zinc-800"
              aria-label="Toggle Menu"
            >
              {isMenuOpen ? (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              )}
            </button>
          </div>
        </header>

        {/* Mobile Dropdown Menu */}
        {isMenuOpen && (
          <div className="md:hidden bg-white dark:bg-zinc-900 border-b border-gray-200 dark:border-zinc-800 px-6 py-4 flex flex-col gap-2 shrink-0 z-40 shadow-inner">
            {navTabs.map(tab => (
              <button
                key={tab}
                onClick={() => { setActiveTab(tab); setIsMenuOpen(false); }}
                className={`w-full text-left px-4 py-2 rounded-lg font-semibold transition-colors ${activeTab === tab ? 'bg-blue-50 dark:bg-zinc-800 text-blue-700 dark:text-blue-400' : 'text-gray-600 dark:text-zinc-400 hover:bg-gray-100 dark:hover:bg-zinc-800 hover:text-gray-900 dark:hover:text-zinc-100'}`}
              >
                {tab}
              </button>
            ))}
          </div>
        )}

        <main className="flex-1 flex flex-col pt-8 overflow-hidden relative">
          {isSyncing ? (
            <div className="flex-1 flex flex-col items-center justify-center text-gray-400">
              <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mb-4"></div>
              <p>Syncing secure data...</p>
            </div>
          ) : activeTab === 'Timesheets' ? (
            <>
              <div className="flex flex-col gap-1.5 shrink-0 px-8 mb-4">
                <div className="flex items-center justify-between gap-6">
                  <div className="flex items-center gap-4 flex-wrap">
                    <h1 className="text-2xl font-bold text-gray-800 tracking-tight">Timesheet for {timesheetTitle}</h1>

                    {/* Timeframe Segmented Control */}
                    <div className="bg-gray-200/80 dark:bg-zinc-800/80 p-0.5 rounded-lg flex items-center shadow-inner text-xs font-semibold select-none">
                      {['day', 'week', 'month'].map(t => (
                        <button
                          key={t}
                          onClick={() => setTimeframe(t)}
                          className={`px-3 py-1 rounded-md transition-all ${timeframe === t ? 'bg-white dark:bg-zinc-700 text-gray-900 dark:text-zinc-100 shadow-sm' : 'text-gray-500 dark:text-zinc-400 hover:text-gray-850 dark:hover:text-zinc-200'}`}
                        >
                          {t.charAt(0).toUpperCase() + t.slice(1)}
                        </button>
                      ))}
                    </div>

                    {dbUser && (dbUser.role === 'admin' || dbUser.role === 'manager') && (
                      <div className="ml-2 flex items-center gap-2 border-l border-gray-300 dark:border-zinc-700 pl-4">
                        <span className="text-xs font-bold text-gray-400 uppercase">Viewing:</span>
                        <select
                          value={viewUserId || dbUser.id}
                          onChange={(e) => setViewUserId(e.target.value)}
                          className="text-sm font-semibold text-gray-700 dark:text-zinc-200 bg-white dark:bg-zinc-800 border border-gray-300 dark:border-zinc-700 rounded-md px-2 py-1 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                        >
                          {orgUsers.map(u => (
                            <option key={u.id} value={u.id}>
                              {u.id === dbUser.id ? `My Timesheet` : `${u.firstName} ${u.lastName}`}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-4 flex-wrap justify-end">
                    {/* Search Bar */}
                    <div className="relative w-64 max-w-full">
                      <svg className="absolute left-2 top-2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                      <input 
                        type="search" 
                        placeholder="Search projects..." 
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        className="w-full bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-lg pl-8 pr-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-blue-500 transition-shadow text-gray-700 dark:text-zinc-200"
                      />
                    </div>

                    {isSaving ? (
                      <button
                        disabled
                        className="tour-save-indicator bg-blue-50 text-blue-700 font-semibold py-1.5 px-4 rounded-lg border border-blue-200 shadow-sm transition-colors text-sm flex items-center gap-2 cursor-wait select-none"
                      >
                        <svg className="animate-spin h-4 w-4 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Saving to Cloud...
                      </button>
                    ) : (
                      <button
                        onClick={forceSync}
                        className="tour-save-indicator bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-semibold py-1.5 px-4 rounded-lg border border-emerald-255 shadow-sm transition-colors text-sm flex items-center gap-1.5 cursor-pointer select-none"
                        title="Click to force re-sync with database"
                      >
                        <svg className="h-4.5 w-4.5 text-emerald-600 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
                        </svg>
                        Saved to Cloud
                      </button>
                    )}
                  </div>
                </div>
                {/* Navigation Chevrons under "Timesheet for [Timeframe]" */}
                <div className="flex items-center gap-3 text-gray-500 mt-1 select-none">
                  <button
                    onClick={handlePrev}
                    className="p-1 hover:bg-gray-200 rounded text-gray-650 transition-colors cursor-pointer"
                    title={`Previous ${timeframe.charAt(0).toUpperCase() + timeframe.slice(1)}`}
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7" /></svg>
                  </button>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Navigate {timeframe}</span>
                  <button
                    onClick={handleNext}
                    className="p-1 hover:bg-gray-200 rounded text-gray-650 transition-colors cursor-pointer"
                    title={`Next ${timeframe.charAt(0).toUpperCase() + timeframe.slice(1)}`}
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7" /></svg>
                  </button>
                  <div className="border-l border-gray-300 dark:border-zinc-700 h-4 mx-2"></div>
                  <button
                    onClick={() => setZoomLevel(prev => Math.max(50, prev - 10))}
                    className="p-1 hover:bg-gray-200 rounded text-gray-650 transition-colors cursor-pointer"
                    title="Zoom Out"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM13 10H7" /></svg>
                  </button>
                  <span className="text-[10px] font-bold tracking-wider text-gray-400 w-8 text-center">{zoomLevel}%</span>
                  <button
                    onClick={() => setZoomLevel(prev => Math.min(200, prev + 10))}
                    className="p-1 hover:bg-gray-200 rounded text-gray-650 transition-colors cursor-pointer"
                    title="Zoom In"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" /></svg>
                  </button>
                </div>
              </div>
              <div className="flex-1 flex flex-col overflow-hidden border-t border-gray-200">
                {projects.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center">
                    <div className="bg-blue-50 text-blue-600 rounded-full w-16 h-16 flex items-center justify-center mb-4">
                      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path>
                      </svg>
                    </div>
                    <h2 className="text-2xl font-bold text-gray-800 mb-2">Welcome to VeloTime!</h2>
                    <p className="text-gray-500 max-w-md mb-6">You don't have any projects yet. Create your first project to start logging hours and generating timesheets.</p>
                    <button
                      onClick={() => handleAddProject('My First Project')}
                      className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded-lg shadow-sm transition-colors"
                    >
                      Create "My First Project"
                    </button>
                  </div>
                ) : (
                  <TrialLockoutOverlay dbUser={dbUser} apiCall={apiCall}>
                    <div style={{ zoom: `${zoomLevel}%` }} className="h-full flex flex-col">
                      <TimesheetMatrix
                        dates={dates}
                        projects={projects}
                        entries={entries}
                        notes={notes}
                        dbUser={dbUser}
                        orgUsers={orgUsers}
                        viewUserId={viewUserId || dbUser?.id}
                        timeframe={timeframe}
                        onCellChange={handleCellChange}
                        onNoteChange={handleNoteChange}
                        onAddTask={handleAddTask}
                        onRemoveTask={handleRemoveTask}
                        onAddProject={handleAddProject}
                        onToggleCollapse={handleToggleCollapse}
                        searchQuery={searchQuery}
                        onReorderProject={handleReorderProject}
                      />
                    </div>
                  </TrialLockoutOverlay>
                )}
              </div>
            </>
          ) : activeTab === 'Projects' ? (
            <TrialLockoutOverlay dbUser={dbUser} apiCall={apiCall}>
              <ProjectsTab 
                projects={projects} 
                entries={entries} 
                dbUser={dbUser}
                orgUsers={orgUsers}
                taskRates={taskRates}
                apiCall={apiCall}
                forceSync={forceSync}
                onRenameProject={handleRenameProject}
                onDeleteProject={handleDeleteProject}
                onAddProject={handleAddProject}
                onAddTask={handleAddTask}
                onRemoveTask={handleRemoveTask}
                onEditTaskName={handleEditTaskName}
              />
            </TrialLockoutOverlay>
          ) : activeTab === 'Team' ? (
            <TrialLockoutOverlay dbUser={dbUser} apiCall={apiCall}>
              <TeamTab 
                dbUser={dbUser} 
                orgUsers={orgUsers} 
                projects={projects}
                entries={entries}
                taskRates={taskRates} 
                apiCall={apiCall} 
                forceSync={forceSync} 
              />
            </TrialLockoutOverlay>
          ) : activeTab === 'Reports' ? (
            <TrialLockoutOverlay dbUser={dbUser} apiCall={apiCall}>
              <ReportsTab dbUser={dbUser} projects={projects} entries={entries} orgUsers={orgUsers} notes={notes} taskRates={taskRates} rawEntries={rawEntries} />
            </TrialLockoutOverlay>
          ) : activeTab === 'Invoices' ? (
            <TrialLockoutOverlay dbUser={dbUser} apiCall={apiCall}>
              <InvoicesTab dbUser={dbUser} projects={projects} entries={entries} rawEntries={rawEntries} orgUsers={orgUsers} apiCall={apiCall} taskRates={taskRates} forceSync={forceSync} />
            </TrialLockoutOverlay>
          ) : activeTab === 'Settings' ? (
            <OrganizationSettingsTab dbUser={dbUser} orgUsers={orgUsers} apiCall={apiCall} forceSync={forceSync} />
          ) : (
            <div className="flex-1 flex items-center justify-center m-8 border-2 border-dashed border-gray-200 dark:border-zinc-800 rounded-xl bg-white dark:bg-zinc-900">
              <h2 className="text-xl font-bold text-gray-400 dark:text-zinc-500">Under Construction</h2>
            </div>
          )}
        </main>
        {dbUser && (
          <OnboardingTour
            hasCompletedOnboarding={dbUser.hasCompletedOnboarding}
            projects={projects}
            onComplete={async () => {
              try {
                await apiCall('/api/user/complete-onboarding', 'POST');
                setDbUser(prev => ({ ...prev, hasCompletedOnboarding: true }));
              } catch (e) {
                console.error("Failed to complete onboarding", e);
              }
            }}
          />
        )}
        </>
        )}
      </SignedIn>
    </div>
  );
}