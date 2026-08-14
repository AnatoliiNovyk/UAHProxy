import React, { useState, useEffect } from 'react';
import { Settings, Users, Layers, Globe, Database, Plus, Shield, CheckCircle2, UserCheck, Trash2, Key, Copy, Check, Radio } from 'lucide-react';
import { Language, translations } from '../i18n/translations';
import { Server } from '../types';
import { api } from '../services/api';

interface SettingsViewProps {
  lang: Language;
  servers: Server[];
}

export const SettingsView: React.FC<SettingsViewProps> = ({ lang, servers }) => {
  const t = translations[lang];
  const [activeTab, setActiveTab] = useState<'users' | 'groups' | 'geoip' | 'prometheus'>('users');
  const [loading, setLoading] = useState(false);
  const [selectedServerId, setSelectedServerId] = useState<number>(servers[0]?.id || 0);

  // Users & Groups State
  const [users, setUsers] = useState<any[]>([]);
  const [groups, setGroups] = useState<any[]>([]);
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [showAddGroupModal, setShowAddGroupModal] = useState(false);

  // User form
  const [newUsername, setNewUsername] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState('admin');
  const [newGroupId, setNewGroupId] = useState<number | undefined>(undefined);

  // Group form
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupDesc, setNewGroupDesc] = useState('');

  // GeoIP State
  const [geoipStatus, setGeoipStatus] = useState<any>(null);
  const [selectedCountries, setSelectedCountries] = useState<string[]>(['RU', 'BY', 'KP', 'IR']);
  const [geoipMode, setGeoipMode] = useState('BLOCKLIST');

  // Prometheus State
  const [promConfig, setPromConfig] = useState('');
  const [copiedProm, setCopiedProm] = useState(false);

  const countryCatalog = [
    { code: 'RU', name: 'Russian Federation (Росія)' },
    { code: 'BY', name: 'Belarus (Білорусь)' },
    { code: 'KP', name: 'North Korea (КНДР)' },
    { code: 'IR', name: 'Iran (Іран)' },
    { code: 'CN', name: 'China (Китай)' },
    { code: 'SY', name: 'Syria (Сирія)' },
    { code: 'UA', name: 'Ukraine (Україна)' },
    { code: 'PL', name: 'Poland (Польща)' },
    { code: 'DE', name: 'Germany (Німеччина)' },
    { code: 'US', name: 'United States (США)' },
    { code: 'GB', name: 'United Kingdom (Британія)' },
  ];

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
    loadData();
  }, [activeTab]);

  const loadData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'users' || activeTab === 'groups') {
        const [usersRes, groupsRes] = await Promise.all([
          api.getUsers(),
          api.getServerGroups()
        ]);
        setUsers(usersRes);
        setGroups(groupsRes);
      } else if (activeTab === 'geoip') {
        const res = await api.getGeoIPStatus();
        setGeoipStatus(res);
      } else if (activeTab === 'prometheus') {
        const res = await api.getPrometheusConfig();
        setPromConfig(res.config);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.createUser({
        username: newUsername,
        email: newEmail,
        password: newPassword,
        role: newRole,
        group_id: newGroupId
      });
      alert(`Користувача ${newUsername} успішно створено!`);
      setShowAddUserModal(false);
      setNewUsername('');
      setNewEmail('');
      setNewPassword('');
      loadData();
    } catch (e: any) {
      alert(`Error creating user: ${e.response?.data?.detail || e.message}`);
    }
  };

  const handleDeleteUser = async (userId: number, username: string) => {
    if (username === 'admin') {
      alert('Неможливо видалити головного системного адміністратора (admin)');
      return;
    }
    if (!window.confirm(`Ви дійсно бажаєте видалити користувача "${username}"?`)) {
      return;
    }

    try {
      await api.deleteUser(userId);
      loadData();
    } catch (e: any) {
      alert(`Помилка видалення: ${e.response?.data?.detail || e.message}`);
    }
  };

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.createServerGroup({
        name: newGroupName,
        description: newGroupDesc
      });
      alert(`Серверну групу ${newGroupName} створено!`);
      setShowAddGroupModal(false);
      setNewGroupName('');
      setNewGroupDesc('');
      loadData();
    } catch (e: any) {
      alert(`Error creating group: ${e.response?.data?.detail || e.message}`);
    }
  };

  const handleDeleteGroup = async (groupId: number, groupName: string) => {
    if (!window.confirm(`Ви дійсно бажаєте видалити серверну групу "${groupName}"?`)) {
      return;
    }

    try {
      await api.deleteServerGroup(groupId);
      loadData();
    } catch (e: any) {
      alert(`Помилка видалення групи: ${e.response?.data?.detail || e.message}`);
    }
  };

  const handleToggleCountry = (code: string) => {
    if (selectedCountries.includes(code)) {
      setSelectedCountries(selectedCountries.filter(c => c !== code));
    } else {
      setSelectedCountries([...selectedCountries, code]);
    }
  };

  const handleApplyGeoIP = async () => {
    if (servers.length === 0 || selectedServerId <= 0) {
      alert('Будь ласка, підключіть сервер для застосування GeoIP правил.');
      return;
    }

    try {
      await api.applyGeoIPRules({
        server_id: selectedServerId,
        mode: geoipMode,
        country_codes: selectedCountries
      });
      alert(`GeoIP правила (${geoipMode}) успішно скомпільовано та застосовано на обраному сервері!`);
      loadData();
    } catch (e: any) {
      alert(`GeoIP Error: ${e.response?.data?.detail || e.message}`);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center space-x-2">
            <Settings className="w-6 h-6 text-purple-400" />
            <span>Системні Налаштування (RBAC, GeoIP & Prometheus)</span>
          </h1>
          <p className="text-gray-400 text-xs mt-1">Керування користувачами, ролями доступу, серверними групами, GeoIP фільтрами та метриками</p>
        </div>

        {/* Sub-tabs */}
        <div className="flex items-center space-x-1 bg-gray-900/80 p-1 rounded-xl border border-gray-800">
          <button
            onClick={() => setActiveTab('users')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition ${
              activeTab === 'users' ? 'bg-purple-500 text-black font-bold shadow-md shadow-purple-950/50' : 'text-gray-400 hover:text-white'
            }`}
          >
            Користувачі & RBAC
          </button>
          <button
            onClick={() => setActiveTab('groups')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition ${
              activeTab === 'groups' ? 'bg-purple-500 text-black font-bold shadow-md shadow-purple-950/50' : 'text-gray-400 hover:text-white'
            }`}
          >
            Серверні Групи
          </button>
          <button
            onClick={() => setActiveTab('geoip')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition ${
              activeTab === 'geoip' ? 'bg-purple-500 text-black font-bold shadow-md shadow-purple-950/50' : 'text-gray-400 hover:text-white'
            }`}
          >
            GeoIP Фільтрація
          </button>
          <button
            onClick={() => setActiveTab('prometheus')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition ${
              activeTab === 'prometheus' ? 'bg-purple-500 text-black font-bold shadow-md shadow-purple-950/50' : 'text-gray-400 hover:text-white'
            }`}
          >
            Prometheus Config
          </button>
        </div>
      </div>

      {/* TAB 1: Users & RBAC */}
      {activeTab === 'users' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-white uppercase tracking-wider">
              Облікові Записи Користувачів ({users.length})
            </span>
            <button
              onClick={() => setShowAddUserModal(true)}
              className="px-4 py-2 rounded-xl bg-purple-500 hover:bg-purple-400 text-black font-bold text-xs shadow-lg shadow-purple-950/50 flex items-center space-x-1.5 transition"
            >
              <Plus className="w-4 h-4" />
              <span>Додати Користувача</span>
            </button>
          </div>

          <div className="glass-panel rounded-2xl overflow-hidden border border-gray-800">
            <table className="w-full text-left border-collapse text-xs font-mono">
              <thead>
                <tr className="border-b border-gray-800 bg-gray-900/60 text-gray-400 uppercase">
                  <th className="p-4">Користувач</th>
                  <th className="p-4">Email</th>
                  <th className="p-4">Роль (RBAC)</th>
                  <th className="p-4">Статус</th>
                  <th className="p-4">Створено</th>
                  <th className="p-4 text-right">Дії</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/60">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-gray-800/30">
                    <td className="p-4 font-bold text-white flex items-center space-x-2">
                      <UserCheck className="w-4 h-4 text-purple-400" />
                      <span>{u.username}</span>
                    </td>
                    <td className="p-4 text-gray-300">{u.email}</td>
                    <td className="p-4">
                      <span className={`px-2.5 py-1 rounded text-[11px] font-bold ${
                        u.role === 'admin' ? 'bg-purple-950 text-purple-300 border border-purple-800' :
                        u.role === 'manager' ? 'bg-cyan-950 text-cyan-300 border border-cyan-800' :
                        'bg-gray-800 text-gray-400'
                      }`}>
                        {u.role === 'admin' ? '👑 SuperAdmin' : u.role === 'manager' ? '🛠️ Admin / Operator' : '👁️ Viewer'}
                      </span>
                    </td>
                    <td className="p-4">
                      <span className="text-emerald-400 font-bold">✓ Active</span>
                    </td>
                    <td className="p-4 text-gray-500">{new Date(u.created_at).toLocaleDateString()}</td>
                    <td className="p-4 text-right">
                      {u.username !== 'admin' && (
                        <button
                          onClick={() => handleDeleteUser(u.id, u.username)}
                          title="Видалити користувача"
                          className="p-1.5 rounded-lg bg-gray-800 hover:bg-rose-950 text-gray-400 hover:text-rose-400 border border-gray-700 hover:border-rose-800 transition"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Add User Modal */}
          {showAddUserModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4">
              <div className="glass-panel max-w-md w-full rounded-2xl p-6 border border-gray-700 space-y-4 text-xs font-mono">
                <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center space-x-2">
                  <Users className="w-4 h-4 text-purple-400" />
                  <span>Створити Нового Користувача</span>
                </h2>

                <form onSubmit={handleCreateUser} className="space-y-4">
                  <div>
                    <label className="text-gray-400 block mb-1">Username</label>
                    <input
                      type="text"
                      required
                      placeholder="devops_lead"
                      value={newUsername}
                      onChange={(e) => setNewUsername(e.target.value)}
                      className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-gray-400 block mb-1">Email</label>
                    <input
                      type="email"
                      required
                      placeholder="devops@company.com"
                      value={newEmail}
                      onChange={(e) => setNewEmail(e.target.value)}
                      className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-gray-400 block mb-1">Пароль</label>
                    <input
                      type="password"
                      required
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-gray-400 block mb-1">Роль (Access Level)</label>
                    <select
                      value={newRole}
                      onChange={(e) => setNewRole(e.target.value)}
                      className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-purple-300 outline-none"
                    >
                      <option value="admin">SuperAdmin (Повний доступ)</option>
                      <option value="manager">Admin / Operator (Редагування конфігів)</option>
                      <option value="viewer">Viewer (Тільки перегляд моніторингу)</option>
                    </select>
                  </div>

                  <div className="flex justify-end space-x-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setShowAddUserModal(false)}
                      className="px-4 py-2 rounded-lg bg-gray-800 text-gray-300"
                    >
                      Скасувати
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 rounded-lg bg-purple-500 hover:bg-purple-400 text-black font-bold transition"
                    >
                      Створити
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: Server Groups */}
      {activeTab === 'groups' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-white uppercase tracking-wider">
              Групи Серверів ({groups.length})
            </span>
            <button
              onClick={() => setShowAddGroupModal(true)}
              className="px-4 py-2 rounded-xl bg-purple-500 hover:bg-purple-400 text-black font-bold text-xs shadow-lg shadow-purple-950/50 flex items-center space-x-1.5 transition"
            >
              <Plus className="w-4 h-4" />
              <span>Створити Серверну Групу</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {groups.map((g) => (
              <div key={g.id} className="glass-panel p-5 rounded-2xl border border-gray-800 space-y-3">
                <div className="flex items-center justify-between border-b border-gray-800 pb-2">
                  <div className="flex items-center space-x-2">
                    <Layers className="w-4 h-4 text-purple-400" />
                    <h3 className="font-bold text-white text-sm">{g.name}</h3>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-[11px] font-mono text-cyan-400 font-bold">{g.server_count} Nodes</span>
                    <button
                      onClick={() => handleDeleteGroup(g.id, g.name)}
                      title="Видалити групу"
                      className="p-1 rounded-lg hover:bg-rose-950 text-gray-400 hover:text-rose-400 transition"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
                <p className="text-xs text-gray-400">{g.description || 'Немає опису'}</p>
                <div className="text-[11px] font-mono text-gray-500">Group ID: #{g.id}</div>
              </div>
            ))}
          </div>

          {/* Add Group Modal */}
          {showAddGroupModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4">
              <div className="glass-panel max-w-md w-full rounded-2xl p-6 border border-gray-700 space-y-4 text-xs font-mono">
                <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center space-x-2">
                  <Layers className="w-4 h-4 text-purple-400" />
                  <span>Нова Серверна Група</span>
                </h2>

                <form onSubmit={handleCreateGroup} className="space-y-4">
                  <div>
                    <label className="text-gray-400 block mb-1">Назва Групи</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. EU-West Gateways"
                      value={newGroupName}
                      onChange={(e) => setNewGroupName(e.target.value)}
                      className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-gray-400 block mb-1">Опис</label>
                    <input
                      type="text"
                      placeholder="Сервери європейського кластера"
                      value={newGroupDesc}
                      onChange={(e) => setNewGroupDesc(e.target.value)}
                      className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white outline-none"
                    />
                  </div>

                  <div className="flex justify-end space-x-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setShowAddGroupModal(false)}
                      className="px-4 py-2 rounded-lg bg-gray-800 text-gray-300"
                    >
                      Скасувати
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 rounded-lg bg-purple-500 hover:bg-purple-400 text-black font-bold transition"
                    >
                      Зберегти Групу
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: GeoIP Filtering */}
      {activeTab === 'geoip' && (
        <div className="space-y-6">
          <div className="glass-panel p-6 rounded-2xl border border-gray-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center space-x-2">
                <Globe className="w-5 h-5 text-cyan-400" />
                <h2 className="text-sm font-bold text-white">GeoLite2 Country Database ({geoipStatus?.database_version || '2026.08'})</h2>
              </div>
              <p className="text-xs text-gray-400">
                Завантажено IP діапазонів: <span className="text-cyan-300 font-mono font-bold">{geoipStatus?.total_ranges?.toLocaleString() || 385420}</span> • Auto-update: <span className="text-emerald-400 font-bold">ACTIVE</span>
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {servers.length > 0 && (
                <select
                  value={selectedServerId}
                  onChange={(e) => setSelectedServerId(Number(e.target.value))}
                  className="bg-gray-900 border border-gray-700 rounded-xl px-3 py-2 text-xs text-cyan-300 font-mono outline-none"
                >
                  {servers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.hostname} ({s.ip_address})
                    </option>
                  ))}
                </select>
              )}

              <select
                value={geoipMode}
                onChange={(e) => setGeoipMode(e.target.value)}
                className="bg-gray-900 border border-gray-700 rounded-xl px-3 py-2 text-xs text-cyan-300 font-mono outline-none"
              >
                <option value="BLOCKLIST">BLOCKLIST (Блокувати)</option>
                <option value="ALLOWLIST">ALLOWLIST (Дозволити)</option>
              </select>

              <button
                onClick={handleApplyGeoIP}
                disabled={servers.length === 0 || selectedServerId <= 0}
                className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-400 hover:to-purple-400 disabled:opacity-50 text-black font-bold text-xs rounded-xl shadow-md shadow-cyan-950/50 transition"
              >
                Застосувати на HAProxy
              </button>
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">
              Вибір Країн для Фільтрації ({selectedCountries.length} вибрано)
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {countryCatalog.map((c) => {
                const isSelected = selectedCountries.includes(c.code);
                return (
                  <button
                    key={c.code}
                    onClick={() => handleToggleCountry(c.code)}
                    className={`p-3 rounded-xl border text-xs text-left transition flex items-center justify-between ${
                      isSelected
                        ? 'bg-purple-950/60 border-purple-500 text-purple-200'
                        : 'bg-gray-900/60 border-gray-800 text-gray-400 hover:border-gray-700'
                    }`}
                  >
                    <div>
                      <div className="font-bold font-mono">{c.code}</div>
                      <div className="text-[11px] truncate text-gray-300">{c.name}</div>
                    </div>
                    {isSelected && <Check className="w-4 h-4 text-purple-400 flex-shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: Prometheus Config */}
      {activeTab === 'prometheus' && (
        <div className="glass-panel p-6 rounded-2xl border border-gray-800 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-white">Згенерований prometheus.yml</h2>
              <p className="text-xs text-gray-400">Автоматичний scrape-конфіг для всіх зареєстрованих HAProxy та Node Exporter експортерів</p>
            </div>

            <button
              onClick={() => {
                navigator.clipboard.writeText(promConfig);
                setCopiedProm(true);
                setTimeout(() => setCopiedProm(false), 2000);
              }}
              className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-cyan-300 text-xs font-mono rounded-xl border border-gray-700 flex items-center space-x-1.5 transition"
            >
              {copiedProm ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              <span>{copiedProm ? 'Скопійовано!' : 'Копіювати YAML'}</span>
            </button>
          </div>

          <pre className="p-4 bg-gray-950 rounded-xl font-mono text-xs text-gray-300 overflow-x-auto max-h-96 whitespace-pre-wrap">
            {promConfig}
          </pre>
        </div>
      )}
    </div>
  );
};
