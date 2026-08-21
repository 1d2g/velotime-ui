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

  pushTimeEntry: async ({ token, accountId, projectId, taskId, hours, spentDate, notes }) => {
    if (!token || !accountId) throw new Error('Harvest credentials are not configured');
    
    const payload = {
      project_id: projectId,
      task_id: taskId,
      spent_date: spentDate,
      hours: parseFloat(hours),
      notes: notes || 'Logged via VeloTime'
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
      throw new Error(`Failed to push to Harvest (${res.status})`);
    }
    return await res.json();
  }
};
