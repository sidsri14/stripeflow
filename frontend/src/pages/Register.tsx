import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import toast from 'react-hot-toast';

const Register: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    try {
      const { data } = await api.post('/auth/register', { email, password });
      if (data.success) {
        toast.success('Account created successfully!');
        setTimeout(() => {
          window.location.href = '/';
        }, 500);
      }
    } catch (err: unknown) {
      const normalized = err as { response?: { data?: { error?: string } }; message?: string };
      const msg = normalized.response?.data?.error || normalized.message || 'Failed to register';
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-4 transition-colors">
      <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-2xl shadow-xl overflow-hidden border border-slate-100 dark:border-slate-800">
        <div className="p-8">
          <div className="flex justify-center mb-6">
            <h1 className="text-3xl font-bold text-primary-600 dark:text-primary-500">API Pulse</h1>
          </div>
          <h2 className="text-2xl font-bold text-slate-800 dark:text-white text-center mb-8">Create an Account</h2>
          
          {error && <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-4 text-sm">{error}</div>}
          
          <form onSubmit={handleRegister} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Email Address</label>
            <input 
              type="email" 
              className="w-full px-4 py-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Password</label>
            <input 
              type="password" 
              className="w-full px-4 py-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
            />
            <p className="text-[10px] mt-1 text-slate-500 dark:text-slate-400">
              Min 8 chars, 1 uppercase, 1 number, 1 special character.
            </p>
          </div>
          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-primary-600 hover:bg-primary-500 text-white font-semibold py-2 px-4 rounded-lg shadow-sm transition disabled:opacity-50"
          >
            {loading ? 'Creating account...' : 'Sign Up'}
          </button>
        </form>
        </div>
        
        <div className="px-8 py-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800 text-center">
          <p className="text-slate-600 dark:text-slate-400 text-sm">
            Already have an account? <Link to="/login" className="font-semibold text-primary-600 dark:text-primary-400 hover:text-primary-500 transition">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Register;
