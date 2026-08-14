import React, { useState, useEffect } from 'react';
import { GitBranch, GitCommit, RefreshCw, CheckCircle2, Key, Link2, ExternalLink } from 'lucide-react';
import { api } from '../../services/api';

interface GitSyncModalProps {
  onClose: () => void;
}

export const GitSyncModal: React.FC<GitSyncModalProps> = ({ onClose }) => {
  const [remoteUrl, setRemoteUrl] = useState('https://github.com/company/infra-configs.git');
  const [branch, setBranch] = useState('main');
  const [token, setToken] = useState('');
  const [commits, setCommits] = useState<{ hash: string; author: string; date: string; message: string }[]>([]);
  const [latestHash, setLatestHash] = useState('N/A');
  const [loading, setLoading] = useState(false);
  const [savedStatus, setSavedStatus] = useState<string | null>(null);

  useEffect(() => {
    loadCommits();
  }, []);

  const loadCommits = async () => {
    try {
      const res = await api.getGitCommits();
      setCommits(res.commits);
      setLatestHash(res.latest_hash);
    } catch (e) {
      console.error(e);
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await api.saveGitSettings({
        remote_url: remoteUrl,
        branch,
        token,
        auto_sync_enabled: true
      });
      setSavedStatus(res.message);
      loadCommits();
    } catch (e: any) {
      alert(`Error saving Git settings: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4">
      <div className="glass-panel max-w-3xl w-full rounded-2xl p-6 border border-gray-700 space-y-6">
        <div className="flex items-center justify-between border-b border-gray-800 pb-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-500 to-cyan-500 flex items-center justify-center text-black font-bold">
              <GitBranch className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Git Auto-Sync (Roxy-WI Premium)</h2>
              <p className="text-gray-400 text-xs">Автоматичне версіонування та синхронізація конфігурацій з GitHub/GitLab</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-sm">✕</button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Git Settings Form */}
          <form onSubmit={handleSaveSettings} className="space-y-4">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider text-cyan-400">Налаштування Репозиторію</h3>

            <div>
              <label className="text-xs font-medium text-gray-400">Git Remote URL</label>
              <div className="relative mt-1">
                <input
                  type="text"
                  required
                  placeholder="https://github.com/org/haproxy-configs.git"
                  value={remoteUrl}
                  onChange={(e) => setRemoteUrl(e.target.value)}
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-cyan-400 font-mono"
                />
                <Link2 className="w-4 h-4 text-gray-500 absolute right-3 top-2.5" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-gray-400">Target Branch</label>
                <input
                  type="text"
                  value={branch}
                  onChange={(e) => setBranch(e.target.value)}
                  className="w-full mt-1 bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-xs text-white outline-none font-mono"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-gray-400">Personal Access Token</label>
                <input
                  type="password"
                  placeholder="ghp_xxxx or glpat_xxxx"
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  className="w-full mt-1 bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-xs text-white outline-none font-mono"
                />
              </div>
            </div>

            <div className="p-3 bg-gray-900/60 rounded-xl border border-gray-800 text-xs space-y-1">
              <div className="text-gray-400">Поточний локальний стан:</div>
              <div className="flex items-center justify-between font-mono">
                <span className="text-emerald-400 font-bold">Latest Commit: {latestHash}</span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800">SYNCED</span>
              </div>
            </div>

            {savedStatus && (
              <div className="p-2 rounded-lg bg-emerald-950 text-emerald-400 text-xs font-mono">
                ✓ {savedStatus}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-bold text-xs shadow-lg shadow-cyan-950/50 flex items-center justify-center space-x-2 transition"
            >
              {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
              <span>Зберегти & Підключити Git</span>
            </button>
          </form>

          {/* Commit Log History */}
          <div className="flex flex-col h-full bg-[#0A0D14] rounded-xl border border-gray-800 p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-gray-800 pb-2">
              <span className="text-xs font-mono text-gray-300 font-bold flex items-center space-x-1.5">
                <GitCommit className="w-4 h-4 text-emerald-400" />
                <span>Історія Коммітів ({commits.length})</span>
              </span>
              <button onClick={loadCommits} className="text-gray-500 hover:text-cyan-400">
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 max-h-64 pr-1">
              {commits.map((c, i) => (
                <div key={i} className="p-2.5 rounded-lg bg-gray-900/60 border border-gray-800 text-xs font-mono space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-cyan-400 font-bold">{c.hash}</span>
                    <span className="text-[10px] text-gray-500">{new Date(c.date).toLocaleTimeString()}</span>
                  </div>
                  <div className="text-gray-300 text-[11px] truncate">{c.message}</div>
                  <div className="text-[10px] text-gray-500">by {c.author}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
