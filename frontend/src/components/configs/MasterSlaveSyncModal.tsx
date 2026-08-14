import React, { useState } from 'react';
import { Network, RefreshCw, CheckCircle2, AlertCircle, ArrowRight, ShieldCheck } from 'lucide-react';
import { Server } from '../../types';
import { api } from '../../services/api';

interface MasterSlaveSyncModalProps {
  servers: Server[];
  serviceType: string;
  onClose: () => void;
}

export const MasterSlaveSyncModal: React.FC<MasterSlaveSyncModalProps> = ({ servers, serviceType, onClose }) => {
  const [masterServerId, setMasterServerId] = useState<number>(servers[0]?.id || 1);
  const [selectedSlaves, setSelectedSlaves] = useState<number[]>(servers.slice(1).map(s => s.id));
  const [autoReload, setAutoReload] = useState<boolean>(true);
  const [syncing, setSyncing] = useState<boolean>(false);
  const [results, setResults] = useState<{ slave_id: number; hostname: string; status: string; message?: string; error?: string }[] | null>(null);

  const toggleSlave = (id: number) => {
    if (selectedSlaves.includes(id)) {
      setSelectedSlaves(selectedSlaves.filter(sId => sId !== id));
    } else {
      setSelectedSlaves([...selectedSlaves, id]);
    }
  };

  const handleSync = async () => {
    if (selectedSlaves.length === 0) {
      alert('Оберіть хоча б один Slave сервер для реплікації');
      return;
    }

    setSyncing(true);
    try {
      const res = await api.syncConfigToSlaves({
        master_server_id: masterServerId,
        slave_server_ids: selectedSlaves,
        service_type: serviceType,
        auto_reload: autoReload
      });
      setResults(res.synced_nodes);
    } catch (e: any) {
      alert(`Синхронізація не вдалася: ${e.message}`);
    } finally {
      setSyncing(false);
    }
  };

  const masterServer = servers.find(s => s.id === masterServerId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4">
      <div className="glass-panel max-w-2xl w-full rounded-2xl p-6 border border-gray-700 space-y-6">
        <div className="flex items-center justify-between border-b border-gray-800 pb-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-purple-500 to-cyan-500 flex items-center justify-center text-black font-bold">
              <Network className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Master ↔ Slave Синхронізація Конфігів</h2>
              <p className="text-gray-400 text-xs">Безпечна реплікація з попередньою перевіркою синтаксису ({serviceType.toUpperCase()})</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-sm">✕</button>
        </div>

        {/* Master Selector */}
        <div className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-gray-300 block mb-1">Master Сервер (Джерело Конфігурації):</label>
            <select
              value={masterServerId}
              onChange={(e) => {
                const newMaster = Number(e.target.value);
                setMasterServerId(newMaster);
                setSelectedSlaves(servers.filter(s => s.id !== newMaster).map(s => s.id));
              }}
              className="w-full bg-gray-900 border border-cyan-500/50 rounded-xl px-4 py-2.5 text-xs text-cyan-300 font-mono outline-none"
            >
              {servers.map((s) => (
                <option key={s.id} value={s.id}>
                  👑 {s.hostname} ({s.ip_address})
                </option>
              ))}
            </select>
          </div>

          {/* Slave Targets */}
          <div>
            <label className="text-xs font-semibold text-gray-300 block mb-2">Slave Сервери для Оновлення:</label>
            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {servers.filter(s => s.id !== masterServerId).map((slave) => {
                const isSelected = selectedSlaves.includes(slave.id);
                return (
                  <div
                    key={slave.id}
                    onClick={() => toggleSlave(slave.id)}
                    className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition ${
                      isSelected ? 'bg-purple-950/40 border-purple-500/50 text-white' : 'bg-gray-900/40 border-gray-800 text-gray-400'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => {}}
                        className="rounded accent-purple-400"
                      />
                      <div>
                        <div className="font-semibold text-xs text-white">{slave.hostname}</div>
                        <div className="text-[11px] font-mono text-gray-400">{slave.ip_address}</div>
                      </div>
                    </div>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-gray-800 text-purple-300">
                      Slave Target
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex items-center space-x-2 pt-2">
            <input
              type="checkbox"
              id="autoReload"
              checked={autoReload}
              onChange={(e) => setAutoReload(e.target.checked)}
              className="rounded accent-cyan-400"
            />
            <label htmlFor="autoReload" className="text-xs text-gray-300">
              Автоматично перезавантажити (systemctl reload {serviceType}) на слейвах після успішної валідації
            </label>
          </div>

          {/* Sync Results Output */}
          {results && (
            <div className="p-4 rounded-xl bg-gray-950 border border-gray-800 space-y-2 text-xs font-mono">
              <div className="font-bold text-white flex items-center space-x-1.5 border-b border-gray-800 pb-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>Результати Синхронізації:</span>
              </div>
              {results.map((r) => (
                <div key={r.slave_id} className="flex items-center justify-between py-1 border-b border-gray-900">
                  <span className="text-gray-300">{r.hostname}</span>
                  <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                    r.status === 'synced' ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' : 'bg-rose-950 text-rose-400 border border-rose-800'
                  }`}>
                    {r.status === 'synced' ? '✓ REPLICATED' : `✕ ${r.error}`}
                  </span>
                </div>
              ))}
            </div>
          )}

          <div className="flex justify-end space-x-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-gray-800 hover:bg-gray-700 text-xs text-gray-300"
            >
              Закрити
            </button>
            <button
              type="button"
              onClick={handleSync}
              disabled={syncing}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-500 to-cyan-500 hover:from-purple-400 hover:to-cyan-400 text-black font-bold text-xs shadow-lg shadow-purple-950/50 flex items-center space-x-2 transition"
            >
              {syncing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Network className="w-4 h-4" />}
              <span>{syncing ? 'Синхронізація...' : 'Запустити Синхронізацію'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
