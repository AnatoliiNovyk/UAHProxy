import React from 'react';
import { Lock, Shield, Globe, RefreshCw, KeyRound, Download } from 'lucide-react';
import { Language } from '../i18n/translations';

interface SslWafViewProps {
  lang: Language;
}

export const SslWafView: React.FC<SslWafViewProps> = ({ lang }) => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-white flex items-center space-x-2">
          <Lock className="w-6 h-6 text-cyan-400" />
          <span>SSL Сертифікати, WAF Захист та GeoIP</span>
        </h1>
        <p className="text-gray-400 text-xs mt-1">Автоматичний випуск Let’s Encrypt SSL, конвертація бази GeoIP та HAProxy ModSecurity WAF</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Let's Encrypt SSL Manager */}
        <div className="glass-panel p-6 rounded-2xl border border-gray-800 space-y-4">
          <div className="flex items-center space-x-2 border-b border-gray-800 pb-3">
            <KeyRound className="w-5 h-5 text-emerald-400" />
            <h2 className="font-semibold text-white">Let's Encrypt SSL Авто-випуск</h2>
          </div>

          <div className="space-y-3">
            <div>
              <label className="text-xs text-gray-400">Доменне Ім'я</label>
              <input
                type="text"
                placeholder="lb.uaproxy.org"
                className="w-full mt-1 bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:border-cyan-400 outline-none"
              />
            </div>
            <div>
              <label className="text-xs text-gray-400">Контактний Email</label>
              <input
                type="email"
                placeholder="admin@uaproxy.org"
                className="w-full mt-1 bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:border-cyan-400 outline-none"
              />
            </div>

            <button
              onClick={() => alert('Issuing Let\'s Encrypt SSL certificate...')}
              className="w-full py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs shadow-lg shadow-emerald-950/50 transition flex items-center justify-center space-x-2"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Отримати & Забіндити SSL Сертифікат</span>
            </button>
          </div>
        </div>

        {/* GeoIP Database & WAF Rules */}
        <div className="glass-panel p-6 rounded-2xl border border-gray-800 space-y-4">
          <div className="flex items-center space-x-2 border-b border-gray-800 pb-3">
            <Globe className="w-5 h-5 text-purple-400" />
            <h2 className="font-semibold text-white">GeoIP База & HAProxy WAF</h2>
          </div>

          <div className="space-y-3 text-xs text-gray-300">
            <div className="p-3 bg-gray-900/60 rounded-xl border border-gray-800 flex items-center justify-between">
              <div>
                <div className="font-bold text-white">MaxMind GeoLite2 Country DB</div>
                <div className="text-[11px] text-gray-500">Авто-конвертація у HAProxy map формат</div>
              </div>
              <button
                onClick={() => alert('GeoIP database downloaded and compiled to HAProxy map format.')}
                className="px-3 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-cyan-300 border border-gray-700 flex items-center space-x-1"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Оновити</span>
              </button>
            </div>

            <div className="p-3 bg-gray-900/60 rounded-xl border border-gray-800 flex items-center justify-between">
              <div>
                <div className="font-bold text-white">ModSecurity WAF Engine</div>
                <div className="text-[11px] text-gray-500">OWASP Core Rule Set (CRS v3.3)</div>
              </div>
              <span className="px-2.5 py-0.5 rounded text-[11px] font-mono bg-purple-950 text-purple-300 border border-purple-800">
                ACTIVE
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
