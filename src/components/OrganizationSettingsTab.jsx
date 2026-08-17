import React, { useState } from "react";
import { useToast } from "../contexts/ToastContext";

export default function OrganizationSettingsTab({
  dbUser,
  orgUsers,
  apiCall,
  forceSync,
}) {
  const { addToast } = useToast();
  const [orgName, setOrgName] = useState(dbUser?.organization?.name || "");
  const [isSavingOrg, setIsSavingOrg] = useState(false);
  const [roleSaves, setRoleSaves] = useState({});

  if (dbUser?.role !== "admin") {
    return (
      <div className="flex-1 p-8 bg-slate-50 dark:bg-zinc-950 flex flex-col items-center justify-center text-center transition-colors">
        <svg
          className="w-16 h-16 text-gray-300 mb-4"
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
        <h2 className="text-xl font-bold text-slate-700 dark:text-slate-300 ">Access Restricted</h2>
        <p className="text-slate-500 dark:text-slate-500 mt-2">
          You need administrator privileges to view or modify organization
          settings.
        </p>
      </div>
    );
  }

  const [invoicePrefix, setInvoicePrefix] = useState(
    dbUser?.organization?.invoicePrefix || "INV-",
  );
  const [nextInvoiceNumber, setNextInvoiceNumber] = useState(
    dbUser?.organization?.nextInvoiceNumber || 1,
  );
  const [logoBase64, setLogoBase64] = useState(
    dbUser?.organization?.logoBase64 || "",
  );
  const [timerRoundingMinutes, setTimerRoundingMinutes] = useState(
    dbUser?.organization?.timerRoundingMinutes || 0,
  );
  const [isSavingName, setIsSavingName] = useState(false);
  const [isConnectingStripe, setIsConnectingStripe] = useState(false);
  const [isDisconnectingStripe, setIsDisconnectingStripe] = useState(false);
  const isAdmin = dbUser?.role === "admin" || dbUser?.role === "owner";

  const handleConnectStripe = async () => {
    setIsConnectingStripe(true);
    try {
      const res = await apiCall("/api/stripe-connect/oauth", "GET");
      if (res?.url) {
        window.location.href = res.url;
      } else {
        throw new Error("Could not generate Stripe connection URL.");
      }
    } catch (e) {
      addToast(e.message || "Failed to initiate Stripe Connect", "error");
      setIsConnectingStripe(false);
    }
  };

  const handleDisconnectStripe = async () => {
    if (!window.confirm("Are you sure you want to disconnect Stripe? Clients will no longer be able to pay invoices online until you reconnect.")) return;
    setIsDisconnectingStripe(true);
    try {
      await apiCall("/api/stripe-connect/disconnect", "POST");
      forceSync();
      addToast("Stripe account disconnected", "success");
    } catch (e) {
      addToast("Failed to disconnect Stripe", "error");
    } finally {
      setIsDisconnectingStripe(false);
    }
  };

  const handleSaveOrg = async () => {
    setIsSavingOrg(true);
    try {
      await apiCall("/api/organization", "PUT", { name: orgName });
      forceSync();
    } catch (e) {
      console.error("Failed to update org name", e);
    } finally {
      setIsSavingOrg(false);
    }
  };

  const handleUpdateInvoiceSettings = async (e) => {
    e.preventDefault();
    setIsSavingName(true);
    try {
      await apiCall("/api/organization/invoice-settings", "PUT", {
        invoicePrefix,
        nextInvoiceNumber,
        logoBase64,
        timerRoundingMinutes,
      });
      forceSync();
      addToast("Invoice settings updated!", "success");
    } catch (err) {
      console.error(err);
      addToast("Failed to update invoice settings", "error");
    } finally {
      setIsSavingName(false);
    }
  };

  const handleLogoUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      addToast("Logo file must be smaller than 2MB.", "error");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setLogoBase64(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const handleRoleChange = async (userId, newRole) => {
    setRoleSaves((prev) => ({ ...prev, [userId]: true }));
    try {
      await apiCall(`/api/users/${userId}/role`, "PUT", { role: newRole });
      forceSync();
    } catch (e) {
      console.error("Failed to update role", e);
      addToast("Failed to update role. You cannot demote the last admin.", "error");
    } finally {
      setRoleSaves((prev) => ({ ...prev, [userId]: false }));
    }
  };

  return (
    <div className="flex-1 flex flex-col p-4 md:p-8 bg-slate-50 dark:bg-zinc-950 overflow-y-auto transition-colors">
      <div className="max-w-4xl w-full mx-auto space-y-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-2">
            Organization Settings
          </h1>
          <p className="text-slate-500 dark:text-slate-500 text-sm">
            Manage your workspace configuration, billing, and team access.
          </p>
        </div>

        {/* Billing & Subscription Card */}
        <div className="bg-white dark:bg-zinc-900 border border-slate-300 dark:border-zinc-700 overflow-hidden transition-colors">
          <div className="px-6 py-5 border-b border-slate-300 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-950/50 ">
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 ">
              Billing & Subscription
            </h2>
          </div>
          <div className="p-6 flex flex-col gap-4">
            {dbUser?.organization?.tier === "pro" ? (
              <div className="bg-green-50 border border-green-200 p-6">
                <div className="flex items-center gap-3 mb-2">
                  <svg
                    className="w-6 h-6 text-green-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                    ></path>
                  </svg>
                  <h3 className="text-lg font-bold text-green-800">
                    Pro Subscription Active
                  </h3>
                </div>
                <p className="text-green-700 text-sm mb-4">
                  Your organization has full access to all features.
                </p>
                {isAdmin && (
                  <button
                    onClick={async () => {
                      try {
                        const { url } = await apiCall(
                          "/api/stripe/portal",
                          "POST",
                        );
                        window.location.href = url;
                      } catch (e) {
                        addToast("Failed to load billing portal.", "error");
                      }
                    }}
                    className="bg-green-700 hover:bg-green-800 text-white px-4 py-2 text-sm font-bold transition-colors"
                  >
                    Manage Subscription
                  </button>
                )}
              </div>
            ) : (
              <div className="bg-primary-50 border border-slate-900 p-6">
                <div className="flex items-center gap-3 mb-2">
                  <svg
                    className="w-6 h-6 text-primary-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                    ></path>
                  </svg>
                  <h3 className="text-lg font-bold text-blue-800">
                    14-Day Free Trial
                  </h3>
                </div>
                <p className="text-primary-700 text-sm mb-4">
                  You are currently on the demo tier.
                  {(() => {
                    if (!dbUser?.organization?.createdAt) return "";
                    const daysSince = Math.floor(
                      (new Date() - new Date(dbUser.organization.createdAt)) /
                        (1000 * 60 * 60 * 24),
                    );
                    const remaining = Math.max(0, 14 - daysSince);
                    return ` You have ${remaining} day${remaining === 1 ? "" : "s"} remaining in your trial.`;
                  })()}
                </p>

                <div className="bg-primary-100/50 rounded p-3 mb-4 border border-slate-900 ">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-sm font-semibold text-blue-900 ">
                      Seats Used
                    </span>
                    <span className="text-sm font-bold text-blue-900 ">
                      {orgUsers.length} / 5
                    </span>
                  </div>
                  <div className="w-full bg-blue-200 h-2">
                    <div
                      className="bg-slate-900 h-2 "
                      style={{
                        width: `${Math.min((orgUsers.length / 5) * 100, 100)}%`,
                      }}
                    ></div>
                  </div>
                  {orgUsers.length >= 5 && (
                    <p className="text-xs text-red-600 mt-2 font-semibold">
                      You have reached the maximum seat limit for the demo tier.
                      Upgrade to Pro to add more team members.
                    </p>
                  )}
                </div>

                {isAdmin ? (
                  <div className="flex flex-col sm:flex-row gap-3">
                    <button
                      onClick={async () => {
                        try {
                          const { url } = await apiCall(
                            "/api/stripe/checkout",
                            "POST",
                          );
                          window.location.href = url;
                        } catch (e) {
                          addToast("Failed to initiate checkout.", "error");
                        }
                      }}
                      className="bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 text-sm font-bold transition-colors"
                    >
                      Upgrade to Pro ($5/mo)
                    </button>
                    {dbUser?.email === "privacy@dg.tools" && (
                      <button
                        onClick={async () => {
                          try {
                            await apiCall("/api/dev/upgrade", "POST");
                            addToast("Dev Override Successful: Upgraded to Pro!", "success");
                            window.location.reload();
                          } catch (e) {
                            addToast("Failed to force dev upgrade.", "error");
                          }
                        }}
                        className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 text-sm font-bold transition-colors"
                      >
                        Force Upgrade (Dev)
                      </button>
                    )}
                  </div>
                ) : (
                  <p className="text-xs text-primary-600 font-semibold italic">
                    Only organization admins can upgrade the subscription.
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Profile Card */}
        <div className="bg-white dark:bg-zinc-900 border border-slate-300 dark:border-zinc-700 overflow-hidden transition-colors">
          <div className="px-6 py-5 border-b border-slate-300 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-950/50 ">
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 ">
              Organization Profile
            </h2>
          </div>
          <div className="p-6 flex flex-col gap-4">
            <div>
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                Organization Name
              </label>
              <div className="flex gap-3">
                <input
                  type="text"
                  value={orgName}
                  onChange={(e) => setOrgName(e.target.value)}
                  className="flex-1 max-w-md bg-white dark:bg-zinc-900 border border-slate-300 dark:border-zinc-700 px-4 py-2 text-sm text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-slate-900 outline-none transition-colors"
                />
                <button
                  onClick={handleSaveOrg}
                  disabled={
                    isSavingOrg || orgName === dbUser?.organization?.name
                  }
                  className="bg-slate-900 hover:bg-slate-900 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-2 px-4 text-sm transition-colors"
                >
                  {isSavingOrg ? "Saving..." : "Save"}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Invoice Settings Card */}
        <div className="bg-white dark:bg-zinc-900 border border-slate-300 dark:border-zinc-700 overflow-hidden transition-colors">
          <div className="px-6 py-5 border-b border-slate-300 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-950/50 ">
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 ">
              Invoice Settings
            </h2>
          </div>
          <div className="p-6">
            <form
              onSubmit={handleUpdateInvoiceSettings}
              className="flex flex-col gap-4 max-w-xl"
            >
              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Invoice Prefix
                </label>
                <input
                  type="text"
                  value={invoicePrefix}
                  onChange={(e) => setInvoicePrefix(e.target.value)}
                  disabled={!isAdmin}
                  className="w-full bg-white dark:bg-zinc-900 border border-slate-300 dark:border-zinc-700 px-4 py-2 text-sm text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-slate-900 outline-none transition-colors"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Next Invoice Number
                </label>
                <input
                  type="number"
                  value={nextInvoiceNumber}
                  onChange={(e) => setNextInvoiceNumber(e.target.value)}
                  disabled={!isAdmin}
                  className="w-full bg-white dark:bg-zinc-900 border border-slate-300 dark:border-zinc-700 px-4 py-2 text-sm text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-slate-900 outline-none transition-colors"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Company Logo
                </label>
                <div className="flex items-center gap-4 mt-2">
                  {logoBase64 ? (
                    <div className="relative group">
                      <img
                        src={logoBase64}
                        alt="Company Logo"
                        className="h-16 w-auto object-contain border border-slate-300 dark:border-zinc-700 rounded bg-white dark:bg-zinc-900 p-1"
                      />
                      {isAdmin && (
                        <button
                          type="button"
                          onClick={() => setLogoBase64("")}
                          className="absolute -top-2 -right-2 bg-red-500 text-white p-1 opacity-0 group-hover:opacity-100 transition-opacity"
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
                              strokeWidth="2"
                              d="M6 18L18 6M6 6l12 12"
                            ></path>
                          </svg>
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="h-16 w-16 flex items-center justify-center bg-slate-100 dark:bg-zinc-800 border border-dashed border-slate-300 dark:border-zinc-700 rounded text-slate-400 dark:text-slate-600 ">
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
                          d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                        ></path>
                      </svg>
                    </div>
                  )}
                  {isAdmin && (
                    <label className="cursor-pointer bg-white dark:bg-zinc-900 border border-slate-300 dark:border-zinc-700 hover:bg-slate-50 dark:bg-zinc-950 text-slate-700 dark:text-slate-300 font-bold py-2 px-4 transition-colors text-sm">
                      <span>Upload Image</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleLogoUpload}
                        className="hidden"
                      />
                    </label>
                  )}
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-500 mt-2">
                  Recommended: PNG or JPG under 2MB. Appears on printed
                  invoices.
                </p>
              </div>
              
              <div className="pt-4 border-t border-slate-200 dark:border-zinc-700">
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                  Timer Rounding
                </label>
                <select
                  value={timerRoundingMinutes}
                  onChange={(e) => setTimerRoundingMinutes(Number(e.target.value))}
                  disabled={!isAdmin}
                  className="w-full max-w-sm px-4 py-2 bg-white dark:bg-zinc-800 border border-slate-300 dark:border-zinc-700 rounded-none focus:outline-none focus:ring-2 focus:ring-primary-500 text-slate-900 dark:text-slate-100 disabled:opacity-50"
                >
                  <option value={0}>No rounding (Exact decimals)</option>
                  <option value={1}>Round up to nearest 1 minute</option>
                  <option value={5}>Round up to nearest 5 minutes</option>
                  <option value={15}>Round up to nearest 15 minutes</option>
                </select>
                <p className="text-xs text-slate-500 dark:text-slate-500 mt-2">
                  When a user stops an active timer, the elapsed time will be automatically rounded up to the selected increment before adding it to their timesheet.
                </p>
              </div>

              {isAdmin && (
                <button
                  type="submit"
                  disabled={isSavingName}
                  className="bg-slate-900 hover:bg-slate-900 text-white font-bold py-2 px-4 transition-colors self-start"
                >
                  {isSavingName ? "Saving..." : "Save Settings"}
                </button>
              )}
            </form>
          </div>
        </div>

        {/* Stripe Online Payments Card */}
        <div className="bg-white dark:bg-zinc-900 border border-slate-300 dark:border-zinc-700 overflow-hidden transition-colors">
          <div className="px-6 py-5 border-b border-slate-300 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-950/50 flex justify-between items-center">
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <svg className="w-5 h-5 text-indigo-600" viewBox="0 0 24 24" fill="currentColor">
                <path d="M13.976 9.15c-2.172-.806-3.356-1.426-3.356-2.409 0-.831.683-1.305 1.901-1.305 2.227 0 4.515.858 6.09 1.631l.89-5.494C18.252.975 15.697.5 12.52.5 7.234.5 3.36 3.273 3.36 7.641c0 4.298 3.655 5.86 6.843 7.027 2.455.9 3.284 1.543 3.284 2.502 0 .99-.86 1.498-2.28 1.498-2.316 0-5.176-1.12-6.937-2.102l-.936 5.564c1.884.978 4.795 1.536 7.872 1.536 5.568 0 9.458-2.678 9.458-7.29 0-4.48-3.413-5.918-6.684-7.226z"/>
              </svg>
              Stripe Online Payments
            </h2>
            <span className="text-xs font-semibold px-2 py-0.5 bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 rounded">
              Credit Cards • Apple Pay • Google Pay • ACH
            </span>
          </div>
          <div className="p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="max-w-2xl">
              <div className="flex items-center gap-3 mb-2">
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                  Status:
                </h3>
                {dbUser?.organization?.stripeConnectAccountId && dbUser?.organization?.stripeConnectEnabled ? (
                  <span className="px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-300 rounded">
                    Connected & Active
                  </span>
                ) : (
                  <span className="px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider bg-slate-100 text-slate-700 border border-slate-300 rounded">
                    Not Connected
                  </span>
                )}
              </div>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-2">
                {dbUser?.organization?.stripeConnectAccountId && dbUser?.organization?.stripeConnectEnabled
                  ? "Your Stripe account is connected. Clients can now pay your invoices online directly with 1-click checkout. Funds deposit straight into your bank account."
                  : "Connect your Stripe account to allow clients to settle invoices online via Credit Card, Apple Pay, Google Pay, or US Bank Transfer."}
              </p>
              <p className="text-xs text-slate-400 dark:text-slate-500 italic">
                Platform transaction fee: 1.0% per processed invoice. Zero chargeback or PCI liability on your VeloTime account.
              </p>
            </div>

            <div className="flex items-center gap-2">
              {isAdmin && (!dbUser?.organization?.stripeConnectAccountId || !dbUser?.organization?.stripeConnectEnabled) && (
                <button
                  onClick={handleConnectStripe}
                  disabled={isConnectingStripe}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-5 text-sm transition-all whitespace-nowrap shadow-sm disabled:opacity-50 flex items-center gap-2"
                >
                  {isConnectingStripe ? "Opening Stripe..." : "Connect with Stripe"}
                </button>
              )}

              {isAdmin && dbUser?.organization?.stripeConnectAccountId && dbUser?.organization?.stripeConnectEnabled && (
                <button
                  onClick={handleDisconnectStripe}
                  disabled={isDisconnectingStripe}
                  className="bg-slate-100 hover:bg-red-50 text-slate-600 hover:text-red-600 border border-slate-300 hover:border-red-300 font-bold py-2 px-4 text-xs transition-colors whitespace-nowrap"
                >
                  {isDisconnectingStripe ? "Disconnecting..." : "Disconnect Stripe"}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* QuickBooks Integration Card */}
        <div className="bg-white dark:bg-zinc-900 border border-slate-300 dark:border-zinc-700 overflow-hidden transition-colors">
          <div className="px-6 py-5 border-b border-slate-300 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-950/50 ">
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <svg className="w-5 h-5 text-green-600" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
              </svg>
              QuickBooks Online
            </h2>
          </div>
          <div className="p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 ">
                  Status:
                </h3>
                {dbUser?.organization?.quickbooksRealmId ? (
                  <span className="px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider bg-green-100 text-green-700 border border-green-200 ">
                    Connected
                  </span>
                ) : (
                  <span className="px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider bg-slate-100 text-slate-700 border border-slate-300 ">
                    Not Connected
                  </span>
                )}
              </div>
              <p className="text-sm text-slate-500 dark:text-slate-500 ">
                {dbUser?.organization?.quickbooksRealmId
                  ? "Your account is linked to QuickBooks Online. You can now export finalized invoices."
                  : "Connect your QuickBooks Online account to automatically export invoices and sync customers."}
              </p>
            </div>
            {isAdmin && !dbUser?.organization?.quickbooksRealmId && (
              <a
                href={`${import.meta.env.VITE_API_URL || ""}/api/quickbooks/auth?orgId=${dbUser?.organizationId}`}
                className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 text-sm transition-colors whitespace-nowrap rounded"
              >
                Connect to QuickBooks
              </a>
            )}
            {isAdmin && dbUser?.organization?.quickbooksRealmId && (
              <button
                className="bg-slate-100 text-slate-700 border border-slate-300 font-bold py-2 px-4 text-sm whitespace-nowrap cursor-not-allowed opacity-75 rounded"
                disabled
              >
                Connected
              </button>
            )}
          </div>
        </div>

        {/* Roles Card */}
        <div className="bg-white dark:bg-zinc-900 border border-slate-300 dark:border-zinc-700 overflow-hidden transition-colors">
          <div className="px-6 py-5 border-b border-slate-300 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-950/50 flex justify-between items-center">
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 ">Team Roles</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 ">
              <thead className="bg-slate-50 dark:bg-zinc-950 ">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 dark:text-slate-500 uppercase tracking-wider">
                    User
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 dark:text-slate-500 uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 dark:text-slate-500 uppercase tracking-wider">
                    Role
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-zinc-900 divide-y divide-gray-200 ">
                {orgUsers.map((user) => (
                  <tr
                    key={user.id}
                    className="hover:bg-slate-50 dark:bg-zinc-950 transition-colors"
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="h-8 w-8 bg-primary-100 text-primary-600 flex items-center justify-center font-bold text-xs border border-slate-900 ">
                          {user.firstName?.charAt(0)}
                          {user.lastName?.charAt(0)}
                        </div>
                        <div className="ml-3">
                          <p className="text-sm font-bold text-slate-900 dark:text-slate-100 ">
                            {user.firstName} {user.lastName}
                          </p>
                          {user.id === dbUser.id && (
                            <span className="text-[10px] text-slate-400 dark:text-slate-600 ">
                              (You)
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-500 ">
                      {user.email}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <select
                          value={user.role}
                          disabled={roleSaves[user.id]}
                          onChange={(e) =>
                            handleRoleChange(user.id, e.target.value)
                          }
                          className="bg-white dark:bg-zinc-900 border border-slate-300 dark:border-zinc-700 text-slate-700 dark:text-slate-300 text-sm focus:ring-slate-900 focus:border-slate-900 block p-2 outline-none cursor-pointer disabled:opacity-50 transition-colors"
                        >
                          <option value="employee">Employee</option>
                          <option value="manager">Manager</option>
                          <option value="admin">Admin</option>
                        </select>
                        {roleSaves[user.id] && (
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
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
