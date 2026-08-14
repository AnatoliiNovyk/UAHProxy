import React from 'react';
import { Settings, Users, Database, Shield, Key } from 'lucide-react';
import { Language } from '../i18n/translations';

interface SettingsViewProps {
  lang: Language;
}

export const SettingsView: React.FC<SettingsViewProps> = ({ lang }) => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-white flex items-center space-x-2">
          <Settings className="w-6 h-6 text-cyan-400" />
          <span>Системні Налаштування (RBAC, LDAP & Backups)</span>
        </h1>
        <p className="text-gray-400 text-xs mt-1">Управління правами доступу, інтеграція корпоративного LDAP та резервні копії</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* RBAC Users */}
        <div className="glass-panel p-6 rounded-2xl border border-gray-800 space-y-4">
          <div className="flex items-center space-x-2 border-b border-gray-800 pb-3">
            <Users className="w-5 h-5 text-purple-400" />
            <h2 className="font-semibold text-white">Користувачі та Ролі (RBAC)</h2>
          </div>

          <div className="space-y-2 text-xs">
            <div className="p-3 bg-gray-900/60 rounded-xl border border-gray-800 flex items-center justify-between">
              <div>
                <div className="font-bold text-white">admin</div>
                <div className="text-[11px] text-gray-500">admin@uaproxy.local</div>
              </div>
              <span className="px-2.5 py-0.5 rounded text-[10px] font-bold font-mono bg-purple-950 text-purple-300 border border-purple-800">
                SUPERADMIN
              </span>
            </div>

            <div className="p-3 bg-gray-900/60 rounded-xl border border-gray-800 flex items-center justify-between">
              <div>
                <div className="font-bold text-white">devops_manager</div>
                <div className="text-[11px] text-gray-500">devops@uaproxy.local</div>
              </div>
              <span className="px-2.5 py-0.5 rounded text-[10px] font-bold font-mono bg-cyan-950 text-cyan-300 border border-cyan-800">
                MANAGER
              </span>
            </div>
          </div>
        </div>

        {/* Backups & Restore */}
        <div className="glass-panel p-6 rounded-2xl border border-gray-800 space-y-4">
          <div className="flex items-center space-x-2 border-b border-gray-800 pb-3">
            <Database className="w-5 h-5 text-emerald-400" />
            <h2 className="font-semibold text-white">Резервне Копіювання (Backup & Restore)</h2>
          </div>

          <div className="space-y-3">
            <p className="text-xs text-gray-400">Створити повний дамп конфігурацій, серверів та ключів шифрування у zip архів.</p>
            <button
              onClick={() => alert('Creating encrypted backup zip archive...')}
              className="w-full py-2.5 rounded-xl bg-gray-800 hover:bg-gray-700 text-cyan-300 font-semibold text-xs border border-gray-700 transition"
            >
              Створити Резервну Копію (Backup Now)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
