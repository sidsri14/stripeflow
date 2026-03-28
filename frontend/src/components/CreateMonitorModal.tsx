import React, { useState, useEffect } from 'react';
import { X, Plus, Globe, Clock, Settings2, ShieldCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '../api';
import toast from 'react-hot-toast';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const CreateMonitorModal: React.FC<Props> = ({ isOpen, onClose, onSuccess }) => {
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [method, setMethod] = useState('GET');
  const [interval, setIntervalVal] = useState('60');
  const [loading, setLoading] = useState(false);

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await api.post('/monitors', {
        // name is optional — backend falls back to URL if omitted
        name: name.trim() || undefined,
        url,
        method,
        interval: Number(interval)
      });
      if (response && response.data && response.data.success) {
        toast.success('Monitor established successfully');
        setName('');
        setUrl('');
        setMethod('GET');
        setIntervalVal('60');
        onSuccess();
      }
    } catch (err: unknown) {
      const normalized = err as { response?: { data?: { error?: string } }; message?: string };
      const msg = normalized.response?.data?.error || normalized.message || 'Failed to create monitor';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-title"
        >
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-950/60 backdrop-blur-md"
            aria-hidden="true"
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="relative w-full max-w-lg glass-card p-0 overflow-hidden shadow-[0_32px_64px_-12px_rgba(0,0,0,0.5)] border-white/20 dark:border-slate-700/50"
          >
            {/* Header */}
            <div className="p-6 border-b border-white/10 dark:border-slate-800/50 bg-white/5 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary-500/20 rounded-xl" aria-hidden="true">
                  <Plus className="w-5 h-5 text-primary-500" />
                </div>
                <h3 id="modal-title" className="text-xl font-black tracking-tight text-slate-900 dark:text-white uppercase italic">
                  New <span className="text-primary-500">Node</span>
                </h3>
              </div>
              <button
                onClick={onClose}
                aria-label="Close dialog"
                className="p-2 text-slate-400 hover:text-white hover:bg-white/5 rounded-xl transition-all"
              >
                <X className="w-5 h-5" aria-hidden="true" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-8 space-y-6">
              <div className="space-y-4">
                <div className="group">
                  <label htmlFor="monitor-name" className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 mb-1.5 ml-1">
                    <Settings2 className="w-3 h-3" aria-hidden="true" /> Identification <span className="normal-case font-medium text-slate-400">(optional)</span>
                  </label>
                  <input
                    id="monitor-name"
                    type="text"
                    placeholder="e.g. Primary API Gateway"
                    autoComplete="off"
                    className="w-full px-5 py-3.5 glass rounded-2xl text-sm font-bold focus:ring-2 focus:ring-primary-500/50 outline-none transition-all placeholder:text-slate-500"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>

                <div className="group">
                  <label htmlFor="monitor-url" className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 mb-1.5 ml-1">
                    <Globe className="w-3 h-3" aria-hidden="true" /> Network Endpoint
                  </label>
                  <input
                    id="monitor-url"
                    type="url"
                    placeholder="https://api.v1.example.com/health"
                    autoComplete="url"
                    className="w-full px-5 py-3.5 glass rounded-2xl text-sm font-bold focus:ring-2 focus:ring-primary-500/50 outline-none transition-all placeholder:text-slate-500"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="monitor-method" className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 mb-1.5 ml-1">
                      <ShieldCheck className="w-3 h-3" aria-hidden="true" /> Method
                    </label>
                    <select
                      id="monitor-method"
                      className="w-full px-5 py-3.5 glass rounded-2xl text-sm font-black focus:ring-2 focus:ring-primary-500/50 outline-none transition-all appearance-none"
                      value={method}
                      onChange={(e) => setMethod(e.target.value)}
                    >
                      {['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD'].map(m => (
                        <option key={m} value={m} className="bg-slate-900 text-white font-bold">{m}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label htmlFor="monitor-interval" className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 mb-1.5 ml-1">
                      <Clock className="w-3 h-3" aria-hidden="true" /> Pulse Rate
                    </label>
                    <select
                      id="monitor-interval"
                      className="w-full px-5 py-3.5 glass rounded-2xl text-sm font-black focus:ring-2 focus:ring-primary-500/50 outline-none transition-all appearance-none"
                      value={interval}
                      onChange={(e) => setIntervalVal(e.target.value)}
                    >
                      <option value="30" className="bg-slate-900 text-white font-bold">30 Seconds</option>
                      <option value="60" className="bg-slate-900 text-white font-bold">1 Minute</option>
                      <option value="300" className="bg-slate-900 text-white font-bold">5 Minutes</option>
                      <option value="1800" className="bg-slate-900 text-white font-bold">30 Minutes</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="pt-4 flex gap-4">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 px-6 py-4 glass rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-white/10 transition-all border-none"
                >
                  Discard
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-[2] bg-primary-600 hover:bg-primary-500 text-white font-black text-xs uppercase tracking-widest py-4 rounded-2xl shadow-xl shadow-primary-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Initializing...' : 'Deploy Monitor'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default CreateMonitorModal;
