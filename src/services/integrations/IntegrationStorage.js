// LocalStorage & State storage for integration credentials, project mappings, & sync logs

const STORAGE_KEY_CONFIG = 'velotime_integrations_config';
const STORAGE_KEY_LOGS = 'velotime_integrations_logs';
const STORAGE_KEY_MAPPINGS = 'velotime_integrations_mappings';

export const IntegrationStorage = {
  getConfig: () => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_CONFIG);
      return raw ? JSON.parse(raw) : {
        toggl: { enabled: false, apiKey: '', workspaceId: '', autoSync: true, lastSynced: null, remoteProjects: [] },
        harvest: { enabled: false, token: '', accountId: '', autoSync: true, lastSynced: null, remoteProjects: [] },
        jira: { enabled: false, domain: '', email: '', apiToken: '', autoSync: true, lastSynced: null, remoteProjects: [] },
        linear: { enabled: false, apiKey: '', autoSync: true, lastSynced: null },
      };
    } catch (e) {
      return {};
    }
  },

  saveConfig: (config) => {
    try {
      localStorage.setItem(STORAGE_KEY_CONFIG, JSON.stringify(config));
    } catch (e) {
      console.error('Failed to save integration config', e);
    }
  },

  updateProviderConfig: (provider, partial) => {
    const all = IntegrationStorage.getConfig();
    all[provider] = { ...all[provider], ...partial };
    IntegrationStorage.saveConfig(all);
    return all[provider];
  },

  getMappings: () => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_MAPPINGS);
      return raw ? JSON.parse(raw) : {};
    } catch (e) {
      return {};
    }
  },

  saveMappings: (mappings) => {
    try {
      localStorage.setItem(STORAGE_KEY_MAPPINGS, JSON.stringify(mappings));
    } catch (e) {
      console.error('Failed to save project mappings', e);
    }
  },

  setProjectMapping: (localProjectId, provider, mappingData) => {
    const all = IntegrationStorage.getMappings();
    if (!all[localProjectId]) all[localProjectId] = {};
    all[localProjectId][provider] = { ...all[localProjectId][provider], ...mappingData };
    IntegrationStorage.saveMappings(all);
    return all;
  },

  getLogs: () => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_LOGS);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      return [];
    }
  },

  addLog: (log) => {
    try {
      const logs = IntegrationStorage.getLogs();
      const newLogs = [{ id: Date.now().toString(), timestamp: new Date().toISOString(), ...log }, ...logs].slice(0, 50);
      localStorage.setItem(STORAGE_KEY_LOGS, JSON.stringify(newLogs));
    } catch (e) {}
  }
};
