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

  fetchRemoteStructure: async (apiKey, workspaceId) => {
    if (!apiKey) throw new Error('API Key is required');
    const authHeader = 'Basic ' + btoa(apiKey + ':api_token');
    
    // Fetch workspaces
    const wsRes = await fetch('https://api.track.toggl.com/api/v9/workspaces', {
      headers: { 'Authorization': authHeader }
    });
    if (!wsRes.ok) throw new Error('Failed to fetch Toggl workspaces');
    const workspaces = await wsRes.json();
    const wsId = workspaceId || (workspaces[0] ? workspaces[0].id : null);

    let projects = [];
    if (wsId) {
      const pRes = await fetch(`https://api.track.toggl.com/api/v9/workspaces/${wsId}/projects`, {
        headers: { 'Authorization': authHeader }
      });
      if (pRes.ok) {
        projects = await pRes.json();
      }
    }

    return {
      workspaces: workspaces.map(w => ({ id: w.id, name: w.name })),
      projects: (projects || []).map(p => ({ id: p.id, name: p.name, clientId: p.client_id, active: p.active }))
    };
  },

  pushTimeEntry: async ({ apiKey, workspaceId, remoteProjectId, description, durationHours, date, projectName, taskName }) => {
    if (!apiKey) throw new Error('Toggl API Key is not configured');
    const authHeader = 'Basic ' + btoa(apiKey + ':api_token');
    
    const startDate = new Date(date);
    startDate.setHours(9, 0, 0, 0);
    const durationSeconds = Math.max(60, Math.round(durationHours * 3600));

    const payload = {
      description: description || `${projectName || ''} - ${taskName || 'Time Entry'}`.trim(),
      start: startDate.toISOString(),
      duration: durationSeconds,
      workspace_id: parseInt(workspaceId, 10),
      created_with: 'VeloTime Speed Layer'
    };

    if (remoteProjectId && remoteProjectId !== 'none') {
      payload.project_id = parseInt(remoteProjectId, 10);
    }

    const res = await fetch(`https://api.track.toggl.com/api/v9/workspaces/${workspaceId}/time_entries`, {
      method: 'POST',
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      const errBody = await res.text();
      throw new Error(`Failed to push to Toggl (${res.status}): ${errBody}`);
    }
    return await res.json();
  }
};
