import React, { useState, useEffect } from 'react';
import { Network, Plus, Shield, CheckCircle2, Play, RefreshCw, AlertTriangle, Layers, Server, Zap, Activity, Trash2 } from 'lucide-react';
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
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [failoverMsg, setFailoverMsg] = useState<string | null>(null);

  // Wizard form state
  const [clusterName, setClusterName] = useState('HA-Production-VIP');
  const [virtualIp, setVirtualIp] = useState('192.168.1.250');
  const [routerId, setRouterId] = useState(51);
  const [masterServerId, setMasterServerId] = useState<number>(servers[0]?.id || 0);
  const [backupServerId, setBackupServerId] = useState<number>(servers[1]?.id || servers[0]?.id || 0);
  const [networkInterface, setNetworkInterface] = useState('eth0');
  const [checkScript, setCheckScript] = useState('killall -0 haproxy');
  const [generatedConfigs, setGeneratedConfigs] = useState<{ master_config: string; backup_config: string } | null>(null);

  useEffect(() => {
    loadClusters();
  }, []);

  useEffect(() => {
    if (servers.length >= 2) {
      if (!servers.find(s => s.id === masterServerId)) setMasterServerId(servers[0].id);
      if (!servers.find(s => s.id === backupServerId) || backupServerId === (servers[0]?.id || 0)) setBackupServerId(servers[1].id);
    } else if (servers.length === 1) {
      setMasterServerId(servers[0].id);
      setBackupServerId(servers[0].id);
    }
  }, [servers]);

  const loadClusters = async () => {
    try {
      const res = await api.getClusters();
      setClusters(res);
    } catch (e) {
      console.error(e);
    }
  };

  const handleOpenWizard = () => {
    if (servers.length < 2) {
      alert('Увага: Для створення Keepalived VRRP кластера необхідно щонайменше 2 підключені сервери (Master та Backup). Будь ласка, додайте ще один сервер у вкладці "Сервери".');
    }
    setShowWizard(true);
  };

  const handleGenerateConfigs = async () => {
    if (servers.length < 2) {
      alert('Неможливо згенерувати конфігурації: у системі менше 2 серверів.');
      return;
    }
    if (masterServerId === backupServerId) {
      alert('Помилка: Master та Backup вузли повинні бути двома різними серверами!');
      return;
    }

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
      alert(`Помилка генерації VRRP: ${e.response?.data?.detail || e.message}`);
    }
  };

  const handleCreateAndDeploy = async () => {
    if (servers.length < 2) {
      alert('Неможливо створити кластер: у системі менше 2 серверів.');
      return;
    }
    if (masterServerId === backupServerId) {
      alert('Помилка: Master та Backup вузли повинні бути двома різними серверами!');
      return;
    }

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
      alert(`Помилка розгортання кластера: ${e.response?.data?.detail || e.message}`);
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
      alert(`Помилка розгортання: ${e.response?.data?.detail || e.message}`);
    } finally {
      setDeploying(null);
    }
  };

  const handleDeleteCluster = async (clusterId: number, name: string) => {
    if (!window.confirm(`Ви дійсно бажаєте видалити VRRP кластер "${name}"?`)) {
      return;
    }

    setDeletingId(clusterId);
    try {
      await api.deleteCluster(clusterId);
      loadClusters();
    } catch (e: any) {
      alert(`Помилка видалення кластера: ${e.response?.data?.detail || e.message}`);
    } finally {
      setDeletingId(null);
    }
  };

  const handleFailoverTest = async (clusterId: number) => {
    try {
      const res = await api.failoverClusterTest(clusterId);
      setFailoverMsg(res.message);
      loadClusters();
    } catch (e: any) {
      alert(`Помилка тестування Failover: ${e.response?.data?.detail || e.message}`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center space-x-2">
            <Network className="w-6 h-6 text-purple-400" />
            <span>High-Availability Кластери (Keepalived VRRP)</span>
          </h1>
          <p className="text-gray-400 text-xs mt-1">
            Керування плаваючими Virtual IP (VIP), VRRP-маршрутизацією та автоматичним перемиканням при збої (Failover)
          </p>
        </div>

        <button
          onClick={handleOpenWizard}
          className="px-4 py-2 bg-gradient-to-r from-purple-500 to-cyan-500 hover:from-purple-400 hover:to-cyan-400 text-black font-semibold text-xs rounded-xl shadow-lg shadow-purple-950/50 flex items-center space-x-2 transition"
        >
          <Plus className="w-4 h-4" />
          <span>Конструктор VRRP Кластера</span>
        </button>
      </div>

      {/* Failover Test Notification */}
      {failoverMsg && (
        <div className="p-4 rounded-xl bg-purple-950/60 border border-purple-800 text-xs text-purple-300 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Zap className="w-4 h-4 text-purple-400" />
            <span>{failoverMsg}</span>
          </div>
          <button onClick={() => setFailoverMsg(null)} className="text-purple-400 hover:text-white">✕</button>
        </div>
      )}

      {/* Clusters List */}
      {clusters.length === 0 ? (
        <div className="glass-panel p-12 rounded-2xl border border-gray-800 text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-purple-950/60 border border-purple-800/80 mx-auto flex items-center justify-center text-purple-400">
            <Layers className="w-8 h-8" />
          </div>
          <div className="space-y-1 max-w-md mx-auto">
            <h3 className="font-bold text-white text-base">Немає налаштованих VRRP кластерів</h3>
            <p className="text-xs text-gray-400">
              Створіть відмовостійку зв'язку між двома серверами зі спільною Virtual IP адресою (VIP) для автоматичного Failover.
            </p>
          </div>
          <button
            onClick={handleOpenWizard}
            className="px-5 py-2.5 bg-gradient-to-r from-purple-500 to-cyan-500 hover:from-purple-400 hover:to-cyan-400 text-black font-bold text-xs rounded-xl shadow-lg shadow-purple-950/50 inline-flex items-center space-x-2 transition"
          >
            <Plus className="w-4 h-4" />
            <span>Створити VRRP Кластер</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {clusters.map((c) => {
            const masterServer = servers.find((s) => s.id === c.master_server_id);
            const backupServer = servers.find((s) => s.id === c.slave_server_id);

            return (
              <div key={c.id} className="glass-panel rounded-2xl p-6 border border-gray-800 space-y-5 hover:border-purple-900/50 transition">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-xl bg-purple-950/80 border border-purple-800 flex items-center justify-center text-purple-400">
                      <Shield className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-white text-base">{c.name}</h3>
                      <span className="text-xs font-mono text-cyan-400">Virtual IP: {c.virtual_ip}</span>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <span className="px-2.5 py-1 rounded-full text-[11px] font-mono font-bold bg-emerald-950 text-emerald-400 border border-emerald-800">
                      {c.state || 'HEALTHY'}
                    </span>
                    <button
                      onClick={() => handleDeleteCluster(c.id, c.name)}
                      disabled={deletingId === c.id}
                      title="Видалити кластер"
                      className="p-1.5 rounded-lg bg-gray-800 hover:bg-rose-950 text-gray-400 hover:text-rose-400 border border-gray-700 hover:border-rose-800 transition"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Nodes Display */}
                <div className="grid grid-cols-2 gap-3 pt-2">
                  <div className="p-3 rounded-xl bg-gray-900/80 border border-gray-800 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono text-purple-400 font-bold uppercase">Master (Pri 101)</span>
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                    </div>
                    <div className="font-semibold text-xs text-white truncate">{masterServer?.hostname || `Server ID: ${c.master_server_id}`}</div>
                    <div className="text-[11px] font-mono text-gray-400">{masterServer?.ip_address || '—'}</div>
                  </div>

                  <div className="p-3 rounded-xl bg-gray-900/80 border border-gray-800 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono text-gray-400 font-bold uppercase">Backup (Pri 100)</span>
                      <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
                    </div>
                    <div className="font-semibold text-xs text-white truncate">{backupServer?.hostname || `Server ID: ${c.slave_server_id}`}</div>
                    <div className="text-[11px] font-mono text-gray-400">{backupServer?.ip_address || '—'}</div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-between pt-2 border-t border-gray-800/80">
                  <button
                    onClick={() => handleFailoverTest(c.id)}
                    className="px-3 py-1.5 rounded-xl bg-gray-800 hover:bg-gray-700 text-xs text-purple-300 font-medium border border-gray-700 transition flex items-center space-x-1.5"
                  >
                    <Zap className="w-3.5 h-3.5" />
                    <span>Тест Failover</span>
                  </button>

                  <button
                    onClick={() => handleDeploy(c.id)}
                    disabled={deploying === c.id}
                    className="px-3.5 py-1.5 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 text-xs font-semibold border border-cyan-800/60 transition flex items-center space-x-1.5"
                  >
                    {deploying === c.id ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
                    <span>Перерозгорнути</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

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

            {/* Warning if fewer than 2 servers */}
            {servers.length < 2 && (
              <div className="p-4 rounded-xl bg-amber-950/60 border border-amber-800 text-xs text-amber-300 flex items-start space-x-2.5">
                <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold text-amber-200">Потрібно щонайменше 2 підключені сервери</div>
                  <p className="text-gray-300 mt-0.5">
                    Для створення відмовостійкого VRRP кластера необхідні два окремих вузли (Master та Backup). Зараз підключено: {servers.length} сервер(ів). Додайте ще один сервер у меню "Сервери".
                  </p>
                </div>
              </div>
            )}

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
                        <option key={s.id} value={s.id}>{s.hostname} ({s.ip_address})</option>
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
                        <option key={s.id} value={s.id}>{s.hostname} ({s.ip_address})</option>
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
                  disabled={servers.length < 2 || masterServerId === backupServerId}
                  onClick={handleGenerateConfigs}
                  className="w-full py-2 bg-gray-800 hover:bg-gray-700 disabled:opacity-50 text-xs text-cyan-300 rounded-xl font-semibold border border-gray-700 transition"
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
                    disabled={loading || servers.length < 2 || masterServerId === backupServerId}
                    onClick={handleCreateAndDeploy}
                    className="px-5 py-2 rounded-xl bg-gradient-to-r from-purple-500 to-cyan-500 hover:from-purple-400 hover:to-cyan-400 disabled:opacity-50 text-black font-bold text-xs shadow-lg shadow-purple-950/50 flex items-center space-x-1.5 transition"
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
