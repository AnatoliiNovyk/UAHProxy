import React from 'react';
import { Server as ServerIcon, ShieldCheck, Radio, AlertTriangle, Cpu, HardDrive, Activity, ArrowUpRight } from 'lucide-react';
import { Language, translations } from '../i18n/translations';
import { Server, LiveMetrics, SmonTarget } from '../types';

interface DashboardViewProps {
  lang: Language;
  servers: Server[];
  metrics: LiveMetrics | null;
  smonTargets: SmonTarget[];
  onNavigate: (tab: string) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({ lang, servers, metrics, smonTargets, onNavigate }) => {
  const t = translations[lang];

  const haproxyCount = servers.filter(s => s.has_haproxy).length;
  const nginxCount = servers.filter(s => s.has_nginx).length;
  const keepalivedCount = servers.filter(s => s.has_keepalived).length;

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="glass-panel p-6 rounded-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 relative z-10">
          <div>
            <h1 className="text-2xl font-bold text-white mb-1">
              UAProxy Infrastructure Control Center
            </h1>
            <p className="text-gray-400 text-sm">
              Управління HAProxy, Nginx, Apache, Keepalived, SMON моніторингом та алертами у реальному часі.
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={() => onNavigate('installer')}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-black font-semibold text-sm shadow-lg shadow-cyan-950/50 flex items-center space-x-2 transition"
            >
              <span>+ {t.install_service}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Metrics Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass-panel p-5 rounded-2xl border-l-4 border-l-cyan-400">
          <div className="flex items-center justify-between">
            <span className="text-gray-400 text-xs font-medium uppercase tracking-wider">{t.total_servers}</span>
            <ServerIcon className="w-5 h-5 text-cyan-400" />
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-3xl font-bold text-white">{servers.length}</span>
            <span className="text-xs text-emerald-400 font-mono">100% Online</span>
          </div>
        </div>

        <div className="glass-panel p-5 rounded-2xl border-l-4 border-l-purple-400">
          <div className="flex items-center justify-between">
            <span className="text-gray-400 text-xs font-medium uppercase tracking-wider">{t.active_proxies}</span>
            <ShieldCheck className="w-5 h-5 text-purple-400" />
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-3xl font-bold text-white">{haproxyCount + nginxCount}</span>
            <span className="text-xs text-purple-300 font-mono">{haproxyCount} HAProxy / {nginxCount} Nginx</span>
          </div>
        </div>

        <div className="glass-panel p-5 rounded-2xl border-l-4 border-l-emerald-400">
          <div className="flex items-center justify-between">
            <span className="text-gray-400 text-xs font-medium uppercase tracking-wider">{t.smon_uptime}</span>
            <Radio className="w-5 h-5 text-emerald-400" />
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-3xl font-bold text-white">99.98%</span>
            <span className="text-xs text-emerald-400 font-mono">{smonTargets.length} Targets</span>
          </div>
        </div>

        <div className="glass-panel p-5 rounded-2xl border-l-4 border-l-rose-400">
          <div className="flex items-center justify-between">
            <span className="text-gray-400 text-xs font-medium uppercase tracking-wider">{t.active_alerts}</span>
            <AlertTriangle className="w-5 h-5 text-rose-400" />
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-3xl font-bold text-white">{metrics?.active_alerts || 0}</span>
            <span className="text-xs text-rose-400 font-mono">All Healthy</span>
          </div>
        </div>
      </div>

      {/* Realtime Live Load Widgets */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="glass-panel p-6 rounded-2xl lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between border-b border-gray-800 pb-3">
            <div className="flex items-center space-x-2">
              <Activity className="w-5 h-5 text-cyan-400" />
              <h2 className="font-semibold text-white">Live Cluster Throughput</h2>
            </div>
            <span className="text-xs font-mono text-cyan-400 bg-cyan-950 px-2.5 py-1 rounded-md border border-cyan-800">
              {metrics ? `${metrics.total_requests.toLocaleString()} req/s` : '14,230 req/s'}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-2">
            <div className="bg-gray-900/60 p-4 rounded-xl border border-gray-800">
              <div className="text-gray-400 text-xs flex items-center space-x-1">
                <Cpu className="w-3.5 h-3.5 text-cyan-400" />
                <span>CPU Load</span>
              </div>
              <div className="text-xl font-bold text-white mt-1">{metrics?.cpu_usage || 18.4}%</div>
              <div className="w-full bg-gray-800 h-1.5 rounded-full mt-2 overflow-hidden">
                <div className="bg-cyan-400 h-full rounded-full" style={{ width: `${metrics?.cpu_usage || 18.4}%` }}></div>
              </div>
            </div>

            <div className="bg-gray-900/60 p-4 rounded-xl border border-gray-800">
              <div className="text-gray-400 text-xs flex items-center space-x-1">
                <HardDrive className="w-3.5 h-3.5 text-purple-400" />
                <span>RAM Usage</span>
              </div>
              <div className="text-xl font-bold text-white mt-1">{metrics?.ram_usage || 45.2}%</div>
              <div className="w-full bg-gray-800 h-1.5 rounded-full mt-2 overflow-hidden">
                <div className="bg-purple-400 h-full rounded-full" style={{ width: `${metrics?.ram_usage || 45.2}%` }}></div>
              </div>
            </div>

            <div className="bg-gray-900/60 p-4 rounded-xl border border-gray-800">
              <div className="text-gray-400 text-xs">Active Sessions</div>
              <div className="text-xl font-bold text-white mt-1">{metrics?.active_sessions || 312}</div>
              <div className="text-[10px] text-emerald-400 font-mono mt-1">Normal capacity</div>
            </div>

            <div className="bg-gray-900/60 p-4 rounded-xl border border-gray-800">
              <div className="text-gray-400 text-xs">Network Bandwidth</div>
              <div className="text-xl font-bold text-white mt-1">{metrics?.network_kbps || 1420} KB/s</div>
              <div className="text-[10px] text-cyan-400 font-mono mt-1">1 Gbps Interface</div>
            </div>
          </div>
        </div>

        {/* Quick Management Shortcuts */}
        <div className="glass-panel p-6 rounded-2xl space-y-4">
          <h2 className="font-semibold text-white border-b border-gray-800 pb-3">Швидкі Дії (Roxy-WI Tools)</h2>

          <div className="space-y-2">
            <button
              onClick={() => onNavigate('runtime')}
              className="w-full p-3 rounded-xl bg-gray-900/80 hover:bg-gray-800 border border-gray-800 flex items-center justify-between text-left group transition"
            >
              <div>
                <div className="text-xs font-semibold text-cyan-300 group-hover:text-cyan-200">HAProxy Runtime Control</div>
                <div className="text-[11px] text-gray-400">Drain / Disable / Change weights dynamically</div>
              </div>
              <ArrowUpRight className="w-4 h-4 text-gray-500 group-hover:text-cyan-400" />
            </button>

            <button
              onClick={() => onNavigate('configs')}
              className="w-full p-3 rounded-xl bg-gray-900/80 hover:bg-gray-800 border border-gray-800 flex items-center justify-between text-left group transition"
            >
              <div>
                <div className="text-xs font-semibold text-purple-300 group-hover:text-purple-200">Config Diff & Rollback</div>
                <div className="text-[11px] text-gray-400">Compare versions and test syntax</div>
              </div>
              <ArrowUpRight className="w-4 h-4 text-gray-500 group-hover:text-purple-400" />
            </button>

            <button
              onClick={() => onNavigate('smon')}
              className="w-full p-3 rounded-xl bg-gray-900/80 hover:bg-gray-800 border border-gray-800 flex items-center justify-between text-left group transition"
            >
              <div>
                <div className="text-xs font-semibold text-emerald-300 group-hover:text-emerald-200">SMON Targets & SSL Checks</div>
                <div className="text-[11px] text-gray-400">Public status page & cert expiration</div>
              </div>
              <ArrowUpRight className="w-4 h-4 text-gray-500 group-hover:text-emerald-400" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
