import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, Zap, ArrowRight, CheckCircle2, TrendingUp, RotateCcw, IndianRupee, Globe, ShieldAlert, Moon, Sun } from 'lucide-react';
import { motion } from 'framer-motion';
import { trackEvent } from '../utils/analytics';

const RevenueCalculator = () => {
  const [revenue, setRevenue] = useState(500000);
  const [failureRate, setFailureRate] = useState(12);

  const annualLoss = revenue * (failureRate / 100) * 12;
  const projectedRecovery = annualLoss * 0.22; // Conservative 22% recovery

  return (
    <div className="space-y-10 max-w-2xl mx-auto">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="space-y-4">
          <label className="text-sm font-black uppercase tracking-widest text-stone-400 block">Monthly Revenue (₹)</label>
          <input 
            type="range" min="100000" max="5000000" step="100000"
            value={revenue} onChange={(e) => setRevenue(Number(e.target.value))}
            className="w-full h-2 bg-stone-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
          />
          <div className="text-2xl font-black">₹{revenue.toLocaleString('en-IN')}</div>
        </div>
        <div className="space-y-4">
          <label className="text-sm font-black uppercase tracking-widest text-stone-400 block">Failure Rate (%)</label>
          <input 
            type="range" min="5" max="30" step="1"
            value={failureRate} onChange={(e) => setFailureRate(Number(e.target.value))}
            className="w-full h-2 bg-stone-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
          />
          <div className="text-2xl font-black">{failureRate}%</div>
        </div>
      </div>
      
      <div className="pt-10 border-t border-white/10 flex flex-col md:flex-row items-center justify-between gap-8">
        <div className="text-center md:text-left">
          <div className="text-stone-400 text-sm font-bold uppercase mb-1">Your Yearly Loss</div>
          <div className="text-4xl font-black text-red-400">₹{annualLoss.toLocaleString('en-IN')}</div>
        </div>
        <div className="text-center md:text-right">
          <div className="text-emerald-400 text-sm font-bold uppercase mb-1">Projected Recovery</div>
          <div className="text-4xl font-black text-emerald-500">₹{projectedRecovery.toLocaleString('en-IN')}</div>
        </div>
      </div>
    </div>
  );
};

const ThemeToggle = () => {
  const [isDark, setIsDark] = useState(() => {
    const saved = localStorage.getItem('theme');
    if (saved === 'dark') return true;
    if (saved === 'light') return false;
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark);
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
  }, [isDark]);

  return (
    <button
      onClick={() => setIsDark(!isDark)}
      className="p-2 rounded-xl hover:bg-stone-100 dark:hover:bg-stone-800 transition-all border border-stone-200/60 dark:border-stone-700/60"
      title="Toggle theme"
    >
      {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-stone-500" />}
    </button>
  );
};

