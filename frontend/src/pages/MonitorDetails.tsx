import React, { useEffect, useState, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Clock, Activity, CheckCircle, XCircle } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { api } from '../api';

interface Log {
  id: string;
  monitorId: string;
  statusCode?: number;
  responseTime?: number;
  status: string;
  createdAt: string;
}

interface Monitor {
  id: string;
  projectId: string;
  url: string;
  method: string;
  interval: number;
  status: string;
  lastCheckedAt?: string;
  logs: Log[];
}

const MonitorDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [monitor, setMonitor] = useState<Monitor | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchMonitor = useCallback(async () => {
    try {
      const { data } = await api.get(`/monitors/${id}`);
      if (data.success) {
        setMonitor(data.data);
      }
    } catch (err) {
      console.error('Failed to fetch monitor details', err);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchMonitor();
    const interval = setInterval(fetchMonitor, 10000); // Poll every 10s
    return () => clearInterval(interval);
  }, [fetchMonitor]);

  if (loading && !monitor) return <div className="p-8 text-center">Loading details...</div>;
  if (!monitor) return <div className="p-8 text-center text-red-500">Monitor not found</div>;

  const chartData = [...(monitor.logs || [])].reverse().map((log) => ({
    time: new Date(log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    responseTime: log.responseTime || 0,
    status: log.status
  }));

  const avgResponseTime = chartData.length > 0 
    ? Math.round(chartData.reduce((acc, log) => acc + log.responseTime, 0) / chartData.length)
    : 0;

  return (
    <div>
      <div className="mb-6">
        <Link to="/" className="text-primary-600 dark:text-primary-500 hover:text-primary-800 dark:hover:text-primary-400 text-sm font-medium flex items-center mb-4 transition">
          <ArrowLeft className="w-4 h-4 mr-1" /> Back to Dashboard
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center space-x-3 text-2xl font-bold text-slate-900 dark:text-white mb-1">
               <span className={`w-4 h-4 rounded-full ${
                  monitor.status === 'UP' ? 'bg-emerald-500' : 
                  monitor.status === 'DOWN' ? 'bg-red-500' : 'bg-amber-400'
                }`}></span>
              <h1>{monitor.url}</h1>
            </div>
            <div className="flex space-x-4 text-sm text-slate-500 dark:text-slate-400 font-medium">
              <span className="bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded text-slate-600 dark:text-slate-300">{monitor.method}</span>
              <span className="flex items-center"><Clock className="w-4 h-4 mr-1" /> Checks every {monitor.interval}s</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-8">
         <div className="bg-white dark:bg-slate-900 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 transition-colors">
            <div className="text-slate-500 dark:text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">Current Status</div>
            <div className={`text-2xl font-bold ${monitor.status === 'UP' ? 'text-emerald-600 dark:text-emerald-500' : monitor.status === 'DOWN' ? 'text-red-500 dark:text-red-400' : 'text-amber-500'}`}>
              {monitor.status}
            </div>
         </div>
         <div className="bg-white dark:bg-slate-900 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 transition-colors">
            <div className="text-slate-500 dark:text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">Avg Response (Last 50)</div>
            <div className="text-2xl font-bold text-slate-800 dark:text-white">{avgResponseTime} <span className="text-sm font-medium text-slate-400">ms</span></div>
         </div>
         <div className="bg-white dark:bg-slate-900 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 transition-colors">
            <div className="text-slate-500 dark:text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">Checks Logged</div>
            <div className="text-2xl font-bold text-slate-800 dark:text-white">{monitor.logs?.length || 0}</div>
         </div>
      </div>

      <div className="bg-white dark:bg-slate-900 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 mb-8 transition-colors">
        <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-6 flex items-center">
          <Activity className="w-5 h-5 mr-2 text-primary-500" /> Response Time History
        </h3>
        <div className="h-72 w-full text-sm">
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#94a3b8" opacity={0.3} />
                <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{fill: '#64748b'}} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b'}} unit="ms" />
                <Tooltip 
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', backgroundColor: 'var(--tw-colors-slate-800, #1e293b)', color: '#fff' }}
                />
                <Line type="monotone" dataKey="responseTime" stroke="#3b82f6" strokeWidth={3} dot={false} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-slate-400">Not enough data to graph yet.</div>
          )}
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden transition-colors">
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
          <h3 className="font-bold text-slate-800 dark:text-white">Recent Logs</h3>
        </div>
        <ul className="divide-y divide-slate-100 dark:divide-slate-800">
          {monitor.logs?.map((log) => (
            <li key={log.id} className="p-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/50 transition">
              <div className="flex items-center space-x-4">
                {log.status === 'UP' ? <CheckCircle className="w-5 h-5 text-emerald-500" /> : <XCircle className="w-5 h-5 text-red-500" />}
                <div>
                  <div className="text-sm font-bold text-slate-800 dark:text-white">{log.statusCode || 'N/A'}</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">{new Date(log.createdAt).toLocaleString()}</div>
                </div>
              </div>
              <div className="text-sm font-medium text-slate-600 dark:text-slate-300">{log.responseTime ? `${log.responseTime}ms` : 'Timeout'}</div>
            </li>
          ))}
          {(!monitor.logs || monitor.logs.length === 0) && (
            <li className="p-8 text-center text-slate-400">No logs recorded yet.</li>
          )}
        </ul>
      </div>
    </div>
  );
};

export default MonitorDetails;
