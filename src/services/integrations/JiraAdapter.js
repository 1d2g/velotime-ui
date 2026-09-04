// Jira Cloud REST API Adapter (Routed via backend proxy to prevent CORS issues)

const getApiBase = () => {
  return import.meta.env.VITE_API_URL || 'https://time-production-b6d9.up.railway.app';
};

export const JiraAdapter = {
  testConnection: async (domain, email, apiToken, authToken = null) => {
    if (!domain || !email || !apiToken) throw new Error('Domain, Email, and API Token are required');

    const headers = { 'Content-Type': 'application/json' };
    if (authToken) headers['Authorization'] = `Bearer ${authToken}`;

    const res = await fetch(`${getApiBase()}/api/integrations/jira/test`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ domain, email, apiToken })
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || `Jira Authentication failed (${res.status} ${res.statusText})`);
    }

    return await res.json();
  },

  fetchRemoteStructure: async (domain, email, apiToken, authToken = null) => {
    if (!domain || !email || !apiToken) throw new Error('Missing Jira credentials');

    const headers = { 'Content-Type': 'application/json' };
    if (authToken) headers['Authorization'] = `Bearer ${authToken}`;

    const res = await fetch(`${getApiBase()}/api/integrations/jira/structure`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ domain, email, apiToken })
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || 'Failed to fetch Jira projects');
    }

    return await res.json();
  },

  pushWorklog: async ({ domain, email, apiToken, issueKey, hours, startedDate, comment }, authToken = null) => {
    if (!domain || !email || !apiToken || !issueKey) throw new Error('Missing Jira parameters (ensure Issue Key is mapped)');

    const headers = { 'Content-Type': 'application/json' };
    if (authToken) headers['Authorization'] = `Bearer ${authToken}`;

    const res = await fetch(`${getApiBase()}/api/integrations/jira/worklog`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        domain,
        email,
        apiToken,
        issueKey,
        hours,
        startedDate,
        comment
      })
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || `Failed to log worklog to Jira issue ${issueKey} (${res.status})`);
    }

    return await res.json();
  }
};
