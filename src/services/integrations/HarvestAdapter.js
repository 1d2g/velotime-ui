// Harvest API Adapter

export const HarvestAdapter = {
  testConnection: async (token, accountId) => {
    if (!token || !accountId) throw new Error('Personal Access Token and Account ID are required');
    const res = await fetch('https://api.harvestapp.com/v2/users/me', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Harvest-Account-Id': accountId,
        'User-Agent': 'VeloTime (velotime.dg.tools)'
      }
    });
    if (!res.ok) {
      throw new Error(`Authentication failed (${res.status} ${res.statusText})`);
    }
    const user = await res.json();
    return {
      success: true,
      email: user.email,
      name: `${user.first_name} ${user.last_name}`,
      roles: user.roles
    };
  },

  fetchRemoteStructure: async (token, accountId) => {
    if (!token || !accountId) throw new Error('Credentials required');
    
    // Fetch active project assignments for current user
    const res = await fetch('https://api.harvestapp.com/v2/users/me/project_assignments', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Harvest-Account-Id': accountId,
        'User-Agent': 'VeloTime (velotime.dg.tools)'
      }
    });

    if (!res.ok) throw new Error('Failed to fetch Harvest projects');
    const data = await res.json();

    const projects = (data.project_assignments || []).map(pa => ({
      id: pa.project.id,
      name: pa.project.name,
      code: pa.project.code,
      clientName: pa.client.name,
      tasks: (pa.task_assignments || []).map(ta => ({
        id: ta.task.id,
        name: ta.task.name,
        billable: ta.billable
      }))
    }));

    return { projects };
  },

  pushTimeEntry: async ({ token, accountId, remoteProjectId, remoteTaskId, hours, spentDate, notes, projectName, taskName }) => {
    if (!token || !accountId) throw new Error('Harvest credentials are not configured');
    if (!remoteProjectId || !remoteTaskId) {
      throw new Error('Harvest requires both a mapped Project and Task ID');
    }
    
    const payload = {
      project_id: parseInt(remoteProjectId, 10),
      task_id: parseInt(remoteTaskId, 10),
      spent_date: spentDate || new Date().toISOString().split('T')[0],
      hours: parseFloat(hours),
      notes: notes || `${projectName || ''} - ${taskName || ''}`.trim() || 'Logged via VeloTime'
    };

    const res = await fetch('https://api.harvestapp.com/v2/time_entries', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Harvest-Account-Id': accountId,
        'User-Agent': 'VeloTime (velotime.dg.tools)',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      const errBody = await res.text();
      throw new Error(`Failed to push to Harvest (${res.status}): ${errBody}`);
    }
    return await res.json();
  }
};
