// Toggl Track API Adapter

export const TogglAdapter = {
  testConnection: async (apiKey) => {
    if (!apiKey) throw new Error('API Key is required');
    const authHeader = 'Basic ' + btoa(apiKey + ':api_token');
    const res = await fetch('https://api.track.toggl.com/api/v9/me', {
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/json'
      }
    });
    if (!res.ok) {
      throw new Error(`Authentication failed (${res.status} ${res.statusText})`);
    }
    const user = await res.json();
    return {
      success: true,
      email: user.email,
      defaultWorkspaceId: user.default_workspace_id,
      fullname: user.fullname
    };
  },

  pushTimeEntry: async ({ apiKey, workspaceId, description, durationHours, date, projectName, taskName }) => {
    if (!apiKey) throw new Error('Toggl API Key is not configured');
    const authHeader = 'Basic ' + btoa(apiKey + ':api_token');
    
    // Convert date + hours to ISO start & duration in seconds
    const startDate = new Date(date);
    startDate.setHours(9, 0, 0, 0);
    const durationSeconds = Math.round(durationHours * 3600);

    const payload = {
      description: description || `${projectName || ''} - ${taskName || 'Time Entry'}`.trim(),
      start: startDate.toISOString(),
      duration: durationSeconds,
      workspace_id: parseInt(workspaceId, 10),
      created_with: 'VeloTime Speed Layer'
    };

    const res = await fetch(`https://api.track.toggl.com/api/v9/workspaces/${workspaceId}/time_entries`, {
      method: 'POST',
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      throw new Error(`Failed to push to Toggl (${res.status})`);
    }
    return await res.json();
  }
};
