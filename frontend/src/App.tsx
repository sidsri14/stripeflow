import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import MonitorDetails from './pages/MonitorDetails';
import PublicStatus from './pages/PublicStatus';
import { Moon, Sun } from 'lucide-react';
import { Toaster, toast } from 'react-hot-toast';
import { api } from './api';

type AuthUser = {
  id: string;
  email: string;
  createdAt: string;
};

const ThemeToggle = () => {
  const [isDark, setIsDark] = useState(() => localStorage.getItem('theme') === 'dark');

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDark]);

  return (
    <button
      onClick={() => setIsDark(!isDark)}
      className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 transition"
    >
      {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
    </button>
  );
};

function App() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const checkAuth = async () => {
    try {
      const { data } = await api.get('/auth/me');
      if (data.success) {
        setUser(data.data);
      }
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkAuth();
  }, []);

  const handleLogout = async () => {
    try {
      await api.post('/auth/logout');
      setUser(null);
      window.location.href = '/login';
    } catch {
      toast.error('Failed to logout');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  const Layout = ({ children }: { children: React.ReactNode }) => (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col transition-colors">
      <header className="p-4 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center transition-colors">
        <div className="flex items-center space-x-4">
          <span className="font-bold text-xl text-primary-600 dark:text-primary-500">API Pulse</span>
        </div>
        <div className="flex items-center space-x-4">
          {user && (
            <span className="text-sm text-slate-500 dark:text-slate-400 hidden sm:inline">{user.email}</span>
          )}
          <ThemeToggle />
          {user && (
            <button 
              onClick={handleLogout}
              className="text-sm font-medium text-red-500 hover:text-red-600 transition"
            >
              Logout
            </button>
          )}
        </div>
      </header>
      <main className="flex-1 p-4 max-w-7xl mx-auto w-full">
        {children}
      </main>
    </div>
  );

  return (
    <Router>
      <Toaster position="top-right" />
      <Routes>
        <Route path="/status" element={<PublicStatus />} />
        <Route path="/login" element={user ? <Navigate to="/" /> : <Login />} />
        <Route path="/register" element={user ? <Navigate to="/" /> : <Register />} />
        <Route path="/*" element={
          user ? (
            <Layout>
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/monitors/:id" element={<MonitorDetails />} />
                <Route path="*" element={<Navigate to="/" />} />
              </Routes>
            </Layout>
          ) : <Navigate to="/login" />
        } />
      </Routes>
    </Router>
  );
}

export default App;
