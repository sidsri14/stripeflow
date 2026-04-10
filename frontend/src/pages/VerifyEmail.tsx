import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Loader2, XCircle, CheckCircle2 } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { api } from '../api';

const VerifyEmail = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const navigate = useNavigate();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');

  useEffect(() => {
    let redirectTimer: ReturnType<typeof setTimeout>;
    const verify = async () => {
      if (!token) {
        setStatus('error');
        return;
      }
      try {
        await api.post('/auth/verify-email', { token });
        setStatus('success');
        toast.success('Email verified successfully!');
        redirectTimer = setTimeout(() => navigate('/'), 3000);
      } catch {
        setStatus('error');
        toast.error('Verification failed');
      }
    };
    verify();
    return () => clearTimeout(redirectTimer);
  }, [token, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-cream dark:bg-stone-900 transition-colors text-center">
      <div className="w-full max-w-md bg-white dark:bg-stone-800 border border-warm-border dark:border-stone-700 rounded-3xl p-10 space-y-8 shadow-xl shadow-stone-200/50 dark:shadow-none">
        
        {status === 'loading' && (
          <>
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-stone-50 dark:bg-stone-900/40 text-stone-300 dark:text-stone-700">
              <Loader2 className="w-10 h-10 animate-spin" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-stone-800 dark:text-stone-100 mb-2 mt-4 tracking-tight">
                Verifying Account
              </h1>
              <p className="text-stone-500 dark:text-stone-400 text-sm font-medium">
                Hang tight, we're confirming your credentials...
              </p>
            </div>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-stone-800 dark:text-stone-100 mb-2 mt-4 tracking-tight">
                All Set!
              </h1>
              <p className="text-stone-500 dark:text-stone-400 text-sm font-medium leading-relaxed">
                Your email has been verified. We're redirecting you to your dashboard in a few seconds.
              </p>
            </div>
            <button
              onClick={() => navigate('/')}
              className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl font-bold text-sm shadow-xl shadow-emerald-600/20 transition-all"
            >
              Go to Dashboard Now
            </button>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400">
              <XCircle className="w-10 h-10" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-stone-800 dark:text-stone-100 mb-2 mt-4 tracking-tight">
                Verification Failed
              </h1>
              <p className="text-stone-500 dark:text-stone-400 text-sm font-medium leading-relaxed">
                The link is invalid or has expired. Please check your email or contact support.
              </p>
            </div>
            <button
              onClick={() => navigate('/login')}
              className="w-full py-4 bg-stone-100 dark:bg-stone-700 hover:bg-stone-200 dark:hover:bg-stone-600 text-stone-700 dark:text-stone-200 rounded-2xl font-bold text-sm transition-all"
            >
              Back to Sign In
            </button>
          </>
        )}

      </div>
    </div>
  );
};

export default VerifyEmail;
