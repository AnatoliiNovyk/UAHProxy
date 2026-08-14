import React, { useState, useEffect } from 'react';
import { ShieldCheck, Lock, Plus, RefreshCw, Key, AlertTriangle, CheckCircle2, ShieldAlert, Shield, Globe, ExternalLink, Sliders, Activity, FileText } from 'lucide-react';
import { Language, translations } from '../i18n/translations';
import { api } from '../services/api';

import { Server } from '../types';

interface SslWafViewProps {
  lang: Language;
  servers: Server[];
}

export const SslWafView: React.FC<SslWafViewProps> = ({ lang, servers }) => {
  const t = translations[lang];
  const [activeTab, setActiveTab] = useState<'ssl' | 'waf'>('ssl');
  const [selectedServerId, setSelectedServerId] = useState<number>(servers[0]?.id || 0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (servers.length > 0) {
      if (!servers.some(s => s.id === selectedServerId)) {
        setSelectedServerId(servers[0].id);
      }
    } else {
      setSelectedServerId(0);
    }
  }, [servers]);

  // SSL State
  const [certs, setCerts] = useState<any[]>([]);
  const [showIssueModal, setShowIssueModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [domain, setDomain] = useState('');
  const [email, setEmail] = useState('admin@uaproxy.local');
  const [altNames, setAltNames] = useState('');
  const [certContent, setCertContent] = useState('');
  const [keyContent, setKeyContent] = useState('');

  // WAF State
  const [wafStatus, setWafStatus] = useState<any>(null);
  const [wafEvents, setWafEvents] = useState<any[]>([]);
  const [wafMode, setWafMode] = useState('BLOCKING');
  const [rules, setRules] = useState<Record<string, boolean>>({
    'REQUEST-942-APPLICATION-ATTACK-SQLI': true,
    'REQUEST-941-APPLICATION-ATTACK-XSS': true,
    'REQUEST-932-APPLICATION-ATTACK-RCE': true,
    'REQUEST-930-APPLICATION-ATTACK-LFI': true,
    'REQUEST-913-SCANNER-DETECTION': true,
    'REQUEST-920-PROTOCOL-ENFORCEMENT': true,
  });

  useEffect(() => {
    if (activeTab === 'ssl' && selectedServerId <= 0) {
      setCerts([]);
      return;
    }
    loadData();
  }, [activeTab, selectedServerId]);

  const loadData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'ssl') {
        if (selectedServerId > 0) {
          const res = await api.getCertificates(selectedServerId);
          setCerts(res.certificates);
        } else {
          setCerts([]);
        }
      } else {
        const [statusRes, eventsRes] = await Promise.all([
          api.getWafStatus(),
          api.getWafEvents()
        ]);
        setWafStatus(statusRes);
        setWafEvents(eventsRes.events);
        setWafMode(statusRes.mode);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleIssueLetsEncrypt = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const altArr = altNames.split(',').map(s => s.trim()).filter(Boolean);
      await api.issueLetsEncrypt({
        server_id: selectedServerId,
        domain,
        email,
        alt_names: altArr
      });
      alert(`SSL сертифікат для ${domain} успішно випущено та підключено до HAProxy!`);
      setShowIssueModal(false);
      setDomain('');
      loadData();
    } catch (e: any) {
      alert(`Certbot Error: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleUploadCustom = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.uploadCustomCert({
        server_id: selectedServerId,
        domain,
        cert_content: certContent,
        key_content: keyContent
      });
      alert(`Кастомний SSL сертифікат для ${domain} успішно завантажено!`);
      setShowUploadModal(false);
      setDomain('');
      setCertContent('');
      setKeyContent('');
      loadData();
    } catch (e: any) {
      alert(`Upload Error: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleRenew = async (domainName: string) => {
    try {
      await api.renewCertificate(selectedServerId, domainName);
      alert(`Сертифікат для ${domainName} успішно оновлено!`);
      loadData();
    } catch (e: any) {
      alert(`Renew error: ${e.message}`);
    }
  };

  const handleToggleRule = (ruleId: string) => {
    setRules(prev => ({ ...prev, [ruleId]: !prev[ruleId] }));
  };

  const handleSaveWafConfig = async () => {
    try {
      await api.updateWafConfig(selectedServerId, wafMode, rules);
      alert(`WAF конфігурацію оновлено! Режим: ${wafMode}`);
      loadData();
    } catch (e: any) {
      alert(`WAF Error: ${e.message}`);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center space-x-2">
            <ShieldCheck className="w-6 h-6 text-cyan-400" />
            <span>SSL Менеджер & WAF (OWASP ModSecurity / Coraza)</span>
          </h1>
          <p className="text-gray-400 text-xs mt-1">Керування Let's Encrypt сертифікатами, захист від атак SQLi, XSS, RCE та ботів на рівні L7</p>
        </div>

        {/* Tab switcher */}
        <div className="flex items-center space-x-2 bg-gray-900/80 p-1 rounded-xl border border-gray-800">
          <button
            onClick={() => setActiveTab('ssl')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition ${
              activeTab === 'ssl' ? 'bg-cyan-500 text-black font-bold shadow-md shadow-cyan-950/50' : 'text-gray-400 hover:text-white'
            }`}
          >
            SSL Сертифікати
          </button>
          <button
            onClick={() => setActiveTab('waf')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition ${
              activeTab === 'waf' ? 'bg-cyan-500 text-black font-bold shadow-md shadow-cyan-950/50' : 'text-gray-400 hover:text-white'
            }`}
          >
            WAF Захист (OWASP CRS)
          </button>
        </div>
      </div>

      {/* TAB 1: SSL Certificates */}
      {activeTab === 'ssl' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center space-x-3">
              <span className="text-xs font-bold text-white uppercase tracking-wider">
                Встановлені SSL Сертифікати ({certs.length})
              </span>
              {servers.length > 0 && (
                <select
                  value={selectedServerId}
                  onChange={(e) => setSelectedServerId(Number(e.target.value))}
                  className="bg-gray-900 border border-gray-700 rounded-xl px-3 py-1 text-xs text-cyan-300 outline-none font-mono focus:border-cyan-400"
                >
                  {servers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.hostname} ({s.ip_address})
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={() => setShowUploadModal(true)}
                disabled={servers.length === 0 || selectedServerId <= 0}
                className="px-3.5 py-2 rounded-xl bg-gray-800 hover:bg-gray-700 disabled:opacity-50 text-purple-300 font-medium text-xs border border-gray-700 flex items-center space-x-1.5 transition"
              >
                <FileText className="w-4 h-4 text-purple-400" />
                <span>Завантажити Кастомний Cert</span>
              </button>

              <button
                onClick={() => setShowIssueModal(true)}
                disabled={servers.length === 0 || selectedServerId <= 0}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-400 hover:to-purple-400 disabled:opacity-50 text-black font-bold text-xs shadow-lg shadow-cyan-950/50 flex items-center space-x-1.5 transition"
              >
                <Plus className="w-4 h-4" />
                <span>Випустити Let's Encrypt (Certbot)</span>
              </button>
            </div>
          </div>

          {/* Cert Cards or Empty State */}
          {certs.length === 0 ? (
            <div className="glass-panel p-12 rounded-2xl border border-gray-800 text-center space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-cyan-950/60 border border-cyan-800/80 mx-auto flex items-center justify-center text-cyan-400">
                <Lock className="w-8 h-8" />
              </div>
              <div className="space-y-1 max-w-md mx-auto">
                <h3 className="font-bold text-white text-base">Немає випущених SSL сертифікатів</h3>
                <p className="text-xs text-gray-400">
                  Випустіть безкоштовний Let's Encrypt сертифікат з автоматичним оновленням або завантажте власний PEM/KEY сертифікат для HAProxy.
                </p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {certs.map((c) => (
              <div key={c.id} className="glass-panel p-6 rounded-2xl border border-gray-800 space-y-4">
                <div className="flex items-center justify-between border-b border-gray-800 pb-3">
                  <div className="flex items-center space-x-3">
                    <div className="w-9 h-9 rounded-xl bg-cyan-950/80 border border-cyan-800 flex items-center justify-center text-cyan-400">
                      <Lock className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-white text-sm font-mono">{c.domain}</h3>
                      <div className="text-xs text-gray-400">{c.issuer}</div>
                    </div>
                  </div>

                  <span className={`px-2.5 py-1 rounded text-xs font-bold font-mono ${
                    c.status === 'VALID' ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' :
                    'bg-amber-950 text-amber-400 border border-amber-800'
                  }`}>
                    {c.status === 'VALID' ? '✓ VALID' : '⚠ EXPIRING SOON'}
                  </span>
                </div>

                <div className="space-y-2 text-xs font-mono">
                  <div className="flex justify-between text-gray-400">
                    <span>SAN Домени:</span>
                    <span className="text-white">{c.alt_names.join(', ')}</span>
                  </div>
                  <div className="flex justify-between text-gray-400">
                    <span>Дійсний до:</span>
                    <span className="text-cyan-300 font-bold">{c.expires_at} ({c.days_remaining} днів)</span>
                  </div>
                  <div className="flex justify-between text-gray-400">
                    <span>Шлях до .pem:</span>
                    <span className="text-gray-500 truncate max-w-xs">{c.path}</span>
                  </div>
                </div>

                {/* Expiry Progress Bar */}
                <div className="space-y-1">
                  <div className="w-full bg-gray-900 rounded-full h-2 overflow-hidden border border-gray-800">
                    <div
                      className={`h-full rounded-full transition-all ${
                        c.days_remaining > 30 ? 'bg-emerald-400' : 'bg-amber-400'
                      }`}
                      style={{ width: `${Math.min(100, (c.days_remaining / 90) * 100)}%` }}
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-gray-800/80">
                  <span className="text-[11px] text-gray-500 font-mono">
                    {c.auto_renew ? '🌿 Auto-Renew Увімкнено' : 'Manual Renew'}
                  </span>

                  <button
                    onClick={() => handleRenew(c.domain)}
                    className="px-3 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-cyan-300 border border-gray-700 text-xs font-medium flex items-center space-x-1.5 transition"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Оновити (Certbot Renew)</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

          {/* Issue Modal */}
          {showIssueModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4">
              <div className="glass-panel max-w-lg w-full rounded-2xl p-6 border border-gray-700 space-y-4">
                <h2 className="text-lg font-bold text-white flex items-center space-x-2">
                  <Lock className="w-5 h-5 text-cyan-400" />
                  <span>Випустити Let's Encrypt SSL Сертифікат</span>
                </h2>

                <form onSubmit={handleIssueLetsEncrypt} className="space-y-4 text-xs font-mono">
                  <div>
                    <label className="text-gray-400 block mb-1">Основний Домен (Domain)</label>
                    <input
                      type="text"
                      required
                      placeholder="app.example.com"
                      value={domain}
                      onChange={(e) => setDomain(e.target.value)}
                      className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white outline-none focus:border-cyan-400"
                    />
                  </div>

                  <div>
                    <label className="text-gray-400 block mb-1">Додаткові SAN Домени (через кому)</label>
                    <input
                      type="text"
                      placeholder="www.example.com, api.example.com"
                      value={altNames}
                      onChange={(e) => setAltNames(e.target.value)}
                      className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-gray-400 block mb-1">Контактний Email (Для Let's Encrypt)</label>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white outline-none"
                    />
                  </div>

                  <div className="flex justify-end space-x-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setShowIssueModal(false)}
                      className="px-4 py-2 rounded-lg bg-gray-800 text-gray-300"
                    >
                      Скасувати
                    </button>
                    <button
                      type="submit"
                      disabled={loading}
                      className="px-4 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-black font-bold flex items-center space-x-1.5 transition"
                    >
                      {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                      <span>Отримати Сертифікат</span>
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Upload Custom Modal */}
          {showUploadModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4">
              <div className="glass-panel max-w-xl w-full rounded-2xl p-6 border border-gray-700 space-y-4">
                <h2 className="text-lg font-bold text-white flex items-center space-x-2">
                  <FileText className="w-5 h-5 text-purple-400" />
                  <span>Завантажити Комерційний SSL Сертифікат</span>
                </h2>

                <form onSubmit={handleUploadCustom} className="space-y-4 text-xs font-mono">
                  <div>
                    <label className="text-gray-400 block mb-1">Доменне Ім'я</label>
                    <input
                      type="text"
                      required
                      placeholder="secure.domain.com"
                      value={domain}
                      onChange={(e) => setDomain(e.target.value)}
                      className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-gray-400 block mb-1">Certificate (.crt / .pem Fullchain)</label>
                    <textarea
                      required
                      rows={4}
                      placeholder="-----BEGIN CERTIFICATE-----&#10;...&#10;-----END CERTIFICATE-----"
                      value={certContent}
                      onChange={(e) => setCertContent(e.target.value)}
                      className="w-full bg-gray-900 border border-gray-700 rounded-lg p-2.5 text-cyan-200 outline-none resize-none"
                    />
                  </div>

                  <div>
                    <label className="text-gray-400 block mb-1">Private Key (.key)</label>
                    <textarea
                      required
                      rows={4}
                      placeholder="-----BEGIN PRIVATE KEY-----&#10;...&#10;-----END PRIVATE KEY-----"
                      value={keyContent}
                      onChange={(e) => setKeyContent(e.target.value)}
                      className="w-full bg-gray-900 border border-gray-700 rounded-lg p-2.5 text-purple-200 outline-none resize-none"
                    />
                  </div>

                  <div className="flex justify-end space-x-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setShowUploadModal(false)}
                      className="px-4 py-2 rounded-lg bg-gray-800 text-gray-300"
                    >
                      Скасувати
                    </button>
                    <button
                      type="submit"
                      disabled={loading}
                      className="px-4 py-2 rounded-lg bg-purple-500 hover:bg-purple-400 text-black font-bold flex items-center space-x-1.5 transition"
                    >
                      <span>Об'єднати & Зберегти .pem</span>
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: WAF Security & OWASP Policies */}
      {activeTab === 'waf' && (
        <div className="space-y-6">
          {/* Status and Mode Selector */}
          <div className="glass-panel p-6 rounded-2xl border border-gray-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center space-x-2">
                <ShieldAlert className="w-5 h-5 text-rose-400" />
                <h2 className="text-sm font-bold text-white">{wafStatus?.engine}</h2>
              </div>
              <p className="text-xs text-gray-400">
                Перевірено запитів: <span className="text-cyan-300 font-mono font-bold">{wafStatus?.total_inspected_requests?.toLocaleString()}</span> • Заблоковано атак: <span className="text-rose-400 font-mono font-bold">{wafStatus?.total_blocked_attacks?.toLocaleString()}</span>
              </p>
            </div>

            <div className="flex items-center space-x-3">
              <span className="text-xs text-gray-400">Режим WAF:</span>
              <div className="grid grid-cols-3 gap-1 bg-gray-900 p-1 rounded-xl border border-gray-800 text-xs font-mono">
                {(['DISABLED', 'DETECTION_ONLY', 'BLOCKING'] as const).map((m) => (
                  <button
                    key={m}
                    onClick={() => setWafMode(m)}
                    className={`px-3 py-1.5 rounded-lg font-bold transition ${
                      wafMode === m
                        ? m === 'BLOCKING' ? 'bg-rose-500 text-black' : m === 'DETECTION_ONLY' ? 'bg-amber-500 text-black' : 'bg-gray-700 text-white'
                        : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    {m === 'BLOCKING' ? 'Block (403)' : m === 'DETECTION_ONLY' ? 'Detection' : 'Off'}
                  </button>
                ))}
              </div>

              <button
                onClick={handleSaveWafConfig}
                className="px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-black font-bold text-xs rounded-xl shadow-md shadow-cyan-950/50 transition"
              >
                Застосувати
              </button>
            </div>
          </div>

          {/* OWASP CRS Rules Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {wafStatus?.active_rulesets?.map((r: any) => (
              <div key={r.id} className="glass-panel p-4 rounded-xl border border-gray-800 flex items-center justify-between text-xs font-mono">
                <div className="space-y-0.5">
                  <div className="font-bold text-white">{r.name}</div>
                  <div className="text-[10px] text-gray-500">{r.id}</div>
                  <div className="text-[11px] text-rose-400 font-semibold">{r.blocked_count} атак заблоковано</div>
                </div>

                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={rules[r.id] ?? true}
                    onChange={() => handleToggleRule(r.id)}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-gray-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-rose-500"></div>
                </label>
              </div>
            ))}
          </div>

          {/* Live Incident Stream */}
          <div className="glass-panel rounded-2xl overflow-hidden border border-gray-800">
            <div className="p-4 bg-gray-900/40 border-b border-gray-800 flex items-center justify-between">
              <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center space-x-2">
                <Activity className="w-4 h-4 text-rose-400" />
                <span>Журнал Заблокованих Загроз (Live WAF Incident Log)</span>
              </span>
              <span className="text-xs font-mono text-cyan-400 font-bold">{wafEvents.length} Recent Events</span>
            </div>

            <table className="w-full text-left border-collapse text-xs font-mono">
              <thead>
                <tr className="border-b border-gray-800 bg-gray-900/60 text-gray-400 uppercase">
                  <th className="p-3">Event ID</th>
                  <th className="p-3">IP / Країна</th>
                  <th className="p-3">Правило OWASP</th>
                  <th className="p-3">Цільовий URI / Payload</th>
                  <th className="p-3">Рівень</th>
                  <th className="p-3 text-right">Дія</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/60">
                {wafEvents.map((evt) => (
                  <tr key={evt.id} className="hover:bg-gray-800/30">
                    <td className="p-3 font-bold text-gray-400">{evt.id}</td>
                    <td className="p-3 text-cyan-300 font-bold">
                      {evt.client_ip} <span className="text-[10px] text-gray-500">({evt.country})</span>
                    </td>
                    <td className="p-3">
                      <div className="text-white font-bold">{evt.rule_name}</div>
                      <div className="text-[10px] text-gray-500">ID: {evt.rule_id} ({evt.matched_var})</div>
                    </td>
                    <td className="p-3 text-rose-300 truncate max-w-xs">{evt.request_uri}</td>
                    <td className="p-3">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-950 text-rose-400 border border-rose-800">
                        {evt.severity}
                      </span>
                    </td>
                    <td className="p-3 text-right font-bold text-rose-400">
                      {evt.action}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
