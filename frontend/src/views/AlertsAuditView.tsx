import React, { useState, useEffect } from 'react';
import { Bell, Send, ShieldCheck, MessageSquare, Mail, RefreshCw, CheckCircle2, Trash2, Plus, AlertTriangle, Layers } from 'lucide-react';
import { Language, translations } from '../i18n/translations';
import { AuditLog } from '../types';
import { api } from '../services/api';

interface AlertsAuditViewProps {
  lang: Language;
}

export const AlertsAuditView: React.FC<AlertsAuditViewProps> = ({ lang }) => {
  const t = translations[lang];
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [channels, setChannels] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'channels' | 'audit'>('channels');

  // Channels form state
  const [channelType, setChannelType] = useState<'telegram' | 'slack' | 'discord' | 'email'>('telegram');
  const [channelName, setChannelName] = useState('Production DevOps Alerts');
  const [telegramToken, setTelegramToken] = useState('7123456789:AAFxAbcDeFgHiJkLmNoPqRsTuVwXyZ');
  const [telegramChatId, setTelegramChatId] = useState('-1001234567890');
  const [webhookUrl, setWebhookUrl] = useState('https://hooks.slack.com/services/T00/B00/XXXX');
  const [emailRecipient, setEmailRecipient] = useState('alerts@company.com');
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  useEffect(() => {
    loadData();
  }, [activeTab]);

  const loadData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'audit') {
        const res = await api.getAuditLogs();
        setLogs(res);
      } else {
        const res = await api.getAlertChannels();
        setChannels(res);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const getFormConfigJson = () => {
    if (channelType === 'telegram') {
      return JSON.stringify({ bot_token: telegramToken, chat_id: telegramChatId });
    } else if (channelType === 'slack' || channelType === 'discord') {
      return JSON.stringify({ webhook_url: webhookUrl });
    } else {
      return JSON.stringify({ recipient_email: emailRecipient, smtp_server: 'smtp.gmail.com' });
    }
  };

  const handleSendTest = async () => {
    setLoading(true);
    setTestResult(null);
    try {
      const configJson = getFormConfigJson();
      const res = await api.sendTestAlert(channelType, configJson);
      setTestResult(res);
    } catch (e: any) {
      setTestResult({ success: false, message: e.message });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveChannel = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const configJson = getFormConfigJson();
      await api.createAlertChannel({
        name: channelName,
        channel_type: channelType,
        config_json: configJson
      });
      alert(`Канал сповіщень "${channelName}" збережено!`);
      loadData();
    } catch (e: any) {
      alert(`Помилка збереження: ${e.response?.data?.detail || e.message}`);
    }
  };

  const handleDeleteChannel = async (channelId: number, name: string) => {
    if (!window.confirm(`Ви дійсно бажаєте видалити канал "${name}"?`)) {
      return;
    }

    try {
      await api.deleteAlertChannel(channelId);
      loadData();
    } catch (e: any) {
      alert(`Помилка видалення: ${e.response?.data?.detail || e.message}`);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center space-x-2">
            <Bell className="w-6 h-6 text-amber-400" />
            <span>Центр Сповіщень та Журнал Аудиту (Alerts & Audit)</span>
          </h1>
          <p className="text-gray-400 text-xs mt-1">Налаштування Telegram/Slack каналів, тригерів аварій та аудит дій користувачів</p>
        </div>

        {/* Tab switcher */}
        <div className="flex items-center space-x-2 bg-gray-900/80 p-1 rounded-xl border border-gray-800">
          <button
            onClick={() => setActiveTab('channels')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition ${
              activeTab === 'channels' ? 'bg-amber-500 text-black font-bold shadow-md shadow-amber-950/50' : 'text-gray-400 hover:text-white'
            }`}
          >
            Канали Сповіщень
          </button>
          <button
            onClick={() => setActiveTab('audit')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition ${
              activeTab === 'audit' ? 'bg-amber-500 text-black font-bold shadow-md shadow-amber-950/50' : 'text-gray-400 hover:text-white'
            }`}
          >
            Журнал Дій (Audit Log)
          </button>
        </div>
      </div>

      {activeTab === 'channels' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Channel Form */}
            <div className="glass-panel p-6 rounded-2xl border border-gray-800 space-y-4">
              <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center space-x-2">
                <MessageSquare className="w-4 h-4 text-amber-400" />
                <span>Додати Новий Канал Сповіщень</span>
              </h2>

              <form onSubmit={handleSaveChannel} className="space-y-4 text-xs font-mono">
                <div>
                  <label className="text-gray-400 block mb-1">Назва Каналу</label>
                  <input
                    type="text"
                    required
                    value={channelName}
                    onChange={(e) => setChannelName(e.target.value)}
                    className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white outline-none focus:border-amber-400"
                  />
                </div>

                <div>
                  <label className="text-gray-400 block mb-1">Тип Каналу</label>
                  <div className="grid grid-cols-4 gap-2">
                    {(['telegram', 'slack', 'discord', 'email'] as const).map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setChannelType(t)}
                        className={`py-2 rounded-xl text-xs font-mono font-bold capitalize transition ${
                          channelType === t ? 'bg-amber-500 text-black' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                        }`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>

                {channelType === 'telegram' && (
                  <div className="space-y-3 pt-1">
                    <div>
                      <label className="text-gray-400 block mb-1">Telegram Bot Token</label>
                      <input
                        type="text"
                        required
                        value={telegramToken}
                        onChange={(e) => setTelegramToken(e.target.value)}
                        className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-gray-400 block mb-1">Chat ID / Group ID</label>
                      <input
                        type="text"
                        required
                        value={telegramChatId}
                        onChange={(e) => setTelegramChatId(e.target.value)}
                        className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white outline-none"
                      />
                    </div>
                  </div>
                )}

                {(channelType === 'slack' || channelType === 'discord') && (
                  <div className="pt-1">
                    <label className="text-gray-400 block mb-1">Incoming Webhook URL</label>
                    <input
                      type="text"
                      required
                      value={webhookUrl}
                      onChange={(e) => setWebhookUrl(e.target.value)}
                      className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white outline-none"
                    />
                  </div>
                )}

                {channelType === 'email' && (
                  <div className="pt-1">
                    <label className="text-gray-400 block mb-1">Email Отримувача</label>
                    <input
                      type="email"
                      required
                      value={emailRecipient}
                      onChange={(e) => setEmailRecipient(e.target.value)}
                      className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white outline-none"
                    />
                  </div>
                )}

                {testResult && (
                  <div className={`p-3 rounded-xl border text-xs font-mono flex items-center space-x-2 ${
                    testResult.success ? 'bg-emerald-950/60 border-emerald-800 text-emerald-300' : 'bg-rose-950/60 border-rose-800 text-rose-300'
                  }`}>
                    {testResult.success ? <CheckCircle2 className="w-4 h-4" /> : <Mail className="w-4 h-4" />}
                    <span>{testResult.message}</span>
                  </div>
                )}

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={handleSendTest}
                    disabled={loading}
                    className="flex-1 py-2.5 bg-gray-800 hover:bg-gray-700 text-amber-300 font-bold text-xs rounded-xl border border-gray-700 flex items-center justify-center space-x-2 transition"
                  >
                    {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    <span>Тест</span>
                  </button>

                  <button
                    type="submit"
                    className="flex-1 py-2.5 bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs rounded-xl shadow-lg shadow-amber-950/50 flex items-center justify-center space-x-2 transition"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Зберегти Канал</span>
                  </button>
                </div>
              </form>
            </div>

            {/* Trigger Rules */}
            <div className="glass-panel p-6 rounded-2xl border border-gray-800 space-y-4">
              <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                Тригери Сповіщень (Alert Triggers)
              </h2>

              <div className="space-y-3 text-xs">
                <label className="flex items-center justify-between p-3 bg-gray-900/60 rounded-xl border border-gray-800 cursor-pointer">
                  <span className="text-white">Падіння Бекенд-сервера HAProxy / Nginx</span>
                  <input type="checkbox" defaultChecked className="accent-amber-400 rounded" />
                </label>

                <label className="flex items-center justify-between p-3 bg-gray-900/60 rounded-xl border border-gray-800 cursor-pointer">
                  <span className="text-white">Keepalived VRRP Failover (Міграція VIP на Backup)</span>
                  <input type="checkbox" defaultChecked className="accent-amber-400 rounded" />
                </label>

                <label className="flex items-center justify-between p-3 bg-gray-900/60 rounded-xl border border-gray-800 cursor-pointer">
                  <span className="text-white">Закінчення терміну дії SSL сертифіката (&lt; 14 днів)</span>
                  <input type="checkbox" defaultChecked className="accent-amber-400 rounded" />
                </label>

                <label className="flex items-center justify-between p-3 bg-gray-900/60 rounded-xl border border-gray-800 cursor-pointer">
                  <span className="text-white">Зміна конфігурації або відкат версії</span>
                  <input type="checkbox" defaultChecked className="accent-amber-400 rounded" />
                </label>
              </div>
            </div>
          </div>

          {/* Configured Channels List */}
          <div className="space-y-3">
            <h2 className="text-xs font-bold text-white uppercase tracking-wider">
              Налаштовані Канали Сповіщень ({channels.length})
            </h2>

            {channels.length === 0 ? (
              <div className="glass-panel p-8 rounded-2xl border border-gray-800 text-center space-y-2">
                <div className="w-12 h-12 rounded-xl bg-amber-950/60 border border-amber-800/80 mx-auto flex items-center justify-center text-amber-400">
                  <Bell className="w-6 h-6" />
                </div>
                <h3 className="font-bold text-white text-sm">Немає збережених каналів</h3>
                <p className="text-xs text-gray-400">Створіть Telegram, Slack або Discord канал для отримання важливих сповіщень.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {channels.map((ch) => (
                  <div key={ch.id} className="glass-panel p-5 rounded-2xl border border-gray-800 space-y-3 flex flex-col justify-between">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded-full bg-amber-950 text-amber-400 border border-amber-800">
                          {ch.channel_type}
                        </span>
                        <button
                          onClick={() => handleDeleteChannel(ch.id, ch.name)}
                          title="Видалити канал"
                          className="p-1 text-gray-500 hover:text-rose-400 transition"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      <h3 className="font-bold text-white text-sm">{ch.name}</h3>
                      <div className="text-[11px] font-mono text-gray-400 truncate">
                        ID: #{ch.id} • Створено: {new Date(ch.created_at).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'audit' && (
        <div className="glass-panel rounded-2xl overflow-hidden border border-gray-800">
          <div className="p-4 border-b border-gray-800 flex items-center justify-between">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">
              Останні Події Аудиту ({logs.length})
            </span>
            <button onClick={loadData} className="text-gray-400 hover:text-amber-400">
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>

          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-gray-800 bg-gray-900/60 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                <th className="p-4">Дія (Action)</th>
                <th className="p-4">Ресурс</th>
                <th className="p-4">Користувач</th>
                <th className="p-4">Деталі</th>
                <th className="p-4 text-right">Час</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800/60 text-xs font-mono">
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-gray-500">
                    Немає записів аудиту
                  </td>
                </tr>
              ) : (
                logs.map((l) => (
                  <tr key={l.id} className="hover:bg-gray-800/30">
                    <td className="p-4 font-bold text-amber-300">{l.action}</td>
                    <td className="p-4 text-cyan-300">{l.resource_type} #{l.resource_id || '-'}</td>
                    <td className="p-4 text-white font-bold">{l.username || 'system'}</td>
                    <td className="p-4 text-gray-300 truncate max-w-xs">{l.details}</td>
                    <td className="p-4 text-right text-gray-500">{new Date(l.timestamp).toLocaleTimeString()}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
