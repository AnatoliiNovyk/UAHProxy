import React, { useState } from 'react';
import { Shield, Lock, User as UserIcon, ArrowRight, Activity, Terminal, KeyRound, CheckCircle2 } from 'lucide-react';
import { api } from '../services/api';
import { User } from '../types';

interface LoginViewProps {
  onLoginSuccess: (user: User) => void;
}

export const LoginView: React.FC<LoginViewProps> = ({ onLoginSuccess }) => {
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('admin123');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await api.login(username, password);
      // Construct user object or fetch profile
      const userObj: User = {
        id: res.user_id,
        username: res.username,
        email: `${res.username}@uaproxy.local`,
        role: res.role,
        is_active: true,
        created_at: new Date().toISOString()
      };
      onLoginSuccess(userObj);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Невірний логін або пароль');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#06080D] flex items-center justify-center p-4 relative overflow-hidden font-sans selection:bg-cyan-500 selection:text-black">
      {/* Background glow accents */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-md w-full glass-panel p-8 rounded-3xl border border-gray-800 relative z-10 shadow-2xl space-y-6">
        {/* Branding */}
        <div className="text-center space-y-2">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-cyan-400 to-purple-600 mx-auto flex items-center justify-center text-black font-extrabold text-xl shadow-lg shadow-cyan-950/60">
            UA
          </div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">UAProxy Control Studio</h1>
          <p className="text-xs text-gray-400">Enterprise High-Availability & Load Balancing Platform</p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="p-3 bg-rose-950/60 border border-rose-800/80 rounded-xl text-rose-300 text-xs font-mono flex items-center space-x-2">
            <Lock className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4 text-xs font-mono">
          <div>
            <label className="text-gray-400 block mb-1.5 font-semibold">Логін (Username)</label>
            <div className="relative">
              <UserIcon className="w-4 h-4 text-gray-500 absolute left-3.5 top-3" />
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="admin"
                className="w-full bg-gray-900/80 border border-gray-700/80 rounded-xl pl-10 pr-4 py-2.5 text-white outline-none focus:border-cyan-400 transition"
              />
            </div>
          </div>

          <div>
            <label className="text-gray-400 block mb-1.5 font-semibold">Пароль (Password)</label>
            <div className="relative">
              <KeyRound className="w-4 h-4 text-gray-500 absolute left-3.5 top-3" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-gray-900/80 border border-gray-700/80 rounded-xl pl-10 pr-4 py-2.5 text-white outline-none focus:border-cyan-400 transition"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-gradient-to-r from-cyan-500 to-purple-600 hover:from-cyan-400 hover:to-purple-500 disabled:opacity-50 text-black font-bold text-xs rounded-xl shadow-lg shadow-cyan-950/50 flex items-center justify-center space-x-2 transition cursor-pointer"
          >
            <span>{loading ? 'Автентифікація...' : 'Увійти в Панель Керування'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        {/* Footer info */}
        <div className="pt-2 border-t border-gray-800/80 text-center space-y-1 text-[11px] text-gray-500 font-mono">
          <div>Стандартний SuperAdmin: <span className="text-cyan-400 font-bold">admin</span> / <span className="text-cyan-400 font-bold">admin123</span></div>
          <div>Шифрування: <span className="text-emerald-400">JWT Bearer + AES-256 Fernet</span></div>
        </div>
      </div>
    </div>
  );
};
