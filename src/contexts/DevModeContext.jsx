import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { useUser } from '@clerk/clerk-react';

const DevModeContext = createContext({
  isAuthorizedDev: false,
  isDevModeActive: false,
  toggleDevMode: () => {},
  devFlags: {},
  setDevFlag: () => {},
  isFeatureEnabled: () => false,
  authReason: null,
  setDbUserContext: () => {},
});

export const useDevMode = () => useContext(DevModeContext);

export function DevModeProvider({ children }) {
  const { user } = useUser();
  const [dbUser, setDbUser] = useState(null);

  // 1. Determine if the current user is authorized to use Dev features
  const { isAuthorized, reason } = useMemo(() => {
    // Local dev server always has access
    if (import.meta.env.DEV) {
      return { isAuthorized: true, reason: 'Local Development Server (DEV)' };
    }

    // Clerk Public Metadata check
    const publicMeta = user?.publicMetadata || {};
    if (publicMeta.isDev === true || publicMeta.dev === true) {
      return { isAuthorized: true, reason: 'Clerk publicMetadata.isDev is enabled' };
    }
    if (publicMeta.role === 'developer' || publicMeta.role === 'dev') {
      return { isAuthorized: true, reason: 'Clerk publicMetadata.role is developer' };
    }

    // Database user role check
    if (dbUser?.role === 'developer') {
      return { isAuthorized: true, reason: 'Database user role is developer' };
    }

    return { isAuthorized: false, reason: null };
  }, [user, dbUser]);

  // 2. Active toggle state (authorized users can toggle it off to preview the app as a normal tenant)
  const [isDevModeActive, setIsDevModeActive] = useState(() => {
    if (typeof window === 'undefined') return false;
    const stored = localStorage.getItem('velotime_dev_mode_active');
    if (stored !== null) return stored === 'true';
    return true; // Default to active if authorized
  });

  // Keep localStorage in sync
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('velotime_dev_mode_active', isDevModeActive ? 'true' : 'false');
    }
  }, [isDevModeActive]);

  // 3. Feature flags map
  const [devFlags, setDevFlags] = useState(() => {
    const defaultFlags = {
      import_wizard: true,
      harvest_importer: true,
      toggl_importer: true,
      csv_importer: true,
      debug_telemetry: false,
    };
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('velotime_dev_flags');
        if (stored) return { ...defaultFlags, ...JSON.parse(stored) };
      } catch {
        // use default
      }
    }
    return defaultFlags;
  });

  const setDevFlag = (flagName, value) => {
    setDevFlags(prev => {
      const next = { ...prev, [flagName]: value };
      if (typeof window !== 'undefined') {
        localStorage.setItem('velotime_dev_flags', JSON.stringify(next));
      }
      return next;
    });
  };

  const toggleDevMode = () => {
    setIsDevModeActive(prev => !prev);
  };

  const isFeatureEnabled = (featureName) => {
    if (!isAuthorized) return false;
    if (!isDevModeActive) return false;
    return Boolean(devFlags[featureName]);
  };

  const value = {
    isAuthorizedDev: isAuthorized,
    isDevModeActive: isAuthorized && isDevModeActive,
    toggleDevMode,
    devFlags,
    setDevFlag,
    isFeatureEnabled,
    authReason: reason,
    setDbUserContext: setDbUser,
  };

  return (
    <DevModeContext.Provider value={value}>
      {children}
    </DevModeContext.Provider>
  );
}
