import React, { useEffect } from "react";
import { useUser } from "@clerk/clerk-react";
import AdminLogin from "./AdminLogin";
import AccessDenied from "./AccessDenied";
import ControlDashboard from "./ControlDashboard";
import { AUTHORIZED_ADMIN_EMAIL } from "./mockControlData";

export default function ControlPortal() {
  const { isLoaded, isSignedIn, user } = useUser();

  // Ensure theme is applied on initial load
  useEffect(() => {
    try {
      const savedTheme = localStorage.getItem("velotime_theme") || "light";
      if (savedTheme === "dark") {
        document.documentElement.classList.add("dark");
      } else {
        document.documentElement.classList.remove("dark");
      }
    } catch (e) {}
  }, []);

  // 1. Loading State
  if (!isLoaded) {
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center bg-gray-200 dark:bg-zinc-950 text-slate-900 dark:text-slate-100 font-sans p-4">
        <div className="p-6 bg-white dark:bg-zinc-900 border border-slate-300 dark:border-zinc-700 flex flex-col items-center text-center max-w-xs w-full">
          <div className="w-8 h-8 border-2 border-slate-300 dark:border-zinc-700 border-t-slate-900 dark:border-t-white rounded-full animate-spin mb-3" />
          <div className="font-bold text-xs uppercase tracking-wider text-slate-800 dark:text-slate-200">
            Verifying Identity Clearance
          </div>
          <div className="text-[10px] font-mono text-slate-500 dark:text-slate-400 mt-1">
            app.velotime.dg.tools/control
          </div>
        </div>
      </div>
    );
  }

  // 2. Unauthenticated State -> Must Sign In First
  if (!isSignedIn || !user) {
    return <AdminLogin />;
  }

  // 3. Extract and check all associated email addresses for this Clerk user
  const userEmails = [
    user.primaryEmailAddress?.emailAddress,
    ...(user.emailAddresses?.map((e) => e.emailAddress) || []),
  ]
    .filter(Boolean)
    .map((e) => e.trim().toLowerCase());

  const isAuthorized = userEmails.includes(AUTHORIZED_ADMIN_EMAIL.toLowerCase());

  // 4. Unauthorized User -> Strict Access Denied
  if (!isAuthorized) {
    const primaryEmail = user.primaryEmailAddress?.emailAddress || userEmails[0] || "Unknown";
    return <AccessDenied userEmail={primaryEmail} />;
  }

  // 5. Authorized Admin (4thgencorei7@gmail.com) -> Grant Mission Control
  return <ControlDashboard />;
}