const LandingPage = () => {
  useEffect(() => {
    document.title = 'PayRecover | Automated Failed Payment Recovery';
    // Ensure meta description is set for crawlers/subagents
    let metaDesc = document.querySelector('meta[name="description"]');
    if (!metaDesc) {
      metaDesc = document.createElement('meta');
      (metaDesc as HTMLMetaElement).name = 'description';
      document.head.appendChild(metaDesc);
    }
    (metaDesc as HTMLMetaElement).content = 'Recover lost revenue automatically. PayRecover monitors failed payments and uses smart multi-channel flows to win back customers.';
  }, []);

  return (
    <div className="min-h-screen bg-cream dark:bg-stone-900 transition-colors selection:bg-emerald-200 dark:selection:bg-emerald-900/40">
      
      {/* ── Navigation */}
      <nav className="fixed top-0 w-full z-50 border-b border-warm-border/40 dark:border-stone-800/40 bg-cream/70 dark:bg-stone-900/70 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="bg-stone-800 dark:bg-stone-100 p-2 rounded-xl shadow-lg">
              <ShieldCheck className="w-5 h-5 text-white dark:text-stone-900" />
            </div>
            <span className="text-xl font-black text-stone-900 dark:text-white tracking-tight">PayRecover</span>
          </div>
          <div className="flex items-center gap-4">
            <ThemeToggle />
            <Link to="/login" className="text-sm font-bold text-stone-500 hover:text-stone-900 dark:text-stone-400 dark:hover:text-white transition-colors">Sign in</Link>
            <Link
              to="/register"
              className="px-6 py-2.5 bg-stone-900 dark:bg-white text-white dark:text-stone-900 text-sm font-bold rounded-xl hover:scale-105 active:scale-95 transition-all shadow-xl shadow-stone-900/10 dark:shadow-none"
            >
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* ── Hero Section */}
      <section className="pt-48 pb-32 px-6 overflow-hidden">
        <div className="max-w-7xl mx-auto text-center relative">
          {/* Decorative Elements */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-emerald-100/30 dark:bg-emerald-900/10 blur-[120px] rounded-full -z-10" />
          
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-emerald-100 dark:border-emerald-900/30 bg-emerald-50/50 dark:bg-emerald-900/10 text-emerald-600 dark:text-emerald-400 text-xs font-black uppercase tracking-widest mb-8">
              <Zap className="w-3.5 h-3.5 fill-emerald-500" /> #1 Razorpay Recovery Engine for India
            </div>
            <h1 className="text-6xl md:text-8xl font-black text-stone-900 dark:text-white mb-8 tracking-tighter leading-[0.95]">
              Recover your <br className="hidden md:block" />
              <span className="text-emerald-500">lost revenue on WhatsApp.</span>
            </h1>
            <p className="max-w-2xl mx-auto text-xl font-medium text-stone-500 dark:text-stone-400 mb-12 leading-relaxed">
              Indian founders lose 10-15% of ARR to Razorpay payment failures. PayRecover automatically wins them back via smart WhatsApp, SMS, and Email flows.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link 
                to="/register" 
                onClick={() => trackEvent('signup_click', { location: 'hero' })}
                className="w-full sm:w-auto px-10 py-5 bg-stone-900 dark:bg-emerald-600 text-white text-lg font-black rounded-2xl hover:bg-emerald-500 dark:hover:bg-emerald-500 hover:-translate-y-1 transition-all shadow-2xl shadow-emerald-600/20 flex items-center justify-center gap-2"
              >
                Connect Razorpay <ArrowRight className="w-5 h-5" />
              </Link>
              <Link
                to="/register"
                className="w-full sm:w-auto text-sm font-bold text-stone-600 dark:text-stone-400 bg-white/50 dark:bg-stone-800/50 px-8 py-5 rounded-2xl border border-warm-border dark:border-stone-800 backdrop-blur-sm hover:bg-white dark:hover:bg-stone-800 transition-all"
              >
                See Live Simulation Demo
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── Social Proof / Metrics */}
      <section className="py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
             {[
               { label: 'Recovered for Founders', value: '₹12.4L+', icon: <TrendingUp className="w-5 h-5" />, color: 'emerald' },
               { label: 'Active Reminders', value: '3,840+', icon: <RotateCcw className="w-5 h-5" />, color: 'amber' },
               { label: 'Platform Reliability', value: '99.99%', icon: <Globe className="w-5 h-5" />, color: 'blue' },
             ].map((m, i) => (
               <div key={i} className="p-8 rounded-3xl border border-warm-border dark:border-stone-800 bg-white dark:bg-stone-800/40 backdrop-blur-xl shadow-soft">
                 <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-4 bg-${m.color}-50 dark:bg-${m.color}-900/20 text-${m.color}-600 dark:text-${m.color}-400`}>
                   {m.icon}
                 </div>
                 <h4 className="text-3xl font-black text-stone-900 dark:text-white tracking-tight">{m.value}</h4>
                 <p className="text-sm font-bold text-stone-400 dark:text-stone-500 uppercase tracking-widest mt-1">{m.label}</p>
               </div>
             ))}
          </div>
        </div>
      </section>

      {/* ── Revenue Loss Calculator */}
      <section className="py-32 px-6">
        <div className="max-w-4xl mx-auto p-12 rounded-[60px] bg-stone-900 text-white relative overflow-hidden shadow-2xl">
          <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 blur-[100px] rounded-full" />
          <div className="relative z-10 text-center">
            <h2 className="text-3xl md:text-5xl font-black mb-12 tracking-tight">How much are you losing?</h2>
            <RevenueCalculator />
          </div>
        </div>
      </section>

      {/* ── How It Works */}
      <section className="py-32 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-24">
            <h2 className="text-4xl md:text-5xl font-black text-stone-900 dark:text-white mb-6">Built for the Indian internet.</h2>
            <p className="text-stone-500 dark:text-stone-400 font-medium max-w-xl mx-auto text-lg leading-relaxed">Most recovery tools rely on email. We know Indians live on WhatsApp. Our 3-stage flow wins back customers where they actually are.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-16 relative">
             {/* Connector Line */}
             <div className="hidden md:block absolute top-[60px] left-32 right-32 h-[2px] bg-stone-100 dark:bg-stone-800 -z-10" />
             
             {[
               { title: 'Connect Razorpay', desc: 'Securely link your account via one-click encryption. No developer needed.', icon: <Zap /> },
               { title: 'Multi-Channel Dunning', desc: 'Intelligent flows across WhatsApp, SMS, and Email based on local habits.', icon: <ShieldCheck /> },
               { title: 'Recover ₹₹₹', desc: 'Customers get 1-click payment links compatible with UPI and local cards.', icon: <IndianRupee /> },
             ].map((step, i) => (
               <div key={i} className="text-center group">
                 <div className="w-24 h-24 rounded-[40px] bg-white dark:bg-stone-800 border border-warm-border dark:border-stone-700 mx-auto flex items-center justify-center mb-8 shadow-xl group-hover:scale-110 group-hover:-rotate-3 transition-all duration-500">
                    <div className="w-12 h-12 text-emerald-500">
                      {step.icon}
                    </div>
                 </div>
                 <h3 className="text-xl font-black text-stone-900 dark:text-white mb-4">{step.title}</h3>
                 <p className="text-stone-500 dark:text-stone-500 text-sm font-medium leading-relaxed px-4">{step.desc}</p>
               </div>
             ))}
          </div>
        </div>
      </section>

      {/* ── Pricing */}
      <section className="py-32 px-6 bg-stone-50 dark:bg-stone-800/30">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-20">
            <h2 className="text-4xl md:text-5xl font-black text-stone-900 dark:text-white mb-6">Transparent Pricing.</h2>
            <p className="text-stone-500 dark:text-stone-400 font-medium">Simple plans for every stage of your business.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Starter Plan */}
            <div className="p-10 rounded-[40px] border border-warm-border dark:border-stone-700 bg-white dark:bg-stone-900 shadow-soft">
              <span className="text-xs font-black uppercase tracking-[0.2em] text-stone-400">Starter</span>
              <div className="flex items-baseline gap-2 my-6">
                <span className="text-5xl font-black text-stone-900 dark:text-white">₹799</span>
                <span className="text-stone-400 font-bold">/mo</span>
              </div>
              <ul className="space-y-4 mb-10">
                {['Up to 10 recoveries /mo', 'Automated Email Recovery', '7-Day Payment Links', 'Standard Support'].map((f, i) => (
                  <li key={i} className="flex items-center gap-3 text-sm font-bold text-stone-500 dark:text-stone-400">
                    <CheckCircle2 className="w-5 h-5 text-emerald-500" /> {f}
                  </li>
                ))}
              </ul>
              <Link to="/register" className="block w-full py-5 bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-center text-stone-900 dark:text-white font-black rounded-2xl transition-all">Get Starter</Link>
            </div>

            {/* Pro Plan */}
            <div className="p-10 rounded-[40px] border-2 border-emerald-500 bg-white dark:bg-stone-900 shadow-xl shadow-emerald-500/10 relative">
              <div className="absolute top-0 right-10 -translate-y-1/2 px-4 py-1.5 bg-emerald-500 text-white text-[10px] font-black uppercase tracking-widest rounded-full">Recommended</div>
              <span className="text-xs font-black uppercase tracking-[0.2em] text-emerald-500">Pro</span>
              <div className="flex items-baseline gap-2 my-6">
                <span className="text-5xl font-black text-stone-900 dark:text-white">₹1,499</span>
                <span className="text-stone-400 font-bold">/mo</span>
              </div>
              <ul className="space-y-4 mb-10">
                {['Unlimited Recoveries', 'Priority Support', 'Full Custom Branding', 'GST Invoicing'].map((f, i) => (
                   <li key={i} className="flex items-center gap-3 text-sm font-bold text-stone-500 dark:text-stone-400">
                     <CheckCircle2 className="w-5 h-5 text-emerald-500" /> {f}
                   </li>
                 ))}
              </ul>
              <Link to="/register" className="block w-full py-5 bg-emerald-600 hover:bg-emerald-500 text-center text-white font-black rounded-2xl shadow-xl shadow-emerald-600/20 transition-all">Get Pro Now</Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA */}
      <section className="py-40 px-6 text-center">
        <div className="max-w-4xl mx-auto bg-stone-900 dark:bg-emerald-600 rounded-[60px] p-20 text-white relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-white/10 to-transparent pointer-events-none" />
          <h2 className="text-5xl md:text-6xl font-black mb-8 leading-tight">Ready to recover your <br /> lost revenue?</h2>
          <Link 
            to="/register" 
            onClick={() => trackEvent('signup_click', { location: 'cta_bottom' })}
            className="inline-flex items-center gap-3 px-12 py-6 bg-white text-stone-900 text-xl font-black rounded-2xl hover:scale-105 transition-all"
          >
            Get Started Free <ArrowRight className="w-6 h-6" />
          </Link>
          <p className="mt-8 text-white/50 text-sm font-bold">60-second setup. No credit card required.</p>
        </div>
      </section>

      {/* ── Footer */}
      <footer className="py-20 border-t border-warm-border dark:border-stone-800">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-8">
           <div className="flex items-center gap-2.5 opacity-50">
              <ShieldAlert className="w-5 h-5" />
              <span className="text-xl font-black tracking-tight">PayRecover</span>
           </div>
           <div className="flex gap-8 text-sm font-bold text-stone-400">
              <Link to="/privacy" className="hover:text-stone-900 dark:hover:text-white transition-colors">Privacy</Link>
              <Link to="/terms" className="hover:text-stone-900 dark:hover:text-white transition-colors">Terms</Link>
              <Link to="/contact" className="hover:text-stone-900 dark:hover:text-white transition-colors">Contact</Link>
           </div>
           <p className="text-sm font-bold text-stone-300 dark:text-stone-700">© 2026 PayRecover. All rights reserved.</p>
        </div>
      </footer>

    </div>
  );
};

export default LandingPage;
