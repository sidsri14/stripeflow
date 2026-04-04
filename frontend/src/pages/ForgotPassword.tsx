import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Mail, ArrowLeft, Loader2, KeyRound } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { api } from '../api';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post('/auth/forgot-password', { email });
      setSent(true);
      toast.success('Reset link sent to your email');
    } catch (err: any) {
      toast.error(err.response?.data?.error || err.response?.data?.message || 'Failed to send reset link');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-cream dark:bg-stone-900 transition-colors">
      <div className="w-full max-w-md bg-white dark:bg-stone-800 border border-warm-border dark:border-stone-700 rounded-3xl p-8 md:p-10 shadow-xl shadow-stone-200/50 dark:shadow-none">
        <div className="mb-10 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 mb-6">
            <KeyRound className="w-8 h-8" />
          </div>
          <h1 className="text-3xl font-black text-stone-800 dark:text-stone-100 mb-3 tracking-tight">
            Forgot Password?
          </h1>
          <p className="text-stone-500 dark:text-stone-400 text-sm font-medium">
            No worries, we'll send you reset instructions.
          </p>
        </div>

        {sent ? (
          <div className="text-center space-y-6">
            <div className="p-4 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800 rounded-2xl text-emerald-700 dark:text-emerald-400 text-sm font-medium">
              We've sent a password reset link to <span className="font-bold">{email}</span>. Please check your inbox.
            </div>
            <button
              onClick={() => navigate('/login')}
              className="w-full py-3.5 bg-stone-100 dark:bg-stone-700 hover:bg-stone-200 dark:hover:bg-stone-600 text-stone-700 dark:text-stone-200 rounded-2xl font-bold text-sm transition-all"
            >
              Back to Sign In
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-widest text-stone-400 dark:text-stone-500 ml-1">
                Email Address
              </label>
              <div className="relative group">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-300 dark:text-stone-600 group-focus-within:text-emerald-500 transition-colors" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@company.com"
                  className="w-full pl-12 pr-4 py-4 bg-stone-50 dark:bg-stone-900/50 border border-warm-border dark:border-stone-700 rounded-2xl text-stone-800 dark:text-stone-100 placeholder:text-stone-300 dark:placeholder:text-stone-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all font-medium"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 bg-emerald-600 dark:bg-emerald-700 hover:bg-emerald-500 dark:hover:bg-emerald-600 text-white rounded-2xl font-bold text-sm shadow-lg shadow-emerald-600/20 transition-all flex items-center justify-center gap-2 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Send Reset Link'}
            </button>

            <Link
              to="/login"
              className="flex items-center justify-center gap-2 text-stone-400 dark:text-stone-500 hover:text-stone-600 dark:hover:text-stone-300 font-bold text-sm transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Sign In
            </Link>
          </form>
        )}
      </div>
    </div>
  );
};

export default ForgotPassword;
