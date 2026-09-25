import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Lock, User, AlertCircle, Wallet } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) { setError('Please enter your username and password'); return; }
    setError(null);
    setLoading(true);
    try {
      await login({ username, password });
      const savedUser = localStorage.getItem('user');
      if (savedUser) {
        const userObj = JSON.parse(savedUser);
        navigate(userObj.resetPasswordRequired ? '/first-login-reset' : '/');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Invalid username or password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#061e1e] via-[#0a2e2e] to-[#031414] font-sans px-4 relative overflow-hidden">
      {/* Decorative ambient background glows */}
      <div className="absolute top-1/4 -left-20 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-sm relative z-10">
        {/* Brand Header */}
        <div className="text-center mb-6">
          <div className="w-14 h-14 rounded-2xl bg-[#E8A020] text-white flex items-center justify-center mx-auto mb-3.5 shadow-lg shadow-amber-500/25">
            <Wallet className="h-7 w-7" />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Petty Cash System</h1>
          <p className="text-xs text-teal-200/70 mt-1">Sign in to your account</p>
        </div>

        {/* Login Card */}
        <div className="bg-[#0b3333]/90 backdrop-blur-xl border border-teal-700/40 rounded-2xl p-7 shadow-2xl shadow-black/40">
          {/* Error Message */}
          {error && (
            <div className="mb-5 px-3 py-2.5 rounded-lg flex items-center gap-2 text-xs text-rose-300 bg-rose-500/20 border border-rose-500/30">
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Username */}
            <div>
              <label className="block text-xs font-semibold text-teal-100/80 mb-1.5">Username</label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-teal-300/50" />
                <input
                  type="text"
                  placeholder="Enter username"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-[#062020]/80 border border-teal-700/50 text-white placeholder-teal-400/40 rounded-xl text-sm outline-none focus:border-[#E8A020] focus:ring-1 focus:ring-[#E8A020]/40 transition-all"
                  autoComplete="username"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-semibold text-teal-100/80 mb-1.5">Password</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-teal-300/50" />
                <input
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-[#062020]/80 border border-teal-700/50 text-white placeholder-teal-400/40 rounded-xl text-sm outline-none focus:border-[#E8A020] focus:ring-1 focus:ring-[#E8A020]/40 transition-all"
                  autoComplete="current-password"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-2.5 bg-[#E8A020] hover:bg-[#D4911A] text-white text-sm font-bold rounded-xl transition-all shadow-md shadow-amber-500/20 disabled:opacity-50 cursor-pointer"
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>
        </div>

        <p className="text-center text-[11px] text-teal-300/50 mt-6">
          Somtel &bull; Bluekom
        </p>
      </div>
    </div>
  );
};
export default LoginPage;
