export interface Server {
  id: number;
  hostname: string;
  ip_address: string;
  ssh_port: number;
  ssh_username: string;
  ssh_password?: string;
  ssh_key?: string;
  has_haproxy: boolean;
  has_nginx: boolean;
  has_apache: boolean;
  has_keepalived: boolean;
  has_exporter: boolean;
  ssh_status?: string;
  ssh_error_message?: string;
  last_tested_at?: string;
  created_at: string;
}

export interface ConfigHistory {
  id: number;
  server_id: number;
  service_type: string;
  config_hash: string;
  version_number: number;
  commit_message?: string;
  git_synced: boolean;
  created_at: string;
}

export interface HAProxyStat {
  pxname: string;
  svname: string;
  status: string;
  weight: string;
  scur: string;
  smax: string;
  slim: string;
}

export interface SmonTarget {
  id: number;
  name: string;
  target_type: string;
  host_or_url: string;
  port?: number;
  check_interval: number;
  expected_status_code: number;
  ssl_warn_days: number;
  is_active: boolean;
  created_at: string;
  latest_status?: string;
  latest_response_time?: number;
  uptime_percentage?: number;
}

export interface Cluster {
  id: number;
  name: string;
  virtual_ip: string;
  router_id: number;
  master_server_id: number;
  slave_server_id: number;
  interface: string;
  state: string;
  active_node?: string;
  created_at: string;
}

export interface AuditLog {
  id: number;
  username?: string;
  action: string;
  resource_type: string;
  resource_id?: string;
  client_ip?: string;
  details?: string;
  timestamp: string;
}

export interface LiveMetrics {
  total_requests: number;
  active_sessions: number;
  cpu_usage: number;
  ram_usage: number;
  network_kbps: number;
  active_alerts: number;
}
