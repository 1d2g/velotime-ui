import React, { useState, useEffect, useMemo } from "react";
import {
  SignedIn,
  SignedOut,
  SignIn,
  UserButton,
  useUser,
  useAuth,
  useOrganization,
} from "@clerk/clerk-react";
import { usePostHog } from "posthog-js/react";
import TimesheetMatrix from "./components/TimesheetMatrix";
import ProjectsTab from "./components/ProjectsTab";
import ReportsTab from "./components/ReportsTab";
import InvoicesTab from "./components/InvoicesTab";
import IntegrationsTab from "./components/IntegrationsTab";
import { IntegrationManager } from "./services/integrations/IntegrationManager";
import TeamTab from "./components/TeamTab";
import OrganizationSettingsTab from "./components/OrganizationSettingsTab";
import ApprovalsTab from "./components/ApprovalsTab";
import ExpensesTab from "./components/ExpensesTab";
import TrialLockoutOverlay from "./components/TrialLockoutOverlay";
import OnboardingTour from "./components/OnboardingTour";
import { useToast } from "./contexts/ToastContext";
import DevModeBadge from "./components/DevModeBadge";
import ImportWizardTab from "./components/ImportWizardTab";
import AuthScreen from "./components/AuthScreen";
import WorkspaceOnboardingModal from "./components/WorkspaceOnboardingModal";
import { Sparkles, LogIn, Keyboard, Play } from "lucide-react";
import FounderTrustBanner from "./components/guest/FounderTrustBanner";
import ClaimWorkspaceModal from "./components/guest/ClaimWorkspaceModal";
import CornerVideoTutorial from "./components/guest/CornerVideoTutorial";
import WalkthroughCompletionModal from "./components/guest/WalkthroughCompletionModal";
import {
  GUEST_USER_ID,
  GUEST_MOCK_USER,
  INITIAL_GUEST_CLIENTS,
  INITIAL_GUEST_PROJECTS,
  buildInitialGuestEntries,
  buildInitialGuestNotes,
  INITIAL_GUEST_NOTES,
} from "./components/guest/guestInitialData";

const safeGetItem = (storage, key, fallback = null) => {
  try {
    if (typeof window !== "undefined" && window[storage]) {
      const val = window[storage].getItem(key);
      return val !== null ? val : fallback;
    }
  } catch (e) {}
  return fallback;
};

const safeSetItem = (storage, key, value) => {
  try {
    if (typeof window !== "undefined" && window[storage]) {
      window[storage].setItem(key, String(value));
    }
  } catch (e) {}
};

