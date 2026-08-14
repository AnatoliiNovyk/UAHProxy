import React, { useState } from 'react';
import { Server as ServerIcon, Plus, Terminal, CheckCircle2, Shield, AlertCircle, Key, Trash2, Globe } from 'lucide-react';
import { Language, translations } from '../i18n/translations';
import { Server } from '../types';
import { api } from '../services/api';

interface ServersViewProps {
  lang: Language;
  servers: Server[];
  onRefresh: () => void;
}

export const ServersView: React.FC<ServersViewProps> = ({ lang, servers, onRefresh }) => {
  const t = translations[lang];
  const [showAddModal, setShowAddModal] = useState(false);
  const [testingId, setTestingId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [testResult, setTestResult] = useState<{ id: number; message: string; success: boolean } | null>(null);

  // Form State
  const [hostname, setHostname] = useState('');
  const [ipAddress, setIpAddress] = useState('');
  const [sshPort, setSshPort] = useState(22);
  const [sshUsername, setSshUsername] = useState('root');
  const [sshPassword, setSshPassword] = useState('');
  const [hasHaproxy, setHasHaproxy] = useState(true);
  const [hasNginx, setHasNginx] = useState(false);
  const [hasKeepalived, setHasKeepalived] = useState(false);

  const handleTestSsh = async (serverId: number) => {
    setTestingId(serverId);
    try {
      const res = await api.testSsh(serverId);
      setTestResult({
        id: serverId,
        success: res.success,
        message: res.success ? `SSH OK: ${res.output}` : `SSH Failed: ${res.error}`
      });
    } catch (e: any) {
      setTestResult({
        id: serverId,
        success: false,
        message: `SSH Connection error: ${e.message}`
      });
    } finally {
      setTestingId(null);
    }
  };

  const handleDeleteServer = async (serverId: number, serverHost: string) => {
    if (!window.confirm(`Ви дійсно бажаєте видалити вузол "${serverHost}" з панелі?`)) {
      return;
    }

    setDeletingId(serverId);
    try {
      await api.deleteServer(serverId);
      onRefresh();
    } catch (e: any) {
      alert(`Помилка видалення: ${e.message}`);
    } finally {
      setDeletingId(null);
    }
  };

  const handleAddServer = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.addServer({
        hostname,
        ip_address: ipAddress,
        ssh_port: sshPort,
        ssh_username: sshUsername,
        ssh_password: sshPassword,
        has_haproxy: hasHaproxy,
        has_nginx: hasNginx,
        has_keepalived: hasKeepalived
      });
      setShowAddModal(false);
      setHostname('');
      setIpAddress('');
      setSshPassword('');
      onRefresh();
    } catch (err: any) {
      alert(`Не вдалося додати сервер: ${err.message}`);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center space-x-2">
            <ServerIcon className="w-6 h-6 text-cyan-400" />
            <span>Сервери та Інфраструктура ({servers.length})</span>
          </h1>
          <p className="text-gray-400 text-xs mt-1">Управління підключеннями, SSH-ключами та службами на вузлах</p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-black font-semibold text-xs rounded-xl shadow-lg shadow-cyan-950/50 flex items-center space-x-2 transition"
        >
          <Plus className="w-4 h-4" />
          <span>{t.add_server}</span>
        </button>
      </div>

      {/* Servers Table or Empty State */}
      {servers.length === 0 ? (
        <div className="glass-panel p-12 rounded-2xl border border-gray-800 text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-cyan-950/60 border border-cyan-800/80 mx-auto flex items-center justify-center text-cyan-400">
            <Globe className="w-8 h-8" />
          </div>
          <div className="space-y-1 max-w-md mx-auto">
            <h3 className="font-bold text-white text-base">Немає підключених серверів</h3>
            <p className="text-xs text-gray-400">
              Підключіть ваш перший HAProxy, Nginx або Keepalived сервер через SSH для моніторингу та керування конфігураціями.
            </p>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="px-5 py-2.5 bg-cyan-500 hover:bg-cyan-400 text-black font-bold text-xs rounded-xl shadow-lg shadow-cyan-950/50 inline-flex items-center space-x-2 transition"
          >
            <Plus className="w-4 h-4" />
            <span>Додати Перший Сервер</span>
          </button>
        </div>
      ) : (
        <div className="glass-panel rounded-2xl overflow-hidden border border-gray-800">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-gray-800 bg-gray-900/60 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                <th className="p-4">Хостнейм / IP</th>
                <th className="p-4">SSH Доступ</th>
                <th className="p-4">Встановлені Сервіси</th>
                <th className="p-4">Статус З'єднання</th>
                <th className="p-4 text-right">Дії</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800/60 text-sm">
              {servers.map((s) => (
                <tr key={s.id} className="hover:bg-gray-800/30 transition">
                  <td className="p-4">
                    <div className="font-semibold text-white">{s.hostname}</div>
                    <div className="text-xs font-mono text-cyan-400">{s.ip_address}</div>
                  </td>
                  <td className="p-4">
                    <div className="text-xs font-mono text-gray-300">{s.ssh_username}@{s.ip_address}:{s.ssh_port}</div>
                    <div className="text-[10px] text-gray-500 flex items-center space-x-1 mt-0.5">
                      <Key className="w-3 h-3 text-purple-400" />
                      <span>AES-256 Fernet Encrypted</span>
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="flex flex-wrap gap-1.5">
                      {s.has_haproxy && <span className="px-2 py-0.5 rounded text-[11px] font-mono bg-cyan-950 text-cyan-300 border border-cyan-800">HAProxy</span>}
                      {s.has_nginx && <span className="px-2 py-0.5 rounded text-[11px] font-mono bg-emerald-950 text-emerald-300 border border-emerald-800">Nginx</span>}
                      {s.has_apache && <span className="px-2 py-0.5 rounded text-[11px] font-mono bg-rose-950 text-rose-300 border border-rose-800">Apache</span>}
                      {s.has_keepalived && <span className="px-2 py-0.5 rounded text-[11px] font-mono bg-purple-950 text-purple-300 border border-purple-800">Keepalived</span>}
                    </div>
                  </td>
                  <td className="p-4">
                    {testResult && testResult.id === s.id ? (
                      <span className={`text-xs font-mono px-2.5 py-1 rounded-md ${testResult.success ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' : 'bg-rose-950 text-rose-400 border border-rose-800'}`}>
                        {testResult.message}
                      </span>
                    ) : (
                      <span className="inline-flex items-center space-x-1 text-xs text-gray-400 font-mono">
                        <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400" />
                        <span>Ready</span>
                      </span>
                    )}
                  </td>
                  <td className="p-4 text-right">
                    <div className="flex items-center justify-end space-x-2">
                      <button
                        onClick={() => handleTestSsh(s.id)}
                        disabled={testingId === s.id}
                        className="px-3 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-xs font-medium text-cyan-300 border border-gray-700 transition flex items-center space-x-1"
                      >
                        <Terminal className="w-3.5 h-3.5" />
                        <span>{testingId === s.id ? 'Перевірка...' : t.test_ssh}</span>
                      </button>

                      <button
                        onClick={() => handleDeleteServer(s.id, s.hostname)}
                        disabled={deletingId === s.id}
                        title="Видалити вузол"
                        className="p-1.5 rounded-lg bg-gray-800 hover:bg-rose-950 text-gray-400 hover:text-rose-400 border border-gray-700 hover:border-rose-800 transition"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add Server Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="glass-panel max-w-md w-full rounded-2xl p-6 border border-gray-700 space-y-4">
            <h2 className="text-lg font-bold text-white flex items-center space-x-2">
              <Shield className="w-5 h-5 text-cyan-400" />
              <span>Додати новий вузол (Server Node)</span>
            </h2>

            <form onSubmit={handleAddServer} className="space-y-3">
              <div>
                <label className="text-xs font-medium text-gray-400">Hostname</label>
                <input
                  type="text"
                  required
                  placeholder="lb-node-01.company.ua"
                  value={hostname}
                  onChange={(e) => setHostname(e.target.value)}
                  className="w-full mt-1 bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:border-cyan-400 outline-none"
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-2">
                  <label className="text-xs font-medium text-gray-400">IP-адреса</label>
                  <input
                    type="text"
                    required
                    placeholder="192.168.1.105"
                    value={ipAddress}
                    onChange={(e) => setIpAddress(e.target.value)}
                    className="w-full mt-1 bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:border-cyan-400 outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-400">SSH Порт</label>
                  <input
                    type="number"
                    value={sshPort}
                    onChange={(e) => setSshPort(Number(e.target.value))}
                    className="w-full mt-1 bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:border-cyan-400 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-medium text-gray-400">SSH Юзер</label>
                  <input
                    type="text"
                    value={sshUsername}
                    onChange={(e) => setSshUsername(e.target.value)}
                    className="w-full mt-1 bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:border-cyan-400 outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-400">Пароль / Key Pass</label>
                  <input
                    type="password"
                    placeholder="Encrypted automatically"
                    value={sshPassword}
                    onChange={(e) => setSshPassword(e.target.value)}
                    className="w-full mt-1 bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:border-cyan-400 outline-none"
                  />
                </div>
              </div>

              <div className="pt-2 border-t border-gray-800">
                <label className="text-xs font-medium text-gray-400 block mb-2">Наявні сервіси на вузлі</label>
                <div className="flex flex-wrap gap-4 text-xs">
                  <label className="flex items-center space-x-1.5 text-gray-300">
                    <input type="checkbox" checked={hasHaproxy} onChange={(e) => setHasHaproxy(e.target.checked)} className="rounded accent-cyan-400" />
                    <span>HAProxy</span>
                  </label>
                  <label className="flex items-center space-x-1.5 text-gray-300">
                    <input type="checkbox" checked={hasNginx} onChange={(e) => setHasNginx(e.target.checked)} className="rounded accent-emerald-400" />
                    <span>Nginx</span>
                  </label>
                  <label className="flex items-center space-x-1.5 text-gray-300">
                    <input type="checkbox" checked={hasKeepalived} onChange={(e) => setHasKeepalived(e.target.checked)} className="rounded accent-purple-400" />
                    <span>Keepalived</span>
                  </label>
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-xs text-gray-300 transition"
                >
                  Скасувати
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-black font-semibold text-xs transition"
                >
                  Зберегти Вузол
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
