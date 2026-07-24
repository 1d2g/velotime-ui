import React from 'react';

export default function TrialLockoutOverlay({ dbUser, apiCall, children }) {
  if (!dbUser || !dbUser.organization) {
    return children;
  }

  const { tier, createdAt } = dbUser.organization;
  
  if (tier === 'pro') {
    return children;
  }

  // Calculate days since creation
  const createdDate = new Date(createdAt);
  const now = new Date();
  const daysSince = Math.floor((now - createdDate) / (1000 * 60 * 60 * 24));
  const trialDuration = 14;

  if (daysSince <= trialDuration) {
    return children; // Still in trial
  }

  const isAdmin = dbUser.role === 'admin' || dbUser.role === 'manager';

  return (
    <div className="relative w-full h-full flex flex-col">
      {/* Blurred background content */}
      <div className="flex-1 overflow-hidden opacity-20 pointer-events-none blur-sm transition-all duration-300">
        {children}
      </div>

      {/* Lockout Overlay */}
      <div className="absolute inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-md">
        <div className="bg-white dark:bg-zinc-900 p-8 md:p-12 rounded-2xl shadow-2xl max-w-lg w-full text-center border border-gray-200 dark:border-zinc-800">
          <div className="w-20 h-20 bg-blue-50 dark:bg-zinc-800 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-10 h-10 text-blue-600 dark:text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8V7a4 4 0 00-8 0v4h8z"></path>
            </svg>
          </div>
          
          <h2 className="text-3xl font-black text-gray-900 dark:text-white mb-4">Trial Expired</h2>
          <p className="text-gray-500 dark:text-zinc-400 mb-8 leading-relaxed">
            Your 14-day free trial of VeloTime has ended. To continue logging hours, generating invoices, and managing your team, please upgrade to the Pro plan.
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
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 px-8 rounded-xl shadow-lg transition-transform transform hover:scale-[1.02] active:scale-[0.98]"
            >
              Upgrade to Pro — $9/mo
            </button>
          ) : (
            <div className="bg-gray-100 dark:bg-zinc-800 p-4 rounded-xl text-gray-600 dark:text-zinc-400 text-sm font-medium">
              Please ask an organization admin to upgrade the subscription to continue using VeloTime.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
