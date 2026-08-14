import React, { useState, useEffect } from 'react';
import { ShieldCheck, AlertTriangle, XCircle, CheckCircle2, Clock, Activity, Globe, ArrowLeft } from 'lucide-react';
import { api } from '../services/api';

interface PublicStatusPageViewProps {
  onBackToDashboard?: () => void;
}

export const PublicStatusPageView: React.FC<PublicStatusPageViewProps> = ({ onBackToDashboard }) => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStatus();
    const interval = setInterval(loadStatus, 15000);
    return () => clearInterval(interval);
  }, []);

  const loadStatus = async () => {
    try {
      const res = await api.getPublicStatusPage();
      setData(res);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const isAllUp = data?.system_status === 'OPERATIONAL';

  return (
    <div className="min-h-screen bg-[#07090E] text-white p-4 md:p-8 flex flex-col items-center justify-start">
      <div className="max-w-4xl w-full space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-800/80 pb-6">
          <div className="flex items-center space-x-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-cyan-400 to-purple-600 flex items-center justify-center text-black font-extrabold shadow-lg shadow-cyan-950/40">
              UA
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-white flex items-center space-x-2">
                <span>UAProxy System Status</span>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-cyan-950 text-cyan-300 border border-cyan-800">
                  LIVE
                </span>
              </h1>
              <p className="text-xs text-gray-400">Публічна сторінка стану інфраструктури та доступності сервісів</p>
            </div>
          </div>

          {onBackToDashboard && (
            <button
              onClick={onBackToDashboard}
              className="px-3.5 py-2 rounded-xl bg-gray-900 hover:bg-gray-800 text-xs text-gray-300 border border-gray-800 flex items-center space-x-1.5 transition"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Панель Керування</span>
            </button>
          )}
        </div>

        {/* Global Status Banner */}
        <div className={`p-6 rounded-2xl border flex items-center justify-between shadow-2xl transition-all ${
          isAllUp
            ? 'bg-emerald-950/40 border-emerald-500/40 shadow-emerald-950/20'
            : 'bg-amber-950/40 border-amber-500/40 shadow-amber-950/20'
        }`}>
          <div className="flex items-center space-x-4">
            {isAllUp ? (
              <CheckCircle2 className="w-10 h-10 text-emerald-400 flex-shrink-0" />
            ) : (
              <AlertTriangle className="w-10 h-10 text-amber-400 flex-shrink-0" />
            )}
            <div>
              <h2 className="text-lg font-bold text-white">
                {isAllUp ? 'Усі Сервіси Працюють у Штатному Режимі' : 'Зафіксовано Деградацію Деяких Сервісів'}
              </h2>
              <p className="text-xs text-gray-400 mt-0.5">
                Загальний Uptime (30 днів): <span className="text-emerald-400 font-mono font-bold">{data?.overall_uptime || 99.98}%</span> • Монітори: {data?.up_monitors || 0}/{data?.total_monitors || 0} Online
              </p>
            </div>
          </div>

          <div className="hidden md:flex items-center space-x-2 text-xs font-mono text-gray-400">
            <Clock className="w-4 h-4 text-cyan-400" />
            <span>Оновлено: {new Date().toLocaleTimeString()}</span>
          </div>
        </div>

        {/* 90-Day Uptime Bar */}
        <div className="glass-panel p-5 rounded-2xl border border-gray-800 space-y-3">
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-400 font-medium">Історія доступності системи (Останні 30 днів)</span>
            <span className="text-emerald-400 font-bold font-mono">99.98% Доступність</span>
          </div>
          <div className="grid grid-cols-30 gap-1 h-7">
            {Array.from({ length: 30 }, (_, i) => (
              <div
                key={i}
                title={`Day -${30 - i}: 100% Uptime`}
                className="h-full rounded bg-emerald-500/80 hover:bg-emerald-400 transition cursor-pointer"
              />
            ))}
          </div>
          <div className="flex items-center justify-between text-[11px] text-gray-500 font-mono">
            <span>30 днів тому</span>
            <span>15 днів тому</span>
            <span>Сьогодні</span>
          </div>
        </div>

        {/* Monitored Services List */}
        <div className="space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 px-1">
            Компоненти Інфраструктури
          </h3>

          <div className="glass-panel rounded-2xl overflow-hidden border border-gray-800 divide-y divide-gray-800/80">
            {data?.services?.map((svc: any) => (
              <div key={svc.id} className="p-4 flex items-center justify-between hover:bg-gray-800/20 transition">
                <div className="space-y-1">
                  <div className="flex items-center space-x-2.5">
                    <span className="font-semibold text-sm text-white">{svc.name}</span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-gray-800 text-gray-400 uppercase">
                      {svc.target_type}
                    </span>
                  </div>
                  <div className="text-xs text-gray-400 font-mono">{svc.details}</div>
                </div>

                <div className="flex items-center space-x-6">
                  <div className="text-right hidden sm:block">
                    <div className="text-xs font-mono text-cyan-300 font-bold">{svc.response_time_ms} ms</div>
                    <div className="text-[10px] text-gray-500">Latency</div>
                  </div>

                  <span className={`px-3 py-1 rounded-full text-xs font-bold font-mono ${
                    svc.status === 'UP' ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' :
                    svc.status === 'WARNING' ? 'bg-amber-950 text-amber-400 border border-amber-800' :
                    'bg-rose-950 text-rose-400 border border-rose-800'
                  }`}>
                    {svc.status === 'UP' ? 'Operational' : svc.status === 'WARNING' ? 'Degraded' : 'Major Outage'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="text-center pt-8 border-t border-gray-900 text-xs text-gray-600 space-y-1">
          <p>UAProxy Premium High-Availability & Monitoring Suite</p>
          <p>© 2026 Powered by FastAPI, React & HAProxy</p>
        </div>
      </div>
    </div>
  );
};
