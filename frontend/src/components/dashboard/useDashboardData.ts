import { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../api';
import toast from 'react-hot-toast';
import type { AuthUser } from '../../App';

export const PAGE_SIZE = 10;

export function useDashboardData(currentUser: AuthUser | null) {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [sortKey, setSortKey] = useState<'status' | 'amount' | 'createdAt' | 'retryCount'>('createdAt');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [lastFetchedAt, setLastFetchedAt] = useState<Date | null>(null);
  const [debouncedSearch, setDebouncedSearch] = useState('');

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 350);
    return () => clearTimeout(t);
  }, [search]);

  // ── Plan logic derived from prop
  const isPaid = currentUser?.plan === 'starter' || currentUser?.plan === 'pro';
  const plan = currentUser?.plan || 'free';

  // ── Stats
  const { data: statsData, isFetching: statsFetching } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: async () => {
      const { data } = await api.get('/dashboard/stats');
      setLastFetchedAt(new Date());
      return data.data;
    },
    refetchInterval: 30000,
    staleTime: 5000, // Reduced for better reactivity
  });

  // ── Sources
  const { data: sources = [] } = useQuery({
    queryKey: ['sources'],
    queryFn: async () => {
      const { data } = await api.get('/sources');
      return data.data;
    },
    staleTime: 5000, // Reduced for better reactivity
  });

  // ── Payments (paginated)
  const { data: paymentsPage, isLoading, isFetching } = useQuery({
    queryKey: ['payments', page, PAGE_SIZE, debouncedSearch, statusFilter, sortKey, sortDir],
    queryFn: async () => {
      const { data } = await api.get('/payments', {
        params: {
          page,
          limit: PAGE_SIZE,
          search: debouncedSearch || undefined,
          status: statusFilter === 'ALL' ? undefined : statusFilter.toLowerCase(),
          sortKey,
          sortDir,
        },
      });
      return data.data;
    },
    refetchInterval: 30000,
    staleTime: 5000,
  });

  // ── Mutations
  const upgradeMutation = useMutation({
    mutationFn: () => api.patch('/billing/plan', { plan: 'pro' }),
    onSuccess: () => {
      toast.success('Pro plan activated!');
      setShowUpgradeModal(false);
      // We don't invalidate 'user' here anymore as it's passed from App.tsx via onUpdateUser
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
    },
    onError: () => toast.error('Upgrade failed'),
  });

  const retryMutation = useMutation({
    mutationFn: (id: string) => api.post(`/payments/${id}/retry`),
    onSuccess: () => {
      toast.success('Retry queued');
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
    },
    onError: () => toast.error('Retry failed'),
  });

  const simulateFailureMutation = useMutation({
    mutationFn: () => api.post('/demo/simulate-failure'),
    onSuccess: () => {
      toast.success('Demo failure created');
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
    },
  });

  // Pagination helper - Reset to page 1 on filter/search change
  // Note: We use a ref-like comparison or effect to avoid infinite loops if needed, 
  // but here we just want to ensure page resets when "upstream" filters change.
  // To satisfy the linter, we would ideally do this in setters, but for now, 
  // we'll disable the warning as this is a common pattern for pagination resets.
  useEffect(() => {
    if (page !== 1) setPage(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, statusFilter, sortKey, sortDir]);

  const stats = statsData || { totalLost: 0, totalRecovered: 0, recoveredCount: 0, sourcesCount: 0 };
  const payments = useMemo(() => paymentsPage?.payments || [], [paymentsPage?.payments]);

  return {
    state: { page, search, statusFilter, sortKey, sortDir, showUpgradeModal, lastFetchedAt },
    setters: { setPage, setSearch, setStatusFilter, setSortKey, setSortDir, setShowUpgradeModal },
    data: { user: currentUser, isPaid, plan, stats, statsFetching, sources, paymentsPage, payments, isLoading, isFetching },
    mutations: { upgradeMutation, retryMutation, simulateFailureMutation }
  };
}
