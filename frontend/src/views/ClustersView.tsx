import React, { useState, useEffect } from 'react';
import { Network, Plus, Shield, CheckCircle2, Play, RefreshCw, AlertTriangle, Layers, Server, Zap, Activity } from 'lucide-react';
import { Language, translations } from '../i18n/translations';
import { Server as ServerType, Cluster } from '../types';
import { api } from '../services/api';

interface ClustersViewProps {
  lang: Language;
  servers: ServerType[];
}

export const ClustersView: React.FC<ClustersViewProps> = ({ lang, servers }) => {
  const t = translations[lang];
  const [clusters, setClusters] = useState<Cluster[]>([]);
  const [showWizard, setShowWizard] = useState(false);
  const [loading, setLoading] = useState(false);
  const [deploying, setDeploying] = useState<number | null>(null);
  const [failoverMsg, setFailoverMsg] = useState<string | null>(null);

  // Wizard form state
  const [clusterName, setClusterName] = useState('HA-Production-VIP');
  const [virtualIp, setVirtualIp] = useState('192.168.1.250');
  const [routerId, setRouterId] = useState(51);
  const [masterServerId, setMasterServerId] = useState<number>(servers[0]?.id || 1);
  const [backupServerId, setBackupServerId] = useState<number>(servers[1]?.id || 2);
  const [networkInterface, setNetworkInterface] = useState('eth0');
  const [checkScript, setCheckScript] = useState('killall -0 haproxy');
  const [generatedConfigs, setGeneratedConfigs] = useState<{ master_config: string; backup_config: string } | null>(null);

  useEffect(() => {
    loadClusters();
  }, []);

  const loadClusters = async () => {
    try {
      const res = await api.getClusters();
      setClusters(res);
    } catch (e) {
      console.error(e);
    }
  };

  const handleGenerateConfigs = async () => {
    try {
      const res = await api.generateClusterConfigs({
        name: clusterName,
        virtual_ip: virtualIp,
        router_id: Number(routerId),
        interface: networkInterface,
        master_server_id: masterServerId,
        backup_server_id: backupServerId,
        check_script: checkScript
      });
      setGeneratedConfigs(res);
    } catch (e: any) {
      alert(`Error generating VRRP configs: ${e.message}`);
    }
  };

  const handleCreateAndDeploy = async () => {
    setLoading(true);
    try {
      const newCluster = await api.createCluster({
        name: clusterName,
        virtual_ip: virtualIp,
        router_id: Number(routerId),
        master_server_id: masterServerId,
        slave_server_id: backupServerId,
        interface: networkInterface,
        state: 'HEALTHY'
      });

      await api.deployCluster(newCluster.id);
      alert(`Кластер ${clusterName} успішно створено та розгорнуто на обох серверах!`);
      setShowWizard(false);
      loadClusters();
    } catch (e: any) {
      alert(`Помилка розгортання кластера: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDeploy = async (clusterId: number) => {
    setDeploying(clusterId);
    try {
      const res = await api.deployCluster(clusterId);
      alert(res.message || 'Keepalived успішно розгорнуто та запущено!');
      loadClusters();
    } catch (e: any) {
      alert(`Deploy error: ${e.message}`);
    } finally {
      setDeploying(null);
    }
  };

  const handleFailoverTest = async (clusterId: number) => {
    try {
      const res = await api.failoverClusterTest(clusterId);
      setFailoverMsg(res.message);
      loadClusters();
    } catch (e: any) {
      alert(`Failover test error: ${e.message}`);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center space-x-2">
            <Network className="w-6 h-6 text-purple-400" />
            <span>Keepalived VRRP Кластери (High Availability)</span>
          </h1>
          <p className="text-gray-400 text-xs mt-1">Керування відмовостійкими парами Master/Backup з плаваючим Virtual IP (VIP)</p>
        </div>

        <button
          onClick={() => {
            setShowWizard(true);
            handleGenerateConfigs();
          }}
          className="px-4 py-2 rounded-xl bg-gradient-to-r from-purple-500 to-cyan-500 hover:from-purple-400 hover:to-cyan-400 text-black font-bold text-xs shadow-lg shadow-purple-950/50 flex items-center space-x-1.5 transition"
        >
          <Plus className="w-4 h-4" />
          <span>Створити VRRP Кластер (Wizard)</span>
        </button>
      </div>

      {failoverMsg && (
        <div className="p-4 rounded-xl bg-amber-950/60 border border-amber-800 text-amber-300 text-xs font-mono flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Zap className="w-4 h-4 text-amber-400 flex-shrink-0" />
            <span>{failoverMsg}</span>
          </div>
          <button onClick={() => setFailoverMsg(null)} className="text-gray-400 hover:text-white">✕</button>
        </div>
      )}

      {/* Clusters List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {clusters.map((c) => {
          const master = servers.find(s => s.id === c.master_server_id);
          const backup = servers.find(s => s.id === c.slave_server_id);

          return (
            <div key={c.id} className="glass-panel p-6 rounded-2xl border border-gray-800 space-y-4">
              <div className="flex items-center justify-between border-b border-gray-800 pb-3">
                <div className="flex items-center space-x-3">
                  <div className="w-9 h-9 rounded-xl bg-purple-950/80 border border-purple-800 flex items-center justify-center text-purple-400">
                    <Shield className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-sm">{c.name}</h3>
                    <div className="text-xs text-cyan-400 font-mono">VIP: {c.virtual_ip} (VRID {c.router_id})</div>
                  </div>
                </div>

                <span className="px-2.5 py-1 rounded text-xs font-bold font-mono bg-emerald-950 text-emerald-400 border border-emerald-800">
                  ✓ {c.state}
                </span>
              </div>

              {/* VRRP Nodes Pair */}
              <div className="grid grid-cols-2 gap-3 text-xs font-mono">
                <div className="p-3 rounded-xl bg-gray-900/80 border border-cyan-500/30 space-y-1">
                  <div className="flex items-center justify-between text-cyan-400 font-bold">
                    <span>👑 MASTER</span>
                    <span className="text-[10px] text-gray-500">Prio: 101</span>
                  </div>
                  <div className="text-white truncate">{master?.hostname || `Node #${c.master_server_id}`}</div>
                  <div className="text-gray-400 text-[11px]">{master?.ip_address}</div>
                </div>

                <div className="p-3 rounded-xl bg-gray-900/80 border border-gray-800 space-y-1">
                  <div className="flex items-center justify-between text-purple-400 font-bold">
                    <span>🛡️ BACKUP</span>
                    <span className="text-[10px] text-gray-500">Prio: 100</span>
                  </div>
                  <div className="text-white truncate">{backup?.hostname || `Node #${c.slave_server_id}`}</div>
                  <div className="text-gray-400 text-[11px]">{backup?.ip_address}</div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between pt-2 border-t border-gray-800/80">
                <button
                  onClick={() => handleFailoverTest(c.id)}
                  className="px-3 py-1.5 rounded-lg bg-amber-950/60 hover:bg-amber-900 text-amber-300 border border-amber-800 text-xs font-medium flex items-center space-x-1.5 transition"
                >
                  <Zap className="w-3.5 h-3.5 text-amber-400" />
                  <span>Тест Failover (Збій Master)</span>
                </button>

                <button
                  onClick={() => handleDeploy(c.id)}
                  disabled={deploying === c.id}
                  className="px-3 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-cyan-300 border border-gray-700 text-xs font-medium flex items-center space-x-1.5 transition"
                >
                  {deploying === c.id ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
                  <span>Перерозгорнути</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* VRRP Wizard Modal */}
      {showWizard && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4 overflow-y-auto">
          <div className="glass-panel max-w-4xl w-full rounded-2xl p-6 border border-gray-700 space-y-6 my-8">
            <div className="flex items-center justify-between border-b border-gray-800 pb-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-purple-500 to-cyan-500 flex items-center justify-center text-black font-bold">
                  <Shield className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">Конструктор Keepalived VRRP Кластера</h2>
                  <p className="text-gray-400 text-xs">Автоматична генерація конфігурацій для високої доступності</p>
                </div>
              </div>
              <button onClick={() => setShowWizard(false)} className="text-gray-400 hover:text-white text-sm">✕</button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Settings Form */}
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-medium text-gray-400">Назва Кластера</label>
                  <input
                    type="text"
                    value={clusterName}
                    onChange={(e) => setClusterName(e.target.value)}
                    className="w-full mt-1 bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-xs text-white outline-none font-mono focus:border-cyan-400"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-gray-400">Virtual IP (VIP)</label>
                    <input
                      type="text"
                      value={virtualIp}
                      onChange={(e) => setVirtualIp(e.target.value)}
                      className="w-full mt-1 bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-xs text-cyan-300 outline-none font-mono focus:border-cyan-400"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-400">Virtual Router ID</label>
                    <input
                      type="number"
                      value={routerId}
                      onChange={(e) => setRouterId(Number(e.target.value))}
                      className="w-full mt-1 bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-xs text-white outline-none font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-gray-400">Master Вузол (Priority 101)</label>
                    <select
                      value={masterServerId}
                      onChange={(e) => setMasterServerId(Number(e.target.value))}
                      className="w-full mt-1 bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-xs text-cyan-300 outline-none font-mono"
                    >
                      {servers.map((s) => (
                        <option key={s.id} value={s.id}>{s.hostname}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-400">Backup Вузол (Priority 100)</label>
                    <select
                      value={backupServerId}
                      onChange={(e) => setBackupServerId(Number(e.target.value))}
                      className="w-full mt-1 bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-xs text-purple-300 outline-none font-mono"
                    >
                      {servers.map((s) => (
                        <option key={s.id} value={s.id}>{s.hostname}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-gray-400">Мережевий Інтерфейс</label>
                    <input
                      type="text"
                      value={networkInterface}
                      onChange={(e) => setNetworkInterface(e.target.value)}
                      className="w-full mt-1 bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-xs text-white outline-none font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-400">Healthcheck Script</label>
                    <input
                      type="text"
                      value={checkScript}
                      onChange={(e) => setCheckScript(e.target.value)}
                      className="w-full mt-1 bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-xs text-white outline-none font-mono"
                    />
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleGenerateConfigs}
                  className="w-full py-2 bg-gray-800 hover:bg-gray-700 text-xs text-cyan-300 rounded-xl font-semibold border border-gray-700 transition"
                >
                  Згенерувати Конфігурації для Перегляду
                </button>
              </div>

              {/* Preview Panel */}
              <div className="flex flex-col h-full bg-[#0A0D14] rounded-xl border border-gray-800 p-4 space-y-2">
                <span className="text-xs font-mono text-cyan-400 font-bold">keepalived.conf (Master Node)</span>
                <pre className="flex-1 overflow-auto font-mono text-[11px] text-gray-300 max-h-64 bg-gray-950 p-2 rounded-lg whitespace-pre-wrap">
                  {generatedConfigs?.master_config || '# Натисніть "Згенерувати Конфігурації"...'}
                </pre>

                <div className="flex justify-end space-x-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowWizard(false)}
                    className="px-4 py-2 rounded-xl bg-gray-800 text-xs text-gray-300"
                  >
                    Скасувати
                  </button>
                  <button
                    type="button"
                    disabled={loading}
                    onClick={handleCreateAndDeploy}
                    className="px-5 py-2 rounded-xl bg-gradient-to-r from-purple-500 to-cyan-500 hover:from-purple-400 hover:to-cyan-400 text-black font-bold text-xs shadow-lg shadow-purple-950/50 flex items-center space-x-1.5 transition"
                  >
                    {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                    <span>Зберегти & Розгорнути Кластер</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
