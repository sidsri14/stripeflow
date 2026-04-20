import { type FC } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ChevronLeft, Download, ExternalLink, Clock, CheckCircle2, AlertCircle, XCircle, FileText } from 'lucide-react';
import { api } from '../api';
import { formatAmount } from '../utils/format';
import { cn } from '../utils/cn';
import toast from 'react-hot-toast';

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: typeof CheckCircle2 }> = {
  DRAFT:     { label: 'Draft',     color: 'bg-stone-500/10 text-stone-500 border-stone-500/20',   icon: FileText },
  SENT:      { label: 'Sent',      color: 'bg-amber-500/10 text-amber-500 border-amber-500/20',   icon: Clock },
  PAID:      { label: 'Paid',      color: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20', icon: CheckCircle2 },
  OVERDUE:   { label: 'Overdue',   color: 'bg-rose-500/10 text-rose-500 border-rose-500/20',      icon: AlertCircle },
  CANCELLED: { label: 'Cancelled', color: 'bg-stone-500/10 text-stone-400 border-stone-500/20',   icon: XCircle },
};

const InvoiceDetail: FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: invoice, isLoading, error } = useQuery({
    queryKey: ['invoice', id],
    queryFn: async () => {
      const { data } = await api.get(`/invoices/${id}`);
      return data.data;
    },
    enabled: !!id,
  });

  const handleDownloadPdf = async () => {
    const toastId = toast.loading('Generating PDF…');
    try {
      const response = await api.get(`/invoices/${id}/pdf`, { responseType: 'blob' });
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `invoice-${invoice?.number ?? id}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('PDF downloaded', { id: toastId });
    } catch {
      toast.error('Failed to generate PDF', { id: toastId });
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-3xl mx-auto space-y-6 animate-pulse">
        <div className="h-6 w-32 bg-stone-100 dark:bg-stone-800 rounded" />
        <div className="glass-card h-64" />
      </div>
    );
  }

  if (error || !invoice) {
    return (
      <div className="max-w-3xl mx-auto text-center py-20 text-stone-400">
        <AlertCircle className="w-12 h-12 mx-auto mb-4 opacity-30" />
        <p className="font-bold">Invoice not found.</p>
        <button onClick={() => navigate('/invoices')} className="mt-4 text-sm text-emerald-500 hover:underline">
          Back to Invoices
        </button>
      </div>
    );
  }

  const status = STATUS_CONFIG[invoice.status] ?? STATUS_CONFIG.DRAFT;
  const StatusIcon = status.icon;

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <button
        onClick={() => navigate('/invoices')}
        className="flex items-center gap-2 text-stone-400 hover:text-stone-800 dark:hover:text-stone-200 transition-all font-bold text-sm"
      >
        <ChevronLeft className="w-4 h-4" />
        Back to Invoices
      </button>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest text-stone-400 mb-1">Invoice</p>
          <h1 className="text-3xl font-bold text-stone-800 dark:text-stone-100 tracking-tight">{invoice.number}</h1>
        </div>
        <span className={cn('inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-widest border', status.color)}>
          <StatusIcon className="w-3.5 h-3.5" />
          {status.label}
        </span>
      </div>

      <div className="glass-card space-y-6">
        <div className="grid grid-cols-2 gap-6">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-stone-400 mb-1">Client</p>
            <p className="font-bold text-stone-800 dark:text-stone-100">{invoice.client?.name ?? '—'}</p>
            <p className="text-sm text-stone-400">{invoice.clientEmail}</p>
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-stone-400 mb-1">Amount</p>
            <p className="text-2xl font-black text-stone-800 dark:text-stone-100">{formatAmount(invoice.amount)}</p>
            <p className="text-xs text-stone-400">{invoice.currency}</p>
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-stone-400 mb-1">Issue Date</p>
            <p className="font-bold text-stone-700 dark:text-stone-200">{new Date(invoice.createdAt).toDateString()}</p>
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-stone-400 mb-1">Due Date</p>
            <p className="font-bold text-stone-700 dark:text-stone-200">{new Date(invoice.dueDate).toDateString()}</p>
          </div>
          {invoice.paidAt && (
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-stone-400 mb-1">Paid On</p>
              <p className="font-bold text-emerald-500">{new Date(invoice.paidAt).toDateString()}</p>
            </div>
          )}
        </div>

        <div>
          <p className="text-[10px] font-black uppercase tracking-widest text-stone-400 mb-1">Description</p>
          <p className="text-stone-700 dark:text-stone-200">{invoice.description}</p>
        </div>

        <div className="pt-4 border-t border-stone-100 dark:border-stone-800 flex flex-wrap gap-3">
          <button onClick={handleDownloadPdf} className="btn-primary">
            <Download className="w-4 h-4" />
            Download PDF
          </button>

          {invoice.stripeSessionId && invoice.status !== 'PAID' && invoice.status !== 'CANCELLED' && (
            <a
              href={`/api/invoices/${id}/checkout`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-stone-200 dark:border-stone-700 font-bold text-sm text-stone-600 dark:text-stone-300 hover:text-stone-900 dark:hover:text-stone-100 transition-all"
            >
              <ExternalLink className="w-4 h-4" />
              Stripe Checkout Link
            </a>
          )}
        </div>
      </div>
    </div>
  );
};

export default InvoiceDetail;
