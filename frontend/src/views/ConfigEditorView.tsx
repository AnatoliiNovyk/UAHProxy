import React, { useState, useEffect } from 'react';
import { FileCode2, CheckCircle2, AlertTriangle, GitCommit, GitPullRequest, RotateCcw, Save, Wand2, Network, GitBranch, RefreshCw } from 'lucide-react';
import { Language, translations } from '../i18n/translations';
import { Server, ConfigHistory } from '../types';
import { api } from '../services/api';
import { ProxyWizardModal } from '../components/configs/ProxyWizardModal';
import { MasterSlaveSyncModal } from '../components/configs/MasterSlaveSyncModal';
import { GitSyncModal } from '../components/configs/GitSyncModal';

interface ConfigEditorViewProps {
  lang: Language;
  servers: Server[];
}

export const ConfigEditorView: React.FC<ConfigEditorViewProps> = ({ lang, servers }) => {
  const t = translations[lang];
  const [selectedServerId, setSelectedServerId] = useState<number>(servers[0]?.id || 1);
  const [serviceType, setServiceType] = useState<string>('haproxy');
  const [configContent, setConfigContent] = useState<string>('');
  const [commitMsg, setCommitMsg] = useState<string>('Updated configuration via UAProxy Studio');
  const [validationResult, setValidationResult] = useState<{ valid: boolean; message: string } | null>(null);
  const [history, setHistory] = useState<ConfigHistory[]>([]);
  const [showDiffModal, setShowDiffModal] = useState<boolean>(false);
  const [diffText, setDiffText] = useState<string>('');

  // Modals
  const [showWizard, setShowWizard] = useState<boolean>(false);
  const [showSyncModal, setShowSyncModal] = useState<boolean>(false);
  const [showGitModal, setShowGitModal] = useState<boolean>(false);
  const [reloading, setReloading] = useState<boolean>(false);

  useEffect(() => {
    if (servers.length > 0 && !servers.some(s => s.id === selectedServerId)) {
      setSelectedServerId(servers[0].id);
    }
  }, [servers]);

  useEffect(() => {
    loadConfig();
    loadHistory();
  }, [selectedServerId, serviceType]);

  const loadConfig = async () => {
    try {
      const res = await api.getConfig(selectedServerId, serviceType);
      setConfigContent(res.content);
    } catch (e) {
      console.error(e);
    }
  };

  const loadHistory = async () => {
    try {
      const res = await api.getConfigHistory(selectedServerId, serviceType);
      setHistory(res);
    } catch (e) {
      console.error(e);
    }
  };

  const handleValidate = async () => {
    try {
      const res = await api.validateConfig(serviceType, configContent);
      setValidationResult(res);
    } catch (e: any) {
      setValidationResult({ valid: false, message: e.message });
    }
  };

  const handleSave = async (autoReload: boolean = false) => {
    try {
      const valRes = await api.validateConfig(serviceType, configContent);
      if (!valRes.valid) {
        setValidationResult(valRes);
        alert(`Помилка валідації синтаксису: ${valRes.message}`);
        return;
      }

      const res = await api.saveConfig(selectedServerId, serviceType, configContent, commitMsg);
      
      if (autoReload) {
        setReloading(true);
        const relRes = await api.reloadService(selectedServerId, serviceType);
        alert(`Конфігурацію збережено (v${res.version}) та сервіс перезавантажено!`);
        setReloading(false);
      } else {
        alert(`Конфігурацію збережено та засинхронізовано у Git! Версія: v${res.version}`);
      }

      loadHistory();
    } catch (e: any) {
      alert(`Save error: ${e.message}`);
      setReloading(false);
    }
  };

  const handleCompare = (oldContent: string) => {
    const oldLines = oldContent.split('\n');
    const newLines = configContent.split('\n');
    const diff = oldLines.map((line, idx) => {
      const newLine = newLines[idx] || '';
      if (line !== newLine) return `- ${line}\n+ ${newLine}`;
      return `  ${line}`;
    }).join('\n');

    setDiffText(diff);
    setShowDiffModal(true);
  };

  const handleInsertSnippet = (snippet: string) => {
    setConfigContent(prev => prev + '\n' + snippet);
  };

  // Generate line numbers
  const lineCount = configContent.split('\n').length;
  const lineNumbers = Array.from({ length: lineCount }, (_, i) => i + 1).join('\n');

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center space-x-2">
            <FileCode2 className="w-6 h-6 text-purple-400" />
            <span>Config Studio & Git Auto-Sync</span>
          </h1>
          <p className="text-gray-400 text-xs mt-1">Редагування з валідацією синтаксису, Wizard генератором, реплікацією та Git версіонуванням</p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Wizard Button */}
          <button
            onClick={() => setShowWizard(true)}
            className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-cyan-500/20 to-purple-500/20 hover:bg-cyan-500/30 text-cyan-300 font-semibold text-xs border border-cyan-500/40 flex items-center space-x-1.5 transition"
          >
            <Wand2 className="w-4 h-4 text-cyan-400" />
            <span>Visual Wizard</span>
          </button>

          {/* Master Slave Sync */}
          <button
            onClick={() => setShowSyncModal(true)}
            className="px-3.5 py-2 rounded-xl bg-gray-800 hover:bg-gray-700 text-purple-300 font-medium text-xs border border-gray-700 flex items-center space-x-1.5 transition"
          >
            <Network className="w-4 h-4 text-purple-400" />
            <span>Master ↔ Slave Sync</span>
          </button>

          {/* Git Auto-Sync */}
          <button
            onClick={() => setShowGitModal(true)}
            className="px-3.5 py-2 rounded-xl bg-gray-800 hover:bg-gray-700 text-emerald-300 font-medium text-xs border border-gray-700 flex items-center space-x-1.5 transition"
          >
            <GitBranch className="w-4 h-4 text-emerald-400" />
            <span>Git Sync</span>
          </button>

          {/* Validate */}
          <button
            onClick={handleValidate}
            className="px-3.5 py-2 rounded-xl bg-gray-800 hover:bg-gray-700 text-cyan-300 font-medium text-xs border border-gray-700 transition flex items-center space-x-1.5"
          >
            <CheckCircle2 className="w-4 h-4 text-cyan-400" />
            <span>{t.validate_syntax}</span>
          </button>

          {/* Safe Apply & Reload */}
          <button
            onClick={() => handleSave(true)}
            disabled={reloading}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-black font-bold text-xs shadow-lg shadow-emerald-950/50 flex items-center space-x-1.5 transition"
          >
            {reloading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            <span>Safe Apply & Reload</span>
          </button>
        </div>
      </div>

      {/* Target Selector bar */}
      <div className="glass-panel p-4 rounded-2xl flex flex-wrap items-center gap-4 border border-gray-800">
        <div className="flex items-center space-x-2">
          <label className="text-xs font-semibold text-gray-400">Сервер:</label>
          <select
            value={selectedServerId}
            onChange={(e) => setSelectedServerId(Number(e.target.value))}
            className="bg-gray-900 border border-gray-700 rounded-lg px-3 py-1.5 text-xs text-cyan-300 font-mono outline-none"
          >
            {servers.map((s) => (
              <option key={s.id} value={s.id}>{s.hostname} ({s.ip_address})</option>
            ))}
          </select>
        </div>

        <div className="flex items-center space-x-2">
          <label className="text-xs font-semibold text-gray-400">Сервіс:</label>
          <select
            value={serviceType}
            onChange={(e) => setServiceType(e.target.value)}
            className="bg-gray-900 border border-gray-700 rounded-lg px-3 py-1.5 text-xs text-purple-300 font-mono outline-none"
          >
            <option value="haproxy">HAProxy</option>
            <option value="nginx">Nginx</option>
            <option value="keepalived">Keepalived</option>
          </select>
        </div>

        <div className="flex-1 min-w-[200px]">
          <input
            type="text"
            placeholder="Commit message..."
            value={commitMsg}
            onChange={(e) => setCommitMsg(e.target.value)}
            className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-1.5 text-xs text-white outline-none focus:border-purple-400"
          />
        </div>
      </div>

      {/* Validation Alert */}
      {validationResult && (
        <div className={`p-4 rounded-xl border text-xs font-mono flex items-center space-x-3 ${validationResult.valid ? 'bg-emerald-950/60 border-emerald-800 text-emerald-300' : 'bg-rose-950/60 border-rose-800 text-rose-300'}`}>
          {validationResult.valid ? <CheckCircle2 className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
          <span>{validationResult.message}</span>
        </div>
      )}

      {/* Editor & History grid */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3 glass-panel rounded-2xl overflow-hidden border border-gray-800 flex flex-col">
          <div className="bg-gray-900/90 px-4 py-2 border-b border-gray-800 flex items-center justify-between text-xs text-gray-400 font-mono">
            <span>/etc/{serviceType}/{serviceType}.cfg</span>
            <div className="flex items-center space-x-2">
              <span className="text-emerald-400 font-mono">🌿 Git Synced</span>
              <span className="text-gray-600">|</span>
              <span className="text-gray-400">{lineCount} lines</span>
            </div>
          </div>

          <div className="flex bg-[#0A0D14] flex-1 min-h-[480px]">
            {/* Line numbers gutter */}
            <div className="p-4 bg-[#080B10] text-gray-600 font-mono text-xs select-none text-right border-r border-gray-800/80 leading-relaxed min-w-[42px]">
              <pre>{lineNumbers}</pre>
            </div>

            {/* Textarea code editor */}
            <textarea
              value={configContent}
              onChange={(e) => setConfigContent(e.target.value)}
              className="flex-1 p-4 bg-transparent text-cyan-100 font-mono text-xs outline-none resize-none leading-relaxed"
              spellCheck={false}
            />
          </div>
        </div>

        {/* Config History Sidebar */}
        <div className="glass-panel p-4 rounded-2xl border border-gray-800 space-y-3">
          <h3 className="font-semibold text-white text-xs flex items-center space-x-1.5 border-b border-gray-800 pb-2">
            <GitCommit className="w-4 h-4 text-purple-400" />
            <span>Історія версій ({history.length})</span>
          </h3>

          <div className="space-y-2 max-h-[480px] overflow-y-auto pr-1">
            {history.map((item) => (
              <div key={item.id} className="p-2.5 rounded-xl bg-gray-900/60 border border-gray-800 text-xs space-y-1">
                <div className="flex items-center justify-between text-gray-300 font-semibold">
                  <span>v{item.version_number}</span>
                  <span className="text-[10px] text-gray-500">{new Date(item.created_at).toLocaleTimeString()}</span>
                </div>
                <div className="text-[11px] text-gray-400 truncate">{item.commit_message || 'Updated'}</div>
                <div className="flex justify-end space-x-2 pt-1">
                  <button
                    onClick={() => handleCompare(item.service_type)}
                    className="text-[10px] text-cyan-400 hover:underline"
                  >
                    Diff
                  </button>
                  <button
                    onClick={() => { setConfigContent(item.service_type); alert('Rollback loaded to editor!'); }}
                    className="text-[10px] text-purple-400 hover:underline flex items-center space-x-0.5"
                  >
                    <RotateCcw className="w-2.5 h-2.5" />
                    <span>Rollback</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Modals */}
      {showWizard && (
        <ProxyWizardModal
          serviceType={serviceType}
          onClose={() => setShowWizard(false)}
          onInsertSnippet={handleInsertSnippet}
        />
      )}

      {showSyncModal && (
        <MasterSlaveSyncModal
          servers={servers}
          serviceType={serviceType}
          onClose={() => setShowSyncModal(false)}
        />
      )}

      {showGitModal && (
        <GitSyncModal
          onClose={() => setShowGitModal(false)}
        />
      )}

      {/* Diff Modal */}
      {showDiffModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4">
          <div className="glass-panel max-w-3xl w-full rounded-2xl p-6 border border-gray-700 space-y-4">
            <h2 className="text-lg font-bold text-white flex items-center space-x-2">
              <GitPullRequest className="w-5 h-5 text-purple-400" />
              <span>Порівняння Версій (Unified Diff)</span>
            </h2>

            <pre className="p-4 bg-gray-950 rounded-xl font-mono text-xs text-gray-300 max-h-96 overflow-auto whitespace-pre-wrap">
              {diffText}
            </pre>

            <div className="flex justify-end">
              <button
                onClick={() => setShowDiffModal(false)}
                className="px-4 py-2 rounded-lg bg-gray-800 text-xs text-gray-300"
              >
                Закрити
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
