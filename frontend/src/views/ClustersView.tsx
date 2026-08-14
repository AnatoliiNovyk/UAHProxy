import React, { useState } from 'react';
import { Network, Plus, ShieldCheck, Cpu, ArrowRight, Layers } from 'lucide-react';
import { Language, translations } from '../i18n/translations';
import { Cluster, Server } from '../types';

interface ClustersViewProps {
  lang: Language;
  clusters: Cluster[];
  servers: Server[];
}

export const ClustersView: React.FC<ClustersViewProps> = ({ lang, clusters, servers }) => {
  const t = translations[lang];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center space-x-2">
            <Network className="w-6 h-6 text-purple-400" />
            <span>High-Availability Кластери (Keepalived VRRP & Master-Slave)</span>
          </h1>
          <p className="text-gray-400 text-xs mt-1">{t.clusters_desc}</p>
        </div>

        <button
          onClick={() => alert('Cluster Creation Wizard initialized')}
          className="px-4 py-2 bg-gradient-to-r from-purple-500 to-cyan-500 text-black font-semibold text-xs rounded-xl shadow-lg shadow-purple-950/50 flex items-center space-x-1.5 transition"
        >
          <Plus className="w-4 h-4" />
          <span>Створити HA Кластер</span>
        </button>
      </div>

      {/* Cluster Diagram Topology Cards */}
      <div className="space-y-4">
        {clusters.map((c) => (
          <div key={c.id} className="glass-panel p-6 rounded-2xl border border-gray-800 space-y-4">
            <div className="flex items-center justify-between border-b border-gray-800 pb-3">
              <div className="flex items-center space-x-3">
                <div className="w-9 h-9 rounded-xl bg-purple-950 text-purple-400 border border-purple-800 flex items-center justify-center font-bold">
                  VRRP
                </div>
                <div>
                  <h3 className="font-bold text-white text-base">{c.name}</h3>
                  <div className="text-xs font-mono text-cyan-400">Virtual IP (VIP): {c.virtual_ip}</div>
                </div>
              </div>

              <span className="px-3 py-1 rounded-full text-xs font-bold font-mono bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                {c.state}
              </span>
            </div>

            {/* Topology Visualizer */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
              {/* MASTER */}
              <div className="p-4 rounded-xl bg-gray-900/80 border border-cyan-500/40 relative">
                <div className="absolute -top-2.5 right-3 px-2 py-0.5 rounded text-[10px] font-bold font-mono bg-cyan-500 text-black">
                  MASTER (Prio: 101)
                </div>
                <div className="font-bold text-white text-sm">lb-primary-01.local</div>
                <div className="text-xs font-mono text-gray-400">192.168.1.100</div>
                <div className="mt-2 text-[11px] text-emerald-400 font-mono">BIND VIP Active</div>
              </div>

              {/* VRRP SYNC PATH */}
              <div className="flex flex-col items-center justify-center py-2">
                <div className="text-xs font-mono text-purple-400 mb-1 flex items-center space-x-1">
                  <Layers className="w-3.5 h-3.5" />
                  <span>VRRP Heartbeat</span>
                </div>
                <div className="w-full h-0.5 bg-gradient-to-r from-cyan-500 via-purple-500 to-gray-600 relative">
                  <div className="w-2 h-2 rounded-full bg-cyan-400 absolute top-1/2 -translate-y-1/2 left-1/4 animate-ping"></div>
                </div>
              </div>

              {/* SLAVE */}
              <div className="p-4 rounded-xl bg-gray-900/60 border border-gray-800 relative">
                <div className="absolute -top-2.5 right-3 px-2 py-0.5 rounded text-[10px] font-bold font-mono bg-gray-800 text-gray-400">
                  BACKUP (Prio: 100)
                </div>
                <div className="font-bold text-gray-300 text-sm">web-node-02.local</div>
                <div className="text-xs font-mono text-gray-500">192.168.1.101</div>
                <div className="mt-2 text-[11px] text-gray-500 font-mono">Standby Ready</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
