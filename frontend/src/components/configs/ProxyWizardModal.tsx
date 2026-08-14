import React, { useState } from 'react';
import { Wand2, Plus, Trash2, Shield, Copy, Check, Server, Network } from 'lucide-react';
import { api } from '../../services/api';

interface ProxyWizardModalProps {
  serviceType: string;
  onClose: () => void;
  onInsertSnippet: (snippet: string) => void;
}

export const ProxyWizardModal: React.FC<ProxyWizardModalProps> = ({ serviceType, onClose, onInsertSnippet }) => {
  const isHAProxy = serviceType === 'haproxy';

  // HAProxy Wizard State
  const [sectionType, setSectionType] = useState<'listen' | 'frontend' | 'backend'>('listen');
  const [sectionName, setSectionName] = useState('app_service');
  const [mode, setMode] = useState('http');
  const [bindIp, setBindIp] = useState('*');
  const [bindPort, setBindPort] = useState(80);
  const [sslCert, setSslCert] = useState('');
  const [balanceAlgo, setBalanceAlgo] = useState('roundrobin');
  const [defaultBackend, setDefaultBackend] = useState('app_backend');
  const [enableStats, setEnableStats] = useState(false);
  const [statsUri, setStatsUri] = useState('/haproxy?stats');

  // Backend Servers
  const [servers, setServers] = useState([
    { name: 'srv01', ip: '192.168.1.10', port: 8080, weight: 100, backup: false },
    { name: 'srv02', ip: '192.168.1.11', port: 8080, weight: 100, backup: false }
  ]);

  // ACL Rules
  const [acls, setAcls] = useState<{ name: string; criterion: string; value: string; target_backend: string }[]>([]);

  // Generated Snippet
  const [previewCode, setPreviewCode] = useState('');
  const [copied, setCopied] = useState(false);

  const handleAddServer = () => {
    setServers([...servers, { name: `srv0${servers.length + 1}`, ip: '192.168.1.12', port: 8080, weight: 100, backup: false }]);
  };

  const handleRemoveServer = (index: number) => {
    setServers(servers.filter((_, i) => i !== index));
  };

  const handleAddAcl = () => {
    setAcls([...acls, { name: 'is_api', criterion: 'path_beg', value: '/api', target_backend: 'api_backend' }]);
  };

  const handleRemoveAcl = (index: number) => {
    setAcls(acls.filter((_, i) => i !== index));
  };

  const handleGenerate = async () => {
    if (isHAProxy) {
      const res = await api.generateHAProxySnippet({
        section_type: sectionType,
        section_name: sectionName,
        mode,
        bind_ip: bindIp,
        bind_port: Number(bindPort),
        ssl_cert: sslCert || null,
        balance_algo: balanceAlgo,
        default_backend: defaultBackend || null,
        servers,
        acl_rules: acls,
        enable_stats: enableStats,
        stats_uri: statsUri
      });
      setPreviewCode(res.snippet);
    } else {
      const res = await api.generateNginxSnippet({
        upstream_name: `${sectionName}_nodes`,
        upstream_servers: servers,
        server_name: `${sectionName}.local`,
        listen_port: Number(bindPort),
        ssl_cert: sslCert || null,
        ssl_key: sslCert ? sslCert.replace('.crt', '.key') : null
      });
      setPreviewCode(res.snippet);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4 overflow-y-auto">
      <div className="glass-panel max-w-4xl w-full rounded-2xl p-6 border border-gray-700 space-y-6 my-8">
        <div className="flex items-center justify-between border-b border-gray-800 pb-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 to-purple-600 flex items-center justify-center text-black font-bold">
              <Wand2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">
                Візуальний Wizard Створення Проксі ({isHAProxy ? 'HAProxy' : 'Nginx'})
              </h2>
              <p className="text-gray-400 text-xs">Конструктор секцій з автоматичною валідацією параметрів</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-sm">✕</button>
        </div>

        {/* Configuration Tabs */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Left Form Settings */}
          <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2">
            {isHAProxy && (
              <div>
                <label className="text-xs font-semibold text-gray-300 block mb-1">Тип Секції (HAProxy Section)</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['listen', 'frontend', 'backend'] as const).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setSectionType(t)}
                      className={`py-2 rounded-xl text-xs font-mono font-bold capitalize transition ${
                        sectionType === t ? 'bg-cyan-500 text-black shadow-lg shadow-cyan-950/50' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-gray-400">Назва Секції</label>
                <input
                  type="text"
                  value={sectionName}
                  onChange={(e) => setSectionName(e.target.value)}
                  className="w-full mt-1 bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-cyan-400 font-mono"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-gray-400">Режим (Mode)</label>
                <select
                  value={mode}
                  onChange={(e) => setMode(e.target.value)}
                  className="w-full mt-1 bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-xs text-cyan-300 outline-none font-mono"
                >
                  <option value="http">HTTP (Layer 7)</option>
                  <option value="tcp">TCP (Layer 4)</option>
                </select>
              </div>
            </div>

            {sectionType !== 'backend' && (
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="text-xs font-medium text-gray-400">Bind IP</label>
                  <input
                    type="text"
                    value={bindIp}
                    onChange={(e) => setBindIp(e.target.value)}
                    className="w-full mt-1 bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-xs text-white outline-none font-mono"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-400">Bind Port</label>
                  <input
                    type="number"
                    value={bindPort}
                    onChange={(e) => setBindPort(Number(e.target.value))}
                    className="w-full mt-1 bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-xs text-white outline-none font-mono"
                  />
                </div>
              </div>
            )}

            {sectionType !== 'frontend' && (
              <div>
                <label className="text-xs font-medium text-gray-400">Алгоритм Балансування (Balance Algorithm)</label>
                <select
                  value={balanceAlgo}
                  onChange={(e) => setBalanceAlgo(e.target.value)}
                  className="w-full mt-1 bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-xs text-purple-300 outline-none font-mono"
                >
                  <option value="roundrobin">Roundrobin (Почерговий)</option>
                  <option value="leastconn">Leastconn (Найменше з'єднань)</option>
                  <option value="source">Source (IP Sticky Session)</option>
                  <option value="uri">URI (По URL запиту)</option>
                </select>
              </div>
            )}

            {/* Backend Servers Configuration */}
            {sectionType !== 'frontend' && (
              <div className="pt-2 border-t border-gray-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-gray-300 flex items-center space-x-1">
                    <Server className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Бекенд Вузли ({servers.length})</span>
                  </span>
                  <button
                    type="button"
                    onClick={handleAddServer}
                    className="text-[11px] text-cyan-400 hover:underline flex items-center space-x-1"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Додати сервер</span>
                  </button>
                </div>

                {servers.map((srv, idx) => (
                  <div key={idx} className="p-2.5 rounded-lg bg-gray-900/80 border border-gray-800 grid grid-cols-12 gap-2 items-center text-xs font-mono">
                    <input
                      type="text"
                      placeholder="Name"
                      value={srv.name}
                      onChange={(e) => {
                        const copy = [...servers];
                        copy[idx].name = e.target.value;
                        setServers(copy);
                      }}
                      className="col-span-3 bg-gray-950 border border-gray-700 rounded px-2 py-1 text-white outline-none"
                    />
                    <input
                      type="text"
                      placeholder="IP"
                      value={srv.ip}
                      onChange={(e) => {
                        const copy = [...servers];
                        copy[idx].ip = e.target.value;
                        setServers(copy);
                      }}
                      className="col-span-4 bg-gray-950 border border-gray-700 rounded px-2 py-1 text-white outline-none"
                    />
                    <input
                      type="number"
                      placeholder="Port"
                      value={srv.port}
                      onChange={(e) => {
                        const copy = [...servers];
                        copy[idx].port = Number(e.target.value);
                        setServers(copy);
                      }}
                      className="col-span-2 bg-gray-950 border border-gray-700 rounded px-2 py-1 text-white outline-none"
                    />
                    <input
                      type="number"
                      placeholder="Weight"
                      value={srv.weight}
                      onChange={(e) => {
                        const copy = [...servers];
                        copy[idx].weight = Number(e.target.value);
                        setServers(copy);
                      }}
                      className="col-span-2 bg-gray-950 border border-gray-700 rounded px-2 py-1 text-white outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveServer(idx)}
                      className="col-span-1 text-rose-400 hover:text-rose-300 text-center"
                    >
                      <Trash2 className="w-3.5 h-3.5 mx-auto" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <button
              type="button"
              onClick={handleGenerate}
              className="w-full py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-bold text-xs shadow-lg shadow-cyan-950/50 flex items-center justify-center space-x-2 transition"
            >
              <Wand2 className="w-4 h-4" />
              <span>Згенерувати Сніппет (Generate Code)</span>
            </button>
          </div>

          {/* Right Live Preview Panel */}
          <div className="flex flex-col h-full bg-[#0A0D14] rounded-xl border border-gray-800 p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-gray-800 pb-2">
              <span className="text-xs font-mono text-cyan-400 font-bold">Preview: {sectionName}</span>
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(previewCode);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000);
                  }}
                  className="px-2 py-1 rounded bg-gray-800 text-[11px] text-gray-300 hover:bg-gray-700 flex items-center space-x-1"
                >
                  {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>{copied ? 'Скопійовано' : 'Копіювати'}</span>
                </button>
              </div>
            </div>

            <pre className="flex-1 overflow-auto font-mono text-xs text-cyan-200 p-2 leading-relaxed whitespace-pre-wrap">
              {previewCode || '# Натисніть "Згенерувати Сніппет" для перегляду згенерованої конфігурації...'}
            </pre>

            <button
              type="button"
              disabled={!previewCode}
              onClick={() => {
                onInsertSnippet(previewCode);
                onClose();
              }}
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-purple-500 to-cyan-500 hover:from-purple-400 hover:to-cyan-400 disabled:opacity-50 text-black font-bold text-xs shadow-lg shadow-purple-950/50 transition flex items-center justify-center space-x-2"
            >
              <span>Вставити у Редактор Конфігурації</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
