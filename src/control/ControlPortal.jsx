import React from "react";
import { useUser } from "@clerk/clerk-react";
import { Radio } from "lucide-react";
import AdminLogin from "./AdminLogin";
import AccessDenied from "./AccessDenied";
import ControlDashboard from "./ControlDashboard";
import { AUTHORIZED_ADMIN_EMAIL } from "./mockControlData";

export default function ControlPortal() {
  const { isLoaded, isSignedIn, user } = useUser();

  // 1. Loading State
  if (!isLoaded) {
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center bg-zinc-950 text-slate-100 font-sans">
        <div className="w-12 h-12 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center mb-4 text-cyan-400 shadow-xl">
          <Radio className="w-6 h-6 animate-pulse" />
        </div>
        <div className="text-xs font-mono text-zinc-400 tracking-wider uppercase">
          Verifying Security Clearance...
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
