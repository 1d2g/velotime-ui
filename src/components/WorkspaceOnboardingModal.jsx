import React, { useState } from "react";
import { useOrganizationList } from "@clerk/clerk-react";
import { Building2, Users, Check, ArrowRight, X, Shield, Plus, Trash2 } from "lucide-react";
import { useToast } from "../contexts/ToastContext";
import { usePostHog } from "posthog-js/react";

export default function WorkspaceOnboardingModal({
  isOpen,
  onClose,
  user,
  apiCall,
  forceSync,
  setActiveTab,
}) {
  const { addToast } = useToast();
  const posthog = usePostHog();
  const { createOrganization, setActive } = useOrganizationList();

  const [step, setStep] = useState(1);
  const [workspaceName, setWorkspaceName] = useState(() => {
    if (user?.firstName) {
      return `${user.firstName}'s Studio`;
    }
    return "";
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const [invites, setInvites] = useState([
    { email: "", role: "employee" },
  ]);

  if (!isOpen) return null;

  const markCompleted = () => {
    if (user?.id) {
      localStorage.setItem(`velotime_onboarding_completed_${user.id}`, "true");
    }
    onClose();
  };

  const handleStep1Submit = async (e) => {
    e.preventDefault();
    const trimmed = workspaceName.trim();
    if (!trimmed || trimmed.length < 2) {
      setError("Please enter a workspace name with at least 2 characters.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      let orgCreated = false;

      // 1. Try Clerk native organization creation if supported
      if (typeof createOrganization === "function") {
        try {
          const newOrg = await createOrganization({ name: trimmed });
          if (newOrg && setActive) {
            await setActive({ organization: newOrg.id });
            orgCreated = true;
          }
        } catch (clerkErr) {
          console.warn("Clerk organization creation fallback:", clerkErr);
        }
      }

      // 2. Guarantee Postgres database workspace creation & admin promotion
      const result = await apiCall(
        "/api/workspace/create",
        "POST",
        { name: trimmed },
        "Workspace created successfully"
      );

      forceSync();

      if (posthog) {
        posthog.capture("workspace_created", {
          workspace_name: trimmed,
          user_id: user?.id,
        });
      }

      // Proceed to Step 2 (Invite Team)
      setStep(2);
    } catch (err) {
      console.error("Workspace creation failed:", err);
      setError(err.message || "Failed to create workspace. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddInviteRow = () => {
    if (invites.length < 4) {
      setInvites([...invites, { email: "", role: "employee" }]);
    }
  };

  const handleRemoveInviteRow = (index) => {
    if (invites.length > 1) {
      setInvites(invites.filter((_, i) => i !== index));
    }
  };

  const handleInviteChange = (index, field, value) => {
    const updated = [...invites];
    updated[index][field] = value;
    setInvites(updated);
  };

  const handleSendInvites = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    const validInvites = invites.filter(
      (inv) => inv.email && inv.email.trim().includes("@")
    );

    let sentCount = 0;
    for (const inv of validInvites) {
      try {
        await apiCall("/api/organization/invite", "POST", {
          email: inv.email.trim(),
          role: inv.role,
        });
        sentCount++;
      } catch (inviteErr) {
        console.warn(`Failed to invite ${inv.email}:`, inviteErr);
      }
    }

    if (sentCount > 0) {
      addToast(
        sentCount === 1
          ? "Team invitation sent successfully."
          : `${sentCount} team invitations sent successfully.`,
        "success"
      );
    }

    if (posthog) {
      posthog.capture("workspace_onboarding_completed", {
        invites_sent: sentCount,
        skipped: false,
      });
    }

    forceSync();
    markCompleted();

    // Navigate to Team tab if invites sent, else Timesheets
    if (sentCount > 0 && typeof setActiveTab === "function") {
      setActiveTab("Team");
    }
    setIsSubmitting(false);
  };

  const handleSkip = () => {
    if (posthog) {
      posthog.capture("workspace_onboarding_completed", {
        invites_sent: 0,
        skipped: true,
      });
    }
    markCompleted();
    if (typeof setActiveTab === "function") {
      setActiveTab("Timesheets");
    }
    addToast("Welcome to VeloTime! Your workspace is ready.", "success");
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/70 dark:bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white dark:bg-zinc-900 border-2 border-slate-300 dark:border-zinc-700 w-full max-w-lg shadow-2xl relative transition-all">
        {/* Close Button */}
        <button
          onClick={markCompleted}
          className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
          title="Skip and close setup"
          aria-label="Close dialog"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Progress Bar Header */}
        <div className="border-b border-slate-200 dark:border-zinc-800 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Workspace Onboarding
            </span>
            <span className="text-slate-300 dark:text-zinc-700">•</span>
            <span className="text-xs font-semibold text-slate-900 dark:text-slate-100">
              Step {step} of 2
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <div
              className={`w-6 h-1.5 transition-colors ${
                step >= 1
                  ? "bg-slate-900 dark:bg-slate-100"
                  : "bg-slate-200 dark:bg-zinc-800"
              }`}
            />
            <div
              className={`w-6 h-1.5 transition-colors ${
                step >= 2
                  ? "bg-slate-900 dark:bg-slate-100"
                  : "bg-slate-200 dark:bg-zinc-800"
              }`}
            />
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 md:p-8">
          {step === 1 ? (
            /* STEP 1: CREATE WORKSPACE */
            <form onSubmit={handleStep1Submit} className="space-y-6">
              <div className="space-y-2">
                <div className="w-10 h-10 bg-slate-900 text-white dark:bg-zinc-800 dark:text-slate-100 flex items-center justify-center mb-3">
                  <Building2 className="w-5 h-5" />
                </div>
                <h2 className="text-xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
                  Name your company workspace
                </h2>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  Establish your organization to manage billable clients, track team timesheets, and calculate margin telemetry.
                </p>
              </div>

              {error && (
                <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-xs font-semibold text-red-700 dark:text-red-300">
                  {error}
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  Organization / Studio Name
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  placeholder="e.g. Apex Creative, Monolith Software"
                  value={workspaceName}
                  onChange={(e) => setWorkspaceName(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm bg-white dark:bg-zinc-800 border-2 border-slate-300 dark:border-zinc-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-slate-900 dark:focus:border-slate-100 font-medium"
                />
              </div>

              {/* Value Signals */}
              <div className="bg-slate-50 dark:bg-zinc-950/60 border border-slate-200 dark:border-zinc-800 p-3.5 space-y-2">
                <div className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300">
                  <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span>14-day unrestricted trial with full features</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300">
                  <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span>Automatic admin credentials & starter client templates</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300">
                  <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span>Private organization data isolation & SOC 2 security</span>
                </div>
              </div>

              {/* Action */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3 bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-slate-200 text-white dark:text-slate-900 font-bold text-xs uppercase tracking-wider transition-colors inline-flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isSubmitting ? (
                  <span>Initializing Workspace...</span>
                ) : (
                  <>
                    <span>Create Workspace & Continue</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          ) : (
            /* STEP 2: INVITE TEAM MEMBERS */
            <form onSubmit={handleSendInvites} className="space-y-6">
              <div className="space-y-2">
                <div className="w-10 h-10 bg-slate-900 text-white dark:bg-zinc-800 dark:text-slate-100 flex items-center justify-center mb-3">
                  <Users className="w-5 h-5" />
                </div>
                <h2 className="text-xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
                  Invite your team members
                </h2>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  Add practitioners, managers, or contractors. They will receive an email invitation to log their hours.
                </p>
              </div>

              {error && (
                <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-xs font-semibold text-red-700 dark:text-red-300">
                  {error}
                </div>
              )}

              {/* Team Row Inputs */}
              <div className="space-y-3">
                {invites.map((inv, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <input
                      type="email"
                      placeholder="colleague@company.com"
                      value={inv.email}
                      onChange={(e) =>
                        handleInviteChange(idx, "email", e.target.value)
                      }
                      className="flex-1 px-3 py-2 text-xs bg-white dark:bg-zinc-800 border border-slate-300 dark:border-zinc-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-slate-900 font-medium"
                    />
                    <select
                      value={inv.role}
                      onChange={(e) =>
                        handleInviteChange(idx, "role", e.target.value)
                      }
                      className="px-2 py-2 text-xs bg-white dark:bg-zinc-800 border border-slate-300 dark:border-zinc-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-slate-900 font-medium"
                    >
                      <option value="employee">Employee</option>
                      <option value="manager">Manager</option>
                      <option value="admin">Admin</option>
                    </select>
                    {invites.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveInviteRow(idx)}
                        className="p-2 text-slate-400 hover:text-red-600 transition-colors"
                        title="Remove member"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}

                {invites.length < 4 && (
                  <button
                    type="button"
                    onClick={handleAddInviteRow}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white pt-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add another member</span>
                  </button>
                )}
              </div>

              {/* Actions */}
              <div className="space-y-2 pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3 bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-slate-200 text-white dark:text-slate-900 font-bold text-xs uppercase tracking-wider transition-colors inline-flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <span>Sending Invitations...</span>
                  ) : (
                    <>
                      <span>Send Invitations & Enter Workspace</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={handleSkip}
                  className="w-full py-2.5 text-xs font-bold text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200 transition-colors"
                >
                  Skip for now & go to Timesheets
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
