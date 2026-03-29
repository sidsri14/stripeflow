import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search, RefreshCw, TrendingUp, ExternalLink, RotateCcw, IndianRupee
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api';
import toast from 'react-hot-toast';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface RecoveryLink {
  id: string;
  url: string;
  createdAt: string;
}

interface FailedPayment {
  id: string;
  paymentId: string;
  orderId?: string;
  amount: number;
  currency: string;
  customerEmail: string;
  customerPhone?: string;
  customerName?: string;
  status: 'pending' | 'retrying' | 'recovered' | 'abandoned';
  retryCount: number;
  lastRetryAt?: string;
  recoveredAt?: string;
  recoveryLinks: RecoveryLink[];
  createdAt: string;
}

interface DashboardStats {
  totalFailed: number;
  totalRecovered: number;
  recoveryRate: number;
  totalFailedAmount: number;
  totalRecoveredAmount: number;
}

type SortKey = 'status' | 'amount' | 'createdAt' | 'retryCount';
type SortDir = 'asc' | 'desc';

const formatAmount = (paise: number, currency: string) => {
  const symbol = currency === 'INR' ? '₹' : currency + ' ';
  return `${symbol}${(paise / 100).toLocaleString('en-IN')}`;
};

const daysSince = (dateStr: string) =>
  Math.floor((Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24));

// ── Skeleton Loader
const SkeletonCard = () => (
  <div className="glass-card animate-pulse shadow-sm !p-6 !rounded-2xl border border-blue-50 dark:border-white/5">
    <div className="h-2 bg-blue-500/5 dark:bg-white/5 rounded w-20 mb-3" />
    <div className="h-6 bg-blue-500/10 dark:bg-white/10 rounded w-10" />
  </div>
);

const SkeletonRow = () => (
  <div className="p-5 sm:px-8 flex items-center justify-between animate-pulse border-b border-blue-50/50 dark:border-white/5">
    <div className="flex-1 space-y-2">
      <div className="flex items-center space-x-4">
        <div className="w-2.5 h-2.5 rounded-full bg-blue-500/10 dark:bg-white/10" />
        <div className="h-3 bg-blue-500/5 dark:bg-white/5 rounded w-48" />
      </div>
      <div className="h-1.5 bg-blue-500/5 dark:bg-white/5 rounded w-32 ml-7" />
    </div>
    <div className="h-4 w-4 rounded bg-blue-500/10 dark:bg-white/10" />
  </div>
);

// ── Status Badge
const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
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

