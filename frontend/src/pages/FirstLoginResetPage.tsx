import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { Lock, AlertCircle, CheckCircle2 } from 'lucide-react';

export const FirstLoginResetPage: React.FC = () => {
  const { user, updateUserContext } = useAuth();
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (!user || !user.resetPasswordRequired) {
    navigate('/');
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password || !confirmPassword) {
      setError('Please fill in all fields');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const res = await api.post('/auth/first-login-reset', { newPassword: password });
      // Update local storage and auth context with updated user context
      localStorage.setItem('accessToken', res.data.accessToken);
      localStorage.setItem('refreshToken', res.data.refreshToken);
      updateUserContext({ resetPasswordRequired: false });
      
      // Navigate to dashboard
      navigate('/');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to update password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 font-sans">
      <div className="w-full max-w-md p-8 bg-slate-900 border border-slate-800 rounded-2xl shadow-xl relative z-10">
        <div className="text-center mb-6">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 border border-primary/20 text-primary mb-4">
            <Lock className="h-6 w-6" />
          </div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Security Update Required</h2>
          <p className="text-xs text-slate-400 mt-2">
            Hi {user.fullName}, you are logged in using a temporary password. You must set a new secure password to proceed.
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-rose-500/15 border border-rose-500/30 rounded-lg flex items-start gap-2.5 text-xs text-rose-400">
            <AlertCircle className="h-4.5 w-4.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">New Password</label>
            <input
              type="password"
              placeholder="Min 6 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 text-white rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all placeholder-slate-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">Confirm New Password</label>
            <input
              type="password"
              placeholder="Re-enter password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 text-white rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all placeholder-slate-500"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-[#E8A020] hover:bg-[#D4911A] text-white text-sm font-semibold rounded-lg shadow-sm transition-all cursor-pointer disabled:opacity-50"
          >
            {loading ? 'Updating Password...' : 'Save & Continue'}
          </button>
        </form>
      </div>
    </div>
  );
};
