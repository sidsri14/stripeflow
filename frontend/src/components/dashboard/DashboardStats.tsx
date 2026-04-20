import React from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, RotateCcw, CheckCircle2, AlertTriangle, IndianRupee } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { cn } from '../../utils/cn';

interface DashboardStatsProps {
  stats: {
    totalVolume: number;
    paidVolume: number;
    paidRate: number;
    paidThisMonth: number;
    counts: {
      pending: number;
      paid: number;
      overdue: number;
      abandoned: number;
    };
    timeseries?: Array<{ date: string, volume: number, paid: number }>;
  } | null;
}

export const DashboardStats: React.FC<DashboardStatsProps> = ({ stats }) => {
  const cards = [
    {
      label: 'Collected Revenue',
      value: `₹${((stats?.paidVolume ?? 0) / 100).toLocaleString('en-IN')}`,
      sub: 'Successfully recovered',
      icon: <CheckCircle2 className="w-5 h-5 text-emerald-500" />,
      color: 'emerald',
    },
    {
      label: 'Pending Payouts',
      value: stats?.counts?.pending ?? 0,
      sub: 'Awaiting client action',
      icon: <RotateCcw className="w-5 h-5 text-blue-500" />,
      color: 'blue',
    },
    {
      label: 'Overdue Recovery',
      value: stats?.counts?.overdue ?? 0,
      sub: 'Urgent attention needed',
      icon: <AlertTriangle className="w-5 h-5 text-rose-500" />,
      color: 'rose',
    },
    {
      label: 'Total Invoiced',
      value: `₹${((stats?.totalVolume ?? 0) / 100).toLocaleString('en-IN')}`,
      sub: 'Gross engine volume',
      icon: <IndianRupee className="w-5 h-5 text-indigo-500" />,
      color: 'indigo',
    },
    {
      label: 'Recovery Rate',
      value: `${stats?.paidRate ?? 0}%`,
      sub: 'Success efficiency',
      icon: <TrendingUp className="w-5 h-5 text-emerald-500" />,
      color: 'emerald',
    }
  ];

  return (
    <>
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
      {cards.map((card, idx) => (
        <motion.div
           key={card.label}
           initial={{ opacity: 0, y: 15 }}
           animate={{ opacity: 1, y: 0 }}
           transition={{ delay: idx * 0.05, duration: 0.5 }}
           className="glass-card !p-6 hover:scale-[1.03] group"
        >
          <div className="flex justify-between items-start mb-6">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 group-hover:text-slate-500">
              {card.label}
            </p>
            <div className={cn(
              "p-2.5 rounded-2xl transition-all duration-300",
              card.color === 'emerald' ? "bg-emerald-500/10 dark:bg-emerald-500/20 group-hover:bg-emerald-500/30" :
              card.color === 'blue' ? "bg-blue-500/10 dark:bg-blue-500/20 group-hover:bg-blue-500/30" :
              card.color === 'indigo' ? "bg-indigo-500/10 dark:bg-indigo-500/20 group-hover:bg-indigo-500/30" :
              "bg-rose-500/10 dark:bg-rose-500/20 group-hover:bg-rose-500/30"
            )}>
              {card.icon}
            </div>
          </div>
          <h4 className="text-3xl font-black text-slate-900 dark:text-white mb-1.5 tracking-tighter">
            {card.value}
          </h4>
          <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest italic">
            {card.sub}
          </p>
        </motion.div>
      ))}
    </div>
    
    <div className="grid grid-cols-1 gap-8 mt-10">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="glass-card !p-8 lg:!p-10 glow-sapphire"
      >
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12">
          <div className="space-y-1">
            <h3 className="text-xl font-black tracking-tight text-slate-900 dark:text-white">Revenue Performance</h3>
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Last 30 Days Trend</p>
          </div>
          <div className="flex gap-8 bg-slate-50 dark:bg-slate-900/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2">
               <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-lg shadow-emerald-500/20" />
               <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Collected</span>
            </div>
            <div className="flex items-center gap-2">
               <div className="w-2.5 h-2.5 rounded-full bg-indigo-500 shadow-lg shadow-indigo-500/20" />
               <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Invoiced</span>
            </div>
          </div>
        </div>
        
        <div className="h-80 w-full">
          {stats?.timeseries && stats.timeseries.length > 1 ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={stats.timeseries} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorInv" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.15}/>
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorPaid" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.15}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#94a3b8" opacity={0.1} />
                <XAxis 
                   dataKey="date" 
                   axisLine={false} 
                   tickLine={false} 
                   tick={{ fontSize: 9, fill: '#64748b', fontWeight: 800 }} 
                   dy={15} 
                   minTickGap={30} 
                />
                <YAxis 
                   axisLine={false} 
                   tickLine={false} 
                   tick={{ fontSize: 9, fill: '#64748b', fontWeight: 800 }} 
                   tickFormatter={(val) => `₹${(val/100).toLocaleString('en-IN')}`} 
                />
                <Tooltip 
                  contentStyle={{ borderRadius: '24px', border: 'none', boxShadow: '0 25px 50px -12px rgb(0 0 0 / 0.15)', backgroundColor: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(10px)' }}
                  labelStyle={{ fontWeight: '900', color: '#0f172a', marginBottom: '8px', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.1em' }}
                  itemStyle={{ fontSize: '11px', fontWeight: '700' }}
                  formatter={(value: any, name: any) => [`₹${(Number(value)/100).toLocaleString('en-IN')}`, name === 'paid' ? 'Collected' : 'Invoiced']}
                />
                <Area type="monotone" dataKey="volume" stroke="#6366f1" strokeWidth={4} fillOpacity={1} fill="url(#colorInv)" animationDuration={2000} />
                <Area type="monotone" dataKey="paid" stroke="#10b981" strokeWidth={4} fillOpacity={1} fill="url(#colorPaid)" animationDuration={2000} />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
             <div className="h-full flex flex-col items-center justify-center text-slate-300 dark:text-slate-700 gap-4">
               <div className="bg-slate-50 dark:bg-slate-900/50 p-6 rounded-3xl">
                  <TrendingUp className="w-12 h-12 opacity-30" />
               </div>
               <p className="text-[10px] font-black uppercase tracking-[0.4em]">Awaiting performance data</p>
             </div>
          )}
        </div>
      </motion.div>
    </div>
    </>
  );
};
