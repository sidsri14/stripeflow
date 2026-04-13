import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, ArrowLeft, Mail, User, MessageSquare, Send, CheckCircle2, Loader2 } from 'lucide-react';

const Contact = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !message.trim()) {
      setError('Please fill in all fields.');
      return;
    }
    setError('');
    setLoading(true);
    // Simulated async (will be replaced with real API call)
    setTimeout(() => {
      setLoading(false);
      setSubmitted(true);
    }, 300);
  };

  return (
    <div className="min-h-screen bg-cream dark:bg-stone-900 transition-colors">
      {/* Header */}
      <header className="border-b border-warm-border dark:border-stone-800 bg-white/80 dark:bg-stone-900/80 backdrop-blur-md sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-6 h-16 flex items-center gap-3">
          <div className="bg-stone-800 dark:bg-stone-100 p-1.5 rounded-lg">
            <ShieldCheck className="w-4 h-4 text-white dark:text-stone-900" />
          </div>
          <span className="font-black text-lg text-stone-900 dark:text-white tracking-tight">PayRecover</span>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-12">
        {/* Back link */}
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-sm font-bold text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 transition-colors mb-10"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Home
        </Link>

        {/* Title */}
        <div className="mb-10">
          <h1 className="text-4xl font-black text-stone-900 dark:text-white tracking-tight mb-3">Contact Us</h1>
          <p className="text-sm font-medium text-stone-400">Last updated: April 13, 2026</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
          {/* Left column — info */}
          <div className="space-y-8 text-stone-600 dark:text-stone-400">
            <p className="text-base leading-relaxed">
              Have a question about PayRecover, your subscription, or need technical support? We're here to help.
              Reach out via email or use the contact form and we'll get back to you as soon as possible.
            </p>

            <div className="space-y-5">
              {/* Email */}
              <div className="flex items-start gap-4">
                <div className="bg-emerald-50 dark:bg-emerald-900/20 p-2.5 rounded-xl shrink-0">
                  <Mail className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest text-stone-400 mb-1">Email</p>
                  <a
                    href="mailto:support@payrecover.app"
                    className="text-sm font-semibold text-emerald-600 dark:text-emerald-400 hover:underline"
                  >
                    support@payrecover.app
                  </a>
                </div>
              </div>

              {/* Address */}
              <div className="flex items-start gap-4">
                <div className="bg-stone-50 dark:bg-stone-800 p-2.5 rounded-xl shrink-0">
                  <MessageSquare className="w-5 h-5 text-stone-500 dark:text-stone-400" />
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest text-stone-400 mb-1">Business Address</p>
                  <p className="text-sm font-semibold text-stone-600 dark:text-stone-300">PayRecover, India</p>
                </div>
              </div>
            </div>

            <div className="text-sm leading-relaxed space-y-2">
              <p className="font-semibold text-stone-500 dark:text-stone-400 text-xs uppercase tracking-widest">Response time</p>
              <p>We typically respond within 1–2 business days. For urgent billing issues, please include your account email in the subject line.</p>
            </div>
          </div>

          {/* Right column — form */}
          <div className="bg-white dark:bg-stone-800 border border-warm-border dark:border-stone-700 rounded-2xl p-8 shadow-sm">
            {submitted ? (
              <div className="flex flex-col items-center justify-center h-full py-10 text-center gap-5">
                <div className="bg-emerald-50 dark:bg-emerald-900/20 p-4 rounded-2xl">
                  <CheckCircle2 className="w-10 h-10 text-emerald-500" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-stone-800 dark:text-stone-100 mb-2">Message sent!</h3>
                  <p className="text-sm text-stone-500 dark:text-stone-400 leading-relaxed">
                    Thanks for reaching out. We'll get back to you within 1–2 business days.
                  </p>
                </div>
                <button
                  onClick={() => { setName(''); setEmail(''); setMessage(''); setSubmitted(false); setError(''); }}
                  className="text-xs font-bold text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 transition-colors underline underline-offset-2"
                >
                  Send another message
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5" noValidate>
                <h2 className="text-lg font-bold text-stone-800 dark:text-stone-100 mb-6">Send a message</h2>

                {error && (
                  <div role="alert" className="text-sm text-red-500 dark:text-red-400 font-medium pl-1">
                    {error}
                  </div>
                )}

                {/* Name */}
                <div className="space-y-1.5">
                  <label htmlFor="contact-name" className="text-xs font-semibold uppercase tracking-wider text-stone-400 ml-1">
                    Name
                  </label>
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-300 dark:text-stone-500" aria-hidden="true" />
                    <input
                      id="contact-name"
                      type="text"
                      autoComplete="name"
                      className="w-full pl-12 pr-4 py-3 rounded-xl border border-warm-border dark:border-stone-600 bg-cream dark:bg-stone-700 text-sm font-medium placeholder:text-stone-300 dark:placeholder:text-stone-500 outline-none focus:border-stone-400 dark:focus:border-stone-500 transition-all text-stone-700 dark:text-stone-200"
                      placeholder="Your name"
                      value={name}
                      onChange={e => setName(e.target.value)}
                      required
                    />
                  </div>
                </div>

                {/* Email */}
                <div className="space-y-1.5">
                  <label htmlFor="contact-email" className="text-xs font-semibold uppercase tracking-wider text-stone-400 ml-1">
                    Email
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-300 dark:text-stone-500" aria-hidden="true" />
                    <input
                      id="contact-email"
                      type="email"
                      autoComplete="email"
                      className="w-full pl-12 pr-4 py-3 rounded-xl border border-warm-border dark:border-stone-600 bg-cream dark:bg-stone-700 text-sm font-medium placeholder:text-stone-300 dark:placeholder:text-stone-500 outline-none focus:border-stone-400 dark:focus:border-stone-500 transition-all text-stone-700 dark:text-stone-200"
                      placeholder="you@example.com"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      required
                    />
                  </div>
                </div>

                {/* Message */}
                <div className="space-y-1.5">
                  <label htmlFor="contact-message" className="text-xs font-semibold uppercase tracking-wider text-stone-400 ml-1">
                    Message
                  </label>
                  <textarea
                    id="contact-message"
                    rows={5}
                    className="w-full px-4 py-3 rounded-xl border border-warm-border dark:border-stone-600 bg-cream dark:bg-stone-700 text-sm font-medium placeholder:text-stone-300 dark:placeholder:text-stone-500 outline-none focus:border-stone-400 dark:focus:border-stone-500 transition-all text-stone-700 dark:text-stone-200 resize-none"
                    placeholder="How can we help you?"
                    value={message}
                    onChange={e => setMessage(e.target.value)}
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 text-white font-bold rounded-xl text-sm transition-all shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      Send Message
                    </>
                  )}
                </button>
              </form>
            )}
          </div>
        </div>
      </main>

      <footer className="py-10 border-t border-warm-border dark:border-stone-800 mt-16">
        <div className="max-w-4xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm font-bold text-stone-400">
          <p>© 2026 PayRecover. All rights reserved.</p>
          <div className="flex gap-6">
            <Link to="/privacy" className="hover:text-stone-700 dark:hover:text-stone-200 transition-colors">Privacy</Link>
            <Link to="/terms" className="hover:text-stone-700 dark:hover:text-stone-200 transition-colors">Terms</Link>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Contact;
