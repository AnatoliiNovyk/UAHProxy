import axios from 'axios';
import { Server, ConfigHistory, HAProxyStat, SmonTarget, Cluster, AuditLog, LiveMetrics } from '../types';

const API_BASE = '/api/v1';

export const api = {
  // Auth
  login: async (username: string, password: string) => {
    const res = await axios.post(`${API_BASE}/auth/login`, { username, password });
    return res.data;
  },

  // Servers
  getServers: async (): Promise<Server[]> => {
    const res = await axios.get(`${API_BASE}/servers`);
    return res.data;
  },

  addServer: async (data: Partial<Server>): Promise<Server> => {
    const res = await axios.post(`${API_BASE}/servers`, data);
    return res.data;
  },

  testSsh: async (serverId: number) => {
    const res = await axios.post(`${API_BASE}/servers/${serverId}/test-ssh`);
    return res.data;
  },

  installService: async (serverId: number, serviceName: string) => {
    const res = await axios.post(`${API_BASE}/servers/${serverId}/install-service?service_name=${serviceName}`);
    return res.data;
  },

  // Configs & Wizard
  getConfig: async (serverId: number, serviceType: string) => {
    const res = await axios.get(`${API_BASE}/configs/${serverId}/${serviceType}`);
    return res.data;
  },

  saveConfig: async (serverId: number, serviceType: string, content: string, commitMessage?: string) => {
    const res = await axios.post(`${API_BASE}/configs/save`, {
      server_id: serverId,
      service_type: serviceType,
      content,
      commit_message: commitMessage
    });
    return res.data;
  },

  validateConfig: async (serviceType: string, content: string) => {
    const res = await axios.post(`${API_BASE}/configs/validate`, {
      service_type: serviceType,
      content
    });
    return res.data;
  },

  reloadService: async (serverId: number, serviceType: string) => {
    const res = await axios.post(`${API_BASE}/configs/reload?server_id=${serverId}&service_type=${serviceType}`);
    return res.data;
  },

  generateHAProxySnippet: async (data: any) => {
    const res = await axios.post(`${API_BASE}/configs/wizard/haproxy`, data);
    return res.data;
  },

  generateNginxSnippet: async (data: any) => {
    const res = await axios.post(`${API_BASE}/configs/wizard/nginx`, data);
    return res.data;
  },

  syncConfigToSlaves: async (data: { master_server_id: number; slave_server_ids: number[]; service_type: string; auto_reload?: boolean }) => {
    const res = await axios.post(`${API_BASE}/configs/sync-slaves`, data);
    return res.data;
  },

  getConfigHistory: async (serverId: number, serviceType: string): Promise<ConfigHistory[]> => {
    const res = await axios.get(`${API_BASE}/configs/${serverId}/${serviceType}/history`);
    return res.data;
  },

  // Git Integration
  getGitCommits: async () => {
    const res = await axios.get(`${API_BASE}/git/commits`);
    return res.data;
  },

  saveGitSettings: async (settings: any) => {
    const res = await axios.post(`${API_BASE}/git/settings`, settings);
    return res.data;
  },

  // HAProxy Runtime
  getRuntimeStats: async (serverId: number): Promise<{ server_id: number; stats: HAProxyStat[] }> => {
    const res = await axios.get(`${API_BASE}/runtime/${serverId}/stats`);
    return res.data;
  },

  executeRuntimeAction: async (serverId: number, backendName: string, serverName: string, action: string, weight: number = 100) => {
    const res = await axios.post(`${API_BASE}/runtime/action`, {
      server_id: serverId,
      backend_name: backendName,
      server_name: serverName,
      action,
      weight
    });
    return res.data;
  },

  getStickTables: async (serverId: number) => {
    const res = await axios.get(`${API_BASE}/runtime/${serverId}/tables`);
    return res.data;
  },

  clearStickTableKey: async (serverId: number, tableName: string, key: string) => {
    const res = await axios.post(`${API_BASE}/runtime/${serverId}/tables/clear?table_name=${tableName}&key=${key}`);
    return res.data;
  },

  getMaps: async (serverId: number) => {
    const res = await axios.get(`${API_BASE}/runtime/${serverId}/maps`);
    return res.data;
  },

  updateMapEntry: async (serverId: number, mapName: string, key: string, value: string, action: string = 'add') => {
    const res = await axios.post(`${API_BASE}/runtime/maps/update`, {
      server_id: serverId,
      map_name: mapName,
      key,
      value,
      action
    });
    return res.data;
  },

  updateMaxconn: async (serverId: number, targetType: string, targetName: string | null, maxconn: number) => {
    const res = await axios.post(`${API_BASE}/runtime/maxconn`, {
      server_id: serverId,
      target_type: targetType,
      target_name: targetName,
      maxconn
    });
    return res.data;
  },

  // SMON Monitoring
  getSmonTargets: async (): Promise<SmonTarget[]> => {
    const res = await axios.get(`${API_BASE}/smon/targets`);
    return res.data;
  },

  createSmonTarget: async (target: Partial<SmonTarget>): Promise<SmonTarget> => {
    const res = await axios.post(`${API_BASE}/smon/targets`, target);
    return res.data;
  },

  // Public Status Page
  getPublicStatusPage: async () => {
    const res = await axios.get(`${API_BASE}/public/status-page`);
    return res.data;
  },

  // Keepalived VRRP Clusters
  getClusters: async (): Promise<Cluster[]> => {
    const res = await axios.get(`${API_BASE}/clusters`);
    return res.data;
  },

  createCluster: async (cluster: Partial<Cluster>): Promise<Cluster> => {
    const res = await axios.post(`${API_BASE}/clusters`, cluster);
    return res.data;
  },

  generateClusterConfigs: async (data: any) => {
    const res = await axios.post(`${API_BASE}/clusters/wizard`, data);
    return res.data;
  },

  deployCluster: async (clusterId: number) => {
    const res = await axios.post(`${API_BASE}/clusters/${clusterId}/deploy`);
    return res.data;
  },

  failoverClusterTest: async (clusterId: number) => {
    const res = await axios.post(`${API_BASE}/clusters/${clusterId}/failover-test`);
    return res.data;
  },

  // SSL Management
  getCertificates: async (serverId: number) => {
    const res = await axios.get(`${API_BASE}/ssl/${serverId}/certificates`);
    return res.data;
  },

  issueLetsEncrypt: async (data: { server_id: number; domain: string; email: string; alt_names?: string[]; challenge_type?: string }) => {
    const res = await axios.post(`${API_BASE}/ssl/issue-letsencrypt`, data);
    return res.data;
  },

  uploadCustomCert: async (data: { server_id: number; domain: string; cert_content: string; key_content: string }) => {
    const res = await axios.post(`${API_BASE}/ssl/upload-custom`, data);
    return res.data;
  },

  renewCertificate: async (serverId: number, domain: string) => {
    const res = await axios.post(`${API_BASE}/ssl/renew`, { server_id: serverId, domain });
    return res.data;
  },

  // WAF Management
  getWafStatus: async () => {
    const res = await axios.get(`${API_BASE}/waf/status`);
    return res.data;
  },

  getWafEvents: async () => {
    const res = await axios.get(`${API_BASE}/waf/events`);
    return res.data;
  },

  updateWafConfig: async (serverId: number, mode: string, rules: Record<string, boolean>) => {
    const res = await axios.post(`${API_BASE}/waf/config`, {
      server_id: serverId,
      mode,
      rules
    });
    return res.data;
  },

  // Audits & Alerts
  getAuditLogs: async (): Promise<AuditLog[]> => {
    const res = await axios.get(`${API_BASE}/audit`);
    return res.data;
  },

  getAlertChannels: async () => {
    const res = await axios.get(`${API_BASE}/alerts/channels`);
    return res.data;
  },

  createAlertChannel: async (data: { name: string; channel_type: string; config_json: string }) => {
    const res = await axios.post(`${API_BASE}/alerts/channels`, data);
    return res.data;
  },

  sendTestAlert: async (channelType: string, configJson: string) => {
    const res = await axios.post(`${API_BASE}/alerts/test?channel_type=${channelType}&config_json=${encodeURIComponent(configJson)}`);
    return res.data;
  }
};

export const connectWebSocket = (onMessage: (metrics: LiveMetrics) => void) => {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const wsUrl = `${protocol}//${window.location.host}/ws/metrics`;
  const socket = new WebSocket(wsUrl);

  socket.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      if (data.type === 'METRICS_UPDATE') {
        onMessage(data.metrics);
      }
    } catch (e) {
      console.error('WS parse error', e);
    }
  };

  return () => socket.close();
};
