// Central Integration Dispatcher & Background Sync Queue

import { IntegrationStorage } from './IntegrationStorage';
import { TogglAdapter } from './TogglAdapter';
import { HarvestAdapter } from './HarvestAdapter';
import { JiraAdapter } from './JiraAdapter';

export const IntegrationManager = {
  getConfig: IntegrationStorage.getConfig,
  saveConfig: IntegrationStorage.saveConfig,
  updateProviderConfig: IntegrationStorage.updateProviderConfig,
  getMappings: IntegrationStorage.getMappings,
  setProjectMapping: IntegrationStorage.setProjectMapping,
  getLogs: IntegrationStorage.getLogs,

  testProvider: async (providerKey, credentials) => {
    if (providerKey === 'toggl') {
      return await TogglAdapter.testConnection(credentials.apiKey);
    } else if (providerKey === 'harvest') {
      return await HarvestAdapter.testConnection(credentials.token, credentials.accountId);
    } else if (providerKey === 'jira') {
      return await JiraAdapter.testConnection(credentials.domain, credentials.email, credentials.apiToken);
    }
    throw new Error('Unsupported provider');
  },

  fetchRemoteStructure: async (providerKey) => {
    const config = IntegrationStorage.getConfig();
    if (providerKey === 'toggl' && config.toggl?.apiKey) {
      const data = await TogglAdapter.fetchRemoteStructure(config.toggl.apiKey, config.toggl.workspaceId);
      IntegrationStorage.updateProviderConfig('toggl', { remoteProjects: data.projects, remoteWorkspaces: data.workspaces });
      return data;
    } else if (providerKey === 'harvest' && config.harvest?.token && config.harvest?.accountId) {
      const data = await HarvestAdapter.fetchRemoteStructure(config.harvest.token, config.harvest.accountId);
      IntegrationStorage.updateProviderConfig('harvest', { remoteProjects: data.projects });
      return data;
    } else if (providerKey === 'jira' && config.jira?.domain && config.jira?.email && config.jira?.apiToken) {
      const data = await JiraAdapter.fetchRemoteStructure(config.jira.domain, config.jira.email, config.jira.apiToken);
      IntegrationStorage.updateProviderConfig('jira', { remoteProjects: data.projects });
      return data;
    }
    return { projects: [] };
  },

  // Dry-run test to verify full end-to-end send & receipt
  sendDryRunTestEntry: async (providerKey) => {
    const config = IntegrationStorage.getConfig();
    const testDate = new Date().toISOString().split('T')[0];
    const testHours = 0.1; // 6 minutes test entry

    if (providerKey === 'toggl') {
      if (!config.toggl?.apiKey || !config.toggl?.workspaceId) throw new Error('Toggl not configured');
      const res = await TogglAdapter.pushTimeEntry({
        apiKey: config.toggl.apiKey,
        workspaceId: config.toggl.workspaceId,
        description: 'VeloTime Integration Verification Ping (Test)',
        durationHours: testHours,
        date: testDate
      });
      IntegrationStorage.addLog({ provider: 'Toggl Track', status: 'success', message: `Verification ping successful (Entry ID: ${res.id})` });
      return { success: true, entryId: res.id, message: `Sample 0.1h entry created in Toggl Track workspace ${config.toggl.workspaceId}` };
    }

    if (providerKey === 'harvest') {
      if (!config.harvest?.token || !config.harvest?.accountId) throw new Error('Harvest not configured');
      // Look for first available mapped project or remote project
      const remote = config.harvest?.remoteProjects?.[0];
      const pId = remote?.id;
      const tId = remote?.tasks?.[0]?.id;
      if (!pId || !tId) {
        throw new Error('Please fetch Harvest projects or configure a mapped project first.');
      }
      const res = await HarvestAdapter.pushTimeEntry({
        token: config.harvest.token,
        accountId: config.harvest.accountId,
        remoteProjectId: pId,
        remoteTaskId: tId,
        hours: testHours,
        spentDate: testDate,
        notes: 'VeloTime Integration Verification Ping (Test)'
      });
      IntegrationStorage.addLog({ provider: 'Harvest', status: 'success', message: `Verification ping successful (Entry ID: ${res.id})` });
      return { success: true, entryId: res.id, message: `Sample 0.1h entry created in Harvest under project "${remote.name}"` };
    }

    if (providerKey === 'jira') {
      throw new Error('To test Jira, enter a valid Issue Key (e.g. PROJ-123) in the Project Mapping tab.');
    }
  },

  // Called automatically on cell save
  onTimeEntrySaved: async (entry, project, task) => {
    const config = IntegrationStorage.getConfig();
    const mappings = IntegrationStorage.getMappings();
    const projMapping = (project?.id && mappings[project.id]) || {};

    // 1. Toggl Sync
    if (config.toggl?.enabled && config.toggl?.autoSync && config.toggl?.apiKey && config.toggl?.workspaceId) {
      try {
        const remoteProjId = projMapping.toggl?.remoteProjectId || null;
        await TogglAdapter.pushTimeEntry({
          apiKey: config.toggl.apiKey,
          workspaceId: config.toggl.workspaceId,
          remoteProjectId: remoteProjId,
          description: `${project?.name || ''} - ${task?.name || ''}`.trim(),
          durationHours: entry.hours || 0,
          date: entry.date,
          projectName: project?.name,
          taskName: task?.name
        });
        IntegrationStorage.updateProviderConfig('toggl', { lastSynced: new Date().toISOString() });
        IntegrationStorage.addLog({ provider: 'Toggl Track', status: 'success', message: `Synced ${entry.hours}h for ${project?.name || 'Task'}` });
      } catch (err) {
        console.error('Toggl sync failed', err);
        IntegrationStorage.addLog({ provider: 'Toggl Track', status: 'error', message: err.message });
      }
    }

    // 2. Harvest Sync
    if (config.harvest?.enabled && config.harvest?.autoSync && config.harvest?.token && config.harvest?.accountId) {
      try {
        const remoteProjId = projMapping.harvest?.remoteProjectId;
        const remoteTaskId = projMapping.harvest?.remoteTaskId;
        
        if (remoteProjId && remoteTaskId) {
          await HarvestAdapter.pushTimeEntry({
            token: config.harvest.token,
            accountId: config.harvest.accountId,
            remoteProjectId: remoteProjId,
            remoteTaskId: remoteTaskId,
            hours: entry.hours || 0,
            spentDate: new Date(entry.date).toISOString().split('T')[0],
            notes: `${project?.name || ''} - ${task?.name || ''}`.trim(),
            projectName: project?.name,
            taskName: task?.name
          });
          IntegrationStorage.updateProviderConfig('harvest', { lastSynced: new Date().toISOString() });
          IntegrationStorage.addLog({ provider: 'Harvest', status: 'success', message: `Synced ${entry.hours}h for ${project?.name || 'Task'}` });
        }
      } catch (err) {
        console.error('Harvest sync failed', err);
        IntegrationStorage.addLog({ provider: 'Harvest', status: 'error', message: err.message });
      }
    }

    // 3. Jira Sync
    if (config.jira?.enabled && config.jira?.autoSync && config.jira?.domain && config.jira?.email && config.jira?.apiToken) {
      try {
        const issueKey = projMapping.jira?.issueKey || task?.name;
        if (issueKey && /^[A-Z0-9]+-[0-9]+$/i.test(issueKey.trim())) {
          await JiraAdapter.pushWorklog({
            domain: config.jira.domain,
            email: config.jira.email,
            apiToken: config.jira.apiToken,
            issueKey: issueKey.trim().toUpperCase(),
            hours: entry.hours || 0,
            startedDate: entry.date,
            comment: `Logged via VeloTime for ${project?.name || 'Project'}`
          });
          IntegrationStorage.updateProviderConfig('jira', { lastSynced: new Date().toISOString() });
          IntegrationStorage.addLog({ provider: 'Jira Cloud', status: 'success', message: `Worklog posted to ${issueKey.toUpperCase()} (${entry.hours}h)` });
        }
      } catch (err) {
        console.error('Jira sync failed', err);
        IntegrationStorage.addLog({ provider: 'Jira Cloud', status: 'error', message: err.message });
      }
    }
  }
};
