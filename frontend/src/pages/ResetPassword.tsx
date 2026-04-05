import React, { useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { Lock, Loader2, ArrowLeft, ShieldCheck } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { api } from '../api';

const ResetPassword = () => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      return toast.error('Passwords do not match');
    }
    if (!token) {
      return toast.error('Invalid reset token');
    }

    setLoading(true);
    try {
      await api.post('/auth/reset-password', { token, password });
      toast.success('Password reset successfully');
      navigate('/login');
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to reset password');
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-cream dark:bg-stone-900 transition-colors">
        <div className="w-full max-w-md bg-white dark:bg-stone-800 border border-warm-border dark:border-stone-700 rounded-3xl p-10 text-center space-y-6">
          <div className="text-stone-300 dark:text-stone-700 mx-auto">
             <ShieldCheck className="w-16 h-16 mx-auto opacity-20" />
          </div>
          <h1 className="text-2xl font-black text-stone-800 dark:text-stone-100">Invalid Link</h1>
          <p className="text-stone-500 dark:text-stone-400 text-sm">
            This password reset link is invalid or has expired.
          </p>
          <Link
            to="/forgot-password"
            className="block w-full py-3.5 bg-emerald-600 text-white rounded-2xl font-bold text-sm shadow-lg shadow-emerald-600/20 transition-all hover:bg-emerald-500"
          >
            Request New Link
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-cream dark:bg-stone-900 transition-colors">
      <div className="w-full max-w-md bg-white dark:bg-stone-800 border border-warm-border dark:border-stone-700 rounded-3xl p-8 md:p-10 shadow-xl shadow-stone-200/50 dark:shadow-none">
        <div className="mb-10 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-stone-50 dark:bg-stone-900/40 text-stone-700 dark:text-stone-200 mb-6">
            <Lock className="w-8 h-8" />
          </div>
          <h1 className="text-3xl font-black text-stone-800 dark:text-stone-100 mb-3 tracking-tight">
            New Password
          </h1>
          <p className="text-stone-500 dark:text-stone-400 text-sm font-medium">
            Set your new account password.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-widest text-stone-400 dark:text-stone-500 ml-1">
              New Password
            </label>
            <div className="relative group">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-300 dark:text-stone-600 group-focus-within:text-emerald-500 transition-colors" />
              <input
                type="password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-12 pr-4 py-4 bg-stone-50 dark:bg-stone-900/50 border border-warm-border dark:border-stone-700 rounded-2xl text-stone-800 dark:text-stone-100 placeholder:text-stone-300 dark:placeholder:text-stone-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all font-medium"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-widest text-stone-400 dark:text-stone-500 ml-1">
              Confirm New Password
            </label>
            <div className="relative group">
              <ShieldCheck className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-300 dark:text-stone-600 group-focus-within:text-emerald-500 transition-colors" />
              <input
                type="password"
                required
                minLength={8}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-12 pr-4 py-4 bg-stone-50 dark:bg-stone-900/50 border border-warm-border dark:border-stone-700 rounded-2xl text-stone-800 dark:text-stone-100 placeholder:text-stone-300 dark:placeholder:text-stone-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all font-medium"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 bg-emerald-600 dark:bg-emerald-700 hover:bg-emerald-500 dark:hover:bg-emerald-600 text-white rounded-2xl font-bold text-sm shadow-lg shadow-emerald-600/20 transition-all flex items-center justify-center gap-2 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Reset Password'}
          </button>

          <Link
            to="/login"
            className="flex items-center justify-center gap-2 text-stone-400 dark:text-stone-500 hover:text-stone-600 dark:hover:text-stone-300 font-bold text-sm transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Sign In
          </Link>
        </form>
      </div>
    </div>
  );
};

export default ResetPassword;
