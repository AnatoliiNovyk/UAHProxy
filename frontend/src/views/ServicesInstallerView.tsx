import React, { useState, useEffect } from 'react';
import { DownloadCloud, Shield, CheckCircle, Terminal, RefreshCw } from 'lucide-react';
import { Language, translations } from '../i18n/translations';
import { Server } from '../types';
import { api } from '../services/api';

interface ServicesInstallerViewProps {
  lang: Language;
  servers: Server[];
  onRefresh: () => void;
}

export const ServicesInstallerView: React.FC<ServicesInstallerViewProps> = ({ lang, servers, onRefresh }) => {
  const t = translations[lang];
  const [selectedServerId, setSelectedServerId] = useState<number>(servers[0]?.id || 1);
  const [installingPackage, setInstallingPackage] = useState<string | null>(null);
  const [outputLogs, setOutputLogs] = useState<string>('');

  useEffect(() => {
    if (servers.length > 0 && !servers.some(s => s.id === selectedServerId)) {
      setSelectedServerId(servers[0].id);
    }
  }, [servers]);

  const services = [
    { name: 'haproxy', label: 'HAProxy (Premium Load Balancer)', desc: 'High-performance TCP/HTTP load balancer and proxy server', category: 'Proxy' },
    { name: 'nginx', label: 'Nginx (Web & Reverse Proxy)', desc: 'Web server, HTTP cache, and reverse proxy', category: 'Proxy' },
    { name: 'apache2', label: 'Apache HTTP Server', desc: 'Robust modular web server engine', category: 'Web' },
    { name: 'keepalived', label: 'Keepalived (VRRP High Availability)', desc: 'Provides Virtual IP failover and VRRP clustering', category: 'HA' },
    { name: 'prometheus-node-exporter', label: 'Prometheus Node Exporter', desc: 'Exposes hardware and OS metrics for Grafana', category: 'Monitoring' },
    { name: 'grafana', label: 'Grafana & Prometheus Dashboard', desc: 'Visual analytics and real-time operational dashboard', category: 'Monitoring' },
  ];

  const handleInstall = async (serviceName: string) => {
    setInstallingPackage(serviceName);
    setOutputLogs(`[UAProxy] Triggering installation of ${serviceName} on server ID ${selectedServerId}...\n`);
    try {
      const res = await api.installService(selectedServerId, serviceName);
      setOutputLogs(prev => prev + `[SUCCESS]: ${res.logs}\nPackage ${serviceName} fully provisioned.\n`);
      onRefresh();
    } catch (e: any) {
      setOutputLogs(prev => prev + `[ERROR]: Failed to install ${serviceName}: ${e.message}\n`);
    } finally {
      setInstallingPackage(null);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-white flex items-center space-x-2">
          <DownloadCloud className="w-6 h-6 text-cyan-400" />
          <span>1-Click Встановлювач Сервісів (Service Provisioning Wizard)</span>
        </h1>
        <p className="text-gray-400 text-xs mt-1">Автоматична інсталяція та налаштування HAProxy, Nginx, Apache, Keepalived та Prometheus Exporters</p>
      </div>

      <div className="glass-panel p-5 rounded-2xl flex items-center space-x-4 border border-gray-800">
        <label className="text-sm font-semibold text-gray-300">Оберіть Цільовий Сервер:</label>
        <select
          value={selectedServerId}
          onChange={(e) => setSelectedServerId(Number(e.target.value))}
          className="bg-gray-900 border border-gray-700 rounded-xl px-4 py-2 text-sm text-cyan-300 font-mono outline-none focus:border-cyan-400"
        >
          {servers.map((s) => (
            <option key={s.id} value={s.id}>
              {s.hostname} ({s.ip_address})
            </option>
          ))}
        </select>
      </div>

      {/* Services Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {services.map((svc) => (
          <div key={svc.name} className="glass-panel p-5 rounded-2xl border border-gray-800 flex flex-col justify-between hover:border-gray-700 transition">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-mono px-2 py-0.5 rounded bg-cyan-950 text-cyan-400 border border-cyan-800">
                  {svc.category}
                </span>
                <Shield className="w-4 h-4 text-gray-500" />
              </div>
              <h3 className="font-bold text-white text-base">{svc.label}</h3>
              <p className="text-gray-400 text-xs mt-1 leading-relaxed">{svc.desc}</p>
            </div>

            <button
              onClick={() => handleInstall(svc.name)}
              disabled={installingPackage === svc.name}
              className="mt-5 w-full py-2 px-3 rounded-xl bg-gray-800 hover:bg-cyan-500 hover:text-black font-semibold text-xs text-cyan-300 border border-gray-700 hover:border-cyan-400 transition flex items-center justify-center space-x-2"
            >
              {installingPackage === svc.name ? (
                <RefreshCw className="w-4 h-4 animate-spin text-cyan-400" />
              ) : (
                <DownloadCloud className="w-4 h-4" />
              )}
              <span>{installingPackage === svc.name ? 'Встановлюється...' : 'Встановити 1-Click'}</span>
            </button>
          </div>
        ))}
      </div>

      {/* Terminal Log Console */}
      {outputLogs && (
        <div className="glass-panel p-4 rounded-2xl border border-gray-800 bg-black/90 font-mono text-xs text-emerald-400 space-y-2">
          <div className="flex items-center space-x-2 text-gray-400 border-b border-gray-800 pb-2">
            <Terminal className="w-4 h-4 text-cyan-400" />
            <span>Installation Execution Console Output</span>
          </div>
          <pre className="whitespace-pre-wrap overflow-x-auto max-h-60 p-2">{outputLogs}</pre>
        </div>
      )}
    </div>
  );
};
