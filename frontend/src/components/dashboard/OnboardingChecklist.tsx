import React from 'react';
import { Zap, CheckCircle2, ChevronRight, RefreshCw, Sparkles } from 'lucide-react';
import { cn } from '../../utils/cn';

interface OnboardingProps {
  hasSources: boolean;
  hasFailure: boolean;
  hasRecovery: boolean;
  plan: string;
  onOpenSources: () => void;
  onSimulate: () => void;
  onUpgrade: () => void;
  simulating: boolean;
}

export const OnboardingChecklist: React.FC<OnboardingProps> = ({
  hasSources, hasFailure, hasRecovery, plan, onOpenSources, onSimulate, onUpgrade, simulating
}) => {
  const steps = [
    {
      id: 'source',
      label: 'Add your first client',
      done: hasSources,
      action: onOpenSources,
      btn: hasSources ? 'Done' : 'Add client',
    },
    {
      id: 'failure',
      label: 'Create your first invoice',
      done: hasFailure,
      action: onSimulate,
      btn: hasFailure ? 'Done' : 'Create invoice',
      loading: simulating,
    },
    {
      id: 'recovery',
      label: 'Get your first payment',
      done: hasRecovery,
      action: () => {},
      btn: hasRecovery ? 'Done' : 'Waiting...',
    },
    {
      id: 'upgrade',
      label: 'Upgrade to Pro Plan',
      done: plan === 'starter' || plan === 'pro',
      action: onUpgrade,
      btn: plan === 'starter' || plan === 'pro' ? 'Active' : 'Upgrade now',
      icon: <Sparkles className="w-3 h-3 text-emerald-500" />,
    }
  ];

  return (
    <div className="rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900/40 p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
          <Zap className="w-5 h-5 text-emerald-600 dark:text-emerald-500" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-stone-800 dark:text-stone-100">Getting Started</h3>
          <p className="text-xs text-stone-400 font-medium">Follow these steps to send your first invoice</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {steps.map((step, idx) => (
          <div
            key={step.id}
            className={cn(
              "p-4 rounded-xl border transition-all relative overflow-hidden group",
              step.done
                ? "bg-emerald-50/50 dark:bg-emerald-900/5 border-emerald-100 dark:border-emerald-900/20"
                : "bg-stone-50/50 dark:bg-stone-800/20 border-stone-100 dark:border-stone-800 hover:border-stone-200 dark:hover:border-stone-700"
            )}
          >
            <div className="flex items-center gap-3 mb-3">
              <div className={cn(
                "w-6 h-6 rounded-full flex items-center justify-center shrink-0 border",
                step.done
                  ? "bg-emerald-500 border-emerald-400 text-white"
                  : "bg-white dark:bg-stone-800 border-stone-200 dark:border-stone-700 text-stone-300"
              )}>
                {step.done ? <CheckCircle2 className="w-4 h-4" /> : <span className="text-[10px] font-bold">{idx + 1}</span>}
              </div>
              <span className={cn(
                "text-xs font-bold tracking-tight",
                step.done ? "text-emerald-700 dark:text-emerald-400" : "text-stone-500 dark:text-stone-400"
              )}>
                {step.label}
              </span>
            </div>
            
            <button
              onClick={step.action}
              disabled={step.done || step.loading}
              className={cn(
                "w-full py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-1.5",
                step.done
                  ? "bg-transparent text-emerald-600 dark:text-emerald-500 cursor-default"
                  : "bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-500 hover:bg-stone-100 dark:hover:bg-stone-700"
              )}
            >
              {step.loading ? <RefreshCw className="w-3 h-3 animate-spin" /> : step.btn}
              {!step.done && !step.loading && <ChevronRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-all -translate-x-1 group-hover:translate-x-0" />}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};
