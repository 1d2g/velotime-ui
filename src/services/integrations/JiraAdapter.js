// Jira Cloud REST API Adapter

export const JiraAdapter = {
  testConnection: async (domain, email, apiToken) => {
    if (!domain || !email || !apiToken) throw new Error('Domain, Email, and API Token are required');
    const cleanDomain = domain.replace(/^https?:\/\//, '').replace(/\/.*$/, '');
    const authHeader = 'Basic ' + btoa(`${email}:${apiToken}`);

    const res = await fetch(`https://${cleanDomain}/rest/api/3/myself`, {
      headers: {
        'Authorization': authHeader,
        'Accept': 'application/json'
      }
    });

    if (!res.ok) {
      throw new Error(`Jira Authentication failed (${res.status} ${res.statusText})`);
    }
    const user = await res.json();
    return {
      success: true,
      displayName: user.displayName,
      emailAddress: user.emailAddress,
      accountId: user.accountId
    };
  },

  fetchRemoteStructure: async (domain, email, apiToken) => {
    if (!domain || !email || !apiToken) throw new Error('Missing Jira credentials');
    const cleanDomain = domain.replace(/^https?:\/\//, '').replace(/\/.*$/, '');
    const authHeader = 'Basic ' + btoa(`${email}:${apiToken}`);

    // Fetch projects
    const pRes = await fetch(`https://${cleanDomain}/rest/api/3/project`, {
      headers: { 'Authorization': authHeader, 'Accept': 'application/json' }
    });
    
    let projects = [];
    if (pRes.ok) {
      projects = await pRes.json();
    }

    return {
      projects: (projects || []).map(p => ({ id: p.id, key: p.key, name: p.name }))
    };
  },

  pushWorklog: async ({ domain, email, apiToken, issueKey, hours, startedDate, comment }) => {
    if (!domain || !email || !apiToken || !issueKey) throw new Error('Missing Jira parameters (ensure Issue Key is mapped)');
    const cleanDomain = domain.replace(/^https?:\/\//, '').replace(/\/.*$/, '');
    const authHeader = 'Basic ' + btoa(`${email}:${apiToken}`);

    const timeSpentSeconds = Math.max(60, Math.round(hours * 3600));
    const started = startedDate ? new Date(startedDate).toISOString().replace(/Z$/, '+0000') : new Date().toISOString().replace(/Z$/, '+0000');

    const payload = {
      timeSpentSeconds,
      started,
      comment: {
        type: 'doc',
        version: 1,
        content: [
          {
            type: 'paragraph',
            content: [
              {
                type: 'text',
                text: comment || 'Logged via VeloTime Speed Layer'
              }
            ]
          }
        ]
      }
    };

    const res = await fetch(`https://${cleanDomain}/rest/api/3/issue/${issueKey}/worklog`, {
      method: 'POST',
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      const errBody = await res.text();
      throw new Error(`Failed to log worklog to Jira issue ${issueKey} (${res.status}): ${errBody}`);
    }
    return await res.json();
  }
};