export default function App() {
  const { user, isLoaded: isUserLoaded } = useUser();
  const { getToken, isSignedIn } = useAuth();
  const { organization, membership, isLoaded: isOrgLoaded } = useOrganization();
  const posthog = usePostHog();


  useEffect(() => {
    if (user) {
      safeSetItem("localStorage", "velotime_has_signed_in", "true");
      if (posthog) {
        try {
          posthog.identify(user.id, {
            email: user.primaryEmailAddress?.emailAddress,
            name: user.fullName,
          });
        } catch (e) {}
      }

      // Track True Google Ads Sign-up Conversion (fire strictly once for fresh new signups)
      const convKey = `velotime_gtag_conv_${user.id}`;
      if (!safeGetItem("localStorage", convKey)) {
        // Ensure this is a newly created account (created in the last 24 hours) rather than a returning user sign-in
        const createdAtMs = user.createdAt ? new Date(user.createdAt).getTime() : 0;
        const isFreshSignup = !user.createdAt || Date.now() - createdAtMs < 24 * 60 * 60 * 1000;

        if (isFreshSignup) {
          try {
            if (typeof window !== "undefined" && typeof window.gtag === "function") {
              window.gtag("event", "conversion", {
                send_to: "AW-18479452942/peS3CJnLw4gdEI6m2OtE",
                value: 1.0,
                currency: "USD",
              });
            }
          } catch (e) {}

          if (posthog) {
            try {
              posthog.capture("true_signup_conversion", {
                userId: user.id,
                email: user.primaryEmailAddress?.emailAddress,
                source: new URLSearchParams(window.location.search).get("source") || "direct",
                isAdLead: safeGetItem("sessionStorage", "velotime_ad_lead") === "true",
              });
            } catch (e) {}
          }
        }
        safeSetItem("localStorage", convKey, "true");
      }
    }
  }, [user, posthog]);

  const [activeTab, setActiveTab] = useState(() => {
    return safeGetItem("localStorage", "velotime_activeTab", "Timesheets");
  });
  const [showTutorial, setShowTutorial] = useState(false);

  useEffect(() => {
    safeSetItem("localStorage", "velotime_activeTab", activeTab);
  }, [activeTab]);

  const [theme, setTheme] = useState(() => {
    return safeGetItem("localStorage", "velotime_theme", "light");
  });

  const [colorTheme, setColorTheme] = useState(() => {
    return safeGetItem("localStorage", "velotime_colorTheme", "blue");
  });

  useEffect(() => {
    try {
      document.documentElement.setAttribute("data-theme", colorTheme);
    } catch (e) {}
    safeSetItem("localStorage", "velotime_colorTheme", colorTheme);
  }, [colorTheme]);

  const cycleColorTheme = () => {
    const themes = ["blue", "rose", "violet", "amber"];
    const currentIndex = themes.indexOf(colorTheme);
    const nextIndex = (currentIndex + 1) % themes.length;
    setColorTheme(themes[nextIndex]);
  };

  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [lockout, setLockout] = useState(null);

  useEffect(() => {
    try {
      if (theme === "dark") {
        document.documentElement.classList.add("dark");
      } else {
        document.documentElement.classList.remove("dark");
      }
    } catch (e) {}
    safeSetItem("localStorage", "velotime_theme", theme);
  }, [theme]);

  const [dbUser, setDbUser] = useState(null);
  const [projects, setProjects] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [entries, setEntries] = useState({});
  const [rawEntries, setRawEntries] = useState([]);
  const [clients, setClients] = useState([]);
  const [notes, setNotes] = useState({});
  const [orgUsers, setOrgUsers] = useState([]);
  const [taskRates, setTaskRates] = useState([]);

  const isAuditMode = typeof window !== "undefined" && new URLSearchParams(window.location.search).get("audit_mode") === "true";
  const isExplicitSignIn = typeof window !== "undefined" && new URLSearchParams(window.location.search).get("mode") === "signin";

  const [showAuthScreen, setShowAuthScreen] = useState(isExplicitSignIn);
  const [isClaimModalOpen, setIsClaimModalOpen] = useState(false);
  const [walkthroughActive, setWalkthroughActive] = useState(false);
  const [walkthroughStep, setWalkthroughStep] = useState(0);
  const [isWalkthroughModalOpen, setIsWalkthroughModalOpen] = useState(false);
  const [isCornerVideoOpen, setIsCornerVideoOpen] = useState(() => {
    try {
      return sessionStorage.getItem("velotime_corner_video_dismissed") !== "true";
    } catch {
      return true;
    }
  });

  const isGuestMode = !isSignedIn && !isAuditMode && !showAuthScreen;

  const handleStartWalkthrough = () => {
    if (activeTab !== "Timesheet") {
      setActiveTab("Timesheet");
    }
    setWalkthroughActive(true);
    setWalkthroughStep(0);
  };

  const handleAdvanceWalkthrough = (explicitStep) => {
    setWalkthroughStep((prev) => {
      const next = typeof explicitStep === "number" ? explicitStep : prev + 1;
      if (next >= 3) {
        setWalkthroughActive(false);
        setIsWalkthroughModalOpen(true);
        return 0;
      }
      return next;
    });
  };

  const handleCancelWalkthrough = () => {
    setWalkthroughActive(false);
    setWalkthroughStep(0);
  };

  const handleOpenCornerVideo = () => {
    try {
      sessionStorage.removeItem("velotime_corner_video_dismissed");
      sessionStorage.removeItem("velotime_corner_video_minimized");
    } catch {}
    setIsCornerVideoOpen(true);
  };

  useEffect(() => {
    if (isAuditMode) {
      const mockAdminUser = {
        id: "usr_audit_admin",
        email: "privacy@dg.tools",
        firstName: "Audit",
        lastName: "Admin",
        role: "admin",
        organization: { id: "org_audit", name: "VeloTime QA Testing Workspace", tier: "pro", invoicePrefix: "INV-", nextInvoiceNumber: 1001 }
      };
      setDbUser(mockAdminUser);
      setOrgUsers([mockAdminUser, { id: "usr_2", firstName: "Sarah", lastName: "Dev", role: "employee" }]);
      setClients([
        { id: "c1", name: "Acme Corporation", address: "100 Tech Blvd, Silicon Valley, CA" },
        { id: "c2", name: "Stripe Inc", address: "510 Townsend St, San Francisco, CA" }
      ]);
      setProjects([
        {
          id: "p1",
          name: "Acme Web Platform",
          clientName: "Acme Corporation",
          clientId: "c1",
          hourlyRate: 150,
          budget: 50000,
          budgetHours: 350,
          sortOrder: 0,
          tasks: [
            { id: "t1", name: "Design & Wireframes", hourlyRate: 140 },
            { id: "t2", name: "Frontend Development", hourlyRate: 160 },
            { id: "t3", name: "API & Backend", hourlyRate: 175 }
          ]
        },
        {
          id: "p2",
          name: "Mobile App V2",
          clientName: "Stripe Inc",
          clientId: "c2",
          hourlyRate: 175,
          budget: 30000,
          budgetHours: 200,
          sortOrder: 1,
          tasks: [
            { id: "t4", name: "Mobile UI Architecture", hourlyRate: 160 },
            { id: "t5", name: "Push Notifications", hourlyRate: 150 }
          ]
        }
      ]);
      setTaskRates({ t1: 140, t2: 160, t3: 175, t4: 160, t5: 150 });
      setEntries({
        "usr_audit_admin_2026-08-17_t1": 8,
        "usr_audit_admin_2026-08-18_t1": 7.5,
        "usr_audit_admin_2026-08-19_t2": 8,
        "usr_audit_admin_2026-08-20_t2": 6.5,
        "usr_audit_admin_2026-08-21_t3": 8
      });
      setRawEntries([
        { id: "e1", date: "2026-08-17", taskId: "t1", hours: 8, projectId: "p1", projectName: "Acme Web Platform", taskName: "Design & Wireframes", userId: "usr_audit_admin", userName: "Audit Admin", isBillable: true, isInvoiced: false },
        { id: "e2", date: "2026-08-18", taskId: "t1", hours: 7.5, projectId: "p1", projectName: "Acme Web Platform", taskName: "Design & Wireframes", userId: "usr_audit_admin", userName: "Audit Admin", isBillable: true, isInvoiced: false },
        { id: "e3", date: "2026-08-19", taskId: "t2", hours: 8, projectId: "p1", projectName: "Acme Web Platform", taskName: "Frontend Development", userId: "usr_audit_admin", userName: "Audit Admin", isBillable: true, isInvoiced: false },
        { id: "e4", date: "2026-08-20", taskId: "t2", hours: 6.5, projectId: "p1", projectName: "Acme Web Platform", taskName: "Frontend Development", userId: "usr_audit_admin", userName: "Audit Admin", isBillable: true, isInvoiced: false },
        { id: "e5", date: "2026-08-21", taskId: "t3", hours: 8, projectId: "p1", projectName: "Acme Web Platform", taskName: "API & Backend", userId: "usr_audit_admin", userName: "Audit Admin", isBillable: true, isInvoiced: false }
      ]);
      setExpenses([
        { id: "exp_1", amount: "450.00", description: "Cloud Infrastructure Hosting", date: "2026-08-18", isBillable: true, projectId: "p1" }
      ]);
      setIsSyncing(false);
    }
  }, [isAuditMode]);
  const [submissions, setSubmissions] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [activeInvoiceId, setActiveInvoiceId] = useState(null);

  const { addToast } = useToast();
  const [isSyncing, setIsSyncing] = useState(true);

  // Warn user if they try to close the tab with an active timer
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (dbUser?.activeTimerStart) {
        e.preventDefault();
        e.returnValue = "You have a timer running! Are you sure you want to leave?";
        return e.returnValue;
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [dbUser?.activeTimerStart]);

  // Developer Mode Authorization: strictly via Clerk publicMetadata or local development
  const isAuthorizedDev = useMemo(() => {
    if (import.meta.env.DEV) return true;
    const publicMeta = user?.publicMetadata || {};
    if (publicMeta.isDev === true || publicMeta.dev === true) return true;
    if (publicMeta.role === "developer" || publicMeta.role === "dev") return true;
    if (dbUser?.role === "developer") return true;
    return false;
  }, [user, dbUser]);

  const [isDevModeActive, setIsDevModeActive] = useState(() => {
    const stored = safeGetItem("localStorage", "velotime_dev_mode_active");
    return stored !== null ? stored === "true" : true;
  });

  useEffect(() => {
    safeSetItem("localStorage", "velotime_dev_mode_active", isDevModeActive ? "true" : "false");
  }, [isDevModeActive]);

  const isDevActive = isAuthorizedDev && isDevModeActive;

  const navTabs = [
    "Timesheets",
    "Projects",
    "Expenses",
    ...(dbUser?.role === "admin" || dbUser?.role === "manager"
      ? ["Team", "Reports", "Invoices", "Approvals"]
      : []),
    ...(isDevActive ? ["Migration (Dev)"] : []),
    "Settings",
  ];

  const [timeframe, setTimeframe] = useState("week"); // 'day', 'week', 'month'
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
    setTriggerSync((prev) => prev + 1);
  };

  const handlePrev = () => {
    setCurrentDate((prev) => {
      const nextDate = new Date(prev);
      if (timeframe === "day") {
        nextDate.setDate(prev.getDate() - 1);
        while (nextDate.getDay() === 0 || nextDate.getDay() === 6) {
          nextDate.setDate(nextDate.getDate() - 1);
        }
      } else if (timeframe === "week") {
        nextDate.setDate(prev.getDate() - 7);
      } else {
        nextDate.setMonth(prev.getMonth() - 1);
      }
      return nextDate;
    });
  };

  const handleNext = () => {
    setCurrentDate((prev) => {
      const nextDate = new Date(prev);
      if (timeframe === "day") {
        nextDate.setDate(prev.getDate() + 1);
        while (nextDate.getDay() === 0 || nextDate.getDay() === 6) {
          nextDate.setDate(nextDate.getDate() + 1);
        }
      } else if (timeframe === "week") {
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
      const monthStr = (d.getMonth() + 1).toString().padStart(2, "0");
      const dayStr = d.getDate().toString().padStart(2, "0");
      return {
        id: `${year}-${monthStr}-${dayStr}`,
        label: d.toLocaleDateString("en-US", { weekday: "short" }),
        dateStr: `${d.getMonth() + 1}/${d.getDate()}`,
        isFuture: d > actualToday,
        isToday:
          d.getFullYear() === actualToday.getFullYear() &&
          d.getMonth() === actualToday.getMonth() &&
          d.getDate() === actualToday.getDate(),
        isCurrentWeek: d >= currentWeekStart && d <= currentWeekEnd,
      };
    };

    if (timeframe === "day") {
      resultDates.push(buildDateObject(currentDate));
    } else if (timeframe === "week") {
      const currentDayOfWeek = currentDate.getDay();
      const offset = currentDayOfWeek === 0 ? -6 : 1 - currentDayOfWeek;
      const monday = new Date(currentDate);
      monday.setDate(currentDate.getDate() + offset);

      for (let i = 0; i < 7; i++) {
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
    if (timeframe === "day") {
      return currentDate.toLocaleDateString("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
        year: "numeric",
      });
    } else if (timeframe === "week") {
      const currentDayOfWeek = currentDate.getDay();
      const offset = currentDayOfWeek === 0 ? -6 : 1 - currentDayOfWeek;
      const monday = new Date(currentDate);
      monday.setDate(currentDate.getDate() + offset);
      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);

      const startLabel = monday.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      });
      const endLabel = sunday.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
      return `Week of ${startLabel} – ${endLabel}`;
    } else {
      return currentDate.toLocaleDateString("en-US", {
        month: "long",
        year: "numeric",
      });
    }
  }, [currentDate, timeframe]);

  const totalGuestHours = useMemo(() => {
    return Object.values(entries).reduce((sum, val) => sum + (parseFloat(val) || 0), 0);
  }, [entries]);

  // Load guest sandbox workspace from localStorage or hybrid template
  useEffect(() => {
    if (isGuestMode) {
      const templateVer = safeGetItem("localStorage", "velotime_guest_template_ver");
      const isCurrentTemplate = templateVer === "v3";

      if (isCurrentTemplate) {
        try {
          const saved = safeGetItem("localStorage", "velotime_guest_workspace");
          if (saved) {
            const parsed = JSON.parse(saved);
            if (parsed.projects && parsed.projects.length > 0) {
              setProjects(parsed.projects);
              setClients(parsed.clients || INITIAL_GUEST_CLIENTS);
              setEntries(parsed.entries || {});
              setNotes(parsed.notes || {});
              setDbUser(GUEST_MOCK_USER);
              setIsSyncing(false);
              return;
            }
          }
        } catch (e) {
          console.error("Failed to load saved guest workspace:", e);
        }
      }

      // Hybrid Default (3 clients, 3 projects, 3 tasks each, 1 pre-seeded day row on Monday of 8.0h)
      safeSetItem("localStorage", "velotime_guest_template_ver", "v3");
      setDbUser(GUEST_MOCK_USER);
      setClients(INITIAL_GUEST_CLIENTS);
      setProjects(INITIAL_GUEST_PROJECTS);
      setEntries(buildInitialGuestEntries(dates));
      setNotes(buildInitialGuestNotes(dates));
      setIsSyncing(false);
    }
  }, [isGuestMode, dates.length]);

  // Real-time autosave of guest workspace
  useEffect(() => {
    if (isGuestMode && projects.length > 0) {
      const payload = {
        clients,
        projects,
        entries,
        notes,
      };
      safeSetItem("localStorage", "velotime_guest_workspace", JSON.stringify(payload));
    }
  }, [isGuestMode, clients, projects, entries, notes]);

  // Handshake: Automatically claim stashed guest data upon successful sign-in
  useEffect(() => {
    async function checkAndClaimGuestData() {
      if (!isSignedIn || !user || !dbUser || isAuditMode) return;
      const guestStash = safeGetItem("localStorage", "velotime_guest_stash");
      if (!guestStash) return;

      try {
        const parsedStash = JSON.parse(guestStash);
        // Clear stash immediately to prevent duplicate claims
        safeSetItem("localStorage", "velotime_guest_stash", null);
        if (typeof window !== "undefined" && window.localStorage) {
          window.localStorage.removeItem("velotime_guest_stash");
          window.localStorage.removeItem("velotime_guest_workspace");
        }

        await apiCall("/api/workspace/claim-guest-data", "POST", parsedStash);
        addToast("Your guest timesheet workspace has been claimed and synced to your cloud organization!", "success");
        if (posthog) {
          try {
            posthog.capture("guest_claimed_conversion", {
              hoursClaimed: parsedStash.totalHours || 0,
              projectsClaimed: parsedStash.projects?.length || 0,
            });
          } catch (e) {}
        }
        forceSync();
      } catch (err) {
        console.error("Failed to claim guest data via API:", err);
      }
    }
    checkAndClaimGuestData();
  }, [isSignedIn, user, dbUser, isAuditMode]);

  const handleOpenClaimModal = () => {
    const stash = {
      clients,
      projects,
      entries,
      notes,
      totalHours: totalGuestHours,
    };
    safeSetItem("localStorage", "velotime_guest_stash", JSON.stringify(stash));
    setIsClaimModalOpen(true);
  };

  const handleExportCsv = () => {
    const header = ["Client", "Project", "Task", "Date", "Hours", "Note"].join(",");
    const rows = [];
    projects.forEach((p) => {
      const clientName = p.client?.name || p.clientName || "Studio";
      (p.tasks || []).forEach((t) => {
        dates.forEach((d) => {
          const uid = dbUser?.id || GUEST_USER_ID;
          const hrs = entries[`${uid}_${d.id}_${t.id}`] || 0;
          const note = notes[`${uid}_${d.id}_${t.id}`] || "";
          if (hrs > 0) {
            rows.push([
              `"${clientName.replace(/"/g, '""')}"`,
              `"${p.name.replace(/"/g, '""')}"`,
              `"${t.name.replace(/"/g, '""')}"`,
              `"${d.id}"`,
              hrs,
              `"${note.replace(/"/g, '""')}"`,
            ].join(","));
          }
        });
      });
    });
    const csvContent = "data:text/csv;charset=utf-8," + [header, ...rows].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `velotime_timesheet_export_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    addToast("Timesheet CSV exported successfully", "success");
  };

  const handleClearGrid = () => {
    setEntries({});
    setNotes({});
    if (isGuestMode) {
      safeSetItem("localStorage", "velotime_guest_workspace", JSON.stringify({
        clients,
        projects,
        entries: {},
        notes: {},
      }));
    }
    addToast("Timesheet grid cleared", "info");
  };

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
          clerkOrgRole: membership?.role || null,
        };

        const response = await fetch(`${apiUrl}/api/sync-user`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        });

        if (!response.ok) throw new Error("Failed to fetch data");
        const data = await response.json();

        if (data.lockedOut) {
          setLockout(data.lockoutReason);
          setIsSyncing(false);
          return;
        }

        setDbUser(data.user);
        setProjects(data.projects);
        setClients(data.clients || []);

        setOrgUsers(data.orgUsers || []);
        setTaskRates(data.taskRates || []);
        setSubmissions(data.submissions || []);
        setExpenses(data.expenses || []);

        const dbEntries = {};
        const dbNotes = {};
        data.entries.forEach((entry) => {
          dbEntries[`${entry.userId}_${entry.dateId}_${entry.taskId}`] =
            entry.hours;
          if (entry.note)
            dbNotes[`${entry.userId}_${entry.dateId}_${entry.taskId}`] =
              entry.note;
        });
        setEntries(dbEntries);
        setNotes(dbNotes);
        setRawEntries(data.entries);
      } catch (error) {
        console.error("Database Sync Error:", error);
      } finally {
        setIsSyncing(false);
      }
    }
    syncDatabase();
  }, [
    isSignedIn,
    user,
    getToken,
    organization?.id,
    organization?.name,
    isOrgLoaded,
    triggerSync,
  ]);

  const apiCall = async (endpoint, method, body, successMessage = "", options = {}) => {
    if (isGuestMode) {
      if (successMessage) {
        addToast(successMessage, "success");
      }
      return {};
    }
    const isWrite = ["POST", "PUT", "DELETE"].includes(method.toUpperCase());
    if (isWrite) {
      setActiveSaves((prev) => prev + 1);
    }
    try {
      const token = await getToken();
      const apiUrl = import.meta.env.VITE_API_URL;
      const res = await fetch(`${apiUrl}${endpoint}`, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: body ? JSON.stringify(body) : undefined,
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(
          errorData.error || `API call failed: ${res.statusText}`,
        );
      }
      if (successMessage) {
        addToast(successMessage, "success");
      }
      if (options.blob) return await res.blob();
      return await res.json();
    } catch (error) {
      addToast(error.message || "An error occurred", "error");
      throw error;
    } finally {
      if (isWrite) {
        setActiveSaves((prev) => Math.max(0, prev - 1));
      }
    }
  };

  const handleAddProject = async (projectName, clientId) => {
    if (!projectName?.trim()) {
      addToast("Project name cannot be empty", "error");
      return;
    }
    const tempId = `temp_${Date.now()}`;
    const clientObj = clients.find(c => c.id === clientId) || null;
    const tempProject = {
      id: tempId,
      name: projectName,
      clientId: clientId || null,
      client: clientObj,
      isCollapsed: false,
      tasks: [
        { id: `temp_t_${Date.now()}_a`, name: "Task A", isBillable: true },
        { id: `temp_t_${Date.now()}_b`, name: "Task B", isBillable: true },
        { id: `temp_t_${Date.now()}_c`, name: "Task C", isBillable: true },
      ],
      createdAt: new Date().toISOString(),
    };
    setProjects((prev) => [...prev, tempProject]);
    if (isGuestMode) {
      addToast("Project created", "success");
      return;
    }
    try {
      const savedProject = await apiCall(
        "/api/projects",
        "POST",
        { name: projectName, clientId: clientId || undefined },
        "Project created",
      );
      setProjects((prev) =>
        prev.map((p) => (p.id === tempId ? savedProject : p)),
      );
    } catch (e) {
      setProjects((prev) => prev.filter((p) => p.id !== tempId));
    }
  };

  const handleAddClient = async (name, address) => {
    if (isGuestMode) {
      const newClient = { id: `guest_c_${Date.now()}`, name, address: address || "" };
      setClients((prev) => [...prev, newClient]);
      addToast("Client created", "success");
      return newClient;
    }
    try {
      const data = await apiCall("/api/clients", "POST", { name, address }, "Client created");
      setClients((prev) => [...prev, data]);
      return data;
    } catch (e) {
      console.error("Failed to add client", e);
      throw e;
    }
  };

  const handleUpdateClient = async (clientId, data) => {
    setClients((prev) =>
      prev.map((c) => (c.id === clientId ? { ...c, ...data } : c)),
    );
    setProjects((prev) =>
      prev.map((p) => {
        if (p.clientId === clientId) {
          return {
            ...p,
            client: { ...(p.client || {}), ...data },
            clientName: data.name || p.clientName,
          };
        }
        return p;
      }),
    );
    if (isGuestMode || clientId.startsWith("guest_") || clientId.startsWith("temp_")) return;
    try {
      const updated = await apiCall(`/api/clients/${clientId}`, "PUT", data, "Client updated");
      setClients((prev) =>
        prev.map((c) => (c.id === clientId ? updated : c)),
      );
    } catch (e) {
      forceSync();
      throw e;
    }
  };

  const handleRenameProject = async (projectId, newName) => {
    setProjects((prev) =>
      prev.map((p) => (p.id === projectId ? { ...p, name: newName } : p)),
    );
    if (isGuestMode || projectId.startsWith("temp_") || projectId.startsWith("guest_")) return;
    try {
      const savedProject = await apiCall(`/api/projects/${projectId}`, "PUT", {
        name: newName,
      });
      setProjects((prev) =>
        prev.map((p) => (p.id === projectId ? savedProject : p)),
      );
    } catch (e) {
      console.error("Failed to rename project", e);
    }
  };

  const handleUpdateProject = async (projectId, data) => {
    setProjects((prev) =>
      prev.map((p) => (p.id === projectId ? { ...p, ...data } : p)),
    );
    if (isGuestMode || projectId.startsWith("temp_") || projectId.startsWith("guest_")) return;
    try {
      const updated = await apiCall(`/api/projects/${projectId}`, "PUT", data);
      setProjects((prev) =>
        prev.map((p) => (p.id === projectId ? updated : p)),
      );
    } catch (e) {
      forceSync();
    }
  };

  const handleDeleteProject = async (projectId) => {
    setProjects((prev) => prev.filter((p) => p.id !== projectId));
    if (isGuestMode || projectId.startsWith("temp_") || projectId.startsWith("guest_")) return;
    try {
      await apiCall(`/api/projects/${projectId}`, "DELETE");
    } catch (e) {
      console.error("Failed to delete project", e);
    }
  };

  const handleAddTask = async (projectId, taskToAdd) => {
    if (!taskToAdd?.name?.trim()) {
      addToast("Task name cannot be empty", "error");
      return;
    }
    const tempId = `guest_t_${Date.now()}`;
    const tempTask = { id: tempId, name: taskToAdd.name, isBillable: taskToAdd.isBillable ?? true };
    setProjects((prev) =>
      prev.map((p) => {
        if (p.id === projectId) return { ...p, tasks: [...p.tasks, tempTask] };
        return p;
      }),
    );
    if (isGuestMode) {
      addToast("Task created", "success");
      return;
    }
    try {
      const savedTask = await apiCall(
        "/api/tasks",
        "POST",
        { name: taskToAdd.name, projectId, isBillable: taskToAdd.isBillable ?? true },
        "Task created",
      );
      setProjects((prev) =>
        prev.map((p) => {
          if (p.id === projectId)
            return {
              ...p,
              tasks: p.tasks.map((t) => (t.id === tempId ? savedTask : t)),
            };
          return p;
        }),
      );
    } catch (e) {
      setProjects((prev) =>
        prev.map((p) => {
          if (p.id === projectId)
            return { ...p, tasks: p.tasks.filter((t) => t.id !== tempId) };
          return p;
        }),
      );
    }
  };

  const handleRemoveTask = async (projectId, taskId) => {
    setProjects((prev) =>
      prev.map((p) => {
        if (p.id === projectId)
          return { ...p, tasks: p.tasks.filter((t) => t.id !== taskId) };
        return p;
      }),
    );
    if (isGuestMode || taskId.startsWith("temp_") || taskId.startsWith("guest_")) return;
    try {
      await apiCall(`/api/tasks/${taskId}`, "DELETE");
    } catch (e) {
      console.error("Failed to delete task");
    }
  };

  const handleReorderProject = async (projectId, targetOrDirection) => {
    setProjects((prev) => {
      const idx = prev.findIndex((p) => p.id === projectId);
      if (idx < 0) return prev;

      const newProjects = [...prev];

      if (targetOrDirection === "left") {
        if (idx === 0) return prev;
        const temp = newProjects[idx];
        newProjects[idx] = newProjects[idx - 1];
        newProjects[idx - 1] = temp;
      } else if (targetOrDirection === "right") {
        if (idx === prev.length - 1) return prev;
        const temp = newProjects[idx];
        newProjects[idx] = newProjects[idx + 1];
        newProjects[idx + 1] = temp;
      } else {
        // It's a targetId from drag-and-drop
        const targetIdx = prev.findIndex((p) => p.id === targetOrDirection);
        if (targetIdx < 0 || targetIdx === idx) return prev;
        
        const [movedProject] = newProjects.splice(idx, 1);
        newProjects.splice(targetIdx, 0, movedProject);
      }

      // Re-assign sortOrder locally so they match visual order
      newProjects.forEach((p, i) => { p.sortOrder = i; });

      const projectIds = newProjects.map((p) => p.id);
      apiCall("/api/projects/reorder", "PUT", { projectIds }).catch((e) =>
        console.error("Failed to reorder projects", e),
      );

      return newProjects;
    });
  };

  const handleEditTask = async (projectId, taskId, updates) => {
    // 1. Instantly update React state (Optimistic UI)
    setProjects((prev) =>
      prev.map((p) => {
        if (p.id === projectId) {
          return {
            ...p,
            tasks: p.tasks.map((t) =>
              t.id === taskId ? { ...t, ...updates } : t,
            ),
          };
        }
        return p;
      }),
    );

    if (isGuestMode || taskId.startsWith("temp_") || taskId.startsWith("guest_")) return;

    // 2. Fire the database update in the background
    try {
      await apiCall(`/api/tasks/${taskId}`, "PUT", updates);
    } catch (e) {
      console.error("Failed to edit task name");
    }
  };

  const handleCellChange = async (dateId, taskId, value, targetUserId) => {
    const numValue = parseFloat(value) || 0;
    const uid = targetUserId || viewUserId || dbUser?.id || GUEST_USER_ID;
    setEntries((prev) => ({
      ...prev,
      [`${uid}_${dateId}_${taskId}`]: numValue,
    }));
    if (isGuestMode || taskId.startsWith("temp_") || taskId.startsWith("guest_")) return;
    try {
      await apiCall("/api/entries", "POST", {
        dateId,
        taskId,
        hours: numValue,
        targetUserId: uid,
      });
    } catch (e) {
      console.error("Failed to save entry");
    }
  };

  const handleToggleTimer = async (taskId, dateId, action) => {
    try {
      const res = await apiCall("/api/timer/toggle", "POST", { taskId, dateId, action });
      if (res && res.user) {
        setDbUser(res.user);
        if (action === "stop") {
          forceSync(); // refresh to get the updated entry hours
        }
      }
    } catch (e) {
      console.error("Failed to toggle timer", e);
    }
  };

  // PUSH NOTES TO DATABASE
  const handleNoteChange = async (dateId, taskId, newNote, targetUserId) => {
    const uid = targetUserId || viewUserId || dbUser?.id || GUEST_USER_ID;
    setNotes((prev) => ({ ...prev, [`${uid}_${dateId}_${taskId}`]: newNote }));
    if (isGuestMode || taskId.startsWith("temp_") || taskId.startsWith("guest_")) return;
    try {
      await apiCall("/api/notes", "POST", {
        dateId,
        taskId,
        note: newNote,
        targetUserId: uid,
      });
    } catch (e) {
      console.error("Failed to save note");
    }
  };

  const handleToggleCollapse = async (projectId) => {
    const projectToToggle = projects.find((p) => p.id === projectId);
    const newCollapsedState = !projectToToggle.isCollapsed;
    setProjects((prev) =>
      prev.map((p) =>
        p.id === projectId ? { ...p, isCollapsed: newCollapsedState } : p,
      ),
    );
    if (projectId.startsWith("temp_")) return;
    try {
      await apiCall(`/api/projects/${projectId}/collapse`, "PUT", {
        isCollapsed: newCollapsedState,
      });
    } catch (e) {
      console.error("Failed to save collapse state");
    }
  };

  const [dismissedOnboarding, setDismissedOnboarding] = useState(false);

  const shouldShowOnboarding = useMemo(() => {
    if (dismissedOnboarding) return false;
    if (!isSignedIn || !user || !isOrgLoaded || isAuditMode) return false;
    // Never prompt if the user already belongs to an active Clerk organization
    if (organization?.id) return false;
    // Never prompt if dbUser already has an organization assigned
    if (dbUser?.organizationId) return false;
    // Never prompt if localStorage marks onboarding as completed for this user
    const completedKey = `velotime_onboarding_completed_${user.id}`;
    if (safeGetItem("localStorage", completedKey) === "true") {
      return false;
    }
    return true;
  }, [
    dismissedOnboarding,
    isSignedIn,
    user,
    isOrgLoaded,
    isAuditMode,
    organization?.id,
    dbUser?.organizationId,
  ]);

  return (
    <div
      className={`font-sans text-sm ${
        showAuthScreen && !isSignedIn && !isAuditMode
          ? "min-h-screen min-h-[100dvh] h-auto overflow-y-auto"
          : "h-screen overflow-hidden"
      } flex flex-col bg-gray-200 dark:bg-zinc-950 text-slate-900 dark:text-slate-100`}
    >
      <style>{`
 .force-black-cursor { cursor: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='20' viewBox='0 0 16 20'%3E%3Crect x='7.5' y='2' width='1' height='16' fill='black'/%3E%3Crect x='5' y='1' width='6' height='1' fill='black'/%3E%3Crect x='5' y='18' width='6' height='1' fill='black'/%3E%3C/svg%3E") 8 10, text !important; }
 .hide-caret { caret-color: transparent !important; }
 .no-scrollbar::-webkit-scrollbar { display: none; }
 .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
 `}</style>

      {showAuthScreen && !isSignedIn && !isAuditMode ? (
        <div className="w-full min-h-screen min-h-[100dvh] flex-1 flex flex-col overflow-y-auto overscroll-contain">
          <AuthScreen onBackToGuest={() => setShowAuthScreen(false)} />
        </div>
      ) : lockout === "seat_limit_reached" && !isAuditMode && !isGuestMode ? (
        <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50 dark:bg-zinc-950 text-center">
          <div className="max-w-md w-full bg-white dark:bg-zinc-900 p-8 border border-red-200 ">
            <div className="w-16 h-16 mx-auto mb-6 bg-red-100 flex items-center justify-center">
              <svg
                className="w-8 h-8 text-red-600 "
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8V7z"
                />
              </svg>
            </div>
            <h2 className="text-2xl font-black text-slate-900 dark:text-slate-100 mb-2">
              Seat Limit Reached
            </h2>
            <p className="text-slate-600 dark:text-slate-400 dark:text-slate-600 mb-8 leading-relaxed text-sm">
              The organization you are trying to join has reached its maximum
              seat limit for the demo tier. An administrator must upgrade the
              workspace to Pro to allow more members.
            </p>
            <div className="space-y-3">
              <UserButton afterSignOutUrl="/" />
              <p className="text-xs text-slate-500 dark:text-slate-500 ">
                Sign out or switch accounts
              </p>
            </div>
          </div>
        </div>
      ) : (
        <>
          {isGuestMode && (
            <FounderTrustBanner founderName="Dustin Gray" founderEmail="dgray@dg.tools" />
          )}
          <WorkspaceOnboardingModal
            isOpen={shouldShowOnboarding}
            onClose={() => setDismissedOnboarding(true)}
            user={user}
            apiCall={apiCall}
            forceSync={forceSync}
            setActiveTab={setActiveTab}
          />
          <header className="bg-white dark:bg-zinc-900 border-b-2 border-slate-300 dark:border-zinc-700 px-6 py-3 flex items-center justify-between shrink-0 z-50 transition-colors">
              <div className="flex items-center w-full lg:w-64 shrink-0">
                <div className="font-black text-xl text-slate-900 dark:text-slate-100 tracking-tighter cursor-pointer flex items-center gap-2">
                  <svg
                    className="w-6 h-6 shrink-0"
                    viewBox="0 0 200 200"
                    fill="none"
                  >
                    <rect width="200" height="200" fill="#0F172A" />
                    <path
                      d="M 60 48 L 140 48 L 155 63 L 155 72 H 45 V 63 Z"
                      fill="#F43F5E"
                    />
                    <path d="M 90 72 H 110 V 94 H 90 Z" fill="#F43F5E" />
                    <path
                      d="M 45 94 H 68 L 100 132 L 132 94 H 155 L 110 148 C 105 153 95 153 90 148 Z"
                      fill="#FFFFFF"
                    />
                  </svg>
                  <span>
                    VELO<span className="text-rose-600">TIME</span>
                  </span>
                </div>
              </div>
              <div className="hidden md:flex flex-1 justify-center max-w-3xl px-4">
                <nav className="flex w-full bg-slate-100 dark:bg-zinc-800 border border-slate-300 dark:border-zinc-700">
                  {navTabs.map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setActiveTab(tab)}
                      className={`flex-1 px-4 py-2 font-semibold text-xs border-r border-slate-300 dark:border-zinc-700 last:border-r-0 transition-colors ${activeTab === tab ? "bg-white dark:bg-zinc-900 text-slate-900 dark:text-slate-100" : "text-slate-600 dark:text-slate-400 dark:text-slate-600 hover:bg-white dark:bg-zinc-900 hover:text-slate-900 dark:text-slate-100"}`}
                    >
                      {tab}
                    </button>
                  ))}
                </nav>
              </div>
              <div className="flex items-center justify-end w-auto lg:w-64 gap-3 sm:gap-4 shrink-0">

                {/* Developer Mode Console Badge */}
                <DevModeBadge
                  isAuthorizedDev={isAuthorizedDev}
                  isDevModeActive={isDevActive}
                  onToggle={() => setIsDevModeActive((prev) => !prev)}
                  user={user}
                  dbUser={dbUser}
                />

                {/* Connected Integrations & Speed Layer Button */}
                <button
                  onClick={() => setActiveTab("Integrations")}
                  className={`p-1.5 rounded transition-colors cursor-pointer ${
                    activeTab === "Integrations"
                      ? "bg-slate-200 dark:bg-zinc-700 text-slate-900 dark:text-white"
                      : "text-slate-400 dark:text-slate-500 hover:bg-slate-100 dark:hover:bg-zinc-800 hover:text-slate-700 dark:hover:text-slate-300"
                  }`}
                  aria-label="Connected Integrations & Speed Layer"
                  title="Connected Integrations & Speed Layer"
                >
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M9 3v4m6-4v4M5 7h14a2 2 0 012 2v3a7 7 0 01-7 7v2a1 1 0 01-1 1h-2a1 1 0 01-1-1v-2a7 7 0 01-7-7V9a2 2 0 012-2z"
                    />
                  </svg>
                </button>

                <button
                  onClick={() =>
                    setTheme((prev) => (prev === "light" ? "dark" : "light"))
                  }
                  className="p-1.5 rounded text-slate-400 dark:text-slate-600 hover:bg-slate-100 dark:bg-zinc-800 transition-colors"
                  aria-label="Toggle Theme"
                  title="Toggle Light/Dark Theme"
                >
                  {theme === "light" ? (
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
                      />
                    </svg>
                  ) : (
                    <svg
                      className="w-5 h-5 text-yellow-500"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707m0-12.728l.707.707m12.728 12.728l.707.707M12 8a4 4 0 100 8 4 4 0 000-8z"
                      />
                    </svg>
                  )}
                </button>
                {isGuestMode ? (
                  <div className="flex items-center gap-2 sm:gap-2.5">
                    <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 bg-rose-50 dark:bg-rose-950/50 border border-rose-300 dark:border-rose-800 text-[11px] font-mono font-bold text-rose-800 dark:text-rose-400">
                      <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
                      <span>Guest Sandbox</span>
                    </div>

                    <button
                      type="button"
                      onClick={handleOpenClaimModal}
                      className="px-3.5 py-1.5 bg-rose-500 hover:bg-rose-600 text-white font-black text-xs flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-white" />
                      <span className="hidden sm:inline">Save & Claim</span>
                      <span className="sm:hidden">Save</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setShowAuthScreen(true)}
                      className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-zinc-700 font-bold text-xs flex items-center gap-1 transition-colors cursor-pointer"
                    >
                      <LogIn className="w-3.5 h-3.5 text-slate-600 dark:text-slate-400" />
                      <span>Sign In</span>
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="text-right hidden sm:block">
                      <div className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                        {user?.fullName || "Welcome"}
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-500">
                        {dbUser?.role
                          ? dbUser.role.charAt(0).toUpperCase() +
                            dbUser.role.slice(1)
                          : "Employee"}
                      </div>
                    </div>
                    <UserButton afterSignOutUrl="/" />
                  </>
                )}

                {/* Hamburger Button for Mobile */}
                <button
                  onClick={() => setIsMenuOpen(!isMenuOpen)}
                  className="md:hidden p-2 text-slate-600 dark:text-slate-400 dark:text-slate-600 hover:bg-slate-100 dark:bg-zinc-800 "
                  aria-label="Toggle Menu"
                >
                  {isMenuOpen ? (
                    <svg
                      className="w-6 h-6"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  ) : (
                    <svg
                      className="w-6 h-6"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M4 6h16M4 12h16M4 18h16"
                      />
                    </svg>
                  )}
                </button>
              </div>
            </header>

            {/* Mobile Dropdown Menu */}
            {isMenuOpen && (
              <div className="md:hidden bg-white dark:bg-zinc-900 border-b border-slate-300 dark:border-zinc-700 px-6 py-4 flex flex-col gap-2 shrink-0 z-40 ">
                {navTabs.map((tab) => (
                  <button
                    key={tab}
                    onClick={() => {
                      setActiveTab(tab);
                      setIsMenuOpen(false);
                    }}
                    className={`w-full text-left px-4 py-2 font-semibold transition-colors ${activeTab === tab ? "bg-primary-50 text-primary-700 " : "text-slate-600 dark:text-slate-400 dark:text-slate-600 hover:bg-slate-100 dark:bg-zinc-800 hover:text-slate-900 dark:text-slate-100 "}`}
                  >
                    {tab}
                  </button>
                ))}
              </div>
            )}

            <main className="flex-1 flex flex-col pt-8 overflow-hidden relative">
              {isSyncing ? (
                <div className="flex-1 flex flex-col items-center justify-center text-slate-400 dark:text-slate-600">
                  <div className="w-8 h-8 border-4 border-slate-900 border-t-blue-600 animate-spin mb-4"></div>
                  <p>Syncing secure data...</p>
                </div>
              ) : activeTab === "Timesheets" ? (
                <>
                  <div className="flex flex-col gap-1.5 shrink-0 px-8 mb-4">
                    <div className="flex items-center justify-between gap-6">
                      <div className="flex items-center gap-4 flex-wrap">
                        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
                          Timesheet for {timesheetTitle}
                        </h1>

                        {/* Timeframe Segmented Control */}
                        <div className="bg-gray-200 dark:bg-zinc-950/80 p-0.5 flex items-center text-xs font-semibold select-none">
                          {["day", "week", "month"].map((t) => (
                            <button
                              key={t}
                              onClick={() => setTimeframe(t)}
                              className={`px-3 py-1 transition-all ${timeframe === t ? "bg-white dark:bg-zinc-900 text-slate-900 dark:text-slate-100 " : "text-slate-500 dark:text-slate-500 hover:text-gray-850 "}`}
                            >
                              {t.charAt(0).toUpperCase() + t.slice(1)}
                            </button>
                          ))}
                        </div>

                        {/* Integrated Pricing Benchmark (Prominent & Rose Accents) */}
                        {isGuestMode && (
                          <div className="inline-flex items-center gap-3 px-3.5 py-1.5 bg-slate-50 dark:bg-zinc-900 border-2 border-slate-900 dark:border-zinc-700 text-sm font-semibold select-none shadow-xs">
                            <span className="font-mono text-xs font-black px-2 py-0.5 bg-rose-500 text-white uppercase tracking-wider">
                              Pricing Benchmark
                            </span>
                            <span className="text-slate-800 dark:text-slate-200 text-sm">
                              VeloTime <strong className="text-slate-950 dark:text-white font-black text-base">$5/user/mo</strong> vs Harvest{" "}
                              <span className="line-through text-slate-400 font-normal">$14/mo</span>
                            </span>
                            <span className="text-slate-300 dark:text-slate-700 hidden sm:inline font-bold">•</span>
                            <span className="text-rose-600 dark:text-rose-400 font-black text-sm hidden sm:inline">
                              Save $1,296/yr (12 seats)
                            </span>
                          </div>
                        )}

                        {/* Interactive Tutorial & Video Tutorial Buttons */}
                        {isGuestMode && (
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={handleStartWalkthrough}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-rose-500 hover:bg-rose-600 text-white text-xs font-bold border-2 border-slate-900 shadow-xs transition-colors cursor-pointer select-none"
                              title="Start interactive 3-step keyboard walkthrough in the grid"
                            >
                              <Keyboard className="w-3.5 h-3.5" />
                              <span>Interactive Tutorial</span>
                            </button>
                            <button
                              type="button"
                              onClick={handleOpenCornerVideo}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-zinc-900 hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-800 dark:text-slate-200 text-xs font-bold border-2 border-slate-900 dark:border-zinc-700 shadow-xs transition-colors cursor-pointer select-none"
                              title="Watch 16-second video tutorial"
                            >
                              <Play className="w-3.5 h-3.5 text-rose-500 fill-rose-500" />
                              <span>Video (16s)</span>
                            </button>
                          </div>
                        )}

                        {!isGuestMode && dbUser &&
                          (dbUser.role === "admin" ||
                            dbUser.role === "manager") &&
                          orgUsers && orgUsers.length > 1 && (
                            <div className="ml-2 flex items-center gap-2 border-l border-slate-300 dark:border-zinc-700 pl-4">
                              <span className="text-xs font-bold text-slate-400 dark:text-slate-600 uppercase">
                                Viewing:
                              </span>
                              <select
                                value={viewUserId || dbUser.id}
                                onChange={(e) => setViewUserId(e.target.value)}
                                className="text-sm font-semibold text-slate-700 dark:text-slate-300 bg-white dark:bg-zinc-900 border border-slate-300 dark:border-zinc-700 px-2 py-1 focus:outline-none focus:ring-2 focus:ring-slate-900 cursor-pointer"
                              >
                                {orgUsers.map((u) => (
                                  <option key={u.id} value={u.id}>
                                    {u.id === dbUser.id
                                      ? `My Timesheet`
                                      : `${u.firstName} ${u.lastName}`}
                                  </option>
                                ))}
                              </select>
                            </div>
                          )}
                      </div>

                      <div className="flex items-center gap-4 flex-wrap justify-end">
                        {/* Search Bar */}
                        <div className="relative w-64 max-w-full">
                          <svg
                            className="absolute left-2.5 top-2.5 w-4 h-4 text-slate-400 dark:text-slate-600"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth="2"
                              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                            />
                          </svg>
                          <input
                            type="search"
                            placeholder="Search projects..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-white dark:bg-zinc-900 border-2 border-slate-300 dark:border-zinc-700 pl-9 pr-3 py-1.5 text-xs font-medium outline-none focus:border-slate-900 transition-colors text-slate-900 dark:text-slate-100"
                          />
                        </div>

                        {isGuestMode ? (
                          <div
                            className="bg-rose-50 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300 font-semibold py-1.5 px-3 border border-rose-300 dark:border-rose-800 text-xs flex items-center gap-1.5 select-none"
                            title="Your timesheet edits are saved in your local browser storage"
                          >
                            <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                            <span>Saved in Browser</span>
                          </div>
                        ) : isSaving ? (
                          <button
                            disabled
                            className="tour-save-indicator bg-primary-50 text-primary-700 font-semibold py-1.5 px-4 border border-slate-900 transition-colors text-sm flex items-center gap-2 cursor-wait select-none"
                          >
                            <svg
                              className="animate-spin h-4 w-4 text-primary-600"
                              xmlns="http://www.w3.org/2000/svg"
                              fill="none"
                              viewBox="0 0 24 24"
                            >
                              <circle
                                className="opacity-25"
                                cx="12"
                                cy="12"
                                r="10"
                                stroke="currentColor"
                                strokeWidth="4"
                              ></circle>
                              <path
                                className="opacity-75"
                                fill="currentColor"
                                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                              ></path>
                            </svg>
                            Saving to Cloud...
                          </button>
                        ) : (
                          <button
                            onClick={forceSync}
                            className="tour-save-indicator bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-semibold py-1.5 px-4 border border-emerald-255 transition-colors text-sm flex items-center gap-1.5 cursor-pointer select-none"
                            title="Click to force re-sync with database"
                          >
                            <svg
                              className="h-4.5 w-4.5 text-emerald-600 animate-pulse"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth="2.5"
                                d="M5 13l4 4L19 7"
                              />
                            </svg>
                            Saved to Cloud
                          </button>
                        )}
                      </div>
                    </div>
                    {/* Navigation Chevrons under "Timesheet for [Timeframe]" */}
                    <div className="flex items-center gap-3 text-slate-500 dark:text-slate-500 mt-1 select-none">
                      <button
                        onClick={handlePrev}
                        className="p-1 hover:bg-slate-200 rounded text-gray-650 transition-colors cursor-pointer"
                        title={`Previous ${timeframe.charAt(0).toUpperCase() + timeframe.slice(1)}`}
                      >
                        <svg
                          className="w-5 h-5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2.5"
                            d="M15 19l-7-7 7-7"
                          />
                        </svg>
                      </button>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-600">
                        Navigate {timeframe}
                      </span>
                      <button
                        onClick={handleNext}
                        className="p-1 hover:bg-slate-200 rounded text-gray-650 transition-colors cursor-pointer"
                        title={`Next ${timeframe.charAt(0).toUpperCase() + timeframe.slice(1)}`}
                      >
                        <svg
                          className="w-5 h-5"
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
                      <div className="border-l border-slate-300 dark:border-zinc-700 h-4 mx-2"></div>
                      <button
                        onClick={() =>
                          setZoomLevel((prev) => Math.max(50, prev - 10))
                        }
                        className="p-1 hover:bg-slate-200 rounded text-gray-650 transition-colors cursor-pointer"
                        title="Zoom Out"
                      >
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2.5"
                            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM13 10H7"
                          />
                        </svg>
                      </button>
                      <span className="text-[10px] font-bold tracking-wider text-slate-400 dark:text-slate-600 w-8 text-center">
                        {zoomLevel}%
                      </span>
                      <button
                        onClick={() =>
                          setZoomLevel((prev) => Math.min(200, prev + 10))
                        }
                        className="p-1 hover:bg-slate-200 rounded text-gray-650 transition-colors cursor-pointer"
                        title="Zoom In"
                      >
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2.5"
                            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7"
                          />
                        </svg>
                      </button>
                    </div>
                  </div>
                  <div className="flex-1 flex flex-col overflow-hidden border-t border-slate-300 dark:border-zinc-700">
                    {projects.length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-full text-center">
                        <div className="bg-primary-50 text-primary-600 w-16 h-16 flex items-center justify-center mb-4">
                          <svg
                            className="w-8 h-8"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth="2"
                              d="M12 4v16m8-8H4"
                            ></path>
                          </svg>
                        </div>
                        <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-2">
                          Welcome to VeloTime!
                        </h2>
                        <p className="text-slate-500 dark:text-slate-500 max-w-md mb-6">
                          You don't have any projects yet. Create your first
                          project to start logging hours and generating
                          timesheets.
                        </p>
                        <button
                          onClick={() => handleAddProject("My First Project")}
                          className="bg-slate-900 hover:bg-slate-900 text-white font-bold py-2 px-6 transition-colors"
                        >
                          Create "My First Project"
                        </button>
                      </div>
                    ) : (
                      <TrialLockoutOverlay dbUser={dbUser} apiCall={apiCall}>
                        <div
                          style={{ zoom: `${zoomLevel}%` }}
                          className="h-full flex flex-col"
                        >
                          <TimesheetMatrix
                            dates={dates}
                            projects={projects}
                            entries={entries}
                            notes={notes}
                            dbUser={dbUser}
                            orgUsers={orgUsers}
                            clients={clients}
                            onAddClient={handleAddClient}
                            submissions={submissions}
                            apiCall={apiCall}
                            forceSync={forceSync}
                            viewUserId={viewUserId || dbUser?.id}
                            timeframe={timeframe}
                            onCellChange={handleCellChange}
                            onToggleTimer={handleToggleTimer}
                            onNoteChange={handleNoteChange}
                            onAddTask={handleAddTask}
                            onRemoveTask={handleRemoveTask}
                            onEditTask={handleEditTask}
                            onAddProject={handleAddProject}
                            onRenameProject={handleRenameProject}
                            onUpdateClient={handleUpdateClient}
                            onToggleCollapse={handleToggleCollapse}
                            searchQuery={searchQuery}
                            onReorderProject={handleReorderProject}
                            onClearGrid={handleClearGrid}
                            walkthroughActive={walkthroughActive}
                            walkthroughStep={walkthroughStep}
                            onAdvanceWalkthrough={handleAdvanceWalkthrough}
                            onCancelWalkthrough={handleCancelWalkthrough}
                          />
                        </div>
                      </TrialLockoutOverlay>
                    )}
                  </div>
                </>
              ) : activeTab === "Projects" ? (
                <TrialLockoutOverlay dbUser={dbUser} apiCall={apiCall}>
                  <ProjectsTab
                    projects={projects}
                    entries={entries}
                    rawEntries={rawEntries}
                    dbUser={dbUser}
                    orgUsers={orgUsers}
                    taskRates={taskRates}
                    apiCall={apiCall}
                    forceSync={forceSync}
                    clients={clients}
                    onAddClient={handleAddClient}
                    onUpdateClient={handleUpdateClient}
                    onRenameProject={handleRenameProject}
                    onUpdateProject={handleUpdateProject}
                    onDeleteProject={handleDeleteProject}
                    onAddProject={handleAddProject}
                    onAddTask={handleAddTask}
                    onRemoveTask={handleRemoveTask}
                    onEditTask={handleEditTask}
                  />
                </TrialLockoutOverlay>
              ) : activeTab === "Team" ? (
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
              ) : activeTab === "Reports" ? (
                <TrialLockoutOverlay dbUser={dbUser} apiCall={apiCall}>
                  <ReportsTab
                    dbUser={dbUser}
                    projects={projects}
                    entries={entries}
                    orgUsers={orgUsers}
                    notes={notes}
                    taskRates={taskRates}
                    rawEntries={rawEntries}
                  />
                </TrialLockoutOverlay>
              ) : activeTab === "Invoices" ? (
                <TrialLockoutOverlay dbUser={dbUser} apiCall={apiCall}>
                  <InvoicesTab
                    dbUser={dbUser}
                    projects={projects}
                    entries={entries}
                    rawEntries={rawEntries}
                    expenses={expenses}
                    orgUsers={orgUsers}
                    apiCall={apiCall}
                    taskRates={taskRates}
                    forceSync={forceSync}
                    clients={clients}
                  />
                </TrialLockoutOverlay>
              ) : activeTab === "Approvals" ? (
                <TrialLockoutOverlay dbUser={dbUser} apiCall={apiCall}>
                  <ApprovalsTab
                    dbUser={dbUser}
                    orgUsers={orgUsers}
                    submissions={submissions}
                    apiCall={apiCall}
                    forceSync={forceSync}
                  />
                </TrialLockoutOverlay>
              ) : activeTab === "Integrations" ? (
                <IntegrationsTab dbUser={dbUser} projects={projects} />
              ) : activeTab === "Expenses" ? (
                <TrialLockoutOverlay dbUser={dbUser} apiCall={apiCall}>
                  <ExpensesTab
                    dbUser={dbUser}
                    expenses={expenses}
                    projects={projects}
                    apiCall={apiCall}
                    forceSync={forceSync}
                  />
                </TrialLockoutOverlay>
              ) : activeTab === "Migration (Dev)" && isDevActive ? (
                <ImportWizardTab
                  dbUser={dbUser}
                  clients={clients}
                  projects={projects}
                  apiCall={apiCall}
                  forceSync={forceSync}
                />
              ) : activeTab === "Settings" ? (
                <OrganizationSettingsTab
                  dbUser={dbUser}
                  orgUsers={orgUsers}
                  apiCall={apiCall}
                  forceSync={forceSync}
                />
              ) : (
                <div className="flex-1 flex items-center justify-center m-8 border-2 border-dashed border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 ">
                  <h2 className="text-xl font-bold text-slate-400 dark:text-slate-600 ">
                    Under Construction
                  </h2>
                </div>
              )}
            </main>
            {/* Onboarding Tour paused pending review */}
          </>
        )
      }

      {isGuestMode && (
        <>
          <CornerVideoTutorial
            isOpen={isCornerVideoOpen}
            onClose={() => setIsCornerVideoOpen(false)}
            onStartWalkthrough={handleStartWalkthrough}
          />
          <WalkthroughCompletionModal
            isOpen={isWalkthroughModalOpen}
            onClose={() => setIsWalkthroughModalOpen(false)}
            onClaimWorkspace={() => {
              setIsWalkthroughModalOpen(false);
              setIsClaimModalOpen(true);
            }}
          />
        </>
      )}

      <ClaimWorkspaceModal
        isOpen={isClaimModalOpen}
        onClose={() => setIsClaimModalOpen(false)}
        totalHours={totalGuestHours}
        projectsCount={projects.length}
        clientsCount={clients.length}
        onExportCsv={handleExportCsv}
        onInitiateSignUp={() => {
          safeSetItem("localStorage", "velotime_guest_stash", JSON.stringify({
            clients,
            projects,
            entries,
            notes,
            totalHours: totalGuestHours,
          }));
        }}
      />
    </div>
  );
}
