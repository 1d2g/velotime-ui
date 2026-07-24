import React, { useState } from 'react';

export default function OrganizationSettingsTab({ dbUser, orgUsers, apiCall, forceSync }) {
  const [orgName, setOrgName] = useState(dbUser?.organization?.name || '');
  const [isSavingOrg, setIsSavingOrg] = useState(false);
  const [roleSaves, setRoleSaves] = useState({});

  if (dbUser?.role !== 'admin') {
    return (
      <div className="flex-1 p-8 bg-gray-50 dark:bg-zinc-950 flex flex-col items-center justify-center text-center transition-colors">
        <svg className="w-16 h-16 text-gray-300 dark:text-zinc-700 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8V7z" />
        </svg>
        <h2 className="text-xl font-bold text-gray-700 dark:text-zinc-300">Access Restricted</h2>
        <p className="text-gray-500 dark:text-zinc-500 mt-2">You need administrator privileges to view or modify organization settings.</p>
      </div>
    );
  }

  const [invoicePrefix, setInvoicePrefix] = useState(dbUser?.organization?.invoicePrefix || 'INV-');
  const [nextInvoiceNumber, setNextInvoiceNumber] = useState(dbUser?.organization?.nextInvoiceNumber || 1);
  const [logoBase64, setLogoBase64] = useState(dbUser?.organization?.logoBase64 || '');
  const [isSavingName, setIsSavingName] = useState(false);
  const isAdmin = dbUser?.role === 'admin' || dbUser?.role === 'owner';

  const handleSaveOrg = async () => {
    setIsSavingOrg(true);
    try {
      await apiCall('/api/organization', 'PUT', { name: orgName });
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
      await apiCall('/api/organization/invoice-settings', 'PUT', { invoicePrefix, nextInvoiceNumber, logoBase64 });
      forceSync();
      alert('Invoice settings updated!');
    } catch (err) {
      console.error(err);
      alert('Failed to update invoice settings');
    } finally {
      setIsSavingName(false);
    }
  };

  const handleLogoUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      alert("Logo file must be smaller than 2MB.");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setLogoBase64(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const handleRoleChange = async (userId, newRole) => {
    setRoleSaves(prev => ({ ...prev, [userId]: true }));
    try {
      await apiCall(`/api/users/${userId}/role`, 'PUT', { role: newRole });
      forceSync();
    } catch (e) {
      console.error("Failed to update role", e);
      alert("Failed to update role. You cannot demote the last admin.");
    } finally {
      setRoleSaves(prev => ({ ...prev, [userId]: false }));
    }
  };

  return (
    <div className="flex-1 flex flex-col p-4 md:p-8 bg-gray-50 dark:bg-zinc-950 overflow-y-auto transition-colors">
      <div className="max-w-4xl w-full mx-auto space-y-8">
        
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-zinc-100 mb-2">Organization Settings</h1>
          <p className="text-gray-500 dark:text-zinc-400 text-sm">Manage your workspace configuration, billing, and team access.</p>
        </div>

        {/* Billing & Subscription Card */}
        <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl overflow-hidden shadow-sm transition-colors">
          <div className="px-6 py-5 border-b border-gray-200 dark:border-zinc-800 bg-gray-50/50 dark:bg-zinc-800/50">
            <h2 className="text-lg font-bold text-gray-800 dark:text-zinc-200">Billing & Subscription</h2>
          </div>
          <div className="p-6 flex flex-col gap-4">
            {dbUser?.organization?.tier === 'pro' ? (
              <div className="bg-green-50 border border-green-200 rounded-lg p-6">
                <div className="flex items-center gap-3 mb-2">
                  <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                  <h3 className="text-lg font-bold text-green-800">Pro Subscription Active</h3>
                </div>
                <p className="text-green-700 text-sm mb-4">Your organization has full access to all features.</p>
                {isAdmin && (
                  <button 
                    onClick={async () => {
                      try {
                        const { url } = await apiCall('/api/stripe/portal', 'POST');
                        window.location.href = url;
                      } catch (e) {
                        alert('Failed to load billing portal.');
                      }
                    }}
                    className="bg-green-700 hover:bg-green-800 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-sm transition-colors"
                  >
                    Manage Subscription
                  </button>
                )}
              </div>
            ) : (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                <div className="flex items-center gap-3 mb-2">
                  <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                  <h3 className="text-lg font-bold text-blue-800">14-Day Free Trial</h3>
                </div>
                <p className="text-blue-700 text-sm mb-4">
                  You are currently on the demo tier. 
                  {(() => {
                    if (!dbUser?.organization?.createdAt) return '';
                    const daysSince = Math.floor((new Date() - new Date(dbUser.organization.createdAt)) / (1000 * 60 * 60 * 24));
                    const remaining = Math.max(0, 14 - daysSince);
                    return ` You have ${remaining} day${remaining === 1 ? '' : 's'} remaining in your trial.`;
                  })()}
                </p>
                {isAdmin ? (
                  <button 
                    onClick={async () => {
                      try {
                        const { url } = await apiCall('/api/stripe/checkout', 'POST');
                        window.location.href = url;
                      } catch (e) {
                        alert('Failed to initiate checkout.');
                      }
                    }}
                    className="bg-blue-700 hover:bg-blue-800 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-sm transition-colors"
                  >
                    Upgrade to Pro ($9/mo)
                  </button>
                ) : (
                  <p className="text-xs text-blue-600 font-semibold italic">Only organization admins can upgrade the subscription.</p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Profile Card */}
        <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl overflow-hidden shadow-sm transition-colors">
          <div className="px-6 py-5 border-b border-gray-200 dark:border-zinc-800 bg-gray-50/50 dark:bg-zinc-800/50">
            <h2 className="text-lg font-bold text-gray-800 dark:text-zinc-200">Organization Profile</h2>
          </div>
          <div className="p-6 flex flex-col gap-4">
            <div>
              <label className="block text-sm font-bold text-gray-700 dark:text-zinc-300 mb-2">Organization Name</label>
              <div className="flex gap-3">
                <input
                  type="text"
                  value={orgName}
                  onChange={(e) => setOrgName(e.target.value)}
                  className="flex-1 max-w-md bg-white dark:bg-zinc-950 border border-gray-300 dark:border-zinc-700 rounded-lg px-4 py-2 text-sm text-gray-900 dark:text-zinc-100 focus:ring-2 focus:ring-blue-500 outline-none transition-colors"
                />
                <button
                  onClick={handleSaveOrg}
                  disabled={isSavingOrg || orgName === dbUser?.organization?.name}
                  className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-2 px-4 rounded-lg text-sm transition-colors"
                >
                  {isSavingOrg ? 'Saving...' : 'Save'}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Invoice Settings Card */}
        <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl overflow-hidden shadow-sm transition-colors">
          <div className="px-6 py-5 border-b border-gray-200 dark:border-zinc-800 bg-gray-50/50 dark:bg-zinc-800/50">
            <h2 className="text-lg font-bold text-gray-800 dark:text-zinc-200">Invoice Settings</h2>
          </div>
          <div className="p-6">
            <form onSubmit={handleUpdateInvoiceSettings} className="flex flex-col gap-4 max-w-xl">
              <div>
                <label className="block text-sm font-bold text-gray-700 dark:text-zinc-300 mb-1">Invoice Prefix</label>
                <input 
                  type="text" 
                  value={invoicePrefix} 
                  onChange={e => setInvoicePrefix(e.target.value)} 
                  disabled={!isAdmin}
                  className="w-full bg-white dark:bg-zinc-950 border border-gray-300 dark:border-zinc-700 rounded-lg px-4 py-2 text-sm text-gray-900 dark:text-zinc-100 focus:ring-2 focus:ring-blue-500 outline-none transition-colors"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 dark:text-zinc-300 mb-1">Next Invoice Number</label>
                <input 
                  type="number" 
                  value={nextInvoiceNumber} 
                  onChange={e => setNextInvoiceNumber(e.target.value)} 
                  disabled={!isAdmin}
                  className="w-full bg-white dark:bg-zinc-950 border border-gray-300 dark:border-zinc-700 rounded-lg px-4 py-2 text-sm text-gray-900 dark:text-zinc-100 focus:ring-2 focus:ring-blue-500 outline-none transition-colors"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 dark:text-zinc-300 mb-1">Company Logo</label>
                <div className="flex items-center gap-4 mt-2">
                  {logoBase64 ? (
                    <div className="relative group">
                      <img src={logoBase64} alt="Company Logo" className="h-16 w-auto object-contain border border-gray-200 dark:border-zinc-700 rounded bg-white dark:bg-zinc-800 p-1" />
                      {isAdmin && (
                        <button
                          type="button"
                          onClick={() => setLogoBase64('')}
                          className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="h-16 w-16 flex items-center justify-center bg-gray-100 dark:bg-zinc-800 border border-dashed border-gray-300 dark:border-zinc-700 rounded text-gray-400 dark:text-zinc-500">
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
                    </div>
                  )}
                  {isAdmin && (
                    <label className="cursor-pointer bg-white dark:bg-zinc-900 border border-gray-300 dark:border-zinc-700 hover:bg-gray-50 dark:hover:bg-zinc-800 text-gray-700 dark:text-zinc-300 font-bold py-2 px-4 rounded-lg shadow-sm transition-colors text-sm">
                      <span>Upload Image</span>
                      <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
                    </label>
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-2">Recommended: PNG or JPG under 2MB. Appears on printed invoices.</p>
              </div>
              {isAdmin && (
                <button 
                  type="submit" 
                  disabled={isSavingName}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg shadow-sm transition-colors self-start"
                >
                  {isSavingName ? 'Saving...' : 'Save Settings'}
                </button>
              )}
            </form>
          </div>
        </div>

        {/* Billing Card */}
        <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl overflow-hidden shadow-sm transition-colors">
          <div className="px-6 py-5 border-b border-gray-200 dark:border-zinc-800 bg-gray-50/50 dark:bg-zinc-800/50">
            <h2 className="text-lg font-bold text-gray-800 dark:text-zinc-200">Billing & Subscription</h2>
          </div>
          <div className="p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h3 className="text-base font-bold text-gray-900 dark:text-zinc-100">Current Plan:</h3>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 border border-purple-200 dark:border-purple-800">
                  {dbUser?.organization?.tier?.toUpperCase() || 'DEMO'}
                </span>
              </div>
              <p className="text-sm text-gray-500 dark:text-zinc-400">
                {dbUser?.organization?.tier === 'pro' 
                  ? 'You are on the Pro plan with access to all premium features.' 
                  : 'Upgrade to Pro to unlock advanced reporting and unlimited projects.'}
              </p>
            </div>
            <button className="bg-white dark:bg-zinc-800 border border-gray-300 dark:border-zinc-700 hover:bg-gray-50 dark:hover:bg-zinc-700 text-gray-700 dark:text-zinc-200 font-bold py-2 px-4 rounded-lg text-sm transition-colors whitespace-nowrap shadow-sm">
              Manage Billing
            </button>
          </div>
        </div>

        {/* Roles Card */}
        <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl overflow-hidden shadow-sm transition-colors">
          <div className="px-6 py-5 border-b border-gray-200 dark:border-zinc-800 bg-gray-50/50 dark:bg-zinc-800/50 flex justify-between items-center">
            <h2 className="text-lg font-bold text-gray-800 dark:text-zinc-200">Team Roles</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-zinc-800">
              <thead className="bg-gray-50 dark:bg-zinc-900">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 dark:text-zinc-400 uppercase tracking-wider">User</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 dark:text-zinc-400 uppercase tracking-wider">Email</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 dark:text-zinc-400 uppercase tracking-wider">Role</th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-zinc-900 divide-y divide-gray-200 dark:divide-zinc-800">
                {orgUsers.map(user => (
                  <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-zinc-800/50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="h-8 w-8 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-xs border border-blue-200 dark:border-blue-800">
                          {user.firstName?.charAt(0)}{user.lastName?.charAt(0)}
                        </div>
                        <div className="ml-3">
                          <p className="text-sm font-bold text-gray-900 dark:text-zinc-100">{user.firstName} {user.lastName}</p>
                          {user.id === dbUser.id && (
                            <span className="text-[10px] text-gray-400 dark:text-zinc-500">(You)</span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-zinc-400">
                      {user.email}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <select
                          value={user.role}
                          disabled={roleSaves[user.id]}
                          onChange={(e) => handleRoleChange(user.id, e.target.value)}
                          className="bg-white dark:bg-zinc-950 border border-gray-300 dark:border-zinc-700 text-gray-700 dark:text-zinc-300 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2 outline-none cursor-pointer disabled:opacity-50 shadow-sm transition-colors"
                        >
                          <option value="employee">Employee</option>
                          <option value="manager">Manager</option>
                          <option value="admin">Admin</option>
                        </select>
                        {roleSaves[user.id] && (
                          <svg className="animate-spin h-4 w-4 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
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
