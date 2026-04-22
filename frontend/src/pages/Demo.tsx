import { type FC, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { CheckCircle2, ShieldCheck, CreditCard, Download, FileText } from 'lucide-react';
import { api, API_URL } from '../api';
import { formatAmount } from '../utils/format';
import { motion } from 'framer-motion';

const Demo: FC = () => {
  const [searchParams] = useSearchParams();
  const invoiceId = searchParams.get('id') || searchParams.get('invoice');
  const [invoice, setInvoice] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchInvoice = async () => {
      if (!invoiceId) {
        setError('No invoice ID provided.');
        setLoading(false);
        return;
      }
      try {
        const { data } = await api.get(`/demo/invoice/${invoiceId}`);
        setInvoice(data.data);
      } catch (err: any) {
        setError(err.response?.data?.error || 'Failed to load invoice.');
      } finally {
        setLoading(false);
      }
    };
    fetchInvoice();
  }, [invoiceId]);

  const handlePay = async () => {
    try {
      const { data } = await api.post(`/demo/pay/${invoiceId}`);
      if (data.data.url) {
        window.location.href = data.data.url;
      }
    } catch {
      alert('Payment link unavailable. Please contact the sender.');
    }
  };

  const handleDownloadPdf = () => {
    window.open(`${API_URL}/invoices/${invoiceId}/pdf`, '_blank');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-cream">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-stone-300"></div>
      </div>
    );
  }

  if (!invoiceId || error || !invoice) {
    // Show a static mock invoice so visitors can see what the payment experience looks like
    const mock = {
      amount: 250000,
      currency: 'USD',
      description: 'Website Redesign — Phase 1',
      number: 'INV-0042',
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      status: 'SENT',
      client: { name: 'Acme Corp', company: 'Acme Corporation' },
      user: { name: 'Your Name' },
      paidAt: null,
    };

    return (
      <div className="min-h-screen bg-cream selection:bg-emerald-100 selection:text-emerald-900 py-12 px-6">
        <div className="max-w-xl mx-auto space-y-8">
          <div className="flex justify-center items-center gap-2 opacity-50">
            <div className="bg-stone-800 p-2 rounded-lg">
              <CheckCircle2 className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-stone-800 uppercase tracking-widest text-xs">StripeFlow Secure Payment</span>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-2xl px-6 py-4 flex items-center gap-3 text-sm text-amber-700 font-medium">
            <FileText className="w-4 h-4 shrink-0 text-amber-500" />
            This is a <strong>demo preview</strong> — no real payment will be processed.
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-card !p-0 overflow-hidden shadow-2xl"
          >
            <div className="p-8 text-center text-white bg-stone-800">
              <h1 className="text-4xl font-black mb-2">{formatAmount(mock.amount)}</h1>
              <p className="font-bold uppercase tracking-widest text-[10px] opacity-70">
                Due by {new Date(mock.dueDate).toDateString()}
              </p>
            </div>

            <div className="p-8 space-y-8">
              <div className="space-y-4">
                <div className="flex justify-between items-end border-b border-stone-50 pb-4">
                  <div>
                    <label className="text-[10px] font-black uppercase text-stone-400 block mb-1">Description</label>
                    <p className="font-bold text-stone-800">{mock.description}</p>
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase text-stone-400 block mb-1 text-right">Invoice #</label>
                    <p className="font-mono text-xs text-stone-500">{mock.number}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-8 py-4">
                  <div>
                    <label className="text-[10px] font-black uppercase text-stone-400 block mb-1">Billed To</label>
                    <p className="font-bold text-stone-800">{mock.client.name}</p>
                    <p className="text-xs text-stone-500">{mock.client.company}</p>
                  </div>
                  <div className="text-right">
                    <label className="text-[10px] font-black uppercase text-stone-400 block mb-1">Issued By</label>
                    <p className="font-bold text-stone-800">{mock.user.name}</p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <button
                  onClick={() => window.location.href = '/register'}
                  className="w-full btn-primary !py-5 justify-center flex items-center gap-3 text-lg shadow-xl shadow-emerald-500/20"
                >
                  <CreditCard className="w-6 h-6" />
                  Pay {formatAmount(mock.amount)} with Stripe
                </button>
                <p className="text-center text-xs text-stone-400">
                  Want to send invoices like this?{' '}
                  <a href="/register" className="text-emerald-600 font-bold hover:underline">Create a free account →</a>
                </p>
              </div>
            </div>

            <div className="bg-stone-50 p-6 flex justify-center items-center gap-6">
              <div className="flex items-center gap-1.5 opacity-40">
                <ShieldCheck className="w-4 h-4" />
                <span className="text-[8px] font-black uppercase tracking-widest">SSL Encrypted</span>
              </div>
              <div className="flex items-center gap-1.5 opacity-40">
                <CreditCard className="w-4 h-4" />
                <span className="text-[8px] font-black uppercase tracking-widest">Stripe Secure</span>
              </div>
            </div>
          </motion.div>

          <p className="text-center text-[10px] uppercase font-bold tracking-widest text-stone-400">
            Powered by StripeFlow &middot; Instant Freelancer Invoicing
          </p>
        </div>
      </div>
    );
  }

  const isPaid = invoice.status === 'PAID';

  return (
    <div className="min-h-screen bg-cream selection:bg-emerald-100 selection:text-emerald-900 py-12 px-6">
      <div className="max-w-xl mx-auto space-y-8">
        <div className="flex justify-center items-center gap-2 opacity-50">
           <div className="bg-stone-800 p-2 rounded-lg">
             <CheckCircle2 className="w-4 h-4 text-white" />
           </div>
           <span className="font-bold text-stone-800 uppercase tracking-widest text-xs">StripeFlow Secure Payment</span>
        </div>

        <motion.div
           initial={{ opacity: 0, y: 20 }}
           animate={{ opacity: 1, y: 0 }}
           className="glass-card !p-0 overflow-hidden shadow-2xl"
        >
          <div className={`p-8 text-center text-white ${isPaid ? 'bg-emerald-500' : 'bg-stone-800'}`}>
             <h1 className="text-4xl font-black mb-2">{isPaid ? 'Invoice Paid' : formatAmount(invoice.amount)}</h1>
             <p className="font-bold uppercase tracking-widest text-[10px] opacity-70">
               {isPaid ? 'Receipt Available Below' : `Due by ${new Date(invoice.dueDate).toDateString()}`}
             </p>
          </div>

          <div className="p-8 space-y-8">
            <div className="space-y-4">
              <div className="flex justify-between items-end border-b border-stone-50 pb-4">
                <div>
                   <label className="text-[10px] font-black uppercase text-stone-400 block mb-1">Description</label>
                   <p className="font-bold text-stone-800">{invoice.description}</p>
                </div>
                <div>
                   <label className="text-[10px] font-black uppercase text-stone-400 block mb-1 text-right">Invoice #</label>
                   <p className="font-mono text-xs text-stone-500">{invoice.number}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-8 py-4">
                <div>
                   <label className="text-[10px] font-black uppercase text-stone-400 block mb-1">Billed To</label>
                   <p className="font-bold text-stone-800">{invoice.client?.name || invoice.clientEmail}</p>
                   {invoice.client?.company && <p className="text-xs text-stone-500">{invoice.client.company}</p>}
                </div>
                <div className="text-right">
                   <label className="text-[10px] font-black uppercase text-stone-400 block mb-1">Issued By</label>
                   <p className="font-bold text-stone-800">{invoice.user?.name || 'Freelancer'}</p>
                </div>
              </div>
            </div>

            {isPaid ? (
              <div className="bg-emerald-50 rounded-2xl p-6 flex flex-col items-center gap-4 text-center border border-emerald-100">
                <div className="bg-emerald-500 p-3 rounded-full text-white">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="font-bold text-emerald-900">Payment Confirmed</h3>
                  <p className="text-sm text-emerald-700/70">
                    {invoice.paidAt ? `Paid on ${new Date(invoice.paidAt).toDateString()}` : 'A receipt has been sent to your email.'}
                  </p>
                </div>
                <button
                  onClick={handleDownloadPdf}
                  className="flex items-center gap-2 text-emerald-700 font-bold text-sm bg-white px-6 py-2 rounded-xl shadow-sm hover:shadow-md transition-all"
                >
                  <Download className="w-4 h-4" /> Download PDF
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <button
                  onClick={handlePay}
                  className="w-full btn-primary !py-5 justify-center flex items-center gap-3 text-lg shadow-xl shadow-emerald-500/20"
                >
                  <CreditCard className="w-6 h-6" />
                  Pay {formatAmount(invoice.amount)} with Stripe
                </button>
                <button
                  onClick={handleDownloadPdf}
                  className="w-full py-4 text-center text-stone-400 hover:text-stone-800 font-bold transition-all flex items-center justify-center gap-2"
                >
                  <Download className="w-4 h-4" /> Download Invoice PDF
                </button>
              </div>
            )}
          </div>

          <div className="bg-stone-50 p-6 flex justify-center items-center gap-6">
            <div className="flex items-center gap-1.5 opacity-40">
               <ShieldCheck className="w-4 h-4" />
               <span className="text-[8px] font-black uppercase tracking-widest">SSL Encrypted</span>
            </div>
            <div className="flex items-center gap-1.5 opacity-40">
               <CreditCard className="w-4 h-4" />
               <span className="text-[8px] font-black uppercase tracking-widest">Stripe Secure</span>
            </div>
          </div>
        </motion.div>

        <p className="text-center text-[10px] uppercase font-bold tracking-widest text-stone-400">
          Powered by StripeFlow &middot; Instant Freelancer Invoicing
        </p>
      </div>
    </div>
  );
};

export default Demo;
