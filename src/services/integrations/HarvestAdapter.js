// Harvest API Adapter (Routed via backend proxy to prevent CORS issues)

const getApiBase = () => {
  return import.meta.env.VITE_API_URL || 'https://time-production-b6d9.up.railway.app';
};

export const HarvestAdapter = {
  testConnection: async (token, accountId, authToken = null) => {
    if (!token || !accountId) throw new Error('Personal Access Token and Account ID are required');

    const headers = { 'Content-Type': 'application/json' };
    if (authToken) headers['Authorization'] = `Bearer ${authToken}`;

    const res = await fetch(`${getApiBase()}/api/integrations/harvest/test`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ token, accountId })
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || `Authentication failed (${res.status} ${res.statusText})`);
    }

    return await res.json();
  },

  fetchRemoteStructure: async (token, accountId, authToken = null) => {
    if (!token || !accountId) throw new Error('Credentials required');

    const headers = { 'Content-Type': 'application/json' };
    if (authToken) headers['Authorization'] = `Bearer ${authToken}`;

    const res = await fetch(`${getApiBase()}/api/integrations/harvest/structure`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ token, accountId })
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || 'Failed to fetch Harvest projects');
    }

    return await res.json();
  },

  pushTimeEntry: async ({ token, accountId, remoteProjectId, remoteTaskId, hours, spentDate, notes, projectName, taskName }, authToken = null) => {
    if (!token || !accountId) throw new Error('Harvest credentials are not configured');
    if (!remoteProjectId || !remoteTaskId) {
      throw new Error('Harvest requires both a mapped Project and Task ID');
    }

    const headers = { 'Content-Type': 'application/json' };
    if (authToken) headers['Authorization'] = `Bearer ${authToken}`;

    const res = await fetch(`${getApiBase()}/api/integrations/harvest/time-entries`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        token,
        accountId,
        remoteProjectId,
        remoteTaskId,
        hours,
        spentDate,
        notes,
        projectName,
        taskName
      })
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || `Failed to push to Harvest (${res.status})`);
    }

    return await res.json();
  }
};
