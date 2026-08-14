import React from 'react';
import {
  LayoutDashboard,
  Server,
  DownloadCloud,
  FileCode2,
  Activity,
  Radio,
  Network,
  Lock,
  BellRing,
  Settings
} from 'lucide-react';
import { Language, translations } from '../../i18n/translations';

interface SidebarProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  lang: Language;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentTab, setCurrentTab, lang }) => {
  const t = translations[lang];

  const menuItems = [
    { id: 'dashboard', label: t.dashboard, icon: LayoutDashboard },
    { id: 'servers', label: t.servers, icon: Server },
    { id: 'installer', label: t.installer, icon: DownloadCloud },
    { id: 'configs', label: t.config_editor, icon: FileCode2 },
    { id: 'runtime', label: t.runtime_api, icon: Activity },
    { id: 'smon', label: t.smon, icon: Radio },
    { id: 'clusters', label: t.clusters, icon: Network },
    { id: 'ssl_waf', label: t.ssl_waf, icon: Lock },
    { id: 'alerts', label: t.alerts_audit, icon: BellRing },
    { id: 'settings', label: t.settings, icon: Settings },
  ];

  return (
    <aside className="w-64 glass-panel border-r border-gray-800 hidden md:flex flex-col min-h-[calc(100vh-4rem)]">
      <div className="p-4 space-y-1">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;

          return (
            <button
              key={item.id}
              onClick={() => setCurrentTab(item.id)}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl font-medium text-sm transition-all duration-200 ${
                isActive
                  ? 'bg-gradient-to-r from-cyan-500/20 to-purple-500/20 text-cyan-300 border border-cyan-500/30 shadow-lg shadow-cyan-950/50'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/40'
              }`}
            >
              <Icon className={`w-5 h-5 ${isActive ? 'text-cyan-400' : 'text-gray-400'}`} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>

      <div className="mt-auto p-4 border-t border-gray-800/60">
        <div className="p-3 rounded-xl bg-gray-900/60 border border-gray-800 text-xs">
          <div className="flex items-center justify-between text-gray-400 mb-1">
            <span>Git Auto-Sync</span>
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
          </div>
          <div className="font-mono text-cyan-400 text-[11px] truncate">repo: uaproxy/infra-configs</div>
        </div>
      </div>
    </aside>
  );
};
