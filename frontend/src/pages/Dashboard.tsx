import { useEffect, useMemo } from 'react';
import type { FC } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient, useQuery } from '@tanstack/react-query';
import { Search, RefreshCw, IndianRupee, AlertTriangle, Download, CheckCircle2 } from 'lucide-react';
import { api } from '../api';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../utils/cn';
import { formatAmount } from '../utils/format';
import type { AuthUser } from '../App';

// ── Sub-components
import { PlanBadge } from '../components/dashboard/Badges';
import { MonitoringBadge } from '../components/dashboard/MonitoringBadge';
import { UpgradeModal } from '../components/dashboard/UpgradeModal';
import { OnboardingChecklist } from '../components/dashboard/OnboardingChecklist';
import { DashboardStats } from '../components/dashboard/DashboardStats';
import { PaymentRow } from '../components/dashboard/PaymentRow';
import { useDashboardData } from '../components/dashboard/useDashboardData';

// ── Worker Status Badge
const WorkerStatusBadge: FC = () => {
  const { data } = useQuery({
    queryKey: ['queue-stats'],
    queryFn: async () => {
      const { data } = await api.get('/queue/stats');
      return data.data as { worker: { status: string; lastSeenMs: number | null } };
    },
    refetchInterval: 60_000,
    retry: false,
  });

  const status = data?.worker?.status ?? 'unknown';
  const cfg: Record<string, { label: string; dot: string; text: string }> = {
    online:  { label: 'Worker Online',  dot: 'bg-emerald-500 animate-pulse', text: 'text-emerald-600 dark:text-emerald-400' },
    stale:   { label: 'Worker Stale',   dot: 'bg-amber-400',                  text: 'text-amber-600 dark:text-amber-400' },
    offline: { label: 'Worker Offline', dot: 'bg-rose-500',                   text: 'text-rose-600 dark:text-rose-400' },
    unknown: { label: 'Worker Unknown', dot: 'bg-stone-400',                   text: 'text-stone-400' },
  };
  const { label, dot, text } = cfg[status] ?? cfg.unknown;

  return (
    <span className={`flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest ${text}`}>
      <span className={`w-2 h-2 rounded-full ${dot}`} />
      {label}
    </span>
  );
};

// ── Skeletons
const SkeletonCard = () => (
  <div className="animate-pulse rounded-xl p-5 border border-stone-100 dark:border-stone-700 bg-white dark:bg-stone-800">
    <div className="h-2 bg-stone-100 dark:bg-stone-700 rounded w-20 mb-3" />
    <div className="h-6 bg-stone-200 dark:bg-stone-600 rounded w-16" />
  </div>
);
const SkeletonRow = () => (
  <div className="p-5 sm:px-8 flex items-center justify-between animate-pulse border-b border-stone-50 dark:border-white/5">
    <div className="flex-1 space-y-2">
      <div className="h-3 bg-stone-100 dark:bg-white/5 rounded w-48" />
      <div className="h-1.5 bg-stone-50 dark:bg-white/5 rounded w-32" />
    </div>
    <div className="h-4 w-4 rounded bg-stone-100 dark:bg-white/10" />
  </div>
);

