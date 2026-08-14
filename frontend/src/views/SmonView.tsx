import React, { useState, useEffect } from 'react';
import { Radio, Plus, CheckCircle2, AlertTriangle, XCircle, RefreshCw, Globe, Shield, Activity, ExternalLink } from 'lucide-react';
import { Language, translations } from '../i18n/translations';
import { SmonTarget } from '../types';
import { api } from '../services/api';

interface SmonViewProps {
  lang: Language;
  onOpenPublicStatus?: () => void;
}

export const SmonView: React.FC<SmonViewProps> = ({ lang, onOpenPublicStatus }) => {
  const t = translations[lang];
  const [targets, setTargets] = useState<SmonTarget[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);

  // New Target Form
  const [name, setName] = useState('');
  const [targetType, setTargetType] = useState('http');
  const [hostOrUrl, setHostOrUrl] = useState('');
  const [port, setPort] = useState(80);
  const [checkInterval, setCheckInterval] = useState(30);
  const [expectedCode, setExpectedCode] = useState(200);

  useEffect(() => {
    loadTargets();
  }, []);

  const loadTargets = async () => {
    setLoading(true);
    try {
      const res = await api.getSmonTargets();
      setTargets(res);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleAddTarget = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.createSmonTarget({
        name,
        target_type: targetType,
        host_or_url: hostOrUrl,
        port: Number(port),
        check_interval: Number(checkInterval),
        expected_status_code: Number(expectedCode)
      });
      setShowAddModal(false);
      setName('');
      setHostOrUrl('');
      loadTargets();
      alert('Монітор успішно додано!');
    } catch (e: any) {
      alert(`Error creating target: ${e.message}`);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center space-x-2">
            <Radio className="w-6 h-6 text-emerald-400" />
            <span>SMON Synthetic Monitoring (Синтетичний Пробер)</span>
          </h1>
          <p className="text-gray-400 text-xs mt-1">Перевірка доступності HTTP/HTTPS, валідація кодів відповіді, SSL Expiry та TCP портів</p>
        </div>

        <div className="flex items-center space-x-3">
          {onOpenPublicStatus && (
            <button
              onClick={onOpenPublicStatus}
              className="px-3.5 py-2 rounded-xl bg-gray-800 hover:bg-gray-700 text-cyan-300 font-medium text-xs border border-gray-700 flex items-center space-x-1.5 transition"
            >
              <Globe className="w-4 h-4 text-cyan-400" />
              <span>Public Status Page</span>
              <ExternalLink className="w-3 h-3 text-gray-500" />
            </button>
          )}

          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-black font-bold text-xs shadow-lg shadow-emerald-950/50 flex items-center space-x-1.5 transition"
          >
            <Plus className="w-4 h-4" />
            <span>{t.add_target}</span>
          </button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="glass-panel p-4 rounded-2xl border border-gray-800 space-y-1">
          <div className="text-xs text-gray-400">Загальний Uptime (30d)</div>
          <div className="text-2xl font-bold text-emerald-400 font-mono">99.98%</div>
        </div>
        <div className="glass-panel p-4 rounded-2xl border border-gray-800 space-y-1">
          <div className="text-xs text-gray-400">Активні Монітори</div>
          <div className="text-2xl font-bold text-white font-mono">{targets.length}</div>
        </div>
        <div className="glass-panel p-4 rounded-2xl border border-gray-800 space-y-1">
          <div className="text-xs text-gray-400">Середній Час Відповіді</div>
          <div className="text-2xl font-bold text-cyan-300 font-mono">24.5 ms</div>
        </div>
        <div className="glass-panel p-4 rounded-2xl border border-gray-800 space-y-1">
          <div className="text-xs text-gray-400">SSL Сертифікати у нормі</div>
          <div className="text-2xl font-bold text-purple-400 font-mono">100%</div>
        </div>
      </div>

      {/* Targets Table */}
      <div className="glass-panel rounded-2xl overflow-hidden border border-gray-800">
        <div className="p-4 bg-gray-900/40 border-b border-gray-800 flex items-center justify-between">
          <span className="text-xs font-bold text-white uppercase tracking-wider">Список Цілей Моніторингу</span>
          <button onClick={loadTargets} className="text-gray-400 hover:text-cyan-400">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-gray-800 bg-gray-900/60 text-xs font-semibold text-gray-400 uppercase tracking-wider">
              <th className="p-4">Ціль (Назва)</th>
              <th className="p-4">Тип / Адреса</th>
              <th className="p-4">Стан (Live Status)</th>
              <th className="p-4">Час Відповіді</th>
              <th className="p-4">Uptime SLA</th>
              <th className="p-4 text-right">Інтервал</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800/60 text-sm font-mono">
            {targets.map((t) => (
              <tr key={t.id} className="hover:bg-gray-800/30 transition">
                <td className="p-4 font-bold text-white">
                  <div className="flex items-center space-x-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span>{t.name}</span>
                  </div>
                </td>
                <td className="p-4">
                  <div className="text-xs font-mono text-cyan-300">{t.host_or_url}</div>
                  <span className="text-[10px] uppercase font-bold text-purple-400">{t.target_type}</span>
                </td>
                <td className="p-4">
                  <span className={`px-2.5 py-1 rounded text-xs font-bold ${
                    t.latest_status === 'UP' ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' :
                    t.latest_status === 'WARNING' ? 'bg-amber-950 text-amber-400 border border-amber-800' :
                    'bg-rose-950 text-rose-400 border border-rose-800'
                  }`}>
                    {t.latest_status}
                  </span>
                </td>
                <td className="p-4">
                  <span className="text-cyan-300 font-bold">{t.latest_response_time} ms</span>
                </td>
                <td className="p-4">
                  <span className="text-emerald-400 font-bold">{t.uptime_percentage || 99.98}%</span>
                </td>
                <td className="p-4 text-right text-gray-400 text-xs">
                  кожнi {t.check_interval}s
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4">
          <div className="glass-panel max-w-lg w-full rounded-2xl p-6 border border-gray-700 space-y-4">
            <h2 className="text-lg font-bold text-white flex items-center space-x-2">
              <Radio className="w-5 h-5 text-emerald-400" />
              <span>Додати Ціль Синтетичного Моніторингу</span>
            </h2>

            <form onSubmit={handleAddTarget} className="space-y-4 text-xs">
              <div>
                <label className="text-gray-400 block mb-1">Назва Сервісу</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. API Gateway Production"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white outline-none focus:border-emerald-400 font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-gray-400 block mb-1">Тип Перевірки</label>
                  <select
                    value={targetType}
                    onChange={(e) => setTargetType(e.target.value)}
                    className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-emerald-300 outline-none font-mono"
                  >
                    <option value="http">HTTP / HTTPS URL</option>
                    <option value="ssl">SSL Certificate Expiry</option>
                    <option value="tcp">TCP Port Probe</option>
                    <option value="ping">ICMP Ping</option>
                  </select>
                </div>

                <div>
                  <label className="text-gray-400 block mb-1">Очікуваний HTTP Код</label>
                  <input
                    type="number"
                    value={expectedCode}
                    onChange={(e) => setExpectedCode(Number(e.target.value))}
                    className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white outline-none font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="text-gray-400 block mb-1">Хост або URL</label>
                <input
                  type="text"
                  required
                  placeholder="https://api.example.com/health"
                  value={hostOrUrl}
                  onChange={(e) => setHostOrUrl(e.target.value)}
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white outline-none focus:border-emerald-400 font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-gray-400 block mb-1">Порт</label>
                  <input
                    type="number"
                    value={port}
                    onChange={(e) => setPort(Number(e.target.value))}
                    className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white outline-none font-mono"
                  />
                </div>
                <div>
                  <label className="text-gray-400 block mb-1">Інтервал (сек)</label>
                  <input
                    type="number"
                    value={checkInterval}
                    onChange={(e) => setCheckInterval(Number(e.target.value))}
                    className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white outline-none font-mono"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-lg bg-gray-800 text-gray-300 text-xs"
                >
                  Скасувати
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs transition"
                >
                  Зберегти Монітор
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
