// Central Integration Dispatcher & Background Sync Queue

import { IntegrationStorage } from './IntegrationStorage';
import { TogglAdapter } from './TogglAdapter';
import { HarvestAdapter } from './HarvestAdapter';
import { JiraAdapter } from './JiraAdapter';

export const IntegrationManager = {
  getConfig: IntegrationStorage.getConfig,
  saveConfig: IntegrationStorage.saveConfig,
  updateProviderConfig: IntegrationStorage.updateProviderConfig,
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

  // Called automatically on cell save
  onTimeEntrySaved: async (entry, project, task) => {
    const config = IntegrationStorage.getConfig();

    // 1. Toggl Sync
    if (config.toggl?.enabled && config.toggl?.autoSync && config.toggl?.apiKey && config.toggl?.workspaceId) {
      try {
        await TogglAdapter.pushTimeEntry({
          apiKey: config.toggl.apiKey,
          workspaceId: config.toggl.workspaceId,
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
        await HarvestAdapter.pushTimeEntry({
          token: config.harvest.token,
          accountId: config.harvest.accountId,
          projectId: config.harvest.defaultProjectId || 1,
          taskId: config.harvest.defaultTaskId || 1,
          hours: entry.hours || 0,
          spentDate: new Date(entry.date).toISOString().split('T')[0],
          notes: `${project?.name || ''} - ${task?.name || ''}`.trim()
        });
        IntegrationStorage.updateProviderConfig('harvest', { lastSynced: new Date().toISOString() });
        IntegrationStorage.addLog({ provider: 'Harvest', status: 'success', message: `Synced ${entry.hours}h for ${project?.name || 'Task'}` });
      } catch (err) {
        console.error('Harvest sync failed', err);
        IntegrationStorage.addLog({ provider: 'Harvest', status: 'error', message: err.message });
      }
    }
  }
};
