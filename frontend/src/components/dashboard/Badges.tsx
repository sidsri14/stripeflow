import React from 'react';
import { Sparkles, Lock } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const styles: Record<string, string> = {
    pending:   'bg-amber-500/10 text-amber-600 border-amber-200 dark:border-amber-800',
    retrying:  'bg-blue-500/10 text-blue-600 border-blue-200 dark:border-blue-800',
    recovered: 'bg-emerald-500/10 text-emerald-600 border-emerald-200 dark:border-emerald-800',
    abandoned: 'bg-stone-500/10 text-stone-500 border-stone-200 dark:border-stone-700',
  };
  return (
    <span className={cn('px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border', styles[status] || styles.pending)}>
      {status}
    </span>
  );
};

export const PlanBadge: React.FC<{ plan: 'free' | 'paid' }> = ({ plan }) => (
  <span className={cn(
    'inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border',
    plan === 'paid'
      ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800'
      : 'bg-stone-50 text-stone-500 border-stone-200 dark:bg-stone-800 dark:text-stone-400 dark:border-stone-700'
  )}>
    {plan === 'paid' ? <Sparkles className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
    {plan === 'paid' ? 'Pro' : 'Free'}
  </span>
);
