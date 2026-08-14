import React, { useState, useEffect } from 'react';
import { Activity, RefreshCw, Play, Pause, AlertOctagon, Sliders, ShieldBan, Database, Plus, Trash2, Gauge } from 'lucide-react';
import { Language, translations } from '../i18n/translations';
import { Server, HAProxyStat } from '../types';
import { api } from '../services/api';

interface RuntimeControlViewProps {
  lang: Language;
  servers: Server[];
}

export const RuntimeControlView: React.FC<RuntimeControlViewProps> = ({ lang, servers }) => {
  const t = translations[lang];
  const [selectedServerId, setSelectedServerId] = useState<number>(servers[0]?.id || 0);
  const [activeTab, setActiveTab] = useState<'servers' | 'stick_tables' | 'maps' | 'maxconn'>('servers');
  const [stats, setStats] = useState<HAProxyStat[]>([]);
  const [stickTables, setStickTables] = useState<any[]>([]);
  const [maps, setMaps] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  // Maxconn state
  const [globalMaxconn, setGlobalMaxconn] = useState<number>(4000);
  const [frontendMaxconn, setFrontendMaxconn] = useState<number>(2000);

  // New Map Entry State
  const [newIpKey, setNewIpKey] = useState('');
  const [newIpValue, setNewIpValue] = useState('block_ddos');
  const [targetMap, setTargetMap] = useState('ip_blacklist.map');

  useEffect(() => {
    if (servers.length > 0) {
      if (!servers.some(s => s.id === selectedServerId)) {
        setSelectedServerId(servers[0].id);
      }
    } else {
      setSelectedServerId(0);
    }
  }, [servers]);

  useEffect(() => {
    if (selectedServerId > 0) {
      fetchData();
    } else {
      setStats([]);
      setStickTables([]);
      setMaps([]);
    }
  }, [selectedServerId, activeTab]);

  const fetchData = async () => {
    if (selectedServerId <= 0) return;
    setLoading(true);
    try {
      if (activeTab === 'servers') {
        const res = await api.getRuntimeStats(selectedServerId);
        setStats(res.stats);
      } else if (activeTab === 'stick_tables') {
        const res = await api.getStickTables(selectedServerId);
        setStickTables(res.tables);
      } else if (activeTab === 'maps') {
        const res = await api.getMaps(selectedServerId);
        setMaps(res.maps);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (backendName: string, serverName: string, action: string, weight: number = 100) => {
    try {
      const res = await api.executeRuntimeAction(selectedServerId, backendName, serverName, action, weight);
      alert(`[HAProxy Runtime Socket]: ${res.raw_output || 'Action executed successfully.'}`);
      fetchData();
    } catch (e: any) {
      alert(`Runtime API Error: ${e.message}`);
    }
  };

  const handleClearStickKey = async (tableName: string, key: string) => {
    try {
      await api.clearStickTableKey(selectedServerId, tableName, key);
      alert(`Key ${key} cleared from ${tableName}`);
      fetchData();
    } catch (e: any) {
      alert(`Error clearing key: ${e.message}`);
    }
  };

  const handleAddMapEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newIpKey) return;
    try {
      await api.updateMapEntry(selectedServerId, targetMap, newIpKey, newIpValue, 'add');
      setNewIpKey('');
      fetchData();
      alert(`Entry added to ${targetMap}`);
    } catch (e: any) {
      alert(`Error adding map entry: ${e.message}`);
    }
  };

  const handleDeleteMapEntry = async (mapName: string, key: string) => {
    try {
      await api.updateMapEntry(selectedServerId, mapName, key, '', 'del');
      fetchData();
    } catch (e: any) {
      alert(`Error deleting map entry: ${e.message}`);
    }
  };

  const handleSetMaxconn = async (type: 'global' | 'frontend', val: number) => {
    try {
      await api.updateMaxconn(selectedServerId, type, type === 'frontend' ? 'web_frontend' : null, val);
      alert(`Maxconn (${type}) dynamically updated to ${val} without restart!`);
    } catch (e: any) {
      alert(`Error setting maxconn: ${e.message}`);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center space-x-2">
            <Activity className="w-6 h-6 text-cyan-400" />
            <span>HAProxy Runtime Socket Control (Zero-Downtime)</span>
          </h1>
          <p className="text-gray-400 text-xs mt-1">Динамічне керування вузлами, сесіями Stick-Tables, IP Blacklist картами та Maxconn</p>
        </div>

        <button
          onClick={fetchData}
          disabled={loading}
          className="px-3.5 py-2 rounded-xl bg-gray-800 hover:bg-gray-700 text-cyan-300 font-medium text-xs border border-gray-700 transition flex items-center space-x-1.5"
        >
          <RefreshCw className={`w-4 h-4 text-cyan-400 ${loading ? 'animate-spin' : ''}`} />
          <span>Оновити Стан Сокета</span>
        </button>
      </div>

      {/* Target Selector bar & Tabs */}
      <div className="glass-panel p-4 rounded-2xl flex flex-wrap items-center justify-between gap-4 border border-gray-800">
        <div className="flex items-center space-x-3">
          <label className="text-xs font-semibold text-gray-400">Цільовий HAProxy Вузол:</label>
          <select
            value={selectedServerId}
            onChange={(e) => setSelectedServerId(Number(e.target.value))}
            className="bg-gray-900 border border-gray-700 rounded-lg px-3 py-1.5 text-xs text-cyan-300 font-mono outline-none"
          >
            {servers.map((s) => (
              <option key={s.id} value={s.id}>{s.hostname} ({s.ip_address})</option>
            ))}
          </select>
        </div>

        {/* Runtime Sub-tabs */}
        <div className="flex items-center space-x-2 bg-gray-900/80 p-1 rounded-xl border border-gray-800">
          <button
            onClick={() => setActiveTab('servers')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
              activeTab === 'servers' ? 'bg-cyan-500 text-black font-bold shadow-md shadow-cyan-950/50' : 'text-gray-400 hover:text-white'
            }`}
          >
            Бекенд Сервери
          </button>
          <button
            onClick={() => setActiveTab('stick_tables')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
              activeTab === 'stick_tables' ? 'bg-cyan-500 text-black font-bold shadow-md shadow-cyan-950/50' : 'text-gray-400 hover:text-white'
            }`}
          >
            Stick-Tables (Сесії)
          </button>
          <button
            onClick={() => setActiveTab('maps')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
              activeTab === 'maps' ? 'bg-cyan-500 text-black font-bold shadow-md shadow-cyan-950/50' : 'text-gray-400 hover:text-white'
            }`}
          >
            IP Whitelist / Blacklist
          </button>
          <button
            onClick={() => setActiveTab('maxconn')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
              activeTab === 'maxconn' ? 'bg-cyan-500 text-black font-bold shadow-md shadow-cyan-950/50' : 'text-gray-400 hover:text-white'
            }`}
          >
            Maxconn Тюнер
          </button>
        </div>
      </div>

      {/* TAB 1: Servers Table */}
      {activeTab === 'servers' && (
        <div className="glass-panel rounded-2xl overflow-hidden border border-gray-800">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-gray-800 bg-gray-900/60 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                <th className="p-4">Proxy (pxname)</th>
                <th className="p-4">Server (svname)</th>
                <th className="p-4">Стан (Status)</th>
                <th className="p-4">Вага (Weight)</th>
                <th className="p-4">Сесії (scur / smax)</th>
                <th className="p-4 text-right">Динамічне Керування</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800/60 text-sm font-mono">
              {stats.map((row, idx) => (
                <tr key={idx} className="hover:bg-gray-800/30 transition">
                  <td className="p-4 font-bold text-cyan-300">{row.pxname}</td>
                  <td className="p-4 text-white">{row.svname}</td>
                  <td className="p-4">
                    <span className={`px-2.5 py-1 rounded text-xs font-bold ${
                      row.status === 'UP' || row.status === 'OPEN' ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' :
                      row.status === 'DRAIN' ? 'bg-amber-950 text-amber-400 border border-amber-800' :
                      'bg-rose-950 text-rose-400 border border-rose-800'
                    }`}>
                      {row.status}
                    </span>
                  </td>
                  <td className="p-4 text-gray-300">{row.weight}</td>
                  <td className="p-4 text-gray-400 text-xs">{row.scur} / {row.smax} (lim: {row.slim})</td>
                  <td className="p-4 text-right">
                    {row.svname !== 'FRONTEND' && row.svname !== 'BACKEND' ? (
                      <div className="flex items-center justify-end space-x-1.5">
                        <button
                          onClick={() => handleAction(row.pxname, row.svname, 'ready')}
                          title="Enable Server (Ready)"
                          className="p-1.5 rounded bg-emerald-950/80 hover:bg-emerald-900 text-emerald-300 border border-emerald-800 transition"
                        >
                          <Play className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleAction(row.pxname, row.svname, 'drain')}
                          title="Drain Sessions"
                          className="p-1.5 rounded bg-amber-950/80 hover:bg-amber-900 text-amber-300 border border-amber-800 transition"
                        >
                          <Pause className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleAction(row.pxname, row.svname, 'maintain')}
                          title="Set Maintenance"
                          className="p-1.5 rounded bg-rose-950/80 hover:bg-rose-900 text-rose-300 border border-rose-800 transition"
                        >
                          <AlertOctagon className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <span className="text-xs text-gray-600 font-sans">N/A (Group)</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* TAB 2: Stick-Tables */}
      {activeTab === 'stick_tables' && (
        <div className="space-y-4">
          {stickTables.map((st, i) => (
            <div key={i} className="glass-panel p-5 rounded-2xl border border-gray-800 space-y-3">
              <div className="flex items-center justify-between border-b border-gray-800 pb-3">
                <div>
                  <h3 className="font-bold text-white font-mono text-sm">{st.table_name}</h3>
                  <div className="text-xs text-gray-400">Type: {st.type} | Size: {st.size.toLocaleString()} | Active Keys: {st.used}</div>
                </div>
                <span className="px-2.5 py-1 rounded bg-purple-950 text-purple-300 border border-purple-800 text-xs font-mono">
                  Stick-Table
                </span>
              </div>

              <table className="w-full text-left border-collapse text-xs font-mono">
                <thead>
                  <tr className="border-b border-gray-800 text-gray-400">
                    <th className="py-2">Client IP (Key)</th>
                    <th className="py-2">Req Rate (10s)</th>
                    <th className="py-2">Expires In</th>
                    <th className="py-2">GPC0 Flags</th>
                    <th className="py-2 text-right">Дія</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800/60">
                  {st.entries.map((entry: any, eIdx: number) => (
                    <tr key={eIdx} className="hover:bg-gray-800/30">
                      <td className="py-2 font-bold text-cyan-300">{entry.key}</td>
                      <td className="py-2 text-rose-400 font-bold">{entry['http_req_rate(10s)']} req/s</td>
                      <td className="py-2 text-gray-400">{entry.exp}</td>
                      <td className="py-2 text-gray-400">{entry.gpc0}</td>
                      <td className="py-2 text-right">
                        <button
                          onClick={() => handleClearStickKey(st.table_name, entry.key)}
                          className="px-2 py-1 rounded bg-rose-950 hover:bg-rose-900 text-rose-300 border border-rose-800 text-[11px] transition"
                        >
                          Clear Key
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      )}

      {/* TAB 3: IP Maps Whitelist / Blacklist */}
      {activeTab === 'maps' && (
        <div className="space-y-6">
          {/* Add IP Entry Form */}
          <form onSubmit={handleAddMapEntry} className="glass-panel p-5 rounded-2xl border border-gray-800 flex flex-wrap items-end gap-3">
            <div className="flex-1 min-w-[200px]">
              <label className="text-xs text-gray-400 block mb-1">IP-адреса або CIDR</label>
              <input
                type="text"
                placeholder="198.51.100.25 or 10.0.0.0/8"
                value={newIpKey}
                onChange={(e) => setNewIpKey(e.target.value)}
                className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-xs text-white outline-none font-mono focus:border-cyan-400"
              />
            </div>

            <div>
              <label className="text-xs text-gray-400 block mb-1">Цільова Карта</label>
              <select
                value={targetMap}
                onChange={(e) => setTargetMap(e.target.value)}
                className="bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-xs text-cyan-300 outline-none font-mono"
              >
                <option value="ip_blacklist.map">ip_blacklist.map (Блокування)</option>
                <option value="ip_whitelist.map">ip_whitelist.map (Довірені IP)</option>
              </select>
            </div>

            <div>
              <label className="text-xs text-gray-400 block mb-1">Опис / Тег</label>
              <input
                type="text"
                value={newIpValue}
                onChange={(e) => setNewIpValue(e.target.value)}
                className="bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-xs text-white outline-none font-mono"
              />
            </div>

            <button
              type="submit"
              className="px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-black font-bold text-xs rounded-lg shadow-md shadow-cyan-950/50 flex items-center space-x-1.5 transition"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Додати IP на льоту</span>
            </button>
          </form>

          {/* Maps List */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {maps.map((m) => (
              <div key={m.map_id} className="glass-panel p-5 rounded-2xl border border-gray-800 space-y-3">
                <div className="flex items-center justify-between border-b border-gray-800 pb-2">
                  <div>
                    <h3 className="font-bold text-white font-mono text-sm">{m.name}</h3>
                    <p className="text-gray-400 text-xs">{m.description}</p>
                  </div>
                  <span className="text-xs font-mono text-cyan-400 font-bold">{m.entries.length} IPs</span>
                </div>

                <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                  {m.entries.map((entry: any, idx: number) => (
                    <div key={idx} className="p-2.5 rounded-xl bg-gray-900/70 border border-gray-800 flex items-center justify-between text-xs font-mono">
                      <div>
                        <div className="font-bold text-white">{entry.key}</div>
                        <div className="text-[10px] text-gray-400">{entry.value}</div>
                      </div>
                      <button
                        onClick={() => handleDeleteMapEntry(m.name, entry.key)}
                        className="text-rose-400 hover:text-rose-300 p-1"
                        title="Remove IP"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 4: Maxconn Tuner */}
      {activeTab === 'maxconn' && (
        <div className="glass-panel p-6 rounded-2xl border border-gray-800 space-y-6 max-w-xl">
          <div className="flex items-center space-x-2 border-b border-gray-800 pb-3">
            <Gauge className="w-5 h-5 text-cyan-400" />
            <h2 className="font-bold text-white">Live Maxconn Tuner (Zero Restart)</h2>
          </div>

          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-xs font-mono mb-1">
                <span className="text-gray-300">Глобальний ліміт з'єднань (Global Maxconn):</span>
                <span className="text-cyan-400 font-bold">{globalMaxconn}</span>
              </div>
              <input
                type="range"
                min="500"
                max="20000"
                step="500"
                value={globalMaxconn}
                onChange={(e) => setGlobalMaxconn(Number(e.target.value))}
                className="w-full accent-cyan-400 cursor-pointer"
              />
              <button
                onClick={() => handleSetMaxconn('global', globalMaxconn)}
                className="mt-2 px-3 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-black font-bold text-xs"
              >
                Застосувати Global Maxconn
              </button>
            </div>

            <div className="pt-4 border-t border-gray-800">
              <div className="flex justify-between text-xs font-mono mb-1">
                <span className="text-gray-300">Frontend Limit (web_frontend):</span>
                <span className="text-purple-400 font-bold">{frontendMaxconn}</span>
              </div>
              <input
                type="range"
                min="200"
                max="10000"
                step="200"
                value={frontendMaxconn}
                onChange={(e) => setFrontendMaxconn(Number(e.target.value))}
                className="w-full accent-purple-400 cursor-pointer"
              />
              <button
                onClick={() => handleSetMaxconn('frontend', frontendMaxconn)}
                className="mt-2 px-3 py-1.5 rounded-lg bg-purple-500 hover:bg-purple-400 text-black font-bold text-xs"
              >
                Застосувати Frontend Maxconn
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
