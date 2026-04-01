import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../api';
import toast from 'react-hot-toast';

export const PAGE_SIZE = 10;

export function useDashboardData() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [sortKey, setSortKey] = useState<'status' | 'amount' | 'createdAt' | 'retryCount'>('createdAt');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [lastFetchedAt, setLastFetchedAt] = useState<Date | null>(null);

  // ── User / Plan
  const { data: user } = useQuery({
    queryKey: ['user'],
    queryFn: async () => {
      const { data } = await api.get('/auth/me');
      return data.data;
    },
    staleTime: Infinity,
  });
  const isPaid = user?.plan === 'paid';
  const plan = user?.plan || 'free';

  // ── Stats
  const { data: stats, isFetching: statsFetching } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: async () => {
      const { data } = await api.get('/dashboard/stats');
      setLastFetchedAt(new Date());
      return data.data;
    },
    refetchInterval: 30000,
    staleTime: 10000,
  });

  // ── Sources
  const { data: sources = [] } = useQuery({
    queryKey: ['sources'],
    queryFn: async () => {
      const { data } = await api.get('/sources');
      return data.data;
    },
    staleTime: 60000,
  });

  // ── Payments (paginated)
  const { data: paymentsPage, isLoading, isFetching } = useQuery({
    queryKey: ['payments', page, PAGE_SIZE, search, statusFilter, sortKey, sortDir],
    queryFn: async () => {
      const { data } = await api.get('/payments', { 
        params: { page, limit: PAGE_SIZE, search, status: statusFilter, sortKey, sortDir } 
      });
      return data.data;
    },
    refetchInterval: 30000,
    staleTime: 10000,
  });

  // ── Mutations
  const upgradeMutation = useMutation({
    mutationFn: () => api.post('/billing/upgrade'),
    onSuccess: () => {
      toast.success('Pro plan activated!');
      setShowUpgradeModal(false);
      queryClient.invalidateQueries({ queryKey: ['user'] });
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

  // Pagination helper
  useEffect(() => {
    setPage(1);
  }, [search, statusFilter, sortKey, sortDir]);

  return {
    state: { page, search, statusFilter, sortKey, sortDir, showUpgradeModal, lastFetchedAt },
    setters: { setPage, setSearch, setStatusFilter, setSortKey, setSortDir, setShowUpgradeModal },
    data: { user, isPaid, plan, stats, statsFetching, sources, paymentsPage, isLoading, isFetching },
    mutations: { upgradeMutation, retryMutation, simulateFailureMutation }
  };
}
