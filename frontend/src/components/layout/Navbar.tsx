import React from 'react';
import { ShieldCheck, Globe, Bell, User, Cpu, LogOut } from 'lucide-react';
import { Language, translations } from '../../i18n/translations';
import { User as UserType } from '../../types';

interface NavbarProps {
  lang: Language;
  setLang: (lang: Language) => void;
  activeAlerts: number;
  currentUser?: UserType | null;
  onLogout?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ lang, setLang, activeAlerts, currentUser, onLogout }) => {
  const t = translations[lang];

  const roleLabel = (role?: string) => {
    if (role === 'admin') return 'SUPERADMIN';
    if (role === 'manager') return 'OPERATOR';
    return 'VIEWER';
  };

  const roleColor = (role?: string) => {
    if (role === 'admin') return 'text-purple-400';
    if (role === 'manager') return 'text-cyan-400';
    return 'text-gray-400';
  };

  return (
    <header className="h-16 glass-panel border-b border-gray-800 px-6 flex items-center justify-between sticky top-0 z-40">
      <div className="flex items-center space-x-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 to-purple-600 flex items-center justify-center glow-cyan shadow-lg">
          <ShieldCheck className="w-6 h-6 text-black stroke-[2.5]" />
        </div>
        <div>
          <span className="font-bold text-lg tracking-wide bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400 bg-clip-text text-transparent">
            {t.brand}
          </span>
          <span className="ml-2 text-xs font-mono px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-400 border border-cyan-800">
            v1.0-Premium
          </span>
        </div>
      </div>

      <div className="flex items-center space-x-4">
        {/* Realtime Socket Status Indicator */}
        <div className="hidden md:flex items-center space-x-2 bg-gray-900/80 px-3 py-1.5 rounded-lg border border-gray-800 text-xs font-mono">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          <span className="text-gray-300">Live WS Sync</span>
        </div>

        {/* Language Switcher */}
        <button
          onClick={() => setLang(lang === 'uk' ? 'en' : 'uk')}
          className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-gray-800/60 hover:bg-gray-800 text-xs font-medium text-gray-300 border border-gray-700 transition cursor-pointer"
        >
          <Globe className="w-4 h-4 text-cyan-400" />
          <span>{lang === 'uk' ? 'UA 🇺🇦' : 'EN 🇬🇧'}</span>
        </button>

        {/* Alert Notifications */}
        <div className="relative">
          <button className="p-2 rounded-lg bg-gray-800/60 hover:bg-gray-800 text-gray-300 border border-gray-700 transition">
            <Bell className="w-4 h-4" />
            {activeAlerts > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 text-white rounded-full text-[10px] flex items-center justify-center font-bold">
                {activeAlerts}
              </span>
            )}
          </button>
        </div>

        {/* User Profile & Logout */}
        <div className="flex items-center space-x-3 pl-3 border-l border-gray-800">
          <div className="w-8 h-8 rounded-full bg-purple-950 border border-purple-700 text-purple-300 flex items-center justify-center font-bold text-xs uppercase">
            {currentUser?.username ? currentUser.username.substring(0, 2) : 'AD'}
          </div>
          <div className="hidden sm:block text-left">
            <div className="text-xs font-semibold text-gray-200">{currentUser?.username || 'admin'}</div>
            <div className={`text-[10px] font-mono font-bold ${roleColor(currentUser?.role)}`}>
              {roleLabel(currentUser?.role)}
            </div>
          </div>

          {onLogout && (
            <button
              onClick={onLogout}
              title="Вийти з системи"
              className="p-2 rounded-lg bg-gray-800/40 hover:bg-rose-950/80 text-gray-400 hover:text-rose-300 border border-gray-800 hover:border-rose-800/60 transition cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
