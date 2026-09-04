// Toggl Track API Adapter (Routed via backend proxy to prevent CORS issues)

const getApiBase = () => {
  return import.meta.env.VITE_API_URL || 'https://time-production-b6d9.up.railway.app';
};

export const TogglAdapter = {
  testConnection: async (apiKey, token = null) => {
    if (!apiKey) throw new Error('API Key is required');

    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch(`${getApiBase()}/api/integrations/toggl/test`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ apiKey })
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || `Authentication failed (${res.status} ${res.statusText})`);
    }

    return await res.json();
  },

  fetchRemoteStructure: async (apiKey, workspaceId, token = null) => {
    if (!apiKey) throw new Error('API Key is required');

    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch(`${getApiBase()}/api/integrations/toggl/structure`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ apiKey, workspaceId })
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || 'Failed to fetch Toggl workspaces');
    }

    return await res.json();
  },

  pushTimeEntry: async ({ apiKey, workspaceId, remoteProjectId, description, durationHours, date, projectName, taskName }, token = null) => {
    if (!apiKey) throw new Error('Toggl API Key is not configured');

    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch(`${getApiBase()}/api/integrations/toggl/time-entries`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        apiKey,
        workspaceId,
        remoteProjectId,
        description,
        durationHours,
        date,
        projectName,
        taskName
      })
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || `Failed to push to Toggl (${res.status})`);
    }

    return await res.json();
  }
};
