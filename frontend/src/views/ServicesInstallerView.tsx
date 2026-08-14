import React, { useState, useEffect } from 'react';
import { DownloadCloud, Shield, CheckCircle, Terminal, RefreshCw, Server as ServerIcon, Plus } from 'lucide-react';
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
  const [selectedServerId, setSelectedServerId] = useState<number>(servers[0]?.id || 0);
  const [installingPackage, setInstallingPackage] = useState<string | null>(null);
  const [outputLogs, setOutputLogs] = useState<string>('');

  useEffect(() => {
    if (servers.length > 0) {
      if (!servers.some(s => s.id === selectedServerId)) {
        setSelectedServerId(servers[0].id);
      }
    } else {
      setSelectedServerId(0);
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
    if (!selectedServerId || servers.length === 0) {
      alert('Будь ласка, оберіть підключений сервер для інсталяції.');
      return;
    }

    setInstallingPackage(serviceName);
    const targetServer = servers.find(s => s.id === selectedServerId);
    setOutputLogs(`[UAProxy] Triggering installation of ${serviceName} on ${targetServer?.hostname || `Server ID ${selectedServerId}`}...\n`);
    try {
      const res = await api.installService(selectedServerId, serviceName);
      setOutputLogs(prev => prev + `[SUCCESS]: ${res.logs}\nPackage ${serviceName} fully provisioned.\n`);
      onRefresh();
    } catch (e: any) {
      setOutputLogs(prev => prev + `[ERROR]: Failed to install ${serviceName}: ${e.response?.data?.detail || e.message}\n`);
    } finally {
      setInstallingPackage(null);
    }
  };

  if (servers.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center space-x-2">
            <DownloadCloud className="w-6 h-6 text-cyan-400" />
            <span>1-Click Встановлювач Сервісів (Service Provisioning Wizard)</span>
          </h1>
          <p className="text-gray-400 text-xs mt-1">Автоматична інсталяція та налаштування HAProxy, Nginx, Apache, Keepalived та Prometheus Exporters</p>
        </div>

        <div className="glass-panel p-12 rounded-2xl border border-gray-800 text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-cyan-950/60 border border-cyan-800/80 mx-auto flex items-center justify-center text-cyan-400">
            <ServerIcon className="w-8 h-8" />
          </div>
          <div className="space-y-1 max-w-md mx-auto">
            <h3 className="font-bold text-white text-base">Немає підключених серверів</h3>
            <p className="text-xs text-gray-400">
              Щоб встановлювати HAProxy, Nginx або Keepalived в 1 клік, спочатку підключіть хоча б один сервер у вкладці "Сервери".
            </p>
          </div>
        </div>
      </div>
    );
  }

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
          className="bg-gray-900 border border-gray-700 rounded-xl px-4 py-2 text-sm text-cyan-300 outline-none font-mono focus:border-cyan-400"
        >
          {servers.map((s) => (
            <option key={s.id} value={s.id}>
              {s.hostname} ({s.ip_address}) - [{s.ssh_status || 'UNCHECKED'}]
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {services.map((svc) => (
          <div key={svc.name} className="glass-panel p-6 rounded-2xl border border-gray-800 space-y-4 flex flex-col justify-between hover:border-cyan-800/60 transition">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-300 border border-cyan-800 uppercase font-bold">
                  {svc.category}
                </span>
              </div>
              <h3 className="font-bold text-white text-base">{svc.label}</h3>
              <p className="text-xs text-gray-400 leading-relaxed">{svc.desc}</p>
            </div>

            <button
              onClick={() => handleInstall(svc.name)}
              disabled={installingPackage === svc.name || selectedServerId === 0}
              className="w-full py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 disabled:opacity-50 text-black font-semibold text-xs rounded-xl shadow-lg shadow-cyan-950/40 flex items-center justify-center space-x-2 transition"
            >
              {installingPackage === svc.name ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Встановлення пакету...</span>
                </>
              ) : (
                <>
                  <DownloadCloud className="w-4 h-4" />
                  <span>Встановити на Сервер</span>
                </>
              )}
            </button>
          </div>
        ))}
      </div>

      {outputLogs && (
        <div className="glass-panel p-5 rounded-2xl border border-gray-800 space-y-2">
          <div className="flex items-center space-x-2 text-xs font-mono text-cyan-400 font-semibold">
            <Terminal className="w-4 h-4" />
            <span>Журнал Виконання Інсталяції (Live Provisioning Log)</span>
          </div>
          <pre className="p-4 bg-gray-950 rounded-xl font-mono text-xs text-gray-300 overflow-x-auto max-h-60 whitespace-pre-wrap">
            {outputLogs}
          </pre>
        </div>
      )}
    </div>
  );
};
