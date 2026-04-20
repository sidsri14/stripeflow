import React from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { CheckCircle2, XCircle, TrendingUp } from 'lucide-react';

const PaymentStatus: React.FC = () => {
  const [params] = useSearchParams();

  const status = params.get('razorpay_payment_link_status'); // "paid" | "cancelled" | null
  const paymentId = params.get('razorpay_payment_id');

  const isSuccess = status === 'paid' && Boolean(paymentId);
  const displayId = paymentId;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-cream dark:bg-stone-900 p-6 transition-colors">
      {/* Logo */}
      <div className="mb-8 flex items-center gap-3">
        <div className="bg-emerald-600 dark:bg-emerald-700 p-2.5 rounded-xl">
          <TrendingUp className="w-5 h-5 text-white" />
        </div>
        <span className="font-bold text-xl tracking-tight text-stone-800 dark:text-stone-100">PayRecover</span>
      </div>

      <div className="w-full max-w-md bg-white dark:bg-stone-800 rounded-2xl border border-stone-100 dark:border-stone-700 p-8 text-center space-y-6 shadow-xl shadow-stone-200/50 dark:shadow-none">
        {isSuccess ? (
          <>
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-emerald-50 dark:bg-emerald-900/20 text-emerald-500">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-stone-800 dark:text-stone-100 tracking-tight mb-2">
                Payment Successful
              </h1>
              <p className="text-stone-500 dark:text-stone-400 text-sm font-medium leading-relaxed">
                Your payment has been received. You will get a confirmation shortly.
              </p>
            </div>
            {displayId && (
              <p className="text-xs font-mono text-stone-400 dark:text-stone-500 bg-stone-50 dark:bg-stone-900/50 rounded-lg px-3 py-2 break-all">
                {paymentId ? 'Payment ID: ' : 'Session ID: '}{displayId}
              </p>
            )}
          </>
        ) : (
          <>
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-rose-50 dark:bg-rose-900/20 text-rose-500">
              <XCircle className="w-10 h-10" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-stone-800 dark:text-stone-100 tracking-tight mb-2">
                Payment Unsuccessful
              </h1>
              <p className="text-stone-500 dark:text-stone-400 text-sm font-medium leading-relaxed">
                We couldn't process your payment. This may be due to a cancellation or a temporary issue. Please try again or contact support.
              </p>
            </div>
          </>
        )}

        <div className="pt-4 border-t border-stone-100 dark:border-stone-700 space-y-3">
          <p className="text-xs text-stone-400 dark:text-stone-500">
            Need help?{' '}
            <a
              href="mailto:support@payrecover.io"
              className="text-emerald-600 dark:text-emerald-400 hover:underline font-semibold"
            >
              Contact support
            </a>
          </p>
          <Link
            to="/"
            className="inline-block px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold rounded-xl transition-all shadow-lg shadow-emerald-500/20"
          >
            Return to Home
          </Link>
        </div>
      </div>
    </div>
  );
};

export default PaymentStatus;
