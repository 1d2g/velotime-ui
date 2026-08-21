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

  pushWorklog: async ({ domain, email, apiToken, issueKey, timeSpentSeconds, startedDate, comment }) => {
    if (!domain || !email || !apiToken || !issueKey) throw new Error('Missing Jira parameters');
    const cleanDomain = domain.replace(/^https?:\/\//, '').replace(/\/.*$/, '');
    const authHeader = 'Basic ' + btoa(`${email}:${apiToken}`);

    const started = startedDate ? new Date(startedDate).toISOString().replace(/Z$/, '+0000') : new Date().toISOString().replace(/Z$/, '+0000');

    const payload = {
      timeSpentSeconds: Math.round(timeSpentSeconds),
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
      throw new Error(`Failed to log worklog to Jira issue ${issueKey} (${res.status})`);
    }
    return await res.json();
  }
};