const Dashboard: React.FC = () => {
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('createdAt');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'pending' | 'retrying' | 'recovered' | 'abandoned'>('ALL');

  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // ── Stats query
  const { data: stats } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: async () => {
      const { data } = await api.get('/dashboard/stats');
      return data.data as DashboardStats;
    },
    refetchInterval: 30000,
    staleTime: 10000,
  });

  // ── Payments list query
  const { data: payments = [], isLoading, isFetching } = useQuery({
    queryKey: ['payments'],
    queryFn: async () => {
      const { data } = await api.get('/payments');
      return data.data as FailedPayment[];
    },
    refetchInterval: 30000,
    staleTime: 10000,
  });

  // ── Mutation: Manual retry
  const retryMutation = useMutation({
    mutationFn: (id: string) => api.post(`/payments/${id}/retry`),
    onSuccess: () => {
      toast.success('Retry queued — reminder will send on next worker tick');
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
    },
    onError: () => toast.error('Failed to trigger retry'),
  });

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return payments
      .filter(p => {
        const matchesSearch =
          p.customerEmail.toLowerCase().includes(q) ||
          (p.customerName || '').toLowerCase().includes(q) ||
          p.paymentId.toLowerCase().includes(q);
        const matchesStatus = statusFilter === 'ALL' || p.status === statusFilter as string;
        return matchesSearch && matchesStatus;
      })
      .sort((a, b) => {
        let cmp = 0;
        if (sortKey === 'status') {
          const order: Record<string, number> = { pending: 0, retrying: 1, recovered: 2, abandoned: 3 };
          cmp = (order[a.status] ?? 4) - (order[b.status] ?? 4);
        } else if (sortKey === 'amount') {
          cmp = a.amount - b.amount;
        } else if (sortKey === 'createdAt') {
          cmp = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        } else if (sortKey === 'retryCount') {
          cmp = a.retryCount - b.retryCount;
        }
        return sortDir === 'asc' ? cmp : -cmp;
      });
  }, [payments, search, statusFilter, sortKey, sortDir]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('desc'); }
  };

  if (isLoading && payments.length === 0) {
    return (
      <div className="space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => <SkeletonCard key={i} />)}
        </div>
        <div className="glass rounded-2xl overflow-hidden border border-blue-100 dark:border-white/5">
          {[...Array(5)].map((_, i) => <SkeletonRow key={i} />)}
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-8"
    >
      {/* ── Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-stone-800 dark:text-stone-100 tracking-tight">
            Recovery Dashboard
          </h1>
          <p className="text-stone-400 mt-1 font-medium text-xs tracking-wide">
            Automatic failed payment recovery
          </p>
        </div>
        {isFetching && (
          <RefreshCw className="w-5 h-5 text-stone-400 animate-spin" aria-label="Refreshing" />
        )}
      </div>

      {/* ── Stats Grid (3 cards) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <motion.div whileHover={{ y: -1 }} className="border border-warm-border dark:border-stone-700 rounded-xl p-6 bg-white dark:bg-stone-800 shadow-soft">
          <p className="text-stone-400 text-xs font-semibold uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
            <IndianRupee className="w-3 h-3" /> Failed Amount
          </p>
          <div className="text-3xl font-bold text-red-500">
            {formatAmount(stats?.totalFailedAmount || 0, 'INR')}
          </div>
          <p className="text-stone-400 text-xs mt-1">{stats?.totalFailed || 0} failed payments</p>
        </motion.div>

        <motion.div whileHover={{ y: -1 }} className="border border-warm-border dark:border-stone-700 rounded-xl p-6 bg-white dark:bg-stone-800 shadow-soft">
          <p className="text-stone-400 text-xs font-semibold uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
            <IndianRupee className="w-3 h-3" /> Recovered Amount
          </p>
          <div className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">
            {formatAmount(stats?.totalRecoveredAmount || 0, 'INR')}
          </div>
          <p className="text-stone-400 text-xs mt-1">{stats?.totalRecovered || 0} payments recovered</p>
        </motion.div>

        <motion.div whileHover={{ y: -1 }} className="border border-warm-border dark:border-stone-700 rounded-xl p-6 bg-white dark:bg-stone-800 shadow-soft">
          <p className="text-stone-400 text-xs font-semibold uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
            <TrendingUp className="w-3 h-3" /> Recovery Rate
          </p>
          <div className={cn('text-3xl font-bold', (stats?.recoveryRate || 0) >= 50
            ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-500')}>
            {stats?.recoveryRate || 0}<span className="text-sm opacity-30 ml-0.5">%</span>
          </div>
          <p className="text-stone-400 text-xs mt-1">of failed payments recovered</p>
        </motion.div>
      </div>

      {/* ── Toolbar */}
      <div className="flex flex-col xl:flex-row gap-4">
        <div className="relative flex-1 group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-300 group-focus-within:text-stone-600 transition-colors" aria-hidden="true" />
          <input
            type="search"
            aria-label="Search payments"
            placeholder="Search by email, name, or payment ID..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-12 pr-4 py-3 border border-warm-border dark:border-stone-700 bg-white dark:bg-stone-800 rounded-xl text-sm font-medium focus:border-stone-400 dark:focus:border-stone-500 outline-none transition-all placeholder:text-stone-300 text-stone-700 dark:text-stone-200"
          />
        </div>

        <div className="flex flex-wrap gap-2 items-center">
          <div className="bg-white dark:bg-stone-800 border border-warm-border dark:border-stone-700 p-1 rounded-xl flex items-center" role="group" aria-label="Filter by status">
            {(['ALL', 'pending', 'retrying', 'recovered', 'abandoned'] as const).map(s => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                aria-pressed={statusFilter === s}
                className={cn(
                  'px-4 py-2 rounded-lg text-xs font-semibold transition-all capitalize',
                  statusFilter === s
                    ? 'bg-stone-700 dark:bg-stone-600 text-white shadow-sm'
                    : 'text-stone-400 hover:text-stone-700 dark:hover:text-stone-200'
                )}
              >
                {s}
              </button>
            ))}
          </div>

          <div className="border border-warm-border dark:border-stone-700 p-1 rounded-xl flex items-center gap-1.5 px-3 bg-white dark:bg-stone-800" role="group" aria-label="Sort by">
            <span className="text-[10px] uppercase font-semibold text-stone-300 mr-1">Sort:</span>
            {(['status', 'amount', 'createdAt', 'retryCount'] as SortKey[]).map(key => (
              <button
                key={key}
                onClick={() => toggleSort(key)}
                aria-pressed={sortKey === key}
                className={cn(
                  'text-[10px] font-semibold tracking-wider uppercase px-2 py-1.5 rounded-lg transition-all',
                  sortKey === key
                    ? 'bg-stone-100 dark:bg-stone-700 text-stone-700 dark:text-stone-200'
                    : 'text-stone-300 hover:text-stone-600 dark:hover:text-stone-300'
                )}
              >
                {key === 'createdAt' ? 'Date' : key === 'retryCount' ? 'Retries' : key}
                {sortKey === key && (sortDir === 'asc' ? ' ↑' : ' ↓')}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Payment List */}
      <div className="glass rounded-2xl overflow-hidden shadow-2xl">
        {filtered.length === 0 ? (
          <div className="p-20 text-center space-y-4">
            <div className="w-20 h-20 bg-stone-100 dark:bg-stone-700 rounded-full flex items-center justify-center mx-auto">
              <IndianRupee className="w-10 h-10 text-emerald-500" aria-hidden="true" />
            </div>
            <h3 className="text-2xl font-black custom-gradient-text uppercase">No Payments Yet</h3>
            <p className="text-blue-400 dark:text-blue-500/60 max-w-xs mx-auto text-sm font-bold uppercase tracking-widest mt-2">
              {payments.length === 0
                ? 'When Razorpay sends a payment.failed webhook, it will appear here.'
                : 'No payments match your filter.'}
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-indigo-500/5 dark:divide-white/5" aria-label="Failed payment list">
            <AnimatePresence mode="popLayout">
              {filtered.map((payment) => (
                <motion.li
                  key={payment.id}
                  layout
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="group hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-all duration-300"
                >
                  <div className="flex items-center p-5 sm:px-8 gap-6">
                    <div className="flex-1 min-w-0 cursor-pointer" onClick={() => navigate(`/payments/${payment.id}`)}>
                      <div className="flex items-center gap-3 mb-1.5 flex-wrap">
                        <h4 className="text-base font-bold truncate group-hover:underline text-black dark:text-white transition-all">
                          {payment.customerName || payment.customerEmail}
                        </h4>
                        <StatusBadge status={payment.status} />
                        <span className="text-base font-bold text-stone-700 dark:text-stone-300">
                          {formatAmount(payment.amount, payment.currency)}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-x-6 gap-y-1 text-xs font-medium text-stone-400 ml-0">
                        <span>{payment.customerEmail}</span>
                        <span>Retries: {payment.retryCount}/3</span>
                        <span>{daysSince(payment.createdAt)}d ago</span>
                        {payment.paymentId && (
                          <span className="font-mono text-[10px] text-stone-300">{payment.paymentId}</span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {payment.recoveryLinks[0] && (
                        <a
                          href={payment.recoveryLinks[0].url}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={e => e.stopPropagation()}
                          className="p-2 text-stone-400 hover:text-blue-600 rounded-lg hover:bg-blue-500/10 transition-all"
                          title="Open payment link"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      )}
                      {['pending', 'retrying'].includes(payment.status) && (
                        <button
                          onClick={e => { e.stopPropagation(); retryMutation.mutate(payment.id); }}
                          disabled={retryMutation.isPending}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-stone-600 dark:text-stone-300 border border-warm-border dark:border-stone-700 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-700 transition-all disabled:opacity-50"
                          title="Trigger retry now"
                        >
                          <RotateCcw className="w-3 h-3" /> Retry
                        </button>
                      )}
                    </div>
                  </div>
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>
        )}
      </div>
    </motion.div>
  );
};

export default Dashboard;
