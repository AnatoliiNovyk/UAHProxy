import React, { useState } from 'react';
import { BellRing, Send, ShieldAlert, History, Terminal } from 'lucide-react';
import { Language } from '../i18n/translations';
import { AuditLog } from '../types';
import { api } from '../services/api';

interface AlertsAuditViewProps {
  lang: Language;
  auditLogs: AuditLog[];
}

export const AlertsAuditView: React.FC<AlertsAuditViewProps> = ({ lang, auditLogs }) => {
  const [telegramToken, setTelegramToken] = useState('');
  const [telegramChatId, setTelegramChatId] = useState('');
  const [testResult, setTestResult] = useState<string | null>(null);

  const handleTestAlert = async () => {
    try {
      const cfg = JSON.stringify({ token: telegramToken, chat_id: telegramChatId });
      const res = await api.sendTestAlert('telegram', cfg);
      setTestResult(res.message);
    } catch (e: any) {
      setTestResult(`Failed to send test alert: ${e.message}`);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-white flex items-center space-x-2">
          <BellRing className="w-6 h-6 text-rose-400" />
          <span>Канали Сповіщень та Аудит Дій (Alerts & Action History)</span>
        </h1>
        <p className="text-gray-400 text-xs mt-1">Telegram, Slack, Email інтеграції та журналювання всіх операцій адміністраторів</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Telegram Config Panel */}
        <div className="glass-panel p-6 rounded-2xl border border-gray-800 space-y-4">
          <h2 className="font-bold text-white text-sm flex items-center space-x-2 border-b border-gray-800 pb-3">
            <Send className="w-4 h-4 text-cyan-400" />
            <span>Telegram Bot Integration</span>
          </h2>

          <div className="space-y-3">
            <div>
              <label className="text-xs text-gray-400">Bot API Token</label>
              <input
                type="password"
                placeholder="123456789:ABCdefGhIJKlmNoPQ..."
                value={telegramToken}
                onChange={(e) => setTelegramToken(e.target.value)}
                className="w-full mt-1 bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-cyan-400 font-mono"
              />
            </div>
            <div>
              <label className="text-xs text-gray-400">Chat ID / Channel</label>
              <input
                type="text"
                placeholder="-100123456789"
                value={telegramChatId}
                onChange={(e) => setTelegramChatId(e.target.value)}
                className="w-full mt-1 bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-cyan-400 font-mono"
              />
            </div>

            <button
              onClick={handleTestAlert}
              className="w-full py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-bold text-xs shadow-lg shadow-cyan-950/50 flex items-center justify-center space-x-2 transition"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Надіслати Тестовий Алерт</span>
            </button>

            {testResult && (
              <div className="p-3 bg-gray-900 rounded-xl text-xs font-mono text-cyan-300 border border-gray-800">
                {testResult}
              </div>
            )}
          </div>
        </div>

        {/* Audit Log Table */}
        <div className="lg:col-span-2 glass-panel p-6 rounded-2xl border border-gray-800 space-y-4">
          <h2 className="font-bold text-white text-sm flex items-center space-x-2 border-b border-gray-800 pb-3">
            <History className="w-4 h-4 text-purple-400" />
            <span>Журнал Аудиту (Action History Log)</span>
          </h2>

          <div className="overflow-x-auto max-h-80 overflow-y-auto pr-1">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-gray-800 text-gray-400 font-mono uppercase">
                  <th className="py-2">Час</th>
                  <th className="py-2">Користувач</th>
                  <th className="py-2">Дія (Action)</th>
                  <th className="py-2">Деталі</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/60 font-mono">
                {auditLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-800/30">
                    <td className="py-2.5 text-gray-500">{new Date(log.timestamp).toLocaleTimeString()}</td>
                    <td className="py-2.5 font-bold text-purple-300">{log.username || 'system'}</td>
                    <td className="py-2.5 text-cyan-400">{log.action}</td>
                    <td className="py-2.5 text-gray-300 truncate max-w-xs">{log.details}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
