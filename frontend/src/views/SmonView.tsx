import React, { useState } from 'react';
import { Radio, Plus, ShieldCheck, Globe, Clock, AlertTriangle, ExternalLink } from 'lucide-react';
import { Language, translations } from '../i18n/translations';
import { SmonTarget } from '../types';
import { api } from '../services/api';

interface SmonViewProps {
  lang: Language;
  smonTargets: SmonTarget[];
  onRefresh: () => void;
}

export const SmonView: React.FC<SmonViewProps> = ({ lang, smonTargets, onRefresh }) => {
  const t = translations[lang];
  const [showAddModal, setShowAddModal] = useState(false);
  const [name, setName] = useState('');
  const [targetType, setTargetType] = useState('http');
  const [hostOrUrl, setHostOrUrl] = useState('');
  const [port, setPort] = useState(80);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.createSmonTarget({
        name,
        target_type: targetType,
        host_or_url: hostOrUrl,
        port
      });
      setShowAddModal(false);
      onRefresh();
    } catch (e) {
      alert('Failed to add target');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center space-x-2">
            <Radio className="w-6 h-6 text-emerald-400" />
            <span>SMON Synthetic Monitoring & Status Pages</span>
          </h1>
          <p className="text-gray-400 text-xs mt-1">{t.smon_desc}</p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => alert('Opening Public Status Page: https://uaproxy.statuspage.io')}
            className="px-3.5 py-2 rounded-xl bg-gray-800 hover:bg-gray-700 text-cyan-300 font-medium text-xs border border-gray-700 flex items-center space-x-1.5 transition"
          >
            <ExternalLink className="w-4 h-4 text-cyan-400" />
            <span>{t.public_status_page}</span>
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 bg-gradient-to-r from-emerald-500 to-cyan-500 text-black font-semibold text-xs rounded-xl shadow-lg shadow-emerald-950/50 flex items-center space-x-1.5 transition"
          >
            <Plus className="w-4 h-4" />
            <span>Додати Ціль (Add Target)</span>
          </button>
        </div>
      </div>

      {/* Target Health Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {smonTargets.map((tTarget) => (
          <div key={tTarget.id} className="glass-panel p-5 rounded-2xl border border-gray-800 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800 uppercase">
                {tTarget.target_type}
              </span>
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold font-mono ${
                tTarget.latest_status === 'UP' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
                tTarget.latest_status === 'WARN' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
                'bg-rose-500/20 text-rose-400 border border-rose-500/30'
              }`}>
                {tTarget.latest_status || 'UP'}
              </span>
            </div>

            <div>
              <h3 className="font-bold text-white text-base">{tTarget.name}</h3>
              <p className="text-gray-400 text-xs font-mono truncate">{tTarget.host_or_url}</p>
            </div>

            <div className="pt-2 border-t border-gray-800 flex items-center justify-between text-xs font-mono text-gray-400">
              <span className="flex items-center space-x-1">
                <Clock className="w-3.5 h-3.5 text-cyan-400" />
                <span>{tTarget.latest_response_time || 45} ms</span>
              </span>
              <span className="text-gray-500">Every {tTarget.check_interval}s</span>
            </div>
          </div>
        ))}
      </div>

      {/* Add Target Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="glass-panel max-w-md w-full rounded-2xl p-6 border border-gray-700 space-y-4">
            <h2 className="text-lg font-bold text-white flex items-center space-x-2">
              <Radio className="w-5 h-5 text-emerald-400" />
              <span>Додати нову ціль SMON</span>
            </h2>

            <form onSubmit={handleCreate} className="space-y-3">
              <div>
                <label className="text-xs font-medium text-gray-400">Назва</label>
                <input
                  type="text"
                  required
                  placeholder="Primary API Gateway"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full mt-1 bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:border-emerald-400 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-medium text-gray-400">Тип</label>
                  <select
                    value={targetType}
                    onChange={(e) => setTargetType(e.target.value)}
                    className="w-full mt-1 bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:border-emerald-400 outline-none"
                  >
                    <option value="http">HTTP(S)</option>
                    <option value="ping">PING</option>
                    <option value="tcp">TCP Port</option>
                    <option value="ssl">SSL Expiry</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-400">Порт (якщо TCP/SSL)</label>
                  <input
                    type="number"
                    value={port}
                    onChange={(e) => setPort(Number(e.target.value))}
                    className="w-full mt-1 bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:border-emerald-400 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-gray-400">URL / Host</label>
                <input
                  type="text"
                  required
                  placeholder="https://api.uaproxy.local/health"
                  value={hostOrUrl}
                  onChange={(e) => setHostOrUrl(e.target.value)}
                  className="w-full mt-1 bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:border-emerald-400 outline-none"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-xs text-gray-300"
                >
                  Скасувати
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black font-semibold text-xs"
                >
                  Зберегти SMON Ціль
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
