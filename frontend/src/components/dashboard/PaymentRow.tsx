import React from 'react';
import { motion } from 'framer-motion';
import { ExternalLink, RotateCcw, Lock } from 'lucide-react';
import { StatusBadge } from './Badges';

import { formatAmount, daysSince } from '../../utils/format';

interface PaymentRowProps {
  payment: any;
  isPaid: boolean;
  onRetry: (id: string) => void;
  onUpgrade: () => void;
  onView: (id: string) => void;
}

export const PaymentRow: React.FC<PaymentRowProps> = React.memo(({
  payment, isPaid, onRetry, onUpgrade, onView
}) => {
  return (
    <motion.li
      layout
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="group hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-all duration-300"
    >
      <div className="flex items-center p-5 sm:px-8 gap-6">
        <div className="flex-1 min-w-0 cursor-pointer" onClick={() => onView(payment.id)}>
          <div className="flex items-center gap-3 mb-1.5 flex-wrap">
            <h4 className="text-base font-bold truncate group-hover:underline text-black dark:text-white transition-all">
              {payment.customerName || payment.customerEmail}
            </h4>
            <StatusBadge status={payment.status} />
            <span className="text-base font-bold text-stone-700 dark:text-stone-300">
              {formatAmount(payment.amount, payment.currency)}
            </span>
            {payment.status === 'recovered' && payment.recoveredVia === 'link' && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border bg-emerald-500/5 text-emerald-500 border-emerald-200 dark:border-emerald-800">
                via link
              </span>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-x-6 gap-y-1 text-xs font-medium text-stone-400">
            <span>{payment.customerEmail}</span>
            <span>Retries: {payment.retryCount}/3</span>
            <span>{daysSince(payment.createdAt)}d ago</span>
            {payment.paymentId && (
              <span className="font-mono text-[10px] text-stone-300">{payment.paymentId}</span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {payment.recoveryLinks?.[0] && (
            <a
              href={payment.recoveryLinks[0].url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={e => e.stopPropagation()}
              className="p-2 text-stone-400 hover:text-blue-600 rounded-lg hover:bg-blue-500/10 transition-all"
              aria-label="Open payment link"
              title="Open payment link"
            >
              <ExternalLink className="w-4 h-4" />
            </a>
          )}
          {['pending', 'retrying'].includes(payment.status) && (
            isPaid ? (
              <button
                onClick={e => { e.stopPropagation(); onRetry(payment.id); }}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-stone-600 dark:text-stone-300 border border-warm-border dark:border-stone-700 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-700 transition-all"
                aria-label="Trigger retry now"
                title="Trigger retry now"
              >
                <RotateCcw className="w-3 h-3" /> Retry
              </button>
            ) : (
              <button
                onClick={e => { e.stopPropagation(); onUpgrade(); }}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-stone-400 border border-dashed border-stone-300 dark:border-stone-600 rounded-lg hover:border-emerald-400 hover:text-emerald-600 transition-all"
                aria-label="Upgrade to unlock auto-retry"
                title="Upgrade to unlock auto-retry"
              >
                <Lock className="w-3 h-3" /> Retry
              </button>
            )
          )}
        </div>
      </div>
    </motion.li>
  );
});