const Dashboard: FC<{ user: AuthUser }> = ({ user }) => {
  const navigate = useNavigate();
  const { state, setters, data, mutations } = useDashboardData(user);
  const queryClient = useQueryClient();

  // Re-fetch everything when the window gains focus or component mounts to ensure sync.
  useEffect(() => {
    const handleFocus = () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
    };
    
    handleFocus(); 
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [queryClient]);

  const { search, statusFilter, sourceFilter, sortKey, sortDir, showUpgradeModal, lastFetchedAt, page } = state;
  const { setSearch, setStatusFilter, setSourceFilter, setSortKey, setSortDir, setShowUpgradeModal, setPage } = setters;
  const { plan, isPaid, stats, statsFetching, sources, paymentsPage, payments, isLoading, isFetching } = data;
  const { upgradeMutation, sendReminderMutation } = mutations;

  const totalPages = paymentsPage?.pages ?? 1;

  // Derived logic
  const unpaidVolume = stats?.totalVolume - stats?.paidVolume;
  const hasUnpaid = unpaidVolume > 0;
  const hasClients = sources.length > 0;
  const hasInvoices = payments.length > 0;
  const hasPaid = useMemo(() => payments.some((p: { status: string }) => p.status === 'paid'), [payments]);
  const onboardingComplete = hasClients && hasInvoices && hasPaid;

  const toggleSort = (key: 'status' | 'amount' | 'createdAt' | 'dueDate') => {
    if (sortKey === key) setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key as any); setSortDir('desc'); }
  };

  if (isLoading && payments.length === 0) {
    return (
      <div className="space-y-8">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {[...Array(5)].map((_, i) => <SkeletonCard key={i} />)}
        </div>
        <div className="glass rounded-2xl overflow-hidden">
          {[...Array(5)].map((_, i) => <SkeletonRow key={i} />)}
        </div>
      </div>
    );
  }

  return (
    <>
      <AnimatePresence>
        {showUpgradeModal && (
          <UpgradeModal
            onClose={() => setShowUpgradeModal(false)}
            onUpgrade={(gateway) => upgradeMutation.mutate(gateway)}
            upgrading={upgradeMutation.isPending}
          />
        )}
      </AnimatePresence>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
        
        {/* ── Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-3xl font-bold text-stone-800 dark:text-stone-100 tracking-tight">
                Invoices
              </h1>
              <PlanBadge plan={plan} />
            </div>
            <p className="text-stone-400 text-xs font-medium tracking-wide transition-all hover:text-stone-500 cursor-default">
              Professional Invoicing & Payment Tracking
            </p>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <button
              onClick={() => navigate('/invoices/new')}
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl text-xs font-black uppercase tracking-widest transition-all shadow-lg active:scale-95"
            >
              New Invoice
            </button>
            {(isFetching || statsFetching) && (
              <RefreshCw className="w-4 h-4 text-stone-400 animate-spin" />
            )}
            <MonitoringBadge lastFetchedAt={lastFetchedAt} isFetching={isFetching || statsFetching} />
          </div>
        </div>

        {/* ── Onboarding */}
        {!onboardingComplete && (
          <OnboardingChecklist
            hasSources={hasClients}
            hasFailure={hasInvoices}
            hasRecovery={hasPaid}
            plan={plan}
            onOpenSources={() => navigate('/clients')}
            onSimulate={() => navigate('/invoices/new')}
            onUpgrade={() => setShowUpgradeModal(true)}
            simulating={false}
          />
        )}

        <DashboardStats stats={stats} />

        {/* ── Filters */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
          <div className="relative w-full lg:w-96 group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400 group-focus-within:text-emerald-500 transition-colors" />
            <input
              type="text"
              placeholder="Search by client, description or amount..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Search invoices"
              className="w-full pl-11 pr-5 py-3 rounded-2xl border border-stone-100 dark:border-stone-800 bg-white dark:bg-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-sm font-medium transition-all"
            />
          </div>

          <div className="flex items-center gap-3 w-full lg:w-auto overflow-x-auto pb-2 lg:pb-0 scrollbar-hide">
            <div className="flex bg-stone-100 dark:bg-stone-800 p-1 rounded-xl" role="tablist" aria-label="Filter by status">
              {['ALL', 'PENDING', 'PAID', 'OVERDUE'].map((s) => (
                <button
                  key={s}
                  onClick={() => setStatusFilter(s)}
                  role="tab"
                  aria-selected={statusFilter === s}
                  className={cn(
                    'px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all',
                    statusFilter === s
                      ? 'bg-white dark:bg-stone-700 text-stone-800 dark:text-stone-100 shadow-sm'
                      : 'text-stone-400 hover:text-stone-600 dark:hover:text-stone-300'
                  )}
                >
                  {s}
                </button>
              ))}
            </div>

            <div className="flex bg-stone-100 dark:bg-stone-800 p-1 rounded-xl items-center shrink-0">
              <span className="text-[10px] uppercase font-semibold text-stone-400 px-2 italic">Client:</span>
              <select
                value={sourceFilter}
                onChange={(e) => setSourceFilter(e.target.value)}
                className="bg-transparent text-[10px] font-black uppercase tracking-widest outline-none pr-4 text-stone-800 dark:text-stone-100"
              >
                <option value="ALL">All Clients</option>
                {sources.map((s: any) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* ── Main List */}
        <div className="glass rounded-2xl overflow-hidden shadow-2xl">
          {payments.length === 0 ? (
            <div className="p-20 text-center space-y-4">
              <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto opacity-20" />
              <h3 className="text-xl font-black text-stone-300 uppercase">No Invoices Found</h3>
            </div>
          ) : (
            <ul className="divide-y divide-indigo-500/5 dark:divide-white/5" aria-label="Invoice list">
              <AnimatePresence mode="popLayout">
                {payments.map((invoice: any) => (
                  <PaymentRow
                    key={invoice.id}
                    payment={{
                      ...invoice,
                      customerName: invoice.client?.name,
                      customerEmail: invoice.clientEmail
                    }}
                    isPaid={isPaid}
                    onRetry={(id) => sendReminderMutation.mutate(id)}
                    onUpgrade={() => setShowUpgradeModal(true)}
                    onView={(id) => navigate(`/demo?id=${id}`)}
                  />
                ))}
              </AnimatePresence>
            </ul>
          )}

          {/* ── Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-6 py-4 border-t border-stone-100 dark:border-white/5">
              <span className="text-xs text-stone-400">
                Page {page} of {totalPages}
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage(Math.max(1, page - 1))}
                  disabled={page === 1}
                  className="px-3 py-1.5 text-xs font-semibold border border-stone-200 dark:border-stone-700 rounded-lg hover:bg-stone-50 dark:hover:bg-stone-800 disabled:opacity-40"
                >
                  Previous
                </button>
                <button
                  onClick={() => setPage(Math.min(totalPages, page + 1))}
                  disabled={page >= totalPages}
                  className="px-3 py-1.5 text-xs font-semibold border border-stone-200 dark:border-stone-700 rounded-lg hover:bg-stone-50 dark:hover:bg-stone-800 disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </>
  );
};

export default Dashboard;
