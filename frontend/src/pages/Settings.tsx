import React, { useState } from 'react';
import { Shield, CreditCard, Check, Zap, ArrowRight, User, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { api } from '../api';
import toast from 'react-hot-toast';
import type { AuthUser } from '../App';

interface Props {
  user: AuthUser;
  onUpdateUser: (user: AuthUser) => void;
}

const Settings: React.FC<Props> = ({ user, onUpdateUser }) => {
  const [loading, setLoading] = useState(false);

  const handleUpdatePlan = async (plan: 'free' | 'pro') => {
    setLoading(true);
    try {
      const { data } = await api.patch('/billing/plan', { plan });
      if (data.success) {
        toast.success(`Plan updated to ${plan === 'free' ? 'Free' : 'Pro'}`);
        onUpdateUser(data.data.user);
      }
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to update plan');
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-4xl mx-auto space-y-10"
    >
      <header>
        <h1 className="text-3xl font-bold text-stone-800 dark:text-stone-100 tracking-tight">
          Settings
        </h1>
        <p className="text-stone-400 mt-1 font-medium text-xs tracking-wide">
          Manage your account, billing, and system preferences
        </p>
      </header>

      <section className="space-y-6">
        <div className="flex items-center gap-3 border-b border-warm-border dark:border-stone-800 pb-4">
          <Shield className="w-5 h-5 text-emerald-600" />
          <h2 className="text-lg font-bold text-stone-700 dark:text-stone-200">Subscription & Billing</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Free Plan */}
          <div className={`p-6 rounded-2xl border transition-all ${user.plan === 'free' ? 'border-emerald-500 bg-white dark:bg-stone-800 shadow-soft' : 'border-warm-border dark:border-stone-800 bg-stone-50/50 dark:bg-stone-900/30'}`}>
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="font-bold text-stone-800 dark:text-stone-100 italic">Free Tier</h3>
                <p className="text-2xl font-black text-stone-900 dark:text-white mt-1">₹0<span className="text-sm font-medium text-stone-400">/mo</span></p>
              </div>
              {user.plan === 'free' && (
                <span className="px-2 py-1 bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400 text-[10px] font-bold uppercase rounded-md border border-emerald-200 dark:border-emerald-800">Current Plan</span>
              )}
            </div>
            <ul className="space-y-3 mb-8">
              <li className="flex items-center gap-2 text-sm text-stone-500 dark:text-stone-400">
                <Check className="w-4 h-4 text-emerald-500" /> Failed payment monitoring
              </li>
              <li className="flex items-center gap-2 text-sm text-stone-500 dark:text-stone-400">
                <Check className="w-4 h-4 text-emerald-500" /> Dashboard analytics
              </li>
              <li className="flex items-center gap-2 text-sm text-stone-400 line-through opacity-50">
                Automated email recovery
              </li>
            </ul>
            {user.plan !== 'free' && (
                <button 
                  onClick={() => handleUpdatePlan('free')}
                  disabled={loading}
                  className="w-full py-2.5 rounded-xl border border-warm-border dark:border-stone-700 text-stone-600 dark:text-stone-400 font-semibold text-sm hover:bg-white dark:hover:bg-stone-800 transition-all opacity-60 hover:opacity-100"
                >
                  Downgrade
                </button>
            )}
          </div>

          {/* Paid Plan */}
          <div className={`p-6 rounded-2xl border transition-all ${user.plan === 'pro' || user.plan === 'starter' ? 'border-emerald-500 bg-white dark:bg-stone-800 shadow-soft' : 'border-emerald-600/30 bg-emerald-50/10 dark:bg-emerald-900/5 shadow-soft'}`}>
            <div className="flex justify-between items-start mb-4">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-emerald-600 dark:text-emerald-400 italic">Pro Recovery</h3>
                  <Zap className="w-3 h-3 text-amber-400 fill-amber-400" />
                </div>
                <p className="text-2xl font-black text-stone-900 dark:text-white mt-1">₹1,499<span className="text-sm font-medium text-stone-400">/mo</span></p>
              </div>
              {user.plan === 'pro' || user.plan === 'starter' ? (
                <span className="px-2 py-1 bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400 text-[10px] font-bold uppercase rounded-md border border-emerald-200 dark:border-emerald-800">Current Plan</span>
              ) : (
                <span className="px-2 py-1 bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400 text-[10px] font-bold uppercase rounded-md border border-amber-200 dark:border-amber-800 animate-pulse">Unlock Worker</span>
              )}
            </div>
            <ul className="space-y-3 mb-8">
              <li className="flex items-center gap-2 text-sm text-stone-700 dark:text-stone-200 font-medium">
                <Check className="w-4 h-4 text-emerald-500" /> Automated recovery worker
              </li>
              <li className="flex items-center gap-2 text-sm text-stone-700 dark:text-stone-200 font-medium">
                <Check className="w-4 h-4 text-emerald-500" /> High-conversion email templates
              </li>
              <li className="flex items-center gap-2 text-sm text-stone-700 dark:text-stone-200 font-medium">
                <Check className="w-4 h-4 text-emerald-500" /> Custom branding (coming soon)
              </li>
            </ul>
            {!(user.plan === 'pro' || user.plan === 'starter') ? (
              <button
                onClick={() => handleUpdatePlan('pro')}
                disabled={loading}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-sm transition-all shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><CreditCard className="w-4 h-4" /> Upgrade to Pro</>}
              </button>
            ) : (
              <div className="flex items-center justify-center gap-2 py-3 text-emerald-600 dark:text-emerald-400 font-bold text-sm">
                <Check className="w-4 h-4" />
                Active & Running
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="space-y-6">
        <div className="flex items-center gap-3 border-b border-warm-border dark:border-stone-800 pb-4">
          <User className="w-5 h-5 text-stone-400" />
          <h2 className="text-lg font-bold text-stone-700 dark:text-stone-200">Account Information</h2>
        </div>
        
        <div className="bg-white dark:bg-stone-800 border border-warm-border dark:border-stone-700 rounded-2xl p-6 space-y-4">
            <div className="flex justify-between items-center py-2 border-b border-stone-50 dark:border-stone-700/50">
                <span className="text-sm font-medium text-stone-400">Email Address</span>
                <span className="text-sm font-bold text-stone-700 dark:text-stone-200">{user.email}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-stone-50 dark:border-stone-700/50">
                <span className="text-sm font-medium text-stone-400">Member Since</span>
                <span className="text-sm font-bold text-stone-700 dark:text-stone-200">{new Date(user.createdAt).toLocaleDateString('en-IN', { dateStyle: 'long' })}</span>
            </div>
            <div className="flex justify-between items-center py-2">
                <span className="text-sm font-medium text-stone-400">Unique ID</span>
                <span className="text-xs font-mono text-stone-300 dark:text-stone-500">{user.id}</span>
            </div>
        </div>
      </section>
    </motion.div>
  );
};

export default Settings;
